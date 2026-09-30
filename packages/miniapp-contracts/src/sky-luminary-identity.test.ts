import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import { celestialReferenceKindMatches, isCelestialObjectReference } from "./celestial-identity.ts";
import { SKY_LUMINARY_CATALOG_HASH, SKY_LUMINARY_CATALOG_VERSION, skyLuminaryPosition } from "./sky-luminary-identity.ts";
import { isSkyPlanetReference } from "./sky-planet-identity.ts";

test("Sun/Moon keep exact identities and scientific kinds outside the seven planets", () => {
  assert.equal(isCelestialObjectReference("SOLAR:SUN"), true);
  assert.equal(isCelestialObjectReference("SOLAR:MOON"), true);
  assert.equal(isSkyPlanetReference("SOLAR:SUN"), false);
  assert.equal(isCelestialObjectReference("PLANET:SUN"), false);
  assert.equal(isCelestialObjectReference("SOLAR:EARTH"), false);
  assert.equal(celestialReferenceKindMatches("SOLAR:SUN", "STAR"), true);
  assert.equal(celestialReferenceKindMatches("SOLAR:MOON", "MOON"), true);
  assert.equal(celestialReferenceKindMatches("SOLAR:MOON", "STAR"), false);
  assert.equal(celestialReferenceKindMatches("HR:4905", "MOON"), false);
  assert.equal(celestialReferenceKindMatches("M:51", "GALAXY"), true);
  assert.equal(SKY_LUMINARY_CATALOG_HASH, createHash("sha256")
    .update(`${SKY_LUMINARY_CATALOG_VERSION}:SUN,MOON`).digest("hex"));
});

test("one bad luminary preserves the independent report position and negative altitudes", () => {
  const row = { sunAzimuthDeg: 0, sunAltitudeDeg: -12.5,
    moonAzimuthDeg: 201.123456, moonAltitudeDeg: 32.123456 };
  assert.deepEqual(skyLuminaryPosition(row, "SUN"), { azimuthDeg: 0, altitudeDeg: -12.5 });
  assert.deepEqual(skyLuminaryPosition(row, "MOON"), { azimuthDeg: 201.123456, altitudeDeg: 32.123456 });
  for (const invalid of [NaN, Infinity, 360, -1]) {
    const broken = { ...row, sunAzimuthDeg: invalid };
    assert.equal(skyLuminaryPosition(broken, "SUN"), null);
    assert.deepEqual(skyLuminaryPosition(broken, "MOON"), skyLuminaryPosition(row, "MOON"));
  }
  assert.equal(skyLuminaryPosition(undefined, "MOON"), null);
});
