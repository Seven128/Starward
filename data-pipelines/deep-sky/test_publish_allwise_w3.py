"""Coverage regressions without upstream requests or replacement JPEGs."""
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

import publish_allwise_w3 as publisher
import allwise_finite_tan as finite_tan
import numpy as np
import io
from types import SimpleNamespace


class PublicationCoverageTest(unittest.TestCase):
    def fresh_inputs(self, directory):
        from astropy.io import fits
        source = np.zeros((512, 512), dtype=np.float32)
        source[0, :4] = [0, -7, np.nan, np.inf]
        encoded = io.BytesIO()
        fits.PrimaryHDU(data=source).writeto(encoded)
        raw = encoded.getvalue()
        file = directory / "cache" / "actual.fits"
        file.parent.mkdir()
        file.write_bytes(raw)
        canonical = "Norder0/Dir0/Npix0.fits"
        _, receipt = finite_tan.checked_fits(raw)
        record = {"path": canonical, "url": finite_tan.IRSA_HIPS + "/" + canonical,
                  "state": "CHECKED", "bytes": len(raw), "sha256": finite_tan.sha256(raw), "receipt": receipt}
        properties = (b"creator_did=ivo://CDS/P/allWISE/W3\nhips_frame=equatorial\nhips_tile_width=512\n"
                      b"hips_order=8\nhips_pixel_bitpix=-32\nhips_tile_format=jpeg fits\n")
        entry = {"objectRef": "fixture:1", "center": {"raDeg": 30, "decDeg": 10, "frame": "ICRS J2000"},
                 "orientation": "north-up/east-left", "levels": {"DETAIL": {"pixels": 256, "fieldDegrees": 90}}}
        plan = {"objectRef": entry["objectRef"], "center": entry["center"], "source": finite_tan.IRSA_HIPS,
                "tileWidth": 512, "profiles": [{"level": "DETAIL", "pixels": 256, "fieldDegrees": 90, "sourceOrder": 0}]}
        lookup = np.zeros((256, 256, 3), dtype="<u4")
        lookup[0, :4, 1] = np.arange(4)
        arguments = {"source_directory": directory, "source_files": [record], "source_count": 1,
                     "properties": properties, "properties_sha256": finite_tan.sha256(properties),
                     "source_paths": {canonical: "cache/actual.fits"}}
        return plan, entry, lookup, arguments

    def test_fresh_sampling_needs_no_display_receipt_and_preserves_actual_zero_negative_and_nonfinite(self):
        with tempfile.TemporaryDirectory(prefix="starward-w3-science-") as temporary:
            plan, entry, lookup, arguments = self.fresh_inputs(Path(temporary))
            with patch.object(finite_tan.subprocess, "run", return_value=SimpleNamespace(stdout=lookup.tobytes())):
                result = finite_tan.sample_cached_tan(plan, entry, **arguments)["DETAIL"]
            self.assertEqual(list(result.intensity[0, :2]), [0, -7])
            self.assertTrue(result.finite[0, 0])
            self.assertTrue(result.finite[0, 1])
            self.assertFalse(result.finite[0, 2])
            self.assertFalse(result.finite[0, 3])
            self.assertTrue(np.isnan(result.intensity[0, 2]))
            self.assertTrue(np.isposinf(result.intensity[0, 3]))
            self.assertEqual(result.metadata["source"]["tiles"][0]["path"], "Norder0/Dir0/Npix0.fits")
            self.assertEqual(result.metadata["lookupSha256"], finite_tan.sha256(lookup.tobytes()))
            self.assertEqual(result.metadata["wcsHeader"]["CTYPE1"], "RA---TAN")
            self.assertNotIn("stretch", result.metadata)

    def test_fresh_sampling_checks_entire_actual_demand_before_any_scientific_array_is_read(self):
        with tempfile.TemporaryDirectory(prefix="starward-w3-science-") as temporary:
            plan, entry, lookup, arguments = self.fresh_inputs(Path(temporary))
            lookup[-1, -1, 0] = 1  # The actual lookup needs a tile absent from the receipt.
            with patch.object(finite_tan.subprocess, "run", return_value=SimpleNamespace(stdout=lookup.tobytes())), \
                    patch.object(finite_tan, "checked_fits") as reader:
                with self.assertRaisesRegex(RuntimeError, "source_set_incomplete"):
                    finite_tan.sample_cached_tan(plan, entry, **arguments)
                reader.assert_not_called()

    def test_fresh_sampling_rejects_wrong_receipt_bytes_and_canonical_identity(self):
        with tempfile.TemporaryDirectory(prefix="starward-w3-science-") as temporary:
            plan, entry, lookup, arguments = self.fresh_inputs(Path(temporary))
            original = arguments["source_files"][0]
            changes = [({"receipt": {"completeArrayReceived": False}}, "input_unavailable"),
                       ({"sha256": "0" * 64}, "bytes_changed"),
                       ({"bytes": original["bytes"] - 4}, "bytes_changed"),
                       ({"url": finite_tan.IRSA_HIPS + "/Norder0/Dir0/Npix1.fits"}, "input_missing")]
            with patch.object(finite_tan.subprocess, "run", return_value=SimpleNamespace(stdout=lookup.tobytes())), \
                    patch.object(finite_tan, "checked_fits") as reader:
                for change, reason in changes:
                    with self.subTest(change=change), self.assertRaisesRegex(RuntimeError, reason):
                        finite_tan.sample_cached_tan(plan, entry, **{**arguments, "source_files": [{**original, **change}]})
                reader.assert_not_called()

    def test_fresh_sampling_rejects_properties_lookup_and_geometry_mismatch(self):
        with tempfile.TemporaryDirectory(prefix="starward-w3-science-") as temporary:
            plan, entry, lookup, arguments = self.fresh_inputs(Path(temporary))
            with self.assertRaisesRegex(RuntimeError, "properties_changed"):
                finite_tan.sample_cached_tan(plan, entry, **{**arguments, "properties_sha256": "0" * 64})
            with self.assertRaisesRegex(RuntimeError, "registration_invalid"):
                finite_tan.sample_cached_tan(plan, {**entry, "orientation": "south-up"}, **arguments)
            with patch.object(finite_tan.subprocess, "run", return_value=SimpleNamespace(stdout=lookup.tobytes())):
                changed = {**plan, "profiles": [{**plan["profiles"][0], "lookupSha256": "0" * 64}]}
                with self.assertRaisesRegex(RuntimeError, "lookup_changed"):
                    finite_tan.sample_cached_tan(changed, entry, **arguments)

    def test_fresh_sampling_locator_cannot_escape_the_declared_cache_root(self):
        with tempfile.TemporaryDirectory(prefix="starward-w3-science-") as temporary:
            plan, entry, lookup, arguments = self.fresh_inputs(Path(temporary))
            canonical = arguments["source_files"][0]["path"]
            with patch.object(finite_tan.subprocess, "run", return_value=SimpleNamespace(stdout=lookup.tobytes())):
                with self.assertRaisesRegex(RuntimeError, "source_path_invalid"):
                    finite_tan.sample_cached_tan(plan, entry, **{**arguments, "source_paths": {canonical: "../outside.fits"}})

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
            originals = {level: (asset.parent / f"M-42-{level.lower()}.jpg").read_bytes() for level in publisher.LEVELS}
            with patch.object(publisher, "cached_image", side_effect=lambda _, __, level, *args:
                              (originals[level], {"requestUrl": "fixture"})):
                entry = publisher.build_object({"objectRef": "M:42", "raDeg": 83.822,
                                                "decDeg": -5.391, "majorAxisArcmin": 90},
                                               output / "cache", output / "publication")
            for published in entry["levels"].values():
                self.assertIsNone(published["validFraction"], "JPEG extrema do not measure scientific coverage")
                self.assertEqual(published["coverageState"], "NOT_MEASURED")
                level = next(key for key, value in entry["levels"].items() if value is published)
                self.assertEqual((output / "publication" / published["file"]).read_bytes(), originals[level])

    def test_existing_published_pixels_cannot_be_replaced_in_place(self):
        root = Path(__file__).resolve().parents[2]
        original = (root / "workers/miniapp-api/assets/deep-sky/M-42/M-42-detail.jpg").read_bytes()
        different = (root / "workers/miniapp-api/assets/deep-sky/M-31/M-31-detail.jpg").read_bytes()
        row = {"objectRef": "M:42", "raDeg": 83.822, "decDeg": -5.391, "majorAxisArcmin": 90}
        originals = {level: (root / f"workers/miniapp-api/assets/deep-sky/M-42/M-42-{level.lower()}.jpg").read_bytes()
                     for level in publisher.LEVELS}
        with tempfile.TemporaryDirectory(prefix="starward-w3-immutable-") as temporary:
            output = Path(temporary)
            with patch.object(publisher, "cached_image", side_effect=lambda _, __, level, *args: (originals[level], {})):
                published = publisher.build_object(row, output / "cache", output)
            with patch.object(publisher, "cached_image", side_effect=lambda _, __, level, *args:
                              (originals[level] if level != "DETAIL" else different, {})):
                with self.assertRaisesRegex(RuntimeError, "published_image_changed"):
                    publisher.build_object(row, output / "cache", output)
            for level, asset in published["levels"].items():
                self.assertEqual((output / asset["file"]).read_bytes(), originals[level])


if __name__ == "__main__":
    unittest.main()
