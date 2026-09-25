import assert from "node:assert/strict";
import test from "node:test";
import type { ApiEnvelope } from "@starward/miniapp-contracts";
import { createResponseCache, MAX_STALE_AGE_MS, RESPONSE_CACHE_LIMITS, RESPONSE_CACHE_STORAGE_KEY, utf8Bytes } from "./response-cache";
import { TEST_API_BASE, transportHarness } from "./api-request-test-support";
import { responseCacheKey } from "./cache-policy";

const clock = 1_800_000_000_000;
const transportKey = (group: string, path: string, scope = "anonymous") =>
  responseCacheKey(group, TEST_API_BASE, path) + ":" + scope;
function envelope(data: unknown = { value: 1 }, etag = "etag-1"): ApiEnvelope<unknown> {
  return { apiVersion: "v2", generatedAt: new Date(clock).toISOString(), validAt: new Date(clock).toISOString(), requestId: "synthetic-cache-test", etag,
    dataState: "FRESH", warnings: [], sources: [], data };
}
function storageFixture() {
  const data = new Map<string, unknown>();
  const reads: string[] = [], writes: { key: string; bytes: number; sync: boolean }[] = [];
  let failBody = false, failManifest = false, failRemoval = false;
  let hold: (() => Promise<void>) | undefined;
  return {
    data, reads, writes,
    setFailure: (body: boolean, manifest = false, removal = false) => { failBody = body; failManifest = manifest; failRemoval = removal; },
    pauseNextWrite: () => {
      let release!: () => void;
      const pending = new Promise<void>(resolve => { release = resolve; });
      hold = () => pending;
      return release;
    },
    getStorageSync(key: string) { reads.push(key); return structuredClone(data.get(key)); },
    getStorageInfoSync() { return { keys: [...data.keys()] }; },
    removeStorageSync(key: string) { if (failRemoval) throw new Error("synthetic removal failure"); data.delete(key); },
    setStorageSync(key: string, value: unknown) {
      if (failManifest) throw new Error("synthetic manifest write failure");
      writes.push({ key, bytes: Buffer.byteLength(JSON.stringify(value)), sync: true });
      data.set(key, structuredClone(value));
    },
    async setStorage({ key, data: value }: { key: string; data: string }) {
      const pending = hold; hold = undefined;
      if (pending) await pending();
      if (failBody) throw new Error("synthetic full storage");
      const bytes = Buffer.byteLength(JSON.stringify(value));
      assert.ok(bytes < 1024 * 1024, "every native storage key must fit independently");
      writes.push({ key, bytes, sync: false });
      data.set(key, value);
    },
  };
}
function largeEnvelope(size = 707_203) {
  // Same uncompressed byte size as the audited full Gaia sky response; synthetic
  // content isolates native storage boundaries from server astronomy computation.
  const base = envelope({ sky: "" });
  return envelope({ sky: "a星😀".repeat(Math.floor((size - Buffer.byteLength(JSON.stringify(base))) / 8)) });
}

test("Geo-bearing recent responses are purged from both stored formats and cannot be stored again", async () => {
  const key = "spot-recent-weather:spot:a:/v2/spots/spot:a/recent-weather:anonymous";
  for (const format of [1, 2]) {
    const storage = storageFixture();
    if (format === 1) {
      storage.data.set(RESPONSE_CACHE_STORAGE_KEY, { schemaVersion: 1, entries: [
        [key, { storedAt: clock, envelope: envelope({ region: "restricted-geo" }) }],
      ] });
    } else {
      const prior = createResponseCache(storage, () => clock);
      prior.set("old-key", envelope({ region: "restricted-geo" }));
      prior.set("keep:weather", envelope({ precipitation: 2 }));
      await prior.flush();
      const manifest = storage.data.get(RESPONSE_CACHE_STORAGE_KEY) as any;
      manifest.entries = manifest.entries.map(([name, entry]: any) => [name === "old-key" ? key : name, entry]);
    }
    const current = createResponseCache(storage, () => clock);
    current.load();
    assert.equal(current.get(key), undefined);
    current.set(key, envelope({ region: "restricted-geo-new" }));
    await current.flush();
    assert.equal(current.get(key), undefined);
    assert.doesNotMatch(JSON.stringify([...storage.data]), /restricted-geo|spot-recent-weather/);
    if (format === 2) assert.deepEqual(current.get("keep:weather")?.envelope.data, { precipitation: 2 });
  }
});

