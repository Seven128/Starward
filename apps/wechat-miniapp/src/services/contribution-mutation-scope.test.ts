import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

test("all feedback mutations keep the initiating owner across session and receipt waits", async () => {
  const source = ts.createSourceFile("api.ts", readFileSync(new URL("./api-client.ts", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
  for (const name of ["createContributionDraft", "updateContributionDraft", "createContributionUpload", "completeContributionUpload", "removeContributionUpload", "submitContribution"]) {
    const node = source.statements.find(item => ts.isFunctionDeclaration(item) && item.name?.text === name);
    assert.ok(node);
    for (const phase of ["same", "session", "receipt"]) {
      let owner = "a", requests = 0, invalidations = 0;
      const retry = async (_owner: unknown, _input: unknown, operation: (key: string) => unknown) => operation("key");
      const receipt = { data: {} };
      const operation = vm.runInNewContext(ts.transpileModule(node.getText(source).replace(/^export /, "") + `\n${name};`, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText, {
        currentDraftUserId: () => owner,
        ensureSession: async () => { if (phase === "session") owner = "b"; return { userId: owner }; },
        retryContributionCreate: retry, retryContributionUpdate: retry, retryContributionUpload: retry, retryContributionRemoval: retry, retryContributionSubmit: retry,
        idempotencyKey: () => "key",
        requestOperation: async (_key: unknown, _op: unknown, _input: unknown, _retry: unknown, expected: string) => {
          requests++; assert.equal(expected, "a"); if (phase === "receipt") owner = "b"; return receipt;
        },
        invalidateApiCache: () => invalidations++, miniappQueryClient: { invalidateQueries: async () => {} },
      });
      const invoke = () => operation("contribution:test", "upload:test", { expectedRevision: 1 });
      if (phase === "same") { assert.equal(await invoke(), receipt); assert.equal(invalidations, 1); }
      else { await assert.rejects(invoke(), /账号已变化/); assert.equal(invalidations, 0); }
      assert.equal(requests, phase === "session" ? 0 : 1);
    }
  }
});
