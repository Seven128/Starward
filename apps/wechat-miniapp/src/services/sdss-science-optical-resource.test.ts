import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, isAbsolute, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import * as contracts from "@starward/miniapp-contracts";
import { createSkyPublicImageCache } from "./sky-public-image-cache";
import { createSyntheticSdssSciencePublication } from "../../../../workers/miniapp-api/src/test-fixtures/sdss-science-publication.ts";
import { createSyntheticPreparedOpticalPublication } from "../../../../workers/miniapp-api/src/test-fixtures/prepared-optical-publication.ts";

const digest = (b: Uint8Array | string) => createHash("sha256").update(b).digest("hex");
const base = "https://controlled-resource.invalid";
const supplied = process.env.CLOUD_SKY_SCIENCE_PUBLICATION_PATH;
const syntheticDirectory = supplied ? undefined : mkdtempSync(join(tmpdir(), "starward-science-resource-"));
const structural = syntheticDirectory ? createSyntheticSdssSciencePublication(syntheticDirectory) : undefined;
const publicationDirectory = supplied ?? syntheticDirectory!;
const raw = JSON.parse(readFileSync(join(publicationDirectory, "manifest.json"), "utf8"));
const opticalHash = supplied ? raw.publicationHash : structural!.expectedHash;
const manifest = supplied ? raw : { ...raw, publicationHash: opticalHash,
  levels: Object.fromEntries(contracts.SDSS_OPTICAL_LEVELS.map(level => [level, { ...raw.levels[level],
    downloadUrl: `/v2/sky/sdss-optical/${opticalHash}/${raw.levels[level].file}` }])) };
if (supplied) {
  const expectedSha = process.env.CLOUD_SKY_SCIENCE_EXPECTED_SHA ?? "3eaf04b366827c86ece835f48ed37089d5406be2ed4d73c2252960e7e9aa1dd5";
  const expectedHash = process.env.CLOUD_SKY_SCIENCE_EXPECTED_HASH ?? "34015aff7ebbbaa7ddabc0a100844c802ebc7f860d5d15b076dd0f169cffc1a0";
  assert.equal(digest(readFileSync(join(publicationDirectory, "manifest.json"))), expectedSha);
  assert.equal(opticalHash, expectedHash);
}
contracts.assertSdssScienceOpticalManifest(manifest, "M:51", opticalHash);
const pngs = new Map<string, Buffer>(contracts.SDSS_OPTICAL_LEVELS.map(level => {
  const a = manifest.levels[level], bytes = readFileSync(join(publicationDirectory, a.file));
  assert.equal(bytes.length, a.bytes); assert.equal(digest(bytes), a.sha256);
  return [`${base}${a.downloadUrl}`, bytes];
}));
const preparedSupplied = process.env.CLOUD_SKY_PREPARED_PUBLICATION_PATH;
const preparedSyntheticDirectory = preparedSupplied ? undefined : mkdtempSync(join(tmpdir(), "starward-prepared-resource-"));
const preparedFixture = preparedSyntheticDirectory ? createSyntheticPreparedOpticalPublication(preparedSyntheticDirectory) : undefined;
const preparedDirectory = preparedSupplied ?? preparedSyntheticDirectory!;
const preparedRaw = JSON.parse(readFileSync(join(preparedDirectory, "manifest.json"), "utf8"));
const preparedHash = preparedSupplied ? preparedRaw.publicationHash : preparedFixture!.expectedHash;
const preparedManifest: contracts.PreparedOpticalManifest = preparedSupplied ? preparedRaw : { ...preparedRaw, publicationHash: preparedHash,
  levels: Object.fromEntries(contracts.OPTICAL_IMAGE_LEVELS.map(level => [level, { ...preparedRaw.levels[level],
    downloadUrl: `/v2/sky/prepared-optical/${preparedHash}/${preparedRaw.levels[level].file}` }])) };
