import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { createMutationRetry } from "./mutation-retry";

function actualFormalSubmit() {
  const source = ts.createSourceFile("api-client.ts", readFileSync(new URL("./api-client.ts", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
  const declaration = source.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === "submitFormalContribution");
  assert.ok(declaration);
  return ts.transpileModule(declaration.getText(source).replace(/^export /, "") + "\nsubmitFormalContribution;", { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;
}

test("formal feedback retries an uncertain receipt with its original key and account", async () => {
  let owner = "account:a";
  let keyNumber = 0;
  const requests: { owner: string; key: string; body: unknown }[] = [];
  const receipt = { data: { state: "PENDING_REVIEW", submissionId: "feedback:one" } };
  const submit = vm.runInNewContext(actualFormalSubmit(), {
    currentDraftUserId: () => owner,
    ensureSession: async () => ({ userId: owner }),
    idempotencyKey: () => `key:${++keyNumber}`,
    retryFormalContributionSubmit: createMutationRetry(() => `key:${++keyNumber}`),
    requestOperation: async (_key: string, _operation: string, options: { body: unknown; idempotencyKey: string }, _retry: boolean, expectedOwner: string) => {
      requests.push({ owner: expectedOwner, key: options.idempotencyKey, body: options.body });
      if (requests.length === 1) throw new Error("receipt unknown");
      return receipt;
    },
    invalidateApiCache: () => undefined,
    miniappQueryClient: { invalidateQueries: async () => undefined },
  }) as (input: unknown) => Promise<typeof receipt>;
  const input = { kind: "CORRECTION", baseline: { revision: 1 }, proposal: { fields: { name: "新地点" } } };
  await assert.rejects(submit(input), /receipt unknown/);
  assert.equal(await submit(input), receipt);
  assert.equal(requests[1]?.key, requests[0]?.key);
  assert.deepEqual(requests.slice(0, 2).map(request => request.owner), ["account:a", "account:a"]);
  await submit(input);
  assert.notEqual(requests[2]?.key, requests[1]?.key, "confirmed receipt must release its retry key");
  owner = "account:b";
  await submit(input);
  assert.notEqual(requests[3]?.key, requests[2]?.key, "another account must not reuse the key");
});

test("formal feedback cannot apply a receipt after the active account changes", async () => {
  let owner = "account:a";
  let invalidations = 0;
  const submit = vm.runInNewContext(actualFormalSubmit(), {
    currentDraftUserId: () => owner,
    ensureSession: async () => ({ userId: "account:a" }),
    retryFormalContributionSubmit: createMutationRetry(() => "key:one"),
    requestOperation: async (_key: string, _operation: string, _options: unknown, _retry: boolean, expectedOwner: string) => {
      assert.equal(expectedOwner, "account:a");
      owner = "account:b";
      return { data: { state: "PENDING_REVIEW" } };
    },
    invalidateApiCache: () => { invalidations++; },
    miniappQueryClient: { invalidateQueries: async () => { invalidations++; } },
  }) as (input: unknown) => Promise<unknown>;
  await assert.rejects(submit({ baseline: { revision: 1 } }), /账号已变化/);
  assert.equal(invalidations, 0);
});

test("feedback submit takes a synchronous busy lock until the first request settles", async () => {
  const source = ts.createSourceFile("feedback.tsx", readFileSync(new URL("../content/spot-feedback/index.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let declaration: ts.VariableDeclaration | undefined;
  function visit(node: ts.Node): void {
    if (ts.isVariableDeclaration(node) && node.name.getText(source) === "submit") declaration = node;
    ts.forEachChild(node, visit);
  }
  visit(source);
  assert.ok(declaration);
  const code = ts.transpileModule(`const ${declaration.getText(source)};\nsubmit;`, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;
  let rejectFirst: (error: Error) => void = () => undefined;
  let calls = 0;
  let submitted = false;
  const notices: { title: string; tone: string }[] = [];
  const submit = vm.runInNewContext(code, {
    baseline: { revision: 1 }, proposal: { fields: { name: "新地点" } }, hasChanges: true, busy: false,
    submitted: false, activeConflicts: [], resolutions: {}, mediaProposal: {}, rightsConfirmed: true,
    uploadIntent: null, activeSubmissionId: "", resubmissionRevision: null,
    MiniappApiError: class extends Error {},
    submitBusy: { current: false }, setBusy: () => undefined, setSubmitted: (value: boolean) => { submitted = value; },
    setConflicts: () => undefined, notify: (notice: { title: string; tone: string }) => { notices.push(notice); }, errorMessage: (error: Error) => error.message,
    submitFormalContribution: async () => {
      calls++;
      if (calls === 1) return new Promise((_resolve, reject) => { rejectFirst = reject; });
      return { data: { state: "PENDING_REVIEW" } };
    },
  }) as () => Promise<void>;
  const first = submit();
  await submit();
  assert.equal(calls, 1, "a second tap before rerender must not dispatch another write");
  rejectFirst(new Error("receipt unknown"));
  await first;
  assert.equal(notices[0]?.title, "提交结果未确认");
  assert.equal(notices[0]?.tone, "warning");
  await submit();
  assert.equal(calls, 2, "a failed attempt must release the busy lock");
  assert.equal(submitted, true);
});
