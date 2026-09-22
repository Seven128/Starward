import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";
import vm from "node:vm";

test("decode retry invalidates the failed file while preserving a usable painted image", () => {
  const source = ts.createSourceFile("sky.tsx", readFileSync(new URL("./spot-sky-page.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let handler: ts.ArrowFunction | undefined;
  const visit = (node: ts.Node) => {
    if (ts.isArrowFunction(node)) {
      const body = node.getText(source);
      if (body.includes("setDeepSkyImageAsset(null)") && body.includes("setDeepSkyImageRetry")) handler = node;
    }
    ts.forEachChild(node, visit);
  };
  visit(source); assert.ok(handler);
  const calls: string[] = [];
  const code = ts.transpileModule(`(${handler!.getText(source)})();`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(code, {
    canvasLifecycle: { resize: () => calls.push("canvas-reset") },
    report: { refetch: () => calls.push("report-refresh") },
    setCanvasDeepSkyImage: (value: unknown) => calls.push(`canvas:${String(value)}`),
    setDeepSkyImageAsset: (value: unknown) => calls.push(`asset:${String(value)}`),
    setDeepSkyImageRetry: (update: (value: number) => number) => calls.push(`retry:${update(4)}`),
  });
  assert.deepEqual(calls, ["canvas-reset", "report-refresh", "asset:null", "retry:5"]);
});
