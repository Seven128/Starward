import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";
import * as projection from "./sky-view-projection.ts";
import * as timeFrame from "./sky-time-frame.ts";

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
    // Other imports belong to the uninvoked page/component lifecycle.
    return {};
  },
}, { timeout: 1000 });

const committed = "2026-09-05T13:00:00.000Z";
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
  const pose = { alphaDeg: 0, betaDeg: 90, gammaDeg: 0, headingDeg: 0,
    basis: projection.createSkyViewBasis(0, 90, 0)!, sampledAt: 1 };
  const sandbox = vm.createContext({
    orientation: { snapshot: { presentationRevision: 0 } },
    useCallback: (fn: unknown) => fn,
    canvasLifecycle: { request: (frame: unknown, hidden: boolean) => requests.push({ frame, hidden }) },
    canvasDrawRevisionRef: { current: 0 }, skySceneInspectionOwnerRef: { current: "test" },
    previousCanvasModeRef: { current: "NIGHT" }, devicePoseRef: { current: pose },
    reportData: data, report: { data: { dataState: "FRESH" }, isError: false },
    row: { at: committed }, sensorHeadingForScene: 0 as number | null, sensorBasis: pose.basis as projection.SkyViewBasis | null, devicePose: pose as typeof pose | null, mode: "NIGHT",
    verticalFovDeg: 45, canvasDeepSkyImage: null,
    manualBasis: null, manualBasisRef: { current: null },
    canvasFrameInfo: { catalog: {}, frame: { state: "AVAILABLE", points: [] }, targetFrame: {},
      inspection: { spotId: "spot:test", frameAt: committed, catalogVersion: "test", starCount: 0 } },
    publishAcceptanceSkySceneInspection: (_owner: unknown, value: { state: string }) => states.push(value.state),
  });
  const code = ts.transpileModule(declaration + "\nglobalThis.requestDraw = draw;", { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;
  vm.runInContext(code, sandbox);
  const request = () => vm.runInContext("requestDraw()", sandbox);
  request();
  assert.equal(requests.at(-1)!.frame.data, data);
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
  const context = new Proxy({}, { get: (_object, key) => key === "arc"
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
  const context = new Proxy({}, { get: (_object, key) => key === "arc"
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
  const context = new Proxy({}, { get: (_object, key) => key === "arc"
    ? (...args: number[]) => arcs.push(args) : () => undefined });
  exported.drawSkyScene(context, report, committed, null, null, 400, 800, "NIGHT");
  assert.deepEqual(arcs, []);
});

test("production sky canvas uses the same instant and projection for catalog stars and targets", () => {
  const data = { ...report, skyScene: {
    state: "AVAILABLE",
    catalog: {
      catalogVersion: "hipparcos-test-v1",
      catalogHash: "a".repeat(64),
      magnitudeLimit: 5,
      entries: [{ sourceId: "HR:1", objectRef: "HR:1", displayName: "Alpha", magnitude: 2, magnitudeBand: "V", colorIndex: 1, colorIndexBand: "B-V" }],
    },
    frames: [
      { at: committed, state: "AVAILABLE", points: [[0, 0, 10]] },
      { at: preview, state: "AVAILABLE", points: [[0, 5, 10]] },
    ],
  } };
  for (const at of [committed, preview, committed]) {
    const arcs = draw(data, at);
    assert.equal(arcs.length, 2);
    assert.ok(Math.abs(arcs[0]![0]! - arcs[1]![0]!) < 1e-9);
    assert.ok(Math.abs(arcs[0]![1]! - arcs[1]![1]!) < 1e-9);
  }
  assert.deepEqual(draw(data, "2026-09-05T13:10:00.000Z"), []);
});
