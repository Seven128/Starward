import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { createMutationRetry } from "./mutation-retry";
import { createProfileLinkRetry } from "./profile-link-retry";

for (const name of ["createProfileLink", "deleteProfileLink"]) test(`${name} binds retries to the original owner and ignores switched-account receipts`, async () => {
  const source = ts.createSourceFile("api.ts", readFileSync(new URL("./api-client.ts", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
  const declaration = source.statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === name);
  assert.ok(declaration);
  let sequence = 0, invalidations = 0;
  let owner = "a", outcome = "lost";
  const keys: string[] = [];
  const retry = createMutationRetry(() => `key:${++sequence}`);
  const storage = new Map<string, unknown>();
  const createRetry = createProfileLinkRetry({ getStorageSync: key => storage.get(key), setStorageSync: (key, value) => { storage.set(key, value); }, removeStorageSync: key => { storage.delete(key); } }, () => `key:${++sequence}`);
  const operation = vm.runInNewContext(ts.transpileModule(declaration.getText(source).replace(/^export /, "") + `\n${name};`, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText, {
    ensureSession: async () => ({ userId: owner }), currentDraftUserId: () => owner,
    retryProfileLinkCreate: createRetry, retryProfileLinkDelete: retry,
    requestOperation: async (_key: unknown, _op: unknown, options: { idempotencyKey: string }, _retry: unknown, expected: string) => {
      assert.equal(expected, "a");
      if (owner !== expected) throw new Error("owner mismatch");
      keys.push(options.idempotencyKey);
      if (outcome === "lost") throw new Error("response lost");
      if (outcome === "switch") owner = "b";
      return { data: {} };
    },
    invalidateAfter: async () => { invalidations++; },
  });
  const input = name === "createProfileLink" ? { platform: "OTHER", displayName: "Example", url: "https://example.com", visibility: "PRIVATE", sortOrder: 0 } : "link:one";
  await assert.rejects(operation(input, "a"), /response lost/);
  outcome = "success";
  await operation(input, "a");
  assert.deepEqual(keys, ["key:1", "key:1"]);
  assert.equal(invalidations, 1);
  outcome = "switch";
  await assert.rejects(operation(input, "a"), /账号已变化/);
  assert.equal(invalidations, 1);
  await assert.rejects(operation(input, "a"), /owner mismatch|账号已变化/);
});
