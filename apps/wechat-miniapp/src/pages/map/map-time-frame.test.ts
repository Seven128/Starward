import assert from "node:assert/strict";
import test from "node:test";
import type {
  MapLayerData,
  MapSceneTimeFrame,
  MapSpotEvaluation,
} from "@starward/miniapp-contracts";
import {
  nearestMapTimeFrameIndex,
  cloudTimeFrameChoices,
  mapTimeFrameAt,
  projectedLayerPolygons,
  projectMapEvaluations,
} from "./map-time-frame.ts";

const baseEvaluation: MapSpotEvaluation = {
  spotId: "spot:test" as MapSpotEvaluation["spotId"],
  weatherAt: "2026-08-23T12:00:00.000Z",
  lunarFacts: {
    phase: "WANING_CRESCENT",
    phaseAngleDeg: 315,
    illumination: 0.08,
    altitudeDeg: -12,
    moonriseAt: "2026-08-23T20:00:00.000Z",
    moonsetAt: "2026-08-24T08:00:00.000Z",
    source: {
      id: "astronomy:test",
      kind: "TEST_FIXTURE",
      title: "Astronomy test fixture",
      provider: "test",
      sourceUrl: "https://example.invalid/astronomy-test",
      license: "test-only",
      licenseUrl: "https://example.invalid/test-license",
      publishedAt: null,
      retrievedAt: "2026-08-23T12:00:00.000Z",
      validFrom: "2026-08-23T12:00:00.000Z",
      validTo: "2026-08-24T12:00:00.000Z",
      state: "FRESH",
      confidence: 1,
      precision: "test fixture",
      limitations: [],
    },
  },
  recommendation: "CONSIDER",
  bestWindowMinutes: 90,
  cloudPercent: 60,
  moonImpact: "LOW",
  opportunityScore: 50,
  opportunityConfidence: 0.7,
  opportunityEligible: false,
  opportunityLabel: "当前时段未达窗口门槛 · 50 分",
  activeEventIds: [],
  distanceKm: 12,
  driveMinutes: 20,
  distanceKind: "ROUTE",
  state: "FRESH",
};

test("weather-only choices skip missing hours without changing the original time index", () => {
  const make = (hour: number, cloudPercent: number | null, state: MapSpotEvaluation["state"] = "FRESH") => ({
    atUtc: `2026-09-15T${hour}:00:00Z`, moonPhase: null, dynamicLayer: null,
    spotSignals: { [baseEvaluation.spotId]: { ...baseEvaluation, weatherAt: `2026-09-15T${hour}:00:00Z`, cloudPercent, state } },
  });
  const source = [make(12, null), make(13, 0), make(14, null), make(15, 40), make(16, 60, "UNAVAILABLE")];
  const choices = cloudTimeFrameChoices(source);
  assert.deepEqual(choices.map(choice => choice.sourceIndex), [1, 3]);
  assert.equal(source[choices[1]!.sourceIndex], choices[1]!.frame);
  assert.equal(choices[1]!.frame.atUtc, "2026-09-15T15:00:00Z");
  assert.equal(source.length, 5, "astronomy retains its complete axis");
  assert.deepEqual(cloudTimeFrameChoices([]), []);
});

test("unavailable weather clears only weather-derived signals, retaining independently calculated moon impact", () => {
  const signal = { ...baseEvaluation, state: "UNAVAILABLE" as const, moonImpact: "HIGH" as const, cloudPercent: 45 };
  const frame = { atUtc: "2026-09-15T13:30:00Z", moonPhase: null, dynamicLayer: null, spotSignals: { [baseEvaluation.spotId]: signal } };
  const projected = projectMapEvaluations({ [baseEvaluation.spotId]: baseEvaluation }, frame)[baseEvaluation.spotId]!;
  assert.equal(projected.moonImpact, "HIGH"); assert.equal(projected.cloudPercent, null); assert.equal(projected.weatherAt, null);
  assert.equal(projected.opportunityScore, null); assert.equal(projected.opportunityEligible, false);
});

const frames: readonly MapSceneTimeFrame[] = [
  {
    atUtc: "2026-08-23T12:00:00.000Z",
    moonPhase: "WANING_CRESCENT",
    spotSignals: {},
    dynamicLayer: null,
  },
  {
    atUtc: "2026-08-23T12:30:00.000Z",
    moonPhase: "WANING_CRESCENT",
    spotSignals: {
      "spot:test": {
        spotId: baseEvaluation.spotId,
        weatherAt: "2026-08-23T12:00:00.000Z",
        cloudPercent: 18,
        moonImpact: "HIGH",
        opportunityScore: 82,
        opportunityConfidence: 0.86,
        opportunityEligible: true,
        opportunityLabel: "当前时段可观测 · 82 分",
        state: "FRESH",
      },
    },
    dynamicLayer: {
      kind: "CLOUD",
      state: "FRESH",
      polygons: [
        {
          id: "cloud:spot:test",
          points: [],
          fillColor: "#fff",
          strokeColor: "#fff",
          strokeWidth: 1,
          value: 18,
          label: "TOTAL 云量 18%",
          state: "FRESH",
        },
      ],
    },
  },
];

