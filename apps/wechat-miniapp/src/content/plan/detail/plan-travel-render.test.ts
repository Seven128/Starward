import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { planTravelModeLabel } from "./plan-travel";

const ast = ts.createSourceFile("plan.tsx", readFileSync(new URL("./plan-editor-page.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let element = "";
const visit = (node: ts.Node) => {
  if (ts.isJsxElement(node) && node.openingElement.attributes.properties.some(prop => ts.isJsxAttribute(prop)
    && prop.name.getText(ast) === "data-od-id" && prop.initializer?.getText(ast) === '"plan-route-nodes"')) element = node.getText(ast);
  ts.forEachChild(node, visit);
};
visit(ast); assert.ok(element);
function render(siteRoute: unknown, failure = false, distanceOriginMatches = true) {
  let recovered = false;
  const tree = vm.runInNewContext(ts.transpileModule(`(${element})`, { compilerOptions: { jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2022 } }).outputText, {
    React: { createElement: (type: string, props: unknown, ...children: unknown[]) => ({ type, props, children }) },
    Text: "Text", View: "View", SoftButton: "SoftButton", planTravelModeLabel,
    activePlan: { travel: { origin: "手填出发地", mode: "TRANSIT" },
      timing: { departureLocalDate: "2026-09-15", departureLocalTime: "23:00" }, localDate: "2026-09-16", localTime: "01:30" },
    selectedSpot: { name: "观星点A" }, siteRoute, straightDistanceKm: distanceOriginMatches && siteRoute ? 12.3 : null,
    siteOverviewQuery: { isError: failure, refreshError: false, refetch: () => { recovered = true; } },
  });
  const text = (node: any): string => node == null || typeof node === "boolean" ? ""
    : Array.isArray(node) ? node.map(text).join("") : typeof node === "object" ? text(node.children) : String(node);
  const retry = (node: any): any => Array.isArray(node) ? node.map(retry).find(Boolean)
    : node?.type === "SoftButton" ? node : node?.children ? retry(node.children) : null;
  return { text: text(tree), retry: () => retry(tree)?.props.onClick(), recovered: () => recovered };
}

test("missing or failed site data preserves the manual cross-midnight travel timeline and usable retry", () => {
  for (const failure of [false, true]) {
    const view = render(null, failure);
    for (const value of ["手填出发地", "公共交通", "2026-09-15 23:00", "2026-09-16", "01:30", "暂无数据"]) assert.ok(view.text.includes(value), value);
    assert.doesNotMatch(view.text, /预计|路线估算|分钟/);
    view.retry(); assert.equal(view.recovered(), failure);
  }
});

test("attributable site facts survive an origin mismatch while straight distance is suppressed", () => {
  const route = { kind: "STRAIGHT_LINE_ONLY", distanceKm: 12.3, durationMinutes: 24, lastRoad: "东侧入口", parkingGuidance: "指定停车区" };
  const matching = render(route), changedOrigin = render(route, false, false);
  assert.match(matching.text, /直线 12.3 km/);
  for (const view of [matching, changedOrigin]) {
    assert.match(view.text, /东侧入口.*指定停车区/);
    assert.doesNotMatch(view.text, /24|预计/);
  }
  assert.doesNotMatch(changedOrigin.text, /12.3/);
});
