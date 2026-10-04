import assert from "node:assert/strict";
import test from "node:test";
import { startDeepSkyImageRequest, type OwnedDeepSkyImageAsset } from "./deep-sky-image-request.ts";
import { publishedDeepSkyDiscovery, publishedDeepSkyBytes } from "./deep-sky-image-test-support.ts";
import { createSkyPublicImageCache, type SkyPublicImageFileSystem } from "../../services/sky-public-image-cache.ts";
import type { DeepSkyImageDescriptor, DeepSkyImageDiscoveryData } from "@starward/miniapp-contracts";
import { skyDeepSkyImageIntersectsView, type SkyTargetImageView } from "./sky-target-image-visibility";
import { createSkyViewBasis } from "./sky-view-projection";

const turn = async () => { for (let i = 0; i < 16; i++) await new Promise<void>(resolve => setImmediate(resolve)); };
function world() {
  const files = new Map<string, ArrayBuffer>(), transfers: string[] = [];
  const fs: SkyPublicImageFileSystem = {
    async mkdir() {}, async list(root) { return [...files.keys()].filter(name => name.startsWith(root + "/")).map(name => name.slice(root.length + 1)); },
    async size(name) { const data = files.get(name); if (!data) throw new Error("missing"); return data.byteLength; },
    async read(name, length) { const data = files.get(name); if (!data) throw new Error("missing"); return data.slice(0, length); },
    async write(name, data) { files.set(name, data.slice(0)); },
    async rename(from, to) { const data = files.get(from); if (!data) throw new Error("missing"); files.set(to, data); files.delete(from); },
    async remove(name) { files.delete(name); },
  };
  const bodies = new Map<string, ArrayBuffer>();
  for (const ref of ["M:31", "M:42"]) {
    const publication = publishedDeepSkyDiscovery(ref);
    for (const level of ["OVERVIEW", "MEDIUM", "DETAIL"] as const)
      bodies.set(publication.levels[level].sha256, publishedDeepSkyBytes(publication, level));
  }
  const cache = createSkyPublicImageCache({ fs, root: "/public", session: "controlled", byteBudget: 2 * 1024 * 1024, maxFileBytes: 512 * 1024,
    transfer(asset) { transfers.push(asset.url); return { promise: Promise.resolve(bodies.get(asset.sha256)!.slice(0)), cancel() {} }; } });
  const acquire = (asset: DeepSkyImageDescriptor) => cache.acquire({ ...asset, environment: "e".repeat(64), url: "https://approved.fixture.invalid" + asset.downloadUrl });
  const demand = () => {
    const epoch = cache.inspect().epoch;
    return { isCurrent: () => epoch === cache.inspect().epoch, onRetire: () => () => {}, release() {} };
  };
  function start(discovery = publishedDeepSkyDiscovery(), discover = async (_signal: AbortSignal) => discovery) {
    const ready: OwnedDeepSkyImageAsset[] = []; let errors = 0, cancels = 0;
    const cancel = startDeepSkyImageRequest({ reference: discovery.objectRef, level: "DETAIL", demand: demand(), discover, acquire,
      onReady: value => ready.push(value), onError: () => { errors++; }, onCancel: () => { cancels++; } });
    return { ready, cancel, get errors() { return errors; }, get cancels() { return cancels; } };
  }
  return { files, transfers, cache, start, acquire, bodies, demand };
}

