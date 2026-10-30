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
from eog_chunk_preparation import MAX_DENSE_PIXELS, prepare_chunk_geometry, prepare_chunked_window, source_descriptor
from eog_raster import Aoi, PipelineError, PublicationManifest, canonical_json, load_manifest, raster_uri, read_grid, read_selection, sha256_bytes

PROJECT = Path(__file__).resolve().parents[2]
DECLARATION_INPUT_BYTES = 4 * 1024 * 1024
PROJECTION_OWNERS = ("data-pipelines/dark-sky/project_display_grid.mts",
                     "packages/coordinate-system/src/index.ts", "packages/coordinate-system/src/raster-grid.ts",
                     "packages/coordinate-system/src/mercator.ts")


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


def source_footprints(parts: list[list[dict[str, Any]]], node: str) -> dict[str, Any]:
    """Ask the original geometry owner; no second coordinate implementation."""
    payload = canonical_json(parts).encode()
    if len(payload) > DECLARATION_INPUT_BYTES:
        raise PipelineError("nightlight_source_footprint_input_budget_exceeded")
    try:
        # Resolve through the existing runtime owner, then run the geometry
        # process directly so timeout owns and terminates the actual work.
        runtime = subprocess.run([node, "-e", "process.stdout.write(require('./tools/run-node.cjs').selectNodeRuntime())"],
                                 cwd=PROJECT, capture_output=True, check=True, timeout=10).stdout.decode().strip()
        result = subprocess.run([runtime, "--import", "tsx", str(PROJECT / PROJECTION_OWNERS[0]), "--source-footprints"],
                                cwd=PROJECT, input=payload, capture_output=True, check=True, timeout=300)
        value = json.loads(result.stdout)
    except (OSError, ValueError, subprocess.SubprocessError) as error:
        raise PipelineError("nightlight_source_footprint_projection_failed") from error
    expected = {file: sha256_bytes((PROJECT / file).read_bytes()) for file in PROJECTION_OWNERS}
    if (not isinstance(value, dict) or set(value) != {"parts", "sourceBindings"}
            or value["sourceBindings"] != expected or not isinstance(value["parts"], list)
            or len(value["parts"]) != len(parts)):
        raise PipelineError("nightlight_source_footprint_projection_invalid")
    for bounds in value["parts"]:
        if (not isinstance(bounds, dict) or set(bounds) != {"west", "south", "east", "north"}
                or any(isinstance(number, bool) or not isinstance(number, (int, float)) or not math.isfinite(number)
                       for number in bounds.values())
                or not -180 <= bounds["west"] < bounds["east"] <= 180
                or not -90 <= bounds["south"] < bounds["north"] <= 90):
            raise PipelineError("nightlight_source_footprint_projection_invalid")
    return value


