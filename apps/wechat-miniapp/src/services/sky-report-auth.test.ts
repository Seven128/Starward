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
    ADOPTED_SKY_REPORT_CATALOG_VERSION: "bsc5p-bright-stars.v3",
    requestOperation: (
      key: string,
      operation: string,
      options: Record<string, unknown>,
    ) => Promise.resolve({ key, operation, options }),
    projectAdoptedSkyCatalog: (value: unknown) => value,
  },
) as (spotId: string, contextId: string) => Promise<{
  options: { auth: string; query: string };
}>;

test("pending proposal sky requires owner authentication", async () => {
  assert.equal(
    (await getSkyReport("contribution:proposal-1", "context:one")).options.auth,
    "REQUIRED",
  );
});

test("published spot sky remains publicly readable", async () => {
  const result = await getSkyReport("spot:published-1", "context:one");
  assert.equal(result.options.auth, "NONE");
  assert.equal(result.options.query, "contextId=context%3Aone&catalogVersion=bsc5p-bright-stars.v3");
});

test("planet, SAO and deep-sky positions request the same report catalog as the Sky page", async () => {
  const positionDeclaration = source.statements.find(
    (node): node is ts.FunctionDeclaration =>
      ts.isFunctionDeclaration(node) && node.name?.text === "getCelestialObjectPosition",
  );
  assert.ok(positionDeclaration);
  const getPosition = vm.runInNewContext(
    ts.transpileModule(
      positionDeclaration.getText(source).replace(/^export /u, "") + "\ngetCelestialObjectPosition;",
      { compilerOptions: { target: ts.ScriptTarget.ES2020 } },
    ).outputText,
    {
      ADOPTED_SKY_REPORT_CATALOG_VERSION: "bsc5p-bright-stars.v3",
      isCelestialObjectReference: () => true,
      requestOperation: (_key: string, _operation: string, options: Record<string, unknown>) => Promise.resolve(options),
      matchingCelestialPositionResponse: (value: unknown) => value,
    },
  ) as (binding: Record<string, string>, catalog: { catalogVersion: string; catalogHash: string }) =>
    Promise<{ query: string }>;
  const skyQuery = (await getSkyReport("spot:published-1", "context:one")).options.query;
  const skyCatalogVersion = new URLSearchParams(skyQuery).get("catalogVersion");
  for (const [reference, objectCatalog] of ([
    ["PLANET:SATURN", "sky-planets.v1"],
    ["SAO:1", "sao-visual-supplement.v2"],
    ["M:31", "deep-sky-messier.v1"],
  ] as const)) {
    const result = await getPosition(
      { reference, spotId: "spot:published-1", contextId: "context:one", at: "2026-09-25T00:00:00Z" },
      { catalogVersion: objectCatalog, catalogHash: "test-hash" },
    );
    assert.equal(new URLSearchParams(result.query).get("catalogVersion"), skyCatalogVersion,
      `${reference} must select the report catalog, independently of its object catalog`);
  }
});
