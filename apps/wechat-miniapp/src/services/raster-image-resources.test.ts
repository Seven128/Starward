import assert from "node:assert/strict";
import test from "node:test";
import { createRasterImageResources, type RasterImageDescriptor, type RasterImageFile } from "./raster-image-resources.ts";
import { isMiniappRequestCancelled } from "./request-lifecycle.ts";

const settle = () => new Promise<void>(resolve => setImmediate(resolve));
function harness(limits = { maximumFiles: 4, maximumBytes: 16, maximumConcurrent: 2 }) {
  const jobs: { input: RasterImageDescriptor; signal: AbortSignal; resolve(file: RasterImageFile): void; reject(error: Error): void }[] = [];
  const removed: string[] = [];
  let removalFailures = 0;
  const owner = createRasterImageResources({
    download: (input, signal) => new Promise<RasterImageFile>((resolve, reject) => jobs.push({ input, signal, resolve, reject })),
    remove: async path => { if (removalFailures) { removalFailures--; throw new Error("unlink failed"); } removed.push(path); },
  }, limits);
  return { owner, jobs, removed, failNextRemoval() { removalFailures++; } };
}
const descriptor = (key: string) => ({ key, url: `/v2/terrain/assets/${key}.png` });

test("shared readers cancel independently and a native pin protects the old file through replacement pressure", async () => {
  const h = harness({ maximumFiles: 2, maximumBytes: 6, maximumConcurrent: 2 });
  const first = h.owner.acquire(descriptor("a")), second = h.owner.acquire(descriptor("a"));
  const cancelled = first.promise.catch(error => error);
  await settle(); assert.equal(h.jobs.length, 1);
  first.release(); assert.ok(isMiniappRequestCancelled(await cancelled)); assert.equal(h.jobs[0]!.signal.aborted, false);
  h.jobs[0]!.resolve({ path: "/owned/a", bytes: 4 }); assert.equal((await second.promise).path, "/owned/a");
  const unpin = h.owner.retainPath("/owned/a"); second.release();
  const replacement = h.owner.acquire(descriptor("b")); const rejected = replacement.promise.catch(error => error);
  await settle(); h.jobs[1]!.resolve({ path: "/owned/b", bytes: 4 });
  assert.match((await rejected).message, /budget_busy/); await settle();
  assert.deepEqual(h.removed, ["/owned/b"]); assert.equal(h.owner.snapshot().readyBytes, 4);
  unpin(); await settle();
  const next = h.owner.acquire(descriptor("c")); await settle(); h.jobs[2]!.resolve({ path: "/owned/c", bytes: 4 });
  await next.promise; assert.deepEqual(h.removed, ["/owned/b", "/owned/a"]);
  next.release(); await h.owner.close();
});

test("a fully abandoned late download is removed and never supplies the next reader of the same identity", async () => {
  const h = harness({ maximumFiles: 3, maximumBytes: 16, maximumConcurrent: 1 });
  const old = h.owner.acquire(descriptor("a")); const cancelled = old.promise.catch(error => error);
  await settle(); old.release(); assert.ok(isMiniappRequestCancelled(await cancelled));
  const next = h.owner.acquire(descriptor("a")); await settle();
  assert.equal(h.jobs[0]!.signal.aborted, true); assert.equal(h.jobs.length, 1);
  h.jobs[0]!.resolve({ path: "/owned/late", bytes: 2 }); await settle(); await settle();
  assert.deepEqual(h.removed, ["/owned/late"]); assert.equal(h.jobs.length, 2); assert.equal(h.jobs[1]!.signal.aborted, false);
  h.jobs[1]!.resolve({ path: "/owned/current", bytes: 2 }); assert.equal((await next.promise).path, "/owned/current");
  next.release(); await h.owner.close();
});