def declare_preparation_parts(source_manifest: Path, dataset_version: str, parts: list[dict[str, Any]],
                              output: Path, *, node: str = "node") -> dict[str, Any]:
    """Prepare bounded source/window inputs, never numerical assets or DB state.

    Display cells have one owner across parts. Source halos may overlap; they
    preserve the two coordinate branches rather than clipping edge pixels.
    """
    base = load_manifest(source_manifest)
    if (not isinstance(dataset_version, str) or base.dataset_version == dataset_version
            or not re.fullmatch(r"[a-z0-9][a-z0-9._-]{2,127}", dataset_version)
            or not isinstance(parts, list) or not 1 <= len(parts) <= 4096):
        raise PipelineError("nightlight_preparation_parts_invalid")
    ids, owned_keys, asset_counts = set(), set(), []
    window_fields = {"grid", "tilePixels", "zoom", "x", "y", "columns", "rows"}
    if len(canonical_json(parts).encode()) > DECLARATION_INPUT_BYTES:
        raise PipelineError("nightlight_source_footprint_input_budget_exceeded")
    for part in parts:
        if (not isinstance(part, dict) or set(part) != {"id", "windows"}
                or not isinstance(part["id"], str) or not re.fullmatch(r"[a-z0-9][a-z0-9_-]{0,63}", part["id"])
                or re.fullmatch(r"con|prn|aux|nul|com[1-9]|lpt[1-9]", part["id"])
                or part["id"] in ids or not isinstance(part["windows"], list) or not 1 <= len(part["windows"]) <= 4096
                or any(not isinstance(window, dict) or set(window) != window_fields for window in part["windows"])):
            raise PipelineError("nightlight_preparation_parts_invalid")
        ids.add(part["id"])
        expanded = release_windows(part["windows"])
        keys = {"-".join(str(window[key]) for key in ("zoom", "x", "y", "columns", "rows")) for window in expanded}
        if owned_keys.intersection(keys):
            raise PipelineError("nightlight_preparation_part_window_duplicate")
        owned_keys.update(keys)
        asset_counts.append(len(expanded))

    owner_files = (*PROJECTION_OWNERS, "data-pipelines/dark-sky/prepare_fixed_eog.py",
                   "data-pipelines/dark-sky/eog_raster.py", "data-pipelines/dark-sky/eog_fixed_publication.py")
    code = {file: sha256_bytes((PROJECT / file).read_bytes()) for file in owner_files}
    manifest_sha = sha256_bytes(source_manifest.read_bytes())
    if base.digest != sha256_bytes(canonical_json(json.loads(source_manifest.read_bytes())).encode()):
        raise PipelineError("nightlight_preparation_source_changed")

    def source_identity() -> list[dict[str, Any]]:
        return [{"file": str(item.path), "sha256Reference": item.sha256, "band": item.band,
                 "bytes": item.path.stat().st_size, "modifiedNs": item.path.stat().st_mtime_ns}
                for item in (base.radiance, base.coverage)]

    source_files = source_identity()
    grid = read_grid(base)  # Both source grids, CRS, bands and original AOI must agree.
    with rasterio.open(raster_uri(base.radiance.path)) as image:
        source_width, source_height = image.width, image.height
    # Requested compositions already contain all their unit-cell corners.
    # Do not project expanded children again merely to construct the envelope.
    projected = source_footprints([part["windows"] for part in parts], node)
    if projected["sourceBindings"] != {file: code[file] for file in PROJECTION_OWNERS}:
        raise PipelineError("nightlight_preparation_code_changed")
    output = output.resolve()
    prepared = []
    for part, asset_count, bounds in zip(parts, asset_counts, projected["parts"], strict=True):
        window = from_bounds(bounds["west"], bounds["south"], bounds["east"], bounds["north"], grid.raster_transform)
        left, top = math.floor(window.col_off) - 1, math.floor(window.row_off) - 1
        right, bottom = math.ceil(window.col_off + window.width) + 1, math.ceil(window.row_off + window.height) + 1
        if not (0 <= left < right <= source_width and 0 <= top < bottom <= source_height):
            raise PipelineError("nightlight_preparation_part_outside_source")
        west, north = grid.raster_transform * (left, top)
        east, south = grid.raster_transform * (right, bottom)
        if (not -180 <= west < east <= 180 or not -90 <= south < north <= 90
                or east - west > 10 or north - south > 10):
            raise PipelineError("nightlight_preparation_part_aoi_exceeded")
        footprint = Aoi(west=west, south=south, east=east, north=north)
        path = output / "parts" / part["id"] / "source-manifest.json"
        # These are source inputs for the original preparer, not publications.
        raw = {**base.raw, "schemaVersion": 1, "aoi": dataclasses.asdict(footprint),
               "gridStridePixels": base.grid_stride or 1,
               "radiance": {**base.raw["radiance"], "file": str(base.radiance.path)},
               "cloudFreeCoverage": {**base.raw["cloudFreeCoverage"], "file": str(base.coverage.path)}}
        raw.pop("fixedRaster", None)
        manifest = dataclasses.replace(base, raw=raw, path=path, aoi=footprint, fixed_raster=None,
                                       grid_stride=raw["gridStridePixels"])
        validate_aoi_alignment(manifest, read_grid(manifest))
        prepared.append((part, asset_count, bounds, [left, top, right - left, bottom - top], raw, path))

    def assert_unchanged() -> None:
        if manifest_sha != sha256_bytes(source_manifest.read_bytes()) or source_files != source_identity():
            raise PipelineError("nightlight_preparation_source_changed")
        if code != {file: sha256_bytes((PROJECT / file).read_bytes()) for file in owner_files}:
            raise PipelineError("nightlight_preparation_code_changed")

    assert_unchanged()
    entries = []
    for part, asset_count, bounds, native_window, raw, path in prepared:
        path.parent.mkdir(parents=True, exist_ok=True)
        inputs = {"sourceManifest": (path, raw), "windows": (path.parent / "windows.json", part["windows"])}
        entry = {"id": part["id"], "assetCount": asset_count, "inverseCornerEnvelope": bounds,
                 "nativeSourceWindow": native_window, "sourceAoi": raw["aoi"], "extraNativePixelMargin": 1}
        for label, (file, value) in inputs.items():
            payload = (canonical_json(value) + "\n").encode()
            write_immutable(file, payload)
            entry[label] = {"file": file.relative_to(output).as_posix(), "bytes": len(payload), "sha256": sha256_bytes(payload)}
        load_manifest(path)
        entries.append(entry)
    assert_unchanged()
    declaration = {"schemaVersion": "starward-nightlight-preparation-inputs-v1", "status": "DECLARED_INPUTS_ONLY",
                   "datasetVersion": dataset_version, "sourceManifest": {"file": str(base.path), "sha256": manifest_sha},
                   "sourceFiles": source_files, "sourceBindings": code, "parts": entries,
                   "sourceInputVerification": "deferred_to_publish", "numericalProduction": False, "databasePublication": False}
    payload = (canonical_json(declaration) + "\n").encode()
    # The final marker is written only after all inputs have passed admission.
    write_immutable(output / "declaration.json", payload)
    return {"status": declaration["status"], "datasetVersion": dataset_version, "partCount": len(entries),
            "assetCount": len(owned_keys), "declaration": {"file": str(output / "declaration.json"),
            "bytes": len(payload), "sha256": sha256_bytes(payload)}, "numericalProduction": False, "databasePublication": False}


