import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

test("feedback conflict accepts only a fresh matching record and preserves inputs when refresh fails", async () => {
  const source = ts.createSourceFile("commands.ts", readFileSync(new URL("./use-contribution-commands.ts", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
  const declarations = source.statements.filter((node) => ts.isFunctionDeclaration(node) && ["activeDraft", "createSaveDraft"].includes(node.name?.text ?? ""));
  assert.equal(declarations.length, 2);
  class ApiError extends Error { code = "CONFLICT"; }
  let update: () => Promise<unknown> = async () => { throw new ApiError("changed"); };
  const createSave = vm.runInNewContext(ts.transpileModule(declarations.map((node) => node.getText(source)).join("\n") + "\ncreateSaveDraft;", { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText, {
    MiniappApiError: ApiError,
    contributionSubmissionState: () => "DRAFT",
    updateContributionDraft: () => update(),
    errorMessage: () => "草稿已更新",
  });
  for (const mode of ["fresh", "missing", "offline"] as const) {
    const notices: string[] = [];
    const adopted: unknown[] = [];
    const busy: boolean[] = [];
    const latest = { submissionId: "draft-a", revision: 8 };
    const form = {
      conflictDraft: null, draft: { submissionId: "draft-a", revision: 2 },
      formInput: () => ({ detail: "保留本页尚未保存的现场说明" }),
      setSaving: (value: boolean) => busy.push(value),
      applyDraft: () => assert.fail("conflict must not replace form inputs"),
      setConflictDraft: (value: unknown) => adopted.push(value),
      announce: (_kind: string, title: string) => notices.push(title),
      history: { refetch: async () => {
        if (mode === "offline") throw new Error("offline");
        return { data: { submissions: mode === "fresh" ? [latest] : [] } };
      } },
    };
    assert.equal(await createSave(form, () => {})(), null);
    assert.deepEqual(busy, [true, false]);
    assert.deepEqual(adopted, mode === "fresh" ? [latest] : []);
    assert.equal(notices.at(-1), mode === "fresh" ? "草稿保存失败" : "暂时无法核对草稿");
  }
  let sameAccount = true;
  update = async () => {
    sameAccount = false;
    return { data: { submissionId: "draft-a", revision: 9 } };
  };
  const form = {
    conflictDraft: null, draft: { submissionId: "draft-a", revision: 2 },
    formInput: () => ({ detail: "尚未保存的输入" }),
    setSaving: () => {},
    applyDraft: () => assert.fail("late success must not apply after account changes"),
    history: { refetch: () => assert.fail("late success must not query another account") },
    announce: (kind: string) => assert.notEqual(kind, "success"),
  };
  assert.equal(await createSave(form, () => { if (!sameAccount) throw new Error("account changed"); })(), null);
});
