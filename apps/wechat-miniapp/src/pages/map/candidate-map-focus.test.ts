import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { spotNeighborhoodCamera } from "./map-camera.ts";

function harness() {
  const source = ts.createSourceFile("map.tsx", readFileSync(new URL("./index.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let callback = "", selectionInitial = "";
  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && node.name.getText(source) === "handleCandidateChange")
      callback = (node.initializer as ts.CallExpression).arguments[0]!.getText(source);
    if (ts.isVariableDeclaration(node) && node.name.getText(source) === "candidateSelectionVersion")
      selectionInitial = (node.initializer as ts.CallExpression).arguments[0]!.getText(source);
    ts.forEachChild(node, visit);
  };
  visit(source); assert.ok(callback && selectionInitial);
  const camera = { center: { latitude: 22, longitude: 114 }, zoom: 11, loadedViewport: "initial" };
  const focus: any[] = []; let cancelled = 0, legacyCalls = 0;
  const state: any = { candidatePreviewRef: { current: null }, candidateSelectionVersion: { current: vm.runInNewContext(selectionInitial) },
    bottomPresentationRef: { current: "spot-editor" }, nativeMap: { isCurrent: () => true },
    currentNativeMapRef: { current: { isCurrent: () => true } },
    editorPresentation: { isClosing: () => false }, setCandidatePreview() {}, invalidateMapPointIntent() {},
    wgs84ToGcj02: (point: any) => ({ lat: point.lat + .002, lon: point.lon + .005 }),
    useAppStore: { getState: () => ({ viewport: camera }) },
    spotNeighborhoodCamera,
    setViewport(patch: any) { Object.assign(camera, patch); },
    spotMapFocus: { begin(identity: string, point: any) { focus.push({ identity, point, camera: structuredClone(camera) }); }, cancel() { cancelled++; } },
    readNativeViewportRef: { current() {} },
    candidateCameraGuard: { current: null }, SPOT_EDITOR_TOP_PX: 230,
    Taro: { getWindowInfo: () => ({ windowHeight: 700 }) }, primaryNavigationLayout: () => ({ pageHeight: 700 }),
    cameraCenterForVisibleMapTarget(point: any) { legacyCalls++; return point; },
  };
  const change = vm.runInNewContext(ts.transpileModule(`(${callback})`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, state);
  return { change, state, camera, focus, cancelled: () => cancelled, legacyCalls: () => legacyCalls };
}
const candidate = { latitude: 22.5, longitude: 114.2, selectionVersion: 1 };

test("formal selection enters neighborhood detail before starting native centering and keeps a finer view", async () => {
  const source = ts.createSourceFile("map.tsx", readFileSync(new URL("./index.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let callback = "";
  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && node.name.getText(source) === "openDetail") callback = node.initializer!.getText(source);
    ts.forEachChild(node, visit);
  };
  visit(source); assert.ok(callback);
  for (const initialZoom of [9, 14, 17]) {
    const camera = { center: { latitude: 22, longitude: 114 }, zoom: initialZoom, loadedViewport: "existing" };
    const focused: any[] = [];
    const spot = { spotId: "test-spot", gcj02: { latitude: 22.5, longitude: 114.2 } };
    const noop = () => {};
    const open = vm.runInNewContext(ts.transpileModule(`(${callback})`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, {
      privateTransitionGeneration: { current: 0 }, lastHandledSelectedId: { current: "" }, lastHandledSpotOpenVersion: { current: 0 },
      useAppStore: { getState: () => ({ viewport: camera, spotOpenRequestVersion: 1 }) },
      panelCloseTimer: { current: null }, extentBeforeLayer: { current: null }, markerTapAt: { current: 0 },
      setPanelPhase: noop, setPanelExtent: noop, setPanelDragOffset: noop, setSelectedFallback: noop,
      setSelectedProposal: noop, selectSpot: noop, setBottomPresentation: noop, resolveSpotContext: async () => {},
      setViewport(patch: any) { Object.assign(camera, patch); }, spotNeighborhoodCamera,
      spotMapFocus: { begin(identity: string, point: any) { focused.push({ identity, point, camera: structuredClone(camera) }); } },
    });
    await open(spot);
    assert.equal(focused.length, 1);
    assert.equal(focused[0].identity, "formal:test-spot");
    assert.deepEqual(focused[0].camera.center, spot.gcj02);
    assert.equal(focused[0].camera.zoom, initialZoom < 14 ? 14 : initialZoom);
    assert.equal(focused[0].camera.loadedViewport, "existing");
  }
});

test("candidate selection prepares its camera then delegates to the shared native focus owner", () => {
  const h = harness(); h.change(candidate);
  assert.equal(h.focus.length, 1); assert.equal(h.legacyCalls(), 0);
  assert.equal(h.focus[0].identity, "candidate:1");
  assert.ok(Math.abs(h.focus[0].point.latitude - 22.502) < 1e-10); assert.ok(Math.abs(h.focus[0].point.longitude - 114.205) < 1e-10);
  assert.equal(h.focus[0].camera.zoom, 14);
  assert.equal(h.focus[0].camera.center.latitude, h.focus[0].point.latitude); assert.equal(h.focus[0].camera.center.longitude, h.focus[0].point.longitude);
  h.change({ ...candidate, name: "Changed name" }); assert.equal(h.focus.length, 1, "editing text cannot reclaim the map");
});

test("a new empty editor resets candidate intent; an outgoing editor cannot cancel a formal selection", () => {
  const h = harness(); h.change(candidate); h.change(null); assert.equal(h.cancelled(), 1);
  h.change(candidate); assert.equal(h.focus.length, 2, "the next editor can choose its first address again");
  h.state.bottomPresentationRef.current = "spot-panel"; h.change(null); assert.equal(h.cancelled(), 1);
  h.change({ ...candidate, selectionVersion: 2 }); assert.equal(h.focus.length, 2, "late outgoing form data has no camera authority");
});

test("the first restored address with selection sequence zero still owns one editor focus", () => {
  const h = harness(); h.change({ ...candidate, selectionVersion: 0 }); assert.equal(h.focus.length, 1);
  h.change({ ...candidate, selectionVersion: 0, name: "Edited name" }); assert.equal(h.focus.length, 1);
});

test("data entry survives a replaced native instance; the shared focus owner checks current authority", () => {
  const h = harness(); h.state.nativeMap.isCurrent = () => false;
  h.change(candidate); assert.equal(h.state.candidatePreviewRef.current, candidate);
  assert.equal(h.focus.length, 1, "a captured old Map must not block the current owner's begin request");
});

test("editor focus measures its unanimated boundary and retires late geometry", () => {
  const source = ts.createSourceFile("map.tsx", readFileSync(new URL("./index.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let callback = "";
  const visit = (node: ts.Node) => {
    if (ts.isCallExpression(node) && node.expression.getText(source) === "useEffect" && node.arguments[0]?.getText(source).includes('".map-spot-editor-focus-ruler"')) callback = node.arguments[0]!.getText(source);
    ts.forEachChild(node, visit);
  };
  visit(source); assert.ok(callback);
  const frames: any[] = [], selectors: string[] = []; let delivery: (rows: unknown[]) => void = () => {};
  const query = { select(selector: string) { selectors.push(selector); return query; }, boundingClientRect() { return query; }, exec(callback: typeof delivery) { delivery = callback; } };
  const cleanup = vm.runInNewContext(ts.transpileModule(`(${callback})()`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, {
    bottomPresentation: "spot-editor", pageVisible: true, spotEditorPhase: "open", spotMapFocus: { version: 7 }, spotFocusLayout: "editor-a",
    Taro: { nextTick(callback: () => void) { callback(); }, createSelectorQuery: () => query }, setSpotFocusFrame(frame: any) { frames.push(frame); },
  });
  assert.deepEqual(selectors, [".native-map", ".map-spot-editor-focus-ruler"]);
  delivery([{ top: 34, height: 768 }, { top: 264 }]);
  assert.deepEqual(JSON.parse(JSON.stringify(frames)), [{ version: 7, layout: "editor-a", top: 34, height: 768, visibleBottom: 264 }]);
  cleanup(); delivery([{ top: 0, height: 700 }, { top: 230 }]); assert.equal(frames.length, 1);
});
