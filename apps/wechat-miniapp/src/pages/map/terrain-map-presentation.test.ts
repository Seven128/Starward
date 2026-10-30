import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { createMapCloudRasterTestBoundaries } from "./map-page-test-support";

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

test("the shared map source entry retains timezone and terrain until native retirement", () => {
  const timezone = { id: "timezone", licenseUrl: "https://opendatacommons.org/licenses/odbl/1-0/", sourceVersion: "boundary-current" };
  const light = { id: "light" }, terrain = { source: { id: "terrain", sourceVersion: "installed" } };
  const state = { ...createMapCloudRasterTestBoundaries(), activeContext: { timezoneSource: timezone }, displayedLightLayer: { source: light },
    cloudLayerEnabled: false, cloudPresentation: null, terrainEnabled: false, presentedTerrainData: terrain as typeof terrain | null,
    terrainDisclosure: terrain, layerDataSources: [] as unknown[], uniqueSourceRecords: (sources: unknown[]) => sources };
  const read = () => {
    state.layerDataSources = vm.runInNewContext(expression("layerDataSources"), state);
    return Array.from(vm.runInNewContext(expression("layerSources"), state));
  };
  assert.deepEqual(read(), [timezone, light, terrain.source], "logical off does not withdraw a still-visible native image's source");
  state.presentedTerrainData = null;
  assert.deepEqual(read(), [timezone, light], "retired terrain metadata cannot masquerade as a displayed layer");
});

test("Map preview admission checks the actual visible viewport independently of the buffered fine request", () => {
  const visible = { west: 113.1, east: 113.9, south: 22.1, north: 22.9 };
  const buffered = { west: 112.9, east: 114.1, south: 21.9, north: 23.1 };
  const checked: unknown[] = [];
  const state: any = {
    nativeMap: { mapId: "current" }, viewport: { center: { longitude: 113.5, latitude: 22.5 } },
    nativeViewport: { bounds: visible }, mapTerrainBounds: buffered,
    terrainReadEnabled: true, pageVisible: true, terrainEnabled: true,
    terrainPreviewAdmission: { current: { mapId: "current", canPreview(identity: string, bounds: unknown) {
      checked.push([identity, bounds]); return false;
    } } },
    useTerrainOverlay: (input: unknown, enabled: boolean, imageEnabled: boolean, allow: (identity: string) => boolean) => ({ input, enabled, imageEnabled, allow }),
  };
  const current = vm.runInNewContext(expression("terrain"), state);
  assert.deepEqual(current.input.viewportBounds, buffered, "normal fine selection keeps its existing buffered request");
  assert.equal(current.allow("finer-request"), false);
  assert.deepEqual(checked, [["finer-request", visible]], "buffer-only changes cannot authorize a visible detail downgrade");
  state.terrainPreviewAdmission.current.mapId = "retired";
  assert.equal(current.allow("initial-request"), true, "a new native Map does not inherit the old Map's retained target");
});
