"""Bound cached SDSS camera parameters and sample native-pixel statistical noise.

The frame-model formula reverses calibration/sky subtraction only to estimate
counts variance. Science stays unchanged. This is not an artifact mask, PSF,
sky-model uncertainty, target-pixel covariance or coadd inverse-variance map.
Reprojection needs squared coefficients and shared-pixel covariance; overlapping
frames from one run must not be assumed to be independent exposures.
"""
from __future__ import annotations

import csv
from dataclasses import dataclass
import io
import math
from pathlib import Path
import re
from urllib.parse import urlsplit

import numpy as np

from image_quality import digest
from sdss_corrected_frame import CorrectedFrame, IDENTITY_KEYS, _identity
from sdss_source_stencil import bilinear_source_samples

SKY_RECONSTRUCTION_VERSION = 'sdss-retained-sky-idl-bilinear-constant-edge-v2'


def retained_sky_samples(sky: np.ndarray, x: np.ndarray, y: np.ndarray):
    """Reconstruct the already-applied HDU2 SKY, not missing science pixels.

    The SDSS frame datamodel uses IDL INTERPOLATE without MISSING. Its default
    extends the closest edge constantly (also explicitly required for short
    end-of-run SKY grids). Interior arithmetic and float32 return stay unchanged.
    https://data.sdss.org/datamodel/files/BOSS_PHOTOOBJ/frames/RERUN/RUN/CAMCOL/frame.html
    https://www.nv5geospatialsoftware.com/docs/INTERPOLATE.html

    Return the original complete-grid stencil diagnostic separately from valid
    reconstruction. Nonfinite coordinates or touched values remain unknown.
    """
    if (not isinstance(sky, np.ndarray) or sky.ndim != 2 or sky.dtype.kind != 'f' or
            min(sky.shape) < 1 or not isinstance(x, np.ndarray) or not isinstance(y, np.ndarray) or
            x.shape != y.shape or x.dtype.kind not in 'fi' or y.dtype.kind not in 'fi'):
        raise RuntimeError('sdss_noise_sky_sampling_shape_invalid')
    sampled, grid_stencil, finite = bilinear_source_samples(sky, x, y)
    edge = ~grid_stencil & np.isfinite(x) & np.isfinite(y)
    if edge.any():
        xx = np.clip(x[edge], 0, sky.shape[1]-1).astype(np.float64)
        yy = np.clip(y[edge], 0, sky.shape[0]-1).astype(np.float64)
        x0, y0 = np.floor(xx).astype(np.intp), np.floor(yy).astype(np.intp)
        x1, y1 = np.minimum(x0+1, sky.shape[1]-1), np.minimum(y0+1, sky.shape[0]-1)
        values = np.stack((sky[y0,x0], sky[y0,x1], sky[y1,x0], sky[y1,x1])).astype(np.float64)
        known = np.isfinite(values).all(axis=0)
        dx, dy = xx[known]-x0[known], yy[known]-y0[known]
        a, b, c, d = values[:,known]
        result = (a*(1-dx)*(1-dy) + b*dx*(1-dy) + c*(1-dx)*dy + d*dx*dy).astype(np.float32)
        known[np.flatnonzero(known)[~np.isfinite(result)]] = False
        finite[edge] = known
        sampled[edge] = np.nan
        sampled[finite & edge] = result[np.isfinite(result)]
    return sampled, grid_stencil, finite, edge


@dataclass(frozen=True)
class FieldNoiseParameters:
    identity: tuple
    field_id: str
    gain_electrons_per_count: float
    dark_variance_counts_squared: float
    response_sha256: str
    response_bytes: int
    response_url: str


