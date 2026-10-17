import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const source = ts.createSourceFile("map.tsx", readFileSync(new URL("./index.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
function expression(name: string, memo = false) {
  let declaration: ts.Expression | undefined;
  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && node.name.getText(source) === name) declaration = node.initializer;
    ts.forEachChild(node, visit);
  };
  visit(source); assert.ok(declaration);
  const selected = memo ? (declaration as ts.CallExpression).arguments[0] : declaration;
  assert.ok(selected);
  return ts.transpileModule(`(${selected.getText(source)});`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
}

// Retention, interruption, hidden cleanup and native acknowledgment moved
// with their shared owner to use-map-raster-installation.test.ts.
test("the Map loading surface includes the shared installation pending state", () => {
  const state = { pageVisible: true, terrainEnabled: true, nativeMap: { pending: false }, mapRuntimeError: false,
    mapTerrainBounds: {}, terrainViewportError: null,
    terrain: { isPending: false, isFetching: false, imagePending: false }, mapTerrainMissing: false, mapTerrainFailed: false,
    terrainInstallation: { pending: true } };
  assert.equal(vm.runInNewContext(expression("mapTerrainLoading"), state), true);
  state.terrainInstallation.pending = false;
  assert.equal(vm.runInNewContext(expression("mapTerrainLoading"), state), false);
});

test("the Map discloses the installed terrain rather than a pending metadata source", () => {
  const first = { source: { id: "a" }, derivedResolutionM: 100 }, second = { source: { id: "b" }, derivedResolutionM: 1000 };
  const state: any = { terrainEnabled: true, terrain: { data: { data: second } },
    terrainInstallation: { presentedData: first }, presentedTerrainData: null };
  const read = () => {
    state.presentedTerrainData = vm.runInNewContext(expression("presentedTerrainData"), state);
    return vm.runInNewContext(expression("terrainDisclosure"), state);
  };
  assert.equal(read(), first);
  state.terrain.data = undefined; assert.equal(read(), first);
  state.terrainInstallation.presentedData = second; assert.equal(read(), second);
});
