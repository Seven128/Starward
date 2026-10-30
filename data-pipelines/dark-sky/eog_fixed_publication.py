"""Schema-2 fixed assets and samples; the existing publisher owns all DB writes."""
from __future__ import annotations

import json
import math
import re
from pathlib import Path
from typing import Any, Mapping, Sequence

import numpy as np
from affine import Affine
from rasterio.io import MemoryFile

import eog_fixed_method as fixed
from eog_fixed_raster import NUMERIC_BANDS, colour_png
from eog_raster import PipelineError, PublicationManifest, RasterGrid, RasterSelection, canonical_json, sha256_bytes, read_native_point_selection

INVENTORY_SCHEMA = "starward-fixed-nightlight-inventory-v1"
ASSET_PATTERN = re.compile(r"nightlight-v2-[0-9a-f]{64}\.png")


def validate_aoi_alignment(manifest: PublicationManifest, selection: RasterSelection | RasterGrid) -> None:
    # Schema 2 declares whole original pixels as its numerical publication
    # footprint. Reject fractional boundaries instead of silently expanding or
    # losing their area. The operator can declare the exact source-grid edges.
    transform = selection.transform
    west, north = transform * (0, 0)
    shape = (selection.width, selection.height) if isinstance(selection, RasterGrid) else (selection.radiance.shape[1], selection.radiance.shape[0])
    east, south = transform * shape
    if any(abs(actual - expected) > 1e-8 for actual, expected in
           zip((west, south, east, north), (manifest.aoi.west, manifest.aoi.south, manifest.aoi.east, manifest.aoi.north))):
        raise PipelineError("fixed_aoi_requires_declared_source_pixel_edges")


def _read_pinned(path: Path, descriptor: Mapping[str, Any], maximum_bytes: int) -> bytes:
    if (not isinstance(descriptor.get("bytes"), int) or isinstance(descriptor["bytes"], bool)
            or not 0 < descriptor["bytes"] <= maximum_bytes or path.stat().st_size != descriptor["bytes"]):
        raise PipelineError("nightlight_asset_size_invalid")
    raw = path.read_bytes()
    if sha256_bytes(raw) != descriptor.get("sha256"):
        raise PipelineError("nightlight_asset_sha256_mismatch")
    return raw


