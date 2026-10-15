import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const source = ts.createSourceFile("search.tsx", readFileSync(new URL("./search-page.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let emptySuggestion: ts.Expression | undefined, panel: ts.JsxSelfClosingElement | undefined;
function visit(node: ts.Node) {
  if (ts.isConditionalExpression(node) && node.whenTrue.getText(source).includes("没有匹配结果；可以换一个名称或城市。")) emptySuggestion = node.condition;
  if (ts.isJsxSelfClosingElement(node) && node.tagName.getText(source) === "StatusPanel" && node.attributes.properties.some(attribute =>
    ts.isJsxAttribute(attribute) && attribute.name.getText(source) === "state" && attribute.initializer?.getText(source) === "{searchState}")) panel = node;
  ts.forEachChild(node, visit);
}
visit(source); assert.ok(emptySuggestion); assert.ok(panel);
function run(code: string, scope: object) {
  return vm.runInNewContext(ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, scope);
}
const attribute = (name: string) => {
  const item = panel!.attributes.properties.find((value): value is ts.JsxAttribute => ts.isJsxAttribute(value) && value.name.getText(source) === name)!;
  return (item.initializer as ts.JsxExpression).expression!.getText(source);
};

test("only a confirmed empty suggestion response can announce no matches", () => {
  for (const state of ["FRESH", "PARTIAL", "STALE_USABLE"] as const) for (const failedRefresh of [false, true]) {
    const value = run(`Boolean(${emptySuggestion!.getText(source)})`, {
      queryUnconfirmed: false, visiblePlaces: { formalSpots: [] }, candidates: [], ordinaryPlaces: [],
      placeSearch: { isPending: false, isError: false, refreshError: failedRefresh ? Error("offline") : null, data: { dataState: state } },
    });
    assert.equal(value, !failedRefresh && state !== "STALE_USABLE", `${state}/${failedRefresh}`);
  }
});

test("filtered empty recovery opens the existing condition owner and preserves the query", () => {
  const calls: string[] = [];
  const recovery = run(`(${attribute("onRecover")})`, {
    privateContextUnavailable: false, searchState: "EMPTY", activeFilterGroups: ["PARKING"], accountOwnerId: "A",
    setFilterCategory: () => calls.push("category"), openFilters: () => calls.push("filters"),
    setFinderQuery: () => calls.push("erase-query"), setFocused: () => {}, setSuggestionsOpen: () => {},
  });
  recovery(); assert.deepEqual(calls, ["category", "filters"]);
});

test("permission recovery uses explicit account login or Map recovery without opening location permissions", () => {
  for (const owner of [null, "A"]) {
    const calls: string[] = [];
    const recovery = run(`(${attribute("onRecover")})`, {
      privateContextUnavailable: false, searchState: "PERMISSION_DENIED", accountOwnerId: owner, currentDraftUserId: () => owner,
      login: { requireAccount: () => calls.push("shortcut-login") }, leaveSearch: () => calls.push("map"),
      Taro: { navigateTo: () => calls.push("location-permissions") },
    });
    recovery(); assert.deepEqual(calls, [owner ? "map" : "shortcut-login"]);
  }
});
