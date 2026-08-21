import assert from "node:assert/strict";
import test from "node:test";
import {
  DEMO_FEATURE_FLAGS,
  DEMO_POPULATION_DISCLOSURE,
  DEMO_SPOTS,
  FEATURE_FLAG_KEYS,
  EMPTY_FILTER_STATE,
  FILTER_OPTIONS,
  assertFilterState,
  buildDemoSpotDetail,
  cloneUserPreferences,
  DEFAULT_USER_PREFERENCES,
  viewportRadiusKm,
} from "./index.ts";

test("the filter schema has the exact ordered V2.1.1 10+8 population", () => {
  assert.equal(FILTER_OPTIONS.length, 18);
  assert.equal(new Set(FILTER_OPTIONS.map((item) => item.label)).size, 18);
  assert.deepEqual(
    FILTER_OPTIONS.map((item) => item.label),
    [
      "今晚推荐",
      "最佳窗口时长",
      "距离/驾车时间",
      "光害",
      "少云",
      "停车",
      "厕所",
      "可驾车直达",
      "摄影前景",
      "可露营/驻车",
      "特定天象",
      "低云阈值",
      "月亮影响",
      "徒步难度",
      "信号",
      "充电",
      "天空开阔方向",
      "最近核验时间",
    ],
  );
  assert.equal(
    FILTER_OPTIONS.filter((item) => item.tier === "FIRST_LEVEL").length,
    10,
  );
  assert.equal(
    FILTER_OPTIONS.filter((item) => item.tier === "ADVANCED").length,
    8,
  );
});

test("filter state accepts only the complete stable enum closure", () => {
  assert.doesNotThrow(() => assertFilterState(EMPTY_FILTER_STATE));
  assert.throws(
    () =>
      assertFilterState({
        ...EMPTY_FILTER_STATE,
        LIGHT_POLLUTION: ["lightPollution", "lightPollution"],
      }),
    /filter_state_invalid:LIGHT_POLLUTION:duplicate/u,
  );
  assert.throws(
    () =>
      assertFilterState({
        ...EMPTY_FILTER_STATE,
        PARKING: ["provider-internal-field"],
      }),
    /unknown_option/u,
  );
});

test("the curated Demo population is complete, stable and provenance-bearing", () => {
  assert.equal(DEMO_POPULATION_DISCLOSURE.eligibleCount, DEMO_SPOTS.length);
  assert.ok(DEMO_SPOTS.length >= 20 && DEMO_SPOTS.length <= 50);
  for (const spot of DEMO_SPOTS) {
    assert.match(spot.spotId, /^spot:/u);
    assert.equal(spot.source.provider, "OpenStreetMap Nominatim");
    assert.match(spot.source.license, /Open Database License/u);
    assert.equal(spot.wgs84.system, "WGS84");
    assert.equal(spot.gcj02.derivedFrom, "WGS84");
    assert.ok(spot.media.length >= 1);
    assert.equal(spot.media[0]?.isSiteSpecific, false);
    assert.ok(
      spot.facilities.every((facility) => facility.status === "UNKNOWN"),
    );
  }
});

test("viewport radius keeps Web Mercator kilometre units and the 20% buffer", () => {
  assert.equal(viewportRadiusKm(8), 500);
  assert.ok(viewportRadiusKm(12) > 30 && viewportRadiusKm(12) < 33);
  assert.ok(viewportRadiusKm(12) > viewportRadiusKm(16));
  assert.equal(viewportRadiusKm(20), 8);
});

test("user preference snapshots do not depend on a host structuredClone", () => {
  const snapshot = cloneUserPreferences(DEFAULT_USER_PREFERENCES);
  assert.deepEqual(snapshot, DEFAULT_USER_PREFERENCES);
  assert.notEqual(snapshot, DEFAULT_USER_PREFERENCES);
  assert.notEqual(
    snapshot.requiredFacilities,
    DEFAULT_USER_PREFERENCES.requiredFacilities,
  );
});

test("insufficient current facts fail closed before scoring", () => {
  const detail = buildDemoSpotDetail(DEMO_SPOTS[0]!.spotId)!;
  assert.equal(detail.decision.recommendation, "DATA_INSUFFICIENT");
  assert.equal(detail.decision.bestWindow, null);
  assert.ok(
    detail.decision.factors.some((factor) => factor.severity === "BLOCKER"),
  );
  assert.equal(detail.route.kind, "STRAIGHT_LINE_ONLY");
  assert.equal(detail.route.driveMinutes, null);
});

test("commercial evolution is closed behind exactly seven audited flags", () => {
  assert.equal(FEATURE_FLAG_KEYS.length, 7);
  assert.deepEqual(
    Object.keys(DEMO_FEATURE_FLAGS).sort(),
    [...FEATURE_FLAG_KEYS].sort(),
  );
  assert.equal(DEMO_FEATURE_FLAGS.COMMERCIAL_LICENSE_MODE, false);
  assert.equal(DEMO_FEATURE_FLAGS.UGC_MODE, "WHITELIST_MANUAL_IMPORT");
});
