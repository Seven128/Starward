/** Actual saved M82 -> unchanged metadata/cache owners under their tested Taro
 * callback/MapFS adapter. No synthetic astronomy, HTTP rerun, decode or GPU claim. */
import assert from "node:assert/strict";
import vm from "node:vm";
import ts from "typescript";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, join, relative } from "node:path";
import { pathToFileURL } from "node:url";
import * as contracts from "@starward/miniapp-contracts";
import { createSkyPublicImageCache } from "../../../../apps/wechat-miniapp/src/services/sky-public-image-cache.ts";

const root = resolve(import.meta.dirname, "../../../.."), out = join(root, "output/sdss-m82-display-client-cache-1004-r7");
mkdirSync(out);
const sha = (b: Uint8Array) => createHash("sha256").update(b).digest("hex");
const bindings = new Map<string, { path: string; bytes: number; sha256: string }>();
function read(p: string) {
  const b = readFileSync(join(root, p)), row = { path: p, bytes: b.length, sha256: sha(b) };
  if (bindings.has(p)) assert.deepEqual(row, bindings.get(p));else bindings.set(p, row);return b;
}
const save = (name: string, value: unknown) => writeFileSync(join(out, name), JSON.stringify(value, null, 2) + "\n", { flag: "wx" });
const sourcePaths = ["apps/wechat-miniapp/src/services/sdss-science-optical-resource.test.ts",
  "apps/wechat-miniapp/src/services/sdss-science-optical-resource.ts", "apps/wechat-miniapp/src/services/sky-publication-resource.ts",
  "apps/wechat-miniapp/src/services/sky-public-image-runtime.ts", "apps/wechat-miniapp/src/services/sky-public-image-cache.ts",
  "apps/wechat-miniapp/src/services/bare-sky-resource.ts", "apps/wechat-miniapp/src/services/sdss-optical-client.ts",
  "apps/wechat-miniapp/src/services/sdss-optical-publication.ts", "apps/wechat-miniapp/src/services/prepared-optical-resource.ts",
  "apps/wechat-miniapp/src/services/prepared-optical-client.ts", "apps/wechat-miniapp/src/services/sky-image-bytes.ts",
  "packages/miniapp-contracts/src/index.ts", "packages/miniapp-contracts/src/optical-publication-content.ts",
  "packages/miniapp-contracts/src/sdss-science-optical-publication.ts", "packages/miniapp-contracts/src/sdss-display-optical-publication.ts",
  "packages/miniapp-contracts/src/sdss-calibrated-optical-publication.ts"];
for (const p of sourcePaths) read(p);read(relative(root, import.meta.filename).replaceAll("\\", "/"));
writeFileSync(join(out, "executed-runner.mts"), readFileSync(import.meta.filename), { flag: "wx" });
const publicationPath = "output/sdss-m82-display-publication-1004-r2/publication/manifest.json", raw = read(publicationPath);
assert.equal(raw.length, 26384);assert.equal(sha(raw), "398827534fab1003b7fbe4cad29ab7ae6e0b8a1a9eb7222e12ba1e926aa47a6a");
const manifest = JSON.parse(raw.toString()), opticalHash = "74f456febb06119883e1cf79f9d3d9d89d853ec4a78f7f5c93a229aef204c0ab";
contracts.assertSdssCalibratedOpticalManifest(manifest, "M:82", opticalHash);
const base = "https://controlled-resource.invalid", pngs = new Map<string, Buffer>();
for (const level of contracts.SDSS_OPTICAL_LEVELS) {
  const a = manifest.levels[level], b = read("output/sdss-m82-display-publication-1004-r2/publication/" + a.file);
  assert.equal(b.length, a.bytes);assert.equal(sha(b), a.sha256);pngs.set(base + a.downloadUrl, b);
}
const harnessPath = sourcePaths[0]!, harness = read(harnessPath).toString(), ast = ts.createSourceFile(harnessPath, harness, ts.ScriptTarget.Latest, true);
const nodes = ast.statements.filter(s => ts.isFunctionDeclaration(s) && s.name?.text === "world" ||
  ts.isVariableStatement(s) && s.declarationList.declarations.some(d => d.name.getText(ast) === "compile"));
assert.equal(nodes.length, 2);
const code = nodes.map(s => s.getText(ast).replaceAll("import.meta.url", "harnessUrl")).join("\n")
  .replace("return bindings[name];", "if(name==='@tarojs/taro') return {__esModule:true,...bindings[name]};return bindings[name];") + "\nworld;";
