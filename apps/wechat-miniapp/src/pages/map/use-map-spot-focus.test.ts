import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { cameraCenterForNativeMapTarget, spotNeighborhoodGroundRange } from "./map-camera.ts";

function harness() {
  const slots: any[] = [], effects: any[] = [], timers = new Map<number, () => void>();
  let index = 0, effectIndex = 0, timerSequence = 0, callbacks: (() => void)[] = [];
  const moves: any[] = [], failures: number[] = [];
  const authority = { scope: "owner/map-a/reset-0", identity: "formal:a" };
  let holdNative = false;
  const nativeReads: { resolve(): void; reject(): void }[] = [];
  const projection = {
    toScreenLocation(options: any) {
      const deliver = () => options.success({ x: (options.longitude - 119) * 1000, y: (31 - options.latitude) * 2000 });
      if (holdNative) nativeReads.push({ resolve: deliver, reject: () => options.fail(new Error("native_failed")) }); else deliver();
    },
    fromScreenLocation(options: any) { options.success({ longitude: 119 + options.x / 1000, latitude: 31 - options.y / 2000 }); },
  };
  const camera = { center: { latitude: 30, longitude: 120 }, zoom: 12, loadedViewport: "initial" };
  let nativeCurrent = true;
  let input: any = { mapId: "map-a", identity: "formal:a", scope: "owner/map-a/reset-0", layout: "layout-a", visible: true,
    presentationReady: true, contentReady: true, interacting: false, isCurrent: () => nativeCurrent, getCamera: () => camera,
    getScope: () => authority.scope, getSelectionIdentity: () => authority.identity,
    frame: null, bounds: { west: 119.99, east: 120.01, south: 29.99, north: 30.01 }, viewportError: null,
    move(center: any, zoom?: number) { moves.push({ ...center, ...(zoom === undefined ? {} : { zoom }) }); camera.center = center;
      if (zoom !== undefined) camera.zoom = zoom; }, onFailure() { failures.push(1); } };
  const equal = (a: any[], b: any[]) => a?.length === b.length && b.every((v, i) => Object.is(a[i], v));
  const module = { exports: {} as any };
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL("./use-map-spot-focus.ts", import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, { module, exports: module.exports, JSON, AbortController,
    require: (name: string) => name === "react" ? {
      useRef(initial: any) { const i = index++; return slots[i] ??= { current: initial }; },
      useState(initial: any) { const i = index++; if (!(i in slots)) slots[i] = initial;
        return [slots[i], (value: any) => { slots[i] = value; }]; },
      useEffect(effect: () => (() => void) | void, dependencies: any[]) {
        const i = effectIndex++, old = effects[i];
        if (!equal(old?.dependencies, dependencies)) callbacks.push(() => {
          old?.cleanup?.(); effects[i] = { dependencies, cleanup: effect() };
        });
      },
    } : name === "@tarojs/taro" ? { default: { createMapContext: () => projection } } : { cameraCenterForNativeMapTarget, spotNeighborhoodGroundRange },
    setTimeout(callback: () => void) { const id = ++timerSequence; timers.set(id, callback); return id; },
    clearTimeout(id: number) { timers.delete(id); },
  });
  const render = () => { index = 0; effectIndex = 0; callbacks = [];
    const result = module.exports.useMapSpotFocus(input); for (const callback of callbacks) callback(); return result; };
  return { render, moves, failures, timers, camera, nativeReads, authority,
    holdNative(value = true) { holdNative = value; },
    async flush() { await new Promise(resolve => setImmediate(resolve)); },
    set(patch: any) { input = { ...input, ...patch };
      if ("scope" in patch) authority.scope = patch.scope;
      if ("identity" in patch) authority.identity = patch.identity;
    },
    frame(version: number, layout = input.layout) { input = { ...input, frame: { top: 24, height: 760, visibleBottom: 414, version, layout } }; },
    replaceMap() { nativeCurrent = false; }, unmount() { effects.forEach(effect => effect.cleanup?.()); } };
}
const point = { latitude: 30.001, longitude: 120.002 };

