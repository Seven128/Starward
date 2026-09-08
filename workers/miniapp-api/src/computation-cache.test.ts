import assert from "node:assert/strict";
import test from "node:test";
import { ComputationCache } from "./computation-cache.ts";
import { waitForCaller, withDeadline } from "./provider-deadline.ts";

test("computation cache coalesces, expires, evicts LRU and retries rejected work", async () => {
  let now = 1;
  let calls = 0;
  const cache = new ComputationCache<number>(2, () => now);
  const read = (key: string) => cache.get(key, async () => ++calls, () => now + 10);
  assert.deepEqual(await Promise.all([read("a"), read("a"), read("a")]), [1, 1, 1]);
  await read("b");
  await read("a");
  await read("c");
  assert.equal(await read("b"), 4, "least recently used identity is evicted");
  now = 20;
  assert.equal(await read("a"), 5, "expired records are pruned on reads");
  await assert.rejects(cache.get("failure", async () => { throw new Error("failed"); }, () => 30));
  assert.equal(await read("failure"), 6);
});

test("clear invalidates pending writes and cancelling one waiter leaves other callers intact", async () => {
  const cache = new ComputationCache<number>(2);
  let resolve!: (value: number) => void;
  const work = cache.get("a", () => new Promise<number>((done) => { resolve = done; }), () => Date.now() + 1000);
  const controller = new AbortController();
  const cancelled = waitForCaller(work, controller.signal);
  const rejection = assert.rejects(cancelled, /caller_cancelled/);
  controller.abort(new Error("caller_cancelled"));
  await rejection;
  cache.clear();
  resolve(1);
  assert.equal(await work, 1);
  assert.equal(await cache.get("a", async () => 2, () => Date.now() + 1000), 2);
});

test("provider deadline covers ignored aborts and removes listeners/timers after success or cancellation", async () => {
  const controller = new AbortController();
  let adds = 0, removes = 0;
  const add = controller.signal.addEventListener.bind(controller.signal);
  const remove = controller.signal.removeEventListener.bind(controller.signal);
  controller.signal.addEventListener = (...args: Parameters<AbortSignal["addEventListener"]>) => { adds++; add(...args); };
  controller.signal.removeEventListener = (...args: Parameters<AbortSignal["removeEventListener"]>) => { removes++; remove(...args); };
  assert.equal(await withDeadline(async () => 1, 10_000, controller.signal), 1);
  assert.equal(adds, removes);
  let transportSignal: AbortSignal | undefined;
  await assert.rejects(withDeadline((signal) => {
    transportSignal = signal;
    return new Promise(() => {});
  }, 15, controller.signal), /weather_deadline_exceeded/);
  assert.equal(transportSignal?.aborted, true);
  assert.equal(adds, removes);
  const work = withDeadline(() => new Promise(() => {}), 10_000, controller.signal);
  const rejected = assert.rejects(work, /cancelled/);
  controller.abort(new Error("cancelled"));
  await rejected;
  assert.equal(adds, removes);
});
