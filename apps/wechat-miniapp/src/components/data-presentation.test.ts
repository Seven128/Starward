import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { isProductSource, productSourceNames, SOURCE_KIND_LABEL } from "../utils/source-presentation";
import { calendarDateInTimezone, clockTimeInTimezone } from "../utils/zoned-date";
import type { SourceSummary } from "@starward/miniapp-contracts";

const React = { createElement(type: any, props: any, ...children: any[]): any {
  return typeof type === "function" ? type({ ...props, children }) : { type, props, children };
} };
const text = (node: any): string => node == null || typeof node === "boolean" ? ""
  : Array.isArray(node) ? node.map(text).join("") : typeof node === "object" ? text(node.children) : String(node);
function load(path: string, name: string, context: object = {}, mutate = (source: string) => source) {
  const source = ts.createSourceFile(path, mutate(readFileSync(new URL(path, import.meta.url), "utf8")), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const body = source.statements.filter(node => !ts.isImportDeclaration(node) && !ts.isExportDeclaration(node))
    .map(node => node.getText(source).replace(/^export /u, "")).join("\n");
  return vm.runInNewContext(ts.transpileModule(body + `\n${name};`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React },
  }).outputText, { React, Text: "Text", View: "View", SoftButton: "SoftButton", SemanticIcon: "SemanticIcon", SourceAttribution: "SourceAttribution",
    useState: (value: unknown) => [value, () => {}], useRef: (value: unknown) => ({ current: value }), ...context });
}
const sample = Object.freeze({ id: "sample", kind: "TEST_FIXTURE", state: "SAMPLE_DATA", provider: "内部测试资料",
  title: "测试数据说明", retrievedAt: "2026-09-15T00:00:00Z", publishedAt: null, validFrom: null, validTo: null,
  sourceUrl: "", licenseUrl: "", license: "Internal fixture", precision: "internal", limitations: ["仅测试"], confidence: null }) as SourceSummary;

test("fixture navigation has identical content and geometry to ordinary navigation", () => {
  const render = (fixture: boolean) => load("./custom-nav.tsx", "CustomNav", {
    __MINIAPP_DEVELOPMENT_FIXTURE_MODE__: fixture, nativeStatusBarHeightPx: () => 44,
    nativeMenuClearancePx: () => 96, nativeNavigationInsets: () => ({ safeTop: 48 }), Taro: {},
  })({ title: "场地资料", back: true, right: "操作" });
  assert.equal(JSON.stringify(render(true)), JSON.stringify(render(false)));
  assert.match(text(render(true)), /场地资料.*操作/s);
  assert.doesNotMatch(text(render(true)), /测试|验收|fixture/i);
});

test("sample state has no badge while real partial and missing states retain their meaning", () => {
  const badge = load("./data-state-badge.tsx", "DataStateBadge");
  assert.equal(badge({ state: "SAMPLE_DATA" }), null);
  assert.equal(text(badge({ state: "PARTIAL" })), "部分数据");
  assert.equal(text(badge({ state: "UNAVAILABLE" })), "不可用");
  const oldBadge = load("./data-state-badge.tsx", "DataStateBadge", {}, source => source.replace("SAMPLE_DATA: null", 'SAMPLE_DATA: "测试数据"'));
  assert.throws(() => assert.equal(oldBadge({ state: "SAMPLE_DATA" }), null), assert.AssertionError,
    "restoring the removed sample badge must fail the product assertion");
});

