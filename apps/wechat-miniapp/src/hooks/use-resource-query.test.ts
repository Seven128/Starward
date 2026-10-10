import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { QueryClient } from "@tanstack/react-query";

test("cached resource survives refresh failure while exposing its stale cause", async () => {
  const source = ts.createSourceFile("query.ts", readFileSync(new URL("./use-resource-query.ts", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
  const declaration = source.statements.find((node): node is ts.FunctionDeclaration => ts.isFunctionDeclaration(node) && node.name?.text === "useResourceQuery")!;
  const data = { title: "cached" }, error = new Error("offline");
  let refetchError: Error | null = error;
  const result = { data: data as typeof data | undefined, error: error as Error | null, refetch: async () => ({ data, error: refetchError }) };
  const useResourceQuery = vm.runInNewContext(ts.transpileModule(declaration.getText(source).replace(/^export\s+/, "") + "\nuseResourceQuery;", {
    compilerOptions: { target: ts.ScriptTarget.ES2020 },
  }).outputText, { useQuery: () => result, useQueryClient: () => ({ getQueryState: () => undefined }), useEffect() {} }) as (options: unknown) => { data?: unknown; isError: boolean; isPending: boolean; refreshError?: unknown; refetch(): Promise<unknown> };
  const options = { queryKey: ["article"], queryFn: async () => data };
  const stale = useResourceQuery(options);
  assert.equal(stale.data, data);
  assert.equal(stale.isError, false);
  assert.equal(stale.refreshError, error);
  assert.equal(await stale.refetch(), undefined, "a failed refresh cannot report cached data as a fresh success");
  assert.equal(stale.data, data, "the displayed cache remains readable");
  refetchError = null;
  assert.equal(await stale.refetch(), data);
  result.error = null;
  assert.equal(useResourceQuery(options).refreshError, undefined);
  result.data = undefined;
  result.error = error;
  assert.equal(useResourceQuery(options).isError, true);
  result.error = null;
  assert.equal(useResourceQuery(options).isPending, true);
});

test("external commands read current query publications and failures before React rerenders", async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const key = ["spot", "spot:current"];
  const old = { identity: "old" }, latest = { identity: "current" };
  client.setQueryData(key, old);
  const source = ts.createSourceFile("query.ts", readFileSync(new URL("./use-resource-query.ts", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
  const declaration = source.statements.find((node): node is ts.FunctionDeclaration => ts.isFunctionDeclaration(node) && node.name?.text === "useResourceQuery")!;
  const hook = vm.runInNewContext(ts.transpileModule(declaration.getText(source).replace(/^export\s+/, "") + "\nuseResourceQuery;", {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText, { useQuery: () => ({ data: old, error: null }), useQueryClient: () => client, useEffect() {} });
  const resource = hook({ queryKey: key, queryFn: async () => old });
  client.setQueryData(key, latest);
  assert.equal(resource.data, old, "the retained React result has not changed");
  assert.deepEqual(resource.readCurrent().data, latest, "the native command observes the current publication");
  await client.invalidateQueries({ queryKey: key, refetchType: "none" });
  assert.equal(resource.readCurrent().isInvalidated, true);
  const error = new Error("current transport failure");
  await assert.rejects(client.fetchQuery({ queryKey: key, queryFn: async () => { throw error; } }), error);
  assert.equal(resource.readCurrent().error, error);
  assert.deepEqual(resource.readCurrent().data, latest, "independent readable cached data is preserved");
  client.clear();
});
