import { PROCEDURAL_SKY_LANDSCAPE } from "./sky-landscape-mask";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { paintedSkyPointVisible, type SkyPickSnapshot } from "./sky-object-picking";
import { createSkyViewBasis } from "./sky-view-projection";
import { projectSkyConstellationNames } from "./sky-label-presentation";
import {createSkyNameLayouts} from "./sky-name-layout";
import {skyPagePaintCommit, skyPageTimeTestBindings} from "./sky-optical-page-test-support";

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
  const basis = painted.view?.basis ?? createSkyViewBasis(0,135,0)!;
  const presented = presentedSkyFrame as { constellations?: { at?: string } } | null;
  const figures = presented?.constellations?.at === at ? { at, lines: [], images: [],
    labels: [{ iau: "Ori", nameZh: "猎户座", nameEn: "Orion", direction: basis.forward }] } : presented?.constellations;
  return vm.runInNewContext(selection, {
    orientationData: reportData, reportData, rawReportData:reportData, row: { at }, mode: "OBSERVATION", canvasError: null,
    ...skyPageTimeTestBindings(at),
    currentViewBasis: basis, constellationFrame,
    presentedSkyFrame: presentedSkyFrame?{timeGeneration:0,...presentedSkyFrame,constellations:figures,landscape:painted.view?.landscape??null}:null,
    presentedFov: 45, presentedCenter: { x: 195, y: 422 },
    canvasSize: { width: 390, height: 844 }, constellationsEnabled: true,
    viewportInsets:{top:0,bottom:0},
    visibleNamedCatalogObjects: [], visibleOrientationTargets: [],
    paintedSkyPointVisible, paintedSkyObjectsRef: { current: painted },
    projectSkyConstellationNames,
  }) as Array<{ iau: string }>;
}

test("constellation names wait for the current native scene and figure edition", () => {
  assert.deepEqual(Array.from(labels(null), label => label.iau), []);
  assert.deepEqual(Array.from(labels({ data: reportData, frameAt: at, mode: "OBSERVATION",
    constellations: {}, constellationsEnabled: true }), label => label.iau), []);
  assert.deepEqual(Array.from(labels({ data: reportData, frameAt: at, mode: "OBSERVATION",
    constellations: constellationFrame, constellationsEnabled: false }), label => label.iau), []);
  assert.deepEqual(Array.from(labels({ data: reportData, frameAt: at, mode: "OBSERVATION",
    constellations: constellationFrame, constellationsEnabled: true }), label => label.iau), ["Ori"]);
  assert.deepEqual(Array.from(labels({ data: { ...reportData, context:{dataRevision:'previous-report'} }, frameAt:at, mode:"OBSERVATION",
    constellations:constellationFrame, constellationsEnabled:true }), label=>label.iau),[],
    'the previous report cannot expose current constellation names');
});

test("a constellation name covered by the actual virtual foreground returns after an unobstructed repaint", () => {
  const frame = { data: reportData, frameAt: at, mode: "OBSERVATION",
    constellations: constellationFrame, constellationsEnabled: true };
  const view = { basis: createSkyViewBasis(324.462322,100,0)!,verticalFovDeg:85 };
  assert.deepEqual(Array.from(labels(frame,{...openSnapshot,view:{...view,landscape:PROCEDURAL_SKY_LANDSCAPE}}),label=>label.iau),[]);
  assert.deepEqual(Array.from(labels(frame,{...openSnapshot,view:{...view,landscape:null}}),label=>label.iau),["Ori"]);
});

test("ordinary constellation names and their receipt wait for the shared successful-copy reveal",()=>{
  const basis=createSkyViewBasis(0,135,0)!,nameLayouts=createSkyNameLayouts();
  const figures={at,lines:[],images:[],labels:[{iau:'Ori',nameZh:'猎户座',nameEn:'Orion',direction:basis.forward}]};
  let now=1000,presented:any=null;const copies:any[]=[];
  const NativeClock=class extends Date{static now(){return now;}};
  const bindings={basis,nameLayouts,Date:NativeClock,zoomRef:{current:45},
    canvasSurfaceRef:{current:{present(_reticle:any,captions:any){copies.push(captions);}}},
    frame:{data:reportData,frameAt:at,mode:'NIGHT',sceneReady:true,constellations:figures,constellationsEnabled:true},
    setPresentedCamera(){},setPresentedSkyFrame(update:(previous:any)=>any){presented=update(presented);}};
  const snapshot={width:390,height:844,frameAt:at,catalogVersion:'v',catalogHash:'h',
    view:{basis,verticalFovDeg:45,landscape:null},objects:[],namedStars:[]};
  skyPagePaintCommit(source,bindings)(snapshot,{});
  assert.equal(copies[0].length,0,'opacity-zero decoration cannot be submitted as readable text');
  assert.deepEqual(Array.from(presented.constellationNames),[]);
  now=1080;skyPagePaintCommit(source,bindings)(snapshot,{});
  assert.equal(copies[1].length,1);assert.equal(copies[1][0].text,'猎户座');
  assert(copies[1][0].opacity>0&&copies[1][0].opacity<1);
  assert.deepEqual(Array.from(presented.constellationNames),['猎户座']);
  assert.equal(presented.catalogNames.length,0,'decorative text does not grant a catalog hit rectangle');
  now=1200;bindings.frame.constellationsEnabled=false;skyPagePaintCommit(source,bindings)(snapshot,{});
  assert.deepEqual(Array.from(presented.constellationNames),['猎户座'], 'current projected text remains during its fixed exit');
  const exitStart=copies.at(-1)[0].opacity;
  now=1280;skyPagePaintCommit(source,bindings)(snapshot,{});
  assert(copies.at(-1)[0].opacity>0&&copies.at(-1)[0].opacity<exitStart);
  const reversing=copies.at(-1)[0].opacity;
  now=1300;bindings.frame.constellationsEnabled=true;skyPagePaintCommit(source,bindings)(snapshot,{});
  assert.equal(copies.at(-1)[0].opacity,reversing,'re-entry starts from its last accepted opacity');
  now=1500;skyPagePaintCommit(source,bindings)(snapshot,{});
  bindings.frame.constellationsEnabled=false;skyPagePaintCommit(source,bindings)(snapshot,{});
  now=1700;skyPagePaintCommit(source,bindings)(snapshot,{});
  assert.deepEqual(Array.from(presented.constellationNames),[], 'a completed exit retires the receipt');
});
