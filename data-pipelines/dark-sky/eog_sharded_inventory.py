"""Seal spatial/LOD discovery over bounded existing EOG preparations.

Every input is validated by the existing numerical publication owner. The
index is an offline product, not a database activation: old manifests and URLs
remain intact. Readers need only the pinned root and one coordinate shard for
an exact fixed window, never the nationwide asset inventory.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
from pathlib import Path
from typing import Any, Sequence

import eog_fixed_method as fixed
from eog_fixed_publication import read_inventory, read_inventory_with_proofs, validate_aoi_alignment
from eog_raster import PipelineError, PublicationManifest, canonical_json, load_manifest, read_grid, sha256_bytes
from prepare_fixed_eog import PROJECT, write_immutable

INDEX_SCHEMA = "starward-sharded-nightlight-index-v1"
SHARD_SCHEMA = "starward-sharded-nightlight-assets-v1"
SHARD_TILE_SPAN = 16
MAX_ROOT_BYTES = 4 * 1024 * 1024
MAX_SHARD_BYTES = 2 * 1024 * 1024
KEY_PATTERN = re.compile(r"(\d+)-(\d+)-(\d+)-([1-3])-([1-3])")
HASH_PATTERN = re.compile(r"[a-f0-9]{64}")


def window_coordinates(key: str) -> tuple[int, int, int, int, int]:
    match = KEY_PATTERN.fullmatch(key) if isinstance(key, str) else None
    if match is None:
        raise PipelineError("nightlight_sharded_window_invalid")
    zoom, x, y, columns, rows = map(int, match.groups())
    if (not 0 <= zoom <= 12 or x + columns > 2 ** zoom or y + rows > 2 ** zoom
            or key != "-".join(map(str, (zoom, x, y, columns, rows)))):
        raise PipelineError("nightlight_sharded_window_invalid")
    return zoom, x, y, columns, rows


def shard_key(key: str) -> str:
    zoom, x, y, _, _ = window_coordinates(key)
    return f"{zoom}/{x // SHARD_TILE_SPAN}/{y // SHARD_TILE_SPAN}"


def descriptor(file: str, raw: bytes) -> dict[str, Any]:
    return {"file": file, "bytes": len(raw), "sha256": sha256_bytes(raw)}


def read_pinned(root: Path, record: dict[str, Any], limit: int) -> bytes:
    file = record.get("file")
    size = record.get("bytes")
    if (not isinstance(file, str) or "\\" in file or ":" in file or Path(file).is_absolute()
            or any(part in ("", ".", "..") for part in file.split("/"))
            or not isinstance(size, int) or isinstance(size, bool) or not 0 < size <= limit
            or not isinstance(record.get("sha256"), str) or HASH_PATTERN.fullmatch(record["sha256"]) is None):
        raise PipelineError("nightlight_sharded_descriptor_invalid")
    root = root.absolute()
    target = root / file
    if root.resolve() != root or target.resolve() != target.absolute() or not root.is_dir() or not target.is_file():
        raise PipelineError("nightlight_sharded_path_invalid")
    if target.stat().st_size != size:
        raise PipelineError("nightlight_sharded_file_size_invalid")
    raw = target.read_bytes()
    if sha256_bytes(raw) != record["sha256"]:
        raise PipelineError("nightlight_sharded_file_hash_invalid")
    return raw


def _json(raw: bytes) -> Any:
    def unique(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
        result = {}
        for key, value in pairs:
            if key in result:
                raise PipelineError("nightlight_sharded_duplicate_member")
            result[key] = value
        return result
    try:
        return json.loads(raw, object_pairs_hook=unique)
    except (UnicodeDecodeError, json.JSONDecodeError) as error:
        raise PipelineError("nightlight_sharded_json_invalid") from error


def copy_immutable(source: Path, target: Path) -> None:
    target.parent.mkdir(parents=True, exist_ok=True)
    # Immutable products may share local disk identity; no source bytes change.
    try:
        os.link(source, target)
    except FileExistsError:
        if source.read_bytes() != target.read_bytes():
            raise PipelineError("nightlight_immutable_release_conflict")
    except OSError:
        write_immutable(target, source.read_bytes())


def source_identity(manifest: PublicationManifest, resolution: tuple[float, float]) -> dict[str, Any]:
    return {"datasetVersion": manifest.dataset_version, "methodVersion": fixed.POLICY["methodVersion"],
            "styleVersion": fixed.POLICY["styleVersion"], "policySha256": fixed.POLICY_SHA256,
            "radianceSha256": manifest.radiance.sha256, "coverageSha256": manifest.coverage.sha256,
            "minimumCloudFreeObservations": manifest.minimum_coverage, "source": fixed.source_summary(manifest, resolution)}


def _part_record(manifest: PublicationManifest, inventory: dict[str, Any], inventory_raw: bytes,
                 display_inventory_raw: bytes) -> dict[str, Any]:
    prefix = f"parts/{manifest.fixed_raster['inventory']['sha256']}"
    return {"publicationVersion": inventory["publicationVersion"],
            "sourceManifestSha256": sha256_bytes(manifest.path.read_bytes()),
            "inventory": descriptor(f"{prefix}/inventory.json", inventory_raw),
            "displayInventory": descriptor(f"{prefix}/display/display-inventory.json", display_inventory_raw),
            "aoiWgs84": inventory["aoiWgs84"], "requestedAoiWgs84": inventory["requestedAoiWgs84"], "assetCount": len(inventory["assets"])}


def _asset_record(part: str, asset: dict[str, Any], proof: dict[str, Any], display: dict[str, Any],
                  display_proof: dict[str, Any], style: str) -> dict[str, Any]:
    if (display.get("sourcePublicationId") != proof["publicationId"]
            or display_proof.get("displaySource", {}).get("publicationId") != proof["publicationId"]
            or display_proof["displaySource"].get("imageSha256") != proof["image"]["sha256"]
            or display_proof.get("styleVersion") != style or display_proof.get("quality") != proof["quality"]
            or display_proof.get("grid", {}).get("boundsGcj02") != proof["grid"]["boundsGcj02"]):
        raise PipelineError("nightlight_sharded_display_source_mismatch")
    prefix = f"parts/{part}"
    return {"part": part, "publicationId": proof["publicationId"], "window": proof["grid"]["window"],
            "boundsGcj02": proof["grid"]["boundsGcj02"], "quality": proof["quality"],
            "proof": {"file": f"{prefix}/{asset['file']}.json", "bytes": asset["proofBytes"], "sha256": asset["proofSha256"]},
            "image": {**proof["image"], "file": f"{prefix}/{proof['image']['file']}"},
            "numeric": {**proof["numeric"], "file": f"{prefix}/{proof['numeric']['file']}"},
            "display": {"styleVersion": style, "publicationId": display_proof["publicationId"],
                        "image": {**display["image"], "file": f"{prefix}/display/{display['image']['file']}"},
                        "proof": {**display["proof"], "file": f"{prefix}/display/{display['proof']['file']}"}}}


def _index_document(shared: dict[str, Any], parts: dict[str, Any], shards: dict[str, Any],
                    zooms: set[int], counts: dict[str, int]) -> dict[str, Any]:
    root = {"schemaVersion": INDEX_SCHEMA, "releaseState": "SEALED", **shared,
            "grid": "gcj02-mercator-pixel-centres-v1", "tilePixels": 256, "shardTileSpan": SHARD_TILE_SPAN,
            "coverage": "DECLARED_SOURCE_AOIS_WITH_PER_PIXEL_QUALITY", "parts": parts, "shards": shards,
            "availableZooms": sorted(zooms), "totals": counts}
    root["indexVersion"] = "nightlight-sharded:" + sha256_bytes(canonical_json(root).encode())
    return root


def read_publication_index(output: Path, pin: dict[str, Any]) -> dict[str, Any]:
    if pin.get("file") != "index.json":
        raise PipelineError("nightlight_sharded_root_descriptor_invalid")
    root = _json(read_pinned(output, pin, MAX_ROOT_BYTES))
    if (not isinstance(root, dict) or root.get("schemaVersion") != INDEX_SCHEMA or root.get("releaseState") != "SEALED"
            or not isinstance(root.get("parts"), dict) or not 1 <= len(root["parts"]) <= 4096
            or not isinstance(root.get("shards"), dict) or not root["shards"]
            or root.get("policySha256") != fixed.POLICY_SHA256):
        raise PipelineError("nightlight_sharded_root_invalid")
    core = {key: value for key, value in root.items() if key != "indexVersion"}
    if root.get("indexVersion") != "nightlight-sharded:" + sha256_bytes(canonical_json(core).encode()):
        raise PipelineError("nightlight_sharded_index_version_invalid")
    return root


def validate_publication(output: Path, pin: dict[str, Any], manifests: Sequence[PublicationManifest], *, node: str = "node") -> dict[str, Any]:
    """Re-admit a prepared set without invoking a producer or copying files.

    This is publication-stage full validation. Input-file qualification and
    every database effect remain with publish_eog_viirs. Request readers keep
    using only a pinned root and their needed coordinate shard.
    """
    if not manifests or len(manifests) > 4096 or pin.get("file") != "index.json":
        raise PipelineError("nightlight_sharded_publication_input_invalid")
    output = output.absolute()
    root = read_publication_index(output, pin)
    if len(root["parts"]) != len(manifests):
        raise PipelineError("nightlight_sharded_root_invalid")
    shared, parts, shards, grids, used, display_parts = None, {}, {}, [], set(), []
    counts = {"assets": 0, "numericBytes": 0, "legacyPngBytes": 0, "displayPngBytes": 0, "proofBytes": 0}
    for manifest in manifests:
        if manifest.fixed_raster is None or manifest.fixed_raster["inventory"]["file"] != "inventory.json":
            raise PipelineError("nightlight_sharded_fixed_manifest_required")
        grid = read_grid(manifest)
        validate_aoi_alignment(manifest, grid)
        identity = source_identity(manifest, grid.resolution_degrees)
        if shared is not None and shared != identity:
            raise PipelineError("nightlight_sharded_source_identity_mismatch")
        shared = identity
        grids.append(grid)
        inventory, proofs = read_inventory_with_proofs(manifest, grid.resolution_degrees)
        part = manifest.fixed_raster["inventory"]["sha256"]
        if part in parts:
            raise PipelineError("nightlight_sharded_part_duplicate")
        declared = root["parts"].get(part)
        if not isinstance(declared, dict):
            raise PipelineError("nightlight_sharded_part_missing")
        prefix = f"parts/{part}"
        inventory_raw = (manifest.path.parent / "inventory.json").read_bytes()
        copied = read_pinned(output, descriptor(f"{prefix}/inventory.json", inventory_raw), 2 * 1024 * 1024)
        if copied != inventory_raw or declared.get("displayInventory", {}).get("file") != f"{prefix}/display/display-inventory.json":
            raise PipelineError("nightlight_sharded_part_identity_invalid")
        display_raw = read_pinned(output, declared["displayInventory"], 2 * 1024 * 1024)
        displays = _json(display_raw)
        if (not isinstance(displays, dict) or displays.get("schemaVersion") != "starward-nightlight-offline-display-v1"
                or displays.get("releaseState") != "SEALED" or displays.get("datasetVersion") != manifest.dataset_version
                or displays.get("sourceInventorySha256") != part or not isinstance(displays.get("assets"), list)
                or len(displays["assets"]) != len(inventory["assets"])):
            raise PipelineError("nightlight_sharded_display_identity_invalid")
        displays_by_key = {entry.get("key"): entry for entry in displays["assets"] if isinstance(entry, dict)}
        if len(displays_by_key) != len(inventory["assets"]):
            raise PipelineError("nightlight_sharded_display_identity_invalid")
        parts[part] = _part_record(manifest, inventory, inventory_raw, display_raw)
        if declared != parts[part]:
            raise PipelineError("nightlight_sharded_part_identity_invalid")
        display_parts.append({"manifest": str(manifest.path), "displayDirectory": str(output / prefix / "display"),
                              "displayInventory": {key: declared["displayInventory"][key] for key in ("bytes", "sha256")}})
        for asset in inventory["assets"]:
            key = asset["key"]
            if key in used:
                raise PipelineError("nightlight_sharded_window_duplicate")
            used.add(key)
            proof = proofs[asset["file"]]
            display = displays_by_key.get(key)
            if display is None:
                raise PipelineError("nightlight_sharded_display_source_mismatch")
            proof_record = display.get("proof", {})
            image_record = display.get("image", {})
            if (not isinstance(proof_record.get("file"), str) or "/" in proof_record["file"]
                    or not isinstance(image_record.get("file"), str) or "/" in image_record["file"]):
                raise PipelineError("nightlight_sharded_descriptor_invalid")
            display_proof = _json(read_pinned(output, {**proof_record, "file": f"{prefix}/display/{proof_record['file']}"}, 1024 * 1024))
            entry = _asset_record(part, asset, proof, display, display_proof, displays.get("styleVersion"))
            read_pinned(output, entry["proof"], 1024 * 1024)
            read_pinned(output, entry["image"], 16 * 1024 * 1024)
            read_pinned(output, entry["numeric"], proof["image"]["width"] * proof["image"]["height"] * 6 * 8 + 1024 * 1024)
            read_pinned(output, entry["display"]["image"], 16 * 1024 * 1024)
            shards.setdefault(shard_key(key), {})[key] = entry
            counts["assets"] += 1
            counts["numericBytes"] += proof["numeric"]["bytes"]
            counts["legacyPngBytes"] += proof["image"]["bytes"]
            counts["displayPngBytes"] += image_record["bytes"]
            counts["proofBytes"] += asset["proofBytes"] + proof_record["bytes"]
    descriptors = {}
    for key, entries in sorted(shards.items()):
        raw = (canonical_json({"schemaVersion": SHARD_SCHEMA, "datasetVersion": shared["datasetVersion"],
                               "shardKey": key, "assets": entries}) + "\n").encode()
        descriptors[key] = {**descriptor(f"shards/{key}.json", raw), "assetCount": len(entries)}
        if read_pinned(output, descriptors[key], MAX_SHARD_BYTES) != raw:
            raise PipelineError("nightlight_sharded_asset_identity_invalid")
    expected = _index_document(shared, parts, descriptors, {window_coordinates(key)[0] for key in used}, counts)
    if root != expected:
        raise PipelineError("nightlight_sharded_root_identity_invalid")
    request = canonical_json(display_parts).encode()
    if len(request) > MAX_ROOT_BYTES:
        raise PipelineError("nightlight_sharded_validation_input_budget_exceeded")
    # One read-only Node process reuses the actual contrast/identity owner for
    # all parts. No encoder, prepare_index or filesystem output is invoked.
    result = subprocess.run([node, str(PROJECT / "tools/run-node.cjs"), "--import", "tsx",
                             str(PROJECT / "data-pipelines/dark-sky/prepare_display_eog.mts"), "--validate-parts"],
                            cwd=PROJECT, input=request, capture_output=True, check=False)
    if result.returncode:
        raise PipelineError("nightlight_sharded_display_validation_failed")
    try:
        report = json.loads(result.stdout)
    except json.JSONDecodeError as error:
        raise PipelineError("nightlight_sharded_display_validation_failed") from error
    if report != {"status": "validated", "authority": "PREPARED_ONLY", "partCount": len(parts), "assetCount": counts["assets"],
                  "databasePublication": False, "imageFilesWritten": 0}:
        raise PipelineError("nightlight_sharded_display_validation_failed")
    return {"root": root, "grids": tuple(grids), "index": dict(pin)}


def prepare_index(manifests: list[Path], output: Path, *, node: str = "node") -> dict[str, Any]:
    if not manifests or len(manifests) > 4096:
        raise PipelineError("nightlight_sharded_parts_invalid")
    output = output.resolve()
    output.mkdir(parents=True, exist_ok=True)
    shared, parts, shards, used = None, {}, {}, set()
    counts = {"assets": 0, "numericBytes": 0, "legacyPngBytes": 0, "displayPngBytes": 0, "proofBytes": 0}
    for manifest_path in manifests:
        manifest = load_manifest(manifest_path)
        if manifest.fixed_raster is None:
            raise PipelineError("nightlight_sharded_fixed_manifest_required")
        selection = read_grid(manifest)
        validate_aoi_alignment(manifest, selection)
        inventory = read_inventory(manifest, selection.resolution_degrees)
        identity = source_identity(manifest, selection.resolution_degrees)
        if shared is not None and shared != identity:
            raise PipelineError("nightlight_sharded_source_identity_mismatch")
        shared = identity
        del selection
        inventory_hash = manifest.fixed_raster["inventory"]["sha256"]
        if inventory_hash in parts:
            raise PipelineError("nightlight_sharded_part_duplicate")
        directory = manifest.path.parent
        target_prefix = f"parts/{inventory_hash}"
        target = output / target_prefix
        display_directory = target / "display"
        result = subprocess.run([node, str(PROJECT / "tools/run-node.cjs"), "--import", "tsx",
                                 str(PROJECT / "data-pipelines/dark-sky/prepare_display_eog.mts"),
                                 "--manifest", str(manifest.path), "--output", str(display_directory)],
                                cwd=PROJECT, capture_output=True, check=False)
        if result.returncode:
            raise PipelineError("nightlight_sharded_display_preparation_failed: " + result.stderr.decode(errors="replace")[-1000:])
        display_inventory_raw = (display_directory / "display-inventory.json").read_bytes()
        displays = json.loads(display_inventory_raw)
        if (displays.get("schemaVersion") != "starward-nightlight-offline-display-v1" or displays.get("releaseState") != "SEALED"
                or displays.get("datasetVersion") != manifest.dataset_version or displays.get("sourceInventorySha256") != inventory_hash
                or len(displays.get("assets", [])) != len(inventory["assets"])):
            raise PipelineError("nightlight_sharded_display_identity_invalid")
        display_entries = {entry["key"]: entry for entry in displays["assets"]}
        inventory_raw = (directory / "inventory.json").read_bytes()
        copy_immutable(directory / "inventory.json", target / "inventory.json")
        parts[inventory_hash] = _part_record(manifest, inventory, inventory_raw, display_inventory_raw)
        for asset in inventory["assets"]:
            key = asset["key"]
            if key in used:
                raise PipelineError("nightlight_sharded_window_duplicate")
            used.add(key)
            part_key = shard_key(key)
            proof = json.loads((directory / (asset["file"] + ".json")).read_bytes())
            display = display_entries.get(key)
            if display is None or display["sourcePublicationId"] != proof["publicationId"]:
                raise PipelineError("nightlight_sharded_display_source_mismatch")
            for file in (asset["file"], asset["file"] + ".json", proof["numeric"]["file"]):
                copy_immutable(directory / file, target / file)
            display_proof = json.loads(read_pinned(display_directory, display["proof"], 1024 * 1024))
            read_pinned(display_directory, display["image"], 16 * 1024 * 1024)
            entry = _asset_record(inventory_hash, asset, proof, display, display_proof, displays["styleVersion"])
            # Admission validates source products; sealing also verifies the
            # bytes at their new delivery paths before declaring the index.
            read_pinned(output, entry["proof"], 1024 * 1024)
            read_pinned(output, entry["image"], 16 * 1024 * 1024)
            read_pinned(output, entry["numeric"], proof["image"]["width"] * proof["image"]["height"] * 6 * 8 + 1024 * 1024)
            shards.setdefault(part_key, {})[key] = entry
            counts["assets"] += 1
            counts["numericBytes"] += proof["numeric"]["bytes"]
            counts["legacyPngBytes"] += proof["image"]["bytes"]
            counts["displayPngBytes"] += display["image"]["bytes"]
            counts["proofBytes"] += asset["proofBytes"] + display["proof"]["bytes"]
    shard_descriptors = {}
    for key, entries in sorted(shards.items()):
        raw = (canonical_json({"schemaVersion": SHARD_SCHEMA, "datasetVersion": shared["datasetVersion"],
                               "shardKey": key, "assets": entries}) + "\n").encode()
        if len(raw) > MAX_SHARD_BYTES:
            raise PipelineError("nightlight_sharded_asset_budget_exceeded")
        file = f"shards/{key}.json"
        (output / file).parent.mkdir(parents=True, exist_ok=True)
        write_immutable(output / file, raw)
        shard_descriptors[key] = {**descriptor(file, raw), "assetCount": len(entries)}
    root = _index_document(shared, parts, shard_descriptors, {window_coordinates(key)[0] for key in used}, counts)
    root_raw = (canonical_json(root) + "\n").encode()
    if len(root_raw) > MAX_ROOT_BYTES:
        raise PipelineError("nightlight_sharded_root_budget_exceeded")
    write_immutable(output / "index.json", root_raw)  # final marker
    return {"status": "prepared", "index": descriptor("index.json", root_raw), "indexVersion": root["indexVersion"],
            "partCount": len(parts), "shardCount": len(shards), "totals": counts,
            "sourceInputVerification": "deferred_to_publish", "databasePublication": False}


def read_window(output: Path, root_descriptor: dict[str, Any], key: str) -> dict[str, Any] | None:
    requested_shard = shard_key(key)
    root = json.loads(read_pinned(output, root_descriptor, MAX_ROOT_BYTES))
    if (root.get("schemaVersion") != INDEX_SCHEMA or root.get("releaseState") != "SEALED"
            or root.get("shardTileSpan") != SHARD_TILE_SPAN or root.get("policySha256") != fixed.POLICY_SHA256):
        raise PipelineError("nightlight_sharded_root_invalid")
    record = root["shards"].get(requested_shard)
    if record is None:
        return None
    if record.get("file") != f"shards/{requested_shard}.json":
        raise PipelineError("nightlight_sharded_descriptor_invalid")
    shard = json.loads(read_pinned(output, record, MAX_SHARD_BYTES))
    if (shard.get("schemaVersion") != SHARD_SCHEMA or shard.get("datasetVersion") != root["datasetVersion"]
            or shard.get("shardKey") != requested_shard or not isinstance(shard.get("assets"), dict)
            or len(shard["assets"]) != record["assetCount"]):
        raise PipelineError("nightlight_sharded_asset_identity_invalid")
    return shard["assets"].get(key)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--manifest", type=Path, action="append", required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    try:
        print(canonical_json(prepare_index(args.manifest, args.output)))
        return 0
    except (OSError, ValueError, PipelineError) as error:
        print(canonical_json({"status": "failed", "error": str(error)}))
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
