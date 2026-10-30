import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, rm, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { gcj02ToWgs84RasterBranches, latitudeForMercatorY } from "@starward/coordinate-system";
import { nightLightSourceFootprints, projectNightLightGrid, type NightLightWarpSpec } from "./project_display_grid.mts";

const spec: NightLightWarpSpec = { schemaVersion: "starward-nightlight-warp-input-v1",
  source: { width: 4, height: 4, west: 114, north: 23, longitudeStep: 1 / 240, latitudeStep: -1 / 240 },
  sourceSubdivision: 3,
  window: { grid: "gcj02-mercator-pixel-centres-v1", zoom: 11, x: 1672, y: 890, columns: 1, rows: 1, tilePixels: 256 } };
// Frozen before the shared traversal was introduced: the real two-part edge
// declaration and geometry from real-part-boundary-20261030. No private inputs
// or data processing are required to check those coordinate-only results.
const edgeWindows = [3344, 3345].map(x => ({ ...spec.window, zoom: 12, x, y: 1784 }));
const edgeEnvelopes = [
  { west: 113.90138104213295, south: 22.51255695405144, east: 113.994140625, north: 22.59677387248394 },
  { west: 113.98916971847159, south: 22.51255695405144, east: 114.08203125, north: 22.596620494917122 },
];
const edgeGeometry = [
  { area: "03597681b3457732cb355685b73c60a94d41bae19d24b71d96b9767479f0b8b9", branch: "916b144867c340614f515c7b0e5415c74832d899c05264ded2a277a6e81d81ff" },
  { area: "691bc9c8a722ef26740d3ff22f1835908840bd49cf9fef3cab39c0416167b0bb", branch: "3f2cad408bc4232e138ce13fce8ab850740ad3cc8a59b3c38bcb7a01afaf324d" },
];
async function ownedTemporary(run: (root: string) => Promise<void>) {
  const root = await mkdtemp(path.join(tmpdir(), "starward-eog-grid-cache-test-"));
  try { await run(root); }
  finally {
    assert.equal(path.dirname(path.resolve(root)), path.resolve(tmpdir()));
    assert.ok(path.basename(root).startsWith("starward-eog-grid-cache-test-"));
    await rm(root, { recursive: true, force: true });
  }
}

test("batch windows reuse exact source arrays without changing target geometry or publication metadata", async () => {
  await ownedTemporary(async root => {
    const cache = path.join(root, "source-cache"), plain = path.join(root, "plain"), first = path.join(root, "first"), second = path.join(root, "second");
    const original = await projectNightLightGrid(spec, plain);
    const cached = await projectNightLightGrid(spec, first, { sourceCacheDirectory: cache });
    assert.deepEqual(await projectNightLightGrid(spec, first, { sourceCacheDirectory: cache }), cached, "a completed window can be resumed without replacing bytes");
    const moved = await projectNightLightGrid({ ...spec, window: { ...spec.window, y: 891 } }, second, { sourceCacheDirectory: cache });
    assert.deepEqual(cached, original, "a cache hit cannot acquire a different published identity");
    for (const name of ["sourceX", "sourceY", "identityX", "identityY"]) {
      assert.equal(moved.files[name]!.sha256, original.files[name]!.sha256);
      assert.ok((await readFile(path.join(first, cached.files[name]!.file))).equals(await readFile(path.join(plain, original.files[name]!.file))));
      const a = await stat(path.join(first, cached.files[name]!.file), { bigint: true });
      const b = await stat(path.join(second, moved.files[name]!.file), { bigint: true });
      assert.equal(a.dev, b.dev); assert.equal(a.ino, b.ino); assert.ok(a.nlink >= 3n, "the job must not duplicate full source arrays per cell");
    }
    assert.notEqual(moved.files.targetArea!.sha256, cached.files.targetArea!.sha256, "each window still computes its own target area");
    assert.equal(JSON.stringify(cached).includes(root), false, "private cache paths are not publication metadata");
  });
});

test("changed cached source bytes fail closed before another window is sealed", async () => {
  await ownedTemporary(async root => {
    const cache = path.join(root, "source-cache");
    await projectNightLightGrid(spec, path.join(root, "first"), { sourceCacheDirectory: cache });
    const [key] = await readdir(cache); assert.ok(key);
    const source = path.join(cache, key!, "sourceX.f64"), bytes = await readFile(source); bytes[0] ^= 1;
    await writeFile(source, bytes); // Only this test's owned temporary source is faulted.
    const next = path.join(root, "next");
    await assert.rejects(projectNightLightGrid(spec, next, { sourceCacheDirectory: cache }), /nightlight_source_grid_cache_invalid/u);
    await assert.rejects(readFile(path.join(next, "warp-grid.json")), { code: "ENOENT" });
  });
});

