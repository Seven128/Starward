"""Admit a bound prepared JPEG/AVM observation, without scientific-mask claims.

This offline adapter preserves published encoded RGB and nominal AVM geometry.
It neither creates a flux image nor corrects astrometry, colour, PSF or coverage.
Only the already exercised AVM ICRS/J2000 TAN scale/rotation form is supported.
"""
from __future__ import annotations

from dataclasses import dataclass
import hashlib
import io
import math
from pathlib import Path
import re
from typing import Literal
import xml.etree.ElementTree as ET
from xml.parsers import expat

import astropy
from astropy.wcs import WCS
import numpy as np
from PIL import Image, ImageFile, __version__ as pillow_version
from pyavm import AVM, __version__ as pyavm_version

from sdss_source_stencil import bilinear_source_samples, source_pixel_stencil

VERSION = "prepared-rgb-observation-avm-v1"
AVM_NS = "{http://www.communicatingastronomy.org/avm/1.0/}"
RDF_NS = "{http://www.w3.org/1999/02/22-rdf-syntax-ns#}"
XML_LANG = "{http://www.w3.org/XML/1998/namespace}lang"


@dataclass(frozen=True)
class ByteIdentity:
    bytes: int
    sha256: str


@dataclass(frozen=True)
class PreparedRgbSource:
    """Caller-owned source/rights facts; admission is not a rights approval."""
    resource_id: str
    jpeg: ByteIdentity
    xmp: ByteIdentity
    source_url: str
    metadata_reference_url: str
    credit: str
    rights_label: str
    license_url: str
    policy_url: str
    colour_meaning: str


@dataclass(frozen=True)
class NominalAvmGeometry:
    reference_dimension: tuple[float, float]
    reference_pixel: tuple[float, float]
    reference_value: tuple[float, float]
    scale: tuple[float, float]
    rotation: float
    decoded_shape_width_height: tuple[int, int]
    resize_common_x_factor: float
    resize_y_factor: float
    crpix: tuple[float, float]
    cdelt: tuple[float, float]
    header_cards: str
    spatial_notes: str | None
    spatial_quality: str | None
    accuracy: Literal["UNVERIFIED_APPROXIMATE_PUBLISHER_AVM"] = "UNVERIFIED_APPROXIMATE_PUBLISHER_AVM"

    def new_wcs(self) -> WCS:
        """Return a fresh mutable WCS; immutable full-precision facts own it.

        Reconstruct numeric parameters instead of round-tripping FITS card
        text, whose decimal serialization can lose low-order coordinate bits.
        The PyAVM common-x CRPIX/scale convention is retained, not corrected.
        """
        wcs = WCS(naxis=2)
        wcs.wcs.ctype = ["RA---TAN", "DEC--TAN"]
        wcs.wcs.radesys = "ICRS"
        wcs.wcs.equinox = 2000.0
        wcs.wcs.crval = self.reference_value
        wcs.wcs.crpix = self.crpix
        wcs.wcs.cdelt = self.cdelt
        wcs.wcs.crota = [self.rotation, self.rotation]
        return wcs


@dataclass(frozen=True)
class PreparedRgbSamples:
    encoded_rgb: np.ndarray
    geometric_support: np.ndarray
    scientific_availability: Literal["UNKNOWN"] = "UNKNOWN"


