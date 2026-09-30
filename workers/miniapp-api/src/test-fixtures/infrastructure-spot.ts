import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { TEST_PUBLISHED_SPOT, buildTestSpotDetail } from "@starward/miniapp-contracts/test-fixtures";
import type { SourceSummary } from "@starward/miniapp-contracts";
import { PostgresMiniappRepository } from "../postgres-repository.ts";
import { evaluateSpotCompleteness } from "../spot-completeness-policy.ts";

function digest(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export async function insertExplicitTestSpot(
  repository: PostgresMiniappRepository,
  options: { spotId?: string; status?: "PUBLISHED" | "DATA_INSUFFICIENT" } = {},
) {
  const verifiedAt = new Date().toISOString();
  const source: SourceSummary = {
    id: "source:integration:field-verification",
    kind: "OFFICIAL_VERIFICATION",
    provider: "隔离数据库集成测试",
    title: "生产形状的自动化核验记录",
    sourceUrl: "",
    license: "Project-owned automated integration record",
    licenseUrl: "",
    publishedAt: verifiedAt,
    retrievedAt: verifiedAt,
    validFrom: verifiedAt,
    validTo: null,
    state: "FRESH",
    confidence: 1,
    precision: "隔离测试数据",
    limitations: [],
  };
  const fixtureDetail = buildTestSpotDetail(TEST_PUBLISHED_SPOT.spotId)!;
  const detail = structuredClone(fixtureDetail);
  const spot = detail.spot;
  if (options.spotId) {
    spot.spotId = options.spotId as typeof spot.spotId;
    detail.evidence = detail.evidence.map((evidence) => ({
      ...evidence,
      subjectId: options.spotId!,
    }));
  }
  if (options.status) spot.status = options.status;
  spot.source = source;
  spot.lastVerifiedAt = verifiedAt;
  spot.lightPollution.source = source;
  spot.facilities = spot.facilities.map((facility) => ({
    ...facility,
    verifiedAt,
    source,
  }));
  spot.media = spot.media.map((media) => ({
    ...media,
    state: "FRESH",
    capturedAt: verifiedAt,
    sourceUrl: "https://example.com/integration-field-media.jpg",
    direction: "南",
  }));
  detail.route = {
    ...detail.route,
    state: "FRESH",
    source,
    lastRoad: "省道转两车道硬化支路，末段 1.2 公里无路灯",
    parkingGuidance: "入口东侧测试停车区；保持消防通道",
  };
  detail.evidence = detail.evidence.map((evidence) => ({
    ...evidence,
    sourceId: source.id,
    observedAt: verifiedAt,
    verifiedAt,
  }));
  detail.dataDisclosure = [source];
  const assessment = evaluateSpotCompleteness({
    detail,
    review: {
      actorId: "admin:integration",
      reason: "验证当前正式点发布门禁和状态往返",
    },
  });
  assert.equal(assessment.complete, true, JSON.stringify(assessment.issues));
  const client = await repository.pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `INSERT INTO data_source_registry(
         source_id, provider, license, license_url, payload
       ) VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (source_id) DO UPDATE SET payload = EXCLUDED.payload`,
      [
        source.id,
        source.provider,
        source.license,
        source.licenseUrl,
        source,
      ],
    );
    const current = await client.query<{ version: number }>(
      `INSERT INTO spots(
         spot_id, name, region, timezone, geom_wgs84, gcj02_lat, gcj02_lng,
         status, visibility_policy, source_id, payload, display_order
       ) VALUES (
         $1, $2, $3, $4,
         ST_SetSRID(ST_MakePoint($5, $6), 4326)::geography,
         $7, $8, $9, $10, $11, $12, 0
       )
       ON CONFLICT (spot_id) DO UPDATE SET
         name = EXCLUDED.name, region = EXCLUDED.region,
         timezone = EXCLUDED.timezone, geom_wgs84 = EXCLUDED.geom_wgs84,
         gcj02_lat = EXCLUDED.gcj02_lat, gcj02_lng = EXCLUDED.gcj02_lng,
         status = EXCLUDED.status, visibility_policy = EXCLUDED.visibility_policy,
         source_id = EXCLUDED.source_id, payload = EXCLUDED.payload,
         version = spots.version + 1
       RETURNING version`,
      [
        spot.spotId,
        spot.name,
        spot.region,
        spot.timezone,
        spot.wgs84.longitude,
        spot.wgs84.latitude,
        spot.gcj02.latitude,
        spot.gcj02.longitude,
        spot.status,
        spot.visibilityPolicy,
        spot.source.id,
        spot,
      ],
    );
    await client.query(
      `INSERT INTO spot_overview_read_models(
         spot_id, payload, dependency_digest
       ) VALUES ($1, $2, $3)
       ON CONFLICT (spot_id) DO UPDATE SET
         payload = EXCLUDED.payload,
         dependency_digest = EXCLUDED.dependency_digest,
         generated_at = now()`,
      [spot.spotId, detail, digest(detail)],
    );
    const revision = current.rows[0]!.version;
    const revisionId = `spot-revision:${spot.spotId}:${revision}`;
    // The direct fixture writer must seed the same trusted history as production.
    // Re-seeding advances the version; it must never overwrite an old snapshot.
    await client.query(
      `INSERT INTO spot_revisions(
         revision_id, spot_id, revision_no, spot_payload, detail_payload,
         payload_digest, source_ids, created_by, reason
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [revisionId, spot.spotId, revision, spot, detail, digest({ spot, detail }),
        JSON.stringify(detail.dataDisclosure.map((entry) => entry.id)),
        "admin:integration", "显式隔离集成测试种子"],
    );
    await client.query("UPDATE spots SET active_revision_id = $2 WHERE spot_id = $1",
      [spot.spotId, revisionId]);
    await client.query(
      `INSERT INTO spot_publication_assessments(
         spot_id, spot_revision, assessment_digest, complete, payload,
         reviewed_by, review_reason, assessed_at
       ) VALUES (
         $1, (SELECT version FROM spots WHERE spot_id = $1), $2, true, $3,
         'admin:integration', '显式隔离集成测试种子', now()
       )
       ON CONFLICT (spot_id) DO UPDATE SET
         spot_revision = EXCLUDED.spot_revision,
         assessment_digest = EXCLUDED.assessment_digest,
         complete = EXCLUDED.complete,
         payload = EXCLUDED.payload,
         reviewed_by = EXCLUDED.reviewed_by,
         review_reason = EXCLUDED.review_reason,
         assessed_at = EXCLUDED.assessed_at`,
      [spot.spotId, assessment.assessmentDigest, assessment],
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
  return spot;
}
