import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";
import { calculateAnnualSolarReferenceAt, calculateDriftingMeteorRadiantAt, calculateEquatorialHorizontalAt, calculateSolarLongitudeJ2000 } from "./astronomy-engine-adapter.ts";
import references from "./test-fixtures/gmn-astropy-reference.ts";

function separation(ra: number, dec: number, otherRa: number, otherDec: number) {
  const rad = Math.PI / 180;
  return Math.acos(Math.max(-1, Math.min(1, Math.sin(dec * rad) * Math.sin(otherDec * rad) + Math.cos(dec * rad) * Math.cos(otherDec * rad) * Math.cos((ra - otherRa) * rad)))) / rad;
}

test("GMN drift and J2000-to-date geometry agree with independent Astropy", () => {
  const engine = createRequire(import.meta.url)("astronomy-engine") as typeof import("astronomy-engine");
  for (const reference of references) {
    const actual = calculateDriftingMeteorRadiantAt(reference.model, reference.at)!;
    assert.ok(actual, reference.code);
    assert.ok(Math.abs(actual.solarLongitudeDeg - reference.solarLongitudeDeg) < 0.002, reference.code);
    assert.ok(separation(actual.rightAscensionDeg, actual.declinationDeg, reference.rightAscensionDeg, reference.declinationDeg) < 0.02, `${reference.code} equatorial`);
    const view = calculateEquatorialHorizontalAt({ ...actual, at: reference.at, latitude: 22.6, longitude: 114.5, elevationM: 30 });
    assert.ok(separation(view.azimuthDeg, view.altitudeDeg, reference.azimuthDeg, reference.altitudeDeg) < 0.02, `${reference.code} horizon`);
    // Bounded mutation: omitting precession/nutation is the displaced old
    // static-coordinate mechanism and must fail this independent expectation.
    const offset = ((actual.solarLongitudeDeg - reference.model.referenceSolarLongitudeDeg + 540) % 360) - 180;
    const longitude = actual.solarLongitudeDeg + reference.model.sunCenteredLongitudeDeg + reference.model.longitudeDriftDegPerDeg * offset;
    const latitude = reference.model.latitudeDeg + reference.model.latitudeDriftDegPerDeg * offset;
    const wrong = engine.EquatorFromVector(engine.RotateVector(engine.Rotation_ECL_EQJ(), engine.VectorFromSphere(new engine.Spherical(latitude, longitude, 1), new Date(reference.at))));
    assert.ok(separation(wrong.ra * 15, wrong.dec, reference.rightAscensionDeg, reference.declinationDeg) > 0.02, `${reference.code} epoch mutation detected`);
  }
});

test("measured radiant interval is independent of the wider annual monitoring window", () => {
  const urs = references.find(row => row.code === "URS")!;
  assert.ok(calculateDriftingMeteorRadiantAt(urs.model, urs.at));
  assert.equal(calculateDriftingMeteorRadiantAt(urs.model, "2026-12-24T00:00:00Z"), null);
  assert.equal(calculateDriftingMeteorRadiantAt(urs.model, "2026-06-21T00:00:00Z"), null);
  assert.throws(() => calculateDriftingMeteorRadiantAt({ ...urs.model, latitudeDeg: Number.NaN }, urs.at), /model_invalid/);
  assert.throws(() => calculateDriftingMeteorRadiantAt(urs.model, "invalid"), /instant_invalid/);
});

test("annual references cross the requested J2000 longitude across calendar years and zero", () => {
  for (const year of [2025, 2026, 2027]) {
    for (const longitude of [0, 1, 140.4, 270.4, 283, 359]) {
      const at = calculateAnnualSolarReferenceAt(year, longitude);
      assert.equal(new Date(at).getUTCFullYear(), year);
      const delta = ((calculateSolarLongitudeJ2000(at) - longitude + 540) % 360) - 180;
      assert.ok(Math.abs(delta) < 0.00001, `${year} ${longitude}: ${delta}`);
    }
  }
  assert.throws(() => calculateAnnualSolarReferenceAt(2026, 360), /reference_invalid/);
});

test("sun-centered angle wraps without a discontinuity and drift affects the returned direction", () => {
  const at = "2026-03-21T00:00:00Z";
  const referenceSolarLongitudeDeg = calculateSolarLongitudeJ2000(at);
  const model = { ...references[0].model, referenceSolarLongitudeDeg, sunCenteredLongitudeDeg: 359.99,
    latitudeDeg: 30, longitudeDriftDegPerDeg: .2, latitudeDriftDegPerDeg: .1, validSolarOffsetMinDeg: -5, validSolarOffsetMaxDeg: 5 };
  const before = calculateDriftingMeteorRadiantAt(model, at)!;
  const after = calculateDriftingMeteorRadiantAt(model, "2026-03-22T00:00:00Z")!;
  const distance = separation(before.rightAscensionDeg, before.declinationDeg, after.rightAscensionDeg, after.declinationDeg);
  assert.ok(distance > .5 && distance < 2);
  const withoutDrift = calculateDriftingMeteorRadiantAt({ ...model, longitudeDriftDegPerDeg: 0, latitudeDriftDegPerDeg: 0 }, "2026-03-22T00:00:00Z")!;
  assert.ok(separation(after.rightAscensionDeg, after.declinationDeg, withoutDrift.rightAscensionDeg, withoutDrift.declinationDeg) > .1);
});

test("annual reference never leaks into neighboring years and repeated leap-year crossings choose the first", () => {
  const start = "2026-01-01T00:00:00.000Z";
  const longitude = calculateSolarLongitudeJ2000(start);
  assert.equal(calculateAnnualSolarReferenceAt(2026, longitude), start);
  assert.ok(calculateAnnualSolarReferenceAt(2026, longitude + .000001).startsWith("2026-01-01"));
  assert.throws(() => calculateAnnualSolarReferenceAt(2026, longitude - .000001), /absent_in_year/);
  const leapStart = calculateSolarLongitudeJ2000("2024-01-01T00:00:00Z");
  // A leap year extends beyond a full tropical revolution. This longitude
  // crosses early in January and again near year end; choose the first.
  assert.ok(calculateAnnualSolarReferenceAt(2024, leapStart + .1).startsWith("2024-01-01"));
});
