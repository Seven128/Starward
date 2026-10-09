import type { AuthSessionData, UserId } from "@starward/miniapp-contracts";
import { createAuthenticatedOperationRequester } from "./authenticated-operation";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { createResponseCache } from "./response-cache";
import { MiniappRequestCancelled } from "./request-lifecycle";
import { transportHarness } from "./api-request-test-support";

const source = ts.createSourceFile("api.ts", readFileSync(new URL("./api-client.ts", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
function codeFor(names: string[], expression: string) {
  const needsInstallationOwner = names.some(name => name === "deleteAccount" || name === "ensureSession");
  if (needsInstallationOwner) names = ["nativeSessionOwner", "settleErasedInstallation", ...names];
  const declarations = names.map(name => {
    const node = source.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === name);
    assert.ok(node);
    return node.getText(source).replace(/^export /u, "");
  });
  const installationOwner = needsInstallationOwner ? source.statements.find(n => ts.isVariableStatement(n) && n.declarationList.declarations.some(d => d.name.getText(source) === "pendingErasedInstallation")) : undefined;
  if (needsInstallationOwner) assert.ok(installationOwner);
  return ts.transpileModule((installationOwner?.getText(source) ?? "") + "\n" + declarations.join("\n") + "\n" + expression, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;
}

function loadSessionRuntime(login: (attempt: number) => Promise<AuthSessionData> = async attempt => ({
  userId: "user:a" as UserId, accessToken: "synthetic:" + attempt, expiresAt: "2999-01-01T00:00:00.000Z",
})) {
  const storage = new Map<string, unknown>();
  const state = { owner: null as string | null, readFails: false, removeFails: false, writeFails: false, logins: 0, capabilities: 0 };
  const run = vm.runInNewContext(codeFor(["readStoredSession", "clearStoredSession", "ensureSession", "currentDraftUserId"],
    "({ensureSession, clearStoredSession, readStoredSession, currentDraftUserId});"), {
    SESSION_STORAGE_KEY: "auth", SESSION_EXPIRY_SKEW_MS: 60_000, erasedStoredAccountIds: new Set(), sessionPromise: null, invalidatedStoredSession: null,
    installationIdentity: () => "local:synthetic", MiniappRequestCancelled,
    useAppStore: { getState: () => ({ accountOwnerId: state.owner, bindAccount: (owner: string | null) => { state.owner = owner; } }) },
    Taro: {
      getStorageSync: (key: string) => { if (state.readFails) throw Error("synthetic native read failed"); return storage.get(key); },
      setStorageSync: (key: string, value: unknown) => { if (state.writeFails) throw Error("synthetic native write failed"); storage.set(key, value); },
      removeStorageSync: (key: string) => { if (state.removeFails) throw Error("synthetic native remove failed"); storage.delete(key); },
    },
    requestOperation: async (_key: string, operation: string) => {
      if (operation === "capabilitiesGet") { state.capabilities++; return { data: { flags: { WECHAT_AUTH_ENABLED: false } } }; }
      return { data: await login(++state.logins) };
    },
  }) as { ensureSession(force?: boolean): Promise<AuthSessionData>; clearStoredSession(rejected?: AuthSessionData): void; readStoredSession(): AuthSessionData | null; currentDraftUserId(): string | null };
  return { ...run, state, storage };
}

test("a settled login is never reused after native session expiry or removal", async () => {
  for (const invalid of ["expired", "missing"]) {
    const run = loadSessionRuntime();
    const first = await run.ensureSession();
    if (invalid === "expired") run.storage.set("auth", { ...first, expiresAt: "2020-01-01T00:00:00Z" });
    else run.storage.delete("auth");
    const renewed = await run.ensureSession();
    assert.equal(run.state.logins, 2, invalid + " must establish a fresh session");
    assert.notEqual(renewed.accessToken, first.accessToken);
    assert.equal(run.state.owner, "user:a");
  }
});

test("loss of native identity hides the mounted account even when reauthentication is offline", async () => {
  const cases = [undefined, null, [], {}, { userId: "user:a", accessToken: "", expiresAt: "2999-01-01" }, "read-failed"];
  for (const invalid of cases) {
    const run = loadSessionRuntime(async attempt => {
      if (attempt > 1) throw Error("synthetic offline");
      return { userId: "user:a" as UserId, accessToken: "synthetic", expiresAt: "2999-01-01" };
    });
    await run.ensureSession();
    if (invalid === "read-failed") run.state.readFails = true;
    else run.storage.set("auth", invalid);
    assert.equal(run.currentDraftUserId(), null);
    assert.equal(run.state.owner, null, "unverified identity must not remain active");
    await assert.rejects(run.ensureSession(), /synthetic offline/);
    assert.equal(run.state.owner, null);
  }
});

test("concurrent login callers share only the pending attempt and a failure permits recovery", async () => {
  let finish!: (session: AuthSessionData) => void;
  let fail!: (error: Error) => void;
  const run = loadSessionRuntime(() => new Promise((resolve, reject) => { finish = resolve; fail = reject; }));
  const first = run.ensureSession(), second = run.ensureSession();
  const rejected = Promise.all([assert.rejects(first, /synthetic offline/), assert.rejects(second, /synthetic offline/)]);
  await new Promise<void>(resolve => setImmediate(resolve));
  assert.equal(run.state.logins, 1);
  fail(Error("synthetic offline"));
  await rejected;
  const next = run.ensureSession(), concurrent = run.ensureSession();
  await new Promise<void>(resolve => setImmediate(resolve));
  assert.equal(run.state.logins, 2);
  finish({ userId: "user:a" as UserId, accessToken: "synthetic:new", expiresAt: "2999-01-01" });
  assert.equal(await next, await concurrent);
  assert.equal(run.state.owner, "user:a");
});

test("an older login failure cannot release a newer in-flight login", async () => {
  const attempts: { resolve(session: AuthSessionData): void; reject(error: Error): void }[] = [];
  const run = loadSessionRuntime(() => new Promise((resolve, reject) => attempts.push({ resolve, reject })));
  const old = run.ensureSession();
  const rejected = assert.rejects(old, /synthetic old failure/);
  await new Promise<void>(resolve => setImmediate(resolve));
  run.clearStoredSession();
  const next = run.ensureSession();
  await new Promise<void>(resolve => setImmediate(resolve));
  attempts[0]!.reject(Error("synthetic old failure"));
  await rejected;
  const joined = run.ensureSession();
  await new Promise<void>(resolve => setImmediate(resolve));
  assert.equal(run.state.logins, 2, "old cleanup must preserve the newer flight");
  attempts[1]!.resolve({ userId: "user:b" as UserId, accessToken: "synthetic:b", expiresAt: "2999-01-01" });
  assert.equal(await next, await joined);
});

test("an older successful login cannot overwrite a newer account after invalidation", async () => {
  const attempts: ((session: AuthSessionData) => void)[] = [];
  const run = loadSessionRuntime(() => new Promise(resolve => attempts.push(resolve)));
  const old = run.ensureSession();
  const cancelled = assert.rejects(old, error => error instanceof MiniappRequestCancelled && error.reason === "superseded");
  await new Promise<void>(resolve => setImmediate(resolve));
  run.clearStoredSession();
  const next = run.ensureSession();
  await new Promise<void>(resolve => setImmediate(resolve));
  attempts[1]!({ userId: "user:b" as UserId, accessToken: "synthetic:b", expiresAt: "2999-01-01" });
  await next;
  attempts[0]!({ userId: "user:a" as UserId, accessToken: "synthetic:a", expiresAt: "2999-01-01" });
  await cancelled;
  assert.equal(run.currentDraftUserId(), "user:b");
  assert.equal(run.state.owner, "user:b");
});

test("a transport failure preserves an independently valid session and its active owner", async () => {
  const run = loadSessionRuntime();
  const session = await run.ensureSession();
  const transport = transportHarness();
  const request = createAuthenticatedOperationRequester({
    resolveSession: () => run.ensureSession(),
    readStoredSession: () => run.storage.get("auth") as AuthSessionData,
    clearStoredSession: () => run.clearStoredSession(),
    request: transport.request,
    isPermissionDenied: () => false,
  } as any);
  const pending = request("plans", "plansGet", { auth: "REQUIRED" });
  const rejected = assert.rejects(pending, /synthetic network failure/);
  await new Promise<void>(resolve => setImmediate(resolve));
  assert.equal(transport.calls.length, 1);
  transport.calls[0]!.fail({ errMsg: "synthetic network failure" });
  await rejected;
  assert.equal(run.storage.get("auth"), session);
  assert.equal(run.state.owner, "user:a");
  assert.equal(run.state.logins, 1);
});

test("permission retry obtains a new session when native removal of the rejected token fails", async () => {
  const run = loadSessionRuntime();
  const old = await run.ensureSession();
  run.state.removeFails = true;
  const transport = transportHarness();
  const request = createAuthenticatedOperationRequester({
    resolveSession: () => run.ensureSession(), readStoredSession: () => run.readStoredSession(),
    clearStoredSession: () => run.clearStoredSession(), request: transport.request,
    isPermissionDenied: (error: unknown) => error instanceof transport.MiniappApiError && error.code === "PERMISSION_DENIED",
  } as any);
  const pending = request("plans", "plansGet", { auth: "REQUIRED" });
  await new Promise<void>(resolve => setImmediate(resolve));
  transport.calls[0]!.success({ statusCode: 401, data: {
    code: "PERMISSION_DENIED", message: "synthetic rejected session", requestId: "synthetic", retryable: false, recovery: [],
  } });
  await new Promise<void>(resolve => setImmediate(resolve));
  assert.equal(transport.calls.length, 2);
  assert.notEqual(transport.calls[1]!.header.Authorization, "Bearer " + old.accessToken);
  assert.equal(run.state.logins, 2);
  transport.calls[1]!.success({ statusCode: 200, data: transport.response });
  await pending;
  assert.equal(run.state.owner, "user:a");
});

test("failed native erasure and renewal cannot revive the rejected session; a later new token can recover", async () => {
  for (const unreadable of [false, true]) {
    const run = loadSessionRuntime();
    const old = await run.ensureSession();
    run.state.removeFails = true;
    run.state.readFails = unreadable;
    run.clearStoredSession();
    run.state.readFails = false;
    assert.equal(run.currentDraftUserId(), null);
    assert.equal(run.state.owner, null);
    run.state.writeFails = true;
    await assert.rejects(run.ensureSession(), /synthetic native write failed/);
    assert.equal(run.storage.get("auth"), old);
    assert.equal(run.currentDraftUserId(), null);
    run.state.writeFails = false;
    const renewed = await run.ensureSession();
    assert.notEqual(renewed.accessToken, old.accessToken);
    assert.equal(run.state.owner, "user:a");
  }
});

test("a residual token cannot cancel forced renewal and concurrent callers join the new login", async () => {
  let finish!: (session: AuthSessionData) => void;
  const run = loadSessionRuntime(async attempt => attempt === 1
    ? { userId: "user:a" as UserId, accessToken: "synthetic:old", expiresAt: "2999-01-01" }
    : new Promise(resolve => { finish = resolve; }));
  await run.ensureSession();
  run.state.removeFails = true;
  const forced = run.ensureSession(true);
  await new Promise<void>(resolve => setImmediate(resolve));
  const joined = run.ensureSession();
  assert.equal(run.state.owner, null);
  finish({ userId: "user:a" as UserId, accessToken: "synthetic:new", expiresAt: "2999-01-01" });
  assert.equal(await forced, await joined);
  assert.equal(run.state.logins, 2);
  assert.equal(run.state.owner, "user:a");
});

test("a valid native current account supersedes an older pending login", async () => {
  let finish!: (session: AuthSessionData) => void;
  const run = loadSessionRuntime(() => new Promise(resolve => { finish = resolve; }));
  const old = run.ensureSession();
  const cancelled = assert.rejects(old, error => error instanceof MiniappRequestCancelled && error.reason === "superseded");
  await new Promise<void>(resolve => setImmediate(resolve));
  const current = { userId: "user:b" as UserId, accessToken: "synthetic:b", expiresAt: "2999-01-01" };
  run.storage.set("auth", current);
  assert.equal(await run.ensureSession(), current);
  finish({ userId: "user:a" as UserId, accessToken: "synthetic:a", expiresAt: "2999-01-01" });
  await cancelled;
  assert.equal(run.state.owner, "user:b");
  assert.equal(run.storage.get("auth"), current);
});

test("parallel old permission rejections join the successor login instead of retiring it", async () => {
  let finish!: (session: AuthSessionData) => void;
  const run = loadSessionRuntime(async attempt => attempt === 1
    ? { userId: "user:a" as UserId, accessToken: "synthetic:old", expiresAt: "2999-01-01" }
    : new Promise(resolve => { finish = resolve; }));
  await run.ensureSession();
  const transport = transportHarness();
  const request = createAuthenticatedOperationRequester({
    resolveSession: () => run.ensureSession(), readStoredSession: () => run.readStoredSession(),
    clearStoredSession: (rejected?: AuthSessionData) => run.clearStoredSession(rejected), request: transport.request,
    isPermissionDenied: (error: unknown) => error instanceof transport.MiniappApiError && error.code === "PERMISSION_DENIED",
  } as any);
  const plans = request("plans", "plansGet", { auth: "REQUIRED" });
  const favorites = request("favorites", "favoritesGet", { auth: "REQUIRED" });
  await new Promise<void>(resolve => setImmediate(resolve));
  const failure = { statusCode: 401, data: { code: "PERMISSION_DENIED", message: "synthetic", requestId: "synthetic", retryable: false, recovery: [] } };
  transport.calls[0]!.success(failure);
  await new Promise<void>(resolve => setImmediate(resolve));
  transport.calls[1]!.success(failure);
  await new Promise<void>(resolve => setImmediate(resolve));
  assert.equal(run.state.logins, 2, "both rejected requests must share the successor login");
  finish({ userId: "user:a" as UserId, accessToken: "synthetic:new", expiresAt: "2999-01-01" });
  await new Promise<void>(resolve => setImmediate(resolve));
  assert.equal(transport.calls.length, 4);
  for (const call of transport.calls.slice(2)) {
    assert.equal(call.header.Authorization, "Bearer synthetic:new");
    call.success({ statusCode: 200, data: transport.response });
  }
  await Promise.all([plans, favorites]);
  assert.equal(run.state.owner, "user:a");
});

test("session restoration and fresh login bind the matching private store before returning", async () => {
  for (const stored of [true, false]) {
    const bound: string[] = [];
    const saved: unknown[] = [];
    let sessionPromise: Promise<unknown> | null = null;
    const run = vm.runInNewContext(codeFor(["ensureSession"], "ensureSession;"), {
      readStoredSession: () => stored ? { userId: "user:a" } : null,
      useAppStore: { getState: () => ({ bindAccount: (owner: string) => bound.push(owner) }) },
      get sessionPromise() { return sessionPromise; }, set sessionPromise(value: Promise<unknown> | null) { sessionPromise = value; },
      requestOperation: async (_key: string, operation: string) => operation === "capabilitiesGet"
        ? { data: { flags: { WECHAT_AUTH_ENABLED: false } } }
        : { data: { userId: "user:b", accessToken: "token", expiresAt: "2999-01-01T00:00:00.000Z" } },
      installationIdentity: () => "local:synthetic", erasedStoredAccountIds: new Set(),
      invalidatedStoredSession: null,
      Taro: { setStorageSync: (_key: string, value: unknown) => saved.push(value) },
      SESSION_STORAGE_KEY: "auth",
      clearStoredSession: () => assert.fail("no forced login expected"),
    }) as () => Promise<{ userId: string }>;
    assert.equal((await run()).userId, stored ? "user:a" : "user:b");
    assert.deepEqual(bound, [stored ? "user:a" : "user:b"]);
    assert.equal(saved.length, stored ? 0 : 1);
  }
});

test("an expired native session hides its private store before reauthentication", () => {
  const bound: (string | null)[] = [];
  let removed = false;
  const read = vm.runInNewContext(codeFor(["readStoredSession"], "readStoredSession;"), {
    SESSION_STORAGE_KEY: "auth", SESSION_EXPIRY_SKEW_MS: 60_000,
    erasedStoredAccountIds: new Set(),
    invalidatedStoredSession: null,
    Taro: {
      getStorageSync: () => ({ userId: "user:a", accessToken: "old", expiresAt: "2020-01-01T00:00:00.000Z" }),
      removeStorageSync: () => { removed = true; },
    },
    useAppStore: { getState: () => ({ bindAccount: (owner: string | null) => bound.push(owner) }) },
  }) as () => unknown;
  assert.equal(read(), null);
  assert.equal(removed, true);
  assert.deepEqual(bound, [null]);
});

test("account export obtains a fresh native code and refuses account changes or failed identity checks", async () => {
  for (const scenario of ["success", "login-failed", "changed-before-request", "changed-after-request"]) {
    let owner = "a", logins = 0, requests = 0;
    const receipt = { data: { generatedAt: "synthetic" } };
    const run = vm.runInNewContext(codeFor(["accountReauthentication", "exportAccountData"], "exportAccountData;"), {
      ensureSession: async () => ({ userId: "a" }),
      getCapabilities: async () => ({ data: { flags: { WECHAT_AUTH_ENABLED: true } } }),
      Taro: { login: async () => {
        logins++;
        if (scenario === "login-failed") throw Error("native login failed");
        if (scenario === "changed-before-request") owner = "b";
        return { code: "synthetic-fresh-code" };
      } },
      currentDraftUserId: () => owner,
      requestOperation: async (_key: string, _operation: string, options: { reauthenticationCode: string; cache: boolean }, retried: boolean, expected: string) => {
        requests++;
        assert.equal(options.reauthenticationCode, "synthetic-fresh-code");
        assert.equal(options.cache, false);
        assert.equal(retried, false);
        assert.equal(expected, "a");
        if (scenario === "changed-after-request") owner = "b";
        return receipt;
      },
    });
    if (scenario === "success") assert.equal(await run(), receipt);
    else await assert.rejects(run());
    assert.equal(logins, 1);
    assert.equal(requests, ["success", "changed-after-request"].includes(scenario) ? 1 : 0);
  }
});

test("a failed sensitive request never reuses its native code or clears the current session", async () => {
  let requests = 0;
  class ApiError extends Error { code = "PERMISSION_DENIED"; }
  const run = createAuthenticatedOperationRequester({
    resolveSession: async () => ({ userId: "a" as UserId, accessToken: "test-only", expiresAt: "2099-01-01T00:00:00Z" }),
    request: async (_key: string, _path: string, options: { reauthenticationCode: string }) => {
      requests++;
      assert.equal(options.reauthenticationCode, "synthetic-fresh-code");
      throw new ApiError();
    },
    clearStoredSession: () => assert.fail("must retain the session"),
    readStoredSession: () => null,
    isPermissionDenied: (error: unknown) => error instanceof ApiError,
  });
  await assert.rejects(run("export", "accountDataExportGet", { auth: "REQUIRED", reauthenticationCode: "synthetic-fresh-code" }, false, "a"));
  assert.equal(requests, 1);
});

test("deletion receipts clean only the initiating account after an account switch", async () => {
  for (const switched of [false, true]) {
    let owner: string | null = "a", cleared = 0, queryClears = 0;
    const removed: string[] = [];
    const cache = new Map([["private:a", {}], ["private:b", {}]]);
    const queries = [{ queryKey: ["plans", "a"] }, { queryKey: ["plans", "b"] }];
    const belongs = (key: string, user: string) => key === "draft:" + user;
    const run = vm.runInNewContext(codeFor(["deleteAccount"], "deleteAccount;"), {
      accountReauthentication: async () => ({ userId: "a", code: "synthetic" }),
      idempotencyKey: () => "synthetic",
      requestOperation: async (_key: string, _op: string, _options: unknown, _retry: boolean, expected: string) => {
        assert.equal(expected, "a");
        if (switched) owner = "b";
        return { data: { deleted: true } };
      },
      currentDraftUserId: () => owner,
      readStoredSession: () => ({ userId: owner }), sessionPromise: null,
      useAppStore: { getState: () => ({ accountOwnerId: owner, resetAfterAccountDeletion: (deleted: string) => {
        assert.equal(deleted, "a"); if (owner === deleted) owner = null; return true;
      } }) },
      markAccountErased: (userId: string) => assert.equal(userId, "a"),
      Taro: { getStorageSync: (key: string) => key === "installation" ? "synthetic-installation" : key === "auth" && !switched ? { userId: "a" } : null, getStorageInfoSync: () => ({ keys: ["draft:a", "draft:b"] }), removeStorageSync: (key: string) => {
        removed.push(key); if (key === "auth") cleared++;
      } }, SESSION_STORAGE_KEY: "auth",
      planDraftBelongsTo: belongs, contributionDraftBelongsTo: belongs, contributionSubmitBelongsTo: belongs,
      profileDraftBelongsTo: belongs, profileSaveBelongsTo: belongs, importSaveBelongsTo: belongs,
      importLocalDraftBelongsTo: belongs, planChecklistBelongsTo: belongs, planSaveBelongsTo: belongs,
      planEventSelectionBelongsTo: belongs,
      responseCache: {
        clear: () => cache.clear(), flush: async () => {}, cleanupComplete: () => true,
        removeScope: async (userId: string) => { for (const key of cache.keys()) if (key.endsWith(":" + userId)) cache.delete(key); return true; },
      },
      INSTALLATION_STORAGE_KEY: "installation",
      miniappQueryClient: {
        clear: () => { queryClears++; },
        removeQueries: ({ predicate }: { predicate: (query: { queryKey: string[] }) => boolean }) => {
          assert.equal(predicate(queries[0]!), true);
          assert.equal(predicate(queries[1]!), false);
        },
      },
    });
    const receipt = await run();
    assert.equal(receipt.data.deleted, true);
    assert.equal(receipt.localAccountReset, !switched);
    assert.equal(receipt.localCleanupComplete, true);
    assert.equal(cleared, switched ? 0 : 1);
    assert.equal(queryClears, 0);
    assert.equal(removed.includes("draft:a"), true);
    assert.equal(removed.includes("draft:b"), false);
    assert.equal(removed.includes("installation"), !switched);
    assert.equal(cache.has("private:a"), false);
    assert.equal(cache.has("private:b"), true);
  }
});

test("confirmed remote deletion reports failed native erasure and cannot restore its old current session", async () => {
  for (const switched of [false, true]) {
    const data = new Map<string, unknown>();
    let failWrites = false, queryCleared = false, serverDeleted = false;
    const taro = {
      getStorageSync: (key: string) => data.get(key),
      getStorageInfoSync: () => ({ keys: [...data.keys()] }),
      setStorageSync: (key: string, value: unknown) => { if (failWrites) throw Error("native store unavailable"); data.set(key, value); },
      removeStorageSync: (key: string) => { if (failWrites) throw Error("native store unavailable"); data.delete(key); },
      setStorage: async ({ key, data: value }: { key: string; data: string }) => { if (failWrites) throw Error("native store unavailable"); data.set(key, value); },
    };
    const responseCache = createResponseCache(taro);
    data.set("auth", { userId: "a", accessToken: "synthetic-session", expiresAt: new Date(Date.now() + 3_600_000).toISOString() });
    responseCache.set("plans:/v2/plans:a", { apiVersion: "v2", dataState: "FRESH", generatedAt: new Date().toISOString(), validAt: new Date().toISOString(), requestId: "test", etag: "test", warnings: [], sources: [], data: { owner: "a" } });
    await responseCache.flush();
    const belongs = (key: string, owner: string) => key === "draft:" + owner;
    const run = vm.runInNewContext(codeFor(["readStoredSession", "clearStoredSession", "markAccountErased", "currentDraftUserId", "deleteAccount"], "({deleteAccount, currentDraftUserId});"), {
      SESSION_STORAGE_KEY: "auth", SESSION_EXPIRY_SKEW_MS: 60_000, INSTALLATION_STORAGE_KEY: "installation",
      erasedStoredAccountIds: new Set(), invalidatedStoredSession: null, sessionPromise: null, responseCache, Taro: taro,
      useAppStore: { getState: () => ({ accountOwnerId: switched ? "b" : null, bindAccount: () => undefined,
        resetAfterAccountDeletion: () => !failWrites }) },
      accountReauthentication: async () => ({ userId: "a", code: "synthetic" }), idempotencyKey: () => "synthetic",
      requestOperation: async () => {
        serverDeleted = true;
        if (switched) data.set("auth", { userId: "b", accessToken: "synthetic-other", expiresAt: new Date(Date.now() + 3_600_000).toISOString() });
        failWrites = true;
        return { data: { deleted: true } };
      },
      planDraftBelongsTo: belongs, contributionDraftBelongsTo: belongs, contributionSubmitBelongsTo: belongs,
      profileDraftBelongsTo: belongs, profileSaveBelongsTo: belongs, importSaveBelongsTo: belongs,
      importLocalDraftBelongsTo: belongs, planChecklistBelongsTo: belongs, planSaveBelongsTo: belongs,
      planEventSelectionBelongsTo: belongs,
      miniappQueryClient: { clear: () => { queryCleared = true; }, removeQueries: () => { queryCleared = true; } },
    });
    const receipt = await run.deleteAccount();
    assert.equal(serverDeleted, true);
    assert.equal(receipt.data.deleted, true, "native cleanup failure must not relabel the successful remote deletion");
    assert.equal(receipt.localCleanupComplete, false);
    assert.equal(receipt.localAccountReset, !switched);
    assert.equal(queryCleared, true);
    assert.equal(run.currentDraftUserId(), switched ? "b" : null);
    assert.equal(responseCache.get("plans:/v2/plans:a"), undefined);
    assert.equal(data.has("auth"), true, "failure is real: the native session still exists, but the revoked identity is fenced");
  }
});

test("an old login response completing after erasure cannot rewrite the revoked session", async () => {
  let finishLogin!: (value: unknown) => void;
  const writes: unknown[] = [];
  const run = vm.runInNewContext(codeFor(["ensureSession", "markAccountErased"], "({ensureSession, markAccountErased});"), {
    erasedStoredAccountIds: new Set(), invalidatedStoredSession: null, sessionPromise: null, SESSION_STORAGE_KEY: "auth",
    readStoredSession: () => null, installationIdentity: () => "synthetic-installation",
    requestOperation: async (_key: string, operation: string) => operation === "capabilitiesGet"
      ? { data: { flags: { WECHAT_AUTH_ENABLED: false } } }
      : new Promise(resolve => { finishLogin = resolve; }),
    Taro: { setStorageSync: (_key: string, value: unknown) => writes.push(value) },
  });
  const pending = run.ensureSession();
  const rejection = assert.rejects(pending, /account_identity_revoked/);
  await new Promise<void>(resolve => setImmediate(resolve));
  run.markAccountErased("a");
  finishLogin({ data: { userId: "a", accessToken: "synthetic", expiresAt: "2999-01-01" } });
  await rejection;
  assert.equal(writes.length, 0);
});

test("erasure settles the old installation after rejected or superseded login without clearing a successor", async () => {
  for (const scenario of ["erased-a", "successor-b", "replaced-pending", "changed-installation", "unknown-session"]) {
    const native = new Map<string, unknown>([["auth", { userId: "a", accessToken: "original", expiresAt: "2999-01-01" }], ["installation", "original-installation"]]);
    let owner: string | null = "a", flushStarted!: () => void, finishFlush!: () => void;
    const flushArrival = new Promise<void>(resolve => { flushStarted = resolve; });
    const flush = new Promise<void>(resolve => { finishFlush = resolve; });
    const logins: ((userId: string) => void)[] = [];
    const none = () => false;
    const run = vm.runInNewContext(codeFor(["readStoredSession", "clearStoredSession", "markAccountErased", "currentDraftUserId", "ensureSession", "deleteAccount"], "({ensureSession, deleteAccount});"), {
      SESSION_STORAGE_KEY: "auth", INSTALLATION_STORAGE_KEY: "installation", SESSION_EXPIRY_SKEW_MS: 60_000,
      erasedStoredAccountIds: new Set(), invalidatedStoredSession: null, sessionPromise: null, MiniappRequestCancelled,
      installationIdentity: () => "original-installation", accountReauthentication: async () => ({ userId: "a", code: "synthetic" }), idempotencyKey: () => "synthetic",
      Taro: { getStorageSync: (key: string) => native.get(key), setStorageSync: (key: string, value: unknown) => native.set(key, value), removeStorageSync: (key: string) => native.delete(key), getStorageInfoSync: () => ({ keys: [...native.keys()] }) },
      useAppStore: { getState: () => ({ accountOwnerId: owner, bindAccount: (next: string | null) => { owner = next; }, resetAfterAccountDeletion: () => { owner = null; return true; } }) },
      requestOperation: async (_key: string, operation: string) => {
        if (operation === "accountDelete") return { data: { deleted: true } };
        if (operation === "capabilitiesGet") return { data: { flags: { WECHAT_AUTH_ENABLED: false } } };
        return new Promise(resolve => { logins.push(userId => resolve({ data: { userId, accessToken: "synthetic", expiresAt: "2999-01-01" } })); });
      },
      planDraftBelongsTo: none, contributionDraftBelongsTo: none, contributionSubmitBelongsTo: none, profileDraftBelongsTo: none, profileSaveBelongsTo: none, importSaveBelongsTo: none, importLocalDraftBelongsTo: none, planChecklistBelongsTo: none, planEventSelectionBelongsTo: none, planSaveBelongsTo: none,
      miniappQueryClient: { removeQueries: () => undefined }, responseCache: { removeScope: async () => { flushStarted(); await flush; return true; } },
    }) as { ensureSession(force?: boolean): Promise<AuthSessionData>; deleteAccount(): Promise<{ data: { deleted: boolean }; localAccountReset: boolean; localCleanupComplete: boolean }> };
    const deletion = run.deleteAccount(); await flushArrival;
    const pending = run.ensureSession(true).then(value => value.userId, error => error.message);
    await new Promise<void>(resolve => setImmediate(resolve)); assert.equal(logins.length, 1);
    finishFlush(); const receipt = await deletion;
    assert.equal(receipt.data.deleted, true); assert.equal(receipt.localAccountReset, true);
    assert.equal(receipt.localCleanupComplete, false, "an unresolved login leaves native cleanup unconfirmed");
    if (scenario === "replaced-pending") {
      const replacement = run.ensureSession(true).then(value => value.userId, error => error.message);
      await new Promise<void>(resolve => setImmediate(resolve)); assert.equal(logins.length, 2);
      logins[0]!("a"); await pending;
      assert.equal(native.get("installation"), "original-installation", "the older completion cannot clear an installation while the replacement login owns it");
      logins[1]!("a"); assert.equal(await replacement, "account_identity_revoked");
    } else {
      if (scenario === "changed-installation") native.set("installation", "successor-installation");
      if (scenario === "unknown-session") native.set("auth", { opaque: "unclaimed" });
      logins[0]!(scenario === "successor-b" ? "b" : "a"); await pending;
    }
    if (scenario === "erased-a" || scenario === "replaced-pending") {
      assert.equal(native.has("installation"), false, scenario + " must release the deleted installation after the last login settles");
      assert.equal(native.has("auth"), false); assert.equal(owner, null);
    } else {
      assert.equal(native.get("installation"), scenario === "changed-installation" ? "successor-installation" : "original-installation");
      if (scenario === "successor-b") { assert.equal((native.get("auth") as AuthSessionData).userId, "b"); assert.equal(owner, "b"); }
      if (scenario === "unknown-session") assert.deepEqual(native.get("auth"), { opaque: "unclaimed" });
    }
  }
});

test("late deletion preserves an established successor even if its credentials expire during cache cleanup", async () => {
  const native = new Map<string, unknown>([["auth", { userId: "a", accessToken: "original", expiresAt: "2999-01-01" }], ["installation", "original-installation"]]);
  let owner: string | null = "a", flushStarted!: () => void, finishFlush!: () => void;
  const arrival = new Promise<void>(resolve => { flushStarted = resolve; });
  const flush = new Promise<void>(resolve => { finishFlush = resolve; });
  const none = () => false;
  const run = vm.runInNewContext(codeFor(["readStoredSession", "clearStoredSession", "markAccountErased", "currentDraftUserId", "ensureSession", "deleteAccount"], "({ensureSession, deleteAccount});"), {
    SESSION_STORAGE_KEY: "auth", INSTALLATION_STORAGE_KEY: "installation", SESSION_EXPIRY_SKEW_MS: 60_000,
    erasedStoredAccountIds: new Set(), invalidatedStoredSession: null, sessionPromise: null, MiniappRequestCancelled,
    installationIdentity: () => "original-installation", accountReauthentication: async () => ({ userId: "a", code: "synthetic" }), idempotencyKey: () => "synthetic",
    Taro: { getStorageSync: (key: string) => native.get(key), setStorageSync: (key: string, value: unknown) => native.set(key, value), removeStorageSync: (key: string) => native.delete(key), getStorageInfoSync: () => ({ keys: [...native.keys()] }) },
    useAppStore: { getState: () => ({ accountOwnerId: owner, bindAccount: (next: string | null) => { owner = next; }, resetAfterAccountDeletion: () => { owner = null; return true; } }) },
    requestOperation: async (_key: string, operation: string) => operation === "accountDelete" ? { data: { deleted: true } }
      : operation === "capabilitiesGet" ? { data: { flags: { WECHAT_AUTH_ENABLED: false } } }
      : { data: { userId: "b", accessToken: "successor", expiresAt: "2999-01-01" } },
    planDraftBelongsTo: none, contributionDraftBelongsTo: none, contributionSubmitBelongsTo: none, profileDraftBelongsTo: none, profileSaveBelongsTo: none, importSaveBelongsTo: none, importLocalDraftBelongsTo: none, planChecklistBelongsTo: none, planEventSelectionBelongsTo: none, planSaveBelongsTo: none,
    miniappQueryClient: { removeQueries: () => undefined }, responseCache: { removeScope: async () => { flushStarted(); await flush; return true; } },
  });
  const deletion = run.deleteAccount(); await arrival;
  const successor = await run.ensureSession(true);
  assert.equal(successor.userId, "b"); assert.equal(owner, "b");
  native.set("auth", { ...successor, expiresAt: "2001-01-01" });
  finishFlush(); const receipt = await deletion;
  assert.equal(receipt.data.deleted, true);
  assert.equal(receipt.localAccountReset, false, "A completion cannot claim B's departure as its own reset");
  assert.equal(native.get("installation"), "original-installation");
  assert.equal((native.get("auth") as AuthSessionData).userId, "b");
  assert.equal(owner, "b");
});

test("revoking another identity cannot make an earlier erased native session valid again", () => {
  let value: AuthSessionData = { userId: "a" as UserId, accessToken: "synthetic:a", expiresAt: "2999-01-01" };
  const run = vm.runInNewContext(codeFor(["readStoredSession", "markAccountErased"], "({readStoredSession,markAccountErased});"), {
    erasedStoredAccountIds: new Set(), invalidatedStoredSession: null, SESSION_STORAGE_KEY: "auth", SESSION_EXPIRY_SKEW_MS: 60_000,
    Taro: { getStorageSync: () => value }, useAppStore: { getState: () => ({ bindAccount() {} }) },
  });
  run.markAccountErased("a");
  assert.equal(run.readStoredSession(), null);
  run.markAccountErased("b");
  assert.equal(run.readStoredSession(), null, "earlier erasure must remain authoritative in this runtime");
  value = { userId: "c" as UserId, accessToken: "synthetic:c", expiresAt: "2999-01-01" };
  assert.equal(run.readStoredSession(), value, "an independent identity remains usable");
});
