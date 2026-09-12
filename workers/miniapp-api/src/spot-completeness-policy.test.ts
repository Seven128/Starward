import assert from "node:assert/strict";
import test from "node:test";
import type { SourceSummary, SpotDetail } from "@starward/miniapp-contracts";
import {
  buildTestSpotDetail,
  TEST_PUBLISHED_SPOT,
} from "@starward/miniapp-contracts/test-fixtures";
import { evaluateSpotCompleteness } from "./spot-completeness-policy.ts";

const NOW = new Date("2026-08-23T12:00:00.000Z");
const VERIFIED_AT = "2026-08-22T08:00:00.000Z";
const SOURCE: SourceSummary = {
  id: "source:operator:field-check:current",
  kind: "OFFICIAL_VERIFICATION",
  provider: "今晚去观星点位核验",
  title: "自动化政策测试中的生产形状现场核验",
  sourceUrl: "",
  license: "Project-owned verification record",
  licenseUrl: "",
  publishedAt: VERIFIED_AT,
  retrievedAt: VERIFIED_AT,
  validFrom: VERIFIED_AT,
  validTo: null,
  state: "FRESH",
  confidence: 0.95,
  precision: "测试只验证发布策略，不陈述真实地点事实",
  limitations: [],
};

test("legacy optional fields do not crash or replace missing core evidence", () => {
  const detail = completeDetail();
  delete (detail.spot.lightPollution as Partial<typeof detail.spot.lightPollution>).radiance;
  delete (detail as Partial<SpotDetail>).evidence;
  delete (detail as Partial<SpotDetail>).accessAndSafety;
  delete (detail as Partial<SpotDetail>).siteMediaState;
  const result = evaluateSpotCompleteness({ detail, now: NOW,
    review: { actorId: "policy-test", reason: "Check legacy data without publishing" } });
  assert.equal(result.complete, false);
  assert.ok(result.issues.some((issue) => issue.code === "required_evidence_missing_or_stale"));
  assert.ok(result.issues.some((issue) => issue.code === "night_safety_unknown"));
});

function completeDetail(): SpotDetail {
  const fixture = buildTestSpotDetail(TEST_PUBLISHED_SPOT.spotId);
  assert.ok(fixture);
  const detail = structuredClone(fixture);
  detail.spot.source = SOURCE;
  detail.spot.lightPollution.source = SOURCE;
  detail.spot.lastVerifiedAt = VERIFIED_AT;
  detail.spot.facilities = detail.spot.facilities.map((facility) => ({
    ...facility,
    verifiedAt: VERIFIED_AT,
    source: SOURCE,
  }));
  detail.spot.media = detail.spot.media.map((media) => ({
    ...media,
    state: "FRESH",
    sourceUrl: "https://example.com/field-media.jpg",
    capturedAt: VERIFIED_AT,
    direction: "南",
  }));
  detail.route = {
    ...detail.route,
    lastRoad: "省道转两车道硬化支路，末段 1.2 公里无路灯",
    parkingGuidance: "入口东侧已核验停车区，夜间保留消防通道",
    source: SOURCE,
    state: "FRESH",
  };
  detail.evidence = detail.evidence.map((evidence) => ({
    ...evidence,
    sourceId: SOURCE.id,
    observedAt: VERIFIED_AT,
    verifiedAt: VERIFIED_AT,
  }));
  detail.dataDisclosure = [SOURCE];
  return detail;
}

function assess(detail: SpotDetail) {
  return evaluateSpotCompleteness({
    detail,
    review: { actorId: "admin:policy-test", reason: "核对全部发布证据" },
    now: NOW,
  });
}

test("complete production-shaped spot passes the current publication policy", () => {
  const result = assess(completeDetail());
  assert.equal(result.complete, true, JSON.stringify(result.issues));
  assert.equal(result.issues.length, 0);
});

test("sample sources can never satisfy the production publication policy", () => {
  const fixture = buildTestSpotDetail(TEST_PUBLISHED_SPOT.spotId);
  assert.ok(fixture);
  const result = assess(fixture);
  assert.equal(result.complete, false);
  assert.ok(
    result.issues.some((issue) => issue.code === "source_provenance_invalid"),
  );
});

test("all UNKNOWN facilities and missing core evidence fail closed", () => {
  const detail = completeDetail();
  detail.spot.facilities = detail.spot.facilities.map((facility) => ({
    ...facility,
    status: "UNKNOWN",
  }));
  detail.evidence = [];
  const result = assess(detail);
  assert.equal(result.complete, false);
  assert.ok(
    result.issues.some(
      (issue) => issue.code === "required_evidence_missing_or_stale",
    ),
  );
});

