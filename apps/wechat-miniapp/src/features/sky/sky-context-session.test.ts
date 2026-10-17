import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { createSkyContextSession } from "./sky-context-session.ts";
import { createSkyObservationTime } from "./sky-observation-time.ts";
import { presentSkyTime } from "./sky-time-presentation.ts";
import { createSkyTimeCommitContinuity } from "./sky-time-commit-continuity";
import { skyForecastPresentation } from "../../services/forecast-presentation";
import type { ObservationContext } from "@starward/miniapp-contracts";

const source = ts.createSourceFile("sky.tsx", readFileSync(new URL("./spot-sky-page.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const page = source.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === "SpotSkyPage") as ts.FunctionDeclaration;
const statements = page.body!.statements;
const commands = statements.filter(node => ts.isVariableStatement(node) && node.declarationList.declarations.some(d =>
  ["skyInteractionRevision", "skyPageVisibleCurrent", "skyInteractionCurrent", "skyTimeIntentCurrent", "commitInstant", "commitIndex", "commitCivilDate"].includes(d.name.getText(source))));
const lookupEffect = statements.find(node => ts.isExpressionStatement(node) && ts.isCallExpression(node.expression) && node.expression.expression.getText(source) === "useEffect" && node.expression.arguments[0]?.getText(source).includes("contextLookup.data?.data"))!;
const compile = (text: string) => ts.transpileModule(text, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;
const commandCode = compile(commands.map(node => node.getText(source)).join("\n") + "\n({commitIndex, commitCivilDate});");

const context = (id = "ctx:a", revision = 1) => ({ contextId: id as ObservationContext["contextId"], revision, contextFingerprint: `${id}:${revision}`, timezone: "Asia/Shanghai", selectedAtUtc: "2026-09-15T12:00:00.000Z" });
function harness(initial = context()) {
  let state = { observationContext: initial as ReturnType<typeof context> | null, selectedSpotId: "spot:a", mapResetVersion: 0, spotOpenRequestVersion: 0 };
  const session = createSkyContextSession("ctx:a", () => state);
  const requests: { resolve: (value: { data: ReturnType<typeof context> }) => void; reject: (error: Error) => void }[] = [];
  const writes: unknown[] = [], notifications: unknown[] = [], saving: boolean[] = [];
  const observationTime = createSkyObservationTime();
  const timeBinding = `${initial.contextId}:${initial.revision}:${initial.contextFingerprint}`;
  observationTime.bind(timeBinding, initial.selectedAtUtc, null);
  const sandbox = {
    alignmentMode: "auto",
    orientationController: { snapshot: () => ({ alignment: { mode: sandbox.alignmentMode } }) },
    activeContext: initial, timeSaving: false, rawReportData: { hourly: [{ at: "2026-09-15T13:00:00.000Z" }] },
    pageVisible: true, viewportActiveRef: { current: true }, viewportMountedRef: { current: true }, contextComplete: true,
    timeBinding, datePickerOpenRef: { current: false }, cancelSkyCalibration: () => {},
    presentSkyTime, observationTime, setTimeIntent: () => {},
    timeCommitContinuity: createSkyTimeCommitContinuity(skyForecastPresentation), report: { data: undefined }, routeContext: { spotId: "spot:a" },
    committedAt: initial.selectedAtUtc, selectedCivilDate: "2026-09-15", contextSession: session,
    clampIndex: () => 0, setTimeSaving: (value: boolean) => saving.push(value),
    setPreviewIndex: () => {}, setDatePickerOpen: () => {},
    setObservationContext: (value: ReturnType<typeof context>) => { writes.push(value); state = { ...state, observationContext: value }; },
    updateObservationContext: () => new Promise<{ data: ReturnType<typeof context> }>((resolve, reject) => requests.push({ resolve, reject })),
    instantForCivilDate: (localDate: string) => ({ localDate, selectedAt: "2026-09-16T12:00:00Z" }),
    notify: (value: unknown) => notifications.push(value), errorMessage: () => "request failed", isMiniappRequestCancelled: () => false,
  };
  const commands = vm.runInNewContext(commandCode, sandbox) as { commitIndex: (index: number) => void; commitCivilDate: (date: string) => Promise<void> };
  // The index event intentionally dispatches without returning the async commit.
  // Drain that real completion before asserting late-response publication.
  const actions = { ...commands, commitIndex: async (index: number) => {
    commands.commitIndex(index);
    await new Promise<void>(resolve => setImmediate(resolve));
  } };
  return { session, sandbox, requests, writes, notifications, saving, actions,
    replace: () => { state = { ...state, observationContext: context("ctx:b"), selectedSpotId: "spot:b" }; },
    state: () => state,
  };
}

for (const command of ["time", "date"] as const) {
  const start = (h: ReturnType<typeof harness>) => command === "time" ? h.actions.commitIndex(0) : h.actions.commitCivilDate("2026-09-16");
  test(`${command}: late success cannot replace the newly selected place`, async () => {
    const h = harness(); const pending = start(h); h.replace();
    h.requests[0]!.resolve({ data: context("ctx:a", 2) }); await pending;
    assert.equal(h.state().observationContext?.contextId, "ctx:b");
    assert.equal(h.writes.length, 0);
  });
  test(`${command}: hidden page cannot publish success or late failure`, async () => {
    for (const failed of [false, true]) {
      const h = harness(); const pending = start(h); h.session.hide();
      if (failed) h.requests[0]!.reject(new Error("late")); else h.requests[0]!.resolve({ data: context("ctx:a", 2) });
      await pending; assert.equal(h.writes.length, 0); assert.equal(h.notifications.length, 0);
      assert.deepEqual(h.saving, [true], "old finally cannot reset a newer page operation");
    }
  });
  test(`${command}: current update can adopt a recovered Context ID`, async () => {
    const h = harness(); const pending = start(h);
    h.requests[0]!.resolve({ data: context("ctx:recovered", 2) }); await pending;
    assert.equal(h.state().observationContext?.contextId, "ctx:recovered");
    assert.equal(h.session.contextId, "ctx:recovered");
    assert.equal(h.session.canLookup(), false, "do not restore the obsolete route ID");
    assert.deepEqual(h.saving, [true, false]);
  });
}

test("time and date share a synchronous lock before React rerenders", async () => {
  const h = harness(); const first = h.actions.commitIndex(0); const second = h.actions.commitCivilDate("2026-09-16");
  assert.equal(h.requests.length, 1);
  h.requests[0]!.resolve({ data: context("ctx:a", 2) }); await Promise.all([first, second]);
});

test("the actual lookup effect cannot overwrite a newer place or run while hidden", () => {
  for (const changed of [true, false]) {
    let state = { observationContext: null as ReturnType<typeof context> | null, selectedSpotId: "spot:a", mapResetVersion: 0, spotOpenRequestVersion: 0 };
    const session = createSkyContextSession("ctx:a", () => state);
    if (changed) state = { ...state, observationContext: context("ctx:b"), selectedSpotId: "spot:b" }; else session.hide();
    const writes: unknown[] = [];
    vm.runInNewContext(compile(lookupEffect.getText(source)), {
      contextSession: session, pageVisible: changed, storedContext: state.observationContext,
      contextLookup: { data: { data: context() } }, setObservationContext: (v: unknown) => writes.push(v),
      useEffect: (fn: () => void) => fn(),
    });
    assert.equal(writes.length, 0);
  }
});

test("entry lookup is accepted once and cannot downgrade an existing revision", () => {
  const empty = { observationContext: null, selectedSpotId: "spot:a", mapResetVersion: 0, spotOpenRequestVersion: 0 };
  const session = createSkyContextSession("ctx:a", () => empty);
  assert.equal(session.acceptLookup(context("ctx:wrong")), false);
  assert.equal(session.acceptLookup(context()), true);
  assert.equal(session.canLookup(), false);
  const h = harness(context("ctx:a", 3)); const ticket = h.session.begin(h.state().observationContext!)!;
  assert.equal(h.session.accept(ticket, context("ctx:a", 2)), false);
});

test("hide cancels old requests but allows a fresh request after return", () => {
  const h = harness(); const old = h.session.begin(context())!;
  h.session.hide(); h.session.show(); const current = h.session.begin(context())!;
  assert.ok(current); assert.equal(h.session.accept(old, context("ctx:a", 2)), false);
  assert.equal(h.session.finish(old), false);
  assert.equal(h.session.accept(current, context("ctx:a", 2)), true);
  assert.equal(h.session.finish(current), true);
});

test("visibility revision is idempotent while hidden and fences retired cleanup after return", () => {
  const h = harness(), first = h.session.visibilityRevision;
  assert.equal(h.session.canRetireInteraction(first), true);
  h.session.hide(); h.session.hide();
  assert.equal(h.session.visibilityRevision, first + 1);
  assert.equal(h.session.canRetireInteraction(first), true, "current hide still allows its own cancellation");
  h.session.show();
  assert.equal(h.session.canRetireInteraction(first), false);
  const returned = h.session.visibilityRevision;
  assert.equal(h.session.canRetireInteraction(returned), true);
  h.session.hide();
  assert.equal(h.session.canRetireInteraction(first), false, "a second hide cannot revive the earlier cleanup");
  assert.equal(h.session.canRetireInteraction(returned), true);
});

test('new Context requests cannot begin after the owning location selection was replaced or reset',()=>{
  for(const field of ['selectedSpotId','mapResetVersion','spotOpenRequestVersion'] as const){
    let state={observationContext:context(),selectedSpotId:'spot:a',mapResetVersion:0,spotOpenRequestVersion:0};
    const session=createSkyContextSession('ctx:a',()=>state);
    state={...state,[field]:field==='selectedSpotId'?'spot:b':1};
    assert.equal(session.begin(context()),null,`${field} changed before observationContext caught up`);
  }
});

test("actual page lifecycle hooks cancel publishing and reset the visible saving state", () => {
  const lifecycle = statements.filter(node => ts.isVariableStatement(node) && node.declarationList.declarations.some(d =>
    ["hideSkyPage", "showSkyPage"].includes(d.name.getText(source))) || ts.isExpressionStatement(node) &&
    /^(hideSkyPageRef|showSkyPageRef)\.current\s*=/.test(node.getText(source)));
  const hooks = statements.filter(node => ts.isExpressionStatement(node) && ts.isCallExpression(node.expression) &&
    ["useDidHide", "useDidShow", "useEffect"].includes(node.expression.expression.getText(source)) &&
    (/contextSession\.(show|hide)\(/.test(node.expression.arguments[0]?.getText(source) ?? "") ||
      node.expression.expression.getText(source) !== "useEffect" &&
      /(hideSkyPageRef|showSkyPageRef)\.current/.test(node.expression.arguments[0]?.getText(source) ?? "")) &&
    !node.expression.arguments[0]?.getText(source).includes("contextLookup") &&
    !node.expression.arguments[0]?.getText(source).includes("restoreObservationContext"));
  const h = harness(); let hide = () => {}, show = () => {}, dispose = () => {};
  const visible: boolean[] = [], saving: boolean[] = [], returning: boolean[] = [];
  const sourceReturnRef = { current: true };
  const skyDisplaySettingsPendingRef = { current: {} as object | null };
  let calibrationCancelled = 0;
  vm.runInNewContext(compile([...lifecycle, ...hooks].map(node => node.getText(source)).join("\n")), {
    contextSession: h.session, setPageVisible: (value: boolean) => visible.push(value),
    cancelSkyCalibration: () => { calibrationCancelled++; },
    observationTime: h.sandbox.observationTime, setTimeIntent: () => {},
    setTimeSaving: (value: boolean) => saving.push(value), setPreviewIndex: () => {},
    sourceReturnRef, setSourceReturn: (value: boolean) => returning.push(value),
    hideSkyPageRef:{current:()=>{}},showSkyPageRef:{current:()=>{}},
    viewportActiveRef:h.sandbox.viewportActiveRef,viewportMountedRef:h.sandbox.viewportMountedRef,
    viewportMeasurementRevision:{current:0},opticalSourcesOpeningRef:{current:null},skyReturnPendingRef:{current:null},
    orientationSettingsOpeningRef:{current:null}, skyDisplaySettingsPendingRef,
    skyTapRef:{current:null},cancelSkyGestureRef:{current:()=>{}},stopBrowsingAnimation:()=>{},hideCompass:()=>{},showCompass:()=>{},
    measureBottomControls:()=>{},canvasLifecycle:{hide:()=>{}},
    useDidHide: (fn: () => void) => { hide = fn; }, useDidShow: (fn: () => void) => { show = fn; },
    useEffect: (fn: () => () => void) => { dispose = fn(); },
  });
  const old = h.session.begin(context())!; hide();
  assert.equal(calibrationCancelled, 1, "hiding also retires a pending normal-scale calibration action");
  assert.equal(h.session.isCurrent(old), false); assert.deepEqual(visible, [false]); assert.deepEqual(saving, [false]);
  show(); assert.equal(sourceReturnRef.current, false); assert.deepEqual(returning, [false]);
  assert.equal(skyDisplaySettingsPendingRef.current, null, "return clears stale display Settings navigation");
  const next = h.session.begin(context())!; assert.ok(next); dispose();
  assert.equal(h.session.isCurrent(next), false);
});

test("the actual active Context and weather query follow a successful recovered ID", async () => {
  const h = harness(); const pending = h.actions.commitCivilDate("2026-09-16");
  const recovered = { ...context("ctx:recovered", 2), localDate: "2026-09-16", location: { kind: "FORMAL_SPOT", spotId: "spot:a" } };
  h.requests[0]!.resolve({ data: recovered }); await pending;
  const names = ["routeContextComplete", "activeContext", "proposalRoute", "contextLocationMatches", "contextComplete", "reportQuery"];
  const declarations = statements.filter(node => ts.isVariableStatement(node) && node.declarationList.declarations.some(d => names.includes(d.name.getText(source))));
  const requests: string[] = [];
  vm.runInNewContext(compile(declarations.map(node => node.getText(source)).join("\n")), {
    contextSession: h.session, storedContext: h.state().observationContext, contextLookup: { data: { data: context() } },
    routeContext: { contextId: "ctx:a", spotId: "spot:a", localDate: "2026-09-15", selectedAt: "2026-09-15T12:00:00Z", timezone: "Asia/Shanghai", dataRevision: "initial" },
    pageVisible: true, WEATHER_ALERT_REFRESH_MS: 300000,
    useMemo: (compute: () => unknown) => compute(),
    isDate: () => true, isSelectedAt: () => true, validTimezone: () => true, observationDateFor: () => "2026-09-15",
    getSkyReport: (_spot: string, id: string) => { requests.push(id); },
    useSkyForecastQuery: (options: { enabled: boolean; queryFn: () => void }) => { if (options.enabled) options.queryFn(); return {}; },
  });
  assert.deepEqual(requests, ["ctx:recovered"], "obsolete route/cache must neither block nor replace the new report query");
});

test("returning after a different place was selected cannot become a disabled-query loading screen", () => {
  const loading = statements.find(node => ts.isIfStatement(node) && node.expression.getText(source).includes("contextLookup.isPending")) as ts.IfStatement;
  const h = harness(); h.session.hide(); h.replace(); h.session.show();
  const actual = vm.runInNewContext(compile(loading.expression.getText(source)), {
    activeContext: null, contextLookup: { isPending: true }, pageVisible: true,
    contextSession: h.session, contextLookupEnabled: h.session.canLookup(),
  });
  assert.equal(actual, false, "the existing Context error/return action must remain reachable");
});

test("freeze rejects date and time commits synchronously before React catches up", async () => {
  const h = harness(); h.sandbox.alignmentMode = "editing";
  await h.actions.commitIndex(0); await h.actions.commitCivilDate("2026-09-16");
  assert.equal(h.requests.length, 0); assert.equal(h.writes.length, 0);
  assert.equal(h.session.busy, false);
});

test("an expired stored Context recovers the Sky read once and rejects a late old-place result", async () => {
  const recoveryEffect = statements.find(node => ts.isExpressionStatement(node) &&
    ts.isCallExpression(node.expression) && node.expression.expression.getText(source) === "useEffect" &&
    node.expression.arguments[0]?.getText(source).includes("restoreObservationContext"));
  assert.ok(recoveryEffect, "the Sky report read must recover a server-expired Context");
  class ApiError extends Error { constructor(public code: string) { super(code); } }
  const run = (h: ReturnType<typeof harness>, code: string) => {
    const pending: { resolve: (value: { data: ReturnType<typeof context> }) => void }[] = [];
    const attempted = { current: false };
    const restoreAbortRef = { current: null as AbortController | null };
    const writes: unknown[] = [];
    const sandbox = {
      useEffect: (effect: () => void) => effect(), pageVisible: true, contextComplete: true,
      activeContext: h.state().observationContext, contextSession: h.session,
      staleReportError: new ApiError(code), MiniappApiError: ApiError,
      report: { isFetching: false }, autoRestoreAttemptedRef: attempted, restoreAbortRef,
      AbortController,
      restoreObservationContext: () => new Promise(resolve => pending.push({ resolve })),
      setObservationContext: (value: unknown) => writes.push(value),
      isMiniappRequestCancelled: () => false,
    };
    const invoke = () => vm.runInNewContext(compile(recoveryEffect.getText(source)), sandbox);
    invoke(); invoke();
    return { pending, writes, attempted };
  };
  const h = harness(); const stale = run(h, "NOT_FOUND");
  assert.equal(stale.pending.length, 1, "a repeated render must not start another recovery");
  stale.pending[0]!.resolve({ data: context("ctx:recovered", 2) });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(h.session.contextId, "ctx:recovered");
  assert.equal(stale.writes.length, 1);

  const offline = run(harness(), "PROVIDER_UNAVAILABLE");
  assert.equal(offline.pending.length, 0, "transport/provider failures must keep the old offline behavior");
  const replaced = harness(); const late = run(replaced, "STALE_REJECTED");
  replaced.replace();
  late.pending[0]!.resolve({ data: context("ctx:recovered", 2) });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(late.writes.length, 0, "an old place must not overwrite the new selection");
});