@dataclass(frozen=True)
class PreparedRgbObservation:
    source: PreparedRgbSource
    # Immutable bytes also protect against a caller changing ndarray shape or
    # dtype metadata. Each public view is reconstructed from the frozen shape.
    rgb_bytes: bytes
    raw_xmp: bytes
    parser_xmp: bytes
    removed_empty_spectral_notes: bool
    geometry: NominalAvmGeometry
    spectral_bandpass: tuple[str, ...]
    spectral_central_wavelength: tuple[float, ...]
    spectral_notes: str | None
    library_versions: tuple[tuple[str, str], ...]
    removed_empty_spatial_notes: bool = False
    scientific_availability: Literal["UNKNOWN"] = "UNKNOWN"
    version: str = VERSION

    @property
    def rgb_top_first(self) -> np.ndarray:
        width, height = self.geometry.decoded_shape_width_height
        return np.frombuffer(self.rgb_bytes, dtype=np.uint8).reshape(height, width, 3)

    def sample_native(self, x: np.ndarray, y: np.ndarray) -> PreparedRgbSamples:
        """Sample zero-origin FITS columns/rows, requiring all four neighbours.

        Results are interpolated encoded colour values, not calibrated flux.
        NaN means this *geometric stencil* was unavailable, not absent science.
        The shared sampler gathers uint8 neighbours before converting values,
        so a small/chunked query does not make a full floating RGB copy.
        """
        rgb = self.rgb_top_first
        stencil = source_pixel_stencil(rgb.shape[:2], x, y)
        values = np.full((*x.shape, 3), np.nan, dtype=np.float32)
        for channel in range(3):
            # AVM/FITS rows are bottom first; JPEG's decoded array is top first.
            source = rgb[::-1, :, channel]
            sample, geometric, finite = bilinear_source_samples(source, x, y)
            if not np.array_equal(geometric, stencil.geometry) or not np.array_equal(finite, geometric):
                raise RuntimeError("prepared_rgb_encoded_sampling_inconsistent")
            values[..., channel] = sample
        return PreparedRgbSamples(_immutable_array(values), _immutable_array(stencil.geometry))


def _immutable_array(array: np.ndarray) -> np.ndarray:
    return np.frombuffer(array.tobytes(order="C"), dtype=array.dtype).reshape(array.shape)


def _identity_valid(identity: ByteIdentity, limit: int) -> bool:
    return (isinstance(identity, ByteIdentity) and isinstance(identity.bytes, int) and
            not isinstance(identity.bytes, bool) and 0 < identity.bytes <= limit and
            isinstance(identity.sha256, str) and re.fullmatch(r"[0-9a-f]{64}", identity.sha256) is not None)


def _read_bound(path: Path, identity: ByteIdentity, limit: int) -> bytes:
    if not _identity_valid(identity, limit):
        raise RuntimeError("prepared_rgb_byte_identity_invalid")
    before = path.stat()
    if before.st_size != identity.bytes:
        raise RuntimeError("prepared_rgb_source_length_mismatch")
    with path.open("rb") as handle:
        content = handle.read(identity.bytes + 1)
    after = path.stat()
    if ((before.st_size, before.st_mtime_ns) != (after.st_size, after.st_mtime_ns) or
            len(content) != identity.bytes or hashlib.sha256(content).hexdigest() != identity.sha256):
        raise RuntimeError("prepared_rgb_source_hash_or_stability_mismatch")
    return content


