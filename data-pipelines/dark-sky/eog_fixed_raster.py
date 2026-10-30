"""Prepare fixed GCJ display rasters from numerical EOG source pixels.

GEOS intersects physical-area masses through dense geolocation arrays produced by
the shared coordinate package. Colour is applied only after numerical means
and the complete target-footprint quality fractions have been calculated.
Publication and the database transaction remain with publish_eog_viirs.
"""
from __future__ import annotations

import dataclasses
from bisect import bisect_left, insort
from collections.abc import Iterable
import hashlib
import json
from pathlib import Path
from typing import Any

import numpy as np
from affine import Affine
from rasterio.crs import CRS
from rasterio.io import MemoryFile

import eog_fixed_method as fixed
from eog_area_intersection import intersect_area_masses, engine_identity
from eog_raster import PipelineError, PublicationManifest, RasterGrid, RasterSelection, canonical_json


def _warp_area_masses(values: np.ma.MaskedArray, coverages: np.ma.MaskedArray, source_areas: np.ndarray,
                      source_x: np.ndarray, source_y: np.ndarray, target_areas: np.ndarray,
                      affine: Affine, minimum_coverage: int, *, identity_x: np.ndarray | None = None,
                      identity_y: np.ndarray | None = None, target_branches: np.ndarray | None = None,
                      source_core: tuple[int, int, int, int] | None = None) -> np.ndarray:
    radiance = np.asarray(values.data, dtype="float64")
    coverage = np.asarray(coverages.data, dtype="float64")
    if (radiance.shape != coverage.shape or radiance.shape != source_areas.shape
            or radiance.shape != source_x.shape or radiance.shape != source_y.shape
            or not np.all(np.isfinite(source_areas) & (source_areas > 0))
            or target_areas.ndim != 2 or target_areas.size == 0
            or not np.all(np.isfinite(target_areas) & (target_areas > 0))):
        raise PipelineError("nightlight_numeric_warp_shape_invalid")
    missing, insufficient, valid = fixed.quality_masks(values, coverages, minimum_coverage)
    source = np.stack([np.where(valid, radiance, 0) * source_areas, valid * source_areas,
                       missing * source_areas, insufficient * source_areas, source_areas])
    if target_branches is None:
        mass = intersect_area_masses(source, source_x, source_y, affine, np.ones(target_areas.shape, dtype=bool), source_core=source_core)
    else:
        if (identity_x is None or identity_y is None or identity_x.shape != source_x.shape
                or identity_y.shape != source_y.shape or target_branches.shape != target_areas.shape
                or not np.all((target_branches == 0) | (target_branches == 1))):
            raise PipelineError("nightlight_coordinate_branches_invalid")
        # Canonical inverse selection owns the branch. Never let a forward
        # geolocation mesh fold over the footprint discontinuity and add both.
        mass = np.zeros((5, *target_areas.shape), dtype="float64")
        for selected, x, y in [(0, identity_x, identity_y), (1, source_x, source_y)]:
            chosen = target_branches == selected
            if np.any(chosen):
                projected = intersect_area_masses(source, x, y, affine, chosen, source_core=source_core)
                mass[:, chosen] = projected[:, chosen]
    return mass


def _numbers_from_masses(mass: np.ndarray, target_areas: np.ndarray) -> dict[str, np.ndarray]:
    """Normalize once against the complete target, after all source cores."""
    area_excess = np.maximum(mass[4] / target_areas - 1, 0)
    tolerance = fixed.POLICY["qualityPolicy"]["areaFractionNumericalTolerance"]
    if float(np.max(area_excess)) > tolerance:
        raise PipelineError(f"nightlight_geolocation_area_overlap:{float(np.max(area_excess)):.12g}")
    valid_fraction = np.clip(mass[1] / target_areas, 0, 1)
    published_fraction = np.clip(mass[4] / target_areas, 0, 1)
    enough = (valid_fraction + 1e-12 >= fixed.POLICY["qualityPolicy"]["minimumValidAreaFraction"]) & (mass[1] > 0)
    means = np.full(target_areas.shape, np.nan, dtype="float64")
    np.divide(mass[0], mass[1], out=means, where=enough)
    # 1/2: available/partial; 3: coverage; 4: source missing; 5: unpublished;
    # 6: a mixture that has insufficient valid physical area.
    quality = np.full(target_areas.shape, 6, dtype="uint8")
    quality[(mass[2] == 0) & (mass[3] > 0)] = 3
    quality[(mass[2] > 0) & (mass[3] == 0)] = 4
    quality[mass[4] == 0] = 5
    quality[enough] = 2
    quality[enough & (valid_fraction >= 1 - tolerance)] = 1
    return {"radianceMean": means, "validAreaFraction": valid_fraction,
            "sourceMissingAreaFraction": np.clip(mass[2] / target_areas, 0, 1),
            "insufficientCoverageAreaFraction": np.clip(mass[3] / target_areas, 0, 1),
            "publishedAreaFraction": published_fraction, "qualityMask": quality,
            "areaExcessFraction": area_excess}


