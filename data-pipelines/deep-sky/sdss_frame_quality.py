"""Byte-bound SDSS photo masks and spatial PSF diagnostics, with no science edits.

The caller supplies an independently acquired canonical receipt. Missing header
identity facts stay unknown. Pixel flags do not establish finite science samples,
and signed relative PSF kernels are neither calibrated flux nor a quality pass.
"""
from __future__ import annotations

from contextlib import contextmanager
from dataclasses import dataclass
import io
from pathlib import Path
import re
import struct
from types import MappingProxyType
import warnings
import zlib

import numpy as np
from astropy.io import fits

from image_quality import digest, number
from sdss_corrected_frame import CorrectedFrame, FRAME_SHAPE, _identity, _json_value
from sdss_source_stencil import source_pixel_stencil

BANDS = tuple("ugriz")
PLANE_NAMES = ("S_MASK_INTERP", "S_MASK_SATUR", "S_MASK_NOTCHECKED", "S_MASK_OBJECT",
               "S_MASK_BRIGHTOBJECT", "S_MASK_BINOBJECT", "S_MASK_CATOBJECT",
               "S_MASK_SUBTRACTED", "S_MASK_GHOST", "S_MASK_CR")
PSFIELD_MODEL = "https://data.sdss.org/datamodel/files/PHOTO_REDUX/RERUN/RUN/objcs/CAMCOL/psField.html"
FPM_MODEL = "https://data.sdss.org/datamodel/files/PHOTO_REDUX/RERUN/RUN/objcs/CAMCOL/fpM.html"


def _frozen(array: np.ndarray) -> np.ndarray:
    array.setflags(write=False)
    return array


def _limit(value):
    if not isinstance(value, int) or isinstance(value, bool) or value <= 0:
        raise RuntimeError("sdss_quality_decompression_limit_invalid")


def _single_gzip(raw: bytes, limit: int) -> bytes:
    """Require one complete gzip member, including CRC, with bounded output."""
    _limit(limit)
    if not raw.startswith(b"\x1f\x8b"):
        raise RuntimeError("sdss_quality_gzip_invalid")
    decoder = zlib.decompressobj(16 + zlib.MAX_WBITS)
    output = bytearray()
    pending = raw
    try:
        while True:
            output.extend(decoder.decompress(pending, limit - len(output) + 1))
            if len(output) > limit:
                raise RuntimeError("sdss_quality_decompression_limit_exceeded")
            if decoder.eof:
                if decoder.unused_data:
                    raise RuntimeError("sdss_quality_gzip_trailing_data")
                return bytes(output)
            if not decoder.unconsumed_tail:
                raise RuntimeError("sdss_quality_gzip_incomplete")
            pending = decoder.unconsumed_tail
    except zlib.error as error:
        raise RuntimeError("sdss_quality_gzip_invalid") from error


def _read_source(path: Path, expected: dict, kind: str, limit: int):
    _limit(limit)
    if not isinstance(expected, dict):
        raise RuntimeError("sdss_quality_source_binding_invalid")
    # Use the corrected-frame identity owner, including its rerun normalization.
    # psField is a five-band field, so the validation placeholder is discarded.
    identity = _identity({**expected, "band": "g"} if kind == "psField" else expected)
    if kind == "psField":
        identity = {key: value for key, value in identity.items() if key != "band"}
    count, sha = expected.get("bytes"), expected.get("sha256")
    if (not isinstance(count, int) or isinstance(count, bool) or count <= 0 or
            not isinstance(sha, str) or not re.fullmatch("[a-f0-9]{64}", sha)):
        raise RuntimeError("sdss_quality_source_binding_invalid")
    if count > limit:
        raise RuntimeError("sdss_quality_source_byte_limit_exceeded")
    filename = (f"psField-{identity['run']:06d}-{identity['camcol']}-{identity['field']:04d}.fit"
                if kind == "psField" else
                f"fpM-{identity['run']:06d}-{identity['band']}{identity['camcol']}-{identity['field']:04d}.fit.gz")
    if path.name != filename:
        raise RuntimeError("sdss_quality_filename_identity_mismatch")
    url = ("https://data.sdss.org/sas/dr17/eboss/photo/redux/"
           f"{identity['rerun']}/{identity['run']}/objcs/{identity['camcol']}/{filename}")
    if expected.get("sourceUrl") != url:
        raise RuntimeError("sdss_quality_source_url_identity_mismatch")
    if path.stat().st_size != count:
        raise RuntimeError("sdss_quality_source_bytes_changed")
    with path.open("rb") as source:
        encoded = source.read(count + 1)
    if len(encoded) != count or digest(encoded) != sha:
        raise RuntimeError("sdss_quality_source_bytes_changed")
    raw = encoded if kind == "psField" else _single_gzip(encoded, limit)
    source = {"path": str(path), "sourceUrl": url, "bytes": len(encoded), "sha256": digest(encoded),
              "sourceUrlEvidence": "ACQUISITION_RECEIPT_IDENTITY_CHECKED_NOT_NETWORK_ORIGIN_PROOF",
              "dataModelUrl": PSFIELD_MODEL if kind == "psField" else FPM_MODEL}
    return raw, identity, source