const world = vm.runInNewContext(ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, {
  assert, vm, ts: { ...ts, transpileModule(input: string, options: any) {
    const result = ts.transpileModule(input, options);
    if (options?.fileName === "./sky-public-image-runtime.ts") save("compiled-runtime.js", { body: result.outputText, adapter: "ES-module namespace marker for existing default Taro stub" });
    return result;
  } }, contracts, readFileSync, URL, Map, Set, Object, JSON, Error, ArrayBuffer, Uint8Array, DataView,
  AbortController, Promise, queueMicrotask, setTimeout, clearTimeout, structuredClone,
  createSkyPublicImageCache, base, manifest, pngs,
  harnessUrl: pathToFileURL(join(root, harnessPath)).href,
  runtimeSource: read("apps/wechat-miniapp/src/services/sky-public-image-runtime.ts").toString(),
  resourceSource: read("apps/wechat-miniapp/src/services/sdss-science-optical-resource.ts").toString(),
}) as () => any;
const w = world(), observations: any[] = [], started = performance.now();
const observe = (name: string) => { const value = w.snapshot();observations.push({ name, ...value });return value; };
const cold = w.getCalibrated("M:82", opticalHash);
if (!w.requests[0]) { try { await cold; } catch (error) { save("failed.json", { error: String(error), snapshot: w.snapshot() });throw error; } }
w.requests[0].success(manifest);const current = await cold;
assert(current.isCurrent());assert(Object.isFrozen(current.publication.display));assert.equal(current.publication.imageVersion, "sdss-display-optical-v1");
observe("metadata-settled");
const leases: any[] = [], levels: any[] = [];
for (const level of contracts.SDSS_OPTICAL_LEVELS) {
  assert(current.isCurrent());const a = current.publication.levels[level], asset = { ...a, width: 512, height: 512 };
  const acquire = () => w.runtime.acquirePublishedSkyImage(asset, base + a.downloadUrl, opticalHash);
  const first = acquire(), duplicate = acquire();const [one, two] = await Promise.all([first.promise, duplicate.promise]);
  assert.equal(one.filePath, two.filePath);assert(one.isCurrent());assert(two.isCurrent());
  const b = w.files.get(one.filePath);assert(b);assert.equal(b.byteLength, a.bytes);assert.equal(sha(new Uint8Array(b)), a.sha256);
  assert.equal(w.requests.filter((r: any) => r.options.url === base + a.downloadUrl).length, 1);
  const held = observe(level + "-two-consumers");assert.equal(held.caches[0].leased, 2);
  one.release();assert.equal(w.caches[0].inspect().leased, 1);
  two.release();assert.equal(w.caches[0].inspect().leased, 0);
  const warm = acquire(), warmLease = await warm.promise;assert.equal(w.requests.filter((r: any) => r.options.url === base + a.downloadUrl).length, 1);
  assert.equal(warmLease.filePath, two.filePath);warmLease.release();
  leases.push(two);levels.push({ level, bytes: a.bytes, sha256: a.sha256, sameOwnerDedupeAndWarmNoNewTransfer: true });
}
observe("lease-resolution-before-transfer-finally");
await new Promise<void>(resolve => setImmediate(resolve));
const warm = observe("three-levels-warm-retired-demand");assert.equal(warm.caches[0].bytes, 1669676);assert.equal(warm.caches[0].leased, 0);
assert.equal(warm.caches[0].running, 0);assert.equal(warm.caches[0].pending, 0);assert.equal(warm.pendingMetadataListeners, 0);
const heldAsset = { ...current.publication.levels.DETAIL, width: 512, height: 512 };
const held = await w.runtime.acquirePublishedSkyImage(heldAsset, base + heldAsset.downloadUrl, opticalHash).promise;
observe("held-lease-resolution-before-transfer-finally");await new Promise<void>(resolve => setImmediate(resolve));
assert.equal(w.caches[0].inspect().running, 0);
const clearing = w.runtime.clearSkyPublicImageCache();assert(!current.isCurrent());const retiredClear = await clearing;assert(!held.isCurrent());
save("retired-clear.json", { result: retiredClear, snapshot: observe("clear-with-retired-live-lease") });
assert.equal(retiredClear.status, "partial", "the live retired lease retains its file until release");
held.release();const reapedClear = await w.runtime.clearSkyPublicImageCache();assert.equal(reapedClear.status, "complete");
const final = observe("explicit-clear-complete");assert.equal(final.caches[0].bytes, 0);assert.equal(final.caches[0].leased, 0);
const next = w.getCalibrated("M:82", opticalHash), rejected = assert.rejects(next, /sdss_calibrated_optical_resource_cancelled/u);
const latest = w.requests.at(-1);await w.runtime.clearSkyPublicImageCache();await rejected;latest.success(manifest);
await Promise.resolve();assert.equal(w.runtime.readPendingMetadataListenersForTest(), 0);observe("cancelled-metadata-late-success-rejected");
for (const [p, expected] of bindings) { const b = read(p);assert.equal(b.length, expected.bytes); }
const result = { scope: "Actual M82 calibrated client/resource and encoded cache under existing controlled Taro callbacks/MapFS; no HTTP/decode/GPU/full page or native claim",
  publicationHash: opticalHash, levels, observations, afterBindings: [...bindings.values()], sourceBytesAfterExact: true,
  threePngEncodedBytes: 1669676, warmNoNewBinaryTransfers: true, originalScienceAndDisplayEstimateMeaningDistinct: true,
  elapsedSeconds: (performance.now() - started) / 1000, metadataAndActiveLeasesFinallyZero: true,
  cacheClearedBytes: 0, sourceBackAndWholePage: "UNVERIFIED", decodedAndGpuPeak: "UNMEASURED",
  sourceQuality: "UNVERIFIED_NOT_ADOPTED", defaultRegistration: false, otherBusinessLogicEdited: false, independentReview: "MISSING" };
save("result.json", result);process.stdout.write(JSON.stringify({ publicationHash: opticalHash, levels, observations: observations.map(r => ({ name: r.name, cache: r.caches })), elapsedSeconds: result.elapsedSeconds }) + "\n");
