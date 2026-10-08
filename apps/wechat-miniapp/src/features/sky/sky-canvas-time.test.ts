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
import type { SdssOpticalManifest, SkyReport } from "@starward/miniapp-contracts";
import { presentSkyTime } from "./sky-time-presentation";
import { exactSkyObservationFrame, skyEquatorialDirectionToEnu } from "./sky-observation-frame";
import { registerSkyDeepSkyRegion, skyDeepSkyRegionCoordinates } from "./sky-deep-sky-region";
import { skyTargetOpticalFrame } from "./sky-sdss-optical-frame";

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
test("continuous presentation preserves the static catalog center and leaves old missing centers unknown", () => {
  const report = JSON.parse(readFileSync(new URL("../../../../../.codex/work-items/cloud-sky-native-2026-09-22/tmp/current-native-report-2026-10-01.json", import.meta.url), "utf8")).data as SkyReport;
  const pack = JSON.parse(readFileSync(new URL("../../../../../packages/astronomy-core/data/opengc-messier-deep-sky.v1.json", import.meta.url), "utf8"));
  const row = pack.rows.find((value: any) => value.objectRef === "M:51"); assert(row);
  // The cached report predates the optional center contract. Supply only the
  // source-bound catalog field here; never copy the image or time-model center.
  const oldCatalog = report.skyScene.deepSky!.catalog!;
  const catalog = { ...oldCatalog, entries: oldCatalog.entries.map(entry => entry.objectRef === row.objectRef
    ? { ...entry, icrsCenter: { raDeg: row.raDeg, decDeg: row.decDeg } } : entry) };
  const at = "2026-09-30T20:00:15.000Z";
  const current = presentSkyTime({ ...report, skyScene: { ...report.skyScene, deepSky: { ...report.skyScene.deepSky!, catalog } } }, at)!;
  assert.equal(current.mode, "MODEL"); assert.strictEqual(current.report.skyScene.deepSky!.catalog, catalog);
  const entry = catalog.entries.find(value => value.objectRef === "M:51")!;
  const observation = exactSkyObservationFrame(current.report, at); assert(observation);
  const region = registerSkyDeepSkyRegion(entry, observation)!; assert(region); assert.equal(region.frameAt, at);
  const ra = row.raDeg * Math.PI / 180, dec = row.decDeg * Math.PI / 180;
  const center = skyEquatorialDirectionToEnu(observation.equatorialToEnu,
    [Math.cos(dec) * Math.cos(ra), Math.cos(dec) * Math.sin(ra), Math.sin(dec)]);
  assert(Math.hypot(...skyDeepSkyRegionCoordinates(region, center)!) < 1e-9);
  const old = presentSkyTime(report, at)!; assert.equal(old.mode, "MODEL");
  assert.strictEqual(old.report.skyScene.deepSky!.catalog, oldCatalog);
  const missing = oldCatalog.entries.find(value => value.objectRef === "M:51")!;
  assert.equal(missing.icrsCenter, undefined);
  assert.equal(registerSkyDeepSkyRegion(missing, exactSkyObservationFrame(old.report, at)), null,
    "continuous reprojection cannot reconstruct a catalog center from image or model geometry");
});
test("full-sphere browsing draws a below-horizon target only when the actual viewport contains it", () => {
  const basis: projection.SkyViewBasis = {right:[1,0,0],up:[0,-1,0],forward:[0,0,1]};
  const projected = projection.projectSkyDirection(0,-10,basis,400,800,240)!; assert(projected);
  assert.deepEqual(projectHorizontalPoint(0,-10,null,null,400,800,240,basis),projected);
  const marks: number[][]=[];
  const context=new Proxy({}, {get:(_o,key)=>key==="disc" ? (...args:number[])=>marks.push(args) : ()=>undefined});
  const data={skyScene:{state:"UNAVAILABLE",frames:[]},targetFrames:[{at:committed,
    targets:[{type:"STAR",direction:"0°",azimuthDeg:0,altitudeDeg:-10}]}]};
  exported.drawSkyScene(context,data,committed,null,null,400,800,"NIGHT",undefined,undefined,240,null,basis);
  assert.equal(marks.length,1);
  assert(Math.hypot(marks[0]![0]! - projected.x, marks[0]![1]! - projected.y) < 1e-9);
  const away = projection.createSkyViewBasis(180,90,0)!;
  assert.equal(projectHorizontalPoint(0,-10,null,null,400,800,45,away),null);
  marks.length=0;
  exported.drawSkyScene(context,data,committed,null,null,400,800,"NIGHT",undefined,undefined,45,null,away);
  assert.deepEqual(marks,[],"a valid lower-hemisphere coordinate does not bypass the current viewport");
  assert.equal(projectHorizontalPoint(0,-10,null,null,400,800,240),null,"a missing actual view stays unavailable");
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
  const pendingSkyPaintRef={current:{snapshot:paintedSkyObjectsRef.current} as object|null};
  let presented: object|null=paintedSkyObjectsRef.current, size={width:400,height:800};
  const invalidated=vm.runInNewContext(ts.transpileModule(`(${callback})`,{compilerOptions:{target:ts.ScriptTarget.ES2020}}).outputText,
    {paintedSkyObjectsRef,pendingSkyPaintRef,setPresentedSkyFrame(value:object|null){presented=value;},
      setCanvasSize(update:(value:typeof size)=>typeof size){size=update(size);}});
  invalidated();assert.equal(paintedSkyObjectsRef.current,null);
  assert.equal(pendingSkyPaintRef.current,null);assert.equal(presented,null);
  assert.equal(size.width,0);assert.equal(size.height,0);
});
test("survey imagery uses a celestial plane beyond the camera hemisphere and stays hidden in red mode", () => {
  for (const [azimuth,fov] of [[.4,1.5],[100,240]] as const) {
    // Keep the narrow patch at the camera altitude. Rotate the wide camera's
    // long axis into azimuth so the rear-hemisphere patch is actually visible.
    const basis: projection.SkyViewBasis = fov < 2 ? projection.createSkyViewBasis(0,100,0)!
      : {right:[0,0,1],up:[-1,0,0],forward:[0,1,0]};
    assert.ok(projection.projectSkyDirection(azimuth,10,basis,390,844,fov) || fov < 2);
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
  let currentHips: unknown[] = [];
  const readHipsTiles = () => currentHips;
  const sandbox = vm.createContext({
    orientation: { snapshot: { presentationRevision: 0 }, latestPresentation: { current: null } },
    readHipsTiles,
    useCallback: (fn: unknown) => fn,
    skySceneHasContent: stellarScene.skySceneHasContent,
    skyTargetOpticalFrame,
    canvasLifecycle: { request: (frame: unknown, hidden: boolean) => requests.push({ frame, hidden }) },
    canvasDrawRevisionRef: { current: 0 }, skySceneInspectionOwnerRef: { current: "test" },
    previousCanvasModeRef: { current: "NIGHT" }, devicePoseRef: { current: pose },
    reportData: data, report: { data: { dataState: "FRESH" }, isError: false },
    row: { at: committed }, sensorHeadingForScene: 0 as number | null, sensorBasis: pose.basis as projection.SkyViewBasis | null, devicePose: pose as typeof pose | null, mode: "NIGHT",
    verticalFovDeg: 45, desiredDeepSkyImageLevel: null, canvasDeepSkyImage: null, sdssOptical: { image: null, fieldDegrees: null, renderedLevel: null, publication: null }, canvasNodeRevision: 1, viewportInsets: { top:0, bottom:0 },
    constellationFrame, artwork, constellationsEnabled: true,landscapeEnabled:true,stellarSupplement:{frame:null},hipsTiles:[],moonTexture:{image:{id:"moon"}},marsTexture:{image:{id:"mars"}},mercuryTexture:{image:{id:"mercury"}},jupiterBands:{image:{id:"jupiter"}},saturnBands:{image:{id:"saturn"}},uranusBands:{image:{id:"uranus"}},neptuneBands:{image:{id:"neptune"}},galacticImage:{image:{id:"galactic"}},
    coordinateGrids: { horizontal: true, equatorial: false }, landscapeImage: { panorama: null },
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
  assert.equal(requests.at(-1)!.frame.moonTexture.id,"moon");
  assert.equal(requests.at(-1)!.frame.marsTexture.id,"mars");
  assert.equal(requests.at(-1)!.frame.mercuryTexture.id,"mercury");
  assert.equal(requests.at(-1)!.frame.jupiterBands.id,"jupiter");
  assert.equal(requests.at(-1)!.frame.saturnBands.id,"saturn");
  assert.equal(requests.at(-1)!.frame.uranusBands.id,"uranus");
  assert.equal(requests.at(-1)!.frame.neptuneBands.id,"neptune");
  assert.equal(requests.at(-1)!.frame.galacticImage.id,"galactic");
  assert.equal(requests.at(-1)!.frame.frameAt, committed);
  assert.equal(requests.at(-1)!.frame.sceneReady, true);
  assert.equal(requests.at(-1)!.hidden, false);
  assert.strictEqual(requests.at(-1)!.frame.readHipsTiles, readHipsTiles);
  currentHips = [{ id: "ready-after-queued-frame" }];
  assert.strictEqual(requests.at(-1)!.frame.readHipsTiles(), currentHips,
    "the queued native boundary must preserve the live getter rather than freeze its earlier empty snapshot");
  sandbox.orientation.latestPresentation.current = { pose: null };
  request();
  assert.equal(requests.at(-1)!.frame.pose, null,
    "a synchronous native presentation clear overrides the retained React pose");
  assert.equal(requests.at(-1)!.frame.heading, null);
  assert.equal(requests.at(-1)!.frame.sceneReady, false);
  assert.equal(requests.at(-1)!.hidden, true);
  sandbox.orientation.latestPresentation.current = null;
  const sdssPixels = { id: "sdss-M51" };
  // Already-admitted structural loader state, as in sky-sdss-optical-frame's
  // legacy handoff control. The real owner needs exact descriptor identities.
  const publication = { objectRef: "M:51", publicationHash: "a".repeat(64),
    levels: { DETAIL: { fieldDegrees: .05688888888888889 }, MEDIUM: { fieldDegrees: .1137777778 } } } as SdssOpticalManifest;
  sandbox.sdssOptical = { image: sdssPixels, renderedLevel: "DETAIL", renderedAsset: publication.levels.DETAIL,
    publication, coarser: { image: { id: "sdss-parent" }, level: "MEDIUM", asset: publication.levels.MEDIUM } };
  request();
  assert.strictEqual(requests.at(-1)!.frame.sdssOpticalImage.image, sdssPixels,
    "the current native frame, rather than only the source label, must consume optical pixels");
  assert.equal(requests.at(-1)!.frame.sdssOpticalImage.reference, sandbox.sdssOptical.publication.objectRef);
  assert.equal(requests.at(-1)!.frame.sdssOpticalImage.publicationHash, sandbox.sdssOptical.publication.publicationHash);
  assert.strictEqual(requests.at(-1)!.frame.sdssOpticalImage.coarser.image,sandbox.sdssOptical.coarser.image,
    "the real queued frame must deliver the parent's pixels with its own admitted descriptor");
  assert.equal(requests.at(-1)!.frame.sdssOpticalImage.coarser.fieldDegrees,publication.levels.MEDIUM.fieldDegrees);
  assert.equal(requests.at(-1)!.frame.sdssOpticalImage.coarser.level,"MEDIUM");
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
    assert.equal(requests.at(-1)!.frame.sdssOpticalImage, null);
    assert.equal(requests.at(-1)!.frame.readHipsTiles, undefined);
    assert.equal(requests.at(-1)!.frame.hipsTiles.length, 0);
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
  assert.equal(requests.at(-1)!.frame.sdssOpticalImage, null);
  assert.equal(requests.at(-1)!.hidden, true, "mode change hides the previous palette until native completion");
  assert.ok(states.every(state => state === "PENDING"), "queueing a draw is not completion evidence");
});

const preview = "2026-09-05T13:20:26.000Z";
const target = (degrees: number) => ({ type: "STAR", direction: `北 ${degrees}°`, azimuthDeg: degrees, altitudeDeg: 10 });
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
function singleStarScene(magnitude=2, magnitudeLimit=5, colorIndex: number | null = 1) {
  const identity={format:"bsc5p-stellar-geometry-v1",referenceAt:"2000-01-01T12:00:00.000Z",catalogVersion:"bsc5p-bright-stars.v1",catalogHash:"a".repeat(64)};
  const observer={latitude:0,longitude:0,elevationM:0};
  return {format:"stellar-scene-v2",state:"AVAILABLE",observer,
    catalog:{...identity,magnitudeLimit,entries:[{sourceId:"HR:1",objectRef:"HR:1",displayName:"Alpha",magnitude,colorIndex}]},
    publication:{...identity,rows:[["HR:1","Alpha",magnitude,colorIndex,0,Math.cos(Math.PI/18),Math.sin(Math.PI/18),0,0,0]]},
    frames:[committed,preview].map((at,i)=>{const a=i*5*Math.PI/180;return {at,state:"AVAILABLE",geometry:{...identity,at,observer,
      julianYears:(Date.parse(at)-Date.parse(identity.referenceAt))/(365.25*86400000),
      equatorialToEnu:[Math.cos(a),Math.sin(a),0,-Math.sin(a),Math.cos(a),0,0,0,1]}};})};
}
test("published B-V gives a continuous star tint while missing photometry stays neutral", () => {
  const paint = (colorIndex: number | null, mode: "NIGHT" | "OBSERVATION" = "NIGHT") => {
    const data = {...report, targets: [], targetFrames: [{at: committed, targets: []}],
      skyScene: singleStarScene(0, 5, colorIndex)};
    const colors: string[] = [];
    const context = new Proxy({}, {get: (_object, key) => key === "disc"
      ? (_x: number, _y: number, _radius: number, color: string) => colors.push(color) : () => undefined});
    exported.drawSkyScene(context, data, committed, null, null, 400, 800, mode,
      undefined, undefined, 45, null, projection.createSkyViewBasis(0, 90, 0)!);
    assert.equal(colors.length, 1);
    return colors[0]!;
  };
  // Catalog values: Vega 0, Arcturus 1.23, Betelgeuse 1.85.
  const cool = paint(0), warm = paint(1.23), red = paint(1.85);
  assert.notEqual(cool, warm);
  assert.notEqual(warm, red);
  assert.equal(paint(null), "#DCE4EF");
  assert.equal(paint(0, "OBSERVATION"), paint(1.85, "OBSERVATION"));
  const channelDistance = (a: string, b: string) => Math.max(...[1, 3, 5].map(offset =>
    Math.abs(parseInt(a.slice(offset, offset + 2), 16) - parseInt(b.slice(offset, offset + 2), 16))));
  assert.ok(channelDistance(paint(0.49), paint(0.51)) <= 3,
    "nearby catalogue values should not jump at the former blue/white cutoff");
  assert.ok(channelDistance(paint(1.49), paint(1.51)) <= 3,
    "nearby catalogue values should not jump at the former white/orange cutoff");
});
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

test("the exact Sun frame fades catalog stars and their touch targets through twilight", () => {
  const paint = (sunAltitudeDeg: number, mode: "NIGHT" | "OBSERVATION") => {
    const data = {
      ...report,
      targets: [],
      targetFrames: [{ at: committed, targets: [] }],
      skyScene: singleStarScene(2),
      hourly: [{ at: committed, sunAzimuthDeg: 90, sunAltitudeDeg }],
    };
    const stars: number[][] = [];
    let picked: { objects: Array<{ reference: string }> } | undefined;
    const context = new Proxy({}, { get: (_object, key) => key === "disc"
      ? (...args: number[]) => stars.push(args) : () => undefined });
    exported.drawSkyScene(context, data, committed, null, null, 400, 800, mode,
      (snapshot: typeof picked) => { picked = snapshot; }, undefined, 45, null,
      projection.createSkyViewBasis(0, 90, 0)!);
    return { stars, picked };
  };
  assert.equal(paint(0, "NIGHT").stars.length, 0);
  assert.deepEqual(paint(0, "NIGHT").picked?.objects, []);
  assert.equal(paint(-6, "NIGHT").stars.length, 0);
  assert.equal(paint(-12, "NIGHT").stars.length, 1);
  assert.equal(paint(-18, "NIGHT").picked?.objects[0]?.reference, "HR:1");
  assert.equal(paint(0, "OBSERVATION").picked?.objects[0]?.reference, "HR:1",
    "red observation mode remains a chart for deliberate object lookup");
});

test("BSC and SAO use the same reference low-altitude attenuation for painting and picking", () => {
  const paint = (altitudeDeg: number, mode: "NIGHT" | "OBSERVATION") => {
    const scene = singleStarScene(1);
    scene.publication.rows[0] = ["HR:1", "Alpha", 1, 1, 0,
      Math.cos(altitudeDeg * Math.PI / 180), Math.sin(altitudeDeg * Math.PI / 180), 0, 0, 0];
    const data = { ...report, skyScene: scene, targets: [], targetFrames: [{ at: committed, targets: [] }],
      hourly: [{ at: committed, sunAzimuthDeg: 90, sunAltitudeDeg: -25 }] };
    const supplement = { publicationHash: "b".repeat(64), catalogVersion: "sao-test",
      geometry: scene.frames[0]!.geometry,
      points: [["SAO:1", 1, 0, altitudeDeg]] };
    const stars: number[][] = [];
    let picked: { objects: Array<{ reference: string }> } | undefined;
    const context = new Proxy({}, { get: (_object, key) => key === "disc"
      ? (...args: number[]) => stars.push(args) : () => undefined });
    exported.drawSkyScene(context, data, committed, null, null, 400, 800, mode,
      (snapshot: typeof picked) => { picked = snapshot; }, undefined, 180, null,
      projection.createSkyViewBasis(0, 135, 0)!, undefined, undefined, undefined, supplement);
    return { stars, references: picked?.objects.map((entry) => entry.reference) };
  };
  const high = paint(80, "NIGHT"), low = paint(0.1, "NIGHT"), red = paint(0.1, "OBSERVATION");
  assert.equal(high.stars.length, 2);
  assert.equal(low.stars.length, 2);
  assert.ok(high.stars.every((star) => star[4]! > 0.8));
  assert.ok(low.stars.every((star) => star[4]! < 0.1));
  assert.deepEqual(high.references?.sort(), ["HR:1", "SAO:1"]);
  assert.deepEqual(low.references, [], "subpixel low stars are not invisible touch targets");
  assert.deepEqual(red.references?.sort(), ["HR:1", "SAO:1"],
    "red observation mode remains a deliberate chart at the same altitude");
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
