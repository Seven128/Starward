import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";
import { createPlanSubscriptionFlow, type PlanSubscriptionState } from "./plan-subscription-flow";
import type { ReminderSubscriptionPrepareData } from "@starward/miniapp-contracts";

function deferred<T>() {
  let resolve!: (value: T) => void, reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
const settle = async () => { for (let n = 0; n < 10; n++) await Promise.resolve(); };
function harness(t: TestContext) {
  let owner: string | null = "user:a", now = Date.now(), failReport = false, recorded = true;
  let prepared: ReminderSubscriptionPrepareData = { state: "READY", challengeId: "challenge-one", scheduleVersion: "schedule-one",
    templateId: "template-test-only", expiresAt: new Date(now + 60_000).toISOString() };
  const native = deferred<unknown>(), preparePending = deferred<{ data: ReminderSubscriptionPrepareData }>();
  let delayPrepare = false, nativeThrows = false;
  const prompts: unknown[] = [], reports: unknown[] = [], preparations: unknown[] = [], states: PlanSubscriptionState[] = [];
  const flow = createPlanSubscriptionFlow({ owner: "user:a", planId: "plan:one", reminderId: "reminder:one", scheduleVersion: "schedule-one",
    currentUser: () => owner, now: () => now,
    prepare: async (...args) => { preparations.push(args); return delayPrepare ? preparePending.promise : { data: prepared }; },
    report: async (...args) => { reports.push(args); if (failReport) throw Error("offline"); return { data: { recorded } }; },
    requestSubscribeMessage: options => { prompts.push(options); if (nativeThrows) throw Error("unavailable"); return native.promise; },
    changed: state => states.push(state),
  });
  t.after(() => flow.dispose());
  return { flow, native, preparePending, prompts, reports, preparations, states,
    get state() { return states.at(-1)!; },
    switchOwner() { owner = "user:b"; }, expire() { now += 120_000; },
    configure(data: ReminderSubscriptionPrepareData) { prepared = data; }, delayPrepare() { delayPrepare = true; },
    reportFails(value = true) { failReport = value; }, unrecorded() { recorded = false; }, nativeThrows() { nativeThrows = true; },
  };
}

test("only the explicit click synchronously opens native authorization, and rapid clicks use one challenge", async t => {
  const h = harness(t);
  await h.flow.prepare();
  assert.deepEqual(h.preparations, [["user:a", "plan:one", "reminder:one"]]);
  assert.equal(h.prompts.length, 0);
  h.flow.authorize();
  assert.deepEqual(h.prompts, [{ tmplIds: ["template-test-only"] }], "native dispatch must occur before returning from the click");
  h.flow.authorize(); await h.flow.prepare();
  assert.equal(h.prompts.length, 1); assert.equal(h.preparations.length, 1);
  h.native.resolve({ errMsg: "requestSubscribeMessage:ok", "template-test-only": "accept" }); await settle();
  assert.deepEqual(h.reports, [["user:a", "challenge-one", "accept"]]);
  assert.equal(h.state.phase, "complete"); assert.match(h.state.detail, /不代表已发送或收到/u);
});

test("report recovery repeats the exact choice without spending another native authorization", async t => {
  const h = harness(t); await h.flow.prepare(); h.reportFails(); h.flow.authorize();
  h.native.resolve({ "template-test-only": "reject" }); await settle();
  assert.equal(h.state.phase, "failed"); assert.equal(h.state.phase === "failed" && h.state.retry, "report");
  h.flow.authorize(); assert.equal(h.prompts.length, 1);
  h.reportFails(false); await h.flow.retryReport();
  assert.deepEqual(h.reports, [["user:a", "challenge-one", "reject"], ["user:a", "challenge-one", "reject"]]);
  assert.equal(h.prompts.length, 1); assert.match(h.state.detail, /未授权/u);
});

test("missing, malformed, cancelled and failed native results never invent a rejection or grant", async t => {
  for (const result of [{ errMsg: "requestSubscribeMessage:ok" }, { "another-template": "accept" },
    { "template-test-only": "cancel" }, null, "accept"]) {
    const h = harness(t); await h.flow.prepare(); h.flow.authorize(); h.native.resolve(result); await settle();
    assert.equal(h.reports.length, 0); assert.equal(h.state.phase, "failed"); h.flow.dispose();
  }
  const h = harness(t); await h.flow.prepare(); h.flow.authorize(); h.native.reject(Error("cancelled")); await settle();
  assert.equal(h.reports.length, 0); assert.equal(h.state.phase, "failed");
  const sync = harness(t); await sync.flow.prepare(); sync.nativeThrows(); sync.flow.authorize();
  assert.equal(sync.reports.length, 0); assert.equal(sync.state.phase, "failed");
});

test("each explicit platform choice is reported exactly, while unrecorded accepts are not success", async t => {
  for (const choice of ["accept", "reject", "ban", "filter"] as const) {
    const h = harness(t); await h.flow.prepare(); h.flow.authorize(); h.native.resolve({ "template-test-only": choice }); await settle();
    assert.deepEqual(h.reports, [["user:a", "challenge-one", choice]]); h.flow.dispose();
  }
  const h = harness(t); h.unrecorded(); await h.flow.prepare(); h.flow.authorize(); h.native.resolve({ "template-test-only": "accept" }); await settle();
  assert.equal(h.state.phase, "failed"); assert.match(h.state.detail, /未获确认/u);
});

test("unavailable, changed schedules and expired challenges cannot trigger a native prompt", async t => {
  for (const data of [{ state: "UNAVAILABLE", reason: "NOT_CONFIGURED" },
    { state: "READY", challengeId: "c", scheduleVersion: "other", templateId: "t", expiresAt: new Date(Date.now() + 60_000).toISOString() },
    { state: "READY", challengeId: "c", scheduleVersion: "schedule-one", templateId: "t", expiresAt: "bad" }] as ReminderSubscriptionPrepareData[]) {
    const h = harness(t); h.configure(data); await h.flow.prepare(); h.flow.authorize(); assert.equal(h.prompts.length, 0); h.flow.dispose();
  }
  const h = harness(t); await h.flow.prepare(); h.expire(); h.flow.authorize(); assert.equal(h.prompts.length, 0);
  const pending = harness(t); await pending.flow.prepare(); pending.flow.authorize(); pending.expire();
  pending.native.resolve({ "template-test-only": "accept" }); await settle(); assert.equal(pending.reports.length, 0);
});

test("owner changes and dialog retirement discard pending preparation and native choices", async t => {
  for (const retire of ["account", "dialog"] as const) {
    const h = harness(t); h.delayPrepare(); const preparing = h.flow.prepare();
    if (retire === "account") h.switchOwner(); else h.flow.dispose();
    const count = h.states.length;
    h.preparePending.resolve({ data: { state: "READY", challengeId: "c", scheduleVersion: "schedule-one", templateId: "t", expiresAt: new Date(Date.now() + 60_000).toISOString() } });
    await preparing; h.flow.authorize(); assert.equal(h.states.length, count); assert.equal(h.prompts.length, 0);
    const native = harness(t); await native.flow.prepare(); native.flow.authorize();
    if (retire === "account") native.switchOwner(); else native.flow.dispose();
    const nativeCount = native.states.length; native.native.resolve({ "template-test-only": "accept" }); await settle();
    assert.equal(native.states.length, nativeCount); assert.equal(native.reports.length, 0);
  }
});

test("the challenge timer removes click eligibility and is released with its dialog", async t => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const h = harness(t); await h.flow.prepare();
  t.mock.timers.tick(60_000);
  assert.equal(h.state.phase, "failed"); h.flow.authorize(); assert.equal(h.prompts.length, 0);
  const retired = harness(t); await retired.flow.prepare(); retired.flow.dispose();
  const count = retired.states.length; t.mock.timers.tick(60_000); assert.equal(retired.states.length, count);
});