test("byte accounting handles UTF-8, surrogate pairs and serialized storage escaping", () => {
  for (const value of ["ascii", "观星", "😀", "a\ud800b", "\udfff", '"\\\n']) {
    assert.equal(utf8Bytes(value), Buffer.byteLength(value));
  }
  const sky = largeEnvelope();
  assert.ok(JSON.stringify(sky).length > 300_000);
  assert.ok(utf8Bytes(JSON.stringify(sky)) > 700_000);
});

test("full sky survives a restart through bounded chunks without synchronous body writes", async () => {
  const storage = storageFixture(), cache = createResponseCache(storage, () => clock);
  const sky = largeEnvelope();
  cache.set("spot-sky:/sky:a", sky);
  assert.equal(cache.get("spot-sky:/sky:a")?.envelope, sky);
  assert.equal(storage.writes.length, 0, "network completion performs no storage write");
  await cache.flush();
  assert.ok(storage.writes.filter(write => !write.sync).length >= 3);
  assert.equal(storage.writes.filter(write => write.sync).length, 1);
  assert.ok(storage.writes.find(write => write.sync)!.bytes < 4096, "only metadata is committed synchronously");
  storage.reads.length = 0;
  const restarted = createResponseCache(storage, () => clock + 1000);
  restarted.load();
  assert.deepEqual(storage.reads, [RESPONSE_CACHE_STORAGE_KEY], "restart does not parse every response");
  assert.deepEqual(restarted.get("spot-sky:/sky:a")?.envelope, sky);
  assert.equal(restarted.get("spot-sky:/sky:b"), undefined);
});

test("a coalesced batch writes each changed response once and leaves unchanged bodies alone", async () => {
  const storage = storageFixture(), cache = createResponseCache(storage, () => clock);
  for (let i = 0; i < 24; i++) cache.set("item:" + i, envelope({ i }));
  cache.set("item:0", envelope({ final: true }));
  await cache.flush();
  assert.equal(storage.writes.filter(row => !row.sync).length, 24);
  assert.equal(storage.writes.filter(row => row.sync).length, 1);
  storage.writes.length = 0;
  cache.set("item:3", envelope({ changed: true }));
  await cache.flush();
  assert.equal(storage.writes.filter(row => !row.sync).length, 1);
  assert.equal(storage.writes.filter(row => row.sync).length, 1);
  assert.equal([...storage.data.keys()].length, 25, "obsolete body is reclaimed after commit");
});

test("byte and item budgets evict oldest entries and memory can retain a disk-oversize response", async () => {
  const storage = storageFixture();
  let time = clock;
  const cache = createResponseCache(storage, () => time);
  for (let i = 0; i < 6; i++) { time++; cache.set("sky:" + i, largeEnvelope()); }
  await cache.flush();
  const restarted = createResponseCache(storage, () => time);
  assert.equal(restarted.get("sky:0"), undefined);
  assert.ok(restarted.get("sky:5"));
  const persistedBytes = [...storage.data.values()].reduce<number>((sum, item) => sum + Buffer.byteLength(JSON.stringify(item)), 0);
  assert.ok(persistedBytes < RESPONSE_CACHE_LIMITS.persistedBytes + 32_000);
  const huge = envelope({ sky: "a".repeat(RESPONSE_CACHE_LIMITS.persistedItemBytes + 1) });
  cache.set("memory-only", huge);
  await cache.flush();
  assert.equal(cache.get("memory-only")?.envelope, huge);
  assert.equal(createResponseCache(storage, () => time).get("memory-only"), undefined);
  cache.clear();
  for (let i = 0; i < 25; i++) { time++; cache.set("small:" + i, envelope()); }
  assert.equal(cache.get("small:0"), undefined);
  await cache.flush();
  assert.equal(createResponseCache(storage, () => time).get("small:0"), undefined);
  assert.ok(createResponseCache(storage, () => time).get("small:24"));
});

