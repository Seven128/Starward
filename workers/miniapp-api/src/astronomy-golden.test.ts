import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  calculateMiniappNightSky,
  calculateSolarLongitudeJ2000,
  calculateTargetHorizontalAt,
  type MiniappAstronomyTarget,
} from "./astronomy-engine-adapter.ts";

function angularDistance(left: number, right: number) {
  return Math.abs(((left - right + 540) % 360) - 180);
}

test("solar longitude is calculated on the J2000 ecliptic axis", () => {
  assert.ok(
    angularDistance(
      calculateSolarLongitudeJ2000("2026-03-20T14:46:00.000Z"),
      0,
    ) < 0.5,
  );
  assert.ok(
    angularDistance(
      calculateSolarLongitudeJ2000("2026-06-21T08:25:00.000Z"),
      90,
    ) < 0.5,
  );
  assert.throws(
    () => calculateSolarLongitudeJ2000("not-a-time"),
    /valid_iso_time_required/u,
  );
});

interface GoldenFixture {
  datasetId: string;
  source: { provider: string; apiVersion: string; usage: string };
  toleranceDeg: { azimuth: number; altitude: number };
  pointCases: Array<{
    id: string;
    target: MiniappAstronomyTarget;
    observer: { latitude: number; longitude: number; elevationM: number };
    at: string;
    expected: { azimuthDeg: number; altitudeDeg: number };
  }>;
  rangeCases: Array<{
    id: string;
    observer: { latitude: number; longitude: number; elevationM: number };
    minimumAltitudeDeg: number;
    expected: {
      moonRise?: null;
      moonSet?: null;
      astronomicalDusk?: null;
      astronomicalDawn?: null;
      sampleCount?: number;
    };
  }>;
}

const fixture = JSON.parse(
  await readFile(
    new URL("../testdata/jpl-horizons-observer-airless-v1.json", import.meta.url),
    "utf8",
  ),
) as GoldenFixture;

function circularDifferenceDegrees(left: number, right: number): number {
  const raw = Math.abs(left - right) % 360;
  return Math.min(raw, 360 - raw);
}

test("airless topocentric positions stay within the frozen JPL Horizons tolerance", () => {
  assert.equal(fixture.datasetId, "jpl-horizons-observer-airless-v1");
  assert.equal(fixture.source.provider, "NASA/JPL Horizons API");
  assert.equal(fixture.source.apiVersion, "1.2");
  assert.match(fixture.source.usage, /never called by the Mini Program runtime/u);

  for (const golden of fixture.pointCases) {
    const actual = calculateTargetHorizontalAt({
      ...golden.observer,
      at: golden.at,
      target: golden.target,
    });
    assert.ok(
      circularDifferenceDegrees(
        actual.azimuthDeg,
        golden.expected.azimuthDeg,
      ) <= fixture.toleranceDeg.azimuth,
      `${golden.id}: azimuth ${actual.azimuthDeg} differs from ${golden.expected.azimuthDeg}`,
    );
    assert.ok(
      Math.abs(actual.altitudeDeg - golden.expected.altitudeDeg) <=
        fixture.toleranceDeg.altitude,
      `${golden.id}: altitude ${actual.altitudeDeg} differs from ${golden.expected.altitudeDeg}`,
    );
  }
});

test("the same observation night spans UTC and local midnight without changing ownership", () => {
  const result = calculateMiniappNightSky({
    latitude: 40.7128,
    longitude: -74.006,
    elevationM: 10,
    timezone: "America/New_York",
    nightDate: "2026-11-01",
    target: "moon",
    cadenceMinutes: 30,
  });
  assert.equal(result.nightDate, "2026-11-01");
  assert.ok(result.astronomicalDusk?.startsWith("2026-11-01T"));
  assert.ok(result.astronomicalDawn?.startsWith("2026-11-02T"));
  assert.ok(result.samples.some((sample) => sample.at.startsWith("2026-11-02T")));
});

test("observer elevation participates in lunar parallax", () => {
  const seaLevel = fixture.pointCases.find(
    (item) => item.id === "altitude-parallax-sea-level-moon",
  )!;
  const summit = fixture.pointCases.find(
    (item) => item.id === "altitude-parallax-summit-moon",
  )!;
  const actualSea = calculateTargetHorizontalAt({
    ...seaLevel.observer,
    at: seaLevel.at,
    target: seaLevel.target,
  });
  const actualSummit = calculateTargetHorizontalAt({
    ...summit.observer,
    at: summit.at,
    target: summit.target,
  });
  const expectedDelta =
    summit.expected.altitudeDeg - seaLevel.expected.altitudeDeg;
  const actualDelta = actualSummit.altitudeDeg - actualSea.altitudeDeg;
  assert.ok(Math.abs(actualDelta - expectedDelta) <= 0.00001);
  assert.notEqual(actualSummit.altitudeDeg, actualSea.altitudeDeg);
});

test("no-rise/set and extreme-latitude cases fail closed without invented samples", () => {
  const noRise = fixture.rangeCases.find(
    (item) => item.id === "no-moon-rise-or-set-within-search-window",
  )!;
  assert.ok(noRise.minimumAltitudeDeg > 3);
  const circumpolarMoon = calculateMiniappNightSky({
    ...noRise.observer,
    timezone: "UTC",
    nightDate: "2026-01-01",
    target: "moon",
    cadenceMinutes: 60,
  });
  assert.equal(circumpolarMoon.moonRise, noRise.expected.moonRise);
  assert.equal(circumpolarMoon.moonSet, noRise.expected.moonSet);

  const polar = fixture.rangeCases.find(
    (item) =>
      item.id === "extreme-latitude-midnight-sun-no-astronomical-night",
  )!;
  assert.ok(polar.minimumAltitudeDeg > 3);
  const midnightSun = calculateMiniappNightSky({
    ...polar.observer,
    timezone: "Europe/Oslo",
    nightDate: "2026-06-21",
    target: "moon",
    cadenceMinutes: 60,
  });
  assert.equal(midnightSun.astronomicalDusk, polar.expected.astronomicalDusk);
  assert.equal(midnightSun.astronomicalDawn, polar.expected.astronomicalDawn);
  assert.equal(midnightSun.samples.length, polar.expected.sampleCount);
});
