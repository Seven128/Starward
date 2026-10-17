import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { readCopernicusElevationWindow } from "./copernicus-elevation.ts";
import { renderTerrain } from "./terrain-renderer.ts";
import { copernicusTestSource } from "./test-fixtures/copernicus-test-source.ts";

test("shared numerical reader preserves raw sample positions, no-data and range provenance", async () => {
  const fixture = copernicusTestSource(), budget = { bytes: 0 };
  const result = await readCopernicusElevationWindow(22, 114, [114, 22, 115, 23], 0.1,
    new AbortController().signal, budget, fixture.transport, "NATIVE");
  assert.equal(result.selection, "NATIVE");
  assert.equal(result.pixelIsArea, true);
  assert.deepEqual(result.origin, [114, 23, 0]);
  assert.deepEqual(result.nativeResolution, [0.01, -0.01, 0]);
  assert.equal(result.width, 100);
  assert.equal(result.height, 100);
  assert.equal(result.values[41 * 100 + 5], -32767);
  assert.equal(result.noData, -32767);
  assert.equal(result.values[41 * 100 + 6], 142);
  assert.equal(result.source.etag, '"synthetic-cog"');
  assert.equal(result.source.hashScope, "RETRIEVED_RANGES");
  assert.ok(budget.bytes > 0);
  assert.ok(result.source.ranges?.length);
});

test("DISPLAY overview without affine tags inherits raw georeferencing from the base image", async () => {
  const fixture = copernicusTestSource({ overview: true });
  const result = await readCopernicusElevationWindow(22, 114, [114, 22, 115, 23], 0.03,
    new AbortController().signal, { bytes: 0 }, fixture.transport, "DISPLAY");
  assert.equal(result.width, 50);
  assert.equal(result.height, 50);
  assert.equal(result.values[0], 123);
  assert.deepEqual(result.origin, [114, 23, 0]);
  assert.equal(result.pixelIsArea, true);
  assert.deepEqual(result.nativeResolution, [0.01, -0.01, 0]);
  assert.equal(result.pixelX, 0.02);
  assert.equal(result.pixelY, -0.02);
});

test("native sample budget is shared and checked before raster decoding", async () => {
  const fixture = copernicusTestSource();
  const budget = { bytes: 0, nativeSamples: 500, maximumNativeSamples: 10_499 };
  await assert.rejects(readCopernicusElevationWindow(22, 114, [114, 22, 115, 23], 0,
    new AbortController().signal, budget, fixture.transport, "NATIVE"), /terrain_native_sample_budget_exceeded/u);
  assert.equal(budget.nativeSamples, 500);
});

test("a source ignoring Range releases its unconsumed response body", async () => {
  let cancelled = false;
  const transport = (async () => new Response(new ReadableStream({ cancel() { cancelled = true; } }), { status: 200 })) as typeof fetch;
  await assert.rejects(readCopernicusElevationWindow(22, 114, [114, 22, 115, 23], 0,
    new AbortController().signal, { bytes: 0 }, transport, "NATIVE"), /terrain_source_http_200/u);
  assert.equal(cancelled, true);
});

// Captured with the original in-renderer reader before extracting shared I/O.
// These protect existing image consumers; they do not certify a horizon model.
for (const [purpose, sha256, byteSize] of [
  ["SPOT", "58c8e7ad7b07bf799f344ecff302ed10f6612384df5d34675e3261563f676020", 2498],
  ["MAP", "4ddd8a04771b723522a8cf7bde3e2e4c1b67523f1881f37de49ec49022afa6a5", 5230],
] as const) test(`shared I/O retains legacy ${purpose} PNG bytes`, async () => {
  const fixture = copernicusTestSource();
  const result = await renderTerrain({ purpose,
    center: { system: "GCJ02", latitude: 22.6, longitude: 114.05 }, radiusKm: 2 },
  new AbortController().signal, fixture.transport);
  assert.ok(result);
  assert.equal(result.bytes.length, byteSize);
  assert.equal(createHash("sha256").update(result.bytes).digest("hex"), sha256);
});
