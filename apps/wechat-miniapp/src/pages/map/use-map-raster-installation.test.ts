import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { mapGroundOverlayKey } from "./map-ground-overlay.ts";

function harness(supportsUpdates = false) {
  const ast = ts.createSourceFile("hook.ts", readFileSync(new URL("./use-map-raster-installation.ts", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
  const declaration = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === "useMapRasterInstallation")!;
  const states: any[] = [], memos: any[] = [], effects: any[] = [];
  let stateIndex = 0, memoIndex = 0, effectIndex = 0;
  let pending: (() => void)[] = [];
  const coordinators: { callback: (result: any) => void; calls: { target: any; intent: string; replacement: string }[]; disposed: boolean; replaceReady: boolean;
    suspensions: ((result: { complete: boolean; remainingIds: number[] }) => void)[] }[] = [];
  let nativeCurrent = true;
  let rastersBlocked = false;
  const mapHandle = (mapId: string, isCurrent: () => boolean) => ({ mapId, pending: false,
    get rastersBlocked() { return rastersBlocked; }, rasterRetirementMessage: "native retirement pending",
    isCurrent, canInstallRasters: () => isCurrent() && !rastersBlocked, registerRaster: (owner: { dispose(): unknown }) => () => { owner.dispose(); } });
  let nativeMap = mapHandle("map-a", () => nativeCurrent);
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
      const owner = { callback, calls: [] as { target: any; intent: string; replacement: string }[], disposed: false, replaceReady: false,
        suspensions: [] as ((result: { complete: boolean; remainingIds: number[] }) => void)[] };
      coordinators.push(owner);
      return { apply(target: any, intent: string, replacement: string) {
          owner.replaceReady = false; owner.calls.push({ target, intent, replacement }); return Promise.resolve(); },
        canReplace() { return supportsUpdates && owner.replaceReady && !owner.disposed; },
        suspend() { owner.replaceReady = false; owner.calls.push({ target: null, intent: "suspend", replacement: "compatible" });
          return new Promise(resolve => { owner.suspensions.push(resolve); }); },
        dispose() { owner.disposed = true; return Promise.resolve(); } };
    },
  });
  const render = () => {
    stateIndex = memoIndex = effectIndex = 0; hook(input); pending.splice(0).forEach(effect => effect());
    stateIndex = memoIndex = effectIndex = 0; return hook(input);
  };
  return { render, coordinators, set(value: any) { input = { ...input, ...value }; },
    ack(owner = coordinators.at(-1)!, error: unknown = null, state: any = {}) { const call = owner.calls.at(-1)!;
      owner.replaceReady = !error && Boolean(call.target) && !state.presentationUnknown;
      owner.callback({ target: call.target, error, isCurrent: () => true, ...state }); },
    remount() { nativeCurrent = false; nativeMap = mapHandle("map-b", () => true); input = { ...input, nativeMap }; },
    blockRasters(value: boolean) { rastersBlocked = value; },
    finishSuspension(complete: boolean, owner = coordinators.at(-1)!) { owner.suspensions.shift()!({ complete, remainingIds: complete ? [] : [91301] }); },
    unmount() { nativeCurrent = false; effects.forEach(effect => effect?.cleanup?.()); } };
}

test("an unresolved predecessor exposes a recoverable layer failure without installing or losing current data", () => {
  const h = harness(); h.blockRasters(true);
  let state = h.render();
  assert.equal(h.coordinators[0]!.calls.at(-1)!.target, null);
  assert.equal(state.error?.message, "native retirement pending");
  assert.equal(state.presentedData, null); assert.equal(state.requiresMapRecovery, false);
  h.set({ identity: "b", src: "/local/b.png", data: { source: "b" } }); state = h.render();
  assert.equal(state.target.src, "/local/b.png", "independently valid newest data is retained");
  assert.equal(h.coordinators[0]!.calls.at(-1)!.target, null);
  h.blockRasters(false); h.render();
  assert.equal(h.coordinators[0]!.calls.at(-1)!.target.src, "/local/b.png");
  h.ack(); state = h.render();
  assert.equal(state.error, null); assert.equal(state.presentedData.source, "b");
  h.unmount();
});

