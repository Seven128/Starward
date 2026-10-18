import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import Quaternion from "quaternion";
import { createSkyContextSession } from "./sky-context-session";
import { createSkyObservationTime } from "./sky-observation-time";
import { createSkyObjectSelection } from "./sky-object-selection";
import { createSkyObjectTracking } from "./sky-object-tracking";
import { createSkyBrowsingCamera } from "./sky-browsing-camera";
import { skyDomeProgress } from "./sky-zoom";
import { createSkyViewBasis } from "./sky-view-projection";
import { skyViewPointingArc } from "./sky-view-rotation";
import { skyObjectPositionIsCurrent } from "./sky-object-location";
import { presentSkyTime, skyRulerTime } from "./sky-time-presentation";
import { createSkyTimeCommitContinuity } from "./sky-time-commit-continuity";
import { skyForecastPresentation } from "../../services/forecast-presentation";
import { skyCommandStateSetter } from "./sky-command-state";
import { createSkyDisclosureCommands } from "./sky-disclosure-commands";
import { skyTimeInputAllowed } from "./sky-time-input";
import { observationNightForInstant } from "../../components/observation-date";
import { skyMenuProps } from "./sky-menu-test-support";
import type { ContextVersion } from "../../services/observation-context-version";

// Actual page commands and public button callbacks with the real Context,
// time, selection and tracking owners. React's captured render values stay
// unchanged while synchronous owners change; no native UI/GPU is simulated.
const source = ts.createSourceFile("spot-sky-page.tsx", readFileSync(
  process.env.SKY_ACTION_SOURCE ?? new URL("./spot-sky-page.tsx", import.meta.url), "utf8"),
ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const page = source.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === "SpotSkyPage") as ts.FunctionDeclaration;
assert.ok(page?.body);
const names = ["skyInteractionRevision", "setPreviewIndex", "skyPageVisibleCurrent", "skyInteractionCurrent", "skyTimeIntentCurrent", "skyDisplayCurrent", "skyTimeIntentRetirable", "cancelSkyTimePreview",
  "toggleSkyTimePlayback", "advanceSkyTime", "commitInstant", "commitCivilDate", "settleTimeIndex", "onPreview", "selectCatalogObject",
  "locateCatalogObject", "trackCatalogObject", "applyTrackedPosition", "selectSkyTarget", "selectSearchObject", "enterManualView",
  "setDatePickerOpen", "setSelectedCatalogObject", "setSkyControlPanel", "skyDisclosures"];
const commands = page.body.statements.filter(node => ts.isVariableStatement(node) &&
  node.declarationList.declarations.some(declaration => names.includes(declaration.name.getText(source))) ||
  ts.isExpressionStatement(node) && ts.isBinaryExpression(node.expression) &&
  ["navigationCurrentRef.current", "navigationApplyRef.current"].includes(node.expression.left.getText(source)));
