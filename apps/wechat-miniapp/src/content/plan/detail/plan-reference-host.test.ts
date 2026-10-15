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

test("viewing the saved version reads its own site and navigation while another place remains in the edit draft", async () => {
  const source = ts.createSourceFile("page.tsx", readFileSync(new URL("./plan-editor-page.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const expressions = new Map<string, string>();
  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && ["siteOverviewQuery", "planNavigation"].includes(node.name.getText(source)))
      expressions.set(node.name.getText(source), (node.initializer as ts.CallExpression).arguments[0]!.getText(source));
    ts.forEachChild(node, visit);
  };
  visit(source);
  const activePlan = { planId: "plan:one", revision: 2, spotId: "spot:saved" };
  const storedDraft = { selectedSpotId: "spot:draft" }, before = structuredClone(storedDraft);
  let queriedSpot = "";
  const site = { spotId: activePlan.spotId, accessAndSafety: null };
  const context = { pageVisible: true, editing: false, activePlan, activePlanId: activePlan.planId, selectedSpotId: storedDraft.selectedSpotId,
    selectedSpot: { spotId: activePlan.spotId }, planOwner: "owner", formOwner: { current: "owner" }, currentDraftUserId: () => "owner",
    getSpotSite: async (spotId: string) => { queriedSpot = spotId; },
    useAppStore: { getState: () => ({ accountOwnerId: "owner", mode: "DAY", mapResetVersion: 0, plans: [activePlan] }) },
    planQuery: { readCurrent: () => ({ data: { dataState: "FRESH", data: { plans: [activePlan] } } }) },
    spotsQuery: { readCurrent: () => ({ data: { dataState: "FRESH", data: { spots: [{ spotId: activePlan.spotId }] } } }) },
    siteOverviewQuery: { readCurrent: () => ({ data: { dataState: "FRESH", data: site } }) },
    currentNavigationResource: () => true, currentNavigationSiteResource: () => true, navigationHandoff: { confirm() {} } };
  const run = (name: string) => vm.runInNewContext(ts.transpileModule(`(${expressions.get(name)})`, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText, context);
  const query = run("siteOverviewQuery");
  assert.equal(query.enabled, true);
  await query.queryFn(new AbortController().signal);
  assert.equal(queriedSpot, activePlan.spotId);
  assert.equal(run("planNavigation").readSnapshot().available, true);
  assert.deepEqual(storedDraft, before);
});

test("a verified save notice belongs only to that saved plan revision", () => {
  const source = ts.createSourceFile("page.tsx", readFileSync(new URL("./plan-editor-page.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let condition = "";
  const visit = (node: ts.Node) => {
    if (ts.isConditionalExpression(node) && node.condition.getText(source).startsWith("saveResultVerified")) condition = node.condition.getText(source);
    ts.forEachChild(node, visit);
  };
  visit(source); assert.ok(condition);
  const run = (activePlan: object) => Boolean(vm.runInNewContext(condition, { saveResultVerified: { planId: "plan:A", revision: 1 }, editing: false, activePlan }));
  assert.equal(run({ planId: "plan:A", revision: 1 }), true);
  assert.equal(run({ planId: "plan:B", revision: 1 }), false);
  assert.equal(run({ planId: "plan:A", revision: 2 }), false);
});
