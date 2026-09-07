import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

test("actual edit recovery reads current server state, keeps the original revision and never sends a mutation", async () => {
  const source = ts.createSourceFile("import.tsx", readFileSync(new URL("./index.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let declaration = "";
  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && node.name.getText(source) === "recoverEdit") declaration = `const ${node.getText(source)};`;
    ts.forEachChild(node, visit);
  };
  visit(source);
  assert.ok(declaration);
  for (const scenario of ["restore", "source", "submitted", "offline", "switched", "discard"]) {
    let owner = true;
    const calls: string[] = [], fields: Record<string, unknown> = {};
    const revision = { current: null }, dirty = { current: false }, busy = { current: false };
    const setters = Object.fromEntries(["SelectedId", "IsCreatingNew", "LocalDraft", "Platform", "SourceUrl", "RightsConfirmed", "Title", "Body", "SourceNote", "Visibility", "Association", "FormalSpotId", "EditRecovery", "EditRecoveryError"].map(name => [`set${name}`, (value: unknown) => { fields[name] = value; }]));
    const recover = vm.runInNewContext(ts.transpileModule(declaration + "\nrecoverEdit;", { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText, {
      ...setters, owner: "a", ownerMatches: () => owner, actionBusy: busy, setAction() {}, announce() {}, errorMessage: () => "unavailable",
      hydratedDraftId: { current: "" }, restoredRevision: revision, dirtyEdit: dirty,
      localStore: { clear() { calls.push("clear"); } },
      editRecovery: { id: scenario === "source" ? "" : "import:one", revision: scenario === "source" ? null : 3, title: "local title", body: "local body" },
      getPostImport: async () => {
        calls.push("read");
        if (scenario === "offline") throw new Error("offline");
        if (scenario === "switched") owner = false;
        return { data: { importDraftId: "import:one", revision: 5, stage: scenario === "submitted" ? "SUBMIT" : "PREVIEW" } };
      },
    });
    await recover(scenario === "discard");
    assert.equal(busy.current, false);
    if (scenario === "restore" || scenario === "source") {
      assert.equal(fields.Title, "local title"); assert.equal(fields.Body, "local body");
      assert.equal(revision.current, scenario === "source" ? null : 3);
      assert.equal(dirty.current, true);
      assert.deepEqual(calls, scenario === "source" ? [] : ["read"]);
    } else {
      assert.equal(fields.Title, undefined);
      assert.deepEqual(calls, scenario === "discard" ? ["clear"] : ["read"]);
    }
  }
});
