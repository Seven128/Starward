import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

test("cached resource survives refresh failure while exposing its stale cause", async () => {
  const source = ts.createSourceFile("query.ts", readFileSync(new URL("./use-resource-query.ts", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
  const declaration = source.statements.find((node): node is ts.FunctionDeclaration => ts.isFunctionDeclaration(node) && node.name?.text === "useResourceQuery")!;
  const data = { title: "cached" }, error = new Error("offline");
  let refetchError: Error | null = error;
  const result = { data: data as typeof data | undefined, error: error as Error | null, refetch: async () => ({ data, error: refetchError }) };
  const useResourceQuery = vm.runInNewContext(ts.transpileModule(declaration.getText(source).replace(/^export\s+/, "") + "\nuseResourceQuery;", {
    compilerOptions: { target: ts.ScriptTarget.ES2020 },
  }).outputText, { useQuery: () => result, useEffect() {} }) as (options: unknown) => { data?: unknown; isError: boolean; isPending: boolean; refreshError?: unknown; refetch(): Promise<unknown> };
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
