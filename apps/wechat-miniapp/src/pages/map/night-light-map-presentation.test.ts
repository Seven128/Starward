import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { lightLayerContentState, mapLayerKindForOverlay, mapSceneLayerForOverlay } from "./map-layer-selection";
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

function readLightLayerState(state: Record<string, unknown>) {
  const environment = { ...state };
  environment.nightRaster = vm.runInNewContext(expression("nightRaster"), environment);
  environment.lightUnavailable = vm.runInNewContext(expression("lightUnavailable"), environment);
  return vm.runInNewContext(expression("lightLayerState"), environment);
}

test("changing layer intent cannot paint retained cloud polygons as the selected annual light layer", () => {
  const polygons = [{ id: "real-cloud-sample", value: 0 }];
  const environment = { scene: { data: { data: { layer: { kind: "CLOUD", polygons } } } },
    cloudPresentation: { layer: { kind: "CLOUD", polygons }, retaining: true }, projectedFrame: null,
    geographicLayer: undefined as unknown,
    analysisOverlay: "LIGHT", nightLayer: null, projectedLayerPolygons, mapLayerKindForOverlay };
  environment.geographicLayer = vm.runInNewContext(expression("geographicLayer"), environment);
  const render = vm.runInNewContext(expression("projectedPolygonSource", true), environment);
  assert.equal(render().length, 0);
  environment.analysisOverlay = "TOTAL_CLOUD";
  environment.geographicLayer = vm.runInNewContext(expression("geographicLayer"), environment);
  assert.equal(render()[0], polygons[0]);
});

test("the light sheet distinguishes installing, displayed, failed retained data and genuine no coverage", () => {
  const state: any = { nightLight: { isPending: false, isError: false, refreshError: null, data: { dataState: "FRESH" } },
    nightLayer: { state: "FRESH", raster: {} }, lightImage: { imagePending: false }, lightInstallation: { pending: true, presentedData: null },
    lightReadFailed: false, visibleLayerUnavailable: false, lightLayerContentState };
  const read = () => readLightLayerState(state);
  assert.equal(read(), "LOADING");
  state.lightInstallation.pending = false; state.lightReadFailed = true;
  assert.equal(read(), "ERROR", "metadata without a rendered raster cannot claim a retained result");
  state.lightReadFailed = false;
  state.lightInstallation = { pending: false, presentedData: { raster: {} } }; assert.equal(read(), "READY");
  state.lightReadFailed = true; assert.equal(read(), "STALE");
  state.lightReadFailed = false; state.visibleLayerUnavailable = true;
  state.nightLayer = { state: "UNAVAILABLE" }; state.lightInstallation.presentedData = null;
  assert.equal(read(), "EMPTY");
  state.nightLayer = { state: "UNAVAILABLE", raster: { validPixelCount: 0 } };
  assert.equal(read(), "EMPTY", "a published no-coverage raster needs no native installation");
  state.nightLayer = { state: "UNAVAILABLE", failureCode: "PROVIDER_UNAVAILABLE" };
  state.lightReadFailed = true;
  assert.equal(read(), "ERROR", "a provider failure is not a previously confirmed empty result");
});

test("static light is displayed while unrelated Scene weather is pending or failed", () => {
  const state = { analysisOverlay: "LIGHT", nightLayer: { kind: "LIGHT_POLLUTION", polygons: [{ id: "published-light" }] },
    cloudPresentation: null, scene: { isPending: true, isError: true } };
  assert.equal(vm.runInNewContext(expression("geographicLayer"), state), state.nightLayer);
  const layerState = { ...state, nightLight: { isPending: false, data: { dataState: "FRESH" } },
    lightImage: { imagePending: false }, lightInstallation: { pending: false, presentedData: state.nightLayer },
    lightReadFailed: false, visibleLayerUnavailable: false, lightLayerContentState };
  assert.equal(readLightLayerState(layerState), "READY");
  assert.equal(mapSceneLayerForOverlay("LIGHT"), "NORMAL", "the marker Scene must not compose the same light again");
  assert.equal(mapSceneLayerForOverlay("TOTAL_CLOUD"), "NORMAL", "cloud now has its own read owner too");
});

test("the actual light retry uses its metadata and image owners without awaiting Scene weather", async () => {
  const calls: string[] = [];
  const retry = vm.runInNewContext(expression("retryLightLayer"), {
    lightInstallation: { requiresMapRecovery: false }, nativeViewport: { error: null },
    lightImage: { retryImage: () => calls.push("image") }, setLightNativeRetry: () => calls.push("native"),
    nightLight: { refetch: async () => calls.push("static-metadata") },
    refreshMap: () => { throw new Error("light_retry_must_not_wait_for_weather"); },
  });
  await retry();
  assert.deepEqual(calls, ["image", "native", "static-metadata"]);
});

test("an acknowledged raster keeps geographic Map content visible when no formal points exist", () => {
  const state: any = { layerPolygons: [], analysisOverlay: "LIGHT", lightInstallation: { presentedData: null } };
  const read = () => vm.runInNewContext(expression("hasGeographicLayer"), state);
  assert.equal(read(), false);
  state.lightInstallation.presentedData = { raster: { validPixelCount: 100 } };
  assert.equal(read(), true);
});
