import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { retryObservationScene } from "./context-restore";
import { sameContextVersion } from "../../services/observation-context-version";

const source = ts.createSourceFile("search.tsx", readFileSync(new URL("./search-page.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let emptySuggestion: ts.Expression | undefined, panel: ts.JsxSelfClosingElement | undefined;
let stalePanel: ts.JsxSelfClosingElement | undefined, staleCondition: ts.Expression | undefined;
const bindings = new Map<string, ts.VariableDeclaration>();
function visit(node: ts.Node) {
  if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && ["staleSearchResource", "hasRetainedSearchResults", "retrySearchResources"].includes(node.name.text))
    bindings.set(node.name.text, node);
  if (ts.isConditionalExpression(node) && node.whenTrue.getText(source).includes("没有匹配结果；可以换一个名称或城市。")) emptySuggestion = node.condition;
  if (ts.isConditionalExpression(node) && ts.isJsxSelfClosingElement(node.whenTrue) && node.whenTrue.tagName.getText(source) === "StatusPanel" &&
    node.whenTrue.attributes.properties.some(attribute => ts.isJsxAttribute(attribute) && attribute.name.getText(source) === "state" &&
      attribute.initializer && ts.isStringLiteral(attribute.initializer) && attribute.initializer.text === "STALE")) {
    stalePanel = node.whenTrue; staleCondition = node.condition;
  }
  if (ts.isJsxSelfClosingElement(node) && node.tagName.getText(source) === "StatusPanel" && node.attributes.properties.some(attribute =>
    ts.isJsxAttribute(attribute) && attribute.name.getText(source) === "state" && attribute.initializer?.getText(source) === "{searchState}")) panel = node;
  ts.forEachChild(node, visit);
}
visit(source); assert.ok(emptySuggestion); assert.ok(panel); assert.ok(stalePanel); assert.ok(staleCondition);
function run(code: string, scope: object) {
  return vm.runInNewContext(ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, scope);
}
const attribute = (name: string, selected = panel!) => {
  const item = selected.attributes.properties.find((value): value is ts.JsxAttribute => ts.isJsxAttribute(value) && value.name.getText(source) === name);
  assert.ok(item?.initializer, `feedback must retain ${name}`);
  if (ts.isStringLiteral(item.initializer)) return JSON.stringify(item.initializer.text);
  assert.ok(ts.isJsxExpression(item.initializer) && item.initializer.expression);
  return item.initializer.expression.getText(source);
};

test("Search cache fallbacks remain visible locally and retry their real owner without clearing the query", async () => {
  const declarations = ["staleSearchResource", "hasRetainedSearchResults", "retrySearchResources"].map(name => {
    const binding = bindings.get(name); assert.ok(binding, `feedback must retain ${name}`); return `const ${binding.getText(source)};`;
  }).join("\n");
  const projection = `${declarations}\n({ visible: (${staleCondition!.getText(source)}), state: (${attribute("state", stalePanel)}), detail: (${attribute("detail", stalePanel)}), recoveryLabel: (${attribute("recoveryLabel", stalePanel)}), onRecover: (${attribute("onRecover", stalePanel)}) });`;
  for (const owner of ["contextQuery", "scene", "placeSearch"] as const) for (const mechanism of ["cached-success", "refresh-failure"] as const) for (const retained of [false, true]) {
    const calls: string[] = [], page = {}, context = { contextId: "context:search", revision: 1, contextFingerprint: "same" };
    let finderQuery = "深圳";
    const resource = (name: string) => ({ isError: false, refreshError: null as unknown,
      data: { dataState: "FRESH", data: context }, refetch: async () => { calls.push(name); return undefined; } });
    const resources = { contextQuery: resource("contextQuery"), scene: resource("scene"), placeSearch: resource("placeSearch") };
    if (mechanism === "cached-success") resources[owner].data.dataState = "STALE_USABLE";
    else resources[owner].refreshError = new Error("network unavailable");
    const scope = {
      ...resources, queryUnconfirmed: false, formalSpots: retained ? [{ spotId: "spot:retained" }] : [], candidates: [], ordinaryPlaces: [],
      Taro: { getCurrentPages: () => [page] }, selectionVersion: { current: 0 }, activeContext: context, debouncedQuery: finderQuery,
      useAppStore: { getState: () => ({ accountOwnerId: "account:search", mapResetVersion: 0, observationContext: context }) },
      retryObservationScene, sameContextVersion, setFinderQuery: (value: string) => { finderQuery = value; },
    };
    const feedback = run(projection, scope);
    const label = `${owner}/${mechanism}/${retained}`;
    assert.equal(feedback.visible, true, label);
    assert.equal(feedback.state, "STALE", label);
    assert.match(feedback.detail, retained ? /当前结果仍会保留/ : /当前没有可保留的搜索结果/, label);
    assert.equal(feedback.recoveryLabel, "重新获取", label);
    feedback.onRecover({ type: "tap" });
    await new Promise<void>(resolve => setImmediate(resolve));
    assert.deepEqual(calls, [owner], `${label}: retry the affected owner, not a no-op or every healthy query`);
    assert.equal(finderQuery, "深圳", label);
    assert.equal(resources[owner].data.dataState, mechanism === "cached-success" ? "STALE_USABLE" : "FRESH", "recovery cannot relabel old data as fresh");
    if (owner === "contextQuery" && mechanism === "cached-success" && !retained) {
      const fresh = resource("fresh");
      assert.equal(run(projection, { ...scope, contextQuery: fresh, scene: fresh, placeSearch: fresh }).visible, false, "fresh resources must not fabricate a stale notice");
    }
  }
});

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
