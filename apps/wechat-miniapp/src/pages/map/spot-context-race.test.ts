import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { sameContextVersion } from "../../services/observation-context-version";

function runtime(initialContext: unknown = null, initialRetiredContextId: string | null = null) {
  const source = ts.createSourceFile("map.tsx", readFileSync(new URL("./index.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const declarations: string[] = [];
  const names = new Set(["invalidateMapPointIntent", "dismissMapRegionFailure", "resolveSpotContext", "openDetail", "closeSpotPanel", "openLayerSheet"]);
  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && names.has(node.name.getText(source))) declarations.push(`const ${node.getText(source)};`);
    ts.forEachChild(node, visit);
  };
  visit(source);
  assert.equal(declarations.length, names.size);
  let selectedSpotId: string | null = null;
  let observationContext = initialContext;
  let retiredObservationContextId = initialRetiredContextId;
  const contexts: unknown[] = [], presentations: string[] = [], extents: string[] = [];
  const attempts: { spotId: string; pending: boolean; error: unknown }[] = [];
  const requests: { input: unknown; resolve(value: unknown): void; reject(error: Error): void }[] = [];
  const replacements: { input: unknown; resolve(value: unknown): void; reject(error: Error): void }[] = [];
  const restorations: { input: unknown; resolve(value: unknown): void; reject(error: Error): void }[] = [];
  const timers = new Map<number, () => void>();
  let timerId = 0;
  const functions = vm.runInNewContext(ts.transpileModule(declarations.join("\n") + "\n({resolveSpotContext, openDetail, closeSpotPanel, openLayerSheet});", {
    compilerOptions: { target: ts.ScriptTarget.ES2020 },
  }).outputText, {
    sameContextVersion,
    detailRequestGeneration: { current: 0 }, privateTransitionGeneration: { current: 0 }, lastHandledSelectedId: { current: null }, lastHandledSpotOpenVersion: { current: 0 },
    mapPointIntent: { current: 0 }, regionTimer: { current: null },
    failedMapRegion: { current: null },
    panelCloseTimer: { current: null }, extentBeforeLayer: { current: null }, markerTapAt: { current: 0 },
    mapResetVersion: 0, bottomPresentation: "spot-panel", panelExtent: "medium", selectedSpotId: "a", analysisOverlay: "TOTAL_CLOUD",
    useAppStore: { getState: () => ({ selectedSpotId, mapResetVersion: 0, spotOpenRequestVersion: 0, observationContext,
      retiredObservationContextId, retireObservationContextEdit() {}, notifications: [] }) },
    selectSpot: (id: string | null) => { selectedSpotId = id; },
    setPanelPhase() {}, setPanelExtent: (value: string) => extents.push(value), setPanelDragOffset() {}, setSelectedFallback() {}, setSelectedProposal() {}, setAnnouncement() {}, setAnalysisOverlay() {},
    setBottomPresentation: (value: string) => presentations.push(value),
    setObservationContext: (value: unknown) => { contexts.push(value); observationContext = value;
      if ((value as { contextId?: string })?.contextId !== retiredObservationContextId) retiredObservationContextId = null; },
    setSpotContextAttempt: (value: { spotId: string; pending: boolean; error: unknown } | null) => { if (value) attempts.push(value); },
    isMiniappRequestCancelled: (error: Error) => error.message === "cancelled", localDateForNow: () => "2026-09-06",
    resolveObservationContext: (input: unknown) => new Promise((resolve, reject) => requests.push({ input, resolve, reject })),
    replaceRetiredObservationContext: (input: unknown) => new Promise((resolve, reject) => replacements.push({ input, resolve, reject })),
    restoreObservationContext: (input: unknown) => new Promise((resolve, reject) => restorations.push({ input, resolve, reject })),
    notify() {},
    clearTimeout: (id: number) => timers.delete(id),
    setTimeout: (callback: () => void) => { timers.set(++timerId, callback); return timerId; },
  }) as { resolveSpotContext(spot: object): Promise<void>; openDetail(spot: object): Promise<void>; closeSpotPanel(): void; openLayerSheet(): void };
  return { ...functions, requests, replacements, restorations, contexts, attempts, presentations, extents,
    selection: () => selectedSpotId,
    installCurrent: (value: unknown) => { observationContext = value; },
    fireTimers: () => { for (const callback of timers.values()) callback(); timers.clear(); } };
}

test("formal selection revalidates a lost point Context before using its route origin", async () => {
  const original = { contextId: "ctx:lost-point", revision: 1, contextFingerprint: "point",
    location: { kind: "MAP_POINT" }, localDate: "2026-10-07", selectedAtUtc: "2026-10-07T16:00:00Z",
    eventInstanceId: null, targetProfile: "DAILY" };
  const map = runtime(original), pending = map.openDetail({ spotId: "a", name: "A" });
  assert.equal(map.restorations.length, 1, "the persisted origin ID may be gone after service restart");
  assert.equal(map.requests.length, 0, "an unconfirmed origin must not authorize the target request");
  map.restorations[0]!.resolve({ data: { ...original, contextId: "ctx:recovered-point" } });
  await new Promise<void>(resolve => setImmediate(resolve));
  assert.equal(map.requests.length, 1);
  const input = map.requests[0]!.input as any;
  assert.equal(input.routeOriginContextId, "ctx:recovered-point");
  assert.equal(input.localDate, original.localDate);assert.equal(input.selectedAt, original.selectedAtUtc);
  assert.deepEqual(map.contexts, [], "origin revalidation does not replace the selected page's Context");
  const target = { ...original, contextId: "ctx:formal-a", location: { kind: "FORMAL_SPOT", spotId: "a" } };
  map.requests[0]!.resolve({ data: target });await pending;assert.deepEqual(map.contexts, [target]);
});

test("a public selection without a route origin does not depend on the previous place's availability", async () => {
  for (const privateProposal of [null, { ownerId: "user:a", submissionId: "proposal:withdrawn" }]) {
    const original = { contextId: "ctx:unavailable-place", revision: 1, contextFingerprint: "place",
      location: { kind: privateProposal ? "PENDING_PROPOSAL" : "FORMAL_SPOT", spotId: "old" },
      privateProposal, routeOrigin: null, localDate: "2026-10-07", selectedAtUtc: "2026-10-07T16:00:00Z",
      eventInstanceId: "event:confirmed", targetProfile: "DAILY" };
    const map = runtime(original), pending = map.openDetail({ spotId: "b", name: "B" });
    assert.equal(map.restorations.length, 0, "the unavailable previous place supplies no route origin");
    assert.equal(map.requests.length, 1);
    const input = map.requests[0]!.input as any;
    assert.equal(input.routeOriginContextId, null);
    assert.equal(input.selectedAt, original.selectedAtUtc);assert.equal(input.localDate, original.localDate);
    assert.equal(input.eventInstanceId, original.eventInstanceId);assert.equal(input.targetProfile, original.targetProfile);
    const target = { ...original, contextId: "ctx:public-b", privateProposal: null, location: { kind: "FORMAL_SPOT", spotId: "b" } };
    map.requests[0]!.resolve({ data: target });await pending;assert.deepEqual(map.contexts, [target]);
  }
});

test("a newer selection retires the old origin revalidation before target dispatch", async () => {
  const original = { contextId: "ctx:point", revision: 1, contextFingerprint: "point", location: { kind: "MAP_POINT" },
    localDate: "2026-10-07", selectedAtUtc: "2026-10-07T16:00:00Z" };
  for (const lateFailure of [false, true]) {
    const map = runtime(original), first = map.openDetail({ spotId: "a", name: "A" }), last = map.openDetail({ spotId: "b", name: "B" });
    assert.equal(map.restorations.length, 2);
    map.restorations[1]!.resolve({ data: { ...original, contextId: "ctx:current-origin" } });
    await new Promise<void>(resolve => setImmediate(resolve));
    assert.equal(map.requests.length, 1);assert.equal((map.requests[0]!.input as any).location.spotId, "b");
    const target = { ...original, contextId: "ctx:b", location: { kind: "FORMAL_SPOT", spotId: "b" } };
    map.requests[0]!.resolve({ data: target });await last;
    if (lateFailure) map.restorations[0]!.reject(Error("old origin failed"));
    else map.restorations[0]!.resolve({ data: { ...original, contextId: "ctx:old-origin" } });
    await first;assert.equal(map.requests.length, 1);assert.deepEqual(map.contexts, [target]);assert.equal(map.attempts.at(-1)?.error, null);
  }
});

test("a later confirmed Context retires a parallel explicit replacement", async () => {
  const original = { contextId: "ctx:a", revision: 1, contextFingerprint: "one", location: { kind: "FORMAL_SPOT", spotId: "a" } };
  const map = runtime(original, original.contextId);
  const pending = map.openDetail({ spotId: "a", name: "A" });
  assert.equal(map.replacements.length, 1);
  map.installCurrent({ ...original, contextId: "ctx:confirmed-new", revision: 2 });
  map.replacements[0]!.resolve({ data: { ...original, contextId: "ctx:late-replacement" } });
  await pending;
  assert.deepEqual(map.contexts, []);
});

test("returning to retained A must replace its retired writable Context while B is pending", async () => {
  const confirmed = { contextId: "ctx:confirmed-a", revision: 1, location: { kind: "FORMAL_SPOT", spotId: "a" },
    localDate: "2026-10-07", selectedAtUtc: "2026-10-07T16:00:00Z", routeOrigin: null, targetProfile: "DAILY" };
  for (const oldFailure of [false, true]) {
    const map = runtime(confirmed, confirmed.contextId);
    const middle = map.openDetail({ spotId: "b", name: "B", timezone: "Asia/Shanghai" });
    map.replacements[0]!.resolve({ data: { ...confirmed, contextId: "ctx:rebuilt-reference" } });
    await new Promise<void>(resolve => setImmediate(resolve));
    const last = map.openDetail({ spotId: "a", name: "A", timezone: "Asia/Shanghai" });
    assert.equal(map.replacements.length, 2, "A must not reuse the identity still writable by its retired date request");
    assert.equal(map.requests.length, 1);
    const request = map.requests[0]!.input as { selectedAt: string; localDate: string };
    assert.equal(request.selectedAt, confirmed.selectedAtUtc);
    assert.equal(request.localDate, confirmed.localDate);
    const fresh = { ...confirmed, contextId: "ctx:fresh-a" };
    map.replacements[1]!.resolve({ data: fresh });await last;
    if (oldFailure) map.requests[0]!.reject(new Error("retired-b"));
    else map.requests[0]!.resolve({ data: { ...confirmed, contextId: "ctx:late-b", location: { kind: "FORMAL_SPOT", spotId: "b" } } });
    await middle;
    assert.deepEqual(map.contexts, [fresh]);
  }
});

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

test("retired selection recovers its route origin before the target resolve and retains failure for an explicit retry", async () => {
  const original = { contextId: "ctx:a", revision: 1, contextFingerprint: "one", location: { kind: "FORMAL_SPOT", spotId: "a" },
    routeOrigin: { contextId: "expired-origin" }, localDate: "2026-10-07", selectedAtUtc: "2026-10-07T16:00:00Z" };
  const map = runtime(original, original.contextId);
  const failed = map.openDetail({ spotId: "b", name: "B" });
  map.replacements[0]!.reject(Error("origin unavailable"));await failed;
  assert.equal(map.requests.length, 0);assert.equal(map.attempts.at(-1)?.pending, false);
  assert.match(String(map.attempts.at(-1)?.error), /origin unavailable/u);
  const retry = map.resolveSpotContext({ spotId: "b", name: "B" });
  assert.equal(map.replacements.length, 2);
  map.replacements[1]!.resolve({ data: { ...original, contextId: "rebuilt-reference", routeOrigin: { contextId: "fresh-origin" } } });
  await new Promise<void>(resolve => setImmediate(resolve));
  assert.equal(map.requests.length, 1);
  const input = map.requests[0]!.input as any;
  assert.equal(input.routeOriginContextId, "fresh-origin");assert.equal(input.selectedAt, original.selectedAtUtc);assert.equal(input.localDate, original.localDate);
  map.requests[0]!.resolve({ data: { ...original, contextId: "new-b", location: { kind: "FORMAL_SPOT", spotId: "b" } } });
  await retry;assert.equal(map.contexts.length, 1);
});

test("a removed retired formal selection returns to its rebuilt origin without a permanent pending panel", async () => {
  const original = { contextId: "ctx:a", revision: 1, contextFingerprint: "one", location: { kind: "FORMAL_SPOT", spotId: "a" } };
  const map = runtime(original, original.contextId);
  const pending = map.openDetail({ spotId: "a", name: "A" });
  const origin = { ...original, contextId: "rebuilt-origin", location: { kind: "MAP_POINT" } };
  map.replacements[0]!.resolve({ data: origin });await pending;
  assert.equal(map.requests.length, 0);assert.deepEqual(map.contexts, [origin]);assert.equal(map.presentations.at(-1), "none");assert.equal(map.selection(), null);
});

test("another selected spot resolves from the recovered point when the retired original spot was removed", async () => {
  const original = { contextId: "ctx:a", revision: 1, contextFingerprint: "one", location: { kind: "FORMAL_SPOT", spotId: "a" },
    localDate: "2026-10-07", selectedAtUtc: "2026-10-07T16:00:00Z" };
  const map = runtime(original, original.contextId), pending = map.openDetail({ spotId: "b", name: "B" });
  map.replacements[0]!.resolve({ data: { ...original, contextId: "rebuilt-point", location: { kind: "MAP_POINT" } } });
  await new Promise<void>(resolve => setImmediate(resolve));
  assert.equal(map.requests.length, 1);const input = map.requests[0]!.input as any;
  assert.equal(input.routeOriginContextId, "rebuilt-point");assert.equal(input.selectedAt, original.selectedAtUtc);
  const fresh = { ...original, contextId: "ctx:b", location: { kind: "FORMAL_SPOT", spotId: "b" } };
  map.requests[0]!.resolve({ data: fresh });await pending;
  assert.equal(map.selection(), "b");assert.deepEqual(map.contexts, [fresh]);assert.equal(map.presentations.at(-1), "spot-panel");
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

test("a cancelled current explicit replacement settles pending and exposes an owned retry", async () => {
  const original = { contextId: "ctx:a", revision: 1, location: { kind: "FORMAL_SPOT", spotId: "a" } };
  const map = runtime(original, original.contextId), pending = map.openDetail({ spotId: "b", name: "B" });
  map.replacements[0]!.reject(Error("cancelled"));await pending;
  assert.equal(map.attempts.at(-1)?.pending, false);
  assert.match(String(map.attempts.at(-1)?.error), /已中断，请重试/u);
  const retry = map.resolveSpotContext({ spotId: "b", name: "B" });
  map.replacements[1]!.resolve({ data: { ...original, contextId: "fresh-reference" } });
  await new Promise<void>(resolve => setImmediate(resolve));
  map.requests[0]!.resolve({ data: { ...original, contextId: "fresh-b", location: { kind: "FORMAL_SPOT", spotId: "b" } } });
  await retry;assert.equal(map.contexts.length, 1);
});
