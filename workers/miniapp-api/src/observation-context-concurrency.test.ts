import "reflect-metadata";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import test from "node:test";
import { Module } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { TEST_PUBLISHED_SPOT } from "@starward/miniapp-contracts/test-fixtures";
import { MemoryCache, RedisCache } from "./cache.ts";
import { MiniappController } from "./controller.ts";
import { ApiExceptionFilter } from "./api-exception.filter.ts";
import { MiniappService } from "./miniapp-service.ts";
import { ObservationContextService } from "./observation-context-service.ts";
import type { CachePort } from "./ports.ts";
import { createTestMiniappService } from "./test-fixtures/create-test-service.ts";
import { InMemoryTestRepository } from "./test-fixtures/in-memory-repository.ts";
import { createTestRuntimeConfig } from "./runtime-config.ts";

const redisUrl = process.env.REDIS_URL?.trim();
const resolveInput = {
  location: { kind: "FORMAL_SPOT" as const, spotId: TEST_PUBLISHED_SPOT.spotId },
  localDate: "2026-09-28", selectedAt: "2026-09-28T16:00:00.000Z",
};

async function withCaches(kind: "memory" | "redis", run: (caches: [CachePort, CachePort], retireByApp: () => void) => Promise<void>) {
  const memory = new MemoryCache();
  const prefix = `starward:miniapp:context-concurrency-test:${randomUUID()}:`;
  const caches: [CachePort, CachePort] = kind === "memory" ? [memory, memory] : [new RedisCache(redisUrl!, prefix), new RedisCache(redisUrl!, prefix)];
  let appOwnsRetirement = false;
  try {
    for (const cache of caches) if (cache instanceof RedisCache) await cache.initialize();
    await run(caches, () => { appOwnsRetirement = true; });
  } finally {
    // Every instance owns the random test namespace, never the application cache.
    if (!appOwnsRetirement) {
      if (!(caches[0] instanceof RedisCache) || caches[0].client.status === "ready") await caches[0].deleteByPrefix("");
      await Promise.all(caches.map(cache => cache.close()));
    }
  }
}

async function httpApp(cache: CachePort) {
  const service = createTestMiniappService({ cache });
  class TestModule {}
  Module({ controllers: [MiniappController], providers: [{ provide: MiniappService, useValue: service }] })(TestModule);
  const app = await NestFactory.create(TestModule, new FastifyAdapter(), { logger: false });
  app.useGlobalFilters(new ApiExceptionFilter());
  await app.listen(0, "127.0.0.1");
  return app;
}