def read_cached_field_noise(path: Path, receipt: dict, identity: dict) -> FieldNoiseParameters:
    """Join exact frame identity to one row of byte-bound official Field CSV.

    A valid acquisition binding is evidence of cached bytes, not independent
    proof of network origin. Preserve large Field IDs as strings.
    """
    actual = _identity(identity)
    sha, size, url = receipt.get("sha256"), receipt.get("bytes"), receipt.get("url")
    if (receipt.get("status") != 200 or not isinstance(sha, str) or
            re.fullmatch(r"[a-f0-9]{64}", sha) is None or
            not isinstance(size, int) or isinstance(size, bool) or size <= 0 or
            not isinstance(url, str)):
        raise RuntimeError("sdss_noise_response_binding_invalid")
    parts = urlsplit(url)
    if (parts.scheme != "https" or parts.netloc != "skyserver.sdss.org" or
            parts.path != "/dr17/SkyServerWS/SearchTools/SqlSearch" or parts.fragment):
        raise RuntimeError("sdss_noise_response_url_invalid")
    if path.stat().st_size != size:
        raise RuntimeError("sdss_noise_response_bytes_changed")
    raw = path.read_bytes()
    if len(raw) != size or digest(raw) != sha:
        raise RuntimeError("sdss_noise_response_bytes_changed")
    try:
        rows = list(csv.DictReader(io.StringIO("\n".join(line for line in
            raw.decode("utf-8-sig").splitlines() if line and not line.startswith("#")))))
        matches = [row for row in rows if all(row.get(key) == str(actual[key])
                                            for key in IDENTITY_KEYS[:-1])]
        if len(matches) != 1:
            raise RuntimeError("sdss_noise_field_identity_ambiguous_or_missing")
        row = matches[0]
        field_id = row["fieldID"]
        gain, dark = float(row[f"gain_{actual['band']}"]), float(row[f"darkVariance_{actual['band']}"])
        if (not re.fullmatch(r"[0-9]+", field_id) or not math.isfinite(gain) or gain <= 0 or
                not math.isfinite(dark) or dark < 0):
            raise RuntimeError("sdss_noise_camera_parameters_invalid")
    except (UnicodeDecodeError, csv.Error, KeyError, ValueError, TypeError) as error:
        raise RuntimeError("sdss_noise_camera_parameters_invalid") from error
    return FieldNoiseParameters(tuple(actual[key] for key in IDENTITY_KEYS), field_id,
                                gain, dark, sha, size, url)


@dataclass(frozen=True)
class NativeNoiseSamples:
    variance_nmgy_squared: np.ndarray
    sky_counts: np.ndarray
    calibration_nmgy_per_count: np.ndarray
    native_geometry: np.ndarray
    sky_geometry: np.ndarray
    available: np.ndarray
    sky_constant_edge: np.ndarray
    sky_reconstruction_version: str = SKY_RECONSTRUCTION_VERSION


def native_noise_samples(frame: CorrectedFrame, parameters: FieldNoiseParameters,
                         columns: np.ndarray, rows: np.ndarray) -> NativeNoiseSamples:
    """Evaluate requested integer source pixels only, with no full noise image.

    Retained SKY follows the provider's bilinear constant-edge reconstruction;
    this does not extend native CCD science/flags or alter scientific samples.
    Nonfinite SKY/coordinates, bad calibration/science or negative variance stay
    unavailable, not zero noise. The raw SKY grid stencil is only diagnostic.
    """
    identity = _identity(frame.receipt["identity"])
    if tuple(identity[key] for key in IDENTITY_KEYS) != parameters.identity:
        raise RuntimeError("sdss_noise_frame_camera_identity_mismatch")
    if (not math.isfinite(parameters.gain_electrons_per_count) or parameters.gain_electrons_per_count <= 0 or
            not math.isfinite(parameters.dark_variance_counts_squared) or parameters.dark_variance_counts_squared < 0):
        raise RuntimeError("sdss_noise_camera_parameters_invalid")
    metadata = frame.calibration_sky
    if metadata is None:
        raise RuntimeError("sdss_noise_frame_metadata_unavailable")
    if (not isinstance(columns, np.ndarray) or not isinstance(rows, np.ndarray) or
            columns.shape != rows.shape or columns.dtype.kind not in "iu" or rows.dtype.kind not in "iu"):
        raise RuntimeError("sdss_noise_native_coordinates_invalid")
    nrows, ncols = frame.data.shape
    geometry = (columns >= 0) & (columns < ncols) & (rows >= 0) & (rows < nrows)
    variance = np.full(columns.shape, np.nan, dtype=np.float64)
    sky = np.full(columns.shape, np.nan, dtype=np.float64)
    calib = np.full(columns.shape, np.nan, dtype=np.float64)
    sky_geometry = np.zeros(columns.shape, dtype=np.bool_)
    sky_constant_edge = np.zeros(columns.shape, dtype=np.bool_)
    available = np.zeros(columns.shape, dtype=np.bool_)
    if geometry.any():
        x, y = columns[geometry], rows[geometry]
        sampled, footprint, finite, edge = retained_sky_samples(metadata.allsky,
            metadata.xinterp[x], metadata.yinterp[y])
        sky[geometry], sky_geometry[geometry] = sampled, footprint
        sky_constant_edge[geometry] = edge
        calib[geometry] = metadata.calibration[x]
        values = frame.data[y, x].astype(np.float64)
        c = calib[geometry]
        with np.errstate(invalid="ignore", divide="ignore", over="ignore"):
            counts = values / c + sampled.astype(np.float64)
            estimate = (counts / parameters.gain_electrons_per_count +
                        parameters.dark_variance_counts_squared) * c**2
        valid = finite & np.isfinite(c) & (c > 0) & np.isfinite(values) & np.isfinite(estimate) & (estimate >= 0)
        available[geometry] = valid
        variance[available] = estimate[valid]
    return NativeNoiseSamples(variance, sky, calib, geometry, sky_geometry, available, sky_constant_edge)
