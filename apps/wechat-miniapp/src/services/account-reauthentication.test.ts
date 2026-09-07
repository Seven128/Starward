import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

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
      clearStoredSession: () => { cleared++; },
      Taro: { getStorageInfoSync: () => ({ keys: ["draft:a", "draft:b"] }), removeStorageSync: (key: string) => removed.push(key) },
      planDraftBelongsTo: belongs, contributionDraftBelongsTo: belongs, contributionSubmitBelongsTo: belongs,
      profileDraftBelongsTo: belongs, profileSaveBelongsTo: belongs, importSaveBelongsTo: belongs,
      importLocalDraftBelongsTo: belongs, planChecklistBelongsTo: belongs, planSaveBelongsTo: belongs,
      responseCache: cache, responseCacheLoaded: true, persistResponseCache() {},
      RESPONSE_CACHE_STORAGE_KEY: "cache", INSTALLATION_STORAGE_KEY: "installation",
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
    assert.equal(cleared, switched ? 0 : 1);
    assert.equal(queryClears, switched ? 0 : 1);
    assert.equal(removed.includes("draft:a"), true);
    assert.equal(removed.includes("draft:b"), false);
    assert.equal(removed.includes("installation"), !switched);
    assert.equal(cache.has("private:a"), false);
    assert.equal(cache.has("private:b"), switched);
  }
});