def _parser_xml(raw: bytes, *, note_name: Literal["Spectral.Notes", "Spatial.Notes"] = "Spectral.Notes") -> tuple[bytes, bool]:
    if note_name not in ("Spectral.Notes", "Spatial.Notes"):
        raise RuntimeError("prepared_rgb_optional_note_unsupported")
    note_kind = "spectral" if note_name == "Spectral.Notes" else "spatial"
    try:
        raw.decode("utf-8")
    except UnicodeDecodeError as error:
        raise RuntimeError("prepared_rgb_xml_encoding_unsupported") from error
    if b"\x00" in raw:
        raise RuntimeError("prepared_rgb_xml_encoding_unsupported")
    if re.search(br"<!\s*(?:DOCTYPE|ENTITY)\b", raw, re.IGNORECASE):
        raise RuntimeError("prepared_rgb_xml_declaration_unsupported")
    # ElementTree serialization depends on its process-global namespace
    # registry (PyAVM.to_xml changes it). Use the standard parser's byte spans
    # to remove only this verified optional node, preserving all other bytes.
    parser = expat.ParserCreate(namespace_separator="}")
    starts, spans = [], []
    expanded_note = AVM_NS[1:] + note_name

    def start(name, _attributes):
        if name == expanded_note:
            starts.append(parser.CurrentByteIndex)

    def end(name):
        if name == expanded_note:
            index = parser.CurrentByteIndex
            if not raw[index:index + 2] == b"</":
                raise RuntimeError(f"prepared_rgb_empty_{note_kind}_notes_unsupported")
            stop = raw.find(b">", index)
            if stop < 0 or not starts:
                raise RuntimeError("prepared_rgb_xml_invalid")
            spans.append((starts.pop(), stop + 1))

    def declaration(_version, encoding, _standalone):
        if encoding is not None and encoding.lower() not in ("utf-8", "utf8"):
            raise RuntimeError("prepared_rgb_xml_encoding_unsupported")

    parser.StartElementHandler, parser.EndElementHandler = start, end
    parser.XmlDeclHandler = declaration
    try:
        parser.Parse(raw, True)
    except expat.ExpatError as error:
        raise RuntimeError("prepared_rgb_xml_invalid") from error
    try:
        root = ET.fromstring(raw)
    except ET.ParseError as error:
        raise RuntimeError("prepared_rgb_xml_invalid") from error
    found = list(root.iter(AVM_NS + note_name))
    if len(found) > 1:
        raise RuntimeError(f"prepared_rgb_{note_kind}_notes_ambiguous")
    if not found:
        return raw, False
    note = found[0]
    if any((element.text or "").strip() for element in note.iter()):
        return raw, False  # Preserve populated notes; the mature parser decides support.
    # Normalize exactly the observed empty optional rdf:Alt/x-default form.
    children = list(note)
    if (note.attrib or len(children) != 1 or children[0].tag != RDF_NS + "Alt" or
            children[0].attrib or len(list(children[0])) != 1):
        raise RuntimeError(f"prepared_rgb_empty_{note_kind}_notes_unsupported")
    li = list(children[0])[0]
    if (li.tag != RDF_NS + "li" or li.attrib != {XML_LANG: "x-default"} or list(li) or
            any((element.tail or "").strip() for element in note.iter())):
        raise RuntimeError(f"prepared_rgb_empty_{note_kind}_notes_unsupported")
    if len(spans) != 1:
        raise RuntimeError("prepared_rgb_xml_invalid")
    first, last = spans[0]
    return raw[:first] + raw[last:], True


def _pair(value, *, positive: bool = False) -> tuple[float, float]:
    if (not isinstance(value, (list, tuple)) or len(value) != 2 or
            any(isinstance(v, bool) or not isinstance(v, (int, float)) or not math.isfinite(v) or
                (positive and v <= 0) for v in value)):
        raise RuntimeError("prepared_rgb_avm_geometry_invalid")
    return float(value[0]), float(value[1])


