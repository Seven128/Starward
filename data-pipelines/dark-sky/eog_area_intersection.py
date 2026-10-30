"""Bounded GEOS intersections for the shared dense geolocation quadrature.

Source values remain masses over original physical areas. GEOS clips each
quadrature polygon to fixed target pixels; no coordinate transform lives here.
"""
from __future__ import annotations

import hashlib
from pathlib import Path
from typing import Any

import numpy as np
import shapely

from eog_raster import PipelineError

ENGINE = "geos-dense-physical-area-intersection-v1"
_BATCH = 128 ** 2


def engine_identity() -> dict[str, str]:
    return {"algorithm": ENGINE, "shapelyVersion": shapely.__version__, "geosVersion": shapely.geos_version_string,
            "sourceSha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest()}


def _corners(values: np.ndarray) -> tuple[np.ndarray, ...]:
    # GDAL's TOP_LEFT_CORNER lattice omits the final outer edges. Extend its
    # last interval linearly, retaining the full last source pixel's area.
    outer = np.empty((values.shape[0] + 1, values.shape[1] + 1), dtype="float64")
    outer[:-1, :-1] = values
    outer[-1, :-1] = 2 * values[-1] - values[-2]
    outer[:, -1] = 2 * outer[:, -2] - outer[:, -3]
    return outer[:-1, :-1], outer[:-1, 1:], outer[1:, 1:], outer[1:, :-1]


def _extent(corners: tuple[np.ndarray, ...], minimum: bool) -> np.ndarray:
    operation = np.minimum if minimum else np.maximum
    result = operation(corners[0], corners[1])
    for point in corners[2:]:
        operation(result, point, out=result)
    return result


def intersect_area_masses(source: np.ndarray, x: np.ndarray, y: np.ndarray,
                          affine: Any, target: np.ndarray, *,
                          source_core: tuple[int, int, int, int] | None = None) -> np.ndarray:
    """Return masses for one branch, accumulating only the supplied source core.

    The half-open core is (top, left, bottom, right) in the supplied arrays.
    Neighbouring halo anchors define true cell corners but contribute no mass.
    The caller validates whether the final extrapolated edge is a real source
    boundary; an interior partition must include its next row/column anchor.
    """
    if (source.ndim != 3 or source.shape[1:] != x.shape or x.shape != y.shape or min(x.shape) < 2
            or target.ndim != 2 or target.size > 256 ** 2 or not np.all(np.isfinite(x)) or not np.all(np.isfinite(y))
            or affine.a <= 0 or affine.e >= 0 or affine.b != 0 or affine.d != 0):
        raise PipelineError("nightlight_area_intersection_shape_invalid")
    if source_core is None:
        source_core = (0, 0, x.shape[0], x.shape[1])
    if (len(source_core) != 4 or any(isinstance(value, bool) or not isinstance(value, int) for value in source_core)
            or not 0 <= source_core[0] < source_core[2] <= x.shape[0]
            or not 0 <= source_core[1] < source_core[3] <= x.shape[1]):
        raise PipelineError("nightlight_area_source_core_invalid")
    height, width = target.shape
    mass = np.zeros((source.shape[0], height * width), dtype="float64")
    chosen = np.flatnonzero(target.ravel())
    if not len(chosen):
        return mass.reshape((source.shape[0], height, width))
    row, column = np.divmod(chosen, width)
    boxes = shapely.box(column, row, column + 1, row + 1)
    tree = shapely.STRtree(boxes)
    xc, yc = _corners(x), _corners(y)
    west, north = affine.c, affine.f
    east, south = west + width * affine.a, north + height * affine.e
    intersects = (_extent(xc, True) < east) & (_extent(xc, False) > west)
    intersects &= (_extent(yc, True) < north) & (_extent(yc, False) > south)
    top, left, bottom, right = source_core
    intersects[:top] = False
    intersects[bottom:] = False
    intersects[:, :left] = False
    intersects[:, right:] = False
    source_row, source_column = np.where(intersects)
    for begin in range(0, len(source_row), _BATCH):
        rows, columns = source_row[begin:begin + _BATCH], source_column[begin:begin + _BATCH]
        px = np.stack([point[rows, columns] for point in xc], axis=1)
        py = np.stack([point[rows, columns] for point in yc], axis=1)
        normalized = np.stack([(px - west) / affine.a, (py - north) / affine.e], axis=2)
        polygons = shapely.polygons(normalized)
        areas = shapely.area(polygons)
        if not np.all(shapely.is_valid(polygons) & np.isfinite(areas) & (areas > 0)):
            raise PipelineError("nightlight_geolocation_mesh_invalid")

        # A valid polygon whose complete bounds lie in one convex pixel box
        # contributes its whole physical mass there. Still validate every
        # polygon above: bounds alone cannot admit a folded or empty mesh.
        low, high = normalized.min(axis=1), normalized.max(axis=1)
        inside = np.flatnonzero((low[:, 0] >= 0) & (low[:, 1] >= 0)
                               & (high[:, 0] <= width) & (high[:, 1] <= height))
        columns_inside = np.floor(low[inside, 0]).astype(np.intp)
        rows_inside = np.floor(low[inside, 1]).astype(np.intp)
        complete = (high[inside, 0] <= columns_inside + 1) & (high[inside, 1] <= rows_inside + 1)
        contained = np.zeros(len(polygons), dtype=bool)
        contained[inside[complete]] = True
        full_ids = rows_inside[complete] * width + columns_inside[complete]
        selected = target.ravel()[full_ids] != 0
        full_indices, full_ids = inside[complete][selected], full_ids[selected]

        # Boundary polygons retain the original GEOS clipping and mask. A
        # contained polygon in an unselected branch contributes nothing.
        boundary = np.flatnonzero(~contained)
        source_indices, target_indices = tree.query(polygons[boundary], predicate="intersects")
        source_indices = boundary[source_indices]
        weights = shapely.area(shapely.intersection(polygons[source_indices], boxes[target_indices])) / areas[source_indices]
        if not np.all(np.isfinite(weights) & (weights >= 0) & (weights <= 1 + 1e-12)):
            raise PipelineError("nightlight_geolocation_intersection_invalid")
        source_indices = np.concatenate((full_indices, source_indices))
        target_ids = np.concatenate((full_ids, chosen[target_indices]))
        weights = np.concatenate((np.ones(len(full_indices)), weights))
        # Keep the old row-major source accumulation, including GEOS's order
        # among intersections from the same boundary polygon.
        order = np.argsort(source_indices, kind="stable")
        source_indices, target_ids, weights = source_indices[order], target_ids[order], weights[order]
        for band in range(source.shape[0]):
            mass[band] += np.bincount(target_ids, weights=weights * source[band, rows[source_indices], columns[source_indices]], minlength=height * width)
    return mass.reshape((source.shape[0], height, width))
