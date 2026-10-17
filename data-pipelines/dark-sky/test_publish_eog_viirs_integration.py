from __future__ import annotations

import dataclasses
import hashlib
import json
import os
import tempfile
import unittest
from pathlib import Path
from urllib.parse import urlparse

import numpy as np
import psycopg
import rasterio
from rasterio.transform import from_origin
from psycopg.types.json import Jsonb

import publish_eog_viirs as pipeline
from test_eog_fixed_publication import prepare_fixture
import eog_fixed_method as fixed


def seed_spot(database_url: str, run_id: str) -> tuple[str, str]:
    source_id = f"source:test:eog-{run_id}"
    spot_id = f"spot:test:eog-{run_id}"
    source = {
        "id": source_id,
        "provider": "Starward integration test",
        "license": "Test fixture only",
        "licenseUrl": "https://example.invalid/test-fixture",
    }
    spot = {
        "spotId": spot_id,
        "name": "EOG pipeline integration point",
        "region": "Synthetic AOI",
        "timezone": "Asia/Shanghai",
    }
    detail = {"spot": spot, "dataDisclosure": [source]}
    with psycopg.connect(database_url) as connection:
        connection.execute(
            """
            INSERT INTO data_source_registry(source_id, provider, license, license_url, payload)
            VALUES (%s, %s, %s, %s, %s)
            """,
            (source_id, source["provider"], source["license"], source["licenseUrl"], Jsonb(source)),
        )
        connection.execute(
            """
            INSERT INTO spots(
              spot_id, name, region, timezone, geom_wgs84, gcj02_lat, gcj02_lng,
              status, visibility_policy, source_id, payload, display_order
            ) VALUES (
              %s, %s, %s, %s, ST_SetSRID(ST_MakePoint(114.0, 23.0), 4326)::geography,
              23.0, 114.0, 'PUBLISHED', 'PUBLIC_EXACT', %s, %s, 1
            )
            """,
            (spot_id, spot["name"], spot["region"], spot["timezone"], source_id, Jsonb(spot)),
        )
        connection.execute(
            """
            INSERT INTO spot_overview_read_models(spot_id, payload, dependency_digest)
            VALUES (%s, %s, %s)
            """,
            (spot_id, Jsonb(detail), f"fixture-{run_id}"),
        )
        for table in ("map_spot_summaries", "favorite_spot_summaries"):
            connection.execute(
                f"INSERT INTO {table}(spot_id, payload) VALUES (%s, %s)",
                (spot_id, Jsonb(spot)),
            )
        revision_id = f"spot-revision:{spot_id}:1"
        connection.execute(
            """
            INSERT INTO spot_revisions(
              revision_id, spot_id, revision_no, spot_payload, detail_payload,
              payload_digest, source_ids, created_by, reason
            ) VALUES (%s, %s, 1, %s, %s, %s, %s, 'system:integration', 'Original test baseline')
            """,
            (revision_id, spot_id, Jsonb(spot), Jsonb(detail),
             hashlib.sha256(json.dumps({"spot": spot, "detail": detail}, sort_keys=True).encode()).hexdigest(),
             Jsonb([source_id])),
        )
        connection.execute(
            "UPDATE spots SET active_revision_id = %s WHERE spot_id = %s",
            (revision_id, spot_id),
        )
    return source_id, spot_id


