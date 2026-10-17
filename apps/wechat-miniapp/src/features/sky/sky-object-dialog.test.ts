import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const source = ts.createSourceFile("sky-object-dialog.tsx", readFileSync(new URL("./sky-object-dialog.tsx", import.meta.url), "utf8"),
  ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let expression: ts.Expression | undefined;
function visit(node: ts.Node) {
  if (ts.isVariableDeclaration(node) && node.name.getText(source) === "measureHeader") expression = node.initializer;
  ts.forEachChild(node, visit);
}
visit(source); assert.ok(expression);
const code = ts.transpileModule(expression.getText(source), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;

test("modal header observation retires superseded, hidden and unmounted native callbacks", () => {
  const ticks: (() => void)[] = [], replies: ((value: unknown[]) => void)[] = [], heights: number[] = [];
  const mounted = { current: true }, visible = { current: true }, revision = { current: 0 };
  const query = { select: () => query, boundingClientRect: () => query, exec: (callback: (value: unknown[]) => void) => replies.push(callback) };
  const measure = vm.runInNewContext(code, { mounted, visible, revision, useCallback: (fn: unknown) => fn,
    setHeaderHeight: (height: number) => heights.push(height), Taro: { nextTick: (fn: () => void) => ticks.push(fn), createSelectorQuery: () => query } });
  measure(); measure(); ticks.shift()!(); assert.equal(replies.length, 0, "an obsolete render cannot query the current dialog");
  ticks.shift()!(); replies.shift()!([{ height: 70 }]); assert.equal(heights.length, 1);
  for (const boundary of ["hide", "unmount", "new-title"] as const) {
    measure(); ticks.shift()!(); const reply = replies.shift()!;
    if (boundary === "hide") visible.current = false;
    if (boundary === "unmount") mounted.current = false;
    if (boundary === "new-title") measure();
    reply([{ height: 120 }]); assert.equal(heights.length, 1, boundary);
    visible.current = mounted.current = true;
    if (boundary === "new-title") ticks.shift()!();
  }
  replies.shift()!([{ height: 120 }]); assert.equal(heights.length, 2, "the replacement dialog may accept its own measurement");
  measure(); visible.current = false; ticks.shift()!(); assert.equal(replies.length, 0, "hide before nextTick cannot query another route");
});
