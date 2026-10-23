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
import { completeLegacySkyOptical } from "./sky-sdss-optical-completion";
import { skyPageCompletedResourceTestFrame, skyPagePaintCommit, skyPageScenePort, skyPageSceneTestDependencies } from "./sky-optical-page-test-support";
import { projectSkyTargetLabels } from "./sky-label-presentation";

const source = ts.createSourceFile("spot-sky-page.tsx",
  readFileSync(new URL("./spot-sky-page.tsx", import.meta.url), "utf8"),
  ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let initializer: ts.Expression | undefined;
let presentedSceneInitializer: ts.Expression | undefined;
let visibilityInitializer: ts.Expression | undefined;
let committed: ts.Expression | undefined;
let infraredPresented: ts.Expression | undefined;
let presentedResources: ts.Expression | undefined;
function find(node: ts.Node) {
  if (ts.isVariableDeclaration(node) && node.name.getText(source) === "visibleOrientationTargets")
    initializer = node.initializer;
  if (ts.isVariableDeclaration(node) && node.name.getText(source) === "presentedSceneCurrent")
    presentedSceneInitializer = node.initializer;
  if (ts.isVariableDeclaration(node) && node.name.getText(source) === "presentedSkyVisibility")
    visibilityInitializer = node.initializer;
  if (ts.isVariableDeclaration(node) && node.name.getText(source) === "deepSkyImagePresented")
    infraredPresented = node.initializer;
  if (ts.isVariableDeclaration(node) && node.name.getText(source) === "presentedImageResources")
    presentedResources = node.initializer;
  if (ts.isCallExpression(node) && node.expression.getText(source) === "drawSkyScene")
    committed = skyPageScenePort(source,"painted");
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
const evaluateSelection = (context: Record<string, any>) => {
  // These admission/mask cases control a centre point. Give that point real
  // horizontal geometry now that the shared production projection is executed.
  const ray = context.currentViewBasis.forward;
  const targets = context.orientationTargets.map((target: object) => ({ ...target,
    azimuthDeg: (Math.atan2(ray[0], ray[1]) * 180 / Math.PI + 360) % 360,
    altitudeDeg: Math.asin(ray[2]) * 180 / Math.PI }));
  return vm.runInNewContext(selection, { skyPresentedTimeCurrent, projectSkyTargetLabels,
    timePlaying: false, timeIntent: { runStartAt: null }, viewportInsets:{top:0,bottom:0},...context, orientationTargets: targets });
};
const openSnapshot: SkyPickSnapshot = { frameAt: "t", catalogVersion: "v", catalogHash: "h",
  width: 390, height: 844, objects: [] };

// Existing OBSERVATION DOM labels; ordinary names use the shared Canvas copy.
test("planet and other DOM target labels only follow the frame actually presented", () => {
  const target = { targetId: "target:venus", type: "PLANET" };
  const projectSkyTarget = () => ({ x: 195, y: 422 });
  const at = "2026-10-08T12:00:00.000Z", reportData = {};
  const context = { orientationTargets: [target], projectSkyTarget, orientationData: reportData,
    row: { at }, mode: "OBSERVATION", canvasError: null,
    sensorHeadingForScene: null, devicePose: null, canvasSize: { width: 390, height: 844 },
    presentedFov: 45, currentViewBasis: createSkyViewBasis(0,135,0)!, presentedCenter: { x: 195, y: 422 } };
  const labels = (frame: { data: object; frameAt: string; mode: string;
    suppressedBodyReferences?: readonly string[] } | null,
    canvasError: string | null = null,viewportInsets={top:0,bottom:0}) => evaluateSelection(
    { ...context, skyTargetLabelSuppressed, paintedSkyPointVisible,
      paintedSkyObjectsRef: { current: openSnapshot }, presentedSkyFrame: frame, canvasError,viewportInsets }) as Array<{ target: { targetId: string } }>;
  const current = { data: reportData, frameAt: at, mode: "OBSERVATION",landscape:null };
  assert.deepEqual(Array.from(labels({ ...current, suppressedBodyReferences:["PLANET:VENUS"] }), item => item.target.targetId), []);
  assert.deepEqual(Array.from(labels({ ...current, suppressedBodyReferences:["PLANET:JUPITER"] }), item => item.target.targetId), [target.targetId]);
  assert.deepEqual(Array.from(labels(null), item => item.target.targetId), []);
  assert.deepEqual(Array.from(labels(current, "sky_canvas_failed"), item => item.target.targetId), []);
  assert.deepEqual(Array.from(labels({ ...current, frameAt: "2026-10-08T13:00:00.000Z" }), item => item.target.targetId), []);
  assert.deepEqual(Array.from(labels({ ...current, data: {} }), item => item.target.targetId), []);
  assert.deepEqual(Array.from(labels(current), item => item.target.targetId), [target.targetId]);
  assert.deepEqual(Array.from(labels(current,null,{top:0,bottom:450}), item=>item.target.targetId),[],
    "an overlay hides its target guide without moving the actual target");
});

test("same-camera native redraw commits resolved labels and both credits, including failure recovery", () => {
  assert.ok(committed);
  const frame = { data: {}, frameAt: "2026-09-21T04:00:00.000Z", mode: "NIGHT",
    deepSkyImage: { image: {}, reference: "M:51", level: "DETAIL", fieldDegrees: .05, canvasGeneration:1 }, sdssOpticalImage: { image: {}, reference: "M:51", publicationHash: "legacy", level: "DETAIL" as const, fieldDegrees: .05 } };
  type Presented = Omit<typeof frame, "sdssOpticalImage"> & { sdssOptical: import("./sky-sdss-optical-completion").SkySdssLegacyOpticalCompletion | null; resolvedBodyReferences: readonly string[]; landscape: import("./sky-landscape-mask").SkyLandscapeMask | null };
  const state: { current: Presented | null } = { current: null };
  const commit = skyPagePaintCommit(source, {
    frame, resolvedSkyBodyReferences, paintedSkyObjectsRef: { current: null },
    setPresentedSkyFrame: (update: (previous: Presented | null) => Presented | null) => { state.current = update(state.current); },
    setPresentedCamera() {}, camera: { animating: false },
  });
  const snapshot: SkyPickSnapshot = { frameAt: frame.frameAt, catalogVersion: "v", catalogHash: "h",
    width: 390, height: 844, objects: [{ reference: "PLANET:VENUS", displayName: "金星", kind: "PLANET",
      magnitude: -4, x: 195, y: 422, hitDisc: { majorRadiusPx: 60, minorRadiusPx: 60, minorDirection: [0, 1] } }] };
  const sources: SkyScenePaintedSources = { deepSkyImage: frame.deepSkyImage.image, sdssOptical: completeLegacySkyOptical(frame.sdssOpticalImage, frame.sdssOpticalImage.image) };
  commit(snapshot, sources);
  const visible = state.current!;
  assert.deepEqual(Array.from(visible.resolvedBodyReferences), ["PLANET:VENUS"]);
  assert.strictEqual(visible.deepSkyImage.image, frame.deepSkyImage.image);
  assert.equal((visible.deepSkyImage as typeof visible.deepSkyImage & { isCurrent(): boolean }).isCurrent(), true);
  assert.strictEqual(visible.sdssOptical!.field.image, frame.sdssOpticalImage.image);
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
  commit({ ...snapshot, objects: [] }, { sdssOptical: null, deepSkyImage: null });
  assert.equal(state.current!.deepSkyImage, null);
  assert.equal(state.current!.sdssOptical, null);
  commit(snapshot, sources);
  assert.deepEqual(Array.from(state.current!.resolvedBodyReferences), ["PLANET:VENUS"]);
  const restored = state.current!;
  const view = { basis: createSkyViewBasis(324.462322, 100, 0)!, verticalFovDeg: 85 };
  commit({ ...snapshot, view: { ...view, landscape: PROCEDURAL_SKY_LANDSCAPE } }, sources);
  assert.equal(state.current!.landscape, PROCEDURAL_SKY_LANDSCAPE);
  assert.notStrictEqual(state.current, restored, "new occlusion must update same-camera DOM consumers");
  commit({ ...snapshot, view: { ...view, landscape: null } }, sources);
  assert.equal(state.current!.landscape, null, "GPU failure or off restores labels on the same frame");
  commit(null, { sdssOptical: null, deepSkyImage: null });
  assert.equal(state.current, null);
});

test("loaded W3 bytes alone cannot claim visible credit on a stale, hidden or cleared canvas", () => {
  assert.ok(infraredPresented && presentedResources);
  const expression = ts.transpileModule(`const presentedImageResources=${presentedResources.getText(source)};
    ${infraredPresented.getText(source)}`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const input = { ...skyPageSceneTestDependencies, presentedSceneCurrent: true, nativeCanvasMounted: true,
    canvasGenerationRef: { current: 1 }, canvasSize: { width: 390, height: 844 },
    presentedSkyFrame: skyPageCompletedResourceTestFrame({ nativeCanvasGeneration: 1,
      deepSkyImage: { image: {}, reference: "M:51", level: "DETAIL", fieldDegrees: 1, canvasGeneration: 1,
        isCurrent: () => true, coarser: null, fallback: null } }) };
  assert.equal(vm.runInNewContext(expression, input), true);
  for (const change of [{ presentedSceneCurrent: false }, { nativeCanvasMounted: false },
    { canvasSize: { width: 0, height: 0 } }, { presentedSkyFrame: null },
    { presentedSkyFrame: skyPageCompletedResourceTestFrame({ nativeCanvasGeneration: 1, deepSkyImage: null }) }]) {
    assert.equal(vm.runInNewContext(expression, { ...input, ...change, deepSkyImageAsset: { image: {} } }), false);
  }
});

test("a submitted resolved Venus disc replaces only its old label, and failure restores it", () => {
  const at = "2026-09-21T04:00:00.000Z", data = {};
  const targets = [{ targetId: "target:venus", type: "PLANET" },
    { targetId: "target:jupiter", type: "PLANET" }, { targetId: "other", type: "EVENT" }];
  const labels = (resolvedBodyReferences: readonly string[]) => Array.from(evaluateSelection( {
    skyTargetLabelSuppressed, paintedSkyPointVisible, paintedSkyObjectsRef: { current: openSnapshot },
    orientationTargets: targets, orientationData: data, row: { at }, mode: "OBSERVATION", canvasError: null,
    presentedSkyFrame: { data, frameAt: at, mode: "OBSERVATION", resolvedBodyReferences,landscape:null },
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
    mode: "OBSERVATION", canvasError: null, presentedSkyFrame: { data, frameAt: at, mode: "OBSERVATION",landscape },
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
    orientationTargets:[{targetId:"other",type:"EVENT"}],orientationData:data,row:{at},mode:"OBSERVATION",canvasError:null,
    presentedSkyFrame:{data,frameAt:at,mode:"OBSERVATION",landscape:null},
    projectSkyTarget:()=>({x:195,y:422}),sensorHeadingForScene:null,devicePose:null,
    canvasSize:{width:390,height:844},presentedFov:85,currentViewBasis:view.basis,presentedCenter:{x:195,y:422},
  }) as Array<{target:{targetId:string}}>;
  assert.deepEqual(Array.from(selected,item=>item.target.targetId),["other"]);
});
