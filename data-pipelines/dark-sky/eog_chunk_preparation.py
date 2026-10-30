"""Bounded source-core adapter for the existing offline EOG preparer.

The v2 grid/v3 proof retain the bounded legacy source domain. The explicit
v3 grid/v4 proof describe a larger aggregate only as metadata; every loaded
core keeps the same limits. The original numerical owner integrates masses.
"""
from __future__ import annotations

import math
import re
from pathlib import Path
from typing import Any, Callable, Iterator

import numpy as np
from affine import Affine
from rasterio.windows import Window

import eog_fixed_method as fixed
from eog_fixed_raster import NumericWarpChunk, warp_numeric_chunks, write_prepared_raster
from eog_raster import BOUNDED_SOURCE_LAYOUT, PipelineError, PublicationManifest, RasterGrid, canonical_json, read_selection, sha256_bytes

MAX_DENSE_PIXELS = 2402 ** 2
SOURCE_CORE_SIDE = 512
CHUNK_GRID_SCHEMA = "starward-nightlight-warp-grid-v2"
DOMAIN_GRID_SCHEMA = "starward-nightlight-warp-grid-v3"
CHUNK_ALGORITHM = "bounded-source-core-physical-mass-v1"
_HASH = re.compile(r"[0-9a-f]{64}")


def source_descriptor(grid: RasterGrid) -> dict[str, Any]:
    return {"width": grid.width, "height": grid.height, "west": grid.transform.c, "north": grid.transform.f,
            "longitudeStep": grid.transform.a, "latitudeStep": grid.transform.e}


def _integer(value: Any, low: int, high: int) -> bool:
    return isinstance(value, int) and not isinstance(value, bool) and low <= value <= high


def _spans(length: int, side: int) -> Iterator[tuple[int, int]]:
    at = 0
    while at < length:
        count = min(side, length - at)
        if length - at == side + 1:
            count -= 1  # avoid a final original-pixel window with one corner
        yield at, count
        at += count


