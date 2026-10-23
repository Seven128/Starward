import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { skyMenuProps } from "./sky-menu-test-support";
import { disclosureFixture } from "./sky-disclosure-test-support";
import {skyPageSceneTestDependencies,skyPageSceneInputMember} from "./sky-optical-page-test-support";

// Execute the production controls and queued-frame comparison. Geometry and
// actual scene effects are checked separately through drawSkyScene.
const source = ts.createSourceFile("spot-sky-page.tsx", readFileSync(new URL("./spot-sky-page.tsx", import.meta.url), "utf8"),
  ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const menu = skyMenuProps(source);
const buttons = ["方位网格", "星空坐标"].map(name => { const props = menu.layers.get(name); assert(props); return props; });
let sameScene: ts.Expression | undefined, queued: ts.Expression | undefined, painted: ts.Expression | undefined;
function find(node: ts.Node) {

  if (ts.isPropertyAssignment(node) && node.name.getText(source) === "sameScene") sameScene = node.initializer;
  if (ts.isCallExpression(node) && node.expression.getText(source) === "canvasLifecycle.request") {
    const property = (node.arguments[0] as ts.ObjectLiteralExpression).properties.find(property => property.name?.getText(source) === "coordinateGrids");
    if (property && ts.isShorthandPropertyAssignment(property)) queued = property.name;
    else if (property && ts.isPropertyAssignment(property)) queued = property.initializer;
  }
  if (ts.isCallExpression(node) && node.expression.getText(source) === "drawSkyScene") painted = skyPageSceneInputMember(source,["layers","coordinateGrids"]);
  ts.forEachChild(node, find);
}
find(source);
assert.equal(buttons.length, 2);
assert.ok(sameScene && queued && painted);
function execute(expression: ts.Expression | string, bindings: object) {
  return vm.runInNewContext(ts.transpileModule(`(${typeof expression === "string" ? expression : expression.getText(source)})`,
    { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, bindings);
}
function attribute(button: ts.JsxAttributes, name: string) {
  return menu.expression(button, name === "aria-pressed" ? "selected" : name);
}

test("independent page controls change the actual queued and painted grid state without superseding each other", () => {
  let coordinateGrids = { horizontal: true, equatorial: false };
  let displayCurrent = true;
  // The controls/recovery fixture checks the real Context/time/lifecycle guard.
  // This boundary verifies that these exact grid callbacks obey its live result.
  const actions = buttons.map(button => execute(attribute(button, "onClick"), {
    skyDisplayCurrent: () => displayCurrent, skyDisclosures: disclosureFixture("layers").commands,
    setCoordinateGrids: (update: (value: typeof coordinateGrids) => typeof coordinateGrids) => { coordinateGrids = update(coordinateGrids); },
  }));
  actions[0]!();
  assert.deepEqual({ ...coordinateGrids }, { horizontal: false, equatorial: false });
  actions[1]!();
  assert.deepEqual({ ...coordinateGrids }, { horizontal: false, equatorial: true });
  actions[0]!();
  assert.deepEqual({ ...coordinateGrids }, { horizontal: true, equatorial: true });
  displayCurrent = false;
  actions[0]!();
  actions[1]!();
  assert.deepEqual({ ...coordinateGrids }, { horizontal: true, equatorial: true }, "retained callbacks obey the current display guard");
  const frame = { coordinateGrids: execute(queued!.getText(source), { coordinateGrids }) };
  assert.equal(execute(painted!, { frame }), coordinateGrids);
  const compare = execute(sameScene!, skyPageSceneTestDependencies);
  const completed = { ...frame, inspection: { spotId: "formal-example" } };
  assert.equal(compare(completed, { ...completed }), true);
  assert.equal(compare(completed, { ...completed, coordinateGrids: { horizontal: false, equatorial: true } }), false);
});

test("calibration locks both controls and a missing exact frame prevents new equatorial selection without trapping an existing choice", () => {
  const bindings = { coordinateGrids: { horizontal: false, equatorial: false }, coordinateGridFrame: null, alignmentEditing: false };
  assert.equal(execute(attribute(buttons[0]!, "disabled"), bindings), false);
  assert.equal(execute(attribute(buttons[1]!, "disabled"), bindings), true);
  assert.equal(execute(attribute(buttons[1]!, "disabled"), { ...bindings, coordinateGrids: { equatorial: true } }), false);
  for (const button of buttons) {
    assert.equal(execute(attribute(button, "disabled"), { ...bindings, alignmentEditing: true }), true);
    assert.equal(execute(attribute(button, "aria-pressed"), bindings), false);
  }
});
