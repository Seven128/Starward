import assert from "node:assert/strict";
import test from "node:test";
import type { CloudNumericFrame } from "@starward/miniapp-contracts";
import { CloudNumericReadStore, type CloudNumericReadIdentity } from "./cloud-numeric-read-store.ts";

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>(done => { resolve = done; });
  return { promise, resolve };
}
const turn = () => new Promise<void>(resolve => setImmediate(resolve));
const identity = (index: number, run = "a"): CloudNumericReadIdentity => ({ manifestSha256: run.repeat(64), frameIndex: index,
  valuesSha256: index.toString(16).padStart(64, "0"), maskSha256: "b".repeat(64) });
const frame = (value: number): CloudNumericFrame => ({ values: Float32Array.from([value, value, value, value]), mask: Uint8Array.from([1, 1, 1, 1]) });

test("different cold frames obey two active reads, FIFO waiting and explicit overload", async () => {
  const store = new CloudNumericReadStore({ maxQueued: 2, maximumCachedBytes: 0 });
  const gates = Array.from({ length: 4 }, deferred), entered = Array.from({ length: 4 }, deferred), started: number[] = [];
  let active = 0, peak = 0;
  const pending = gates.map((gate, index) => store.read(identity(index), async () => {
    active++; peak = Math.max(peak, active); started.push(index); entered[index]!.resolve();
    try { await gate.promise; return frame(index); } finally { active--; }
  }));
  try {
    await Promise.all([entered[0]!.promise, entered[1]!.promise]);
    await assert.rejects(store.read(identity(4), async () => frame(4)), /read_queue_full/u);
    assert.deepEqual(started, [0, 1]);
    gates[1]!.resolve(); await entered[2]!.promise;
    assert.deepEqual(started, [0, 1, 2]);
    gates[2]!.resolve(); await entered[3]!.promise;
    assert.deepEqual(started, [0, 1, 2, 3]);
    assert.equal(peak, 2);
  } finally {
    for (const gate of gates) gate.resolve();
    await Promise.allSettled(pending); await store.close();
  }
});

test("same-frame readers share one read and one caller cancellation preserves the survivor", async () => {
  const store = new CloudNumericReadStore(), gate = deferred(), entered = deferred(), firstCaller = new AbortController();
  let calls = 0, signal: AbortSignal | undefined;
  const read = async (controller: AbortController) => { calls++; signal = controller.signal; entered.resolve(); await gate.promise; return frame(0.5); };
  const first = store.read(identity(0), read, firstCaller.signal), second = store.read(identity(0), read);
  try {
    await entered.promise;
    firstCaller.abort(new Error("first_reader_left"));
    await assert.rejects(first, /first_reader_left/u);
    assert.equal(signal!.aborted, false);
    gate.resolve();
    const result = await second;
    assert.equal(result.values[0], 0.5);
    assert.equal(await store.read(identity(0), read), result);
    assert.equal(calls, 1);
  } finally { gate.resolve(); await Promise.allSettled([first, second]); await store.close(); }
});

test("the last queued reader cancellation removes work without consuming a future read slot", async () => {
  const store = new CloudNumericReadStore({ maxQueued: 1, maximumCachedBytes: 0 }), gates = [deferred(), deferred()];
  const entered = [deferred(), deferred()], controllers = [new AbortController(), new AbortController()];
  const running = gates.map((gate, index) => store.read(identity(index), async () => { entered[index]!.resolve(); await gate.promise; return frame(index); }));
  await Promise.all(entered.map(entry => entry.promise));
  let abandonedStarts = 0, admittedStarts = 0;
  const abandoned = () => { abandonedStarts++; return Promise.resolve(frame(2)); };
  const first = store.read(identity(2), abandoned, controllers[0]!.signal), second = store.read(identity(2), abandoned, controllers[1]!.signal);
  let replacement: Promise<CloudNumericFrame> | undefined;
  try {
    await turn();
    controllers[0]!.abort(new Error("one_reader_left"));
    await assert.rejects(first, /one_reader_left/u);
    await assert.rejects(store.read(identity(3), async () => frame(3)), /read_queue_full/u);
    controllers[1]!.abort(new Error("last_reader_left"));
    await assert.rejects(second, /last_reader_left/u);
    replacement = store.read(identity(3), async () => { admittedStarts++; return frame(3); });
    gates[0]!.resolve();
    assert.equal((await replacement).values[0], 3);
    assert.equal(abandonedStarts, 0);
    assert.equal(admittedStarts, 1);
  } finally {
    for (const gate of gates) gate.resolve();
    await Promise.allSettled([...running, first, second, ...(replacement ? [replacement] : [])]); await store.close();
  }
});

