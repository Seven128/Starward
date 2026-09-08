import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { createResponseCache } from "./response-cache";

const source = ts.createSourceFile("api.ts", readFileSync(new URL("./api-client.ts", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
function codeFor(names: string[], expression: string) {
  const declarations = names.map(name => {
    const node = source.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === name);
    assert.ok(node);
    return node.getText(source).replace(/^export /u, "");
  });
  return ts.transpileModule(declarations.join("\n") + "\n" + expression, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;
}

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
  const run = vm.runInNewContext(codeFor(["requestOperation"], "requestOperation;"), {
    resolveSession: async () => ({ userId: "a" }),
    request: async (_key: string, _path: string, options: { reauthenticationCode: string }) => {
      requests++;
      assert.equal(options.reauthenticationCode, "synthetic-fresh-code");
      throw new ApiError();
    },
    clearStoredSession: () => assert.fail("must retain the session"),
    operationPath: () => "/me/data-export",
    MINIAPP_API_OPERATIONS: { accountDataExportGet: { method: "GET" } }, MiniappApiError: ApiError,
  });
  await assert.rejects(run("export", "accountDataExportGet", { auth: "REQUIRED", reauthenticationCode: "synthetic-fresh-code" }, false, "a"));
  assert.equal(requests, 1);
});

test("deletion receipts clean only the initiating account after an account switch", async () => {
  for (const switched of [false, true]) {
    let owner = "a", cleared = 0, queryClears = 0;
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
      clearStoredSession: () => { cleared++; return true; },
      markAccountErased: (userId: string) => assert.equal(userId, "a"),
      Taro: { getStorageInfoSync: () => ({ keys: ["draft:a", "draft:b"] }), removeStorageSync: (key: string) => removed.push(key) },
      planDraftBelongsTo: belongs, contributionDraftBelongsTo: belongs, contributionSubmitBelongsTo: belongs,
      profileDraftBelongsTo: belongs, profileSaveBelongsTo: belongs, importSaveBelongsTo: belongs,
      importLocalDraftBelongsTo: belongs, planChecklistBelongsTo: belongs, planSaveBelongsTo: belongs,
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
    assert.equal(queryClears, switched ? 0 : 1);
    assert.equal(removed.includes("draft:a"), true);
    assert.equal(removed.includes("draft:b"), false);
    assert.equal(removed.includes("installation"), !switched);
    assert.equal(cache.has("private:a"), false);
    assert.equal(cache.has("private:b"), switched);
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
      erasedStoredAccountId: null, sessionPromise: null, responseCache, Taro: taro,
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
    erasedStoredAccountId: null, sessionPromise: null, SESSION_STORAGE_KEY: "auth",
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