test("verified core facts publish without optional facilities, light, horizon or photographs", () => {
  const detail = completeDetail();
  detail.spot.facilities = detail.spot.facilities.map((facility) => ({
    ...facility, status: "UNKNOWN", summary: "未知", detail: "待核验",
    verifiedAt: null, source: { ...SOURCE, id: "source:optional:missing", state: "UNAVAILABLE" },
  }));
  detail.spot.lightPollution = { ...detail.spot.lightPollution,
    state: "UNAVAILABLE", radiance: null, productBand: null,
    datasetVersion: "UNAVAILABLE", minimumCloudFreeObservations: null,
    source: { ...SOURCE, id: "source:light:missing", state: "UNAVAILABLE" },
  };
  detail.spot.obstructionPercent = null;
  detail.spot.clearDirections = [];
  detail.spot.media = [];
  detail.siteMediaState = "UNKNOWN";
  detail.route = { ...detail.route, lastRoad: "未知", parkingGuidance: "待核验" };
  detail.evidence = detail.evidence.filter((item) =>
    ["SPOT_COORDINATE", "ACCESS_OPENNESS", "ACCESS_LEGAL_ENTRY", "SAFETY_NIGHT"].includes(item.claim));
  const result = assess(detail);
  assert.equal(result.complete, true, JSON.stringify(result.issues));
});

test("each core claim requires current evidence attributable to this spot and a usable source", () => {
  for (const claim of ["SPOT_COORDINATE", "ACCESS_OPENNESS", "ACCESS_LEGAL_ENTRY", "SAFETY_NIGHT"]) {
    for (const failure of ["missing", "wrong-spot", "expired-source", "reported"]) {
      const detail = completeDetail();
      const expired = { ...SOURCE, id: "source:expired", state: "EXPIRED" as const };
      detail.dataDisclosure = [...detail.dataDisclosure, expired];
      detail.evidence = detail.evidence.flatMap((item) => {
        if (item.claim !== claim) return [item];
        if (failure === "missing") return [];
        return [{ ...item,
          ...(failure === "wrong-spot" ? { subjectId: "spot:another" } : {}),
          ...(failure === "expired-source" ? { sourceId: expired.id } : {}),
          ...(failure === "reported" ? { state: "REPORTED" as const } : {}),
        }];
      });
      const result = assess(detail);
      assert.equal(result.complete, false, `${claim}: ${failure}`);
      assert.ok(result.issues.some((issue) => issue.field === `spot.evidence.${claim}`));
    }
  }
});

test("closed, prohibited and dangerous states cannot be published as unrestricted points", () => {
  for (const blocker of [
    { openness: "CLOSED" as const },
    { legalAccess: "PROHIBITED" as const },
    { nightSafety: "DANGER" as const },
    { explicitDanger: true },
  ]) {
    const detail = completeDetail();
    detail.accessAndSafety = { ...detail.accessAndSafety, ...blocker };
    assert.equal(assess(detail).complete, false);
    detail.spot.status = "TEMPORARILY_CLOSED";
    assert.equal(assess(detail).complete, true, "restrictive lifecycle retains verified facts");
  }
});

test("a published spot with an explicit safety blocker is rejected", () => {
  const detail = completeDetail();
  detail.accessAndSafety = {
    ...detail.accessAndSafety,
    nightSafety: "DANGER",
    explicitDanger: true,
  };
  const result = assess(detail);
  assert.equal(result.complete, false);
  assert.ok(
    result.issues.some(
      (issue) => issue.code === "published_status_conflicts_with_blocker",
    ),
  );
});

test("an explicit no-site-media assessment passes without claiming representative media as site truth", () => {
  const detail = completeDetail();
  detail.siteMediaState = "NO_SITE_MEDIA_VERIFIED";
  detail.spot.media = detail.spot.media.map((media) => ({
    ...media,
    isSiteSpecific: false,
  }));
  detail.evidence = detail.evidence.filter(
    (evidence) => evidence.claim !== "SITE_MEDIA_PROVENANCE",
  );
  const result = assess(detail);
  assert.equal(result.complete, true, JSON.stringify(result.issues));
});

test("stale core evidence and missing operator review are independently rejected", () => {
  const detail = completeDetail();
  detail.spot.lastVerifiedAt = "2026-06-01T00:00:00.000Z";
  detail.evidence = detail.evidence.map((evidence) => ({
    ...evidence,
    verifiedAt: "2026-06-01T00:00:00.000Z",
  }));
  const result = evaluateSpotCompleteness({
    detail,
    review: { actorId: "", reason: "" },
    now: NOW,
  });
  assert.equal(result.complete, false);
  assert.ok(result.issues.some((issue) => issue.code === "verification_stale"));
  assert.ok(
    result.issues.some((issue) => issue.code === "operator_review_missing"),
  );
});

test("optional photographs cannot bypass verification by leaving media status unknown", () => {
  const detail = completeDetail();
  detail.siteMediaState = "UNKNOWN";
  assert.ok(assess(detail).issues.some((issue) => issue.code === "site_media_state_conflict"));
});

test("missing access fields in legacy records remain unknown, not implicitly safe", () => {
  for (const field of ["openness", "legalAccess", "nightSafety", "explicitDanger"] as const) {
    const detail = completeDetail();
    delete (detail.accessAndSafety as Partial<SpotDetail["accessAndSafety"]>)[field];
    assert.equal(assess(detail).complete, false, field);
  }
});
