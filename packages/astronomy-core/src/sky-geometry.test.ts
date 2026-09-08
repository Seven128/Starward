import assert from "node:assert/strict";
import test from "node:test";
import { calculateFieldOfView, interpolateHorizon, visibleIntervals, type HorizonProfile } from "./sky-geometry.ts";
import { calculateFieldOfView as legacyFieldOfView, visibleIntervals as legacyIntervals, catalogChunks, positionCatalog } from "./sky-model.ts";
import { GAIA_DR3_BRIGHT_STAR_CATALOG } from "./gaia-catalog.ts";

test("optical field of view keeps numeric geometry, portrait axes and incomplete-input fallback", () => {
  const optics = { sensorWidthMm: 36, sensorHeightMm: 24, focalLengthMm: 50 };
  const landscape = calculateFieldOfView({ ...optics, orientation: "landscape" })!;
  assert.ok(Math.abs(landscape.horizontalDeg - 39.597752709049864) < 1e-10);
  assert.ok(Math.abs(landscape.verticalDeg - 26.991466561591626) < 1e-10);
  assert.deepEqual(calculateFieldOfView({ ...optics, orientation: "portrait" }), {
    horizontalDeg: landscape.verticalDeg, verticalDeg: landscape.horizontalDeg,
  });
  for (const focalLengthMm of [undefined, 0, -1, Infinity, NaN])
    assert.equal(calculateFieldOfView({ ...optics, focalLengthMm, orientation: "landscape" }), null);
});

test("horizon interpolation wraps north and preserves measured obstruction provenance", () => {
  const profile: HorizonProfile = {
    source: "measured", version: "field-v1", confidence: 0.9,
    points: [{ azimuthDeg: 350, altitudeDeg: 4 }, { azimuthDeg: 10, altitudeDeg: 8 }],
  };
  assert.equal(interpolateHorizon(profile, 0), 6);
  assert.equal(interpolateHorizon(profile, 360), 6);
  assert.equal(interpolateHorizon(profile, -360), 6);
  const samples = [{ at: "before", altitudeDeg: 5, azimuthDeg: 0 }, { at: "after", altitudeDeg: 7, azimuthDeg: 0 }];
  assert.deepEqual(visibleIntervals(samples, profile).map(({ visible, horizonAltitudeDeg, evidence }) => ({ visible, horizonAltitudeDeg, evidence })), [
    { visible: false, horizonAltitudeDeg: 6, evidence: "measured" },
    { visible: true, horizonAltitudeDeg: 6, evidence: "measured" },
  ]);
  assert.equal(interpolateHorizon({ ...profile, points: [] }, 0), null);
  assert.deepEqual(visibleIntervals([{ at: "horizon", altitudeDeg: 0, azimuthDeg: 90 }])[0], {
    at: "horizon", altitudeDeg: 0, azimuthDeg: 90, horizonAltitudeDeg: null,
    visible: false, evidence: "astronomical-horizon",
  });
});

test("the existing sky-model API reuses the same platform-neutral geometry functions", () => {
  assert.equal(legacyFieldOfView, calculateFieldOfView);
  assert.equal(legacyIntervals, visibleIntervals);
});

test("the catalog adapter preserves every qualified Gaia identity and unknown obstruction", () => {
  const expectedIds = GAIA_DR3_BRIGHT_STAR_CATALOG.filter((row) => row.gMag <= 4).map((row) => row.sourceId).sort();
  assert.ok(expectedIds.length > 0);
  const chunks = catalogChunks(4);
  assert.ok(chunks.every((chunk) => chunk.objects.length > 0));
  assert.deepEqual(chunks.flatMap((chunk) => chunk.objects.map((object) => object.sourceId)).sort(), expectedIds);
  const positions = positionCatalog({ at: new Date("2026-08-12T16:40:00Z"), latitude: 22.529, longitude: 113.9468, elevationM: 620, magnitudeLimit: 4 });
  assert.deepEqual(positions.map((object) => object.sourceId).sort(), expectedIds);
  assert.ok(positions.every((object) => object.obstructed === null));
});
