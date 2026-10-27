import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { civilDateForInstant } from "../../components/observation-date.ts";
import { createSkyObjectSelection } from "./sky-object-selection.ts";
import { presentSkyTime, selectSkyTimePresentation } from "./sky-time-presentation.ts";
import { createSkyObjectTracking } from "./sky-object-tracking";
import { createSkyObservationTime } from "./sky-observation-time";
import { createSkyContextSession } from "./sky-context-session";
import { skyObjectPositionIsCurrent } from "./sky-object-location";
import { createSkyViewBasis } from "./sky-view-projection";
import { createSkyBrowsingCamera } from "./sky-browsing-camera";
import type { ContextVersion } from "../../services/observation-context-version";
import { skyPageTimePresentationTestBindings, skyPageTimePresentationTestCode } from "./sky-optical-page-test-support";

const source = ts.createSourceFile("spot-sky-page.tsx",
  readFileSync(new URL("./spot-sky-page.tsx", import.meta.url), "utf8"),
  ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const page = source.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === "SpotSkyPage") as ts.FunctionDeclaration;
assert.ok(page?.body);
const commands = page.body.statements.filter(statement => ts.isVariableStatement(statement) &&
  statement.declarationList.declarations.some(declaration =>
    ["skyInteractionRevision", "skyPageVisibleCurrent", "skyInteractionCurrent", "skyTimeIntentCurrent", "locateCatalogObject", "trackCatalogObject"].includes(declaration.name.getText(source))));
