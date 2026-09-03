import assert from "node:assert/strict";
import test from "node:test";
import {
  EMPTY_FILTER_STATE,
  FEATURE_FLAG_KEYS,
  FILTER_OPTIONS,
  SELECTED_FEATURE_FLAGS,
  assertFeatureFlagClosure,
  assertFilterState,
  cloneUserPreferences,
  DEFAULT_USER_PREFERENCES,
  viewportRadiusKm,
} from "./index.ts";
import {
  TEST_POPULATION_DISCLOSURE,
  TEST_SPOTS,
  buildTestSpotDetail,
} from "./catalog.ts";

test("the current filter schema has the exact ordered 10+8 population", () => {
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

test("the explicit test population is stable and cannot claim field truth", () => {
  assert.equal(TEST_POPULATION_DISCLOSURE.eligibleCount, TEST_SPOTS.length);
  assert.ok(TEST_SPOTS.length >= 20 && TEST_SPOTS.length <= 50);
  for (const spot of TEST_SPOTS) {
    assert.match(spot.spotId, /^spot:/u);
    assert.equal(spot.source.kind, "OPEN_DATA");
    assert.equal(spot.status, "DATA_INSUFFICIENT");
    assert.equal(spot.wgs84.system, "WGS84");
    assert.equal(spot.gcj02.derivedFrom, "WGS84");
    assert.ok(spot.media.length >= 1);
    assert.equal(spot.media[0]?.isSiteSpecific, false);
    assert.ok(
      spot.facilities.every((facility) => facility.status === "UNKNOWN"),
    );
    assert.ok(
      spot.facilities.every(
        (facility) => facility.source.kind === "TEST_FIXTURE",
      ),
    );
  }
});

test("viewport radius keeps Web Mercator kilometre units and the 20% buffer", () => {
  assert.equal(viewportRadiusKm(8), 500);
  assert.ok(viewportRadiusKm(12) > 30 && viewportRadiusKm(12) < 33);
  assert.ok(viewportRadiusKm(12) > viewportRadiusKm(16));
  assert.equal(viewportRadiusKm(20), 8);
});

test("user preference snapshots remain independent", () => {
  const snapshot = cloneUserPreferences(DEFAULT_USER_PREFERENCES);
  assert.deepEqual(snapshot, DEFAULT_USER_PREFERENCES);
  assert.notEqual(snapshot, DEFAULT_USER_PREFERENCES);
  assert.notEqual(
    snapshot.requiredFacilities,
    DEFAULT_USER_PREFERENCES.requiredFacilities,
  );
});

test("legacy preference payloads receive current reminder intent defaults", () => {
  const legacy = {
    ...DEFAULT_USER_PREFERENCES,
  } as Record<string, unknown>;
  delete legacy.departureConditionReminder;
  delete legacy.contributionStatusReminder;
  const snapshot = cloneUserPreferences(legacy as typeof DEFAULT_USER_PREFERENCES);
  assert.equal(snapshot.departureConditionReminder, false);
  assert.equal(snapshot.contributionStatusReminder, false);
});

test("test fixtures fail closed before scoring", () => {
  const detail = buildTestSpotDetail(TEST_SPOTS[0]!.spotId)!;
  assert.equal(detail.decision.recommendation, "DATA_INSUFFICIENT");
  assert.equal(detail.decision.skyOpportunity.primaryWindow, null);
  assert.ok(
    detail.decision.factors.some((factor) => factor.severity === "BLOCKER"),
  );
  assert.equal(detail.route.kind, "STRAIGHT_LINE_ONLY");
  assert.equal(detail.route.driveMinutes, null);
});

test("the current feature set is one exact boolean closure", () => {
  assert.equal(FEATURE_FLAG_KEYS.length, 14);
  assert.deepEqual(
    Object.keys(SELECTED_FEATURE_FLAGS).sort(),
    [...FEATURE_FLAG_KEYS].sort(),
  );
  assert.doesNotThrow(() =>
    assertFeatureFlagClosure(SELECTED_FEATURE_FLAGS),
  );
  assert.equal(SELECTED_FEATURE_FLAGS.GLOBAL_NIGHT_TAB_ENABLED, false);
  assert.equal(SELECTED_FEATURE_FLAGS.ORDINARY_PLACE_SKY_ENABLED, false);
  assert.equal(SELECTED_FEATURE_FLAGS.DARK_SKY_CANDIDATES_ENABLED, false);
  assert.equal(SELECTED_FEATURE_FLAGS.REAL_WEATHER_ENABLED, true);
  assert.equal(SELECTED_FEATURE_FLAGS.PROFILE_LINKS_ENABLED, true);
  assert.equal(SELECTED_FEATURE_FLAGS.OWN_POST_IMPORT_ENABLED, true);
});