def _names(table) -> dict:
    names = {name.lower(): name for name in table.columns.names}
    if len(names) != len(table.columns):
        raise RuntimeError("sdss_quality_column_names_ambiguous")
    return names


def _column(table, name, format_, dim=None):
    names = _names(table)
    if name.lower() not in names:
        raise RuntimeError("sdss_quality_required_column_missing")
    actual = names[name.lower()]
    column = table.columns[actual]
    fmt = str(column.format)
    if fmt != format_ or column.dim != dim:
        raise RuntimeError("sdss_quality_column_schema_unsupported")
    return table.data[actual]


@contextmanager
def _checked_fits(raw, identity, source, kind, limit):
    if len(raw) > limit or len(raw) % 2880 or not raw:
        raise RuntimeError("sdss_quality_fits_container_incomplete")
    try:
        with warnings.catch_warnings(record=True) as notices:
            warnings.simplefilter("always")
            with fits.open(io.BytesIO(raw), memmap=False, lazy_load_hdus=False) as hdus:
                hdus.verify("exception")
                if len(hdus) != (10 if kind == "psField" else 12):
                    raise RuntimeError("sdss_quality_hdu_schema_unsupported")
                if hdus[0].header.get("SIMPLE") is not True or hdus[0].header.get("NAXIS") != 0:
                    raise RuntimeError("sdss_quality_primary_schema_unsupported")
                metadata = []
                variable_payload_bytes = 0
                for index, hdu in enumerate(hdus):
                    info = hdu.fileinfo()
                    if info["datLoc"] + info["datSpan"] > len(raw):
                        raise RuntimeError("sdss_quality_fits_payload_incomplete")
                    data = hdu.data
                    if index and not isinstance(hdu, fits.BinTableHDU):
                        raise RuntimeError("sdss_quality_hdu_schema_unsupported")
                    columns = []
                    if isinstance(hdu, fits.BinTableHDU):
                        count, width = hdu.header["NAXIS2"], hdu.header["NAXIS1"]
                        pcount = hdu.header.get("PCOUNT", 0)
                        start = hdu.header.get("THEAP", count * width)
                        heap_size = count * width + pcount - start
                        if start < count * width or heap_size < 0:
                            raise RuntimeError("sdss_quality_heap_bounds_invalid")
                        _names(hdu)
                        for col in hdu.columns:
                            fmt = str(col.format)
                            variable = re.fullmatch(r"1([PQ])([LXBIJKAEDCM])(?:\(\d*\))?", fmt)
                            lengths = []
                            if "P" in fmt or "Q" in fmt:
                                if not variable:
                                    raise RuntimeError("sdss_quality_heap_schema_unsupported")
                                descriptor, element = variable.groups()
                                offset = data.dtype.fields[col.name][1]
                                size = 8 if descriptor == "P" else 16
                                scalar_size = {"L": 1, "B": 1, "I": 2, "J": 4, "K": 8, "A": 1,
                                               "E": 4, "D": 8, "C": 8, "M": 16}
                                for row in range(count):
                                    at = info["datLoc"] + row * width + offset
                                    n, pointer = struct.unpack(">ii" if descriptor == "P" else ">qq", raw[at:at + size])
                                    need = (n + 7) // 8 if element == "X" else n * scalar_size[element]
                                    if n < 0 or pointer < 0 or pointer + need > heap_size:
                                        raise RuntimeError("sdss_quality_heap_bounds_invalid")
                                    # Several legal-looking descriptors can
                                    # alias one heap. Bound their cumulative
                                    # expansion before forcing variable arrays.
                                    variable_payload_bytes += need
                                    if variable_payload_bytes > limit:
                                        raise RuntimeError("sdss_quality_variable_payload_limit_exceeded")
                                    lengths.append(n)
                            values = data[col.name]
                            if variable and variable[2] != "X" and any(
                                    np.asarray(value).size != n for value, n in zip(values, lengths)):
                                raise RuntimeError("sdss_quality_heap_readback_length_invalid")
                            columns.append({"name": col.name, "format": fmt, "dim": col.dim,
                                            "unit": col.unit, "heapLengths": lengths if variable else None})
                    if "CHECKSUM" in hdu.header and hdu.verify_checksum() != 1:
                        raise RuntimeError("sdss_quality_fits_checksum_invalid")
                    if "DATASUM" in hdu.header and hdu.verify_datasum() != 1:
                        raise RuntimeError("sdss_quality_fits_checksum_invalid")
                    metadata.append({"hdu": index, "headerFitsCards": hdu.header.tostring(sep="\n", endcard=True, padding=False),
                                     "rows": None if data is None else len(data), "columns": columns})
                if hdus[-1].fileinfo()["datLoc"] + hdus[-1].fileinfo()["datSpan"] != len(raw):
                    raise RuntimeError("sdss_quality_fits_trailing_data")
                header = hdus[0].header
                actual = {key: _json_value(header[key]) if key in header else None
                          for key in ("RUN", "RERUN", "CAMCOL", "FIELD", "FILTER", "FILTERS", "PS_ID")}
                for key, name in (("RUN", "run"), ("CAMCOL", "camcol"), ("FIELD", "field")):
                    if not isinstance(actual[key], int) or isinstance(actual[key], bool) or actual[key] != identity[name]:
                        raise RuntimeError("sdss_quality_actual_identity_mismatch")
                if actual["RERUN"] is not None and str(actual["RERUN"]).strip() != identity["rerun"]:
                    raise RuntimeError("sdss_quality_actual_identity_mismatch")
                if kind == "fpM" and actual["FILTER"] is not None and actual["FILTER"] != identity["band"]:
                    raise RuntimeError("sdss_quality_actual_identity_mismatch")
                receipt = {"version": "sdss-source-quality-cached-diagnostic-v1", "source": source,
                           "expectedIdentity": identity, "actualPrimaryIdentity": actual,
                           "decompressed": {"bytes": len(raw), "sha256": digest(raw), "maximumBytes": limit,
                                            "singleCompleteGzipStream": kind == "fpM", "completeFitsAndHeapReadback": True,
                                            "variablePayloadBytes": variable_payload_bytes,
                                            "maximumExpandedVariablePayloadBytes": limit},
                           "hdus": metadata, "readerWarnings": sorted({str(item.message) for item in notices}),
                           "admission": "CHECKED_DIAGNOSTIC_STRUCTURE_SCIENTIFIC_QUALITY_UNVERIFIED"}
                yield hdus, receipt
    except (OSError, ValueError, TypeError, IndexError, KeyError, fits.verify.VerifyError) as error:
        raise RuntimeError("sdss_quality_fits_invalid") from error


