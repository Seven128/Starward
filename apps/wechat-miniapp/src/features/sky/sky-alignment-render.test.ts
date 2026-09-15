import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import * as projection from "./sky-view-projection";
import * as timeFrame from "./sky-time-frame";
import { createDirectionAlignment } from "./direction-alignment";

let sourceText = readFileSync(new URL("./spot-sky-page.tsx", import.meta.url), "utf8");
if (process.env.MUTATE_SKY_REFERENCE_FRAME === "1") sourceText = sourceText.replace("frame.orientationRevision !== live.presentationRevision ||", "false ||");
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
}).outputText, { exports: exports_, require: (name: string) => name === "./sky-view-projection" ? projection : name === "./sky-time-frame" ? timeFrame : {} });

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
    const context = new Proxy({}, { get: (_o, key) => key === "arc" ? (...args: number[]) => arcs.push(args) : () => undefined });
    const presented = { current: null as projection.SkyViewBasis | null };
    const paintFrame = vm.runInNewContext(ts.transpileModule(`(${paint});`, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText, {
      orientationController: { snapshot: () => ({ presentationRevision: 3, alignment: alignment.snapshot() }) },
      manualBasisRef: { current: null }, orientation: { presented },
      paintedSkyObjectsRef: { current: null }, drawSkyScene: exports_.drawSkyScene,
    });
    const at = "2026-09-16T13:00:00Z";
    const target = (azimuth: number) => ({ type: "STAR", direction: `北 ${azimuth}°`, altitudeDeg: 10 });
    paintFrame(context, { orientationRevision: 1, data: { skyScene: { state: "UNAVAILABLE", frames: [] },
      targetFrames: [{ at, targets: [target(action === "commit" ? 0 : 90)] }] }, frameAt: at, pose: { basis: stale },
      heading: 0, manualBasis: null, mode: "NIGHT", verticalFovDeg: 45, sceneReady: true }, { width: 400, height: 800 }, () => {});
    const point = projection.projectSkyDirection(action === "commit" ? 0 : 90, 10, expected, 400, 800, 45)!;
    assert.ok(arcs.some(arc => Math.abs(arc[0]! - point.x) < 1e-7 && Math.abs(arc[1]! - point.y) < 1e-7), "the actual renderer must retain the expected celestial target");
    assert.deepEqual(presented.current, expected, "the next calibration freezes what was actually painted");
  }
});
