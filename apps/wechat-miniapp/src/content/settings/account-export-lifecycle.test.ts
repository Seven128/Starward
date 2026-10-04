import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

// Execute the production handlers and lifecycle subscriptions. Only the React,
// HTTP and native filesystem/platform ports are simulated; no private data is read.
const source = ts.createSourceFile("settings.tsx", readFileSync(new URL("./index.tsx", import.meta.url), "utf8"),
  ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const page = source.statements.find((node): node is ts.FunctionDeclaration =>
  ts.isFunctionDeclaration(node) && node.name?.text === "SettingsPage");
assert.ok(page?.body);
const fileFns = source.statements.filter(node => ts.isFunctionDeclaration(node) &&
  ["writeJsonFile", "removeJsonFile"].includes(node.name?.text ?? "")).map(node => node.getText(source)).join("\n");
const body = page.body.statements.filter(node => !ts.isReturnStatement(node)).map(node => node.getText(source)).join("\n");
const code = ts.transpileModule(`${fileFns}\nfunction PageProbe() {${body}\nreturn {downloadAccountData};}\nPageProbe();`, {
  compilerOptions: { target: ts.ScriptTarget.ES2020 },
}).outputText;
const tick = () => new Promise<void>(resolve => setImmediate(resolve));
let fileSequence = 0;

function render({ initialOwner = "synthetic:A" as string | null, deferredApi = false,
  unlinkFailure = false, synchronousShareHide = false } = {}) {
  let owner = initialOwner;
  let hide!: () => void, show!: () => void;
  const cleanups: Array<() => void> = [];
  const listeners = new Set<(next: any, previous: any) => void>();
  const events: Array<{ kind: string; path?: string; notice?: any; state?: unknown }> = [];
  const writes: Array<{ filePath: string; success: () => void; fail: (error: { errMsg: string }) => void }> = [];
  const shares: Array<{ resolve: () => void; reject: (error: Error) => void }> = [];
  let finishApi!: (account?: string) => void;
  let rejectApi!: (error: Error) => void;
  let signal: AbortSignal | undefined;
  const state = {
    accountOwnerId: owner, preferences: { reducedMotion: false }, mode: "DAY", notifications: [],
    setMode() {}, enterObservation() {}, clearLocalCache() {}, resetAfterAccountDeletion() {},
    notify(notice: unknown) { events.push({ kind: "notice", notice }); },
    dismissNotification() {},
  };
  const store = Object.assign((selector: (value: typeof state) => unknown) => selector(state), {
    getState: () => state,
    subscribe: (listener: (next: typeof state, previous: typeof state) => void) => {
      listeners.add(listener); return () => listeners.delete(listener);
    },
  });
  const actions = vm.runInNewContext(code, {
    Taro: { env: { USER_DATA_PATH: "/synthetic" }, getFileSystemManager: () => ({
      writeFile(options: typeof writes[number]) { writes.push(options); events.push({ kind: "write", path: options.filePath }); },
      unlink(options: { filePath: string; success: () => void; fail: (error: { errMsg: string }) => void }) {
        events.push({ kind: "unlink", path: options.filePath });
        if (unlinkFailure) options.fail({ errMsg: "synthetic permission denied" }); else options.success();
      },
    }), shareFileMessage: (options: { filePath: string }) => {
      events.push({ kind: "share", path: options.filePath });
      if (synchronousShareHide) hide();
      return new Promise<void>((resolve, reject) => shares.push({ resolve, reject }));
    } },
    useThemeClass: () => "theme-day", useReducedMotion: () => false, useAppStore: store,
    usePreferencesSync: () => ({ updatePreference() {}, syncNow() {}, status: "" }),
    useState: (initial: unknown) => [initial, (value: unknown) => events.push({ kind: "state", state: value })],
    useRef: (current: unknown) => ({ current }),
    useEffect: (effect: () => (() => void) | undefined) => { const cleanup = effect(); if (cleanup) cleanups.push(cleanup); },
    useDidHide: (callback: () => void) => { hide = callback; },
    useDidShow: (callback: () => void) => { show = callback; },
    exportAccountData: (requestSignal: AbortSignal) => {
      signal = requestSignal;
      events.push({ kind: "api" });
      const response = (account = "synthetic:A") => ({ data: {
        schemaVersion: "starward-account-data-export-v1", generatedAt: "2026-10-05T00:00:00Z", account: { userId: account },
      } });
      if (!deferredApi) return Promise.resolve(response());
      return new Promise((resolve, reject) => { finishApi = account => resolve(response(account)); rejectApi = reject; });
    },
    currentDraftUserId: () => owner, AbortController,
    idempotencyKey: () => `export:synthetic:${++fileSequence}`,
    errorMessage: () => "synthetic failure", setTimeout, clearTimeout,
  }) as { downloadAccountData: () => Promise<void> };
  return {
    ...actions, events, writes, shares,
    hide: () => hide(), show: () => show(),
    unmount: () => { for (const cleanup of cleanups) cleanup(); },
    owner(next: string | null) {
      const previous = { ...state }; owner = next; state.accountOwnerId = next;
      for (const listener of listeners) listener(state, previous);
    },
    finishApi: (account?: string) => finishApi(account), rejectApi: (error: Error) => rejectApi(error),
    get signal() { return signal; }, get subscriptionCount() { return listeners.size; },
  };
}

test("a current export actually writes, shares, removes exactly that file and reports success", async () => {
  const page = render(), pending = page.downloadAccountData();
  await tick(); assert.equal(page.writes.length, 1);
  page.writes[0]!.success(); await tick(); assert.equal(page.shares.length, 1);
  assert.equal(page.events.filter(event => event.kind === "unlink").length, 0);
  page.shares[0]!.resolve(); await pending;
  assert.equal(page.events.filter(event => event.kind === "unlink").length, 1);
  assert.equal(page.events.find(event => event.kind === "notice")!.notice.title, "账户数据已生成");
});

for (const boundary of ["account", "account-ABA", "hidden", "hidden-return", "unmount"] as const) {
  test(`an export retired during a native write by ${boundary} never dispatches the old private file`, async () => {
    const page = render(), pending = page.downloadAccountData();
    await tick(); assert.equal(page.writes.length, 1);
    if (boundary.startsWith("account")) { page.owner("synthetic:B"); if (boundary === "account-ABA") page.owner("synthetic:A"); }
    else if (boundary === "unmount") page.unmount();
    else { page.hide(); if (boundary === "hidden-return") page.show(); }
    assert.equal(page.signal?.aborted, true);
    assert.equal(page.events.filter(event => event.kind === "unlink").length, 0, "an early unlink would leave a late native write behind");
    const beforeStateCount = page.events.filter(event => event.kind === "state").length;
    page.writes[0]!.success(); await pending;
    assert.equal(page.shares.length, 0);
    assert.equal(page.events.filter(event => event.kind === "unlink").length, 1);
    assert.equal(page.events.filter(event => event.kind === "notice").length, 0);
    if (boundary === "unmount") {
      assert.equal(page.subscriptionCount, 0);
      assert.equal(page.events.filter(event => event.kind === "state").length, beforeStateCount);
    } else assert.ok(page.events.some(event => event.kind === "state" && event.state === null), "a mounted page must release its busy UI");
  });
}

test("hide before the API result retires the request even if the port ignores abort", async () => {
  const page = render({ deferredApi: true }), pending = page.downloadAccountData();
  page.hide(); page.show(); page.finishApi(); await pending;
  assert.equal(page.signal?.aborted, true);
  assert.equal(page.writes.length, 0); assert.equal(page.shares.length, 0);
  assert.equal(page.events.filter(event => event.kind === "notice").length, 0);
});

for (const synchronousShareHide of [false, true]) {
  test(`an already dispatched native share keeps its receipt and cleanup, with ${synchronousShareHide ? "synchronous" : "later"} hide`, async () => {
    const page = render({ synchronousShareHide }), pending = page.downloadAccountData();
    await tick(); page.writes[0]!.success(); await tick();
    assert.equal(page.shares.length, 1);
    if (!synchronousShareHide) page.hide();
    page.show(); page.shares[0]!.resolve(); await pending;
    assert.equal(page.events.filter(event => event.kind === "unlink").length, 1);
    assert.equal(page.events.filter(event => event.kind === "notice").length, 0, "native success must not become a stale success or failure UI");
  });
}

test("a cancelled late partial write is still cleaned exactly once", async () => {
  const page = render(), pending = page.downloadAccountData();
  await tick(); page.hide(); page.writes[0]!.fail({ errMsg: "partial synthetic write" }); await pending;
  assert.equal(page.shares.length, 0);
  assert.equal(page.events.filter(event => event.kind === "unlink").length, 1);
  assert.equal(page.events.filter(event => event.kind === "notice").length, 0);
});

test("a retired export reports only a generic device privacy warning when real cleanup fails", async () => {
  const page = render({ unlinkFailure: true }), pending = page.downloadAccountData();
  await tick(); page.owner("synthetic:B"); page.writes[0]!.success(); await pending;
  assert.equal(page.shares.length, 0);
  assert.equal(page.events.filter(event => event.kind === "unlink").length, 1);
  const notices = page.events.filter(event => event.kind === "notice").map(event => event.notice);
  assert.equal(notices.length, 1); assert.equal(notices[0]!.title, "本机临时文件未清除");
  assert.doesNotMatch(JSON.stringify(notices), /synthetic:[AB]|\/synthetic|账户数据已生成/u);
});

test("equal server timestamps on successive pages cannot make old cleanup delete the new export", async () => {
  const oldPage = render(), oldPending = oldPage.downloadAccountData();
  await tick(); oldPage.unmount();
  const newPage = render(), newPending = newPage.downloadAccountData();
  await tick(); assert.notEqual(oldPage.writes[0]!.filePath, newPage.writes[0]!.filePath);
  oldPage.writes[0]!.success(); await oldPending;
  assert.equal(oldPage.events.find(event => event.kind === "unlink")!.path, oldPage.writes[0]!.filePath);
  newPage.writes[0]!.success(); await tick(); newPage.shares[0]!.resolve(); await newPending;
  assert.equal(newPage.events.find(event => event.kind === "unlink")!.path, newPage.writes[0]!.filePath);
});

test("an explicit anonymous export can establish its first owner but rejects a different snapshot identity", async () => {
  for (const snapshotOwner of ["synthetic:A", "synthetic:B"]) {
    const page = render({ initialOwner: null, deferredApi: true }), pending = page.downloadAccountData();
    page.owner("synthetic:A"); page.finishApi(snapshotOwner); await tick();
    if (snapshotOwner === "synthetic:A") {
      assert.equal(page.writes.length, 1); page.writes[0]!.success(); await tick();
      assert.equal(page.shares.length, 1); page.shares[0]!.resolve();
    } else assert.equal(page.writes.length, 0);
    await pending;
    if (snapshotOwner === "synthetic:B") assert.equal(page.events.find(event => event.kind === "notice")!.notice.title, "账户数据导出失败");
  }
});

test("a still-current anonymous authentication failure remains visible and retryable", async () => {
  const page = render({ initialOwner: null, deferredApi: true }), pending = page.downloadAccountData();
  page.rejectApi(Error("synthetic offline")); await pending;
  assert.equal(page.writes.length, 0);
  assert.equal(page.events.find(event => event.kind === "notice")!.notice.title, "账户数据导出失败");
});