@dataclass(frozen=True)
class PsfBasis:
    coefficients: np.ndarray
    images: np.ndarray
    row_orders: np.ndarray
    column_orders: np.ndarray


@dataclass(frozen=True)
class PsfField:
    bands: object
    receipt: object

    def reconstruct(self, band: str, x: float, y: float) -> np.ndarray:
        """Native zero-index column/row; signed relative kernel, without shifts.

        The declared PHOTO polynomial uses row/column centers (+0.5), scaled
        by .001. Actual FITS wire c is row-power-major, column-power-minor;
        Astropy preserves that matrix order. Each basis has its own orders.
        """
        if not isinstance(band, str) or band not in self.bands or not number(x) or not number(y):
            raise RuntimeError("sdss_quality_psf_position_invalid")
        if not 0 <= x <= FRAME_SHAPE[1] - 1 or not 0 <= y <= FRAME_SHAPE[0] - 1:
            raise RuntimeError("sdss_quality_psf_position_outside_frame")
        basis = self.bands[band]
        row, column = (float(y) + .5) * .001, (float(x) + .5) * .001
        result = np.zeros(basis.images.shape[1:], dtype=np.float64)
        for k in range(basis.images.shape[0]):
            weight = 0.0
            for i in range(int(basis.row_orders[k])):
                for j in range(int(basis.column_orders[k])):
                    weight += basis.coefficients[k, i, j] * row ** i * column ** j
            result += weight * basis.images[k]
        if not np.isfinite(result).all():
            raise RuntimeError("sdss_quality_psf_reconstruction_nonfinite")
        return _frozen(result)


