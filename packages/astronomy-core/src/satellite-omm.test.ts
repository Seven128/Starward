import assert from "node:assert/strict";
import test from "node:test";
import { propagateCelesTrakOmm } from "./satellite-omm.ts";

// Deliberately constructed OMM elements: this is not a cached supplier row.
const orbit = {
  OBJECT_NAME: "SYNTHETIC STATION",
  OBJECT_ID: "2026-001A",
  NORAD_CAT_ID: 100789,
  EPOCH: "2026-09-22T06:30:37.496448",
  MEAN_MOTION: 15.5,
  ECCENTRICITY: 0.0004,
  INCLINATION: 51.6,
  RA_OF_ASC_NODE: 234,
  ARG_OF_PERICENTER: 100,
  MEAN_ANOMALY: 20,
  BSTAR: 0.0002,
  MEAN_MOTION_DOT: 0.0001,
  MEAN_MOTION_DDOT: 0,
  ELEMENT_SET_NO: 1,
} as const;
const observer = { latitudeDeg: 22.54, longitudeDeg: 113.95, elevationM: 50 };
const at = new Date("2026-09-22T07:30:37.496Z");

test("OMM SGP4 binds UTC epoch, observer and time while accepting six-digit NORAD identity", () => {
  const local = propagateCelesTrakOmm(orbit, at, observer, 180);
  const zulu = propagateCelesTrakOmm({ ...orbit, EPOCH: `${orbit.EPOCH}Z` }, at, observer, 180);
  assert.equal(local.state, "AVAILABLE");
  assert.deepEqual(local, zulu);
  if (local.state !== "AVAILABLE") return;
  assert.equal(local.catalogId, "100789");
  assert.equal(local.epochAt, "2026-09-22T06:30:37.496Z");
  assert.equal(local.epochAgeMinutes, 60);
  assert.ok(local.azimuthDeg >= 0 && local.azimuthDeg < 360);
  assert.ok(local.altitudeDeg >= -90 && local.altitudeDeg <= 90);
  assert.ok(local.rangeKm > 100);
  const changedTime = propagateCelesTrakOmm(orbit, new Date(at.getTime() + 15*60_000), observer, 180);
  const changedPlace = propagateCelesTrakOmm(orbit, at, { ...observer, longitudeDeg: 90 }, 180);
  assert.equal(changedTime.state, "AVAILABLE");
  assert.equal(changedPlace.state, "AVAILABLE");
  if (changedTime.state === "AVAILABLE" && changedPlace.state === "AVAILABLE") {
    assert.ok(Math.abs(changedTime.altitudeDeg - local.altitudeDeg) > 1);
    assert.ok(Math.abs(changedPlace.altitudeDeg - local.altitudeDeg) > 1);
  }
});

test("stale orbit carries identity and epoch but never a fabricated position", () => {
  const result = propagateCelesTrakOmm(orbit, at, observer, 30);
  assert.deepEqual(result, {
    state: "STALE_ORBIT", catalogId: "100789", epochAt: "2026-09-22T06:30:37.496Z",
    at: at.toISOString(), epochAgeMinutes: 60,
  });
  const tooEarly = propagateCelesTrakOmm(orbit, new Date("2026-09-21T06:30:37.496Z"), observer, 180);
  assert.equal(tooEarly.state, "STALE_ORBIT");
});

test("rejects altered frame, impossible elements, local-time epoch and invalid observer", () => {
  for (const row of [
    { ...orbit, REF_FRAME: "ICRF" },
    { ...orbit, MEAN_ELEMENT_THEORY: "KEPLER" },
    { ...orbit, ECCENTRICITY: 1 },
    { ...orbit, MEAN_MOTION: 0 },
    { ...orbit, EPOCH: "2026-09-22T06:30:37+08:00" },
    { ...orbit, ELEMENT_SET_NO: undefined },
  ]) assert.throws(() => propagateCelesTrakOmm(row, at, observer, 180), /satellite_omm_invalid:/u);
  assert.throws(() => propagateCelesTrakOmm(orbit, at, { ...observer, latitudeDeg: 91 }, 180), /satellite_omm_invalid:observer/u);
});