test("a cancellable exit blocks effect reinstallations and resumes the newest source after the real clearance", async () => {
  const h = harness(); h.render(); h.ack();
  const exit = h.render().suspendForExit(), owner = h.coordinators[0]!;
  assert.equal(owner.disposed, false, "preflight must not terminally dispose an otherwise usable Map");
  const commands = owner.calls.length;
  h.set({ identity: "b", src: "/local/b.png", data: { source: "b" }, retry: 1 }); h.render();
  assert.equal(owner.calls.length, commands, "render/retry cannot install into a node being cleared");
  h.finishSuspension(true); assert.equal(await exit.ready, true);
  h.set({ identity: "c", src: "/local/c.png", data: { source: "c" } }); h.render();
  assert.equal(owner.calls.length, commands, "clearance remains reserved until the route outcome");
  exit.resume(); assert.equal(owner.calls.at(-1)!.target.src, "/local/c.png");
  h.ack(); assert.equal(h.render().presentedData.source, "c");
  h.unmount();
});

test("failed cleanup keeps the current owner retryable and a cancelled ticket cannot alter its successor", async () => {
  const h = harness(); h.render(); h.ack();
  const failed = h.render().suspendForExit(); h.finishSuspension(false);
  assert.equal(await failed.ready, false);
  assert.equal(h.render().requiresMapRecovery, true); assert.equal(h.coordinators[0]!.disposed, false);
  failed.resume(); h.ack(); assert.equal(h.render().requiresMapRecovery, false);
  const cancelled = h.render().suspendForExit();
  h.set({ identity: "b", src: "/local/b.png", data: { source: "b" } }); h.render();
  cancelled.resume(); assert.equal(h.coordinators[0]!.calls.at(-1)!.target.src, "/local/b.png");
  assert.equal(h.render().pending, true); assert.equal(h.render().presentedData, null,
    "cancelled cleanup cannot keep certifying pixels removed before the new native ack");
  const current = h.render().suspendForExit(), commands = h.coordinators[0]!.calls.length;
  cancelled.resume(); assert.equal(h.coordinators[0]!.calls.length, commands);
  h.finishSuspension(true); assert.equal(await cancelled.ready, false);
  assert.equal(current.isCurrent(), true);
  h.finishSuspension(true); assert.equal(await current.ready, true);
  h.unmount(); current.resume(); assert.equal(h.coordinators[0]!.calls.length, commands);
});

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

