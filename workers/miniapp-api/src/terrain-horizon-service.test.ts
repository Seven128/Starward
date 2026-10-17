import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { TerrainService } from "./terrain-service.ts";
import { readTerrainHorizonModel } from "./terrain-horizon-model.ts";
import { copernicusTestSource } from "./test-fixtures/copernicus-test-source.ts";

const input = { center: { system: "GCJ02" as const, latitude: 22.6, longitude: 114.35 } };

test("horizon readers share work, one cancellation retains the other, and cached models are isolated", async () => {
  let entered!: () => void, release!: () => void, sourceSignal!: AbortSignal, calls = 0;
  const started = new Promise<void>(resolve => { entered = resolve; });
  const gate = new Promise<void>(resolve => { release = resolve; });
  const terrain = new TerrainService({ renderer: async () => null, horizonRenderer: async (center, signal) => {
    calls++; sourceSignal = signal; entered(); await gate;
    return readTerrainHorizonModel(center, signal, copernicusTestSource().transport);
  } });
  const first = new AbortController(), second = new AbortController();
  try {
    const cancelled = assert.rejects(terrain.getHorizon(input, first.signal), /point_changed/u);
    const retained = terrain.getHorizon(input, second.signal);
    await started; first.abort(new Error("point_changed")); await cancelled;
    assert.equal(sourceSignal.aborted, false);
    release(); const result = await retained; assert.ok(result && result.knownSectors > 0);
    const previous = result.sectors[0].sampleCount; result.sectors[0].sampleCount = previous + 1;
    const cached = await terrain.getHorizon(input); assert.ok(cached);
    assert.equal(cached.sectors[0].sampleCount, previous);
    assert.equal(calls, 1);
  } finally { release(); first.abort(); second.abort(); terrain.close(); }
});

test("horizon and existing image reads share the same two source slots and release abandoned work", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "starward-horizon-slots-"));
  assert.ok(path.resolve(directory).startsWith(path.resolve(tmpdir()) + path.sep));
  let entered!: () => void, count = 0;
  const started = new Promise<void>(resolve => { entered = resolve; });
  const terrain = new TerrainService({ directory, renderer: async () => null, horizonRenderer: async (_center, signal) => {
    if (++count === 2) entered();
    return new Promise<never>((_resolve, reject) => signal.addEventListener("abort", () => reject(signal.reason), { once: true }));
  } });
  const a = new AbortController(), b = new AbortController();
  const image = { purpose: "MAP" as const, center: input.center, radiusKm: 5 };
  try {
    const readers = [assert.rejects(terrain.getHorizon(input, a.signal), /leave/u),
      assert.rejects(terrain.getHorizon({ center: { ...input.center, longitude: 114.36 } }, b.signal), /leave/u)];
    await started;
    await assert.rejects(terrain.getPublication(image), /terrain_busy_retry/u);
    a.abort(new Error("leave")); b.abort(new Error("leave")); await Promise.all(readers);
    await new Promise<void>(resolve => setImmediate(resolve));
    assert.equal(await terrain.getPublication(image), null);
  } finally { a.abort(); b.abort(); terrain.close(); await rm(directory, { recursive: true, force: true }); }
});

test("horizon uses the existing sixteen-second source deadline", async t => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  let entered!: () => void;
  const started = new Promise<void>(resolve => { entered = resolve; });
  const terrain = new TerrainService({ renderer: async () => null, horizonRenderer: async (_center, signal) => {
    entered(); return new Promise<never>((_resolve, reject) => signal.addEventListener("abort", () => reject(signal.reason), { once: true }));
  } });
  try {
    const result = assert.rejects(terrain.getHorizon(input), /terrain_source_deadline_exceeded/u);
    await started; t.mock.timers.tick(16_000); await result;
  } finally { terrain.close(); t.mock.timers.reset(); }
});
