import assert from "node:assert/strict";
import test from "node:test";
import type {
  MapLayerData,
  MapSceneTimeFrame,
  MapSpotEvaluation,
} from "@starward/miniapp-contracts";
import {
  nearestMapTimeFrameIndex,
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
