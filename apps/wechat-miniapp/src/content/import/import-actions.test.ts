import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { validateExternalUrl } from "@starward/miniapp-contracts";

class Conflict extends Error { code = "CONFLICT"; }

test("import creation identifies missing or unsafe sources before rights and never sends invalid input", async () => {
  const source = ts.createSourceFile("import.tsx", readFileSync(new URL("./index.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let declaration = "";
  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && node.name.getText(source) === "beginCreate") declaration = `const ${node.getText(source)};`;
    ts.forEachChild(node, visit);
  };
  visit(source);
  assert.ok(declaration);
  for (const sourceUrl of ["  ", "javascript:alert(1)", "https://example.com/post"]) {
    const messages: string[] = [], focus: boolean[] = [];
    let requests = 0;
    const beginCreate = vm.runInNewContext(ts.transpileModule(declaration + "\nbeginCreate;", {
      compilerOptions: { target: ts.ScriptTarget.ES2020 },
    }).outputText, {
      sourceUrl, rightsConfirmed: false, ownerMatches: () => true, validateExternalUrl,
      setValidationMessage: (value: string) => messages.push(value),
      setSourceFocus: (value: boolean) => focus.push(value),
      actionBusy: { current: false },
      createPostImport: () => { requests++; throw new Error("invalid request"); },
    }) as () => Promise<void>;
    await beginCreate();
    assert.equal(requests, 0);
    if (sourceUrl.startsWith("https:")) {
      assert.match(messages.at(-1)!, /请先确认/);
      assert.deepEqual(focus, []);
    } else {
      assert.match(messages.at(-1)!, /来源链接/);
      assert.deepEqual(focus, [true]);
      if (!sourceUrl.trim()) assert.doesNotMatch(messages.at(-1)!, /长度/);
    }
  }
});

function runtime(conflict = false) {
  const source = ts.createSourceFile("import.tsx", readFileSync(new URL("./index.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const declarations: string[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && ["saveCurrent", "selectDraft"].includes(node.name.getText(source))) declarations.push(`const ${node.getText(source)};`);
    ts.forEachChild(node, visit);
  };
  visit(source);
  assert.equal(declarations.length, 2);
  const busy = { current: false }, draft = { importDraftId: "a", stage: "EDIT_DRAFT", revision: 1 };
  const local: unknown[] = [], selections: string[] = [], requests: unknown[] = [];
  let matchingOwner = true;
  let resolve!: (value: unknown) => void;
  const response = new Promise((done) => { resolve = done; });
  const functions = vm.runInNewContext(ts.transpileModule(declarations.join("\n") + "\n({saveCurrent, selectDraft});", {
    compilerOptions: { target: ts.ScriptTarget.ES2020 },
  }).outputText, {
    draft, actionBusy: busy, selectedId: "a", rightsConfirmed: true,
    dirtyEdit: { current: false }, restoredRevision: { current: null }, clearSavedEdit() {},
    owner: "account-a", ownerMatches: () => matchingOwner,
    title: "保留的本地标题", body: "本地正文", sourceNote: "来源", visibility: "PRIVATE",
    association: "NONE", formalSpotId: "", routeSpotId: null,
    setAction() {}, announce() {}, setIsCreatingNew() {}, errorMessage: () => "conflict",
    setLocalDraft: (value: unknown) => local.push(value), setSelectedId: (value: string) => selections.push(value),
    MiniappApiError: Conflict, ImportSaveRecoveryError: class extends Error {}, imports: { refetch: async () => {} },
    detail: { refetch: async () => ({ data: { ...draft, revision: 2 } }) },
    updatePostImport: (_id: string, input: unknown) => {
      requests.push(input);
      return conflict ? Promise.reject(new Conflict()) : response;
    },
  }) as { saveCurrent(): Promise<unknown>; selectDraft(id: string): void };
  return { ...functions, busy, draft, local, selections, requests, resolve, changeOwner: () => { matchingOwner = false; } };
}

test("an in-flight import save blocks duplicate saves and draft switching", async () => {
  const page = runtime();
  const saving = page.saveCurrent();
  page.selectDraft("b");
  await page.saveCurrent();
  assert.equal(page.requests.length, 1);
  assert.deepEqual(page.selections, []);
  page.resolve({ data: { ...page.draft, revision: 2 } });
  await saving;
  assert.equal(page.busy.current, false);
  page.selectDraft("b");
  assert.deepEqual(page.selections, ["b"]);
});

test("conflict refreshes the retry revision without replacing editable field state", async () => {
  const page = runtime(true);
  await page.saveCurrent();
  assert.equal((page.local[0] as { revision: number }).revision, 2);
  assert.equal(page.busy.current, false);
  assert.equal((page.requests[0] as { title: string }).title, "保留的本地标题");
});

test("submitted drafts cannot request another save", async () => {
  const page = runtime();
  page.draft.stage = "SUBMIT";
  await page.saveCurrent();
  assert.equal(page.requests.length, 0);
});

test("changed accounts cannot save or select old drafts, and late saves cannot hydrate the new page", async () => {
  const page = runtime();
  const pending = page.saveCurrent();
  page.changeOwner();
  page.resolve({ data: { ...page.draft, revision: 2 } });
  await pending;
  assert.deepEqual(page.local, []);
  assert.equal(page.busy.current, false);
  await page.saveCurrent();
  page.selectDraft("another");
  assert.equal(page.requests.length, 1);
  assert.deepEqual(page.selections, []);
});
