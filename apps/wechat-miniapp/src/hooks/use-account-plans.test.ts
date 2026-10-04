import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

type Payload = { data: { plans: string[] } };
function mount() {
  let nativeOwner: string | null = "a";
  let state = { accountOwnerId: "a" as string | null, mapResetVersion: 0 };
  const cache = new Map<string, Payload>([["a", { data: { plans: ["a-plan"] } }]]);
  let options: { queryKey: unknown[]; queryFn: (signal?: AbortSignal) => Promise<Payload>; enabled: boolean; staleTime: number };
  let selectors: Array<{ read: (s: typeof state) => unknown; value: unknown }> = [];
  let calls: Array<{ expected: string | undefined; signal: AbortSignal | undefined }> = [];
  let enabled = true;
  let error: Error | null = null;
  let output: ReturnType<typeof hook>;
  const source = readFileSync(new URL("./use-account-plans.ts", import.meta.url), "utf8");
  const module = { exports: {} as { useAccountPlans: (p: { enabled: boolean }) => {
    owner: string | null;
    query: { data?: Payload; isPending: boolean; isError: boolean; refreshError?: Error; refetch: () => Promise<Payload> };
  } } };
  const hookCode = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
  } }).outputText;
  vm.runInNewContext(hookCode, {
    module, exports: module.exports,
    require: (name: string) => name === "react" ? { useId: () => "mount" }
      : name.includes("api-client") ? {
        currentDraftUserId: () => nativeOwner,
        getPlans: async (signal: AbortSignal | undefined, expected: string | undefined) => {
          calls.push({ expected, signal });
          if (!nativeOwner) { nativeOwner = "new"; update("new"); }
          return cache.get(expected ?? nativeOwner!) ?? { data: { plans: [] } };
        },
      } : name.includes("app-store") ? { useAppStore: (read: (s: typeof state) => unknown) => {
        const value = read(state); selectors.push({ read, value }); return value;
      } } : { useResourceQuery: (input: typeof options) => {
        options = input;
        const data = cache.get(String(input.queryKey[1]));
        return { data, error: data ? null : error, isError: !data && !!error,
          isPending: !data && !error, refreshError: data ? error ?? undefined : undefined,
          isFetching: false, refetch: () => input.queryFn() };
      } },
  });
  const hook = module.exports.useAccountPlans;
  function render() { selectors = []; output = hook({ enabled }); return output; }
  function update(owner: string | null, reset = state.mapResetVersion + 1) {
    state = { accountOwnerId: owner, mapResetVersion: reset };
    if (selectors.some(({ read, value }) => !Object.is(read(state), value))) render();
  }
  render();
  return {
    read: () => output, options: () => options!, calls,
    switchTo(owner: string | null) { nativeOwner = owner; update(owner); },
    batchABA() { const original = state.accountOwnerId; state = { accountOwnerId: "b", mapResetVersion: state.mapResetVersion + 1 }; update(original); },
    reset() { update(state.accountOwnerId); },
    mismatched() { nativeOwner = "b"; update("a"); },
    cache(key: string, plans: string[]) { cache.set(key, { data: { plans } }); render(); },
    fail() { error = new Error("transport"); render(); },
    visible(value: boolean) { enabled = value; render(); },
  };
}

test("a same-theme account transition unsubscribes the old private plan projection", () => {
  const page = mount();
  assert.deepEqual(page.read().query.data?.data.plans, ["a-plan"]);
  page.switchTo("b");
  assert.equal(page.read().owner, "b");
  assert.equal(page.read().query.data, undefined);
  page.cache("b", ["b-plan"]);
  assert.deepEqual(page.read().query.data?.data.plans, ["b-plan"]);
  page.switchTo("a");
  assert.deepEqual(page.read().query.data?.data.plans, ["a-plan"]);
});

test("sign-out cannot display an old unresolved cache entry", () => {
  const page = mount();
  page.cache("unresolved:mount", ["old-unresolved-plan"]);
  page.switchTo(null);
  assert.equal(page.read().owner, null);
  assert.equal(page.read().query.data, undefined);
  assert.equal(page.read().query.isPending, true);
  assert.equal(page.options().staleTime, 0);
});

test("native and bound identities must agree before private cache is exposed", () => {
  const page = mount();
  page.mismatched();
  assert.equal(page.read().owner, null);
  assert.equal(page.read().query.data, undefined);
});

test("unresolved identity discovery still uses the existing plan/session owner", async () => {
  const page = mount();
  page.switchTo(null);
  await page.read().query.refetch();
  assert.equal(page.calls[0]?.expected, undefined);
  assert.equal(page.read().owner, "new");
  assert.equal(page.options().queryKey[1], "new");
});

test("an owned plan request retains its captured identity and AbortSignal", async () => {
  const page = mount();
  const controller = new AbortController();
  await page.options().queryFn(controller.signal);
  assert.equal(page.calls[0]?.expected, "a");
  assert.equal(page.calls[0]?.signal, controller.signal);
});

test("batched ABA/reset is observed independently of the final account id", () => {
  const page = mount();
  const before = page.options();
  page.batchABA();
  assert.notEqual(page.options(), before);
  assert.equal(page.read().owner, "a");
  const after = page.options();
  page.reset();
  assert.notEqual(page.options(), after);
  assert.deepEqual(page.read().query.data?.data.plans, ["a-plan"]);
});

test("current-account stale data and hidden-page query control remain available", () => {
  const page = mount();
  page.fail();
  assert.deepEqual(page.read().query.data?.data.plans, ["a-plan"]);
  assert.equal(page.read().query.refreshError?.message, "transport");
  page.visible(false);
  assert.equal(page.options().enabled, false);
  page.visible(true);
  assert.equal(page.options().enabled, true);
});
