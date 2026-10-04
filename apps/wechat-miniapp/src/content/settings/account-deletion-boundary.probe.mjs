/** Production deletion/state/page regression with synthetic in-memory native/HTTP ports. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import vm from "node:vm";

const workspace = fileURLToPath(new URL("../../../../../", import.meta.url));
const require = createRequire(resolve(workspace, "apps/wechat-miniapp/package.json"));
const ts = require("typescript"), { QueryClient } = require("@tanstack/react-query");
const read = relative => readFileSync(resolve(workspace, relative), "utf8");
const apiText = read("apps/wechat-miniapp/src/services/api-client.ts");
const settingsText = read("apps/wechat-miniapp/src/content/settings/index.tsx");
const stateText = read("apps/wechat-miniapp/src/state/app-store.ts");
const parse = (name, text) => ts.createSourceFile(name, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const apiSource = parse("api.ts", apiText), settingsSource = parse("settings.tsx", settingsText), storeSource = parse("store.ts", stateText);
const compile = text => ts.transpileModule(text, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;
function declarations(source, names) {
  const found = source.statements.filter(node => ts.isFunctionDeclaration(node) ? names.includes(node.name?.text)
    : ts.isVariableStatement(node) && node.declarationList.declarations.some(item => names.includes(item.name.getText(source))));
  return found.map(node => node.getText(source).replace(/^export /u, "")).join("\n");
}
function functions(relative, names, returns) {
  const source = parse(relative, read(relative));
  return vm.runInNewContext(compile(declarations(source, names) + `\n({${returns.join(",")}});`));
}
const draftOwners = {
  ...functions("apps/wechat-miniapp/src/services/local-draft-keys.ts", ["PLAN_DRAFT_PREFIX", "CONTRIBUTION_DRAFT_PREFIX", "PROFILE_DRAFT_PREFIX", "planSaveStorageKey", "planSaveBelongsTo", "profileDraftKey", "profileDraftBelongsTo", "contributionDraftKey", "contributionDraftBelongsTo", "planDraftKey", "planDraftBelongsTo"], ["planDraftKey", "planDraftBelongsTo", "contributionDraftBelongsTo", "profileDraftBelongsTo", "planSaveBelongsTo"]),
  ...functions("apps/wechat-miniapp/src/services/contribution-submit-retry.ts", ["PREFIX", "contributionSubmitBelongsTo"], ["contributionSubmitBelongsTo"]),
  ...functions("apps/wechat-miniapp/src/services/profile-link-retry.ts", ["PREFIX", "storageKey", "profileSaveBelongsTo"], ["profileSaveBelongsTo"]),
  ...functions("apps/wechat-miniapp/src/services/import-save-retry.ts", ["prefix", "storageKey", "importSaveBelongsTo"], ["importSaveBelongsTo"]),
  ...functions("apps/wechat-miniapp/src/content/import/local-draft.ts", ["importLocalDraftKey", "importLocalDraftBelongsTo"], ["importLocalDraftBelongsTo"]),
  ...functions("apps/wechat-miniapp/src/content/plan/detail/plan-checklist.ts", ["planChecklistBelongsTo"], ["planChecklistBelongsTo"]),
  ...functions("apps/wechat-miniapp/src/content/plan/detail/plan-event-selection.ts", ["planEventSelectionBelongsTo"], ["planEventSelectionBelongsTo"]),
};
let resetMethod;
ts.forEachChild(storeSource, function visit(node) {
  if (ts.isMethodDeclaration(node) && node.name.getText(storeSource) === "resetAfterAccountDeletion") resetMethod = node.getText(storeSource);
  ts.forEachChild(node, visit);
});
assert.ok(resetMethod);
const page = settingsSource.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === "SettingsPage");
assert.ok(page?.body);
const pageCode = compile(`function PageProbe(){${page.body.statements.filter(node => !ts.isReturnStatement(node)).map(node => node.getText(settingsSource)).join("\n")}\nreturn {deleteAccount};}\nPageProbe();`);
const apiCode = compile(declarations(apiSource, ["SESSION_STORAGE_KEY", "INSTALLATION_STORAGE_KEY", "SESSION_EXPIRY_SKEW_MS", "readStoredSession", "clearStoredSession", "markAccountErased", "currentDraftUserId", "ensureSession", "accountReauthentication", "deleteAccount"]) + "\n({deleteAccount,ensureSession,currentDraftUserId,erased:()=>[...erasedStoredAccountIds]});");
const tick = () => new Promise(done => setImmediate(done));
const A = "synthetic:A", B = "synthetic:B";
const AUTH = "starward.wechat-miniapp.auth.current", INSTALL = "starward.wechat-miniapp.installation.current";
const CURRENT = "starward.wechat-miniapp.state.current", ACCOUNT = "starward.wechat-miniapp.state.account.", UNCLAIMED = "starward.wechat-miniapp.state.unclaimed";
const session = userId => ({ userId, accessToken: "synthetic-token", expiresAt: "2999-01-01" });
const snapshot = accountOwnerId => ({ accountOwnerId, preferences: { equipment: "synthetic-private" }, preferencesDirty: true, plans: [{ planId: "synthetic-plan:" + accountOwnerId }], notifications: [] });
const cases = ["normal", "B-before-receipt", "B-during-flush", "B-during-modal", "hide-during-flush", "unmount-during-flush", "hide-during-modal", "pre-receipt-ABA", "B-login-pending-at-receipt",
  "anonymous-first-binding", "native-read-fails-at-receipt", "native-expired-A-at-receipt", "native-malformed-A-at-receipt", "native-unowned-at-receipt", "native-unowned-whitespace-at-receipt", "callback-switches-B", "callback-throws", "hide-return-during-flush", "hide-return-during-modal", "unmount-during-modal", "receipt-identity-observer-throws"];
let passed = 0, failed = 0;
process.stdout.write(JSON.stringify({ probe: "production-deletion-account-page-boundaries",  effects: "in-memory-only",
  sourceHashes: Object.fromEntries([["api-client", apiText], ["Settings", settingsText], ["app-store", stateText]].map(([key, value]) => [key, createHash("sha256").update(value).digest("hex")])), cases }) + "\n");

for (const scenario of cases) {
  const events = [], listeners = new Set(), cleanups = [], native = new Map([
    [AUTH, session(A)], [INSTALL, "synthetic-installation"], [CURRENT, snapshot(A)], [ACCOUNT + A, snapshot(A)], [ACCOUNT + B, snapshot(B)], [UNCLAIMED, { unowned: "synthetic-quarantine" }],
    [draftOwners.planDraftKey(A, null), {}], [draftOwners.planDraftKey(B, null), {}],
  ]);
  let faultAuthRead = false, receipt;
  if (scenario === "anonymous-first-binding") native.delete(AUTH);
  let state = { ...snapshot(scenario === "anonymous-first-binding" ? null : A), mode: "DAY", setMode() {}, enterObservation() {}, clearLocalCache() {},
    notify(notice) { events.push({ kind: "notice", title: notice.title }); }, dismissNotification() {} };
  const store = selector => selector(state);
  store.getState = () => state;
  store.subscribe = listener => { listeners.add(listener); return () => listeners.delete(listener); };
  const setState = patch => { const previous = state; state = { ...state, ...patch }; for (const listener of listeners) listener(state, previous); };
  state.bindAccount = owner => {
    if (state.accountOwnerId === owner) return;
    if (state.accountOwnerId) native.set(ACCOUNT + state.accountOwnerId, snapshot(state.accountOwnerId));
    setState(owner ? snapshot(owner) : { accountOwnerId: null, preferences: {}, plans: [], notifications: [] });
    if (owner) native.set(CURRENT, snapshot(owner));
  };
  const queries = new QueryClient(); queries.setQueryData(["plans", A], { owner: A });
  const realClear = queries.clear.bind(queries); queries.clear = () => { events.push({ kind: "query-global-clear", hadB: !!queries.getQueryData(["plans", B]) }); realClear(); };
  const taro = {
    getStorageSync: key => { if (faultAuthRead && key === AUTH) throw Error("synthetic native read failure"); return native.get(key); }, setStorageSync: (key, value) => native.set(key, value),
    removeStorageSync: key => { events.push({ kind: "remove", key }); native.delete(key); }, getStorageInfoSync: () => ({ keys: [...native.keys()] }),
  };
  const reset = vm.runInNewContext(compile(`({${resetMethod}}).resetAfterAccountDeletion;`), {
    Taro: taro, STORAGE_KEY: CURRENT, ACCOUNT_STORAGE_PREFIX: ACCOUNT, persistedOwnerSeen: null, freshlyStashedOwners: new Set(),
    get: () => state, set: setState, DEFAULT_USER_PREFERENCES: { equipment: "DEFAULT" }, DEFAULT_VIEWPORT: { center: { latitude: 0, longitude: 0 }, zoom: 1 }, EMPTY_FILTER_STATE: {}, cloneFilterState: input => ({ ...input }),
  });
  state.resetAfterAccountDeletion = deleted => { events.push({ kind: "projection-reset", owner: state.accountOwnerId, deleted }); return reset(deleted); };
  let httpDone, flushDone, modalDone, hide, show, loginDone, loginAccount = A, pendingLoginResult;
  let visible = true, mounted = true, deferBLogin = false;
  const responseCache = {
    clear() { events.push({ kind: "response-global-clear" }); }, cleanupComplete: () => true,
    flush: () => new Promise(done => { events.push({ kind: "flush-wait" }); flushDone = done; }),
    removeScope: async owner => { events.push({ kind: "response-scope-remove", owner }); await responseCache.flush(); return true; },
  };
  const requestOperation = async (_key, operation, _options, _retried, expected) => {
    if (operation === "capabilitiesGet") return { data: { flags: { WECHAT_AUTH_ENABLED: true } } };
    if (operation === "wechatLoginPost") {
      if (deferBLogin && loginAccount === B) return new Promise(done => { loginDone = () => done({ data: session(B) }); });
      return { data: session(loginAccount) };
    }
    assert.equal(operation, "accountDelete"); assert.equal(expected, A);
    return new Promise(done => { httpDone = () => done({ data: { userId: A, accountState: "DELETED", mediaCleanupState: "QUEUED" } }); });
  };
  const api = vm.runInNewContext(apiCode, { ...draftOwners, useAppStore: store, Taro: { ...taro, login: async () => ({ code: "synthetic-native-code" }) },
    sessionPromise: null, erasedStoredAccountIds: new Set(), invalidatedStoredSession: null, responseCache, miniappQueryClient: queries,
    requestOperation, getCapabilities: () => requestOperation("capabilities", "capabilitiesGet"), installationIdentity: () => "synthetic-installation", idempotencyKey: () => "synthetic-key",
    MiniappRequestCancelled: class extends Error { constructor(reason) { super("cancelled:" + reason); this.reason = reason; } },
  });
  const actions = vm.runInNewContext(pageCode, {
    useReducedMotion: () => false, useAppStore: store, useThemeClass: () => "theme-day", usePreferencesSync: () => ({ updatePreference() {}, syncNow() {}, status: "" }),
    useState: initial => [initial, value => events.push({ kind: "ui-state", mounted, value })], useRef: current => ({ current }),
    useEffect: effect => { const cleanup = effect(); if (cleanup) cleanups.push(cleanup); }, useDidHide: callback => { hide = callback; }, useDidShow: callback => { show = callback; },
    deleteAccountThroughApi: async onDeleted => {
      receipt = await api.deleteAccount(owner => {
        onDeleted(owner);
        if (scenario === "callback-switches-B") {
          // B is injected at the public synchronous hook boundary, not claimed
          // as a real native login or a deployed consumer that changes identity.
          native.set(AUTH, session(B)); api.currentDraftUserId();
          state.bindAccount(B); queries.setQueryData(["plans", B], { owner: B });
        }
        if (scenario === "callback-throws") throw Error("synthetic callback failure");
      });
      return receipt;
    }, currentDraftUserId: api.currentDraftUserId,
    errorMessage: () => "synthetic failure", AbortController, setTimeout, clearTimeout,
    Taro: { showModal: () => new Promise(done => { events.push({ kind: "modal", visible, mounted, nativeUser: native.get(AUTH)?.userId ?? null }); modalDone = done; }),
      reLaunch: async () => { events.push({ kind: "navigate", visible, mounted, nativeUser: native.get(AUTH)?.userId ?? null }); } },
  });
  const establish = async owner => { loginAccount = owner; await api.ensureSession(true); queries.setQueryData(["plans", owner], { owner }); };
  const hidePage = () => { visible = false; hide(); };
  const unmountPage = () => { mounted = false; visible = false; for (const cleanup of cleanups) cleanup(); };
  const pending = actions.deleteAccount(); await tick(); assert.ok(httpDone, "probe must reach real deletion HTTP wait");
  if (scenario === "B-before-receipt") await establish(B);
  if (scenario === "pre-receipt-ABA") { await establish(B); await establish(A); }
  if (scenario === "B-login-pending-at-receipt") {
    deferBLogin = true; loginAccount = B;
    pendingLoginResult = api.ensureSession(true).then(() => ({ succeeded: true }), error => ({ succeeded: false, reason: error.message }));
    await tick(); assert.ok(loginDone);
  }
  if (scenario === "native-read-fails-at-receipt") faultAuthRead = true;
  if (scenario === "native-expired-A-at-receipt") native.set(AUTH, { ...session(A), expiresAt: "2001-01-01" });
  if (scenario === "native-malformed-A-at-receipt") native.set(AUTH, { ...session(A), accessToken: "" });
  if (scenario === "native-unowned-at-receipt") native.set(AUTH, { corrupt: "synthetic" });
  if (scenario === "native-unowned-whitespace-at-receipt") native.set(AUTH, { ...session(A), userId: " " });
  if (scenario === "receipt-identity-observer-throws") {
    native.delete(AUTH); listeners.add(() => { throw Error("synthetic observer failure"); });
  }
  httpDone(); await tick(); assert.ok(flushDone, "probe must reach the production response-cache await");
  if (scenario === "B-during-flush") await establish(B);
  if (scenario === "hide-during-flush" || scenario === "hide-return-during-flush") hidePage();
  if (scenario === "hide-return-during-flush") { visible = true; show(); }
  if (scenario === "unmount-during-flush") unmountPage();
  flushDone(); await tick();
  if (scenario === "B-during-modal") { assert.ok(modalDone); await establish(B); }
  if (scenario === "hide-during-modal" || scenario === "hide-return-during-modal") { assert.ok(modalDone); hidePage(); }
  if (scenario === "hide-return-during-modal") { visible = true; show(); }
  if (scenario === "unmount-during-modal") { assert.ok(modalDone); unmountPage(); }
  if (modalDone) modalDone({ confirm: true });
  await pending;
  if (loginDone) { loginDone(); pendingLoginResult = await pendingLoginResult; }
  const observations = {
    currentStoreOwner: state.accountOwnerId, nativeUser: native.get(AUTH)?.userId ?? null, deletedMarker: api.erased(),
    retainedAState: native.has(ACCOUNT + A), retainedBState: native.has(ACCOUNT + B), installationPresent: native.has(INSTALL),
    retainedBDraft: native.has(draftOwners.planDraftKey(B, null)), removedADraft: !native.has(draftOwners.planDraftKey(A, null)),
    quarantinePreserved: native.has(UNCLAIMED), BQueryPresent: !!queries.getQueryData(["plans", B]),
    ...(pendingLoginResult ? { successorLogin: pendingLoginResult } : {}),
    ...(receipt ? { localAccountReset: receipt.localAccountReset, localCleanupComplete: receipt.localCleanupComplete } : {}),
    rawAuthPresent: native.has(AUTH),
    visible, mounted,
  };
  let reason;
  try {
    assert.ok(observations.removedADraft && observations.retainedBDraft && observations.quarantinePreserved, "only owned A drafts may be removed; unclaimed quarantine is not deletion authority");
    assert.equal(events.filter(event => event.kind === "ui-state" && !event.mounted).length, 0, "settled deletion cannot set state on an unmounted page");
    if (scenario === "normal" || scenario === "anonymous-first-binding" || scenario === "callback-throws") {
      assert.equal(events.filter(event => event.kind === "navigate").length, 1, "normal authorized deletion must actually finish its route");
      if (scenario === "callback-throws") assert.equal(receipt.localCleanupComplete, false, "a callback failure cannot reject an authoritative receipt or claim complete cleanup");
    } else if (scenario === "B-before-receipt" || scenario === "B-during-flush" || scenario === "callback-switches-B") {
      assert.equal(observations.nativeUser, B, "test must establish a genuinely new B session through production ensureSession");
      assert.equal(observations.currentStoreOwner, B, "old deletion must preserve current B private projection");
      assert.ok(observations.retainedBState && observations.BQueryPresent && observations.installationPresent, "old cleanup cannot remove B snapshot/global new-query state or the current installation");
      assert.equal(observations.retainedAState, false, "confirmed A deletion must purge A owned recovery snapshot even while B is current");
      assert.equal(events.filter(event => event.kind === "modal" || event.kind === "navigate").length, 0);
    } else if (scenario === "B-during-modal") {
      assert.equal(observations.nativeUser, B);
      assert.equal(events.filter(event => event.kind === "navigate").length, 0, "old result modal must not navigate the later B account");
    } else if (scenario === "B-login-pending-at-receipt") {
      assert.equal(pendingLoginResult.succeeded, true, "erasing A must not retire a newer explicit B login");
    } else if (scenario === "hide-during-modal" || scenario === "hide-return-during-modal" || scenario === "unmount-during-modal") {
      assert.equal(events.filter(event => event.kind === "navigate").length, 0, "a retired page's old modal must not reLaunch");
    } else if (scenario === "receipt-identity-observer-throws") {
      assert.equal(receipt.data.accountState, "DELETED", "a synchronous identity observer cannot reject a successful deletion receipt");
      assert.equal(receipt.localCleanupComplete, false);
      assert.equal(observations.retainedAState, false);
      assert.equal(events.filter(event => event.kind === "modal" || event.kind === "navigate" || event.kind === "notice").length, 0);
    } else if (scenario.startsWith("native-")) {
      assert.equal(observations.retainedAState, false, "A-owned recovery snapshot must still be removed");
      if (scenario === "native-read-fails-at-receipt" || scenario === "native-unowned-at-receipt" || scenario === "native-unowned-whitespace-at-receipt") {
        assert.ok(observations.rawAuthPresent && observations.installationPresent, "an unknown native auth/installation cannot be deletion authority");
        assert.equal(receipt.localCleanupComplete, false, "uncertain native cleanup cannot claim complete");
      } else {
        assert.equal(observations.rawAuthPresent, false, "positively A-owned expired/malformed auth must still be removed");
        assert.equal(receipt.localCleanupComplete, true);
      }
      assert.equal(events.filter(event => event.kind === "modal" || event.kind === "navigate").length, 0, "native identity loss retires page effect without resurrecting old ticket");
    } else {
      assert.equal(events.filter(event => event.kind === "modal" || event.kind === "navigate").length, 0, "retired page/account must not dispatch later native result UI or navigation");
    }
    passed++;
  } catch (error) { failed++; reason = error.message; }
  process.stdout.write(JSON.stringify({ scenario, result: reason ? "FAILED" : "PASSED", observations, events, ...(reason ? { reason } : {}) }) + "\n");
  queries.clear();
}
process.stdout.write(JSON.stringify({ summary: { cases: cases.length, passed, failed }, claim: "controlled production-function regression; no real deletion/native acceptance" }) + "\n");
process.exitCode = failed ? 1 : 0;
