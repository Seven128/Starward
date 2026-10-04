"""Real publication/source regressions; no upstream requests or source edits."""
import copy
import io
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

import numpy as np
from PIL import Image

import image_quality as quality
import publish_allwise_w3 as publisher

ROOT = Path(__file__).resolve().parents[2]
ASSETS = ROOT / "workers/miniapp-api/assets/deep-sky"
CATALOG = json.loads((ROOT / "packages/astronomy-core/data/opengc-messier-deep-sky.v1.json").read_text(encoding="utf-8"))["rows"]


def sdss_input(reference="M:51", level="OVERVIEW"):
    manifest = json.loads((ASSETS / ("sdss-" + reference.replace(":", "").lower()) / "manifest.json").read_text(encoding="utf-8"))
    asset = manifest["levels"][level]
    raw = (ASSETS / ("sdss-" + reference.replace(":", "").lower()) / asset["file"]).read_bytes()
    row = next(row for row in CATALOG if row["objectRef"] == reference)
    return raw, manifest, asset, row


class ImageQualityTest(unittest.TestCase):
    def test_rotated_source_boundary_is_visible_to_review_inside_transparent_raster_margins(self):
        rgba = np.zeros((32, 32, 4), dtype=np.uint8)
        yy, xx = np.mgrid[:32, :32]
        supported = (np.abs(xx - 16) + np.abs(yy - 16)) < 10
        rgba[supported] = [80, 80, 80, 255]
        result = quality.support_boundary_diagnostics(rgba)
        self.assertEqual(result['supportedPixels'], int(supported.sum()))
        self.assertGreater(result['internalBoundaryPixels'], 0)
        self.assertAlmostEqual(result['internalBoundaryContributionPercentiles'][2], 80)
        self.assertEqual(result['rasterCropSupportedPixels'], 0)
        self.assertAlmostEqual(result['interiorBands'][0]['encodedLumaPercentiles'][2], 80)
        rgba[supported, :3] = 0
        black = quality.support_boundary_diagnostics(rgba)
        self.assertEqual(black['supportedPixels'], result['supportedPixels'])
        self.assertEqual(black['internalBoundaryPixels'], result['internalBoundaryPixels'])
        self.assertEqual(black['internalBoundaryContributionPercentiles'][2], 0)

    def test_prepared_publication_enters_common_review_with_geometric_alpha_and_unknown_science(self):
        _, entry, _, row = sdss_input()
        prepared = copy.deepcopy(entry)
        prepared['schemaVersion'] = 'prepared-observation-optical-publication-v1'
        rgba = np.zeros((512, 512, 4), dtype=np.uint8)
        rgba[64:448, 128:384] = [0, 0, 0, 255]  # valid black, not absent science
        with tempfile.TemporaryDirectory(prefix='starward-prepared-quality-') as temporary:
            directory = Path(temporary)
            for level in quality.LEVELS:
                encoded = io.BytesIO(); Image.fromarray(rgba).save(encoded, format='PNG'); raw = encoded.getvalue()
                asset = prepared['levels'][level]
                asset.update(file=f'{level}.png', bytes=len(raw), sha256=quality.digest(raw), format='png',
                             displayAlpha='geometric-source-area', alphaPixels={'opaque': 384 * 256, 'partial': 0, 'zero': 512 ** 2 - 384 * 256})
                (directory / asset['file']).write_bytes(raw)
            manifest = directory / 'manifest.json'; manifest.write_text(json.dumps(prepared), encoding='utf-8')
            report = quality.publication_report(manifest, [row])
            self.assertEqual(len(report['reports']), 3)
            for image in report['reports']:
                self.assertEqual(image['coverage']['sampleAvailability'], 'UNKNOWN')
                self.assertEqual(image['coverage']['displayAlpha'], 'DECLARED_GEOMETRIC_ALPHA_COUNTS_CHECKED')
                self.assertGreater(image['regions']['full']['opaqueRgbZeroPixels'], 0)
                self.assertIn('INTERNAL_DISPLAY_SUPPORT_BOUNDARY_REQUIRES_REVIEW', image['review'])
            prepared['levels']['OVERVIEW']['alphaPixels']['opaque'] += 1
            manifest.write_text(json.dumps(prepared), encoding='utf-8')
            with self.assertRaisesRegex(RuntimeError, 'geometric_alpha_count_mismatch'):
                quality.publication_report(manifest, [row])

    def test_original_sdss_bytes_and_dark_pixels_do_not_claim_scientific_coverage_or_wcs(self):
        raw, manifest, asset, row = sdss_input()
        report = quality.inspect_image(raw, manifest, "OVERVIEW", asset, source=manifest["source"],
                                       processing=manifest["processing"], row=row)
        self.assertEqual(report["asset"]["sha256"], "c98129d2ea984cf4106b14b325f355df149f36fe30c2c8ecbcdd0d3733ff81c6")
        self.assertEqual(report["coverage"]["sampleAvailability"], "UNKNOWN")
        self.assertEqual(report["coverage"]["scientificValidity"], "UNKNOWN")
        self.assertIsNone(report["geometry"]["wcsHeader"])
        self.assertIn("PRECISE_WCS_UNVERIFIED", report["geometry"]["registrationEvidence"])
        self.assertGreater(report["regions"]["full"]["rgbZeroPixels"], 0)
        self.assertEqual(report["regions"]["full"]["alphaZeroPixels"], 0)

    def test_same_decodeable_jpeg_cannot_be_borrowed_under_wrong_hash_size_or_identity(self):
        raw, manifest, asset, row = sdss_input()
        for changed in ({**asset, "sha256": "0" * 64}, {**asset, "bytes": len(raw) - 1}, {**asset, "pixels": 256}):
            with self.subTest(changed=changed), self.assertRaises(RuntimeError):
                quality.inspect_image(raw, manifest, "OVERVIEW", changed, source={}, processing={}, row=row)
        wrong = copy.deepcopy(manifest)
        wrong["center"]["decDeg"] += .1
        with self.assertRaisesRegex(RuntimeError, "catalog_identity_mismatch"):
            quality.inspect_image(raw, wrong, "OVERVIEW", asset, source={}, processing={}, row=row)

    def test_full_target_is_overview_requirement_while_fine_crop_is_reported(self):
        raw, manifest, asset, row = sdss_input("M:81")
        changed = {**asset, "fieldDegrees": .1}
        with self.assertRaisesRegex(RuntimeError, "overview_target_cropped"):
            quality.inspect_image(raw, manifest, "OVERVIEW", changed, source={}, processing={}, row=row)
        fine, manifest, asset, row = sdss_input("M:81", "DETAIL")
        report = quality.inspect_image(fine, manifest, "DETAIL", asset, source={}, processing={}, row=row)
        self.assertIn("REFINEMENT_FIELD_CROPS_CATALOG_EXTENT", report["review"])
        self.assertEqual(report["admission"], "STRUCTURE_ACCEPTED_QUALITY_UNVERIFIED")

    def test_source_finite_alpha_preserves_true_black_and_rejects_brightness_inferred_hole(self):
        pixels = np.zeros((16, 16, 4), dtype=np.uint8)
        pixels[:, :, 3] = 255
        finite = np.ones((16, 16), dtype=np.bool_)
        finite[1, 3] = False
        pixels[1, 3, 3] = 0
        def encoded(array):
            output = io.BytesIO()
            Image.fromarray(array).save(output, format="PNG")
            return output.getvalue()
        raw = encoded(pixels)
        entry = {"objectRef": "M:42", "center": {"raDeg": 83, "decDeg": -5, "frame": "ICRS J2000"},
                 "orientation": "north-up/east-left"}
        asset = {"bytes": len(raw), "sha256": quality.digest(raw), "pixels": 16, "imageFormat": "png", "fieldDegrees": .5,
                 "sourceFiniteMask": {"kind": "NONFINITE_HIPS_SAMPLES", "missingPixels": 1, "finitePixels": 255}}
        report = quality.inspect_image(raw, entry, "DETAIL", asset, source={}, processing={}, expected_finite=finite)
        self.assertEqual(report["regions"]["full"]["opaqueRgbZeroPixels"], 255)
        self.assertEqual(report["coverage"]["finiteSamples"], 255)
        # Simulate the exact forbidden mechanism: a finite black source pixel
        # becomes transparent, with new encoded bytes/hash but the same science.
        pixels[10, 10, 3] = 0
        bad = encoded(pixels)
        changed = {**asset, "bytes": len(bad), "sha256": quality.digest(bad)}
        with self.assertRaisesRegex(RuntimeError, "scientific_mask_changed"):
            quality.inspect_image(bad, entry, "DETAIL", changed, source={}, processing={}, expected_finite=finite)

    def test_missing_source_or_late_changed_bytes_cannot_make_a_new_scientific_mask(self):
        with tempfile.TemporaryDirectory(prefix="starward-image-source-") as temporary:
            directory = Path(temporary)
            (directory / "source.fits").write_bytes(b"array-bound-by-source-reader")
            raw = (directory / "source.fits").read_bytes()
            record = {"path": "source.fits", "state": "CHECKED", "bytes": len(raw), "sha256": quality.digest(raw),
                      "receipt": {"completeArrayReceived": True}}
            quality.checked_source_files(directory, [record], {"source.fits"}, 1)
            with self.assertRaisesRegex(RuntimeError, "source_set_incomplete"):
                quality.checked_source_files(directory, [record], {"source.fits", "unavailable.fits"}, 2)
            with self.assertRaisesRegex(RuntimeError, "source_input_unavailable"):
                quality.checked_source_files(directory, [{**record, "state": "UNAVAILABLE"}], {"source.fits"}, 1)
            (directory / "source.fits").write_bytes(b"other-array-bound-by-source-reader")
            with self.assertRaisesRegex(RuntimeError, "source_bytes_changed"):
                quality.checked_source_files(directory, [record], {"source.fits"}, 1)

    def test_real_sdss_batch_has_eighteen_images_and_source_chroma_stripe_coordinates(self):
        manifests = sorted(ASSETS.glob("sdss-*/manifest.json"))
        reports = [quality.publication_report(path, CATALOG) for path in manifests]
        self.assertEqual(sum(len(value["reports"]) for value in reports), 18)
        self.assertTrue(all(image["coverage"]["sampleAvailability"] == "UNKNOWN" for value in reports for image in value["reports"]))
        m63 = next(image for value in reports for image in value["reports"]
                   if image["objectRef"] == "M:63" and image["level"] == "OVERVIEW")
        cells = m63["displayDiagnostics"]["cells"]
        # Known original red stripe x~353..378/y0..130, away from the core.
        stripe = next(cell for cell in cells if cell["bounds"] == [320, 64, 384, 128])
        beside = next(cell for cell in cells if cell["bounds"] == [256, 64, 320, 128])
        self.assertGreater(stripe["redChromaMean"], beside["redChromaMean"] + 3)
        self.assertEqual(m63["admission"], "STRUCTURE_ACCEPTED_QUALITY_UNVERIFIED")

    def test_publisher_checks_actual_dimensions_before_publishing_even_if_cache_adapter_lies(self):
        raw, _, _, _ = sdss_input()
        row = next(row for row in CATALOG if row["objectRef"] == "M:42")
        with tempfile.TemporaryDirectory(prefix="starward-image-publisher-") as temporary:
            directory = Path(temporary)
            # The old build_object trusted a patched/broken cached_image's
            # 512px response for its 256px overview and wrote false metadata.
            with patch.object(publisher, "cached_image", return_value=(raw, {})):
                with self.assertRaisesRegex(RuntimeError, "encoded_geometry_invalid"):
                    publisher.build_object(row, directory / "cache", directory / "publication")
            self.assertEqual(list((directory / "publication").rglob("*.jpg")), [])

    def test_published_m42_wcs_cannot_change_without_geometric_admission(self):
        manifest = json.loads((ASSETS / "manifest.json").read_text(encoding="utf-8"))
        entry = next(item for item in manifest["entries"] if item["objectRef"] == "M:42")
        asset = copy.deepcopy(entry["levels"]["DETAIL"])
        asset["wcsHeader"]["CRPIX1"] += 1
        with self.assertRaisesRegex(RuntimeError, "wcs_geometry_mismatch"):
            quality.inspect_image((ASSETS / asset["file"]).read_bytes(), entry, "DETAIL", asset, source={}, processing={})

    def test_real_tan_header_units_matrix_override_and_distortion_cannot_fake_north_up(self):
        manifest = json.loads((ASSETS / "manifest.json").read_text(encoding="utf-8"))
        entry = next(item for item in manifest["entries"] if item["objectRef"] == "M:42")
        asset = entry["levels"]["DETAIL"]
        raw = (ASSETS / asset["file"]).read_bytes()
        for override in ({"PC1_1": -1}, {"CUNIT1": "rad"}, {"CD1_1": abs(asset["wcsHeader"]["CDELT1"])},
                         {"CROTA2": 3}, {"PV1_0": .1}, {"LONPOLE": 0}, {"WCSAXES": 3}):
            changed = copy.deepcopy(asset)
            changed["wcsHeader"].update(override)
            with self.subTest(override=override), self.assertRaisesRegex(RuntimeError, "wcs_transform_unsupported"):
                quality.inspect_image(raw, entry, "DETAIL", changed, source={}, processing={})

    def test_direct_hips2fits_jpeg_response_receipt_cannot_contradict_actual_bytes(self):
        manifest = json.loads((ASSETS / "manifest.json").read_text(encoding="utf-8"))
        entry = next(item for item in manifest["entries"] if item["objectRef"] == "M:82")
        asset = entry["levels"]["DETAIL"]
        raw = (ASSETS / asset["file"]).read_bytes()
        for override in ({"responseSha256": "0" * 64}, {"responseBytes": len(raw) + 1}):
            changed = copy.deepcopy(asset)
            changed["source"].update(override)
            with self.subTest(override=override), self.assertRaisesRegex(RuntimeError, "response_receipt_mismatch"):
                quality.inspect_image(raw, entry, "DETAIL", changed, source={}, processing={})

    def test_complete_pixel_decode_cannot_accept_missing_png_iend_or_jpeg_eoi(self):
        manifest = json.loads((ASSETS / "manifest.json").read_text(encoding="utf-8"))
        entry = next(item for item in manifest["entries"] if item["objectRef"] == "M:42")
        asset = entry["levels"]["OVERVIEW"]
        raw = (ASSETS / asset["file"]).read_bytes()
        bad = raw[:-12]
        changed = {**asset, "bytes": len(bad), "sha256": quality.digest(bad)}
        with self.assertRaisesRegex(RuntimeError, "encoded_container_invalid"):
            quality.inspect_image(bad, entry, "OVERVIEW", changed, source={}, processing={})
        # A changed chunk CRC also fails without guessing from decoded colour.
        bad = bytearray(raw)
        bad[29] ^= 1
        with self.assertRaisesRegex(RuntimeError, "encoded_container_invalid"):
            quality.checked_image(bytes(bad), asset["pixels"], "png")
        jpeg, _, jpeg_asset, _ = sdss_input()
        with self.assertRaisesRegex(RuntimeError, "encoded_container_invalid"):
            quality.checked_image(jpeg[:-2], jpeg_asset["pixels"], "jpeg")


if __name__ == "__main__":
    unittest.main()