test("same-id mutation withdraws unconfirmed source identity and only a real ack restores it", () => {
  const h = harness(); h.render(); h.ack(); assert.equal(h.render().presentedData.source, "a");
  h.set({ identity: "b", src: "/local/b.png", data: { source: "b" } }); h.render();
  h.ack(undefined, null, { phase: "pending", presentationUnknown: true });
  let state = h.render();
  assert.equal(state.error, null); assert.equal(state.pending, true); assert.equal(state.presentedData, null);
  h.ack(undefined, new Error("update outcome uncertain"), { presentationUnknown: true, requiresMapRecovery: true });
  state = h.render();
  assert.ok(state.error); assert.equal(state.requiresMapRecovery, true); assert.equal(state.presentedData, null);
  h.set({ retry: 1 }); h.render(); h.ack(); state = h.render();
  assert.equal(state.presentedData.source, "b"); assert.equal(state.pending, false);
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

test("an initial-only parent fills an empty surface, keeps its own bounds until fine ack, and cannot replace existing fine detail", () => {
  const h = harness();
  h.set({ preview: { viewport: null }, src: "/local/parent.png", data: { source: "parent", preview: true },
    bounds: { west: 112, east: 116, south: 20, north: 24 } });
  let state = h.render();
  assert.equal(state.target.src, "/local/parent.png"); assert.equal(state.presentedData, null);
  assert.equal(h.coordinators[0]!.calls.at(-1)!.replacement, "compatible");
  h.ack(); assert.equal(h.render().presentedData.source, "parent");
  h.set({ src: "/local/recovered-parent.png" });
  assert.equal(h.render().target.src, "/local/recovered-parent.png", "the same initial image may recover its local file");
  assert.equal(h.coordinators[0]!.calls.at(-1)!.replacement, "compatible", "existing initial-only recovery is preserved without update");
  h.ack();
  h.set({ preview: undefined, src: null, data: null, bounds: null });
  state = h.render();
  assert.equal(state.target.src, "/local/recovered-parent.png"); assert.equal(state.target.bounds.southwest.longitude, 112);
  h.set({ src: "/local/fine.png", data: { source: "fine" }, bounds: { west: 113, east: 114, south: 22, north: 23 } });
  state = h.render();
  assert.equal(state.target.src, "/local/fine.png"); assert.equal(state.presentedData.source, "parent");
  h.set({ preview: { viewport: null }, src: "/local/late-parent.png", data: { source: "late-parent" },
    bounds: { west: 112, east: 117, south: 20, north: 25 } });
  assert.equal(h.render().target.src, "/local/fine.png", "already queued fine detail also rejects a parent before its native ack");
  h.ack(); assert.equal(h.render().presentedData.source, "fine");
  h.set({ identity: "new-window", preview: { viewport: null }, src: "/local/late-parent.png", data: { source: "late-parent" },
    bounds: { west: 112, east: 117, south: 20, north: 25 } });
  state = h.render();
  assert.equal(state.target.src, "/local/fine.png", "a viewport transition cannot downgrade an existing fine target");
  assert.equal(state.target.bounds.southwest.longitude, 113);
  assert.equal(state.presentedData.source, "fine");
  h.unmount();
});

test("an uncovered actual viewport may use a same-id parent, then queued fine detail prevents a late downgrade", () => {
  const h = harness(true), viewport = { west: 113.5, east: 114.5, south: 22.1, north: 22.9 };
  h.render(); h.ack(); let state = h.render();
  assert.equal(state.canPreview("b", viewport), true);
  assert.equal(state.canPreview("finer-b", { west: 113.1, east: 113.9, south: 22.1, north: 22.9 }), false,
    "finer demand or an uncovered request buffer alone cannot lower already covering detail");
  assert.equal(state.canPreview("b", { ...viewport, east: Number.NaN }), false);
  h.set({ identity: "b", preview: { viewport }, src: "/local/parent-b.png", data: { source: "parent-b" },
    bounds: { west: 113, east: 115, south: 21, north: 24 } });
  state = h.render(); assert.equal(state.target.src, "/local/parent-b.png");
  assert.equal(h.coordinators[0]!.calls.at(-1)!.replacement, "same-id-only");
  assert.equal(state.presentedData.source, "a", "source changes still await native ownership");
  h.ack(undefined, null, { phase: "pending", presentationUnknown: true });
  assert.equal(h.render().presentedData, null);
  h.ack(); state = h.render(); assert.equal(state.presentedData.source, "parent-b");
  h.set({ preview: undefined, src: "/local/fine-b.png", data: { source: "fine-b" },
    bounds: { west: 113.4, east: 114.6, south: 22, north: 23 } });
  state = h.render(); assert.equal(state.target.src, "/local/fine-b.png");
  assert.equal(h.coordinators[0]!.calls.at(-1)!.replacement, "compatible");
  h.set({ preview: { viewport }, src: "/local/late-parent-b.png", data: { source: "late-parent-b" } });
  assert.equal(h.render().target.src, "/local/fine-b.png", "same-identity fine is authoritative even before its ack");
  h.ack(); assert.equal(h.render().presentedData.source, "fine-b");
  h.set({ visible: false }); assert.equal(h.render().target, null);
  h.unmount();
});

test("missing native update keeps cross-coverage parents out while ordinary fine replacement remains available", () => {
  const h = harness(), viewport = { west: 113.5, east: 114.5, south: 22.1, north: 22.9 };
  h.render(); h.ack(); assert.equal(h.render().canPreview("b", viewport), false);
  const count = h.coordinators[0]!.calls.length;
  h.set({ identity: "b", preview: { viewport }, src: "/local/parent-b.png", data: { source: "parent-b" },
    bounds: { west: 113, east: 115, south: 21, north: 24 } });
  let state = h.render(); assert.equal(state.target.src, "/local/a.png");
  assert.equal(h.coordinators[0]!.calls.length, count, "a rejected parent never reaches native apply");
  h.set({ preview: undefined, src: "/local/fine-b.png", data: { source: "fine-b" } });
  state = h.render(); assert.equal(state.target.src, "/local/fine-b.png");
  h.ack(); assert.equal(h.render().presentedData.source, "fine-b");
  h.unmount();
});