def warp_numeric(values: np.ma.MaskedArray, coverages: np.ma.MaskedArray, source_areas: np.ndarray,
                 source_x: np.ndarray, source_y: np.ndarray, target_areas: np.ndarray,
                 affine: Affine, minimum_coverage: int, *, identity_x: np.ndarray | None = None,
                 identity_y: np.ndarray | None = None, target_branches: np.ndarray | None = None) -> dict[str, np.ndarray]:
    mass = _warp_area_masses(values, coverages, source_areas, source_x, source_y, target_areas, affine,
                            minimum_coverage, identity_x=identity_x, identity_y=identity_y, target_branches=target_branches)
    return _numbers_from_masses(mass, target_areas)


@dataclasses.dataclass(frozen=True)
class NumericWarpChunk:
    """One bounded dense source window, with halo excluded from its core.

    origin is the supplied window's (row, column) in the complete dense source
    grid. core is its local half-open (top, left, bottom, right) rectangle.
    All numeric and geolocation arrays include the same halo window.
    """
    origin: tuple[int, int]
    core: tuple[int, int, int, int]
    values: np.ma.MaskedArray
    coverages: np.ma.MaskedArray
    source_areas: np.ndarray
    source_x: np.ndarray
    source_y: np.ndarray
    identity_x: np.ndarray | None = None
    identity_y: np.ndarray | None = None


def _validate_source_partition(cores: list[tuple[int, int, int, int]], source_shape: tuple[int, int]) -> None:
    """A rectangle sweep proves no duplicated core; equal area then proves cover.

    Only rectangle metadata is retained, never a source-sized coverage bitmap.
    Shared y edges retire before new rectangles enter, so adjacency is legal.
    """
    if sum((bottom - top) * (right - left) for top, left, bottom, right in cores) != source_shape[0] * source_shape[1]:
        raise PipelineError("nightlight_source_partition_incomplete")
    events = sorted((y, kind, left, right, index) for index, (top, left, bottom, right) in enumerate(cores)
                    for y, kind in ((top, 1), (bottom, -1)))
    active: list[tuple[int, int, int]] = []
    for _, kind, left, right, index in events:
        item = (left, right, index)
        position = bisect_left(active, item)
        if kind == -1:
            if position >= len(active) or active[position] != item:
                raise PipelineError("nightlight_source_partition_invalid")
            active.pop(position)
        else:
            if position and active[position - 1][1] > left or position < len(active) and right > active[position][0]:
                raise PipelineError("nightlight_source_partition_overlap")
            insort(active, item)


def warp_numeric_chunks(chunks: Iterable[NumericWarpChunk], source_shape: tuple[int, int],
                        target_areas: np.ndarray, affine: Affine, minimum_coverage: int, *,
                        target_branches: np.ndarray | None = None) -> dict[str, np.ndarray]:
    """Accumulate disjoint source-core masses while retaining one chunk at a time.

    source_shape describes the entire published dense source rectangle. Missing
    source values belong in its masks; omitting a core cannot turn a hole into
    unpublished data. Each window keeps the existing 2402² geometry budget.
    """
    if (len(source_shape) != 2 or any(isinstance(value, bool) or not isinstance(value, int) or value < 2 for value in source_shape)
            or target_areas.ndim != 2 or target_areas.size == 0 or target_areas.size > 256 ** 2
            or not np.all(np.isfinite(target_areas) & (target_areas > 0))):
        raise PipelineError("nightlight_chunked_warp_shape_invalid")
    mass = np.zeros((5, *target_areas.shape), dtype="float64")
    compensation = np.zeros_like(mass)
    cores: list[tuple[int, int, int, int]] = []
    for chunk in chunks:
        shape, origin, core = chunk.values.shape, chunk.origin, chunk.core
        if (len(shape) != 2 or min(shape) < 2 or shape[0] * shape[1] > 2402 ** 2
                or len(origin) != 2 or len(core) != 4
                or any(isinstance(value, bool) or not isinstance(value, int) for value in (*origin, *core))
                or min(origin) < 0 or origin[0] + shape[0] > source_shape[0] or origin[1] + shape[1] > source_shape[1]
                or not 0 <= core[0] < core[2] <= shape[0] or not 0 <= core[1] < core[3] <= shape[1]):
            raise PipelineError("nightlight_chunk_source_core_invalid")
        global_core = (origin[0] + core[0], origin[1] + core[1], origin[0] + core[2], origin[1] + core[3])
        if ((global_core[2] < source_shape[0] and core[2] == shape[0])
                or (global_core[3] < source_shape[1] and core[3] == shape[1])):
            raise PipelineError("nightlight_chunk_interior_halo_required")
        cores.append(global_core)
        projected = _warp_area_masses(chunk.values, chunk.coverages, chunk.source_areas, chunk.source_x, chunk.source_y,
                                      target_areas, affine, minimum_coverage, identity_x=chunk.identity_x,
                                      identity_y=chunk.identity_y, target_branches=target_branches, source_core=core)
        # Kahan accumulation bounds partition-order rounding without retaining
        # per-chunk arrays or normalizing incomplete quality fractions.
        corrected = projected - compensation
        combined = mass + corrected
        compensation = (combined - mass) - corrected
        mass = combined
        # Do not hold the previous source window while its generator prepares
        # the next one; only the bounded target masses survive this iteration.
        del chunk
    _validate_source_partition(cores, source_shape)
    return _numbers_from_masses(mass, target_areas)


