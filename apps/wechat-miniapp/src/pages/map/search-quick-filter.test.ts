import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const source = ts.createSourceFile("search-page.tsx", readFileSync(new URL("./search-page.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const component = source.statements.find((node): node is ts.FunctionDeclaration =>
  ts.isFunctionDeclaration(node) && node.name?.text === "MapSearchSurface");
function action(name: string) {
  const initializer = component?.body?.statements.filter(ts.isVariableStatement)
    .flatMap(statement => [...statement.declarationList.declarations])
    .find(declaration => declaration.name.getText(source) === name)?.initializer;
  assert.ok(initializer, `Search must retain ${name}`);
  return ts.transpileModule(`(${initializer.getText(source)})`, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;
}

test("a quick filter dismisses focused suggestions while committing its filter", () => {
  let focused = true;
  let suggestionsOpen = true;
  const committed: string[] = [];
  const scope = {
    FILTER_OPTIONS: [{ id: "less-cloud", label: "少云" }],
    setFocused: (value: boolean) => { focused = value; },
    setSuggestionsOpen: (value: boolean) => { suggestionsOpen = value; },
    cancelFilters: () => { committed.push("discard-sheet-draft"); },
    toggleDraftFilter: (id: string) => { committed.push(id); },
    applyFilters: () => { committed.push("apply"); },
    setAnnouncement: (_value: string) => {},
  };
  const context = vm.createContext(scope);
  vm.runInContext(`var blurSearch = ${action("blurSearch")}`, context);
  const commit = vm.runInContext(action("commitFilter"), context) as (id: string) => void;
  commit("less-cloud");
  assert.equal(focused, false, "the effective outside tap must blur the input");
  assert.equal(suggestionsOpen, false, "suggestions must no longer obscure the filtered results");
  assert.deepEqual(committed, ["discard-sheet-draft", "less-cloud", "apply"]);
});