for (const kind of ["memory", "redis"] as const) {
  const options = { skip: kind === "redis" && !redisUrl };
  test(`${kind}: concurrent HTTP time edits have one durable winner and allow subsequent night editing`, options, async () => withCaches(kind, async (caches, retireByApp) => {
    const apps = [await httpApp(caches[0]), await httpApp(caches[1])];
    try {
      const bases = await Promise.all(apps.map(app => app.getUrl()));
      const resolved = await fetch(`${bases[0]}/v2/observation-contexts/resolve`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(resolveInput) });
      assert.equal(resolved.status, 201);
      const initial = (await resolved.json()).data;
      const instants = ["2026-09-28T16:30:00.000Z", "2026-09-28T17:00:00.000Z"];
      const route = `/v2/observation-contexts/${encodeURIComponent(initial.contextId)}`;
      const responses = await Promise.all(bases.map((base, index) => fetch(base + route, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ expectedRevision: 1, selectedAt: instants[index] }) })));
      assert.deepEqual(responses.map(response => response.status).sort(), [200, 409]);
      const bodies = await Promise.all(responses.map(response => response.json()));
      const winner = bodies[responses.findIndex(response => response.status === 200)].data;
      const loser = bodies[responses.findIndex(response => response.status === 409)];
      assert.equal(loser.code, "CONFLICT");
      assert.ok(loser.recovery.includes("REFETCH"));
      const readback = (await (await fetch(bases[1] + route)).json()).data;
      assert.equal(readback.revision, 2);
      assert.equal(readback.selectedAtUtc, winner.selectedAtUtc);
      assert.equal(readback.expiresAt, initial.expiresAt);
      assert.equal(readback.contextFingerprint, initial.contextFingerprint, "a clock edit retains the night fingerprint");
      const nextResponse = await fetch(bases[1] + route, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ expectedRevision: 2, localDate: "2026-09-29", selectedAt: "2026-09-29T16:00:00.000Z", eventInstanceId: null }) });
      assert.equal(nextResponse.status, 200);
      const next = (await nextResponse.json()).data;
      assert.equal(next.revision, 3);
      assert.equal(next.localDate, "2026-09-29");
      assert.equal(next.nightStartUtc, "2026-09-29T04:00:00.000Z");
      assert.equal(next.nightEndUtc, "2026-09-30T04:00:00.000Z");
      assert.equal(next.expiresAt, initial.expiresAt);
      assert.notEqual(next.contextFingerprint, initial.contextFingerprint);
      assert.equal((await (await fetch(bases[0] + route)).json()).data.selectedAtUtc, next.selectedAtUtc);
    } finally {
      // Clean the task namespace before app.close retires the real Redis clients.
      await caches[0].deleteByPrefix("");
      retireByApp();
      await Promise.all(apps.map(app => app.close()));
    }
  }));

  test(`${kind}: Context expiry between reading and committing cannot recreate the context`, options, async () => withCaches(kind, async ([cache]) => {
    const service = new ObservationContextService(new InMemoryTestRepository(), cache, createTestRuntimeConfig());
    const initial = await service.resolve(resolveInput);
    const key = `observation-context:${initial.contextId}`;
    await cache.set(key, initial, 1);
    const replace = cache.replaceIfRevision.bind(cache);
    cache.replaceIfRevision = async (...args) => { await delay(1_150); return replace(...args); };
    try {
      await assert.rejects(service.update(initial.contextId, { expectedRevision: 1, selectedAt: "2026-09-28T16:30:00.000Z" }), /observation_context_not_found/u);
      assert.equal(await cache.get(key), null, "expired storage must remain absent after the attempted edit");
    } finally { cache.replaceIfRevision = replace; }
  }));

  test(`${kind}: revision replacement retains the original TTL and caps the absolute deadline`, options, async () => withCaches(kind, async ([cache]) => {
    const key = "ttl-boundary";
    await cache.set(key, { revision: 1, payload: "before" }, 1);
    await delay(400);
    assert.equal(await cache.replaceIfRevision(key, 1, { revision: 2, payload: "after" }, Date.now() + 60_000), "updated");
    assert.equal((await cache.get<{ revision: number }>(key))?.revision, 2);
    await delay(750);
    assert.equal(await cache.get(key), null, "editing must not restart the one-second storage lifetime");
    await cache.set(key, { revision: 1 }, 60);
    assert.equal(await cache.replaceIfRevision(key, 1, { revision: 2 }, Date.now() + 100), "updated");
    await delay(150);
    assert.equal(await cache.get(key), null, "the contract deadline bounds a longer cache lifetime");
    assert.equal(await cache.replaceIfRevision(key, 2, { revision: 3 }, Date.now() + 60_000), "missing");
    assert.equal(await cache.get(key), null);
  }));

  test(`${kind}: commit failure leaves the previous Context available for retry`, options, async () => withCaches(kind, async ([cache, other]) => {
    const service = new ObservationContextService(new InMemoryTestRepository(), cache, createTestRuntimeConfig());
    const reader = new ObservationContextService(new InMemoryTestRepository(), other, createTestRuntimeConfig());
    const initial = await service.resolve(resolveInput);
    const replace = cache.replaceIfRevision.bind(cache);
    cache.replaceIfRevision = async (...args) => {
      if (cache instanceof RedisCache) {
        cache.client.disconnect(false);
        return replace(...args); // Real disconnected-client failure at the commit boundary.
      }
      throw new Error("test_cache_write_unavailable");
    };
    try {
      await assert.rejects(service.update(initial.contextId, { expectedRevision: 1, selectedAt: "2026-09-28T16:30:00.000Z" }));
      const retained = await reader.get(initial.contextId);
      assert.equal(retained.revision, 1);
      assert.equal(retained.selectedAtUtc, initial.selectedAtUtc);
    } finally {
      cache.replaceIfRevision = replace;
      if (cache instanceof RedisCache) await cache.client.connect();
    }
    const retried = await service.update(initial.contextId, { expectedRevision: 1, selectedAt: "2026-09-28T16:30:00.000Z" });
    assert.equal(retried.revision, 2);
    assert.equal((await reader.get(initial.contextId)).selectedAtUtc, retried.selectedAtUtc);
  }));
}
