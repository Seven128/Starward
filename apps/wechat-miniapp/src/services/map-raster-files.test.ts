import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createRasterFileAdapter, type RasterFilePlatform } from "./raster-file-adapter";
import { createRasterImageResources } from "./raster-image-resources";
import { isMiniappRequestCancelled } from "./request-lifecycle";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const eogContrastPath = `/v2/night-light/assets/eog-fixed-2025/nightlight-contrast-v1-window-6-52-25-1-1-${"c".repeat(64)}-${"d".repeat(64)}.png`;

test("Map files preserve legacy API paths and admit immutable HTTPS cloud and final EOG objects", () => {
  const ast = ts.createSourceFile("files.ts", readFileSync(new URL("./map-raster-files.ts", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
  const declaration = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === "mapRasterAssetUrl")!;
  const url = vm.runInNewContext(ts.transpileModule(declaration.getText(ast).replace(/^export /, "") + ";mapRasterAssetUrl;", {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText, { __MINIAPP_API_BASE__: "https://example.invalid/" });
  assert.equal(url("/v2/terrain/assets/legacy.png"), "https://example.invalid/v2/terrain/assets/legacy.png");
  assert.equal(url("/v2/night-light/assets/eog-fixed-2025/nightlight.png"), "https://example.invalid/v2/night-light/assets/eog-fixed-2025/nightlight.png");
  const cloudPath = `/v2/cloud/assets/${"a".repeat(64)}/cloud-${"b".repeat(64)}.png`;
  for (const objectPath of [cloudPath, eogContrastPath]) {
    assert.equal(url(`https://assets.example.invalid${objectPath}`), `https://assets.example.invalid${objectPath}`);
    assert.equal(url(`https://assets.example.invalid:8443${objectPath}`), `https://assets.example.invalid:8443${objectPath}`);
    for (const invalid of [`http://assets.example.invalid${objectPath}`, `https://example.invalid${objectPath}`,
      `https://user:secret@assets.example.invalid${objectPath}`, `https://assets.example.invalid${objectPath}?token=private`,
      `https://assets.example.invalid${objectPath}#fragment`, `https://assets.example.invalid/before/..${objectPath}`,
      `https://assets.example.invalid${objectPath.replace("/assets/", "/%61ssets/")}`,
      `https://assets.example.invalid:443${objectPath}`, `https://assets.example.invalid:65536${objectPath}`,
      `https://127.0.0.1${objectPath}`, `https://assets.local${objectPath}`])
      assert.throws(() => url(invalid), /map_raster_asset_path_invalid/u);
  }
  for (const invalid of ["https://other.invalid/image.png", "/v2/night-light/assets/../image.png", "/v2/night-light/assets/image.png"])
    assert.throws(() => url(invalid), /map_raster_asset_path_invalid/u);
  for (const invalid of [cloudPath, `https://assets.example.invalid${cloudPath.replace("/cloud-", "/%63loud-")}`,
    `https://assets.example.invalid${eogContrastPath.replace("-1-1-", "-4-1-")}`,
    `https://assets.example.invalid${eogContrastPath.replace("d".repeat(64), "d".repeat(63))}`,
    `https://assets.example.invalid${eogContrastPath.replace("contrast-v1-", "v2-")}`,
    "https://assets.example.invalid/v2/night-light/assets/eog-fixed-2025/nightlight.png"])
    assert.throws(() => url(invalid), /map_raster_asset_path_invalid/u);
});


// Exercise the complete production wiring at its public Taro boundary. The
// simulated native filesystem rejects unlink on read-only download temp files.
// This checks API/ownership behavior, not actual WeChat filesystem capability.
function nativeHarness(options: { holdDownloads?: boolean; holdListing?: boolean } = {}) {
  const root = "wxfile://usr/map-raster-v1", bytes = Uint8Array.of(1, 2, 3);
  const hash = createHash("sha256").update(bytes).digest("hex");
  const files = new Map<string, Uint8Array>(), blocked = new Set<string>();
  const removals: string[] = [], stats: { path: string; hash: boolean }[] = [];
  const jobs: { path: string; url: string; success(status?: number): void; fail(): void; aborts: number }[] = [];
  let listings = 0, finishListing: (() => void) | undefined, failListing = false;
  const missing = { errMsg: "no such file or directory", errno: 1300002 };
  const native = {
    mkdir(o: { dirPath: string; success(): void }) { assert.equal(o.dirPath, root); o.success(); },
    readdir(o: { dirPath: string; success(result: { files: string[] }): void; fail(error: unknown): void }) {
      listings++;
      const finish = () => failListing ? o.fail({ errno: 1300013, errMsg: "permission denied" }) :
        o.success({ files: [...files.keys()].filter(p => p.startsWith(root + "/")).map(p => p.slice(root.length + 1)) });
      if (options.holdListing) finishListing = finish; else finish();
    },
    getFileInfo(o: { filePath: string; digestAlgorithm?: string; success(info: { size: number; digest?: string }): void; fail(error: unknown): void }) {
      stats.push({ path: o.filePath, hash: o.digestAlgorithm === "sha256" });
      const body = files.get(o.filePath);
      if (!body) { o.fail(missing); return; }
      o.success({ size: body.byteLength, ...(o.digestAlgorithm ? { digest: createHash("sha256").update(body).digest("hex") } : {}) });
    },
    unlink(o: { filePath: string; success(): void; fail(error: unknown): void }) {
      removals.push(o.filePath);
      if (o.filePath.startsWith("wxfile://tmp/") || blocked.has(o.filePath)) {
        o.fail({ errno: 1300013, errMsg: "permission denied" }); return;
      }
      if (!files.delete(o.filePath)) o.fail(missing); else o.success();
    },
  };
  const taro = {
    env: { USER_DATA_PATH: "wxfile://usr" }, getFileSystemManager: () => native,
    downloadFile(o: Parameters<RasterFilePlatform["download"]>[0]) {
      const path = o.filePath || `wxfile://tmp/native-${jobs.length + 1}.png`;
      files.set(path, bytes.slice());
      const job = { path, url: o.url, aborts: 0,
        success: (status = 200) => o.success({ statusCode: status,
          ...(o.filePath ? { filePath: path, tempFilePath: "" } : { tempFilePath: path }) }),
        fail: () => o.fail({ errno: 600005, errMsg: "downloadFile:fail interrupted" }),
      };
      jobs.push(job);
      if (!options.holdDownloads) queueMicrotask(() => job.success());
      return { abort() { job.aborts++; }, onProgressUpdate() {}, catch() {} };
    },
  };
  const module = { exports: {} as { mapRasterFiles: ReturnType<typeof createRasterImageResources> } };
  const source = ts.transpileModule(readFileSync(new URL("./map-raster-files.ts", import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  vm.runInNewContext(source, { module, exports: module.exports, __MINIAPP_API_BASE__: "https://fixture.invalid",
    require(id: string) {
      if (id === "@tarojs/taro") return taro;
      if (id === "./raster-file-adapter") return { createRasterFileAdapter };
      if (id === "./raster-image-resources") return { createRasterImageResources };
      throw Error(`unexpected dependency: ${id}`);
    },
  });
  return { root, files, blocked, jobs, removals, stats, hash, owner: module.exports.mapRasterFiles,
    get listings() { return listings; }, finishListing() { assert(finishListing); finishListing(); },
    set failListing(value: boolean) { failListing = value; } };
}
const tick = () => new Promise<void>(resolve => setImmediate(resolve));
const input = (key: string, hash?: string) => ({ key, url: `/v2/terrain/assets/${key}.png`, expectedBytes: 3,
  ...(hash ? { expectedSha256: hash } : {}) });

test("all three Map consumers share the old eight-file wall and keep native pins", async () => {
  const h = nativeHarness();
  const first = h.owner.acquire(input("first", h.hash)), initial = await first.promise;
  const unpin = h.owner.retainPath(initial.path); first.release();
  for (let i = 0; i < 12; i++) {
    const key = `viewport-${i}`, descriptor = input(key, h.hash);
    if (i % 3 === 1) descriptor.url = i % 2 ? `https://assets.fixture.invalid${eogContrastPath}` : `/v2/night-light/assets/eog-fixed-2025/${key}.png`;
    if (i % 3 === 2) descriptor.url = `https://assets.fixture.invalid/v2/cloud/assets/${"a".repeat(64)}/cloud-${i.toString(16).padStart(64, "0")}.png`;
    const read = h.owner.acquire(descriptor), file = await read.promise;
    assert.equal(h.jobs.at(-1)!.url, descriptor.url.startsWith("https://") ? descriptor.url : `https://fixture.invalid${descriptor.url}`);
    assert.match(file.path, /^wxfile:\/\/usr\/map-raster-v1\/raster-[a-z0-9_]+-[1-9]\d*\.png$/u);
    assert.equal(file.sha256, h.hash);
    read.release(); await tick();
    assert(h.files.has(initial.path), "eviction cannot delete the displayed native file");
    assert(h.owner.snapshot().physicalFiles <= 8); assert(h.files.size <= 8);
  }
  assert.equal(h.jobs.length, 13); assert.equal(h.listings, 1);
  assert.equal(h.owner.snapshot().failedRemovals, 0);
  assert(h.stats.filter(s => s.hash).length >= 13);
  assert(h.removals.length > 0 && h.removals.every(p => p.startsWith(h.root + "/raster-")));
  assert.equal((await h.owner.close()).retainedPinnedFiles, 1);
  assert(h.files.has(initial.path)); unpin(); await tick();
  assert.equal(h.files.size, 0);
});

for (const failure of ["transport", "http-empty", "hash", "late-cancel"] as const)
  test(`owned partial files are retired through the real owner after ${failure}`, async () => {
    const h = nativeHarness({ holdDownloads: true });
    const read = h.owner.acquire(input("partial", failure === "hash" ? "f".repeat(64) : h.hash));
    const failed = read.promise.catch(error => error); await tick();
    const job = h.jobs[0]!;
    if (failure === "late-cancel") {
      read.release(); assert(isMiniappRequestCancelled(await failed));
      assert.equal(job.aborts, 1);
      assert.equal(h.owner.snapshot().activeDownloads, 1, "cancellation cannot invent a native completion");
      job.success();
    } else if (failure === "transport") {
      h.files.set(job.path, Uint8Array.of(1)); job.fail();
      const error = await failed;
      assert.equal(error.message, "raster_image_download_failed"); assert.equal(error.cause.errno, 600005);
    } else if (failure === "http-empty") {
      h.files.set(job.path, new Uint8Array(0)); job.success(503);
      assert.equal((await failed).message, "raster_image_download_failed:503", "an empty error body is not a generic file failure");
    } else {
      job.success(); assert.equal((await failed).message, "raster_image_hash_mismatch");
    }
    await tick();
    assert.deepEqual(h.removals, [job.path]); assert.equal(h.files.size, 0);
    assert.equal(h.owner.snapshot().activeDownloads, 0); assert.equal(h.owner.snapshot().entries, 0);
    await h.owner.close();
  });

test("recovered owned files retain failed-removal accounting and retry without touching unrelated files", async t => {
  t.mock.method(console, "error", () => undefined);
  const h = nativeHarness();
  const old = Array.from({ length: 8 }, (_, i) => `${h.root}/raster-old_session-${i + 1}.png`);
  for (const path of old) { h.files.set(path, Uint8Array.of(1, 2, 3)); h.blocked.add(path); }
  const unrelated = [`${h.root}/account-export.json`, "wxfile://usr/avatar.png"];
  for (const path of unrelated) h.files.set(path, Uint8Array.of(8));
  await assert.rejects(h.owner.acquire(input("blocked")).promise, /raster_image_budget_busy/);
  assert.equal(h.jobs.length, 0);
  assert.equal(h.owner.snapshot().physicalFiles, 8); assert.equal(h.owner.snapshot().failedRemovals, 8);
  assert.equal(h.owner.snapshot().readyBytes, 24);
  h.blocked.clear();
  const retry = h.owner.acquire(input("recovered", h.hash)); await retry.promise; retry.release();
  assert.equal(h.listings, 1, "old files must not be adopted twice on a later admission");
  await h.owner.close();
  assert(old.every(p => !h.files.has(p))); assert(unrelated.every(p => h.files.has(p)));
  assert(h.removals.every(p => !unrelated.includes(p)));
});

test("close during owned-directory recovery prevents download and completes the recovered-file cleanup", async () => {
  const h = nativeHarness({ holdListing: true });
  const old = `${h.root}/raster-old_session-1.png`; h.files.set(old, Uint8Array.of(9));
  const read = h.owner.acquire(input("closed")), failed = read.promise.catch(error => error);
  await tick(); assert.equal(h.listings, 1);
  const closing = h.owner.close(); h.finishListing();
  assert.match((await failed).message, /resources_closed/); await closing;
  assert.equal(h.jobs.length, 0); assert.equal(h.files.size, 0);
  assert.equal(h.owner.snapshot().activeReaders, 0);
});

test("an unreadable owned directory fails readiness and a later explicit request can recover", async () => {
  const h = nativeHarness(); h.failListing = true;
  await assert.rejects(h.owner.acquire(input("unavailable")).promise);
  assert.equal(h.jobs.length, 0); assert.equal(h.owner.snapshot().entries, 0);
  h.failListing = false;
  const retry = h.owner.acquire(input("available", h.hash)); await retry.promise; retry.release();
  assert.equal(h.listings, 2); await h.owner.close();
});
