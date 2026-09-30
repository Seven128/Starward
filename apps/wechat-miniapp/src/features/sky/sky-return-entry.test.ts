import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const source = ts.createSourceFile("spot-sky-page.tsx",
  readFileSync(new URL("./spot-sky-page.tsx", import.meta.url), "utf8"),
  ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const page = source.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === "SpotSkyPage") as ts.FunctionDeclaration;
assert.ok(page?.body);
const statements = page.body.statements;
const navigation = statements.find(node => ts.isVariableStatement(node) &&
  node.declarationList.declarations.some(declaration => declaration.name.getText(source) === "returnToSkyEntry"));
const errorBranch = statements.find(node => ts.isIfStatement(node) &&
  node.expression.getText(source) === "!contextComplete || !activeContext") as ts.IfStatement;
assert.ok(errorBranch);
const backActions: string[] = [];
function visit(node: ts.Node) {
  if (ts.isJsxSelfClosingElement(node) && ["OrientationQuietBack", "ContextError"].includes(node.tagName.getText(source))) {
    const attribute = node.attributes.properties.find(property => ts.isJsxAttribute(property) && property.name.getText(source) === "onBack") as ts.JsxAttribute;
    assert.ok(attribute?.initializer && ts.isJsxExpression(attribute.initializer));
    backActions.push(attribute.initializer.expression!.getText(source));
  }
  ts.forEachChild(node, visit);
}
visit(errorBranch.thenStatement);
assert.equal(backActions.length, 2);

test("context recovery returns to the actual entry before falling back to Map", async () => {
  assert.ok(navigation, "the recovery branch must reuse the normal Sky return owner");
  const code = ts.transpileModule(`${navigation.getText(source)}\n[${backActions.join(",")}]`,
    { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  for (const reject of [false, true]) {
    const calls: string[] = [];
    const callbacks = vm.runInNewContext(code, { Taro: {
      navigateBack: () => { calls.push("entry"); return reject ? Promise.reject(new Error("empty stack")) : Promise.resolve(); },
      switchTab: ({ url }: { url: string }) => { calls.push(url); return Promise.resolve(); },
    } }) as (() => void)[];
    callbacks[0]!();
    await new Promise(resolve => setImmediate(resolve));
    assert.deepEqual(calls, reject ? ["entry", "/pages/map/index"] : ["entry"]);
    assert.equal(callbacks[0], callbacks[1], "quiet Back and recovery action share one return command");
  }
});
