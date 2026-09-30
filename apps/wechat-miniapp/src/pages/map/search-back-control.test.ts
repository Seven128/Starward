import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

test("Search keeps its named Back control after the query loses focus", () => {
  const source = ts.createSourceFile("search-page.tsx", readFileSync(new URL("./search-page.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const buttons: ts.JsxElement[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isJsxElement(node) && node.openingElement.attributes.properties.some(property =>
      ts.isJsxAttribute(property) && property.name.getText(source) === "className" && property.initializer?.getText(source).includes("spot-search-field__leading"))) {
      buttons.push(node);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  const button = buttons[0];
  assert.ok(button);
  const attrs = button.openingElement.attributes.properties.filter(ts.isJsxAttribute);
  const label = attrs.find(attribute => attribute.name.getText(source) === "ariaLabel");
  const action = attrs.find(attribute => attribute.name.getText(source) === "onClick");
  assert.ok(label?.initializer && ts.isStringLiteral(label.initializer));
  assert.equal(label.initializer.text, "返回地图");
  assert.match(action?.initializer?.getText(source) ?? "", /leaveSearch\(\)/);
  assert.doesNotMatch(action?.initializer?.getText(source) ?? "", /setFocused|setSuggestionsOpen/);
  assert.match(button.children.find(ts.isJsxSelfClosingElement)?.getText(source) ?? "", /name="arrow-left"/);
});
