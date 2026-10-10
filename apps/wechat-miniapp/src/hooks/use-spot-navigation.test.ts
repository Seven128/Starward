import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import type { SpotId } from "@starward/miniapp-contracts";
import { createSpotNavigationController, spotNavigationFeedback, type SpotNavigationSnapshot } from "../navigation/spot-navigation-controller";

function mount() {
  const parent = { route: "spot/site/index" }, child = { route: "content/article/index" };
  let active = parent, refIndex = 0, busy = false, cleanup: (() => void) | undefined;
  let shown!: () => void, hidden!: () => void, choose!: (value: { tapIndex: number }) => void;
  let menuFailure: unknown = null;
  const choice = new Promise<{ tapIndex: number }>(resolve => { choose = resolve; });
  const refs: Array<{ current: unknown }> = [], opened: unknown[] = [];
  const listeners = new Set<(current: typeof state, previous: typeof state) => void>();
  const state = {
    mode: "DAY", mapResetVersion: 1,
    notifications: [
      { id: "unrelated", owner: "spot-detail", dedupeKey: "guide-failed" },
      { id: "other-page", owner: "map", dedupeKey: "spot-navigation:MAP" },
    ],
    notify: (intent: { owner: string; dedupeKey: string }) => { state.notifications.push({ id: `notice:${state.notifications.length}`, owner: intent.owner, dedupeKey: intent.dedupeKey }); },
    dismissNotification: (id: string) => { state.notifications = state.notifications.filter(item => item.id !== id); },
  };
  const store = { getState: () => state, subscribe: (listener: (current: typeof state, previous: typeof state) => void) => {
    listeners.add(listener); return () => listeners.delete(listener);
  } };
  const snapshot: SpotNavigationSnapshot = { scope: "scope:a", version: "publication:1", available: true,
    spot: { spotId: "spot:a" as SpotId, name: "正式点", address: "入口", status: "PUBLISHED", visibilityPolicy: "PUBLIC_EXACT",
      gcj02: { system: "GCJ02", latitude: 22.65, longitude: 114.11, derivedFrom: "WGS84", transformVersion: "test" },
      wgs84: { system: "WGS84", latitude: 22.654, longitude: 114.106 } },
    safety: { openness: "OPEN", legalAccess: "PERMITTED", nightSafety: "NO_KNOWN_HAZARD", explicitDanger: false, restrictions: [], guidance: [] } };
  const module = { exports: {} as { useSpotNavigationCommand(options: unknown): { busy: boolean; openDirect(): Promise<void>; openOptions(): Promise<void> } } };
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL("./use-spot-navigation.ts", import.meta.url), "utf8"), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText, { module, exports: module.exports,
    require: (name: string) => name === "react" ? {
      useRef: (value: unknown) => refs[refIndex++] ??= { current: value },
      useState: () => [busy, (value: boolean) => { busy = value; }],
      useEffect: (setup: () => () => void) => { cleanup ??= setup(); },
    } : name === "@tarojs/taro" ? { __esModule: true,
      useDidShow: (callback: () => void) => { shown = callback; }, useDidHide: (callback: () => void) => { hidden = callback; },
      default: { getCurrentInstance: () => ({ page: active }), getCurrentPages: () => [active],
        showActionSheet: async () => { if (menuFailure) throw menuFailure; return choice; },
        showModal: async () => ({ confirm: true }), openLocation: async (target: unknown) => { opened.push(target); }, setClipboardData: async () => undefined },
    } : name.includes("spot-navigation-controller") ? { createSpotNavigationController, spotNavigationFeedback } : { useAppStore: store },
  });
  const render = () => { refIndex = 0; return module.exports.useSpotNavigationCommand({ readSnapshot: () => snapshot,
    confirmHandoff: async () => true, feedback: { owner: "spot-detail", placement: "inline", dedupeKeyPrefix: "spot-navigation:" } }); };
  const command = render();
  const change = (patch: Partial<Pick<typeof state, "mode" | "mapResetVersion">>) => {
    const previous = { ...state }; Object.assign(state, patch); listeners.forEach(listener => listener(state, previous));
  };
  return { command, render, state, opened, choose, parent, child, change,
    activate: (page: typeof parent) => { active = page; }, show: () => shown(), hide: () => hidden(),
    failMenu: (error: unknown) => { menuFailure = error; }, unmount: () => cleanup!(), subscribers: () => listeners.size };
}
const tick = () => new Promise<void>(resolve => setImmediate(resolve));

test("a retained page cannot acquire its child or revive a confirmation after hide and return", async () => {
  const h = mount(), pending = h.command.openOptions(); await tick();
  assert.equal(h.render().busy, true); h.hide(); h.activate(h.child); h.render();
  await h.command.openDirect(); assert.equal(h.opened.length, 0);
  h.activate(h.parent); h.show(); h.choose({ tapIndex: 0 }); await pending;
  assert.equal(h.opened.length, 0); await h.command.openDirect(); assert.equal(h.opened.length, 1);
  h.unmount(); assert.equal(h.subscribers(), 0);
});

test("mode A to B to A and account resets invalidate pending effects synchronously", async () => {
  for (const kind of ["mode", "account"] as const) {
    const h = mount(), pending = h.command.openOptions(); await tick();
    if (kind === "mode") { h.change({ mode: "OBSERVATION" }); h.change({ mode: "DAY" }); }
    else h.change({ mapResetVersion: 3 });
    h.choose({ tapIndex: 0 }); await pending; assert.equal(h.opened.length, 0, kind); h.unmount();
  }
});

test("retry clears only this navigation attempt's obsolete failure and preserves unrelated feedback", async () => {
  const h = mount(); h.failMenu(new Error("native options unavailable")); await h.command.openOptions();
  assert.ok(h.state.notifications.some(item => item.owner === "spot-detail" && item.dedupeKey === "spot-navigation:OPTIONS"));
  h.failMenu(null); h.choose({ tapIndex: 0 }); await h.command.openOptions();
  assert.equal(h.opened.length, 1);
  assert.deepEqual(h.state.notifications.map(item => item.id), ["unrelated", "other-page"]);
  h.unmount();
});
