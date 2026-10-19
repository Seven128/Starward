import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { civilDateForInstant } from "../../components/observation-date.ts";
import { exactSkyTimeFrame } from "./sky-time-frame.ts";
import { createSkyObjectSelection } from "./sky-object-selection.ts";
import { presentSkyTime, selectSkyTimePresentation, skyTimeRulerRows } from "./sky-time-presentation.ts";
import { createSkyObjectTracking } from "./sky-object-tracking";
import { createSkyObservationTime } from "./sky-observation-time";
import { createSkyContextSession } from "./sky-context-session";
import { skyObjectPositionIsCurrent } from "./sky-object-location";
import { createSkyViewBasis } from "./sky-view-projection";
import { createSkyBrowsingCamera } from "./sky-browsing-camera";
import type { ContextVersion } from "../../services/observation-context-version";

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
  const names = ["committedAt", "committedRow", "committedIndex", "activeIndex", "row",
    "isPreviewing", "presentedAt", "requestedTimePresentation", "acceptedTimePresentation", "timePresentation", "timeRows"];
  const declarations = page.body!.statements.filter(statement => ts.isVariableStatement(statement) &&
    statement.declarationList.declarations.some(declaration => names.includes(declaration.name.getText(source))));
  assert.equal(declarations.length, names.length);
  const selection = ts.transpileModule(declarations.map(statement => statement.getText(source)).join("\n") +
    "\n({ rowAt: row?.at, selectedCivilDate: civilDateForInstant(presentedAt, routeContext.timezone), isPreviewing, activeIndex });",
    { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const beforeMidnight = "2026-09-24T15:30:00Z";
  const afterMidnight = "2026-09-24T16:30:00Z";
  const selected = (previewIndex: number | null) => vm.runInNewContext(selection, {
    contextComplete: true,
    activeContext: { selectedAtUtc: beforeMidnight }, routeContext: { selectedAt: beforeMidnight, timezone: "Asia/Shanghai" },
    rawReportData: { hourly: [{ at: beforeMidnight }, { at: afterMidnight }] },
    requestedAt: previewIndex === null ? beforeMidnight : afterMidnight,
    timeModel: null, timeGeometrySources: undefined,
    presentSkyTime, selectSkyTimePresentation, skyTimeRulerRows, useMemo: (compute: () => unknown) => compute(),
    pageVisible: false,
    previewIndex, exactSkyTimeFrame, civilDateForInstant,
  }) as { rowAt: string; selectedCivilDate: string; isPreviewing: boolean; activeIndex: number };
  assert.deepEqual({ ...selected(1) }, { rowAt: afterMidnight, selectedCivilDate: "2026-09-25", isPreviewing: true, activeIndex: 1 });
  assert.deepEqual({ ...selected(null) }, { rowAt: beforeMidnight, selectedCivilDate: "2026-09-24", isPreviewing: false, activeIndex: 0 });
});
