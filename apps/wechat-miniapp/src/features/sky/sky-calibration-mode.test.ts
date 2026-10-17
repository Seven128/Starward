import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

const source = ts.createSourceFile("spot-sky-page.tsx", readFileSync(new URL("./spot-sky-page.tsx", import.meta.url), "utf8"),
  ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let props: ts.JsxAttributes | undefined;
function visit(node: ts.Node) {
  if (ts.isJsxSelfClosingElement(node) && node.tagName.getText(source) === "SkyBrowseControl") props = node.attributes;
  ts.forEachChild(node, visit);
}
visit(source); assert(props);
function callback(name: string, scope: object) {
  const prop = props!.properties.find(node => ts.isJsxAttribute(node) && node.name.getText(source) === name) as ts.JsxAttribute;
  assert(prop?.initializer && ts.isJsxExpression(prop.initializer) && prop.initializer.expression);
  return vm.runInNewContext(ts.transpileModule("(" + prop.initializer.expression.getText(source) + ")",
    { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, scope);
}

for (const [name, manual, pending, editing] of [["following", false, false, false], ["manual", true, false, false],
  ["follow pending", true, true, false], ["calibration", false, false, true]] as const)
  test(name + ": current browse toggle preserves the painted camera and changes explicit intent", () => {
    let visible = true, saving = false, busy = false;
    const basis = {}, calls: unknown[] = [];
    const action = callback("onToggle", {
      skyPageVisibleCurrent: () => visible, get timeSaving() { return saving; }, contextSession: {get busy() { return busy; }},
      paintedSkyObjectsRef: {current: {view: {basis}}}, orientation: {presented: {current: {}}}, INITIAL_MANUAL_SKY_VIEW: {},
      manualBasisRef: {current: manual ? {} : null}, followRequested: pending,
      orientationController: {snapshot: () => ({alignment: {mode: editing ? "editing" : "auto"}})},
      cancelSkyCalibration: () => calls.push("cancel"), setSkyControlPanel: (panel: string) => calls.push(panel),
      enterManualView: (view: object) => calls.push(view), stopObjectTracking: () => calls.push("stop"),
      setFollowRequested: (value: boolean) => calls.push(value), recoverCompass: () => calls.push("recover"),
    });
    visible = false; action(); visible = true; saving = true; action(); saving = false; busy = true; action(); busy = false;
    assert.deepEqual(calls, [], "queued input cannot act after hide or during a Context update");
    action();
    assert.deepEqual(calls, !manual || pending || editing ? ["cancel", "menu", basis] : ["cancel", "menu", "stop", true, "recover"]);
  });

test("the current calibration sidecar invokes the existing scoped start and completion owners", () => {
  for (const editing of [false, true]) {
    const calls: string[] = [];
    callback("onCalibrate", {alignmentEditing: editing, finishSkyCalibration: (kind: string) => calls.push(kind),
      setSkyControlPanel: (panel: string) => calls.push(panel), beginSkyCalibration: () => calls.push("begin")})();
    assert.deepEqual(calls, editing ? ["commit"] : ["calibration", "begin"]);
  }
});
