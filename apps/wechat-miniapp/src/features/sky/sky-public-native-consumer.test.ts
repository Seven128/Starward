import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { skyImageContentHash, sdssOpticalPublication, sdssOpticalPublicationHash, decodeSkyLandscapeAlpha, SKY_LANDSCAPE_RESOURCES } from "@starward/miniapp-contracts";
import { createSkyPublicImageCache } from "../../services/sky-public-image-cache";
import { skyImageFileSession } from "../../services/sky-image-file-session";
import { transportHarness, TEST_API_BASE } from "../../services/api-request-test-support";
import { createSkyArtworkLoader, skyNativeImageIsCurrent } from "./sky-artwork-loader";
import { startSkyArtworkRequest, type SkyArtworkImage } from "./sky-artwork-request";

// Full production hook and runtime modules, actual cache/request/loader and
// real published files. Only React scheduling, transport and native FS/image
// callbacks are controlled. No HTTP, native decode, WEAPP persistence or GPU.
const base = "https://approved.fixture.invalid";
const publication = JSON.parse(readFileSync(new URL("../../../../../workers/miniapp-api/assets/deep-sky/sdss-m51/manifest.json", import.meta.url), "utf8"));
const publicationHash = sdssOpticalPublication("M:51")!.publicationHash;
assert.equal(sdssOpticalPublicationHash(publication), publicationHash);
const levels = ["OVERVIEW", "DETAIL"] as const;
const fixtures = levels.map(level => {
  const published = publication.levels[level];
  const bytes = readFileSync(new URL("../../../../../workers/miniapp-api/assets/deep-sky/sdss-m51/" + published.file, import.meta.url));
  assert.equal(bytes.length, published.bytes);
  assert.equal(createHash("sha256").update(bytes).digest("hex"), published.sha256);
  return { bytes, asset: { ...published, id: "sdss:M:51:" + level, width: 512, height: 512 },
    url: `${base}/v2/sky/sdss-optical/${publicationHash}/${published.file}` };
});
const coarse = fixtures[0]!, fine = fixtures[1]!;
const asBuffer = (body: Uint8Array) => body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength) as ArrayBuffer;
const compile = (file: URL, bindings: Record<string, unknown>, sourceOverride?: string) => {
  const exports: Record<string, any> = {};
  vm.runInNewContext(ts.transpileModule(sourceOverride ?? readFileSync(file, "utf8"), { fileName: file.pathname, compilerOptions: {
    target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText, { exports, ArrayBuffer, Uint8Array, DataView, setTimeout, clearTimeout,
    __MINIAPP_API_BASE__: base, __MINIAPP_ACCEPTANCE_DIAGNOSTICS__: false,
    require(name: string) { assert.ok(name in bindings, name); return bindings[name]; } });
  return exports;
};
const evidence: unknown[] = [];
test.after(() => {
  const output = process.env.CLOUD_SKY_CACHE_EVIDENCE_OUTPUT;
  if (output) writeFileSync(path.join(output, "consumer-traces.json"), JSON.stringify(evidence, null, 2) + "\n", { flag: "wx" });
});

function world() {
  const root = "/controlled", files = new Map<string, ArrayBuffer>(), requests: string[] = [], fsCalls: unknown[] = [];
  const caches: ReturnType<typeof createSkyPublicImageCache>[] = [];
  const corruptOnce = new Set<string>(), heldTransfers = new Set<string>(), abortThrows = new Set<string>();
  const pendingTransfers = new Map<string, () => void>();
  const resources = new Map(fixtures.map(value => [value.url, value.bytes]));
  const deliver = (callback: () => void) => queueMicrotask(callback);
  const filesystem = {
    mkdir(options: any) { deliver(options.success); },
    readdir(options: any) { deliver(() => options.success({ files: [...files.keys()].filter(p => p.startsWith(options.dirPath + "/")).map(p => p.slice(options.dirPath.length + 1)) })); },
    stat(options: any) { deliver(() => files.has(options.path) ? options.success({ stats: { isFile: () => true, size: files.get(options.path)!.byteLength } }) : options.fail({ errMsg: "stat:fail no such file or directory" })); },
    readFile(options: any) { fsCalls.push(["read", options.filePath, options.position, options.length]); deliver(() => {
      if (!files.has(options.filePath)) { options.fail({ errMsg: "readFile:fail no such file or directory" }); return; }
      const body = files.get(options.filePath)!;
      options.success({ data: options.encoding === "utf8" ? Buffer.from(body).toString("utf8") : options.length === undefined ? body.slice(0) : body.slice(options.position, options.position + options.length) });
    }); },
    writeFile(options: any) { fsCalls.push(["write", options.filePath, options.data.byteLength]); deliver(() => { files.set(options.filePath, options.data.slice(0)); options.success(); }); },
    rename(options: any) { fsCalls.push(["rename", options.oldPath, options.newPath]); deliver(() => {
      if (!files.has(options.oldPath)) { options.fail({ errMsg: "rename:fail missing" }); return; }
      files.set(options.newPath, files.get(options.oldPath)!); files.delete(options.oldPath); options.success();
    }); },
    unlink(options: any) { fsCalls.push(["unlink", options.filePath]); deliver(() => { files.delete(options.filePath); options.success?.(); }); },
  };
  const Taro = { env: { USER_DATA_PATH: root }, getFileSystemManager: () => filesystem,
    request(options: any) {
      requests.push(options.url); let aborted = false;
      const complete = () => {
        if (aborted) return;
        const bytes = resources.get(options.url);
        if (!bytes) { options.fail({ errMsg: "controlled_unavailable" }); return; }
        const body = asBuffer(bytes);
        if (corruptOnce.delete(options.url)) { const changed = new Uint8Array(body); changed[30] = changed[30]! ^ 1; }
        options.success({ statusCode: 200, data: body });
      };
      deliver(() => { if (heldTransfers.has(options.url)) pendingTransfers.set(options.url, complete); else complete(); });
      return { abort() { if (abortThrows.has(options.url)) throw Error("controlled_native_abort_throw"); aborted = true; options.fail({ errMsg: "request:fail abort" }); }, catch() {} };
    } };
  const runtime = () => compile(new URL("../../services/sky-public-image-runtime.ts", import.meta.url), {
    "@tarojs/taro": { default: Taro }, "@starward/miniapp-contracts": { skyImageContentHash },
    "./sky-public-image-cache": { createSkyPublicImageCache(deps: Parameters<typeof createSkyPublicImageCache>[0]) {
      const cache = createSkyPublicImageCache({ ...deps, cleanupWaitMs: 10 }); caches.push(cache); return cache;
    } },
  });
  return { root, files, requests, fsCalls, caches, corruptOnce, heldTransfers, abortThrows, pendingTransfers, resources, Taro, runtime,
    snapshot() { return { requests: [...requests], files: [...files].map(([file, bytes]) => ({ file, bytes: bytes.byteLength,
      sha256: createHash("sha256").update(new Uint8Array(bytes)).digest("hex") })), caches: caches.map(c => c.inspect()),
      underlyingNativeCallbacksPending: [...pendingTransfers.keys()], fsCalls: [...fsCalls] }; } };
}
function consumer(w: ReturnType<typeof world>, runtime: Record<string, any>) {
  const slots: any[] = [], effects: (() => void)[] = [], images: SkyArtworkImage[] = [];
  let cursor = 0, dirty = false;
  const equal = (a: unknown[] | undefined, b: unknown[]) => a?.length === b.length && b.every((v, i) => Object.is(v, a![i]));
  const react = {
    useRef(value: unknown) { return slots[cursor++] ??= { current: value }; },
    useState(initial: unknown) { const id = cursor++; if (!(id in slots)) slots[id] = initial;
      return [slots[id], (value: any) => { const next = typeof value === "function" ? value(slots[id]) : value; if (!Object.is(next, slots[id])) { slots[id] = next; dirty = true; } }]; },
    useCallback(value: unknown, deps: unknown[]) { const id = cursor++; if (!equal(slots[id]?.deps, deps)) slots[id] = { deps, value }; return slots[id].value; },
    useEffect(effect: () => void | (() => void), deps: unknown[]) { const id = cursor++, previous = slots[id];
      if (equal(previous?.deps, deps)) return; slots[id] = { deps }; effects.push(() => { previous?.cleanup?.(); slots[id].cleanup = effect(); }); },
  };
  const mutation = process.env.CLOUD_SKY_CACHE_HOOK_MUTATION_SOURCE;
  const module = compile(new URL("./use-sky-artwork.ts", import.meta.url), {
    react, "@tarojs/taro": { default: w.Taro }, "@/services/api-client": { constellationAssetUrl() { throw Error("not an illustration trial"); } },
    "../../services/sky-image-file-session": { skyImageFileSession }, "../../services/sky-public-image-runtime": runtime,
    "./sky-artwork-loader": { createSkyArtworkLoader }, "./sky-artwork-request": { startSkyArtworkRequest },
  }, mutation ? readFileSync(mutation, "utf8") : undefined);
  const canvas = () => ({ createImage() { const image: SkyArtworkImage = { src: "", onload: null, onerror: null, width: 512, height: 512 }; images.push(image); return image; } });
  const input = { canvas: canvas() as ReturnType<typeof canvas> | null, revision: 1, hash: publicationHash as string | undefined,
    active: true, wanted: [coarse.asset] as typeof coarse.asset[], storage: "public" as "public" | "session", fallback: [] as string[], url: undefined as string | undefined };
  const resolve = (asset: typeof coarse.asset) => ({ url: input.url ?? fixtures.find(f => f.asset.sha256 === asset.sha256)!.url, format: "jpeg", storage: input.storage });
  let result: any;
  const render = () => { cursor = 0; dirty = false; result = module.useSkyNativeImages(input.canvas, input.revision, input.hash, input.active,
    input.wanted, resolve, 2 * 512 * 512 * 4, input.fallback); return result; };
  const commit = () => { render(); do { for (const effect of effects.splice(0)) effect(); if (dirty) render(); } while (dirty || effects.length); return render(); };
  const wait = async (condition: () => boolean) => { for (let i = 0; i < 2000; i++) { commit(); if (condition()) return; await Promise.resolve(); } assert.fail("bounded consumer callback not reached"); };
  const settle = async () => { for (let i = 0; i < 150; i++) { await Promise.resolve(); commit(); } return result; };
  return { input, canvas, images, render, commit, wait, settle, get result() { return result; },
    held() { return slots.find(slot => slot?.owner && slot?.value?.images instanceof Map) ?? null; },
    complete(index: number) { assert.ok(images[index]?.onload); images[index]!.onload!(); return commit(); } };
}

test("full public hook preserves encoded bytes through cold return, hide, new Canvas and actual cache restart", async () => {
  const w = world(), runtime = w.runtime(), h = consumer(w, runtime); h.commit();
  await h.wait(() => h.images.length === 1); assert.equal(h.result.images.size, 0);
  const first = h.images[0]!, file = first.src; assert.equal(skyImageContentHash(new Uint8Array(w.files.get(file)!)), coarse.asset.sha256);
  assert.match(file, /^\/controlled\/sky-public-images-v1\//);
  assert.equal(w.caches.length, 1, "the real public-file owner must supply the normal hook path");
  h.complete(0); assert.equal(h.result.images.get(coarse.asset.id), first);
  h.input.wanted = []; h.commit(); h.result.suspendUnusedDecoded(); h.commit();
  assert.equal(h.result.retainedImages.size, 0); assert.equal(w.caches[0]!.inspect().leased, 1);
  h.input.wanted = [coarse.asset]; h.commit(); await h.wait(() => h.images.length === 2); assert.equal(w.requests.length, 1);
  assert.equal(h.images[1]!.src, file); assert.notEqual(h.images[1], first); h.complete(1);
  h.input.active = false; h.commit(); await h.settle(); assert.equal(h.held(), null); assert.equal(w.caches[0]!.inspect().leased, 0); assert.ok(w.files.has(file));
  h.input.canvas = h.canvas(); h.input.revision++; h.input.active = true; h.commit(); await h.wait(() => h.images.length === 3);
  assert.equal(w.requests.length, 1); assert.equal(h.images[2]!.src, file); h.complete(2);
  h.input.active = false; h.commit(); await h.settle();
  const restart = w.runtime(); await restart.initializeSkyPublicImageCache(); const next = consumer(w, restart); next.commit();
  await next.wait(() => next.images.length === 1); assert.equal(w.requests.length, 1); assert.equal(next.images[0]!.src, file);
  await next.settle();
  const api = transportHarness(false, () => {}, false, TEST_API_BASE, Date.now, () => restart.clearSkyPublicImageCache());
  const pendingApi = api.request("spot-sky", "/public-cache-consumer").catch(error => error);
  const late = next.images[0]!.onload!; const cancelled = await api.clearTemporaryApiCache();
  assert.equal(cancelled, 1); await pendingApi; api.queryClient.clear(); late(); await next.settle();
  assert.equal(next.result.images.size, 0); assert.equal(next.result.failed, true); assert.equal(w.caches[1]!.inspect().leased, 0); assert.ok(!w.files.has(file));
  next.result.retryImages(); await next.wait(() => next.images.length === 2); assert.equal(w.requests.length, 2); assert.notEqual(next.images[1]!.src, file);
  next.complete(1); next.input.active = false; next.commit(); await next.settle();
  assert.equal((await restart.clearSkyPublicImageCache()).status, "complete");
  assert.ok([...w.files.keys()].every(p => p.endsWith("/index-v2.json")));
  evidence.push({ case: "cold-hide-newCanvas-restart-publicServiceClear-retry", publicServiceCancelledReads: cancelled,
    publicServiceSingletonClearCalls: api.publicImageClearCount(), heldStateReleased: next.held() === null, ...w.snapshot() });
});

test("two live full hook consumers share one acquisition and independent leases", async () => {
  const w = world(), runtime = w.runtime(), a = consumer(w, runtime), b = consumer(w, runtime); a.commit(); b.commit();
  await a.wait(() => a.images.length === 1); await b.wait(() => b.images.length === 1); a.complete(0); b.complete(0);
  assert.equal(w.requests.length, 1); assert.equal(a.images[0]!.src, b.images[0]!.src); assert.equal(w.caches[0]!.inspect().leased, 2);
  a.input.active = false; a.commit(); await a.settle(); assert.equal(w.caches[0]!.inspect().leased, 1); assert.ok(w.files.has(b.images[0]!.src));
  b.input.active = false; b.commit(); await b.settle(); assert.equal(w.caches[0]!.inspect().leased, 0);
  assert.equal((await runtime.clearSkyPublicImageCache()).status, "complete");
  evidence.push({ case: "twoCanvas-dedup-leases", ...w.snapshot() });
});

test("actual content failure preserves the ready coarse fallback and explicit retry recovers fine", async () => {
  const w = world(), runtime = w.runtime(), h = consumer(w, runtime); h.input.fallback = [coarse.asset.id]; h.commit();
  await h.wait(() => h.images.length === 1); const fallback = h.images[0]!; h.complete(0);
  w.corruptOnce.add(fine.url); h.input.wanted = [fine.asset]; h.commit(); await h.wait(() => h.result.failed);
  assert.equal(h.images.length, 1); assert.equal(h.result.images.has(fine.asset.id), false); assert.equal(h.result.retainedImages.get(coarse.asset.id), fallback);
  assert.equal(w.caches[0]!.inspect().leased, 1); assert.ok(w.files.has(fallback.src));
  await h.settle(); assert.equal(w.requests.length, 2); h.result.retryImages(); await h.wait(() => h.images.length === 2);
  assert.equal(h.result.retainedImages.get(coarse.asset.id), fallback); assert.equal(w.requests.length, 3);
  h.complete(1); assert.equal(h.result.images.get(fine.asset.id), h.images[1]); assert.equal(h.result.failed, false);
  assert.equal(skyImageContentHash(new Uint8Array(w.files.get(h.images[1]!.src)!)), fine.asset.sha256);
  h.input.active = false; h.commit(); await h.settle(); await runtime.clearSkyPublicImageCache();
  evidence.push({ case: "changed-fine-bytes-no-native-decode-coarse-retained-explicit-retry", ...w.snapshot() });
});

test("explicit temporary session variation remains; an invalid public route cannot fall back", async () => {
  const trialUrl = base + "/v2/sky/optical/fixture/0/0";
  const trialWorld = world(); trialWorld.resources.set(trialUrl, coarse.bytes);
  // Exercise the shared hook's actual session branch with that explicit policy.
  // The optional optical manifest/selection/query path is outside this check.
    const trial = consumer(trialWorld, trialWorld.runtime()); trial.input.storage = "session"; trial.input.url = trialUrl; trial.commit(); await trial.wait(() => trial.images.length === 1);
    assert.equal(trialWorld.caches.length, 0); assert.match(trial.images[0]!.src, /\/sky-art-[a-z0-9_]+-\d+\.jpg$/); trial.complete(0);
    const file = trial.images[0]!.src; trial.input.active = false; trial.commit(); await trial.settle(); assert.ok(!trialWorld.files.has(file));
    const deniedWorld = world(), denied = consumer(deniedWorld, deniedWorld.runtime()); denied.input.url = trialUrl; denied.commit(); await denied.wait(() => denied.result.failed);
    assert.equal(deniedWorld.requests.length, 0); assert.equal(denied.images.length, 0); assert.equal(deniedWorld.caches.length, 0);
    denied.input.active = false; denied.commit();
    evidence.push({ case: "explicit-session-only-no-public-failure-fallback", trial: trialWorld.snapshot(), denied: deniedWorld.snapshot() });
});

test("full App launch preserves legacy cleanup and initializes the same public owner without fetching images", async () => {
  const w = world(), runtime = w.runtime();
  const legacy = w.root + "/sky-art-previous_runtime-1.jpg", unrelated = w.root + "/user-photo.jpg";
  w.files.set(legacy, asBuffer(coarse.bytes)); w.files.set(unrelated, asBuffer(coarse.bytes));
  let launches = 0, chrome = 0;
  const app = compile(new URL("../../app.tsx", import.meta.url), {
    "@tarojs/taro": { default: w.Taro, useLaunch(callback: () => void) { launches++; callback(); } },
    "@tanstack/react-query": { QueryClientProvider: () => undefined },
    "react/jsx-runtime": { jsx: () => undefined }, "@/services/query-client": { miniappQueryClient: {} },
    "@/services/api-client": {}, "@/state/app-store": { useAppStore: { getState: () => ({ mode: "NIGHT" }) } },
    "@/theme/native-chrome": { syncNativeChrome: async () => { chrome++; } },
    "@/services/acceptance-diagnostics": {}, "@/services/sky-image-file-session": { skyImageFileSession },
    "@/services/sky-public-image-runtime": runtime, "./app.scss": {},
  });
  app.default({ children: undefined });
  for (let i = 0; i < 400; i++) await Promise.resolve();
  assert.equal(launches, 1); assert.equal(chrome, 1); assert.ok(!w.files.has(legacy)); assert.ok(w.files.has(unrelated));
  assert.equal(w.caches.length, 1); assert.ok(w.files.has(w.root + "/sky-public-images-v1/index-v2.json")); assert.equal(w.requests.length, 0);
  await runtime.initializeSkyPublicImageCache(); assert.equal(w.caches.length, 1);
  evidence.push({ case: "actual-App-launch-legacy-cleanup-public-singleton-initialize", launches, chrome, ...w.snapshot() });
});

test("acquisition cancel exceptions cannot retain a pending decode lease or stop disposal of other images", async () => {
  const w = world(), runtime = w.runtime(); let cancels = 0;
  const fault = { ...runtime, acquirePublishedSkyImage(...args: unknown[]) {
    const acquisition = runtime.acquirePublishedSkyImage(...args);
    return { promise: acquisition.promise, cancel() { cancels++; throw Error("controlled_acquisition_cancel_throw"); } };
  } };
  const h = consumer(w, fault); h.input.wanted = [coarse.asset, fine.asset]; h.commit(); await h.wait(() => h.images.length === 2); await h.settle();
  assert.equal(w.caches[0]!.inspect().leased, 2); const late = h.images.map(image => image.onload!);
  h.input.active = false; let error: unknown;
  try { h.commit(); } catch (cause) { error = cause; }
  evidence.push({ case: "acquisition-cancel-throw-dispose-real-leases", disposalError: error ? String(error) : null, cancels, ...w.snapshot() });
  assert.equal(error, undefined); assert.equal(cancels, 2); await h.settle();
  assert.equal(w.caches[0]!.inspect().leased, 0); assert.equal(h.held(), null); for (const callback of late) callback();
  assert.equal(h.result.images.size, 0); assert.ok(h.images.every(image => image.onload === null && image.onerror === null));
  assert.equal((await runtime.clearSkyPublicImageCache()).status, "complete");
});

test("native abort throw fences the public hook and holds actual unsettled transport until its callback", async () => {
  const w = world(), runtime = w.runtime(), h = consumer(w, runtime); h.input.fallback = [coarse.asset.id]; h.commit();
  await h.wait(() => h.images.length === 1); h.complete(0); await h.settle();
  w.heldTransfers.add(fine.url); w.abortThrows.add(fine.url); h.input.wanted = [fine.asset]; h.commit();
  await h.wait(() => w.pendingTransfers.has(fine.url));
  const api = transportHarness(false, () => {}, false, TEST_API_BASE, Date.now, () => runtime.clearSkyPublicImageCache());
  await assert.rejects(api.clearTemporaryApiCache(), /local_cache_cleanup_incomplete/); await h.settle();
  const beforeCallback = w.snapshot(); evidence.push({ case: "native-abort-throw-public-clear-before-actual-callback", ...beforeCallback });
  assert.equal(w.caches[0]!.inspect().entries, 0); assert.equal(w.caches[0]!.inspect().retired, 0);
  assert.equal(w.caches[0]!.inspect().leased, 0, "ready coarse retirement releases its lease even when another abort throws");
  assert.equal(h.result.retainedImages.size, 0); assert.equal(skyNativeImageIsCurrent(h.images[0]!), false);
  assert.equal(w.caches[0]!.inspect().running, 1, "a failed native abort is not actual transport completion");
  assert.equal(w.caches[0]!.inspect().reserved, fine.asset.bytes); assert.equal(h.images.length, 1);
  h.input.active = false; h.commit(); await h.settle();
  w.pendingTransfers.get(fine.url)!(); w.pendingTransfers.delete(fine.url); await h.settle();
  assert.equal(w.caches[0]!.inspect().running, 0); assert.equal(w.caches[0]!.inspect().reserved, 0); assert.equal(h.images.length, 1);
  assert.equal((await runtime.clearSkyPublicImageCache()).status, "complete"); api.queryClient.clear();
  evidence.push({ case: "native-abort-throw-late-success-fenced-final-cleanup", ...w.snapshot() });
});

test("landscape alpha cold and warm decoding share the encoded owner without retaining a decoded grid", async () => {
  const w = world(), runtime = w.runtime();
  const manifestBytes = readFileSync(new URL("../../../../../workers/miniapp-api/assets/landscape/manifest.json", import.meta.url));
  const publicationHash = skyImageContentHash(manifestBytes);
  const fixed = SKY_LANDSCAPE_RESOURCES[0], downloadUrl = `/v2/sky/landscape/${publicationHash}/${fixed.alpha.file}`;
  const resource = { ...fixed, image: { ...fixed.image, downloadUrl: `/v2/sky/landscape/${publicationHash}/${fixed.image.file}` },
    alpha: { ...fixed.alpha, downloadUrl } };
  const bytes = readFileSync(new URL("../../../../../workers/miniapp-api/assets/landscape/" + fixed.alpha.file, import.meta.url));
  assert.equal(bytes.length, fixed.alpha.bytes); assert.equal(skyImageContentHash(bytes), fixed.alpha.sha256);
  w.resources.set(base + downloadUrl, bytes);
  const client = compile(new URL("../../services/sky-landscape-client.ts", import.meta.url), {
    "@starward/miniapp-contracts": { MINIAPP_API_BASE_PATH: "/v2", decodeSkyLandscapeAlpha, assertSkyLandscapeManifest() {} },
    "./sky-public-image-runtime": runtime,
    "./bare-sky-resource": { skyResourceUrl: (p: string) => base + p,
      requestBareSkyResource: async (p: string) => { w.requests.push(base + p); return { status: 200, body: JSON.parse(bytes.toString("utf8")) }; } },
  }, process.env.CLOUD_SKY_LANDSCAPE_CLIENT_SOURCE_OVERRIDE ? readFileSync(process.env.CLOUD_SKY_LANDSCAPE_CLIENT_SOURCE_OVERRIDE, "utf8") : undefined);
  const cold: Uint8Array = await client.getSkyLandscapeAlpha(resource);
  const warm: Uint8Array = await client.getSkyLandscapeAlpha(resource);
  assert.equal(w.requests.filter(url => url === base + downloadUrl).length, 1, "an immutable warm alpha file must not download again");
  assert.equal(cold.byteLength, 1024 * 512); assert.notEqual(cold, warm, "hide retires the decoded grid; warm recovery decodes verified bytes again");
  assert.deepEqual(warm, cold); assert.equal(skyImageContentHash(warm), fixed.alpha.decodedSha256);
  assert.equal(w.caches.length, 1); assert.equal(w.caches[0]!.inspect().bytes, bytes.length);
  assert.equal(w.caches[0]!.inspect().leased, 0, "UTF8 read completes before decoded alpha escapes");
  assert.equal((await runtime.clearSkyPublicImageCache()).status, "complete");
  await client.getSkyLandscapeAlpha(resource);
  assert.equal(w.requests.filter(url => url === base + downloadUrl).length, 2, "explicit clear withdraws the immutable file too");
  const asset = { format: "json", sha256: fixed.alpha.sha256, bytes: fixed.alpha.bytes };
  assert.throws(() => runtime.acquirePublishedSkyJson(asset, base + downloadUrl, "0".repeat(64)), /route_invalid/);
  assert.throws(() => runtime.acquirePublishedSkyJson(asset, `https://other.invalid${downloadUrl}`, publicationHash), /route_invalid/);
  assert.throws(() => runtime.acquirePublishedSkyJson(asset, `${base}/v2/sky/landscape/${publicationHash}/manifest.json`, publicationHash), /route_invalid/);
  await assert.rejects(client.getSkyLandscapeAlpha({ ...resource, alpha: { ...resource.alpha, file: "another.alpha-rle.json" } }), /route_invalid/);
  const aborted = new AbortController(); aborted.abort();
  await assert.rejects(client.getSkyLandscapeAlpha(resource, aborted.signal));
  assert.equal(w.requests.filter(url => url === base + downloadUrl).length, 2, "rejected routes and cancelled consumer cannot create transfers");
  evidence.push({ case: "landscape-alpha-single-owner-warm-and-clear", ...w.snapshot() });
  await runtime.clearSkyPublicImageCache();
});