test("a coarse selection waits for the actual finer native range before committing its visible centre", async () => {
  const h = harness(); h.set({ bounds: { west: 119.8, east: 120.2, south: 29.8, north: 30.2 } });
  h.render().begin("formal:a", point); const version = h.render().version;
  h.frame(version); h.render(); await h.flush();
  assert.equal(h.moves.length, 1); assert.ok(h.moves[0].zoom > 12);
  h.set({ bounds: null }); h.render(); assert.equal(h.moves.length, 1);
  h.set({ bounds: { west: 119.99, east: 120.01, south: 29.99, north: 30.01 } }); h.render(); await h.flush();
  assert.equal(h.moves.length, 2); assert.equal(h.moves[1].zoom, undefined); assert.equal(h.failures.length, 0);
  assert.equal(h.timers.size, 0);
});

test("user handover during range settlement retires further adjustment and centring", async () => {
  const h = harness(); h.set({ bounds: { west: 119.8, east: 120.2, south: 29.8, north: 30.2 } });
  h.render().begin("formal:a", point); const version = h.render().version; h.frame(version); h.render();
  h.render().cancel(); h.set({ bounds: { west: 119.99, east: 120.01, south: 29.99, north: 30.01 } }); h.render(); await h.flush();
  assert.equal(h.moves.length, 1); assert.equal(h.timers.size, 0); assert.equal(h.failures.length, 0);
});

