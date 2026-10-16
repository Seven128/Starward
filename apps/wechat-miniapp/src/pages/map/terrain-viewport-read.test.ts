import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { terrainBoundsForNativeRegion } from "./terrain-geometry";
import { mapRegionEnded, userMapRegionEnd } from "./map-region-event";

const source = ts.createSourceFile("map.tsx", readFileSync(new URL("./index.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
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
  const reads: { success(value: unknown): void; fail(): void }[] = [], timers = new Map<number, () => void>(); let timer = 0;
  const cameraKey = () => JSON.stringify(["spot-map", viewport.center, viewport.zoom, viewport.loadedViewport, 0, 700]);
  const state: any = { terrainReadEnabled: true, nativeMap: { mapId: "spot-map", isCurrent: () => true },
    useAppStore: { getState: () => ({ viewport }) }, panelLayoutVersion: 0, primaryNavigation: { pageHeight: 700 },
    terrainViewportScope: { current: cameraKey() }, terrainViewportRead: { current: null },
    terrainCamera: cameraKey(), measuredTerrainViewport: null, terrainViewportError: null, terrainNativeNeedsMapRecovery: false,
    terrainBoundsForNativeRegion,
    Taro: { createMapContext: () => ({ getRegion: (options: any) => { reads.push(options); } }) },
    setTimeout: (fn: () => void) => { const id = ++timer; timers.set(id, fn); return id; }, clearTimeout: (id: number) => timers.delete(id),
    setTerrainViewportError: (error: unknown) => { state.terrainViewportError = error; },
    setMeasuredTerrainViewport: (value: unknown) => { state.measuredTerrainViewport = value; },
  };
  const read = vm.runInNewContext(initializer("readTerrainViewport", true), state);
  return { read, reads, state,
    bounds: () => vm.runInNewContext(initializer("mapTerrainBounds"), state),
    move(longitude: number) { viewport.center = { latitude: 23, longitude }; viewport.loadedViewport += "next";
      state.terrainCamera = state.terrainViewportScope.current = cameraKey(); },
    timeout() { [...timers.values()].forEach(fn => fn()); },
  };
}
const actual = { southwest: { latitude: 20, longitude: 112 }, northeast: { latitude: 26, longitude: 118 } };

test("initial and changed camera terrain use actual native bounds; old readbacks cannot publish a new camera", () => {
  const h = harness();
  assert.equal(h.bounds(), null, "an unmeasured camera cannot start a falsely narrow terrain request");
  h.read(); assert.equal(h.reads.length, 1); assert.equal(h.bounds(), null);
  h.reads[0]!.success(actual);
  assert.ok(h.bounds().west < 112 && h.bounds().east > 118, "whole native width plus buffer is independent of scale's assumed tile size");
  h.read(); assert.equal(h.reads.length, 1, "ordinary native updates do not create a request loop");
  h.move(115); h.read(); h.move(116); h.read();
  h.reads[1]!.success(actual); assert.equal(h.bounds(), null, "the earlier camera has lost publication authority");
  h.reads[2]!.success(actual); assert.ok(h.bounds());
  const update = { type: "end", causedBy: "update", detail: { centerLocation: { latitude: 23, longitude: 116 }, scale: 9 } };
  assert.equal(mapRegionEnded(update), true); assert.equal(userMapRegionEnd(update), null,
    "programmatic camera settlement measures terrain without manufacturing a user point intent");
});

test("a missing native extent has bounded recovery and never falls back to the failed narrow rectangle", () => {
  const h = harness(); h.read(); h.timeout(); assert.ok(h.state.terrainViewportError);
  h.read(); h.timeout(); h.read(); assert.equal(h.reads.length, 2);
  assert.equal(h.bounds(), null);
  assert.equal(vm.runInNewContext(initializer("terrainRequiresMapRecovery"), h.state), true);
  h.read(true); h.reads[2]!.success(actual);
  assert.equal(h.state.terrainViewportError, null); assert.ok(h.bounds(), "a later actual native settlement can recover");
});

test("same-camera native settlement during a pending read invalidates its earlier bounds and reads after settlement", () => {
  const h = harness(); h.read(); h.read(true); h.read(true);
  assert.equal(h.reads.length, 1, "multiple settle signals merge into one pending follow-up");
  h.reads[0]!.success({ southwest: { latitude: 22.8, longitude: 113.8 }, northeast: { latitude: 23.2, longitude: 114.2 } });
  assert.equal(h.bounds(), null, "a read issued before native settlement cannot publish its old narrow bounds");
  assert.equal(h.reads.length, 2);
  h.reads[1]!.success(actual);
  assert.ok(h.bounds().west < 112 && h.bounds().east > 118);
});
