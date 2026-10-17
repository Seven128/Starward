import assert from "node:assert/strict";
import test from "node:test";
import { createRasterFileAdapter, type RasterFilePlatform } from "./raster-file-adapter.ts";

function platform() {
  let callbacks!: Parameters<RasterFilePlatform["download"]>[0];
  let progress!: (value: { totalBytesWritten: number; totalBytesExpectedToWrite: number }) => void;
  let aborts = 0, failStat = false, requestedSha = false;
  const driver: RasterFilePlatform = {
    download: options => { callbacks = options; return { abort: () => { aborts++; }, onProgressUpdate: callback => { progress = callback; } }; },
    stat: async (_path, hash) => { requestedSha = hash; if (failStat) throw new Error("stat failed"); return { size: 3, digest: "a".repeat(64) }; },
    remove: async () => undefined,
  };
  return { driver, get callbacks() { return callbacks; }, get aborts() { return aborts; }, get requestedSha() { return requestedSha; },
    failStat: () => { failStat = true; }, progress: (bytes: number) => progress({ totalBytesWritten: bytes, totalBytesExpectedToWrite: bytes }) };
}

test("raster transport asks the native filesystem for the image's SHA-256 and preserves its byte result", async () => {
  const p = platform(), adapter = createRasterFileAdapter(p.driver, path => `https://owned.invalid${path}`);
  const result = adapter.download({ key: "a", url: "/v2/terrain/assets/a.png", expectedSha256: "a".repeat(64) }, new AbortController().signal, 10);
  assert.equal(p.callbacks.timeout, 18000);
  p.callbacks.success({ statusCode: 200, tempFilePath: "/owned/a" });
  assert.deepEqual(await result, { path: "/owned/a", bytes: 3, sha256: "a".repeat(64) }); assert.equal(p.requestedSha, true);
});

test("a successful but cancelled or unstatable temp file still returns disposal ownership", async () => {
  const p = platform(), controller = new AbortController(), adapter = createRasterFileAdapter(p.driver, path => path);
  const result = adapter.download({ key: "a", url: "/v2/terrain/assets/a.png" }, controller.signal, 10);
  controller.abort(); assert.equal(p.aborts, 1); p.failStat();
  p.callbacks.success({ statusCode: 200, tempFilePath: "/owned/late" });
  const file = await result; assert.equal(file.path, "/owned/late"); assert.equal(file.bytes, 10);
  assert.match(file.integrityError!.message, /stat_failed/);
});

test("oversized native download progress aborts the transfer and reports its real failure", async () => {
  const p = platform(), adapter = createRasterFileAdapter(p.driver, path => path);
  const result = adapter.download({ key: "a", url: "/v2/terrain/assets/a.png" }, new AbortController().signal, 10);
  p.progress(11); assert.equal(p.aborts, 1); p.callbacks.fail({ errMsg: "downloadFile:fail abort" });
  await assert.rejects(result, /download_too_large/);
});