def validate_asset(directory: Path, entry: Mapping[str, Any], manifest: PublicationManifest,
                   resolution: tuple[float, float]) -> dict[str, Any]:
    file = entry.get("file")
    if not isinstance(file, str) or ASSET_PATTERN.fullmatch(file) is None:
        raise PipelineError("nightlight_asset_name_invalid")
    proof_raw = _read_pinned(directory / (file + ".json"),
                             {"bytes": entry.get("proofBytes"), "sha256": entry.get("proofSha256")}, 1024 * 1024)
    proof = json.loads(proof_raw)
    source_set = proof.get("sourceSet", {})
    if (proof.get("schemaVersion") not in {"starward-fixed-nightlight-raster-v2", "starward-fixed-nightlight-raster-v3"}
            or proof.get("datasetVersion") != manifest.dataset_version or proof.get("releaseState") != "PREPARED"
            or proof.get("methodVersion") != fixed.POLICY["methodVersion"]
            or proof.get("styleVersion") != fixed.POLICY["styleVersion"] or proof.get("policy") != fixed.POLICY
            or proof.get("source") != fixed.source_summary(manifest, resolution)
            or source_set.get("datasetVersion") != manifest.dataset_version
            or source_set.get("radianceSha256") != manifest.radiance.sha256
            or source_set.get("coverageSha256") != manifest.coverage.sha256
            or source_set.get("policySha256") != fixed.POLICY_SHA256
            or proof.get("image", {}).get("file") != file):
        raise PipelineError("nightlight_asset_identity_mismatch")
    grid = proof["grid"]
    window = grid["window"]
    key = "-".join(str(window[name]) for name in ("zoom", "x", "y", "columns", "rows"))
    if (entry.get("key") != key or grid.get("grid") != "gcj02-mercator-pixel-centres-v1"
            or window.get("grid") != grid["grid"] or window.get("tilePixels") != 256
            or any(isinstance(window.get(name), bool) or not isinstance(window.get(name), int)
                   for name in ("zoom", "x", "y", "columns", "rows"))
            or not 0 <= window["zoom"] <= 12 or not 1 <= window["columns"] <= 5 or not 1 <= window["rows"] <= 5
            or not 0 <= window["x"] <= 2 ** window["zoom"] - window["columns"]
            or not 0 <= window["y"] <= 2 ** window["zoom"] - window["rows"]
            or grid.get("width") != window["columns"] * 256 or grid.get("height") != window["rows"] * 256
            or proof["image"]["width"] != grid["width"] or proof["image"]["height"] != grid["height"]):
        raise PipelineError("nightlight_asset_grid_invalid")
    is_composition = window["columns"] * window["rows"] > 1
    chunked = proof["schemaVersion"] == "starward-fixed-nightlight-raster-v3"
    if chunked:
        from eog_chunk_preparation import validate_chunk_grid
        validate_chunk_grid(grid)
        original = grid["originalSource"]
        if (source_set.get("preparation") != grid["preparation"]
                or source_set.get("geometrySha256") != sha256_bytes((canonical_json(grid) + "\n").encode())
                or any(abs(actual - expected) > 1e-8 for actual, expected in
                       ((original["west"], manifest.aoi.west), (original["north"], manifest.aoi.north),
                        (original["west"] + original["width"] * original["longitudeStep"], manifest.aoi.east),
                        (original["north"] + original["height"] * original["latitudeStep"], manifest.aoi.south),
                        (original["longitudeStep"], resolution[0]), (original["latitudeStep"], -resolution[1])))):
            raise PipelineError("nightlight_chunked_geometry_identity_invalid")
    elif grid.get("schemaVersion") != "starward-nightlight-warp-grid-v1" or "preparation" in source_set or "sourceChunks" in grid:
        raise PipelineError("nightlight_asset_grid_invalid")
    children = proof.get("cells")
    if (proof.get("derivation") not in (["NUMERIC_FIXED_CELL_COMPOSITION"] if is_composition else
                                      ["GEOS_PHYSICAL_AREA_CHUNKED_INTERSECTION"] if chunked else ["GDAL_PHYSICAL_AREA_SUM", "GEOS_PHYSICAL_AREA_INTERSECTION"])
            or not isinstance(children, list) or len(children) != (window["columns"] * window["rows"] if is_composition else 0)):
        raise PipelineError("nightlight_fixed_cell_derivation_invalid")
    engine = source_set.get("numericalEngine")
    if proof.get("derivation") in {"GEOS_PHYSICAL_AREA_INTERSECTION", "GEOS_PHYSICAL_AREA_CHUNKED_INTERSECTION"} or engine is not None:
        if (not isinstance(engine, dict) or engine.get("algorithm") != "geos-dense-physical-area-intersection-v1"
                or any(not isinstance(engine.get(key), str) or re.fullmatch(r"[0-9]+\.[0-9]+\.[0-9]+", engine[key]) is None
                       for key in ("shapelyVersion", "geosVersion"))
                or not isinstance(engine.get("sourceSha256"), str) or re.fullmatch(r"[0-9a-f]{64}", engine["sourceSha256"]) is None):
            raise PipelineError("nightlight_numeric_engine_invalid")
    png = _read_pinned(directory / file, proof["image"], 16 * 1024 * 1024)
    numeric = proof["numeric"]
    if (numeric.get("file") != file + ".numbers.tif" or numeric.get("format") != "GEOTIFF_FLOAT64_DEFLATE_V1"
            or numeric.get("bands") != list(NUMERIC_BANDS) or numeric.get("coordinates") != "derived-GCJ-Mercator-metres"
            or numeric.get("pixelInterpretation") != "AREA"):
        raise PipelineError("nightlight_numeric_descriptor_invalid")
    raw = _read_pinned(directory / numeric["file"], numeric, grid["width"] * grid["height"] * 6 * 8 + 1024 * 1024)
    with MemoryFile(raw) as memory, memory.open() as image:
        if (image.width != grid["width"] or image.height != grid["height"] or image.count != 6
                or any(dtype != "float64" for dtype in image.dtypes) or image.transform != Affine(*grid["affine"])
                or image.descriptions != NUMERIC_BANDS or image.crs is None or image.crs.to_epsg() is not None
                or "GCJ-02" not in image.crs.to_wkt()):
            raise PipelineError("nightlight_numeric_grid_invalid")
        arrays = dict(zip(NUMERIC_BANDS, image.read()))
    quality, means = arrays["qualityMask"], arrays["radianceMean"]
    valid = np.isin(quality, [1, 2])
    tolerance = fixed.POLICY["qualityPolicy"]["areaFractionNumericalTolerance"]
    fractions = np.stack([arrays[key] for key in NUMERIC_BANDS[1:5]])
    if (not np.all(np.isin(quality, range(1, 7))) or not np.array_equal(np.isfinite(means), valid)
            or np.any(means[valid] < 0) or not np.all(np.isfinite(fractions) & (fractions >= 0) & (fractions <= 1))
            or np.any(arrays["validAreaFraction"][valid] < fixed.POLICY["qualityPolicy"]["minimumValidAreaFraction"] - 1e-12)
            or np.any(arrays["validAreaFraction"][quality == 1] < 1 - tolerance)
            or np.any(np.sum(fractions[:3], axis=0) > arrays["publishedAreaFraction"] + tolerance)):
        raise PipelineError("nightlight_numeric_quality_invalid")
    with MemoryFile(png) as memory, memory.open() as image, MemoryFile(colour_png(arrays)) as expected_memory, expected_memory.open() as expected:
        if image.count != 4 or not np.array_equal(image.read(), expected.read()):
            raise PipelineError("nightlight_image_numeric_policy_mismatch")
    identity = sha256_bytes(canonical_json(source_set).encode())
    asset_identity = sha256_bytes(f"{identity}:{proof['image']['sha256']}:{numeric['sha256']}".encode())
    expected_file = f"nightlight-v2-{asset_identity}.png"
    if file != expected_file or proof.get("publicationId") != f"nightlight:{identity}:{proof['image']['sha256']}:{numeric['sha256']}":
        raise PipelineError("nightlight_asset_identity_mismatch")
    if (proof.get("quality", {}).get("validPixelCount") != int(valid.sum())
            or proof["quality"].get("validZeroPixelCount") != int((valid & (means == 0)).sum())
            or proof["quality"].get("pixelCount") != int(valid.size)):
        raise PipelineError("nightlight_quality_summary_mismatch")
    if proof["quality"].get("qualityMaskCounts") != {str(i): int((quality == i).sum()) for i in range(1, 7)}:
        raise PipelineError("nightlight_quality_summary_mismatch")
    return proof