test("failed body or manifest writes preserve the previously committed representation", async () => {
  for (const failure of ["body", "manifest"]) {
    const storage = storageFixture(), cache = createResponseCache(storage, () => clock);
    const previous = envelope({ version: 1 }), current = largeEnvelope();
    cache.set("sky:a", previous); await cache.flush();
    storage.setFailure(failure === "body", failure === "manifest");
    cache.set("sky:a", current); await cache.flush();
    assert.equal(cache.get("sky:a")?.envelope, current, "good network data is not lost");
    assert.deepEqual(createResponseCache(storage, () => clock).get("sky:a")?.envelope, previous);
    assert.equal(storage.data.size, 2, "partial replacement chunks are removed");
  }
});

test("missing, damaged and orphan chunks produce a miss and clean owned leftovers only", async () => {
  for (const damage of ["missing", "same-length-corruption", "manifest", "expired"]) {
    const storage = storageFixture(), cache = createResponseCache(storage, () => clock);
    cache.set("sky:a", largeEnvelope()); await cache.flush();
    const chunk = [...storage.data.keys()].find(key => key !== RESPONSE_CACHE_STORAGE_KEY)!;
    if (damage === "missing") storage.data.delete(chunk);
    if (damage === "same-length-corruption") storage.data.set(chunk, (storage.data.get(chunk) as string).replace("sky", "Sky"));
    if (damage === "manifest") storage.data.set(RESPONSE_CACHE_STORAGE_KEY, { schemaVersion: 2, entries: [["sky:a", { chunks: 9999999 }]] });
    storage.data.set("starward.wechat-miniapp.response-cache.chunk.orphan.0", "uncommitted");
    storage.data.set("another-owner", "preserved");
    const restarted = createResponseCache(storage, () => clock + (damage === "expired" ? MAX_STALE_AGE_MS + 1 : 1));
    assert.equal(restarted.get("sky:a"), undefined, damage);
    assert.equal([...storage.data.keys()].some(key => key.includes(".chunk.")), false, damage);
    assert.equal(storage.data.get("another-owner"), "preserved");
  }
});

test("legacy schema migrates into the same bounded owner and keeps old data after failed migration", async () => {
  for (const fail of [false, true]) {
    const storage = storageFixture();
    const legacy = { schemaVersion: 1, entries: [["sky:a", { envelope: envelope(), storedAt: clock }],
      ["expired:a", { envelope: envelope(), storedAt: clock - MAX_STALE_AGE_MS - 1 }]] };
    storage.data.set(RESPONSE_CACHE_STORAGE_KEY, legacy);
    storage.setFailure(fail);
    const cache = createResponseCache(storage, () => clock);
    assert.deepEqual(cache.get("sky:a")?.envelope, envelope());
    assert.equal(cache.get("expired:a"), undefined);
    await cache.flush();
    assert.equal((storage.data.get(RESPONSE_CACHE_STORAGE_KEY) as { schemaVersion: number }).schemaVersion, fail ? 1 : 2);
    const restarted = createResponseCache(storage, () => clock);
    assert.deepEqual(restarted.get("sky:a")?.envelope, envelope());
    await restarted.flush();
  }
});

test("clear and account removal fence pending writes and late network responses", async () => {
  for (const kind of ["clear", "scope"]) {
    const storage = storageFixture(), cache = createResponseCache(storage, () => clock);
    cache.set("private:b", envelope({ user: "b" })); await cache.flush();
    const requestFence = cache.beginRequest("late:a");
    cache.set("private:a", largeEnvelope());
    const release = storage.pauseNextWrite();
    const pending = cache.flush();
    const deletion = kind === "scope" ? cache.removeScope("a") : (cache.clear(), cache.flush());
    cache.set("late:a", envelope(), requestFence);
    requestFence.release();
    assert.equal(cache.get("late:a"), undefined);
    assert.equal(cache.get("private:a"), undefined);
    release(); await pending; await deletion;
    const restarted = createResponseCache(storage, () => clock);
    assert.equal(restarted.get("private:a"), undefined);
    assert.equal(Boolean(restarted.get("private:b")), kind === "scope");
    assert.equal(storage.data.size, kind === "scope" ? 2 : 0);
  }
});

