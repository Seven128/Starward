"""Shared task diagnostic: finite signed native PSF through actual bilinear sampling.

Reuses Photutils ImagePSF and the science sampler. This is a relative unit
model, not an observed star, flux-conserving reprojection, matching kernel or
the nonlinear adaptive display's PSF. No science arrays are modified.
"""
from dataclasses import dataclass

import numpy as np
from photutils.psf import ImagePSF
from sdss_source_stencil import source_pixel_stencil, bilinear_source_samples


@dataclass(frozen=True)
class NativeUnitResponse:
    anchor_xy: tuple[float, float]
    anchor_inside: bool
    kernel: np.ndarray | None
    native_bounds: tuple[int, int, int, int] | None
    native_model: np.ndarray | None
    response: np.ndarray
    support: np.ndarray


def native_unit_response(psfield, band, wcs, shape, sky_anchor, sx, sy):
    """One common sky anchor; PSF at its native position, sampled at integers.

    Finite 51x51 model domain remains unknown outside, including zero-weight
    nonfinite bilinear neighbours. Actual CCD geometry also remains separate.
    Cropping covers only requested in-CCD stencils; empty geometry is valid.
    """
    stencil = source_pixel_stencil(shape, sx, sy)
    nx, ny = map(float, wcs.all_world2pix(*sky_anchor, 0))
    inside = bool(np.isfinite([nx, ny]).all() and 0 <= nx < shape[1] and 0 <= ny < shape[0])
    response = np.full(sx.shape, np.nan, np.float32)
    support = np.zeros(sx.shape, bool)
    if not inside or not stencil.geometry.any():
        return NativeUnitResponse((nx, ny), inside, None, None, None, response, support)
    kernel = psfield.reconstruct(band, nx, ny)
    if (kernel.shape != (51, 51) or not np.isfinite(kernel).all() or
            not np.isfinite(kernel.sum()) or kernel.sum() <= 0):
        raise RuntimeError('native_unit_psf_kernel_invalid')
    model = ImagePSF(kernel / kernel.sum(), flux=1, x_0=nx, y_0=ny,
                     origin=(25, 25), oversampling=1, fill_value=np.nan)
    ax, ay = int(stencil.x0.min()), int(stencil.y0.min())
    bx, by = int(stencil.x0.max()) + 2, int(stencil.y0.max()) + 2
    py, px = np.mgrid[ay:by, ax:bx]
    native = model(px, py)
    response, geometry, support = bilinear_source_samples(native, sx - ax, sy - ay)
    assert np.array_equal(geometry, stencil.geometry)
    return NativeUnitResponse((nx, ny), inside, kernel, (ax, ay, bx, by), native, response, support)
