import { resolvedSkyBodyReferences } from "./sky-body-label-presentation";
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import * as projection from "./sky-view-projection";
import * as stellarScene from "./sky-stellar-scene";
import * as timeFrame from "./sky-time-frame";
import * as skyZoom from "./sky-zoom";
import * as sceneRender from "./sky-scene-render";
import { createSkyBrowsingCamera } from "./sky-browsing-camera";
import { resolveSkyCanvasView } from "./sky-canvas-view";
import { skyViewportCenter, NO_SKY_INSETS } from "./sky-viewport";
import { createDirectionAlignment } from "./direction-alignment";
import { createSkyPresentationFilter } from "./sky-presentation-filter";
import { createSkyOrientationController, type SkyOrientationSnapshot } from "./sky-orientation-controller";
import type { DeviceMotionEvent } from "./compass-lifecycle";

let sourceText = readFileSync(new URL("./spot-sky-page.tsx", import.meta.url), "utf8");
// The escaped-defect mutation now targets the responsible view coordinator.
// Its actual renderer assertion still fails if old reference frames are admitted.
const resolveCanvasView = (input: Parameters<typeof resolveSkyCanvasView>[0]) =>
  resolveSkyCanvasView(process.env.MUTATE_SKY_REFERENCE_FRAME === "1"
    ? { ...input, queuedOrientationRevision: input.live.presentationRevision } : input);
if (process.env.MUTATE_SKY_FILTER_FENCE === "1") sourceText = sourceText.replace("orientation.latestPresentation.current ?? orientationController.snapshot()", "orientationController.snapshot()");
if (process.env.MUTATE_SKY_NATIVE_IMAGE_FENCE === "1") sourceText = sourceText
  .replace("frame.deepSkyImage?.canvasGeneration === canvasGenerationRef.current ? frame.deepSkyImage : null", "frame.deepSkyImage")
  .replace("frame.nativeImageGeneration === canvasGenerationRef.current ? frame.constellationImages : EMPTY_SKY_IMAGES", "frame.constellationImages");
