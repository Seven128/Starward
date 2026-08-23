"""Validate and atomically publish an operator-acquired EOG Annual VNL dataset.

The publisher deliberately keeps satellite upward-radiance separate from Bortle,
SQM and field-observed sky quality.  It accepts only local, hash-pinned inputs;
network acquisition and provider credentials are outside this process.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import os
import re
import sys
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable, Mapping, Sequence

import numpy as np
import psycopg
import rasterio
from psycopg.types.json import Jsonb
from rasterio.errors import RasterioIOError
from rasterio.windows import Window, from_bounds


SOURCE_PAGE = "https://eogdata.mines.edu/products/vnl/"
LICENSE_URL = "https://eogdata.mines.edu/files/EOG_products_CC_License.pdf"
SOURCE_LICENSE = "CC BY 4.0"
RADIANCE_UNIT = "nW/cm²/sr"
SOURCE_PROVIDER = "Earth Observation Group (EOG)"
METHOD_VERSION = "starward-eog-annual-vnl-relative-band-current"
MAX_NATIVE_GRID_CELLS = 512
MANIFEST_KEYS = {
    "schemaVersion",
    "datasetVersion",
    "productName",
    "dataYear",
    "sourceUrl",
    "licenseUrl",
    "acquiredAt",
    "radiance",
    "cloudFreeCoverage",
    "aoi",
    "minimumCloudFreeObservations",
    "gridStridePixels",
}
RASTER_KEYS = {"file", "sha256", "band"}
AOI_KEYS = {"west", "south", "east", "north"}
BANDS = ("VERY_LOW", "LOW", "MODERATE", "HIGH", "VERY_HIGH")
LABELS = {
    "VERY_LOW": "试点区域相对很低夜光",
    "LOW": "试点区域相对较低夜光",
    "MODERATE": "试点区域相对中等夜光",
    "HIGH": "试点区域相对较高夜光",
    "VERY_HIGH": "试点区域相对很高夜光",
}


class PipelineError(RuntimeError):
    """Expected fail-closed validation or publication failure."""


@dataclass(frozen=True)
class RasterInput:
    path: Path
    sha256: str
    band: int


@dataclass(frozen=True)
class Aoi:
    west: float
    south: float
    east: float
    north: float


@dataclass(frozen=True)
class PublicationManifest:
    raw: Mapping[str, Any]
    path: Path
    dataset_version: str
    product_name: str
    data_year: int
    acquired_at: str
    radiance: RasterInput
    coverage: RasterInput
    aoi: Aoi
    minimum_coverage: int
    grid_stride: int
    digest: str


@dataclass(frozen=True)
class RasterSelection:
    radiance: np.ma.MaskedArray
    coverage: np.ma.MaskedArray
    window: Window
    transform: Any
    resolution_degrees: tuple[float, float]


def canonical_json(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def sha256_file(path: Path, chunk_size: int = 1024 * 1024) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        while chunk := stream.read(chunk_size):
            digest.update(chunk)
    return digest.hexdigest()


def _exact_keys(value: Mapping[str, Any], expected: set[str], path: str) -> None:
    actual = set(value)
    if actual != expected:
        missing = sorted(expected - actual)
        extra = sorted(actual - expected)
        raise PipelineError(f"{path}_keys_invalid:missing={missing}:extra={extra}")


def _object(value: Any, path: str) -> Mapping[str, Any]:
    if not isinstance(value, dict):
        raise PipelineError(f"{path}_must_be_object")
    return value


def _number(value: Any, path: str) -> float:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise PipelineError(f"{path}_must_be_number")
    result = float(value)
    if not math.isfinite(result):
        raise PipelineError(f"{path}_must_be_finite")
    return result


def _integer(value: Any, path: str) -> int:
    if isinstance(value, bool) or not isinstance(value, int):
        raise PipelineError(f"{path}_must_be_integer")
    return value


def _nonempty_string(value: Any, path: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise PipelineError(f"{path}_must_be_nonempty_string")
    return value.strip()


def _raster_input(value: Any, base: Path, label: str) -> RasterInput:
    item = _object(value, label)
    _exact_keys(item, RASTER_KEYS, label)
    relative = Path(_nonempty_string(item["file"], f"{label}.file"))
    path = relative if relative.is_absolute() else (base / relative)
    path = path.resolve(strict=False)
    if not path.is_file():
        raise PipelineError(f"{label}.file_not_found")
    expected_hash = _nonempty_string(item["sha256"], f"{label}.sha256").lower()
    if not re.fullmatch(r"[0-9a-f]{64}", expected_hash):
        raise PipelineError(f"{label}.sha256_invalid")
    band = _integer(item["band"], f"{label}.band")
    if band < 1:
        raise PipelineError(f"{label}.band_invalid")
    return RasterInput(path=path, sha256=expected_hash, band=band)


def load_manifest(path: Path) -> PublicationManifest:
    try:
        raw_bytes = path.read_bytes()
        raw = json.loads(raw_bytes)
    except (OSError, json.JSONDecodeError) as error:
        raise PipelineError("manifest_unreadable") from error
    root = _object(raw, "manifest")
    _exact_keys(root, MANIFEST_KEYS, "manifest")
    if _integer(root["schemaVersion"], "schemaVersion") != 1:
        raise PipelineError("schemaVersion_unsupported")
    dataset_version = _nonempty_string(root["datasetVersion"], "datasetVersion")
    if not re.fullmatch(r"[a-z0-9][a-z0-9._-]{2,127}", dataset_version):
        raise PipelineError("datasetVersion_invalid")
    product_name = _nonempty_string(root["productName"], "productName")
    data_year = _integer(root["dataYear"], "dataYear")
    if data_year < 2012 or data_year > datetime.now(timezone.utc).year:
        raise PipelineError("dataYear_invalid")
    if root["sourceUrl"] != SOURCE_PAGE or root["licenseUrl"] != LICENSE_URL:
        raise PipelineError("official_source_or_license_url_invalid")
    acquired_at = _nonempty_string(root["acquiredAt"], "acquiredAt")
    try:
        parsed_acquired_at = datetime.fromisoformat(acquired_at.replace("Z", "+00:00"))
    except ValueError as error:
        raise PipelineError("acquiredAt_invalid") from error
    if parsed_acquired_at.tzinfo is None:
        raise PipelineError("acquiredAt_timezone_required")

    aoi_object = _object(root["aoi"], "aoi")
    _exact_keys(aoi_object, AOI_KEYS, "aoi")
    aoi = Aoi(
        west=_number(aoi_object["west"], "aoi.west"),
        south=_number(aoi_object["south"], "aoi.south"),
        east=_number(aoi_object["east"], "aoi.east"),
        north=_number(aoi_object["north"], "aoi.north"),
    )
    if not (-180 <= aoi.west < aoi.east <= 180):
        raise PipelineError("aoi_longitude_invalid")
    if not (-90 <= aoi.south < aoi.north <= 90):
        raise PipelineError("aoi_latitude_invalid")
    if aoi.east - aoi.west > 10 or aoi.north - aoi.south > 10:
        raise PipelineError("aoi_exceeds_bounded_trial_region")

    minimum_coverage = _integer(
        root["minimumCloudFreeObservations"], "minimumCloudFreeObservations"
    )
    if minimum_coverage < 1 or minimum_coverage > 366:
        raise PipelineError("minimumCloudFreeObservations_invalid")
    grid_stride = _integer(root["gridStridePixels"], "gridStridePixels")
    if grid_stride < 1 or grid_stride > 256:
        raise PipelineError("gridStridePixels_invalid")
    resolved_path = path.resolve(strict=True)
    return PublicationManifest(
        raw=root,
        path=resolved_path,
        dataset_version=dataset_version,
        product_name=product_name,
        data_year=data_year,
        acquired_at=parsed_acquired_at.astimezone(timezone.utc).isoformat().replace(
            "+00:00", "Z"
        ),
        radiance=_raster_input(root["radiance"], resolved_path.parent, "radiance"),
        coverage=_raster_input(
            root["cloudFreeCoverage"], resolved_path.parent, "cloudFreeCoverage"
        ),
        aoi=aoi,
        minimum_coverage=minimum_coverage,
        grid_stride=grid_stride,
        digest=sha256_bytes(canonical_json(root).encode("utf-8")),
    )


def verify_input_hashes(manifest: PublicationManifest) -> None:
    for label, item in (("radiance", manifest.radiance), ("coverage", manifest.coverage)):
        actual = sha256_file(item.path)
        if actual != item.sha256:
            raise PipelineError(f"{label}_sha256_mismatch")


def raster_uri(path: Path) -> str:
    normalized = path.as_posix()
    return f"/vsigzip/{normalized}" if path.suffix.lower() == ".gz" else normalized


def _same_transform(left: Any, right: Any, tolerance: float = 1e-12) -> bool:
    return all(abs(float(a) - float(b)) <= tolerance for a, b in zip(left, right))


def _bounded_window(dataset: Any, aoi: Aoi) -> Window:
    bounds = dataset.bounds
    epsilon = 1e-9
    if (
        aoi.west < bounds.left - epsilon
        or aoi.south < bounds.bottom - epsilon
        or aoi.east > bounds.right + epsilon
        or aoi.north > bounds.top + epsilon
    ):
        raise PipelineError("aoi_not_fully_covered_by_raster")
    window = from_bounds(aoi.west, aoi.south, aoi.east, aoi.north, dataset.transform)
    window = window.round_offsets().round_lengths()
    window = window.intersection(Window(0, 0, dataset.width, dataset.height))
    if window.width < 1 or window.height < 1:
        raise PipelineError("aoi_window_empty")
    return window


def read_selection(manifest: PublicationManifest) -> RasterSelection:
    try:
        with rasterio.open(raster_uri(manifest.radiance.path)) as radiance_dataset, rasterio.open(
            raster_uri(manifest.coverage.path)
        ) as coverage_dataset:
            for label, dataset, item in (
                ("radiance", radiance_dataset, manifest.radiance),
                ("coverage", coverage_dataset, manifest.coverage),
            ):
                if dataset.crs is None or dataset.crs.to_epsg() != 4326:
                    raise PipelineError(f"{label}_crs_must_be_epsg4326")
                if item.band > dataset.count:
                    raise PipelineError(f"{label}_band_out_of_range")
                if dataset.transform.b != 0 or dataset.transform.d != 0:
                    raise PipelineError(f"{label}_rotated_grid_unsupported")
                if dataset.transform.a <= 0 or dataset.transform.e >= 0:
                    raise PipelineError(f"{label}_grid_orientation_invalid")
            if (
                radiance_dataset.width != coverage_dataset.width
                or radiance_dataset.height != coverage_dataset.height
                or not _same_transform(radiance_dataset.transform, coverage_dataset.transform)
            ):
                raise PipelineError("radiance_coverage_grid_mismatch")
            window = _bounded_window(radiance_dataset, manifest.aoi)
            if window != _bounded_window(coverage_dataset, manifest.aoi):
                raise PipelineError("radiance_coverage_aoi_window_mismatch")
            radiance = radiance_dataset.read(
                manifest.radiance.band, window=window, masked=True
            ).astype("float64")
            coverage = coverage_dataset.read(
                manifest.coverage.band, window=window, masked=True
            ).astype("float64")
            transform = radiance_dataset.window_transform(window)
            resolution = (
                abs(float(radiance_dataset.transform.a)),
                abs(float(radiance_dataset.transform.e)),
            )
    except RasterioIOError as error:
        raise PipelineError("raster_unreadable") from error
    if radiance.shape != coverage.shape or radiance.size == 0:
        raise PipelineError("selected_raster_shape_invalid")
    return RasterSelection(
        radiance=radiance,
        coverage=coverage,
        window=window,
        transform=transform,
        resolution_degrees=resolution,
    )


def valid_mask(selection: RasterSelection, minimum_coverage: int) -> np.ndarray:
    radiance_values = np.asarray(selection.radiance.data, dtype="float64")
    coverage_values = np.asarray(selection.coverage.data, dtype="float64")
    radiance_mask = np.ma.getmaskarray(selection.radiance)
    coverage_mask = np.ma.getmaskarray(selection.coverage)
    return (
        ~radiance_mask
        & ~coverage_mask
        & np.isfinite(radiance_values)
        & np.isfinite(coverage_values)
        & (radiance_values >= 0)
        & (coverage_values >= minimum_coverage)
    )


def derive_thresholds(values: np.ndarray) -> tuple[float, float, float, float]:
    clean = np.asarray(values, dtype="float64")
    clean = clean[np.isfinite(clean) & (clean >= 0)]
    if clean.size < 5:
        raise PipelineError("insufficient_valid_aoi_pixels")
    return tuple(float(value) for value in np.quantile(clean, (0.2, 0.4, 0.6, 0.8)))


def band_for_value(value: float, thresholds: Sequence[float]) -> str:
    if len(thresholds) != 4 or not math.isfinite(value) or value < 0:
        raise PipelineError("relative_band_input_invalid")
    for index, threshold in enumerate(thresholds):
        if value <= threshold:
            return BANDS[index]
    return BANDS[-1]


def _statistics(values: np.ndarray) -> tuple[float, float, float]:
    return (
        float(np.median(values)),
        float(np.quantile(values, 0.1)),
        float(np.quantile(values, 0.9)),
    )


def _source_summary(manifest: PublicationManifest, resolution: tuple[float, float]) -> dict[str, Any]:
    resolution_text = f"{resolution[0]:.8g}° × {resolution[1]:.8g}°"
    return {
        "id": f"eog-vnl:{manifest.dataset_version}",
        "kind": "OPEN_DATA",
        "provider": SOURCE_PROVIDER,
        "title": manifest.product_name,
        "sourceUrl": SOURCE_PAGE,
        "license": SOURCE_LICENSE,
        "licenseUrl": LICENSE_URL,
        "publishedAt": None,
        "retrievedAt": manifest.acquired_at,
        "validFrom": f"{manifest.data_year:04d}-01-01T00:00:00.000Z",
        "validTo": f"{manifest.data_year:04d}-12-31T23:59:59.999Z",
        "state": "ESTIMATED",
        "confidence": None,
        "precision": f"Annual VNL grid {resolution_text}; formal spots use a bounded 3×3-pixel sample.",
        "limitations": [
            "Radiance is satellite-observed upward light, not field-measured sky brightness.",
            "Relative bands are trial-AOI quantiles and are not Bortle or SQM classes.",
            "Zero radiance is accepted only where the matching cloud-free-coverage raster meets the configured threshold.",
        ],
    }


def _estimate(
    manifest: PublicationManifest,
    source: Mapping[str, Any],
    resolution: tuple[float, float],
    values: np.ndarray,
    coverages: np.ndarray,
    thresholds: Sequence[float],
) -> dict[str, Any]:
    if values.size == 0:
        return {
            "levelAtMost": None,
            "productBand": None,
            "radiance": None,
            "minimumCloudFreeObservations": None,
            "calibratedSkyClass": False,
            "label": "卫星夜光覆盖不足",
            "method": METHOD_VERSION,
            "datasetVersion": manifest.dataset_version,
            "dataDate": str(manifest.data_year),
            "precision": "该位置的 3×3 像元没有达到云量覆盖门槛；不作插值或等级猜测",
            "state": "UNAVAILABLE",
            "source": dict(source),
        }
    median, p10, p90 = _statistics(values)
    band = band_for_value(median, thresholds)
    return {
        "levelAtMost": None,
        "productBand": band,
        "radiance": {
            "median": round(median, 6),
            "p10": round(p10, 6),
            "p90": round(p90, 6),
            "unit": RADIANCE_UNIT,
        },
        "minimumCloudFreeObservations": int(np.min(coverages)),
        "calibratedSkyClass": False,
        "label": LABELS[band],
        "method": METHOD_VERSION,
        "datasetVersion": manifest.dataset_version,
        "dataDate": str(manifest.data_year),
        "precision": (
            f"EOG 年度夜光 {resolution[0]:.8g}°×{resolution[1]:.8g}° 栅格，"
            "点位取 3×3 有效像元；区间仅相对于本次试点 AOI"
        ),
        "state": "ESTIMATED",
        "source": dict(source),
    }


def _pixel_slice(row: int, column: int, height: int, width: int, radius: int = 1) -> tuple[slice, slice]:
    return (
        slice(max(0, row - radius), min(height, row + radius + 1)),
        slice(max(0, column - radius), min(width, column + radius + 1)),
    )


def sample_point(
    selection: RasterSelection,
    manifest: PublicationManifest,
    source: Mapping[str, Any],
    thresholds: Sequence[float],
    longitude: float,
    latitude: float,
) -> dict[str, Any]:
    inverse = ~selection.transform
    column_float, row_float = inverse * (longitude, latitude)
    row, column = int(math.floor(row_float)), int(math.floor(column_float))
    if row < 0 or column < 0 or row >= selection.radiance.shape[0] or column >= selection.radiance.shape[1]:
        raise PipelineError("spot_outside_selected_aoi")
    rows, columns = _pixel_slice(
        row, column, selection.radiance.shape[0], selection.radiance.shape[1]
    )
    mask = valid_mask(selection, manifest.minimum_coverage)[rows, columns]
    radiance = np.asarray(selection.radiance.data[rows, columns], dtype="float64")[mask]
    coverage = np.asarray(selection.coverage.data[rows, columns], dtype="float64")[mask]
    return _estimate(
        manifest,
        source,
        selection.resolution_degrees,
        radiance,
        coverage,
        thresholds,
    )


def _cell_bounds(transform: Any, row_start: int, row_end: int, col_start: int, col_end: int, aoi: Aoi) -> tuple[float, float, float, float]:
    west, north = transform * (col_start, row_start)
    east, south = transform * (col_end, row_end)
    return (
        max(float(west), aoi.west),
        max(float(south), aoi.south),
        min(float(east), aoi.east),
        min(float(north), aoi.north),
    )


def build_cells(
    selection: RasterSelection,
    manifest: PublicationManifest,
    source: Mapping[str, Any],
    thresholds: Sequence[float],
) -> list[dict[str, Any]]:
    mask = valid_mask(selection, manifest.minimum_coverage)
    height, width = selection.radiance.shape
    cells: list[dict[str, Any]] = []
    for row in range(0, height, manifest.grid_stride):
        for column in range(0, width, manifest.grid_stride):
            row_end = min(height, row + manifest.grid_stride)
            column_end = min(width, column + manifest.grid_stride)
            selected = mask[row:row_end, column:column_end]
            if not bool(np.any(selected)):
                continue
            radiance = np.asarray(
                selection.radiance.data[row:row_end, column:column_end], dtype="float64"
            )[selected]
            coverage = np.asarray(
                selection.coverage.data[row:row_end, column:column_end], dtype="float64"
            )[selected]
            median, p10, p90 = _statistics(radiance)
            band = band_for_value(median, thresholds)
            west, south, east, north = _cell_bounds(
                selection.transform, row, row_end, column, column_end, manifest.aoi
            )
            if not (west < east and south < north):
                continue
            cell_id = f"r{row:06d}-c{column:06d}"
            cells.append(
                {
                    "cellId": cell_id,
                    "datasetVersion": manifest.dataset_version,
                    "productBand": band,
                    "label": LABELS[band],
                    "radiance": {
                        "median": round(median, 6),
                        "p10": round(p10, 6),
                        "p90": round(p90, 6),
                        "unit": RADIANCE_UNIT,
                    },
                    "minimumCloudFreeObservations": int(np.min(coverage)),
                    "boundsWgs84": {
                        "west": west,
                        "south": south,
                        "east": east,
                        "north": north,
                    },
                    "state": "ESTIMATED",
                    "sourceId": source["id"],
                }
            )
    if not cells:
        raise PipelineError("no_publishable_grid_cells")
    if len(cells) > MAX_NATIVE_GRID_CELLS:
        raise PipelineError(
            f"native_grid_cell_budget_exceeded:{len(cells)}>{MAX_NATIVE_GRID_CELLS}"
        )
    return cells


def _read_database_url() -> str:
    value = os.environ.get("DATABASE_URL", "").strip()
    if not value:
        raise PipelineError("DATABASE_URL_required")
    return value


def _spot_rows(connection: psycopg.Connection[Any], aoi: Aoi) -> list[dict[str, Any]]:
    rows = connection.execute(
        """
        SELECT spot_id,
               ST_X(geom_wgs84::geometry) AS longitude,
               ST_Y(geom_wgs84::geometry) AS latitude,
               payload
          FROM spots
         WHERE visibility_policy <> 'HIDDEN'
           AND ST_Intersects(
                 geom_wgs84::geometry,
                 ST_MakeEnvelope(%s, %s, %s, %s, 4326)
               )
         ORDER BY spot_id
        """,
        (aoi.west, aoi.south, aoi.east, aoi.north),
    ).fetchall()
    return [
        {
            "spot_id": row[0],
            "longitude": float(row[1]),
            "latitude": float(row[2]),
            "payload": row[3],
        }
        for row in rows
    ]


def _read_model_digest(value: Mapping[str, Any]) -> str:
    return sha256_bytes(canonical_json(value).encode("utf-8"))


def _wkt_polygon(bounds: Mapping[str, float]) -> str:
    west, south, east, north = (
        bounds["west"],
        bounds["south"],
        bounds["east"],
        bounds["north"],
    )
    return (
        f"POLYGON(({west} {south},{east} {south},{east} {north},"
        f"{west} {north},{west} {south}))"
    )


def _replace_disclosure(
    detail: dict[str, Any], old_source_id: str | None, source: Mapping[str, Any]
) -> None:
    disclosure = detail.get("dataDisclosure")
    values = disclosure if isinstance(disclosure, list) else []
    filtered = [
        item
        for item in values
        if isinstance(item, dict)
        and item.get("id") not in {old_source_id, source["id"]}
    ]
    filtered.append(dict(source))
    detail["dataDisclosure"] = filtered


def publish(
    manifest: PublicationManifest,
    selection: RasterSelection,
    thresholds: Sequence[float],
    cells: Sequence[Mapping[str, Any]],
    database_url: str,
) -> dict[str, Any]:
    source = _source_summary(manifest, selection.resolution_degrees)
    with psycopg.connect(database_url) as connection:
        connection.execute(
            "SELECT pg_advisory_xact_lock(hashtextextended('starward-dark-sky-publication', 0))"
        )
        required = connection.execute(
            "SELECT to_regclass('public.dark_sky_dataset_publications'), to_regclass('public.dark_sky_grid_cells')"
        ).fetchone()
        if required is None or required[0] is None or required[1] is None:
            raise PipelineError("dark_sky_schema_missing_run_migrations")
        existing = connection.execute(
            "SELECT manifest_sha256, state FROM dark_sky_dataset_publications WHERE dataset_version = %s",
            (manifest.dataset_version,),
        ).fetchone()
        if existing is not None:
            if existing[0] != manifest.digest:
                raise PipelineError("dataset_version_digest_conflict")
            if existing[1] == "PUBLISHED":
                sample_count = connection.execute(
                    "SELECT count(*) FROM light_pollution_samples WHERE dataset_version = %s",
                    (manifest.dataset_version,),
                ).fetchone()[0]
                cell_count = connection.execute(
                    "SELECT count(*) FROM dark_sky_grid_cells WHERE dataset_version = %s",
                    (manifest.dataset_version,),
                ).fetchone()[0]
                return {
                    "status": "already_published",
                    "datasetVersion": manifest.dataset_version,
                    "manifestSha256": manifest.digest,
                    "radianceSha256": manifest.radiance.sha256,
                    "coverageSha256": manifest.coverage.sha256,
                    "sampleCount": int(sample_count),
                    "cellCount": int(cell_count),
                    "changedSpotCount": 0,
                }

        connection.execute(
            """
            INSERT INTO data_source_registry(source_id, provider, license, license_url, payload)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (source_id) DO NOTHING
            """,
            (source["id"], source["provider"], source["license"], source["licenseUrl"], Jsonb(source)),
        )
        stored_source = connection.execute(
            "SELECT payload FROM data_source_registry WHERE source_id = %s", (source["id"],)
        ).fetchone()
        if stored_source is None or stored_source[0] != source:
            raise PipelineError("source_identity_conflict")
        publication_payload = {
            "schemaVersion": 1,
            "datasetVersion": manifest.dataset_version,
            "productName": manifest.product_name,
            "dataYear": manifest.data_year,
            "source": source,
            "aoi": manifest.raw["aoi"],
            "minimumCloudFreeObservations": manifest.minimum_coverage,
            "gridStridePixels": manifest.grid_stride,
            "relativeBandThresholds": [round(float(value), 9) for value in thresholds],
            "relativeBandMethod": "full-valid-AOI-radiance-quantiles-20-40-60-80",
            "radianceUnit": RADIANCE_UNIT,
            "calibratedSkyClass": False,
        }
        connection.execute(
            """
            INSERT INTO dark_sky_dataset_publications(
              dataset_version, source_id, product_name, data_year,
              manifest_sha256, radiance_sha256, coverage_sha256,
              state, payload, validated_at
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, 'VALIDATED', %s, now())
            ON CONFLICT (dataset_version) DO UPDATE SET
              state = 'VALIDATED', payload = EXCLUDED.payload, validated_at = now()
            """,
            (
                manifest.dataset_version,
                source["id"],
                manifest.product_name,
                manifest.data_year,
                manifest.digest,
                manifest.radiance.sha256,
                manifest.coverage.sha256,
                Jsonb(publication_payload),
            ),
        )
        connection.execute(
            "DELETE FROM dark_sky_grid_cells WHERE dataset_version = %s",
            (manifest.dataset_version,),
        )
        for cell in cells:
            connection.execute(
                """
                INSERT INTO dark_sky_grid_cells(dataset_version, cell_id, geom_wgs84, state, payload)
                VALUES (%s, %s, ST_GeomFromText(%s, 4326), %s, %s)
                """,
                (
                    manifest.dataset_version,
                    cell["cellId"],
                    _wkt_polygon(cell["boundsWgs84"]),
                    cell["state"],
                    Jsonb(cell),
                ),
            )

        spots = _spot_rows(connection, manifest.aoi)
        changed_spot_count = 0
        sample_count = 0
        for row in spots:
            estimate = sample_point(
                selection,
                manifest,
                source,
                thresholds,
                row["longitude"],
                row["latitude"],
            )
            connection.execute(
                """
                INSERT INTO light_pollution_samples(
                  spot_id, dataset_version, state, payload, source_id
                ) VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT (spot_id, dataset_version) DO UPDATE SET
                  state = EXCLUDED.state,
                  payload = EXCLUDED.payload,
                  source_id = EXCLUDED.source_id
                """,
                (
                    row["spot_id"],
                    manifest.dataset_version,
                    estimate["state"],
                    Jsonb({"estimate": estimate, "samplePixels": "3x3", "runtimeClaim": False}),
                    source["id"],
                ),
            )
            sample_count += 1
            spot = dict(row["payload"])
            previous = spot.get("lightPollution")
            if previous == estimate:
                continue
            old_source_id = (
                previous.get("source", {}).get("id") if isinstance(previous, dict) else None
            )
            spot["lightPollution"] = estimate
            connection.execute(
                """
                UPDATE spots
                   SET payload = %s, version = version + 1, updated_at = now()
                 WHERE spot_id = %s
                """,
                (Jsonb(spot), row["spot_id"]),
            )
            detail_row = connection.execute(
                "SELECT payload FROM spot_overview_read_models WHERE spot_id = %s FOR UPDATE",
                (row["spot_id"],),
            ).fetchone()
            if detail_row is not None:
                detail = dict(detail_row[0])
                detail["spot"] = spot
                _replace_disclosure(detail, old_source_id, source)
                connection.execute(
                    """
                    UPDATE spot_overview_read_models
                       SET payload = %s, dependency_digest = %s, generated_at = now()
                     WHERE spot_id = %s
                    """,
                    (Jsonb(detail), _read_model_digest(detail), row["spot_id"]),
                )
            for table in ("map_spot_summaries", "favorite_spot_summaries"):
                connection.execute(
                    f"UPDATE {table} SET payload = %s, generated_at = now() WHERE spot_id = %s",
                    (Jsonb(spot), row["spot_id"]),
                )
            changed_spot_count += 1

        connection.execute(
            "DELETE FROM map_layer_snapshots WHERE layer_kind = 'LIGHT_POLLUTION'"
        )
        connection.execute(
            """
            INSERT INTO published_dataset_versions(
              dataset_kind, dataset_version, state, manifest, published_at
            ) VALUES ('DARK_SKY', %s, 'PUBLISHED', %s, now())
            ON CONFLICT (dataset_kind, dataset_version) DO UPDATE SET
              state = 'PUBLISHED', manifest = EXCLUDED.manifest, published_at = now()
            """,
            (manifest.dataset_version, Jsonb(publication_payload)),
        )
        connection.execute(
            """
            UPDATE dark_sky_dataset_publications
               SET state = 'PUBLISHED', published_at = now()
             WHERE dataset_version = %s
            """,
            (manifest.dataset_version,),
        )
        return {
            "status": "published",
            "datasetVersion": manifest.dataset_version,
            "manifestSha256": manifest.digest,
            "radianceSha256": manifest.radiance.sha256,
            "coverageSha256": manifest.coverage.sha256,
            "sampleCount": sample_count,
            "cellCount": len(cells),
            "changedSpotCount": changed_spot_count,
        }


def prepare(path: Path) -> tuple[PublicationManifest, RasterSelection, tuple[float, float, float, float], list[dict[str, Any]]]:
    manifest = load_manifest(path)
    verify_input_hashes(manifest)
    selection = read_selection(manifest)
    mask = valid_mask(selection, manifest.minimum_coverage)
    thresholds = derive_thresholds(
        np.asarray(selection.radiance.data, dtype="float64")[mask]
    )
    source = _source_summary(manifest, selection.resolution_degrees)
    cells = build_cells(selection, manifest, source, thresholds)
    return manifest, selection, thresholds, cells


def main(argv: Iterable[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--manifest", type=Path, required=True)
    args = parser.parse_args(list(argv) if argv is not None else None)
    try:
        manifest, selection, thresholds, cells = prepare(args.manifest)
        result = publish(
            manifest, selection, thresholds, cells, _read_database_url()
        )
    except PipelineError as error:
        print(canonical_json({"status": "failed", "error": str(error)}), file=sys.stderr)
        return 1
    except Exception:
        print(
            canonical_json({"status": "failed", "error": "unexpected_publication_failure"}),
            file=sys.stderr,
        )
        return 1
    print(canonical_json(result))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