contracts.assertPreparedOpticalManifest(preparedManifest, "M:51", preparedHash);
if (preparedSupplied) {
  assert.equal(digest(readFileSync(join(preparedDirectory, "manifest.json"))), "23faa1521ae39a6a7d92f36c87ebf691a75b6bd7b91a3654e9b24f63f4d793f1");
  assert.equal(preparedHash, "8eb8336aa5a75d104807327acab5990f38e0e22000713ab639a4c95cd443a802");
}
const preparedPngs = new Map<string, Buffer>(contracts.OPTICAL_IMAGE_LEVELS.map(level => {
  const asset = preparedManifest.levels[level], bytes = readFileSync(join(preparedDirectory, asset.file));
  assert.equal(bytes.length, asset.bytes); assert.equal(digest(bytes), asset.sha256);
  return [`${base}${asset.downloadUrl}`, bytes];
}));
const resourceSource = readFileSync(new URL("./sdss-science-optical-resource.ts", import.meta.url), "utf8");
const runtimeSource = readFileSync(new URL("./sky-public-image-runtime.ts", import.meta.url), "utf8");
const workspace = fileURLToPath(new URL("../../../../", import.meta.url));
const sourcePaths = ["apps/wechat-miniapp/src/services/sdss-science-optical-resource.test.ts",
  "apps/wechat-miniapp/src/services/sdss-science-optical-resource.ts", "apps/wechat-miniapp/src/services/sky-public-image-runtime.ts",
  "apps/wechat-miniapp/src/services/sky-public-image-cache.ts", "apps/wechat-miniapp/src/services/sky-image-bytes.ts",
  "apps/wechat-miniapp/src/services/bare-sky-resource.ts", "apps/wechat-miniapp/src/services/sdss-optical-client.ts",
  "packages/miniapp-contracts/src/sdss-science-optical-publication.ts", "packages/miniapp-contracts/src/sdss-optical-publication.ts",
  "packages/miniapp-contracts/src/index.ts", "workers/miniapp-api/src/test-fixtures/sdss-science-publication.ts"];
sourcePaths.push("apps/wechat-miniapp/src/services/sky-publication-resource.ts", "apps/wechat-miniapp/src/services/prepared-optical-resource.ts",
  "apps/wechat-miniapp/src/services/prepared-optical-client.ts", "packages/miniapp-contracts/src/prepared-optical-publication.ts",
  "packages/miniapp-contracts/src/optical-publication-content.ts", "workers/miniapp-api/src/test-fixtures/prepared-optical-publication.ts",
  "workers/miniapp-api/src/test-fixtures/synthetic-optical-png.ts");
const preserved: Array<{ path: string; sha256: string }> = supplied || preparedSupplied ? JSON.parse(readFileSync(join(workspace,
  ".codex/work-items/cloud-sky-native-2026-09-22/tmp/resume-preserved-hashes-2026-10-01.json"), "utf8")) : [];
const boundPaths = [...sourcePaths, ...preserved.map(row => row.path),
  ...["manifest.json", ...contracts.SDSS_OPTICAL_LEVELS.map(level => manifest.levels[level].file)]
    .map(file => relative(workspace, join(publicationDirectory, file)).replaceAll("\\", "/"))];
boundPaths.push(...["manifest.json", ...contracts.OPTICAL_IMAGE_LEVELS.map(level => preparedManifest.levels[level].file)]
  .map(file => relative(workspace, join(preparedDirectory, file)).replaceAll("\\", "/")));
const bindings = () => boundPaths.map(path => { const bytes = readFileSync(isAbsolute(path) ? path : join(workspace, path)); return { path, bytes: bytes.length, sha256: digest(bytes) }; });
const beforeBindings = bindings();
for (const row of preserved) assert.equal(beforeBindings.find(b => b.path === row.path)!.sha256, row.sha256);
const evidence: unknown[] = [];
const compile = (file: string, bindings: Record<string, unknown>, source?: string, globals: Record<string, unknown> = {}) => {
  const exports: Record<string, any> = {};
  vm.runInNewContext(ts.transpileModule(source ?? readFileSync(new URL(file, import.meta.url), "utf8"), { fileName: file, compilerOptions: {
    target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS,
  } }).outputText, { exports, ArrayBuffer, Uint8Array, DataView, Object, JSON, Error, setTimeout, clearTimeout, ...globals,
    __MINIAPP_API_BASE__: base,
    require(name: string) { assert(name in bindings, `Unbound import ${name}`); return bindings[name]; } });
  return exports;
};

