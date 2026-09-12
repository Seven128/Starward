import assert from "node:assert/strict";
import test from "node:test";
import {
  EMPTY_FILTER_STATE,
  toggleFilter,
  type MapSpotEvaluation,
  type SpotDetail,
  type SpotSummary,
} from "@starward/miniapp-contracts";
import { TEST_PUBLISHED_SPOT, buildTestSpotDetail } from "@starward/miniapp-contracts/test-fixtures";
import {
  evaluateSpotFilterEvidence,
  passesActiveFilters,
  summarizeFilterCoverage,
} from "./filter-evaluation.ts";

const now = Date.parse("2026-09-10T10:00:00.000Z");

function fixture() {
  const spot = structuredClone(TEST_PUBLISHED_SPOT) as SpotSummary;
  const detail = structuredClone(buildTestSpotDetail(spot.spotId)!) as SpotDetail;
  const freshSource = (source: SpotSummary["source"]): SpotSummary["source"] => ({
    ...source,
    kind: "OFFICIAL_VERIFICATION",
    state: "FRESH",
  });
  spot.source = freshSource(spot.source);
  spot.lastVerifiedAt = "2026-09-01T00:00:00.000Z";
  spot.lightPollution = {
    ...spot.lightPollution,
    state: "ESTIMATED",
    productBand: "LOW",
    source: freshSource(spot.lightPollution.source),
  };
  spot.facilities = spot.facilities.map((item) => ({ ...item, source: freshSource(item.source) }));
  spot.media = spot.media.map((item) => ({
    ...item,
    state: "FRESH",
    isSiteSpecific: true,
    license: "CC BY 4.0",
    thumbnailPath: "/media/site.jpg",
  }));
  detail.spot = spot;
  const evaluation = {
    spotId: spot.spotId,
    cloudPercent: 30,
    lowCloudPercent: 20,
    midCloudPercent: 10,
    highCloudPercent: 5,
    moonImpact: "LOW",
    opportunityScore: null,
    opportunityConfidence: null,
    opportunityEligible: false,
    opportunityLabel: "",
    state: "FRESH",
    recommendation: "DATA_INSUFFICIENT",
    bestWindowMinutes: null,
    activeEventIds: ["event:one"],
    distanceKm: 12,
    driveMinutes: 35,
    distanceKind: "ROUTE",
    lunarFacts: {},
  } as unknown as MapSpotEvaluation;
  return { spot, detail, evaluation };
}

test("each search condition distinguishes match, explicit no-match and missing evidence", () => {
  const { spot, detail, evaluation } = fixture();
  const result = evaluateSpotFilterEvidence({
    spot,
    detail,
    evaluation,
    filters: EMPTY_FILTER_STATE,
    eventCoverageKnown: true,
    evaluatedAtMs: now,
  });
  assert.equal(result.LIGHT_POLLUTION.state, "MATCH");
  assert.equal(result.LESS_CLOUD.state, "MATCH");
  assert.equal(result.PHOTO_FOREGROUND.state, "MATCH");
  assert.equal(result.SPECIFIC_CELESTIAL_EVENT.state, "MATCH");
  assert.equal(result.LAST_VERIFIED_AT.state, "MATCH");

  const parking = spot.facilities.find((item) => item.type === "PARKING")!;
  parking.status = "UNAVAILABLE";
  const unavailable = evaluateSpotFilterEvidence({ spot, detail, evaluation, filters: EMPTY_FILTER_STATE, eventCoverageKnown: true, evaluatedAtMs: now });
  assert.equal(unavailable.PARKING.state, "NO_MATCH");
  spot.facilities = spot.facilities.filter((item) => item.type !== "PARKING");
  const missing = evaluateSpotFilterEvidence({ spot, detail, evaluation, filters: EMPTY_FILTER_STATE, eventCoverageKnown: false, evaluatedAtMs: now });
  assert.equal(missing.PARKING.state, "UNKNOWN");
  assert.equal(missing.SPECIFIC_CELESTIAL_EVENT.state, "UNKNOWN");
});

test("active filtering excludes only definite no-match and retains unknown for disclosure", () => {
  const { spot, detail, evaluation } = fixture();
  const parkingFilters = toggleFilter(EMPTY_FILTER_STATE, "parking");
  spot.facilities = spot.facilities.filter((item) => item.type !== "PARKING");
  const unknown = evaluateSpotFilterEvidence({ spot, detail, evaluation, filters: parkingFilters, eventCoverageKnown: true, evaluatedAtMs: now });
  assert.equal(passesActiveFilters(unknown, parkingFilters), true);
  spot.facilities = [{
    type: "PARKING", status: "UNAVAILABLE", summary: "无", detail: "已核验无停车位",
    distanceM: null, openingHours: null, usageCondition: null, verifiedAt: null,
    confidence: 1, source: { ...spot.source, state: "FRESH" },
  }];
  const noMatch = evaluateSpotFilterEvidence({ spot, detail, evaluation, filters: parkingFilters, eventCoverageKnown: true, evaluatedAtMs: now });
  assert.equal(passesActiveFilters(noMatch, parkingFilters), false);
});

test("coverage is computed over candidates before filtering, including known zero-match", () => {
  const { spot, detail, evaluation } = fixture();
  const first = evaluateSpotFilterEvidence({ spot, detail, evaluation, filters: EMPTY_FILTER_STATE, eventCoverageKnown: true, evaluatedAtMs: now });
  const second = { ...first, PARKING: { state: "UNKNOWN" as const, reason: "停车：缺少资料" } };
  const third = { ...first, PARKING: { state: "NO_MATCH" as const, reason: "停车：明确不可用" } };
  assert.equal(summarizeFilterCoverage([first, third], "PARKING").state, "AVAILABLE");
  assert.equal(summarizeFilterCoverage([first, second], "PARKING").state, "PARTIAL");
  assert.equal(summarizeFilterCoverage([second], "PARKING").state, "UNAVAILABLE");
  assert.equal(summarizeFilterCoverage([], "PARKING").state, "UNAVAILABLE");
});
