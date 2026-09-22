import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";
import * as projection from "./sky-view-projection.ts";
import * as stellarScene from "./sky-stellar-scene";
import * as timeFrame from "./sky-time-frame.ts";
import * as zoom from "./sky-zoom.ts";
import * as sceneRender from "./sky-scene-render";
import { projectHorizontalPoint } from "./sky-scene-projection";

// Execute the production drawing function with a recorded native-canvas boundary.
// This establishes call/data selection, not WEAPP rendering or physical pointing.
const source = readFileSync(new URL("./spot-sky-page.tsx", import.meta.url), "utf8").replace(/\r\n/g, "\n");
const code = ts.transpileModule(`${source}\nexport { drawSkyScene };`, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
const exported: Record<string, any> = {};
vm.runInNewContext(code, {
  exports: exported,
  require(name: string) {
    if (name === "./sky-view-projection") return projection;
    if (name === "./sky-time-frame") return timeFrame;
    if (name === "./sky-zoom") return zoom;
    if (name === "./sky-stellar-scene") return stellarScene;
    if (name === "./sky-scene-render") return sceneRender;
    // Other imports belong to the uninvoked page/component lifecycle.
    return {};
  },
}, { timeout: 1000 });

const committed = "2026-09-05T13:00:00.000Z";
test("dome never draws a below-horizon target or its label even when its projection fits the canvas", () => {
  const basis: projection.SkyViewBasis = {right:[1,0,0],up:[0,-1,0],forward:[0,0,1]};
  assert.ok(projection.projectSkyDirection(0,-10,basis,400,800,240), "fixture must expose the former outside-circle target");
  assert.equal(projectHorizontalPoint(0,-10,null,null,400,800,240,basis),null);
  const marks: number[][]=[];
  const context=new Proxy({}, {get:(_o,key)=>key==="disc" ? (...args:number[])=>marks.push(args) : ()=>undefined});
  const data={skyScene:{state:"UNAVAILABLE",frames:[]},targetFrames:[{at:committed,
    targets:[{type:"STAR",direction:"0°",altitudeDeg:-10}]}]};
  exported.drawSkyScene(context,data,committed,null,null,400,800,"NIGHT",undefined,undefined,240,null,basis);
  assert.deepEqual(marks,[]);
});

test("failed GPU submission cannot publish a picking snapshot or successful completion", () => {
  let published=0,completed=0;
  const context=new Proxy({}, {get:(_o,key)=>key==="finish" ? ()=>{throw new Error("native_GL_failure")} : ()=>undefined});
  assert.throws(()=>exported.drawSkyScene(context,undefined,committed,null,null,400,800,"NIGHT",
    ()=>published++,()=>completed++),/native_GL_failure/);
  assert.equal(published,0);assert.equal(completed,0);
});

test("actual page invalidation clears hit testing synchronously before React hides the failed surface", () => {
  const parsed=ts.createSourceFile("sky.tsx",source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  let callback="";
  function visit(node:ts.Node){
    if(ts.isPropertyAssignment(node)&&node.name.getText(parsed)==="invalidated")callback=node.initializer.getText(parsed);
    ts.forEachChild(node,visit);
  }
  visit(parsed);assert.ok(callback);
  const paintedSkyObjectsRef={current:{objects:[{reference:"HR:1"}] } as object|null};
  const invalidated=vm.runInNewContext(ts.transpileModule(`(${callback})`,{compilerOptions:{target:ts.ScriptTarget.ES2020}}).outputText,
    {paintedSkyObjectsRef,setCanvasSize(){}});
  invalidated();assert.equal(paintedSkyObjectsRef.current,null);
});
test("survey imagery uses a celestial plane beyond the camera hemisphere and stays hidden in red mode", () => {
  const basis: projection.SkyViewBasis = {right:[1,0,0],up:[0,0,1],forward:[0,1,0]};
  for (const [azimuth,fov] of [[.4,1.5],[100,240]] as const) {
    let draws=0,affine=0;
    const context=new Proxy({}, {get:(_o,key)=>key === "artwork" ? ()=>{draws++;return true;}
      : key === "image" ? ()=>{affine++;return true;} : ()=>undefined});
    const data={skyScene:{state:"UNAVAILABLE",frames:[],deepSky:{state:"AVAILABLE",
      catalog:{imageRegistration:"ICRS_TAN_NORTH_0_1_V1",entries:[{objectRef:"M:31"}]},
      frames:[{at:committed,state:"AVAILABLE",points:[[0,azimuth,10,azimuth,10.1,(azimuth-.1+360)%360,10]]}]}},targetFrames:[]};
    const image={reference:"M:31",level:"OVERVIEW",fieldDegrees:4,image:{}};
    exported.drawSkyScene(context,data,committed,null,null,390,844,"NIGHT",undefined,undefined,fov,image,basis);
    assert.equal(draws,1,"visible texture is registered on its celestial plane, including the rear camera hemisphere");
    assert.equal(affine,0,"the displaced screen-affine path must be retired");
    exported.drawSkyScene(context,data,committed,null,null,390,844,"OBSERVATION",undefined,undefined,fov,image,basis);
    assert.equal(draws,1,"red mode suppresses imagery at the renderer boundary too");
    let failures=0;
    data.skyScene.deepSky.frames[0]!.points[0]![4]=10;
    exported.drawSkyScene(context,data,committed,null,null,390,844,"NIGHT",undefined,undefined,fov,image,basis,undefined,()=>failures++);
    assert.equal(failures,1,"invalid source registration must be a visible retryable failure, not READY without pixels");
    assert.equal(draws,1);
    delete (data.skyScene.deepSky.catalog as {imageRegistration?:string}).imageRegistration;
    exported.drawSkyScene(context,data,committed,null,null,390,844,"NIGHT",undefined,undefined,fov,image,basis);
    assert.equal(draws,1,"old quantized offline samples cannot masquerade as current registration");
  }
});

test("stereographic anchors may cross the viewport but reject the antipode and invalid geometry", () => {
  const basis: projection.SkyViewBasis = { right: [1, 0, 0], up: [0, 0, 1], forward: [0, 1, 0] };
  assert.equal(projection.projectSkyDirection(0.4, 0, basis, 390, 844, 1.5), null);
  assert.ok(projection.projectSkyDirectionUnclipped(0.4, 0, basis, 390, 844, 1.5)!.x > 390);
  for (const azimuth of [180, Number.NaN])
    assert.equal(projection.projectSkyDirectionUnclipped(azimuth, 0, basis, 390, 844, 1.5), null);
  assert.equal(projection.projectSkyDirectionUnclipped(0, 91, basis, 390, 844, 1.5), null);
  assert.equal(projection.projectSkyDirectionUnclipped(0, 0, basis, 0, 844, 1.5), null);
  assert.equal(projection.projectSkyDirectionUnclipped(0, 0, basis, 390, 844, 360), null);
});

test("production frame requests preserve exact data/time and clear expired or untrusted input", () => {
  const parsed = ts.createSourceFile("sky.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let declaration = "";
  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && node.name.getText(parsed) === "draw") declaration = "const " + node.getText(parsed) + ";";
    ts.forEachChild(node, visit);
  };
  visit(parsed); assert.ok(declaration);
  const requests: { frame: any; hidden: boolean }[] = [];
  const states: string[] = [];
  const data = { skyScene: { state: "AVAILABLE" } };
  const constellationFrame = { at: committed, lines: [], images: [] };
  const artwork = { images: new Map() };
  const pose = { alphaDeg: 0, betaDeg: 90, gammaDeg: 0, headingDeg: 0,
    basis: projection.createSkyViewBasis(0, 90, 0)!, sampledAt: 1 };
  const sandbox = vm.createContext({
    orientation: { snapshot: { presentationRevision: 0 } },
    useCallback: (fn: unknown) => fn,
    skySceneHasContent: stellarScene.skySceneHasContent,
    canvasLifecycle: { request: (frame: unknown, hidden: boolean) => requests.push({ frame, hidden }) },
    canvasDrawRevisionRef: { current: 0 }, skySceneInspectionOwnerRef: { current: "test" },
    previousCanvasModeRef: { current: "NIGHT" }, devicePoseRef: { current: pose },
    reportData: data, report: { data: { dataState: "FRESH" }, isError: false },
    row: { at: committed }, sensorHeadingForScene: 0 as number | null, sensorBasis: pose.basis as projection.SkyViewBasis | null, devicePose: pose as typeof pose | null, mode: "NIGHT",
    verticalFovDeg: 45, canvasDeepSkyImage: null, canvasNodeRevision: 1, viewportInsets: { top:0, bottom:0 },
    constellationFrame, artwork, constellationsEnabled: true,stellarSupplement:{frame:null},
    manualBasis: null, manualBasisRef: { current: null },
    canvasFrameInfo: { catalog: {}, frame: { state: "AVAILABLE", points: [] }, targetFrame: { at: committed, targets: [target(0)] },
      inspection: { spotId: "spot:test", frameAt: committed, catalogVersion: "test", starCount: 0 } },
    publishAcceptanceSkySceneInspection: (_owner: unknown, value: { state: string }) => states.push(value.state),
  });
  const code = ts.transpileModule(declaration + "\nglobalThis.requestDraw = draw;", { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;
  vm.runInContext(code, sandbox);
  const request = () => vm.runInContext("requestDraw()", sandbox);
  request();
  assert.equal(requests.at(-1)!.frame.data, data);
  assert.strictEqual(requests.at(-1)!.frame.constellations, constellationFrame);
  assert.strictEqual(requests.at(-1)!.frame.constellationImages, artwork.images);
  assert.equal(requests.at(-1)!.frame.frameAt, committed);
  assert.equal(requests.at(-1)!.frame.sceneReady, true);
  assert.equal(requests.at(-1)!.hidden, false);
  sandbox.sensorHeadingForScene = null;
  sandbox.sensorBasis = { right: [1, 0, 0], up: [0, -1, 0], forward: [0, 0, 1] };
  sandbox.devicePose = { ...pose, basis: sandbox.sensorBasis };
  request();
  assert.equal(requests.at(-1)!.frame.sceneReady, true, "zenith needs a valid 3D basis, not an azimuth");
  assert.equal(requests.at(-1)!.hidden, false);
  sandbox.sensorBasis = null; request();
  assert.ok(requests.at(-1)!.frame.pose, "compass quality cannot erase valid full attitude or a held view");
  assert.equal(requests.at(-1)!.hidden, false);
  sandbox.sensorBasis = pose.basis; sandbox.devicePose = pose; sandbox.sensorHeadingForScene = 0;
  for (const state of ["EXPIRED", "UNAVAILABLE"]) {
    sandbox.report.data.dataState = state; request();
    assert.equal(requests.at(-1)!.frame.data, undefined);
    assert.equal(requests.at(-1)!.frame.constellations, null);
    assert.equal(requests.at(-1)!.frame.sceneReady, false);
    assert.equal(requests.at(-1)!.hidden, true);
  }
  sandbox.report.data.dataState = "FRESH"; sandbox.report.isError = true; request();
  assert.equal(requests.at(-1)!.frame.data, undefined);
  sandbox.report.isError = false; sandbox.devicePose = null; request();
  assert.equal(requests.at(-1)!.frame.pose, null);
  assert.equal(requests.at(-1)!.frame.heading, null);
  sandbox.devicePose = pose; sandbox.mode = "OBSERVATION"; request();
  assert.equal(requests.at(-1)!.frame.mode, "OBSERVATION");
  assert.equal(requests.at(-1)!.hidden, true, "mode change hides the previous palette until native completion");
  assert.ok(states.every(state => state === "PENDING"), "queueing a draw is not completion evidence");
});

const preview = "2026-09-05T13:20:26.000Z";
const target = (degrees: number) => ({ type: "STAR", direction: `北 ${degrees}°`, altitudeDeg: 10 });
const report = {
  targets: [target(0)],
  targetFrames: [
    { at: committed, targets: [target(0)] },
    { at: preview, targets: [target(5)] },
  ],
  skyScene: { state: "UNAVAILABLE", frames: [] },
};

test("explicit manual basis draws the same celestial target without fabricating device pose", () => {
  const arcs: number[][] = [];
  const context = new Proxy({}, { get: (_object, key) => key === "disc"
    ? (...args: number[]) => arcs.push(args) : () => undefined });
  const basis = projection.createSkyViewBasis(0,90,0)!;
  exported.drawSkyScene(context, report, committed, null, null, 400,800,"NIGHT",undefined,undefined,45,null,basis);
  assert.equal(arcs.length,1);
  const expected = projection.projectSkyDirection(0,10,basis,400,800,45)!;
  assert.ok(Math.abs(arcs[0]![0]!-expected.x)<1e-6 && Math.abs(arcs[0]![1]!-expected.y)<1e-6);
  arcs.length=0;
  exported.drawSkyScene(context, report, committed, null, null, 400,800,"NIGHT");
  assert.equal(arcs.length,0,"no explicit manual mode and no pose must still stay unavailable");
});

function draw(data: unknown, at: string, heading: number | null = 0) {
  const arcs: number[][] = [];
  const context = new Proxy({}, { get: (_object, key) => key === "disc"
    ? (...args: number[]) => arcs.push(args) : () => undefined });
  exported.drawSkyScene(context, data, at, heading,
    { alphaDeg: 0, betaDeg: 90, gammaDeg: 0, headingDeg: 0,
      basis: projection.createSkyViewBasis(0, 90, 0)!, sampledAt: 1 }, 400, 800, "NIGHT");
  return arcs;
}

test("production sky canvas switches exact target frames and restores committed geometry", () => {
  const initial = draw(report, committed);
  const moved = draw(report, preview);
  assert.equal(initial.length, 1);
  assert.equal(moved.length, 1);
  assert.ok(moved[0]![0]! > initial[0]![0]!);
  assert.deepEqual(draw(report, committed), initial);
});

test("production sky canvas never borrows top-level targets for missing or duplicate frames", () => {
  assert.deepEqual(draw(report, "2026-09-05T13:10:00.000Z"), []);
  assert.deepEqual(draw({ ...report, targetFrames: undefined }, committed), []);
  assert.deepEqual(draw({ ...report, targetFrames: [report.targetFrames[0], report.targetFrames[0]] }, committed), []);
  const arcs: number[][] = [];
  const context = new Proxy({}, { get: (_object, key) => key === "disc"
    ? (...args: number[]) => arcs.push(args) : () => undefined });
  exported.drawSkyScene(context, report, committed, null, null, 400, 800, "NIGHT");
  assert.deepEqual(arcs, []);
});

// Isolated resolved-model fixture: publication admission is tested through full HTTP separately.
function singleStarScene(magnitude=2, magnitudeLimit=5) {
  const identity={format:"bsc5p-stellar-geometry-v1",referenceAt:"2000-01-01T12:00:00.000Z",catalogVersion:"bsc5p-bright-stars.v1",catalogHash:"a".repeat(64)};
  const observer={latitude:0,longitude:0,elevationM:0};
  return {format:"stellar-scene-v2",state:"AVAILABLE",observer,
    catalog:{...identity,magnitudeLimit,entries:[{sourceId:"HR:1",objectRef:"HR:1",displayName:"Alpha",magnitude,colorIndex:1}]},
    publication:{...identity,rows:[["HR:1","Alpha",magnitude,1,0,Math.cos(Math.PI/18),Math.sin(Math.PI/18),0,0,0]]},
    frames:[committed,preview].map((at,i)=>{const a=i*5*Math.PI/180;return {at,state:"AVAILABLE",geometry:{...identity,at,observer,
      julianYears:(Date.parse(at)-Date.parse(identity.referenceAt))/(365.25*86400000),
      equatorialToEnu:[Math.cos(a),Math.sin(a),0,-Math.sin(a),Math.cos(a),0,0,0,1]}};})};
}
test("production sky canvas uses the same instant and projection for catalog stars and targets", () => {
  const data = { ...report, skyScene: singleStarScene() };
  for (const at of [committed, preview, committed]) {
    const arcs = draw(data, at);
    assert.equal(arcs.length, 2);
    assert.ok(Math.abs(arcs[0]![0]! - arcs[1]![0]!) < 1e-9);
    assert.ok(Math.abs(arcs[0]![1]! - arcs[1]![1]!) < 1e-9);
  }
  assert.deepEqual(draw(data, "2026-09-05T13:10:00.000Z"), []);
});

test("expanding catalog depth cannot resize or brighten an unchanged star", () => {
  const paint = (magnitudeLimit: number, magnitude: number) => {
    const data = { ...report, targets: [], targetFrames: [{ at: committed, targets: [] }], skyScene: singleStarScene(magnitude, magnitudeLimit) };
    const arcs: Array<{ radius: number; alpha: number }> = [];
    const properties: Record<string, unknown> = {};
    const context = new Proxy(properties, {
      get: (object, key) => key === "disc"
        ? (_x: number, _y: number, radius: number, _color: string, alpha: number) => arcs.push({ radius, alpha })
        : typeof key === "string" && key in object ? object[key] : () => undefined,
    });
    exported.drawSkyScene(context, data, committed, null, null, 400, 800, "NIGHT",
      undefined, undefined, 45, null, projection.createSkyViewBasis(0, 90, 0)!);
    assert.equal(arcs.length, 1, "a visible star must actually reach the canvas");
    return arcs[0]!;
  };
  for (const magnitude of [-1.46, 0, 2, 5]) {
    assert.deepEqual(paint(6.5, magnitude), paint(5, magnitude));
  }
  assert.ok(paint(6.5, 0).radius > paint(6.5, 2).radius);
  assert.ok(paint(6.5, 2).radius > paint(6.5, 5).radius);
});

test("the real renderer reveals and fades a star with zoom and cannot pick the hidden star", () => {
  const data = { ...report, targets: [], targetFrames: [{ at: committed, targets: [] }], skyScene: singleStarScene(6.5, 6.5) };
  const paint = (fov: number) => {
    const arcs: number[][] = [];
    let picked: any;
    const context = new Proxy({}, { get: (_o, key) => key === "disc"
      ? (...args: number[]) => arcs.push(args) : () => undefined });
    exported.drawSkyScene(context, data, committed, null, null, 400, 800, "NIGHT",
      (snapshot: unknown) => { picked = snapshot; }, undefined, fov, null, projection.createSkyViewBasis(0, 100, 0)!);
    return { arcs, picked };
  };
  const overview = paint(200), partial = paint(63), observing = paint(45), enlarged = paint(15), returned = paint(200);
  assert.equal(overview.arcs.length, 0);
  assert.deepEqual(overview.picked.objects, []);
  assert.equal(partial.arcs.length, 1);
  assert.ok(partial.arcs[0]![4]! > 0 && partial.arcs[0]![4]! < observing.arcs[0]![4]!);
  assert.equal(observing.arcs.length, 1);
  assert.equal(observing.picked.objects[0].reference, "HR:1");
  assert.ok(enlarged.arcs[0]![2]! > observing.arcs[0]![2]!, "zoom enhances an existing faint point");
  assert.deepEqual(returned, overview);
});