def colour_png(numbers: dict[str, np.ndarray]) -> bytes:
    values = numbers["radianceMean"]
    valid = np.isfinite(values)
    bands = np.searchsorted(np.asarray(fixed.THRESHOLDS) * (1 + fixed.POLICY["boundaryNumericalRelativeTolerance"]), values, side="left")
    rgba = np.zeros((4, *values.shape), dtype="uint8")
    for index, band in enumerate(fixed.POLICY["bands"]):
        mask = valid & (bands == index)
        for channel in range(3):
            rgba[channel][mask] = int(band["color"][1 + channel * 2:3 + channel * 2], 16)
        rgba[3][mask] = fixed.POLICY["alpha"]
    with MemoryFile() as memory:
        with memory.open(driver="PNG", width=values.shape[1], height=values.shape[0], count=4, dtype="uint8") as image:
            image.write(rgba)
        return memory.read()


NUMERIC_BANDS = ("radianceMean", "validAreaFraction", "sourceMissingAreaFraction",
                 "insufficientCoverageAreaFraction", "publishedAreaFraction", "qualityMask")
NUMERIC_CRS = CRS.from_wkt('LOCAL_CS["Starward GCJ-02 display Mercator",UNIT["metre",1],'
                         'AXIS["Easting",EAST],AXIS["Northing",NORTH]]')


def numeric_geotiff(numbers: dict[str, np.ndarray], affine: Affine) -> bytes:
    """A standard, lossless numerical companion readable by the existing API.

    No WGS84/EPSG code is assigned to these already transformed coordinates.
    The publication proof binds the display grid and the meaning of each band.
    """
    height, width = numbers["radianceMean"].shape
    with MemoryFile() as memory:
        with memory.open(driver="GTiff", width=width, height=height, count=len(NUMERIC_BANDS),
                         dtype="float64", crs=NUMERIC_CRS, transform=affine, nodata=np.nan,
                         tiled=True, blockxsize=128, blockysize=128, compress="DEFLATE", predictor=3) as image:
            for index, key in enumerate(NUMERIC_BANDS, 1):
                image.write(numbers[key].astype("float64"), index)
                image.set_band_description(index, key)
        return memory.read()


