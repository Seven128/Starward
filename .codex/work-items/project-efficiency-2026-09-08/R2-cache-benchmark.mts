import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { performance } from "node:perf_hooks";
import { createResponseCache, RESPONSE_CACHE_STORAGE_KEY } from "../../../apps/wechat-miniapp/src/services/response-cache.ts";

const body = JSON.parse(readFileSync(new URL("R2-real-sky-envelope.json", import.meta.url), "utf8"));
const text = JSON.stringify(body);
function nativeStorage() {
  const data = new Map<string, unknown>();
  const writes: { sync: boolean; bytes: number }[] = [];
  return {
    data, writes,
    getStorageSync: (key: string) => structuredClone(data.get(key)),
    setStorageSync(key: string, value: unknown) { writes.push({ sync: true, bytes: Buffer.byteLength(JSON.stringify(value)) }); data.set(key, structuredClone(value)); },
    async setStorage({ key, data: value }: { key: string; data: string }) { writes.push({ sync: false, bytes: Buffer.byteLength(JSON.stringify(value)) }); data.set(key, value); },
    removeStorageSync: (key: string) => { data.delete(key); },
    getStorageInfoSync: () => ({ keys: [...data.keys()] }),
  };
}
const storage = nativeStorage();
const cache = createResponseCache(storage);
const started = performance.now();
cache.set("spot-sky:exact-fixture:anonymous", body);
const responseCacheSetMs = performance.now() - started;
assert.equal(storage.writes.length, 0);
await cache.flush();
const restart = createResponseCache(storage);
assert.deepEqual(restart.get("spot-sky:exact-fixture:anonymous")?.envelope, body);
const realSky = {
  source: "Real committed Gaia2048 star catalog and 20 frames; deterministic fixture weather, no live provider/device evidence",
  chars: text.length, utf8Bytes: Buffer.byteLength(text),
  oldWouldCache: text.length <= 300_000,
  newMemoryAndRestartReadback: true, responseCacheSetMs,
  nativeStorageMock: { totalWrites: storage.writes.length, bodyWrites: storage.writes.filter(row => !row.sync).length,
    syncManifestBytes: storage.writes.filter(row => row.sync).map(row => row.bytes),
    maxStorageKeyBytes: Math.max(...storage.writes.map(row => row.bytes)),
    totalWriteBytes: storage.writes.reduce((sum, row) => sum + row.bytes, 0) },
};
const comparison = nativeStorage(), nextCache = createResponseCache(comparison);
const old = new Map<string, { envelope: unknown; storedAt: number }>();
let oldWrittenBytes = 0;
for (let i = 0; i < 24; i++) {
  const envelope = { ...body, data: { syntheticVolumeOnly: "a".repeat(60_000), index: i } };
  old.set("entry:" + i, { envelope, storedAt: Date.now() });
  oldWrittenBytes += Buffer.byteLength(JSON.stringify({ schemaVersion: 1, entries: [...old] }));
  nextCache.set("entry:" + i, envelope);
  await nextCache.flush();
}
assert.equal((comparison.data.get(RESPONSE_CACHE_STORAGE_KEY) as { entries: unknown[] }).entries.length, 24);
const newWrittenBytes = comparison.writes.reduce((sum, row) => sum + row.bytes, 0);
const sequentialWrites = { entries: 24, syntheticPayloadBytesEach: 60_000,
  oldFullSnapshotNativeTransferBytes: oldWrittenBytes, newBodyAndManifestNativeTransferBytes: newWrittenBytes,
  ratioNewToOld: newWrittenBytes / oldWrittenBytes,
  limitation: "Counts serialized bridge payload in an injected storage adapter; not native device latency or disk throughput" };
const result = { realSky, sequentialWrites };
writeFileSync(new URL("R2-cache-benchmark.json", import.meta.url), JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