def load_prepared_rgb_observation(jpeg_path: Path, xmp_path: Path, source: PreparedRgbSource, *,
                                  max_encoded_bytes: int, max_decoded_pixels: int,
                                  max_xmp_bytes: int = 256 * 1024) -> PreparedRgbObservation:
    """Read only bound local inputs. Caller supplies admission resource limits.

    Accepted source identity is exact JPEG + embedded raw XMP + explicit source
    and credit facts. No path-based publication, remote lookup or image repair.
    """
    if (not isinstance(source, PreparedRgbSource) or
            any(not isinstance(value, int) or isinstance(value, bool) or value <= 0
                for value in (max_encoded_bytes, max_decoded_pixels, max_xmp_bytes)) or
            any(not isinstance(value, str) or not value.strip() for value in
                (source.resource_id, source.source_url, source.metadata_reference_url, source.credit,
                 source.rights_label, source.license_url, source.policy_url, source.colour_meaning))):
        raise RuntimeError("prepared_rgb_admission_input_invalid")
    if pyavm_version != "0.9.9":
        raise RuntimeError("prepared_rgb_pyavm_version_unsupported")
    jpeg = _read_bound(Path(jpeg_path), source.jpeg, max_encoded_bytes)
    raw = _read_bound(Path(xmp_path), source.xmp, max_xmp_bytes)
    if not jpeg.startswith(b"\xff\xd8") or not jpeg.endswith(b"\xff\xd9") or ImageFile.LOAD_TRUNCATED_IMAGES:
        raise RuntimeError("prepared_rgb_jpeg_decode_policy_invalid")
    try:
        with Image.open(io.BytesIO(jpeg)) as image:
            if (image.format != "JPEG" or image.mode != "RGB" or image.width * image.height > max_decoded_pixels or
                    image.getexif().get(274, 1) != 1):
                raise RuntimeError("prepared_rgb_jpeg_format_dimensions_or_orientation_invalid")
            if image.info.get("xmp") != raw:
                raise RuntimeError("prepared_rgb_embedded_xmp_mismatch")
            image.load()  # Full decode, with truncated-image acceptance disabled.
            size = image.size
            rgb = image.tobytes()
    except (OSError, ValueError) as error:
        raise RuntimeError("prepared_rgb_jpeg_decode_failed") from error
    parser_xml, removed = _parser_xml(raw)
    parser_xml, removed_spatial = _parser_xml(parser_xml, note_name="Spatial.Notes")
    try:
        avm = AVM.from_xml(parser_xml)
    except (TypeError, ValueError, KeyError, AttributeError) as error:
        raise RuntimeError("prepared_rgb_avm_parse_unsupported") from error
    if (avm.ResourceID != source.resource_id or avm.Credit != source.credit or
            avm.Rights != source.rights_label or avm.ReferenceURL != source.metadata_reference_url):
        raise RuntimeError("prepared_rgb_avm_source_identity_mismatch")
    spatial = avm.Spatial
    if (spatial.CoordinateFrame != "ICRS" or spatial.Equinox != "J2000" or
            spatial.CoordsystemProjection != "TAN" or spatial.CDMatrix is not None or spatial.FITSheader is not None):
        raise RuntimeError("prepared_rgb_avm_geometry_unsupported")
    dimensions = _pair(spatial.ReferenceDimension, positive=True)
    reference_pixel = _pair(spatial.ReferencePixel)
    reference_value = _pair(spatial.ReferenceValue)
    scale = _pair(spatial.Scale)
    rotation = spatial.Rotation
    # Avoid PyAVM's implicit sign rewrite silently changing unsupported input.
    if (not 0 <= reference_value[0] < 360 or not -90 <= reference_value[1] <= 90 or
            not scale[0] < 0 < scale[1] or isinstance(rotation, bool) or
            not isinstance(rotation, (int, float)) or not math.isfinite(rotation)):
        raise RuntimeError("prepared_rgb_avm_geometry_invalid")
    try:
        wcs = avm.to_wcs(use_full_header=False, target_shape=size)
        # Force WCS validation now, retaining the mature library's conventions.
        wcs.all_pix2world([0.0], [0.0], 0)
    except (ValueError, TypeError) as error:
        raise RuntimeError("prepared_rgb_avm_resize_unsupported") from error
    geometry = NominalAvmGeometry(dimensions, reference_pixel, reference_value, scale, float(rotation), size,
        size[0] / dimensions[0], size[1] / dimensions[1], tuple(map(float, wcs.wcs.crpix)),
        tuple(map(float, wcs.wcs.cdelt)), wcs.to_header().tostring(sep="\n", endcard=False, padding=False),
        spatial.Notes, spatial.Quality)
    bands = tuple(avm.Spectral.Bandpass or ())
    wavelengths = tuple(avm.Spectral.CentralWavelength or ())
    if (any(not isinstance(value, str) for value in bands) or any(not math.isfinite(value) for value in wavelengths)):
        raise RuntimeError("prepared_rgb_spectral_metadata_invalid")
    return PreparedRgbObservation(source, rgb, raw, parser_xml, removed, geometry, bands, wavelengths,
        avm.Spectral.Notes, (("PyAVM", pyavm_version), ("Astropy", astropy.__version__),
                             ("Pillow", pillow_version), ("NumPy", np.__version__)),
        removed_empty_spatial_notes=removed_spatial)
