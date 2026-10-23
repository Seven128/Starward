import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { primaryPageNavigationForTest } from "../navigation/primary-page-navigation-test-support";
import { createPrimaryNavigationController, type PrimaryNativePage } from "../navigation/primary-navigation-controller";

function navigation(
  stack: () => unknown[],
  back: () => Promise<void>,
  tab: (options: { url: string }) => Promise<void>,
  beforeBack?: () => boolean | Promise<boolean>,
  onBackAuthorized: () => void | Promise<void> = () => undefined,
  onBackFailure: () => void | Promise<void> = () => undefined,
  backAction?: () => void | Promise<void>,
) {
  const source = ts.createSourceFile("nav.tsx", readFileSync(new URL("./custom-nav.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let declaration = "";
  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && node.name.getText(source) === "goBack") declaration = `const ${node.getText(source)};`;
    ts.forEachChild(node, visit);
  };
  visit(source);
  assert.ok(declaration);
  const errors: boolean[] = [], runtimeErrors: unknown[][] = [];
  let reference: { current: { pending: number } } | undefined, hide!: () => void, show!: () => void, cleanup!: () => void;
  let unreadable = false, stableStack: unknown[];
  try { stableStack = stack(); } catch { unreadable = true; stableStack = []; }
  let currentStack = stableStack;
  let visible = true;
  const presentedPage = stableStack.at(-1);
  const Taro = { getCurrentPages: () => { if (unreadable) throw Error("unavailable"); return currentStack; }, navigateBack: back, reLaunch: tab };
  const primary = primaryPageNavigationForTest(Taro);
  const owner = { exports: {} as { usePageNavigation: () => unknown } };
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL("../hooks/use-page-navigation.ts", import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText, { module: owner, exports: owner.exports, require: (name: string) => name === "react" ? {
    useRef: (initial: any) => { const slot = { current: initial }; reference ??= slot; return slot; },
    useState: () => [false, (value: boolean) => errors.push(value)], useEffect: (setup: () => () => void) => { cleanup = setup(); },
  } : name.endsWith("page-presentation") ? { usePresentedPageLifecycle: (callbacks: { hide: () => void; show: () => void }) => {
    hide = () => { visible = false; callbacks.hide(); };
    show = () => { visible = true; callbacks.show(); };
    return { isCurrent: () => visible && currentStack.at(-1) === presentedPage, identity: () => presentedPage };
  } } : { __esModule: true, default: Taro } });
  const navigation = owner.exports.usePageNavigation();
  const goBack = vm.runInNewContext(ts.transpileModule(declaration + "\ngoBack;", {
    compilerOptions: { target: ts.ScriptTarget.ES2020 },
  }).outputText, {
    navigation,
    reportRuntimeError: (...event: unknown[]) => runtimeErrors.push(event),
    backFallbackTab: "/pages/my/index",
    Taro, ...primary, beforeBack, onBackAuthorized, onBackFailure, backAction,
  }) as () => Promise<void>;
  return { goBack, busy: { get current() { return !!reference!.current.pending; } }, errors, runtimeErrors,
    hide, show, unmount: cleanup, leavePage: () => { currentStack = [{}]; },
    showMapRoot() {
      const map = { route: "pages/map/index" };
      currentStack = [map];
      const controller = createPrimaryNavigationController({ currentPage: () => currentStack.at(-1) as PrimaryNativePage });
      primary.registerPrimaryMapHost(controller);
      controller.show(map);
      return controller;
    },
  };
}
const tick = async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); };

test("back success preserves the actual previous page rather than switching tabs", async () => {
  let backs = 0, tabs = 0;
  const nav = navigation(() => [{}, {}], async () => { backs++; }, async () => { tabs++; });
  await nav.goBack();
  assert.equal(backs, 1);
  assert.equal(tabs, 0);
  assert.deepEqual(nav.errors, [false]);
});

test("the presented My return passes the existing guard and authorization once without an extra native Back", async () => {
  let allowed = false;
  const events: string[] = [];
  const nav = navigation(() => [{}, {}], async () => { events.push("native-back"); }, async () => { events.push("fallback"); },
    () => { events.push("guard"); return allowed; }, () => { events.push("authorized"); }, undefined,
    () => { events.push("return-map"); });
  await nav.goBack();
  assert.deepEqual(events, ["guard"]);
  allowed = true;
  await nav.goBack();
  assert.deepEqual(events, ["guard", "guard", "authorized", "return-map"]);
  assert.equal(nav.busy.current, false);
});

