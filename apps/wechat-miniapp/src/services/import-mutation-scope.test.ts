import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { createImportSaveRetry } from "./import-save-retry";

for (const name of ["createPostImport", "updatePostImport"]) test(`${name} binds dispatch and cache effects to its initiating account`, async () => {
  const source = ts.createSourceFile("api.ts", readFileSync(new URL("./api-client.ts", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
  const declaration = source.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === name);
  assert.ok(declaration);
  let owner = "a", switchOnResponse = false, invalidations = 0, writes = 0;
  const storage = new Map<string, unknown>();
  const operation = vm.runInNewContext(ts.transpileModule(declaration.getText(source).replace(/^export /, "") + `\n${name};`, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText, {
    ensureSession: async () => ({ userId: owner }), currentDraftUserId: () => owner,
    idempotencyKey: () => "synthetic-key",
    retryImportSave: createImportSaveRetry({ getStorageSync: key => storage.get(key), setStorageSync: (key, value) => { storage.set(key, value); }, removeStorageSync: key => { storage.delete(key); } }, () => "synthetic-key", () => false),
    requestOperation: async (_key: unknown, _op: unknown, _options: unknown, _retry: unknown, expected: string) => {
      if (owner !== expected) throw new Error("account mismatch");
      writes++;
      if (switchOnResponse) owner = "b";
      return { data: {} };
    },
    invalidateAfter: async () => { invalidations++; },
  });
  const invoke = () => name === "createPostImport" ? operation({ platform: "OTHER", originalUrl: "https://example.com", rightsConfirmed: true }, "a") : operation("import:one", { expectedRevision: 1 }, "a");
  await invoke();
  assert.equal(invalidations, 1);
  switchOnResponse = true;
  await assert.rejects(invoke(), /账号已变化/);
  assert.equal(invalidations, 1);
  await assert.rejects(invoke(), /账号已变化/);
  assert.equal(writes, 2);
});
