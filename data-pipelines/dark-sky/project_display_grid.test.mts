import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, rm, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { projectNightLightGrid, type NightLightWarpSpec } from "./project_display_grid.mts";

const spec: NightLightWarpSpec = { schemaVersion: "starward-nightlight-warp-input-v1",
  source: { width: 4, height: 4, west: 114, north: 23, longitudeStep: 1 / 240, latitudeStep: -1 / 240 },
  sourceSubdivision: 3,
  window: { grid: "gcj02-mercator-pixel-centres-v1", zoom: 11, x: 1672, y: 890, columns: 1, rows: 1, tilePixels: 256 } };
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
