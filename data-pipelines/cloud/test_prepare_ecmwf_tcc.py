import tempfile
import unittest
from datetime import timedelta
from pathlib import Path

from prepare_ecmwf_tcc import crop_indices, immutable, instant, iso, qualify, required_steps, validate_origin


class CloudBatchTests(unittest.TestCase):
    def setUp(self):
        self.run = instant("2026-10-27T00:00:00Z")
        self.as_of = instant("2026-10-27T18:45:00Z")
        self.meta = {"gridType": "regular_ll", "Ni": 3600, "Nj": 1801, "iScansNegatively": 0,
                     "jScansPositively": 0, "jPointsAreConsecutive": 0, "alternativeRowScanning": 0,
                     "iDirectionIncrementInDegrees": 0.1, "jDirectionIncrementInDegrees": 0.1,
                     "latitudeOfFirstGridPointInDegrees": 90, "latitudeOfLastGridPointInDegrees": -90,
                     "longitudeOfFirstGridPointInDegrees": 180, "longitudeOfLastGridPointInDegrees": 179.9}

    def test_lead_240_alone_does_not_cover_240_from_query_time(self):
        steps = required_steps(self.run, self.as_of, 0)
        self.assertEqual(steps[-1], 264)
        self.assertEqual(required_steps(self.run, self.as_of, 12)[-1], 276)
        frames = [{"stepHours": h, "validAt": iso(self.run + timedelta(hours=h))} for h in steps]
        coverage = qualify(frames, self.run, self.as_of, steps)
        self.assertEqual(coverage["supports240HoursUntil"], "2026-10-28T00:00:00Z")
        short_steps = tuple(h for h in steps if h <= 240)
        with self.assertRaisesRegex(ValueError, "coverage_short"):
            qualify(frames[:len(short_steps)], self.run, self.as_of, short_steps)

    def test_native_cadence_and_missing_bracket_are_not_invented(self):
        steps = required_steps(self.run, self.as_of)
        self.assertIn(144, steps)
        self.assertIn(150, steps)
        self.assertNotIn(147, steps)
        frames = [{"stepHours": h, "validAt": iso(self.run + timedelta(hours=h))} for h in steps]
        with self.assertRaisesRegex(ValueError, "missing_or_duplicate"):
            qualify(frames[:2] + frames[3:], self.run, self.as_of, steps)
        frames[1] = {**frames[1], "validAt": iso(self.run)}
        with self.assertRaisesRegex(ValueError, "valid_time_mismatch"):
            qualify(frames, self.run, self.as_of, steps)

    def test_old_run_and_non_synoptic_run_are_rejected(self):
        with self.assertRaisesRegex(ValueError, "cannot_cover"):
            required_steps(self.run, self.run + timedelta(hours=121), 0)
        with self.assertRaisesRegex(ValueError, "00_or_12"):
            required_steps(self.run + timedelta(hours=6), self.as_of)
        with self.assertRaisesRegex(ValueError, "offset"):
            instant("2026-10-27T12:00:00")

    def test_wrapped_longitudes_and_north_down_match_source_indices(self):
        rows, columns, grid = crop_indices(self.meta, (70, 0, 140, 55))
        self.assertEqual((int(rows[0]), int(rows[-1])), (350, 900))
        self.assertEqual((int(columns[0]), int(columns[-1])), (2500, 3200))
        self.assertEqual((grid["width"], grid["height"]), (701, 551))
        zero_origin = {**self.meta, "longitudeOfFirstGridPointInDegrees": 0, "longitudeOfLastGridPointInDegrees": 359.9}
        _, columns, _ = crop_indices(zero_origin, (70, 0, 140, 55))
        self.assertEqual((int(columns[0]), int(columns[-1])), (700, 1400))

    def test_crop_expands_to_brackets_and_rejects_wrong_layout(self):
        _, _, grid = crop_indices(self.meta, (113.21, 22.51, 113.22, 22.52))
        self.assertEqual((grid["west"], grid["north"], grid["width"], grid["height"]), (113.2, 22.6, 2, 2))
        with self.assertRaisesRegex(ValueError, "scan_order"):
            crop_indices({**self.meta, "jScansPositively": 1}, (70, 0, 140, 55))
        with self.assertRaisesRegex(ValueError, "longitude_grid"):
            crop_indices({**self.meta, "longitudeOfLastGridPointInDegrees": 179.8}, (70, 0, 140, 55))

    def test_immutable_conflict_does_not_replace_old_bytes(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / "old-release.bin"
            first = immutable(path, b"original")
            self.assertEqual(immutable(path, b"original"), first)
            with self.assertRaisesRegex(ValueError, "immutable"):
                immutable(path, b"replacement")
            self.assertEqual(path.read_bytes(), b"original")

    def test_half_cell_origin_cannot_be_relabelled_as_tenth_degree_grid(self):
        shifted = {**self.meta, "longitudeOfFirstGridPointInDegrees": 180.05, "longitudeOfLastGridPointInDegrees": 179.95}
        with self.assertRaisesRegex(ValueError, "origin_not_native_tenth"):
            crop_indices(shifted, (70, 0, 140, 55))

    def test_other_stream_model_or_producing_centre_cannot_claim_oper_fc(self):
        origin = {"centre": "ecmf", "class": "od", "stream": "oper", "dataType": "fc", "edition": 2, "typeOfGeneratingProcess": 2}
        validate_origin(origin)
        for key, value in [("centre", "kwbc"), ("class", "ai"), ("stream", "enfo"), ("dataType", "cf"), ("typeOfGeneratingProcess", 0)]:
            with self.subTest(key=key), self.assertRaisesRegex(ValueError, "origin_invalid"):
                validate_origin({**origin, key: value})


if __name__ == "__main__":
    unittest.main()
