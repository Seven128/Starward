import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

// Execute the production controls and queued-frame comparison. Geometry and
// actual scene effects are checked separately through drawSkyScene.
const source = ts.createSourceFile("spot-sky-page.tsx", readFileSync(new URL("./spot-sky-page.tsx", import.meta.url), "utf8"),
  ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const buttons: ts.JsxOpeningElement[] = [];
let sameScene: ts.Expression | undefined, queued: ts.Expression | undefined, painted: ts.Expression | undefined;
function find(node: ts.Node) {
  if (ts.isJsxOpeningElement(node) && node.tagName.getText(source) === "Button" &&
    node.attributes.getText(source).includes("setCoordinateGrids")) buttons.push(node);
  if (ts.isPropertyAssignment(node) && node.name.getText(source) === "sameScene") sameScene = node.initializer;
  if (ts.isCallExpression(node) && node.expression.getText(source) === "canvasLifecycle.request") {
    const property = (node.arguments[0] as ts.ObjectLiteralExpression).properties.find(property => property.name?.getText(source) === "coordinateGrids");
    if (property && ts.isShorthandPropertyAssignment(property)) queued = property.name;
    else if (property && ts.isPropertyAssignment(property)) queued = property.initializer;
  }
  if (ts.isCallExpression(node) && node.expression.getText(source) === "drawSkyScene") painted = node.arguments[35];
  ts.forEachChild(node, find);
}
find(source);
assert.equal(buttons.length, 2);
assert.ok(sameScene && queued && painted);
function execute(expression: ts.Expression | string, bindings: object) {
  return vm.runInNewContext(ts.transpileModule(`(${typeof expression === "string" ? expression : expression.getText(source)})`,
    { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, bindings);
}
function attribute(button: ts.JsxOpeningElement, name: string) {
  const value = button.attributes.properties.find(property => ts.isJsxAttribute(property) && property.name.getText(source) === name) as ts.JsxAttribute;
  assert.ok(value && value.initializer && ts.isJsxExpression(value.initializer) && value.initializer.expression);
  return value.initializer.expression;
}

test("independent page controls change the actual queued and painted grid state without superseding each other", () => {
  let coordinateGrids = { horizontal: true, equatorial: false };
  const change = (button: ts.JsxOpeningElement) => execute(attribute(button, "onClick"), {
    setCoordinateGrids: (update: (value: typeof coordinateGrids) => typeof coordinateGrids) => { coordinateGrids = update(coordinateGrids); },
  })();
  change(buttons[0]!);
  assert.deepEqual({ ...coordinateGrids }, { horizontal: false, equatorial: false });
  change(buttons[1]!);
  assert.deepEqual({ ...coordinateGrids }, { horizontal: false, equatorial: true });
  change(buttons[0]!);
  assert.deepEqual({ ...coordinateGrids }, { horizontal: true, equatorial: true });
  const frame = { coordinateGrids: execute(queued!.getText(source), { coordinateGrids }) };
  assert.equal(execute(painted!, { frame }), coordinateGrids);
  const compare = execute(sameScene!, {});
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