test("latest fully-offscreen W3 discovery cancels demand before encoded transfer and a return reuses files", async () => {
  const h = world(), discovery = publishedDeepSkyDiscovery();
  const at = "2026-10-03T13:00:00.000Z";
  const report = { hourly: [{ at }], skyScene: { deepSky: { state: "AVAILABLE", catalog: {
    frame: "ICRS J2000", imageRegistration: "ICRS_TAN_NORTH_0_1_V1", entries: [{ objectRef: discovery.objectRef }] },
    frames: [{ at, state: "AVAILABLE", points: [[0, 0, -10, 0, -9.9, 359.9, -10]] }] } } } as any;
  let view: SkyTargetImageView = { report, at, width: 390, height: 844,
    view: { basis: createSkyViewBasis(0, 80, 0)!, verticalFovDeg: .05 } };
  const ready: OwnedDeepSkyImageAsset[] = []; let observed = 0, cancels = 0;
  const start = (discover = async (_signal: AbortSignal) => discovery) => startDeepSkyImageRequest({
    reference: discovery.objectRef, level: "DETAIL", demand: h.demand(), discover, acquire: h.acquire,
    onDiscovered(data) { observed++; assert.equal(data.publicationHash, discovery.publicationHash); return skyDeepSkyImageIntersectsView(data, view); },
    onReady: asset => ready.push(asset), onError() { assert.fail("geometric exclusion is not unavailable imagery"); },
    onCancel() { cancels++; },
  });
  assert.equal(skyDeepSkyImageIntersectsView(discovery, view), true);
  let complete!: (data: DeepSkyImageDiscoveryData) => void;
  const cancel = start(() => new Promise(resolve => { complete = resolve; }));
  view = { ...view, view: { ...view.view, basis: createSkyViewBasis(90, 80, 0)! } };
  assert.equal(skyDeepSkyImageIntersectsView(discovery, view), false);
  complete(discovery); await turn(); cancel();
  assert.equal(h.transfers.length, 0); assert.equal(ready.length, 0); assert.equal(observed, 1); assert.equal(cancels, 1);
  assert.equal(h.cache.inspect().leased, 0);
  view = { ...view, view: { ...view.view, basis: createSkyViewBasis(0, 80, 0)! } };
  start(); await turn(); assert.equal(ready.length, 1); assert.equal(h.transfers.length, 1);
  const path = ready[0]!.tempFilePath; ready[0]!.release(); assert.equal(h.cache.inspect().leased, 0);
  start(); await turn(); assert.equal(ready.length, 2); assert.equal(ready[1]!.tempFilePath, path);
  assert.notEqual(ready[1]!.release, ready[0]!.release); assert.equal(h.transfers.length, 1);
  ready[1]!.release(); await h.cache.clear(); assert.equal(h.cache.inspect().bytes, 0);
});

test("discover identity before transfer, preserve real PNG support, and reuse verified public files", async () => {
  const h = world(), discovery = publishedDeepSkyDiscovery();
  let complete!: (data: DeepSkyImageDiscoveryData) => void;
  const first = h.start(discovery, () => new Promise(resolve => { complete = resolve; }));
  assert.equal(h.transfers.length, 0);
  complete(discovery); await turn();
  const asset = first.ready[0]!; assert(asset); assert.equal(first.errors, 0);
  assert.equal(asset.publicationHash, discovery.publicationHash); assert.equal(asset.sourceId, discovery.sourceId);
  assert.equal(asset.sourceMissingPixels, discovery.levels.DETAIL.sourceFiniteMask!.missingPixels);
  assert.deepEqual(asset.displaySupport, discovery.levels.DETAIL.displaySupport);
  assert.ok(asset.tempFilePath.startsWith("/public/")); assert.ok(asset.tempFilePath.endsWith(".png"));
  assert.ok(asset.tempFilePath.includes(discovery.levels.DETAIL.sha256));
  assert.equal(asset.isCurrent(), true); assert.equal(h.transfers.length, 1);
  first.cancel(); assert.equal(first.cancels, 0, "ready ownership belongs to the page");
  asset.release(); asset.release(); assert.equal(asset.isCurrent(), false);
  const next = h.start(discovery); await turn();
  assert.equal(next.ready[0]!.tempFilePath, asset.tempFilePath); assert.equal(h.transfers.length, 1);
  next.ready[0]!.release();
});