def prepare_fixed_window(manifest: PublicationManifest, selection: RasterSelection, dataset_version: str,
                         geometry_directory: Path, output: Path, *, cells: list[dict[str, Any]] | None = None) -> dict[str, Any]:
    if dataset_version == manifest.dataset_version and manifest.fixed_raster is None:
        raise PipelineError("fixed_method_requires_new_dataset_version")
    geometry = json.loads((geometry_directory / "warp-grid.json").read_bytes())
    if (geometry.get("schemaVersion") != "starward-nightlight-warp-grid-v1"
            or geometry.get("byteOrder") != "little-endian"
            or geometry.get("sourceGeolocationConvention") != "TOP_LEFT_CORNER"):
        raise PipelineError("nightlight_warp_geometry_invalid")
    expected_source = {"width": selection.radiance.shape[1], "height": selection.radiance.shape[0],
                       "west": selection.transform.c, "north": selection.transform.f,
                       "longitudeStep": selection.transform.a, "latitudeStep": selection.transform.e}
    subdivision = geometry.get("sourceSubdivision", 1)
    if isinstance(subdivision, bool) or not isinstance(subdivision, int) or not 1 <= subdivision <= 256:
        raise PipelineError("nightlight_warp_subdivision_invalid")
    projected_source = {**expected_source, "width": expected_source["width"] * subdivision,
                        "height": expected_source["height"] * subdivision,
                        "longitudeStep": expected_source["longitudeStep"] / subdivision,
                        "latitudeStep": expected_source["latitudeStep"] / subdivision}
    if (geometry.get("source") != projected_source or
            geometry.get("originalSource", expected_source) != expected_source):
        raise PipelineError("nightlight_warp_source_grid_mismatch")
    if geometry["window"]["columns"] * geometry["window"]["rows"] > 1:
        numbers = compose_fixed_numbers(geometry, cells, output)
        return write_prepared_raster(manifest, selection, dataset_version, geometry_directory, geometry, numbers, output, cells)
    radiance = np.ma.repeat(np.ma.repeat(selection.radiance, subdivision, axis=0), subdivision, axis=1)
    coverage = np.ma.repeat(np.ma.repeat(selection.coverage, subdivision, axis=0), subdivision, axis=1)
    source_transform = selection.transform * Affine.scale(1 / subdivision)
    arrays = {}
    required_arrays = {"sourceX", "sourceY", "identityX", "identityY", "targetArea", "targetBranch"}
    if set(geometry["files"]) != required_arrays:
        raise PipelineError("nightlight_warp_geometry_invalid")
    for key, entry in geometry["files"].items():
        suffix = "u8" if key == "targetBranch" else "f64"
        if entry["file"] != f"{key}.{suffix}":
            raise PipelineError("nightlight_warp_geometry_invalid")
        raw = (geometry_directory / entry["file"]).read_bytes()
        if len(raw) != entry["bytes"] or hashlib.sha256(raw).hexdigest() != entry["sha256"]:
            raise PipelineError("nightlight_warp_geometry_checksum_invalid")
        shape = (geometry["height"], geometry["width"]) if key in {"targetArea", "targetBranch"} else radiance.shape
        arrays[key] = np.frombuffer(raw, dtype="uint8" if key == "targetBranch" else "<f8").reshape(shape)
    numbers = warp_numeric(radiance, coverage,
                           fixed.pixel_areas(source_transform, *radiance.shape),
                           arrays["sourceX"], arrays["sourceY"], arrays["targetArea"], Affine(*geometry["affine"]), manifest.minimum_coverage,
                           identity_x=arrays["identityX"], identity_y=arrays["identityY"], target_branches=arrays["targetBranch"])
    return write_prepared_raster(manifest, selection, dataset_version, geometry_directory, geometry, numbers, output, None)


def compose_fixed_numbers(geometry: dict[str, Any], cells: list[dict[str, Any]] | None, directory: Path) -> dict[str, np.ndarray]:
    window = geometry["window"]
    if cells is None or len(cells) != window["columns"] * window["rows"]:
        raise PipelineError("nightlight_fixed_cells_required")
    numbers = {key: np.zeros((geometry["height"], geometry["width"]), dtype="float64")
               for key in (*NUMERIC_BANDS, "areaExcessFraction")}
    seen = set()
    for cell in cells:
        child = cell["grid"]["window"]
        if (child["grid"] != window["grid"] or child["zoom"] != window["zoom"] or child["columns"] != 1 or child["rows"] != 1
                or not window["x"] <= child["x"] < window["x"] + window["columns"]
                or not window["y"] <= child["y"] < window["y"] + window["rows"] or (child["x"], child["y"]) in seen):
            raise PipelineError("nightlight_fixed_cell_grid_invalid")
        seen.add((child["x"], child["y"]))
        raw = (directory / cell["numeric"]["file"]).read_bytes()
        if len(raw) != cell["numeric"]["bytes"] or hashlib.sha256(raw).hexdigest() != cell["numeric"]["sha256"]:
            raise PipelineError("nightlight_fixed_cell_hash_invalid")
        row, column = (child["y"] - window["y"]) * 256, (child["x"] - window["x"]) * 256
        with MemoryFile(raw) as memory, memory.open() as image:
            if image.width != 256 or image.height != 256 or image.count != len(NUMERIC_BANDS):
                raise PipelineError("nightlight_fixed_cell_dimensions_invalid")
            for key, values in zip(NUMERIC_BANDS, image.read()):
                numbers[key][row:row + 256, column:column + 256] = values
        numbers["areaExcessFraction"][row:row + 256, column:column + 256] = cell["quality"]["maximumAreaExcessFraction"]
    return numbers


