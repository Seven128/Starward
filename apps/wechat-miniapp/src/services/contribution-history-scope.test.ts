import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

for (const functionName of ["getContributions", "getUserLibrary", "getPlans", "getProfileLinks", "getPostImports", "getPostImport"]) test(`${functionName} rejects a response delivered after its account changes`, async () => {
  const source = ts.createSourceFile("api-client.ts", readFileSync(new URL("./api-client.ts", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
  const declaration = source.statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === functionName);
  assert.ok(declaration);
  let owner = "account-a";
  let changeDuringRequest = false;
  const response = { data: { submissions: [{ detail: "account-a private draft" }] } };
  const expectedOwners: unknown[] = [];
  const getHistory = vm.runInNewContext(ts.transpileModule(declaration.getText(source).replace(/^export /, "") + `\n${functionName};`, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText, {
    ensureSession: async () => ({ userId: owner }),
    currentDraftUserId: () => owner,
    requestOperation: async (_key: unknown, _operation: unknown, _options: unknown, _retry: unknown, expected: unknown) => {
      expectedOwners.push(expected);
      if (expected !== owner) throw new Error("account mismatch");
      if (changeDuringRequest) owner = "account-b";
      return response;
    },
  });
  const read = () => functionName === "getPostImport" ? getHistory("import:one", undefined, "account-a") : getHistory(undefined, "account-a");
  assert.equal(await read(), response);
  changeDuringRequest = true;
  await assert.rejects(read(), /账号已变化/);
  await assert.rejects(read(), /account mismatch/);
  assert.deepEqual(expectedOwners, ["account-a", "account-a", "account-a"]);
});
