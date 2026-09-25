import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

function runtime() {
  const source = ts.createSourceFile("map.tsx", readFileSync(new URL("./index.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const declarations: string[] = [];
  const names = new Set(["resolveSpotContext", "openDetail", "closeSpotPanel", "openLayerSheet"]);
  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && names.has(node.name.getText(source))) declarations.push(`const ${node.getText(source)};`);
    ts.forEachChild(node, visit);
  };
  visit(source);
  assert.equal(declarations.length, 4);
  let selectedSpotId: string | null = null;
  const contexts: unknown[] = [], presentations: string[] = [], extents: string[] = [];
  const attempts: { spotId: string; pending: boolean; error: unknown }[] = [];
  const requests: { resolve(value: unknown): void; reject(error: Error): void }[] = [];
  const timers = new Map<number, () => void>();
  let timerId = 0;
  const functions = vm.runInNewContext(ts.transpileModule(declarations.join("\n") + "\n({resolveSpotContext, openDetail, closeSpotPanel, openLayerSheet});", {
    compilerOptions: { target: ts.ScriptTarget.ES2020 },
  }).outputText, {
    detailRequestGeneration: { current: 0 }, privateTransitionGeneration: { current: 0 }, lastHandledSelectedId: { current: null },
    panelCloseTimer: { current: null }, extentBeforeLayer: { current: null }, markerTapAt: { current: 0 },
    mapResetVersion: 0, bottomPresentation: "spot-panel", panelExtent: "medium", selectedSpotId: "a", analysisOverlay: "TOTAL_CLOUD",
    useAppStore: { getState: () => ({ selectedSpotId, mapResetVersion: 0, observationContext: null }) },
    selectSpot: (id: string | null) => { selectedSpotId = id; },
    setPanelPhase() {}, setPanelExtent: (value: string) => extents.push(value), setPanelDragOffset() {}, setSelectedFallback() {}, setSelectedProposal() {}, setAnnouncement() {}, setAnalysisOverlay() {},
    setBottomPresentation: (value: string) => presentations.push(value),
    setObservationContext: (value: unknown) => contexts.push(value),
    setSpotContextAttempt: (value: { spotId: string; pending: boolean; error: unknown } | null) => { if (value) attempts.push(value); },
    isMiniappRequestCancelled: () => false, localDateForNow: () => "2026-09-06",
    resolveObservationContext: () => new Promise((resolve, reject) => requests.push({ resolve, reject })),
    clearTimeout: (id: number) => timers.delete(id),
    setTimeout: (callback: () => void) => { timers.set(++timerId, callback); return timerId; },
  }) as { resolveSpotContext(spot: object): Promise<void>; openDetail(spot: object): Promise<void>; closeSpotPanel(): void; openLayerSheet(): void };
  return { ...functions, requests, contexts, attempts, presentations, extents,
    fireTimers: () => { for (const callback of timers.values()) callback(); timers.clear(); } };
}

test("A to B to A cannot accept the first A response or report its late failure", async () => {
  for (const failure of [false, true]) {
    const map = runtime();
    const first = map.openDetail({ spotId: "a", name: "A" });
    const middle = map.openDetail({ spotId: "b", name: "B" });
    const last = map.openDetail({ spotId: "a", name: "A" });
    map.requests[2]!.resolve({ data: "latest-a" });
    await last;
    if (failure) map.requests[0]!.reject(new Error("old-a"));
    else map.requests[0]!.resolve({ data: "old-a" });
    map.requests[1]!.reject(new Error("old-b"));
    await Promise.all([first, middle]);
    assert.deepEqual(map.contexts, ["latest-a"]);
    assert.equal(map.attempts.at(-1)?.error, null);
  }
});

test("opening layers cancels delayed close and preserves the retained spot request", async () => {
  const map = runtime();
  const pending = map.openDetail({ spotId: "a", name: "A" });
  map.closeSpotPanel();
  map.openLayerSheet();
  map.fireTimers();
  assert.equal(map.presentations.at(-1), "layer-sheet");
  map.requests[0]!.resolve({ data: "closed-a" });
  await pending;
  assert.deepEqual(map.contexts, ["closed-a"]);
});

test("completed close invalidates pending spot context", async () => {
  const map = runtime();
  const pending = map.openDetail({ spotId: "a", name: "A" });
  map.closeSpotPanel();
  map.fireTimers();
  map.requests[0]!.resolve({ data: "closed-a" });
  await pending;
  assert.deepEqual(map.contexts, []);
});

test("current context failure remains in the selected panel and retries without resetting its extent", async () => {
  const map = runtime();
  const pending = map.openDetail({ spotId: "a", name: "A" });
  map.requests[0]!.reject(new Error("current failure"));
  await pending;
  assert.equal(map.attempts.at(-1)?.spotId, "a");
  assert.equal(map.attempts.at(-1)?.pending, false);
  assert.equal((map.attempts.at(-1)?.error as Error).message, "current failure");
  const extentChanges = map.extents.length;
  const retry = map.resolveSpotContext({ spotId: "a", name: "A" });
  assert.equal(map.attempts.at(-1)?.pending, true);
  map.requests[1]!.resolve({ data: "recovered-a" });
  await retry;
  assert.deepEqual(map.contexts, ["recovered-a"]);
  assert.equal(map.extents.length, extentChanges);
});