test("source footprints contain both branches at every actual corner, including an interior edge extremum", () => {
  const [left, right] = edgeWindows, [a, b] = edgeEnvelopes;
  const result = nightLightSourceFootprints([[right!], [left!], [left!, right!]]);
  assert.deepEqual(result, [b, a, { ...a, east: b!.east }], "parts preserve input order and aggregate their actual windows");
  const bounds = result[1]!;
  let fourCornerNorth = -Infinity;
  for (let row = 0; row <= 256; row++) for (let column = 0; column <= 256; column++) {
    const branches = gcj02ToWgs84RasterBranches({ system: "GCJ-02",
      lon: (left!.x * 256 + column) / (256 * 2 ** left!.zoom) * 360 - 180,
      lat: latitudeForMercatorY((left!.y * 256 + row) / (256 * 2 ** left!.zoom)) });
    for (const point of [branches.shifted, branches.identity]) {
      assert.ok(point.lon >= bounds.west && point.lon <= bounds.east && point.lat >= bounds.south && point.lat <= bounds.north);
      if ([0, 256].includes(row) && [0, 256].includes(column)) fourCornerNorth = Math.max(fourCornerNorth, point.lat);
    }
  }
  assert.ok(bounds.north > fourCornerNorth, "four geographic corners would clip the internal edge extremum");
});

test("shared corner traversal preserves the sealed target area and branch bytes on both real boundary cells", async () => {
  await ownedTemporary(async root => {
    for (const [index, window] of edgeWindows.entries()) {
      const actual = await projectNightLightGrid({ ...spec, window }, path.join(root, String(index)));
      assert.equal(actual.files.targetArea!.sha256, edgeGeometry[index]!.area);
      assert.equal(actual.files.targetBranch!.sha256, edgeGeometry[index]!.branch);
    }
  });
});

test("source declaration rejects a complete malformed batch before geometry or output", () => {
  const window = edgeWindows[0]!;
  const partsInvalid = /nightlight_source_footprint_parts_invalid/u;
  const windowInvalid = /nightlight_source_footprint_window_invalid/u;
  for (const value of [null, {}, [], [null], [[]], Array(4097).fill([window]), [Array(4097).fill(window)]]) {
    assert.throws(() => nightLightSourceFootprints(value), partsInvalid);
  }
  for (const bad of [null, [], { ...window, extra: true }, { ...window, grid: "wgs84" }, { ...window, tilePixels: 512 },
    { ...window, zoom: -1 }, { ...window, zoom: 13 }, { ...window, zoom: 2.5 }, { ...window, x: -1 },
    { ...window, y: 4096 }, { ...window, x: 4095, columns: 2 }, { ...window, y: 4095, rows: 2 },
    { ...window, columns: 0 }, { ...window, columns: 6 }, { ...window, rows: 6 }, { ...window, rows: 1.5 },
    { ...window, x: NaN }, { ...window, x: Infinity }, { ...window, y: true }]) {
    assert.throws(() => nightLightSourceFootprints([[window], [bad]]), windowInvalid);
  }
  const maxWindow = { ...window, columns: 5, rows: 5 };
  assert.throws(() => nightLightSourceFootprints([Array(4096).fill(maxWindow), []]), partsInvalid,
    "even a valid maximum-size first part must not start traversing before a later invalid part is admitted");
  const oversized = Array(10).fill(Array(4096).fill(window));
  assert.ok(Buffer.byteLength(JSON.stringify(oversized)) > 4 * 1024 * 1024, "the fixture itself must exceed the complete-input budget");
  assert.throws(() => nightLightSourceFootprints(oversized), /nightlight_source_footprint_input_budget_exceeded/u);
});

test("stdin footprint CLI emits only ordered bounds and exact current source bindings, with a 4 MiB byte limit", async () => {
  const module = fileURLToPath(new URL("./project_display_grid.mts", import.meta.url));
  const cwd = fileURLToPath(new URL("../../", import.meta.url));
  const invoke = (input: string, args = ["--source-footprints"]) => spawnSync(process.execPath, ["--import", "tsx", module, ...args],
    { cwd, input, encoding: "utf8", timeout: 30_000, maxBuffer: 1024 * 1024 });
  const input = JSON.stringify(edgeWindows.map(window => [window]));
  const exactLimit = invoke(input + " ".repeat(4 * 1024 * 1024 - Buffer.byteLength(input)));
  assert.equal(exactLimit.error, undefined); assert.equal(exactLimit.status, 0, exactLimit.stderr);
  const declaration = JSON.parse(exactLimit.stdout);
  assert.deepEqual(Object.keys(declaration), ["parts", "sourceBindings"]);
  assert.deepEqual(declaration.parts, edgeEnvelopes);
  const files = ["data-pipelines/dark-sky/project_display_grid.mts", "packages/coordinate-system/src/index.ts",
    "packages/coordinate-system/src/raster-grid.ts", "packages/coordinate-system/src/mercator.ts"];
  assert.deepEqual(Object.keys(declaration.sourceBindings), files);
  for (const file of files) assert.equal(declaration.sourceBindings[file], createHash("sha256").update(await readFile(path.join(cwd, file))).digest("hex"));
  const oversized = invoke(input + " ".repeat(4 * 1024 * 1024 + 1 - Buffer.byteLength(input)));
  assert.notEqual(oversized.status, 0); assert.equal(oversized.stdout, "");
  assert.match(oversized.stderr, /nightlight_source_footprint_input_budget_exceeded/u);
  const malformed = invoke(JSON.stringify([[edgeWindows[0]], [{ ...edgeWindows[1], unexpected: true }]]));
  assert.notEqual(malformed.status, 0); assert.equal(malformed.stdout, "");
  assert.match(malformed.stderr, /nightlight_source_footprint_window_invalid/u);
  const extra = invoke(input, ["--source-footprints", "--output", cwd]);
  assert.notEqual(extra.status, 0); assert.equal(extra.stdout, "");
  assert.match(extra.stderr, /nightlight_projection_arguments_invalid/u);
});
