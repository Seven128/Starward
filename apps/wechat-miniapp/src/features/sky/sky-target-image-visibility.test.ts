import assert from "node:assert/strict";
import test from "node:test";
import { createSkyViewBasis } from "./sky-view-projection";
import { artworkIntersectsView } from "./sky-artwork-visibility";
import { registerSkySurvey } from "./sky-survey-registration";
import { publishedDeepSkyDiscovery } from "./deep-sky-image-test-support";
import { skyDeepSkyImageIntersectsView, type SkyTargetImageView } from "./sky-target-image-visibility";

const at = "2026-10-03T13:00:00.000Z";
const point = [0, 0, -10, 0, -9.9, 359.9, -10] as const;
// Real admitted W3 levels; structural geometry isolates demand, not astrometry.
const publication = publishedDeepSkyDiscovery("M:42");
const report = { hourly: [{ at }], skyScene: { deepSky: { state: "AVAILABLE", catalog: {
  frame: "ICRS J2000", imageRegistration: "ICRS_TAN_NORTH_0_1_V1", entries: [{ objectRef: "M:42" }] },
  frames: [{ at, state: "AVAILABLE", points: [point] }] } } } as any;
const footprint = (az = 0): SkyTargetImageView => ({ report, at, width: 390, height: 844,
  view: { basis: createSkyViewBasis(az, 80, 0)!, verticalFovDeg: .05 } });

test("selected W3 shares all-field exclusion while preserving its 256px coarse edge", () => {
  assert.equal(skyDeepSkyImageIntersectsView(publication, footprint()), true);
  assert.equal(skyDeepSkyImageIntersectsView(publication, footprint(90)), false);
  const edge = footprint(publication.levels.OVERVIEW.fieldDegrees * .4);
  const original = (level: "OVERVIEW" | "MEDIUM" | "DETAIL") => {
    const asset = publication.levels[level], field = registerSkySurvey(point, asset.fieldDegrees, asset.pixels, asset.pixels / 2);
    assert(field); return artworkIntersectsView(field, edge.view, edge.width, edge.height);
  };
  assert.equal(original("OVERVIEW"), true); assert.equal(original("MEDIUM"), false); assert.equal(original("DETAIL"), false);
  assert.equal(skyDeepSkyImageIntersectsView(publication, edge), true);
});

test("unknown W3 geometry and valid dark/finite support never certify absence", () => {
  const off = footprint(90);
  for (const unknown of [{ ...off, width: 0 }, { ...off, height: NaN }, { ...off, report: undefined },
    { ...off, at: "2026-10-03T14:00:00.000Z" }, { ...off, view: { ...off.view, verticalFovDeg: NaN } }])
    assert.equal(skyDeepSkyImageIntersectsView(publication, unknown), true);
  const invalid = structuredClone(publication); invalid.levels.MEDIUM.fieldDegrees = NaN;
  assert.equal(skyDeepSkyImageIntersectsView(invalid, off), true);
  const full = structuredClone(publication);
  for (const asset of Object.values(full.levels)) delete asset.displaySupport;
  assert.equal(skyDeepSkyImageIntersectsView(full, off), false);
  assert.equal(skyDeepSkyImageIntersectsView(full, footprint()), true);
});