@unittest.skipUnless(os.environ.get("DATABASE_URL", "").strip(), "DATABASE_URL not configured")
class EogViirsDatabaseIntegrationTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        # Publishing intentionally changes every spot in the AOI. The caller
        # must own a fresh disposable database and drop it after this suite;
        # immutable history is never deleted or its guards relaxed by tests.
        cls.database_url = os.environ["DATABASE_URL"].strip()
        if not urlparse(cls.database_url).path.startswith("/starward_eog_test_"):
            raise RuntimeError("fresh_disposable_eog_database_required")
        with psycopg.connect(cls.database_url) as connection:
            if connection.execute("SELECT count(*) FROM spots").fetchone()[0]:
                raise RuntimeError("fresh_disposable_eog_database_required")

    def setUp(self) -> None:
        self.temporary_directory = tempfile.TemporaryDirectory()
        self.root = Path(self.temporary_directory.name)
        self.radiance_path = self.root / "radiance.tif"
        self.coverage_path = self.root / "coverage.tif"
        transform = from_origin(112.0, 25.0, 0.25, 0.25)
        radiance = np.arange(256, dtype="float32").reshape(16, 16)
        coverage = np.full((16, 16), 12, dtype="uint16")
        for path, values, dtype in (
            (self.radiance_path, radiance, "float32"),
            (self.coverage_path, coverage, "uint16"),
        ):
            with rasterio.open(
                path,
                "w",
                driver="GTiff",
                width=16,
                height=16,
                count=1,
                dtype=dtype,
                crs="EPSG:4326",
                transform=transform,
            ) as dataset:
                dataset.write(values, 1)
        run_id = hashlib.sha256(os.urandom(32)).hexdigest()[:16]
        self.dataset_version = f"eog-integration-{run_id}"
        self.spot_source_id, self.spot_id = seed_spot(self.database_url, run_id)
        manifest = {
            "schemaVersion": 1,
            "datasetVersion": self.dataset_version,
            "productName": "Synthetic EOG-compatible integration raster",
            "dataYear": 2024,
            "sourceUrl": pipeline.SOURCE_PAGE,
            "licenseUrl": pipeline.LICENSE_URL,
            "acquiredAt": "2026-08-23T00:00:00Z",
            "radiance": {
                "file": self.radiance_path.name,
                "sha256": hashlib.sha256(self.radiance_path.read_bytes()).hexdigest(),
                "band": 1,
            },
            "cloudFreeCoverage": {
                "file": self.coverage_path.name,
                "sha256": hashlib.sha256(self.coverage_path.read_bytes()).hexdigest(),
                "band": 1,
            },
            "aoi": {"west": 112.5, "south": 21.5, "east": 115.5, "north": 24.5},
            "minimumCloudFreeObservations": 3,
            "gridStridePixels": 4,
        }
        self.manifest_path = self.root / "manifest.json"
        self.manifest_path.write_text(json.dumps(manifest), encoding="utf-8")

    def tearDown(self) -> None:
        self.temporary_directory.cleanup()

    def test_atomic_publication_read_models_idempotency_and_conflict(self) -> None:
        manifest, selection, thresholds, cells = pipeline.prepare(self.manifest_path)

        first = pipeline.publish(
            manifest, selection, thresholds, cells, self.database_url
        )
        second = pipeline.publish(
            manifest, selection, thresholds, cells, self.database_url
        )

        self.assertEqual(first["status"], "published")
        self.assertGreaterEqual(first["sampleCount"], 1)
        self.assertGreaterEqual(first["changedSpotCount"], 1)
        self.assertLessEqual(first["cellCount"], pipeline.MAX_NATIVE_GRID_CELLS)
        self.assertEqual(second["status"], "already_published")
        with psycopg.connect(self.database_url) as connection:
            publication = connection.execute(
                "SELECT state, manifest_sha256 FROM dark_sky_dataset_publications WHERE dataset_version = %s",
                (self.dataset_version,),
            ).fetchone()
            self.assertEqual(publication, ("PUBLISHED", manifest.digest))
            sample = connection.execute(
                "SELECT payload -> 'estimate' FROM light_pollution_samples WHERE dataset_version = %s LIMIT 1",
                (self.dataset_version,),
            ).fetchone()
            self.assertIsNotNone(sample)
            self.assertIsNone(sample[0]["levelAtMost"])
            self.assertFalse(sample[0]["calibratedSkyClass"])
            synchronized = connection.execute(
                """
                SELECT count(*)::integer
                  FROM spots s
                  JOIN spot_overview_read_models r USING (spot_id)
                 WHERE s.payload -> 'lightPollution' = r.payload -> 'spot' -> 'lightPollution'
                   AND s.payload -> 'lightPollution' ->> 'datasetVersion' = %s
                """,
                (self.dataset_version,),
            ).fetchone()[0]
            self.assertGreaterEqual(synchronized, 1)
            # Feedback must be able to find the exact immutable baseline of the
            # version it receives, while the previous baseline remains intact.
            current = connection.execute(
                """
                SELECT s.version, s.payload, r.payload, h.spot_payload, h.detail_payload
                  FROM spots s JOIN spot_overview_read_models r USING (spot_id)
                  JOIN spot_revisions h ON h.revision_id = s.active_revision_id
                 WHERE s.spot_id = %s AND h.revision_no = s.version
                """, (self.spot_id,),
            ).fetchone()
            self.assertIsNotNone(current, "published spot has no exact current immutable feedback baseline")
            self.assertEqual(current[0], 2, "idempotent publication must not advance the canonical version again")
            self.assertEqual(current[1], current[3])
            self.assertEqual(current[2], current[4])
            original = connection.execute(
                "SELECT spot_payload, detail_payload FROM spot_revisions WHERE spot_id = %s AND revision_no = 1",
                (self.spot_id,),
            ).fetchone()
            self.assertNotIn("lightPollution", original[0])
            self.assertEqual(original[1]["dataDisclosure"][0]["id"], self.spot_source_id)
            self.assertEqual(connection.execute(
                "SELECT count(*) FROM spot_revisions WHERE spot_id = %s", (self.spot_id,),
            ).fetchone()[0], 2)
        conflicting = dataclasses.replace(manifest, digest="f" * 64)
        with self.assertRaisesRegex(pipeline.PipelineError, "dataset_version_digest_conflict"):
            pipeline.publish(
                conflicting, selection, thresholds, cells, self.database_url
            )

    def test_fixed_publication_advances_complete_revisions_and_keeps_the_legacy_dataset_immutable(self) -> None:
        legacy, legacy_selection, legacy_thresholds, legacy_cells = pipeline.prepare(self.manifest_path)
        pipeline.publish(legacy, legacy_selection, legacy_thresholds, legacy_cells, self.database_url)
        with psycopg.connect(self.database_url) as connection:
            old_publication = connection.execute(
                "SELECT payload FROM dark_sky_dataset_publications WHERE dataset_version = %s", (legacy.dataset_version,),
            ).fetchone()[0]
            old_revision = connection.execute(
                "SELECT spot_payload, detail_payload FROM spot_revisions WHERE spot_id = %s AND revision_no = 2", (self.spot_id,),
            ).fetchone()
        fixture = self.root / "fixed"
        fixture.mkdir()
        _, manifest_path = prepare_fixture(fixture, self.dataset_version + "-fixed")
        manifest, selection, thresholds, cells = pipeline.prepare(manifest_path)
        first = pipeline.publish(manifest, selection, thresholds, cells, self.database_url)
        second = pipeline.publish(manifest, selection, thresholds, cells, self.database_url)
        self.assertEqual(first["status"], "published")
        self.assertEqual(first["cellCount"], 0)
        self.assertGreaterEqual(first["sampleCount"], 1)
        self.assertEqual(second["status"], "already_published")
        with psycopg.connect(self.database_url) as connection:
            current = connection.execute(
                """SELECT s.version, s.payload, r.payload, h.spot_payload, h.detail_payload
                     FROM spots s JOIN spot_overview_read_models r USING (spot_id)
                     JOIN spot_revisions h ON h.revision_id = s.active_revision_id
                    WHERE s.spot_id = %s AND h.revision_no = s.version""", (self.spot_id,),
            ).fetchone()
            self.assertEqual(current[0], 3)
            self.assertEqual(current[1], current[3])
            self.assertEqual(current[2], current[4])
            self.assertEqual(current[1]["lightPollution"]["method"], fixed.POLICY["methodVersion"])
            self.assertEqual(current[1]["lightPollution"]["datasetVersion"], manifest.dataset_version)
            self.assertEqual(current[1]["lightPollution"]["quality"]["requestedPixelCount"], 9)
            self.assertEqual(connection.execute(
                "SELECT spot_payload, detail_payload FROM spot_revisions WHERE spot_id = %s AND revision_no = 2", (self.spot_id,),
            ).fetchone(), old_revision)
            self.assertEqual(connection.execute(
                "SELECT payload FROM dark_sky_dataset_publications WHERE dataset_version = %s", (legacy.dataset_version,),
            ).fetchone()[0], old_publication)
            new_payload = connection.execute(
                "SELECT payload FROM dark_sky_dataset_publications WHERE dataset_version = %s", (manifest.dataset_version,),
            ).fetchone()[0]
            self.assertEqual(new_payload["schemaVersion"], 2)
            self.assertEqual(new_payload["rasterInventory"]["assetCount"], 1)
            self.assertEqual(new_payload["methodVersion"], current[1]["lightPollution"]["method"])
            self.assertNotIn("relativeBandThresholds", new_payload)

    def test_missing_overview_rolls_back_the_whole_publication(self) -> None:
        manifest, selection, thresholds, cells = pipeline.prepare(self.manifest_path)
        with psycopg.connect(self.database_url) as connection:
            connection.execute("DELETE FROM spot_overview_read_models WHERE spot_id = %s", (self.spot_id,))
            before = connection.execute(
                "SELECT spot_id, version, active_revision_id, payload FROM spots ORDER BY spot_id"
            ).fetchall()
        with self.assertRaisesRegex(pipeline.PipelineError, "spot_overview_missing"):
            pipeline.publish(manifest, selection, thresholds, cells, self.database_url)
        with psycopg.connect(self.database_url) as connection:
            self.assertEqual(connection.execute(
                "SELECT spot_id, version, active_revision_id, payload FROM spots ORDER BY spot_id"
            ).fetchall(), before)
            for table in ("dark_sky_dataset_publications", "dark_sky_grid_cells", "light_pollution_samples"):
                self.assertEqual(connection.execute(
                    f"SELECT count(*) FROM {table} WHERE dataset_version = %s", (self.dataset_version,),
                ).fetchone()[0], 0)


if __name__ == "__main__":
    unittest.main()