test("pending selection scope survives its own context/detail refresh", async () => {
  const source = ts.createSourceFile("map.tsx", readFileSync(new URL("./index.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let expression = "";
  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && node.name.getText(source) === "getSpotFocusScope") expression = `(${node.initializer!.getText(source)})()`;
    ts.forEachChild(node, visit);
  };
  visit(source); assert.ok(expression);
  const environment = { JSON, currentDraftUserId: () => "owner", nativeMap: { mapId: "map-a" },
    useAppStore: { getState: () => ({ mapResetVersion: 0 }) }, navigationEpoch: { current: 1 } };
  const before = vm.runInNewContext(expression, environment);
  environment.navigationEpoch.current = 3; // Selection and its own resolved context both update the navigation owner.
  const after = vm.runInNewContext(expression, environment);
  assert.equal(after, before, "data readiness must not retire the selected point camera intent");
  const h = harness(); h.set({ scope: before }); h.render().begin("formal:a", point);
  const version = h.render().version; h.set({ scope: after }); h.frame(version); h.render(); await h.flush();
  assert.equal(h.moves.length, 1);
});

test("one selection waits for its native frame and moves once without changing zoom", async () => {
  const h = harness(); h.render().begin("formal:a", point);
  const request = h.render(); assert.equal(h.moves.length, 0);
  h.frame(request.version); h.render(); await h.flush(); assert.equal(h.moves.length, 1);
  assert.ok(h.moves[0].latitude < point.latitude); assert.equal(h.moves[0].longitude, point.longitude);
  assert.equal(h.camera.zoom, 12); assert.equal(h.timers.size, 0);
  h.frame(request.version); h.render(); assert.equal(h.moves.length, 1, "detail refresh cannot recenter a completed selection");
});

test("initial loading geometry cannot commit focus or be reused after content settles", async () => {
  const h = harness(); h.set({ contentReady: false, layout: "loading" });
  h.render().begin("formal:a", point); const version = h.render().version;
  h.frame(version); h.render(); await h.flush();
  assert.equal(h.moves.length, 0, "loading panels must not consume the one selection move");
  assert.equal(h.timers.size, 1);
  h.set({ contentReady: true, layout: "settled" }); h.render(); await h.flush();
  assert.equal(h.moves.length, 0, "the prior taller loading frame is obsolete");
  h.frame(version); h.render(); await h.flush();
  assert.equal(h.moves.length, 1); assert.equal(h.failures.length, 0);
  h.set({ contentReady: false, layout: "refreshing" }); h.frame(version); h.render();
  h.set({ contentReady: true, layout: "refreshed" }); h.frame(version); h.render(); await h.flush();
  assert.equal(h.moves.length, 1, "ordinary refresh cannot create a new selection intent");
});

test("Map gates formal content and invalidates the previous query layout while private/editor remain independent", () => {
  const source = ts.createSourceFile("map.tsx", readFileSync(new URL("./index.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const declarations: string[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && ["spotFocusContentReady", "spotFocusLayout"].includes(node.name.getText(source))) {
      declarations.push(`const ${node.getText(source)};`);
    }
    ts.forEachChild(node, visit);
  };
  visit(source); assert.equal(declarations.length, 2);
  let updatedAt = 0;
  const environment = { JSON, bottomPresentation: "spot-panel", selectedProposal: null as object | null, detailContextReady: false,
    spotOverviewProjection: { pending: false, error: null, stale: false }, spotOverview: { isFetching: false, readCurrent: () => ({ updatedAt }) },
    visibleSpotContextAttempt: null as null | { pending: boolean; error: Error | null },
    activeContext: { contextId: "context-a", contextFingerprint: "fingerprint", revision: 1 },
    spotFocusScope: "owner/map/reset", spotFocusIdentity: "formal:a", spotEditorPhase: "closed", panelIdentityHeight: 300, panelLayoutVersion: 0,
    primaryNavigation: { pageHeight: 800 }, mode: "DAY", preferences: { largeText: false } };
  const read = () => vm.runInNewContext("(() => {" + declarations.join("\n") + "\nreturn {ready:spotFocusContentReady,layout:spotFocusLayout};})()", environment);
  assert.equal(read().ready, false, "a not-yet-started context cannot consume the focus intent");
  environment.visibleSpotContextAttempt = { pending: false, error: new Error("context failed") };
  assert.equal(read().ready, true, "context recovery layout works without an enabled overview");
  environment.visibleSpotContextAttempt = null; environment.detailContextReady = true;
  environment.spotOverviewProjection.pending = true; environment.spotOverview.isFetching = true;
  const loading = read(); assert.equal(loading.ready, false);
  environment.spotOverviewProjection.pending = false;
  assert.equal(read().ready, false, "retained data must wait for the initial active revalidation");
  environment.spotOverview.isFetching = false; updatedAt = 1;
  const settled = read(); assert.equal(settled.ready, true); assert.notEqual(settled.layout, loading.layout);
  updatedAt = 2; assert.notEqual(read().layout, settled.layout, "a completed query needs its own measured frame");
  updatedAt = 1; environment.activeContext.contextId = "context-b";
  assert.notEqual(read().layout, settled.layout, "query identity cannot alias matching update timestamps");
  environment.detailContextReady = false; environment.spotOverviewProjection.pending = true;
  environment.spotOverview.isFetching = true; environment.selectedProposal = {};
  assert.equal(read().ready, true);
  environment.selectedProposal = null; environment.bottomPresentation = "spot-editor";
  assert.equal(read().ready, true);
});

test("selection intent waits through intermediate commits before its medium panel is presented", async () => {
  const h = harness(); h.set({ identity: "formal:", visible: false });
  h.render().begin("formal:a", point); const version = h.render().version;
  assert.equal(h.timers.size, 1, "a pre-presentation render is not user cancellation");
  h.set({ identity: "formal:a" }); h.render(); assert.equal(h.timers.size, 1);
  h.set({ visible: true }); h.frame(version); h.render(); await h.flush();
  assert.equal(h.moves.length, 1); assert.equal(h.timers.size, 0);
});

test("reselecting the same spot has a fresh frame version", async () => {
  const h = harness(); h.render().begin("formal:a", point); const first = h.render().version;
  h.render().begin("formal:a", point); const second = h.render().version; assert.notEqual(first, second);
  h.frame(first); h.render(); assert.equal(h.moves.length, 0);
  h.frame(second); h.render(); await h.flush(); assert.equal(h.moves.length, 1);
});

test("map gesture cancels before a late layout result and never moves the camera back", async () => {
  const h = harness(); h.render().begin("formal:a", point); const focus = h.render();
  focus.cancel(); h.frame(focus.version); h.render(); await h.flush(); assert.equal(h.moves.length, 0); assert.equal(h.timers.size, 0);
});

test("changed selection, owner scope, camera or native Map retires the old request", async () => {
  for (const change of ["selection", "scope", "camera", "native", "hidden", "extent"]) {
    const h = harness(); h.render().begin("formal:a", point); const version = h.render().version;
    if (change === "selection") h.set({ identity: "formal:b" });
    if (change === "scope") h.set({ scope: "other-owner/map-b/reset-1" });
    if (change === "camera") h.camera.zoom = 13;
    if (change === "native") h.replaceMap();
    if (change === "hidden") h.set({ visible: false });
    if (change === "extent") h.set({ presentationReady: false });
    h.frame(version); h.render(); await h.flush(); assert.equal(h.moves.length, 0, change); assert.equal(h.timers.size, 0, change);
  }
});

test("resized layout and settling panel wait for their current measured result", async () => {
  const h = harness(); h.render().begin("formal:a", point); const version = h.render().version;
  h.frame(version); h.set({ layout: "layout-b", interacting: true }); h.render(); assert.equal(h.moves.length, 0);
  h.set({ interacting: false }); h.render(); assert.equal(h.moves.length, 0);
  h.frame(version); h.render(); await h.flush(); assert.equal(h.moves.length, 1);
});

test("native read failure is bounded and a late recovery cannot claim the timed out selection", async () => {
  const h = harness(); h.render().begin("formal:a", point); const version = h.render().version;
  h.set({ bounds: null, viewportError: new Error("unavailable") }); h.render();
  [...h.timers.values()][0]!(); assert.equal(h.failures.length, 1); assert.equal(h.timers.size, 0);
  h.set({ viewportError: null, bounds: { west: 119, east: 121, south: 29, north: 31 } });
  h.frame(version); h.render(); await h.flush(); assert.equal(h.moves.length, 0);
});

test("unmount releases the timer and retires captured callbacks", async () => {
  const h = harness(); const captured = h.render(); captured.begin("formal:a", point); h.render();
  h.holdNative(); h.frame(h.render().version); h.render(); assert.equal(h.nativeReads.length, 1);
  h.unmount(); assert.equal(h.timers.size, 0); h.nativeReads[0]!.resolve(); await h.flush(); assert.equal(h.moves.length, 0);
  captured.begin("formal:a", point); assert.equal(h.timers.size, 0);
});

test("an obsolete native projection failure cannot retire the next selection", async () => {
  const h = harness(); h.holdNative(); h.render().begin("formal:a", point);
  h.frame(h.render().version); h.render(); assert.equal(h.nativeReads.length, 1);
  h.render().begin("formal:b", point); h.set({ identity: "formal:b" }); h.frame(h.render().version); h.render();
  assert.equal(h.nativeReads.length, 2); h.nativeReads[0]!.reject(); await h.flush();
  assert.equal(h.timers.size, 1); assert.equal(h.failures.length, 0);
  h.holdNative(false); h.nativeReads[1]!.resolve(); await h.flush();
  assert.equal(h.moves.length, 1); assert.equal(h.timers.size, 0);
});

test("layout changed during native conversion retires old geometry and rereads within the same intent", async () => {
  const h = harness(); h.holdNative(); h.render().begin("formal:a", point);
  const version = h.render().version;
  h.frame(version); h.render(); h.set({ layout: "layout-b" }); h.render();
  h.frame(version); h.render(); assert.equal(h.nativeReads.length, 2);
  h.nativeReads[0]!.reject(); await h.flush();
  assert.equal(h.moves.length, 0); assert.equal(h.failures.length, 0); assert.equal(h.timers.size, 1);
  h.holdNative(false); h.nativeReads[1]!.resolve(); await h.flush();
  assert.equal(h.moves.length, 1); assert.equal(h.failures.length, 0); assert.equal(h.timers.size, 0);
});

test("native projection timeout aborts the pending read and ignores its late callback", async () => {
  const h = harness(); h.holdNative(); h.render().begin("formal:a", point);
  h.frame(h.render().version); h.render(); [...h.timers.values()][0]!();
  h.nativeReads[0]!.resolve(); await h.flush();
  assert.equal(h.moves.length, 0); assert.equal(h.failures.length, 1); assert.equal(h.timers.size, 0);
});

test("owner or selected point changed before React renders cannot accept a native camera result", async () => {
  for (const field of ["scope", "identity"] as const) {
    const h = harness(); h.holdNative(); h.render().begin("formal:a", point);
    h.frame(h.render().version); h.render();
    h.authority[field] = "different-owner-or-selection";
    h.holdNative(false); h.nativeReads[0]!.resolve(); await h.flush();
    assert.equal(h.moves.length, 0); assert.equal(h.failures.length, 0); assert.equal(h.timers.size, 0);
  }
});
