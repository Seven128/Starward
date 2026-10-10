import assert from "node:assert/strict";
import test from "node:test";
import { createPrimaryNavigationController, type PrimaryNavigationState } from "./primary-navigation-controller";
import { primaryNavigationLayout } from "./primary-navigation";

function deferred() {
  let resolve!: () => void, reject!: (error: unknown) => void;
  const promise = new Promise<void>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function harness() {
  const map = { route: "pages/map/index" }, my = { route: "pages/my/index" };
  let page = map, next = deferred();
  const changes: PrimaryNavigationState[] = [], calls: string[] = [];
  const navigation = createPrimaryNavigationController({
    currentPage: () => page,
    switchTab: url => { calls.push(url); return next.promise; },
    changed: state => changes.push(state),
  });
  return { map, my, navigation, changes, calls, current: () => changes.at(-1)!, next: () => next,
    setPage(value: { route: string }) { page = value; }, renew() { next = deferred(); } };
}

test("selection comes from a real page show, including an independent tab instance", async () => {
  const h = harness(); h.navigation.show(h.map);
  const opened = h.navigation.open("pages/my/index");
  assert.equal(h.current().route, "pages/map/index"); assert.equal(h.current().pending, "pages/my/index");
  h.setPage(h.my); h.next().resolve(); await opened;
  assert.equal(h.current().route, "pages/map/index", "a successful promise cannot invent a selected page");
  const other = harness(); other.setPage(h.my); other.navigation.show(h.my);
  assert.equal(other.current().route, "pages/my/index");
  other.navigation.show(other.map); assert.equal(other.current().route, "pages/my/index", "hidden pages cannot claim selection");
});

test("a failed switch retains the current page, presents retry, and permits a new attempt", async () => {
  const h = harness(); h.navigation.show(h.map);
  const first = h.navigation.open("pages/my/index"); h.next().reject(new Error("route rejected")); await first;
  assert.deepEqual(h.current(), { route: "pages/map/index", pending: null, failed: "pages/my/index" });
  h.renew(); const retry = h.navigation.open("pages/my/index");
  assert.equal(h.current().failed, null); h.setPage(h.my); h.navigation.hide(); h.next().resolve(); await retry;
  assert.deepEqual(h.calls, ["/pages/my/index", "/pages/my/index"]);
});

test("repeat taps cannot dispatch concurrent switches or reselect the current page", async () => {
  const h = harness(); h.navigation.show(h.map); await h.navigation.open("pages/map/index");
  assert.equal(h.calls.length, 0);
  const first = h.navigation.open("pages/my/index"); await h.navigation.open("pages/my/index");
  assert.equal(h.calls.length, 1); h.next().reject(new Error("fail")); await first;
});

test("same-page layout resync retains an in-flight switch and its retry feedback", async () => {
  const h = harness(); h.navigation.show(h.map);
  const first = h.navigation.open("pages/my/index");
  h.navigation.show(h.map); h.navigation.show(h.map);
  const resynced = h.current();
  const repeated = h.navigation.open("pages/my/index");
  h.next().reject(new Error("native switch rejected after resize"));
  await Promise.all([first, repeated]);
  assert.equal(resynced.pending, "pages/my/index");
  assert.equal(h.calls.length, 1, "a layout resync must not permit another native switch");
  assert.deepEqual(h.current(), { route: "pages/map/index", pending: null, failed: "pages/my/index" });
  h.navigation.show(h.map);
  assert.equal(h.current().failed, "pages/my/index", "resizing must not erase useful retry feedback");
  h.navigation.hide(); h.navigation.show(h.map);
  assert.deepEqual(h.current(), { route: "pages/map/index", pending: null, failed: null });
});

test("a late rejection after child navigation, hide, return or destruction cannot change current feedback", async () => {
  for (const retire of ["hide", "return", "new-page", "dispose"] as const) {
    const h = harness(); h.navigation.show(h.map); const first = h.navigation.open("pages/my/index");
    if (retire === "dispose") h.navigation.dispose();
    else if (retire === "new-page") h.setPage({ route: "pages/map/index" });
    else { h.navigation.hide(); if (retire === "return") h.navigation.show(h.map); }
    const count = h.changes.length; h.next().reject(new Error("obsolete")); await first;
    assert.equal(h.changes.length, count, retire);
    assert.equal(h.current().failed, null, retire);
  }
});

test("page and bar reserve the same valid native safe area; missing metrics preserve CSS fallback", () => {
  const info = { windowHeight: 844, screenHeight: 844, safeArea: { bottom: 810 } };
  const map = primaryNavigationLayout("pages/map/index", info), my = primaryNavigationLayout("pages/my/index", info);
  assert.equal(map.pageHeight, 756); assert.equal(map.style["--primary-nav-height"], "88px");
  assert.equal(my.pageHeight, 757); assert.equal(my.style["--primary-nav-height"], "87px");
  for (const invalid of [{}, { screenHeight: NaN, safeArea: { bottom: 0 } }, { screenHeight: 844, safeArea: { bottom: 845 } }]) {
    const layout = primaryNavigationLayout("pages/map/index", invalid);
    assert.equal(layout.pageHeight, undefined); assert.ok(layout.style["--primary-nav-bottom"].includes("env(safe-area-inset-bottom)"));
  }
  const resized = primaryNavigationLayout("pages/map/index", { windowHeight: 600, screenHeight: 600, safeArea: { bottom: 600 } });
  assert.equal(resized.pageHeight, 528); assert.equal(resized.style["--primary-nav-height"], "72px");
});
