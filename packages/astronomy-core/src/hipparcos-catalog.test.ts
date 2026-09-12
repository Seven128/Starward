import assert from "node:assert/strict";
import test from "node:test";
import {
  HIPPARCOS_BRIGHT_STAR_MANIFEST,
  hipparcosRowByReference,
  loadHipparcosBrightStarCatalog,
  positionHipparcosCatalog,
} from "./hipparcos-catalog.ts";

test("bounded complete V<=5 pack is manifest-bound and contains recognizable named stars", () => {
  const catalog = loadHipparcosBrightStarCatalog();
  assert.equal(catalog.rows.length, 1_627);
  assert.equal(catalog.rows.length, HIPPARCOS_BRIGHT_STAR_MANIFEST.rowCount);
  assert.ok(catalog.rows.every((row) => row.vMag >= -2 && row.vMag <= 5));
  assert.equal(hipparcosRowByReference("HIP:32349")?.properName, "Sirius");
  assert.equal(hipparcosRowByReference("HIP:91262")?.properName, "Vega");
  assert.equal(hipparcosRowByReference("HIP:11767")?.properName, "Polaris");
});

test("Hipparcos projection is deterministic and preserves stable string identity", () => {
  const input = {
    at: "2026-09-10T12:00:00.000Z",
    latitude: 22.6,
    longitude: 114.5,
    elevationM: 30,
  };
  const first = positionHipparcosCatalog(input);
  const second = positionHipparcosCatalog(input);
  assert.deepEqual(first, second);
  assert.equal(first.length, 1_627);
  assert.ok(first.every((row) => /^HIP:\d+$/u.test(row.sourceId)));
  assert.ok(first.every((row) => Number.isFinite(row.azimuthDeg) && Number.isFinite(row.altitudeDeg)));
});
