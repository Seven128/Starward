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
                          affine: Any, target: np.ndarray) -> np.ndarray:
    """Return five masses for one continuous branch and a target-pixel mask."""
    if (source.ndim != 3 or source.shape[1:] != x.shape or x.shape != y.shape or min(x.shape) < 2
            or target.ndim != 2 or target.size > 256 ** 2 or not np.all(np.isfinite(x)) or not np.all(np.isfinite(y))
            or affine.a <= 0 or affine.e >= 0 or affine.b != 0 or affine.d != 0):
        raise PipelineError("nightlight_area_intersection_shape_invalid")
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
    source_row, source_column = np.where(intersects)
    for begin in range(0, len(source_row), _BATCH):
        rows, columns = source_row[begin:begin + _BATCH], source_column[begin:begin + _BATCH]
        px = np.stack([point[rows, columns] for point in xc], axis=1)
        py = np.stack([point[rows, columns] for point in yc], axis=1)
        polygons = shapely.polygons(np.stack([(px - west) / affine.a, (py - north) / affine.e], axis=2))
        areas = shapely.area(polygons)
        if not np.all(shapely.is_valid(polygons) & np.isfinite(areas) & (areas > 0)):
            raise PipelineError("nightlight_geolocation_mesh_invalid")
        source_indices, target_indices = tree.query(polygons, predicate="intersects")
        weights = shapely.area(shapely.intersection(polygons[source_indices], boxes[target_indices])) / areas[source_indices]
        if not np.all(np.isfinite(weights) & (weights >= 0) & (weights <= 1 + 1e-12)):
            raise PipelineError("nightlight_geolocation_intersection_invalid")
        target_ids = chosen[target_indices]
        for band in range(source.shape[0]):
            mass[band] += np.bincount(target_ids, weights=weights * source[band, rows[source_indices], columns[source_indices]], minlength=height * width)
    return mass.reshape((source.shape[0], height, width))
