import assert from "node:assert/strict";
import test from "node:test";
import type {
  MapLayerData,
  MapSceneTimeFrame,
  MapSpotEvaluation,
} from "@starward/miniapp-contracts";
import {
  nearestMapTimeFrameIndex,
  mapTimeFrameAt,
  projectedLayerPolygons,
  projectMapEvaluations,
} from "./map-time-frame.ts";

const baseEvaluation: MapSpotEvaluation = {
  spotId: "spot:test" as MapSpotEvaluation["spotId"],
  recommendation: "CONSIDER",
  bestWindowMinutes: 90,
  cloudPercent: 60,
  lowCloudPercent: 30,
  midCloudPercent: 20,
  highCloudPercent: 10,
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

const frames: readonly MapSceneTimeFrame[] = [
  {
    atUtc: "2026-08-23T12:00:00.000Z",
    spotSignals: {},
    dynamicLayer: null,
  },
  {
    atUtc: "2026-08-23T12:30:00.000Z",
    spotSignals: {
      "spot:test": {
        spotId: baseEvaluation.spotId,
        cloudPercent: 18,
        lowCloudPercent: 8,
        midCloudPercent: 6,
        highCloudPercent: 4,
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
    assert.equal(value.lowCloudPercent, null);
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
