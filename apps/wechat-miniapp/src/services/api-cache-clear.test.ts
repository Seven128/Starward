import assert from "node:assert/strict";
import test from "node:test";
import { TEST_API_BASE, transportHarness } from "./api-request-test-support";
import { responseCacheKey } from "./cache-policy";
import type { clearSkyPublicImageCache } from "./sky-public-image-runtime";

const temporary = "map-scene:clear-fixture", retained = "plans:clear-fixture";
async function seeded(clearImages: typeof clearSkyPublicImageCache) {
  const h = transportHarness(false, () => {}, false, TEST_API_BASE, Date.now, clearImages);
  // Keep unrelated inactive query data across the deliberate event-loop yield;
  // the generic transport fixture otherwise garbage-collects at zero delay.
  h.queryClient.setDefaultOptions({ queries: { retry: false, gcTime: Infinity } });
  for (const key of [temporary, retained]) {
    h.responseCache.set(key, { apiVersion: "v2", generatedAt: h.response.generatedAt, validAt: h.response.generatedAt,
      requestId: h.response.requestId, etag: h.response.etag, dataState: "FRESH", warnings: [], sources: [], data: { key } });
    h.queryClient.setQueryData([key.split(":")[0], "clear-fixture"], { key });
  }
  h.storage.set("draft:retained", "authored draft");
  await h.flush();
  return h;
}
function assertSelectiveCleanup(h: Awaited<ReturnType<typeof seeded>>) {
  assert.equal(h.responseCache.get(temporary), undefined);
  assert.equal(h.queryClient.getQueryData(["map-scene", "clear-fixture"]), undefined);
  assert.ok(h.responseCache.get(retained));
  assert.deepEqual(h.queryClient.getQueryData(["plans", "clear-fixture"]), { key: retained });
  assert.equal(h.storage.get("draft:retained"), "authored draft");
  const bodies = [...h.storage.values()].filter((value): value is string => typeof value === "string" && value.startsWith("{"));
  assert.equal(bodies.length, 1, "durable response cleanup preserves only the unrelated response body");
}

test("public image epoch is fenced synchronously before API cancellation; pending file I/O does not postpone response/query cleanup", async () => {
  let releaseImages!: (result: Awaited<ReturnType<typeof clearSkyPublicImageCache>>) => void;
  const h = await seeded(() => new Promise(resolve => { releaseImages = resolve; }));
  let imageCallsAtCancel = -1;
  const cancelReads = h.requests.cancelReads.bind(h.requests);
  h.requests.cancelReads = predicate => {
    imageCallsAtCancel = h.publicImageClearCount();
    return cancelReads(predicate);
  };
  const read = h.request("map-scene", "/clear-pending").catch(() => undefined);
  const late = h.calls.at(-1)!;
  let finished = false;
  const clearing = h.clearTemporaryApiCache().then(count => { finished = true; return count; });
  void clearing.catch(() => undefined);
  assert.equal(imageCallsAtCancel, 1, "public file epoch must precede cancelling API reads without an awaited gap");
  assert.equal(h.responseCache.get(temporary), undefined);
  await new Promise<void>(resolve => setImmediate(resolve));
  assertSelectiveCleanup(h);
  assert.equal(finished, false, "successful completion still waits for the public owner result");
  releaseImages({ status: "complete", files: 0 });
  assert.equal(await clearing, 1, "return value still counts only cancelled API reads");
  late.success({ statusCode: 200, data: h.response });
  await read; await h.flush();
  assert.equal(h.responseCache.get(responseCacheKey("map-scene", TEST_API_BASE, "/clear-pending") + ":anonymous"), undefined);
  h.queryClient.clear();
});

test("partial, pending, rejected and unavailable public cleanup report incomplete after all response/query cleanup", async () => {
  for (const outcome of ["partial", "pending", "reject", "throw"] as const) {
    const h = await seeded(() => {
      if (outcome === "throw") throw new Error("synthetic unavailable file system");
      if (outcome === "reject") return Promise.reject(new Error("synthetic failed file cleanup"));
      return Promise.resolve({ status: outcome, files: 1 });
    });
    await assert.rejects(h.clearTemporaryApiCache(), /local_cache_cleanup_incomplete/);
    assert.equal(h.publicImageClearCount(), 1);
    assertSelectiveCleanup(h);
    h.queryClient.clear();
  }
});

test("failed query cancellation still removes temporary queries, flushes responses and awaits the public owner", async () => {
  for (const failure of ["throw", "reject"] as const) {
    const h = await seeded(async () => ({ status: "complete", files: 0 }));
    let flushed = false;
    const flush = h.responseCache.flush;
    h.responseCache.flush = async () => { flushed = true; await flush(); };
    h.queryClient.cancelQueries = () => {
      if (failure === "throw") throw new Error("synthetic query cancellation failure");
      return Promise.reject(new Error("synthetic query cancellation failure"));
    };
    await assert.rejects(h.clearTemporaryApiCache(), /local_cache_cleanup_incomplete/);
    assert.equal(flushed, true);
    assert.equal(h.publicImageClearCount(), 1);
    assertSelectiveCleanup(h);
    h.queryClient.clear();
  }
});

test("response cleanup failure still performs API cancellation and query removal without claiming completion", async () => {
  for (const failure of ["invalidate", "flush", "readback"] as const) {
    const h = await seeded(async () => ({ status: "complete", files: 0 }));
    const read = h.request("map-scene", "/clear-response-failure").catch(() => undefined);
    let flushed = false;
    const flush = h.responseCache.flush;
    h.responseCache.flush = async () => {
      flushed = true;
      if (failure === "flush") throw new Error("synthetic response flush failure");
      await flush();
    };
    if (failure === "invalidate") h.responseCache.invalidate = () => { throw new Error("synthetic response invalidation failure"); };
    if (failure === "readback") h.responseCache.cleanupComplete = () => false;
    await assert.rejects(h.clearTemporaryApiCache(), /local_cache_cleanup_incomplete/);
    await read;
    assert.equal(h.requests.has("map-scene"), false);
    assert.equal(h.queryClient.getQueryData(["map-scene", "clear-fixture"]), undefined);
    assert.ok(h.queryClient.getQueryData(["plans", "clear-fixture"]));
    assert.equal(flushed, true, "response flush is attempted after any earlier failure");
    assert.equal(h.publicImageClearCount(), 1);
    h.queryClient.clear();
  }
});
