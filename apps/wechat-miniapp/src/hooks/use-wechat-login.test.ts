import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";
import { pagePresentationForTest } from "../navigation/page-presentation-test-support";

async function harness(t: TestContext, primary?: "my") {
  const h = await pagePresentationForTest({ ...(primary ? { primary } : {}), state: { accountOwnerId: null } });
  t.after(() => h.dispose());
  const pending: Array<{ signal: AbortSignal; resolve(value: { userId: string }): void; reject(error: Error): void }> = [];
  h.modules.api = { loginWithWechat: (signal: AbortSignal) => new Promise((resolve, reject) => pending.push({ signal, resolve, reject })) };
  h.modules["@/components/wechat-login"] = { WechatLogin: h.leaf("WechatLogin") };
  const useWechatLogin = h.load("hooks/use-wechat-login.tsx").useWechatLogin;
  let current: any;
  function Probe() { current = useWechatLogin(); return current.dialog; }
  await h.render(Probe);
  return { ...h, pending, current: () => current,
    async requireAccount(run: (id: string) => void, valid = () => true) { await h.update(() => current.requireAccount(run, valid)); },
    async login() { await h.update(() => current.dialog.props.onLogin()); },
    async close() { await h.update(() => current.close()); },
  };
}

test("shortcut login resumes its original valid task once after the account bootstrap", async t => {
  const h = await harness(t), runs: string[] = [];
  await h.requireAccount(id => runs.push(id));
  await h.update(() => { h.current().dialog.props.onLogin(); h.current().dialog.props.onLogin(); });
  assert.equal(h.pending.length, 1);
  await h.bind("a"); h.pending[0]!.resolve({ userId: "a" }); await h.settle();
  assert.deepEqual(runs, ["a"]); assert.equal(h.current().open, false); assert.equal(h.notices.length, 1);
});

test("cancel, hide, unmount and changed task each prevent a late login from running the old action", async t => {
  for (const reason of ["cancel", "hide", "unmount", "changed-task"]) {
    const h = await harness(t); let calls = 0, relevant = true;
    await h.requireAccount(() => calls++, () => relevant); await h.login();
    if (reason === "cancel") await h.close();
    if (reason === "hide") await h.hide();
    if (reason === "unmount") await h.unmount();
    if (reason === "changed-task") relevant = false;
    if (reason !== "changed-task") assert.equal(h.pending[0]!.signal.aborted, true);
    h.pending[0]!.resolve({ userId: "a" }); await h.settle();
    assert.equal(calls, 0, reason); assert.equal(h.notices.length, 0, reason);
    await h.dispose();
  }
});

test("failed shortcut login stays retryable without running its task", async t => {
  const h = await harness(t); let calls = 0;
  await h.requireAccount(() => calls++); await h.login();
  h.pending[0]!.reject(Error("unavailable")); await h.settle();
  assert.equal(h.current().dialog.props.failed, true); assert.equal(h.current().dialog.props.busy, false);
  await h.login(); await h.bind("a"); h.pending[1]!.resolve({ userId: "a" }); await h.settle();
  assert.equal(calls, 1);
});

test("logical My hide cancels login on the same native Map and returning cannot resume it", async t => {
  const h = await harness(t, "my"); let calls = 0;
  await h.requireAccount(() => calls++); await h.login();
  await h.update(() => h.controller.closeMy());
  assert.equal(h.pending[0]!.signal.aborted, true); assert.equal(h.current().open, false);
  await h.update(() => h.controller.openMy()); await h.bind("a");
  h.pending[0]!.resolve({ userId: "a" }); await h.settle();
  assert.equal(calls, 0); assert.equal(h.notices.length, 0);
});
