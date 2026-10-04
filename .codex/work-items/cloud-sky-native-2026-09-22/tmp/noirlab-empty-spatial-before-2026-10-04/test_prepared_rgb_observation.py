"""Bound prepared-RGB inputs; geometry never substitutes for science validity."""
from dataclasses import replace
import hashlib
import io
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import xml.etree.ElementTree as ET

import numpy as np
from PIL import Image
from pyavm import AVM

import prepared_rgb_observation as owner


def packet(*, empty_notes=False):
    avm = AVM()
    avm.ResourceID = "test-observation"
    avm.Credit = "Fixture credit"
    avm.Rights = "Fixture rights, not a real source license"
    avm.ReferenceURL = "https://example.test/source"
    avm.Spatial.CoordinateFrame = "ICRS"
    avm.Spatial.Equinox = "J2000"
    avm.Spatial.CoordsystemProjection = "TAN"
    avm.Spatial.ReferenceDimension = [8, 6]
    avm.Spatial.ReferencePixel = [4.5, 3.5]
    avm.Spatial.ReferenceValue = [202.5, 47.2]
    avm.Spatial.Scale = [-.001, .001]
    avm.Spatial.Rotation = -91.9
    avm.Spatial.Notes = "Publisher approximate nominal coordinates; keep this exact note."
    avm.Spectral.Bandpass = ["published R", "published G", "published B"]
    avm.Spectral.CentralWavelength = [800, 600, 400]
    avm.Spectral.Notes = "Meaningful spectral note"
    xml = avm.to_xml()
    if empty_notes:
        xml = xml.replace(b"Meaningful spectral note", b"")
    return xml


class PreparedRgbTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.directory = Path(self.temp.name)

    def load(self, xml=None, *, rgb=None, **limits):
        xml = packet() if xml is None else xml
        if rgb is None:
            rgb = np.zeros((3, 4, 3), dtype=np.uint8)
            rgb[-1, 2:] = [220, 130, 90]
        encoded = io.BytesIO()
        Image.fromarray(rgb).save(encoded, format="JPEG", quality=100, subsampling=0, xmp=xml)
        jpg = encoded.getvalue()
        jpeg_path, xmp_path = self.directory / "source.jpg", self.directory / "source.xml"
        jpeg_path.write_bytes(jpg)
        xmp_path.write_bytes(xml)
        source = owner.PreparedRgbSource("test-observation",
            owner.ByteIdentity(len(jpg), hashlib.sha256(jpg).hexdigest()),
            owner.ByteIdentity(len(xml), hashlib.sha256(xml).hexdigest()),
            "https://example.test/source.jpg", "https://example.test/source", "Fixture credit",
            "Fixture rights, not a real source license", "https://example.test/license",
            "https://example.test/policy", "Published encoded RGB; not flux")
        limits = {"max_encoded_bytes": 65536, "max_decoded_pixels": 100, **limits}
        result = owner.load_prepared_rgb_observation(jpeg_path, xmp_path, source, **limits)
        return result, jpeg_path, xmp_path, source

    def test_bound_full_decode_immutable_rgb_and_wcs_preserve_nominal_resize(self):
        observation, path, _, _ = self.load()
        with Image.open(path) as image:
            self.assertEqual(observation.rgb_top_first.tobytes(), image.tobytes())
        self.assertEqual(observation.rgb_top_first.shape, (3, 4, 3))
        with self.assertRaises(ValueError):
            observation.rgb_top_first.setflags(write=True)
        external_view = observation.rgb_top_first
        external_view.shape = (36,)
        self.assertEqual(observation.rgb_top_first.shape, (3, 4, 3), "caller view metadata must not change owner shape")
        self.assertEqual(observation.geometry.crpix, (2.25, 1.75))
        self.assertEqual(observation.geometry.cdelt, (-.002, .002))
        wcs = observation.geometry.new_wcs()
        self.assertEqual(wcs.to_header().tostring(sep="\n", endcard=False, padding=False), observation.geometry.header_cards)
        # An external mutable WCS cannot alter the next caller's geometry.
        wcs.wcs.crval = [10, 20]
        self.assertEqual(tuple(observation.geometry.new_wcs().wcs.crval), (202.5, 47.2))
        self.assertEqual(observation.scientific_availability, "UNKNOWN")
        self.assertEqual(observation.raw_xmp, packet())
        self.assertEqual(observation.geometry.spatial_notes, "Publisher approximate nominal coordinates; keep this exact note.")

    def test_fits_row_direction_four_neighbours_and_valid_black_are_independent(self):
        observation, _, _, _ = self.load()
        x = np.array([0, 2, 3, 1, np.nan, -.1], dtype=np.float64)
        y = np.array([0, 0, 0, 2, 0, 0], dtype=np.float64)
        samples = observation.sample_native(x, y)
        self.assertEqual(samples.geometric_support.tolist(), [True, True, False, False, False, False])
        self.assertTrue(np.array_equal(samples.encoded_rgb[1], observation.rgb_top_first[2, 2]))
        self.assertTrue(np.all(samples.encoded_rgb[0] == 0), "valid encoded black must remain supplied")
        self.assertTrue(np.isnan(samples.encoded_rgb[~samples.geometric_support]).all())
        self.assertEqual(samples.scientific_availability, "UNKNOWN")
        with self.assertRaises(ValueError):
            samples.geometric_support.setflags(write=True)
        # A tempting no-row-flip sampler changes this original measured pixel.
        self.assertFalse(np.array_equal(samples.encoded_rgb[1], observation.rgb_top_first[0, 2]))

    def test_only_known_empty_optional_note_is_normalized_other_notes_preserved(self):
        raw = packet(empty_notes=True)
        observation, _, _, _ = self.load(raw)
        self.assertTrue(observation.removed_empty_spectral_notes)
        self.assertEqual(observation.raw_xmp, raw)
        self.assertIsNone(observation.spectral_notes)
        # Process-global XML prefix registration, including a real PyAVM XML
        # call, must not change parser bytes. The former ET serialization
        # counterfactual actually changes under these same histories.
        with patch.dict(ET._namespace_map, {owner.AVM_NS[1:-1]: "differentPrefix"}):
            repeated, _, _, _ = self.load(raw)
            def former_serialize():
                tree = ET.fromstring(raw)
                for parent in tree.iter():
                    for child in list(parent):
                        if child.tag == owner.AVM_NS + "Spectral.Notes":
                            parent.remove(child)
                return ET.tostring(tree, encoding="utf-8")
            old_before = former_serialize()
            AVM().to_xml()
            old_after = former_serialize()
            after_history, _, _, _ = self.load(raw)
        self.assertNotEqual(old_before, old_after, "the previous serializer must have actual diagnostic power")
        self.assertEqual(repeated.parser_xmp, observation.parser_xmp)
        self.assertEqual(after_history.parser_xmp, observation.parser_xmp)
        self.assertEqual(repeated.raw_xmp, raw)
        first = raw.index(b"<avm:Spectral.Notes>")
        last = raw.index(b"</avm:Spectral.Notes>") + len(b"</avm:Spectral.Notes>")
        self.assertEqual(observation.parser_xmp, raw[:first] + raw[last:])
        populated, _, _, _ = self.load()
        self.assertFalse(populated.removed_empty_spectral_notes)
        self.assertEqual(populated.spectral_notes, "Meaningful spectral note")
        with self.assertRaisesRegex(RuntimeError, "empty_spectral_notes_unsupported"):
            self.load(raw.replace(b'x-default', b'other-language'))
        with self.assertRaisesRegex(RuntimeError, "xml_encoding_unsupported"):
            self.load(raw.decode("utf-8").encode("utf-16"))
        with patch.object(owner, "_parser_xml", lambda value: (value, False)):
            with self.assertRaisesRegex(RuntimeError, "avm_parse_unsupported"):
                self.load(raw)  # Real parser failure demonstrates normalization's effect.

    def test_length_hash_embedded_metadata_and_full_decode_limits_are_required(self):
        _, jpeg, xmp, source = self.load()
        args = {"max_encoded_bytes": 65536, "max_decoded_pixels": 100}
        with self.assertRaisesRegex(RuntimeError, "hash_or_stability"):
            owner.load_prepared_rgb_observation(jpeg, xmp, replace(source, jpeg=replace(source.jpeg, sha256="0"*64)), **args)
        altered = packet().replace(b"nominal coordinates", b"changed coordinates")
        xmp.write_bytes(altered)
        new_source = replace(source, xmp=owner.ByteIdentity(len(altered), hashlib.sha256(altered).hexdigest()))
        with self.assertRaisesRegex(RuntimeError, "embedded_xmp_mismatch"):
            owner.load_prepared_rgb_observation(jpeg, xmp, new_source, **args)
        with self.assertRaisesRegex(RuntimeError, "format_dimensions"):
            self.load(max_decoded_pixels=11)
        with self.assertRaisesRegex(RuntimeError, "byte_identity_invalid"):
            self.load(max_encoded_bytes=1)
        _, jpeg, xmp, source = self.load()
        truncated = jpeg.read_bytes()[:-2]
        jpeg.write_bytes(truncated)
        truncated_source = replace(source, jpeg=owner.ByteIdentity(len(truncated), hashlib.sha256(truncated).hexdigest()))
        with self.assertRaisesRegex(RuntimeError, "jpeg_decode_policy"):
            owner.load_prepared_rgb_observation(jpeg, xmp, truncated_source, **args)

    def test_no_missing_geometry_defaults_or_silent_parity_rewrite(self):
        for field in ("Spatial.CoordinateFrame", "Spatial.Equinox", "Spatial.Rotation", "Spatial.Scale"):
            root = ET.fromstring(packet())
            elements = list(root.iter(owner.AVM_NS + field))
            self.assertEqual(len(elements), 1, "fixture must exercise the intended real wire field")
            if field == "Spatial.Scale":
                list(elements[0][0])[0].text = ".001"
            else:
                for parent in root.iter():
                    if elements[0] in list(parent):
                        parent.remove(elements[0])
            with self.assertRaisesRegex(RuntimeError, "avm_geometry"):
                self.load(ET.tostring(root))
        with self.assertRaisesRegex(RuntimeError, "avm_source_identity"):
            self.load(packet().replace(b"Fixture credit", b"Other attribution"))


if __name__ == "__main__":
    unittest.main()
