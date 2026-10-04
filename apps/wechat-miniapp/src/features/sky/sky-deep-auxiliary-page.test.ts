import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { createSkyCanvasLifecycle, type CanvasClock } from "./sky-canvas-lifecycle";
import { createSkyArtworkLoader, registerSkyNativeImageLifetime } from "./sky-artwork-loader";
import { startSkyArtworkRequest, type SkyArtworkImage } from "./sky-artwork-request";
import { drawSkyScene } from "./sky-scene-render";
import { copySkyDeepAuxiliaryDecisions, deepSkyAuxiliaryOpacity, sameSkyDeepAuxiliaryDecisions,
  skyDeepAuxiliaryDecisionOpacity } from "./sky-deep-auxiliary-visibility";
import { liveSkyOpticalCompletion, sameSkyOpticalCompletion, sameSkyOpticalInput } from "./sky-sdss-optical-completion";
import { skyTargetOpticalFrame } from "./sky-sdss-optical-frame";
import { skyTargetOpticalIntersectsView } from "./sky-target-optical-visibility";
import { sdssOpticalLevelForFov, sdssScienceOpticalLevelForFov, skyTargetOpticalLevelForFov } from "./sky-sdss-optical-selection";
import { skyFixedImageStatus } from "./sky-fixed-image-status";
import { createSkyViewBasis } from "./sky-view-projection";
import { projectHorizontalPoint } from "./sky-scene-projection";
import { paintedSkyPointVisible } from "./sky-object-picking";
import { resolveSkyDeepSkyScene, resolveSkySceneFrame } from "./sky-stellar-scene";
import { skyStarAppearance } from "./sky-star-appearance";
import { skySolarLightAt } from "./sky-solar-light";
import { resolvedSkyBodyReferences } from "./sky-body-label-presentation";
import { sdssOpticalPublication } from "@starward/miniapp-contracts";

