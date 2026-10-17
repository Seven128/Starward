"""Seal a bounded fixed-raster release; no database or provider requests.

Source hashes are references during preparation. publish_eog_viirs.prepare
verifies the actual source files before the existing atomic DB publication.
"""
from __future__ import annotations

import argparse
import dataclasses
import json
import math
import re
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import rasterio
from rasterio.windows import from_bounds

import eog_fixed_method as fixed
from eog_fixed_publication import INVENTORY_SCHEMA, inventory_version, validate_aoi_alignment, validate_asset
from eog_fixed_raster import prepare_fixed_window
from eog_raster import Aoi, PipelineError, PublicationManifest, canonical_json, load_manifest, raster_uri, read_selection, sha256_bytes

PROJECT = Path(__file__).resolve().parents[2]


def write_immutable(path: Path, raw: bytes) -> None:
    try:
        with path.open("xb") as stream:
            stream.write(raw)
    except FileExistsError:
        if path.read_bytes() != raw:
            raise PipelineError("nightlight_immutable_release_conflict")


def source_pixel_footprint(manifest: PublicationManifest) -> Aoi:
    """Declare the original whole pixels covering the requested trial region.

    Outward alignment preserves the entire requested region. The new manifest
    and inventory explicitly carry the actual enlarged numerical footprint;
    the historical relative-AOI manifest is never edited.
    """
    aoi = manifest.aoi
    with rasterio.open(raster_uri(manifest.radiance.path)) as image:
        window = from_bounds(aoi.west, aoi.south, aoi.east, aoi.north, image.transform)
        left, top = math.floor(window.col_off + 1e-9), math.floor(window.row_off + 1e-9)
        right, bottom = math.ceil(window.col_off + window.width - 1e-9), math.ceil(window.row_off + window.height - 1e-9)
        west, north = image.transform * (left, top)
        east, south = image.transform * (right, bottom)
    return Aoi(west=west, south=south, east=east, north=north)


