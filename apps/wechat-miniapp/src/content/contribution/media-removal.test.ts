import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

for (const state of ["DRAFT", "REJECTED", "CHANGES_REQUESTED"]) test(`removing ${state} media preserves form inputs and cannot cross a changed account`, async () => {
  const source = ts.createSourceFile("commands.ts", readFileSync(new URL("./use-contribution-commands.ts", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
  const declarations = source.statements.filter((node) => ts.isFunctionDeclaration(node) && ["activeDraft", "createRemoveMedia"].includes(node.name?.text ?? ""));
  assert.equal(declarations.length, 2);
  let confirm = false;
  let accountValid = true;
  let lateAccountChange = false;
  const requests: unknown[] = [];
  const adopted: unknown[] = [];
  const next = { submissionId: "draft:a", revision: 5, media: [] };
  const create = vm.runInNewContext(ts.transpileModule(declarations.map((node) => node.getText(source)).join("\n") + "\ncreateRemoveMedia;", { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText, {
    Taro: { showModal: async () => ({ confirm }) },
    contributionSubmissionState: () => state,
    removeContributionUpload: async (...args: unknown[]) => { requests.push(args); if (lateAccountChange) accountValid = false; return { data: next }; },
    errorMessage: () => "账号已变化",
  });
  const form = {
    draft: { submissionId: "draft:a", revision: 4, media: [{ uploadId: "upload:a" }] },
    detail: "尚未保存的现场输入",
    applyDraft: () => assert.fail("media removal must not replace editable fields"),
    applyMediaDraft: (value: unknown) => adopted.push(value),
    removeCandidateMediaPreview() {},
    history: { refetch: async () => {} }, announce() {},
  };
  const remove = create(form, () => { if (!accountValid) throw new Error("changed"); });
  await remove("upload:a");
  assert.equal(requests.length, 0);
  confirm = true;
  await remove("upload:a");
  assert.equal(JSON.stringify(requests), JSON.stringify([["draft:a", "upload:a", 4]]));
  assert.deepEqual(adopted, [next]);
  assert.equal(form.detail, "尚未保存的现场输入");
  accountValid = false;
  await remove("upload:a");
  assert.equal(requests.length, 1);
  accountValid = true;
  lateAccountChange = true;
  await remove("upload:a");
  assert.equal(requests.length, 2);
  assert.equal(adopted.length, 1);
});