test("invalidation before legacy migration cannot recover revoked user data", async () => {
  const storage = storageFixture();
  storage.data.set(RESPONSE_CACHE_STORAGE_KEY, { schemaVersion: 1, entries: [
    ["private:a", { envelope: envelope(), storedAt: clock }], ["private:b", { envelope: envelope(), storedAt: clock }],
  ] });
  const cache = createResponseCache(storage, () => clock);
  await cache.removeScope("a");
  const restarted = createResponseCache(storage, () => clock);
  assert.equal(restarted.get("private:a"), undefined);
  assert.ok(restarted.get("private:b"));
});

test("an account purge retains unrelated writes already in progress", async () => {
  const storage = storageFixture(), cache = createResponseCache(storage, () => clock);
  cache.set("private:a", envelope()); await cache.flush();
  const other = largeEnvelope();
  cache.set("private:b", other);
  const release = storage.pauseNextWrite(), pending = cache.flush();
  const deletion = cache.removeScope("a");
  release(); await pending; await deletion;
  const restarted = createResponseCache(storage, () => clock);
  assert.equal(restarted.get("private:a"), undefined);
  assert.deepEqual(restarted.get("private:b")?.envelope, other);
});

test("superseding a body during asynchronous persistence publishes only the latest body", async () => {
  const storage = storageFixture(), cache = createResponseCache(storage, () => clock);
  cache.set("sky:a", largeEnvelope());
  const release = storage.pauseNextWrite(), pending = cache.flush();
  const latest = envelope({ latest: true });
  cache.set("sky:a", latest);
  release(); await pending;
  assert.deepEqual(createResponseCache(storage, () => clock).get("sky:a")?.envelope, latest);
  assert.equal(storage.data.size, 2);
});

test("conditional transport reuse remains exact to URL and account, including large bodies", async () => {
  const h = transportHarness();
  const large = { ...h.response, data: { value: "星".repeat(300_001) } };
  await h.seed(large);
  const pending = h.request("scene", "/scene");
  assert.equal(h.calls.at(-1)!.header["If-None-Match"], large.etag);
  h.calls.at(-1)!.success({ statusCode: 304, data: undefined });
  assert.equal(await pending, large);
  for (const options of [{ path: "/different" }, { path: "/scene", session: { userId: "other", accessToken: "synthetic" } }]) {
    const next = h.request("scene", options.path, options.session ? { session: options.session } : {});
    assert.equal(h.calls.at(-1)!.header["If-None-Match"], undefined);
    h.calls.at(-1)!.fail({ errMsg: "offline" });
    await assert.rejects(next);
  }
});

test("a persisted representation from another API origin cannot send its ETag or become offline data", async () => {
  const path = "/v2/me/contributions";
  const session = { userId: "account:a", accessToken: "synthetic" };
  const old = transportHarness(false, () => {}, false, "http://127.0.0.1:8788");
  const first = old.request("contributions", path, { session });
  old.calls.at(-1)!.success({ statusCode: 200, data: old.response });
  await first; await old.flush();

  const current = transportHarness(false, () => {}, false, "http://127.0.0.1:8787");
  for (const [key, value] of old.storage) current.storage.set(key, structuredClone(value));
  const failed = current.request("contributions", path, { session });
  assert.equal(current.calls.at(-1)!.header["If-None-Match"], undefined);
  current.calls.at(-1)!.fail({ errMsg: "offline" });
  await assert.rejects(failed, /offline/);
  const recovered = current.request("contributions", path, { session });
  assert.equal(current.calls.at(-1)!.header["If-None-Match"], undefined);
  const fresh = { ...current.response, etag: "current-origin", data: { value: "current" } };
  current.calls.at(-1)!.success({ statusCode: 200, data: fresh });
  assert.deepEqual((await recovered).data, fresh.data);
  await current.flush();
  assert.equal(current.responseCache.get(responseCacheKey("contributions", "http://127.0.0.1:8787", path) + ":account:a")?.envelope.etag, fresh.etag);
  old.queryClient.clear(); current.queryClient.clear();
});

