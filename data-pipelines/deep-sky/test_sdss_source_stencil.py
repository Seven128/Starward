"""Geometry boundaries shared by scientific flux and pixel-quality readers."""
import unittest

import numpy as np

from sdss_source_stencil import bilinear_source_samples, source_pixel_stencil


class SourceStencilTest(unittest.TestCase):
    def test_bilinear_gather_keeps_float_zero_negative_and_all_finite_neighbours(self):
        source = np.array([[0, -4, 8], [4, 8, np.nan], [12, 16, 20]], dtype=np.float32)
        x = np.array([0., .25, 1., 2., np.nan])
        y = np.array([0., .5, 0., 0., 0.])
        data, geometric, finite = bilinear_source_samples(source, x, y)
        np.testing.assert_array_equal(geometric, [True, True, True, False, False])
        np.testing.assert_array_equal(finite, [True, True, False, False, False])
        self.assertEqual(data[0], 0)
        # Four independently supplied values with weights .375/.125/.375/.125.
        self.assertEqual(data[1], 2)
        self.assertTrue(np.isnan(data[2:]).all(), "even zero-weight NaN neighbours remain unknown")
        with self.assertRaisesRegex(RuntimeError, "sampling_shape_invalid"):
            bilinear_source_samples(source, x, y[:-1])

    def test_uint8_colour_only_gathers_neighbors_instead_of_casting_full_image(self):
        class NoWholeImageCast(np.ndarray):
            def astype(self, *args, **kwargs):
                raise AssertionError("a source image must not be converted wholesale")
        source = np.array([[0, 100, 200], [40, 80, 160], [80, 160, 240]], dtype=np.uint8).view(NoWholeImageCast)
        data, geometric, finite = bilinear_source_samples(source, np.array([0., .5]), np.array([0., .5]))
        np.testing.assert_array_equal(data, [0, 55])
        self.assertTrue(geometric.all() and finite.all())
        with self.assertRaisesRegex(RuntimeError, "sampling_shape_invalid"):
            bilinear_source_samples(np.zeros((3, 3), dtype=np.uint16),
                                    np.asarray(0.), np.asarray(0.))

    def test_last_sample_still_requires_four_neighbours_and_nonfinite_is_outside(self):
        x = np.array([[0, 2.999, 3, -0.001], [1, np.nan, np.inf, 2.25]])
        y = np.array([[0, 1.999, 1, 0], [2, 0, 1, 1.25]])
        stencil = source_pixel_stencil((3, 4), x, y)
        np.testing.assert_array_equal(stencil.geometry,
                                      [[True, True, False, False], [False, False, False, True]])
        np.testing.assert_array_equal(stencil.x0, [0, 2, 2])
        np.testing.assert_array_equal(stencil.y0, [0, 1, 1])

    def test_scalar_queries_and_degenerate_axes_do_not_invent_coverage(self):
        stencil = source_pixel_stencil((3, 4), np.asarray(1.5), np.asarray(0.5))
        self.assertEqual(stencil.geometry.shape, ())
        self.assertTrue(stencil.geometry)
        np.testing.assert_array_equal(stencil.x0, [1])
        np.testing.assert_array_equal(stencil.y0, [0])
        for shape in ((0, 4), (3, 0), (1, 4), (3, 1)):
            with self.subTest(shape=shape):
                self.assertFalse(source_pixel_stencil(shape, np.asarray(0.), np.asarray(0.)).geometry)
        with self.assertRaisesRegex(RuntimeError, "stencil_input_invalid"):
            source_pixel_stencil((3, 4), np.array([0., 1.]), np.array([0.]))


if __name__ == "__main__":
    unittest.main()
