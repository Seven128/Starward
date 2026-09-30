import { PROCEDURAL_SKY_LANDSCAPE } from "./sky-landscape-mask";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { resolvedSkyBodyReferences, skyTargetLabelSuppressed } from "./sky-body-label-presentation";
import { paintedSkyPointVisible, type SkyPickSnapshot } from "./sky-object-picking";
import { createSkyViewBasis } from "./sky-view-projection";
import type { SkyScenePaintedSources } from "./sky-scene-render";
import { skyPresentedTimeCurrent } from "./sky-observation-time";

const source = ts.createSourceFile("spot-sky-page.tsx",
  readFileSync(new URL("./spot-sky-page.tsx", import.meta.url), "utf8"),
  ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let initializer: ts.Expression | undefined;
let presentedSceneInitializer: ts.Expression | undefined;
let visibilityInitializer: ts.Expression | undefined;
let committed: ts.Expression | undefined;
let infraredPresented: ts.Expression | undefined;
function find(node: ts.Node) {
  if (ts.isVariableDeclaration(node) && node.name.getText(source) === "visibleOrientationTargets")
    initializer = node.initializer;
  if (ts.isVariableDeclaration(node) && node.name.getText(source) === "presentedSceneCurrent")
    presentedSceneInitializer = node.initializer;
  if (ts.isVariableDeclaration(node) && node.name.getText(source) === "presentedSkyVisibility")
    visibilityInitializer = node.initializer;
  if (ts.isVariableDeclaration(node) && node.name.getText(source) === "deepSkyImagePresented")
    infraredPresented = node.initializer;
  if (ts.isCallExpression(node) && node.expression.getText(source) === "drawSkyScene")
    committed = node.arguments[8];
  ts.forEachChild(node, find);
}
find(source);
assert.ok(initializer);
assert.ok(presentedSceneInitializer);
assert.ok(visibilityInitializer);
const selection = ts.transpileModule(
  `const rawReportData = orientationData;
   const presentedSceneCurrent = ${presentedSceneInitializer.getText(source)};
   const presentedSkyVisibility = ${visibilityInitializer.getText(source)};
   const selected = ${initializer.getText(source)}; selected`,
  { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
const evaluateSelection = (context: object) => vm.runInNewContext(selection, {
  skyPresentedTimeCurrent, timePlaying: false, timeIntent: { runStartAt: null }, ...context,
});
const openSnapshot: SkyPickSnapshot = { frameAt: "t", catalogVersion: "v", catalogHash: "h",
  width: 390, height: 844, objects: [] };

test("planet and other target labels only follow the native frame actually presented", () => {
  const target = { targetId: "target:venus", type: "PLANET" };
  const projectSkyTarget = () => ({ x: 195, y: 422 });
  const at = "2026-10-08T12:00:00.000Z", reportData = {};
  const context = { orientationTargets: [target], projectSkyTarget, orientationData: reportData,
    row: { at }, mode: "NIGHT", canvasError: null,
    sensorHeadingForScene: null, devicePose: null, canvasSize: { width: 390, height: 844 },
    presentedFov: 45, currentViewBasis: createSkyViewBasis(0,135,0)!, presentedCenter: { x: 195, y: 422 } };
  const labels = (frame: { data: object; frameAt: string; mode: string;
    suppressedBodyReferences?: readonly string[] } | null,
    canvasError: string | null = null) => evaluateSelection(
    { ...context, skyTargetLabelSuppressed, paintedSkyPointVisible,
      paintedSkyObjectsRef: { current: openSnapshot }, presentedSkyFrame: frame, canvasError }) as Array<{ target: { targetId: string } }>;
  const current = { data: reportData, frameAt: at, mode: "NIGHT",landscape:null };
  assert.deepEqual(Array.from(labels({ ...current, suppressedBodyReferences:["PLANET:VENUS"] }), item => item.target.targetId), []);
  assert.deepEqual(Array.from(labels({ ...current, suppressedBodyReferences:["PLANET:JUPITER"] }), item => item.target.targetId), [target.targetId]);
  assert.deepEqual(Array.from(labels(null), item => item.target.targetId), []);
  assert.deepEqual(Array.from(labels(current, "sky_canvas_failed"), item => item.target.targetId), []);
  assert.deepEqual(Array.from(labels({ ...current, frameAt: "2026-10-08T13:00:00.000Z" }), item => item.target.targetId), []);
  assert.deepEqual(Array.from(labels({ ...current, data: {} }), item => item.target.targetId), []);
  assert.deepEqual(Array.from(labels(current), item => item.target.targetId), [target.targetId]);
});

test("same-camera native redraw commits resolved labels and both credits, including failure recovery", () => {
  assert.ok(committed);
  const frame = { data: {}, frameAt: "2026-09-21T04:00:00.000Z", mode: "NIGHT",
    deepSkyImage: { image: {} }, sdssOpticalImage: { image: {} } };
  type Presented = typeof frame & { resolvedBodyReferences: readonly string[]; landscape: import("./sky-landscape-mask").SkyLandscapeMask | null };
  const state: { current: Presented | null } = { current: null };
  const commit = vm.runInNewContext(ts.transpileModule(`(${committed.getText(source)})`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, {
    frame, resolvedSkyBodyReferences, paintedSkyObjectsRef: { current: null },
    setPresentedSkyFrame: (update: (previous: Presented | null) => Presented | null) => { state.current = update(state.current); },
    setPresentedCamera() {}, camera: { animating: false },
  }) as (snapshot: SkyPickSnapshot | null, sources: SkyScenePaintedSources) => void;
  const snapshot: SkyPickSnapshot = { frameAt: frame.frameAt, catalogVersion: "v", catalogHash: "h",
    width: 390, height: 844, objects: [{ reference: "PLANET:VENUS", displayName: "金星", kind: "PLANET",
      magnitude: -4, x: 195, y: 422, hitDisc: { majorRadiusPx: 60, minorRadiusPx: 60, minorDirection: [0, 1] } }] };
  const sources = { deepSkyImage: frame.deepSkyImage.image, sdssOpticalImage: frame.sdssOpticalImage.image };
  commit(snapshot, sources);
  const visible = state.current!;
  assert.deepEqual(Array.from(visible.resolvedBodyReferences), ["PLANET:VENUS"]);
  assert.strictEqual(visible.deepSkyImage, frame.deepSkyImage);
  assert.strictEqual(visible.sdssOpticalImage, frame.sdssOpticalImage);
  commit(snapshot, sources);
  assert.strictEqual(state.current, visible, "unchanged frames must not cause extra DOM commits");
  commit({ ...snapshot, suppressedBodyReferences: ["PLANET:JUPITER"] }, sources);
  const suppressed = state.current!;
  assert.notStrictEqual(suppressed, visible, "a newly hidden point must withdraw its label on the same camera");
  commit({ ...snapshot, suppressedBodyReferences: ["PLANET:JUPITER"] }, sources);
  assert.strictEqual(state.current, suppressed, "stable suppression cannot commit repeatedly");
  commit({ ...snapshot, suppressedBodyReferences: ["PLANET:MARS"] }, sources);
  assert.notStrictEqual(state.current, suppressed, "equal-length suppression must compare identities");
  commit(snapshot, sources);
  const beforePoint = state.current;
  commit({ ...snapshot, objects: snapshot.objects.map(object => {
    const point = { ...object }; delete point.hitDisc; return point;
  }) }, sources);
  assert.notStrictEqual(state.current, beforePoint, "same data/time/camera still needs the restored point label");
  assert.deepEqual(Array.from(state.current!.resolvedBodyReferences), []);
  commit({ ...snapshot, objects: [] }, { sdssOpticalImage: null, deepSkyImage: null });
  assert.equal(state.current!.deepSkyImage, null);
  assert.equal(state.current!.sdssOpticalImage, null);
  commit(snapshot, sources);
  assert.deepEqual(Array.from(state.current!.resolvedBodyReferences), ["PLANET:VENUS"]);
  const restored = state.current!;
  const view = { basis: createSkyViewBasis(324.462322, 100, 0)!, verticalFovDeg: 85 };
  commit({ ...snapshot, view: { ...view, landscape: PROCEDURAL_SKY_LANDSCAPE } }, sources);
  assert.equal(state.current!.landscape, PROCEDURAL_SKY_LANDSCAPE);
  assert.notStrictEqual(state.current, restored, "new occlusion must update same-camera DOM consumers");
  commit({ ...snapshot, view: { ...view, landscape: null } }, sources);
  assert.equal(state.current!.landscape, null, "GPU failure or off restores labels on the same frame");
  commit(null, { sdssOpticalImage: null, deepSkyImage: null });
  assert.equal(state.current, null);
});

test("loaded W3 bytes alone cannot claim visible credit on a stale, hidden or cleared canvas", () => {
  assert.ok(infraredPresented);
  const expression = ts.transpileModule(infraredPresented.getText(source), {
    compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const input = { presentedSceneCurrent: true, nativeCanvasMounted: true,
    canvasSize: { width: 390, height: 844 }, presentedSkyFrame: { deepSkyImage: { image: {} } } };
  assert.equal(vm.runInNewContext(expression, input), true);
  for (const change of [{ presentedSceneCurrent: false }, { nativeCanvasMounted: false },
    { canvasSize: { width: 0, height: 0 } }, { presentedSkyFrame: null },
    { presentedSkyFrame: { deepSkyImage: null } }]) {
    assert.equal(vm.runInNewContext(expression, { ...input, ...change, deepSkyImageAsset: { image: {} } }), false);
  }
});

test("a submitted resolved Venus disc replaces only its old label, and failure restores it", () => {
  const at = "2026-09-21T04:00:00.000Z", data = {};
  const targets = [{ targetId: "target:venus", type: "PLANET" },
    { targetId: "target:jupiter", type: "PLANET" }, { targetId: "other", type: "EVENT" }];
  const labels = (resolvedBodyReferences: readonly string[]) => Array.from(evaluateSelection( {
    skyTargetLabelSuppressed, paintedSkyPointVisible, paintedSkyObjectsRef: { current: openSnapshot },
    orientationTargets: targets, orientationData: data, row: { at }, mode: "NIGHT", canvasError: null,
    presentedSkyFrame: { data, frameAt: at, mode: "NIGHT", resolvedBodyReferences,landscape:null },
    projectSkyTarget: () => ({ x: 195, y: 422 }), sensorHeadingForScene: null, devicePose: null,
    canvasSize: { width: 390, height: 844 }, presentedFov: .05, currentViewBasis: createSkyViewBasis(0,135,0)!,
    presentedCenter: { x: 195, y: 422 },
  }) as Array<{ target: { targetId: string } }>, item => item.target.targetId);
  assert.deepEqual(labels(["PLANET:VENUS"]), ["target:jupiter", "other"]);
  assert.deepEqual(labels([]), targets.map(target => target.targetId), "missing/failed discs keep the label entry");
});

test("target labels use the completed virtual scene mask rather than the current control intent", () => {
  const at = "2026-09-28T16:00:00.000Z", data = {};
  const target = { targetId: "other", type: "EVENT" };
  const view = { basis: createSkyViewBasis(324.462322, 100, 0)!, verticalFovDeg: 85 };
  const labels = (enabled: boolean, intent: boolean) => { const landscape = enabled ? PROCEDURAL_SKY_LANDSCAPE : null; return Array.from(evaluateSelection( {
    skyTargetLabelSuppressed, paintedSkyPointVisible,
    paintedSkyObjectsRef: { current: { ...openSnapshot, view: { ...view, landscape } } },
    landscapeEnabled: intent, orientationTargets: [target], orientationData: data, row: { at },
    mode: "NIGHT", canvasError: null, presentedSkyFrame: { data, frameAt: at, mode: "NIGHT",landscape },
    projectSkyTarget: () => ({ x: 195, y: 422 }), sensorHeadingForScene: null, devicePose: null,
    canvasSize: { width: 390, height: 844 }, presentedFov: 85, currentViewBasis: view.basis,
    presentedCenter: { x: 195, y: 422 },
  }) as Array<{ target: { targetId: string } }>, item => item.target.targetId); };
  assert.deepEqual(labels(true, false), [], "control off waits for its unobstructed repaint");
  assert.deepEqual(labels(false, true), ["other"], "failed or pending geometry cannot hide independent labels");
});

test("a later native mask cannot hide a label before its corresponding DOM camera commit", () => {
  const at="2026-09-28T16:00:00.000Z",data={};
  const view={basis:createSkyViewBasis(324.462322,100,0)!,verticalFovDeg:85};
  const selected=evaluateSelection({
    skyTargetLabelSuppressed,paintedSkyPointVisible,
    // The mutable Canvas ref has advanced; React is still presenting the
    // previous camera and its successfully painted unobstructed scene.
    paintedSkyObjectsRef:{current:{...openSnapshot,view:{...view,landscape:PROCEDURAL_SKY_LANDSCAPE}}},
    orientationTargets:[{targetId:"other",type:"EVENT"}],orientationData:data,row:{at},mode:"NIGHT",canvasError:null,
    presentedSkyFrame:{data,frameAt:at,mode:"NIGHT",landscape:null},
    projectSkyTarget:()=>({x:195,y:422}),sensorHeadingForScene:null,devicePose:null,
    canvasSize:{width:390,height:844},presentedFov:85,currentViewBasis:view.basis,presentedCenter:{x:195,y:422},
  }) as Array<{target:{targetId:string}}>;
  assert.deepEqual(Array.from(selected,item=>item.target.targetId),["other"]);
});
