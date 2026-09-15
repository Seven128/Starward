import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

function setup() {
  let source = fs.readFileSync(new URL("./native-map-recovery.ts", import.meta.url), "utf8");
  if (process.env.MUTATE_NATIVE_MAP_RETRY === "1") source = source.replace("current.current.generation + 1", "current.current.generation");
  const slots: any[] = []; let index = 0, cleanup: (() => void) | undefined;
  const timers = new Map<number, () => void>(); let sequence = 0;
  const module = { exports: {} as any };
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, {
    module, exports: module.exports,
    require: () => ({
      useState(initial: any) { const i = index++; if (!(i in slots)) slots[i] = initial; return [slots[i], (v: any) => { slots[i] = v; }]; },
      useRef(initial: any) { const i = index++; return slots[i] ??= { current: initial }; },
      useEffect(effect: () => () => void) { if (!cleanup) cleanup = effect(); },
    }),
    setTimeout(fn: () => void) { const id = ++sequence; timers.set(id, fn); return id; },
    clearTimeout(id: number) { timers.delete(id); },
  });
  return { render() { index = 0; return module.exports.useNativeMapRecovery(); }, timers,
    unmount() { cleanup?.(); } };
}

function nativeElement(nativeMap: any, events: string[] = []) {
  const source = fs.readFileSync(new URL("./index.tsx", import.meta.url), "utf8");
  const jsx = source.match(/<Map\b[\s\S]*?\/>/u)?.[0];
  // Deliberately execute the real rendered native element, not a copied key rule.
  assert.ok(jsx);
  return vm.runInNewContext(ts.transpileModule(`(${jsx})`, { compilerOptions: { jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2020 } }).outputText, {
    nativeMap, Map: "Map", viewport: { center: { latitude: 22, longitude: 113 }, zoom: 9 },
    markerList: [], layerPolygons: [], locationState: "GRANTED",
    onMapTap: () => events.push("tap"), onMarkerTap: () => events.push("marker"), onRegionChange: () => events.push("region"),
    React: { createElement: (_type: any, props: any) => props },
  });
}

test("retry changes the actual Map key/id, preserves viewport, and ignores old native callbacks", () => {
  const t = setup(), events: string[] = []; const before = nativeElement(t.render(), events);
  before.onError(); assert.equal(t.render().error, true);
  t.render().retry(); const pending = t.render(), after = nativeElement(pending, events);
  assert.equal(pending.pending, true); assert.notEqual(after.id, before.id); assert.notEqual(after.key, before.key);
  assert.equal(after.latitude, before.latitude); assert.equal(after.longitude, before.longitude); assert.equal(after.scale, before.scale);
  before.onUpdated(); before.onError(); before.onTap(); before.onMarkerTap({}); before.onRegionChange({});
  assert.equal(t.render().pending, true); assert.deepEqual(events, []);
  after.onUpdated(); assert.equal(t.render().pending, false); assert.equal(t.render().error, false); assert.equal(t.timers.size, 0);
  after.onTap(); assert.deepEqual(events, ["tap"]);
});

test("native failure or missing completion leaves recovery available; stale success cannot erase failure", () => {
  const t = setup(); t.render().onError(); t.render().retry(); const second = t.render();
  second.onError(); second.onUpdated(); assert.equal(t.render().error, true); assert.equal(t.timers.size, 0);
  t.render().retry(); const id = t.render().mapId; t.render().retry(); assert.equal(t.render().mapId, id, "pending retry is not duplicated");
  [...t.timers.values()][0]!(); assert.equal(t.render().error, true); assert.equal(t.render().pending, false);
  t.render().retry(); assert.notEqual(t.render().mapId, id);
});

test("unmount cancels pending retry and late callbacks cannot revive its state", () => {
  const t = setup(); t.render().onError(); t.render().retry(); const old = t.render();
  t.unmount(); assert.equal(t.timers.size, 0); old.onUpdated(); old.onError(); old.retry();
  assert.equal(t.render().mapId, old.mapId); assert.equal(t.render().pending, true); assert.equal(old.isCurrent(), false);
});
