import assert from "node:assert/strict";
import test from "node:test";
import { createStellarMotion, stellarDirectionAt, rotateStellarDirection } from "./stellar-vectors.ts";
import { bsc5pHorizontalFrame, loadBsc5pBrightStarCatalog, positionBsc5pCatalog } from "./bsc5p-catalog.ts";
import { EquatorFromVector, Horizon, Observer, RotateVector, Rotation_EQJ_EQD, Spherical, VectorFromSphere } from "./astronomy-engine-runtime.ts";

test("catalog vectors keep arcsecond/year units, epoch direction and row-major ENU axes", () => {
  const motion = createStellarMotion({ raDeg: 0, decDeg: 0, pmRaCosDecArcsecYr: 1, pmDecArcsecYr: -1 });
  assert.deepEqual(stellarDirectionAt(motion, 0), [1, 0, 0]);
  const moved = stellarDirectionAt(motion, 1);
  assert.ok(Math.abs(Math.atan2(moved[1], moved[0]) * 180 / Math.PI * 3600 - 1) < 1e-8);
  assert.ok(Math.abs(Math.atan2(moved[2], moved[0]) * 180 / Math.PI * 3600 + 1) < 1e-8);
  assert.deepEqual(rotateStellarDirection([1, 0, 0], [0, 1, 0, 0, 0, 1, 1, 0, 0]), [0, 0, 1]);
  assert.throws(() => stellarDirectionAt(motion, NaN), /epoch_delta/);
  assert.throws(() => stellarDirectionAt([0, 0, 0, 0, 0, 0], 0), /direction_invalid/);
  assert.throws(() => createStellarMotion({ raDeg: 0, decDeg: 91, pmRaCosDecArcsecYr: 0, pmDecArcsecYr: 0 }), /astrometry/);
  assert.throws(() => createStellarMotion({ raDeg: 0, decDeg: 0, pmRaCosDecArcsecYr: Infinity, pmDecArcsecYr: 0 }), /astrometry/);
});

test("all current catalog stars preserve the previous EQD/Horizon path across epoch, hemispheres and poles", () => {
  const catalog = loadBsc5pBrightStarCatalog(), rad = Math.PI / 180;
  const sites = [{ latitude: 22.6, longitude: 114.5, elevationM: 30 },
    { latitude: -33.9, longitude: 151.2, elevationM: 0 },
    { latitude: 90, longitude: -180, elevationM: 0 },
    { latitude: -90, longitude: 180, elevationM: 0 }];
  const times = ["2000-01-01T12:00:00Z", "2026-09-19T23:59:00Z", "2050-06-21T00:01:00Z"];
  const unit = (az: number, alt: number) => [Math.cos(alt * rad) * Math.sin(az * rad),
    Math.cos(alt * rad) * Math.cos(az * rad), Math.sin(alt * rad)];
  for (const site of sites) for (const instant of times) {
    const at = new Date(instant), observer = new Observer(site.latitude, site.longitude, site.elevationM);
    const oldRotation = Rotation_EQJ_EQD(at), frame = bsc5pHorizontalFrame({ ...site, at });
    assert.equal(frame.at, at.toISOString());
    const positions = positionBsc5pCatalog({ ...site, at, catalog });
    assert.equal(positions.length, catalog.rows.length);
    for (let i = 0; i < catalog.rows.length; i++) {
      const row = catalog.rows[i]!, actual = positions[i]!;
      // Retain the former scalar proper-motion + EQD/Horizon path as an
      // equivalence oracle. Astropy accuracy references remain in bsc5p-catalog.test.
      const years = (at.getTime() - Date.UTC(2000, 0, 1, 12)) / (365.25 * 86400000);
      const ra = row.raDeg * rad, dec = row.decDeg * rad;
      const e = row.pmRaCosDecArcsecYr * years * rad / 3600, n = row.pmDecArcsecYr * years * rad / 3600;
      const x = Math.cos(dec) * Math.cos(ra) - e * Math.sin(ra) - n * Math.sin(dec) * Math.cos(ra);
      const y = Math.cos(dec) * Math.sin(ra) + e * Math.cos(ra) - n * Math.sin(dec) * Math.sin(ra);
      const z = Math.sin(dec) + n * Math.cos(dec);
      const sphere = new Spherical(Math.atan2(z, Math.hypot(x, y)) / rad, Math.atan2(y, x) / rad, 1);
      const eqd = EquatorFromVector(RotateVector(oldRotation, VectorFromSphere(sphere, at)));
      const old = Horizon(at, observer, eqd.ra, eqd.dec, "");
      const expected = unit(old.azimuth, old.altitude), result = unit(actual.azimuthDeg, actual.altitudeDeg);
      assert.equal(actual.sourceId, row.sourceId);
      assert.ok(Math.hypot(...expected.map((value, k) => value - result[k])) < 1e-11, row.sourceId);
      assert.equal(actual.visible, old.altitude > 0, row.sourceId);
    }
  }
});
