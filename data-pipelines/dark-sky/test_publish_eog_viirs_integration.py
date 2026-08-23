from __future__ import annotations

import dataclasses
import hashlib
import json
import os
import tempfile
import unittest
from pathlib import Path

import numpy as np
import psycopg
import rasterio
from rasterio.transform import from_origin
from psycopg.types.json import Jsonb

import publish_eog_viirs as pipeline


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
              23.0, 114.0, 'PUBLISHED', 'PUBLIC', %s, %s, 1
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
    return source_id, spot_id


def remove_fixture(database_url: str, dataset_version: str, source_id: str, spot_id: str) -> None:
    with psycopg.connect(database_url) as connection:
        publication_source = connection.execute(
            "SELECT source_id FROM dark_sky_dataset_publications WHERE dataset_version = %s",
            (dataset_version,),
        ).fetchone()
        connection.execute("DELETE FROM spots WHERE spot_id = %s", (spot_id,))
        connection.execute(
            "DELETE FROM dark_sky_grid_cells WHERE dataset_version = %s", (dataset_version,)
        )
        connection.execute(
            "DELETE FROM dark_sky_dataset_publications WHERE dataset_version = %s",
            (dataset_version,),
        )
        connection.execute(
            "DELETE FROM published_dataset_versions WHERE dataset_kind = 'DARK_SKY' AND dataset_version = %s",
            (dataset_version,),
        )
        removable_sources = [source_id]
        if publication_source is not None:
            removable_sources.append(publication_source[0])
        connection.execute(
            "DELETE FROM data_source_registry WHERE source_id = ANY(%s)",
            (removable_sources,),
        )


@unittest.skipUnless(os.environ.get("DATABASE_URL", "").strip(), "DATABASE_URL not configured")
class EogViirsDatabaseIntegrationTest(unittest.TestCase):
    def setUp(self) -> None:
        self.database_url = os.environ["DATABASE_URL"].strip()
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
        remove_fixture(
            self.database_url,
            self.dataset_version,
            self.spot_source_id,
            self.spot_id,
        )
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
        conflicting = dataclasses.replace(manifest, digest="f" * 64)
        with self.assertRaisesRegex(pipeline.PipelineError, "dataset_version_digest_conflict"):
            pipeline.publish(
                conflicting, selection, thresholds, cells, self.database_url
            )


if __name__ == "__main__":
    unittest.main()
