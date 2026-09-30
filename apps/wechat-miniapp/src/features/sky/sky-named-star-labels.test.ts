import { PROCEDURAL_SKY_LANDSCAPE } from "./sky-landscape-mask";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { skyStarAppearance } from "./sky-star-appearance";
import { paintedSkyPointVisible, type SkyPickSnapshot } from "./sky-object-picking";
import { createSkyViewBasis } from "./sky-view-projection";
import { resolveSkyDeepSkyScene } from "./sky-stellar-scene";

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
  selectedReference: string | null = null) {
  const basis = paintedView?.basis ?? { forward: [0, 1, 0], right: [1, 0, 0], up: [0, 0, 1] };
  const reportData = { skyScene: { catalog: starLayer === "catalog-missing" ? null : { entries: [entry] },
    deepSky: deepAltitude === null ? null : { state: "AVAILABLE", catalog: { entries: [
      { objectRef: "M:31", displayName: "Andromeda Galaxy", kind: "GALAXY", magnitude: 3.44 },
    ] }, frames: [{ at, state: "AVAILABLE", points: [[0,160,deepAltitude]] }] } } };
  const presentedSkyFrame = presentation === "none" ? null : {
    data: presentation === "old-report" ? {} : reportData,
    frameAt: presentation === "old-time" ? "2026-10-08T13:00:00.000Z" : at,
    mode: presentation === "old-mode" ? (mode === "NIGHT" ? "OBSERVATION" : "NIGHT") : mode,
    landscape: paintedView?.landscape ?? null,
  };
  return vm.runInNewContext(selection, {
    reportData, orientationData: reportData, presentedSkyFrame,
    row: { at }, currentViewBasis: basis, canvasSize: { width: 390, height: 844 },
    presentedFov: 45, presentedCenter: { x: 195, y: 422 },
    sensorHeadingForScene: null, devicePose: null, mode, skySceneReady, canvasError,
    selectionState: { object: selectedReference ? { reference: selectedReference } : null },
    starSunAltitudeDeg: mode === "OBSERVATION" ? undefined : sunAltitudeDeg,
    skyStarAppearance,
    resolveSkyDeepSkyScene,
    paintedSkyPointVisible, paintedSkyObjectsRef: { current: { frameAt:at,catalogVersion:"v",catalogHash:"h",
      width:390,height:844,objects:[],...(paintedView?{view:paintedView}:{}) } },
    resolveSkySceneFrame: () => starLayer === "available" ? ({ at, state: "AVAILABLE", points: [[0, 180, starAltitude]] }) : undefined,
    exactSkyTimeFrame: () => deepAltitude === null ? null :
      ({ at, state: "AVAILABLE", points: [[0, 160, deepAltitude]] }),
    projectHorizontalPoint: (azimuth: number) => ({ x: azimuth === 160 ? 285 : 195, y: 422 }),
  }) as Array<{ reference: string }>;
}

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

test("horizon-edge star and deep-sky labels follow the painter's strictly above-horizon rule", () => {
  assert.deepEqual(Array.from(labels(-18, "OBSERVATION", true, null, "current", 0), object => object.reference), []);
  assert.deepEqual(Array.from(labels(0, "NIGHT", true, null, "current", 40, 0), object => object.reference), []);
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