function publicCallback(marker: string) {
  const matches: string[] = [];
  function visit(node: ts.Node) {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const attributes = node.attributes.properties.filter(ts.isJsxAttribute);
      if (attributes.find(attribute => attribute.name.getText(source) === "data-od-id")?.initializer?.getText(source) === JSON.stringify(marker)) {
        const callback = attributes.find(attribute => attribute.name.getText(source) === "onClick")?.initializer;
        assert.ok(callback && ts.isJsxExpression(callback) && callback.expression);
        matches.push(callback.expression.getText(source));
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  assert.equal(matches.length, 1, marker);
  return matches[0]!;
}
const menu = skyMenuProps(source);
const dockCallback = (kind: "time" | "list" | "calibration") => menu.dock(kind).getText(source);
let rulerCancel = "", rulerSettle = "", timeEffect = "", hideCallback = "", dateChange = "";
function visitPage(node: ts.Node) {
  if (ts.isJsxSelfClosingElement(node) && node.tagName.getText(source) === "OrientationTimeRuler") {
    const attribute = node.attributes.properties.find(property => ts.isJsxAttribute(property) &&
      property.name.getText(source) === "onCancel") as ts.JsxAttribute;
    assert.ok(attribute?.initializer && ts.isJsxExpression(attribute.initializer) && attribute.initializer.expression);
    rulerCancel = attribute.initializer.expression.getText(source);
    const commit = node.attributes.properties.find(property => ts.isJsxAttribute(property) &&
      property.name.getText(source) === "onCommit") as ts.JsxAttribute;
    assert.ok(commit?.initializer && ts.isJsxExpression(commit.initializer) && commit.initializer.expression);
    rulerSettle = commit.initializer.expression.getText(source);
  }
  if (ts.isCallExpression(node) && node.expression.getText(source) === "useEffect" &&
    node.arguments[0]?.getText(source).includes("if (!timePlaying) return;")) {
    assert.equal(timeEffect, "", "one public elapsed-time effect");
    timeEffect = node.getText(source);
  }
  if (ts.isCallExpression(node) && node.expression.getText(source) === "useDidHide" &&
    (node.arguments[0]?.getText(source).includes("contextSession.hide()") ||
     node.arguments[0]?.getText(source).includes("hideSkyPageRef.current"))) hideCallback = node.arguments[0].getText(source);
  if (ts.isJsxSelfClosingElement(node) && node.tagName.getText(source) === "ObservationDateControl") {
    const attribute = node.attributes.properties.find(property => ts.isJsxAttribute(property) &&
      property.name.getText(source) === "onOpenChange") as ts.JsxAttribute;
    assert.ok(attribute?.initializer && ts.isJsxExpression(attribute.initializer) && attribute.initializer.expression);
    dateChange = attribute.initializer.expression.getText(source);
  }
  ts.forEachChild(node, visitPage);
}
visitPage(page);
assert.ok(rulerCancel && rulerSettle && timeEffect && hideCallback);
const compile = (value: string) => ts.transpileModule(value, {
  compilerOptions: { target: ts.ScriptTarget.ES2022 },
}).outputText;
const code = compile(commands.map(node => node.getText(source)).join("\n") +
  `\n({onPreview,commitInstant,locateCatalogObject,trackCatalogObject,applyTrackedPosition,
    selectCatalogObject,selectSearchObject,selectSkyTarget,setDatePickerOpen,setSelectedCatalogObject,
    play:toggleSkyTimePlayback, apply:()=>commitInstant(observationTime.snapshot().at),
    cancel:()=>{if(skyTimeIntentCurrent())cancelSkyTimePreview();}, rulerCancel:${rulerCancel}, rulerSettle:${rulerSettle}, hide:${hideCallback}, dateChange:skyDisclosures.date,
    timeDock:${dockCallback("time")}, listDock:${dockCallback("list")}, calibrationDock:()=>skyDisclosures.toggle("calibration")});`);

const committedAt = "2026-09-22T13:00:00.000Z";
const previewAt = "2026-09-22T14:00:00.000Z";
const endAt = "2026-09-22T15:00:00.000Z";
const clockBase = Date.parse(endAt);
const catalog = { catalogVersion: "bsc5p-bright-stars.v2", catalogHash: "a".repeat(64) };
const object = { reference: "HR:7001", displayName: "Vega", kind: "STAR" as const };
const context = { contextId: "ctx:a" as ContextVersion["contextId"], revision: 1, contextFingerprint: "fp:1", selectedAtUtc: committedAt,
  timezone: "Asia/Shanghai", localDate: "2026-09-22" };
const reportContext = { contextId: context.contextId, contextRevision: context.revision,
  contextFingerprint: context.contextFingerprint, spotId: "spot:a", dataRevision: "data:1", algorithmVersion: "algo:1" };

function harness() {
  let store = { observationContext: context, selectedSpotId: "spot:a", mapResetVersion: 0, spotOpenRequestVersion: 0 };
  const session = createSkyContextSession(context.contextId, () => store);
  const time = createSkyObservationTime();
  const timeBinding = `${context.contextId}:${context.revision}:${context.contextFingerprint}`;
  time.bind(timeBinding, committedAt, { startAt: committedAt, endAt });
  const tracking = createSkyObjectTracking(), selection = createSkyObjectSelection();
  selection.select(object, reportContext.spotId);
  const position = { ...reportContext, at: committedAt, reference: object.reference,
    position: { ...catalog, azimuthDeg: 302, altitudeDeg: -12 }, unavailableReason: null };
  const requests: { patch: { selectedAt?: string }; resolve(value: { data: typeof context }): void; reject(error: Error): void }[] = [];
  const writes: unknown[] = [], notices: unknown[] = [], cameras: unknown[] = [];
  const selectedCatalogObjectRef = { current: object as typeof object | null };
  const datePickerOpenRef = { current: false };
  let selectedTarget: string | null = null, panel: string | null = "time", listOpen = false;
  const rawReportData = { context: reportContext, hourly: [committedAt, previewAt, endAt].map(at => ({ at })),
    skyScene: { catalog } };
  let elapsed = 1000, timer: (() => void) | null = null;
  const browsingCamera = createSkyBrowsingCamera(), initialView = createSkyViewBasis(0, 90, 0)!;
  const sandbox: Record<string, any> = {
    browsingCamera, stopBrowsingAnimation: () => { sandbox.navigationRequestRef.current = null; browsingCamera.suspend(); },
    navigationCurrentRef: { current: () => true }, navigationApplyRef: { current: () => {} }, skySelectionPositionRef: { current: null },
    setFocusedDeepSkyReference: () => {}, setFollowRequested: () => {}, skyDomeProgress,
    mode: "NIGHT", useAppStore: { getState: () => ({ mode: "NIGHT" }) },
    canvasSize: { width: 390, height: 844 }, canvasGenerationRef: { current: 1 }, zoomRef: { current: 45 },
    navigationRequestRef: { current: null }, browsingDrawRef: { current: () => {} },
    paintedSkyObjectsRef: { current: { width: 390, height: 844, view: { basis: initialView, verticalFovDeg: 45 } } },
    presentedSkyFrameRef: { current: { nativeCanvasGeneration: 1, frameAt: committedAt, data: rawReportData } },
    observationTime: time, contextSession: session, objectSelection: selection, objectTracking: tracking,
    pageVisible: true, viewportActiveRef: { current: true }, viewportMountedRef: { current: true }, contextComplete: true, activeContext: context,
    timeSaving: false, timeBinding, committedAt, requestedAt: committedAt, timePlaying: false,
    skyRulerTime, setTimeScrubbing: () => {},
    timeCommitContinuity: createSkyTimeCommitContinuity(skyForecastPresentation),
    timeModel: { startAt: committedAt, endAt }, timeGeometrySources: undefined, timeRows: rawReportData.hourly, geometryReport: rawReportData,
    report: { isError: false, data: { data: rawReportData, dataState: "FRESH" } },
    rawReportData, reportData: rawReportData, row: { at: committedAt },
    selectedCatalogObject: object, selectedCatalogObjectRef, datePickerOpen: false, datePickerOpenRef,
    selectedCivilDate: "2026-09-22", routeContext: { spotId: "spot:a" }, isPreviewing: false,
    skyControlPanel: "time", skyControlPanelRef:{current:"time"},manualBasis: null, alignment: { ready: false }, skySceneReady: false, presentedSceneCurrent: false,
    orientationController: { snapshot: () => ({ alignment: { mode: sandbox.alignmentMode } }), stopFollowing() {} }, alignmentMode: "auto", alignmentEditing: false,
    presentSkyTime, skyTimeInputAllowed, observationNightForInstant, skyObjectPositionIsCurrent, createSkyViewBasis, skyViewPointingArc, skyCommandStateSetter, createSkyDisclosureCommands,
    selectedTargetIdRef: { get current() { return selectedTarget; } }, catalogPickChoicesRef: { current: [] }, returnToSkyEntry() {},
    sourceReturnRef: { current: false }, hideSkyPageRef: { current: () => { session.hide(); time.hide(clockBase + elapsed); } },
    positionCatalog: () => catalog, clampIndex: (index: number, length: number) => Math.max(0, Math.min(index, length - 1)),
    SKY_VERTICAL_FOV_DEG: 45, manualBasisRef: { current: null }, skyTapRef: { current: null },
    cancelSkyGestureRef: { current: () => {} }, cancelSkyCalibration: () => {},
    orientationObjectListOpenRef: { current: false },
    setTimeIntent: (next: unknown) => assert.strictEqual(next, time.snapshot()),
    setTimeSaving: () => {}, setObservationContext: (next: typeof context) => { writes.push(next); store = { ...store, observationContext: next }; },
    setPageVisible: () => {},
    updateObservationContext: (_context: unknown, patch: { selectedAt?: string }) =>
      new Promise<{ data: typeof context }>((resolve, reject) => requests.push({ patch, resolve, reject })),
    setDatePickerOpen: (open: boolean) => { datePickerOpenRef.current = open; }, setDatePickerOpenState: () => {},
    setSelectedCatalogObject: (next: typeof object | null) => { selectedCatalogObjectRef.current = next; },
    setSelectedCatalogObjectState: () => {}, setSelectedTargetId: (next: string | null) => { selectedTarget = next; },
    setSelectionState: () => {}, stopObjectTracking: () => tracking.stop(), setTrackingState: () => {},
    setCatalogPickChoices: () => {}, setOrientationObjectListOpen: (next: boolean | ((value: boolean) => boolean)) => {
      listOpen = typeof next === "function" ? next(listOpen) : next;
      sandbox.orientationObjectListOpenRef.current = listOpen;
    }, setSkyControlPanelState: (next: string | null | ((value: string | null) => string | null)) => {
      panel = typeof next === "function" ? next(panel) : next;
    },
    closeSkyObjectDisclosure: () => { selectedCatalogObjectRef.current = null; selectedTarget = null; },
    pauseSkyTime: () => time.pause(), beginSkyCalibration: () => {},
    setVerticalFovDeg: () => {}, enterManualView: (basis: unknown) => cameras.push(basis),
    setManualBasis: (basis: unknown) => cameras.push(basis),
    instantForCivilDate: (date: string) => ({ localDate: date, selectedAt: previewAt }),
    notify: (notice: unknown) => notices.push(notice), errorMessage: () => "controlled failure", isMiniappRequestCancelled: () => false,
    Date: { parse: Date.parse, now: () => clockBase + elapsed },
    useEffect: (effect: () => unknown) => effect(),
    setInterval: (callback: () => void) => { timer = callback; return 1; }, clearInterval: () => { timer = null; },
  };
  const scope = vm.createContext(sandbox);
  const actions = vm.runInContext(code, scope) as Record<string, (...args: any[]) => any>;
  return { actions, sandbox, time, session, tracking, selection, position, requests, cameras, writes, notices,
    selectedTarget: () => selectedTarget,
    disclosure: () => ({ panel, listOpen, dateOpen: datePickerOpenRef.current, catalogObject: selectedCatalogObjectRef.current }),
    rerender: () => vm.runInNewContext(code, { ...sandbox, selectedCatalogObject: selectedCatalogObjectRef.current,
      skyControlPanel: sandbox.skyControlPanelRef.current, orientationObjectListOpen: listOpen }) as typeof actions,
    installTimer: () => { sandbox.timePlaying = true; vm.runInContext(compile(timeEffect), scope); assert.ok(timer); },
    tickTimer: (at: number) => { elapsed = at; assert.ok(timer); timer(); },
    replaceContext: () => { store = { ...store, observationContext: { ...context, revision: 2, contextFingerprint: "fp:2" } }; },
    replaceSelection: (field: "selectedSpotId" | "mapResetVersion" | "spotOpenRequestVersion") => {
      store = { ...store, [field]: field === "selectedSpotId" ? "spot:b" : 1 };
    } };
}
type Harness = ReturnType<typeof harness>;
function chooseSearchResult(page: Harness, object: { reference: string; displayName: string; kind: string }) {
  if (!page.sandbox.orientationObjectListOpenRef.current) page.actions.listDock!();
  page.actions.selectSearchObject!(object);
}

const actions: [string, (page: Harness) => unknown][] = [
  ["preview", page => page.actions.onPreview!(1)],
  ["ruler settle", page => page.actions.rulerSettle!(1)],
  ["play", page => page.actions.play!()],
  ["cancel", page => page.actions.cancel!()],
  ["commit", page => page.actions.commitInstant!(committedAt)],
  ["select", page => page.actions.selectCatalogObject!({ ...object, reference: "HR:424" })],
  ["target", page => page.actions.selectSkyTarget!({ targetId: "target:b" })],
  ["locate", page => page.actions.locateCatalogObject!(page.position)],
  ["track", page => page.actions.trackCatalogObject!(page.position)],
  ["tracking result", page => page.actions.applyTrackedPosition!(page.position)],
  ["date disclosure", page => page.actions.dateChange!(true)],
  ...(["timeDock", "listDock", "calibrationDock"] as const).map(name =>
    [name, (page: Harness) => page.actions[name]!()] as [string, (page: Harness) => unknown]),
];
const retirements: [string, (page: Harness) => void][] = [
  ["hide before React", page => page.actions.hide!()],
  ["hide and return before React", page => { page.actions.hide!(); page.session.show(); }],
  ["commit lock before React", page => assert.ok(page.session.begin(context))],
  ["Context replacement before React", page => page.replaceContext()],
  ["calibration before React", page => { page.sandbox.alignmentMode = "editing"; }],
  ...(["selectedSpotId", "mapResetVersion", "spotOpenRequestVersion"] as const).map(field =>
    [field, (page: Harness) => page.replaceSelection(field)] as [string, (page: Harness) => void]),
];
for (const [name, retire] of retirements) {
  test(`${name}: queued page callbacks preserve time, selection, tracking and camera`, async () => {
    for (const [actionName, act] of actions) {
      const page = harness();
      if (["cancel", "commit", "timeDock", "listDock", "calibrationDock"].includes(actionName)) page.time.preview(previewAt);
      page.tracking.start(object, reportContext.spotId);
      page.tracking.accept(page.position, reportContext as any, committedAt, catalog);
      const before = { time: page.time.snapshot(), selection: page.selection.snapshot(), tracking: page.tracking.snapshot(), disclosure: page.disclosure() };
      retire(page);
      // hide itself legitimately pauses 1x play; these cases start fixed or
      // previewed, so the queued command must preserve that retired intent.
      await act(page);
      assert.strictEqual(page.time.snapshot(), before.time, actionName);
      assert.strictEqual(page.selection.snapshot(), before.selection, actionName);
      assert.strictEqual(page.tracking.snapshot(), before.tracking, actionName);
      assert.equal(page.cameras.length, 0, actionName);
      assert.equal(page.selectedTarget(), null, actionName);
      assert.equal(page.requests.length, 0, actionName);
      assert.deepEqual(page.disclosure(), before.disclosure, actionName);
    }
  });
}

test("obsolete time binding cannot change the newly bound public time", async () => {
  for (const [name, act] of actions) {
    const page = harness();
    page.time.bind("ctx:a:2:fp:2", previewAt, { startAt: committedAt, endAt });
    page.time.preview(endAt);
    const before = page.time.snapshot();
    await act(page);
    assert.strictEqual(page.time.snapshot(), before, name);
    assert.equal(page.cameras.length, 0, name);
    assert.equal(page.requests.length, 0, name);
  }
});

test("locate and tracking reject a previous presentation instant before React catches up", () => {
  for (const name of ["locateCatalogObject", "trackCatalogObject", "applyTrackedPosition"]) {
    const page = harness();
    page.tracking.start(object, reportContext.spotId);
    page.time.preview(previewAt);
    const before = page.tracking.snapshot();
    page.actions[name]!(page.position);
    assert.equal(page.cameras.length, 0, name);
    assert.strictEqual(page.tracking.snapshot(), before, name);
  }
});

test("closing object disclosure synchronously retires its queued camera commands", () => {
  for (const name of ["locateCatalogObject", "trackCatalogObject"]) {
    const page = harness();
    page.actions.setSelectedCatalogObject!(null);
    page.actions[name]!(page.position);
    assert.equal(page.cameras.length, 0, name);
    assert.equal(page.tracking.snapshot().target, null, name);
    assert.equal(page.selection.snapshot().object?.reference, object.reference, "closing still preserves the selected identity");
  }
});

test("date disclosure synchronously blocks late preview and playback", () => {
  for (const name of ["onPreview", "play"]) {
    const page = harness();
    page.actions.setDatePickerOpen!(true);
    const before = page.time.snapshot();
    page.actions[name]!(1);
    assert.strictEqual(page.time.snapshot(), before, name);
  }
});

test("the current calendar may close during a commit; retired close cannot dismiss the returned calendar", () => {
  const page = harness();
  page.actions.dateChange!(true);
  assert.equal(page.disclosure().dateOpen, true);
  const request = page.session.begin(context)!;
  page.actions.dateChange!(false);
  assert.equal(page.disclosure().dateOpen, false);
  assert.equal(page.session.busy, true, "closing a disclosure does not cancel or duplicate its committed mutation");
  page.session.finish(request);
  page.actions.hide!(); page.session.show();
  const fresh = page.rerender(); fresh.dateChange!(true);
  assert.equal(page.disclosure().dateOpen, true);
  page.actions.dateChange!(false);
  assert.equal(page.disclosure().dateOpen, true, "the old page callback does not close a new disclosure");
  fresh.dateChange!(false);
  assert.equal(page.disclosure().dateOpen, false);
});

test("playback toggle reads the live mode before React catches up", () => {
  const page = harness();
  page.actions.play!();
  assert.equal(page.time.snapshot().mode, "PLAYING");
  page.actions.play!();
  assert.equal(page.time.snapshot().mode, "PAUSED", "a second native tap pauses without waiting for React");
});

test("apply submits the live selected instant rather than the captured committed instant", async () => {
  const page = harness();
  page.time.preview(previewAt);
  page.actions.apply!();
  assert.equal(page.requests.length, 1, "apply submits the newer preview rather than its captured committed instant");
  assert.equal(page.requests[0]!.patch.selectedAt, previewAt);
  page.requests[0]!.resolve({ data: { ...context, revision: 2, contextFingerprint: "fp:2", selectedAtUtc: page.requests[0]!.patch.selectedAt! } });
  await new Promise<void>(resolve => setImmediate(resolve));
  assert.equal((page.writes[0] as typeof context).selectedAtUtc, previewAt);
});

test("the public ruler settles its preview without a Context mutation; explicit Apply commits that instant", async () => {
  const page = harness();
  page.actions.onPreview!(0.5);
  page.actions.rulerSettle!(1);
  assert.equal(page.time.snapshot().at, previewAt);
  assert.equal(page.time.snapshot().mode, "PREVIEW");
  assert.equal(page.requests.length, 0, "releasing the ruler cannot submit a public Context edit");
  assert.equal(page.writes.length, 0);
  page.actions.apply!();
  assert.equal(page.requests.length, 1);
  assert.equal(page.requests[0]!.patch.selectedAt, previewAt);
  page.requests[0]!.resolve({ data: { ...context, revision: 2, contextFingerprint: "fp:2", selectedAtUtc: previewAt } });
  await new Promise<void>(resolve => setImmediate(resolve));
  assert.equal((page.writes[0] as typeof context).selectedAtUtc, previewAt);
});

test("current commit failure restores the last committed time, releases the lock, and permits a real retry", async () => {
  const page = harness();
  page.time.preview(previewAt); page.actions.apply!(); page.actions.apply!();
  assert.equal(page.requests.length, 1, "rapid apply cannot create a second mutation");
  assert.equal(page.session.busy, true);
  page.actions.onPreview!(2);
  assert.equal(page.time.snapshot().at, previewAt, "the queued preview cannot change an in-flight commit");
  page.requests[0]!.reject(new Error("controlled failure"));
  await new Promise<void>(resolve => setImmediate(resolve));
  assert.equal(page.time.snapshot().at, committedAt);
  assert.equal(page.time.snapshot().mode, "FIXED");
  assert.equal(page.session.busy, false);
  assert.equal(page.writes.length, 0);
  assert.equal(page.notices.length, 1);
  assert.equal((page.notices[0] as { title: string }).title, "时间未存");
  page.actions.onPreview!(1); page.actions.apply!();
  assert.equal(page.requests.length, 2);
  assert.equal(page.requests[1]!.patch.selectedAt, previewAt);
  page.requests[1]!.resolve({ data: { ...context, revision: 2, contextFingerprint: "fp:2", selectedAtUtc: previewAt } });
  await new Promise<void>(resolve => setImmediate(resolve));
  assert.equal((page.writes[0] as typeof context).selectedAtUtc, previewAt);
  assert.equal(page.session.busy, false);
});

test("ruler cleanup still retracts its hidden drag but cannot cancel a replacement Context's preview", () => {
  const page = harness();
  page.time.preview(previewAt); page.session.hide(); page.actions.rulerCancel!();
  assert.equal(page.time.snapshot().at, committedAt);
  page.time.bind("ctx:a:2:fp:2", previewAt, { startAt: committedAt, endAt });
  page.time.preview(endAt);
  const before = page.time.snapshot();
  page.actions.rulerCancel!();
  assert.strictEqual(page.time.snapshot(), before);
});

test("a retired ruler cannot retract a new preview after return to the same Context", () => {
  const page = harness();
  page.actions.hide!(); page.session.show();
  const fresh = page.rerender(); fresh.onPreview!(1);
  const before = page.time.snapshot(); page.actions.rulerCancel!();
  assert.strictEqual(page.time.snapshot(), before);
  fresh.rulerCancel!();
  assert.equal(page.time.snapshot().at, committedAt, "the current ruler still cancels its own preview");
});

test("the actual elapsed timer stops at a synchronous page lock and does not touch a replacement time binding", () => {
  for (const [name, retire] of retirements) {
    const page = harness();
    page.time.play(clockBase + 1000); page.installTimer();
    retire(page); page.tickTimer(1500);
    assert.equal(page.time.snapshot().at, committedAt, name);
    assert.equal(page.time.snapshot().mode, "PAUSED", name);
  }
  const page = harness();
  page.time.play(clockBase + 1000); page.installTimer(); page.tickTimer(1500);
  assert.equal(page.time.snapshot().at, "2026-09-22T13:00:00.500Z", "the actual timer still advances elapsed time at 1x");
  page.time.bind("ctx:a:2:fp:2", previewAt, { startAt: committedAt, endAt });
  page.time.play(1500); const before = page.time.snapshot(); page.tickTimer(2000);
  assert.strictEqual(page.time.snapshot(), before, "an old timer must not pause or tick a new binding");
});

test("a fresh render after return accepts new actions while the retired callback stays inert", () => {
  const page = harness();
  page.actions.hide!(); page.session.show();
  page.actions.onPreview!(1);
  assert.equal(page.time.snapshot().at, committedAt);
  const fresh = page.rerender();
  fresh.onPreview!(1);
  assert.equal(page.time.snapshot().at, previewAt);
  page.actions.onPreview!(2);
  assert.equal(page.time.snapshot().at, previewAt, "same-Context old events cannot revive after a return");
});

test("current callbacks still preview consecutively, locate below the horizon, track and recover after an unlock", () => {
  const page = harness();
  page.actions.onPreview!(1); page.actions.onPreview!(2);
  assert.equal(page.time.snapshot().at, endAt);
  page.actions.cancel!();
  assert.equal(page.time.snapshot().at, committedAt);
  const request = page.session.begin(context)!;
  page.actions.onPreview!(1);
  assert.equal(page.time.snapshot().at, committedAt);
  page.session.finish(request);
  page.actions.onPreview!(1);
  assert.equal(page.time.snapshot().at, previewAt);
  page.actions.cancel!();
  page.actions.trackCatalogObject!(page.position);
  assert.equal(page.cameras.length, 1);
  assert.equal(page.tracking.snapshot().target?.reference, object.reference);
  assert.equal(page.tracking.snapshot().position?.position?.altitudeDeg, -12);
  const next = { ...page.position, position: { ...page.position.position, azimuthDeg: 304, altitudeDeg: -13 } };
  page.actions.applyTrackedPosition!(next);
  assert.equal(page.cameras.length, 1, "new valid tracking data is retained during the joint navigation");
  const camera = page.sandbox.browsingCamera as ReturnType<typeof createSkyBrowsingCamera>;
  const arrived = camera.update({ localView: null, intent: "track", progress: 0, at: clockBase + 1016, reducedMotion: true });
  camera.accept(arrived);
  page.actions.applyTrackedPosition!(next);
  assert.equal(page.cameras.length, 2, "current target follows the current valid result");
  assert.strictEqual(page.tracking.snapshot().position, next);
});

test("search opens retained information and its locate action uses the newest copied camera", () => {
  const page = harness(), state = page.sandbox;
  const actual = createSkyViewBasis(40, 105, 20)!;
  state.paintedSkyObjectsRef.current.view = { basis: actual, verticalFovDeg: 95 };
  chooseSearchResult(page, object);
  assert.equal(state.selectedCatalogObjectRef.current.reference, object.reference);
  assert.equal(state.orientationObjectListOpenRef.current, true, "search stays mounted below information");
  assert.equal(state.navigationRequestRef.current, null, "reading information does not move the sky");
  assert.equal(page.actions.locateCatalogObject!(page.position), true);
  assert.equal(page.disclosure().panel, "menu", "locating from information restores the expanded menu");
  const camera = state.browsingCamera as ReturnType<typeof createSkyBrowsingCamera>;
  assert.equal(camera.snapshot().view, actual);
  assert.equal(camera.snapshot().verticalFovDeg, 95);
  let final = camera.snapshot();
  for (let at = clockBase + 1016; at < clockBase + 3000 && camera.snapshot().navigation; at += 16) {
    final = camera.update({ localView: actual, intent: "manual", progress: 0, at }); camera.accept(final);
  }
  assert.equal(final.verticalFovDeg, 45);
  const target = createSkyViewBasis(page.position.position.azimuthDeg, 90 + page.position.position.altitudeDeg, 0)!;
  assert.ok(Math.hypot(...final.view!.forward.map((n, i) => n - target.forward[i]!)) < 1e-10);
});

test("replacement information rejects the old or stale position before starting its own path", () => {
  const page = harness(), state = page.sandbox;
  chooseSearchResult(page, object);
  const successor = { ...object, reference: "HR:424" };
  chooseSearchResult(page, successor);
  assert.equal(page.actions.locateCatalogObject!(page.position), false);
  const position = { ...page.position, reference: successor.reference };
  const fresh = page.rerender();
  assert.equal(fresh.locateCatalogObject!({ ...position, position: { ...position.position, catalogHash: "obsolete" } }), false);
  assert.equal(fresh.locateCatalogObject!(position), true);
  assert.equal(state.browsingCamera.snapshot().navigation, true);
  assert.equal(state.navigationRequestRef.current.object.reference, successor.reference);
});

test("information location respects visibility, public time and actual Canvas retirement", () => {
  for (const retire of ["hide", "time", "canvas"] as const) {
    const page = harness(), state = page.sandbox;
    chooseSearchResult(page, object);
    if (retire === "hide") page.session.hide();
    else if (retire === "time") page.time.preview(previewAt);
    else state.canvasGenerationRef.current++;
    assert.equal(page.actions.locateCatalogObject!(page.position), false, retire);
    assert.equal(state.browsingCamera.snapshot().navigation, false, retire);
  }
  const page = harness(); chooseSearchResult(page, object);
  page.sandbox.presentedSkyFrameRef.current = null;
  assert.equal(page.actions.locateCatalogObject!(page.position), false);
});

test("a queued result cannot start navigation after search has closed", () => {
  const page = harness();
  page.actions.listDock!(); page.actions.listDock!();
  page.actions.selectSearchObject!(object);
  assert.equal(page.sandbox.navigationRequestRef.current, null);
  assert.equal(page.sandbox.browsingCamera.snapshot().navigation, false);
  assert.equal(page.cameras.length, 0);
});

test("a fresh public time retires the old flight before applying the current tracked position", () => {
  const page = harness(), state = page.sandbox;
  page.actions.trackCatalogObject!(page.position);
  assert.equal(state.browsingCamera.snapshot().navigation, true);
  page.time.preview(previewAt); state.row = { at: previewAt };
  const next = { ...page.position, at: previewAt,
    position: { ...page.position.position, azimuthDeg: 304, altitudeDeg: -13 } };
  page.actions.applyTrackedPosition!(next);
  assert.equal(state.browsingCamera.snapshot().navigation, false);
  assert.equal(state.navigationRequestRef.current, null);
  assert.strictEqual(page.tracking.snapshot().position, next);
  const expected = createSkyViewBasis(304, 77, 0)!;
  assert.ok(Math.hypot(...state.manualBasisRef.current.forward.map((n: number, i: number) => n - expected.forward[i]!)) < 1e-10);
});

test("tracking refresh preserves the complete arrived view and follows a moving target without roll snap", () => {
  const page = harness(), state = page.sandbox;
  const upright = createSkyViewBasis(302, 78, 0)!;
  const roll = Quaternion.fromAxisAngle([...upright.forward], Math.PI / 3);
  const actual = { ...upright,
    right: roll.rotateVector([...upright.right]) as typeof upright.right,
    up: roll.rotateVector([...upright.up]) as typeof upright.up };
  state.paintedSkyObjectsRef.current.view = { basis: actual, verticalFovDeg: 95 };
  page.actions.trackCatalogObject!(page.position);
  const camera = state.browsingCamera as ReturnType<typeof createSkyBrowsingCamera>;
  const arrived = camera.update({ localView: actual, intent: "track", progress: 0, at: clockBase + 1016, reducedMotion: true });
  assert.equal(camera.accept(arrived), true);
  assert.ok(arrived.view);
  assert.ok(Math.hypot(...arrived.view.up.map((n, i) => n - upright.up[i]!)) > .2,
    "the real navigation must leave a meaningfully transported screen orientation");
  // The page's successful-copy publisher owns these values; no later query
  // is allowed to replace its up/right just because the target is refreshed.
  state.manualBasisRef.current = arrived.view;
  state.zoomRef.current = arrived.verticalFovDeg;
  state.paintedSkyObjectsRef.current.view = { basis: arrived.view, verticalFovDeg: arrived.verticalFovDeg };
  state.navigationRequestRef.current = null;
  page.actions.applyTrackedPosition!({ ...page.position });
  for (const axis of ["right", "up", "forward"] as const)
    assert.ok(Math.hypot(...state.manualBasisRef.current[axis].map((n: number, i: number) => n - arrived.view![axis][i]!)) < 1e-10,
      `${axis} must not jump on an unchanged valid position`);

  const overview = camera.update({ localView: arrived.view, intent: "track", progress: 1, at: clockBase + 1032 });
  state.paintedSkyObjectsRef.current.view = { basis: overview.view, verticalFovDeg: 264 };
  page.time.preview(previewAt); state.row = { at: previewAt };
  const next = { ...page.position, at: previewAt,
    position: { ...page.position.position, azimuthDeg: 303, altitudeDeg: -11.5 } };
  page.actions.applyTrackedPosition!(next);
  const followed = state.manualBasisRef.current, expected = createSkyViewBasis(303, 78.5, 0)!;
  assert.strictEqual(camera.snapshot().view, overview.view, "tracking does not recapture the independent overview");
  assert.ok(Math.hypot(...followed.forward.map((n: number, i: number) => n - expected.forward[i]!)) < 1e-10);
  for (const axis of ["right", "up", "forward"] as const)
    assert.ok(Math.hypot(...followed[axis].map((n: number, i: number) => n - arrived.view![axis][i]!)) < .04,
      `${axis} follows the small pointing change continuously`);
});
