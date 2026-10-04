"""Checked offline AllWISE W3 native intensity/coverage/uncertainty inputs.

Source support is separate from detector quality, display alpha and publication.
The reader never fetches, resamples, subtracts sky or changes a source scalar.
"""
from __future__ import annotations

from dataclasses import dataclass
import io
import math
from pathlib import Path
import re
from types import MappingProxyType
from typing import Callable, Mapping
import warnings

import numpy as np
from astropy.io import fits
from astropy.wcs import WCS

from image_quality import checked_source_files, digest

SUPPORT_VERSION = 'allwise-atlas-native-support-v1'
PRODUCTS = ('int', 'cov', 'unc')
FILE_TYPES = {'int': 'intensity image', 'cov': 'depth-of-coverage image', 'unc': '1-sigma uncertainty image'}
UNITS = {'int': 'DN', 'cov': 'effective pixels', 'unc': 'DN'}


@dataclass(frozen=True)
class AtlasNativeSource:
    intensity: np.ndarray
    coverage: np.ndarray
    uncertainty: np.ndarray
    intensity_finite: np.ndarray
    coverage_known: np.ndarray
    uncertainty_known: np.ndarray
    positive_contribution: np.ndarray
    supported: np.ndarray
    coadd_id: str
    wcs_header: Mapping
    magnitude_zero_point: float
    source_receipts: tuple[dict, ...]


def read_cached_atlas_triplet(directory: Path, products: Mapping[str, dict], *,
                             coadd_id: str, cancelled: Callable[[], bool] | None = None) -> AtlasNativeSource:
    """Return an entirely admitted native grid; failure/cancel returns no bundle.

    Each product uses the existing CHECKED/completeArrayReceived/bytes/hash file
    contract. Actual W3 FITS headers, full plain float32 array and common WCS are
    verified here. Missing input is unavailable, never a zero scientific value.
    Small positive coverage is preserved without a quality/confidence threshold.
    """
    def check_cancel():
        if cancelled is not None and cancelled():
            raise RuntimeError('allwise_atlas_cancelled')

    check_cancel()
    if not isinstance(coadd_id, str) or not re.fullmatch(r'\d{4}[pm]\d{3}_ac51', coadd_id):
        raise RuntimeError('allwise_atlas_identity_invalid')
    if set(products) != set(PRODUCTS):
        raise RuntimeError('allwise_atlas_source_set_incomplete')
    directory = directory.resolve()
    records = [products[key] for key in PRODUCTS]
    paths = [item.get('path') for item in records]
    if any(not isinstance(path, str) or not path for path in paths) or len(set(paths)) != 3:
        raise RuntimeError('allwise_atlas_source_set_invalid')
    checked = checked_source_files(directory, records, set(paths), 3)
    check_cancel()
    arrays, receipts = {}, []
    common_wcs, common_shape, common_zero_point = None, None, None
    for product, item in zip(PRODUCTS, checked, strict=True):
        check_cancel()
        raw = (directory / item['path']).read_bytes()
        if len(raw) != item['bytes'] or digest(raw) != item['sha256']:
            raise RuntimeError('allwise_atlas_source_changed')
        # gzip=false native cutouts are plain FITS. Do not compare compressed
        # bytes with a decompressed data offset or silently reinterpret scaling.
        if not raw.startswith(b'SIMPLE  ='):
            raise RuntimeError('allwise_atlas_plain_fits_required')
        with warnings.catch_warnings(record=True) as notices:
            warnings.simplefilter('always')
            with fits.open(io.BytesIO(raw), memmap=False, do_not_scale_image_data=True) as hdus:
                hdus.verify('exception')
                if len(hdus) != 1:
                    raise RuntimeError('allwise_atlas_primary_product_required')
                hdu = hdus[0]
                header = hdu.header
                if (header.get('COADDID') != coadd_id or header.get('BAND') != 3 or
                        header.get('FILETYPE') != FILE_TYPES[product] or header.get('BUNIT') != UNITS[product]):
                    raise RuntimeError('allwise_atlas_product_identity_invalid')
                if header.get('BSCALE', 1) != 1 or header.get('BZERO', 0) != 0:
                    raise RuntimeError('allwise_atlas_scaled_units_unqualified')
                width, height = header.get('NAXIS1'), header.get('NAXIS2')
                if (header.get('BITPIX') != -32 or header.get('NAXIS') != 2 or
                        not isinstance(width, int) or not isinstance(height, int) or width <= 0 or height <= 0):
                    raise RuntimeError('allwise_atlas_array_invalid')
                offset = hdu.fileinfo()['datLoc']
                array_bytes = width * height * 4
                # Check extent before materialising an untrusted declared shape.
                if len(raw) < offset + array_bytes:
                    raise RuntimeError('allwise_atlas_array_truncated')
                data = np.array(hdu.data, copy=True)
                native_wcs = WCS(header)
                if (not native_wcs.has_celestial or native_wcs.pixel_n_dim != 2 or
                        list(native_wcs.wcs.ctype) != ['RA---SIN', 'DEC--SIN'] or native_wcs.has_distortion):
                    raise RuntimeError('allwise_atlas_native_grid_unqualified')
                grid = dict(native_wcs.to_header(relax=True))
                zero_point = header.get('MAGZP')
                if isinstance(zero_point, bool) or not isinstance(zero_point, (int, float)) or not math.isfinite(zero_point):
                    raise RuntimeError('allwise_atlas_zero_point_unknown')
                if common_wcs is None:
                    common_wcs, common_shape, common_zero_point = grid, data.shape, float(zero_point)
                elif grid != common_wcs or data.shape != common_shape or zero_point != common_zero_point:
                    raise RuntimeError('allwise_atlas_products_grid_or_calibration_differ')
                arrays[product] = data
        check_cancel()
        receipts.append({'product': product, 'path': item['path'], 'bytes': len(raw), 'sha256': digest(raw),
                         'completeArrayReceived': True, 'shape': list(data.shape), 'BUNIT': UNITS[product],
                         'FILETYPE': FILE_TYPES[product],
                         'missingEndPaddingBytes': max(0, (offset + array_bytes + 2879) // 2880 * 2880 - len(raw)),
                         'readerWarnings': sorted(set(str(notice.message) for notice in notices))})
    # Recheck the whole input set after parsing; a changed source never escapes
    # as a partial/new bundle even when a previous product parsed successfully.
    check_cancel()
    checked_source_files(directory, records, set(paths), 3)
    check_cancel()
    intensity, coverage, uncertainty = (arrays[key] for key in PRODUCTS)
    finite = np.isfinite(intensity)
    coverage_known = np.isfinite(coverage) & (coverage >= 0)
    uncertainty_known = np.isfinite(uncertainty) & (uncertainty >= 0)
    positive = coverage_known & (coverage > 0)
    supported = finite & positive & uncertainty_known
    for array in (intensity, coverage, uncertainty, finite, coverage_known, uncertainty_known, positive, supported):
        array.setflags(write=False)
    return AtlasNativeSource(intensity, coverage, uncertainty, finite, coverage_known, uncertainty_known,
                             positive, supported, coadd_id, MappingProxyType(common_wcs),
                             common_zero_point, tuple(receipts))
