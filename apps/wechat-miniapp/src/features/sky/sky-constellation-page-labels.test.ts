import { PROCEDURAL_SKY_LANDSCAPE } from "./sky-landscape-mask";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { paintedSkyPointVisible, type SkyPickSnapshot } from "./sky-object-picking";
import { createSkyViewBasis } from "./sky-view-projection";
import { skyPresentedTimeCurrent } from "./sky-observation-time";

// Run the page's actual overlay selection against a pending native frame.
const source = ts.createSourceFile("spot-sky-page.tsx",
  readFileSync(new URL("./spot-sky-page.tsx", import.meta.url), "utf8"),
  ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let initializer: ts.Expression | undefined;
let presentedSceneInitializer: ts.Expression | undefined;
let visibilityInitializer: ts.Expression | undefined;
let paintedAtInitializer: ts.Expression | undefined;
function find(node: ts.Node) {
  if (ts.isVariableDeclaration(node) && node.name.getText(source) === "visibleConstellationLabels")
    initializer = node.initializer;
  if (ts.isVariableDeclaration(node) && node.name.getText(source) === "presentedSceneCurrent")
    presentedSceneInitializer = node.initializer;
  if (ts.isVariableDeclaration(node) && node.name.getText(source) === "presentedSkyVisibility")
    visibilityInitializer = node.initializer;
  if (ts.isVariableDeclaration(node) && node.name.getText(source) === "paintedAt")
    paintedAtInitializer = node.initializer;
  ts.forEachChild(node, find);
}
find(source);
assert.ok(initializer);
assert.ok(presentedSceneInitializer);
assert.ok(visibilityInitializer);
assert.ok(paintedAtInitializer);
const selection = ts.transpileModule(
  `const presentedSceneCurrent = ${presentedSceneInitializer.getText(source)};
   const paintedAt = ${paintedAtInitializer.getText(source)};
   const presentedSkyVisibility = ${visibilityInitializer.getText(source)};
   const selected = ${initializer.getText(source)}; selected`,
  { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
const at = "2026-10-08T12:00:00.000Z";
const reportData = { context: { dataRevision: 'current-report' }, skyScene: {} };
const constellationFrame = { at };
const openSnapshot: SkyPickSnapshot = { frameAt: at, catalogVersion: "v", catalogHash: "h",
  width: 390, height: 844, objects: [] };
function labels(presentedSkyFrame: object | null, painted: SkyPickSnapshot = openSnapshot) {
  return vm.runInNewContext(selection, {
    orientationData: reportData, reportData, rawReportData:reportData, row: { at }, mode: "NIGHT", canvasError: null,
    skyPresentedTimeCurrent, timePlaying:false, timeIntent:{runStartAt:null},
    currentViewBasis: painted.view?.basis??createSkyViewBasis(0,135,0)!, constellationFrame,
    presentedSkyFrame: presentedSkyFrame?{...presentedSkyFrame,landscape:painted.view?.landscape??null}:null,
    presentedFov: 45, presentedCenter: { x: 195, y: 422 },
    canvasSize: { width: 390, height: 844 }, constellationsEnabled: true,
    visibleNamedCatalogObjects: [], visibleOrientationTargets: [],
    paintedSkyPointVisible, paintedSkyObjectsRef: { current: painted },
    projectConstellationLabels: () => [{ iau: "Ori", nameZh: "猎户座", x: 195, y: 422 }],
  }) as Array<{ iau: string }>;
}

test("constellation names wait for the current native scene and figure edition", () => {
  assert.deepEqual(Array.from(labels(null), label => label.iau), []);
  assert.deepEqual(Array.from(labels({ data: reportData, frameAt: at, mode: "NIGHT",
    constellations: {}, constellationsEnabled: true }), label => label.iau), []);
  assert.deepEqual(Array.from(labels({ data: reportData, frameAt: at, mode: "NIGHT",
    constellations: constellationFrame, constellationsEnabled: false }), label => label.iau), []);
  assert.deepEqual(Array.from(labels({ data: reportData, frameAt: at, mode: "NIGHT",
    constellations: constellationFrame, constellationsEnabled: true }), label => label.iau), ["Ori"]);
  assert.deepEqual(Array.from(labels({ data: { ...reportData, context:{dataRevision:'previous-report'} }, frameAt:at, mode:"NIGHT",
    constellations:constellationFrame, constellationsEnabled:true }), label=>label.iau),[],
    'the previous report cannot expose current constellation names');
});

test("a constellation name covered by the actual virtual foreground returns after an unobstructed repaint", () => {
  const frame = { data: reportData, frameAt: at, mode: "NIGHT",
    constellations: constellationFrame, constellationsEnabled: true };
  const view = { basis: createSkyViewBasis(324.462322,100,0)!,verticalFovDeg:85 };
  assert.deepEqual(Array.from(labels(frame,{...openSnapshot,view:{...view,landscape:PROCEDURAL_SKY_LANDSCAPE}}),label=>label.iau),[]);
  assert.deepEqual(Array.from(labels(frame,{...openSnapshot,view:{...view,landscape:null}}),label=>label.iau),["Ori"]);
});
