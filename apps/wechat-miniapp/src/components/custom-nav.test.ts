import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

function navigation(
  stack: () => unknown[],
  back: () => Promise<void>,
  tab: (options: { url: string }) => Promise<void>,
  beforeBack?: () => boolean | Promise<boolean>,
  onBackAuthorized: () => void | Promise<void> = () => undefined,
  onBackFailure: () => void | Promise<void> = () => undefined,
) {
  const source = ts.createSourceFile("nav.tsx", readFileSync(new URL("./custom-nav.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let declaration = "";
  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && node.name.getText(source) === "goBack") declaration = `const ${node.getText(source)};`;
    ts.forEachChild(node, visit);
  };
  visit(source);
  assert.ok(declaration);
  const errors: boolean[] = [];
  let reference: { current: { pending: number } } | undefined, hide!: () => void, show!: () => void, cleanup!: () => void;
  let unreadable = false, stableStack: unknown[];
  try { stableStack = stack(); } catch { unreadable = true; stableStack = []; }
  let currentStack = stableStack;
  const Taro = { getCurrentPages: () => { if (unreadable) throw Error("unavailable"); return currentStack; }, navigateBack: back, switchTab: tab };
  const owner = { exports: {} as { usePageNavigation: () => unknown } };
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL("../hooks/use-page-navigation.ts", import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText, { module: owner, exports: owner.exports, require: (name: string) => name === "react" ? {
    useRef: (initial: { pending: number }) => reference ??= { current: initial },
    useState: () => [false, (value: boolean) => errors.push(value)], useEffect: (setup: () => () => void) => { cleanup = setup(); },
  } : { __esModule: true, default: Taro, useDidHide: (fn: () => void) => { hide = fn; }, useDidShow: (fn: () => void) => { show = fn; } } });
  const navigation = owner.exports.usePageNavigation();
  const goBack = vm.runInNewContext(ts.transpileModule(declaration + "\ngoBack;", {
    compilerOptions: { target: ts.ScriptTarget.ES2020 },
  }).outputText, {
    navigation,
    backFallbackTab: "/pages/my/index",
    Taro, beforeBack, onBackAuthorized, onBackFailure,
  }) as () => Promise<void>;
  return { goBack, busy: { get current() { return !!reference!.current.pending; } }, errors,
    hide, show, unmount: cleanup, leavePage: () => { currentStack = [{}]; } };
}

test("back success preserves the actual previous page rather than switching tabs", async () => {
  let backs = 0, tabs = 0;
  const nav = navigation(() => [{}, {}], async () => { backs++; }, async () => { tabs++; });
  await nav.goBack();
  assert.equal(backs, 1);
  assert.equal(tabs, 0);
  assert.deepEqual(nav.errors, [false]);
});

test("a declined editor back guard retains the route and releases the navigation lock", async () => {
  let allowed = false, backs = 0;
  const nav = navigation(() => [{}, {}], async () => { backs++; }, async () => assert.fail("unexpected fallback"), () => allowed);
  await nav.goBack();
  assert.equal(backs, 0);
  allowed = true;
  await nav.goBack();
  assert.equal(backs, 1);
});

test("missing or unreadable stack returns to the configured tab", async () => {
  for (const stack of [() => [{}], () => { throw new Error("unavailable"); }]) {
    const urls: string[] = [];
    const nav = navigation(stack, async () => { assert.fail("no proven back target"); }, async ({ url }) => { urls.push(url); });
    await nav.goBack();
    assert.deepEqual(urls, ["/pages/my/index"]);
    assert.deepEqual(nav.errors, [false]);
  }
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
  await nav.goBack();
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
    () => new Promise<void>((_, reject) => calls.push(() => reject(Error("native tab rejected")))));
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
