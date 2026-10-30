from __future__ import annotations

import copy
import json
import tempfile
import unittest
from pathlib import Path
from unittest import mock

import rasterio
from rasterio.transform import from_origin

import prepare_fixed_eog as preparation
from eog_raster import PipelineError, load_manifest, read_grid, sha256_bytes
from test_eog_fixed_publication import prepare_source_fixture


def cell(x: int, y: int = 1780, zoom: int = 12) -> dict:
    return {"grid": "gcj02-mercator-pixel-centres-v1", "tilePixels": 256,
            "zoom": zoom, "x": x, "y": y, "columns": 1, "rows": 1}


class PreparationInputsTest(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        self.source = prepare_source_fixture(self.root)
        self.parts = [{"id": "west", "windows": [cell(3344)]}, {"id": "east", "windows": [cell(3345)]}]
        self.output = self.root / "declared"

    def declare(self, parts=None):
        return preparation.declare_preparation_parts(self.source, "eog-declared-v1", self.parts if parts is None else parts, self.output)

    def test_adjacent_parts_are_aligned_source_inputs_not_numerical_or_published_outputs(self) -> None:
        with mock.patch.object(preparation, "prepare_release", side_effect=AssertionError("no production")), \
             mock.patch.object(preparation, "read_selection", side_effect=AssertionError("no full arrays")):
            result = self.declare()
        self.assertEqual((result["status"], result["partCount"], result["assetCount"]), ("DECLARED_INPUTS_ONLY", 2, 2))
        self.assertFalse(result["numericalProduction"] or result["databasePublication"])
        raw = (self.output / "declaration.json").read_bytes()
        self.assertEqual(sha256_bytes(raw), result["declaration"]["sha256"])
        declared = json.loads(raw)
        self.assertEqual([part["id"] for part in declared["parts"]], ["west", "east"])
        for index, part in enumerate(declared["parts"]):
            manifest = load_manifest(self.output / part["sourceManifest"]["file"])
            grid = read_grid(manifest)
            self.assertEqual([int(grid.window.col_off), int(grid.window.row_off), grid.width, grid.height], part["nativeSourceWindow"])
            self.assertEqual(manifest.dataset_version, "eog-legacy-test-v1")
            self.assertIsNone(manifest.fixed_raster)
            self.assertEqual(manifest.radiance.path, self.root / "radiance.tif")
            self.assertEqual(json.loads((self.output / part["windows"]["file"]).read_bytes()), self.parts[index]["windows"])
            # One whole source pixel remains outside every declared target edge.
            envelope = part["inverseCornerEnvelope"]
            self.assertGreaterEqual(envelope["west"] - manifest.aoi.west, .01 - 1e-10)
            self.assertGreaterEqual(manifest.aoi.east - envelope["east"], .01 - 1e-10)
            self.assertGreaterEqual(envelope["south"] - manifest.aoi.south, .01 - 1e-10)
            self.assertGreaterEqual(manifest.aoi.north - envelope["north"], .01 - 1e-10)
        self.assertEqual(len(list(self.output.rglob("*.*"))), 5)
        self.assertEqual(self.declare(), result)
        self.assertEqual((self.output / "declaration.json").read_bytes(), raw)
        with self.assertRaisesRegex(PipelineError, "immutable_release_conflict"):
            preparation.declare_preparation_parts(self.source, "different-v2", self.parts, self.output)
        self.assertEqual((self.output / "declaration.json").read_bytes(), raw)

    def test_composition_implied_cells_have_one_part_owner_before_projection(self) -> None:
        parts = copy.deepcopy(self.parts)
        parts[0]["windows"][0]["columns"] = 2
        with mock.patch.object(preparation, "source_footprints", side_effect=AssertionError("admit first")):
            with self.assertRaisesRegex(PipelineError, "part_window_duplicate"):
                self.declare(parts)
        self.assertFalse(self.output.exists())

    def test_invalid_batch_is_rejected_before_projection(self) -> None:
        invalid = [[], [{"id": "../escape", "windows": [cell(3344)]}], [{"id": "con", "windows": [cell(3344)]}],
                   [{"id": "west", "windows": []}], self.parts + [self.parts[0]],
                   [{"id": "west", "windows": [{**cell(3344), "zoom": True}]}],
                   [{"id": "west", "windows": [{**cell(3344), "extra": "unknown"}]}]]
        with mock.patch.object(preparation, "source_footprints", side_effect=AssertionError("admit first")):
            for parts in invalid:
                with self.subTest(parts=parts), self.assertRaises(PipelineError):
                    self.declare(parts)
        self.assertFalse(self.output.exists())

    def test_source_extent_is_not_silently_clipped_and_later_failure_leaves_no_marker(self) -> None:
        with self.assertRaisesRegex(PipelineError, "part_outside_source"):
            self.declare([self.parts[0], {"id": "far", "windows": [cell(1000)]}])
        self.assertFalse(self.output.exists())

    def test_original_ten_degree_limit_still_applies(self) -> None:
        for name in ("radiance", "coverage"):
            with rasterio.open(self.root / f"{name}.tif", "r+") as image:
                image.transform = from_origin(0, 40, 1, 1)
        raw = json.loads(self.source.read_bytes())
        raw["aoi"] = {"west": 22, "east": 23, "north": 23, "south": 22}
        self.source.write_text(json.dumps(raw), encoding="utf-8")
        with self.assertRaisesRegex(PipelineError, "part_aoi_exceeded"):
            self.declare([{"id": "wide", "windows": [cell(9, 7, 4)]}])
        self.assertFalse(self.output.exists())

    def test_source_changed_during_projection_cannot_get_a_final_marker(self) -> None:
        original = preparation.source_footprints

        def changed(*args):
            result = original(*args)
            with rasterio.open(self.root / "coverage.tif", "r+") as image:
                image.update_tags(declaration_test="changed")
            return result

        with mock.patch.object(preparation, "source_footprints", side_effect=changed):
            with self.assertRaisesRegex(PipelineError, "preparation_source_changed"):
                self.declare()
        self.assertFalse(self.output.exists())


if __name__ == "__main__":
    unittest.main()
