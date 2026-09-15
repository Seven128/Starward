import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";

const source = ts.createSourceFile(
  "api-client.ts",
  readFileSync(new URL("./api-client.ts", import.meta.url), "utf8"),
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TS,
);
const declaration = source.statements.find(
  (node): node is ts.FunctionDeclaration =>
    ts.isFunctionDeclaration(node) && node.name?.text === "getSkyReport",
);
if (!declaration) throw new Error("getSkyReport declaration missing");
const getSkyReport = vm.runInNewContext(
  ts.transpileModule(
    declaration.getText(source).replace(/^export /u, "") + "\ngetSkyReport;",
    { compilerOptions: { target: ts.ScriptTarget.ES2020 } },
  ).outputText,
  {
    requestOperation: (
      key: string,
      operation: string,
      options: Record<string, unknown>,
    ) => Promise.resolve({ key, operation, options }),
    projectAdoptedSkyCatalog: (value: unknown) => value,
  },
) as (spotId: string, contextId: string) => Promise<{
  options: { auth: string };
}>;

test("pending proposal sky requires owner authentication", async () => {
  assert.equal(
    (await getSkyReport("contribution:proposal-1", "context:one")).options.auth,
    "REQUIRED",
  );
});

test("published spot sky remains publicly readable", async () => {
  assert.equal(
    (await getSkyReport("spot:published-1", "context:one")).options.auth,
    "NONE",
  );
});
