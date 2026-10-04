import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { MemoryCache, RedisCache } from "../../../../workers/miniapp-api/src/cache.ts";
import { ObservationContextService } from "../../../../workers/miniapp-api/src/observation-context-service.ts";
import { createTestRuntimeConfig } from "../../../../workers/miniapp-api/src/runtime-config.ts";
import { InMemoryTestRepository } from "../../../../workers/miniapp-api/src/test-fixtures/in-memory-repository.ts";
import type { CachePort } from "../../../../workers/miniapp-api/src/ports.ts";

const phase = process.argv[2];
assert.ok(phase === "before" || phase === "after");
const output = path.resolve(`.codex/work-items/cloud-sky-native-2026-09-22/evidence/experience-context-concurrency-${phase}-2026-09-28.json`);
assert.equal(await fs.access(output).then(() => true, () => false), false);
const prefix = `starward:miniapp:cloud-sky-context-probe:${randomUUID()}:`;
const redis = [new RedisCache("redis://127.0.0.1:56379", prefix), new RedisCache("redis://127.0.0.1:56379", prefix)];
const config = createTestRuntimeConfig();
const repository = new InMemoryTestRepository();

async function probe(kind: string, caches: [CachePort, CachePort]) {
  const services = caches.map(cache => new ObservationContextService(repository, cache, config));
  const initial = await services[0].resolve({
    location: { kind: "MAP_POINT", displayName: "Public trial coordinate", wgs84: { system: "WGS84", latitude: 23.2, longitude: 113.2 }, source: "MAP_VIEWPORT", timezoneHint: "Asia/Shanghai" },
    localDate: "2026-09-28", selectedAt: "2026-09-28T16:00:00.000Z",
  });
  const instants = ["2026-09-28T16:30:00.000Z", "2026-09-28T17:00:00.000Z"];
  const results = await Promise.allSettled(services.map((service, index) => service.update(initial.contextId, { expectedRevision: initial.revision, selectedAt: instants[index] })));
  const readback = await services[0].get(initial.contextId);
  const successful = results.filter(result => result.status === "fulfilled");
  const conflicts = results.filter(result => result.status === "rejected" && result.reason?.message === "observation_context_conflict");
  const ok = successful.length === 1 && conflicts.length === 1 && readback.revision === 2 && successful[0]?.status === "fulfilled" && readback.selectedAtUtc === successful[0].value.selectedAtUtc;
  return { kind, independentServiceInstances: 2, independentRedisClients: kind === "redis" ? 2 : 0, initialRevision: initial.revision,
    results: results.map(result => result.status === "fulfilled" ? { status: "fulfilled", revision: result.value.revision, selectedAtUtc: result.value.selectedAtUtc } : { status: "rejected", reason: result.reason?.message ?? "unknown" }),
    durableReadback: { revision: readback.revision, selectedAtUtc: readback.selectedAtUtc, sameExpiry: readback.expiresAt === initial.expiresAt, sameFingerprint: readback.contextFingerprint === initial.contextFingerprint }, ok };
}

try {
  await Promise.all(redis.map(cache => cache.initialize()));
  const memory = new MemoryCache();
  const results = [await probe("memory", [memory, memory]), await probe("redis", [redis[0], redis[1]])];
  const record = { phase, scope: "Actual ObservationContextService and existing MemoryCache/RedisCache; two concurrent intents with the same revision. Real local Redis 7.4, two independent clients, task-only namespace. Synthetic public trial coordinate; no GUI context, private IDs, keys, headers or credentials retained. Not native/device/GPU acceptance.", results, ok: results.every(result => result.ok) };
  await fs.writeFile(output, JSON.stringify(record, null, 2) + "\n", { flag: "wx" });
  console.log(JSON.stringify(record));
  assert.ok(record.ok, "only one same-revision Context edit may succeed and must match durable readback");
} finally {
  // The cache adds the unique task namespace; never clear another namespace.
  if (redis[0].client.status === "ready") await redis[0].deleteByPrefix("observation-context:");
  await Promise.all(redis.map(cache => cache.close()));
}
