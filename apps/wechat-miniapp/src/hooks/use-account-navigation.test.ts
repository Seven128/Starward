import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

function mount() {
  let identity: string | null = "a", owner: string | null = "a";
  let state = { accountOwnerId: "a" as string | null, mapResetVersion: 0 };
  let error = false, cleanup: (() => void) | undefined, reference: unknown;
  let hide!: () => void, show!: () => void;
  let page: object | null = {};
  let dispatchThrows = false;
  const listeners = new Set<(next: typeof state, previous: typeof state) => void>();
  const calls: Array<{ url: string; succeed: () => void; fail: () => void }> = [];
  const source = readFileSync(new URL("./use-account-navigation.ts", import.meta.url), "utf8");
  type Feedback = (phase: "start" | "success" | "failure") => void;
  const module = { exports: {} as { useAccountNavigation: (o: string | null) => { open: (url: string, feedback?: Feedback) => Promise<void>; navigationError: boolean } } };
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true,
  } }).outputText, {
    module, exports: module.exports, Symbol,
    require: (name: string) => name === "react" ? {
      useState: () => [error, (value: boolean) => { error = value; }],
      useRef: (initial: unknown) => reference ??= { current: initial },
      useEffect: (setup: () => () => void) => { if (!cleanup) cleanup = setup(); },
    } : name === "@tarojs/taro" ? {
      __esModule: true,
      useDidHide: (callback: () => void) => { hide = callback; },
      useDidShow: (callback: () => void) => { show = callback; },
      default: { getCurrentPages: () => page ? [page] : [], navigateTo: ({ url }: { url: string }) => {
        if (dispatchThrows) throw new Error("native dispatch unavailable");
        return new Promise<void>((resolve, reject) => {
          calls.push({ url, succeed: resolve, fail: () => reject(new Error("native navigation rejected")) });
        });
      } },
    } : name.includes("api-client") ? { currentDraftUserId: () => identity } : {
      useAppStore: { getState: () => state, subscribe: (callback: (next: typeof state, previous: typeof state) => void) => {
        listeners.add(callback); return () => listeners.delete(callback);
      } },
    },
  });
  const render = () => module.exports.useAccountNavigation(owner);
  const switchOwner = (next: string | null) => {
    identity = owner = next;
    const previous = state;
    state = { accountOwnerId: next, mapResetVersion: state.mapResetVersion + 1 };
    listeners.forEach(callback => callback(state, previous)); render();
  };
  render();
  return { calls, listeners, open: (url = "/content/plan/detail/index?planId=a", feedback?: Feedback) => render().open(url, feedback),
    failed: () => render().navigationError, switchOwner,
    hide: () => hide(), show: () => show(), unmount: () => cleanup!(),
    mismatch: () => { identity = "b"; }, leavePage: () => { page = {}; }, emptyStack: () => { page = null; },
    throwDispatch: (value: boolean) => { dispatchThrows = value; },
  };
}

test("normal failure is visible, can retry, and same-attempt repeat is bounded", async () => {
  const page = mount();
  const first = page.open(); await page.open(); assert.equal(page.calls.length, 1);
  page.calls[0]!.fail(); await first; assert.equal(page.failed(), true);
  const retry = page.open(); assert.equal(page.failed(), false);
  page.calls[1]!.succeed(); await retry; assert.equal(page.failed(), false);
});

test("late old-account failure cannot affect the current page", async () => {
  const page = mount(), old = page.open();
  page.switchOwner("b"); page.calls[0]!.fail(); await old;
  assert.equal(page.failed(), false);
});

test("scope retirement releases old busy but old finally cannot release successor", async () => {
  const page = mount(), old = page.open();
  page.switchOwner("b"); const current = page.open("/content/plan/detail/index?planId=b");
  assert.equal(page.calls.length, 2);
  page.calls[0]!.fail(); await old; await page.open();
  assert.equal(page.calls.length, 2); assert.equal(page.failed(), false);
  page.calls[1]!.fail(); await current; assert.equal(page.failed(), true);
});

test("hide/show permanently retires old failure and allows a fresh navigation", async () => {
  const page = mount(), old = page.open();
  page.hide(); await page.open(); assert.equal(page.calls.length, 1);
  page.show(); const next = page.open(); assert.equal(page.calls.length, 2);
  page.calls[0]!.fail(); await old; assert.equal(page.failed(), false);
  page.calls[1]!.succeed(); await next;
});

test("batched account ABA does not resurrect old attempt", async () => {
  const page = mount(), old = page.open();
  page.switchOwner("b"); page.switchOwner("a"); page.calls[0]!.fail(); await old;
  assert.equal(page.failed(), false);
});

test("unmount releases subscription and no late failure writes state", async () => {
  const page = mount(), old = page.open();
  page.unmount(); assert.equal(page.listeners.size, 0);
  page.calls[0]!.fail(); await old; assert.equal(page.failed(), false);
  await page.open(); assert.equal(page.calls.length, 1);
});

test("changed native identity or active page cannot claim navigation feedback", async () => {
  const page = mount(), old = page.open();
  page.leavePage(); page.calls[0]!.fail(); await old; assert.equal(page.failed(), false);
  page.mismatch(); await page.open(); assert.equal(page.calls.length, 1);
});

test("new-plan navigation remains available in a coherent anonymous scope", async () => {
  const page = mount(); page.switchOwner(null);
  const navigation = page.open("/content/plan/edit/index?new=1");
  assert.equal(page.calls.length, 1);
  page.calls[0]!.succeed(); await navigation;
});

test("an unavailable current page reports recovery without dispatching navigation", async () => {
  const page = mount(); page.emptyStack();
  await page.open();
  assert.equal(page.calls.length, 0);
  assert.equal(page.failed(), true);
});

test("accepted handoff cleanup can cross its normal page hide while failed UI cannot", async () => {
  const page = mount(); let successes = 0, failures = 0;
  const old = page.open("/content/settings/index", phase => { if (phase === "success") successes++; if (phase === "failure") failures++; });
  page.hide(); page.leavePage(); page.calls[0]!.succeed(); await old;
  assert.equal(successes, 1); assert.equal(failures, 0);
  page.show(); const rejected = page.open("/content/settings/index", phase => { if (phase === "failure") failures++; });
  page.hide(); page.calls[1]!.fail(); await rejected;
  assert.equal(failures, 0);
});

test("account ABA, unmount and successor attempts permanently retire old success effects", async () => {
  for (const retire of ["aba", "unmount", "successor"] as const) {
    const page = mount(); let successes = 0;
    const old = page.open("/content/settings/index", phase => { if (phase === "success") successes++; });
    let successor: Promise<void> | undefined;
    if (retire === "aba") { page.switchOwner("b"); page.switchOwner("a"); }
    if (retire === "unmount") page.unmount();
    if (retire === "successor") { page.hide(); page.show(); successor = page.open(); }
    page.calls[0]!.succeed(); await old;
    assert.equal(successes, 0, retire);
    if (successor) { page.calls[1]!.succeed(); await successor; }
  }
});

test("synchronous native dispatch rejection releases its lock and preserves feedback variants", async () => {
  const page = mount(); let failures = 0;
  page.throwDispatch(true); await page.open();
  assert.equal(page.failed(), true);
  await page.open("/content/settings/index", phase => { if (phase === "failure") failures++; });
  assert.equal(failures, 1); assert.equal(page.failed(), false);
  page.throwDispatch(false);
  const retry = page.open(); assert.equal(page.calls.length, 1);
  page.calls[0]!.succeed(); await retry;
});
