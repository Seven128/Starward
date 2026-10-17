"""Versioned annual-radiance policy and physical-area numerical aggregation.

The existing relative-AOI publication is deliberately not reinterpreted here.
The fixed policy must enter a new dataset through the publication owner.
"""
from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path
from typing import Any

import numpy as np
from eog_raster import PublicationManifest, _source_summary


POLICY_PATH = Path(__file__).resolve().parents[2] / "packages/miniapp-contracts/src/night-light-fixed-scale.json"
POLICY_BYTES = POLICY_PATH.read_bytes()
POLICY = json.loads(POLICY_BYTES)
POLICY_SHA256 = hashlib.sha256(POLICY_BYTES).hexdigest()
THRESHOLDS = tuple(float(value) for value in POLICY["thresholds"])
BANDS = tuple(band["id"] for band in POLICY["bands"])


def source_summary(manifest: PublicationManifest, resolution: tuple[float, float]) -> dict[str, Any]:
    source = _source_summary(manifest, resolution)
    source["precision"] = (f"Annual source {resolution[0]:.8g}° × {resolution[1]:.8g}°; "
                           "Map uses physical-area-weighted mean; Spot uses a declared 3×3-pixel weighted sample.")
    source["limitations"][1] = "Starward masked invalid radiance and insufficient cloud-free coverage, transformed every source-grid anchor to the GCJ display grid, and aggregated numerical physical-area masses before fixed colouring."
    source["limitations"][3] = "Fixed radiance bands are product cartography shared across regions; not Bortle or SQM classes."
    source["limitations"].append("A valid zero can be the source product's masked background; it does not establish a completely unlit site.")
    return source


def band_for_radiance(value: float) -> str:
    if not math.isfinite(value) or value < 0:
        raise ValueError("fixed_radiance_invalid")
    return BANDS[next((index for index, limit in enumerate(THRESHOLDS)
                       if value <= limit * (1 + POLICY["boundaryNumericalRelativeTolerance"])), len(THRESHOLDS))]


def weighted_quantiles(values: np.ndarray, areas: np.ndarray) -> tuple[float, float, float]:
    order = np.argsort(values, kind="stable")
    ordered = values[order]
    weight = areas[order]
    positions = (np.cumsum(weight) - weight / 2) / float(np.sum(weight))
    p10, median, p90 = np.interp([0.1, 0.5, 0.9], positions, ordered)
    return float(median), float(p10), float(p90)


def pixel_areas(transform: Any, height: int, width: int) -> np.ndarray:
    """Spherical cell area, used only as relative numerical weights.

    Longitude width is constant in a north-up EPSG:4326 input. Integrating
    sin(latitude) avoids treating equally-sized degree cells as equal areas.
    """
    if transform.b != 0 or transform.d != 0 or transform.a <= 0 or transform.e >= 0:
        raise ValueError("fixed_numeric_grid_invalid")
    edges = np.deg2rad(transform.f + np.arange(height + 1) * transform.e)
    rows = np.abs(np.sin(edges[1:]) - np.sin(edges[:-1])) * math.radians(transform.a)
    return np.broadcast_to(rows[:, None], (height, width))


def quality_masks(values: np.ma.MaskedArray, coverages: np.ma.MaskedArray,
                  minimum_coverage: int) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    radiance = np.asarray(values.data, dtype="float64")
    coverage = np.asarray(coverages.data, dtype="float64")
    if (radiance.ndim != 2 or radiance.shape != coverage.shape or radiance.size == 0
            or isinstance(minimum_coverage, bool) or not isinstance(minimum_coverage, int)
            or not 1 <= minimum_coverage <= 366):
        raise ValueError("fixed_aggregation_input_invalid")
    missing = (np.ma.getmaskarray(values) | np.ma.getmaskarray(coverages)
               | ~np.isfinite(radiance) | (radiance < 0) | ~np.isfinite(coverage) | (coverage < 0))
    insufficient = ~missing & (coverage < minimum_coverage)
    return missing, insufficient, ~missing & ~insufficient


def aggregate(values: np.ma.MaskedArray, coverages: np.ma.MaskedArray, areas: np.ndarray,
              minimum_coverage: int, *, published: np.ndarray | None = None) -> dict[str, Any]:
    """Keep valid zero, missing source and insufficient coverage distinct.

    The caller supplies the complete requested footprint, including masked
    pixels outside a published area. Do not shrink its denominator to the
    pixels that happened to contain a valid value.
    """
    radiance = np.asarray(values.data, dtype="float64")
    coverage = np.asarray(coverages.data, dtype="float64")
    weight = np.asarray(areas, dtype="float64")
    if (radiance.ndim != 2 or radiance.shape != coverage.shape or radiance.shape != weight.shape
            or radiance.size == 0 or not np.all(np.isfinite(weight) & (weight > 0))
            or isinstance(minimum_coverage, bool) or not isinstance(minimum_coverage, int)
            or not 1 <= minimum_coverage <= 366):
        raise ValueError("fixed_aggregation_input_invalid")
    missing, insufficient, valid = quality_masks(values, coverages, minimum_coverage)
    published_mask = np.ones(radiance.shape, dtype="bool") if published is None else np.asarray(published)
    if published_mask.shape != radiance.shape or published_mask.dtype != np.dtype("bool"):
        raise ValueError("fixed_aggregation_published_mask_invalid")
    missing &= published_mask
    insufficient &= published_mask
    valid &= published_mask
    total = float(np.sum(weight))
    fraction = float(np.sum(weight[valid]) / total)
    enough = fraction + 1e-12 >= POLICY["qualityPolicy"]["minimumValidAreaFraction"]
    quality = {
        "policyVersion": POLICY["qualityPolicy"]["version"],
        "minimumCloudFreeObservations": minimum_coverage,
        "minimumValidAreaFraction": POLICY["qualityPolicy"]["minimumValidAreaFraction"],
        "validAreaFraction": fraction,
        "sourceMissingAreaFraction": float(np.sum(weight[missing]) / total),
        "insufficientCoverageAreaFraction": float(np.sum(weight[insufficient]) / total),
        "publishedAreaFraction": float(np.sum(weight[published_mask]) / total),
        "validPixelCount": int(valid.sum()),
        "validZeroPixelCount": int((valid & (radiance == 0)).sum()),
        "requestedPixelCount": int(radiance.size),
    }
    if not enough:
        reason = ("UNPUBLISHED" if not bool(np.any(published_mask)) else
                  "SOURCE_MISSING" if bool(np.all(missing)) else "INSUFFICIENT_COVERAGE"
                  if bool(np.all(insufficient)) else "INSUFFICIENT_VALID_AREA")
        return {"state": "UNAVAILABLE", "reason": reason, "quality": quality, "statistics": None}
    selected, selected_areas = radiance[valid], weight[valid]
    median, p10, p90 = weighted_quantiles(selected, selected_areas)
    return {"state": "AVAILABLE" if bool(np.all(valid)) else "PARTIAL", "reason": None, "quality": quality,
            "statistics": {"median": median, "p10": p10, "p90": p90,
                           "mean": float(np.average(selected, weights=selected_areas)),
                           "minimumCloudFreeObservations": int(np.min(coverage[valid])),
                           "unit": POLICY["unit"]}}