@dataclass(frozen=True)
class FlagStencil:
    flags: np.ndarray
    geometry: np.ndarray


@dataclass(frozen=True)
class PixelFlags:
    flags: np.ndarray
    enum: object
    receipt: object

    def stencil(self, x, y) -> FlagStencil:
        x, y = np.asarray(x), np.asarray(y)
        stencil = source_pixel_stencil(self.flags.shape, x, y)
        result = np.zeros(x.shape, dtype=np.uint16)
        xx, yy = stencil.x0, stencil.y0
        result[stencil.geometry] = (self.flags[yy, xx] | self.flags[yy, xx + 1] |
                                    self.flags[yy + 1, xx] | self.flags[yy + 1, xx + 1])
        return FlagStencil(_frozen(result), _frozen(stencil.geometry))


def read_cached_psfield(path: Path, expected: dict, *, max_uncompressed_bytes: int) -> PsfField:
    raw, identity, source = _read_source(path, expected, "psField", max_uncompressed_bytes)
    with _checked_fits(raw, identity, source, "psField", max_uncompressed_bytes) as (hdus, receipt):
        if len(hdus) != 10 or tuple(str(hdus[0].header.get("FILTERS", "")).split()) != BANDS:
            raise RuntimeError("sdss_quality_psfield_band_tables_unsupported")
        bands, descriptions = {}, {}
        for index, band in enumerate(BANDS, 1):
            table = hdus[index]
            nr = np.array(_column(table, "nrow_b", "1J"), copy=True)
            nc = np.array(_column(table, "ncol_b", "1J"), copy=True)
            coeff = np.array(_column(table, "c", "25E", "(5,5)"), dtype=np.float64, copy=True)
            rows = _column(table, "RNROW", "1J")
            cols = _column(table, "RNCOL", "1J")
            rt = _column(table, "RTYPE", "1J")
            row0 = _column(table, "RROW0", "1J")
            col0 = _column(table, "RCOL0", "1J")
            names = _names(table)
            if ("rrows" not in names or not re.fullmatch(r"1PE(?:\(\d*\))?", str(table.columns[names["rrows"]].format))):
                raise RuntimeError("sdss_quality_psfield_eigen_heap_unsupported")
            vectors = table.data[names["rrows"]]
            count = len(table.data)
            if (count < 1 or coeff.shape != (count, 5, 5) or any(np.any(values < 1) or np.any(values > 5) for values in (nr, nc)) or
                    not np.all(rows == 51) or not np.all(cols == 51) or
                    np.any(rt != 128) or np.any(row0 != 0) or np.any(col0 != 0)):
                raise RuntimeError("sdss_quality_psfield_basis_geometry_unsupported")
            if any(np.asarray(value).size != int(rows[0]) * int(cols[0]) for value in vectors):
                raise RuntimeError("sdss_quality_psfield_eigen_length_invalid")
            images = np.stack([np.asarray(value, dtype=np.float64).reshape(int(rows[0]), int(cols[0])) for value in vectors])
            if not np.isfinite(images).all() or any(not np.isfinite(coeff[k, :nr[k], :nc[k]]).all() for k in range(count)):
                raise RuntimeError("sdss_quality_psfield_declared_basis_nonfinite")
            bands[band] = PsfBasis(_frozen(coeff), _frozen(images), _frozen(nr), _frozen(nc))
            descriptions[band] = {"hdu": index, "basisCount": count, "shapeRowsColumns": list(images.shape[1:]),
                                  "rowOrders": nr.tolist(), "columnOrders": nc.tolist(),
                                  "inactiveCoefficientNonfinite": int(sum(np.count_nonzero(~np.isfinite(coeff[k])) -
                                                                         np.count_nonzero(~np.isfinite(coeff[k, :nr[k], :nc[k]])) for k in range(count))),
                                  "signedBasisNegativeSamples": int(np.count_nonzero(images < 0)),
                                  "rrow0": row0.tolist(), "rcol0": col0.tolist()}
        status = np.array(_column(hdus[6], "status", "5J"), copy=True)
        field = _column(hdus[6], "field", "1J")
        psp = _column(hdus[6], "psp_status", "1J")
        if len(hdus[6].data) != 1 or int(field[0]) != identity["field"]:
            raise RuntimeError("sdss_quality_psfield_summary_identity_invalid")
        receipt["psf"] = {"bands": descriptions, "actualBandOrder": list(BANDS), "status": status.tolist(),
                          "pspStatus": psp.tolist(), "kernelMeaning": "SIGNED_RELATIVE_EIGENIMAGE_COMBINATION_NO_FLUX_CALIBRATION",
                          "coordinateConvention": "NATIVE_ZERO_INDEX_COLUMN_ROW_WITH_PHOTO_PIXEL_CENTER_PLUS_0_5",
                          "coefficientAxes": "FITS_WIRE_C_ROW_POWER_COLUMN_POWER_ASTROPY_NO_TRANSPOSE",
                          "coefficientAxesEvidence": "Declared PHOTO row/column polynomial with wire C-order matrix; differs from published PyDL transpose implementation.",
                          "coefficientReferenceUrl": "https://pydl.readthedocs.io/en/latest/_modules/pydl/photoop/image.html",
                          "officialImagesUrl": "https://www.sdss4.org/dr17/imaging/images/",
                          "officialFormatArchiveUrl": "https://www.sdss4.org/wp-content/uploads/2014/10/readAtlasImages-v5_4_11.tar.gz",
                          "referenceScope": "STANDARD_FORMAT_AND_MATHEMATICS_FACTS_ONLY_ARCHIVE_CODE_LICENSE_UNKNOWN_NOT_ADOPTED_OR_COPIED",
                          "perBasisDeclaredOrdersApplied": True,
                          "coordinateScale": .001, "normalization": "NONE", "subpixelShift": "NONE",
                          "quality": "UNKNOWN_SPATIAL_PSF_NOT_QUALITY_ACCEPTANCE"}
        return PsfField(MappingProxyType(bands), receipt)