test("active cancellation and store shutdown wait for owned work to drain", async () => {
  const store = new CloudNumericReadStore({ maxQueued: 1, maximumCachedBytes: 0 }), gates = [deferred(), deferred()], entered = [deferred(), deferred()];
  const caller = new AbortController();
  const first = store.read(identity(0), async controller => { entered[0]!.resolve(); await gates[0]!.promise; controller.signal.throwIfAborted(); return frame(0); }, caller.signal);
  const second = store.read(identity(1), async controller => { entered[1]!.resolve(); await gates[1]!.promise; controller.signal.throwIfAborted(); return frame(1); });
  await Promise.all(entered.map(entry => entry.promise));
  let queuedStarts = 0, queuedSettled = false, closeSettled = false;
  const third = store.read(identity(2), async () => { queuedStarts++; return frame(2); });
  void third.then(() => { queuedSettled = true; }, () => { queuedSettled = true; });
  try {
    caller.abort(new Error("active_reader_left"));
    await assert.rejects(first, /active_reader_left/u);
    await turn();
    assert.equal(queuedStarts, 0);
    assert.equal(queuedSettled, false);
    const closing = store.close().then(() => { closeSettled = true; });
    await assert.rejects(second, /read_store_closed/u);
    await assert.rejects(third, /read_store_closed/u);
    await turn(); assert.equal(closeSettled, false);
    gates.forEach(gate => gate.resolve());
    await closing;
    assert.equal(closeSettled, true);
    assert.equal(queuedStarts, 0);
    await assert.rejects(store.read(identity(0), async () => frame(0)), /read_store_closed/u);
  } finally { gates.forEach(gate => gate.resolve()); await Promise.allSettled([first, second, third]); await store.close(); }
});

test("byte LRU eviction preserves returned arrays and isolates publication identities", async () => {
  const store = new CloudNumericReadStore({ maximumCachedBytes: 40 }), calls = new Map<string, number>();
  const read = (index: number, run = "a") => store.read(identity(index, run), async () => {
    const key = `${run}:${index}`; calls.set(key, (calls.get(key) ?? 0) + 1); return frame(run === "a" ? index : 0.75);
  });
  try {
    const retained = await read(0);
    await read(1); assert.equal(await read(0), retained);
    await read(2); await read(1);
    assert.equal(calls.get("a:0"), 1);
    assert.equal(calls.get("a:1"), 2);
    assert.equal(retained.values[0], 0);
    assert.deepEqual([...retained.mask], [1, 1, 1, 1]);
    assert.equal((await read(0, "c")).values[0], 0.75);
    assert.equal(calls.get("c:0"), 1);
  } finally { await store.close(); }
});

test("an oversized backing buffer is delivered without being retained as a small view", async () => {
  const store = new CloudNumericReadStore({ maximumCachedBytes: 20 });
  let calls = 0;
  const read = async () => { calls++; return { values: new Float32Array(new ArrayBuffer(64), 0, 1), mask: Uint8Array.of(1) }; };
  try {
    await store.read(identity(0), read); await store.read(identity(0), read);
    assert.equal(calls, 2);
  } finally { await store.close(); }
});
