import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { OBSERVATION_FRAME_FORMAT, type SkyObservationFrame } from "@starward/miniapp-contracts";
import { createSkyViewBasis } from "./sky-view-projection";
import { skyTargetOpticalIntersectsView, type SkyTargetOpticalView } from "./sky-target-optical-visibility";
import { registerSkySurvey } from "./sky-survey-registration";
import { artworkIntersectsView } from "./sky-artwork-visibility";

const at = "2026-10-03T13:00:00.000Z";
const point = [0, 0, -10, 0, -9.9, 359.9, -10] as const;
const publication = { objectRef: "M:51", levels: Object.fromEntries(["OVERVIEW", "MEDIUM", "DETAIL"].map((level, index) =>
  [level, { fieldDegrees: .2275555556 / 2 ** index }])) } as any;
const report = { hourly: [{ at }], skyScene: { deepSky: { state: "AVAILABLE", catalog: {
  frame: "ICRS J2000", imageRegistration: "ICRS_TAN_NORTH_0_1_V1", entries: [{ objectRef: "M:51" }] },
  frames: [{ at, state: "AVAILABLE", points: [point] }] } } } as any;
const footprint = (az = 0, fov = .05): SkyTargetOpticalView => ({ report, at, width: 390, height: 844,
  view: { basis: createSkyViewBasis(az, 80, 0)!, verticalFovDeg: fov } });

test("whole-family exclusion retains a partial coarse edge and lower-hemisphere browsing", () => {
  assert.equal(skyTargetOpticalIntersectsView(publication, footprint()), true);
  assert.equal(skyTargetOpticalIntersectsView(publication, footprint(90)), false);
  const edge = footprint(.11), medium = registerSkySurvey(point, publication.levels.MEDIUM.fieldDegrees, 512, 256.5)!;
  assert(medium); assert.equal(artworkIntersectsView(medium, edge.view, edge.width, edge.height), false);
  assert.equal(skyTargetOpticalIntersectsView(publication, edge), true, "the wider valid parent must prevent whole-family retirement");
});

test("invalid/unknown view, instant or registration retains demand", () => {
  const off = footprint(90);
  for (const unknown of [{ ...off, width: 0 }, { ...off, height: NaN }, { ...off, at: "2026-10-03T14:00:00.000Z" },
    { ...off, report: undefined }, { ...off, view: { ...off.view, verticalFovDeg: NaN } }])
    assert.equal(skyTargetOpticalIntersectsView(publication, unknown), true);
  assert.equal(skyTargetOpticalIntersectsView({ ...publication, levels: { ...publication.levels, DETAIL: { fieldDegrees: NaN } } }, off), true);
});

test("science and Prepared use their admitted TAN center while missing observer geometry remains unknown", () => {
  // Real published nominal geometry; structural admitted-caller envelopes and
  // an identity rotation isolate visibility, not source accuracy or transport.
  const observation: SkyObservationFrame = { at, format: OBSERVATION_FRAME_FORMAT,
    observer: { latitude: 0, longitude: 0, elevationM: 0 }, equatorialToEnu: [1, 0, 0, 0, 1, 0, 0, 0, 1] };
  for (const [file, kind] of [["sky-sdss-science-registration.fixture.json", "science-optical-v2"],
    ["sky-prepared-optical-registration.fixture.json", "prepared-optical-v1"]] as const) {
    const source = JSON.parse(readFileSync(new URL(`./${file}`, import.meta.url), "utf8"));
    const photo = { objectRef: "M:51", imageVersion: kind, center: source.center, levels: source.levels,
      orientation: "north-up/east-left" } as any;
    const rayAz = (90 - source.center.raDeg + 360) % 360;
    const centered = { ...footprint(), report: { hourly: [{ at }], observationFrames: [observation] } as any,
      view: { basis: createSkyViewBasis(rayAz, 90 + source.center.decDeg, 0)!, verticalFovDeg: .05 } };
    assert.equal(skyTargetOpticalIntersectsView(photo, centered), true);
    const off = { ...centered, view: { ...centered.view, basis: createSkyViewBasis(rayAz + 90, 90 + source.center.decDeg, 0)! } };
    assert.equal(skyTargetOpticalIntersectsView(photo, off), false);
    assert.equal(skyTargetOpticalIntersectsView(photo, { ...off, report: { hourly: [{ at }] } as any }), true);
    assert.equal(skyTargetOpticalIntersectsView(photo, { ...off, at: "2026-10-03T14:00:00.000Z" }), true);
  }
});
