import assert from "node:assert/strict";
import test from "node:test";
import { MemoryCache } from "./cache.ts";
import { MemoryTelemetry, MEMORY_TELEMETRY_LIMIT } from "./runtime.ts";

test("cache retires unread expired keys in bounded ticks and closes its resources", async (t) => {
  t.mock.timers.enable({ apis: ["Date", "setInterval"], now: 10_000 });
  const stop = t.mock.method(globalThis, "clearInterval");
  const cache = new MemoryCache();
  t.after(() => cache.close());
  for (let i = 0; i < 257; i += 1) await cache.set(`unread:${i}`, { revision: 1 }, 1);
  const input = { revision: 1, nested: { value: 42 } };
  await cache.set("valid", input, 10);
  input.nested.value = 99;
  t.mock.timers.tick(1_000);
  assert.equal((await cache.operationsSnapshot()).entries, 130);
  t.mock.timers.tick(2_000);
  assert.equal((await cache.operationsSnapshot()).entries, 1);
  const read = (await cache.get<typeof input>("valid"))!;
  assert.equal(read.nested.value, 42);
  read.nested.value = 0;
  assert.equal((await cache.get<typeof input>("valid"))!.nested.value, 42);
  assert.equal(await cache.replaceIfRevision("valid", 0, { revision: 2 }, 30_000), "conflict");
  assert.equal(await cache.replaceIfRevision("valid", 1, { revision: 2 }, 30_000), "updated");
  assert.deepEqual(await cache.get("valid"), { revision: 2 });
  t.mock.timers.tick(7_000);
  assert.equal(await cache.replaceIfRevision("valid", 2, { revision: 3 }, 30_000), "missing");
  assert.equal((await cache.operationsSnapshot()).entries, 0, "CAS must not extend the original TTL");
  await cache.set("close-owned", { revision: 1 }, 60);
  const beforeClose = stop.mock.callCount();
  await cache.close();
  assert.equal(stop.mock.callCount(), beforeClose + 1);
  assert.deepEqual(await cache.readinessSnapshot(), { ready: false, cache: "memory" });
  assert.equal((await cache.operationsSnapshot()).entries, 0);
  await assert.rejects(cache.set("late", {}, 60), /memory_cache_closed/);
  t.mock.timers.tick(60_000);
  assert.equal((await cache.operationsSnapshot()).entries, 0);
});

test("telemetry keeps only the latest chronological diagnostic window with redaction", () => {
  const telemetry = new MemoryTelemetry();
  const total = MEMORY_TELEMETRY_LIMIT * 2 + 17;
  for (let sequence = 0; sequence < total; sequence += 1) {
    const fields = { sequence, token: "private-token", latitude: 23.13 };
    if (sequence % 2) telemetry.error(new Error("test_failure"), fields);
    else telemetry.event("map_scene_loaded", fields);
  }
  const snapshot = telemetry.snapshot();
  assert.equal(snapshot.length, MEMORY_TELEMETRY_LIMIT);
  assert.deepEqual(snapshot.map(event => event.sequence),
    Array.from({ length: MEMORY_TELEMETRY_LIMIT }, (_, i) => total - MEMORY_TELEMETRY_LIMIT + i));
  assert.ok(snapshot.every(event => event.token === "[REDACTED]" && event.latitude === "[REDACTED]"));
  assert.equal(snapshot.at(-1)!.type, "event");
  telemetry.event("next", { sequence: total });
  assert.equal(snapshot.at(-1)!.sequence, total - 1, "previous snapshot remains independent");
  assert.equal(telemetry.snapshot().length, MEMORY_TELEMETRY_LIMIT);
  telemetry.resetForAcceptance();
  assert.deepEqual(telemetry.snapshot(), []);
  telemetry.event("fresh", {});
  assert.equal(telemetry.snapshot()[0]!.name, "fresh");
});
