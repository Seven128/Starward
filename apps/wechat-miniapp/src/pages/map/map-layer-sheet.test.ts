import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { primaryNavigationLayout } from "@/navigation/primary-navigation";
import type { MapPanelReturnPosition } from "./sky-return-state";

const source = readFileSync(new URL("./map-layer-sheet.tsx", import.meta.url), "utf8");
function harness(rows: unknown[], input = source) {
  let height: number | null = null;
  const callbacks: Array<(rows: unknown[]) => void> = [], cleanup: Array<() => void> = [];
  const query = { select() { return query; }, boundingClientRect() { return query; },
    exec(callback: (values: unknown[]) => void) { callbacks.push(callback); } };
  const render = vm.runInNewContext(ts.transpileModule(input.replace(/^import .*;\r?\n/gm, "").replace(/^export /gm, "") + "\nMapLayerSheet;", {
    compilerOptions: { target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React },
  }).outputText, {
    React: { createElement() { return null; } }, View: "view", ScrollView: "scroll-view",
    useId: () => "test", useRef: (current: unknown) => ({ current }),
    useState: () => [height, (next: (value: number | null) => number | null) => { height = next(height); }],
    useCallback: (callback: unknown) => callback,
    useEffect(callback: () => () => void) { cleanup.push(callback()); }, useResize() {},
    primaryNavigationLayout,
    Taro: { nextTick(callback: () => void) { callback(); }, createSelectorQuery: () => query,
      getWindowInfo: () => ({ windowHeight: 844, screenHeight: 844, safeArea: { bottom: 810 } }) },
  }) as (props: Record<string, unknown>) => unknown;
  render({ cloud: true, children: null, header: null, revision: "initial" });
  return { height: () => height, complete: () => callbacks.forEach(callback => callback(rows)),
    unmount: () => cleanup.forEach(callback => callback()) };
}

test("real workspace bounds long layer content; using full native window escapes the regression", () => {
  const rows = [{ height: 1000 }, { height: 50 }, { bottom: 100 }, { bottom: 410 }];
  const actual = harness(rows); actual.complete(); assert.equal(actual.height(), 298);
  const marker = "let viewport = rows?.[3]?.bottom;"; assert.equal(source.split(marker).length, 2);
  const mutant = harness(rows, source.replace(marker, "let viewport = Taro.getWindowInfo().windowHeight;"));
  mutant.complete(); assert.equal(mutant.height(), 560);
  assert.throws(() => assert.equal(mutant.height(), 298), "the prior full-window cap must fail the same requirement");
});

test("natural height and shared safe-area fallback stay bounded; retired measurements cannot commit", () => {
  const natural = harness([{ height: 200 }, { height: 50 }, { bottom: 100 }, { bottom: 756 }]);
  natural.complete(); assert.equal(natural.height(), 252);
  const fallback = harness([{ height: 1000 }, { height: 50 }, { bottom: 600 }, null]);
  fallback.complete(); assert.equal(fallback.height(), 232, "the no-bar Map owns the full 844px window; measured workspace bounds still take priority");
  const retired = harness([{ height: 1000 }, { height: 50 }, { bottom: 100 }, { bottom: 410 }]);
  retired.unmount(); retired.complete(); assert.equal(retired.height(), null);
});

test("long real-data evidence leaves the existing Map tools reachable", () => {
  const actual = harness([{ height: 700 }, { height: 100 }, { bottom: 144 },
    { bottom: 756 }, { bottom: 324 }]);
  actual.complete();
  assert.equal(actual.height(), 420);
});

/** Exercise the real Map presentation transitions, including the shared setter. */
function panelReturnHarness() {
  const tree = ts.createSourceFile("map.tsx", readFileSync(new URL("./index.tsx", import.meta.url), "utf8"),
    ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const names = new Set(["setBottomPresentation", "openLayerSheet", "closeLayerSheet"]);
  const declarations: string[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && names.has(node.name.text)) {
      declarations.push(`const ${node.getText(tree)};`);
    }
    ts.forEachChild(node, visit);
  };
  visit(tree); assert.equal(declarations.length, names.size);
  const saved: MapPanelReturnPosition = { identity: "spot:a", top: 760, galleryIdentity: "spot:a:photo", left: 30,
    anchor: { id: "spot-panel-reading-overview", offset: -120 } };
  const state = {
    bottomPresentation: "spot-panel", panelExtent: "medium", selectedSpotId: "spot:a", analysisOverlay: "TOTAL_CLOUD",
    returnPosition: { current: null as MapPanelReturnPosition | null }, panelPosition: { current: saved },
    extentBeforeLayer: { current: null }, bottomPresentationRef: { current: "spot-panel" },
    privateTransitionGeneration: { current: 0 }, panelCloseTimer: { current: null },
    editorPresentation: { cancel() {}, enter() {} }, cancelSpotMapFocus: { current() {} },
    setCalendarOwner() {}, setPanelPhase() {}, setPanelDragOffset() {}, clearTimeout() {},
    getReducedMotion: () => false, useCallback: (callback: unknown) => callback,
    useAppStore: { getState: () => ({ selectedSpotId: state.selectedSpotId }) },
    setBottomPresentationState: (value: string) => { state.bottomPresentation = value; },
    setPanelExtent: (value: string) => { state.panelExtent = value; },
    setAnalysisOverlay: (value: string) => { state.analysisOverlay = value; },
  };
  const owner = vm.runInNewContext(ts.transpileModule(declarations.join("\n") +
    "\n({setBottomPresentation, openLayerSheet, closeLayerSheet});", {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText, state) as { setBottomPresentation(value: string): void; openLayerSheet(): void; closeLayerSheet(): void };
  return { state, owner, saved };
}

for (const close of ["back", "trigger"] as const) test(`layer ${close} restores the suspended panel's latest reading position`, () => {
  const { state, owner, saved } = panelReturnHarness();
  owner.openLayerSheet(); assert.equal(state.bottomPresentation, "layer-sheet");
  // A replacement callback cannot redefine the document that was suspended.
  state.panelPosition.current = { ...saved, top: 0, left: 0 };
  if (close === "back") owner.closeLayerSheet(); else owner.openLayerSheet();
  assert.equal(state.bottomPresentation, "spot-panel"); assert.equal(state.panelExtent, "medium");
  assert.deepEqual(state.returnPosition.current, saved, "the remounted scroll owner must receive both axes and its reading anchor");
  owner.setBottomPresentation("spot-editor");
  assert.equal(state.returnPosition.current, null, "an unrelated presentation must retire that restoration command");
});

test("a layer return cannot reopen a replaced selection or fabricate a panel", () => {
  const changed = panelReturnHarness(); changed.owner.openLayerSheet();
  changed.state.selectedSpotId = "spot:b"; changed.owner.closeLayerSheet();
  assert.equal(changed.state.bottomPresentation, "none"); assert.equal(changed.state.returnPosition.current, null);
  const absent = panelReturnHarness(); absent.state.bottomPresentation = "none";
  absent.state.bottomPresentationRef.current = "none";
  absent.owner.openLayerSheet(); absent.owner.closeLayerSheet();
  assert.equal(absent.state.bottomPresentation, "none"); assert.equal(absent.state.returnPosition.current, null);
});
