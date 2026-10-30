from __future__ import annotations

import unittest
from unittest import mock

import numpy as np
import shapely
from affine import Affine

import eog_area_intersection as intersection
import eog_fixed_method as fixed
from eog_raster import PipelineError


def geos_reference(source, x, y, affine, target, *, source_core=None):
    """The original all-polygon GEOS path, without containment shortcuts.

    The unchanged source-corner convention is shared; the oracle always clips
    every polygon, independent of the optimized containment classification.
    """
    height, width = target.shape
    top, left, bottom, right = source_core or (0, 0, *x.shape)
    rows, columns = np.mgrid[top:bottom, left:right]
    rows, columns = rows.ravel(), columns.ravel()
    px = np.stack([point[rows, columns] for point in intersection._corners(x)], axis=1)
    py = np.stack([point[rows, columns] for point in intersection._corners(y)], axis=1)
    polygons = shapely.polygons(np.stack(((px - affine.c) / affine.a, (py - affine.f) / affine.e), axis=2))
    areas = shapely.area(polygons)
    chosen = np.flatnonzero(target.ravel())
    target_rows, target_columns = np.divmod(chosen, width)
    boxes = shapely.box(target_columns, target_rows, target_columns + 1, target_rows + 1)
    a, b = shapely.STRtree(boxes).query(polygons, predicate="intersects")
    weights = shapely.area(shapely.intersection(polygons[a], boxes[b])) / areas[a]
    return np.stack([np.bincount(chosen[b], weights=weights * band[rows[a], columns[a]], minlength=height * width)
                     for band in source]).reshape(source.shape[0], height, width)


class InteriorMassTest(unittest.TestCase):
    def assert_same_mass(self, actual, expected):
        np.testing.assert_allclose(actual, expected, rtol=fixed.POLICY["boundaryNumericalRelativeTolerance"], atol=0)

    def test_complete_containment_keeps_whole_mass_without_polygon_clipping(self):
        column, row = np.meshgrid(np.arange(3, dtype=float), np.arange(3, dtype=float))
        x, y = .2 + column * .2, 1.8 - row * .2
        values = np.arange(45, dtype=float).reshape(5, 3, 3) + .25
        affine, target = Affine(1, 0, 0, 0, -1, 2), np.ones((2, 2), dtype=bool)
        expected = geos_reference(values, x, y, affine, target)
        clipped = []
        original = shapely.intersection

        def observe(polygons, boxes):
            clipped.append(len(polygons))
            return original(polygons, boxes)

        with mock.patch.object(intersection.shapely, "intersection", side_effect=observe):
            actual = intersection.intersect_area_masses(values, x, y, affine, target)
        self.assert_same_mass(actual, expected)
        self.assert_same_mass(actual[:, 0, 0], values.sum(axis=(1, 2)))
        self.assertEqual(sum(clipped), 0, "interior source mass must not enter GEOS clipping")

    def test_exact_pixel_edges_and_unselected_branch_keep_the_original_mask(self):
        x, y = np.meshgrid(np.arange(8, dtype=float) / 4, 2 - np.arange(8, dtype=float) / 4)
        values = (np.arange(320, dtype=float).reshape(5, 8, 8) + 1) / 7
        target = np.array([[True, False], [False, True]])
        affine = Affine(1, 0, 0, 0, -1, 2)
        expected = geos_reference(values, x, y, affine, target)
        actual = intersection.intersect_area_masses(values, x, y, affine, target)
        self.assert_same_mass(actual, expected)
        np.testing.assert_array_equal(actual[:, ~target], 0)
        self.assert_same_mass(actual[:, 0, 0], values[:, :4, :4].sum(axis=(1, 2)))
        self.assert_same_mass(actual[:, 1, 1], values[:, 4:, 4:].sum(axis=(1, 2)))

    def test_mixed_nonlinear_polygons_retain_geos_at_crossed_edges_and_source_order(self):
        column, row = np.meshgrid(np.arange(27, dtype=float), np.arange(24, dtype=float))
        x = -.12 + .11 * column + .04 * np.sin(row / 3)
        y = 4.2 - .13 * row + .035 * np.sin(column / 2)
        values = np.stack([(.01 + column + row * .3) * scale for scale in (1e-9, 1, 0, 13, 1e8)])
        target = np.indices((4, 4)).sum(axis=0) % 3 != 0
        affine = Affine(1, 0, 0, 0, -1, 4)
        expected = geos_reference(values, x, y, affine, target)
        clipped = []
        original = shapely.intersection

        def observe(polygons, boxes):
            clipped.append(len(polygons))
            return original(polygons, boxes)

        with mock.patch.object(intersection.shapely, "intersection", side_effect=observe):
            actual = intersection.intersect_area_masses(values, x, y, affine, target)
        self.assert_same_mass(actual, expected)
        self.assertGreater(sum(clipped), 0, "crossing polygons retain the original exact intersection")
        self.assertLess(sum(clipped), values.shape[1] * values.shape[2])

    def test_crossing_by_one_ulp_is_not_reclassified_with_a_new_tolerance(self):
        x, y = np.meshgrid([.5, np.nextafter(1., np.inf)], [1.8, 1.6])
        values = np.arange(20, dtype=float).reshape(5, 2, 2) + 1
        affine, target = Affine(1, 0, 0, 0, -1, 2), np.ones((2, 2), dtype=bool)
        expected = geos_reference(values, x, y, affine, target)
        clipped = []
        original = shapely.intersection

        def observe(polygons, boxes):
            clipped.append(len(polygons))
            return original(polygons, boxes)

        with mock.patch.object(intersection.shapely, "intersection", side_effect=observe):
            actual = intersection.intersect_area_masses(values, x, y, affine, target)
        self.assert_same_mass(actual, expected)
        self.assertGreater(sum(clipped), 0)

    def test_halo_anchors_do_not_contribute_mass(self):
        x, y = np.meshgrid(np.arange(4, dtype=float) * .2 + .1, 1.9 - np.arange(4, dtype=float) * .2)
        values = np.full((5, 4, 4), 1e30)
        values[:, 1:3, 1:3] = np.arange(20, dtype=float).reshape(5, 2, 2)
        affine, target, core = Affine(1, 0, 0, 0, -1, 2), np.ones((2, 2), dtype=bool), (1, 1, 3, 3)
        expected = geos_reference(values, x, y, affine, target, source_core=core)
        actual = intersection.intersect_area_masses(values, x, y, affine, target, source_core=core)
        self.assert_same_mass(actual, expected)
        self.assert_same_mass(actual[:, 0, 0], values[:, 1:3, 1:3].sum(axis=(1, 2)))

    def test_invalid_or_empty_geometry_is_rejected_even_inside_one_pixel(self):
        y = np.array([[.8, .8], [.2, .2]])
        for x in (np.array([[.2, .8], [.8, .2]]), np.full((2, 2), .5)):
            with self.subTest(x=x), self.assertRaisesRegex(PipelineError, "geolocation_mesh_invalid"):
                intersection.intersect_area_masses(np.ones((5, 2, 2)), x, y,
                    Affine(1, 0, 0, 0, -1, 1), np.ones((1, 1), dtype=bool))


if __name__ == "__main__":
    unittest.main()
