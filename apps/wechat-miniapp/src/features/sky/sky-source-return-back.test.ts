import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const source = ts.createSourceFile("spot-sky-page.tsx",
  readFileSync(new URL("./spot-sky-page.tsx", import.meta.url), "utf8"),
  ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let active: ts.Expression | undefined;
let modalCondition: ts.Expression | undefined;
function visit(node: ts.Node) {
  if (ts.isJsxSelfClosingElement(node) && node.tagName.getText(source) === "NativeBackBoundary") {
    const attribute = node.attributes.properties.find(property => ts.isJsxAttribute(property) &&
      property.name.getText(source) === "active") as ts.JsxAttribute;
    assert.ok(attribute?.initializer && ts.isJsxExpression(attribute.initializer));
    active = attribute.initializer.expression;
  }
  if (ts.isJsxSelfClosingElement(node) && node.tagName.getText(source) === "SkyCatalogInformation") {
    let ancestor: ts.Node | undefined = node.parent;
    while (ancestor && !ts.isConditionalExpression(ancestor)) ancestor = ancestor.parent;
    assert.ok(ancestor && ts.isConditionalExpression(ancestor));
    modalCondition = ancestor.condition;
  }
  ts.forEachChild(node, visit);
}
visit(source);
assert.ok(active, "test the Sky page's actual native Back ownership");
assert.ok(modalCondition, "test the actual mounted information disclosure");
const code = ts.transpileModule(`(${active.getText(source)})`,
  { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
const modalCode = ts.transpileModule(`(${modalCondition.getText(source)})`,
  { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;

test("hidden Sky releases native Back even while a selected object is retained", () => {
  const selectedCatalogObject = { reference: "M:31", displayName: "仙女座星系" };
  const ownsBack = (pageVisible: boolean, datePickerOpen = false) => Boolean(vm.runInNewContext(code, {
    pageVisible, datePickerOpen, selectedTargetId: null, selectedCatalogObject, catalogPickChoices: [],
  }));
  assert.equal(ownsBack(true), true, "the visible object modal consumes Back");
  assert.equal(ownsBack(false), false, "the hidden Sky page must not consume Back on its source route");
  assert.equal(ownsBack(false, true), false, "even a retained date layer cannot own Back while hidden");
  const mountsInformation = (pageVisible: boolean) => Boolean(vm.runInNewContext(modalCode,
    { pageVisible, selectedCatalogObject }));
  assert.equal(mountsInformation(false), false, "the hidden parent releases its information subscription");
  assert.equal(mountsInformation(true), true, "the saved selection remounts on return");
});
