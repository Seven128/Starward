import assert from "node:assert/strict";
import test from "node:test";
import { createPrimaryNavigationController, type PrimaryNativePage } from "./primary-navigation-controller";
import { primaryPageNavigationForTest } from "./primary-page-navigation-test-support";

const MAP = "pages/map/index", MY = "pages/my/index";
function deferred() {
  let resolve!: () => void, reject!: (error: unknown) => void;
  const promise = new Promise<void>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function harness(initial?: PrimaryNativePage[]) {
  const map = { route: MAP }, child = { route: "spot/search/index" };
  let stack = initial ?? [map], operation = deferred();
  const calls: unknown[] = [];
  const native = {
    getCurrentPages: () => stack,
    navigateBack: (options: { delta: number }) => { calls.push({ kind: "back", ...options }); return operation.promise; },
    reLaunch: (options: { url: string }) => { calls.push({ kind: "root", ...options }); return operation.promise; },
  };
  const dispatcher = primaryPageNavigationForTest(native);
  const createHost = () => createPrimaryNavigationController({ currentPage: () => stack.at(-1) });
  const controller = createHost();
  const detach = dispatcher.registerPrimaryMapHost(controller);
  return { map, child, calls, dispatcher, controller, detach, createHost,
    operation: () => operation, renew() { operation = deferred(); },
    setStack(value: PrimaryNativePage[]) { stack = value; } };
}
const tick = async () => { await Promise.resolve(); await Promise.resolve(); };

test("actual dispatcher opens and reverses My on its exact Map without native navigation", async () => {
  const h = harness(); h.controller.show(h.map);
  const original = h.dispatcher.readPagePresentationIdentity(h.map);
  await h.dispatcher.openPrimaryPage("/pages/my/index");
  const my = h.dispatcher.readPagePresentationIdentity(h.map, MY);
  assert.ok(my && my !== original);
  assert.equal(h.controller.getSnapshot().phase, "opening");
  assert.equal(h.dispatcher.currentPresentedPageRoute(), MY);
  assert.equal(h.dispatcher.isPagePresentationForeground(h.map, MAP), false);
  assert.equal(h.dispatcher.isPagePresentationForeground(h.map, MY), true);
  const first = h.controller.getSnapshot();
  await h.dispatcher.openPrimaryPage("/pages/my/index");
  assert.equal(h.controller.getSnapshot(), first);
  await h.dispatcher.openPrimaryPage("/pages/map/index");
  assert.equal(h.controller.getSnapshot().phase, "closing");
  assert.equal(h.controller.finishTransition(first.transitionTicket!), false);
  assert.equal(h.dispatcher.currentPresentedPageRoute(), MAP);
  assert.equal(h.dispatcher.isPagePresentationForeground(h.map, MAP), false, "Map resumes after the My exit completes");
  h.controller.finishTransition(h.controller.getSnapshot().transitionTicket!);
  assert.equal(h.dispatcher.isPagePresentationForeground(h.map, MAP), true);
  assert.equal(h.dispatcher.readPagePresentationIdentity(h.map, MY), null);
  assert.deepEqual(h.calls, []);
});

test("a captured native return waits for Map show and merges latest primary intent without resending", async () => {
  const h = harness(); h.controller.show(h.map); h.controller.openMy();
  const activation = h.controller.presentationIdentity(MY);
  h.controller.hide(); h.setStack([h.map, h.child, { route: "content/article/detail/index" }]);
  const first = h.dispatcher.openPrimaryPage("/pages/map/index");
  const last = h.dispatcher.openPrimaryPage("/pages/my/index");
  assert.equal(first, last); assert.deepEqual(h.calls, [{ kind: "back", delta: 2 }]);
  h.operation().resolve(); await tick();
  let completed = false; void first.then(() => { completed = true; });
  await tick(); assert.equal(completed, false, "native acceptance does not invent show");
  assert.equal(h.dispatcher.currentPresentedPageRoute(h.map), MAP, "a hidden Map cannot expose logical My");
  h.setStack([h.map]); await tick();
  assert.equal(completed, false, "merely changing the stack does not fire host show");
  h.controller.show(h.map); await first;
  assert.equal(h.controller.presentationIdentity(MY), activation, "ordinary native child return keeps logical activation");
  assert.equal(h.dispatcher.currentPresentedPageRoute(), MY);
  assert.equal(h.calls.length, 1);
});

test("show before native acceptance cannot commit a failed handoff and a later retry is allowed", async () => {
  const h = harness(); h.controller.show(h.map); const mapActivation = h.controller.presentationIdentity(MAP);
  h.controller.hide(); h.setStack([h.map, h.child]);
  const first = h.dispatcher.openPrimaryPage("/pages/my/index");
  const rejected = assert.rejects(first, /rejected/);
  h.setStack([h.map]); h.controller.show(h.map);
  assert.equal(h.controller.getSnapshot().route, MAP);
  h.operation().reject(new Error("native return rejected")); await rejected;
  assert.equal(h.controller.presentationIdentity(MAP), mapActivation);
  h.renew(); h.controller.hide(); h.setStack([h.map, h.child]);
  const retry = h.dispatcher.openPrimaryPage("/pages/my/index");
  h.operation().resolve(); await tick(); h.setStack([h.map]); h.controller.show(h.map); await retry;
  assert.equal(h.controller.getSnapshot().route, MY);
  assert.equal(h.calls.length, 2);
});

test("missing Map relaunches one Map root, then actual registration/show applies latest target", async () => {
  const direct = { route: "content/plan/detail/index" }, h = harness([direct]);
  const opening = h.dispatcher.openPrimaryPage("/pages/my/index");
  assert.deepEqual(h.calls, [{ kind: "root", url: "/pages/map/index" }]);
  h.operation().resolve(); await tick();
  const map = { route: MAP }; h.setStack([map]);
  const newHost = h.createHost(), detachNew = h.dispatcher.registerPrimaryMapHost(newHost);
  h.detach();
  assert.equal(h.dispatcher.getPrimaryMapPresentationSnapshot(), newHost.getSnapshot(), "old detach cannot remove replacement host");
  assert.equal(newHost.getSnapshot().route, MAP);
  newHost.show(map); await opening;
  assert.equal(newHost.getSnapshot().route, MY);
  assert.equal(h.dispatcher.currentPresentedPageRoute(), MY);
  assert.equal(h.calls.length, 1);
  detachNew(); assert.equal(h.dispatcher.getPrimaryMapPresentationSnapshot(), null);
});

test("a current Map waiting for its first show never relaunches or fabricates activation", async () => {
  const h = harness(); const opened = h.dispatcher.openPrimaryPage("/pages/my/index");
  assert.equal(h.controller.presentationIdentity(MAP), null);
  assert.deepEqual(h.calls, []);
  h.controller.show(h.map); await opened;
  assert.equal(h.controller.getSnapshot().route, MY);
});

test("native direct My remains a no-op destination and returning Map recovers a root", async () => {
  const direct = { route: MY }, h = harness([direct]);
  await h.dispatcher.openPrimaryPage("/pages/my/index"); assert.deepEqual(h.calls, []);
  assert.equal(h.dispatcher.readPagePresentationIdentity(direct), direct);
  assert.equal(h.dispatcher.isPagePresentationForeground(direct), true);
  const returning = h.dispatcher.openPrimaryPage("/pages/map/index");
  h.operation().resolve(); await tick();
  const map = { route: MAP }, controller = h.createHost(); h.setStack([map]);
  h.dispatcher.registerPrimaryMapHost(controller); controller.show(map); await returning;
  assert.equal(controller.getSnapshot().route, MAP);
  assert.deepEqual(h.calls, [{ kind: "root", url: "/pages/map/index" }]);
});

test("a different Map instance cannot satisfy a captured native opener", async () => {
  const h = harness(); h.controller.show(h.map); h.controller.hide(); h.setStack([h.map, h.child]);
  const opening = h.dispatcher.openPrimaryPage("/pages/my/index"), rejected = assert.rejects(opening, /destination_retired/);
  h.operation().resolve(); await tick();
  const replacement = { route: MAP }, replacementHost = h.createHost(); h.setStack([replacement]);
  h.dispatcher.registerPrimaryMapHost(replacementHost); replacementHost.show(replacement); await rejected;
  assert.equal(replacementHost.getSnapshot().route, MAP);
  assert.equal(h.calls.length, 1);
});

test("global presentation subscription exposes stable snapshots and exact native child identities", async () => {
  const h = harness(), changes: unknown[] = [];
  const stop = h.dispatcher.subscribePrimaryMapPresentation(() => changes.push(h.dispatcher.getPrimaryMapPresentationSnapshot()));
  h.controller.show(h.map); const first = h.dispatcher.getPrimaryMapPresentationSnapshot();
  assert.equal(first, h.dispatcher.getPrimaryMapPresentationSnapshot()); assert.equal(Object.isFrozen(first), true);
  h.controller.show(h.map); assert.equal(changes.length, 1);
  await h.dispatcher.openPrimaryPage("/pages/my/index");
  const activation = h.dispatcher.readPagePresentationIdentity(h.map, MY);
  h.setStack([h.map, h.child]); h.controller.hide();
  assert.equal(h.dispatcher.currentPresentedPageRoute(), h.child.route);
  assert.equal(h.dispatcher.readPagePresentationIdentity(h.child), h.child);
  assert.equal(h.dispatcher.isPagePresentationForeground(h.map, MY), false);
  assert.equal(h.dispatcher.isPagePresentationForeground(h.child), true);
  assert.equal(h.dispatcher.readPagePresentationIdentity(h.map, MY), activation);
  h.setStack([h.map]); h.controller.show(h.map);
  assert.equal(h.dispatcher.readPagePresentationIdentity(h.map, MY), activation);
  h.detach(); assert.equal(h.dispatcher.getPrimaryMapPresentationSnapshot(), null);
  const count = changes.length; stop(); h.controller.closeMy(); assert.equal(changes.length, count);
});

test("synchronous native failure and invalid destinations reject without committing presentation", async () => {
  const native = { getCurrentPages: () => [], reLaunch() { throw new Error("not accepted"); } };
  const dispatcher = primaryPageNavigationForTest(native);
  await assert.rejects(dispatcher.openPrimaryPage("/pages/my/index"), /not accepted/);
  await assert.rejects(dispatcher.openPrimaryPage("/pages/other/index" as never), /invalid_destination/);
  assert.equal(dispatcher.getPrimaryMapPresentationSnapshot(), null);
});

test("returning to the native direct My waits for that exact real show and preserves the Page", async () => {
  const direct = { route: MY, scroll: 719 }, child = { route: "content/plan/detail/index" }, h = harness([direct, child]);
  const returning = h.dispatcher.openPrimaryPage("/pages/my/index");
  const repeat = h.dispatcher.openPrimaryPage("/pages/my/index"); assert.equal(repeat, returning);
  assert.deepEqual(h.calls, [{ kind: "back", delta: 1 }]);
  h.operation().resolve(); await tick(); h.setStack([direct]);
  let complete = false; void returning.then(() => { complete = true; }); await tick();
  assert.equal(complete, false, "acceptance and stack projection do not invent the My native show");
  h.dispatcher.showPrimaryNativePage(direct); await returning;
  assert.equal(direct.scroll, 719); assert.equal(h.dispatcher.readPagePresentationIdentity(direct), direct);
  assert.equal(h.calls.length, 1); assert.equal(h.controller.getSnapshot().route, MAP);
});

test("a latest Map intent waits for accepted direct My arrival before its one necessary Map return", async () => {
  const h = harness(), direct = { route: MY, scroll: 544 };
  h.controller.show(h.map); h.controller.hide(); h.setStack([h.map, direct, h.child]);
  const returning = h.dispatcher.openPrimaryPage("/pages/my/index");
  h.operation().resolve(); await tick();
  assert.equal(h.dispatcher.openPrimaryPage("/pages/map/index"), returning);
  assert.deepEqual(h.calls, [{ kind: "back", delta: 1 }]);
  h.renew(); h.setStack([h.map, direct]); h.dispatcher.showPrimaryNativePage(direct);
  assert.deepEqual(h.calls, [{ kind: "back", delta: 1 }, { kind: "back", delta: 1 }]);
  assert.equal(direct.scroll, 544);
  h.operation().resolve(); await tick();
  let complete = false; void returning.then(() => { complete = true; }); await tick(); assert.equal(complete, false);
  h.setStack([h.map]); h.controller.show(h.map); await returning;
  assert.equal(h.controller.getSnapshot().route, MAP); assert.equal(h.calls.length, 2);
});

test("a new My intent during the necessary Map recovery retargets the same handoff without a third native operation", async () => {
  const direct = { route: MY }, h = harness([direct, { route: "content/plan/detail/index" }]);
  const returning = h.dispatcher.openPrimaryPage("/pages/my/index");
  h.dispatcher.openPrimaryPage("/pages/map/index");
  h.setStack([direct]); h.dispatcher.showPrimaryNativePage(direct);
  assert.equal(h.calls.length, 1, "My show before acceptance does not start the next native handoff");
  const first = h.operation(); h.renew(); first.resolve(); await tick();
  assert.deepEqual(h.calls, [{ kind: "back", delta: 1 }, { kind: "root", url: "/pages/map/index" }]);
  assert.equal(h.dispatcher.openPrimaryPage("/pages/my/index"), returning);
  h.operation().resolve(); await tick();
  const map = { route: MAP }, controller = h.createHost(); h.setStack([map]);
  h.dispatcher.registerPrimaryMapHost(controller); controller.show(map); await returning;
  assert.equal(controller.getSnapshot().route, MY); assert.equal(h.calls.length, 2);
});

test("failure of a distinct Map recovery keeps the actually shown native My and permits retry", async () => {
  const direct = { route: MY, scroll: 283 }, h = harness([direct, { route: "content/settings/index" }]);
  const returning = h.dispatcher.openPrimaryPage("/pages/my/index"), rejected = assert.rejects(returning, /root rejected/);
  h.dispatcher.openPrimaryPage("/pages/map/index");
  h.operation().resolve(); await tick(); h.renew(); h.setStack([direct]); h.dispatcher.showPrimaryNativePage(direct);
  h.operation().reject(new Error("native root rejected")); await rejected;
  assert.equal(h.dispatcher.currentPresentedPageRoute(), MY); assert.equal(direct.scroll, 283);
  assert.equal(h.controller.getSnapshot().route, MAP, "a failed native operation cannot select a logical presentation");
  h.renew(); const retry = h.dispatcher.openPrimaryPage("/pages/map/index");
  h.operation().resolve(); await tick();
  const map = { route: MAP }, controller = h.createHost(); h.setStack([map]);
  h.dispatcher.registerPrimaryMapHost(controller); controller.show(map); await retry;
  assert.equal(controller.getSnapshot().route, MAP); assert.equal(h.calls.length, 3);
});

test("an unavailable stack observation leaves an accepted operation pending without resending", async () => {
  const map = { route: MAP }, child = { route: "spot/search/index" }, operation = deferred();
  let stack = [map], unavailable = false, calls = 0;
  const current = () => { if (unavailable) throw new Error("native stack unavailable"); return stack; };
  const dispatcher = primaryPageNavigationForTest({ getCurrentPages: current,
    navigateBack: () => { calls++; return operation.promise; } });
  const controller = createPrimaryNavigationController({ currentPage: () => current().at(-1) });
  dispatcher.registerPrimaryMapHost(controller); controller.show(map); controller.hide(); stack = [map, child];
  const returning = dispatcher.openPrimaryPage("/pages/my/index");
  operation.resolve(); await tick(); unavailable = true;
  assert.equal(dispatcher.openPrimaryPage("/pages/map/index"), returning);
  dispatcher.showPrimaryNativePage(map);
  assert.equal(controller.show(map), false); assert.equal(dispatcher.isPagePresentationForeground(map), false);
  assert.equal(dispatcher.currentPresentedPageRoute(map), MAP);
  assert.equal(calls, 1);
  unavailable = false; stack = [map]; controller.show(map); await returning;
  assert.equal(controller.getSnapshot().route, MAP); assert.equal(calls, 1);
});
