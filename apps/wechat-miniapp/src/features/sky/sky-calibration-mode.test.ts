import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

const source = ts.createSourceFile("spot-sky-page.tsx", readFileSync(new URL("./spot-sky-page.tsx", import.meta.url), "utf8"),
  ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let expression: ts.Expression | undefined;
function visit(node: ts.Node) {
  if (ts.isJsxElement(node) && node.openingElement.tagName.getText(source) === "Button") {
    const attrs = node.openingElement.attributes.properties;
    const label = attrs.find(a => ts.isJsxAttribute(a) && a.name.getText(source) === "aria-label");
    const click = attrs.find(a => ts.isJsxAttribute(a) && a.name.getText(source) === "onClick");
    if (label?.getText(source).includes("followRequested") && click && ts.isJsxAttribute(click) &&
      click.initializer && ts.isJsxExpression(click.initializer)) expression = click.initializer.expression;
  }
  ts.forEachChild(node, visit);
}
visit(source);assert(expression);
for (const [name, manualBasis, followRequested] of [["following", null, false], ["manual", {}, false], ["follow pending", {}, true]] as const)
  test(`queued ${name} mode callback preserves calibration and recovers on cancel/confirm`, () => {
    let mode = "auto", enters = 0, stops = 0, starts = 0, requested = false;
    const gesture = {}, skyTapRef: { current: object | null } = { current: gesture };
    const callback = vm.runInNewContext(ts.transpileModule(`(${expression!.getText(source)})`,
      { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, {
      orientationController: { snapshot: () => ({ alignment: { mode } }) }, skyTapRef, manualBasis, followRequested,
      enterManualView() { enters++; }, stopObjectTracking() { stops++; },
      setFollowRequested(value: boolean) { requested = value; }, recoverCompass() { starts++; },
    });
    // This callback belongs to a render before begin(), including its old mode flags.
    mode = "editing"; callback();assert.equal(enters + stops + starts, 0);assert.equal(skyTapRef.current, gesture);assert.equal(requested, false);
    for (const next of ["auto", "aligned"]) { mode = next; callback();assert.equal(skyTapRef.current, null); }
    if (!manualBasis || followRequested) { assert.equal(enters, 2);assert.equal(starts, 0); }
    else { assert.equal(enters, 0);assert.equal(stops, 2);assert.equal(starts, 2);assert.equal(requested, true); }
  });
