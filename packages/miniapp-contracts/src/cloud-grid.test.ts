import assert from "node:assert/strict";
import test from "node:test";
import { cloudInstant, cloudTimeBracket, cloudSpatialSample, cloudSampleAt, cloudDisplayRgba, type CloudNumericGrid } from "./cloud-grid.ts";

const grid: CloudNumericGrid = { crs: "WGS84", layout: "row-major-north-to-south", registration: "grid-point-centres", width: 2, height: 2,
  west: 113, north: 23, longitudeStep: 0.1, latitudeStep: -0.1, unit: "fraction", valueType: "float32-le", maskType: "uint8", validMaskValue: 1 };
const runAt = "2026-10-27T00:00:00Z", native = (hours: number[]) => hours.map(stepHours => ({ stepHours, validAt: new Date(Date.parse(runAt) + stepHours * 3_600_000).toISOString() }));
const values = (items: number[], mask = [1, 1, 1, 1]) => ({ values: Float32Array.from(items), mask: Uint8Array.from(mask) });

test("cloud instants reject local-time inference and calendar rollover and normalize offsets", () => {
  const frames = native([0, 3]);
  assert.equal(cloudTimeBracket(frames, runAt, "2026-10-27T01:30:00"), null);
  for (const value of ["2026-11-31T00:00:00Z", "2026-02-29T00:00:00Z", "2026-10-27T24:00:00Z"])
    assert.equal(cloudInstant(value), null);
  assert.equal(cloudInstant("2026-10-27T09:30:00+08:00"), "2026-10-27T01:30:00Z");
  assert.deepEqual(cloudTimeBracket(frames, runAt, "2026-10-27T09:30:00+08:00"), cloudTimeBracket(frames, runAt, "2026-10-27T01:30:00Z"));
});

test("3h/6h transition preserves exact selected time without crossing gaps or extending the edge", () => {
  const frames = native([141, 144, 150, 156]), selectedAt = new Date(Date.parse(runAt) + 147.5 * 3_600_000).toISOString();
  const bracket = cloudTimeBracket(frames, runAt, selectedAt)!;
  assert.equal(bracket.fraction, 3.5 / 6);
  assert.deepEqual([bracket.lowerIndex, bracket.upperIndex], [1, 2]);
  assert.equal(cloudTimeBracket(native([141, 150]), runAt, selectedAt), null);
  assert.equal(cloudTimeBracket(frames, runAt, new Date(Date.parse(runAt) + 157 * 3_600_000).toISOString()), null);
  assert.equal(cloudTimeBracket(frames, "2026-10-27T12:00:00Z", selectedAt), null);
  assert.equal(cloudTimeBracket(frames, runAt, frames[2]!.validAt)!.fraction, 0);
});

test("bilinear sampling keeps real zero and refuses missing positive-weight support", () => {
  assert.equal(cloudSpatialSample(grid, values([0, 0.25, 0.5, 1]), 23, 113), 0);
  assert(Math.abs(cloudSpatialSample(grid, values([0, 0.25, 0.5, 1]), 22.95, 113.05)! - 0.4375) < 1e-12);
  const missing = values([0, 0.25, 0.5, NaN], [1, 1, 1, 0]);
  assert.equal(cloudSpatialSample(grid, missing, 22.95, 113.05), null);
  assert.equal(cloudSpatialSample(grid, missing, 23, 113), 0);
  assert.equal(cloudSpatialSample(grid, missing, 23.01, 113), null);
  assert.equal(cloudSpatialSample(grid, values([0, 0.25, 0.5, 1]), 22.9, 113.1), 1);
});

test("temporal interpolation happens on numbers before colour", () => {
  const selectedAt = "2026-10-27T01:30:00Z", bracket = cloudTimeBracket(native([0, 3]), runAt, selectedAt)!;
  const input = { grid, bracket, lower: values([0, 0, 0, 0]), upper: values([1, 1, 1, 1]), latitude: 22.95, longitude: 113.05,
    runAt, selectedAt, publicationId: "ecmwf-tcc:fixed" };
  const sample = cloudSampleAt(input)!;
  assert.equal(sample.cloudPercent, 50);
  assert.equal(sample.interpolation, "LINEAR");
  assert.equal(sample.selectedAt, selectedAt);
  assert.deepEqual(cloudDisplayRgba(sample.cloudPercent).slice(0, 3), [0x76, 0xaa, 0xb2]);
  assert.equal(cloudSampleAt({ ...input, upper: values([0, 0, 0, 0], [0, 0, 0, 0]) }), null);
  assert.equal(cloudDisplayRgba(0)[3], 0x6b);
  assert.equal(cloudDisplayRgba(null)[3], 0);
});
