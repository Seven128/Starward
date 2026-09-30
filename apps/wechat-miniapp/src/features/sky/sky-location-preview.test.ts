import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { civilDateForInstant } from "../../components/observation-date.ts";
import { exactSkyTimeFrame } from "./sky-time-frame.ts";
import { createSkyObjectSelection } from "./sky-object-selection.ts";

const source = ts.createSourceFile("spot-sky-page.tsx",
  readFileSync(new URL("./spot-sky-page.tsx", import.meta.url), "utf8"),
  ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const page = source.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === "SpotSkyPage") as ts.FunctionDeclaration;
assert.ok(page?.body);
const commands = page.body.statements.filter(statement => ts.isVariableStatement(statement) &&
  statement.declarationList.declarations.some(declaration =>
    ["locateCatalogObject", "trackCatalogObject"].includes(declaration.name.getText(source))));
assert.equal(commands.length, 2);
const code = ts.transpileModule(commands.map(statement => statement.getText(source)).join("\n") +
  "\n({ locateCatalogObject, trackCatalogObject });",
  { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;

function harness(isPreviewing: boolean) {
  const object = { reference: "HR:7001", displayName: "织女星", kind: "STAR" };
  const data = { reference: object.reference, spotId: "spot:a", position: { azimuthDeg: 15, altitudeDeg: 45 } };
  let panel: string | null = "time";
  let previewCancelled = false;
  let tracked = false;
  const sandbox = {
    selectedCatalogObject: object, reportData: { context: {} }, row: { at: "2026-09-24T16:30:00Z" },
    positionCatalog: () => ({}), skyObjectPositionIsCurrent: () => true,
    pageVisible: true, contextSession: { busy: false }, timeSaving: false,
    orientationController: { snapshot: () => ({ alignment: { mode: "auto" } }) },
    createSkyViewBasis: () => ({}), cancelSkyGestureRef: { current: () => {} },
    setVerticalFovDeg: () => {}, enterManualView: () => {},
    objectSelection: createSkyObjectSelection(), setSelectionState: () => {},
    setSelectedCatalogObject: () => {}, setCatalogPickChoices: () => {},
    setOrientationObjectListOpen: () => {},
    isPreviewing, setSkyControlPanel: (value: string | null) => { panel = value; },
    setPreviewIndex: (value: number | null) => { previewCancelled = value === null; },
    objectTracking: { start: () => { tracked = true; }, accept: () => true, snapshot: () => ({ target: object }) },
    setTrackingState: () => {},
  };
  const actions = vm.runInNewContext(code, sandbox) as {
    locateCatalogObject: (value: typeof data) => boolean;
    trackCatalogObject: (value: typeof data) => void;
  };
  return { actions, data, get panel() { return panel; }, get previewCancelled() { return previewCancelled; },
    get tracked() { return tracked; } };
}

test("locating and tracking a preview-time object keep the shared time ruler available to commit or cancel", () => {
  const locate = harness(true);
  assert.equal(locate.actions.locateCatalogObject(locate.data), true);
  assert.equal(locate.panel, "time", "an uncommitted preview cannot survive a hidden time control");
  assert.equal(locate.previewCancelled, false, "the selected position still belongs to the visible preview time");

  const track = harness(true);
  track.actions.trackCatalogObject(track.data);
  assert.equal(track.tracked, true);
  assert.equal(track.panel, "time");

  const committed = harness(false);
  assert.equal(committed.actions.locateCatalogObject(committed.data), true);
  assert.equal(committed.panel, null, "a committed-time location may clear the time control");
});

test("cross-midnight preview and cancel use the same report frame and local calendar date", () => {
  const names = ["committedAt", "committedRow", "committedIndex", "activeIndex", "row",
    "isPreviewing", "presentedAt", "selectedCivilDate"];
  const declarations = page.body!.statements.filter(statement => ts.isVariableStatement(statement) &&
    statement.declarationList.declarations.some(declaration => names.includes(declaration.name.getText(source))));
  assert.equal(declarations.length, names.length);
  const selection = ts.transpileModule(declarations.map(statement => statement.getText(source)).join("\n") +
    "\n({ rowAt: row?.at, selectedCivilDate, isPreviewing, activeIndex });",
    { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const beforeMidnight = "2026-09-24T15:30:00Z";
  const afterMidnight = "2026-09-24T16:30:00Z";
  const selected = (previewIndex: number | null) => vm.runInNewContext(selection, {
    contextComplete: true,
    activeContext: { selectedAtUtc: beforeMidnight }, routeContext: { selectedAt: beforeMidnight, timezone: "Asia/Shanghai" },
    reportData: { hourly: [{ at: beforeMidnight }, { at: afterMidnight }] },
    previewIndex, exactSkyTimeFrame, civilDateForInstant,
  }) as { rowAt: string; selectedCivilDate: string; isPreviewing: boolean; activeIndex: number };
  assert.deepEqual({ ...selected(1) }, { rowAt: afterMidnight, selectedCivilDate: "2026-09-25", isPreviewing: true, activeIndex: 1 });
  assert.deepEqual({ ...selected(null) }, { rowAt: beforeMidnight, selectedCivilDate: "2026-09-24", isPreviewing: false, activeIndex: 0 });
});
