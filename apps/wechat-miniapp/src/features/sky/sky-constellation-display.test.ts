import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { skyPagePaintCommit } from "./sky-optical-page-test-support";
import { resolvedSkyBodyReferences } from "./sky-body-label-presentation";
import { createSkyViewBasis } from "./sky-view-projection";
import { createSkyBrowsingCamera } from "./sky-browsing-camera";
import type { SkyCanvasCaption } from "./sky-canvas-surface";
import type { SkyPickSnapshot } from "./sky-object-picking";

const source = ts.createSourceFile("spot-sky-page.tsx",
  readFileSync(new URL("./spot-sky-page.tsx", import.meta.url), "utf8"),
  ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const at = "2026-10-13T04:00:00.000Z", basis = createSkyViewBasis(0, 135, 0)!;
const frame = { sceneReady: true, mode: "NIGHT", frameAt: at, constellationsEnabled: true,
  data: { context: {}, skyScene: {}, targetFrames: [] as any[] }, deepSkyImage: null,
  constellations: { at, lines: [], images: [], labels: [{ iau: "Ori", nameZh: "猎户座",
    nameEn: "Orion", direction: basis.forward }] } };
const snapshot: SkyPickSnapshot = { frameAt: at, catalogVersion: "controlled", catalogHash: "controlled",
  width: 390, height: 844, view: { basis, verticalFovDeg: 45, landscape: null }, objects: [] };
function harness(nextFrame = frame, copyFailure = false, initialPresented: any = null,
  insets={top:0,bottom:0}, extra: Record<string, unknown> = {}) {
  const copies: readonly SkyCanvasCaption[][] = [], generation = { current: 1 };
  let publications = 0, presented: any = initialPresented;
  const commit = skyPagePaintCommit(source, { frame: nextFrame, basis, resolvedSkyBodyReferences,
    // These cases assert the settled placement/copy contract. Appearance
    // envelopes are exercised by their owner; the first fading frame is empty.
    reducedMotionRef:{current:true},
    viewportInsetsRef:{current:insets},
    canvasGenerationRef: generation, setPresentedSkyFrame(update: (previous: any) => any) {
      publications++; presented = update(presented);
    }, setPresentedCamera() {},
    canvasSurfaceRef: { current: { present(_reticle: unknown, captions: SkyCanvasCaption[]) {
      if (copyFailure) throw Error("native_copy_failed");
      (copies as SkyCanvasCaption[][]).push(captions);
    } } }, ...extra });
  return { commit, copies, generation, publications: () => publications, presented: () => presented };
}
const constellationCaptions=(captions:readonly SkyCanvasCaption[])=>captions.filter(caption=>caption.text==="猎户座");

test("retired navigation cannot copy or publish its previously staged sky", () => {
  const camera = createSkyBrowsingCamera();
  camera.navigate(basis, createSkyViewBasis(120, 100, 0)!, 45, 4, 390, 844, Date.now());
  const h = harness(frame, false, null, {top:0,bottom:0}, { browsingCamera: camera,
    manualBasisRef: { current: basis } });
  h.commit.stage(snapshot, {});
  camera.suspend();
  h.commit.complete();
  assert.equal(h.copies.length, 0); assert.equal(h.publications(), 0);
});

function accessibleSummary(presented: any, current = true, enabled = true, paintedAt = at) {
  const context = vm.createContext({ mode: "NIGHT", presentedSceneCurrent: current, currentViewBasis: basis,
    presentedSkyFrame: presented, paintedAt, constellationsEnabled: enabled,
    visibleNamedCatalogObjects: [], visibleOrientationTargets: [], presentedSkyVisibility: {},
    spotName: "测试地点", presentedSceneReady: current, skySceneAccessibleFov: 45,
    skySceneAccessibleCount: "真实星图", skySceneAccessibleProvenance: "", skyTargetAccessibleCount: "真实目标",
    skySceneAccessibleOrientation: "手动视角", rowTime: at });
  for (const name of ["visibleConstellationLabels", "visibleConstellationNames", "skySceneAccessibleLabel"]) {
    let expression: ts.Expression | undefined;
    const find = (node: ts.Node) => {
      if (ts.isVariableDeclaration(node) && node.name.getText(source) === name) expression = node.initializer;
      ts.forEachChild(node, find);
    };
    find(source);
    if (!expression && name === "visibleConstellationNames") continue; // Previous product uses the WXML list directly.
    assert.ok(expression, `actual page declaration ${name} must exist`);
    vm.runInContext(ts.transpileModule(`const ${name} = ${expression.getText(source)};`,
      { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, context);
  }
  return vm.runInContext("skySceneAccessibleLabel", context) as string;
}

test("ordinary accessible sky summary retains only successfully presented same-frame constellation names", () => {
  const h = harness();
  h.commit.stage(snapshot, {});
  assert.doesNotMatch(accessibleSummary(h.presented(), false), /可见星座/u);
  h.commit.complete();
  assert.match(accessibleSummary(h.presented()), /可见星座 猎户座/u);
  assert.doesNotMatch(accessibleSummary(h.presented(), false), /可见星座/u);
  assert.doesNotMatch(accessibleSummary(h.presented(), true, false), /可见星座/u);
  assert.doesNotMatch(accessibleSummary(h.presented(), true, true, "2026-10-13T03:00:00.000Z"), /可见星座/u);
  const empty = harness(frame, false, h.presented());
  empty.commit({ ...snapshot, frameAt: "2026-10-13T03:00:00.000Z" }, {});
  assert.doesNotMatch(accessibleSummary(empty.presented()), /可见星座/u,
    "an empty accepted caption receipt must replace old names even when the other retained fields are equal");
  const failed = harness(frame, true); failed.commit.stage(snapshot, {});
  assert.throws(() => failed.commit.complete(), /native_copy_failed/u);
  assert.doesNotMatch(accessibleSummary(failed.presented(), false), /可见星座/u);
});

test("an overlay withdraws obscured constellation names from both the copied sky and its summary",()=>{
  const h=harness(frame,false,null,{top:0,bottom:450});
  h.commit(snapshot,{});
  assert.equal(h.copies[0]!.length,0);
  assert.doesNotMatch(accessibleSummary(h.presented()),/可见星座/u);
});

test("normal constellation text uses admitted star names and is submitted only with the accepted copy", () => {
  const h = harness();
  h.commit.stage({ ...snapshot, namedStars: [{ reference: "HR:1", displayName: "星名", kind: "STAR",
    magnitude: 0, x: 195, y: 422, opacity: 1 }] }, {});
  assert.equal(h.copies.length, 0); assert.equal(h.publications(), 0);
  h.commit.complete();
  assert.deepEqual(Array.from(constellationCaptions(h.copies[0]!), caption => [caption.text, caption.x, caption.y]),
    [["猎户座", 195, 350]], "the original name obstacle must move the decorative label, not the real star");
  assert.equal(h.publications(), 1);
  const invisible = harness();
  invisible.commit({ ...snapshot, namedStars: [{ reference: "HR:1", displayName: "星名", kind: "STAR",
    magnitude: 0, x: 195, y: 422, opacity: 0 }] }, {});
  assert.equal(constellationCaptions(invisible.copies[0]!)[0]!.y, 422, "a render-only exit or transparent point grants no name obstacle");
});

test("same-frame target guides and resolved discs keep their original constellation avoidance policy", () => {
  const next = { ...frame, data: { ...frame.data, targetFrames: [{ at, targets: [{ targetId: "target:venus",
    type: "PLANET", displayName:"金星",direction:"北", azimuthDeg: 0, altitudeDeg: 45 }] }] } };
  const guide = harness(next); guide.commit(snapshot, {});
  assert.equal(constellationCaptions(guide.copies[0]!)[0]!.y, 350);
  const disc = harness(next);
  disc.commit({ ...snapshot, objects: [{ reference: "PLANET:VENUS", displayName: "金星", kind: "PLANET",
    magnitude: -4, x: 195, y: 422, hitDisc: { majorRadiusPx: 60, minorRadiusPx: 60, minorDirection: [0, 1] } }] }, {});
  assert.equal(constellationCaptions(disc.copies[0]!)[0]!.y, 422, "a resolved globe has no obsolete guide-label obstacle");
});

test("old time, retired generation and failed copy cannot publish new decorative names", () => {
  const stale = harness(); stale.commit({ ...snapshot, frameAt: "2026-10-13T03:00:00.000Z" }, {});
  assert.equal(stale.copies[0]!.length, 0);
  const retired = harness(); retired.commit.stage(snapshot, {}); retired.generation.current++;
  retired.commit.complete(); assert.equal(retired.copies.length, 0); assert.equal(retired.publications(), 0);
  const failed = harness(frame, true); failed.commit.stage(snapshot, {});
  assert.throws(() => failed.commit.complete(), /native_copy_failed/u);
  assert.equal(failed.copies.length, 0); assert.equal(failed.publications(), 0);
});
