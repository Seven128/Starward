"""Coverage regressions without upstream requests or replacement JPEGs."""
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

import publish_allwise_w3 as publisher
import allwise_finite_tan as finite_tan
import numpy as np
import io


class PublicationCoverageTest(unittest.TestCase):
    def test_display_support_retains_color_neighbors_without_reclassifying_black_as_missing(self):
        from PIL import Image
        rgba = np.zeros((256, 256, 4), dtype=np.uint8)
        rgba[:, :, 3] = 255  # Valid black measurements, not missing source data.
        rgba[0, 0] = [1, 0, 0, 255]
        rgba[8, 16] = [0, 1, 0, 0]  # Straight-alpha filter neighbor remains eligible.
        encoded = io.BytesIO()
        Image.fromarray(rgba).save(encoded, format="PNG")
        raw = encoded.getvalue()
        support = finite_tan.encoded_rgb_support(raw, 256)
        colors = np.ones(256 * 256, dtype=np.bool_)
        cursor = 0
        for skip, length in zip(support["emptyRuns"][::2], support["emptyRuns"][1::2]):
            cursor += skip
            colors[cursor:cursor + length] = False
            cursor += length
        self.assertEqual(int(colors.sum()), 2)
        self.assertTrue(colors[0])
        self.assertTrue(colors[8 * 256 + 16])
        self.assertFalse(colors[-1])
        self.assertEqual(support["sourceSha256"], finite_tan.sha256(raw))
        self.assertEqual(rgba[31, 31, 3], 255)

    def test_display_support_migration_preserves_every_published_byte_and_is_idempotent(self):
        import json
        import shutil
        root = Path(__file__).resolve().parents[2] / "workers/miniapp-api/assets/deep-sky"
        with tempfile.TemporaryDirectory(prefix="starward-w3-display-") as temporary:
            output = Path(temporary) / "publication"
            shutil.copytree(root, output)
            current = json.loads((output / "manifest.json").read_text(encoding="utf-8"))
            # Exercise the actual old-v3 compatibility boundary even after adoption.
            for entry in current["entries"]:
                for asset in entry["levels"].values():
                    asset.pop("displaySupport", None)
            (output / "manifest.json").write_text(json.dumps(current, separators=(",", ":")), encoding="utf-8")
            before = (output / "manifest.json").read_bytes()
            all_bytes = {asset["file"]: (output / asset["file"]).read_bytes()
                         for entry in current["entries"] for asset in entry["levels"].values()}
            result = finite_tan.publish_display_support(output)
            self.assertTrue(result["changed"])
            self.assertEqual((output / "publications" / (result["previousPublicationHash"] + ".json")).read_bytes(), before)
            for file, raw in all_bytes.items():
                self.assertEqual((output / file).read_bytes(), raw)
            self.assertFalse(finite_tan.publish_display_support(output)["changed"])

    def test_published_png_alpha_retains_the_checked_source_holes_and_finite_black_pixels(self):
        import json
        from PIL import Image
        root = Path(__file__).resolve().parents[2] / "workers/miniapp-api/assets/deep-sky"
        manifest = json.loads((root / "manifest.json").read_text(encoding="utf-8"))
        entry = next(item for item in manifest["entries"] if item["objectRef"] == "M:42")
        expected = {"OVERVIEW": (22, 1095), "MEDIUM": (648, 4016), "DETAIL": (5095, 4206)}
        for level, (missing, finite_black) in expected.items():
            asset = entry["levels"][level]
            rgba = np.asarray(Image.open(root / asset["file"]).convert("RGBA"))
            self.assertEqual(rgba.shape, (asset["pixels"], asset["pixels"], 4))
            self.assertEqual(int((rgba[:, :, 3] == 0).sum()), missing)
            self.assertEqual(int(((rgba[:, :, 3] == 255) & (rgba[:, :, 0] == 0)).sum()), finite_black)
            self.assertEqual(int((rgba[:, :, 3] > 0).sum()), asset["sourceFiniteMask"]["finitePixels"])
            self.assertIsNone(asset["validFraction"])

    def test_nonfinite_source_samples_are_missing_but_finite_black_remains_data(self):
        source = np.linspace(-30, 1200, 256 * 256, dtype=np.float32).reshape(256, 256)
        source[5, 17] = np.nan
        source[31, 63] = np.inf
        source[19, 8] = -100
        rgba, _ = finite_tan.finite_rgba(source)
        self.assertEqual(int((rgba[:, :, 3] == 0).sum()), 2)
        self.assertEqual(list(rgba[19, 8]), [0, 0, 0, 255], "a dark measurement is not missing")
        self.assertEqual(list(rgba[5, 17]), [0, 0, 0, 0])
        self.assertGreater(rgba[-1, -1, 0], 250, "a bright measurement survives the shared stretch")

    def test_complete_fits_array_and_missing_end_padding_have_different_meanings(self):
        from astropy.io import fits
        encoded = io.BytesIO()
        fits.PrimaryHDU(data=np.arange(512 * 512, dtype=np.float32).reshape(512, 512)).writeto(encoded)
        raw = encoded.getvalue()
        # 512^2 float32 values end before the final 2624 padding bytes.
        data, receipt = finite_tan.checked_fits(raw[:-2624])
        self.assertEqual(data[511, 511], 512 * 512 - 1)
        self.assertTrue(receipt["completeArrayReceived"])
        self.assertEqual(receipt["missingEndPaddingBytes"], 2624)
        with self.assertRaises((RuntimeError, TypeError, ValueError)):
            finite_tan.checked_fits(raw[:-2628])

    def test_display_validation_cannot_publish_a_measurement_fraction(self):
        root = Path(__file__).resolve().parents[2]
        asset = root / "workers/miniapp-api/assets/deep-sky/M-42/M-42-detail.jpg"
        original = asset.read_bytes()
        # A real, visibly saturated W3 JPEG passes the existing display check.
        publisher.checked_image(original, 512)
        with tempfile.TemporaryDirectory(prefix="starward-w3-coverage-") as temporary:
            output = Path(temporary)
            with patch.object(publisher, "cached_image", return_value=(original, {"requestUrl": "fixture"})):
                entry = publisher.build_object({"objectRef": "M:42", "raDeg": 83.822,
                                                "decDeg": -5.391, "majorAxisArcmin": 90},
                                               output / "cache", output / "publication")
            for published in entry["levels"].values():
                self.assertIsNone(published["validFraction"], "JPEG extrema do not measure scientific coverage")
                self.assertEqual(published["coverageState"], "NOT_MEASURED")
                self.assertEqual((output / "publication" / published["file"]).read_bytes(), original)

    def test_existing_published_pixels_cannot_be_replaced_in_place(self):
        root = Path(__file__).resolve().parents[2]
        original = (root / "workers/miniapp-api/assets/deep-sky/M-42/M-42-detail.jpg").read_bytes()
        different = (root / "workers/miniapp-api/assets/deep-sky/M-31/M-31-detail.jpg").read_bytes()
        row = {"objectRef": "M:42", "raDeg": 83.822, "decDeg": -5.391, "majorAxisArcmin": 90}
        with tempfile.TemporaryDirectory(prefix="starward-w3-immutable-") as temporary:
            output = Path(temporary)
            with patch.object(publisher, "cached_image", return_value=(original, {})):
                published = publisher.build_object(row, output / "cache", output)
            with patch.object(publisher, "cached_image", return_value=(different, {})):
                with self.assertRaisesRegex(RuntimeError, "published_image_changed"):
                    publisher.build_object(row, output / "cache", output)
            for asset in published["levels"].values():
                self.assertEqual((output / asset["file"]).read_bytes(), original)


if __name__ == "__main__":
    unittest.main()
