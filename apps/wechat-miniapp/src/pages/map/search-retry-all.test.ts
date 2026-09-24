import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const source = ts.createSourceFile("search-page.tsx", readFileSync(new URL("./search-page.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const component = source.statements.find((node): node is ts.FunctionDeclaration =>
  ts.isFunctionDeclaration(node) && node.name?.text === "MapSearchSurface");
const retry = component?.body?.statements
  .filter(ts.isVariableStatement)
  .flatMap(statement => [...statement.declarationList.declarations])
  .find(declaration => declaration.name.getText(source) === "retrySearchResources")?.initializer;
assert.ok(retry, "Search must retain a recovery action for its independent resources");
const expression = ts.transpileModule(`(${retry.getText(source)})`, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;

function resource(name: string, calls: string[], state: "fresh" | "error" | "stale") {
  return {
    isError: state === "error",
    refreshError: state === "stale" ? new Error(`${name} failed`) : null,
    data: state === "error" ? undefined : { dataState: state === "stale" ? "STALE_USABLE" : "FRESH" },
    refetch: async () => { calls.push(name); return undefined; },
  };
}

test("one Search recovery retries every failed query, leaving healthy owners alone", async () => {
  const calls: string[] = [];
  const run = vm.runInNewContext(expression, {
    contextQuery: resource("context", calls, "fresh"),
    scene: resource("scene", calls, "stale"),
    placeSearch: resource("places", calls, "stale"),
    activeContext: { contextId: "context:test" },
    debouncedQuery: "深圳",
  }) as () => void;
  run();
  await Promise.resolve();
  assert.deepEqual(calls, ["scene", "places"]);
});

test("recovery skips the dependent scene without context but still retries independent places", async () => {
  const calls: string[] = [];
  const run = vm.runInNewContext(expression, {
    contextQuery: resource("context", calls, "error"),
    scene: resource("scene", calls, "error"),
    placeSearch: resource("places", calls, "error"),
    activeContext: null,
    debouncedQuery: "深圳",
  }) as () => void;
  run();
  await Promise.resolve();
  assert.deepEqual(calls, ["context", "places"]);
});
