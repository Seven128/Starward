import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { mapGroundOverlayKey } from "./map-ground-overlay.ts";

function harness() {
  const ast = ts.createSourceFile("hook.ts", readFileSync(new URL("./use-map-raster-installation.ts", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
  const declaration = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === "useMapRasterInstallation")!;
  const states: any[] = [], memos: any[] = [], effects: any[] = [];
  let stateIndex = 0, memoIndex = 0, effectIndex = 0;
  let pending: (() => void)[] = [];
  const coordinators: { callback: (result: any) => void; calls: { target: any; intent: string }[]; disposed: boolean }[] = [];
  let nativeCurrent = true;
  let nativeMap = { mapId: "map-a", pending: false, isCurrent: () => nativeCurrent };
  let input: any = { id: 91301, label: "地形", nativeMap, visible: true, enabled: true, unavailable: false, identity: "a", retry: 0,
    runtimeError: null, src: "/local/a.png", bounds: { west: 113, east: 114, south: 22, north: 23 }, data: { source: "a" }, opacity: 1, zIndex: 0,
    reportImageFailure() {}, onFailure() {} };
  const equal = (a: any[], b: any[]) => a?.length === b.length && b.every((item, i) => Object.is(item, a[i]));
  const hook = vm.runInNewContext(ts.transpileModule(declaration.getText(ast).replace(/^export /, "") + ";useMapRasterInstallation;",
    { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, {
    Taro: { createMapContext() {}, getImageInfo: async () => ({}) }, mapRasterFiles: {}, mapGroundOverlayKey,
    useState(initial: any) { const index = stateIndex++; if (!(index in states)) states[index] = initial;
      return [states[index], (value: any) => { states[index] = typeof value === "function" ? value(states[index]) : value; }]; },
    useRef(initial: any) { const index = stateIndex++; if (!(index in states)) states[index] = { current: initial }; return states[index]; },
    useMemo(compute: () => any, deps: any[]) { const index = memoIndex++;
      if (!memos[index] || !equal(memos[index].deps, deps)) memos[index] = { deps, value: compute() }; return memos[index].value; },
    useEffect(effect: () => any, deps: any[]) { const index = effectIndex++;
      if (!effects[index] || !equal(effects[index].deps, deps)) pending.push(() => {
        effects[index]?.cleanup?.(); effects[index] = { deps, cleanup: effect() };
      }); },
    createMapGroundOverlayCoordinator(_id: number, _create: any, callback: any) {
      const owner = { callback, calls: [] as { target: any; intent: string }[], disposed: false };
      coordinators.push(owner);
      return { apply(target: any, intent: string) { owner.calls.push({ target, intent }); return Promise.resolve(); },
        dispose() { owner.disposed = true; return Promise.resolve(); } };
    },
  });
  const render = () => {
    stateIndex = memoIndex = effectIndex = 0; hook(input); pending.splice(0).forEach(effect => effect());
    stateIndex = memoIndex = effectIndex = 0; return hook(input);
  };
  return { render, coordinators, set(value: any) { input = { ...input, ...value }; },
    ack(owner = coordinators.at(-1)!, error: unknown = null) { const call = owner.calls.at(-1)!;
      owner.callback({ target: call.target, error, isCurrent: () => true }); },
    remount() { nativeCurrent = false; nativeMap = { mapId: "map-b", pending: false, isCurrent: () => true }; input = { ...input, nativeMap }; },
    unmount() { effects.forEach(effect => effect?.cleanup?.()); } };
}

test("source advances only with the native ack and a failed replacement retains the prior rendered source", () => {
  const h = harness();
  assert.equal(h.render().presentedData, null);
  h.ack(); assert.equal(h.render().presentedData.source, "a");
  h.set({ identity: "b", src: null, data: { source: "b" }, bounds: { west: 114, east: 115, south: 22, north: 23 } });
  let state = h.render(); assert.equal(state.target.src, "/local/a.png"); assert.equal(state.presentedData.source, "a");
  assert.equal(state.target.bounds.southwest.longitude, 113);
  h.set({ src: "/local/b.png" }); state = h.render();
  assert.equal(state.target.bounds.southwest.longitude, 114);
  assert.equal(state.pending, true); assert.equal(state.presentedData.source, "a");
  h.ack(undefined, new Error("native add failed")); state = h.render();
  assert.ok(state.error); assert.equal(state.presentedData.source, "a");
  h.set({ retry: 1 }); h.render(); h.ack();
  state = h.render(); assert.equal(state.presentedData.source, "b"); assert.equal(state.pending, false);
  h.unmount();
});

test("genuine unavailable data removes at native ack while pending metadata retains actual bounds", () => {
  const h = harness(); h.render(); h.ack(); h.render();
  h.set({ unavailable: true, src: null }); let state = h.render();
  assert.equal(state.target, null); assert.equal(state.presentedData.source, "a");
  h.ack(); state = h.render(); assert.equal(state.presentedData, null);
  h.unmount();
});

test("a replacement native Map cannot inherit the preceding Map's source or late ack", () => {
  const h = harness(); h.render(); h.ack(); assert.equal(h.render().presentedData.source, "a");
  const old = h.coordinators[0]!;
  h.remount(); let state = h.render();
  assert.equal(old.disposed, true); assert.equal(state.presentedData, null);
  h.ack(old); assert.equal(h.render().presentedData, null);
  h.ack(); state = h.render(); assert.equal(state.presentedData.source, "a");
  h.unmount();
});

test("resuming a cached image after hidden cleanup requires a new native acknowledgment", () => {
  const h = harness(); h.render(); h.ack(); assert.equal(h.render().pending, false);
  h.set({ visible: false }); let state = h.render();
  assert.equal(state.target, null); assert.equal(state.presentedData, null);
  assert.equal(h.coordinators.at(-1)!.calls.at(-1)!.intent, "suspend");
  h.set({ visible: true }); state = h.render();
  assert.equal(state.target.src, "/local/a.png"); assert.equal(state.pending, true); assert.equal(state.presentedData, null);
  h.ack(); state = h.render(); assert.equal(state.pending, false); assert.equal(state.presentedData.source, "a");
  h.set({ enabled: false }); state = h.render(); assert.equal(state.target, null);
  h.ack(); assert.equal(h.render().presentedData, null);
  h.unmount();
});
