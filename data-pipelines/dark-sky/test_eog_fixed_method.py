from __future__ import annotations

import unittest
import numpy as np
from rasterio.transform import from_origin
import eog_fixed_method as fixed


class FixedNightLightMethodTest(unittest.TestCase):
    def test_fixed_values_have_identical_bands_without_an_aoi_distribution(self) -> None:
        self.assertEqual([fixed.band_for_radiance(v) for v in [0, .5, .5001, 2, 2.01, 10, 10.01, 40, 40.01]],
                         ["VERY_LOW", "VERY_LOW", "LOW", "LOW", "MODERATE", "MODERATE", "HIGH", "HIGH", "VERY_HIGH"])
        for value in [float("nan"), -1, float("inf")]:
            with self.assertRaisesRegex(ValueError, "fixed_radiance_invalid"):
                fixed.band_for_radiance(value)
        self.assertEqual(fixed.band_for_radiance(float(np.nextafter(.5, np.inf))), "VERY_LOW")
        self.assertEqual(fixed.band_for_radiance(.5 + 1e-10), "LOW")

    def test_valid_zero_coverage_failure_and_missing_source_are_distinct(self) -> None:
        values = np.ma.array(np.zeros((3, 3)))
        areas = np.ones((3, 3))
        valid = fixed.aggregate(values, np.ma.array(np.full((3, 3), 12)), areas, 3)
        low_coverage = fixed.aggregate(values, np.ma.array(np.ones((3, 3))), areas, 3)
        missing = fixed.aggregate(np.ma.masked_all((3, 3)), np.ma.array(np.full((3, 3), 12)), areas, 3)
        self.assertEqual(valid["statistics"]["median"], 0)
        self.assertEqual(valid["quality"]["validZeroPixelCount"], 9)
        self.assertEqual(low_coverage["reason"], "INSUFFICIENT_COVERAGE")
        self.assertEqual(missing["reason"], "SOURCE_MISSING")
        self.assertIsNone(low_coverage["statistics"])
        self.assertIsNone(missing["statistics"])

    def test_partial_footprint_retains_its_denominator_and_aggregates_numbers(self) -> None:
        values = np.ma.array([[0., 0., 10.], [10., 100., 0.]], mask=[[False, False, False], [False, False, True]])
        coverage = np.ma.array(np.full((2, 3), 12))
        areas = np.array([[1., 1., 1.], [1., 6., 10.]])
        result = fixed.aggregate(values, coverage, areas, 3)
        self.assertEqual(result["state"], "PARTIAL")
        self.assertEqual(result["quality"]["validAreaFraction"], .5)
        self.assertAlmostEqual(result["statistics"]["mean"], 62)
        self.assertGreater(result["statistics"]["median"], 10)
        rejected = fixed.aggregate(values, coverage, areas * np.array([[1, 1, 1], [1, 1, 2]]), 3)
        self.assertEqual(rejected["reason"], "INSUFFICIENT_VALID_AREA")
        self.assertIsNone(rejected["statistics"])

    def test_degree_cells_are_weighted_by_actual_latitude_area(self) -> None:
        areas = fixed.pixel_areas(from_origin(110, 61, 1, 1), 2, 3)
        self.assertGreater(areas[1, 0], areas[0, 0])
        self.assertAlmostEqual(areas[0, 0], areas[0, 2])
        result = fixed.aggregate(np.ma.array([[100., 100., 100.], [0., 0., 0.]]),
                                 np.ma.array(np.full((2, 3), 12)), areas, 3)
        self.assertLess(result["statistics"]["mean"], 50)

    def test_unpublished_area_is_distinct_from_a_published_missing_source(self) -> None:
        values, coverages, areas = np.ma.masked_all((3, 3)), np.ma.masked_all((3, 3)), np.ones((3, 3))
        unpub = fixed.aggregate(values, coverages, areas, 3, published=np.zeros((3, 3), dtype="bool"))
        missing = fixed.aggregate(values, coverages, areas, 3)
        self.assertEqual(unpub["reason"], "UNPUBLISHED")
        self.assertEqual(unpub["quality"]["sourceMissingAreaFraction"], 0)
        self.assertEqual(unpub["quality"]["publishedAreaFraction"], 0)
        self.assertEqual(missing["reason"], "SOURCE_MISSING")
        self.assertEqual(missing["quality"]["sourceMissingAreaFraction"], 1)


if __name__ == "__main__":
    unittest.main()
