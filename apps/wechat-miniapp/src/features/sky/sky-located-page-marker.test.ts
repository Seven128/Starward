import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const source = ts.createSourceFile("spot-sky-page.tsx",
  readFileSync(new URL("./spot-sky-page.tsx", import.meta.url), "utf8"),
  ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let markerCondition: ts.Expression | undefined;
let presentedCondition: ts.Expression | undefined;
let touchStartCondition: ts.Expression | undefined;
let touchEndCondition: ts.Expression | undefined;
function visit(node: ts.Node) {
  if (ts.isVariableDeclaration(node) && node.name.getText(source) === "presentedSceneCurrent")
    presentedCondition = node.initializer;
  if (ts.isJsxExpression(node) && node.expression && ts.isConditionalExpression(node.expression) &&
    node.expression.condition.getText(source).includes("selectionState.object") &&
    node.expression.whenTrue.getText(source).includes("SkySelectedObject"))
    markerCondition = node.expression.condition;
  if (ts.isVariableDeclaration(node) && node.name.getText(source) === "onSkyTouchStart" &&
    node.initializer && ts.isArrowFunction(node.initializer) && ts.isBlock(node.initializer.body)) {
    const entryGuard = node.initializer.body.statements.find(statement => ts.isIfStatement(statement) &&
      statement.expression.getText(source).includes("!presentedSceneCurrent"));
    touchStartCondition = entryGuard && ts.isIfStatement(entryGuard) ? entryGuard.expression : undefined;
  }
  if (ts.isVariableDeclaration(node) && node.name.getText(source) === "onSkyTouchEnd" &&
    node.initializer && ts.isArrowFunction(node.initializer) && ts.isBlock(node.initializer.body)) {
    const guard = node.initializer.body.statements.find(statement => ts.isIfStatement(statement) &&
      statement.expression.getText(source).includes("!gesture"));
    touchEndCondition = guard && ts.isIfStatement(guard) ? guard.expression : undefined;
  }
  ts.forEachChild(node, visit);
}
visit(source);
assert.ok(markerCondition, "test the actual Sky page's selection-marker presentation guard");
assert.ok(presentedCondition);
assert.ok(touchStartCondition);
assert.ok(touchEndCondition);
const guard = ts.transpileModule(`const presentedSceneCurrent = ${presentedCondition.getText(source)};
  (${markerCondition.getText(source)})`,
  { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;

test("a current returned position waits for its matching native sky frame before showing the marker", () => {
  const report = {}, at = "2026-10-08T12:00:00.000Z";
  const context = {
    pageVisible: true, selectionState: { object: { reference: "PLANET:VENUS" }, spotId: "spot:test" },
    currentViewBasis: {}, canvasError: null, alignmentEditing: false,
    orientationData: report, reportData: { context: { spotId: "spot:test" } }, row: { at }, mode: "NIGHT",
  };
  const visible = (presentedSkyFrame: object | null, canvasError: string | null = null) =>
    Boolean(vm.runInNewContext(guard, { ...context, presentedSkyFrame, canvasError }));
  const current = { data: report, frameAt: at, mode: "NIGHT" };
  assert.equal(visible(null), false, "old Canvas pixels cannot receive a new position marker");
  assert.equal(visible({ ...current, frameAt: "2026-10-08T13:00:00.000Z" }), false);
  assert.equal(visible({ ...current, data: {} }), false);
  assert.equal(visible({ ...current, mode: "OBSERVATION" }), false);
  assert.equal(visible(current, "sky_canvas_failed"), false);
  assert.equal(visible(current), true);
  assert.equal(Boolean(vm.runInNewContext(guard, { ...context, presentedSkyFrame: current,
    selectionState: { ...context.selectionState, spotId: "spot:other" } })), false);
  assert.equal(Boolean(vm.runInNewContext(guard, { ...context, presentedSkyFrame: current,
    pageVisible: false })), false, "a hidden page retires the query/marker consumer");
});

test("sky touch cannot pick an old native frame during report replacement", () => {
  const run = (condition: ts.Expression, current: boolean) => Boolean(vm.runInNewContext(
    ts.transpileModule(`(${condition.getText(source)})`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText,
    { orientationController: { snapshot: () => ({ alignment: { mode: "auto" } }) },
      skySceneReady: true, presentedSceneCurrent: current, selectedCatalogObject: null,
      selectedTargetId: null, orientationObjectListOpen: false, datePickerOpen: false,
      timeSaving: false, gesture: {}, point: {}, row: { at: "2026-10-08T12:00:00.000Z" },
      identity: { catalogVersion: "v1" }, isUnambiguousTapGesture: () => true },
  ));
  assert.equal(run(touchStartCondition!, false), true, "new gestures must wait for the replacement Canvas frame");
  assert.equal(run(touchEndCondition!, false), true, "an in-flight gesture must not pick after report replacement");
  assert.equal(run(touchStartCondition!, true), false);
  assert.equal(run(touchEndCondition!, true), false);
});

test("scene metadata exposes the presented result rather than the next report's data", () => {
  const names = ["skySceneStarCount", "presentedSceneReady", "skyScenePresentationState",
    "skySceneAccessibleCount", "skyTargetAccessibleCount"];
  const declarations = source.statements.flatMap(statement => ts.isFunctionDeclaration(statement) &&
    statement.name?.text === "SpotSkyPage" && statement.body
    ? statement.body.statements.filter(child => ts.isVariableStatement(child) &&
      child.declarationList.declarations.some(declaration => names.includes(declaration.name.getText(source))))
    : []);
  assert.equal(declarations.length, names.length);
  const code = ts.transpileModule(declarations.map(statement => statement.getText(source)).join("\n") +
    "\n({ skyScenePresentationState, skySceneAccessibleCount, skyTargetAccessibleCount });",
  { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const evaluate = (current: boolean, mounted = true) => vm.runInNewContext(code, {
    activeSkySceneFrame: { state: "AVAILABLE", points: [[0, 0, 10], [1, 0, 20]] },
    presentedSceneCurrent: current, skySceneReady: true, nativeCanvasMounted: mounted,
    canvasError: null, orientationTargetFrame: {}, orientationTargets: [{}, {}],
  }) as { skyScenePresentationState: string; skySceneAccessibleCount: string; skyTargetAccessibleCount: string };
  const waiting = evaluate(false);
  assert.equal(waiting.skyScenePresentationState, "PENDING");
  assert.equal(waiting.skySceneAccessibleCount.includes("2 颗"), false);
  assert.equal(waiting.skyTargetAccessibleCount, "目标待绘制");
  assert.equal(evaluate(false, false).skyScenePresentationState, "UNAVAILABLE");
  const ready = evaluate(true);
  assert.equal(ready.skyScenePresentationState, "READY");
  assert.equal(ready.skySceneAccessibleCount, "2 颗真实亮星目录对象");
  assert.equal(ready.skyTargetAccessibleCount, "2 个真实目标");
});
