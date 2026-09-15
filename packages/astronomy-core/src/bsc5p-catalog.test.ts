import assert from "node:assert/strict";
import test from "node:test";
import raw from "../data/bsc5p-bright-stars.v1.json" with { type: "json" };
import { bsc5pRowByReference, loadBsc5pBrightStarCatalog, positionBsc5pCatalog, propagateBsc5p, validateBsc5pPack } from "./bsc5p-catalog.ts";

test("real BSC5P subset binds bytes, J2000 identity, original photometry and recognizable names", () => {
  const catalog = loadBsc5pBrightStarCatalog();
  assert.equal(catalog.rows.length, 1630);
  assert.equal(catalog.manifest.rowCount, catalog.rows.length);
  assert.equal(catalog.rows.filter(row => row.properName).length, catalog.manifest.namedRowCount);
  for (const [hr, name] of [["2491", "Sirius"], ["7001", "Vega"], ["424", "Polaris"]])
    assert.equal(bsc5pRowByReference(`HR:${hr}`)?.properName, name);
  assert.equal(bsc5pRowByReference("HIP:32349"), null);
  assert.ok(catalog.rows.some(row => row.bV === null));
  assert.ok(catalog.rows.some(row => row.vMagCode === "H"));
  assert.ok(catalog.rows.every(row => row.refEpoch === 2000 && row.vMag <= 5));
});

test("malformed identity, nonstellar rows, epoch, units and duplicate rows are rejected", () => {
  const invalid = [
    (pack: any) => { pack.rows[0].sourceId = "HIP:32349"; },
    (pack: any) => { pack.rows[0].hr = "92"; pack.rows[0].sourceId = "HR:92"; },
    (pack: any) => { pack.rows[0].refEpoch = 1991.25; },
    (pack: any) => { pack.rows[0].pmRaCosDecArcsecYr = null; },
    (pack: any) => { pack.rows[0].bV = Number.NaN; },
    (pack: any) => { pack.rows[1] = pack.rows[0]; },
  ];
  for (const mutate of invalid) { const pack = structuredClone(raw); mutate(pack); assert.throws(() => validateBsc5pPack(pack), /bsc5p_catalog_invalid/); }
});

// Independently generated with Astropy 6.1.7: FK5(equinox=J2000), source PM in
// arcsec/year, apply_space_motion from UTC 2000-01-01T12:00 to 2026-09-15T12:00.
// AltAz uses EarthLocation(114.5deg,22.6deg,30m), pressure=0, bundled IERS, no network.
// Its apparent direction includes corrections beyond this renderer's geometric
// rotation; compare spherical separation within 0.02deg, not azimuth near zenith.
const references = [
  ["2491", 101.28281661505073, -16.72503871165199, 51.22458732267264, -80.91483593521718],
  ["7001", 279.2365223327655, 38.78572154788243, 335.5776566698064, 71.87115731746862],
  ["424", 37.974847382006246, 89.26408867519592, 0.5991206729510402, 22.304281079602152],
  ["1084", 53.22517524137701, -9.458144144959903, 85.42386704084134, -35.42149648810886],
] as const;
function separation(a: number, b: number, c: number, d: number) {
  const rad = Math.PI / 180;
  return Math.acos(Math.min(1, Math.max(-1, Math.sin(b * rad) * Math.sin(d * rad) + Math.cos(b * rad) * Math.cos(d * rad) * Math.cos((a - c) * rad)))) / rad;
}
test("proper motion and local horizon agree with independent Astropy reference, including Polaris", () => {
  const at = new Date("2026-09-15T12:00:00Z");
  const positions = positionBsc5pCatalog({ at, latitude: 22.6, longitude: 114.5, elevationM: 30 });
  for (const [hr, ra, dec, az, alt] of references) {
    const row = bsc5pRowByReference(`HR:${hr}`)!;
    const moved = propagateBsc5p(row, at);
    assert.ok(Math.abs(moved.raDeg - ra) < 0.000001, `HR ${hr} RA: ${moved.raDeg}`);
    assert.ok(Math.abs(moved.decDeg - dec) < 0.000001, `HR ${hr} Dec: ${moved.decDeg}`);
    const position = positions.find(item => item.sourceId === row.sourceId)!;
    assert.ok(separation(position.azimuthDeg, position.altitudeDeg, az, alt) < 0.02, `HR ${hr} horizontal`);
    assert.equal(position.visible, alt > 0);
    // Bounded unit mutation: incorrectly treating arcsec/year as mas/year must fail.
    const wrong = propagateBsc5p({ ...row, pmRaCosDecArcsecYr: row.pmRaCosDecArcsecYr / 1000, pmDecArcsecYr: row.pmDecArcsecYr / 1000 }, at);
    assert.ok(Math.abs(wrong.raDeg - ra) > 0.000001);
  }
});

test("epoch is invariant, polar motion stays finite, invalid observers fail closed", () => {
  const row = bsc5pRowByReference("HR:2491")!;
  const original = propagateBsc5p(row, new Date("2000-01-01T12:00:00Z"));
  assert.ok(Math.abs(original.raDeg - row.raDeg) < 1e-10);
  assert.ok(Math.abs(original.decDeg - row.decDeg) < 1e-10);
  for (const decDeg of [-90, 90]) {
    const polar = propagateBsc5p({ ...row, decDeg }, new Date("2050-01-01T00:00:00Z"));
    assert.ok(Number.isFinite(polar.raDeg) && Math.abs(polar.decDeg) <= 90);
  }
  assert.throws(() => positionBsc5pCatalog({ at: "invalid", latitude: 0, longitude: 0, elevationM: 0 }), /instant_invalid/);
  assert.throws(() => positionBsc5pCatalog({ at: "2026-09-15", latitude: 91, longitude: 0, elevationM: 0 }), /observer_invalid/);
});