test("internal provenance is absent from cards and summaries without losing real attribution or mutating metadata", () => {
  const badge = load("./data-state-badge.tsx", "DataStateBadge");
  const labels = load("./data-state-badge.tsx", "DATA_STATE_LABELS");
  const provenance = load("./provenance.tsx", "Provenance", { isProductSource, SOURCE_KIND_LABEL,
    DataStateBadge: badge, DATA_STATE_LABELS: labels, calendarDateInTimezone, clockTimeInTimezone });
  assert.equal(provenance({ source: sample }), null);
  assert.equal(productSourceNames([sample]), "");
  const actual = { ...sample, id: "actual", kind: "OPEN_DATA", state: "PARTIAL", provider: "公开资料库",
    title: "星表", sourceUrl: "https://example.org/catalog", license: "开放许可", precision: "角秒",
    limitations: ["缺少部分字段"] } as SourceSummary;
  const tree = provenance({ source: actual });
  assert.match(text(tree), /公开资料库.*部分数据.*星表.*开放数据.*开放许可.*角秒.*缺少部分字段.*原始出处/s);
  assert.equal(productSourceNames([sample, actual, actual]), "公开资料库");
  assert.equal(sample.kind, "TEST_FIXTURE");
  assert.equal(sample.state, "SAMPLE_DATA");
  assert.deepEqual(sample.limitations, ["仅测试"]);
  const unknownTime = text(provenance({ source: { ...actual, retrievedAt: null } }));
  assert.match(unknownTime, /公开资料库.*获取时间未知/s);
  assert.doesNotMatch(unknownTime, /1970|NaN|Invalid/);
});

test("map forecast summary never leaks fixture provider or fetch time, and keeps real attribution", () => {
  const source = ts.createSourceFile("panel.tsx", readFileSync(new URL("../pages/map/spot-panel.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const names = new Set(["visibleWeatherRuns", "weatherProviders", "latestWeatherFetch"]);
  const declarations: string[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && names.has(node.name.getText(source))) declarations.push(`const ${node.getText(source)};`);
    ts.forEachChild(node, visit);
  };
  visit(source);
  const evaluate = (runs: any[]) => vm.runInNewContext(ts.transpileModule(declarations.join("\n") + "\nJSON.stringify({weatherProviders,latestWeatherFetch});", {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText, { skyReport: { weatherEvidence: { modelRuns: runs } } });
  const fixture = Object.freeze({ state: "SAMPLE_DATA", provider: "确定性测试天气", fetchedAt: "2026-09-15T02:00:00Z" });
  const actual = { state: "FRESH", provider: "和风天气", fetchedAt: "2026-09-15T01:00:00Z" };
  assert.deepEqual(JSON.parse(evaluate([fixture])), { weatherProviders: [], latestWeatherFetch: null });
  assert.deepEqual(JSON.parse(evaluate([fixture, actual])), { weatherProviders: ["和风天气"], latestWeatherFetch: actual.fetchedAt });
  assert.equal(fixture.provider, "确定性测试天气");
});

test("site attribution never borrows astronomy provenance when the site's own source is internal", () => {
  const source = ts.createSourceFile("panel.tsx", readFileSync(new URL("../pages/map/spot-panel.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const panel = source.statements.find((node): node is ts.FunctionDeclaration => ts.isFunctionDeclaration(node) && node.name?.text === "SpotInformationPanel")!;
  const declarations = panel.body!.statements.filter(ts.isVariableStatement).flatMap(node => [...node.declarationList.declarations])
    .filter(node => ["source", "sourceTime"].includes(node.name.getText(source))).map(node => `const ${node.getText(source)};`).join("\n");
  const unrelated = { ...sample, id: "astronomy", kind: "PRODUCT_CALCULATION", provider: "Astronomy Engine", state: "FRESH" };
  const run = (own: SourceSummary) => JSON.parse(vm.runInNewContext(ts.transpileModule(declarations + "\nJSON.stringify({name:productSourceNames([source]),sourceTime});", {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText, { effectiveSpot: { source: own }, detail: { dataDisclosure: [sample, unrelated] }, context: {},
    isProductSource, productSourceNames, formatSourceTime: () => "04:00" }));
  assert.deepEqual(run(sample), { name: "", sourceTime: null });
  assert.deepEqual(run({ ...sample, kind: "OFFICIAL_VERIFICATION", state: "FRESH", provider: "场地管理方" }), { name: "场地管理方", sourceTime: "04:00" });
});
