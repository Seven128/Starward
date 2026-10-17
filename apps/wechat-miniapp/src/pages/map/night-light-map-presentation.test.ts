import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { lightLayerContentState, mapLayerKindForOverlay } from "./map-layer-selection";
import { projectedLayerPolygons } from "./map-time-frame";

const ast = ts.createSourceFile("map.tsx", readFileSync(new URL("./index.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
function expression(name: string, memo = false) {
  let expression: ts.Expression | undefined;
  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && node.name.getText(ast) === name) expression = node.initializer;
    ts.forEachChild(node, visit);
  };
  visit(ast); assert.ok(expression);
  const selected = memo ? (expression as ts.CallExpression).arguments[0]! : expression;
  return ts.transpileModule(`(${selected.getText(ast)});`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
}

test("changing layer intent cannot paint retained cloud polygons as the selected annual light layer", () => {
  const polygons = [{ id: "real-cloud-sample", value: 0 }];
  const environment = { scene: { data: { data: { layer: { kind: "CLOUD", polygons } } } },
    cloudPresentation: { layer: { kind: "CLOUD", polygons }, retaining: true }, projectedFrame: null,
    geographicLayer: undefined as unknown,
    analysisOverlay: "LIGHT", projectedLayerPolygons, mapLayerKindForOverlay };
  environment.geographicLayer = vm.runInNewContext(expression("geographicLayer"), environment);
  const render = vm.runInNewContext(expression("projectedPolygonSource", true), environment);
  assert.equal(render().length, 0);
  environment.analysisOverlay = "TOTAL_CLOUD";
  assert.equal(render()[0], polygons[0]);
});

test("the light sheet distinguishes installing, displayed, failed retained data and genuine no coverage", () => {
  const state: any = { scene: { isPending: false, isError: false, refreshError: null, data: { dataState: "FRESH" } },
    nightLayer: { state: "FRESH", raster: {} }, lightImage: { imagePending: false }, lightInstallation: { pending: true, presentedData: null },
    lightReadFailed: false, visibleLayerUnavailable: false, lightLayerContentState };
  const read = () => vm.runInNewContext(expression("lightLayerState"), state);
  assert.equal(read(), "LOADING");
  state.lightInstallation = { pending: false, presentedData: { raster: {} } }; assert.equal(read(), "READY");
  state.lightReadFailed = true; assert.equal(read(), "STALE");
  state.lightReadFailed = false; state.visibleLayerUnavailable = true;
  state.nightLayer = { state: "UNAVAILABLE" }; state.lightInstallation.presentedData = null;
  assert.equal(read(), "EMPTY");
});

test("an acknowledged raster keeps geographic Map content visible when no formal points exist", () => {
  const state: any = { layerPolygons: [], analysisOverlay: "LIGHT", lightInstallation: { presentedData: null } };
  const read = () => vm.runInNewContext(expression("hasGeographicLayer"), state);
  assert.equal(read(), false);
  state.lightInstallation.presentedData = { raster: { validPixelCount: 100 } };
  assert.equal(read(), true);
});
