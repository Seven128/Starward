import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const source = ts.createSourceFile("sky-object-position-action.tsx",
  readFileSync(new URL("./sky-object-position-action.tsx", import.meta.url), "utf8"),
  ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const component = source.statements.find(node => ts.isFunctionDeclaration(node) &&
  node.name?.text === "SkyObjectPositionAction") as ts.FunctionDeclaration;
assert.ok(component);
const code = ts.transpileModule(`${component.getText(source).replace(/^export\s+/, "")}\nSkyObjectPositionAction;`,
  { compilerOptions: { target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React } }).outputText;

const page = ts.createSourceFile("spot-sky-page.tsx",
  readFileSync(new URL("./spot-sky-page.tsx", import.meta.url), "utf8"),
  ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let parentSuspended: ts.Expression | undefined;
function visit(node: ts.Node) {
  if (ts.isJsxSelfClosingElement(node) && node.tagName.getText(page) === "SkyObjectPositionAction") {
    const attribute = node.attributes.properties.find(property => ts.isJsxAttribute(property) &&
      property.name.getText(page) === "suspended") as ts.JsxAttribute;
    assert.ok(attribute?.initializer && ts.isJsxExpression(attribute.initializer));
    parentSuspended = attribute.initializer.expression;
  }
  ts.forEachChild(node, visit);
}
visit(page);
assert.ok(parentSuspended);
const parentCode = ts.transpileModule(`(${parentSuspended.getText(page)})`,
  { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;

test("a pending shared time commit suspends position requests and camera actions", () => {
  const parentBinding = (busy: boolean, timeSaving: boolean) => Boolean(vm.runInNewContext(parentCode, {
    contextSession: { busy }, timeSaving,
  }));
  assert.equal(parentBinding(false, false), false);
  assert.equal(parentBinding(true, false), true);
  assert.equal(parentBinding(false, true), true);
  const enabled: boolean[] = [];
  const action = vm.runInNewContext(code, {
    React: { createElement: (type: string, props: Record<string, unknown>, ...children: unknown[]) =>
      ({ type, props: props ?? {}, children }) },
    Text: "Text", View: "View", SoftButton: "SoftButton", StatusPanel: "StatusPanel",
    useCelestialPosition: (_binding: unknown, _catalog: unknown, active: boolean) => {
      enabled.push(active);
      return { isPending: false, isError: false, data: { data: { position: { azimuthDeg: 45, altitudeDeg: 30 } } } };
    },
  }) as (props: Record<string, unknown>) => any;
  const props = { binding: {}, catalog: { catalogVersion: "v3", catalogHash: "a" },
    onLocate: () => {}, onTrack: () => {}, onRetrySky: () => {} };
  const waiting = action({ ...props, suspended: true });
  assert.equal(enabled.at(-1), false);
  assert.equal(waiting.type, "StatusPanel");
  assert.equal(waiting.props.state, "LOADING");
  const waitingWithoutCatalog = action({ ...props, catalog: null, suspended: true });
  assert.equal(waitingWithoutCatalog.props.state, "LOADING");
  assert.equal(waitingWithoutCatalog.props.onRecover, undefined);
  const ready = action({ ...props, suspended: false });
  assert.equal(enabled.at(-1), true);
  assert.equal(ready.type, "View");
  assert.equal(ready.children.filter((child: any) => child?.type === "SoftButton").length, 2);
});