def read_cached_fpm(path: Path, expected: dict, *, max_uncompressed_bytes: int) -> PixelFlags:
    raw, identity, source = _read_source(path, expected, "fpM", max_uncompressed_bytes)
    with _checked_fits(raw, identity, source, "fpM", max_uncompressed_bytes) as (hdus, receipt):
        h = hdus[0].header
        if (len(hdus) != 12 or (h.get("MASKROWS"), h.get("MASKCOLS")) != FRAME_SHAPE or
                h.get("NPLANE") != 10 or h.get("NFILTER") != 5 or h.get("FILTERS") is not None):
            raise RuntimeError("sdss_quality_fpm_planes_unsupported")
        enum_table = hdus[11]
        if enum_table.header.get("TYPENAME") != "S_MASKTYPE" or len(enum_table.data) != 11:
            raise RuntimeError("sdss_quality_fpm_enum_unsupported")
        definitions = _column(enum_table, "defName", "31A")
        names = _column(enum_table, "attributeName", "31A")
        values = _column(enum_table, "Value", "1J")
        expected_names = PLANE_NAMES + ("S_NMASK_TYPES",)
        if (tuple(str(value).strip() for value in definitions) != ("S_MASKTYPE",) * 11 or
                tuple(str(value).strip() for value in names) != expected_names or tuple(values) != tuple(range(11))):
            raise RuntimeError("sdss_quality_fpm_enum_unsupported")
        flags = np.zeros(FRAME_SHAPE, dtype=np.uint16)
        descriptions = []
        for plane, name in enumerate(PLANE_NAMES):
            table = hdus[plane + 1]
            fields = {key: _column(table, key, "1J") for key in
                      ("refcntr", "nspan", "row0", "col0", "rmin", "rmax", "cmin", "cmax", "npix")}
            columns = _names(table)
            if "s" not in columns or not re.fullmatch(r"1PB(?:\(\d*\))?", str(table.columns[columns["s"]].format)):
                raise RuntimeError("sdss_quality_fpm_span_heap_unsupported")
            span_count = 0
            outside_spans, outside_pixels = 0, 0
            for row, packed in enumerate(table.data[columns["s"]]):
                n = int(fields["nspan"][row])
                if n == 0 or int(fields["row0"][row]) != 0 or int(fields["col0"][row]) != 0:
                    raise RuntimeError("sdss_quality_fpm_object_variant_unsupported")
                if n < 0 or int(fields["npix"][row]) < 0 or len(packed) != n * 6:
                    raise RuntimeError("sdss_quality_fpm_span_length_invalid")
                spans = np.frombuffer(np.asarray(packed, dtype=np.uint8).tobytes(), dtype=">i2").reshape(n, 3)
                yy, left, right = spans.T.astype(np.int64)
                if np.any(left > right):
                    raise RuntimeError("sdss_quality_fpm_span_coordinate_invalid")
                # One object's canonical spans are ordered and disjoint; a
                # repeated/touching run cannot inflate its declared npix.
                if np.any(yy[1:] < yy[:-1]) or np.any((yy[1:] == yy[:-1]) & (left[1:] <= right[:-1] + 1)):
                    raise RuntimeError("sdss_quality_fpm_span_canonical_order_invalid")
                if ((int(yy.min()), int(yy.max()), int(left.min()), int(right.max())) !=
                        tuple(int(fields[key][row]) for key in ("rmin", "rmax", "cmin", "cmax"))):
                    raise RuntimeError("sdss_quality_fpm_span_bbox_invalid")
                if int(np.sum(right - left + 1)) != int(fields["npix"][row]):
                    raise RuntimeError("sdss_quality_fpm_span_npix_invalid")
                # Official read_mask/phMaskSetFromObjmask intersects canonical
                # object spans with MASKROWS/MASKCOLS. The source NOTCHECKED
                # objects can extend beyond a CCD; validate their complete
                # bbox/count/order above, then rasterize only actual pixels.
                inside_rows = (yy >= 0) & (yy < FRAME_SHAPE[0])
                clipped_left = np.maximum(left, 0)
                clipped_right = np.minimum(right, FRAME_SHAPE[1] - 1)
                in_frame_pixels = np.where(inside_rows, np.maximum(clipped_right - clipped_left + 1, 0), 0)
                outside_pixels += int(np.sum(right - left + 1) - np.sum(in_frame_pixels))
                outside_spans += int(np.count_nonzero(~inside_rows | (left < 0) | (right >= FRAME_SHAPE[1])))
                for y, a, b in spans:
                    if 0 <= y < FRAME_SHAPE[0]:
                        a, b = max(int(a), 0), min(int(b), FRAME_SHAPE[1] - 1)
                        if a <= b:
                            flags[int(y), a:b + 1] |= np.uint16(1 << plane)
                span_count += n
            descriptions.append({"name": name, "plane": plane, "hdu": plane + 1, "objects": len(table.data),
                                 "spans": span_count, "unionPixels": int(np.count_nonzero(flags & (1 << plane))),
                                 "spansIntersectingOutsideFrame": outside_spans,
                                 "sourceSpanPixelsOutsideFrame": outside_pixels,
                                 "referenceCountersRetained": sorted(set(fields["refcntr"].tolist())),
                                 "objectRowColOffsets": sorted(set(zip(fields["row0"].tolist(), fields["col0"].tolist())))})
        receipt["pixelFlags"] = {"shapeRowsColumns": list(FRAME_SHAPE), "planes": descriptions,
                                 "arrayBytes": int(flags.nbytes),
                                 "encoding": "DIAGNOSTIC_UINT16_BIT_PER_ACTUAL_ENUM_PLANE",
                                 "frameIntersection": "fpM-native-frame-span-intersection-v1",
                                 "spanMeaning": "BIG_ENDIAN_SIGNED_INT16_ROW_LEFT_RIGHT_INCLUSIVE_NATIVE_PIXEL_COORDINATES",
                                 "objectOffsetsApplied": False, "supportedObjectOffsets": "ZERO_ONLY_NONZERO_REJECTED",
                                 "emptyObjectSupport": "NOT_VERIFIED_NSPAN_ZERO_OBJECT_REJECTED_EMPTY_PLANES_SUPPORTED",
                                 "finiteScienceSampleMeaning": "NOT_SUPPLIED",
                                 "qualitySelectionApplied": False}
        return PixelFlags(_frozen(flags), MappingProxyType({name: index for index, name in enumerate(expected_names)}), receipt)


