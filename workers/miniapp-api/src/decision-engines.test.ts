import assert from "node:assert/strict";
import test from "node:test";
import type { DataState, SkyOpportunity } from "@starward/miniapp-contracts";
import {
  SkyOpportunityEngine,
  type OpportunitySliceInput,
} from "./sky-opportunity-engine.ts";
import { TripDecisionEngine } from "./trip-decision-engine.ts";

const AT = "2026-08-06T12:00:00.000Z";

function at(minutes: number): string {
  return new Date(Date.parse(AT) + minutes * 60_000).toISOString();
}

function slice(
  minutes: number,
  value = 0.85,
  overrides: Partial<OpportunitySliceInput> = {},
): OpportunitySliceInput {
  return {
    at: at(minutes),
    eventActivity: null,
    targetVisibility: value,
    darkness: 1,
    moonPenalty: 0,
    weatherTransmission: value,
    modelConsistency: 0.9,
    lightPollution: value,
    horizonSuitability: 1,
    dataConfidence: 0.95,
    hardBlockers: [],
    ...overrides,
  };
}

function opportunity(
  slices: readonly OpportunitySliceInput[],
  freshness: DataState = "FRESH",
) {
  return new SkyOpportunityEngine().compute({
    localDate: "2026-08-06",
    sourceRevision: "test-source",
    ruleVersion: "test-opportunity",
    freshness,
    slices,
    suitableFor: ["NAKED_EYE"],
  });
}

test("sky opportunity uses per-slice geometric inputs and a real continuous window", () => {
  const result = opportunity([
    slice(0),
    slice(30),
    slice(60),
    slice(90),
  ]);
  assert.equal(result.opportunity.status, "EXCELLENT");
  assert.equal(result.opportunity.primaryWindow?.start, at(0));
  assert.equal(result.opportunity.primaryWindow?.end, at(120));
  assert.equal(result.opportunity.primaryWindow?.durationMinutes, 120);
  assert.ok((result.opportunity.primaryWindow?.averageScore ?? 0) >= 80);
  assert.ok((result.opportunity.confidence ?? 0) < 1);
  assert.equal(result.slices.every((entry) => entry.eligible), true);
});

test("window extraction applies hysteresis and does not let a marginal slice open a window", () => {
  const continued = opportunity([slice(0, 0.7), slice(30, 0.54), slice(60, 0.7)]);
  assert.equal(continued.opportunity.primaryWindow?.durationMinutes, 90);
  assert.equal(continued.slices[1]?.eligible, true);

  const cannotOpen = opportunity([slice(0, 0.54), slice(30, 0.54)]);
  assert.equal(cannotOpen.slices.some((entry) => entry.eligible), false);
  assert.equal(cannotOpen.opportunity.primaryWindow, null);
});

test("window extraction permits only the configured small gap and retains a backup", () => {
  const smoothed = opportunity([
    slice(0),
    slice(15),
    slice(30, 0.2),
    slice(45),
    slice(60),
  ]);
  assert.equal(smoothed.opportunity.primaryWindow?.durationMinutes, 75);

  const twoWindows = opportunity([
    slice(0),
    slice(30),
    slice(60, 0.2),
    slice(90, 0.2),
    slice(120),
    slice(150),
  ]);
  assert.equal(twoWindows.opportunity.windows.length, 2);
  assert.ok(twoWindows.opportunity.backupWindow);
  assert.notEqual(
    twoWindows.opportunity.primaryWindow?.start,
    twoWindows.opportunity.backupWindow?.start,
  );
});

test("critical missing weather and severe weather remain distinct sky outcomes", () => {
  const unavailable = opportunity([
    slice(0, 0.9, {
      weatherTransmission: null,
      hardBlockers: ["CRITICAL_WEATHER_DATA_UNAVAILABLE"],
    }),
  ]);
  assert.equal(unavailable.opportunity.status, "INSUFFICIENT_DATA");
  assert.equal(unavailable.opportunity.confidence, null);

  const incompleteFields = opportunity([
    slice(0, 0.9, { weatherTransmission: null }),
  ]);
  assert.equal(incompleteFields.opportunity.status, "INSUFFICIENT_DATA");

  const thunderstorm = opportunity([
    slice(0, 0.9, { hardBlockers: ["THUNDERSTORM"] }),
  ]);
  assert.equal(thunderstorm.opportunity.status, "POOR");
  assert.ok(
    thunderstorm.opportunity.factors.some(
      (entry) => entry.severity === "BLOCKER",
    ),
  );
});

function trip(
  skyOpportunity: SkyOpportunity,
  overrides: Partial<Parameters<TripDecisionEngine["compute"]>[0]> = {},
) {
  return new TripDecisionEngine().compute({
    localDate: "2026-08-06",
    sourceRevision: "test-source",
    ruleVersion: "test-trip",
    skyOpportunity,
    siteState: "FRESH",
    routeState: "FRESH",
    warningState: "FRESH",
    officialSevereAlert: false,
    thunderstorm: false,
    severeRain: false,
    severeWind: false,
    closed: false,
    roadClosed: false,
    explicitDanger: false,
    illegalAccess: false,
    criticalConflict: false,
    ...overrides,
  });
}

test("trip decision references sky opportunity but never lets it override a blocker", () => {
  const sky = opportunity([slice(0), slice(30), slice(60), slice(90)])
    .opportunity;
  const recommended = trip(sky);
  assert.equal(recommended.recommendation, "RECOMMENDED");
  assert.equal(recommended.skyOpportunity, sky);

  const blocked = trip(sky, { thunderstorm: true });
  assert.equal(blocked.recommendation, "NOT_RECOMMENDED");
  assert.ok(blocked.factors.some((entry) => entry.code === "THUNDERSTORM"));

  const officialAlert = trip(sky, { officialSevereAlert: true });
  assert.equal(officialAlert.recommendation, "NOT_RECOMMENDED");
  assert.ok(
    officialAlert.factors.some(
      (entry) => entry.code === "OFFICIAL_SEVERE_WEATHER_ALERT",
    ),
  );
});

test("trip decision does not invent route, site, or sample certainty", () => {
  const sky = opportunity([slice(0), slice(30)]).opportunity;
  assert.equal(trip(sky, { routeState: "UNAVAILABLE" }).recommendation, "CONSIDER");
  assert.equal(trip(sky, { siteState: "PARTIAL" }).recommendation, "DATA_INSUFFICIENT");
  assert.equal(
    trip(sky, { warningState: "UNAVAILABLE" }).recommendation,
    "DATA_INSUFFICIENT",
  );
  const sampleSky = { ...sky, freshness: "SAMPLE_DATA" as const };
  assert.equal(trip(sampleSky).recommendation, "DATA_INSUFFICIENT");
});