// Actual Scene, page callbacks/dependencies and lifecycle; only React scheduling,
// native image/lease callbacks and the render surface are controlled. No GPU claim.
const pageText = readFileSync(process.env.CLOUD_SKY_COMMON_PAGE_SOURCE ?? new URL("./spot-sky-page.tsx", import.meta.url), "utf8");
const source = ts.createSourceFile("spot-sky-page.tsx", pageText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const nodes = new Map<string, ts.Expression>(); let drawEffect: ts.CallExpression | undefined;
function visit(node: ts.Node) {
  if (ts.isVariableDeclaration(node) && node.initializer) nodes.set(node.name.getText(source), node.initializer);
  if (ts.isPropertyAssignment(node) && ["paint", "presented", "invalidated", "sameScene"].includes(node.name.getText(source)))
    nodes.set(node.name.getText(source), node.initializer);
  if (ts.isCallExpression(node) && node.expression.getText(source) === "useEffect" &&
    node.arguments[0]?.getText(source).includes("canvasLifecycle.setMounted") &&
    node.arguments[0]?.getText(source).includes("draw();")) drawEffect = node;
  ts.forEachChild(node, visit);
}
visit(source);
const evaluate = (node: ts.Node, context: vm.Context) => vm.runInContext(ts.transpileModule(`(${node.getText(source)})`,
  { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, context);
const at = "2026-10-02T12:00:00.000Z", basis = createSkyViewBasis(20, 110, 0)!;
const data: any = { hourly: [{ at, sunAltitudeDeg: -24, sunAzimuthDeg: 270 }], targetFrames: [],
  skyScene: { state: "UNAVAILABLE", catalog: null, frames: [], deepSky: { state: "AVAILABLE",
    catalog: { catalogVersion: "controlled", catalogHash: "controlled", imageRegistration: "ICRS_TAN_NORTH_0_1_V1",
      entries: [{ objectRef: "M:51", displayName: "M51", kind: "GALAXY", magnitude: 8.4, majorAxisArcmin: 11 },
        { objectRef: "M:63", displayName: "M63", kind: "GALAXY", magnitude: 9, majorAxisArcmin: 10 }] },
    frames: [{ at, state: "AVAILABLE", points: [[0,20,20,20,20.1,19.9,20],[1,28,20,28,20.1,27.9,20]] }] } } };
function harness() {
  let id = 0, width = 390, height = 844, late: (() => void) | undefined, fault = false;
  const tasks = new Map<number, { callback: () => void; delay: number }>();
  const clock: CanvasClock = { schedule(callback, delay) { tasks.set(++id, { callback, delay }); return id; }, cancel(handle) { tasks.delete(handle as number); } };
  const state = { presented: null as any, camera: null as any, failed: null as unknown };
  const attempts: Array<{ complete: () => void; snapshot: any; sources: any; discs: number[] }> = [];
  const generation = { current: 1 }, pending = { current: null as any }, picking = { current: null as any };
  const image = { width: 512, height: 512 };
  const optical = { image, level: "DETAIL", fieldDegrees: .0568888889, reference: "M:51", publicationHash: "controlled-legacy" };
  const context = vm.createContext({ copySkyDeepAuxiliaryDecisions, sameSkyDeepAuxiliaryDecisions, liveSkyOpticalCompletion,
    sameSkyOpticalCompletion, sameSkyOpticalInput, resolvedSkyBodyReferences, canvasGenerationRef: generation,
    pendingSkyPaintRef: pending, paintedSkyObjectsRef: picking,
    orientation: { latestPresentation: { current: null }, presented: { current: null } },
    orientationController: { snapshot: () => ({}) }, manualBasisRef: { current: basis }, zoomRef: { current: 2.2 },
    viewportInsetsRef: { current: {} }, reducedMotionRef: { current: false }, objectTracking: { snapshot: () => ({ target: null }) },
    resolveSkyCanvasView: ({ requestedFov }: { requestedFov: number }) => ({ verticalFovDeg: requestedFov, progress: 1,
      center: { x: width / 2, y: height / 2 }, localView: basis, intent: "manual" }),
    browsingCamera: { update: () => ({ view: basis, animating: false }) },
    setPresentedSkyFrame: (update: any) => { state.presented = typeof update === "function" ? update(state.presented) : update; },
    setPresentedCamera: (update: any) => { state.camera = typeof update === "function" ? update(state.camera) : update; },
    setCanvasSize() {}, setCanvasError() {}, canvasDrawRevisionRef: { current: 0 }, publishAcceptanceSkySceneInspection() {},
    EMPTY_SKY_IMAGES: new Map(), setSolarLightUnavailable() {}, setMoonDiscUnavailable() {}, setPlanetDiscUnavailable() {},
    setSunDiscUnavailable() {}, setGalacticBandUnavailable() {}, setLandscapeUnavailable() {}, setArtworkContributionUnavailable() {},
    drawSkyScene: (...args: any[]) => {
      const discs: number[] = []; let snapshot: any = null, sources: any = null;
      const stage = args[8], complete = args[9];
      const surface: any = { begin() {}, solarLight: () => true, galacticBand: () => true, sun: () => true, moon: () => true,
        planet: () => true, saturnRings: () => true, image: () => true, skyImageMesh: () => true, artwork: () => true,
        landscape: () => true, segments() {}, disc(_x: number, _y: number, _r: number, _c: string, opacity: number) { discs.push(opacity); },
        finish() { late?.(); if (fault) throw Error("controlled_finish_failure"); } };
      args[0] = surface; args[8] = (s: any, c: any) => { snapshot = s; sources = c; stage(s, c); };
      args[9] = () => { attempts.push({ complete, snapshot, sources, discs }); };
      drawSkyScene(...args as Parameters<typeof drawSkyScene>);
    } });
  const read = (name: string) => { const node = nodes.get(name); assert(node, name); return evaluate(node, context); };
  const lifecycle = createSkyCanvasLifecycle<any, object>({ measure: done => done({ width, height }), createContext: () => ({}),
    releaseContext() { generation.current++; }, paint: read("paint"), sameScene: read("sameScene"), presented: read("presented"),
    invalidated: read("invalidated"), failed(error) { state.failed = error; } }, clock);
  const frame: any = { data, frameAt: at, nativeImageGeneration: 1, orientationRevision: 0, mode: "NIGHT", sceneReady: true,
    owner: "controlled", inspection: { spotId: "controlled" }, sdssOpticalImage: optical, deepSkyImage: null,
    coordinateGrids: { horizontal: false, equatorial: false }, verticalFovDeg: 2.2 };
  lifecycle.ready();
  const step = () => { const job = [...tasks].find(([, value]) => value.delay === 0); assert(job, "actual request must schedule paint");
    tasks.delete(job[0]); job[1].callback(); };
  return { state, attempts, context, lifecycle, frame, image, generation, pending, picking, step,
    size(w: number, h: number) { width = w; height = h; }, late(callback: () => void) { late = callback; }, fail() { fault = true; },
    request(patch: object = {}) { Object.assign(frame, patch); context.zoomRef.current = frame.verticalFovDeg; lifecycle.request({ ...frame }); },
    paint(patch: object = {}) { this.request(patch); step(); return attempts.at(-1)!; } };
}
function names(h: ReturnType<typeof harness>, page = source) {
  let expression = nodes.get("visibleNamedCatalogObjects")!;
  if (page !== source) {
    const find = (node: ts.Node) => { if (ts.isVariableDeclaration(node) && node.name.getText(page) === "visibleNamedCatalogObjects") expression = node.initializer!; ts.forEachChild(node, find); }; find(page);
  }
  const presented = h.state.presented;
  const bindings = { presentedSkyFrame: presented, presentedSceneCurrent: Boolean(presented), paintedData: presented?.data,
    paintedAt: presented?.frameAt, currentViewBasis: basis, canvasSize: { width: h.picking.current?.width ?? 390, height: h.picking.current?.height ?? 844 },
    presentedFov: h.state.camera?.fov ?? 2.2, presentedCenter: h.state.camera?.center,
    presentedSkyVisibility: h.picking.current, sensorHeadingForScene: null, devicePose: null, mode: "NIGHT",
    sdssOpticalImagePresented: false, deepSkyImagePresented: false, presentedSdssOptical: null,
    resolveSkyDeepSkyScene, resolveSkySceneFrame, projectHorizontalPoint, paintedSkyPointVisible,
    skyStarAppearance, skySolarLightAt, deepSkyAuxiliaryOpacity, skyDeepAuxiliaryDecisionOpacity };
  return vm.runInNewContext(ts.transpileModule(`(${expression.getText(page)})`,
    { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, bindings) as Array<{ reference: string; auxiliaryOpacity: number }>;
}
test("actual pre-aid decisions survive final source retirement and freeze against later mutation", () => {
  const h = harness(), retire = registerSkyNativeImageLifetime(h.image, () => true); h.late(retire);
  const painted = h.paint(); assert.equal(h.state.presented, null); assert.equal(painted.sources.sdssOptical, null);
  const decision = painted.snapshot.deepSkyAuxiliaryDecisions[0]; assert(decision.opacity > 0 && decision.opacity < 1);
  assert.deepEqual(painted.discs, [decision.opacity * .9]);
  assert(Object.isFrozen(painted.snapshot.deepSkyAuxiliaryDecisions)); assert(Object.isFrozen(decision));
  painted.complete(); assert.equal(names(h)[0]?.auxiliaryOpacity, decision.opacity);
  assert.notStrictEqual((h.state as { presented: any }).presented.deepSkyAuxiliaryDecisions, painted.snapshot.deepSkyAuxiliaryDecisions);
  // Exact previously saved production page; no reconstructed historical source.
  const oldPath = process.env.CLOUD_SKY_COMMON_OLD_PAGE_SOURCE;
  if (oldPath) {
    const old = ts.createSourceFile("old-page.tsx", readFileSync(oldPath, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    assert.equal(names(h, old)[0]?.auxiliaryOpacity, 1, "old final-source reconstruction disagrees with actual ring");
    assert.notEqual(names(h, old)[0]?.auxiliaryOpacity, decision.opacity);
  }
});
test("same scene and same sources still accept changed FOV, height and projected membership", () => {
  const h = harness(); h.paint().complete(); const first = h.state.presented;
  h.paint({ verticalFovDeg: 1.7 }).complete(); assert.notStrictEqual(h.state.presented, first);
  assert(h.state.presented.deepSkyAuxiliaryDecisions[0].opacity < first.deepSkyAuxiliaryDecisions[0].opacity);
  const zoomed = h.state.presented; h.size(390, 200); h.lifecycle.resize(); h.paint().complete();
  assert.notEqual(h.state.presented.deepSkyAuxiliaryDecisions[0].opacity, zoomed.deepSkyAuxiliaryDecisions[0].opacity);
  h.size(390, 844); h.lifecycle.resize(); h.paint({ verticalFovDeg: 45 }).complete();
  const wide = h.state.presented; assert.equal(wide.deepSkyAuxiliaryDecisions.length, 2);
  h.size(100, 844); h.lifecycle.resize(); h.paint().complete();
  assert.equal(h.state.presented.deepSkyAuxiliaryDecisions.length, 1);
  assert.equal(h.state.presented.deepSkyAuxiliaryDecisions[0].opacity, wide.deepSkyAuxiliaryDecisions[0].opacity,
    "width changes membership, not the retained height/FOV curve");
  assert(h.picking.current.objects.some((object: any) => object.reference === "M:51"));
});
test("records wait for accepted replacement; hide resize remount and throw reject stale decisions", () => {
  for (const action of ["hide", "resize", "remount", "throw"] as const) {
    const h = harness(); h.paint().complete(); const previous = h.state.presented;
    if (action === "throw") { h.fail(); h.request({ sdssOpticalImage: null }); h.step(); assert(h.state.failed); }
    else {
      const old = h.paint({ sdssOpticalImage: null }); assert.strictEqual(h.state.presented, previous);
      if (action === "hide") h.lifecycle.hide();
      if (action === "resize") h.lifecycle.resize();
      if (action === "remount") { h.lifecycle.setMounted(false); h.lifecycle.setMounted(true); }
      old.complete();
    }
    assert.equal(h.state.presented, null, action); assert.equal(names(h).length, 0, action);
  }
  const h = harness(); h.paint({ verticalFovDeg: .05 }).complete(); assert.equal(names(h).length, 0);
  const retiring = h.paint({ sdssOpticalImage: null }); assert.equal(names(h).length, 0, "no DOM-only restore before Canvas accepts");
  retiring.complete(); assert.equal(names(h)[0]?.auxiliaryOpacity, 1);
});
test("absent ambiguous or invalid records cannot invent a source-derived opacity", () => {
  const h = harness(); h.paint().complete(); const objects = h.picking.current.objects;
  for (const decisions of [undefined, [], [{ reference: "M:51", opacity: NaN }], [{ reference: "M:51", opacity: -1 }],
    [{ reference: "M:51", opacity: 2 }], [{ reference: "M:51", opacity: .5 }, { reference: "M:51", opacity: 1 }]]) {
    h.state.presented.deepSkyAuxiliaryDecisions = decisions; assert.equal(names(h).length, 0);
    assert.strictEqual(h.picking.current.objects, objects, "label compatibility must not remove picking identity");
  }
});

const compile = (file: string, bindings: Record<string, unknown>) => {
  const exports: any = {}; vm.runInNewContext(ts.transpileModule(readFileSync(new URL(file, import.meta.url), "utf8"),
    { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText,
  { exports, require(name: string) { assert(name in bindings, name); return bindings[name]; } }); return exports;
};
test("actual lease onRetire emits new Hook maps and actual page dependencies queue the restoring Scene", async () => {
  const h = harness(), slots: any[] = [], effects: Array<() => void> = [], decoded: SkyArtworkImage[] = [];
  let cursor = 0, dirty = false; const retirements: Array<() => void> = [];
  const equal = (a: unknown[] | undefined, b: unknown[]) => a?.length === b.length && b.every((value, index) => Object.is(value, a![index]));
  const react = {
    useRef(value: unknown) { return slots[cursor++] ??= { current: value }; },
    useState(initial: unknown) { const index = cursor++; if (!(index in slots)) slots[index] = initial; return [slots[index], (value: any) => {
      const next = typeof value === "function" ? value(slots[index]) : value; if (!Object.is(next, slots[index])) { slots[index] = next; dirty = true; } }]; },
    useCallback(value: unknown, deps: unknown[]) { const index = cursor++; if (!equal(slots[index]?.deps, deps)) slots[index] = { value, deps }; return slots[index].value; },
    useMemo(factory: () => unknown, deps: unknown[]) { const index = cursor++; if (!equal(slots[index]?.deps, deps)) slots[index] = { value: factory(), deps }; return slots[index].value; },
    useEffect(effect: () => void | (() => void), deps: unknown[]) { const index = cursor++, previous = slots[index]; if (equal(previous?.deps, deps)) return;
      slots[index] = { deps }; effects.push(() => { previous?.cleanup?.(); slots[index].cleanup = effect(); }); },
  };
  const publication = JSON.parse(readFileSync(new URL("../../../../../workers/miniapp-api/assets/deep-sky/sdss-m51/manifest.json", import.meta.url), "utf8"));
  publication.publicationHash = sdssOpticalPublication("M:51")!.publicationHash;
  const hook = compile("./use-sky-artwork.ts", { react, "@tarojs/taro": { default: {} },
    "@/services/api-client": {}, "../../services/sky-image-file-session": {},
    "./sky-artwork-loader": { createSkyArtworkLoader }, "./sky-artwork-request": { startSkyArtworkRequest },
    "../../services/sky-public-image-runtime": { acquirePublishedSkyImage() {
      let current = true; const handlers = new Set<() => void>();
      retirements.push(() => { current = false; for (const handler of [...handlers]) handler(); });
      return { cancel() {}, promise: Promise.resolve({ filePath: "/controlled/validated-public-lease.jpeg", isCurrent: () => current,
        release() {}, onRetire(handler: () => void) { handlers.add(handler); return () => { handlers.delete(handler); }; } }) };
    } } });
  const sharedOpticalHook = compile("./use-sky-target-optical.ts", { react, "./use-sky-artwork": hook,
    "@/hooks/use-resource-query": { useResourceQuery: () => ({ data: publication, isError: false, isFetching: false }) },
    "@/services/sdss-optical-client": { sdssOpticalImageUrl: (url: string) => url }, "@/services/sdss-science-optical-resource": {},
    "@/services/prepared-optical-client": {}, "@/services/prepared-optical-resource": {},
    "./sky-sdss-optical-selection": { sdssOpticalLevelForFov, skyTargetOpticalLevelForFov }, "./sky-fixed-image-status": { skyFixedImageStatus },
    "./sky-target-optical-visibility": { skyTargetOpticalIntersectsView } });
  const opticalHook = compile("./use-sky-sdss-optical.ts", { "./use-sky-target-optical": sharedOpticalHook });
  const canvas = { createImage() { const image: SkyArtworkImage = { src: "", onload: null, onerror: null, width: 512, height: 512 }; decoded.push(image); return image; } };
  Object.assign(h.context, { useCallback: react.useCallback, useEffect: react.useEffect, skyTargetOpticalFrame,
    skySceneInspectionOwnerRef: { current: "controlled" }, report: { data: { dataState: "FRESH" }, isError: false }, reportData: data,
    devicePose: null, manualBasis: basis, row: { at }, sensorHeadingForScene: null, sensorBasis: null,
    skySceneHasContent: () => true, canvasFrameInfo: { inspection: {} }, canvasLifecycle: h.lifecycle, canvasNodeRevision: 1,
    verticalFovDeg: .05, desiredDeepSkyImageLevel: "DETAIL", canvasDeepSkyImage: null, orientation: { snapshot: { presentationRevision: 0 }, latestPresentation: { current: null }, presented: { current: null } },
    mode: "NIGHT", constellationFrame: null, artwork: { images: new Map() }, constellationsEnabled: false, landscapeEnabled: false,
    coordinateGrids: { horizontal: false, equatorial: false }, hipsTiles: [], stellarSupplement: { frame: null },
    moonTexture: {}, marsTexture: {}, mercuryTexture: {}, jupiterBands: {}, saturnBands: {}, uranusBands: {}, neptuneBands: {}, galacticImage: {},
    landscapeImage: { opacity: 0 }, viewportInsets: {}, previousCanvasModeRef: { current: "NIGHT" },
    activeIndex: 0, activeContext: true, contextComplete: true, nativeCanvasMounted: true });
  let optical: any;
  const render = () => { cursor = 0; dirty = false; optical = opticalHook.useSkySdssOptical("M:51", .05, canvas, 1, true);
    h.context.sdssOptical = optical; h.context.draw = evaluate(nodes.get("draw")!, h.context); evaluate(drawEffect!, h.context); };
  const commit = () => { render(); do { for (const effect of effects.splice(0)) effect(); if (dirty) render(); } while (dirty || effects.length); };
  commit(); await Promise.resolve(); await Promise.resolve(); assert.equal(decoded.length, 2);
  for (const image of decoded) { assert(image.onload); image.onload(); } commit();
  assert(optical.image); h.context.zoomRef.current = .05; h.step(); h.attempts.at(-1)!.complete();
  assert.equal(h.state.presented.deepSkyAuxiliaryDecisions[0].opacity, 0); const saved = h.state.presented;
  for (const retire of retirements) retire(); assert(dirty, "real loader changed setter must invalidate React state");
  commit(); assert.equal(optical.image, null); assert.strictEqual(h.state.presented, saved);
  assert.equal(names(h).length, 0, "retired sources cannot restore DOM over the old Canvas");
  // No manual lifecycle request: actual useCallback dependencies + useEffect queued this paint.
  h.step(); const replacement = h.attempts.at(-1)!; assert.equal(replacement.snapshot.deepSkyAuxiliaryDecisions[0].opacity, 1);
  assert.strictEqual(h.state.presented, saved); replacement.complete(); assert.equal(names(h)[0]?.auxiliaryOpacity, 1);
});
