import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { terrainGroundOverlayKey } from "./terrain-ground-overlay";

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

test("the actual Map keeps old image bounds through metadata and PNG loading, then retires them on explicit disable", () => {
  const first = { west: 113, south: 22, east: 115, north: 24 }, second = { west: 115, south: 21, east: 119, north: 25 };
  const terrain: any = { data: { data: { state: "AVAILABLE", imageBoundsGcj02: first, imageStyle: "RELIEF_OVERLAY" } }, imagePath: "/first.png" };
  const environment = { terrain, pageVisible: true, terrainEnabled: true, nativeMap: { mapId: "first-map" },
    retainedTerrain: { current: { mapId: "first-map", target: null } }, terrainCandidates: { current: new Map() }, terrainGroundOverlayKey };
  const render = vm.runInNewContext(expression("terrainGroundOverlay", true), environment);
  const installed = render();
  assert.equal(installed.bounds.southwest.longitude, first.west);
  terrain.data = undefined; terrain.imagePath = null;
  assert.equal(render(), installed, "changing the query must not clear a valid native image");
  terrain.data = { data: { state: "AVAILABLE", imageBoundsGcj02: second, imageStyle: "RELIEF_OVERLAY" } };
  assert.equal(render(), installed, "new bounds cannot be assigned to old image bytes while downloading");
  terrain.imagePath = "/second.png";
  const replaced = render();
  assert.equal(replaced.src, "/second.png"); assert.equal(replaced.bounds.northeast.longitude, second.east);
  environment.terrainEnabled = false; assert.equal(render(), null);
  environment.terrainEnabled = true; environment.nativeMap.mapId = "replacement-map";
  terrain.data = undefined; terrain.imagePath = null;
  assert.equal(render(), null, "a replacement native map cannot inherit an old map's publication state");
});

test("terrain loading remains visible after metadata/download until the actual native image is acknowledged", () => {
  const target = { src: "/new.png", bounds: { southwest: { latitude: 22, longitude: 113 }, northeast: { latitude: 25, longitude: 117 } }, opacity: 1, zIndex: 0 };
  const desired = `spot-map:${terrainGroundOverlayKey(target)}`;
  const state = { pageVisible: true, terrainEnabled: true, nativeMap: { pending: false }, mapRuntimeError: false,
    terrain: { isPending: false, isFetching: false, imagePending: false }, mapTerrainMissing: false, mapTerrainFailed: false,
    terrainGroundOverlay: target, terrainInstalledKey: "spot-map:old", desiredTerrainKey: desired };
  assert.equal(vm.runInNewContext(expression("mapTerrainLoading"), state), true);
  state.terrainInstalledKey = desired;
  assert.equal(vm.runInNewContext(expression("mapTerrainLoading"), state), false);
});

test("source and resolution follow the native-confirmed image through a new viewport request", () => {
  const a = { src: "/a.png", bounds: { southwest: { latitude: 22, longitude: 113 }, northeast: { latitude: 24, longitude: 115 } }, opacity: 1, zIndex: 0 };
  const b = { ...a, src: "/b.png", bounds: { ...a.bounds, northeast: { latitude: 25, longitude: 118 } } };
  const first = { source: { id: "source:a" }, derivedResolutionM: 100, limitations: ["first source"] };
  const second = { source: { id: "source:b" }, derivedResolutionM: 1000, limitations: ["second source"] };
  let handler: ts.Expression | undefined;
  const visit = (node: ts.Node) => {
    if (ts.isBinaryExpression(node) && node.left.getText(source) === "terrainOverlayResult.current") handler = node.right;
    ts.forEachChild(node, visit);
  };
  visit(source); assert.ok(handler);
  const environment: any = { terrainEnabled: true, nativeMap: { mapId: "spot-map" }, terrainGroundOverlayKey,
    terrain: { data: undefined }, terrainPresented: null, presentedTerrainData: null,
    terrainCandidates: { current: new Map([[terrainGroundOverlayKey(a), first], [terrainGroundOverlayKey(b), second]]) },
    setTerrainNativeError() {}, setTerrainNativeNeedsMapRecovery() {}, setTerrainInstalledKey() {},
    setTerrainPresented(value: unknown) { environment.terrainPresented = value; },
  };
  const onResult = vm.runInNewContext(ts.transpileModule(`(${handler.getText(source)});`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, environment);
  const disclosure = () => {
    environment.presentedTerrainData = vm.runInNewContext(expression("presentedTerrainData"), environment);
    return vm.runInNewContext(expression("terrainDisclosure"), environment);
  };
  onResult({ error: null, target: a });
  assert.equal(disclosure(), first, "query data can disappear while the image's actual attribution stays present");
  environment.terrain.data = { data: second };
  assert.equal(disclosure(), first, "metadata B cannot relabel still-displayed image A");
  onResult({ error: null, target: b });
  assert.equal(disclosure(), second, "attribution and resolution advance with the native-confirmed image");
});

test("resuming after hidden cleanup requires a fresh native acknowledgment even for the same cached image", () => {
  let cleanup: ts.Expression | undefined;
  const visit = (node: ts.Node) => {
    if (ts.isCallExpression(node) && node.expression.getText(source) === "useEffect"
      && node.arguments[0]?.getText(source).includes("setTerrainInstalledKey(null)")) cleanup = node.arguments[0];
    ts.forEachChild(node, visit);
  };
  visit(source); assert.ok(cleanup);
  let installed: string | null = "spot-map:old", presented: unknown = { source: "old" };
  const effect = vm.runInNewContext(ts.transpileModule(`(${cleanup.getText(source)});`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, {
    pageVisible: false, setTerrainInstalledKey(value: string | null) { installed = value; }, setTerrainPresented(value: unknown) { presented = value; },
  });
  effect(); assert.equal(installed, null); assert.equal(presented, null);
  const state = { pageVisible: true, terrainEnabled: true, nativeMap: { pending: false }, mapRuntimeError: false,
    terrain: { isPending: false, isFetching: false, imagePending: false }, mapTerrainMissing: false, mapTerrainFailed: false,
    terrainGroundOverlay: {}, terrainInstalledKey: installed, desiredTerrainKey: "spot-map:old" };
  assert.equal(vm.runInNewContext(expression("mapTerrainLoading"), state), true);
});