def requires_chunked_source(source: dict[str, Any], subdivision: int) -> bool:
    return source["width"] * source["height"] * subdivision ** 2 > MAX_DENSE_PIXELS


def project_geometry(spec: dict[str, Any], directory: Path, output: Path, node: str,
                     code_hashes: dict[str, str]) -> dict[str, Any]:
    directory.mkdir(parents=True, exist_ok=True)
    spec_path, metadata_path = directory / "input.json", directory / "warp-grid.json"
    write_immutable(spec_path, (canonical_json(spec) + "\n").encode())
    if not metadata_path.exists():
        result = subprocess.run([node, str(PROJECT / "tools/run-node.cjs"), "--import", "tsx",
                                 str(PROJECT / "data-pipelines/dark-sky/project_display_grid.mts"),
                                 "--spec", str(spec_path), "--output", str(directory),
                                 "--source-cache", str(output / "_geometry" / "_source")],
                                cwd=PROJECT, capture_output=True, check=False)
        if result.returncode:
            raise PipelineError("nightlight_shared_coordinate_projection_failed")
    metadata = json.loads(metadata_path.read_bytes())
    expected = {"projectionSourceSha256": "data-pipelines/dark-sky/project_display_grid.mts",
                "coordinateSourceSha256": "packages/coordinate-system/src/index.ts",
                "rasterGridSourceSha256": "packages/coordinate-system/src/raster-grid.ts",
                "mercatorSourceSha256": "packages/coordinate-system/src/mercator.ts"}
    if (metadata.get("schemaVersion") != "starward-nightlight-warp-grid-v1"
            or metadata.get("originalSource") != spec["source"]
            or metadata.get("sourceSubdivision") != spec["sourceSubdivision"] or metadata.get("window") != spec["window"]
            or any(metadata.get(key) != code_hashes[file] for key, file in expected.items())):
        raise PipelineError("nightlight_immutable_geometry_conflict")
    return metadata


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
    source_grid = read_grid(manifest)
    validate_aoi_alignment(manifest, source_grid)
    source = source_descriptor(source_grid)
    subdivision = max(1, math.ceil(max(source["longitudeStep"], -source["latitudeStep"]) /
                                  fixed.POLICY["geometryPolicy"]["maximumQuadratureStepDegrees"] - 1e-10))
    chunked = requires_chunked_source(source, subdivision)
    # Only the legacy dense route admits the full arrays. The chunk route
    # reads one original-pixel core/halo after its geometry is qualified.
    selection = source_grid if chunked else read_selection(manifest)
    # Batch checkpoints are private preparation state, never publication authority.
    # Bind all numerical owners so a source/code change cannot reuse old work.
    owner_files = [PROJECT / "data-pipelines/dark-sky" / name for name in
                   ("prepare_fixed_eog.py", "eog_chunk_preparation.py", "eog_fixed_method.py", "eog_fixed_raster.py", "eog_area_intersection.py", "requirements.txt", "eog_fixed_publication.py", "eog_raster.py",
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
        metadata_path = geometry / "warp-grid.json"
        if chunked:
            metadata = prepare_chunk_geometry(source_grid, window, subdivision, geometry,
                                               lambda spec, folder: project_geometry(spec, folder, output, node, code_hashes), write_immutable)
        else:
            metadata = project_geometry({"schemaVersion": "starward-nightlight-warp-input-v1", "source": source,
                                         "sourceSubdivision": subdivision, "window": window}, geometry, output, node, code_hashes)
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
        proof = (prepare_chunked_window(manifest, source_grid, dataset_version, geometry, metadata, output, cells=children)
                 if chunked else prepare_fixed_window(manifest, selection, dataset_version, geometry, output, cells=children))
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
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--windows", type=Path)
    mode.add_argument("--declare-parts", type=Path, help="Bounded [{id, windows}] input declarations; no numerical production")
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    try:
        if args.declare_parts:
            with args.declare_parts.open("rb") as stream:
                payload = stream.read(DECLARATION_INPUT_BYTES + 1)
            if len(payload) > DECLARATION_INPUT_BYTES:
                raise PipelineError("nightlight_source_footprint_input_budget_exceeded")
            try:
                parts = json.loads(payload)
            except (ValueError, UnicodeError) as error:
                raise PipelineError("nightlight_preparation_parts_invalid") from error
            result = declare_preparation_parts(args.source_manifest, args.dataset_version, parts, args.output)
        else:
            result = prepare_release(args.source_manifest, args.dataset_version,
                                     json.loads(args.windows.read_bytes()), args.output)
    except PipelineError as error:
        print(canonical_json({"status": "failed", "error": str(error)}))
        return 1
    print(canonical_json(result))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
