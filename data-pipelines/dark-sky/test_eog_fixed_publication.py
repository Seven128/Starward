from __future__ import annotations

import json
import tempfile
import unittest
from unittest import mock
from pathlib import Path

import numpy as np
import rasterio
from rasterio.transform import from_origin

import eog_fixed_method as fixed
import eog_fixed_publication as publication
import publish_eog_viirs as pipeline
from prepare_fixed_eog import prepare_release


def prepare_source_fixture(root: Path, *, aoi: dict[str, float] | None = None) -> Path:
    radiance, coverage = np.zeros((64, 64), dtype="float32"), np.full((64, 64), 12, dtype="uint16")
    radiance[:, 32:] = 50
    radiance[:, 16:32] = .5
    transform = from_origin(113.68, 23.32, .01, .01)
    for name, values in (("radiance", radiance), ("coverage", coverage)):
        with rasterio.open(root / (name + ".tif"), "w", driver="GTiff", width=64, height=64, count=1,
                           dtype=values.dtype, crs="EPSG:4326", transform=transform) as image:
            image.write(values, 1)
    raw = {"schemaVersion": 1, "datasetVersion": "eog-legacy-test-v1",
           "productName": "Synthetic numerical publication fixture", "dataYear": 2025,
           "sourceUrl": pipeline.SOURCE_PAGE, "licenseUrl": pipeline.LICENSE_URL,
           "acquiredAt": "2026-10-01T00:00:00Z", "aoi": aoi or {"west": 113.68, "south": 22.68, "east": 114.32, "north": 23.32},
           "minimumCloudFreeObservations": 3, "gridStridePixels": 16,
           "radiance": {"file": "radiance.tif", "sha256": pipeline.sha256_file(root / "radiance.tif"), "band": 1},
           "cloudFreeCoverage": {"file": "coverage.tif", "sha256": pipeline.sha256_file(root / "coverage.tif"), "band": 1}}
    legacy = root / "legacy.json"
    legacy.write_text(json.dumps(raw), encoding="utf-8")
    return legacy


def prepare_fixture(root: Path, dataset_version: str = "eog-fixed-test-v2", *,
                    aoi: dict[str, float] | None = None) -> tuple[Path, Path]:
    legacy = prepare_source_fixture(root, aoi=aoi)
    output = root / dataset_version
    prepare_release(legacy, dataset_version, [{"grid": "gcj02-mercator-pixel-centres-v1", "tilePixels": 256,
                                              "zoom": 9, "x": 418, "y": 222, "columns": 1, "rows": 1}], output)
    return legacy, output / "manifest.json"


