import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

// Exercise the real Settings subscription and navigation owner; only React and
// native navigation are simulated. No session, location or private data is read.
const source = ts.createSourceFile("settings.tsx", readFileSync(new URL("./index.tsx", import.meta.url), "utf8"),
  ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const page = source.statements.find((node): node is ts.FunctionDeclaration =>
  ts.isFunctionDeclaration(node) && node.name?.text === "SettingsPage");
assert.ok(page?.body);
const body = page.body.statements.filter(node => !ts.isReturnStatement(node)).map(node => node.getText(source)).join("\n");
const compilerOptions = { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true };
const code = ts.transpileModule(`function PageProbe() {${body}\nreturn {openLocation};}\nPageProbe();`, { compilerOptions }).outputText;

function mount() {
  let identity: string | null = "synthetic:A";
  let state = { accountOwnerId: identity, mapResetVersion: 0, locationState: "DEFAULT_REGION" };
  const listeners = new Set<(next: typeof state, previous: typeof state) => void>();
  const hidden: Array<() => void> = [], cleanups: Array<() => void> = [];
  const notifications: unknown[] = [], commands: unknown[][] = [];
  const navigations: Array<{ url: string; succeed: () => void }> = [];
  let currentPage = {};
  const store = Object.assign((selector: (value: any) => unknown) => selector(store.getState()), {
    getState: () => ({ ...state, preferences: {}, mode: "DAY", notify: (notice: unknown) => notifications.push(notice) }),
    subscribe: (listener: (next: typeof state, previous: typeof state) => void) => {
      listeners.add(listener); return () => listeners.delete(listener);
    },
  });
  const react = {
    useState: (initial: unknown) => [initial, () => {}],
    useRef: (current: unknown) => ({ current }),
    useEffect: (setup: () => (() => void) | undefined) => { const cleanup = setup(); if (cleanup) cleanups.push(cleanup); },
  };
  const taro = {
    useDidHide: (callback: () => void) => hidden.push(callback), useDidShow() {},
    getCurrentPages: () => [currentPage],
    navigateTo: ({ url, success }: { url: string; success: (result: unknown) => void }) => new Promise<void>(resolve => {
      navigations.push({ url, succeed: () => {
        success({ eventChannel: { emit: (...args: unknown[]) => commands.push(args) } }); resolve();
      } });
    }),
  };
  const module = { exports: {} as { usePageNavigation: () => unknown } };
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL("../../hooks/use-page-navigation.ts", import.meta.url), "utf8"), { compilerOptions }).outputText, {
    module, exports: module.exports,
    require: (name: string) => name === "react" ? react : { __esModule: true, ...taro, default: taro },
  });
  const actions = vm.runInNewContext(code, {
    ...react, ...taro, Taro: taro, useAppStore: store, usePageNavigation: module.exports.usePageNavigation,
    useThemeClass: () => "theme-day", useReducedMotion: () => false,
    useWechatLogin: () => ({ open: false, dialog: null, requireAccount() {} }),
    usePreferencesSync: () => ({ updatePreference() {}, syncNow() {}, status: "" }),
    currentDraftUserId: () => identity, clearTimeout, setTimeout,
  }) as { openLocation: () => Promise<void> };
  return { ...actions, commands, navigations, notifications,
    hide: () => { hidden.forEach(callback => callback()); currentPage = {}; },
    change: (next: Partial<typeof state>) => {
      const previous = state; state = { ...state, ...next }; identity = state.accountOwnerId;
      listeners.forEach(listener => listener(state, previous));
    },
    mismatchIdentity: () => { identity = "synthetic:B"; },
    unmount: () => cleanups.forEach(cleanup => cleanup()),
  };
}

test("Settings location handoff delivers its explicit intent across normal navigation hide", async () => {
  const page = mount(), pending = page.openLocation();
  assert.equal(page.navigations.length, 1);
  assert.equal(page.navigations[0]!.url, "/pages/auth/index");
  page.hide(); page.navigations[0]!.succeed(); await pending;
  assert.deepEqual(page.commands, [["locationIntent", "locate"]]);
  assert.equal(page.notifications.length, 0);
  page.unmount();
});

test("Settings retires an old location handoff on account ABA, map reset or identity mismatch", async () => {
  for (const boundary of ["account-ABA", "map-reset", "identity"] as const) {
    const page = mount(), pending = page.openLocation();
    if (boundary === "account-ABA") {
      page.change({ accountOwnerId: "synthetic:B" });
      page.change({ accountOwnerId: "synthetic:A" });
    } else if (boundary === "map-reset") page.change({ mapResetVersion: 1 });
    else page.mismatchIdentity();
    page.hide(); page.navigations[0]!.succeed(); await pending;
    assert.equal(page.commands.length, 0, boundary);
    assert.equal(page.notifications.length, 0, boundary);
    page.unmount();
  }
});
