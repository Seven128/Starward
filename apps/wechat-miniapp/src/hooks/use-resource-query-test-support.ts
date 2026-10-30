import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

/** Load the complete query owner so fixtures keep its module-level bindings.
 * The supplied hooks expose each test's actual Query/React observation boundary. */
export function resourceQueryTestOwner(bindings: Record<string, unknown>) {
  const exports: { useResourceQuery?: typeof import("./use-resource-query").useResourceQuery } = {};
  const dependencies: Record<string, unknown> = {
    "@tanstack/react-query": bindings,
    react: bindings,
    "@/services/acceptance-diagnostics": bindings,
  };
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL("./use-resource-query.ts", import.meta.url), "utf8"), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText, { exports, require: (name: string) => {
    assert(name in dependencies, name); return dependencies[name];
  } });
  assert(exports.useResourceQuery);
  return exports.useResourceQuery;
}