def validate_chunk_grid(grid: dict[str, Any]) -> None:
    """Validate the complete two-dimensional core partition without a bitmap."""
    from eog_fixed_raster import _validate_source_partition

    fail = lambda: PipelineError("nightlight_chunked_geometry_invalid")
    if not isinstance(grid, dict):
        raise fail()
    source, original, subdivision = grid.get("source", {}), grid.get("originalSource", {}), grid.get("sourceSubdivision")
    partitioned = grid.get("schemaVersion") == DOMAIN_GRID_SCHEMA
    if (grid.get("schemaVersion") not in {CHUNK_GRID_SCHEMA, DOMAIN_GRID_SCHEMA}
            or (grid.get("sourceLayout") != BOUNDED_SOURCE_LAYOUT if partitioned else "sourceLayout" in grid)
            or grid.get("byteOrder") != "little-endian"
            or grid.get("sourceGeolocationConvention") != "TOP_LEFT_CORNER"
            or not _integer(subdivision, 1, 256) or not isinstance(source, dict) or not isinstance(original, dict)
            or not _integer(grid.get("width"), 1, 5 * 256) or not _integer(grid.get("height"), 1, 5 * 256)
            or set(original) != {"width", "height", "west", "north", "longitudeStep", "latitudeStep"}
            or not all(_integer(original.get(key), 2, 2 ** 31 - 1) for key in ("width", "height"))
            or not all(isinstance(original.get(key), (int, float)) and not isinstance(original[key], bool) and math.isfinite(original[key])
                       for key in ("west", "north", "longitudeStep", "latitudeStep"))
            or not original["longitudeStep"] > 0 or not original["latitudeStep"] < 0
            or (not partitioned and (original["width"] * original["longitudeStep"] > 10.01
                                     or -original["height"] * original["latitudeStep"] > 10.01))
            or original["west"] < -180 or original["west"] + original["width"] * original["longitudeStep"] > 180
            or original["north"] > 85 or original["north"] + original["height"] * original["latitudeStep"] < -85):
        raise fail()
    dense = {**original, "width": original["width"] * subdivision, "height": original["height"] * subdivision,
             "longitudeStep": original["longitudeStep"] / subdivision, "latitudeStep": original["latitudeStep"] / subdivision}
    if source != dense:
        raise fail()
    preparation = grid.get("preparation", {})
    if (not isinstance(preparation, dict) or set(preparation) != {"algorithm", "adapterSha256", "numericOwnerSha256"}
            or preparation.get("algorithm") != CHUNK_ALGORITHM
            or any(not isinstance(preparation.get(key), str) or _HASH.fullmatch(preparation[key]) is None
                   for key in ("adapterSha256", "numericOwnerSha256"))):
        raise fail()
    chunks = grid.get("sourceChunks")
    if not isinstance(chunks, list) or len(chunks) < 2 or len(canonical_json(grid).encode()) + 1 > 1024 * 1024:
        raise fail()
    cores, names = [], set()
    for item in chunks:
        if not isinstance(item, dict) or set(item) != {"sourceWindow", "origin", "core", "geometry"}:
            raise fail()
        window, origin, core, metadata = item["sourceWindow"], item["origin"], item["core"], item["geometry"]
        if (not isinstance(window, list) or len(window) != 4 or any(not _integer(v, 0, 2 ** 31 - 1) for v in window)
                or min(window[2:]) < 2 or window[2] * window[3] * subdivision ** 2 > MAX_DENSE_PIXELS
                or window[2] * original["longitudeStep"] > 10.01 or -window[3] * original["latitudeStep"] > 10.01
                or window[0] + window[2] > original["width"] or window[1] + window[3] > original["height"]
                or origin != [window[1] * subdivision, window[0] * subdivision]
                or not isinstance(core, list) or len(core) != 4 or core[:2] != [0, 0]
                or any(not _integer(v, 0, 2 ** 31 - 1) for v in core)
                or min(core[2:]) < subdivision or core[2] % subdivision or core[3] % subdivision
                or core[2] > window[3] * subdivision or core[3] > window[2] * subdivision):
            raise fail()
        bottom, right = origin[0] + core[2], origin[1] + core[3]
        if (window[3] != core[2] // subdivision + (bottom < dense["height"])
                or window[2] != core[3] // subdivision + (right < dense["width"])):
            raise fail()
        name = f"chunks/{window[1]}-{window[0]}/warp-grid.json"
        if (not isinstance(metadata, dict) or set(metadata) != {"file", "sha256", "bytes"}
                or metadata.get("file") != name or name in names
                or not _integer(metadata.get("bytes"), 1, 16 * 1024)
                or not isinstance(metadata.get("sha256"), str) or _HASH.fullmatch(metadata["sha256"]) is None):
            raise fail()
        names.add(name)
        cores.append((origin[0], origin[1], bottom, right))
    _validate_source_partition(cores, (dense["height"], dense["width"]))
    files = grid.get("files", {})
    if not isinstance(files, dict) or set(files) != {"targetArea", "targetBranch"}:
        raise fail()
    for key, size, suffix in (("targetArea", 8, "f64"), ("targetBranch", 1, "u8")):
        descriptor = files[key]
        if (not isinstance(descriptor, dict) or set(descriptor) != {"file", "sha256", "bytes"} or descriptor.get("file") != f"{key}.{suffix}"
                or descriptor.get("bytes") != grid.get("width", 0) * grid.get("height", 0) * size
                or not isinstance(descriptor.get("sha256"), str) or _HASH.fullmatch(descriptor["sha256"]) is None):
            raise fail()


def prepare_chunk_geometry(source: RasterGrid, window: dict[str, Any], subdivision: int, directory: Path,
                           project: Callable[[dict[str, Any], Path], dict[str, Any]],
                           write_immutable: Callable[[Path, bytes], None], *, source_layout: str | None = None) -> dict[str, Any]:
    """Project one bounded core/halo at a time, retaining descriptors only."""
    if source_layout not in (None, BOUNDED_SOURCE_LAYOUT):
        raise PipelineError("nightlight_chunk_source_layout_invalid")
    if not _integer(subdivision, 1, 256):
        raise PipelineError("nightlight_chunk_source_subdivision_invalid")
    full = source_descriptor(source)
    # 512 original-pixel cores are the already measured coarse-cell mechanism;
    # reduce that shape when necessary to preserve the existing dense limit.
    if (not all(isinstance(full[key], (int, float)) and not isinstance(full[key], bool) and math.isfinite(full[key])
                for key in ("longitudeStep", "latitudeStep"))
            or full["longitudeStep"] <= 0 or full["latitudeStep"] >= 0):
        raise PipelineError("nightlight_chunked_geometry_invalid")
    side = min(SOURCE_CORE_SIDE, 2402 // subdivision - 1,
               math.floor(10.01 / full["longitudeStep"]) - 1, math.floor(10.01 / -full["latitudeStep"]) - 1)
    if side < 2:
        raise PipelineError("nightlight_chunk_source_subdivision_invalid")
    # The published proof keeps its existing one-MiB bound. Even the smallest
    # legal descriptor cannot let an enormous input launch unbounded geometry
    # jobs before discovering that its proof will not fit.
    smallest = {"sourceWindow": [0, 0, 2, 2], "origin": [0, 0], "core": [0, 0, 1, 1],
                "geometry": {"file": "chunks/0-0/warp-grid.json", "bytes": 1, "sha256": "0" * 64}}
    if math.ceil(source.height / side) * math.ceil(source.width / side) > 1024 * 1024 // len(canonical_json(smallest).encode()):
        raise PipelineError("nightlight_chunk_proof_budget_exceeded")
    chunks: list[dict[str, Any]] = []
    for row, core_height in _spans(source.height, side):
        for column, core_width in _spans(source.width, side):
            height = core_height + (row + core_height < source.height)
            width = core_width + (column + core_width < source.width)
            chunks.append({"sourceWindow": [column, row, width, height], "origin": [row * subdivision, column * subdivision],
                           "core": [0, 0, core_height * subdivision, core_width * subdivision],
                           "geometry": {"file": f"chunks/{row}-{column}/warp-grid.json", "sha256": "0" * 64, "bytes": 16 * 1024}})
    preparation = {"algorithm": CHUNK_ALGORITHM, "adapterSha256": sha256_bytes(Path(__file__).read_bytes()),
                   "numericOwnerSha256": sha256_bytes(Path(__file__).with_name("eog_fixed_raster.py").read_bytes())}

    def aggregate(header: dict[str, Any]) -> dict[str, Any]:
        grid = {**header, "schemaVersion": DOMAIN_GRID_SCHEMA if source_layout else CHUNK_GRID_SCHEMA, "originalSource": full,
                "source": {**full, "width": source.width * subdivision, "height": source.height * subdivision,
                           "longitudeStep": full["longitudeStep"] / subdivision, "latitudeStep": full["latitudeStep"] / subdivision},
                "sourceSubdivision": subdivision, "files": {key: header["files"][key] for key in ("targetArea", "targetBranch")},
                "sourceChunks": chunks, "preparation": preparation}
        if source_layout:
            grid["sourceLayout"] = source_layout
        grid.pop("inputSha256", None)
        return grid

    # Admit the entire partition before any projection. The planned child
    # descriptors reserve the existing maximum size, not unverified hashes.
    target_width, target_height = window["columns"] * 256, window["rows"] * 256
    planned = aggregate({"width": target_width, "height": target_height, "window": window,
                         "byteOrder": "little-endian", "sourceGeolocationConvention": "TOP_LEFT_CORNER",
                         "files": {key: {"file": f"{key}.{suffix}", "sha256": "0" * 64,
                                         "bytes": target_width * target_height * stride}
                                   for key, suffix, stride in (("targetArea", "f64", 8), ("targetBranch", "u8", 1))}})
    validate_chunk_grid(planned)
    header = None
    for item in chunks:
            column, row, width, height = item["sourceWindow"]
            # Match the real TIFF reader's one absolute-window transform. Do
            # not translate the cropped affine a second time: equivalent
            # arithmetic can differ by an ulp and fail the strict identity.
            transform = source.transform_for_window(Window(source.window.col_off + column,
                source.window.row_off + row, width, height))
            original = {**full, "width": width, "height": height, "west": transform.c, "north": transform.f}
            folder = directory / "chunks" / f"{row}-{column}"
            metadata = project({"schemaVersion": "starward-nightlight-warp-input-v1", "source": original,
                                "sourceSubdivision": subdivision, "window": window}, folder)
            if header is None:
                header = metadata
                # The real common header is now known. Reject an oversized
                # final proof before launching any additional source cores.
                validate_chunk_grid(aggregate(header))
                for key in ("targetArea", "targetBranch"):
                    write_immutable(directory / metadata["files"][key]["file"], (folder / metadata["files"][key]["file"]).read_bytes())
            elif any(metadata[key] != header[key] for key in ("width", "height", "window", "affine", "boundsGcj02")) or any(
                    metadata["files"][key] != header["files"][key] for key in ("targetArea", "targetBranch")):
                raise PipelineError("nightlight_chunk_target_grid_mismatch")
            raw = (folder / "warp-grid.json").read_bytes()
            item["geometry"] = {"file": f"chunks/{row}-{column}/warp-grid.json", "sha256": sha256_bytes(raw), "bytes": len(raw)}
    if header is None:
        raise PipelineError("nightlight_chunk_source_empty")
    grid = aggregate(header)
    # This aggregate describes the complete source, not the first chunk's input.
    grid.pop("inputSha256", None)
    validate_chunk_grid(grid)
    write_immutable(directory / "warp-grid.json", (canonical_json(grid) + "\n").encode())
    return grid


def _read_array(directory: Path, descriptor: dict[str, Any], shape: tuple[int, int], *, byte: bool = False) -> np.ndarray:
    expected = shape[0] * shape[1] * (1 if byte else 8)
    if (not isinstance(descriptor, dict) or set(descriptor) != {"file", "bytes", "sha256"}
            or not re.fullmatch(r"(?:sourceX|sourceY|identityX|identityY|targetArea)\.f64|targetBranch\.u8", str(descriptor.get("file")))
            or not isinstance(descriptor.get("sha256"), str) or _HASH.fullmatch(descriptor["sha256"]) is None):
        raise PipelineError("nightlight_warp_geometry_checksum_invalid")
    path = directory / descriptor["file"]
    if path.is_symlink() or not path.is_file() or descriptor["bytes"] != expected or path.stat().st_size != expected:
        raise PipelineError("nightlight_warp_geometry_checksum_invalid")
    raw = path.read_bytes()
    if sha256_bytes(raw) != descriptor["sha256"]:
        raise PipelineError("nightlight_warp_geometry_checksum_invalid")
    return np.frombuffer(raw, dtype="uint8" if byte else "<f8").reshape(shape)


def prepare_chunked_window(manifest: PublicationManifest, source: RasterGrid, dataset_version: str,
                           directory: Path, geometry: dict[str, Any], output: Path,
                           *, cells: list[dict[str, Any]] | None = None) -> dict[str, Any]:
    import json

    validate_chunk_grid(geometry)
    if geometry["originalSource"] != source_descriptor(source):
        raise PipelineError("nightlight_warp_source_grid_mismatch")
    if geometry["window"]["columns"] * geometry["window"]["rows"] > 1:
        from eog_fixed_raster import compose_fixed_numbers
        numbers = compose_fixed_numbers(geometry, cells, output)
        return write_prepared_raster(manifest, source, dataset_version, directory, geometry, numbers, output, cells)
    subdivision = geometry["sourceSubdivision"]
    target_shape = (geometry["height"], geometry["width"])
    target_area = _read_array(directory, geometry["files"]["targetArea"], target_shape)
    target_branch = _read_array(directory, geometry["files"]["targetBranch"], target_shape, byte=True)

    def chunks() -> Iterator[NumericWarpChunk]:
        for item in geometry["sourceChunks"]:
            descriptor = item["geometry"]
            file = directory / descriptor["file"]
            if file.stat().st_size != descriptor["bytes"]:
                raise PipelineError("nightlight_chunk_geometry_hash_invalid")
            raw = file.read_bytes()
            if sha256_bytes(raw) != descriptor["sha256"]:
                raise PipelineError("nightlight_chunk_geometry_hash_invalid")
            child = json.loads(raw)
            column, row, width, height = item["sourceWindow"]
            selected = read_selection(manifest, source_window=Window(source.window.col_off + column, source.window.row_off + row, width, height))
            expected_source = {**source_descriptor(source), "width": width, "height": height,
                               "west": selected.transform.c, "north": selected.transform.f}
            expected_dense = {**expected_source, "width": width * subdivision, "height": height * subdivision,
                              "longitudeStep": expected_source["longitudeStep"] / subdivision, "latitudeStep": expected_source["latitudeStep"] / subdivision}
            if (child.get("schemaVersion") != "starward-nightlight-warp-grid-v1" or child.get("originalSource") != expected_source
                    or child.get("source") != expected_dense or child.get("byteOrder") != "little-endian"
                    or child.get("sourceGeolocationConvention") != "TOP_LEFT_CORNER"
                    or child.get("sourceSubdivision") != subdivision or child.get("window") != geometry["window"]
                    or any(child.get(key) != geometry.get(key) for key in ("width", "height", "affine", "boundsGcj02"))
                    or any(child.get(key) != geometry.get(key) for key in ("projectionSourceSha256", "coordinateSourceSha256", "rasterGridSourceSha256", "mercatorSourceSha256"))
                    or set(child.get("files", {})) != {"sourceX", "sourceY", "identityX", "identityY", "targetArea", "targetBranch"}
                    or any(child["files"][key] != geometry["files"][key] for key in ("targetArea", "targetBranch"))):
                raise PipelineError("nightlight_chunk_geometry_identity_invalid")
            dense_shape = (height * subdivision, width * subdivision)
            arrays = {key: _read_array(file.parent, child["files"][key], dense_shape) for key in ("sourceX", "sourceY", "identityX", "identityY")}
            values = np.ma.repeat(np.ma.repeat(selected.radiance, subdivision, axis=0), subdivision, axis=1)
            coverages = np.ma.repeat(np.ma.repeat(selected.coverage, subdivision, axis=0), subdivision, axis=1)
            areas = fixed.pixel_areas(selected.transform * Affine.scale(1 / subdivision), *dense_shape)
            yield NumericWarpChunk(tuple(item["origin"]), tuple(item["core"]), values, coverages, areas,
                                   arrays["sourceX"], arrays["sourceY"], arrays["identityX"], arrays["identityY"])
            # The next original TIFF window is not opened while this one's
            # native/array views are still retained by the generator.
            del selected, arrays, values, coverages, areas

    numbers = warp_numeric_chunks(chunks(), (source.height * subdivision, source.width * subdivision), target_area,
                                 Affine(*geometry["affine"]), manifest.minimum_coverage, target_branches=target_branch)
    return write_prepared_raster(manifest, source, dataset_version, directory, geometry, numbers, output, None)
