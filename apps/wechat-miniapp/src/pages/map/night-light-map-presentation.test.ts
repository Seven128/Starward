import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { lightLayerContentState, independentMapLayerPolygons, mapSceneLayerForOverlay } from "./map-layer-selection";
import { NIGHT_LIGHT_CONTRAST_DISPLAY } from "@starward/miniapp-contracts";
import { projectMapLayerLegend } from "./map-layer-legend";
import { createMapCloudRasterTestBoundaries } from "./map-page-test-support";

const ast = ts.createSourceFile("map.tsx", readFileSync(new URL("./index.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

test("closing annual light cancels its own transport and cannot leave a background demand", () => {
  const source = ts.createSourceFile("light.ts", readFileSync(new URL("../../hooks/use-map-night-light.ts", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
  const declaration = source.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === "useMapNightLight")!;
  let previous: boolean | undefined, cleanup: (() => void) | undefined, requests = 0;
  const cancelled: string[] = [];
  const read = vm.runInNewContext(ts.transpileModule(declaration.getText(source).replace(/^export /u, "") + ";useMapNightLight;", {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText, {
    NIGHT_LIGHT_CONTRAST_DISPLAY, cancelRequest: (key: string) => cancelled.push(key),
    useEffect: (effect: () => (() => void) | undefined, [enabled]: [boolean]) => {
      if (previous === enabled) return; cleanup?.(); cleanup = effect(); previous = enabled;
    },
    useResourceQuery: (options: { enabled: boolean }) => { if (options.enabled) requests++; return options; },
  });
  const viewport = { center: { latitude: 1, longitude: 2 }, zoom: 12, bounds: { west: 1, south: 1, east: 2, north: 2 } };
  assert.equal(read(viewport, true).enabled, true);
  const beforeClose = requests;
  assert.equal(read(viewport, false).enabled, false);
  assert.equal(requests, beforeClose); assert.ok(cancelled.length > 0);
  assert.ok(cancelled.every(key => key === "map-night-light"), "terrain and cloud transport ownership is independent");
  read(viewport, true); const beforeUnmount = cancelled.length; cleanup?.();
  assert.equal(cancelled.length, beforeUnmount + 1);
});
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
  const polygons = [{ id: "real-cloud-sample", value: 0, points: [], fillColor: "zero-cloud" }];
  const environment = { ...createMapCloudRasterTestBoundaries(), scene: { data: { data: { layer: { kind: "CLOUD", polygons } } } },
    cloudPresentation: { layer: { kind: "CLOUD", polygons }, retaining: true }, projectedFrame: null,
    analysisOverlay: "LIGHT", nightLayer: null, independentMapLayerPolygons };
  const render = vm.runInNewContext(expression("layerPolygons", true), environment);
  assert.equal(render().length, 0);
  environment.analysisOverlay = "TOTAL_CLOUD";
  assert.equal(render()[0].fillColor, "zero-cloud");
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
  state.lightReadFailed = false;
  state.nightLayer = { state: "UNAVAILABLE" }; state.lightInstallation.presentedData = null;
  assert.equal(read(), "EMPTY");
  state.nightLayer = { state: "UNAVAILABLE", raster: { validPixelCount: 0 } };
  assert.equal(read(), "EMPTY", "a published no-coverage raster needs no native installation");
  state.nightLayer = { state: "UNAVAILABLE", failureCode: "PROVIDER_UNAVAILABLE" };
  state.lightReadFailed = true;
  assert.equal(read(), "ERROR", "a provider failure is not a previously confirmed empty result");
});

test("static light is displayed while unrelated Scene weather is pending or failed", () => {
  const state = { ...createMapCloudRasterTestBoundaries(), analysisOverlay: "LIGHT", nightLayer: { kind: "LIGHT_POLLUTION", polygons: [{ id: "published-light", points: [], fillColor: "annual" }] },
    cloudPresentation: null, projectedFrame: null, independentMapLayerPolygons, scene: { isPending: true, isError: true } };
  assert.equal(vm.runInNewContext(expression("layerPolygons", true), state)()[0].fillColor, "annual");
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
    rasterRetryCurrent: () => true, lightFailureEpisode: { retry() {} },
    lightInstallation: { requiresMapRecovery: false }, nativeViewport: { error: null },
    lightImage: { retryImage: () => calls.push("image") }, setLightNativeRetry: () => calls.push("native"),
    nightLight: { refetch: async () => calls.push("static-metadata") },
    refreshMap: () => { throw new Error("light_retry_must_not_wait_for_weather"); },
  });
  await retry();
  assert.deepEqual(calls, ["image", "native", "static-metadata"]);
});

test("an acknowledged raster keeps geographic Map content visible when no formal points exist", () => {
  const state: any = { ...createMapCloudRasterTestBoundaries(), layerPolygons: [], analysisOverlay: "LIGHT", lightInstallation: { presentedData: null } };
  const read = () => vm.runInNewContext(expression("hasGeographicLayer"), state);
  assert.equal(read(), false);
  state.lightInstallation.presentedData = { raster: { validPixelCount: 100 } };
  assert.equal(read(), true);
});

test("composed layers retain separate units and sources, while all-off removes legends before source retirement", () => {
  const lightSource = { id: "annual" }, cloudSource = { id: "hourly" };
  const state: any = { ...createMapCloudRasterTestBoundaries(), lightEnabled: true, cloudLayerEnabled: true, lightUnavailable: false, cloudUnavailable: false,
    layerPolygons: [{ zIndex: 2 }],
    displayedLightLayer: { kind: "LIGHT_POLLUTION", source: lightSource, legend: [{ color: "gold", label: "年度夜光", range: "radiance" }] },
    cloudPresentation: { layer: { kind: "CLOUD", legend: [{ color: "blue", label: "云量", range: "0–30%" }] }, sources: [cloudSource] },
    mode: "DAY", projectMapLayerLegend, uniqueSourceRecords: (sources: unknown[]) => sources,
    terrainEnabled: false, presentedTerrainData: null, terrainDisclosure: null };
  let legends = vm.runInNewContext(expression("layerLegends"), state);
  assert.deepEqual(Array.from(legends, (legend: any) => legend.key), ["light", "cloud"]);
  assert.equal(legends[1].items[0].text, "云量 · 0–30%");
  state.displayedCloudSources = vm.runInNewContext(expression("displayedCloudSources"), state);
  assert.deepEqual(Array.from(vm.runInNewContext(expression("layerDataSources"), state)), [lightSource, cloudSource]);
  state.lightUnavailable = true;
  legends = vm.runInNewContext(expression("layerLegends"), state);
  assert.equal(legends[0].key, "light", "a failed new metadata read cannot hide the acknowledged old raster's legend");
  state.cloudUnavailable = true;
  assert.equal(vm.runInNewContext(expression("layerLegends"), state)[1].key, "cloud", "preview polygons own the visible cloud legend, not an unavailable committed hour");
  state.lightEnabled = state.cloudLayerEnabled = false;
  state.displayedCloudSources = vm.runInNewContext(expression("displayedCloudSources"), state);
  legends = vm.runInNewContext(expression("layerLegends"), state); assert.equal(legends.length, 0);
  assert.deepEqual(Array.from(vm.runInNewContext(expression("layerDataSources"), state)), [lightSource], "native light source remains while removal is unacknowledged");
  state.displayedLightLayer = null;
  assert.deepEqual(Array.from(vm.runInNewContext(expression("layerDataSources"), state)), []);
});
