import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

test("actual edits retain their starting revision across background refreshes and persist each new field value", () => {
  const ast = ts.createSourceFile("import.tsx", readFileSync(new URL("./index.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let handler = "";
  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && node.name.getText(ast) === "keepEdit") handler = `const ${node.getText(ast)};`;
    ts.forEachChild(node, visit);
  };
  visit(ast); assert.ok(handler);
  const revision = { current: null as number | null }, draft = { importDraftId: "import:one", revision: 3 };
  const writes: { revision: number; title: string; body: string }[] = [];
  let ownerMatches = true;
  const edit = vm.runInNewContext(ts.transpileModule(handler + "\nkeepEdit;", { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText, {
    ownerMatches: () => ownerMatches, localStore: { write: (value: typeof writes[number]) => writes.push(value) },
    draft, restoredRevision: revision, dirtyEdit: { current: false }, editRecovery: null, editRecoveryError: "",
    setDiscardEditConfirmed() {}, setEditStorageError() {}, errorMessage: () => "storage error",
    platform: "OTHER", sourceUrl: "https://example.com", rightsConfirmed: true, title: "title", body: "body",
    sourceNote: "source", visibility: "PRIVATE", association: "NONE", formalSpotId: "",
  });
  edit({ title: "first edit" });
  draft.revision = 5;
  edit({ body: "next edit" });
  assert.equal(revision.current, 3);
  assert.deepEqual(writes.map(value => value.revision), [3, 3]);
  assert.equal(writes[0]!.title, "first edit"); assert.equal(writes[1]!.body, "next edit");
  ownerMatches = false;
  edit({ title: "wrong owner" });
  assert.equal(writes.length, 2);
});

// Run the production selection effect so route initialization cannot override later user intent.
test("a requested import is decoded once without pinning later selection or creation", () => {
  const ast = ts.createSourceFile("import.tsx", readFileSync(new URL("./index.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let effect = "";
  const visit = (node: ts.Node) => {
    if (ts.isCallExpression(node) && node.expression.getText(ast) === "useEffect" && node.arguments[0]?.getText(ast).includes("const routeValue")) effect = node.arguments[0].getText(ast);
    ts.forEachChild(node, visit);
  };
  visit(ast); assert.ok(effect);
  const state: any = {
    ownerMatches: () => true, dirtyEdit: { current: false },
    router: { params: { importDraftId: "import%3Aone" } }, appliedRouteId: { current: null },
    selectedId: "", isCreatingNew: false, listItems: [{ importDraftId: "import:first" }],
    setLocalDraft() {}, setSelectedId: (id: string) => { state.selectedId = id; },
  };
  const context = vm.createContext(state);
  const run = vm.runInContext(ts.transpileModule(`const run = ${effect}; run;`, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText, context);
  run(); assert.equal(state.selectedId, "import:one");
  state.selectedId = "import:two"; run(); assert.equal(state.selectedId, "import:two");
  state.selectedId = ""; state.isCreatingNew = true; run(); assert.equal(state.selectedId, "");
  state.router.params.importDraftId = "%invalid"; run(); assert.equal(state.selectedId, "%invalid");
});