def inventory_version(value: Mapping[str, Any]) -> str:
    core = {key: value[key] for key in ("datasetVersion", "policySha256", "assets")}
    return "nightlight-fixed:" + sha256_bytes(canonical_json(core).encode())


def read_inventory_with_proofs(manifest: PublicationManifest, resolution: tuple[float, float]) -> tuple[dict[str, Any], dict[str, Any]]:
    reference = manifest.fixed_raster
    if reference is None or reference["policySha256"] != fixed.POLICY_SHA256:
        raise PipelineError("nightlight_fixed_policy_mismatch")
    inventory_path = (manifest.path.parent / reference["inventory"]["file"]).resolve()
    if inventory_path.stat().st_size > 2 * 1024 * 1024:
        raise PipelineError("nightlight_inventory_size_invalid")
    raw = inventory_path.read_bytes()
    if sha256_bytes(raw) != reference["inventory"]["sha256"]:
        raise PipelineError("nightlight_inventory_sha256_mismatch")
    value = json.loads(raw)
    assets = value.get("assets")
    if (value.get("schemaVersion") != INVENTORY_SCHEMA or value.get("releaseState") != "SEALED"
            or value.get("datasetVersion") != manifest.dataset_version or value.get("policySha256") != fixed.POLICY_SHA256
            or value.get("methodVersion") != fixed.POLICY["methodVersion"]
            or value.get("styleVersion") != fixed.POLICY["styleVersion"]
            or value.get("aoiWgs84") != manifest.raw["aoi"] or not isinstance(assets, list) or not 1 <= len(assets) <= 4096
            or len({entry.get("key") for entry in assets}) != len(assets)
            or len({entry.get("file") for entry in assets}) != len(assets)
            or value.get("publicationVersion") != inventory_version(value)):
        raise PipelineError("nightlight_inventory_invalid")
    proofs = {entry["file"]: validate_asset(inventory_path.parent, entry, manifest, resolution) for entry in assets}
    for proof in proofs.values():
        seen = set()
        window = proof["grid"]["window"]
        for child in proof["cells"]:
            target = proofs.get(child.get("file"))
            if target is None:
                raise PipelineError("nightlight_fixed_cell_reference_missing")
            cell = target["grid"]["window"]
            if (child.get("publicationId") != target["publicationId"] or child.get("numericSha256") != target["numeric"]["sha256"]
                    or child.get("x") != cell["x"] or child.get("y") != cell["y"] or cell["zoom"] != window["zoom"]
                    or cell["columns"] != 1 or cell["rows"] != 1 or (cell["x"], cell["y"]) in seen
                    or not window["x"] <= cell["x"] < window["x"] + window["columns"]
                    or not window["y"] <= cell["y"] < window["y"] + window["rows"]):
                raise PipelineError("nightlight_fixed_cell_reference_invalid")
            seen.add((cell["x"], cell["y"]))
    return value, proofs


