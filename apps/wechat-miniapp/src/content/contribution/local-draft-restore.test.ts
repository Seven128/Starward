import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

test("local recovery preserves the saved base revision and refuses submitted or switched-account drafts", async () => {
  const source = ts.createSourceFile("form.ts", readFileSync(new URL("./use-contribution-form.ts", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
  const component = source.statements.find((node): node is ts.FunctionDeclaration => ts.isFunctionDeclaration(node) && node.name?.text === "useContributionForm");
  const declaration = component?.body?.statements.find((node) => ts.isVariableStatement(node) && node.declarationList.declarations.some((item) => item.name.getText(source) === "restoreLocalDraft"));
  assert.ok(declaration);
  const code = ts.transpileModule(declaration.getText(source) + "\nrestoreLocalDraft;", { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;
  const local = {
    baseSubmissionId: "contribution:a", baseRevision: 3, spotId: "spot:a", spotName: "地点",
    kind: "FIELD_REPORT", topics: ["OTHER"], date: "2026-09-06", time: "20:00", detail: "本机未保存内容",
    candidateName: "", candidateRegion: "", latitude: "", longitude: "", rightsConfirmed: false, preciseLocationConsent: false,
  };
  const run = async (state: string, revision: number, switchAccount = false, offline = false) => {
    let owner = "a";
    let accepted = 0;
    const fields: Record<string, unknown> = {};
    const notices: string[] = [];
    const sandbox: Record<string, unknown> = {
      localDraft: { recovery: local, owner: "a", accept: () => accepted++ }, commandBusy: false,
      currentDraftUserId: () => owner,
      getContributions: async (_signal: unknown, expectedOwner: unknown) => {
        assert.equal(expectedOwner, "a");
        if (offline) throw new Error("offline");
        if (switchAccount) owner = "b";
        return { data: { submissions: [{ submissionId: "contribution:a", revision, state }] } };
      },
      contributionSubmissionState: (item: { state: string }) => item.state,
      announce: (_tone: string, title: string) => notices.push(title),
    };
    for (const field of ["CommandBusy", "Draft", "ConflictDraft", "BoundSpotId", "BoundSpotName", "Kind", "Topics", "Date", "Time", "Detail", "CandidateName", "CandidateRegion", "Latitude", "Longitude", "RightsConfirmed", "PreciseLocationConsent", "Phase"]) {
      sandbox[`set${field}`] = (value: unknown) => { fields[field] = value; };
    }
    await vm.runInNewContext(code, sandbox)();
    return { accepted, fields, notices };
  };
  const same = await run("DRAFT", 3);
  assert.equal(same.accepted, 1);
  assert.equal(same.fields.Detail, local.detail);
  assert.equal(same.fields.ConflictDraft, null);
  const changed = await run("DRAFT", 5);
  assert.equal((changed.fields.Draft as { revision: number }).revision, 3);
  assert.equal((changed.fields.ConflictDraft as { revision: number }).revision, 5);
  assert.equal(changed.fields.Detail, local.detail);
  for (const result of [await run("PENDING_REVIEW", 4), await run("DRAFT", 3, true), await run("DRAFT", 3, false, true)]) {
    assert.equal(result.accepted, 0);
    assert.equal(result.fields.Detail, undefined);
    assert.equal(result.fields.Draft, undefined);
    assert.equal(result.fields.CommandBusy, false);
  }
});