test("selects the nearest loaded frame", () => {
  assert.equal(
    nearestMapTimeFrameIndex(frames, "2026-08-23T12:26:00.000Z"),
    1,
  );
});

test("projects frame signals without replacing route or trip truth", () => {
  const projected = projectMapEvaluations(
    { "spot:test": baseEvaluation },
    frames[1]!,
  )["spot:test"]!;
  assert.equal(projected.cloudPercent, 18);
  assert.equal(projected.opportunityEligible, true);
  assert.equal(projected.recommendation, "CONSIDER");
  assert.equal(projected.driveMinutes, 20);
});

test("uses frame polygons only for the matching dynamic layer", () => {
  const cloud: MapLayerData = {
    kind: "CLOUD",
    cloudLayer: "TOTAL",
    polygons: [],
    legend: [],
    validAt: frames[0]!.atUtc,
    datasetVersion: "weather:test",
    precision: "test",
    state: "FRESH",
    source: null,
  };
  const light: MapLayerData = { ...cloud, kind: "LIGHT_POLLUTION" };
  assert.equal(projectedLayerPolygons(cloud, frames[1]!).length, 1);
  assert.equal(projectedLayerPolygons(light, frames[1]!).length, 0);
});

test("missing or mismatched time signals cannot retain another time's conditions", () => {
  for (const frame of [frames[0]!, { ...frames[1]!, spotSignals: { "spot:test": { ...frames[1]!.spotSignals["spot:test"]!, spotId: "spot:other" as MapSpotEvaluation["spotId"] } } }]) {
    const value = projectMapEvaluations({ "spot:test": baseEvaluation }, frame)["spot:test"]!;
    assert.equal(value.cloudPercent, null);
    assert.equal(value.moonImpact, "UNKNOWN");
    assert.equal(value.opportunityScore, null);
    assert.equal(value.opportunityEligible, false);
    assert.equal(value.state, "UNAVAILABLE");
    assert.equal(value.spotId, baseEvaluation.spotId);
    assert.equal(value.driveMinutes, 20);
    assert.equal(value.distanceKm, 12);
  }
  assert.equal(baseEvaluation.cloudPercent, 60, "preview must not mutate the committed reading");
  const unavailable = { ...frames[1]!, spotSignals: { "spot:test": { ...frames[1]!.spotSignals["spot:test"]!, state: "UNAVAILABLE" as const } } };
  assert.equal(projectMapEvaluations({ "spot:test": baseEvaluation }, unavailable)["spot:test"]!.cloudPercent, null);
});

test("missing dynamic frames clear old polygons while static light pollution remains", () => {
  const layer: MapLayerData = { kind: "CLOUD", cloudLayer: "TOTAL", polygons: frames[1]!.dynamicLayer!.polygons, legend: [], validAt: frames[1]!.atUtc, datasetVersion: "test", precision: "test", state: "FRESH", source: null };
  assert.equal(projectedLayerPolygons(layer, frames[0]!).length, 0);
  assert.equal(projectedLayerPolygons({ ...layer, kind: "OPPORTUNITY" }, frames[1]!).length, 0);
  assert.equal(projectedLayerPolygons(layer, { ...frames[1]!, dynamicLayer: { ...frames[1]!.dynamicLayer!, state: "UNAVAILABLE" } }).length, 0);
  assert.equal(projectedLayerPolygons({ ...layer, kind: "LIGHT_POLLUTION" }, frames[0]!).length, 1);
  assert.equal(projectedLayerPolygons(layer, null).length, 1);
});

test("off-cadence and duplicate map instants cannot borrow adjacent signals", () => {
  const missing = mapTimeFrameAt(frames, "2026-08-23T12:20:00Z");
  assert.deepEqual(missing.spotSignals, {});
  assert.equal(projectMapEvaluations({ "spot:test": baseEvaluation }, missing)["spot:test"]?.state, "UNAVAILABLE");
  assert.equal(mapTimeFrameAt(frames, frames[1]!.atUtc), frames[1]);
  assert.deepEqual(mapTimeFrameAt([frames[1]!, frames[1]!], frames[1]!.atUtc).spotSignals, {});
});