def read_inventory(manifest: PublicationManifest, resolution: tuple[float, float]) -> dict[str, Any]:
    return read_inventory_with_proofs(manifest, resolution)[0]


def sample_point(selection: RasterSelection, manifest: PublicationManifest, source: Mapping[str, Any],
                 longitude: float, latitude: float) -> dict[str, Any]:
    column_float, row_float = ~selection.transform * (longitude, latitude)
    row, column = math.floor(row_float), math.floor(column_float)
    if not 0 <= row < selection.radiance.shape[0] or not 0 <= column < selection.radiance.shape[1]:
        raise PipelineError("spot_outside_selected_aoi")
    values, coverages = np.ma.masked_all((3, 3)), np.ma.masked_all((3, 3))
    published = np.zeros((3, 3), dtype="bool")
    for dy in range(3):
        for dx in range(3):
            y, x = row + dy - 1, column + dx - 1
            if 0 <= y < selection.radiance.shape[0] and 0 <= x < selection.radiance.shape[1]:
                values[dy, dx], coverages[dy, dx] = selection.radiance[y, x], selection.coverage[y, x]
                published[dy, dx] = True
    transform = selection.transform * Affine.translation(column - 1, row - 1)
    return _spot_estimate(values, coverages, published, transform, selection.resolution_degrees, manifest, source)