test("mutation invalidation prevents 304/stale reuse and late cache repopulation", async () => {
  for (const outcome of ["304", "failure", "200"]) {
    const h = transportHarness(); await h.seed();
    const pending = h.request("scene", "/scene");
    h.invalidateApiCache("scene");
    if (outcome === "failure") h.calls.at(-1)!.fail({ errMsg: "offline" });
    else h.calls.at(-1)!.success({ statusCode: Number(outcome), data: h.response });
    if (outcome === "200") assert.equal(await pending, h.response);
    else await assert.rejects(pending);
    await h.flush();
    assert.equal(h.responseCache.get(transportKey("scene", "/scene")), undefined);
    assert.equal(h.storage.size, 0);
  }
});

test("Settings cache clearing cancels discovery reads and preserves account data and active mutations", async () => {
  const h = transportHarness();
  for (const key of ["map-scene", "spot-sky", "search-scene", "map-observation-context", "search-observation-context", "favorites", "plans", "preferences", "profile-links"]) {
    h.responseCache.set(key + ":/resource:a", envelope({ key }));
    h.queryClient.setQueryData([key, "a"], { key });
  }
  h.storage.set("starward.wechat-miniapp.auth.current", { userId: "a" });
  h.storage.set("draft:a", "retained");
  await h.flush();
  const read = h.queryClient.fetchQuery({ queryKey: ["map-scene", "pending"],
    queryFn: ({ signal }) => h.request("map-scene", "/next", { signal }),
  }).catch(() => undefined);
  const readCall = h.calls.at(-1)!;
  const mutation = h.request("spot-sky:mutation", "/delete", { method: "DELETE" });
  const mutationCall = h.calls.at(-1)!;
  let releaseMutation!: () => void;
  const queryMutation = h.queryClient.getMutationCache().build(h.queryClient, {
    mutationKey: ["plan-save"], mutationFn: () => new Promise<void>(resolve => { releaseMutation = resolve; }),
  });
  const submitted = queryMutation.execute(undefined);
  await Promise.resolve();
  assert.equal(await h.clearTemporaryApiCache(), 1);
  assert.equal(h.requests.has("spot-sky:mutation"), true);
  assert.ok(h.queryClient.getMutationCache().getAll().some(item => item.mutationId === queryMutation.mutationId));
  assert.equal(queryMutation.state.status, "pending");
  readCall.success({ statusCode: 200, data: h.response });
  await read; await h.flush();
  for (const key of ["map-scene", "spot-sky", "search-scene", "map-observation-context", "search-observation-context"]) {
    assert.equal(h.responseCache.get(key + ":/resource:a"), undefined);
    assert.equal(h.queryClient.getQueryData([key, "a"]), undefined);
  }
  assert.equal(h.responseCache.get(transportKey("map-scene", "/next")), undefined);
  for (const key of ["favorites", "plans", "preferences", "profile-links"]) {
    assert.ok(h.responseCache.get(key + ":/resource:a"));
    assert.deepEqual(h.queryClient.getQueryData([key, "a"]), { key });
  }
  assert.deepEqual(h.storage.get("starward.wechat-miniapp.auth.current"), { userId: "a" });
  assert.equal(h.storage.get("draft:a"), "retained");
  mutationCall.success({ statusCode: 200, data: h.response });
  assert.equal(await mutation, h.response);
  releaseMutation(); await submitted;
  h.queryClient.clear();
});