def check_frame_quality(frame: CorrectedFrame, psfield: PsfField, flags: PixelFlags) -> dict:
    """Correlate admitted inputs; never inspect or qualify scientific samples."""
    if not isinstance(frame, CorrectedFrame) or not isinstance(psfield, PsfField) or not isinstance(flags, PixelFlags):
        raise RuntimeError("sdss_quality_correlation_inputs_invalid")
    try:
        identity = _identity(frame.receipt["identity"])
        ps_identity = _identity({**psfield.receipt["expectedIdentity"], "band": "g"})
        mask_identity = _identity(flags.receipt["expectedIdentity"])
        field_keys = ("run", "rerun", "camcol", "field")
        if (any(identity[key] != ps_identity[key] or identity[key] != mask_identity[key] for key in field_keys) or
                identity["band"] != mask_identity["band"] or identity["band"] not in psfield.bands):
            raise RuntimeError("sdss_quality_correlation_identity_mismatch")
        if frame.data.shape != flags.flags.shape or frame.data.shape != FRAME_SHAPE:
            raise RuntimeError("sdss_quality_correlation_shape_mismatch")
        processing = {"frame": _json_value(frame.header.get("PS_ID")),
                      "psField": psfield.receipt["actualPrimaryIdentity"]["PS_ID"],
                      "fpM": flags.receipt["actualPrimaryIdentity"]["PS_ID"]}
        if any(value is not None and not isinstance(value, str) for value in processing.values()):
            raise RuntimeError("sdss_quality_processing_identity_invalid")
        known = {value.strip() for value in processing.values() if value is not None and value.strip()}
        if len(known) > 1:
            raise RuntimeError("sdss_quality_processing_identity_mismatch")
        hashes = {"frame": frame.receipt["source"]["sha256"], "psField": psfield.receipt["source"]["sha256"],
                  "fpM": flags.receipt["source"]["sha256"]}
        if any(not isinstance(value, str) or not re.fullmatch("[a-f0-9]{64}", value) for value in hashes.values()):
            raise RuntimeError("sdss_quality_correlation_source_binding_invalid")
        missing = [name for name, value in processing.items() if value is None or not value.strip()]
        return {"version": "sdss-frame-quality-input-correlation-v1", "identity": identity,
                "sourceSha256": hashes, "actualPS_ID": processing,
                "processingIdentity": "MATCH" if not missing else "PARTIAL_KNOWN_MATCH_MISSING_UNKNOWN" if known else "UNKNOWN",
                "missingProcessingIdentity": missing, "shapeRowsColumns": list(frame.data.shape),
                "availability": "NOT_ASSESSED", "quality": "UNKNOWN"}
    except (KeyError, TypeError, AttributeError) as error:
        raise RuntimeError("sdss_quality_correlation_receipt_invalid") from error
