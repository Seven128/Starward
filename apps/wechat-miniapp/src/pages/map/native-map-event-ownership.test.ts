import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

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
    let current = true, queued: (() => void) | undefined;
    const writes: unknown[] = [], resolves: unknown[] = [];
    vm.runInNewContext(code("onRegionChange"), {
      event: {}, nativeMap: { isCurrent: () => current },
      userMapRegionEnd: () => ({ center: { latitude: 23, longitude: 114 }, zoom: 11 }),
      candidateCameraGuard: { current: null }, regionTimer: { current: null },
      clearTimeout() {}, setTimeout(fn: () => void) { queued = fn; return 1; },
      useAppStore: { getState: () => ({ mapResetVersion: 0 }) },
      setViewport: (value: unknown) => writes.push(value),
      resolveMapPoint: async (value: unknown) => { resolves.push(value); return null; }, notify() {}, errorMessage: String, Date,
    });
    assert.ok(queued); current = !obsolete; queued();
    assert.equal(writes.length, obsolete ? 0 : 1, "an old timer must not move the new native Map");
    assert.equal(resolves.length, obsolete ? 0 : 1, "a current event must still submit its location intent");
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
        confirmEditorLeave: () => gate,
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
