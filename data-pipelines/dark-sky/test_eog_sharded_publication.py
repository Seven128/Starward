from __future__ import annotations

import contextlib
import dataclasses
import io
import json
import tempfile
import unittest
from pathlib import Path
from unittest import mock

import numpy as np
import rasterio
from rasterio.transform import from_origin

import eog_fixed_method as fixed
import eog_fixed_publication as publication
import eog_raster as raster
import eog_sharded_inventory as sharded
import publish_eog_viirs as pipeline
from prepare_fixed_eog import prepare_release
from test_eog_fixed_publication import prepare_fixture


class NativePartSampleTest(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary = tempfile.TemporaryDirectory(prefix="starward-eog-native-point-")
        self.root = Path(self.temporary.name)
        self.values = np.zeros((16, 16), dtype="float32")
        self.values[:, 8:] = 50
        self.coverage = np.full((16, 16), 12, dtype="uint16")
        for name, values in (("radiance", self.values), ("coverage", self.coverage)):
            with rasterio.open(self.root / (name + ".tif"), "w", driver="GTiff", width=16, height=16,
                               count=1, dtype=values.dtype, crs="EPSG:4326", transform=from_origin(112, 25, .25, .25)) as image:
                image.write(values, 1)
        raw = {"schemaVersion": 1, "datasetVersion": "eog-native-point-fixture", "productName": "Synthetic source fixture",
               "dataYear": 2025, "sourceUrl": raster.SOURCE_PAGE, "licenseUrl": raster.LICENSE_URL,
               "acquiredAt": "2026-10-01T00:00:00Z", "aoi": {"west": 112, "east": 116, "south": 21, "north": 25},
               "minimumCloudFreeObservations": 3, "gridStridePixels": 4,
               "radiance": {"file": "radiance.tif", "sha256": raster.sha256_file(self.root / "radiance.tif"), "band": 1},
               "cloudFreeCoverage": {"file": "coverage.tif", "sha256": raster.sha256_file(self.root / "coverage.tif"), "band": 1}}
        path = self.root / "manifest.json"
        path.write_text(json.dumps(raw), encoding="utf8")
        self.manifest = raster.load_manifest(path)
        self.full = raster.read_grid(self.manifest)
        self.left_manifest = dataclasses.replace(self.manifest, aoi=raster.Aoi(112, 21, 114, 25))
        self.right_manifest = dataclasses.replace(self.manifest, aoi=raster.Aoi(114, 21, 116, 25))
        self.left, self.right = raster.read_grid(self.left_manifest), raster.read_grid(self.right_manifest)
        self.source = fixed.source_summary(self.manifest, self.full.resolution_degrees)

    def tearDown(self) -> None:
        self.temporary.cleanup()

    def test_join_uses_one_nine_native_pixel_statistic_and_union_without_duplicate_area(self) -> None:
        point = (113.875, 23.125)
        dense = publication.sample_point(raster.read_selection(self.manifest), self.manifest, self.source, *point)
        left_only = publication.sample_point(raster.read_selection(self.left_manifest), self.left_manifest, self.source, *point)
        joined = publication.sample_source_point(self.left_manifest, self.source, (self.left, self.right, self.right), *point)
        self.assertEqual(joined, dense)
        self.assertEqual(joined["radiance"], {"median": 0, "p10": 0, "p90": 50, "unit": "nW/cm²/sr"})
        self.assertEqual(joined["quality"]["validPixelCount"], 9)
        self.assertEqual(joined["quality"]["publishedAreaFraction"], 1)
        self.assertEqual(left_only["radiance"]["p90"], 0)
        self.assertLess(left_only["quality"]["publishedAreaFraction"], 1)

    def test_declared_gaps_and_source_edges_keep_the_full_denominator(self) -> None:
        narrow = dataclasses.replace(self.manifest, aoi=raster.Aoi(112, 21, 113.75, 25))
        right = dataclasses.replace(self.manifest, aoi=raster.Aoi(114.25, 21, 116, 25))
        grids = (raster.read_grid(narrow), raster.read_grid(right))
        result = publication.sample_source_point(narrow, self.source, grids, 113.625, 23.125)
        self.assertEqual(result["quality"]["validPixelCount"], 6)
        self.assertEqual(result["quality"]["requestedPixelCount"], 9)
        self.assertAlmostEqual(result["quality"]["publishedAreaFraction"], 2 / 3)
        self.assertEqual(result["quality"]["sourceMissingAreaFraction"], 0)
        with self.assertRaisesRegex(raster.PipelineError, "spot_outside_published_aoi"):
            publication.sample_source_point(narrow, self.source, grids, 114.125, 23.125)
        edge = publication.sample_source_point(self.manifest, self.source, (self.full,), 112.125, 24.875)
        self.assertEqual(edge["state"], "UNAVAILABLE")
        self.assertAlmostEqual(edge["quality"]["publishedAreaFraction"], 4 / 9, delta=.001)
        self.assertEqual(edge["quality"]["sourceMissingAreaFraction"], 0)

    def test_actual_reader_requests_only_two_masked_three_by_three_windows(self) -> None:
        original = rasterio.open
        windows = []

        class Spy:
            def __init__(self, dataset): self.dataset = dataset
            def __enter__(self): self.dataset.__enter__(); return self
            def __exit__(self, *args): return self.dataset.__exit__(*args)
            def __getattr__(self, name): return getattr(self.dataset, name)
            def read(self, *args, **kwargs):
                windows.append(kwargs)
                return self.dataset.read(*args, **kwargs)

        with mock.patch.object(raster.rasterio, "open", side_effect=lambda *a, **k: Spy(original(*a, **k))):
            result = publication.sample_source_point(self.left_manifest, self.source, (self.left, self.right), 113.875, 23.125)
        self.assertEqual(result["radiance"]["p90"], 50)
        self.assertEqual(len(windows), 2)
        self.assertTrue(all(item["window"].width == item["window"].height == 3 and item["masked"] and item["boundless"] for item in windows))


class Cursor:
    def __init__(self, one=None, rows=(), rowcount=1): self.one, self.rows, self.rowcount = one, rows, rowcount
    def fetchone(self): return self.one
    def fetchall(self): return self.rows


class TransactionOracle:
    """Control-flow oracle, not evidence of a running PostgreSQL transaction."""
    def __init__(self, source, *, missing_overview=False):
        self.source, self.missing_overview = source, missing_overview
        self.statements = []
        self.committed = self.rolled_back = False
        self.rows = [("spot:one", 113.8, 23.0, {"spotId": "spot:one"}), ("spot:two", 114.2, 23.0, {"spotId": "spot:two"})]
    def __enter__(self): return self
    def __exit__(self, kind, value, tb): self.committed, self.rolled_back = kind is None, kind is not None
    def execute(self, sql, parameters=()):
        self.statements.append((sql, parameters))
        if "to_regclass" in sql: return Cursor(("datasets", "cells", "revisions"))
        if "SELECT manifest_sha256" in sql: return Cursor()
        if "SELECT payload FROM data_source_registry" in sql: return Cursor((self.source,))
        if "FROM spots s" in sql: return Cursor(rows=self.rows)
        if "SELECT payload FROM spot_overview_read_models" in sql:
            if self.missing_overview and parameters[0] == "spot:two": return Cursor()
            row = next(row for row in self.rows if row[0] == parameters[0])
            return Cursor(({"spot": row[3], "dataDisclosure": []},))
        if "RETURNING version" in sql: return Cursor((2,))
        return Cursor()


class ShardedPublicationTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.temporary = tempfile.TemporaryDirectory(prefix="starward-eog-publisher-parts-")
        cls.root = Path(cls.temporary.name)
        legacy, cls.first = prepare_fixture(cls.root)
        second_dir = cls.root / "part-two"
        prepare_release(legacy, "eog-fixed-test-v2", [{"grid": "gcj02-mercator-pixel-centres-v1", "tilePixels": 256,
                         "zoom": 10, "x": 837, "y": 445, "columns": 1, "rows": 1}], second_dir)
        cls.second = second_dir / "manifest.json"
        cls.output = cls.root / "sharded"
        cls.sealed = sharded.prepare_index([cls.first, cls.second], cls.output)

    @classmethod
    def tearDownClass(cls) -> None:
        cls.temporary.cleanup()

    def candidate(self):
        return pipeline.prepare_sharded([self.first, self.second], self.output / "index.json", self.sealed["index"]["sha256"])

    def test_full_candidate_reuses_two_actual_inputs_and_one_readonly_display_batch(self) -> None:
        before = {file: file.read_bytes() for file in self.output.rglob("*") if file.is_file()}
        with mock.patch.object(pipeline, "sha256_file", wraps=pipeline.sha256_file) as hashes, \
             mock.patch.object(sharded.subprocess, "run", wraps=sharded.subprocess.run) as processes:
            manifest, selected, thresholds, cells = self.candidate()
        self.assertEqual(hashes.call_count, 2)
        self.assertEqual(processes.call_count, 1)
        self.assertEqual(processes.call_args.args[0][-1], "--validate-parts")
        self.assertEqual(thresholds, fixed.THRESHOLDS)
        self.assertEqual(cells, [])
        payload = pipeline.sharded_publication_payload(manifest, selected)
        self.assertEqual(payload["schemaVersion"], 3)
        self.assertEqual(payload["shardedIndex"]["file"], "index.json")
        self.assertEqual(payload["shardedIndex"]["sha256"], self.sealed["index"]["sha256"])
        self.assertNotIn("rasterInventory", payload)
        self.assertEqual({file: file.read_bytes() for file in before}, before)

    def test_public_publish_and_cli_fail_before_database_or_preparation(self) -> None:
        manifest, selected, thresholds, cells = self.candidate()
        with mock.patch.object(pipeline.psycopg, "connect", side_effect=AssertionError("must not connect")) as connect:
            with self.assertRaisesRegex(raster.PipelineError, "nightlight_sharded_publication_not_ready"):
                pipeline.publish(manifest, selected, thresholds, cells, "not-a-database")
            with mock.patch.object(pipeline, "prepare_sharded", side_effect=AssertionError("must not prepare")), contextlib.redirect_stderr(io.StringIO()):
                self.assertEqual(pipeline.main(["--manifest", "missing.json", "--sharded-index", "missing/index.json",
                                                "--sharded-index-sha256", "0" * 64]), 1)
        self.assertFalse(connect.called)

    def test_internal_common_transaction_uses_one_union_query_and_two_exact_revisions(self) -> None:
        manifest, selected, thresholds, cells = self.candidate()
        connection = TransactionOracle(selected.index["source"])
        with mock.patch.object(pipeline.psycopg, "connect", return_value=connection) as connect:
            result = pipeline._publish_transaction(manifest, selected, thresholds, cells, "oracle")
        self.assertEqual(connect.call_count, 1)
        self.assertTrue(connection.committed)
        self.assertEqual((result["sampleCount"], result["changedSpotCount"], result["cellCount"]), (2, 2, 0))
        queries = [sql for sql, _ in connection.statements]
        self.assertEqual(sum("pg_advisory_xact_lock" in sql for sql in queries), 1)
        self.assertEqual(sum("FROM spots s" in sql for sql in queries), 1)
        self.assertIn("EXISTS", next(sql for sql in queries if "FROM spots s" in sql))
        self.assertEqual(sum("INSERT INTO spot_revisions" in sql for sql in queries), 2)
        self.assertEqual(sum("INSERT INTO published_dataset_versions" in sql for sql in queries), 1)
        samples = [parameters[3].obj["estimate"] for sql, parameters in connection.statements if "INSERT INTO light_pollution_samples" in sql]
        self.assertEqual([sample["radiance"]["median"] for sample in samples], [0, 50])

    def test_internal_partial_failure_rolls_back_and_cannot_reach_final_publication(self) -> None:
        manifest, selected, thresholds, cells = self.candidate()
        connection = TransactionOracle(selected.index["source"], missing_overview=True)
        with mock.patch.object(pipeline.psycopg, "connect", return_value=connection), \
             self.assertRaisesRegex(raster.PipelineError, "spot_overview_missing"):
            pipeline._publish_transaction(manifest, selected, thresholds, cells, "oracle")
        self.assertTrue(connection.rolled_back)
        self.assertFalse(connection.committed)
        self.assertFalse(any("INSERT INTO published_dataset_versions" in sql for sql, _ in connection.statements))

    def test_wrong_root_or_missing_part_is_rejected_before_source_or_database_effect(self) -> None:
        with mock.patch.object(pipeline, "sha256_file", side_effect=AssertionError("must reject first")):
            with self.assertRaisesRegex(raster.PipelineError, "file_hash_invalid"):
                pipeline.prepare_sharded([self.first, self.second], self.output / "index.json", "0" * 64)
            with self.assertRaisesRegex(raster.PipelineError, "part_set_mismatch"):
                pipeline.prepare_sharded([self.first], self.output / "index.json", self.sealed["index"]["sha256"])


if __name__ == "__main__":
    unittest.main()
