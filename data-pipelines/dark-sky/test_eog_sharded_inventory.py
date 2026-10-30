from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path
from unittest import mock

import numpy as np
import rasterio

import eog_sharded_inventory as sharded
from eog_raster import PipelineError
from test_eog_fixed_publication import prepare_fixture


class ShardedInventoryTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.temporary = tempfile.TemporaryDirectory(prefix="starward-eog-sharded-test-")
        cls.root = Path(cls.temporary.name)
        _, cls.manifest = prepare_fixture(cls.root)
        cls.output = cls.root / "sharded"
        cls.result = sharded.prepare_index([cls.manifest], cls.output)
        cls.key = "9-418-222-1-1"

    @classmethod
    def tearDownClass(cls) -> None:
        cls.temporary.cleanup()

    def test_coordinate_lookup_reads_only_root_and_one_shard_and_keeps_numeric_identity(self) -> None:
        original_inventory = json.loads((self.manifest.parent / "inventory.json").read_bytes())
        original = original_inventory["assets"][0]
        proof = json.loads((self.manifest.parent / (original["file"] + ".json")).read_bytes())
        with mock.patch.object(sharded, "read_pinned", wraps=sharded.read_pinned) as reads:
            found = sharded.read_window(self.output, self.result["index"], self.key)
        self.assertEqual([call.args[1]["file"] for call in reads.call_args_list], ["index.json", "shards/9/26/13.json"])
        self.assertEqual(found["publicationId"], proof["publicationId"])
        self.assertEqual(found["numeric"]["sha256"], proof["numeric"]["sha256"])
        self.assertEqual(found["numeric"]["bands"], proof["numeric"]["bands"])
        self.assertEqual(len(found["numeric"]["bands"]), 6)
        self.assertEqual(found["quality"], proof["quality"])
        self.assertEqual(found["boundsGcj02"], proof["grid"]["boundsGcj02"])
        self.assertFalse(self.result["databasePublication"])
        self.assertEqual(self.result["totals"]["assets"], 1)

    def test_offline_display_preserves_missing_pixels_and_binds_unchanged_source(self) -> None:
        found = sharded.read_window(self.output, self.result["index"], self.key)
        display = json.loads(sharded.read_pinned(self.output, found["display"]["proof"], 1024 * 1024))
        self.assertEqual(display["displaySource"]["publicationId"], found["publicationId"])
        self.assertEqual(display["displaySource"]["imageSha256"], found["image"]["sha256"])
        self.assertEqual(display["quality"], found["quality"])
        with rasterio.open(self.output / found["image"]["file"]) as original, rasterio.open(self.output / found["display"]["image"]["file"]) as final:
            source, target = original.read(), final.read()
        np.testing.assert_array_equal(source[3] == 0, target[3] == 0)
        self.assertGreater(int((target[3] != 0).sum()), 0)
        self.assertFalse(np.array_equal(source, target), "the requested final display mapping must actually have an effect")
        self.assertEqual(set(np.unique(target[3])).difference({0}), {36, 70, 108, 146, 184}.intersection(set(np.unique(target[3]))))

    def test_unknown_coverage_is_absent_and_corrupt_known_shard_is_failure(self) -> None:
        with mock.patch.object(sharded, "read_pinned", wraps=sharded.read_pinned) as reads:
            self.assertIsNone(sharded.read_window(self.output, self.result["index"], "9-0-0-1-1"))
        self.assertEqual(reads.call_count, 1)
        file = self.output / "shards/9/26/13.json"
        original = file.read_bytes()
        try:
            file.write_bytes(b"x" + original[1:])
            with self.assertRaisesRegex(PipelineError, "nightlight_sharded_file_hash_invalid"):
                sharded.read_window(self.output, self.result["index"], self.key)
        finally:
            file.write_bytes(original)

    def test_duplicate_part_cannot_seal_and_replay_preserves_root_bytes(self) -> None:
        before = (self.output / "index.json").read_bytes()
        self.assertEqual(sharded.prepare_index([self.manifest], self.output), self.result)
        self.assertEqual((self.output / "index.json").read_bytes(), before)
        incomplete = self.root / "duplicate"
        with self.assertRaisesRegex(PipelineError, "nightlight_sharded_part_duplicate"):
            sharded.prepare_index([self.manifest, self.manifest], incomplete)
        self.assertFalse((incomplete / "index.json").exists())

    def test_window_and_descriptor_boundaries_reject_invalid_requests(self) -> None:
        for key in ["13-418-222-1-1", "9-512-222-1-1", "9-418-222-4-1", "../9-418-222-1-1", "9-418-222-0-1", "09-418-222-1-1"]:
            with self.subTest(key=key), self.assertRaisesRegex(PipelineError, "nightlight_sharded_window_invalid"):
                sharded.read_window(self.output, self.result["index"], key)
        with self.assertRaisesRegex(PipelineError, "nightlight_sharded_descriptor_invalid"):
            sharded.read_pinned(self.output, {"file":"../manifest.json", "bytes":1, "sha256":"0"*64}, 1024)


if __name__ == "__main__":
    unittest.main()
