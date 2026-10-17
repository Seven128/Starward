import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

test("same-origin raster paths retain terrain compatibility and bind night-light URLs to a dataset", () => {
  const ast = ts.createSourceFile("files.ts", readFileSync(new URL("./map-raster-files.ts", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
  const declaration = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === "mapRasterAssetUrl")!;
  const url = vm.runInNewContext(ts.transpileModule(declaration.getText(ast).replace(/^export /, "") + ";mapRasterAssetUrl;", {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText, { __MINIAPP_API_BASE__: "https://example.invalid/" });
  assert.equal(url("/v2/terrain/assets/legacy.png"), "https://example.invalid/v2/terrain/assets/legacy.png");
  assert.equal(url("/v2/night-light/assets/eog-fixed-2025/nightlight.png"), "https://example.invalid/v2/night-light/assets/eog-fixed-2025/nightlight.png");
  for (const invalid of ["https://other.invalid/image.png", "/v2/night-light/assets/../image.png", "/v2/night-light/assets/image.png"])
    assert.throws(() => url(invalid), /map_raster_asset_path_invalid/u);
});
