import assert from "node:assert/strict";
import test from "node:test";
import { transportHarness } from "./api-request-test-support";
import { QueryClient } from "@tanstack/react-query";
import { installAbortControllerPolyfill } from "./platform-polyfills";
import {
  LatestRequestRegistry,
  MiniappRequestCancelled,
  isMiniappRequestCancelled,
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

test("watchdog claims timeout before synchronous abort failure and preserves usable cache", async () => {
  const h = transportHarness();
  await h.seed();
  const pending = h.request("scene", "/scene");
  h.timeout();
  const stale = await pending;
  assert.equal(stale.dataState, "STALE_USABLE");
  assert.equal(stale.data, h.response.data);
  assert.match(stale.warnings.at(-1)!, /请求超时/u);
  assert.equal(h.requests.has("scene"), false);
  assert.equal(h.timers.size, 0);
  h.calls.at(-1)!.success({ statusCode: 200, data: h.response });
  h.calls.at(-1)!.fail({ errMsg: "late native failure" });
  assert.equal(h.diagnostics.some((row) => row[1] === "failure"), false);
  assert.deepEqual(h.counts(), { aborts: 1, writes: 1 });
});

test("timeout without an eligible exact cache stays a timeout, not cancellation", async () => {
  for (const mode of ["missing", "different-path", "disabled", "fixture", "expired", "unavailable", "sample"]) {
    const h = transportHarness();
    if (mode !== "missing") await h.seed({ ...h.response,
      dataState: ({ expired: "EXPIRED", unavailable: "UNAVAILABLE", sample: "SAMPLE_DATA" } as Record<string, string>)[mode] ?? "FRESH",
      sources: [{ kind: mode === "fixture" ? "TEST_FIXTURE" : "PROVIDER" }],
    });
    const pending = h.request("scene", mode === "different-path" ? "/another" : "/scene", { cache: mode !== "disabled" });
    const rejected = assert.rejects(pending, { message: "bff_request_timeout" });
    h.timeout();
    await rejected;
    assert.equal(h.requests.has("scene"), false);
    assert.equal(h.timers.size, 0);
  }
});

test("explicit cancellation wins over native abort and stale cleanup cannot release its successor", async () => {
  for (const reason of ["manual", "superseded", "query_signal"] as const) {
    const h = transportHarness();
    await h.seed();
    const old = h.request("scene", "/scene");
    const rejected = assert.rejects(old, (error: unknown) =>
      error instanceof MiniappRequestCancelled && error.reason === reason);
    const next = reason === "superseded" ? h.request("scene", "/next") : undefined;
    if (!next) h.requests.cancel("scene", reason);
    await rejected;
    h.calls[1]!.success({ statusCode: 200, data: h.response });
    assert.equal(h.requests.has("scene"), Boolean(next));
    assert.equal(h.counts().writes, 1);
    if (next) { h.calls[2]!.success({ statusCode: 200, data: h.response }); await next; }
    assert.equal(h.timers.size, 0);
  }
});

test("abort throwing cannot strand the timeout or cancellation result", async () => {
  for (const timeout of [true, false]) {
    const h = transportHarness(true);
    const pending = h.request("scene", "/scene");
    const rejected = assert.rejects(pending, { message: timeout
      ? "bff_request_timeout" : "miniapp_request_cancelled:manual" });
    assert.doesNotThrow(() => timeout ? h.timeout() : h.requests.cancel("scene"));
    await rejected;
    assert.equal(h.timers.size, 0);
    assert.equal(h.requests.has("scene"), false);
    assert.ok(h.diagnostics.some((row) => row[2] === "transport_abort_failed"));
  }
});

test("native abort remains cancellation while ordinary transport failure can use cache", async () => {
  for (const abort of [true, false]) {
    const h = transportHarness();
    await h.seed();
    const pending = h.request("scene", "/scene");
    const result = abort ? assert.rejects(pending, (error: unknown) =>
      error instanceof MiniappRequestCancelled && error.reason === "transport_abort") : pending;
    h.calls.at(-1)!.fail({ errMsg: abort ? "request:fail abort" : "request:fail timeout" });
    const stale = await result;
    if (!abort) assert.equal(stale!.dataState, "STALE_USABLE");
    assert.equal(h.timers.size, 0);
    assert.equal(h.requests.has("scene"), false);
    assert.equal(h.counts().aborts, 0);
  }
});

test("success closes the timer and ignores a queued watchdog or failure", async () => {
  const h = transportHarness();
  const pending = h.request("scene", "/scene");
  const queuedTimeout = h.timers.values().next().value!;
  h.calls[0]!.success({ statusCode: 200, data: h.response });
  assert.equal(await pending, h.response);
  queuedTimeout();
  h.calls[0]!.fail({ errMsg: "request:fail abort" });
  assert.deepEqual(h.counts(), { aborts: 0, writes: 1 });
  assert.deepEqual(h.diagnostics.map((row) => row[1]), ["start", "success"]);
  assert.equal(h.timers.size, 0);
});

function weappController() {
  const runtime: { AbortController?: typeof AbortController; AbortSignal?: typeof AbortSignal } = {};
  installAbortControllerPolyfill(runtime);
  return new runtime.AbortController!();
}

test("pre-aborted requests never dispatch or replace an active owner", async () => {
  for (const controller of [new AbortController(), weappController()]) {
    const h = transportHarness();
    const active = h.request("scene", "/active");
    const cleanup = active.catch(() => {});
    controller.abort();
    const rejected = h.request("scene", "/cancelled", { signal: controller.signal });
    const outcome = rejected.catch((error: unknown) => error);
    try {
      assert.equal(h.calls.length, 1);
      assert.equal(h.counts().aborts, 0);
      const error = await outcome;
      assert.ok(error instanceof MiniappRequestCancelled);
      assert.equal(error.reason, "query_signal");
      h.calls[0]!.success({ statusCode: 200, data: h.response });
      assert.equal(await active, h.response);
    } finally { h.requests.cancelAll(); await cleanup; await outcome; }
  }
});

test("live standard and WEAPP signals abort the native task without cache fallback", async () => {
  for (const controller of [new AbortController(), weappController()]) {
    const h = transportHarness();
    await h.seed();
    const pending = h.request("scene", "/scene", { signal: controller.signal });
    const outcome = pending.catch((error: unknown) => error);
    try {
      controller.abort();
      assert.equal(h.counts().aborts, 1);
      const error = await outcome;
      assert.ok(error instanceof MiniappRequestCancelled);
      assert.equal(error.reason, "query_signal");
      assert.equal(h.requests.has("scene"), false);
      assert.equal(h.timers.size, 0);
      h.calls.at(-1)!.success({ statusCode: 200, data: h.response });
      assert.equal(h.counts().writes, 1);
    } finally { h.requests.cancelAll(); await outcome; }
  }
});

test("QueryClient cancellation reaches the native task and cannot write late data", async () => {
  const h = transportHarness();
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  const key = ["synthetic-scene"];
  const pending = client.fetchQuery({ queryKey: key,
    queryFn: ({ signal }) => h.request("scene", "/scene", { signal }),
  }).catch(() => {});
  try {
    assert.equal(h.calls.length, 1);
    await client.cancelQueries({ queryKey: key });
    assert.equal(h.counts().aborts, 1);
    assert.equal(h.requests.has("scene"), false);
    h.calls[0]!.success({ statusCode: 200, data: h.response });
    assert.equal(h.counts().writes, 0);
    assert.equal(client.getQueryData(key), undefined);
  } finally { client.clear(); h.requests.cancelAll(); await pending; }
});

test("every terminal path detaches its abort listener and an old signal cannot cancel a successor", async (t) => {
  for (const controller of [new AbortController(), weappController()]) {
    for (const ending of ["success", "failure", "http", "contract", "dispatch", "timeout", "manual", "superseded"]) {
      // These endings settle the request without aborting the shared signal.
      const signal = controller.signal;
      const added = t.mock.method(signal, "addEventListener");
      const removed = t.mock.method(signal, "removeEventListener");
      const h = transportHarness(false, () => { if (ending === "dispatch") throw new Error("synthetic dispatch failure"); });
      const first = h.request("scene", "/scene", { signal }).catch(() => {});
      assert.equal(added.mock.callCount(), 1);
      const listener = added.mock.calls[0]!.arguments[1];
      if (ending === "success") h.calls[0]!.success({ statusCode: 200, data: h.response });
      if (ending === "failure") h.calls[0]!.fail({ errMsg: "synthetic network failure" });
      if (ending === "http") h.calls[0]!.success({ statusCode: 500, data: {} });
      if (ending === "contract") h.calls[0]!.success({ statusCode: 200, data: {} });
      if (ending === "timeout") h.timeout();
      if (ending === "manual") h.requests.cancel("scene");
      const next = ending === "superseded" ? h.request("scene", "/next") : undefined;
      try {
        await first;
        assert.equal(removed.mock.callCount(), 1, ending);
        assert.equal(removed.mock.calls[0]!.arguments[1], listener);
        const before = h.counts().aborts;
        // A callback queued before removal must also remain confined to its owner.
        assert.equal(typeof listener, "function");
        (listener as () => void)();
        assert.equal(h.counts().aborts, before);
        assert.equal(h.requests.has("scene"), Boolean(next));
        if (next) { h.calls[1]!.success({ statusCode: 200, data: h.response }); await next; }
        assert.equal(h.timers.size, 0);
      } finally { h.requests.cancelAll(); added.mock.restore(); removed.mock.restore(); }
    }
  }
});

test("a signal aborted while native dispatch returns still aborts the acquired task", async () => {
  for (const controller of [new AbortController(), weappController()]) {
    const h = transportHarness(false, () => controller.abort());
    const pending = h.request("scene", "/scene", { signal: controller.signal });
    await assert.rejects(pending, (error: unknown) =>
      error instanceof MiniappRequestCancelled && error.reason === "query_signal");
    assert.equal(h.counts().aborts, 1);
    assert.equal(h.requests.has("scene"), false);
    assert.equal(h.timers.size, 0);
  }
});
