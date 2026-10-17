import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { sameContextVersion } from "../../services/observation-context-version";
import { enqueueNotification, dismissNotification } from "../../state/notification";

function deferred() {
  let resolve!: (value: any) => void, reject!: (error: any) => void;
  const promise = new Promise<any>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function fixture(owner: string | null = "A") {
  const source = ts.createSourceFile("search.tsx", readFileSync(new URL("./search-page.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const names = new Set(["beginSelection", "leaveSearch", "moveMapReference", "chooseMapLocation"]);
  const component = source.statements.find((node): node is ts.FunctionDeclaration => ts.isFunctionDeclaration(node) && node.name?.text === "MapSearchSurface")!;
  const declarations = component.body!.statements.filter(node => ts.isVariableStatement(node) && node.declarationList.declarations.some(d => names.has(d.name.getText(source))));
  assert.ok(declarations.length >= 3);
  const context = { contextId: "original", revision: 1, contextFingerprint: "first", localDate: "2026-10-05", selectedAtUtc: "2026-10-05T13:00:00Z", eventInstanceId: null, targetProfile: "DAILY" };
  const dismissed: string[] = [], calls: string[] = [];
  const state = { accountOwnerId: owner, mapResetVersion: 1, observationContext: context,
    notifications: enqueueNotification([], { owner: "search", placement: "inline", tone: "warning", title: "原返回失败", body: "", dedupeKey: "search-return-failed" }, 1),
    dismissNotification: (id: string) => { dismissed.push(id); state.notifications = dismissNotification(state.notifications, id); } };
  const initialPage = {}, pages = { current: initialPage }, selectionVersion = { current: 0 }, nativeSelectionPending = { current: null as number | null };
  const native = deferred(), response = deferred(), navigation = deferred();
  let holdNavigation = false;
  const scope = {
    selectionVersion, nativeSelectionPending, useAppStore: { getState: () => state }, sameContextVersion,
    Taro: { getCurrentPages: () => [pages.current], navigateBack: async () => { calls.push("back"); if (holdNavigation) await navigation.promise; else pages.current = {}; }, switchTab: async () => { calls.push("map"); pages.current = {}; } },
    handoff: { confirm: async () => true },
    choosePlatformLocation: async (options: { isCurrent(): boolean }) => { if (!options.isCurrent()) return null; calls.push("picker"); const selected = await native.promise; return options.isCurrent() ? selected : null; },
    viewport: { center: { latitude: 22, longitude: 113 }, zoom: 12 }, timeReference: context, finderQuery: "原搜索",
    gcj02ToWgs84: (p: unknown) => p, currentTimezoneHint: () => "Asia/Shanghai", localDateForNow: () => "2026-10-05",
    resolveObservationContext: (input: any) => { calls.push("resolve"); assert.equal(input.selectedAt, context.selectedAtUtc); return response.promise; },
    setObservationContext: (value: any) => { calls.push("context"); state.observationContext = value; },
    selectSpot: () => calls.push("selection"), setViewport: () => calls.push("viewport"), addSearchHistory: () => calls.push("history"), setFinderQuery: () => calls.push("query"), setAnnouncement: () => calls.push("announcement"), setSuggestionsOpen: () => {},
    notify: () => calls.push("notice"), errorMessage: (e: any) => String(e.message ?? e), isMiniappRequestCancelled: () => false,
  };
  const handlers = vm.runInNewContext(ts.transpileModule(declarations.map(d => d.getText(source)).join("\n") + "\n({chooseMapLocation,moveMapReference,leaveSearch});", { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, scope);
  const selected = { label: "新地点", location: { latitude: 23, longitude: 114 } };
  return { state, pages, initialPage, calls, dismissed, selectionVersion, nativeSelectionPending, native, response, navigation, handlers, selected, holdNavigation: () => { holdNavigation = true; } };
}
async function until(f: ReturnType<typeof fixture>, name: string) {
  for (let i = 0; i < 25 && !f.calls.includes(name); i++) await Promise.resolve();
  assert.ok(f.calls.includes(name), `reached ${name}`);
}
function retire(f: ReturnType<typeof fixture>, change: string) {
  if (change === "account" || change === "aba") { f.state.accountOwnerId = "B"; f.state.mapResetVersion++; }
  if (change === "aba") { f.state.accountOwnerId = "A"; f.state.mapResetVersion++; }
  if (change === "reset") f.state.mapResetVersion++;
  if (change === "context") f.state.observationContext = { ...f.state.observationContext, revision: 2, contextFingerprint: "new-time" };
  if (change === "place") f.state.observationContext = { ...f.state.observationContext, contextId: "other-place" };
  if (change === "page") f.pages.current = {};
  if (change === "selection" || change === "unmount") f.selectionVersion.current++;
}

for (const stage of ["native", "context"]) for (const change of ["account", "aba", "reset", "context", "place", "page", "selection", "unmount"]) {
  for (const fail of [false, true]) test(`Search ${stage} ${change}: late ${fail ? "failure" : "success"} cannot commit or navigate`, async () => {
    const f = fixture();
    const run = stage === "native" ? f.handlers.chooseMapLocation() : f.handlers.moveMapReference(f.selected);
    await until(f, stage === "native" ? "picker" : "resolve");
    retire(f, change);
    if (stage === "native") {
      if (fail) f.native.reject(Error("late native failure")); else f.native.resolve(f.selected);
      // Let a broken old handler finish rather than hang at its escaped request.
      f.response.resolve({ data: { ...f.state.observationContext, contextId: "old-choice" } });
    } else if (fail) f.response.reject(Error("late network failure"));
    else f.response.resolve({ data: { ...f.state.observationContext, contextId: "old-choice" } });
    await run;
    assert.deepEqual(f.calls, [stage === "native" ? "picker" : "resolve"]);
    assert.equal(f.nativeSelectionPending.current, null);
  });
}
for (const owner of ["A", null]) test(`normal native return commits once and keeps observation time (owner: ${owner})`, async () => {
  const f = fixture(owner), run = f.handlers.chooseMapLocation();
  await until(f, "picker"); // Native handoff may hide Search without changing its page or selection lifetime.
  f.native.resolve(f.selected);
  await until(f, "resolve"); f.response.resolve({ data: { ...f.state.observationContext, contextId: "new-choice" } });
  await run;
  assert.deepEqual(f.calls, ["picker", "resolve", "context", "selection", "viewport", "history", "query", "announcement", "back"]);
  assert.equal(f.nativeSelectionPending.current, null);
});
for (const change of ["account", "aba", "reset", "context", "page", "selection"]) test(`late failed Back cannot start fallback or notify after ${change}`, async () => {
  const f = fixture(); f.holdNavigation(); const run = f.handlers.leaveSearch();
  await until(f, "back"); retire(f, change); f.navigation.reject(Error("late back failure"));
  await run; assert.deepEqual(f.calls, ["back"]); assert.deepEqual(f.dismissed, []);
});
test("successful Back never dismisses the same notification ID renewed by the real owner", async () => {
  const f = fixture(); f.holdNavigation(); const run = f.handlers.leaveSearch(); await until(f, "back");
  const original = f.state.notifications[0]!;
  f.state.notifications = enqueueNotification(f.state.notifications, { owner: "search", placement: "inline", tone: "warning", title: "后继返回失败", body: "", dedupeKey: "search-return-failed" }, 2);
  assert.equal(f.state.notifications[0]!.id, original.id);
  assert.equal(f.state.notifications[0]!.occurrences, original.occurrences + 1);
  f.pages.current = {}; f.navigation.resolve(undefined); await run;
  assert.deepEqual(f.dismissed, []); assert.equal(f.state.notifications[0]!.title, "后继返回失败");
});
test("successful Back clears its unchanged recovery record through the real notification owner", async () => {
  const f = fixture(), original = f.state.notifications[0]!; await f.handlers.leaveSearch();
  assert.deepEqual(f.dismissed, [original.id]); assert.deepEqual(f.state.notifications, []);
});
