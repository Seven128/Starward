"""One encoded prepared-RGB TAN master and same-master geometric tiers.

The admitted observation owns source bytes/rights and approximate publisher
AVM. This producer changes neither colour transfer nor astrometry. Geometry
support is independent of scientific availability/validity, which stay UNKNOWN.
"""
from __future__ import annotations

from dataclasses import asdict, dataclass
import hashlib
from typing import Literal

import numpy as np

from prepared_rgb_observation import (VERSION as OBSERVATION_VERSION,
                                      NominalAvmGeometry, PreparedRgbObservation,
                                      PreparedRgbSource)
from sdss_gri_tan import target_tan
from prepared_optical_levels import prepared_optical_levels

VERSION = "prepared-rgb-tan-master-v1"
LEVELS = ("OVERVIEW", "MEDIUM", "DETAIL")
OFFSETS_DY_DX = ((-.25, -.25), (-.25, .25), (.25, -.25), (.25, .25))
ALPHA_MEANING = "area-fraction-of-complete-prepared-source-geometric-stencils"


def _digest(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


@dataclass(frozen=True)
class PreparedRgbTanMaster:
    object_ref: str
    center_ra_deg: float
    center_dec_deg: float
    pixels: int
    field_degrees: float
    rgba_bytes: bytes
    source: PreparedRgbSource
    source_geometry: NominalAvmGeometry
    source_rgb_sha256: str
    source_raw_xmp_sha256: str
    source_parser_xmp_sha256: str
    source_library_versions: tuple[tuple[str, str], ...]
    geometric_support_pixels: int
    supported_black_pixels: int
    chunk_rows: int
    scientific_availability: Literal["UNKNOWN"] = "UNKNOWN"
    scientific_validity: Literal["UNKNOWN"] = "UNKNOWN"
    version: str = VERSION

    @property
    def rgba_top_first(self) -> np.ndarray:
        """A fresh read-only view; caller shape changes cannot alter the owner."""
        return np.frombuffer(self.rgba_bytes, dtype=np.uint8).reshape(self.pixels, self.pixels, 4)

    @property
    def center(self) -> dict:
        return {"frame": "ICRS J2000", "raDeg": self.center_ra_deg, "decDeg": self.center_dec_deg}

    def metadata(self) -> dict:
        target = target_tan(self.center, self.pixels, self.field_degrees)
        return {"version": self.version, "objectRef": self.object_ref, "center": self.center,
                "pixels": self.pixels, "fieldDegrees": self.field_degrees,
                "orientation": "north-up/east-left", "rowOrder": "north/top first; FITS target y reversed",
                "wcsHeader": dict(target.to_header()),
                "crpixFitsOneBased": float(target.wcs.crpix[0]),
                "cdeltDeg": [float(value) for value in target.wcs.cdelt],
                "source": asdict(self.source), "sourceGeometry": asdict(self.source_geometry),
                "sourceRgbSha256": self.source_rgb_sha256,
                "sourceRawXmpSha256": self.source_raw_xmp_sha256,
                "sourceParserXmpSha256": self.source_parser_xmp_sha256,
                "sourceLibraryVersions": dict(self.source_library_versions),
                "colourMeaning": self.source.colour_meaning,
                "registration": self.source_geometry.accuracy,
                "sampling": {"method": "fixed 2x2 target-pixel quadrature; encoded RGB bilinear interpolation",
                             "offsetsDyDx": [list(offset) for offset in OFFSETS_DY_DX],
                             "sourceCoordinates": "zero-origin FITS columns/rows; JPEG top-first rows reversed by observation",
                             "support": "all four native neighbours at every quadrature offset, common across RGB",
                             "chunkRows": self.chunk_rows, "rounding": "round-to-nearest after four-offset mean"},
                "geometricSupportPixels": self.geometric_support_pixels,
                "unsupportedPixels": self.pixels ** 2 - self.geometric_support_pixels,
                "supportedBlackPixels": self.supported_black_pixels,
                "alphaMeaning": ALPHA_MEANING,
                "alphaInterpretation": "master cells are 255 only if every quadrature stencil is supported; not an exposure/science mask",
                "scientificAvailability": self.scientific_availability,
                "scientificValidity": self.scientific_validity,
                "rgba": {"bytes": len(self.rgba_bytes), "sha256": _digest(self.rgba_bytes),
                         "shape": [self.pixels, self.pixels, 4], "dtype": "|u1"}}


@dataclass(frozen=True)
class PreparedRgbTanProduct:
    level: str
    master: PreparedRgbTanMaster
    pixels: int
    field_degrees: float
    bounds_xy_exclusive: tuple[int, int, int, int]
    box_factor: int
    png_bytes: bytes
    rgba_bytes: bytes
    geometric_source_master_support_pixels: int
    total_source_master_crop_pixels: int

    @property
    def rgba_top_first(self) -> np.ndarray:
        return np.frombuffer(self.rgba_bytes, dtype=np.uint8).reshape(self.pixels, self.pixels, 4)

    def metadata(self) -> dict:
        rgba = self.rgba_top_first
        target = target_tan(self.master.center, self.pixels, self.field_degrees)
        return {"level": self.level, "imageFormat": "png", "pixels": self.pixels,
                "fieldDegrees": self.field_degrees, "bytes": len(self.png_bytes), "sha256": _digest(self.png_bytes),
                "wcsHeader": dict(target.to_header()), "crpixFitsOneBased": float(target.wcs.crpix[0]),
                "cdeltDeg": [float(value) for value in target.wcs.cdelt],
                "masterCrop": {"boundsXYExclusive": list(self.bounds_xy_exclusive), "boxFactor": self.box_factor,
                               "method": "same-master geometric-alpha-premultiplied integer box mean, round-to-nearest"},
                "geometricSourceMasterSupportPixels": self.geometric_source_master_support_pixels,
                "totalSourceMasterCropPixels": self.total_source_master_crop_pixels,
                "alphaMeaning": ALPHA_MEANING,
                "alphaInterpretation": "box-averaged binary master-cell support; not scientific availability or continuous source-footprint area",
                "alphaPixels": {"opaque": int((rgba[:, :, 3] == 255).sum()),
                                "partial": int(((rgba[:, :, 3] > 0) & (rgba[:, :, 3] < 255)).sum()),
                                "zero": int((rgba[:, :, 3] == 0).sum())},
                "scientificAvailability": "UNKNOWN", "scientificValidity": "UNKNOWN",
                "registration": self.master.source_geometry.accuracy,
                "colourMeaning": self.master.source.colour_meaning,
                "rgba": {"bytes": len(self.rgba_bytes), "sha256": _digest(self.rgba_bytes),
                         "shape": [self.pixels, self.pixels, 4], "dtype": "|u1"}}


def build_prepared_rgb_tan_master(observation: PreparedRgbObservation, *, object_ref: str,
                                  center: dict, pixels: int, field_degrees: float,
                                  chunk_rows: int = 128) -> PreparedRgbTanMaster:
    """Project admitted encoded RGB once, with existing TAN/chunk bounds.

    Source uint8 storage is never converted to a full floating RGB image.
    Coordinates/samples/float accumulator are bounded by one chunk and one
    quadrature offset. The final immutable byte copy briefly coexists with the
    uint8 master. These are logical allocations, not a process-RSS guarantee.
    """
    if (not isinstance(observation, PreparedRgbObservation) or observation.version != OBSERVATION_VERSION or
            not isinstance(object_ref, str) or not object_ref.strip() or not isinstance(center, dict) or
            not isinstance(chunk_rows, int) or isinstance(chunk_rows, bool) or not 1 <= chunk_rows <= 256 or
            not isinstance(observation.rgb_bytes, bytes) or not isinstance(observation.geometry, NominalAvmGeometry)):
        raise RuntimeError("prepared_rgb_tan_input_invalid")
    shape = observation.geometry.decoded_shape_width_height
    if (len(shape) != 2 or any(not isinstance(value, int) or isinstance(value, bool) or value <= 0 for value in shape) or
            len(observation.rgb_bytes) != shape[0] * shape[1] * 3 or
            observation.scientific_availability != "UNKNOWN" or
            observation.geometry.accuracy != "UNVERIFIED_APPROXIMATE_PUBLISHER_AVM"):
        raise RuntimeError("prepared_rgb_tan_observation_invalid")
    target = target_tan(center, pixels, field_degrees)
    source_wcs = observation.geometry.new_wcs()
    master = np.zeros((pixels, pixels, 4), dtype=np.uint8)
    for start in range(0, pixels, chunk_rows):
        end = min(pixels, start + chunk_rows)
        yy, xx = np.mgrid[start:end, 0:pixels]
        accum = np.zeros((*xx.shape, 3), dtype=np.float64)
        support = np.ones(xx.shape, dtype=np.bool_)
        for dy, dx in OFFSETS_DY_DX:
            ra, dec = target.all_pix2world(xx + dx, pixels - 1 - yy - dy, 0)
            sx, sy = source_wcs.all_world2pix(ra, dec, 0)
            samples = observation.sample_native(sx, sy)
            if (samples.encoded_rgb.shape != accum.shape or samples.geometric_support.shape != support.shape or
                    samples.geometric_support.dtype != np.bool_ or samples.scientific_availability != "UNKNOWN" or
                    not np.isfinite(samples.encoded_rgb[samples.geometric_support]).all()):
                raise RuntimeError("prepared_rgb_tan_samples_invalid")
            support &= samples.geometric_support
            accum += np.where(samples.geometric_support[..., None], samples.encoded_rgb, 0)
        chunk = master[start:end]
        chunk[:, :, :3] = np.rint(accum / 4).astype(np.uint8)
        chunk[:, :, :3][~support] = 0
        chunk[:, :, 3] = support.astype(np.uint8) * 255
    supplied = master[:, :, 3] == 255
    supplied_pixels = int(supplied.sum())
    if not supplied_pixels:
        raise RuntimeError("prepared_rgb_tan_geometric_support_unavailable")
    return PreparedRgbTanMaster(object_ref, float(center["raDeg"]), float(center["decDeg"]), pixels,
        float(field_degrees), master.tobytes(order="C"), observation.source, observation.geometry,
        _digest(observation.rgb_bytes), _digest(observation.raw_xmp), _digest(observation.parser_xmp),
        observation.library_versions, supplied_pixels,
        int((supplied & (master[:, :, :3] == 0).all(axis=2)).sum()), chunk_rows)


def prepared_rgb_tan_products(master: PreparedRgbTanMaster, *, output_pixels: int = 512) -> tuple[PreparedRgbTanProduct, ...]:
    """Three centered tiers, solely cropped/box-filtered from the one master."""
    if (not isinstance(master, PreparedRgbTanMaster) or master.version != VERSION or
            not isinstance(master.pixels, int) or isinstance(master.pixels, bool) or not 1 <= master.pixels <= 4096 or
            not isinstance(output_pixels, int) or isinstance(output_pixels, bool) or output_pixels <= 0 or
            master.pixels < output_pixels * 4 or master.pixels % (output_pixels * 4) or
            not isinstance(master.rgba_bytes, bytes) or len(master.rgba_bytes) != master.pixels ** 2 * 4 or
            master.scientific_availability != "UNKNOWN" or master.scientific_validity != "UNKNOWN" or
            not isinstance(master.source_geometry, NominalAvmGeometry)):
        raise RuntimeError("prepared_rgb_tan_three_levels_require_integer_crops")
    target_tan(master.center, master.pixels, master.field_degrees)
    n = master.pixels
    # Cached/publicly constructed masters must preserve the binary geometric
    # support contract. General display alpha belongs to a different owner.
    # Validate in bounded chunks; black supplied RGB remains alpha 255.
    if (not isinstance(master.chunk_rows, int) or isinstance(master.chunk_rows, bool) or not 1 <= master.chunk_rows <= 256 or
            any(not isinstance(value, int) or isinstance(value, bool) or value < 0 or value > n ** 2
                for value in (master.geometric_support_pixels, master.supported_black_pixels))):
        raise RuntimeError("prepared_rgb_tan_master_geometry_invalid")
    actual_support = actual_black = 0
    for start in range(0, n, master.chunk_rows):
        chunk = master.rgba_top_first[start:min(n, start + master.chunk_rows)]
        alpha = chunk[:, :, 3]
        missing, supplied = alpha == 0, alpha == 255
        if not (missing | supplied).all() or np.any(chunk[:, :, :3][missing] != 0):
            raise RuntimeError("prepared_rgb_tan_master_geometry_invalid")
        actual_support += int(supplied.sum())
        actual_black += int((supplied & (chunk[:, :, :3] == 0).all(axis=2)).sum())
    if actual_support != master.geometric_support_pixels or actual_black != master.supported_black_pixels:
        raise RuntimeError("prepared_rgb_tan_master_geometry_counts_mismatch")
    return tuple(PreparedRgbTanProduct(product.level, master, product.pixels, product.field_degrees,
        product.bounds_xy_exclusive, product.box_factor, product.png_bytes, product.rgba_bytes,
        product.geometric_source_master_support_pixels, product.total_source_master_crop_pixels)
        for product in prepared_optical_levels(master.rgba_top_first, master.field_degrees, output_pixels=output_pixels))
