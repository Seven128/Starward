"""Native source-pixel geometry shared by SDSS flux and flag sampling.

Coordinates are zero indexed (x=column, y=row). Geometry only establishes
that all four interpolation neighbours are in the source. It says nothing
about finite flux, artifact flags, or scientific validity.
"""
from __future__ import annotations

from dataclasses import dataclass

import numpy as np


@dataclass(frozen=True)
class SourceStencil:
    geometry: np.ndarray
    x0: np.ndarray
    y0: np.ndarray


def source_pixel_stencil(shape: tuple[int, int], x: np.ndarray, y: np.ndarray) -> SourceStencil:
    """Return full-shape geometry and lower-left indices for its true subset.

    Even an exact integer coordinate requires its +1 neighbours. Consumers
    must keep this geometry separate from their own flux/quality meaning.
    Empty or one-pixel source axes therefore have no complete stencil.
    """
    if (len(shape) != 2 or any(not isinstance(value, (int, np.integer)) or
            isinstance(value, (bool, np.bool_)) or value < 0 for value in shape) or
            not isinstance(x, np.ndarray) or not isinstance(y, np.ndarray) or
            x.shape != y.shape or x.dtype.kind not in "fiu" or y.dtype.kind not in "fiu"):
        raise RuntimeError("sdss_source_stencil_input_invalid")
    rows, columns = shape
    geometry = (np.isfinite(x) & np.isfinite(y) & (x >= 0) & (y >= 0) &
                (x < columns - 1) & (y < rows - 1))
    return SourceStencil(geometry, np.floor(x[geometry]).astype(np.intp),
                         np.floor(y[geometry]).astype(np.intp))


def bilinear_source_samples(source: np.ndarray, x: np.ndarray, y: np.ndarray):
    """Interpolate gathered four-neighbour values, independent of their units.

    Supports scientific float arrays and prepared uint8 colour channels. Only
    gathered neighbours are converted; a uint8 image is not copied to a full
    float image for each small/chunked query. Geometry and all-four-finite masks
    remain distinct. A zero-weight nonfinite neighbour still invalidates the
    stencil, and finite zero/negative samples are retained as measurements.
    """
    if (not isinstance(source, np.ndarray) or source.ndim != 2 or
            (source.dtype.kind != "f" and source.dtype != np.dtype(np.uint8)) or
            not isinstance(x, np.ndarray) or not isinstance(y, np.ndarray) or x.shape != y.shape):
        raise RuntimeError("source_bilinear_sampling_shape_invalid")
    stencil = source_pixel_stencil(source.shape, x, y)
    footprint = stencil.geometry
    output = np.full(x.shape, np.nan, dtype=np.float32)
    finite_neighbors = np.zeros(x.shape, dtype=np.bool_)
    if not footprint.any():
        return output, footprint, finite_neighbors
    xx, yy = x[footprint], y[footprint]
    x0, y0 = stencil.x0, stencil.y0
    neighbors = np.stack([source[y0, x0], source[y0, x0 + 1],
                          source[y0 + 1, x0], source[y0 + 1, x0 + 1]], axis=0)
    finite = np.isfinite(neighbors).all(axis=0)
    finite_neighbors[footprint] = finite
    dx, dy = xx[finite] - x0[finite], yy[finite] - y0[finite]
    values = neighbors[:, finite].astype(np.float64)
    sampled = (values[0] * (1 - dx) * (1 - dy) + values[1] * dx * (1 - dy) +
               values[2] * (1 - dx) * dy + values[3] * dx * dy).astype(np.float32)
    if not np.isfinite(sampled).all():
        raise RuntimeError("source_bilinear_finite_interpolation_overflow")
    output[finite_neighbors] = sampled
    return output, footprint, finite_neighbors