test("cancelled discovery or late acquisition cannot publish or retain a lease", async () => {
  const h = world(), discovery = publishedDeepSkyDiscovery();
  let complete!: (data: DeepSkyImageDiscoveryData) => void, signal!: AbortSignal;
  const stopped = h.start(discovery, value => { signal = value; return new Promise(resolve => { complete = resolve; }); });
  stopped.cancel(); stopped.cancel(); assert.equal(signal.aborted, true);
  complete(discovery); await turn();
  assert.equal(h.transfers.length, 0); assert.equal(stopped.ready.length, 0); assert.equal(stopped.cancels, 1);
  let release = 0, cancel = 0, deliver!: (value: any) => void;
  const stop = startDeepSkyImageRequest({ reference: discovery.objectRef, level: "DETAIL", demand: h.demand(), discover: async () => discovery,
    acquire: () => ({ promise: new Promise(resolve => { deliver = resolve; }), cancel() { cancel++; throw new Error("abort failure"); } }),
    onReady() { assert.fail("late image"); }, onError() { assert.fail("cancel is not error"); } });
  await turn(); assert.doesNotThrow(stop);
  deliver({ filePath: "/late", isCurrent: () => true, release() { release++; } }); await turn();
  assert.equal(cancel, 1); assert.equal(release, 1);
});

test("clear during undiscovered metadata fences acquisition even if the late provider ignores cancellation", async () => {
  const h = world(), discovery = publishedDeepSkyDiscovery();
  let complete!: (value: DeepSkyImageDiscoveryData) => void;
  const request = h.start(discovery, () => new Promise(resolve => { complete = resolve; }));
  await h.cache.clear(); complete(discovery); await turn();
  assert.equal(request.ready.length, 0); assert.equal(request.errors, 1); assert.equal(h.transfers.length, 0);
});

test("wrong discovery identity, unsupported coverage and altered image bytes fail before ready", async () => {
  for (const mutate of [
    (data: DeepSkyImageDiscoveryData) => { data.sourceId = "wrong"; },
    (data: DeepSkyImageDiscoveryData) => { data.levels.DETAIL.downloadUrl += "?current=1"; },
    (data: DeepSkyImageDiscoveryData) => { (data.levels.DETAIL as any).validFraction = 1; },
    (data: DeepSkyImageDiscoveryData) => { data.levels.DETAIL.displaySupport!.sourceSha256 = "0".repeat(64); },
  ]) {
    const h = world(), discovery = publishedDeepSkyDiscovery(); mutate(discovery);
    const bad = h.start(discovery); await turn();
    assert.equal(bad.errors, 1); assert.equal(bad.ready.length, 0); assert.equal(h.transfers.length, 0);
  }
  const h = world(), discovery = publishedDeepSkyDiscovery("M:31");
  const bytes = new Uint8Array(h.bodies.get(discovery.levels.DETAIL.sha256)!); bytes[40] = bytes[40]! ^ 1;
  const bad = h.start(discovery); await turn(); assert.equal(bad.errors, 1); assert.equal(bad.ready.length, 0);
  assert.equal([...h.files.keys()].some(name => /file-.*\.jpg$/.test(name)), false);
});

test("equal encoded bytes keep separate immutable publication metadata and retire all leases on clear", async () => {
  const h = world(), original = publishedDeepSkyDiscovery(), old = h.start(original); await turn();
  const changed = structuredClone(original); changed.publicationHash = "f".repeat(64); changed.publicationId += "-controlled";
  changed.sourceId = `imagery:${changed.publicationId}:${changed.publicationHash}`; changed.source.id = changed.sourceId;
  for (const value of Object.values(changed.levels)) value.downloadUrl = value.downloadUrl.replace(original.publicationHash, changed.publicationHash);
  delete changed.levels.DETAIL.displaySupport;
  const next = h.start(changed); await turn();
  const a = old.ready[0]!, b = next.ready[0]!;
  assert.equal(a.tempFilePath, b.tempFilePath); assert.notEqual(a.release, b.release);
  assert.equal(h.transfers.length, 1); assert.equal(a.sourceId, original.sourceId); assert.equal(b.sourceId, changed.sourceId);
  assert(a.displaySupport); assert.equal(b.displaySupport, undefined);
  let retired = 0;
  a.onRetire(() => { retired++; a.release(); }); b.onRetire(() => { retired++; b.release(); });
  const result = await h.cache.clear(); assert.equal(retired, 2); assert.equal(a.isCurrent(), false); assert.equal(b.isCurrent(), false);
  assert.equal(result.status, "complete"); assert.equal(h.cache.inspect().leased, 0);
  const retry = h.start(original); await turn(); assert.equal(retry.ready.length, 1); assert.equal(h.transfers.length, 2);
  retry.ready[0]!.release();
});