test("a rejected presented return uses the existing recovery path and permits retry", async () => {
  let fail = true, calls = 0, recovered = 0;
  const nav = navigation(() => [{}, {}], async () => assert.fail("custom return owns dispatch"),
    async () => assert.fail("custom return owns dispatch"), undefined, undefined, () => { recovered++; },
    async () => { calls++; if (fail) throw Error("presentation return rejected"); });
  await nav.goBack();
  assert.equal(calls, 1); assert.equal(recovered, 1);
  assert.deepEqual(nav.errors, [false, true]);
  assert.equal(nav.busy.current, false);
  fail = false;
  await nav.goBack();
  assert.equal(calls, 2); assert.equal(recovered, 1);
  assert.deepEqual(nav.errors, [false, true, false]);
});

test("a declined editor back guard retains the route and releases the navigation lock", async () => {
  let allowed = false, backs = 0;
  const nav = navigation(() => [{}, {}], async () => { backs++; }, async () => assert.fail("unexpected fallback"), () => allowed);
  await nav.goBack();
  assert.equal(backs, 0);
  assert.equal(nav.runtimeErrors.length, 0);
  allowed = true;
  await nav.goBack();
  assert.equal(backs, 1);
});

test("a missing Map recovers the root and waits for its real show before applying the configured My destination", async () => {
  const urls: string[] = [];
  const nav = navigation(() => [{}], async () => { assert.fail("no proven back target"); }, async ({ url }) => { urls.push(url); });
  let completed = false;
  const returned = nav.goBack().then(() => { completed = true; });
  await tick();
  assert.deepEqual(urls, ["/pages/map/index"]);
  assert.equal(completed, false, "native relaunch acceptance does not invent Map show");
  assert.equal(nav.busy.current, true);
  const controller = nav.showMapRoot();
  await returned;
  assert.equal(controller.getSnapshot().route, "pages/my/index");
  assert.equal(nav.runtimeErrors.length, 0);
  assert.deepEqual(nav.errors, [false]);
});

test("an unreadable stack retains a visible retry rather than inventing a return destination", async () => {
  let roots = 0;
  const nav = navigation(() => { throw Error("unavailable"); }, async () => assert.fail("no proven back target"), async () => { roots++; });
  await nav.goBack();
  assert.equal(roots, 0);
  assert.deepEqual(nav.runtimeErrors.map(event => event[1]), ["navigation_page_stack_failed", "navigation_return_failed"]);
  assert.deepEqual(nav.errors, [false, true]);
  assert.equal(nav.busy.current, false);
});

test("both navigation failures are visible and permit a successful retry", async () => {
  let failed = true, authorized = 0, restored = 0;
  const nav = navigation(
    () => [{}, {}],
    async () => { throw new Error("back failed"); },
    async () => { if (failed) throw new Error("tab failed"); },
    undefined,
    () => { authorized++; },
    () => { restored++; },
  );
  await nav.goBack();
  assert.deepEqual(nav.errors, [false, true]);
  assert.equal(authorized, 1);
  assert.equal(restored, 1);
  assert.equal(nav.busy.current, false);
  failed = false;
  const retry = nav.goBack(); await tick(); nav.showMapRoot(); await retry;
  assert.deepEqual(nav.errors, [false, true, false]);
  assert.equal(authorized, 2);
  assert.equal(restored, 1);
});

test("rapid repeated activation does not pop a second page", async () => {
  let resolve!: () => void, calls = 0;
  const pending = new Promise<void>((done) => { resolve = done; });
  const nav = navigation(() => [{}, {}], () => { calls++; return pending; }, async () => { assert.fail("unexpected fallback"); });
  const first = nav.goBack();
  await nav.goBack();
  assert.equal(calls, 1);
  resolve();
  await first;
  assert.equal(nav.busy.current, false);
});

