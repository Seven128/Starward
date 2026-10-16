import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { terrainBoundsForNativeRegion } from "./terrain-geometry";

function code(name: "onRegionChange" | "onMarkerTap") {
  let source = fs.readFileSync(new URL("./index.tsx", import.meta.url), "utf8");
  if (process.env.MUTATE_NATIVE_EVENT_GUARDS === "1") source = source
    .replaceAll(" || !nativeMap.isCurrent()", "")
    .replaceAll("!nativeMap.isCurrent() || ", "");
  const tree = ts.createSourceFile("map.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let handler = "", wrapper = "";
  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && node.name.getText(tree) === name) handler = node.initializer!.getText(tree);
    if (ts.isJsxSelfClosingElement(node) && node.tagName.getText(tree) === "Map") {
      const prop = node.attributes.properties.find(item => ts.isJsxAttribute(item) && item.name.getText(tree) === name) as ts.JsxAttribute;
      wrapper = (prop.initializer as ts.JsxExpression).expression!.getText(tree);
    }
    ts.forEachChild(node, visit);
  };
  visit(tree); assert.ok(handler && wrapper);
  return ts.transpileModule(`const ${name}=${handler}; const dispatch=${wrapper}; dispatch(event);`, {
    compilerOptions: { target: ts.ScriptTarget.ES2020 },
  }).outputText;
}

test("debounced native region commits only while its originating Map remains current", async () => {
  for (const obsolete of [true, false]) {
    let current = true, queued: (() => void) | undefined, regionRead: ((value: unknown) => void) | undefined;
    const writes: unknown[] = [], resolves: unknown[] = [], measured: unknown[] = [];
    const viewport = { center: { latitude: 22, longitude: 114 }, zoom: 10, loadedViewport: "initial" };
    vm.runInNewContext(code("onRegionChange"), {
      event: {}, nativeMap: { mapId: "spot-map", isCurrent: () => current }, editorPresentation: {isClosing: () => false},
      mapPointIntent: { current: 1 }, invalidateMapPointIntent: () => 1, currentDraftUserId: () => "owner",
      failedMapRegion: { current: null },
      userMapRegionEnd: () => ({ center: { latitude: 23, longitude: 114 }, zoom: 11 }),
      candidateCameraGuard: { current: null }, regionTimer: { current: null },
      clearTimeout() {}, setTimeout(fn: () => void) { queued = fn; return 1; },
      useAppStore: { getState: () => ({ mapResetVersion: 0, viewport }) },
      setViewport: (value: object) => { writes.push(value); Object.assign(viewport, value); },
      panelLayoutVersion: 0, primaryNavigation: { pageHeight: 700 }, terrainBoundsForNativeRegion,
      Taro: { createMapContext: () => ({ getRegion: (options: { success(value: unknown): void }) => { regionRead = options.success; } }) },
      setMeasuredTerrainViewport: (value: unknown) => measured.push(value),
      resolveMapPoint: async (value: unknown) => { resolves.push(value); return null; }, notify() {}, errorMessage: String, Date,
    });
    assert.ok(queued); current = !obsolete; queued();
    assert.equal(writes.length, obsolete ? 0 : 1, "an old timer must not move the new native Map");
    assert.equal(resolves.length, obsolete ? 0 : 1, "a current event must still submit its location intent");
    if (!obsolete) {
      regionRead!({ southwest: { latitude: 22, longitude: 113 }, northeast: { latitude: 24, longitude: 115 } });
      assert.equal(measured.length, 1);
      current = false;
      regionRead!({ southwest: { latitude: 21, longitude: 112 }, northeast: { latitude: 25, longitude: 116 } });
      assert.equal(measured.length, 1, "late old native bounds cannot replace the current viewport");
    }
  }
});

for (const privateMarker of [false, true]) {
  test(`pending ${privateMarker ? "private" : "cluster"} marker leave confirmation cannot commit after native replacement`, async () => {
    for (const obsolete of [true, false]) {
      let current = true, release!: (value: boolean) => void;
      const gate = new Promise<boolean>(resolve => { release = resolve; });
      const writes: unknown[] = [];
      vm.runInNewContext(code("onMarkerTap"), {
        event: { detail: { markerId: privateMarker ? 100000 : 0 } }, nativeMap: { isCurrent: () => current },
        confirmEditorLeave: () => gate, editorPresentation: {isClosing: () => false},
        finishSpotEditorPresentation: (complete: () => void) => complete(),
        invalidateMapPointIntent() {},
        privateMarkers: [{ latitude: 23, longitude: 114, submission: {}, state: "DRAFT" }],
        groupedMarkers: [{ id: 0, spots: [{}, {}], latitude: 23, longitude: 114 }],
        privateTransitionGeneration: { current: 0 }, editorLeaveGuard: { current: {} }, markerTapAt: { current: 0 },
        viewport: { zoom: 9 }, setViewport: (value: unknown) => writes.push(value),
        setCandidatePreview() {}, selectSpot() {}, setSelectedFallback() {}, setSelectedProposal() {},
        setPanelExtent() {}, setPanelPhase() {}, setBottomPresentation() {}, setAnnouncement() {}, Date,
      });
      current = !obsolete; release(true);
      await new Promise(resolve => setImmediate(resolve));
      assert.equal(writes.length, obsolete ? 0 : 1, "only a still-current marker interaction may commit after confirmation");
    }
  });
}
