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

    def _assert_exact_cell_coverage(self, cells: list[dict], valid: np.ndarray) -> None:
        # Pixel centres are independent of the publisher's rectangle decomposition.
        for row, column in np.ndindex(valid.shape):
            longitude, latitude = self.transform * (column + 2.5, row + 2.5)
            containing = [cell for cell in cells if
                cell["boundsWgs84"]["west"] < longitude < cell["boundsWgs84"]["east"] and
                cell["boundsWgs84"]["south"] < latitude < cell["boundsWgs84"]["north"]]
            self.assertEqual(len(containing), int(valid[row, column]), (row, column))

    def test_sparse_zero_radiance_preserves_missing_coverage_holes(self) -> None:
        self.radiance.fill(0)
        self.coverage.fill(1)
        self.coverage[2:14:4, 2:14:4] = 12
        self._write_raster(self.radiance_path, self.radiance, "float32")
        self._write_raster(self.coverage_path, self.coverage, "uint16")
        self._write_manifest()
        _, _, _, cells = pipeline.prepare(self.manifest_path)
        self._assert_exact_cell_coverage(cells, self.coverage[2:14, 2:14] >= 3)
        area = sum((c["boundsWgs84"]["east"] - c["boundsWgs84"]["west"]) *
                   (c["boundsWgs84"]["north"] - c["boundsWgs84"]["south"]) for c in cells)
        self.assertAlmostEqual(area, 9 * 0.25 ** 2)
        self.assertTrue(all(c["radiance"]["median"] == 0 for c in cells))

    def test_mixed_blocks_keep_valid_pixels_and_exclude_invalid_radiance(self) -> None:
        self.radiance[3:5, 3:5] = np.nan
        self.radiance[6:9, 7] = -1
        self.coverage[7, 2:14] = 1
        self._write_raster(self.radiance_path, self.radiance, "float32")
        self._write_raster(self.coverage_path, self.coverage, "uint16")
        self._write_manifest(gridStridePixels=5)
        _, _, _, cells = pipeline.prepare(self.manifest_path)
        values = self.radiance[2:14, 2:14]
        self._assert_exact_cell_coverage(cells,
            np.isfinite(values) & (values >= 0) & (self.coverage[2:14, 2:14] >= 3))
        self.assertEqual(len({c["cellId"] for c in cells}), len(cells))

    def test_fragmentation_over_budget_is_rejected_without_filling_holes(self) -> None:
        from unittest.mock import patch
        self.coverage.fill(1)
        self.coverage[2:14:2, 2:14:2] = 12
        self._write_raster(self.coverage_path, self.coverage, "uint16")
        self._write_manifest(gridStridePixels=12)
        with patch.object(pipeline, "MAX_NATIVE_GRID_CELLS", 10):
            with self.assertRaisesRegex(pipeline.PipelineError, "native_grid_cell_budget_exceeded"):
                pipeline.prepare(self.manifest_path)

    def test_unknown_manifest_key_fails_closed(self) -> None:
        self._write_manifest(unverifiedShortcut=True)

        with self.assertRaisesRegex(pipeline.PipelineError, "manifest_keys_invalid"):
            pipeline.load_manifest(self.manifest_path)


if __name__ == "__main__":
    unittest.main()
