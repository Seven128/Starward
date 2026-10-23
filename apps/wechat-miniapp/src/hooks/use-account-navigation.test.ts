import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";
import { pagePresentationForTest } from "../navigation/page-presentation-test-support";

type Feedback = (phase: "start" | "success" | "failure") => void;
async function mount(t: TestContext, primary?: "my") {
  const h = await pagePresentationForTest(primary ? { primary } : {});
  t.after(() => h.dispose());
  const useAccountNavigation = h.load("hooks/use-account-navigation.ts").useAccountNavigation;
  let current: any;
  function Probe() {
    const state = h.React.useSyncExternalStore(h.store.subscribe, h.store.getState, h.store.getState);
    current = useAccountNavigation(state.accountOwnerId);
    return null;
  }
  await h.render(Probe);
  const wrap = (captured: any) => ({ ...captured, open(url: string, feedback?: Feedback, owner?: string) {
    return Promise.resolve(captured.open(url, feedback, owner)).then(() => h.settle());
  } });
  return { ...h, open: (url = "/content/plan/detail/index?planId=a", feedback?: Feedback) => wrap(current).open(url, feedback),
    capture: () => wrap(current), failed: () => current.navigationError,
    switchOwner: h.bind, mismatch: () => h.mismatchIdentity("b"), leavePage: h.replacePage,
  };
}

test("a guest entry can resume after its explicit login without authorizing a stale account entry", async t => {
  const page = await mount(t);
  await page.switchOwner(null); const guest = page.capture(); await page.switchOwner("a");
  const resumed = guest.open("/content/plan/list/index", undefined, "a");
  assert.equal(page.calls.length, 1); page.calls[0]!.succeed(); await resumed;
  const oldAccount = page.capture(); await page.switchOwner("b");
  await oldAccount.open("/content/plan/list/index", undefined, "b");
  assert.equal(page.calls.length, 1, "the bootstrap allowance cannot override a previously bound identity");
});

test("normal failure is visible, can retry, and same-attempt repeat is bounded", async t => {
  const page = await mount(t);
  const first = page.open(); await page.open(); assert.equal(page.calls.length, 1);
  page.calls[0]!.fail(); await first; assert.equal(page.failed(), true);
  const retry = page.open(); await page.settle(); assert.equal(page.failed(), false);
  page.calls[1]!.succeed(); await retry; assert.equal(page.failed(), false);
});

test("late old-account failure cannot affect the current page", async t => {
  const page = await mount(t), old = page.open();
  await page.switchOwner("b"); page.calls[0]!.fail(); await old; assert.equal(page.failed(), false);
});

test("scope retirement releases old busy but old finally cannot release successor", async t => {
  const page = await mount(t), old = page.open();
  await page.switchOwner("b"); const current = page.open("/content/plan/detail/index?planId=b");
  assert.equal(page.calls.length, 2); page.calls[0]!.fail(); await old; await page.open();
  assert.equal(page.calls.length, 2); assert.equal(page.failed(), false);
  page.calls[1]!.fail(); await current; assert.equal(page.failed(), true);
});

test("hide/show permanently retires old failure and allows a fresh navigation", async t => {
  const page = await mount(t), old = page.open();
  await page.hide(); await page.open(); assert.equal(page.calls.length, 1);
  await page.show(); const next = page.open(); assert.equal(page.calls.length, 2);
  page.calls[0]!.fail(); await old; assert.equal(page.failed(), false); page.calls[1]!.succeed(); await next;
});

test("batched account ABA does not resurrect old attempt", async t => {
  const page = await mount(t), old = page.open();
  await page.switchOwner("b"); await page.switchOwner("a"); page.calls[0]!.fail(); await old;
  assert.equal(page.failed(), false);
});

test("unmount releases subscription and no late failure writes state", async t => {
  const page = await mount(t), old = page.open();
  await page.unmount(); assert.equal(page.listeners.size, 0);
  page.calls[0]!.fail(); await old; assert.equal(page.failed(), false);
  await page.open(); assert.equal(page.calls.length, 1);
});

test("changed native identity or active page cannot claim navigation feedback", async t => {
  const page = await mount(t), old = page.open();
  page.leavePage(); page.calls[0]!.fail(); await old; assert.equal(page.failed(), false);
  page.mismatch(); await page.open(); assert.equal(page.calls.length, 1);
});

test("new-plan navigation remains available in a coherent anonymous scope", async t => {
  const page = await mount(t); await page.switchOwner(null);
  const navigation = page.open("/content/plan/edit/index?new=1");
  assert.equal(page.calls.length, 1); page.calls[0]!.succeed(); await navigation;
});

test("an unavailable current page reports recovery without dispatching navigation", async t => {
  const page = await mount(t); page.emptyStack(); await page.open();
  assert.equal(page.calls.length, 0); assert.equal(page.failed(), true);
});

test("accepted handoff cleanup can cross its normal page hide while failed UI cannot", async t => {
  const page = await mount(t); let successes = 0, failures = 0;
  const old = page.open("/content/settings/index", phase => { if (phase === "success") successes++; if (phase === "failure") failures++; });
  await page.hide(); page.leavePage(); page.calls[0]!.succeed(); await old;
  assert.equal(successes, 1); assert.equal(failures, 0);
  page.restoreStack(); await page.show();
  const rejected = page.open("/content/settings/index", phase => { if (phase === "failure") failures++; });
  await page.hide(); page.calls[1]!.fail(); await rejected; assert.equal(failures, 0);
});

test("account ABA, unmount and successor attempts permanently retire old success effects", async t => {
  for (const retire of ["aba", "unmount", "successor"] as const) {
    const page = await mount(t); let successes = 0;
    const old = page.open("/content/settings/index", phase => { if (phase === "success") successes++; });
    let successor: Promise<void> | undefined;
    if (retire === "aba") { await page.switchOwner("b"); await page.switchOwner("a"); }
    if (retire === "unmount") await page.unmount();
    if (retire === "successor") { await page.hide(); await page.show(); successor = page.open(); }
    page.calls[0]!.succeed(); await old; assert.equal(successes, 0, retire);
    if (successor) { page.calls[1]!.succeed(); await successor; }
    await page.dispose();
  }
});

test("synchronous native dispatch rejection releases its lock and preserves feedback variants", async t => {
  const page = await mount(t); let failures = 0;
  page.throwDispatch(); await page.open(); assert.equal(page.failed(), true);
  await page.open("/content/settings/index", phase => { if (phase === "failure") failures++; });
  assert.equal(failures, 1); assert.equal(page.failed(), false);
  page.throwDispatch(false); const retry = page.open(); assert.equal(page.calls.length, 1);
  page.calls[0]!.succeed(); await retry;
});

test("same native Map cannot revive account navigation after logical My ABA", async t => {
  const page = await mount(t, "my"); let successes = 0;
  const old = page.open("/content/settings/index", phase => { if (phase === "success") successes++; });
  await page.update(() => page.controller.closeMy());
  await page.update(() => page.controller.openMy());
  page.calls[0]!.succeed(); await old; assert.equal(successes, 0);
  const next = page.open(); assert.equal(page.calls.length, 2);
  page.calls[1]!.fail(); await next; assert.equal(page.failed(), true);
});
