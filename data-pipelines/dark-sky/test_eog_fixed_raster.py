from __future__ import annotations

import unittest
import numpy as np
from affine import Affine
from rasterio.io import MemoryFile
from eog_fixed_raster import warp_numeric, colour_png, numeric_geotiff, NUMERIC_BANDS
from eog_raster import PipelineError


class FixedNightLightRasterTest(unittest.TestCase):
    def setUp(self) -> None:
        self.x, self.y = np.meshgrid(np.arange(4, dtype="float64"), 4 - np.arange(4, dtype="float64"))
        self.coverage = np.ma.array(np.full((4, 4), 12))

    def test_numeric_area_sum_precedes_colour_and_uses_top_left_geolocation(self) -> None:
        values = np.ma.array(np.arange(16, dtype="float64").reshape(4, 4))
        result = warp_numeric(values, self.coverage, np.ones((4, 4)), self.x, self.y, np.full((2, 2), 4.),
                              Affine(2, 0, 0, 0, -2, 4), 3)
        np.testing.assert_allclose(result["radianceMean"], [[2.5, 4.5], [10.5, 12.5]])
        np.testing.assert_allclose(result["validAreaFraction"], 1)
        values[:, :2] = [[0, 100]] * 4
        result = warp_numeric(values, self.coverage, np.ones((4, 4)), self.x, self.y, np.full((2, 2), 4.),
                              Affine(2, 0, 0, 0, -2, 4), 3)
        self.assertEqual(result["radianceMean"][0, 0], 50)
        with MemoryFile(colour_png(result)) as memory, memory.open() as image:
            np.testing.assert_array_equal(image.read()[:, 0, 0], [224, 201, 152, 102])

    def test_unpublished_part_of_a_pixel_does_not_shrink_the_quality_denominator(self) -> None:
        result = warp_numeric(np.ma.array(np.zeros((4, 4))), self.coverage, np.ones((4, 4)), self.x, self.y,
                              np.full((1, 1), 64.), Affine(8, 0, -2, 0, -8, 6), 3)
        self.assertAlmostEqual(result["publishedAreaFraction"][0, 0], .25)
        self.assertAlmostEqual(result["validAreaFraction"][0, 0], .25)
        self.assertTrue(np.isnan(result["radianceMean"][0, 0]))
        self.assertEqual(result["qualityMask"][0, 0], 6)

    def test_discontinuous_coordinate_footprint_selects_one_continuous_branch_per_pixel(self) -> None:
        values = np.ma.array(np.arange(16, dtype="float64").reshape(4, 4))
        branch = np.ones((4, 4), dtype="uint8")
        branch[:, 0] = 0
        result = warp_numeric(values, self.coverage, np.ones((4, 4)), self.x + 1, self.y, np.ones((4, 4)),
                              Affine(1, 0, 0, 0, -1, 4), 3, identity_x=self.x, identity_y=self.y, target_branches=branch)
        np.testing.assert_allclose(result["radianceMean"], values[:, [0, 0, 1, 2]])
        np.testing.assert_allclose(result["validAreaFraction"], 1)
        np.testing.assert_allclose(result["areaExcessFraction"], 0)

    def test_a_folded_geolocation_mesh_cannot_publish_duplicated_area(self) -> None:
        with self.assertRaisesRegex(PipelineError, "nightlight_geolocation_area_overlap"):
            warp_numeric(np.ma.array(np.zeros((4, 4))), self.coverage, np.ones((4, 4)), self.x, self.y,
                         np.full((4, 4), .5), Affine(1, 0, 0, 0, -1, 4), 3)

    def test_valid_zero_remains_coloured_while_coverage_missing_and_unpublished_are_transparent(self) -> None:
        values = np.ma.array(np.zeros((4, 4)), mask=False)
        coverage = self.coverage.copy()
        coverage[:2, 2:] = 1
        values.mask[2:, :2] = True
        result = warp_numeric(values, coverage, np.ones((4, 4)), self.x, self.y, np.full((2, 3), 4.),
                              Affine(2, 0, 0, 0, -2, 4), 3)
        np.testing.assert_array_equal(result["qualityMask"], [[1, 3, 5], [4, 1, 5]])
        self.assertEqual(result["radianceMean"][0, 0], 0)
        with MemoryFile(colour_png(result)) as memory, memory.open() as image:
            np.testing.assert_array_equal(image.read(4), [[102, 0, 0], [0, 102, 0]])

    def test_lossless_numeric_companion_retains_zero_missing_and_quality_without_an_epsg_claim(self) -> None:
        values = np.ma.array(np.zeros((4, 4)), mask=False)
        values.mask[:2, 2:] = True
        transform = Affine(2, 0, 0, 0, -2, 4)
        numbers = warp_numeric(values, self.coverage, np.ones((4, 4)), self.x, self.y,
                               np.full((2, 3), 4.), transform, 3)
        with MemoryFile(numeric_geotiff(numbers, transform)) as memory, memory.open() as image:
            self.assertEqual(image.transform, transform)
            self.assertIsNone(image.crs.to_epsg())
            self.assertIn("GCJ-02", image.crs.to_wkt())
            self.assertEqual(image.descriptions, NUMERIC_BANDS)
            for index, key in enumerate(NUMERIC_BANDS, 1):
                np.testing.assert_array_equal(image.read(index), numbers[key])
            self.assertEqual(image.read(1)[0, 0], 0)
            self.assertTrue(np.isnan(image.read(1)[0, 1]))
            np.testing.assert_array_equal(image.read(6), [[1, 4, 5], [1, 1, 5]])


if __name__ == "__main__":
    unittest.main()