def release_windows(windows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Every requested composition reuses complete same-level fixed cells."""
    units: dict[str, dict[str, Any]] = {}
    for window in windows:
        if (not isinstance(window, dict) or window.get("grid") != "gcj02-mercator-pixel-centres-v1" or window.get("tilePixels") != 256
                or any(isinstance(window.get(key), bool) or not isinstance(window.get(key), int)
                       for key in ("zoom", "x", "y", "columns", "rows"))
                or not 0 <= window["zoom"] <= 12 or not 1 <= window["columns"] <= 5 or not 1 <= window["rows"] <= 5
                or not 0 <= window["x"] <= 2 ** window["zoom"] - window["columns"]
                or not 0 <= window["y"] <= 2 ** window["zoom"] - window["rows"]):
            raise PipelineError("nightlight_release_window_invalid")
        for row in range(window["rows"]):
            for column in range(window["columns"]):
                cell = {**window, "x": window["x"] + column, "y": window["y"] + row, "columns": 1, "rows": 1}
                units["-".join(str(cell[name]) for name in ("zoom", "x", "y", "columns", "rows"))] = cell
        units["-".join(str(window[name]) for name in ("zoom", "x", "y", "columns", "rows"))] = window
    if len(units) > 4096:
        raise PipelineError("nightlight_release_asset_budget_exceeded")
    return sorted(units.values(), key=lambda window: (window["columns"] * window["rows"], window["zoom"], window["x"], window["y"]))


def prepare_release(source_manifest: Path, dataset_version: str, windows: list[dict[str, Any]],
                    output: Path, *, node: str = "node") -> dict[str, Any]:
    base = load_manifest(source_manifest)
    if (base.dataset_version == dataset_version or not re.fullmatch(r"[a-z0-9][a-z0-9._-]{2,127}", dataset_version)
            or not isinstance(windows, list) or not 1 <= len(windows) <= 4096):
        raise PipelineError("fixed_release_new_dataset_and_bounded_windows_required")
    windows = release_windows(windows)
    output = output.resolve()
    output.mkdir(parents=True, exist_ok=True)
    footprint = source_pixel_footprint(base)
    raw = {**base.raw, "schemaVersion": 2, "datasetVersion": dataset_version, "aoi": dataclasses.asdict(footprint),
           "radiance": {**base.raw["radiance"], "file": str(base.radiance.path)},
           "cloudFreeCoverage": {**base.raw["cloudFreeCoverage"], "file": str(base.coverage.path)},
           "fixedRaster": {"policySha256": fixed.POLICY_SHA256,
                           "inventory": {"file": "inventory.json", "sha256": "0" * 64}}}
    raw.pop("gridStridePixels", None)
    manifest = dataclasses.replace(base, raw=raw, path=output / "manifest.json", dataset_version=dataset_version, aoi=footprint,
                                   grid_stride=0, fixed_raster=raw["fixedRaster"])
    selection = read_selection(manifest)
    validate_aoi_alignment(manifest, selection)
    source = {"width": selection.radiance.shape[1], "height": selection.radiance.shape[0],
              "west": selection.transform.c, "north": selection.transform.f,
              "longitudeStep": selection.transform.a, "latitudeStep": selection.transform.e}
    # Batch checkpoints are private preparation state, never publication authority.
    # Bind all numerical owners so a source/code change cannot reuse old work.
    owner_files = [PROJECT / "data-pipelines/dark-sky" / name for name in
                   ("prepare_fixed_eog.py", "eog_fixed_method.py", "eog_fixed_raster.py", "eog_area_intersection.py", "requirements.txt", "eog_fixed_publication.py", "eog_raster.py",
                    "project_display_grid.mts")]
    owner_files += [PROJECT / "packages/coordinate-system/src" / name for name in ("index.ts", "raster-grid.ts", "mercator.ts")]
    code_hashes = {file.relative_to(PROJECT).as_posix(): sha256_bytes(file.read_bytes()) for file in owner_files}
    preparation_identity = sha256_bytes(canonical_json({"manifest": raw, "code": code_hashes}).encode())
    reused = 0
    assets, seen, prepared = [], set(), {}
    for window in windows:
        key = "-".join(str(window.get(name)) for name in ("zoom", "x", "y", "columns", "rows"))
        if not re.fullmatch(r"[0-9]+(?:-[0-9]+){4}", key) or key in seen:
            raise PipelineError("nightlight_release_window_invalid")
        seen.add(key)
        geometry = output / "_geometry" / key
        geometry.mkdir(parents=True, exist_ok=True)
        # Integrate the coordinate warp over subpixels while retaining each
        # original radiance/quality value. This controls area error from the
        # curved GCJ transform without inventing finer source information.
        subdivision = max(1, math.ceil(max(source["longitudeStep"], -source["latitudeStep"]) /
                                      fixed.POLICY["geometryPolicy"]["maximumQuadratureStepDegrees"] - 1e-10))
        spec = {"schemaVersion": "starward-nightlight-warp-input-v1", "source": source,
                "sourceSubdivision": subdivision, "window": window}
        spec_path = geometry / "input.json"
        write_immutable(spec_path, (canonical_json(spec) + "\n").encode())
        metadata_path = geometry / "warp-grid.json"
        if metadata_path.exists():
            metadata = json.loads(metadata_path.read_bytes())
            if (metadata.get("originalSource") != source or metadata.get("sourceSubdivision") != subdivision or metadata.get("window") != window
                    or metadata.get("projectionSourceSha256") != code_hashes["data-pipelines/dark-sky/project_display_grid.mts"]
                    or metadata.get("coordinateSourceSha256") != code_hashes["packages/coordinate-system/src/index.ts"]
                    or metadata.get("rasterGridSourceSha256") != code_hashes["packages/coordinate-system/src/raster-grid.ts"]
                    or metadata.get("mercatorSourceSha256") != code_hashes["packages/coordinate-system/src/mercator.ts"]):
                raise PipelineError("nightlight_immutable_geometry_conflict")
        else:
            result = subprocess.run([node, str(PROJECT / "tools/run-node.cjs"), "--import", "tsx",
                                     str(PROJECT / "data-pipelines/dark-sky/project_display_grid.mts"),
                                     "--spec", str(spec_path), "--output", str(geometry),
                                     "--source-cache", str(output / "_geometry" / "_source")],
                                    cwd=PROJECT, capture_output=True, check=False)
            if result.returncode:
                raise PipelineError("nightlight_shared_coordinate_projection_failed")
            metadata = json.loads(metadata_path.read_bytes())
            if (metadata.get("projectionSourceSha256") != code_hashes["data-pipelines/dark-sky/project_display_grid.mts"]
                    or metadata.get("coordinateSourceSha256") != code_hashes["packages/coordinate-system/src/index.ts"]
                    or metadata.get("rasterGridSourceSha256") != code_hashes["packages/coordinate-system/src/raster-grid.ts"]
                    or metadata.get("mercatorSourceSha256") != code_hashes["packages/coordinate-system/src/mercator.ts"]):
                raise PipelineError("nightlight_preparation_code_changed")
        checkpoint_path = geometry / "prepared-raster.json"
        geometry_sha = sha256_bytes(metadata_path.read_bytes())
        if checkpoint_path.exists():
            checkpoint = json.loads(checkpoint_path.read_bytes())
            if (checkpoint.get("preparationIdentity") != preparation_identity or checkpoint.get("geometrySha256") != geometry_sha
                    or checkpoint.get("asset", {}).get("key") != key):
                raise PipelineError("nightlight_preparation_checkpoint_conflict")
            entry = checkpoint["asset"]
            proof = validate_asset(output, entry, manifest, selection.resolution_degrees)
            if proof["sourceSet"]["geometrySha256"] != geometry_sha:
                raise PipelineError("nightlight_preparation_checkpoint_conflict")
            assets.append(entry)
            prepared[key] = proof
            reused += 1
            continue
        children = None
        if window["columns"] * window["rows"] > 1:
            children = [prepared[f"{window['zoom']}-{window['x'] + column}-{window['y'] + row}-1-1"]
                        for row in range(window["rows"]) for column in range(window["columns"])]
        proof = prepare_fixed_window(manifest, selection, dataset_version, geometry, output, cells=children)
        file = proof["image"]["file"]
        proof_bytes = (output / (file + ".json")).read_bytes()
        entry = {"key": key, "file": file, "proofBytes": len(proof_bytes), "proofSha256": sha256_bytes(proof_bytes)}
        validate_asset(output, entry, manifest, selection.resolution_degrees)
        write_immutable(checkpoint_path, (canonical_json({"preparationIdentity": preparation_identity,
                        "geometrySha256": geometry_sha, "asset": entry}) + "\n").encode())
        assets.append(entry)
        prepared[key] = proof
    if code_hashes != {file.relative_to(PROJECT).as_posix(): sha256_bytes(file.read_bytes()) for file in owner_files}:
        raise PipelineError("nightlight_preparation_code_changed")
    assets.sort(key=lambda entry: entry["key"])
    inventory = {"schemaVersion": INVENTORY_SCHEMA, "releaseState": "SEALED", "datasetVersion": dataset_version,
                 "methodVersion": fixed.POLICY["methodVersion"], "styleVersion": fixed.POLICY["styleVersion"],
                 "policySha256": fixed.POLICY_SHA256, "requestedAoiWgs84": base.raw["aoi"],
                 "aoiWgs84": raw["aoi"], "assets": assets}
    inventory["publicationVersion"] = inventory_version(inventory)
    existing_path = output / "inventory.json"
    existing = json.loads(existing_path.read_bytes()) if existing_path.exists() else {}
    inventory["createdAt"] = existing.get("createdAt", datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"))
    inventory_bytes = (canonical_json(inventory) + "\n").encode()
    raw["fixedRaster"]["inventory"]["sha256"] = sha256_bytes(inventory_bytes)
    write_immutable(output / "manifest.json", (canonical_json(raw) + "\n").encode())
    load_manifest(output / "manifest.json")
    # The sealed inventory is the final marker, after every asset and the
    # schema-2 input manifest have been validated and durably written.
    write_immutable(existing_path, inventory_bytes)
    return {"status": "prepared", "datasetVersion": dataset_version, "assetCount": len(assets),
            "reusedValidatedAssetCount": reused,
            "publicationVersion": inventory["publicationVersion"], "inventorySha256": sha256_bytes(inventory_bytes),
            "sourceFootprintAlignedOutward": raw["aoi"] != base.raw["aoi"],
            "sourceInputVerification": "deferred_to_publish", "databasePublication": False}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-manifest", type=Path, required=True)
    parser.add_argument("--dataset-version", required=True)
    parser.add_argument("--windows", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    try:
        result = prepare_release(args.source_manifest, args.dataset_version,
                                 json.loads(args.windows.read_bytes()), args.output)
    except PipelineError as error:
        print(canonical_json({"status": "failed", "error": str(error)}))
        return 1
    print(canonical_json(result))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
