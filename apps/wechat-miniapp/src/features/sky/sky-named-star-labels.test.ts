import { PROCEDURAL_SKY_LANDSCAPE, type SkyLandscapeMask } from "./sky-landscape-mask";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { skyStarAppearance, createSkyStarAppearance } from "./sky-star-appearance";
import { paintedSkyPointVisible, paintedSkyBoundsVisible, type SkyPickSnapshot } from "./sky-object-picking";
import { createSkyViewBasis } from "./sky-view-projection";
import { resolveSkyDeepSkyScene } from "./sky-stellar-scene";
import { skyPresentedTimeCurrent } from "./sky-observation-time";
import { skySolarLightAt } from "./sky-solar-light";
import { skyDeepAuxiliaryDecisionOpacity } from "./sky-deep-auxiliary-visibility";
import { skyObjectNameOpacity } from "./sky-selection-marker";
import { projectSkyCatalogNames } from "./sky-label-presentation";
import {skyPagePaintCommit} from "./sky-optical-page-test-support";
import {labelInteriorForeground} from "./sky-name-layout-test-support";

// Exercise the page's rendered-label eligibility, including the shared selection owner.
const source = ts.createSourceFile("spot-sky-page.tsx",
  readFileSync(new URL("./spot-sky-page.tsx", import.meta.url), "utf8"),
  ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let initializer: ts.Expression | undefined;
let visibleLabelsInitializer: ts.Expression | undefined;
let presentedSceneInitializer: ts.Expression | undefined;
let visibilityInitializer: ts.Expression | undefined;
function find(node: ts.Node) {
  if (ts.isVariableDeclaration(node) && node.name.getText(source) === "visibleNamedCatalogObjects")
    initializer = node.initializer;
  if (ts.isVariableDeclaration(node) && node.name.getText(source) === "visibleNamedLabels")
    visibleLabelsInitializer = node.initializer;
  if (ts.isVariableDeclaration(node) && node.name.getText(source) === "presentedSceneCurrent")
    presentedSceneInitializer = node.initializer;
  if (ts.isVariableDeclaration(node) && node.name.getText(source) === "presentedSkyVisibility")
    visibilityInitializer = node.initializer;
  ts.forEachChild(node, find);
}
find(source);
assert.ok(initializer);
assert.ok(visibleLabelsInitializer);
assert.ok(presentedSceneInitializer);
assert.ok(visibilityInitializer);
const selection = ts.transpileModule(
  `const presentedSceneCurrent = ${presentedSceneInitializer.getText(source)};
   const paintedData = presentedSceneCurrent ? presentedSkyFrame?.data : undefined;
   const paintedAt = presentedSceneCurrent ? presentedSkyFrame?.frameAt : undefined;
   const presentedSkyVisibility = ${visibilityInitializer.getText(source)};
   const visibleNamedCatalogObjects = ${initializer.getText(source)}; ${visibleLabelsInitializer.getText(source)}`,
  { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
const at = "2026-10-08T12:00:00.000Z";
const entry = { objectRef: "HR:2491", displayName: "Sirius", magnitude: -1.46 };
function labels(sunAltitudeDeg: number, mode: "NIGHT" | "OBSERVATION",
  skySceneReady = true, canvasError: string | null = null,
  presentation: "current" | "old-time" | "old-report" | "old-mode" | "none" = "current",
  starAltitude = 40, deepAltitude: number | null = null, paintedView?: SkyPickSnapshot["view"],
  starLayer: "available" | "catalog-missing" | "frame-unavailable" = "available",
  selectedReference: string | null = null, fov = 45, paintedOpacity?: number,
  viewportInsets = { top: 0, bottom: 0 }) {
  const basis = paintedView?.basis ?? createSkyViewBasis(0, 90 + (deepAltitude ?? 0), 0)!;
  const reportData = { context: {}, hourly: [{ at, sunAltitudeDeg, sunAzimuthDeg: 180 }], skyScene: { catalog: starLayer === "catalog-missing" ? null : { entries: [entry] },
    deepSky: deepAltitude === null ? null : { state: "AVAILABLE", catalog: { entries: [
      { objectRef: "M:31", displayName: "M 31", kind: "GALAXY", magnitude: 3.44 },
    // Keep the scale fixture clear of the independent whole-name edge band.
    ] }, frames: [{ at, state: "AVAILABLE", points: [[0,4,deepAltitude]] }] } } };
  const appearance = skyStarAppearance(entry.magnitude, fov, mode === "OBSERVATION" ? undefined : sunAltitudeDeg,
    mode === "OBSERVATION" ? undefined : starAltitude);
  let presentedSkyFrame:any = presentation === "none" ? null : {
    data: presentation === "old-report" ? {} : reportData,
    frameAt: presentation === "old-time" ? "2026-10-08T13:00:00.000Z" : at,
    mode: presentation === "old-mode" ? (mode === "NIGHT" ? "OBSERVATION" : "NIGHT") : mode,
    landscape: paintedView?.landscape ?? null,
    namedStars: starLayer !== "available" || !appearance || appearance.opacity < .1 ? [] : [{
      reference: entry.objectRef, displayName: entry.displayName, kind: "STAR", magnitude: entry.magnitude,
      x: 195, y: 422, opacity: paintedOpacity ?? appearance.opacity }],
    deepSkyAuxiliaryDecisions: [{ reference: "M:31", opacity: 1 }],
  };
  if (presentedSkyFrame && mode !== "OBSERVATION") {
    const before=presentedSkyFrame;
    const paint=skyPagePaintCommit(source,{basis,zoomRef:{current:fov},reducedMotionRef:{current:true},
      viewportInsetsRef:{current:viewportInsets},objectSelection:{snapshot:()=>({object:selectedReference?{reference:selectedReference}:null})},
      frame:{data:before.data,frameAt:before.frameAt,mode:before.mode,sceneReady:skySceneReady,constellations:null,constellationsEnabled:false},
      setPresentedCamera(){},setPresentedSkyFrame(update:(previous:any)=>any){presentedSkyFrame=update(null);}});
    paint({frameAt:before.frameAt,catalogVersion:"v",catalogHash:"h",width:390,height:844,
      view:{basis,verticalFovDeg:fov,landscape:paintedView?.landscape??null},objects:[],
      namedStars:before.namedStars,deepSkyAuxiliaryDecisions:before.deepSkyAuxiliaryDecisions},{});
  }
  return vm.runInNewContext(selection, {
    reportData, rawReportData: reportData, orientationData: reportData, presentedSkyFrame,
    skyPresentedTimeCurrent, timePlaying: false, timeIntent: { runStartAt: null },
    skySolarLightAt, skyDeepAuxiliaryDecisionOpacity, skyObjectNameOpacity, projectSkyCatalogNames,
    row: { at }, currentViewBasis: basis, canvasSize: { width: 390, height: 844 },
    viewportInsets,
    presentedFov: fov, presentedCenter: { x: 195, y: 422 },
    sensorHeadingForScene: null, devicePose: null, mode, skySceneReady, canvasError,
    selectionState: { object: selectedReference ? { reference: selectedReference } : null },
    starSunAltitudeDeg: mode === "OBSERVATION" ? undefined : sunAltitudeDeg,
    useMemo: (compute: () => unknown) => compute(), createSkyStarAppearance, skyStarAppearance,
    createSkyDirectionProjector: () => ({project: (azimuth: number) => ({ x: azimuth === 160 ? 285 : 195, y: 422 })}),
    resolveSkyDeepSkyScene,
    paintedSkyPointVisible, paintedSkyObjectsRef: { current: { frameAt:at,catalogVersion:"v",catalogHash:"h",
      width:390,height:844,objects:[],...(paintedView?{view:paintedView}:{}) } },
    resolveSkySceneFrame: () => starLayer === "available" ? ({ at, state: "AVAILABLE", points: [[0, 180, starAltitude]] }) : undefined,
    exactSkyTimeFrame: () => deepAltitude === null ? null :
      ({ at, state: "AVAILABLE", points: [[0, 160, deepAltitude]] }),
  }) as Array<{ reference: string; auxiliaryOpacity: number }>;
}

test("automatic catalog names share scale fading while retaining their own painted eligibility", () => {
  const atScale = (fov: number, opacity?: number) => Array.from(labels(-18, "NIGHT", true, null,
    "current", 40, 40, undefined, "available", null, fov, opacity));
  const local = atScale(25), normal = atScale(45), wide = atScale(80);
  assert(local.find(value => value.reference === entry.objectRef)!.auxiliaryOpacity >
    normal.find(value => value.reference === entry.objectRef)!.auxiliaryOpacity);
  assert.deepEqual(wide.map(value => value.reference), [],"automatic deep-sky names must also leave the wide overview");
  assert(local.find(value=>value.reference==="M:31")!.auxiliaryOpacity>
    normal.find(value=>value.reference==="M:31")!.auxiliaryOpacity);
  assert.deepEqual(atScale(25, 0).map(value => value.reference), ["M:31"]);
  assert(atScale(25, .2)[0]!.auxiliaryOpacity < local[0]!.auxiliaryOpacity);
  assert.equal(labels(-18, "NIGHT", true, null, "current", 40, null, undefined, "available", null,
    25, .92, { top: 420, bottom: 0 }).length, 0, "a name cannot float over an opaque control while its star is covered");
});

test("a bright star label follows the same twilight and red-light visibility as the painted star", () => {
  assert.equal(skyStarAppearance(entry.magnitude, 45, 0, 40), null);
  assert.deepEqual(Array.from(labels(0, "NIGHT"), object => object.reference), [],
    "a daylight label cannot open a star whose point was suppressed");
  assert.deepEqual(Array.from(labels(-18, "NIGHT"), object => object.reference), [entry.objectRef]);
  assert.deepEqual(Array.from(labels(0, "OBSERVATION"), object => object.reference), [entry.objectRef],
    "the red-light finding chart keeps its explicit no-twilight behavior");
});

test("a bright name cannot float over the painted virtual scene, including same-frame off recovery", () => {
  const view={basis:createSkyViewBasis(324.462322,100,0)!,verticalFovDeg:85};
  assert.deepEqual(Array.from(labels(-24,"NIGHT",true,null,"current",10,null,{...view,landscape:PROCEDURAL_SKY_LANDSCAPE}),object=>object.reference),[]);
  assert.deepEqual(Array.from(labels(-24,"NIGHT",true,null,"current",10,null,{...view,landscape:null}),object=>object.reference),[entry.objectRef]);
});

test("a label withdraws when the scene has no content or Canvas has failed", () => {
  assert.deepEqual(Array.from(labels(-18, "NIGHT", false), object => object.reference), []);
  assert.deepEqual(Array.from(labels(-18, "NIGHT", true, "sky_canvas_failed"), object => object.reference), []);
  assert.deepEqual(Array.from(labels(-18, "NIGHT"), object => object.reference), [entry.objectRef]);
});

test("a new report, time or mode waits for its own painted frame before showing labels", () => {
  for (const presentation of ["old-time", "old-report", "old-mode", "none"] as const)
    assert.deepEqual(Array.from(labels(-18, "NIGHT", true, null, presentation), object => object.reference), [],
      `${presentation} cannot put a new label over a previous frame`);
  assert.deepEqual(Array.from(labels(-18, "NIGHT"), object => object.reference), [entry.objectRef]);
});

test("horizon and lower-sphere labels follow actual displayed points and effective foreground", () => {
  assert.deepEqual(Array.from(labels(-18, "OBSERVATION", true, null, "current", 0), object => object.reference), [entry.objectRef]);
  assert.deepEqual(Array.from(labels(0, "NIGHT", true, null, "current", 40, 0), object => object.reference), ["M:31"]);
  const basis = createSkyViewBasis(180, 45, 0)!;
  const references = (landscape: SkyLandscapeMask | null) => Array.from(
    labels(-24, "NIGHT", true, null, "current", -45, null,
      { basis, verticalFovDeg: 45, landscape }), object => object.reference);
  assert.deepEqual(references({ kind: "procedural", opacity: 0 }), [entry.objectRef]);
  assert.deepEqual(references(PROCEDURAL_SKY_LANDSCAPE), []);
});

test("independent deep-sky names survive a missing bright catalog or unavailable bright frame", () => {
  for (const starLayer of ["catalog-missing", "frame-unavailable"] as const) {
    assert.deepEqual(Array.from(labels(-18,"NIGHT",true,null,"current",40,40,undefined,starLayer),object=>object.reference),["M:31"],
      `${starLayer} must only withdraw its own names`);
    assert.deepEqual(Array.from(labels(-18,"NIGHT",true,null,"old-time",40,40,undefined,starLayer),object=>object.reference),[],
      "independence cannot bypass the completed frame's time");
    assert.deepEqual(Array.from(labels(-18,"NIGHT",true,"sky_canvas_failed","current",40,40,undefined,starLayer),object=>object.reference),[],
      "a failed surface cannot expose an unpainted name");
  }
});

test("only the selected object's automatic name withdraws, and clearing selection restores it", () => {
  const names = (selectedReference: string | null) => Array.from(
    labels(-18, "NIGHT", true, null, "current", 40, 40, undefined, "available", selectedReference),
    object => object.reference);
  assert.deepEqual(names(null), [entry.objectRef, "M:31"]);
  assert.deepEqual(names(entry.objectRef), ["M:31"], "the star's persistent marker owns its name");
  assert.deepEqual(names("M:31"), [entry.objectRef], "switching to a galaxy restores the independent star name");
  assert.deepEqual(names("HR:7001"), [entry.objectRef, "M:31"], "an off-screen selection cannot suppress another identity");
  assert.deepEqual(names(null), [entry.objectRef, "M:31"], "blank deselection restores the current-frame names");
});

test("actual page copy publishes only the whole name clear of its completed foreground",()=>{
  const width=390,height=844,basis=createSkyViewBasis(0,135,0)!,fov=45;
  const mask=labelInteriorForeground(width,height,{basis,verticalFovDeg:fov},225,398);
  const snapshot:SkyPickSnapshot={width,height,frameAt:at,catalogVersion:'v',catalogHash:'h',
    view:{basis,verticalFovDeg:fov,landscape:mask},objects:[],namedStars:[{
      reference:entry.objectRef,displayName:entry.displayName,kind:'STAR',magnitude:entry.magnitude,
      x:195,y:422,opacity:.8}]};
  assert(paintedSkyPointVisible(snapshot,195,422));assert(!paintedSkyPointVisible(snapshot,225,398));
  let presented:any=null;
  const data={context:{spotId:'spot:bounds'},skyScene:{state:'UNAVAILABLE',catalog:null,frames:[]},hourly:[],targetFrames:[]};
  const paint=skyPagePaintCommit(source,{basis,zoomRef:{current:fov},reducedMotionRef:{current:true},
    frame:{data,frameAt:at,mode:'NIGHT',sceneReady:true,constellations:null,constellationsEnabled:false},
    setPresentedCamera(){},setPresentedSkyFrame(update:(previous:any)=>any){presented=update(null);}});
  paint(snapshot,{});
  assert.equal(presented.catalogNames.length,0,'a covered above-name cannot move sideways to evade the foreground');
  const clearSnapshot={...snapshot,view:{...snapshot.view!,landscape:null}};
  paint(clearSnapshot,{});
  const name=presented.catalogNames[0];assert(name);
  assert.equal(name.reference,entry.objectRef);assert.equal(name.side,'above');
  assert.equal(name.caption.x,195);assert(name.caption.y<422);
  assert.equal(name.caption.text,entry.displayName);assert(paintedSkyBoundsVisible(clearSnapshot,name.bounds));
  assert.equal(name.x,195);assert.equal(name.y,422);
});
