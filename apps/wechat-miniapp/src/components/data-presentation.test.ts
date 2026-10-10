import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { isProductSource, productSourceNames, SOURCE_KIND_LABEL } from "../utils/source-presentation";
import { calendarDateInTimezone, clockTimeInTimezone } from "../utils/zoned-date";
import type { SourceSummary } from "@starward/miniapp-contracts";
import { FACILITY_LABEL, facilityStatusLabel } from "../utils/facility-presentation";

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

test("formal facility cards retain submitted descriptions and adopted missing-value labels", () => {
  const source = ts.createSourceFile("panel.tsx", readFileSync(new URL("../pages/map/spot-panel.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let expression: ts.CallExpression | undefined;
  const visit = (node: ts.Node) => {
    if (ts.isCallExpression(node) && node.expression.getText(source) === "visibleFacilities.map") expression = node;
    ts.forEachChild(node, visit);
  };
  visit(source);
  assert.ok(expression, "render the actual formal facility card mapping");
  const labels = source.statements.filter(node => ts.isFunctionDeclaration(node) && ["facilityLabel", "facilityStatusLabel"].includes(node.name?.text ?? "")).map(node => node.getText(source)).join("\n");
  const rendered = vm.runInNewContext(ts.transpileModule(labels + "\n" + expression.getText(source), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React },
  }).outputText, { React, Text: "Text", View: "View", Image: "Image", SemanticIcon: "SemanticIcon", mediaSource: (value: string) => value,
    FACILITY_LABEL, facilityStatusLabel,
    visibleFacilities: [{ type: "TOILET", status: "UNKNOWN", summary: "待核验", detail: "隔离TEST洗手间照片绑定；不是现实设施。", distanceM: null }],
    facilityPhotos: () => [], openPhoto: () => {},
  });
  assert.match(text(rendered), /洗手间.*暂无数据.*隔离TEST洗手间照片绑定；不是现实设施。/s);
  assert.doesNotMatch(text(rendered), /待核验/);
});

test("shared facility details distinguish unavailable from missing status, hours and conditions", () => {
  const render = load("./facility-evidence.tsx", "FacilityEvidenceDetails", { Provenance: "Provenance", facilityStatusLabel, formatDisplayDate: (value: string) => value });
  const evidence = { status: "UNKNOWN", detail: "用户提供的设施说明", summary: "待核验", distanceM: null, openingHours: null, usageCondition: null, verifiedAt: null, source: sample };
  const missing = text(render({ evidence }));
  assert.equal((missing.match(/暂无数据/g) ?? []).length, 3);
  assert.match(missing, /用户提供的设施说明/);
  assert.doesNotMatch(missing, /待核验/);
  assert.match(text(render({ evidence: { ...evidence, status: "UNAVAILABLE", openingHours: "18:00–06:00", usageCondition: "出入需登记" } })), /不可用.*18:00–06:00.*出入需登记/s);
});

test("fixture navigation has identical content and geometry to ordinary navigation", () => {
  const render = (fixture: boolean) => load("./custom-nav.tsx", "CustomNav", {
    __MINIAPP_DEVELOPMENT_FIXTURE_MODE__: fixture, nativeStatusBarHeightPx: () => 44,
    nativeMenuClearancePx: () => 96, nativeNavigationInsets: () => ({ safeTop: 48 }), Taro: {},
    usePageNavigation: () => ({ navigationError: null }),
  })({ title: "场地资料", back: true, right: "操作" });
  assert.equal(JSON.stringify(render(true)), JSON.stringify(render(false)));
  assert.match(text(render(true)), /场地资料.*操作/s);
  assert.doesNotMatch(text(render(true)), /测试|验收|fixture/i);
});

test("arrow and dismiss presentations share the dirty-leave guard and failed-return recovery", async () => {
  for (const backPresentation of ["back", "dismiss"] as const) {
    const effects: string[] = [];
    let permit = false;
    const attempt = { active: () => true, stack: [{}, {}], release: () => effects.push("release"), fail: () => effects.push("error") };
    const render = load("./custom-nav.tsx", "CustomNav", {
      nativeStatusBarHeightPx: () => 44, nativeMenuClearancePx: () => 96, nativeNavigationInsets: () => ({ safeTop: 88 }),
      usePageNavigation: () => ({ navigationError: null, begin: () => attempt }),
      Taro: { navigateBack: async () => { effects.push("back"); throw new Error("native back failed"); },
        switchTab: async () => { effects.push("fallback"); throw new Error("native fallback failed"); } },
    });
    const tree = render({ title: "反馈页", back: true, backPresentation,
      beforeBack: () => permit, onBackAuthorized: () => effects.push("authorized"), onBackFailure: () => effects.push("restore") });
    const find = (node: any): any => node?.type === "SoftButton" ? node : Array.isArray(node) ? node.map(find).find(Boolean) : node?.children ? find(node.children) : null;
    const action = find(tree);
    assert.ok(action, "real navigation action remains rendered");
    await action.props.onClick();
    assert.deepEqual(effects, ["release"], "cancel keeps the page and dirty input");
    permit = true; effects.length = 0;
    await action.props.onClick();
    assert.deepEqual(effects, ["authorized", "back", "fallback", "restore", "error", "release"]);
  }
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

test("ordinary fresh data has no visual badge while full provenance retains real state and facts", () => {
  const badge = load("./data-state-badge.tsx", "DataStateBadge");
  const labels = load("./data-state-badge.tsx", "DATA_STATE_LABELS");
  assert.equal(badge({ state: "FRESH" }), null);
  assert.equal(labels.FRESH, "当前数据", "source accessibility retains the actual state label");
  for (const [state, label] of [["STALE_USABLE", "过期可用"], ["PARTIAL", "部分数据"], ["EXPIRED", "已过期"], ["UNAVAILABLE", "不可用"], ["ESTIMATED", "估算"]]) {
    assert.equal(text(badge({ state })), label);
  }
  const attributionInputs: unknown[] = [];
  const provenance = load("./provenance.tsx", "Provenance", { isProductSource, SOURCE_KIND_LABEL,
    DataStateBadge: badge, DATA_STATE_LABELS: labels, calendarDateInTimezone, clockTimeInTimezone,
    SourceAttribution: ({ sources }: { sources: unknown[] }) => { attributionInputs.push(sources); return "原始归因"; } });
  const actual = Object.freeze({ ...sample, id: "actual-fresh", kind: "OPEN_DATA", state: "FRESH", provider: "公开资料库",
    title: "星表", sourceUrl: "https://example.org/catalog", licenseUrl: "https://example.org/license", license: "开放许可", precision: "角秒",
    publishedAt: "2026-10-08T01:00:00Z", retrievedAt: "2026-10-09T02:00:00Z", validFrom: "2026-10-08T00:00:00Z", validTo: "2026-10-10T00:00:00Z",
    limitations: Object.freeze(["覆盖范围内适用"]) }) as unknown as SourceSummary;
  const before = JSON.stringify(actual);
  const tree = provenance({ source: actual });
  assert.equal(tree.props["aria-label"], "来源：公开资料库，状态：当前数据");
  assert.match(text(tree), /公开资料库.*星表.*原始归因.*2026-10-08 09:00.*2026-10-09 10:00.*2026-10-08 08:00 至 2026-10-10 08:00.*开放许可.*角秒.*覆盖范围内适用.*复制原始出处.*复制许可说明/s);
  assert.doesNotMatch(text(tree), /当前数据/);
  assert.equal((attributionInputs[0] as SourceSummary[])[0], actual);
  assert.equal(JSON.stringify(actual), before);
  const oldBadge = load("./data-state-badge.tsx", "DataStateBadge", {}, source => source.replace('state === "FRESH" || ', ""));
  assert.throws(() => assert.equal(oldBadge({ state: "FRESH" }), null), assert.AssertionError,
    "restoring the ordinary fresh visual badge must fail the product assertion");
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
  assert.match(text(tree), /公开资料库.*部分数据.*星表.*开放数据.*开放许可.*角秒.*缺少部分字段.*复制原始出处/s);
  assert.equal(productSourceNames([sample, actual, actual]), "公开资料库");
  assert.equal(sample.kind, "TEST_FIXTURE");
  assert.equal(sample.state, "SAMPLE_DATA");
  assert.deepEqual(sample.limitations, ["仅测试"]);
  const unknownTime = text(provenance({ source: { ...actual, retrievedAt: null } }));
  assert.match(unknownTime, /公开资料库.*获取时间未知/s);
  assert.doesNotMatch(unknownTime, /1970|NaN|Invalid/);
});

test("in-document provenance keeps current precision and time coverage in its full source facts", () => {
  const provenance = load("./provenance.tsx", "Provenance", { isProductSource, SOURCE_KIND_LABEL,
    DataStateBadge: load("./data-state-badge.tsx", "DataStateBadge"),
    DATA_STATE_LABELS: load("./data-state-badge.tsx", "DATA_STATE_LABELS"), calendarDateInTimezone, clockTimeInTimezone });
  const actual = { ...sample, id: "declared", kind: "OPEN_DATA", state: "FRESH", provider: "公开资料库", title: "完整星表",
    sourceUrl: "https://example.org/catalog", licenseUrl: "https://example.org/license",
    license: "开放许可", precision: "角秒；覆盖范围内适用", limitations: ["不表示现场实测"] } as SourceSummary;
  const before = JSON.stringify(actual), tree = provenance({ source: actual, presentation: "disclosure", showKind: false });
  const all = (value: any): any[] => !value || typeof value !== "object" ? [] : Array.isArray(value) ? value.flatMap(all) : [value, ...all(value.children)];
  const timing = all(tree).find(node => node.props?.className === "provenance__timing");
  const facts = all(timing).filter(node => node.props?.className === "provenance__fact");
  assert.deepEqual(facts.map(node => text(node.children[0])), ["发布", "获取", "适用", "精度"]);
  assert.equal(text(facts[3]), "精度角秒；覆盖范围内适用");
  assert.match(text(timing), /北京时间.*发布来源未提供.*获取2026-09-15 08:00.*适用来源未提供/s);
  assert.equal(text(all(tree).find(node => node.props?.className === "provenance__header")), "公开资料库 · 完整星表");
  assert.equal(all(tree).find(node => node.type === "SourceAttribution").props.presentation, "disclosure");
  assert.match(text(tree), /开放许可.*不表示现场实测.*复制许可链接/s);
  assert.equal(JSON.stringify(actual), before);
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
