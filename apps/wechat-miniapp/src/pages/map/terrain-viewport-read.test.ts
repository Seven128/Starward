import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { mapBoundsForNativeRegion, bufferTerrainBounds } from "./terrain-geometry";
import { mapRegionEnded, userMapRegionEnd, userMapRegionStarted } from "./map-region-event";

const source = ts.createSourceFile("native-region.ts", readFileSync(new URL("./use-native-map-region.ts", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
function initializer(name: string, callback = false) {
  let value: ts.Expression | undefined;
  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && node.name.getText(source) === name) value = node.initializer;
    ts.forEachChild(node, visit);
  };
  visit(source); assert.ok(value);
  const selected = callback ? (value as ts.CallExpression).arguments[0] : value; assert.ok(selected);
  return ts.transpileModule(`(${selected.getText(source)});`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
}

function harness() {
  const viewport = { center: { latitude: 23, longitude: 114 }, zoom: 9, loadedViewport: "initial" };
  const reads: { success(value: unknown): void; fail(): void }[] = [], scales: { success(value: unknown): void; fail(): void }[] = [], timers = new Map<number, () => void>(); let timer = 0;
  const cameraKey = () => JSON.stringify(["spot-map", viewport.center, viewport.zoom, viewport.loadedViewport, 0, 700]);
  const state: any = { enabled: true, nativeMap: { mapId: "spot-map", isCurrent: () => true },
    useAppStore: { getState: () => ({ viewport }) }, keyFor: () => cameraKey(),
    scope: { current: cameraKey() }, pending: { current: null },
    cameraKey: cameraKey(), measured: null, failure: null, expectedScale: null,
    mapBoundsForNativeRegion,
    Taro: { createMapContext: () => ({ getRegion: (options: any) => { reads.push(options); }, getScale: (options: any) => { scales.push(options); } }) },
    setTimeout: (fn: () => void) => { const id = ++timer; timers.set(id, fn); return id; }, clearTimeout: (id: number) => timers.delete(id),
    setFailure: (failure: unknown) => { state.failure = failure; },
    setMeasured: (value: unknown) => { state.measured = value; },
  };
  const read = vm.runInNewContext(initializer("readNativeViewport", true), state);
  return { read, reads, scales, state,
    bounds: () => vm.runInNewContext(initializer("mapNativeBounds"), state),
    terrainBounds: () => { const bounds = vm.runInNewContext(initializer("mapNativeBounds"), state); return bounds ? bufferTerrainBounds(bounds) : null; },
    error: () => vm.runInNewContext(initializer("error"), state),
    move(longitude: number, render = true) { viewport.center = { latitude: 23, longitude }; viewport.loadedViewport += "next";
      if (render) state.cameraKey = state.scope.current = cameraKey(); },
    timeout() { [...timers.values()].forEach(fn => fn()); },
  };
}
const actual = { southwest: { latitude: 20, longitude: 112 }, northeast: { latitude: 26, longitude: 118 } };

test("formal and private spot panels wait for their promoted zoom before accepting native bounds", () => {
  const page = ts.createSourceFile("map.tsx", readFileSync(new URL("./index.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let scale: ts.Expression | undefined;
  const visit = (node: ts.Node) => {
    if (ts.isCallExpression(node) && node.expression.getText(page) === "useNativeMapRegion") scale = node.arguments[5];
    ts.forEachChild(node, visit);
  };
  visit(page); assert.ok(scale);
  const expression = ts.transpileModule(`(${scale.getText(page)});`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const state = { bottomPresentation: "spot-panel", candidatePreview: null, selectedProposal: null as null | { submissionId: string }, viewport: { zoom: 14 } };
  for (const selectedProposal of [null, { submissionId: "controlled-private-point" }]) for (const nativeOldScale of [11, 16]) {
    state.selectedProposal = selectedProposal;
    const h = harness(); h.state.expectedScale = vm.runInNewContext(expression, state); h.read();
    assert.equal(h.scales.length, 1, "formal, private marker and submit handoffs must acknowledge their requested zoom");
    assert.equal(h.reads.length, 0); h.scales[0]!.success({ scale: nativeOldScale });
    assert.equal(h.reads.length, 0, "neither a lower nor a higher old zoom can authorize current bounds");
    assert.equal(h.bounds(), null, "the old zoom cannot complete the spot focus intent");
    h.read(true); h.scales[1]!.success({ scale: 14 });
    h.reads[0]!.success({ southwest: { latitude: 22.75, longitude: 113.75 }, northeast: { latitude: 23.25, longitude: 114.25 } });
    assert.equal(h.bounds().east - h.bounds().west, 0.5);
  }
  assert.equal(vm.runInNewContext(expression, { ...state, bottomPresentation: "none" }), null,
    "ordinary map browsing retains its existing read path");
});

test("editor camera waits for its requested scale before publishing native bounds", () => {
  const h = harness(); h.state.expectedScale = 14; h.read();
  assert.equal(h.scales.length, 1); assert.equal(h.reads.length, 0); h.scales[0]!.success({ scale: 11 });
  assert.equal(h.bounds(), null, "an old zoom with the right center is still an old viewport");
  assert.equal(h.error(), null, "normal native zoom settlement is not a failed data request");
  h.read(true); h.scales[1]!.success({ scale: 14 }); h.reads[0]!.success(actual); assert.ok(h.bounds());
});

test("an editor scale read still obeys timeout and current camera authority", () => {
  const h = harness(); h.state.expectedScale = 14; h.read();
  h.scales[0]!.success({ scale: 11 }); h.timeout(); assert.ok(h.error()); assert.equal(h.bounds(), null);
  h.move(115); h.read(); h.scales[1]!.success({ scale: 14 }); h.move(116, false); h.reads[0]!.success(actual);
  assert.equal(h.bounds(), null);
});

test("a successful native scale callback owns its later Promise rejection", async () => {
  const h = harness(); h.state.expectedScale = 14;
  h.state.Taro.createMapContext = () => ({ getScale(options: any) { options.success({ scale: 14 }); return Promise.reject(new Error("late_adapter_failure")); },
    getRegion(options: any) { h.reads.push(options); } });
  h.read(); await new Promise(resolve => setImmediate(resolve)); assert.equal(h.error(), null);
  h.reads[0]!.success(actual); assert.ok(h.bounds());
});

test("native user gesture begins transfer camera ownership before the end event", () => {
  assert.equal(userMapRegionStarted({ type: "begin", causedBy: "gesture", detail: {} }), true);
  assert.equal(userMapRegionStarted({ detail: { type: "begin", causedBy: "scale", detail: {} } }), true);
  assert.equal(userMapRegionStarted({ type: "begin", causedBy: "update", detail: {} }), false);
  assert.equal(userMapRegionStarted({ type: "end", causedBy: "drag", detail: {} }), false);
});

test("initial and changed camera terrain use actual native bounds; old readbacks cannot publish a new camera", () => {
  const h = harness();
  assert.equal(h.bounds(), null, "an unmeasured camera cannot start a falsely narrow terrain request");
  h.read(); assert.equal(h.reads.length, 1); assert.equal(h.bounds(), null);
  h.reads[0]!.success(actual);
  assert.equal(h.bounds().west, 112, "weather samples the actual native viewport");
  const terrainBounds = h.terrainBounds(); assert.ok(terrainBounds);
  assert.ok(terrainBounds.west < 112 && terrainBounds.east > 118, "terrain alone keeps its prior buffer");
  h.read(); assert.equal(h.reads.length, 1, "ordinary native updates do not create a request loop");
  h.move(115); h.read(); h.move(116); h.read();
  h.reads[1]!.success(actual); assert.equal(h.bounds(), null, "the earlier camera has lost publication authority");
  h.reads[2]!.success(actual); assert.ok(h.bounds());
  const update = { type: "end", causedBy: "update", detail: { centerLocation: { latitude: 23, longitude: 116 }, scale: 9 } };
  assert.equal(mapRegionEnded(update), true); assert.equal(userMapRegionEnd(update), null,
    "programmatic camera settlement measures terrain without manufacturing a user point intent");
});

test("a missing native extent has bounded recovery and never falls back to the failed narrow rectangle", () => {
  const h = harness(); h.read(); h.timeout(); assert.ok(h.error());
  h.read(); h.timeout(); h.read(); assert.equal(h.reads.length, 2);
  assert.equal(h.bounds(), null);
  assert.ok(h.error(), "failed region reads retain the shared new-Map recovery dependency");
  h.read(true); h.reads[2]!.success(actual);
  assert.equal(h.error(), null); assert.ok(h.bounds(), "a later actual native settlement can recover");
});

test("same-camera native settlement during a pending read invalidates its earlier bounds and reads after settlement", () => {
  const h = harness(); h.read(); h.read(true); h.read(true);
  assert.equal(h.reads.length, 1, "multiple settle signals merge into one pending follow-up");
  h.reads[0]!.success({ southwest: { latitude: 22.8, longitude: 113.8 }, northeast: { latitude: 23.2, longitude: 114.2 } });
  assert.equal(h.bounds(), null, "a read issued before native settlement cannot publish its old narrow bounds");
  assert.equal(h.reads.length, 2);
  h.reads[1]!.success(actual);
  assert.equal(h.bounds().west, 112); assert.equal(h.bounds().east, 118);
});

test("a camera intent already in the store retires an old read before React publishes its next scope", () => {
  const h = harness(); h.read(); h.move(115, false);
  h.reads[0]!.success(actual);
  assert.equal(h.bounds(), null, "an old read cannot publish during the store-to-render gap");
});