def sample_source_point(manifest: PublicationManifest, source: Mapping[str, Any], grids: Sequence[RasterGrid],
                        longitude: float, latitude: float) -> dict[str, Any]:
    """Sample one native neighbourhood over the published part union, once."""
    if not grids or any(grid.raster_transform != grids[0].raster_transform
                        or grid.resolution_degrees != grids[0].resolution_degrees for grid in grids):
        raise PipelineError("nightlight_sharded_source_grid_mismatch")
    column_float, row_float = ~grids[0].raster_transform * (longitude, latitude)
    row, column = math.floor(row_float), math.floor(column_float)
    contains = lambda window, y, x: (window.col_off <= x < window.col_off + window.width
                                     and window.row_off <= y < window.row_off + window.height)
    if not any(contains(grid.window, row, column) for grid in grids):
        raise PipelineError("spot_outside_published_aoi")
    selection = read_native_point_selection(manifest, longitude, latitude)
    if (selection.window.col_off != column - 1 or selection.window.row_off != row - 1
            or selection.resolution_degrees != grids[0].resolution_degrees
            or selection.transform != grids[0].transform_for_window(selection.window)):
        raise PipelineError("nightlight_sharded_source_grid_changed")
    published = np.zeros((3, 3), dtype="bool")
    for dy in range(3):
        for dx in range(3):
            published[dy, dx] = any(contains(grid.window, row + dy - 1, column + dx - 1) for grid in grids)
    return _spot_estimate(selection.radiance, selection.coverage, published, selection.transform,
                          selection.resolution_degrees, manifest, source)


def _spot_estimate(values: np.ma.MaskedArray, coverages: np.ma.MaskedArray, published: np.ndarray,
                   transform: Affine, resolution: tuple[float, float], manifest: PublicationManifest,
                   source: Mapping[str, Any]) -> dict[str, Any]:
    result = fixed.aggregate(values, coverages, fixed.pixel_areas(transform, 3, 3),
                             manifest.minimum_coverage, published=published)
    statistics = result["statistics"]
    band = fixed.band_for_radiance(statistics["median"]) if statistics else None
    unavailable_labels = {"UNPUBLISHED": "年度夜光尚未发布", "SOURCE_MISSING": "年度夜光源资料缺测",
                          "INSUFFICIENT_COVERAGE": "年度夜光观测次数不足", "INSUFFICIENT_VALID_AREA": "年度夜光有效面积不足"}
    label = next((item["label"] for item in fixed.POLICY["bands"] if item["id"] == band), unavailable_labels.get(result["reason"], "年度卫星夜光覆盖不足"))
    return {"levelAtMost": None, "productBand": band,
            "radiance": {key: statistics[key] for key in ("median", "p10", "p90", "unit")} if statistics else None,
            "minimumCloudFreeObservations": statistics["minimumCloudFreeObservations"] if statistics else None,
            "calibratedSkyClass": False, "label": label, "method": fixed.POLICY["methodVersion"],
            "datasetVersion": manifest.dataset_version, "dataDate": str(manifest.data_year),
            "precision": f"年度 {resolution[0]:.8g}°×{resolution[1]:.8g}° 原始像元；3×3 邻域按有效物理面积加权分位数，固定辐亮度分级；不是天空实测",
            "state": "ESTIMATED" if statistics else "UNAVAILABLE", "source": dict(source),
            "statistic": fixed.POLICY["statistics"]["spot"],
            "quality": {**result["quality"], "state": result["state"], "reason": result["reason"]}}


def publication_payload(manifest: PublicationManifest, selection: RasterSelection) -> dict[str, Any]:
    inventory = read_inventory(manifest, selection.resolution_degrees)
    return {"schemaVersion": 2, "datasetVersion": manifest.dataset_version, "productName": manifest.product_name,
            "dataYear": manifest.data_year, "source": fixed.source_summary(manifest, selection.resolution_degrees),
            "aoi": manifest.raw["aoi"], "minimumCloudFreeObservations": manifest.minimum_coverage,
            "methodVersion": fixed.POLICY["methodVersion"], "styleVersion": fixed.POLICY["styleVersion"],
            "policy": fixed.POLICY, "policySha256": fixed.POLICY_SHA256,
            "rasterInventory": {"sha256": manifest.fixed_raster["inventory"]["sha256"],
                                "publicationVersion": inventory["publicationVersion"], "assetCount": len(inventory["assets"])},
            "radianceUnit": fixed.POLICY["unit"], "calibratedSkyClass": False}
