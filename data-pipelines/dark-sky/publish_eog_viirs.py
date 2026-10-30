"""Atomically publish validated EOG numerical products and immutable spot revisions.

The command keeps its existing import surface; eog_raster owns local input and
numerical preparation, while this module owns PostgreSQL publication only.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from dataclasses import dataclass, replace
from pathlib import Path
from typing import Any, Iterable, Mapping, Sequence

import psycopg
from psycopg.types.json import Jsonb

from eog_raster import (
    SOURCE_PAGE,
    LICENSE_URL,
    SOURCE_LICENSE,
    RADIANCE_UNIT,
    SOURCE_PROVIDER,
    METHOD_VERSION,
    MAX_NATIVE_GRID_CELLS,
    MANIFEST_KEYS,
    RASTER_KEYS,
    AOI_KEYS,
    BANDS,
    LABELS,
    PipelineError,
    RasterInput,
    Aoi,
    PublicationManifest,
    RasterSelection,
    RasterGrid,
    canonical_json,
    sha256_bytes,
    sha256_file,
    _exact_keys,
    _object,
    _number,
    _integer,
    _nonempty_string,
    _raster_input,
    load_manifest,
    verify_input_hashes,
    raster_uri,
    _same_transform,
    _bounded_window,
    read_selection,
    valid_mask,
    derive_thresholds,
    band_for_value,
    _statistics,
    _source_summary,
    _estimate,
    _pixel_slice,
    sample_point,
    _cell_bounds,
    _valid_rectangles,
    build_cells,
    prepare as prepare_legacy,
)
import eog_fixed_method as fixed
import eog_fixed_publication as fixed_publication
import eog_sharded_inventory as sharded


@dataclass(frozen=True)
class ShardedSelection:
    """A local, fully checked candidate; never a grant to publish or activate."""
    manifests: tuple[PublicationManifest, ...]
    grids: tuple[RasterGrid, ...]
    index: Mapping[str, Any]
    index_descriptor: Mapping[str, Any]
    source_files: tuple[tuple[Path, tuple[int, int, int, int]], ...]

    @property
    def resolution_degrees(self) -> tuple[float, float]:
        return self.grids[0].resolution_degrees


def _file_identity(path: Path) -> tuple[int, int, int, int]:
    info = path.stat()
    return info.st_dev, info.st_ino, info.st_size, info.st_mtime_ns


def _assert_candidate_files(selection: ShardedSelection) -> None:
    if any(_file_identity(path) != identity for path, identity in selection.source_files):
        raise PipelineError("nightlight_sharded_candidate_input_changed")


def prepare_sharded(paths: Sequence[Path], index_path: Path, index_sha256: str, *, node: str = "node"
                    ) -> tuple[PublicationManifest, ShardedSelection, tuple[float, ...], list[dict[str, Any]]]:
    if not paths or len(paths) > 4096 or not isinstance(index_sha256, str) or sharded.HASH_PATTERN.fullmatch(index_sha256) is None:
        raise PipelineError("nightlight_sharded_publication_input_invalid")
    index_path = index_path.absolute()
    if index_path.name != "index.json" or index_path.stat().st_size > sharded.MAX_ROOT_BYTES:
        raise PipelineError("nightlight_sharded_root_descriptor_invalid")
    pin = {"file": "index.json", "bytes": index_path.stat().st_size, "sha256": index_sha256}
    root = sharded.read_publication_index(index_path.parent, pin)
    manifests = tuple(load_manifest(path) for path in paths)
    if len(root["parts"]) != len(manifests):
        raise PipelineError("nightlight_sharded_part_set_mismatch")
    source_files: dict[Path, tuple[int, int, int, int]] = {index_path: _file_identity(index_path)}
    originals: dict[Path, str] = {}
    first = manifests[0]
    seen_parts = set()
    for manifest in manifests:
        if (manifest.fixed_raster is None or manifest.dataset_version != root.get("datasetVersion")
                or manifest.radiance.sha256 != root.get("radianceSha256") or manifest.coverage.sha256 != root.get("coverageSha256")
                or manifest.radiance.band != first.radiance.band or manifest.coverage.band != first.coverage.band
                or manifest.data_year != first.data_year or manifest.product_name != first.product_name
                or manifest.acquired_at != first.acquired_at or manifest.minimum_coverage != first.minimum_coverage):
            raise PipelineError("nightlight_sharded_source_identity_mismatch")
        part = manifest.fixed_raster["inventory"]["sha256"]
        declaration = root["parts"].get(part)
        if (part in seen_parts or not isinstance(declaration, dict)
                or declaration.get("sourceManifestSha256") != sha256_bytes(manifest.path.read_bytes())):
            raise PipelineError("nightlight_sharded_part_set_mismatch")
        seen_parts.add(part)
        source_files[manifest.path] = _file_identity(manifest.path)
        for item in (manifest.radiance, manifest.coverage):
            previous = originals.get(item.path)
            if previous is not None and previous != item.sha256:
                raise PipelineError("nightlight_sharded_source_identity_mismatch")
            originals[item.path] = item.sha256
    # Each distinct actual input file is hashed once, not once per prepared
    # part. A different path with the same claimed digest is not silently trusted.
    for path, expected in originals.items():
        before = _file_identity(path)
        if sha256_file(path) != expected:
            raise PipelineError("nightlight_sharded_source_sha256_mismatch")
        if _file_identity(path) != before:
            raise PipelineError("nightlight_sharded_candidate_input_changed")
        source_files[path] = before
    admitted = sharded.validate_publication(index_path.parent, pin, manifests, node=node)
    grids = admitted["grids"]
    if any(grid.raster_transform != grids[0].raster_transform or grid.resolution_degrees != grids[0].resolution_degrees for grid in grids):
        raise PipelineError("nightlight_sharded_source_grid_mismatch")
    identity = {"schemaVersion": 3, "datasetVersion": first.dataset_version,
                "shardedIndex": {**pin, "indexVersion": root["indexVersion"]}}
    manifest = replace(first, digest=sha256_bytes(canonical_json(identity).encode()))
    selection = ShardedSelection(manifests, grids, root, pin, tuple(source_files.items()))
    _assert_candidate_files(selection)
    return manifest, selection, fixed.THRESHOLDS, []


def sharded_publication_payload(manifest: PublicationManifest, selection: ShardedSelection) -> dict[str, Any]:
    return {"schemaVersion": 3, "datasetVersion": manifest.dataset_version, "productName": manifest.product_name,
            "dataYear": manifest.data_year, "source": selection.index["source"],
            "minimumCloudFreeObservations": manifest.minimum_coverage,
            "methodVersion": fixed.POLICY["methodVersion"], "styleVersion": fixed.POLICY["styleVersion"],
            "policy": fixed.POLICY, "policySha256": fixed.POLICY_SHA256,
            "shardedIndex": {**selection.index_descriptor, "indexVersion": selection.index["indexVersion"]},
            "coverage": selection.index["coverage"], "radianceUnit": RADIANCE_UNIT, "calibratedSkyClass": False}


def prepare(path: Path) -> tuple[PublicationManifest, RasterSelection, tuple[float, ...], list[dict[str, Any]]]:
    manifest = load_manifest(path)
    if manifest.fixed_raster is None:
        return prepare_legacy(path)
    verify_input_hashes(manifest)
    selection = read_selection(manifest)
    fixed_publication.validate_aoi_alignment(manifest, selection)
    fixed_publication.read_inventory(manifest, selection.resolution_degrees)
    return manifest, selection, fixed.THRESHOLDS, []


def _read_database_url() -> str:
    value = os.environ.get("DATABASE_URL", "").strip()
    if not value:
        raise PipelineError("DATABASE_URL_required")
    return value


def _spot_rows(connection: psycopg.Connection[Any], aoi: Aoi) -> list[dict[str, Any]]:
    rows = connection.execute(
        """
        SELECT spot_id,
               ST_X(geom_wgs84::geometry) AS longitude,
               ST_Y(geom_wgs84::geometry) AS latitude,
               payload
          FROM spots
         WHERE visibility_policy <> 'HIDDEN'
           AND ST_Intersects(
                 geom_wgs84::geometry,
                 ST_MakeEnvelope(%s, %s, %s, %s, 4326)
               )
         ORDER BY spot_id
         FOR UPDATE
        """,
        (aoi.west, aoi.south, aoi.east, aoi.north),
    ).fetchall()
    return _spot_records(rows)


def _spot_rows_for_parts(connection: psycopg.Connection[Any], manifests: Sequence[PublicationManifest]) -> list[dict[str, Any]]:
    # EXISTS returns each spot once even for overlapping source parts. Native
    # AREA footprints are west/north inclusive and east/south exclusive, the
    # same floor-based ownership as the source sampler; no gap is published by
    # taking an envelope over the entire collection.
    rows = connection.execute(
        """
        SELECT s.spot_id, ST_X(s.geom_wgs84::geometry), ST_Y(s.geom_wgs84::geometry), s.payload
          FROM spots s
         WHERE s.visibility_policy <> 'HIDDEN'
           AND EXISTS (
             SELECT 1 FROM jsonb_to_recordset(%s::jsonb)
               AS a(west double precision, south double precision, east double precision, north double precision)
             WHERE ST_Intersects(s.geom_wgs84::geometry, ST_MakeEnvelope(a.west, a.south, a.east, a.north, 4326))
               AND ST_X(s.geom_wgs84::geometry) >= a.west AND ST_X(s.geom_wgs84::geometry) < a.east
               AND ST_Y(s.geom_wgs84::geometry) <= a.north AND ST_Y(s.geom_wgs84::geometry) > a.south
           )
         ORDER BY s.spot_id
         FOR UPDATE OF s
        """,
        (Jsonb([dict(manifest.raw["aoi"]) for manifest in manifests]),),
    ).fetchall()
    return _spot_records(rows)


def _spot_records(rows: Sequence[Any]) -> list[dict[str, Any]]:
    return [
        {
            "spot_id": row[0],
            "longitude": float(row[1]),
            "latitude": float(row[2]),
            "payload": row[3],
        }
        for row in rows
    ]


def _read_model_digest(value: Mapping[str, Any]) -> str:
    return sha256_bytes(canonical_json(value).encode("utf-8"))


def _record_spot_revision(
    connection: psycopg.Connection[Any],
    spot_id: str,
    revision: int,
    spot: Mapping[str, Any],
    detail: Mapping[str, Any],
    *,
    actor: str,
    reason: str,
) -> None:
    """Append the locked current projection; never replace existing history."""
    if detail.get("spot") != spot:
        raise PipelineError("spot_revision_projection_mismatch")
    revision_id = f"spot-revision:{spot_id}:{revision}"
    source_ids = list(dict.fromkeys(
        item["id"] for item in detail.get("dataDisclosure", [])
        if isinstance(item, dict) and isinstance(item.get("id"), str)
    ))
    connection.execute(
        """
        INSERT INTO spot_revisions(
          revision_id, spot_id, revision_no, spot_payload, detail_payload,
          payload_digest, source_ids, created_by, reason
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """,
        (revision_id, spot_id, revision, Jsonb(spot), Jsonb(detail),
         _read_model_digest({"spot": spot, "detail": detail}),
         Jsonb(source_ids), actor, reason),
    )
    updated = connection.execute(
        "UPDATE spots SET active_revision_id = %s WHERE spot_id = %s AND version = %s",
        (revision_id, spot_id, revision),
    )
    if updated.rowcount != 1:
        raise PipelineError("spot_revision_changed")


def _wkt_polygon(bounds: Mapping[str, float]) -> str:
    west, south, east, north = (
        bounds["west"],
        bounds["south"],
        bounds["east"],
        bounds["north"],
    )
    return (
        f"POLYGON(({west} {south},{east} {south},{east} {north},"
        f"{west} {north},{west} {south}))"
    )


def _replace_disclosure(
    detail: dict[str, Any], old_source_id: str | None, source: Mapping[str, Any]
) -> None:
    disclosure = detail.get("dataDisclosure")
    values = disclosure if isinstance(disclosure, list) else []
    filtered = [
        item
        for item in values
        if isinstance(item, dict)
        and item.get("id") not in {old_source_id, source["id"]}
    ]
    filtered.append(dict(source))
    detail["dataDisclosure"] = filtered


def publish(
    manifest: PublicationManifest,
    selection: RasterSelection | ShardedSelection,
    thresholds: Sequence[float],
    cells: Sequence[Mapping[str, Any]],
    database_url: str,
) -> dict[str, Any]:
    # A prepared schema-3 root proves local source/numeric/display facts only.
    # Formal static readback and coordinated consumers are not established.
    # There is deliberately no flag, receipt file or alternate CLI to override
    # this boundary; legacy schema-1/2 publication keeps its existing path.
    if isinstance(selection, ShardedSelection):
        raise PipelineError("nightlight_sharded_publication_not_ready")
    return _publish_transaction(manifest, selection, thresholds, cells, database_url)


def _publish_transaction(
    manifest: PublicationManifest,
    selection: RasterSelection | ShardedSelection,
    thresholds: Sequence[float],
    cells: Sequence[Mapping[str, Any]],
    database_url: str,
) -> dict[str, Any]:
    is_sharded = isinstance(selection, ShardedSelection)
    if is_sharded:
        _assert_candidate_files(selection)
    is_fixed = manifest.fixed_raster is not None
    if is_fixed and (tuple(thresholds) != fixed.THRESHOLDS or cells):
        raise PipelineError("fixed_publication_requires_fixed_statistics_and_rasters")
    source = selection.index["source"] if is_sharded else (fixed.source_summary if is_fixed else _source_summary)(manifest, selection.resolution_degrees)
    fixed_payload = sharded_publication_payload(manifest, selection) if is_sharded else fixed_publication.publication_payload(manifest, selection) if is_fixed else None
    with psycopg.connect(database_url) as connection:
        connection.execute(
            "SELECT pg_advisory_xact_lock(hashtextextended('starward-dark-sky-publication', 0))"
        )
        required = connection.execute(
            "SELECT to_regclass('public.dark_sky_dataset_publications'), to_regclass('public.dark_sky_grid_cells'), to_regclass('public.spot_revisions')"
        ).fetchone()
        if required is None or any(table is None for table in required):
            raise PipelineError("dark_sky_schema_missing_run_migrations")
        existing = connection.execute(
            "SELECT manifest_sha256, state FROM dark_sky_dataset_publications WHERE dataset_version = %s",
            (manifest.dataset_version,),
        ).fetchone()
        if existing is not None:
            if existing[0] != manifest.digest:
                raise PipelineError("dataset_version_digest_conflict")
            if existing[1] == "PUBLISHED":
                sample_count = connection.execute(
                    "SELECT count(*) FROM light_pollution_samples WHERE dataset_version = %s",
                    (manifest.dataset_version,),
                ).fetchone()[0]
                cell_count = connection.execute(
                    "SELECT count(*) FROM dark_sky_grid_cells WHERE dataset_version = %s",
                    (manifest.dataset_version,),
                ).fetchone()[0]
                return {
                    "status": "already_published",
                    "datasetVersion": manifest.dataset_version,
                    "manifestSha256": manifest.digest,
                    "radianceSha256": manifest.radiance.sha256,
                    "coverageSha256": manifest.coverage.sha256,
                    "sampleCount": int(sample_count),
                    "cellCount": int(cell_count),
                    "changedSpotCount": 0,
                }

        connection.execute(
            """
            INSERT INTO data_source_registry(source_id, provider, license, license_url, payload)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (source_id) DO NOTHING
            """,
            (source["id"], source["provider"], source["license"], source["licenseUrl"], Jsonb(source)),
        )
        stored_source = connection.execute(
            "SELECT payload FROM data_source_registry WHERE source_id = %s", (source["id"],)
        ).fetchone()
        if stored_source is None or stored_source[0] != source:
            raise PipelineError("source_identity_conflict")
        publication_payload = fixed_payload if is_fixed else {
            "schemaVersion": 1,
            "datasetVersion": manifest.dataset_version,
            "productName": manifest.product_name,
            "dataYear": manifest.data_year,
            "source": source,
            "aoi": manifest.raw["aoi"],
            "minimumCloudFreeObservations": manifest.minimum_coverage,
            "gridStridePixels": manifest.grid_stride,
            "relativeBandThresholds": [round(float(value), 9) for value in thresholds],
            "relativeBandMethod": "full-valid-AOI-radiance-quantiles-20-40-60-80",
            "radianceUnit": RADIANCE_UNIT,
            "calibratedSkyClass": False,
        }
        connection.execute(
            """
            INSERT INTO dark_sky_dataset_publications(
              dataset_version, source_id, product_name, data_year,
              manifest_sha256, radiance_sha256, coverage_sha256,
              state, payload, validated_at
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, 'VALIDATED', %s, now())
            ON CONFLICT (dataset_version) DO UPDATE SET
              state = 'VALIDATED', payload = EXCLUDED.payload, validated_at = now()
            """,
            (
                manifest.dataset_version,
                source["id"],
                manifest.product_name,
                manifest.data_year,
                manifest.digest,
                manifest.radiance.sha256,
                manifest.coverage.sha256,
                Jsonb(publication_payload),
            ),
        )
        connection.execute(
            "DELETE FROM dark_sky_grid_cells WHERE dataset_version = %s",
            (manifest.dataset_version,),
        )
        for cell in cells:
            connection.execute(
                """
                INSERT INTO dark_sky_grid_cells(dataset_version, cell_id, geom_wgs84, state, payload)
                VALUES (%s, %s, ST_GeomFromText(%s, 4326), %s, %s)
                """,
                (
                    manifest.dataset_version,
                    cell["cellId"],
                    _wkt_polygon(cell["boundsWgs84"]),
                    cell["state"],
                    Jsonb(cell),
                ),
            )

        spots = _spot_rows_for_parts(connection, selection.manifests) if is_sharded else _spot_rows(connection, manifest.aoi)
        changed_spot_count = 0
        sample_count = 0
        for row in spots:
            estimate = fixed_publication.sample_source_point(manifest, source, selection.grids, row["longitude"], row["latitude"]) if is_sharded else fixed_publication.sample_point(selection, manifest, source, row["longitude"], row["latitude"]) if is_fixed else sample_point(
                selection,
                manifest,
                source,
                thresholds,
                row["longitude"],
                row["latitude"],
            )
            connection.execute(
                """
                INSERT INTO light_pollution_samples(
                  spot_id, dataset_version, state, payload, source_id
                ) VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT (spot_id, dataset_version) DO UPDATE SET
                  state = EXCLUDED.state,
                  payload = EXCLUDED.payload,
                  source_id = EXCLUDED.source_id
                """,
                (
                    row["spot_id"],
                    manifest.dataset_version,
                    estimate["state"],
                    Jsonb({"estimate": estimate, "samplePixels": "3x3", "runtimeClaim": False}),
                    source["id"],
                ),
            )
            sample_count += 1
            spot = dict(row["payload"])
            previous = spot.get("lightPollution")
            if previous == estimate:
                continue
            old_source_id = (
                previous.get("source", {}).get("id") if isinstance(previous, dict) else None
            )
            spot["lightPollution"] = estimate
            detail_row = connection.execute(
                "SELECT payload FROM spot_overview_read_models WHERE spot_id = %s FOR UPDATE",
                (row["spot_id"],),
            ).fetchone()
            if detail_row is None:
                raise PipelineError("spot_overview_missing")
            updated = connection.execute(
                """
                UPDATE spots
                   SET payload = %s, version = version + 1, updated_at = now()
                 WHERE spot_id = %s
                 RETURNING version
                """,
                (Jsonb(spot), row["spot_id"]),
            ).fetchone()
            if updated is None:
                raise PipelineError("spot_revision_missing")
            detail = dict(detail_row[0])
            detail["spot"] = spot
            _replace_disclosure(detail, old_source_id, source)
            connection.execute(
                """
                UPDATE spot_overview_read_models
                   SET payload = %s, dependency_digest = %s, generated_at = now()
                 WHERE spot_id = %s
                """,
                (Jsonb(detail), _read_model_digest(detail), row["spot_id"]),
            )
            _record_spot_revision(
                connection, row["spot_id"], updated[0], spot, detail,
                actor="system:dark-sky-publication",
                reason=f"Published annual night-light dataset {manifest.dataset_version}",
            )
            for table in ("map_spot_summaries", "favorite_spot_summaries"):
                connection.execute(
                    f"UPDATE {table} SET payload = %s, generated_at = now() WHERE spot_id = %s",
                    (Jsonb(spot), row["spot_id"]),
                )
            changed_spot_count += 1

        if is_sharded:
            _assert_candidate_files(selection)
        connection.execute(
            "DELETE FROM map_layer_snapshots WHERE layer_kind = 'LIGHT_POLLUTION'"
        )
        connection.execute(
            """
            INSERT INTO published_dataset_versions(
              dataset_kind, dataset_version, state, manifest, published_at
            ) VALUES ('DARK_SKY', %s, 'PUBLISHED', %s, now())
            ON CONFLICT (dataset_kind, dataset_version) DO UPDATE SET
              state = 'PUBLISHED', manifest = EXCLUDED.manifest, published_at = now()
            """,
            (manifest.dataset_version, Jsonb(publication_payload)),
        )
        connection.execute(
            """
            UPDATE dark_sky_dataset_publications
               SET state = 'PUBLISHED', published_at = now()
             WHERE dataset_version = %s
            """,
            (manifest.dataset_version,),
        )
        return {
            "status": "published",
            "datasetVersion": manifest.dataset_version,
            "manifestSha256": manifest.digest,
            "radianceSha256": manifest.radiance.sha256,
            "coverageSha256": manifest.coverage.sha256,
            "sampleCount": sample_count,
            "cellCount": len(cells),
            "changedSpotCount": changed_spot_count,
        }


def main(argv: Iterable[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--manifest", type=Path, required=True, action="append")
    parser.add_argument("--sharded-index", type=Path)
    parser.add_argument("--sharded-index-sha256")
    parser.add_argument("--prepare-only", action="store_true")
    args = parser.parse_args(list(argv) if argv is not None else None)
    try:
        if args.sharded_index is not None or args.sharded_index_sha256 is not None:
            if args.sharded_index is None or args.sharded_index_sha256 is None:
                raise PipelineError("nightlight_sharded_publication_input_invalid")
            if not args.prepare_only:
                raise PipelineError("nightlight_sharded_publication_not_ready")
            manifest, selection, _, _ = prepare_sharded(args.manifest, args.sharded_index, args.sharded_index_sha256)
            result = {"status": "prepared", "authority": "PREPARED_ONLY", "datasetVersion": manifest.dataset_version,
                      "manifestSha256": manifest.digest, "candidate": sharded_publication_payload(manifest, selection),
                      "databasePublication": False, "formalReady": False}
        else:
            if len(args.manifest) != 1 or args.prepare_only:
                raise PipelineError("nightlight_publication_arguments_invalid")
            manifest, selection, thresholds, cells = prepare(args.manifest[0])
            result = publish(manifest, selection, thresholds, cells, _read_database_url())
    except PipelineError as error:
        print(canonical_json({"status": "failed", "error": str(error)}), file=sys.stderr)
        return 1
    except Exception:
        print(
            canonical_json({"status": "failed", "error": "unexpected_publication_failure"}),
            file=sys.stderr,
        )
        return 1
    print(canonical_json(result))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