const source = ts.createSourceFile("sky.tsx", sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let paint = "";
function visit(node: ts.Node) {
  if (ts.isPropertyAssignment(node) && node.name.getText(source) === "paint") paint = node.initializer.getText(source);
  ts.forEachChild(node, visit);
}
visit(source); assert.ok(paint);
const exports_: Record<string, any> = {};
vm.runInNewContext(ts.transpileModule(sourceText + "\nexport { drawSkyScene };", {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
}).outputText, { exports: exports_, require: (name: string) => name === "./sky-scene-render" ? sceneRender : name === "./sky-view-projection" ? projection : name === "./sky-time-frame" ? timeFrame : name === "./sky-stellar-scene" ? stellarScene : name === "./sky-zoom" ? skyZoom : {} });

test("recreated canvas rejects queued survey and constellation native images until their new owners publish", () => {
  const basis = projection.createSkyViewBasis(0, 45, 0)!;
  const submitted: { survey: unknown; artwork: ReadonlyMap<string, object>; uranus:unknown; neptune:unknown; landscapeMask:unknown }[] = [];
  const paintFrame = vm.runInNewContext(ts.transpileModule(`(${paint});`, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText, {
    orientationController: { snapshot: () => ({ presentationRevision: 1, alignment: { mode: "auto", view: basis } }) },
    resolveSkyCanvasView: resolveCanvasView,
    orientation: { latestPresentation: { current: null } }, manualBasisRef: { current: basis },
    ...skyZoom, SKY_VERTICAL_FOV_DEG: 45, browsingCamera: createSkyBrowsingCamera(), zoomRef: { current: 45 },
    reducedMotionRef: { current: true }, viewportInsetsRef: { current: NO_SKY_INSETS }, skyViewportCenter,
    objectTracking:{snapshot:()=>({target:null})},
    canvasGenerationRef: { current: 2 }, EMPTY_SKY_IMAGES: new Map(),
    drawSkyScene(...args: any[]) { submitted.push({ survey: args[11], artwork: args[15].images, uranus:args[32],neptune:args[33],landscapeMask:args[34].mask }); },
  });
  const old = { canvasGeneration: 1, image: {} }, replacement = { canvasGeneration: 2, image: {} };
  const artwork = new Map([["current", {}]]);
  const uranus={},neptune={},landscapeMask={};
  const frame = { orientationRevision: 1, nativeImageGeneration: 1, deepSkyImage: old, constellationImages: artwork,uranusBands:uranus,neptuneBands:neptune,landscapeMask };
  const size = { width: 400, height: 800 };
  paintFrame({}, frame, size, () => {});
  assert.equal(submitted[0]!.uranus,null);assert.equal(submitted[0]!.neptune,null);
  assert.equal(submitted[0]!.survey, null); assert.equal(submitted[0]!.artwork.size, 0);
  assert.equal(submitted[0]!.landscapeMask,null,"retired source alpha cannot certify a recreated Canvas");
  paintFrame({}, { ...frame, nativeImageGeneration: 2 }, size, () => {});
  assert.equal(submitted[1]!.uranus,uranus);assert.equal(submitted[1]!.neptune,neptune);
  assert.equal(submitted[1]!.survey, null); assert.equal(submitted[1]!.artwork, artwork);
  assert.equal(submitted[1]!.landscapeMask,landscapeMask,"current source alpha reaches the actual submitted scene");
  paintFrame({}, { ...frame, nativeImageGeneration: 2, deepSkyImage: replacement }, size, () => {});
  assert.equal(submitted[2]!.survey, replacement); assert.equal(submitted[2]!.artwork, artwork);
});

test("queued pre-calibration canvas frame cannot jump back after confirm or cancel", () => {
  for (const action of ["commit", "cancel"] as const) {
    let now = 1000;
    const original = projection.createSkyViewBasis(0, 90, 0)!;
    const moved = projection.createSkyViewBasis(90, 90, 0)!;
    const alignment = createDirectionAlignment({ now: () => now });
    const epoch = alignment.startReference(); alignment.update(epoch, original, now);
    alignment.begin(original); now++; alignment.update(epoch, moved, now);
    alignment[action]();
    const expected = alignment.snapshot().view!;
    const stale = action === "commit" ? moved : original;
    const arcs: number[][] = [];
    const context = new Proxy({}, { get: (_o, key) => key === "disc" ? (...args: number[]) => arcs.push(args) : () => undefined });
    const presented = { current: null as projection.SkyViewBasis | null };
    const paintFrame = vm.runInNewContext(ts.transpileModule(`(${paint});`, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText, {
      orientationController: { snapshot: () => ({ presentationRevision: 3, alignment: alignment.snapshot() }) },
      resolveSkyCanvasView: resolveCanvasView,
      manualBasisRef: { current: null }, orientation: { presented, latestPresentation: { current: null } },
      paintedSkyObjectsRef: { current: null }, drawSkyScene: exports_.drawSkyScene,
      resolvedSkyBodyReferences, setPresentedSkyFrame: (change: (previous: unknown) => unknown) => change(null),
      ...skyZoom, SKY_VERTICAL_FOV_DEG: 45,
      browsingCamera:createSkyBrowsingCamera(), zoomRef:{current:45}, reducedMotionRef:{current:false},
      objectTracking:{snapshot:()=>({target:null})},
      setPresentedCamera() {}, browsingTimerRef:{current:null},
      viewportInsetsRef:{current:NO_SKY_INSETS}, skyViewportCenter,
      canvasGenerationRef:{current:1}, EMPTY_SKY_IMAGES:new Map(),
    });
    const at = "2026-09-16T13:00:00Z";
    const target = (azimuth: number) => ({ type: "STAR", direction: `北 ${azimuth}°`, azimuthDeg: azimuth, altitudeDeg: 10 });
    paintFrame(context, { orientationRevision: 1, data: { skyScene: { state: "UNAVAILABLE", frames: [] },
      targetFrames: [{ at, targets: [target(action === "commit" ? 0 : 90)] }] }, frameAt: at, pose: { basis: stale },
      heading: 0, manualBasis: null, mode: "NIGHT", verticalFovDeg: 45, sceneReady: true }, { width: 400, height: 800 }, () => {});
    const point = projection.projectSkyDirection(action === "commit" ? 0 : 90, 10, expected, 400, 800, 45)!;
    assert.ok(arcs.some(arc => Math.abs(arc[0]! - point.x) < 1e-7 && Math.abs(arc[1]! - point.y) < 1e-7), "the actual renderer must retain the expected celestial target");
    assert.deepEqual(presented.current, expected, "the next calibration freezes what was actually painted");
  }
});

test("real alignment confirms raw input while queued painting retains stabilized geometry", async () => {
  let now = 1000;
  let motion: ((event: DeviceMotionEvent) => void) | undefined;
  const presented = { current: null as projection.SkyViewBasis | null };
  const latestPresentation = { current: null as SkyOrientationSnapshot | null };
  const filter = createSkyPresentationFilter();
  const controller = createSkyOrientationController({ platform: "android", presented: () => presented.current,
    changed: snapshot => { latestPresentation.current = filter(snapshot); },
    clock: { now: () => now, schedule: () => 0, cancel() {} },
    port: { onDeviceMotionChange(fn) { motion = fn; }, offDeviceMotionChange() {},
      async startDeviceMotionListening() {}, async stopDeviceMotionListening() {},
      onCompassChange() {}, offCompassChange() {}, async startCompass() {}, async stopCompass() {} } });
  const move = (alpha: number) => { now += 16; motion!({ alpha, beta: -90, gamma: 0 }); };
  await controller.start(); move(0); move(20);
  presented.current = latestPresentation.current!.pose!.basis;
  const frozen = presented.current;
  const oldRevision = latestPresentation.current!.presentationRevision;
  assert.ok(latestPresentation.current!.pose!.headingDeg! < 20);
  assert.ok(controller.begin()); move(90); assert.ok(controller.commit());
  for (let i = 0; i < 10; i++) move(90);
  for (const axis of ["right", "up", "forward"] as const) {
    frozen[axis].forEach((value, i) => assert.ok(Math.abs(latestPresentation.current!.pose!.basis[axis][i]! - value) < 1e-8));
  }
  move(110);
  const expected = latestPresentation.current!.pose!.basis;
  assert.notDeepEqual(expected, controller.snapshot().pose!.basis);
  const arcs: number[][] = [];
  const context = new Proxy({}, { get: (_o, key) => key === "disc" ? (...args: number[]) => arcs.push(args) : () => undefined });
  const paintFrame = vm.runInNewContext(ts.transpileModule(`(${paint});`, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText, {
    orientationController: controller, manualBasisRef: { current: null },
    resolveSkyCanvasView: resolveCanvasView,
    orientation: { presented, latestPresentation }, paintedSkyObjectsRef: { current: null }, drawSkyScene: exports_.drawSkyScene,
    resolvedSkyBodyReferences, setPresentedSkyFrame: (change: (previous: unknown) => unknown) => change(null),
    ...skyZoom, SKY_VERTICAL_FOV_DEG: 45,
    browsingCamera:createSkyBrowsingCamera(), zoomRef:{current:45}, reducedMotionRef:{current:false},
    setPresentedCamera() {}, browsingTimerRef:{current:null},
    viewportInsetsRef:{current:NO_SKY_INSETS}, skyViewportCenter,
    canvasGenerationRef:{current:1}, EMPTY_SKY_IMAGES:new Map(),
  });
  const at = "2026-09-16T13:00:00Z";
  const azimuth = latestPresentation.current!.pose!.headingDeg!;
  paintFrame(context, { orientationRevision: oldRevision, data: { skyScene: { state: "UNAVAILABLE", frames: [] },
    targetFrames: [{ at, targets: [{ type: "STAR", direction: `北 ${azimuth}°`, azimuthDeg: azimuth, altitudeDeg: 10 }] }] },
    frameAt: at, pose: { basis: frozen }, heading: 0, manualBasis: null,
    mode: "NIGHT", verticalFovDeg: 45, sceneReady: true }, { width: 400, height: 800 }, () => {});
  assert.deepEqual(presented.current, expected);
  const point = projection.projectSkyDirection(azimuth, 10, expected, 400, 800, 45)!;
  assert.ok(arcs.some(arc => Math.abs(arc[0]! - point.x) < 1e-7 && Math.abs(arc[1]! - point.y) < 1e-7));
  controller.dispose();
});