const code = ts.transpileModule(commands.map(statement => statement.getText(source)).join("\n") +
  "\n({ locateCatalogObject, trackCatalogObject });",
  { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;

function harness(isPreviewing: boolean) {
  const object = { reference: "HR:7001", displayName: "织女星", kind: "STAR" as const };
  const context = { contextId: "ctx:a" as ContextVersion["contextId"], revision: 1, contextFingerprint: "fp:1", selectedAtUtc: "2026-09-24T15:30:00.000Z" };
  const store = { observationContext: context, selectedSpotId: "spot:a", mapResetVersion: 0, spotOpenRequestVersion: 0 };
  const timeBinding = `${context.contextId}:${context.revision}:${context.contextFingerprint}`;
  const observationTime = createSkyObservationTime();
  observationTime.bind(timeBinding, context.selectedAtUtc, null);
  const at = isPreviewing ? "2026-09-24T16:30:00.000Z" : context.selectedAtUtc;
  if (isPreviewing) observationTime.preview(at);
  const reportContext = { contextId: context.contextId, contextRevision: context.revision,
    contextFingerprint: context.contextFingerprint, spotId: "spot:a", dataRevision: "data:1", algorithmVersion: "algo:1" };
  const catalog = { catalogVersion: "bsc5p-bright-stars.v2", catalogHash: "a".repeat(64) };
  const data = { ...reportContext, at, reference: object.reference,
    position: { ...catalog, azimuthDeg: 15, altitudeDeg: 45 }, unavailableReason: null };
  const selection = createSkyObjectSelection(), tracking = createSkyObjectTracking();
  selection.select(object, reportContext.spotId);
  let panel: string | null = "time";
  let previewCancelled = false;
  const sandbox = {
    selectedCatalogObject: object, selectedCatalogObjectRef: { current: object }, reportData: { context: reportContext }, row: { at },
    positionCatalog: () => catalog, skyObjectPositionIsCurrent,
    pageVisible: true, viewportActiveRef: { current: true }, viewportMountedRef:{current:true}, contextComplete: true, activeContext: context,
    contextSession: createSkyContextSession(context.contextId, () => store), timeSaving: false,
    observationTime, timeBinding, committedAt: context.selectedAtUtc,
    orientationController: { snapshot: () => ({ alignment: { mode: "auto" } }) },
    paintedSkyObjectsRef:{current:{width:390,height:844,view:{basis:createSkyViewBasis(0,90,0)!,verticalFovDeg:45}}},
    presentedSkyFrameRef:{current:{nativeCanvasGeneration:1,frameAt:at,data:{context:reportContext}}},
    canvasGenerationRef:{current:1}, zoomRef:{current:45}, canvasSize:{width:390,height:844},
    browsingCamera:createSkyBrowsingCamera(),navigationRequestRef:{current:null},mode:"NIGHT",browsingDrawRef:{current:()=>{}},
    createSkyViewBasis, cancelSkyGestureRef: { current: () => {} }, SKY_VERTICAL_FOV_DEG: 45,
    setVerticalFovDeg: () => {}, enterManualView: () => {},
    objectSelection: selection, setSelectionState: () => {},
    setSelectedCatalogObject: () => {}, setCatalogPickChoices: () => {},
    setOrientationObjectListOpen: () => {},
    isPreviewing, setSkyControlPanel: (value: string | null) => { panel = value; },
    setPreviewIndex: (value: number | null) => { previewCancelled = value === null; },
    objectTracking: tracking,
    setTrackingState: () => {},
  };
  const actions = vm.runInNewContext(code, sandbox) as {
    locateCatalogObject: (value: typeof data) => boolean;
    trackCatalogObject: (value: typeof data) => void;
  };
  return { actions, data, get panel() { return panel; }, get previewCancelled() { return previewCancelled; },
    get tracked() { return tracking.snapshot().target?.reference === object.reference && tracking.snapshot().position === data; } };
}

test("locating and tracking preserve the preview owner while restoring the expanded menu", () => {
  const locate = harness(true);
  assert.equal(locate.actions.locateCatalogObject(locate.data), true);
  assert.equal(locate.panel, "menu", "information closes to the adopted expanded menu");
  assert.equal(locate.previewCancelled, false, "the selected position still belongs to the visible preview time");

  const track = harness(true);
  track.actions.trackCatalogObject(track.data);
  assert.equal(track.tracked, true);
  assert.equal(track.panel, "menu");

  const committed = harness(false);
  assert.equal(committed.actions.locateCatalogObject(committed.data), true);
  assert.equal(committed.panel, "menu");
});

test("cross-midnight preview and cancel use the same report frame and local calendar date", () => {
  const selection = ts.transpileModule(skyPageTimePresentationTestCode(source,
    ["committedRow", "committedIndex", "activeIndex", "row", "isPreviewing", "presentedAt"]) +
    "\n({ rowAt: row?.at, selectedCivilDate: civilDateForInstant(presentedAt, routeContext.timezone), isPreviewing, activeIndex });",
    { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const beforeMidnight = "2026-09-24T15:30:00.000Z";
  const afterMidnight = "2026-09-24T16:30:00.000Z";
  const observationTime = createSkyObservationTime();
  observationTime.bind("ctx:preview:1:fp:preview", beforeMidnight, null);
  const selected = (previewIndex: number | null) => {
    if (previewIndex !== null) observationTime.preview(afterMidnight);
    else observationTime.cancel();
    return vm.runInNewContext(selection, skyPageTimePresentationTestBindings({
      contextComplete: true,
      activeContext: { contextId: "ctx:preview", revision: 1, contextFingerprint: "fp:preview", selectedAtUtc: beforeMidnight },
      routeContext: { selectedAt: beforeMidnight, timezone: "Asia/Shanghai" }, observationTime,
      rawReportData: { hourly: [{ at: beforeMidnight }, { at: afterMidnight }] }, civilDateForInstant,
    })) as { rowAt: string; selectedCivilDate: string; isPreviewing: boolean; activeIndex: number };
  };
  assert.deepEqual({ ...selected(1) }, { rowAt: afterMidnight, selectedCivilDate: "2026-09-25", isPreviewing: true, activeIndex: 1 });
  assert.deepEqual({ ...selected(null) }, { rowAt: beforeMidnight, selectedCivilDate: "2026-09-24", isPreviewing: false, activeIndex: 0 });
});

test("Sky presentation cannot recover a future requested, accepted or fallback frame", () => {
  const pastAt = "2026-09-24T13:00:00.000Z";
  const initialAt = "2026-09-24T13:15:00.000Z";
  const futureAt = "2026-09-24T14:00:00.000Z";
  // This selection-only fixture exercises exact rows, not the geometry model.
  const report = { hourly: [{ at: pastAt }, { at: initialAt }, { at: futureAt }] } as unknown as Parameters<typeof presentSkyTime>[0];
  const initial = presentSkyTime(report, initialAt)!, past = presentSkyTime(report, pastAt)!, future = presentSkyTime(report, futureAt)!;
  const limit = Date.parse(initialAt);
  assert.equal(selectSkyTimePresentation(report, futureAt, initialAt, future, null, limit)?.row.at, initialAt);
  assert.equal(selectSkyTimePresentation(report, pastAt, initialAt, null, future, limit)?.row.at, initialAt);
  assert.equal(selectSkyTimePresentation(report, pastAt, futureAt, null, null, limit), null);
  assert.equal(selectSkyTimePresentation(undefined, pastAt, initialAt, null, null, limit), null);
  assert.strictEqual(selectSkyTimePresentation(report, initialAt, pastAt, null, past, limit), past,
    "a legal earlier completed frame remains usable while its later request prepares");
  assert.strictEqual(selectSkyTimePresentation(report, initialAt, pastAt, initial, past, limit), initial);

  const selection = ts.transpileModule(skyPageTimePresentationTestCode(source) +
    "\n({ requestedAt, restoredAt, renderedAt: timePresentation?.row.at });",
    { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const observationTime = createSkyObservationTime({ latestInstant: () => limit });
  const activeContext = { contextId: "ctx:future", revision: 1, contextFingerprint: "fp:future", selectedAtUtc: futureAt };
  const firstRender = vm.runInNewContext(selection, skyPageTimePresentationTestBindings({
    activeContext, routeContext: { selectedAt: futureAt }, observationTime, timeIntent: {},
    rawReportData: report, timeModel: null, timeGeometrySources: undefined,
  }));
  assert.deepEqual({ ...firstRender }, { requestedAt: initialAt, restoredAt: initialAt, renderedAt: initialAt });
  assert.equal(observationTime.snapshot().binding, "", "the page is protected before its binding effect runs");
  assert.equal(activeContext.selectedAtUtc, futureAt);
});
