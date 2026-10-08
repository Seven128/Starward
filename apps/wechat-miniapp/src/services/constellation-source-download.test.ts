import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

test("constellation disclosure can download published definitions without opening arbitrary file paths", () => {
  const source = ts.createSourceFile("api-client.ts", readFileSync(new URL("./api-client.ts", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
  const declaration = source.statements.find((node): node is ts.FunctionDeclaration =>
    ts.isFunctionDeclaration(node) && node.name?.text === "constellationAssetUrl");
  assert.ok(declaration);
  const url = vm.runInNewContext(ts.transpileModule(declaration.getText(source).replace(/^export /u, "") + "\nconstellationAssetUrl;",
    { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText,
    { __MINIAPP_API_BASE__: "https://api.example.test/", MINIAPP_API_BASE_PATH: "/v2" }) as (hash: string, file: string) => string;
  const hash = "a".repeat(64);
  for (const file of ["constellation_names.eng.fab", "constellationship.fab", "constellationsart.fab", "info.ini", "geometry-v2.json", "lyra.png"])
    assert.equal(url(hash, file), `https://api.example.test/v2/sky/constellations/${hash}/assets/${file}`);
  for (const file of ["../info.ini", "%2e%2e/info.ini", "other.fab", "package.json", "https://example.test/lyra.png", "lyra.png?x=1"])
    assert.throws(() => url(hash, file), /constellation_asset_reference_invalid/);
  assert.throws(() => url("old", "lyra.png"), /constellation_asset_reference_invalid/);
});
