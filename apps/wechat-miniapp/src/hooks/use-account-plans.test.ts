import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

type Payload = { data: { plans: string[]; preferences?: { theme: string } } };
type HookResult = { owner: string | null; query: { data?: Payload; isPending: boolean; isError: boolean;
  refreshError?: Error; refetch: () => Promise<Payload> } };
type Hooks = { useAccountPlans: (p: { enabled: boolean }) => HookResult;
  useAccountResourceQuery: (resource: string, read: unknown, p: { enabled: boolean }) => HookResult };
function mount(resource: "plans" | "user-library" = "plans") {
  let nativeOwner: string | null = "a";
  let state = { accountOwnerId: "a" as string | null, mapResetVersion: 0 };
  const cache = new Map<string, Payload>([["a", { data: { plans: ["a-plan"] } }]]);
  let options: { queryKey: unknown[]; queryFn: (signal?: AbortSignal) => Promise<Payload>; enabled: boolean; staleTime: number };
  let selectors: Array<{ read: (s: typeof state) => unknown; value: unknown }> = [];
  let calls: Array<{ resource: string; expected: string | undefined; signal: AbortSignal | undefined }> = [];
  let enabled = true;
  let error: Error | null = null;
  let output: ReturnType<typeof hook>;
  const source = readFileSync(new URL(resource === "plans" ? "./use-account-plans.ts" : "./use-account-resource-query.ts", import.meta.url), "utf8");
  const module = { exports: {} as Hooks };
  const readLibrary = async (signal: AbortSignal | undefined, expected: string | undefined) => {
    calls.push({ resource: "user-library", expected, signal });
    return cache.get(expected ?? nativeOwner!) ?? { data: { plans: [] } };
  };
  const hookCode = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
  } }).outputText;
  const context = {
    module, exports: module.exports,
    require: (name: string) => name.includes("use-account-resource-query") ? loadCore()
      : name === "react" ? { useId: () => "mount" }
      : name.includes("api-client") ? {
        currentDraftUserId: () => nativeOwner,
        getPlans: async (signal: AbortSignal | undefined, expected: string | undefined) => {
          calls.push({ resource: "plans", expected, signal });
          if (!nativeOwner) { nativeOwner = "new"; update("new"); }
          return cache.get(expected ?? nativeOwner!) ?? { data: { plans: [] } };
        },
        getUserLibrary: readLibrary,
      } : name.includes("app-store") ? { useAppStore: (read: (s: typeof state) => unknown) => {
        const value = read(state); selectors.push({ read, value }); return value;
      } } : { useResourceQuery: (input: typeof options) => {
        options = input;
        const data = cache.get(String(input.queryKey[1]));
        return { data, error: data ? null : error, isError: !data && !!error,
          isPending: !data && !error, refreshError: data ? error ?? undefined : undefined,
          isFetching: false, refetch: () => input.queryFn() };
      } },
  };
  function loadCore() {
    const core = { exports: {} as typeof module.exports };
    vm.runInNewContext(ts.transpileModule(readFileSync(new URL("./use-account-resource-query.ts", import.meta.url), "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText, { ...context, module: core, exports: core.exports });
    return core.exports;
  }
  vm.runInNewContext(hookCode, context);
  const hook = resource === "plans" ? module.exports.useAccountPlans : (p: { enabled: boolean }) =>
    module.exports.useAccountResourceQuery(resource, readLibrary, p);
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
    library(key: string, plans: string[], theme: string) { cache.set(key, { data: { plans, preferences: { theme } } }); render(); },
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

test("user-library preserves preferences and its API while immediately changing account projections", async () => {
  const page = mount("user-library");
  page.library("a", ["a-plan"], "DAY");
  const controller = new AbortController();
  await page.options().queryFn(controller.signal);
  assert.equal(page.calls[0]?.resource, "user-library");
  assert.equal(page.calls[0]?.expected, "a");
  assert.equal(page.calls[0]?.signal, controller.signal);
  page.switchTo("b");
  assert.equal(page.read().query.data, undefined);
  page.library("b", ["b-plan"], "NIGHT");
  assert.deepEqual(page.read().query.data?.data, { plans: ["b-plan"], preferences: { theme: "NIGHT" } });
  page.switchTo("a");
  assert.equal(page.read().query.data?.data.preferences?.theme, "DAY");
});

test("unresolved user-library hides stale private data and its refresh failure", () => {
  const page = mount("user-library");
  page.library("unresolved:mount", ["old-private"], "DAY");
  page.fail(); page.switchTo(null);
  assert.equal(page.read().query.data, undefined);
  assert.equal(page.read().query.refreshError, undefined);
  assert.equal(page.read().query.isPending, true);
  assert.equal(page.options().staleTime, 0);
});
