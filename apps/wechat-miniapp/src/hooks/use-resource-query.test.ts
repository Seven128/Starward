import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";
import { QueryClient, QueryObserver, type QueryObserverOptions } from "@tanstack/react-query";
import { transportHarness } from "../services/api-request-test-support";

function hookHarness() {
  const source = ts.createSourceFile("use-resource-query.ts",
    readFileSync(new URL("./use-resource-query.ts", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
  const hook = source.statements.find((node): node is ts.FunctionDeclaration =>
    ts.isFunctionDeclaration(node) && node.name?.text === "useResourceQuery");
  assert.ok(hook);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  const subscriptions: (() => void)[] = [];
  const observers: QueryObserver[] = [];
  const actual = vm.runInNewContext(ts.transpileModule(
    hook.getText(source).replace(/^export /u, "") + "\nuseResourceQuery;",
    { compilerOptions: { target: ts.ScriptTarget.ES2020 } },
  ).outputText, {
    // Real hook option projection + real Query subscriptions. This does not
    // claim React mounting or WEAPP rendering; the effect only writes diagnostics.
    useEffect: () => {}, recordAcceptanceDiagnostic: () => {},
    useQuery: (options: QueryObserverOptions) => {
      const observer = new QueryObserver(client, options);
      observers.push(observer);
      subscriptions.push(observer.subscribe(() => {}));
      return observer.getCurrentResult();
    },
  }, { timeout: 1000 }) as (options: {
    queryKey: readonly string[];
    queryFn: (signal: AbortSignal | undefined) => Promise<unknown>;
    enabled?: boolean;
  }) => unknown;
  return { client, actual, observers, subscriptions,
    close: () => { for (const release of subscriptions) release(); client.clear(); },
  };
}

test("the production hook forwards Query cancellation to the owned native request", async () => {
  const hook = hookHarness();
  const native = transportHarness();
  let signal: AbortSignal | undefined;
  try {
    hook.actual({ queryKey: ["hook-scene"], queryFn: (value) => {
      signal = value;
      return native.request("scene", "/scene", value ? { signal: value } : {});
    } });
    assert.ok(signal, "the production hook must not discard Query's signal");
    assert.equal(native.calls.length, 1);
    await hook.client.cancelQueries({ queryKey: ["hook-scene"] });
    assert.equal(signal.aborted, true);
    assert.equal(native.counts().aborts, 1);
    assert.equal(native.requests.has("scene"), false);
    native.calls[0]!.success({ statusCode: 200, data: native.response });
    assert.equal(native.counts().writes, 0);
    assert.equal(hook.client.getQueryData(["hook-scene"]), undefined);
  } finally { hook.close(); native.requests.cancelAll(); }
});

test("one observer leaving cannot abort a shared request; the last observer leaving does", () => {
  const hook = hookHarness();
  const native = transportHarness();
  const options = { queryKey: ["hook-shared"], queryFn: (signal: AbortSignal | undefined) =>
    native.request("scene", "/scene", signal ? { signal } : {}) };
  try {
    hook.actual(options);
    hook.actual(options);
    assert.equal(native.calls.length, 1);
    hook.subscriptions[0]!();
    assert.equal(native.counts().aborts, 0);
    assert.equal(native.requests.has("scene"), true);
    hook.subscriptions[1]!();
    assert.equal(native.counts().aborts, 1);
    assert.equal(native.requests.has("scene"), false);
    assert.equal(native.timers.size, 0);
  } finally { hook.close(); native.requests.cancelAll(); }
});

test("a new hook query survives the previous observer's cancellation and late result", async () => {
  const hook = hookHarness();
  const native = transportHarness();
  try {
    hook.actual({ queryKey: ["hook-old"], queryFn: (signal) =>
      native.request("scene", "/old", signal ? { signal } : {}) });
    hook.subscriptions[0]!();
    assert.equal(native.counts().aborts, 1);
    hook.actual({ queryKey: ["hook-new"], queryFn: (signal) =>
      native.request("scene", "/new", signal ? { signal } : {}) });
    native.calls[0]!.success({ statusCode: 200, data: native.response });
    assert.equal(native.requests.has("scene"), true);
    assert.equal(native.counts().writes, 0);
    native.calls[1]!.success({ statusCode: 200, data: native.response });
    await hook.observers[1]!.getCurrentQuery().promise;
    assert.equal(native.counts().writes, 1);
    assert.equal(native.requests.has("scene"), false);
    assert.equal(hook.client.getQueryData(["hook-new"]), native.response);
    assert.equal(hook.client.getQueryData(["hook-old"]), undefined);
  } finally { hook.close(); native.requests.cancelAll(); }
});