function world(imageBytes = pngs) {
  const files = new Map<string, ArrayBuffer>(), requests: any[] = [];
  const controllers: Array<{ controller: AbortController; listeners: Set<unknown>; aborts: number }> = [];
  const caches: ReturnType<typeof createSkyPublicImageCache>[] = [];
  let throwControllerAbort = false, throwRequest = false;
  const NativeController = AbortController;
  class ControlledController extends NativeController {
    constructor() {
      super(); const listeners = new Set<unknown>(), wrapped = new Map<unknown, EventListener>();
      const add = this.signal.addEventListener.bind(this.signal), remove = this.signal.removeEventListener.bind(this.signal);
      this.signal.addEventListener = ((type: string, handler: EventListener, options?: AddEventListenerOptions) => {
        const callback: EventListener = event => { if (options?.once) listeners.delete(handler); handler(event); };
        wrapped.set(handler, callback); listeners.add(handler); add(type, callback, options);
      }) as typeof this.signal.addEventListener;
      this.signal.removeEventListener = ((type: string, handler: EventListener) => {
        const callback = wrapped.get(handler); if (callback) remove(type, callback); wrapped.delete(handler); listeners.delete(handler);
      }) as typeof this.signal.removeEventListener;
      controllers.push({ controller: this, listeners, aborts: 0 });
    }
    override abort(reason?: unknown) {
      controllers.find(row => row.controller === this)!.aborts++;
      if (throwControllerAbort) throw new Error("controlled_controller_abort_throw");
      super.abort(reason);
    }
  }
  const deliver = (run: () => void) => queueMicrotask(run);
  const fs = {
    mkdir(o: any) { deliver(o.success); },
    readdir(o: any) { deliver(() => o.success({ files: [...files.keys()].filter(p => p.startsWith(o.dirPath + "/")).map(p => p.slice(o.dirPath.length + 1)) })); },
    stat(o: any) { deliver(() => files.has(o.path) ? o.success({ stats: { isFile: () => true, size: files.get(o.path)!.byteLength } }) : o.fail({ errMsg: "no such file or directory" })); },
    readFile(o: any) { deliver(() => files.has(o.filePath) ? o.success({ data: files.get(o.filePath)!.slice(o.position ?? 0, o.length === undefined ? undefined : (o.position ?? 0) + o.length) }) : o.fail({ errMsg: "no such file or directory" })); },
    writeFile(o: any) { deliver(() => { files.set(o.filePath, o.data.slice(0)); o.success(); }); },
    rename(o: any) { deliver(() => { const bytes = files.get(o.oldPath); assert(bytes); files.set(o.newPath, bytes); files.delete(o.oldPath); o.success(); }); },
    unlink(o: any) { deliver(() => { files.delete(o.filePath); o.success(); }); },
  };
  const Taro = { env: { USER_DATA_PATH: "/controlled" }, getFileSystemManager: () => fs, request(options: any) {
    if (throwRequest) throw new Error("controlled_request_throw");
    const request = { options, aborts: 0, completed: false, throwAbort: false,
      success(body: unknown = manifest, statusCode = 200) { request.completed = true; options.success({ statusCode, data: body }); },
      fail() { request.completed = true; options.fail({ errMsg: "controlled_metadata_failure" }); },
    }; requests.push(request);
    if (options.responseType === "arraybuffer") deliver(() => {
      const bytes = imageBytes.get(options.url); assert(bytes, options.url); request.success(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
    });
    return { abort() { request.aborts++; if (request.throwAbort) throw new Error("controlled_taro_abort_throw"); request.fail(); }, catch() {} };
  } };
  const runtime = compile("./sky-public-image-runtime.ts", { "@tarojs/taro": { default: Taro }, "@starward/miniapp-contracts": contracts,
    "./sky-public-image-cache": { createSkyPublicImageCache(deps: Parameters<typeof createSkyPublicImageCache>[0]) {
      const cache = createSkyPublicImageCache({ ...deps, cleanupWaitMs: 10 }); caches.push(cache); return cache;
    } },
  }, runtimeSource + "\nexport const readPendingMetadataListenersForTest = () => pendingDemands.size;", { AbortController: ControlledController });
  const bare = compile("./bare-sky-resource.ts", { "@tarojs/taro": { default: Taro } }, undefined, { AbortController: ControlledController });
  const client = compile("./sdss-optical-client.ts", { "@starward/miniapp-contracts": contracts, "./bare-sky-resource": bare,
    "./sdss-optical-publication": contracts }, undefined, { AbortController: ControlledController });
  const common = compile("./sky-publication-resource.ts", { "./sky-public-image-runtime": runtime }, undefined, { AbortController: ControlledController });
  const resource = compile("./sdss-science-optical-resource.ts", { "./sdss-optical-client": client, "./sky-publication-resource": common },
    resourceSource, { AbortController: ControlledController });
  const preparedClient = compile("./prepared-optical-client.ts", { "@starward/miniapp-contracts": contracts, "./bare-sky-resource": bare });
  const preparedResource = compile("./prepared-optical-resource.ts", { "./prepared-optical-client": preparedClient, "./sky-publication-resource": common });
  return { requests, controllers, caches, runtime, files, get: resource.getSdssScienceOpticalResource as typeof import("./sdss-science-optical-resource").getSdssScienceOpticalResource,
    getCalibrated: resource.getSdssCalibratedOpticalResource as typeof import("./sdss-science-optical-resource").getSdssCalibratedOpticalResource,
    getPrepared: preparedResource.getPreparedOpticalResource as typeof import("./prepared-optical-resource").getPreparedOpticalResource,
    preparedUrl: preparedClient.preparedOpticalImageUrl as typeof import("./prepared-optical-client").preparedOpticalImageUrl,
    controller: () => new ControlledController(), throwController(value: boolean) { throwControllerAbort = value; }, throwRequest(value: boolean) { throwRequest = value; },
    snapshot() { return { requestCount: requests.length, requests: requests.map(row => ({ url: row.options.url, image: row.options.responseType === "arraybuffer", aborts: row.aborts, completed: row.completed })),
      pendingMetadataListeners: runtime.readPendingMetadataListenersForTest(), controllers: controllers.map(row => ({ listeners: row.listeners.size, aborts: row.aborts })), caches: caches.map(c => c.inspect()) }; } };
}

test("whole resource freezes both owned source snapshot and shared outer capability", async () => {
  const w = world(), query = w.controller(), borrowed = structuredClone(manifest), request = w.get("M:51", opticalHash, query.signal);
  assert.equal(w.runtime.readPendingMetadataListenersForTest(), 1); w.requests[0].success(borrowed);
  const resource = await request; assert.equal(w.runtime.readPendingMetadataListenersForTest(), 0);
  assert(resource.isCurrent(), "settled demand release must not retire the separate generation stamp");
  borrowed.levels.DETAIL.fieldDegrees += 1; assert.equal(resource.publication.levels.DETAIL.fieldDegrees, manifest.levels.DETAIL.fieldDegrees);
  assert(Object.isFrozen(resource.publication)); assert(Object.isFrozen(resource.publication.levels.DETAIL));
  const otherObserver = resource;
  evidence.push({ case: "source-and-outer-snapshot", outerFrozen: Object.isFrozen(resource), nestedFrozen: Object.isFrozen(resource.publication.levels.DETAIL),
    metadataListeners: w.runtime.readPendingMetadataListenersForTest(), snapshot: w.snapshot() });
  assert(Object.isFrozen(resource), "a shared readonly capability must not allow one observer to replace publication/isCurrent for another");
  assert.throws(() => { (resource as any).isCurrent = () => true; }, TypeError);
  assert.throws(() => { (resource as any).publication = borrowed; }, TypeError);
  query.abort(); assert(otherObserver.isCurrent(), "post-settle query cancellation must not retire shared metadata");
  await w.runtime.clearSkyPublicImageCache(); assert(!otherObserver.isCurrent());
});

test("pre-aborted query creates neither metadata request nor cache owner", async () => {
  const w = world(), query = w.controller(); query.abort();
  await assert.rejects(w.get("M:51", opticalHash, query.signal), /sdss_science_optical_resource_cancelled/u);
  assert.equal(w.requests.length, 0); assert.equal(w.caches.length, 0);
  assert.equal(w.runtime.readPendingMetadataListenersForTest(), 0); assert.equal(w.controllers[0]!.listeners.size, 0);
  evidence.push({ case: "pre-aborted-no-acquisition", snapshot: w.snapshot() });
});

test("pending clear fences metadata immediately, including failed native abort and late success", async () => {
  for (const fault of ["none", "taro-abort-throws", "controller-abort-throws"] as const) {
    const w = world(), query = w.controller(), requested = w.get("M:51", opticalHash, query.signal);
    const rejected = assert.rejects(requested, /sdss_science_optical_resource_cancelled/u);
    assert.equal(w.runtime.readPendingMetadataListenersForTest(), 1);
    assert.equal(w.controllers[0]!.listeners.size, 1); assert.equal(w.controllers[1]!.listeners.size, 1);
    if (fault === "taro-abort-throws") w.requests[0].throwAbort = true;
    if (fault === "controller-abort-throws") w.throwController(true);
    const clearing = w.runtime.clearSkyPublicImageCache();
    await rejected;
    assert.equal(w.runtime.readPendingMetadataListenersForTest(), 0);
    assert.equal(w.controllers[0]!.listeners.size, 0, "query listener belongs only to the pending request");
    assert.equal(w.caches[0]!.inspect().epoch, 1);
    if (fault === "none") assert.equal(w.requests[0].completed, true);
    else assert.equal(w.requests[0].completed, false, "failed abort must not fabricate a native callback");
    assert.equal(w.controllers[1]!.listeners.size, fault === "controller-abort-throws" ? 1 : 0);
    evidence.push({ case: "pending-clear-before-late-callback", fault, snapshot: w.snapshot() });
    w.requests[0].success(structuredClone(manifest));
    await clearing; await new Promise<void>(resolve => setImmediate(resolve));
    assert.equal(w.controllers[1]!.listeners.size, 0, "actual late settlement releases the remaining native signal listener");
    assert.equal(w.runtime.readPendingMetadataListenersForTest(), 0); assert.equal(w.requests.length, 1);
    evidence.push({ case: "pending-clear-after-late-callback", fault, snapshot: w.snapshot() });
  }
});

test("metadata returned in the same turn as clear cannot cross the resolution fence", async () => {
  const w = world(), query = w.controller(), requested = w.get("M:51", opticalHash, query.signal);
  const rejected = assert.rejects(requested, /sdss_science_optical_resource_cancelled/u);
  w.requests[0].success(structuredClone(manifest));
  await w.runtime.clearSkyPublicImageCache(); await rejected;
  assert.equal(w.requests[0].completed, true); assert.equal(w.runtime.readPendingMetadataListenersForTest(), 0);
  assert(w.controllers.every(row => row.listeners.size === 0));
  evidence.push({ case: "returned-response-before-clear-microtask", snapshot: w.snapshot() });
});

test("settled observers share an independent stamp; explicit retry alone opens a new epoch and file lease", async () => {
  const w = world(), query = w.controller(), requested = w.get("M:51", opticalHash, query.signal);
  w.requests[0].success(structuredClone(manifest)); const first = await requested, secondObserver = first;
  const independentDemand = w.runtime.beginPublishedSkyImageDemand(); independentDemand.release(); query.abort();
  assert(first.isCurrent()); assert(secondObserver.isCurrent());
  assert.equal(w.runtime.readPendingMetadataListenersForTest(), 0);
  await w.runtime.clearSkyPublicImageCache(); assert(!first.isCurrent()); assert(!secondObserver.isCurrent());
  assert.equal(w.requests.length, 1, "a retained resolved response must not start requests in the new epoch");
  evidence.push({ case: "resolved-acquire-gap-retired", snapshot: w.snapshot() });

  const retry = w.get("M:51", opticalHash); w.requests[1].success(structuredClone(manifest)); const current = await retry;
  assert(current.isCurrent()); assert(!first.isCurrent());
  const image = current.publication.levels.DETAIL;
  const asset = { bytes: image.bytes, sha256: image.sha256, width: image.pixels, height: image.pixels, format: image.format };
  assert(current.isCurrent(), "actual consumer must check its metadata stamp before encoded acquisition");
  const a = w.runtime.acquirePublishedSkyImage(asset, `${base}${image.downloadUrl}`, opticalHash);
  const b = w.runtime.acquirePublishedSkyImage(asset, `${base}${image.downloadUrl}`, opticalHash);
  const [leaseA, leaseB] = await Promise.all([a.promise, b.promise]);
  assert.equal(leaseA.filePath, leaseB.filePath); assert(leaseA.isCurrent()); assert(leaseB.isCurrent());
  assert.equal(w.requests.filter(row => row.options.responseType === "arraybuffer").length, 1);
  const encoded = w.files.get(leaseB.filePath)!;
  assert.equal(encoded.byteLength, image.bytes); assert.equal(digest(new Uint8Array(encoded)), image.sha256);
  assert.equal(w.caches[0]!.inspect().leased, 2); leaseA.release();
  assert.equal(w.caches[0]!.inspect().leased, 1); assert(leaseB.isCurrent()); assert(current.isCurrent());
  let retirement = 0; leaseB.onRetire(() => retirement++);
  const clearing = await w.runtime.clearSkyPublicImageCache();
  assert(!leaseB.isCurrent()); assert(!current.isCurrent()); assert.equal(retirement, 1);
  assert.equal(clearing.status, "partial", "a live retired lease retains its file until release");
  evidence.push({ case: "explicit-retry-shared-real-png-retired-live-lease", encodedSha256: digest(new Uint8Array(encoded)), snapshot: w.snapshot() });
  leaseB.release(); await w.runtime.clearSkyPublicImageCache();
  const final = w.caches[0]!.inspect();
  assert.equal(final.leased, 0); assert.equal(final.retired, 0); assert.equal(final.pending, 0);
  assert.equal(final.running, 0); assert.equal(final.reserved, 0); assert.equal(final.bytes, 0);
  assert.equal(w.runtime.readPendingMetadataListenersForTest(), 0);
  evidence.push({ case: "explicit-retry-final-file-owner", snapshot: w.snapshot() });
});

test("metadata failure and query cancellation always release their request subscriptions", async () => {
  for (const scenario of ["not-found", "transport-fail", "foreign-publication", "synchronous-request-throw", "query-abort"] as const) {
    const w = world(), query = w.controller(); if (scenario === "synchronous-request-throw") w.throwRequest(true);
    const requested = w.get("M:51", opticalHash, query.signal);
    const rejected = assert.rejects(requested, scenario === "query-abort" ? /sdss_science_optical_resource_cancelled/u : /sdss_science|sky_resource/u);
    if (scenario === "not-found") w.requests[0].success(undefined, 404);
    if (scenario === "transport-fail") w.requests[0].fail();
    if (scenario === "foreign-publication") w.requests[0].success({ ...structuredClone(manifest), publicationHash: "0".repeat(64) });
    if (scenario === "query-abort") query.abort();
    await rejected;
    assert.equal(w.runtime.readPendingMetadataListenersForTest(), 0);
    assert(w.controllers.every(row => row.listeners.size === 0));
    assert.equal(w.requests.length, scenario === "synchronous-request-throw" ? 0 : 1);
    if (scenario === "query-abort") assert.equal(w.requests[0].aborts, 1);
    evidence.push({ case: "metadata-error-cleanup", scenario, snapshot: w.snapshot() });
    await w.runtime.clearSkyPublicImageCache();
  }
});

test("prepared metadata keeps its own colour/geometry pin and rejects science, edited credit and foreign file URLs", async () => {
  for (const changed of [manifest,
    { ...structuredClone(preparedManifest), objectRef: "M:82" },
    { ...structuredClone(preparedManifest), source: { ...preparedManifest.source, credit: "changed credit" } },
    { ...structuredClone(preparedManifest), levels: { ...preparedManifest.levels,
      DETAIL: { ...preparedManifest.levels.DETAIL, downloadUrl: manifest.levels.DETAIL.downloadUrl } } }]) {
    const w = world(preparedPngs), request = w.getPrepared("M:51", preparedHash);
    assert.equal(w.requests[0].options.url, `${base}/v2/sky/prepared-optical/${preparedHash}/manifest`);
    const rejected = assert.rejects(request, /prepared_optical_/u); w.requests[0].success(changed); await rejected;
    assert.equal(w.runtime.readPendingMetadataListenersForTest(), 0); assert.equal(w.requests.length, 1);
    assert.equal(w.requests.filter(row => row.options.responseType === "arraybuffer").length, 0);
  }
  const w = world(preparedPngs);
  for (const path of [manifest.levels.DETAIL.downloadUrl,
    `/v2/sky/prepared-optical/${preparedHash}/prepared-rgb-tan-master.npy`,
    `/v2/sky/prepared-optical/${preparedHash}/../M-51-detail.png`,
    `${base}${preparedManifest.levels.DETAIL.downloadUrl}`]) assert.throws(() => w.preparedUrl(path), /sky_resource_path_invalid/u);
  assert.equal(w.preparedUrl(preparedManifest.levels.DETAIL.downloadUrl), `${base}${preparedManifest.levels.DETAIL.downloadUrl}`);
});

test("prepared metadata shares the clear fence and exact encoded cache without preserving retired image demand", async () => {
  const w = world(preparedPngs), query = w.controller(), pending = w.getPrepared("M:51", preparedHash, query.signal);
  const rejected = assert.rejects(pending, /prepared_optical_resource_cancelled/u);
  w.requests[0].throwAbort = true;
  await w.runtime.clearSkyPublicImageCache(); await rejected;
  w.requests[0].success(structuredClone(preparedManifest)); await new Promise<void>(resolve => setImmediate(resolve));
  assert.equal(w.runtime.readPendingMetadataListenersForTest(), 0);
  const borrowed = structuredClone(preparedManifest), retry = w.getPrepared("M:51", preparedHash);
  w.requests[1].success(borrowed); const resource = await retry;
  borrowed.source.credit = "caller mutation"; assert.equal(resource.publication.source.credit, preparedManifest.source.credit);
  assert(Object.isFrozen(resource.publication.source)); assert(resource.isCurrent());
  const image = resource.publication.levels.OVERVIEW;
  const asset = { bytes: image.bytes, sha256: image.sha256,
    width: "pixels" in image ? image.pixels : image.width, height: "pixels" in image ? image.pixels : image.height, format: image.format };
  const first = await w.runtime.acquirePublishedSkyImage(asset, w.preparedUrl(image.downloadUrl), preparedHash).promise;
  assert.equal(digest(new Uint8Array(w.files.get(first.filePath)!)), image.sha256); first.release();
  const count = w.requests.length;
  const warm = await w.runtime.acquirePublishedSkyImage(asset, w.preparedUrl(image.downloadUrl), preparedHash).promise;
  assert.equal(w.requests.length, count, "warm prepared bytes use the existing encoded owner");
  assert.equal(warm.filePath, first.filePath);
  await w.runtime.clearSkyPublicImageCache(); assert(!resource.isCurrent()); assert(!warm.isCurrent());
  warm.release(); await w.runtime.clearSkyPublicImageCache();
  const final = w.caches[0]!.inspect(); assert.equal(final.leased, 0); assert.equal(final.pending, 0); assert.equal(final.bytes, 0);
  evidence.push({ case: "prepared-shared-clear-and-immutable-file", publicationHash: preparedHash,
    sourceCredit: preparedManifest.source.credit, encodedSha256: image.sha256, snapshot: w.snapshot() });
});

test.after(() => {
  const output = process.env.CLOUD_SKY_SCIENCE_RESOURCE_EVIDENCE_OUTPUT;
  const afterBindings = bindings();
  if (output) {
    writeFileSync(join(output, "resource-traces.json"), JSON.stringify({ fixture: supplied ? `EXACT_PINNED_${manifest.imageVersion}` : "SYNTHETIC_STRUCTURE_TRANSPORT_ONLY",
      publicationHash: opticalHash, preparedFixture: preparedSupplied ? "EXACT_PREPARED_WRITER_R4" : "SYNTHETIC_STRUCTURE_TRANSPORT_ONLY",
      preparedPublicationHash: preparedHash, resourceSourceSha256: digest(resourceSource), runtimeSourceSha256: digest(runtimeSource),
      scope: "Complete actual modules/cache with controlled MapFS/Taro callbacks and AbortController faults. Runtime adds only a readonly pendingDemand-size tap; no WEAPP/native decode, HTTP, GPU, calibration or quality adoption.", evidence }, null, 2) + "\n", { flag: "wx" });
    writeFileSync(join(output, "executed-resource-source.ts.txt"), resourceSource, { flag: "wx" });
    writeFileSync(join(output, "executed-runtime-source.ts.txt"), runtimeSource, { flag: "wx" });
    for (const file of ["sky-publication-resource.ts", "prepared-optical-client.ts", "prepared-optical-resource.ts"])
      writeFileSync(join(output, `executed-${file}.txt`), readFileSync(new URL(`./${file}`, import.meta.url)), { flag: "wx" });
    writeFileSync(join(output, "executed-test-source.ts.txt"), readFileSync(import.meta.filename), { flag: "wx" });
    writeFileSync(join(output, "bindings-before.json"), JSON.stringify(beforeBindings, null, 2) + "\n", { flag: "wx" });
    writeFileSync(join(output, "bindings-after.json"), JSON.stringify(afterBindings, null, 2) + "\n", { flag: "wx" });
  }
  assert.deepEqual(afterBindings, beforeBindings, "executed source, real publication and six preserved files must remain byte-identical");
  if (syntheticDirectory) {
    assert.equal(dirname(realpathSync(syntheticDirectory)), realpathSync(tmpdir())); assert.match(basename(syntheticDirectory), /^starward-science-resource-/u);
    rmSync(syntheticDirectory, { recursive: true }); // Owned, regenerated fixture only.
  }
  if (preparedSyntheticDirectory) {
    assert.equal(dirname(realpathSync(preparedSyntheticDirectory)), realpathSync(tmpdir()));
    assert.match(basename(preparedSyntheticDirectory), /^starward-prepared-resource-/u);
    rmSync(preparedSyntheticDirectory, { recursive: true }); // Only regenerated, owned structural fixtures.
  }
});


test("calibrated family shares the real metadata epoch, cancellation and old-source snapshot owner", async () => {
  const w = world(), query = w.controller(), pending = w.getCalibrated("M:51", opticalHash, query.signal);
  assert.equal(w.runtime.readPendingMetadataListenersForTest(), 1);w.requests[0].success(manifest);
  const resource = await pending;assert(resource.isCurrent());assert(Object.isFrozen(resource.publication));
  assert.equal(resource.publication.imageVersion, manifest.imageVersion);
  assert.equal(w.runtime.readPendingMetadataListenersForTest(), 0);
  await w.runtime.clearSkyPublicImageCache();assert(!resource.isCurrent());
  const next = w.getCalibrated("M:51", opticalHash);const rejected=assert.rejects(next, /sdss_calibrated_optical_resource_cancelled/u);
  await w.runtime.clearSkyPublicImageCache();await rejected;
  w.requests.at(-1)!.success(manifest);await Promise.resolve();
  assert.equal(w.runtime.readPendingMetadataListenersForTest(), 0);
});
