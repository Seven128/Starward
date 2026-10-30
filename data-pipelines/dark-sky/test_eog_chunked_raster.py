from __future__ import annotations

import dataclasses
import gc
import unittest
import weakref

import numpy as np
from affine import Affine

import eog_fixed_method as fixed
from eog_fixed_raster import NumericWarpChunk, colour_png, warp_numeric, warp_numeric_chunks
from eog_raster import PipelineError


def partition(values, coverages, areas, x, y, block, *, identity_x=None, identity_y=None):
    """Slice a known complete lattice; halo is only the neighbour at an edge."""
    height, width = values.shape
    for top in range(0, height, block):
        for left in range(0, width, block):
            bottom, right = min(height, top + block), min(width, left + block)
            end_row, end_column = min(height, bottom + 1), min(width, right + 1)
            begin_row = min(top, end_row - 2)
            begin_column = min(left, end_column - 2)
            selected = np.s_[begin_row:end_row, begin_column:end_column]
            yield NumericWarpChunk((begin_row, begin_column),
                (top - begin_row, left - begin_column, bottom - begin_row, right - begin_column),
                values[selected], coverages[selected], areas[selected], x[selected], y[selected],
                None if identity_x is None else identity_x[selected], None if identity_y is None else identity_y[selected])


class ChunkedNightLightRasterTest(unittest.TestCase):
    def assert_same_numbers(self, actual, expected):
        self.assertEqual(set(actual), set(expected))
        for key in expected:
            if key == "qualityMask":
                np.testing.assert_array_equal(actual[key], expected[key])
            else:
                np.testing.assert_allclose(actual[key], expected[key],
                    rtol=fixed.POLICY["boundaryNumericalRelativeTolerance"], atol=0, equal_nan=True, err_msg=key)
        self.assertEqual(colour_png(actual), colour_png(expected))

    def test_disjoint_chunks_normalize_only_after_complete_physical_mass(self):
        x, y = np.meshgrid(np.arange(4, dtype=float), 4 - np.arange(4, dtype=float))
        values = np.ma.array(np.zeros((4, 4)), mask=False)
        values[:2, 2:] = 100
        values.mask[2:, :2] = True
        coverages = np.ma.array(np.full((4, 4), 12))
        coverages[2:, 2:] = 1
        areas, target = np.ones((4, 4)), np.full((1, 1), 16.)
        affine = Affine(4, 0, 0, 0, -4, 4)
        whole = warp_numeric(values, coverages, areas, x, y, target, affine, 3)
        chunks = list(partition(values, coverages, areas, x, y, 2))
        result = warp_numeric_chunks(iter(chunks), values.shape, target, affine, 3)
        self.assert_same_numbers(result, whole)
        self.assertEqual(result["radianceMean"][0, 0], 50)
        self.assertEqual(result["validAreaFraction"][0, 0], .5)
        self.assertEqual(result["sourceMissingAreaFraction"][0, 0], .25)
        self.assertEqual(result["insufficientCoverageAreaFraction"][0, 0], .25)

    def test_nonlinear_halo_edges_match_whole_in_both_partition_orders(self):
        column, row = np.meshgrid(np.arange(7, dtype=float), np.arange(7, dtype=float))
        x, y = column + .03 * row ** 2, 7 - row + .02 * column ** 2
        values = np.ma.array(np.arange(49, dtype=float).reshape(7, 7), mask=False)
        values[:2, :2] = 0
        values.mask[4:6, 2:4] = True
        coverages = np.ma.array(np.full((7, 7), 12))
        coverages[2:4, 4:6] = 1
        areas, target = np.ones((7, 7)), np.ones((10, 10))
        affine = Affine(1, 0, -.5, 0, -1, 8.5)
        whole = warp_numeric(values, coverages, areas, x, y, target, affine, 3)
        for block in (2, 3, 4):
            chunks = list(partition(values, coverages, areas, x, y, block))
            for ordered in (chunks, list(reversed(chunks))):
                with self.subTest(block=block, reversed=ordered is not chunks):
                    self.assert_same_numbers(warp_numeric_chunks(iter(ordered), values.shape, target, affine, 3), whole)

    def test_branch_mask_applies_once_and_valid_zero_keeps_its_colour(self):
        x, y = np.meshgrid(np.arange(6, dtype=float), 6 - np.arange(6, dtype=float))
        values = np.ma.array(np.zeros((6, 6)), mask=False)
        values[:, 3:] = 40
        values.mask[2:4, 2:4] = True
        coverages = np.ma.array(np.full((6, 6), 12))
        coverages[:2, 4:] = 1
        branches = np.ones((6, 8), dtype="uint8")
        branches[:, :2] = 0
        target, affine = np.ones(branches.shape), Affine(1, 0, 0, 0, -1, 6)
        whole = warp_numeric(values, coverages, np.ones(values.shape), x + 1, y, target, affine, 3,
            identity_x=x, identity_y=y, target_branches=branches)
        chunks = partition(values, coverages, np.ones(values.shape), x + 1, y, 2, identity_x=x, identity_y=y)
        result = warp_numeric_chunks(chunks, values.shape, target, affine, 3, target_branches=branches)
        self.assert_same_numbers(result, whole)
        self.assertEqual(result["radianceMean"][0, 0], 0)
        self.assertTrue(np.isnan(result["radianceMean"][0, -1]))

    def test_duplicate_and_missing_cores_cannot_seal_an_accumulated_result(self):
        x, y = np.meshgrid(np.arange(4, dtype=float), 4 - np.arange(4, dtype=float))
        values = np.ma.array(np.zeros((4, 4)))
        coverages = np.ma.array(np.full((4, 4), 12))
        chunks = list(partition(values, coverages, np.ones((4, 4)), x, y, 2))
        target, affine = np.ones((4, 4)), Affine(1, 0, 0, 0, -1, 4)
        with self.assertRaisesRegex(PipelineError, "partition_incomplete"):
            warp_numeric_chunks(chunks[:-1], values.shape, target, affine, 3)
        with self.assertRaisesRegex(PipelineError, "partition_overlap"):
            warp_numeric_chunks([*chunks[:-1], chunks[0]], values.shape, target, affine, 3)

    def test_interior_partition_requires_a_true_next_anchor_instead_of_extrapolation(self):
        x, y = np.meshgrid(np.arange(4, dtype=float), 4 - np.arange(4, dtype=float))
        values, coverage = np.ma.array(np.zeros((4, 4))), np.ma.array(np.full((4, 4), 12))
        chunks = list(partition(values, coverage, np.ones((4, 4)), x, y, 2))
        broken = dataclasses.replace(chunks[0], values=chunks[0].values[:2, :2], coverages=chunks[0].coverages[:2, :2],
            source_areas=chunks[0].source_areas[:2, :2], source_x=chunks[0].source_x[:2, :2], source_y=chunks[0].source_y[:2, :2])
        with self.assertRaisesRegex(PipelineError, "interior_halo_required"):
            warp_numeric_chunks([broken, *chunks[1:]], values.shape, np.ones((4, 4)), Affine(1, 0, 0, 0, -1, 4), 3)

    def test_previous_source_window_is_released_before_generator_prepares_next(self):
        retired = []

        def chunks():
            for top in (0, 2):
                for left in (0, 2):
                    height, width = min(3, 4 - top), min(3, 4 - left)
                    values = np.ma.array(np.zeros((height, width)))
                    witness = weakref.ref(values)
                    x, y = np.meshgrid(left + np.arange(width, dtype=float), 4 - top - np.arange(height, dtype=float))
                    yield NumericWarpChunk((top, left), (0, 0, 2, 2), values,
                        np.ma.array(np.full(values.shape, 12)), np.ones(values.shape), x, y)
                    del values, x, y
                    gc.collect()
                    self.assertIsNone(witness(), "completed source data must not survive into the next producer read")
                    retired.append(True)

        result = warp_numeric_chunks(chunks(), (4, 4), np.ones((4, 4)), Affine(1, 0, 0, 0, -1, 4), 3)
        self.assertEqual(len(retired), 4)
        np.testing.assert_array_equal(result["radianceMean"], 0)


if __name__ == "__main__":
    unittest.main()
