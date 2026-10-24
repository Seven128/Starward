import { createMapPageTestBoundaries } from "./map-page-test-support";
import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { createNativeMapSessions } from "./native-map-session";

function setup() {
  let source = fs.readFileSync(new URL("./native-map-recovery.ts", import.meta.url), "utf8");
  if (process.env.MUTATE_NATIVE_MAP_RETRY === "1") source = source.replace("current.current.generation + 1", "current.current.generation");
  const slots: any[] = []; let index = 0, cleanup: (() => void) | undefined;
  const timers = new Map<number, () => void>(); let sequence = 0;
  const module = { exports: {} as any };
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, {
    module, exports: module.exports,
    require: (name: string) => {
      if (name === "./native-map-session") return { nativeMapSessions: createNativeMapSessions(), NATIVE_MAP_RETIREMENT_MESSAGE: "retirement pending",
        NATIVE_MAP_RASTER_RETIREMENT_MESSAGE: "raster retirement pending" };
      assert.equal(name, "react", "native recovery has an explicit hook dependency");
      return ({
      useState(initial: any) { const i = index++; if (!(i in slots)) slots[i] = typeof initial === "function" ? initial() : initial;
        return [slots[i], (v: any) => { slots[i] = typeof v === "function" ? v(slots[i]) : v; }]; },
      useRef(initial: any) { const i = index++; return slots[i] ??= { current: initial }; },
      useEffect(effect: () => () => void) { if (!cleanup) cleanup = effect(); },
    }); },
    setTimeout(fn: () => void) { const id = ++sequence; timers.set(id, fn); return id; },
    clearTimeout(id: number) { timers.delete(id); },
  });
  return { render() { index = 0; return module.exports.useNativeMapRecovery(); }, timers,
    unmount() { cleanup?.(); } };
}

function nativeElement(nativeMap: any, events: string[] = [], focus = { pending: false }, boundaries = createMapPageTestBoundaries()) {
  const source = fs.readFileSync(new URL("./index.tsx", import.meta.url), "utf8");
  const jsx = source.match(/<Map\b[\s\S]*?\/>/u)?.[0];
  // Deliberately execute the real rendered native element, not a copied key rule.
  assert.ok(jsx);
  return vm.runInNewContext(ts.transpileModule(`(${jsx})`, { compilerOptions: { jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2020 } }).outputText, {
    ...boundaries.scope, nativeMap, Map: "Map", viewport: { center: { latitude: 22, longitude: 113 }, zoom: 9 },
    markerList: [], layerPolygons: [], locationState: "GRANTED", spotEditorPhase: "open",
    editorPresentation: {isClosing: () => false},
    onMapTap: () => events.push("tap"), onMarkerTap: () => { events.push("marker"); focus.pending = true; }, onRegionChange: () => events.push("region"),
    spotMapFocus: { cancel() { focus.pending = false; } },
    readTerrainViewport: () => events.push("viewport"), mapTerrainBounds: null,
    React: { createElement: (_type: any, props: any) => props },
  });
}

test("a marker's delayed generic native touch event cannot cancel its newly selected camera intent", () => {
  const focus = { pending: false }, element = nativeElement(setup().render(), [], focus);
  element.onMarkerTap({}); element.onTouchStart?.({});
  assert.equal(focus.pending, true, "actual camera movement belongs to region gestures, not the marker tap's touch transport");
});

test("retry changes the actual Map key/id, preserves viewport, and ignores old native callbacks", () => {
  const t = setup(), events: string[] = [], boundaries = createMapPageTestBoundaries();
  const before = nativeElement(t.render(), events, undefined, boundaries);
  before.onError(); assert.equal(t.render().error, true);
  t.render().retry(); const pending = t.render(), after = nativeElement(pending, events, undefined, boundaries);
  assert.equal(pending.pending, true); assert.notEqual(after.id, before.id); assert.notEqual(after.key, before.key);
  assert.equal(before.className, "native-map"); assert.equal(after.className, "native-map", "runtime harness observes the same stable host across unique native ids");
  assert.equal(after.latitude, before.latitude); assert.equal(after.longitude, before.longitude); assert.equal(after.scale, before.scale);
  before.onUpdated(); before.onError(); before.onTap(); before.onMarkerTap({}); before.onRegionChange({});
  assert.equal(t.render().pending, true); assert.deepEqual(events, []);
  const revealsBeforeUpdate = boundaries.calls.filter(call => call === "map-return:true").length;
  after.onUpdated(); assert.equal(boundaries.calls.filter(call => call === "map-return:true").length, revealsBeforeUpdate + 1);
  assert.equal(t.render().pending, false); assert.equal(t.render().error, false); assert.equal(t.timers.size, 0);
  assert.deepEqual(events, ["viewport"], "the current Map update initiates actual viewport measurement");
  after.onTap(); assert.deepEqual(events, ["viewport", "tap"]);
});

test("a failed successor retains a visible error and cannot create another unknown native Map; stale success cannot erase failure", () => {
  const t = setup(); t.render().onError(); t.render().retry(); const second = t.render();
  second.onError(); second.onUpdated(); assert.equal(t.render().error, true); assert.equal(t.timers.size, 0);
  assert.equal(t.render().retry(), false); assert.equal(t.render().mapId, second.mapId);
  assert.ok(t.render().retirementMessage);
});

test("a missing successor update ends visible waiting without certifying native retirement or multiplying Maps", () => {
  const t = setup(); t.render().onError(); t.render().retry(); const id = t.render().mapId;
  assert.equal(t.render().retry(), false); assert.equal(t.render().mapId, id, "pending retry is not duplicated");
  [...t.timers.values()][0]!(); assert.equal(t.render().error, true); assert.equal(t.render().pending, false);
  assert.equal(t.render().retry(), false); assert.equal(t.render().mapId, id);
});

test("unmount cancels pending retry and late callbacks cannot revive its state", () => {
  const t = setup(); t.render().onError(); t.render().retry(); const old = t.render();
  t.unmount(); assert.equal(t.timers.size, 0); old.onUpdated(); old.onError(); old.retry();
  assert.equal(t.render().mapId, old.mapId); assert.equal(t.render().pending, true); assert.equal(old.isCurrent(), false);
});
