import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

function recovery(privateContext: boolean, status: number, code: string, retained = false, sceneDenied = false) {
  const source = ts.createSourceFile("search.tsx", readFileSync(new URL("./search-page.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const api = ts.createSourceFile("api.ts", readFileSync(new URL("../../services/api-client.ts", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
  const apiClass = api.statements.find(node => ts.isClassDeclaration(node) && node.name?.text === "MiniappApiError")!;
  const MiniappApiError = vm.runInNewContext(ts.transpileModule(apiClass.getText(api).replace(/^export /, "") + "; MiniappApiError;", { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, { Error });
  const component = source.statements.find((node): node is ts.FunctionDeclaration => ts.isFunctionDeclaration(node) && node.name?.text === "MapSearchSurface")!;
  const declarations = component.body!.statements.filter(node => ts.isVariableStatement(node) && node.declarationList.declarations.some(d => ["contextFailure", "privateContextUnavailable", "searchState"].includes(d.name.getText(source))));
  const permission = source.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === "isPermissionError")!;
  let panel: ts.JsxSelfClosingElement | undefined;
  const visit = (node: ts.Node) => { if (ts.isJsxSelfClosingElement(node) && node.tagName.getText(source) === "StatusPanel" && node.attributes.properties.some(p => ts.isJsxAttribute(p) && p.name.getText(source) === "recoveryLabel")) panel = node; ts.forEachChild(node, visit); };
  visit(component); assert.ok(panel);
  const expressions = ["title", "detail", "recoveryLabel", "onRecover"].map(name => {
    const attr = panel!.attributes.properties.find((p): p is ts.JsxAttribute => ts.isJsxAttribute(p) && p.name.getText(source) === name)!;
    return `${name}: (${(attr.initializer as ts.JsxExpression).expression!.getText(source)})`;
  });
  const calls: string[] = [];
  const error = new MiniappApiError({ code, message: "服务端拒绝本次读取", recovery: [], retryable: false, requestId: "synthetic" }, status);
  const querySource = ts.createSourceFile("query.ts", readFileSync(new URL("../../hooks/use-resource-query.ts", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
  const queryFunction = querySource.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === "useResourceQuery")!;
  const previous = { data: { contextId: "usable" } };
  const useResourceQuery = vm.runInNewContext(ts.transpileModule(queryFunction.getText(querySource).replace(/^export /, "") + "; useResourceQuery;", { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, {
    useQuery: () => ({ data: retained ? previous : undefined, error: sceneDenied ? null : error, isFetching: false }), useEffect: () => {}, recordAcceptanceDiagnostic: () => {},
  });
  const contextQuery = useResourceQuery({ queryKey: ["search-observation-context"], queryFn: () => {} });
  assert.equal(contextQuery.isError, !retained); assert.equal(contextQuery.refreshError, retained && !sceneDenied ? error : undefined);
  const scope = { MiniappApiError, observationContext: privateContext ? { privateProposal: {} } : {},
    contextQuery,
    privateContextUnavailable: false, queryUnconfirmed: false, scene: sceneDenied ? { isError: true, error } : {}, placeSearch: {}, expiredEmptyFilter: false,
    activeContext: retained ? previous.data : null, debouncedQuery: "", staleSearchResource: retained && !sceneDenied, formalSpots: [], candidates: [], ordinaryPlaces: [],
    errorMessage: (e: any) => e.message, isOfflineError: () => false,
    leaveSearch: () => calls.push("map"), retrySearchResources: () => calls.push("retry"), Taro: { navigateTo: () => calls.push("login") },
  };
  const result = vm.runInNewContext(ts.transpileModule(permission.getText(source) + "\n" + declarations.map(d => d.getText(source)).join("\n") + `\n({searchState,${expressions.join(",")}});`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, scope);
  result.onRecover?.(); return { result, calls, contextQuery, previous };
}
for (const [status, code] of [[403, "PERMISSION_DENIED"], [404, "NOT_FOUND"]] as const) test(`private Context ${status} offers the existing Map recovery owner`, () => {
  const { result, calls } = recovery(true, status, code);
  assert.equal(result.searchState, "ERROR"); assert.equal(result.recoveryLabel, "返回地图");
  assert.match(result.detail, /观测位置.*返回地图/u); assert.deepEqual(calls, ["map"]);
});
for (const [privateContext, status, code, retained, expected] of [
  [true, 401, "PERMISSION_DENIED", false, "login"], [false, 403, "PERMISSION_DENIED", false, "login"],
  [true, 503, "PROVIDER_UNAVAILABLE", false, "retry"], [true, 408, "PROVIDER_UNAVAILABLE", false, "retry"],
  [true, 403, "PERMISSION_DENIED", true, "map"], [true, 404, "NOT_FOUND", true, "map"],
] as const) test(`recovery ${status}/${privateContext}/${retained} uses ${expected}`, () => {
  const { calls } = recovery(privateContext, status, code, retained); assert.deepEqual(calls, [expected]);
});
for (const status of [408, 503]) test(`retained data with ${status} transport/provider failure stays stale without a terminal Map return`, () => {
  const { result, calls, contextQuery, previous } = recovery(true, status, "PROVIDER_UNAVAILABLE", true);
  assert.equal(result.searchState, "STALE"); assert.deepEqual(calls, []); assert.equal(contextQuery.data, previous);
});
test("scene-only permission failure cannot invalidate a successfully retained private Context", () => {
  const { result, calls, contextQuery, previous } = recovery(true, 403, "PERMISSION_DENIED", true, true);
  assert.equal(result.searchState, "PERMISSION_DENIED"); assert.deepEqual(calls, ["login"]); assert.equal(contextQuery.data, previous);
});
