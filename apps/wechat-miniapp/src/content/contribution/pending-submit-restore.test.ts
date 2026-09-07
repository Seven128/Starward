import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

test("pending submission recovery reads current owner, keeps the original revision and never submits", async () => {
  const source = ts.createSourceFile("form.ts", readFileSync(new URL("./use-contribution-form.ts", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
  let found: ts.VariableDeclaration | undefined;
  const visit = (node: ts.Node) => { if (ts.isVariableDeclaration(node) && node.name.getText(source) === "restorePendingSubmission") found = node; ts.forEachChild(node, visit); };
  visit(source);
  assert.ok(found?.initializer);
  for (const scenario of ["draft", "review", "switch", "offline", "local-copy"]) {
    let owner = "account-a";
    let busy = false;
    const adopted: unknown[] = [];
    const pending: unknown[] = [];
    let clears = 0;
    let reads = 0;
    const current = { submissionId: "contribution:one", revision: 5, state: scenario === "review" ? "PENDING_REVIEW" : "DRAFT" };
    const restore = vm.runInNewContext(ts.transpileModule(`const restore = ${found.initializer.getText(source)}; restore;`, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText, {
      submissionRecovery: { owner: "account-a" }, currentDraftUserId: () => owner, commandBusy: false,
      localDraft: { recovery: scenario === "local-copy" ? {} : null }, setCommandBusy: (value: boolean) => { busy = value; },
      getContributions: async (_signal: unknown, expectedOwner: string) => {
        reads++; assert.equal(expectedOwner, "account-a");
        if (scenario === "offline") throw new Error("offline");
        if (scenario === "switch") owner = "account-b";
        return { data: { submissions: [current] } };
      },
      contributionSubmissionState: (item: typeof current) => item.state,
      applyDraft: (item: unknown) => adopted.push(item), setPendingSubmission: (item: unknown) => pending.push(item),
      clearContributionSubmitIntent: () => { clears++; }, Taro: {}, history: { refetch: async () => {} }, announce() {},
    });
    await restore("contribution:one", 3);
    assert.equal(busy, false);
    if (scenario === "draft") { assert.deepEqual(adopted, [current]); assert.equal((pending[0] as typeof current).revision, 3); assert.equal(clears, 0); }
    else if (scenario === "review") { assert.deepEqual(adopted, [current]); assert.equal(pending.length, 0); assert.equal(clears, 1); }
    else { assert.equal(adopted.length, 0); assert.equal(pending.length, 0); assert.equal(clears, 0); }
    if (scenario === "local-copy") assert.equal(reads, 0);
  }
});
