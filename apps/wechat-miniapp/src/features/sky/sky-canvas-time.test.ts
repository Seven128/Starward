import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";
import * as projection from "./sky-view-projection.ts";
import * as timeFrame from "./sky-time-frame.ts";

// Execute the production drawing function with a recorded native-canvas boundary.
// This establishes call/data selection, not WEAPP rendering or physical pointing.
const source = readFileSync(new URL("./spot-sky-page.tsx", import.meta.url), "utf8");
test("production canvas measurement rejects missing dimensions instead of inventing a viewport", () => {
  // Execute the exact measurement boundary; this is not a native layout test.
  const start = source.indexOf("const rect = Array.isArray(result)");
  const end = source.indexOf("setCanvasSize((previous)", start);
  assert.ok(start >= 0 && end > start);
  const measure = (result: unknown) => vm.runInNewContext(
    `(() => { ${source.slice(start, end)} return { width, height }; })()`,
    { result }, { timeout: 1000 },
  );
  for (const result of [null, undefined, [], {}, { width: 0, height: 800 },
    { width: 375, height: -1 }, { width: NaN, height: 800 },
    { width: 375, height: Infinity }, { width: "375", height: 800 }]) {
    assert.throws(() => measure(result), /sky_canvas_measurement_unavailable/);
  }
  for (const size of [{ width: 375, height: 812 }, { width: 812, height: 375 }]) {
    for (const result of [size, [size]]) {
      assert.equal(measure(result).width, size.width);
      assert.equal(measure(result).height, size.height);
    }
  }
});

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
test("production draw invalidates dimensions on failure and restores them on retry", () => {
  const start = source.indexOf("const draw = useCallback(() => {");
  const end = source.indexOf("  }, [\n    mode,", start);
  assert.ok(start >= 0 && end > start);
  const callbackCode = ts.transpileModule(
    `${source.slice(start, end)} }, []); globalThis.retryDraw = draw;`,
    { compilerOptions: { target: ts.ScriptTarget.ES2020 } },
  ).outputText;
  let dimensions = { width: 375, height: 812 };
  let error: string | null = null;
  let measured: unknown = null;
  let throwQuery = false;
  let throwDraw = false;
  let drawn = 0;
  let callback: (result: unknown) => void = () => undefined;
  const states: string[] = [];
  const query = {
    select: () => query,
    boundingClientRect: (next: typeof callback) => { callback = next; return query; },
    exec: () => callback(measured),
  };
  const sandbox = vm.createContext({
    useCallback: (fn: unknown) => fn,
    canvasDrawRequestRef: { current: 0 }, canvasDrawRevisionRef: { current: 0 },
    skySceneInspectionOwnerRef: { current: "test" },
    reportData: undefined, report: {}, row: undefined,
    routeContext: { spotId: "test" }, sensorHeadingForScene: null,
    devicePose: null, mode: "NIGHT", CANVAS_ID: "test",
    exactSkyTimeFrame: timeFrame.exactSkyTimeFrame,
    publishAcceptanceSkySceneInspection: (_owner: unknown, row: { state: string }) => states.push(row.state),
    setCanvasSize: (next: typeof dimensions | ((previous: typeof dimensions) => typeof dimensions)) => {
      dimensions = typeof next === "function" ? next(dimensions) : next;
    },
    setCanvasError: (next: string | null) => { error = next; },
    Taro: {
      createSelectorQuery: () => { if (throwQuery) throw new Error("query_failed"); return query; },
      createCanvasContext: () => ({}),
    },
    drawSkyScene: () => { if (throwDraw) throw new Error("draw_failed"); drawn++; },
  });
  vm.runInContext(callbackCode, sandbox, { timeout: 1000 });
  const retry = () => vm.runInContext("retryDraw()", sandbox, { timeout: 1000 });
  retry();
  assert.equal(dimensions.width, 0);
  assert.equal(dimensions.height, 0);
  assert.equal(error, "sky_canvas_measurement_unavailable");
  assert.equal(drawn, 0);
  assert.equal(states.at(-1), "ERROR");
  measured = { width: 812, height: 375 };
  retry();
  assert.equal(dimensions.width, 812);
  assert.equal(dimensions.height, 375);
  assert.equal(error, null);
  assert.equal(drawn, 1);
  for (const failure of ["query", "draw"]) {
    throwQuery = failure === "query";
    throwDraw = failure === "draw";
    retry();
    assert.equal(dimensions.width, 0);
    assert.equal(dimensions.height, 0);
    assert.equal(states.at(-1), "ERROR");
  }
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

function draw(data: unknown, at: string, heading: number | null = 0) {
  const arcs: number[][] = [];
  const context = new Proxy({}, { get: (_object, key) => key === "arc"
    ? (...args: number[]) => arcs.push(args) : () => undefined });
  exported.drawSkyScene(context, data, at, heading,
    { betaDeg: 90, gammaDeg: 0, sampledAt: 1 }, 400, 800, "NIGHT");
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
  assert.deepEqual(draw(report, committed, null), []);
});

test("production sky canvas uses the same instant and projection for catalog stars and targets", () => {
  const data = { ...report, skyScene: {
    state: "AVAILABLE",
    catalog: { magnitudeLimit: 5.5, entries: [{ gMagnitude: 2, bpRp: 1 }] },
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