class FixedPublicationTest(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary = tempfile.TemporaryDirectory()
        self.root = Path(self.temporary.name)
        self.legacy, self.current = prepare_fixture(self.root)

    def tearDown(self) -> None:
        self.temporary.cleanup()

    def test_schema2_uses_fixed_statistics_and_real_validated_rasters_while_legacy_stays_relative(self) -> None:
        manifest, selection, thresholds, cells = pipeline.prepare(self.current)
        self.assertEqual(thresholds, (.5, 2., 10., 40.))
        self.assertEqual(cells, [])
        payload = publication.publication_payload(manifest, selection)
        self.assertEqual(payload["schemaVersion"], 2)
        self.assertEqual(payload["rasterInventory"]["assetCount"], 1)
        self.assertNotIn("relativeBandThresholds", payload)
        source = fixed.source_summary(manifest, selection.resolution_degrees)
        zero = publication.sample_point(selection, manifest, source, 113.80, 23.)
        bright = publication.sample_point(selection, manifest, source, 114.20, 23.)
        self.assertEqual(zero["radiance"]["median"], 0)
        self.assertEqual(zero["productBand"], "VERY_LOW")
        self.assertEqual(bright["radiance"]["median"], 50)
        self.assertEqual(bright["productBand"], "VERY_HIGH")
        self.assertEqual(bright["method"], payload["methodVersion"])
        old_manifest, _, old_thresholds, old_cells = pipeline.prepare(self.legacy)
        self.assertIsNone(old_manifest.fixed_raster)
        self.assertNotEqual(old_thresholds, thresholds)
        self.assertTrue(old_cells)

    def test_fixed_spot_keeps_the_full_nine_pixel_denominator_at_publication_edges(self) -> None:
        manifest, selection, _, _ = pipeline.prepare(self.current)
        source = fixed.source_summary(manifest, selection.resolution_degrees)
        corner = publication.sample_point(selection, manifest, source, 113.685, 23.315)
        edge = publication.sample_point(selection, manifest, source, 113.685, 23.)
        self.assertEqual(corner["state"], "UNAVAILABLE")
        self.assertIsNone(corner["radiance"])
        self.assertAlmostEqual(corner["quality"]["publishedAreaFraction"], 4/9, delta=.001)
        self.assertEqual(corner["quality"]["sourceMissingAreaFraction"], 0)
        self.assertEqual(corner["quality"]["requestedPixelCount"], 9)
        self.assertEqual(edge["quality"]["state"], "PARTIAL")
        self.assertAlmostEqual(edge["quality"]["validAreaFraction"], 2/3, delta=.001)
        self.assertEqual(edge["radiance"]["median"], 0)

    def test_release_replay_is_immutable_and_corrupt_numeric_bytes_cannot_publish(self) -> None:
        before = {name: (self.current.parent / name).read_bytes() for name in ("manifest.json", "inventory.json")}
        windows = [{"grid": "gcj02-mercator-pixel-centres-v1", "tilePixels": 256,
                    "zoom": 9, "x": 418, "y": 222, "columns": 1, "rows": 1}]
        with mock.patch("prepare_fixed_eog.prepare_fixed_window", side_effect=AssertionError("validated completed cells must not be warped again")):
            prepare_release(self.legacy, "eog-fixed-test-v2", windows, self.current.parent)
        for name, raw in before.items():
            self.assertEqual((self.current.parent / name).read_bytes(), raw)
        inventory = json.loads(before["inventory.json"])
        numeric = self.current.parent / (inventory["assets"][0]["file"] + ".numbers.tif")
        raw = bytearray(numeric.read_bytes())
        raw[-1] ^= 1
        numeric.write_bytes(raw)
        with self.assertRaisesRegex(pipeline.PipelineError, "nightlight_asset_sha256_mismatch"):
            pipeline.prepare(self.current)

    def test_compositions_copy_identical_fixed_numeric_pixels_without_another_warp(self) -> None:
        output = self.root / "composed"
        prepare_release(self.legacy, "eog-composed-test-v2", [{"grid": "gcj02-mercator-pixel-centres-v1", "tilePixels": 256,
                                                              "zoom": 9, "x": 418, "y": 222, "columns": 2, "rows": 1}], output)
        manifest, selection, _, _ = pipeline.prepare(output / "manifest.json")
        inventory = publication.read_inventory(manifest, selection.resolution_degrees)
        self.assertEqual(len(inventory["assets"]), 3)
        proofs = [json.loads((output / (entry["file"] + ".json")).read_bytes()) for entry in inventory["assets"]]
        composition = next(proof for proof in proofs if proof["grid"]["window"]["columns"] == 2)
        self.assertEqual(composition["derivation"], "NUMERIC_FIXED_CELL_COMPOSITION")
        self.assertEqual(len(composition["cells"]), 2)
        for descriptor in ("image", "numeric"):
            with rasterio.open(output / composition[descriptor]["file"]) as image:
                entire = image.read()
            for proof in proofs:
                if proof is composition:
                    continue
                with rasterio.open(output / proof[descriptor]["file"]) as image:
                    actual = image.read()
                column = (proof["grid"]["window"]["x"] - composition["grid"]["window"]["x"]) * 256
                np.testing.assert_array_equal(entire[:, :, column:column + 256], actual)


if __name__ == "__main__":
    unittest.main()
