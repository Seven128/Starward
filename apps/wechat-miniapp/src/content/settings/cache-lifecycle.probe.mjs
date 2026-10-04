/** Limited actual Settings/cache owner probe; every native/state/cache port is synthetic. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import vm from "node:vm";
const workspace = fileURLToPath(new URL("../../../../../", import.meta.url));
const require = createRequire(resolve(workspace, "apps/wechat-miniapp/package.json"));
const ts = require("typescript");
const read = path => readFileSync(resolve(workspace, path), "utf8");
const sources = {
  Settings: read("apps/wechat-miniapp/src/content/settings/index.tsx"),
  api: read("apps/wechat-miniapp/src/services/api-client.ts"),
  state: read("apps/wechat-miniapp/src/state/app-store.ts"),
  policy: read("apps/wechat-miniapp/src/services/cache-policy.ts"),
};
const parse = text => ts.createSourceFile("source.tsx", text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const compile = code => ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;
const declarations = (text, names) => {
  const source = parse(text);
  return source.statements.filter(node => ts.isFunctionDeclaration(node) ? names.includes(node.name?.text)
    : ts.isVariableStatement(node) && node.declarationList.declarations.some(item => names.includes(item.name.getText(source))))
    .map(node => node.getText(source).replace(/^export /u, "")).join("\n");
};
const settingsSource = parse(sources.Settings);
const page = settingsSource.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === "SettingsPage");
assert.ok(page?.body);
const setup = compile(`function PageProbe(){${page.body.statements.filter(node => !ts.isReturnStatement(node)).map(node => node.getText(settingsSource)).join("\n")} return {clearCache};} PageProbe();`);
const storeSource = parse(sources.state); let clearMethod;
ts.forEachChild(storeSource, function visit(node) {
  if (ts.isMethodDeclaration(node) && node.name.getText(storeSource) === "clearLocalCache") clearMethod = node.getText(storeSource);
  ts.forEachChild(node, visit);
});
assert.ok(clearMethod);
const apiCode = compile(declarations(sources.api, ["clearTemporaryApiCache"]) + "\nclearTemporaryApiCache;");
const policyCode = compile(declarations(sources.policy, ["TEMPORARY_QUERY_ROOTS", "isTemporaryCacheKey"]) + "\nisTemporaryCacheKey;");
const isTemporaryCacheKey = vm.runInNewContext(policyCode);
const tick = () => new Promise(done => setImmediate(done));
const A = "synthetic:A", B = "synthetic:B", CURRENT = "synthetic.state.current";
const snapshot = owner => ({ accountOwnerId: owner, finderQuery: "fresh-map:" + owner, selectedSpotId: "fresh-spot:" + owner,
  viewport: { center: { latitude: 1, longitude: 1 }, zoom: 3 }, observationContext: { contextId: "synthetic:" + owner },
  notifications: [], preferences: { equipment: "synthetic-owned" }, favoriteIds: ["synthetic-favorite"], plans: ["synthetic-plan"] });
const cases = ["normal", "hide", "unmount", "owner-departure", "owner-ABA", "hide-return"];
let passed = 0, failed = 0;
process.stdout.write(JSON.stringify({ probe: "settings-cache-lifecycle",  effects: "synthetic-only",
  sourceHashes: Object.fromEntries(Object.entries(sources).map(([name, code]) => [name, createHash("sha256").update(code).digest("hex")])), cases }) + "\n");
for (const scenario of cases) {
  const events = [], listeners = new Set(), cleanups = [], stateJobs = [], native = new Map([[CURRENT, snapshot(A)]]);
  let mounted = true, visible = true, stage = "start", hide, show, releaseApi;
  let state = { ...snapshot(A), mode: "DAY", setMode() {}, enterObservation() {},
    notify(notice) { events.push({ kind: "notice", stage, visible, mounted, owner: state.accountOwnerId, title: notice.title }); }, dismissNotification() {} };
  const store = selector => selector(state);
  store.getState = () => state;
  store.subscribe = listener => { listeners.add(listener); return () => listeners.delete(listener); };
  const setState = patch => { const previous = state; state = { ...state, ...patch }; for (const listener of listeners) listener(state, previous); };
  const bind = owner => setState(snapshot(owner));
  const clear = vm.runInNewContext(compile(`({${clearMethod}}).clearLocalCache;`), {
    get: () => state, set: setState, STORAGE_KEY: CURRENT, persistedOwnerSeen: null,
    DEFAULT_VIEWPORT: { center: { latitude: 0, longitude: 0 }, zoom: 1 }, EMPTY_FILTER_STATE: {},
    Taro: { removeStorageSync: key => { events.push({ kind: "native-remove", stage, owner: state.accountOwnerId }); native.delete(key); } },
    queueMicrotask: job => stateJobs.push(job),
    saveOwnedCurrent: value => { events.push({ kind: "state-persist", stage, owner: value.accountOwnerId }); native.set(CURRENT, { ...value }); return true; },
  });
  state.clearLocalCache = () => clear();
  const api = vm.runInNewContext(apiCode, {
    isTemporaryCacheKey,
    requests: { cancelReads(predicate) { assert.equal(predicate("map-scene:synthetic"), true); assert.equal(predicate("plans:synthetic"), false); events.push({ kind: "request-cancel", stage }); return 1; } },
    responseCache: { invalidate(predicate) { assert.equal(predicate("map-scene:synthetic"), true); assert.equal(predicate("plans:synthetic"), false); events.push({ kind: "response-invalidate", stage }); }, flush: async () => { events.push({ kind: "response-flush", stage }); }, cleanupComplete: () => true },
    miniappQueryClient: { cancelQueries: filters => new Promise(done => { assert.equal(filters.predicate({ queryKey: ["map-scene"] }), true); assert.equal(filters.predicate({ queryKey: ["plans", A] }), false); releaseApi = done; events.push({ kind: "api-wait", stage }); }),
      removeQueries: () => events.push({ kind: "query-remove", stage }) },
  });
  const actions = vm.runInNewContext(setup, {
    useReducedMotion: () => false, useAppStore: store, useThemeClass: () => "theme-day", usePreferencesSync: () => ({ updatePreference() {}, syncNow() {}, status: "" }),
    useState: initial => [initial, value => events.push({ kind: "react-setter", stage, visible, mounted, value })], useRef: current => ({ current }),
    useEffect: effect => { const cleanup = effect(); if (cleanup) cleanups.push(cleanup); }, useDidHide: callback => { hide = callback; }, useDidShow: callback => { show = callback; },
    clearTemporaryApiCache: api, currentDraftUserId: () => state.accountOwnerId,
    AbortController, setTimeout, clearTimeout, Taro: {},
  });
  const pending = actions.clearCache();
  await tick(); assert.equal(typeof releaseApi, "function"); assert.equal(stateJobs.length, 1, "both cache owners must actually start");
  stage = "retire";
  if (scenario === "hide" || scenario === "hide-return") { visible = false; hide(); }
  if (scenario === "hide-return") { visible = true; show(); }
  if (scenario === "unmount") { visible = false; mounted = false; for (const cleanup of cleanups) cleanup(); }
  if (scenario === "owner-departure" || scenario === "owner-ABA") bind(B);
  if (scenario === "owner-ABA") bind(A);
  stage = "settle"; stateJobs.shift()(); releaseApi(); await pending;
  const observations = { owner: state.accountOwnerId, finderQuery: state.finderQuery, selectedSpotId: state.selectedSpotId,
    settledNotices: events.filter(event => event.kind === "notice" && event.stage === "settle").length,
    unmountedSetters: events.filter(event => event.kind === "react-setter" && !event.mounted).length,
    settledSetters: events.filter(event => event.kind === "react-setter" && event.stage === "settle").length, mounted, visible };
  let reason;
  try {
    assert.equal(events.filter(event => event.kind === "native-remove").length, 1, "real local reset must run exactly once before retirement");
    if (scenario === "normal") {
      assert.equal(observations.settledNotices, 1, "normal clear must publish its actual success");
      assert.equal(events.find(event => event.kind === "notice")?.title, "临时缓存已清除");
      assert.equal(observations.finderQuery, "");
    } else {
      assert.equal(observations.settledNotices, 0, "retired clear cannot publish its old result on a hidden/unmounted or later-account page");
      assert.equal(observations.unmountedSetters, 0, "settled clear cannot write React state after unmount");
      if (scenario === "owner-departure") assert.equal(observations.finderQuery, "fresh-map:" + B, "state persistence fence must preserve new B fields");
      if (scenario === "owner-ABA") assert.equal(observations.finderQuery, "fresh-map:" + A, "returning A cannot revive the old UI effect or discard its new map");
    }
    passed++;
  } catch (error) { failed++; reason = error.message; }
  process.stdout.write(JSON.stringify({ scenario, result: reason ? "FAILED" : "PASSED", observations, events, ...(reason ? { reason } : {}) }) + "\n");
}
process.stdout.write(JSON.stringify({ summary: { cases: cases.length, passed, failed }, claim: "actual owner/page functions with synthetic ports; no real cleanup/native acceptance" }) + "\n");
process.exitCode = failed ? 1 : 0;
