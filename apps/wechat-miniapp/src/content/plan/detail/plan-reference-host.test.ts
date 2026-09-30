import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";
import { planEditorTimezone } from "./plan-editor-timezone";

// Evaluate the real host expressions; query mocks alone missed the disabled/loading bug.
function expressions() {
  const source = ts.createSourceFile("page.tsx", readFileSync(new URL("./plan-editor-page.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let timezone = "", loading = "", endDate = "";
  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && node.name.getText(source) === "timezone") timezone = node.initializer!.getText(source);
    if (ts.isJsxSelfClosingElement(node) && node.tagName.getText(source) === "PlanReference") {
      const prop = node.attributes.properties.find(p => ts.isJsxAttribute(p) && p.name.getText(source) === "loading") as ts.JsxAttribute;
      loading = (prop.initializer as ts.JsxExpression).expression!.getText(source);
    }
    if (ts.isJsxElement(node) && node.openingElement.attributes.properties.some(p => ts.isJsxAttribute(p) && p.initializer?.getText(source) === '"plan-period__meta"'))
      endDate = (node.children.find(ts.isJsxExpression) as ts.JsxExpression).expression!.getText(source);
    ts.forEachChild(node, visit);
  };
  visit(source);
  assert.ok(timezone && loading && endDate);
  const run = (expression: string, context: object) => vm.runInNewContext(ts.transpileModule(`(${expression})`, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText, { planEditorTimezone, ...context });
  return { timezone: (c: object) => run(timezone, c), loading: (c: object) => run(loading, c), endDate: (c: object) => run(endDate, c) };
}

test("saved plan preserves its timezone and full multi-day ending during context failure", () => {
  const activePlan = { contextSnapshot: { timezone: "America/New_York" }, localDate: "2026-09-13", timing: { endLocalDate: "2026-09-16" } };
  const expression = expressions();
  assert.equal(expression.timezone({ editing: false, selectedSpotId: null, formalSpots: [], activePlan, activeContext: null }), "America/New_York");
  assert.equal(expression.endDate({ activePlan }), "至 2026-09-16 · ");
});

test("editor host labels the selected formal spot instead of the previous context timezone", () => {
  const expression = expressions();
  assert.equal(expression.timezone({
    editing: true,
    selectedSpotId: "spot:hk",
    formalSpots: [{ spotId: "spot:hk", timezone: "Asia/Hong_Kong" }],
    activePlan: { spotId: "spot:main", contextSnapshot: { timezone: "Asia/Shanghai" } },
    activeContext: { timezone: "Asia/Shanghai", location: { kind: "FORMAL_SPOT", spotId: "spot:main" } },
  }), "Asia/Hong_Kong");
});

test("editor host has no destination timezone before a formal spot is selected", () => {
  const expression = expressions();
  assert.equal(expression.timezone({
    editing: true,
    selectedSpotId: null,
    formalSpots: [{ spotId: "spot:main", timezone: "Asia/Shanghai" }],
    activePlan: null,
    activeContext: { timezone: "Asia/Shanghai", location: { kind: "COORDINATE" } },
  }), null);
});

test("disabled Sky query after context failure is unavailable, not an endless pending load", () => {
  const expression = expressions();
  assert.equal(expression.loading({ contextQuery: { isPending: false, isFetching: false },
    activeContext: null, skyQuery: { isPending: true, isFetching: false } }), false);
  assert.equal(expression.loading({ contextQuery: { isPending: true, isFetching: true },
    activeContext: null, skyQuery: { isPending: true, isFetching: false } }), true);
  assert.equal(expression.loading({ contextQuery: { isPending: false, isFetching: false },
    activeContext: {}, skyQuery: { isPending: true, isFetching: true } }), true);
  assert.equal(expression.loading({ contextQuery: { isPending: false, isFetching: false },
    activeContext: {}, skyQuery: { isPending: false, isFetching: true } }), false, "refresh keeps useful cached facts");
});
