import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

const source = ts.createSourceFile("spot-sky-page.tsx", readFileSync(new URL("./spot-sky-page.tsx", import.meta.url), "utf8"),
  ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const actions = new Map<string, ts.Expression>();
function visit(node: ts.Node) {
  if (ts.isJsxOpeningElement(node) && node.tagName.getText(source) === "Button") {
    const attrs = node.attributes.properties.filter(ts.isJsxAttribute);
    const id = attrs.find(a => a.name.getText(source) === "data-od-id")?.initializer;
    const click = attrs.find(a => a.name.getText(source) === "onClick")?.initializer;
    if (id && ts.isStringLiteral(id) && ["sky-manual-mode", "sky-follow-mode"].includes(id.text) &&
      click && ts.isJsxExpression(click) && click.expression) actions.set(id.text, click.expression);
  }
  ts.forEachChild(node, visit);
}
visit(source);
assert.equal(actions.size, 2);
for (const [name, manualBasis, followRequested] of [["following", null, false], ["manual", {}, false], ["follow pending", {}, true]] as const)
  for (const kind of ["manual", "follow"] as const)
  test(name + " → " + kind + " is explicit and a queued callback preserves a frozen calibration", () => {
    let mode = "auto", enters = 0, stops = 0, starts = 0, requested = false;
    const gesture = {}, skyTapRef: { current: object | null } = { current: gesture };
    const callback = vm.runInNewContext(ts.transpileModule("(" + actions.get("sky-" + kind + "-mode")!.getText(source) + ")",
      { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, {
      orientationController: { snapshot: () => ({ alignment: { mode, ready: true } }) }, skyTapRef,
      manualBasisRef: { current: manualBasis }, manualBasis, followRequested,
      skyTimeIntentCurrent: () => mode !== "editing",
      enterManualView() { enters++; }, stopObjectTracking() { stops++; },
      setFollowRequested(value: boolean) { requested = value; }, recoverCompass() { starts++; },
    });
    mode = "editing"; callback(); assert.equal(enters + stops + starts, 0); assert.equal(skyTapRef.current, gesture); assert.equal(requested, false);
    for (const next of ["auto", "aligned"]) { mode = next; callback(); assert.equal(skyTapRef.current, null); }
    if (kind === "manual") { assert.equal(enters, 2); assert.equal(starts, 0); }
    else if (!manualBasis) { assert.equal(enters + stops + starts, 0, "selecting active follow does not restart its sensor"); }
    else { assert.equal(enters, 0); assert.equal(stops, 2); assert.equal(starts, 2); assert.equal(requested, true); }
  });
