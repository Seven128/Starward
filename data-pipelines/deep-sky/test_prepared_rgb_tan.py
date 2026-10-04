"""Real admitted fixture RGB and bounded producer/consumer counterexamples."""
from dataclasses import replace
import hashlib
import io
import math
from pathlib import Path
import tempfile
import types
import unittest
from unittest.mock import patch

import numpy as np
from PIL import Image
from pyavm import AVM

from prepared_rgb_observation import ByteIdentity, PreparedRgbSource, load_prepared_rgb_observation
import prepared_rgb_tan as owner


class PreparedTanTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.directory = Path(self.temp.name)

    def observation(self, *, black=False):
        avm = AVM()
        avm.ResourceID = "fixture-tan-rgb"
        avm.Credit = "Fixture credit"
        avm.Rights = "Fixture rights"
        avm.ReferenceURL = "https://example.test/fixture"
        avm.Spatial.CoordinateFrame = "ICRS"
        avm.Spatial.Equinox = "J2000"
        avm.Spatial.CoordsystemProjection = "TAN"
        avm.Spatial.ReferenceDimension = [8, 8]
        avm.Spatial.ReferencePixel = [4.5, 4.5]
        avm.Spatial.ReferenceValue = [202.5, 47.2]
        avm.Spatial.Scale = [-.01, .01]
        avm.Spatial.Rotation = 0
        avm.Spatial.Notes = "Approximate fixture WCS, no physical registration claim."
        avm.Spectral.Bandpass = ["R", "G", "B"]
        avm.Spectral.CentralWavelength = [800, 600, 400]
        xml = avm.to_xml()
        rgb = np.zeros((8, 8, 3), dtype=np.uint8)
        if not black:
            rgb[1:3, 2:6] = [180, 90, 30]
            rgb[5:7, 2:6] = [20, 130, 220]
        stream = io.BytesIO()
        Image.fromarray(rgb).save(stream, format="JPEG", quality=100, subsampling=0, xmp=xml)
        jpeg = stream.getvalue()
        jpg, packet = self.directory / "source.jpg", self.directory / "source.xml"
        jpg.write_bytes(jpeg); packet.write_bytes(xml)
        source = PreparedRgbSource("fixture-tan-rgb", ByteIdentity(len(jpeg), hashlib.sha256(jpeg).hexdigest()),
            ByteIdentity(len(xml), hashlib.sha256(xml).hexdigest()), "https://example.test/source.jpg",
            "https://example.test/fixture", "Fixture credit", "Fixture rights", "https://example.test/license",
            "https://example.test/policy", "Prepared encoded fixture RGB, not calibrated flux")
        return load_prepared_rgb_observation(jpg, packet, source, max_encoded_bytes=65536, max_decoded_pixels=64)

    def build(self, observation, *, module=owner, **overrides):
        args = {"object_ref": "fixture-target", "center": {"frame": "ICRS J2000", "raDeg": 202.5, "decDeg": 47.2},
                "pixels": 8, "field_degrees": math.degrees(2 * math.atan(math.radians(.01) * 8 / 2)), "chunk_rows": 2}
        args.update(overrides)
        return module.build_prepared_rgb_tan_master(observation, **args)

    @staticmethod
    def mutant(before, after):
        text = Path(owner.__file__).read_text(encoding="utf-8")
        if text.count(before) != 1:
            raise AssertionError("mutant source anchor must bind exactly once")
        module = types.ModuleType("prepared_tan_controlled_mutant")
        # Dataclass annotation resolution requires its real module registration.
        import sys
        with patch.dict(sys.modules, {module.__name__: module}):
            exec(compile(text.replace(before, after), owner.__file__, "exec"), module.__dict__)
        return module

    def test_whole_master_row_orientation_common_support_and_valid_black(self):
        observation = self.observation()
        master = self.build(observation)
        alpha = master.rgba_top_first[:, :, 3]
        expected = np.zeros((8, 8), dtype=np.uint8); expected[1:7, 1:7] = 255
        self.assertTrue(np.array_equal(alpha, expected), "every quadrature offset requires its full native stencil")
        self.assertEqual(master.geometric_support_pixels, 36)
        self.assertGreater(master.rgba_top_first[2, 3, 0], master.rgba_top_first[5, 3, 0])
        self.assertLess(master.rgba_top_first[2, 3, 2], master.rgba_top_first[5, 3, 2])
        black = self.build(self.observation(black=True))
        self.assertEqual(black.supported_black_pixels, 36)
        self.assertTrue(np.all(black.rgba_top_first[:, :, :3] == 0))
        self.assertTrue(np.array_equal(black.rgba_top_first[:, :, 3], expected), "black is still geometrically supplied")
        self.assertEqual(black.scientific_availability, "UNKNOWN")
        self.assertEqual(black.metadata()["registration"], "UNVERIFIED_APPROXIMATE_PUBLISHER_AVM")

    def test_row_flip_and_any_offset_mutants_are_detected_by_real_admitted_pixels(self):
        observation = self.observation()
        current = self.build(observation).rgba_top_first
        wrong_row = self.mutant("pixels - 1 - yy - dy", "yy + dy")
        self.assertFalse(np.array_equal(current, self.build(observation, module=wrong_row).rgba_top_first))
        union = self.mutant("support &= samples.geometric_support", "support |= samples.geometric_support")
        self.assertFalse(np.array_equal(current[:, :, 3], self.build(observation, module=union).rgba_top_first[:, :, 3]))

    def test_chunks_and_input_output_metadata_are_independent_and_immutable(self):
        observation = self.observation()
        center = {"frame": "ICRS J2000", "raDeg": 202.5, "decDeg": 47.2}
        a = self.build(observation, chunk_rows=1, center=center)
        b = self.build(observation, chunk_rows=8)
        self.assertEqual(a.rgba_bytes, b.rgba_bytes)
        center["raDeg"] = 0
        self.assertEqual(a.center["raDeg"], 202.5)
        exposed = a.rgba_top_first
        with self.assertRaises(ValueError):
            exposed.setflags(write=True)
        exposed.shape = (256,)
        self.assertEqual(a.rgba_top_first.shape, (8, 8, 4))
        metadata = a.metadata(); metadata["sourceGeometry"]["reference_value"] = [0, 0]
        metadata["sampling"]["offsetsDyDx"][0][0] = 100
        self.assertEqual(a.metadata()["sourceGeometry"]["reference_value"], (202.5, 47.2))
        self.assertEqual(a.metadata()["sampling"]["offsetsDyDx"][0], [-.25, -.25])

    def test_three_products_are_same_master_premultiplied_boxes_without_new_source_queries(self):
        observation = self.observation()
        master = self.build(observation)
        with patch.object(type(observation), "sample_native", side_effect=AssertionError("unexpected level-specific reprojection")):
            products = owner.prepared_rgb_tan_products(master, output_pixels=2)
        self.assertEqual([product.level for product in products], ["OVERVIEW", "MEDIUM", "DETAIL"])
        self.assertEqual([product.box_factor for product in products], [4, 2, 1])
        for product in products:
            x0, y0, x1, y1 = product.bounds_xy_exclusive
            crop = master.rgba_top_first[y0:y1, x0:x1]
            expected = np.zeros((2, 2, 4), dtype=np.uint8)
            for y in range(2):
                for x in range(2):
                    block = crop[y*product.box_factor:(y+1)*product.box_factor, x*product.box_factor:(x+1)*product.box_factor]
                    alpha = block[:, :, 3].astype(np.float64)
                    total = alpha.sum()
                    if total:
                        expected[y, x, :3] = np.rint((block[:, :, :3] * alpha[:, :, None]).sum(axis=(0, 1)) / total)
                    expected[y, x, 3] = np.rint(total / product.box_factor ** 2)
            self.assertTrue(np.array_equal(expected, product.rgba_top_first))
            with Image.open(io.BytesIO(product.png_bytes)) as image:
                self.assertEqual(image.mode, "RGBA"); self.assertEqual(image.tobytes(), product.rgba_bytes)
            self.assertEqual(product.metadata()["scientificAvailability"], "UNKNOWN")
            self.assertEqual(product.metadata()["alphaMeaning"], owner.ALPHA_MEANING)
            with self.assertRaises(ValueError):
                product.rgba_top_first.setflags(write=True)

    def test_invalid_target_observation_and_crop_requests_fail_before_unbounded_work(self):
        observation = self.observation()
        for overrides in [{"chunk_rows": 0}, {"chunk_rows": True}, {"chunk_rows": 257}, {"pixels": 4097},
                          {"pixels": True}, {"field_degrees": 5}, {"object_ref": ""},
                          {"center": {"frame": "foreign", "raDeg": 202.5, "decDeg": 47.2}}]:
            with self.assertRaises(RuntimeError):
                self.build(observation, **overrides)
        with self.assertRaisesRegex(RuntimeError, "observation_invalid"):
            self.build(replace(observation, rgb_bytes=observation.rgb_bytes[:-1]))
        with self.assertRaisesRegex(RuntimeError, "geometric_support_unavailable"):
            self.build(observation, center={"frame": "ICRS J2000", "raDeg": 10, "decDeg": -30})
        master = self.build(observation)
        for output_pixels in [0, True, 3, 512]:
            with self.assertRaisesRegex(RuntimeError, "integer_crops"):
                owner.prepared_rgb_tan_products(master, output_pixels=output_pixels)
        for invalid in [replace(master, pixels=8.0), replace(master, field_degrees=5),
                        replace(master, scientific_validity="AVAILABLE")]:
            with self.assertRaises(RuntimeError):
                owner.prepared_rgb_tan_products(invalid, output_pixels=2)

    def test_cached_master_rejects_nonbinary_geometry_hidden_colour_and_inconsistent_counts(self):
        master = self.build(self.observation(black=True))
        changed_alpha = master.rgba_top_first.copy(); changed_alpha[2, 2, 3] = 128
        hidden_colour = master.rgba_top_first.copy(); hidden_colour[0, 0, :3] = [220, 100, 20]
        for invalid in [replace(master, rgba_bytes=changed_alpha.tobytes()),
                        replace(master, rgba_bytes=hidden_colour.tobytes()),
                        replace(master, geometric_support_pixels=35), replace(master, supported_black_pixels=35)]:
            with self.assertRaisesRegex(RuntimeError, "master_geometry"):
                owner.prepared_rgb_tan_products(invalid, output_pixels=2)
        products = owner.prepared_rgb_tan_products(master, output_pixels=2)
        self.assertTrue(np.all(products[-1].rgba_top_first[:, :, 3] == 255))
        self.assertTrue(np.all(products[-1].rgba_top_first[:, :, :3] == 0), "valid black is supplied, not filtered")


if __name__ == "__main__":
    unittest.main()