test("native Back failure is logged even when the configured fallback succeeds", async () => {
  const failure = { errno: 600001, errMsg: "native private route" };
  let fallbacks = 0;
  const nav = navigation(() => [{}, {}], async () => { throw failure; }, async () => { fallbacks++; });
  const returning = nav.goBack(); await tick(); nav.showMapRoot(); await returning;
  assert.equal(fallbacks, 1);
  assert.deepEqual(nav.errors, [false]);
  assert.equal(nav.busy.current, false);
  assert.equal(nav.runtimeErrors.length, 1, "a handled native rejection still needs the shared console boundary");
  assert.equal(nav.runtimeErrors[0]![0], "native");
  assert.strictEqual(nav.runtimeErrors[0]![2], failure);
  const root = navigation(() => [{}], async () => assert.fail("no back target"), async () => {});
  const rootReturning = root.goBack(); await tick(); root.showMapRoot(); await rootReturning;
  assert.equal(root.runtimeErrors.length, 0, "the ordinary root-page fallback is not a native failure");
});

test("retired Back cannot dispatch a fallback from a hidden, unmounted or replacement page", async () => {
  for (const retire of ["hide", "unmount", "leavePage"] as const) {
    let reject!: () => void, tabs = 0, failures = 0;
    const nav = navigation(() => [{}, {}], () => new Promise<void>((_, fail) => { reject = () => fail(Error("old back rejected")); }),
      async () => { tabs++; }, undefined, undefined, () => { failures++; });
    const pending = nav.goBack(); await Promise.resolve(); nav[retire](); reject(); await pending;
    assert.equal(tabs, 0, retire); assert.equal(failures, 0, retire); assert.equal(nav.errors.filter(Boolean).length, 0);
  }
});

test("hide/show releases the old lock, while its finalizer cannot release a successor", async () => {
  const calls: Array<() => void> = [];
  const nav = navigation(() => [{}], async () => assert.fail("no back target"),
    async () => assert.fail("presented action owns dispatch"), undefined, undefined, undefined,
    () => new Promise<void>((_, reject) => calls.push(() => reject(Error("presented return rejected")))));
  const old = nav.goBack(); await Promise.resolve(); nav.hide(); nav.show();
  const current = nav.goBack(); await Promise.resolve(); assert.equal(calls.length, 2);
  calls[0]!(); await old; assert.equal(nav.busy.current, true); assert.equal(nav.errors.filter(Boolean).length, 0);
  await nav.goBack(); assert.equal(calls.length, 2); calls[1]!(); await current;
  assert.equal(nav.errors.filter(Boolean).length, 1); assert.equal(nav.busy.current, false);
});

test("retirement while awaiting a leave decision or authorization prevents subsequent work", async () => {
  for (const stage of ["decision", "authorization"] as const) {
    let resolve!: () => void, authorized = 0, dispatched = 0;
    const wait = new Promise<void>(done => { resolve = done; });
    const nav = navigation(() => [{}], async () => { dispatched++; }, async () => { dispatched++; },
      () => stage === "decision" ? wait.then(() => true) : true,
      () => { authorized++; return stage === "authorization" ? wait : undefined; });
    const pending = nav.goBack(); await Promise.resolve(); await Promise.resolve(); nav.hide(); nav.show();
    resolve(); await pending; assert.equal(dispatched, 0); assert.equal(authorized, stage === "decision" ? 0 : 1);
  }
});

test("a failed recovery callback remains visible and handled; a late callback cannot write old UI", async () => {
  const failed = navigation(() => [{}], async () => {}, async () => { throw Error("tab failed"); }, undefined,
    undefined, async () => { throw Error("restoration failed"); });
  await failed.goBack(); assert.deepEqual(failed.errors, [false, true]); assert.equal(failed.busy.current, false);
  let resolve!: () => void, entered!: () => void;
  const enteredRecovery = new Promise<void>(done => { entered = done; });
  const nav = navigation(() => [{}], async () => {}, async () => { throw Error("tab failed"); }, undefined,
    undefined, () => { entered(); return new Promise<void>(done => { resolve = done; }); });
  const pending = nav.goBack(); await enteredRecovery;
  nav.hide(); nav.show(); resolve(); await pending; assert.equal(nav.errors.filter(Boolean).length, 0);
});
