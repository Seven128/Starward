from __future__ import annotations

import hashlib
import json
import tempfile
import unittest
from pathlib import Path

import numpy as np
import rasterio
from rasterio.transform import from_origin

import publish_eog_viirs as pipeline


class EogViirsPublisherTest(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary_directory = tempfile.TemporaryDirectory()
        self.root = Path(self.temporary_directory.name)
        self.radiance_path = self.root / "radiance.tif"
        self.coverage_path = self.root / "coverage.tif"
        self.radiance = np.arange(256, dtype="float32").reshape(16, 16)
        self.coverage = np.full((16, 16), 12, dtype="uint16")
        self.transform = from_origin(112, 25, 0.25, 0.25)
        self._write_raster(self.radiance_path, self.radiance, "float32")
        self._write_raster(self.coverage_path, self.coverage, "uint16")
        self.manifest_path = self.root / "manifest.json"
        self._write_manifest()

    def tearDown(self) -> None:
        self.temporary_directory.cleanup()

    def _write_raster(self, path: Path, values: np.ndarray, dtype: str) -> None:
        with rasterio.open(
            path,
            "w",
            driver="GTiff",
            width=values.shape[1],
            height=values.shape[0],
            count=1,
            dtype=dtype,
            crs="EPSG:4326",
            transform=self.transform,
            nodata=None,
        ) as dataset:
            dataset.write(values, 1)

    @staticmethod
    def _sha256(path: Path) -> str:
        return hashlib.sha256(path.read_bytes()).hexdigest()

    def _write_manifest(self, **updates: object) -> None:
        manifest = {
            "schemaVersion": 1,
            "datasetVersion": "eog-test-current",
            "productName": "Synthetic EOG-compatible annual raster",
            "dataYear": 2024,
            "sourceUrl": pipeline.SOURCE_PAGE,
            "licenseUrl": pipeline.LICENSE_URL,
            "acquiredAt": "2026-08-23T00:00:00Z",
            "radiance": {
                "file": self.radiance_path.name,
                "sha256": self._sha256(self.radiance_path),
                "band": 1,
            },
            "cloudFreeCoverage": {
                "file": self.coverage_path.name,
                "sha256": self._sha256(self.coverage_path),
                "band": 1,
            },
            "aoi": {"west": 112.5, "south": 21.5, "east": 115.5, "north": 24.5},
            "minimumCloudFreeObservations": 3,
            "gridStridePixels": 4,
        }
        manifest.update(updates)
        self.manifest_path.write_text(
            json.dumps(manifest, ensure_ascii=False), encoding="utf-8"
        )

    def test_prepare_hashes_selects_and_builds_relative_cells(self) -> None:
        manifest, selection, thresholds, cells = pipeline.prepare(self.manifest_path)

        self.assertEqual(manifest.dataset_version, "eog-test-current")
        self.assertEqual(selection.radiance.shape, (12, 12))
        self.assertEqual(len(thresholds), 4)
        self.assertTrue(all(left <= right for left, right in zip(thresholds, thresholds[1:])))
        self.assertEqual(len(cells), 9)
        self.assertTrue(all(cell["radiance"]["unit"] == pipeline.RADIANCE_UNIT for cell in cells))
        self.assertTrue(all("Bortle" not in cell["label"] for cell in cells))

    def test_point_sample_is_radiance_not_calibrated_sky_class(self) -> None:
        manifest, selection, thresholds, _ = pipeline.prepare(self.manifest_path)
        source = pipeline._source_summary(manifest, selection.resolution_degrees)

        estimate = pipeline.sample_point(
            selection, manifest, source, thresholds, longitude=114.0, latitude=23.0
        )

        self.assertEqual(estimate["state"], "ESTIMATED")
        self.assertIsNone(estimate["levelAtMost"])
        self.assertFalse(estimate["calibratedSkyClass"])
        self.assertEqual(estimate["radiance"]["unit"], pipeline.RADIANCE_UNIT)
        self.assertIn(estimate["productBand"], pipeline.BANDS)

    def test_zero_radiance_with_sufficient_coverage_remains_valid(self) -> None:
        self.radiance.fill(0)
        self._write_raster(self.radiance_path, self.radiance, "float32")
        self._write_manifest()

        manifest, selection, thresholds, cells = pipeline.prepare(self.manifest_path)
        source = pipeline._source_summary(manifest, selection.resolution_degrees)
        estimate = pipeline.sample_point(
            selection, manifest, source, thresholds, longitude=114.0, latitude=23.0
        )

        self.assertTrue(cells)
        self.assertEqual(estimate["radiance"]["median"], 0)
        self.assertEqual(estimate["productBand"], "VERY_LOW")

    def test_insufficient_coverage_never_becomes_a_relative_cell(self) -> None:
        self.coverage.fill(1)
        self._write_raster(self.coverage_path, self.coverage, "uint16")
        self._write_manifest()

        with self.assertRaisesRegex(pipeline.PipelineError, "insufficient_valid_aoi_pixels"):
            pipeline.prepare(self.manifest_path)

    def test_hash_mismatch_fails_before_raster_use(self) -> None:
        self._write_manifest(
            radiance={
                "file": self.radiance_path.name,
                "sha256": "0" * 64,
                "band": 1,
            }
        )

        with self.assertRaisesRegex(pipeline.PipelineError, "radiance_sha256_mismatch"):
            pipeline.prepare(self.manifest_path)

    def test_unknown_manifest_key_fails_closed(self) -> None:
        self._write_manifest(unverifiedShortcut=True)

        with self.assertRaisesRegex(pipeline.PipelineError, "manifest_keys_invalid"):
            pipeline.load_manifest(self.manifest_path)


if __name__ == "__main__":
    unittest.main()
