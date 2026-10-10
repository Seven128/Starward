import assert from "node:assert/strict";
import test from "node:test";
import type { SpotId } from "@starward/miniapp-contracts";
import { createSpotNavigationController, currentNavigationResource, currentNavigationSiteResource,
  type SpotNavigationSnapshot, type SpotNavigationFailure } from "./spot-navigation-controller";

function deferred<T>() {
  let resolve!: (value: T) => void, reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function navigationSnapshot(): SpotNavigationSnapshot {
  return { scope: "account:1:DAY:page:a", version: "publication:1", available: true,
    spot: { spotId: "spot:a" as SpotId, name: "正式观星点", address: "公开入口", status: "PUBLISHED", visibilityPolicy: "PUBLIC_EXACT",
      gcj02: { system: "GCJ02", latitude: 22.65, longitude: 114.11, derivedFrom: "WGS84", transformVersion: "test" },
      wgs84: { system: "WGS84", latitude: 22.654, longitude: 114.106 } },
    safety: { openness: "OPEN", legalAccess: "PERMITTED", nightSafety: "NO_KNOWN_HAZARD", explicitDanger: false, restrictions: [], guidance: [] } };
}
function harness() {
  let snapshot = navigationSnapshot(), current = true;
  const choice = deferred<"MAP" | "COPY" | null>(), handoff = deferred<boolean>();
  const calls: string[] = [], failures: SpotNavigationFailure[] = [], opened: unknown[] = [], copied: string[] = [], busy: boolean[] = [];
  const actions = {
    handoff: async () => true,
    blocker: async () => true,
    open: async () => undefined as unknown,
    copy: async () => undefined as unknown,
    fallback: async () => true,
  };
  const controller = createSpotNavigationController({ readSnapshot: () => snapshot, isCurrent: () => current,
    confirmHandoff: () => { calls.push("handoff"); return actions.handoff(); },
    confirmBlocker: () => { calls.push("blocker"); return actions.blocker(); },
    chooseAction: async () => { calls.push("options"); return choice.promise; },
    openLocation: async target => { calls.push("map"); opened.push(target); return actions.open(); },
    copyCoordinates: async value => { calls.push("copy"); copied.push(value); return actions.copy(); },
    confirmCopyFallback: () => { calls.push("fallback"); return actions.fallback(); },
    report: failure => failures.push(failure), onAttempt: () => calls.push("attempt"), onBusy: value => busy.push(value),
  });
  return { controller, calls, failures, opened, copied, busy, choice, handoff, actions,
    read: () => snapshot, replace: (value: SpotNavigationSnapshot) => { snapshot = value; }, leave: () => { current = false; } };
}
const tick = () => new Promise<void>(resolve => setImmediate(resolve));

test("direct and menu navigation use current GCJ02 while copying keeps WGS84 distinct", async () => {
  const direct = harness(); await direct.controller.openDirect();
  assert.deepEqual(direct.opened, [{ latitude: 22.65, longitude: 114.11, name: "正式观星点", address: "公开入口", scale: 14 }]);
  const menu = harness(), pending = menu.controller.openOptions(); menu.choice.resolve("COPY"); await pending;
  assert.deepEqual(menu.copied, ["22.654,114.106"]); assert.equal(menu.opened.length, 0);
});

test("invalid or nonpublic coordinates never reach native map or clipboard", async () => {
  for (const change of [
    (s: SpotNavigationSnapshot) => { s.spot!.gcj02 = { ...s.spot!.gcj02, latitude: Number.NaN }; },
    (s: SpotNavigationSnapshot) => { s.spot!.gcj02 = { ...s.spot!.gcj02, longitude: 181 }; },
    (s: SpotNavigationSnapshot) => { s.spot!.gcj02 = { ...s.spot!.gcj02, system: "GCJ-02" as "GCJ02" }; },
    (s: SpotNavigationSnapshot) => { s.spot!.visibilityPolicy = "PUBLIC_APPROXIMATE"; },
    (s: SpotNavigationSnapshot) => { s.spot!.status = "DATA_INSUFFICIENT"; },
  ]) {
    const h = harness(); change(h.read()); await h.controller.openOptions();
    assert.equal(h.failures.length, 1); assert.equal(h.opened.length + h.copied.length, 0); assert.ok(!h.calls.includes("options"));
  }
});

test("missing safety remains unavailable while PARTIAL unknown safety is not fabricated as danger", async () => {
  const missing = harness(); missing.read().safety = null; await missing.controller.openDirect();
  assert.deepEqual(missing.failures, ["SITE"]);
  const partial = harness(); partial.read().safety = { ...partial.read().safety!, openness: "UNKNOWN", legalAccess: "UNKNOWN", nightSafety: "UNKNOWN", explicitDanger: null };
  await partial.controller.openDirect(); assert.equal(partial.opened.length, 1); assert.ok(!partial.calls.includes("blocker"));
});

test("current sky unavailability does not discard independently published navigation facts", () => {
  for (const dataState of ["FRESH", "PARTIAL", "UNAVAILABLE", "EXPIRED", "ESTIMATED"] as const) {
    const resource = { data: { dataState }, error: null, isInvalidated: false };
    assert.equal(currentNavigationResource(resource), true);
    assert.equal(currentNavigationSiteResource(resource), dataState === "FRESH" || dataState === "PARTIAL");
  }
  for (const resource of [
    { data: { dataState: "STALE_USABLE" as const }, error: null, isInvalidated: false },
    { data: { dataState: "SAMPLE_DATA" as const }, error: null, isInvalidated: false },
    { data: { dataState: "FRESH" as const }, error: new Error("refresh failed"), isInvalidated: false },
    { data: { dataState: "FRESH" as const }, error: null, isInvalidated: true },
  ]) assert.equal(currentNavigationResource(resource), false);
});

test("closed or dangerous sites require a successful additional confirmation", async () => {
  for (const mode of ["cancel", "failure", "accept"] as const) {
    const h = harness(); h.read().spot!.status = "TEMPORARILY_CLOSED";
    h.actions.blocker = async () => { if (mode === "failure") throw new Error("modal failure"); return mode === "accept"; };
    await h.controller.openDirect(); assert.ok(h.calls.includes("blocker"));
    assert.equal(h.opened.length, mode === "accept" ? 1 : 0);
    assert.deepEqual(h.failures, mode === "failure" ? ["NATIVE"] : []);
  }
});

test("failed or cancelled options never default to opening a map", async () => {
  for (const error of [new Error("showActionSheet:fail cancel"), { errMsg: "showActionSheet:fail cancel" }, { errMsg: "showActionSheet:fail unavailable" }]) {
    const h = harness(), pending = h.controller.openOptions(); h.choice.reject(error); await pending;
    assert.equal(h.opened.length, 0); assert.deepEqual(h.failures, String(error instanceof Error ? error.message : error.errMsg).includes("cancel") ? [] : ["OPTIONS"]);
  }
});

test("clipboard failure keeps its meaning, and map failure offers bounded copy recovery only for menu navigation", async () => {
  const copy = harness(); copy.actions.copy = async () => { throw new Error("clipboard failure"); };
  const pending = copy.controller.openOptions(); copy.choice.resolve("COPY"); await pending;
  assert.deepEqual(copy.failures, ["COPY"]);
  const recovery = harness(); recovery.actions.open = async () => { throw new Error("map failure"); };
  const recovered = recovery.controller.openOptions(); recovery.choice.resolve("MAP"); await recovered;
  assert.deepEqual(recovery.calls, ["attempt", "handoff", "options", "map", "fallback", "copy"]);
  const direct = harness(); direct.actions.open = recovery.actions.open; await direct.controller.openDirect();
  assert.deepEqual(direct.failures, ["MAP"]); assert.equal(direct.copied.length, 0);
});

test("account, mode, publication, identity and plan revision changes retire pending authorization", async () => {
  for (const change of [
    (s: SpotNavigationSnapshot) => { s.scope = "account:2"; },
    (s: SpotNavigationSnapshot) => { s.scope = "OBSERVATION"; },
    (s: SpotNavigationSnapshot) => { s.version = "plan-revision:2"; },
    (s: SpotNavigationSnapshot) => { s.spot!.visibilityPolicy = "RESTRICTED"; },
    (s: SpotNavigationSnapshot) => { s.safety!.openness = "CLOSED"; },
    (s: SpotNavigationSnapshot) => { s.available = false; },
  ]) {
    const h = harness(); h.actions.handoff = () => h.handoff.promise;
    const pending = h.controller.openDirect(); await tick(); change(h.read()); h.handoff.resolve(true); await pending;
    assert.equal(h.opened.length, 0); assert.deepEqual(h.failures, []);
  }
});

test("red-light cancellation and page departure leave no native effect", async () => {
  const cancel = harness(); cancel.actions.handoff = async () => false; await cancel.controller.openOptions();
  assert.equal(cancel.opened.length, 0); assert.ok(!cancel.calls.includes("options"));
  const left = harness(), pending = left.controller.openOptions(); await tick(); left.leave(); left.choice.resolve("MAP"); await pending;
  assert.equal(left.opened.length, 0); assert.deepEqual(left.failures, []);
});

test("hide and return retain the native operation lock until it settles, then permit retry", async () => {
  const h = harness(), native = deferred<unknown>(); h.actions.open = () => native.promise;
  const pending = h.controller.openDirect(); await tick(); assert.equal(h.opened.length, 1);
  h.controller.hide(); h.controller.show(); await h.controller.openDirect(); assert.equal(h.opened.length, 1);
  native.reject(new Error("late old failure")); await pending; assert.deepEqual(h.failures, []);
  h.actions.open = async () => undefined; await h.controller.openDirect(); assert.equal(h.opened.length, 2);
  assert.deepEqual(h.busy, [true, false, true, false]);
});

test("double taps and disposed owners do not issue duplicate effects or late feedback", async () => {
  const h = harness(); const pending = h.controller.openOptions(); await tick(); await h.controller.openOptions();
  assert.equal(h.calls.filter(call => call === "options").length, 1);
  h.controller.dispose(); h.choice.reject(new Error("late menu failure")); await pending;
  await h.controller.openDirect(); assert.equal(h.opened.length, 0); assert.deepEqual(h.failures, []);
});
