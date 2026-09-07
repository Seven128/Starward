import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { ContributionSubmitStorageError } from "../../services/contribution-submit-retry";

test("lost submission receipt retries the saved revision without saving again", async () => {
  const source = ts.createSourceFile("commands.ts", readFileSync(new URL("./use-contribution-commands.ts", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
  const declaration = source.statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === "createSubmit");
  assert.ok(declaration);
  class ApiError extends Error { constructor(public statusCode: number) { super("rejected"); } }
  let failure: Error | null = new Error("response lost");
  const requests: unknown[] = [];
  const saved = { submissionId: "draft-a", revision: 7 };
  const createSubmit = vm.runInNewContext(ts.transpileModule(declaration.getText(source) + "\ncreateSubmit;", { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText, {
    MiniappApiError: ApiError, ContributionSubmitStorageError, errorMessage: (error: Error) => error.message,
    submitContribution: async (id: string, revision: number) => {
      requests.push([id, revision]);
      if (failure) throw failure;
      return { data: { ...saved, revision: 8 } };
    },
  });
  let saves = 0;
  let accountValid = true;
  const notices: string[] = [];
  const form = {
    submitting: false, pendingSubmission: null as typeof saved | null,
    mediaNeedsRecovery: false, detail: "现场事实说明足够完整且已获得明确的提交授权。", topics: ["ACCESS"],
    kind: "FIELD_REPORT", preciseLocationConsent: false,
    setSubmitting(value: boolean) { this.submitting = value; },
    setPendingSubmission(value: typeof saved | null) { this.pendingSubmission = value; },
    setValidationField() {},
    applyDraft() { this.pendingSubmission = null; },
    history: { refetch: async () => {} },
    announce: (_kind: string, title: string) => notices.push(title),
  };
  const submit = () => createSubmit(form, async () => { saves++; return saved; }, () => { if (!accountValid) throw new Error("account changed"); })();
  await submit();
  assert.equal(form.pendingSubmission, saved);
  assert.equal(notices.at(-1), "提交结果待确认");
  failure = null;
  await submit();
  assert.equal(saves, 1);
  assert.deepEqual(requests, [["draft-a", 7], ["draft-a", 7]]);
  assert.equal(form.pendingSubmission, null);
  assert.equal(notices.at(-1), "已提交审核");
  failure = new ApiError(422);
  await submit();
  assert.equal(form.pendingSubmission, null);
  assert.equal(notices.at(-1), "提交失败");
  failure = new ApiError(408);
  await submit();
  assert.equal(form.pendingSubmission, saved);
  assert.equal(notices.at(-1), "提交结果待确认");
  failure = new ContributionSubmitStorageError("尚未发出请求");
  await submit();
  assert.equal(form.pendingSubmission, null);
  assert.equal(notices.at(-1), "提交失败");
  accountValid = false;
  const count = requests.length;
  await submit();
  assert.equal(requests.length, count);
  assert.equal(form.pendingSubmission, null);
  assert.equal(form.submitting, false);
});