test("the bounded queue continues after a failed transfer and retry obtains a new slot", async () => {
  const h = harness();
  const a = h.owner.acquire(descriptor("a")), b = h.owner.acquire(descriptor("b")), c = h.owner.acquire(descriptor("c"));
  const failure = b.promise.catch(error => error);
  await settle(); assert.equal(h.jobs.length, 2); assert.equal(h.owner.snapshot().queued, 1);
  h.jobs[0]!.resolve({ path: "/owned/a", bytes: 2 }); await a.promise; await settle();
  assert.equal(h.jobs.length, 3); assert.equal(h.owner.snapshot().activeDownloads, 2);
  h.jobs[1]!.reject(new Error("offline")); assert.equal((await failure).message, "offline"); await settle();
  const retry = h.owner.acquire(descriptor("b")); await settle(); assert.equal(h.jobs.length, 4);
  h.jobs[2]!.resolve({ path: "/owned/c", bytes: 2 }); h.jobs[3]!.resolve({ path: "/owned/b", bytes: 2 });
  await Promise.all([c.promise, retry.promise]); a.release(); b.release(); c.release(); retry.release(); await h.owner.close();
});

test("invalidation and close keep pinned and unsuccessfully removed files owned until real release", async () => {
  const h = harness(), read = h.owner.acquire(descriptor("a")); await settle();
  h.jobs[0]!.resolve({ path: "/owned/a", bytes: 3 }); await read.promise;
  const releasePin = h.owner.retainPath("/owned/a"); read.release(); h.owner.invalidate("a", "/owned/a"); await settle();
  assert.equal((await h.owner.close()).retainedPinnedFiles, 1); assert.deepEqual(h.removed, []);
  h.failNextRemoval(); releasePin(); await settle();
  assert.equal(h.owner.snapshot().failedRemovals, 1); assert.equal(h.owner.snapshot().readyBytes, 3);
  await h.owner.close(); assert.deepEqual(h.removed, ["/owned/a"]); assert.equal(h.owner.snapshot().readyBytes, 0);
});

test("wrong byte counts are rejected and removed without replacing a valid cached file", async () => {
  const h = harness(), read = h.owner.acquire({ ...descriptor("a"), expectedBytes: 2 });
  const rejected = read.promise.catch(error => error); await settle();
  h.jobs[0]!.resolve({ path: "/owned/wrong", bytes: 3 }); assert.match((await rejected).message, /size_mismatch/); await settle();
  assert.deepEqual(h.removed, ["/owned/wrong"]); assert.equal(h.owner.snapshot().entries, 0);
  await h.owner.close();
});

test("new optional immutable-image hints validate a cached file without breaking older response compatibility", async () => {
  const h = harness(), hash = "a".repeat(64), input = { ...descriptor("a"), expectedSha256: hash };
  const first = h.owner.acquire(input); await settle();
  h.jobs[0]!.resolve({ path: "/owned/a", bytes: 3, sha256: hash }); await first.promise; first.release();
  const upgraded = h.owner.acquire({ ...input, expectedBytes: 3 });
  assert.equal((await upgraded.promise).path, "/owned/a"); assert.equal(h.jobs.length, 1);
  upgraded.release(); const oldResponse = h.owner.acquire(input); await oldResponse.promise;
  assert.equal(h.jobs.length, 1); oldResponse.release(); await h.owner.close();
});

test("a reused native temp path with identical verified bytes shares physical ownership across publication readers", async () => {
  const h = harness({ maximumFiles: 3, maximumBytes: 4, maximumConcurrent: 2 }), hash = "a".repeat(64);
  const a = h.owner.acquire({ ...descriptor("a"), expectedSha256: hash }); await settle();
  h.jobs[0]!.resolve({ path: "/owned/shared", bytes: 4, sha256: hash }); await a.promise;
  const unpinA = h.owner.retainPath("/owned/shared"); a.release();
  const b = h.owner.acquire({ ...descriptor("b"), expectedSha256: hash }); await settle();
  h.jobs[1]!.resolve({ path: "/owned/shared", bytes: 4, sha256: hash }); await b.promise;
  const unpinB = h.owner.retainPath("/owned/shared"); b.release();
  h.owner.invalidate("a", "/owned/shared"); unpinA(); await settle();
  assert.deepEqual(h.removed, []); assert.equal(h.owner.snapshot().readyBytes, 4);
  unpinB(); await settle(); await h.owner.close();
  assert.deepEqual(h.removed, ["/owned/shared"]); assert.equal(h.owner.snapshot().readyBytes, 0);
});
