import { testOperation } from "./operation-test-support";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { ContributionSubmitStorageError } from "../../services/contribution-submit-retry";

test("lost submission acknowledgement verifies through GET without submitting or restoring an old revision", async () => {
  const source = ts.createSourceFile("commands.ts", readFileSync(new URL("./use-contribution-commands.ts", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
  const declaration = source.statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === "createSubmit");
  assert.ok(declaration);
  class ApiError extends Error { constructor(public statusCode: number) { super("rejected"); } }
  let failure: Error | null = new Error("response lost");
  const requests: unknown[] = [];
  let verified: { receipt: unknown; current: unknown } = { receipt: null, current: null };
  let verificationFailure: Error | null = null;
  let reads = 0;
  let adopted: unknown;
  const saved = { submissionId: "draft-a", revision: 7 };
  const createSubmit = vm.runInNewContext(ts.transpileModule(declaration.getText(source) + "\ncreateSubmit;", { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText, {
    MiniappApiError: ApiError, ContributionSubmitStorageError, errorMessage: (error: Error) => error.message,
    submitContribution: async (id: string, revision: number) => {
      requests.push([id, revision]);
      if (failure) throw failure;
      return { data: { ...saved, revision: 8 } };
    },
    getContributionSubmitResult: async (id: string, revision: number) => {
      reads++; assert.deepEqual([id, revision], ["draft-a", 7]);
      if (verificationFailure) throw verificationFailure;
      return verified;
    },
  });
  let saves = 0;
  let accountValid = true;
  const notices: string[] = [];
  const form = {
    submitting: false, pendingSubmission: null as typeof saved | null, submissionRetryAvailable: false,
    mediaNeedsRecovery: false, detail: "现场事实说明足够完整且已获得明确的提交授权。", topics: ["ACCESS"],
    kind: "FIELD_REPORT", preciseLocationConsent: false,
    setSubmitting(value: boolean) { this.submitting = value; },
    setPendingSubmission(value: typeof saved | null) { this.pendingSubmission = value; },
    setSubmissionRetryAvailable(value: boolean) { this.submissionRetryAvailable = value; },
    setValidationField() {},
    applyDraft(value: unknown) { adopted = value; this.pendingSubmission = null; },
    history: { refetch: async () => {} },
    announce: (_kind: string, title: string) => notices.push(title),
  };
  const submit = () => createSubmit(form, async () => { saves++; return saved; }, testOperation(() => { if (!accountValid) throw new Error("account changed"); }))();
  await submit();
  assert.equal(form.pendingSubmission, saved);
  assert.equal(notices.length, 0, "the persistent pending panel owns this visible recovery");
  failure = null;
  await submit();
  assert.equal(form.pendingSubmission, saved, "missing receipt remains unknown and frozen");
  assert.equal(notices.length, 0);
  const latest = { ...saved, revision: 10, state: "REJECTED" };
  verified = { receipt: { ...saved, revision: 8 }, current: latest };
  await submit();
  assert.equal(saves, 1);
  assert.deepEqual(requests, [["draft-a", 7]]);
  assert.equal(reads, 2); assert.equal(adopted, latest);
  assert.equal(form.pendingSubmission, null);
  assert.equal(notices.at(-1), "已核对提交结果");
  failure = new ApiError(422);
  await submit();
  assert.equal(form.pendingSubmission, null);
  assert.equal(notices.at(-1), "提交失败");
  failure = new ApiError(408);
  await submit();
  assert.equal(form.pendingSubmission, saved);
  assert.equal(notices.at(-1), "提交失败", "the unknown attempt adds no duplicate floating notice");
  verificationFailure = new ContributionSubmitStorageError("恢复标识暂不可读");
  await submit();
  assert.equal(form.pendingSubmission, saved);
  assert.equal(notices.at(-1), "提交结果待确认");
  accountValid = false;
  const count = requests.length;
  await assert.rejects(submit(), /account changed/);
  assert.equal(requests.length, count);
  assert.equal(form.pendingSubmission, saved);
  assert.equal(form.submitting, false);
});

test("a missing receipt enables a separate original replay while verification itself stays read-only", async () => {
  const source = ts.createSourceFile("commands.ts", readFileSync(new URL("./use-contribution-commands.ts", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
  const node = source.statements.find(value => ts.isFunctionDeclaration(value) && value.name?.text === "createSubmit")!;
  let reads = 0, replays = 0, adopted: unknown;
  const original = { submissionId: "contribution:original", revision: 7 }, latest = { ...original, revision: 9 };
  const create = vm.runInNewContext(ts.transpileModule(node.getText(source) + "\ncreateSubmit;", { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText, {
    getContributionSubmitResult: async () => { reads++; return { receipt: null, current: null }; },
    retryPendingContributionSubmit: async (id: string, revision: number) => { replays++; assert.deepEqual([id, revision],[original.submissionId,original.revision]); return { data: latest }; },
    errorMessage: (error: Error) => error.message,
  });
  const form = { pendingSubmission: original as typeof original | null, submitting: false, submissionRetryAvailable: false,
    setSubmitting(value: boolean) { this.submitting = value; }, setSubmissionRetryAvailable(value: boolean) { this.submissionRetryAvailable = value; },
    applyDraft(value: unknown) { adopted = value; this.pendingSubmission = null; }, history: { refetch: async () => {} }, announce() {} };
  const save = async () => assert.fail("recovery must not save the frozen draft again");
  await create(form,save,testOperation(),true)(); assert.equal(replays,0,"replay is unavailable before read-only verification");
  await create(form,save,testOperation())(); assert.equal(reads,1); assert.equal(replays,0); assert.ok(form.submissionRetryAvailable);
  await create(form,save,testOperation(),true)(); assert.equal(replays,1); assert.equal(adopted,latest); assert.equal(form.pendingSubmission,null);
});