def write_prepared_raster(manifest: PublicationManifest, selection: RasterSelection | RasterGrid, dataset_version: str,
                          geometry_directory: Path, geometry: dict[str, Any], numbers: dict[str, np.ndarray],
                          output: Path, cells: list[dict[str, Any]] | None) -> dict[str, Any]:
    png = colour_png(numbers)
    image_hash = hashlib.sha256(png).hexdigest()
    source_set = {"datasetVersion": dataset_version, "radianceSha256": manifest.radiance.sha256,
                  "coverageSha256": manifest.coverage.sha256, "policySha256": fixed.POLICY_SHA256,
                  "geometrySha256": hashlib.sha256((geometry_directory / "warp-grid.json").read_bytes()).hexdigest(),
                  "numericalEngine": engine_identity()}
    partitioned = geometry.get("schemaVersion") == "starward-nightlight-warp-grid-v3"
    chunked = partitioned or geometry.get("schemaVersion") == "starward-nightlight-warp-grid-v2"
    if chunked:
        source_set["preparation"] = geometry["preparation"]
    identity = hashlib.sha256(canonical_json(source_set).encode()).hexdigest()
    numeric_bytes = numeric_geotiff(numbers, Affine(*geometry["affine"]))
    numeric_hash = hashlib.sha256(numeric_bytes).hexdigest()
    # One combined digest also binds the numerical companion. Encoding changes
    # cannot reuse a previous proof or image URL with different sidecar bytes.
    asset_identity = hashlib.sha256(f"{identity}:{image_hash}:{numeric_hash}".encode()).hexdigest()
    file = f"nightlight-v2-{asset_identity}.png"
    numeric = {"file": file + ".numbers.tif", "bytes": len(numeric_bytes), "sha256": numeric_hash,
               "format": "GEOTIFF_FLOAT64_DEFLATE_V1", "bands": list(NUMERIC_BANDS),
               "coordinates": "derived-GCJ-Mercator-metres", "pixelInterpretation": "AREA"}
    source = fixed.source_summary(dataclasses.replace(manifest, dataset_version=dataset_version), selection.resolution_degrees)
    valid = np.isfinite(numbers["radianceMean"])
    proof = {"schemaVersion": "starward-fixed-nightlight-raster-v4" if partitioned else "starward-fixed-nightlight-raster-v3" if chunked else "starward-fixed-nightlight-raster-v2", "releaseState": "PREPARED",
             "publicationId": f"nightlight:{identity}:{image_hash}:{numeric_hash}", "datasetVersion": dataset_version,
             "methodVersion": fixed.POLICY["methodVersion"], "styleVersion": fixed.POLICY["styleVersion"],
             "policy": fixed.POLICY, "sourceSet": source_set, "source": source,
             "derivation": "NUMERIC_FIXED_CELL_COMPOSITION" if cells else "GEOS_PHYSICAL_AREA_PARTITIONED_INTERSECTION" if partitioned else "GEOS_PHYSICAL_AREA_CHUNKED_INTERSECTION" if chunked else "GEOS_PHYSICAL_AREA_INTERSECTION",
             "cells": [{"x": cell["grid"]["window"]["x"], "y": cell["grid"]["window"]["y"],
                        "file": cell["image"]["file"], "publicationId": cell["publicationId"], "numericSha256": cell["numeric"]["sha256"]}
                       for cell in (cells or [])],
             "image": {"file": file, "sha256": image_hash, "bytes": len(png), "width": geometry["width"], "height": geometry["height"]},
             "grid": geometry, "numeric": numeric, "unit": fixed.POLICY["unit"], "statistic": fixed.POLICY["statistics"]["map"],
             "quality": {"policyVersion": fixed.POLICY["qualityPolicy"]["version"],
                         "minimumCloudFreeObservations": manifest.minimum_coverage,
                         "validPixelCount": int(valid.sum()), "validZeroPixelCount": int((valid & (numbers["radianceMean"] == 0)).sum()),
                         "pixelCount": int(valid.size), "qualityMaskCounts": {str(i): int((numbers["qualityMask"] == i).sum()) for i in range(1, 7)},
                         "maximumAreaExcessFraction": float(numbers["areaExcessFraction"].max())}}
    output.mkdir(parents=True, exist_ok=True)
    for name, raw in [(file, png), (numeric["file"], numeric_bytes), (file + ".json", (canonical_json(proof) + "\n").encode())]:
        destination = output / name
        try:
            with destination.open("xb") as stream:
                stream.write(raw)
        except FileExistsError:
            if destination.read_bytes() != raw:
                raise PipelineError("nightlight_immutable_asset_conflict")
    return proof