test("selective clearing preserves unrelated in-flight 304, stale fallback and new responses", async () => {
  for (const purge of ["settings", "account"] as const) for (const outcome of ["304", "failure", "200"]) {
    const h = transportHarness();
    const options = { session: { userId: "b", accessToken: "synthetic" } };
    const seed = h.request("plans", "/v2/plans", options);
    h.calls.at(-1)!.success({ statusCode: 200, data: h.response });
    await seed; await h.flush();
    const pending = h.request("plans", "/v2/plans", options);
    assert.equal(h.calls.at(-1)!.header["If-None-Match"], h.response.etag);
    if (purge === "settings") await h.clearTemporaryApiCache();
    else await h.responseCache.removeScope("a");
    const newer = { ...h.response, etag: "newer", data: { value: "newer" } };
    if (outcome === "failure") h.calls.at(-1)!.fail({ errMsg: "offline" });
    else h.calls.at(-1)!.success({ statusCode: Number(outcome), data: outcome === "200" ? newer : undefined });
    const result = await pending;
    assert.equal(result.dataState, outcome === "failure" ? "STALE_USABLE" : "FRESH");
    await h.flush();
    assert.equal(h.responseCache.get(transportKey("plans", "/v2/plans", "b"))!.envelope.etag, outcome === "200" ? "newer" : h.response.etag);
    h.queryClient.clear();
  }
});

test("a memory eviction does not revoke an identical still-valid disk representation", async () => {
  const h = transportHarness(); await h.seed();
  const original = h.responseCache.get(transportKey("scene", "/scene"));
  const pending = h.request("scene", "/scene");
  const base = envelope({ value: "" });
  const size = RESPONSE_CACHE_LIMITS.memoryBytes / 2 - utf8Bytes(JSON.stringify(base));
  for (let i = 0; i < 2; i++) h.responseCache.set("memory-only:" + i, { ...base, data: { value: "x".repeat(size) } });
  await h.flush();
  const restored = h.responseCache.get(transportKey("scene", "/scene"));
  assert.notEqual(restored, original, "memory entry was really evicted");
  assert.deepEqual(restored?.envelope, original?.envelope);
  h.calls.at(-1)!.success({ statusCode: 304, data: undefined });
  assert.equal(await pending, h.response);
  h.queryClient.clear();
});

test("scope removal reports failed native cleanup, including a late orphan chunk, and full retry recovers", async () => {
  for (const pendingWrite of [false, true]) {
    const storage = storageFixture(), cache = createResponseCache(storage, () => clock);
    cache.set("private:a", envelope()); await cache.flush();
    let release: (() => void) | undefined;
    if (pendingWrite) {
      cache.set("private:a", largeEnvelope());
      release = storage.pauseNextWrite();
      void cache.flush();
    }
    storage.setFailure(false, !pendingWrite, true);
    const removal = cache.removeScope("a");
    release?.();
    assert.equal(await removal, false);
    assert.equal(cache.cleanupComplete(), false);
    assert.equal(cache.get("private:a"), undefined, "current cache remains fenced despite native failure");
    assert.ok([...storage.data.keys()].some(key => key.includes(".chunk.")), "failed cleanup leaves real bytes and must not claim completion");
    storage.setFailure(false);
    cache.clear(); await cache.flush();
    assert.equal(cache.cleanupComplete(), true);
    assert.equal(storage.data.size, 0);
  }
});

test("every terminal transport path releases its per-request cache fence", async () => {
  for (const terminal of ["200", "500", "offline", "cancel", "timeout"]) {
    const h = transportHarness();
    let active = 0;
    const begin = h.responseCache.beginRequest.bind(h.responseCache);
    h.responseCache.beginRequest = (key: string) => {
      const fence = begin(key), release = fence.release;
      active++;
      fence.release = () => { active--; release(); };
      return fence;
    };
    const pending = h.request("plans", "/plans").catch(() => undefined);
    assert.equal(active, 1);
    if (terminal === "cancel") h.requests.cancel("plans");
    else if (terminal === "timeout") h.timeout();
    else if (terminal === "offline") h.calls.at(-1)!.fail({ errMsg: "offline" });
    else h.calls.at(-1)!.success({ statusCode: Number(terminal), data: h.response });
    await pending;
    assert.equal(active, 0, terminal);
    await h.flush(); h.queryClient.clear();
  }
});
