import assert from "node:assert/strict";
import test from "node:test";
import {
  LatestRequestRegistry,
  MiniappRequestCancelled,
  isMiniappRequestCancelled,
  selectQueryAbortSignal,
  usesNativeRequestTaskCancellation,
} from "./request-lifecycle";

test("a newer request cancels the old owner and survives stale cleanup", () => {
  const registry = new LatestRequestRegistry();
  const cancellations: string[] = [];
  const releaseOld = registry.register("map-scene", (reason) => {
    cancellations.push(`old:${reason}`);
  });
  const releaseNew = registry.register("map-scene", (reason) => {
    cancellations.push(`new:${reason}`);
  });

  assert.deepEqual(cancellations, ["old:superseded"]);
  releaseOld();
  assert.equal(registry.has("map-scene"), true);

  releaseNew();
  assert.equal(registry.has("map-scene"), false);
});

test("manual cancellation has a typed non-fallback identity", () => {
  const registry = new LatestRequestRegistry();
  let observed: unknown;
  registry.register("spot-sky", (reason) => {
    observed = new MiniappRequestCancelled(reason);
  });

  assert.equal(registry.cancel("spot-sky"), true);
  assert.equal(isMiniappRequestCancelled(observed), true);
  assert.equal((observed as MiniappRequestCancelled).name, "AbortError");
  assert.equal((observed as MiniappRequestCancelled).reason, "manual");
  assert.equal(registry.cancel("spot-sky"), false);
});

test("acceptance reset cancels every owned native request", () => {
  const registry = new LatestRequestRegistry();
  const cancelled: string[] = [];
  registry.register("map-scene", (reason) => cancelled.push(`map:${reason}`));
  registry.register("spot-sky", (reason) => cancelled.push(`sky:${reason}`));
  assert.equal(registry.cancelAll(), 2);
  assert.deepEqual(cancelled.sort(), ["map:manual", "sky:manual"]);
  assert.equal(registry.has("map-scene"), false);
  assert.equal(registry.has("spot-sky"), false);
});

test("WeChat uses RequestTask supersession while browser diagnostics consume AbortSignal", () => {
  assert.equal(usesNativeRequestTaskCancellation("WEAPP"), true);
  assert.equal(usesNativeRequestTaskCancellation("WEB"), false);

  const browserSignal = new AbortController().signal;
  let reads = 0;
  const context = {
    get signal() {
      reads += 1;
      return browserSignal;
    },
  };
  assert.equal(selectQueryAbortSignal("WEAPP", context), undefined);
  assert.equal(reads, 0, "native selection must not consume TanStack's getter");
  assert.equal(selectQueryAbortSignal("WEB", context), browserSignal);
  assert.equal(reads, 1);
});
