import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import type { SkyReport, SourceSummary } from "@starward/miniapp-contracts";
import type { ObservationPlan } from "@starward/miniapp-contracts";
import { totalCloudClientFixture } from "../services/total-cloud-test-support";
import { selectedTotalCloud, totalCloudCoverage, totalCloudMissingLabel, weatherCreditSources, weatherSourceSections } from "./weather-source-presentation";
import * as sourcePresentation from "./weather-source-presentation";
import * as coverage from "./forecast-coverage";
import * as zonedDate from "../utils/zoned-date";
import { planReference } from "../content/plan/detail/plan-reference-model";
import { skyForecastPresentation } from "../services/forecast-presentation";

function cloudSourceReport() {
  const cloud = totalCloudClientFixture();
  const other: SourceSummary = { id: "qweather:test", kind: "THIRD_PARTY_FORECAST", provider: "QWeather fixture", title: "weather fixture",
    sourceUrl: "https://example.invalid/qweather", license: "fixture", licenseUrl: "https://example.invalid/license", publishedAt: null,
    retrievedAt: cloud.stamp(0), validFrom: cloud.stamp(0), validTo: cloud.stamp(24), state: "FRESH", confidence: null, precision: "one hour", limitations: [] };
  const source: SourceSummary = { ...other, id: cloud.binding.publicationId, provider: "ECMWF fixture", title: "total-cloud fixture",
    attribution: { name: "ECMWF", url: "https://example.invalid/ecmwf", statements: ["Contains modified ECMWF forecast data."] } };
  const report = { context: { localDate: "2026-09-20", timezone: "UTC", at: cloud.stamp(0), spotId: "spot:a" },
    hourly: [0, 1.5, 3].map(hour => ({ at: cloud.stamp(hour), cloudEvidence: cloud.evidence(hour), cloudPercent: cloud.evidence(hour).cloudPercent,
      weatherAt: null, temperatureC: null, windKph: null, moonIllumination: null })),
    lunarFacts: { moonriseAt: null, moonsetAt: null }, sources: [other, source],
    weatherEvidence: { timelineRole: "UNAVAILABLE", warningState: "UNAVAILABLE", alerts: [], modelRuns: [],
      totalCloud: { ...cloud.forecast, source } } } as unknown as SkyReport;
  return { ...cloud, report, source, other };
}

test("native cloud coverage retains gaps and zero without inventing hourly coverage", () => {
  const f = cloudSourceReport(), forecast = f.report.weatherEvidence.totalCloud!;
  const frames = f.series.frames.filter(frame => frame.stepHours <= 21).map(frame => [6, 15, 21].includes(frame.stepHours)
    ? { ...frame, fraction: null, quality: "MISSING" as const } : frame);
  const report = { ...f.report, weatherEvidence: { ...f.report.weatherEvidence, totalCloud: { ...forecast, value: { ...f.series, frames } } } };
  assert.equal(selectedTotalCloud(report, f.stamp(0), f.now)?.cloudPercent, 0);
  assert.equal(selectedTotalCloud(report, f.stamp(4.5), f.now), null);
  assert.deepEqual(totalCloudCoverage(report, f.now), [
    { start: f.stamp(0), end: f.stamp(3) }, { start: f.stamp(9), end: f.stamp(12) }, { start: f.stamp(18), end: f.stamp(18) },
  ]);
  assert.deepEqual(totalCloudCoverage(report, Date.parse(f.binding.supports240HoursUntil) + 1), []);
  assert.equal(totalCloudMissingLabel(report, Date.parse(f.binding.supports240HoursUntil) + 1), "已过期",
    "presentation expiry cannot retain a FRESH acquisition label");
  assert.deepEqual(totalCloudCoverage(report, f.now, { start: f.stamp(1.5), end: f.stamp(10.25) }), [
    { start: f.stamp(1.5), end: f.stamp(3) }, { start: f.stamp(9), end: f.stamp(10.25) },
  ]);
});

test("source readers cannot revive expired forecast history using a slower device clock", () => {
  const f = cloudSourceReport(), until = Date.parse(f.binding.supports240HoursUntil);
  const headerOnly = { ...f.report, hourly: f.report.hourly.map(row => ({ ...row, cloudEvidence: null, cloudPercent: null })) };
  const expired = skyForecastPresentation.project(headerOnly, until + 1);
  assert.equal(expired.weatherEvidence.totalCloud?.state, "EXPIRED");
  assert.deepEqual(totalCloudCoverage(expired, until - 1), []);
  assert.equal(selectedTotalCloud(expired, f.stamp(3), until - 1), null);
  assert.equal(totalCloudMissingLabel(expired, until - 1), "已过期");
  const unavailable = { ...expired, weatherEvidence: { ...expired.weatherEvidence,
    totalCloud: { ...expired.weatherEvidence.totalCloud!, state: "UNAVAILABLE" as const } } };
  assert.deepEqual(totalCloudCoverage(unavailable, until - 1), []);
  assert.equal(selectedTotalCloud(unavailable, f.stamp(3), until - 1), null);
});

type Node = { type: unknown; props: Record<string, any>; children: unknown[] };
const nodes = (node: any): Node[] => !node || typeof node !== "object" ? [] : Array.isArray(node)
  ? node.flatMap(nodes) : [node, ...nodes(node.children)];
const texts = (node: any): string[] => typeof node === "string" ? [node] : !node || typeof node !== "object" ? []
  : Array.isArray(node) ? node.flatMap(texts) : texts(node.children);
const React = { createElement: (type: unknown, props: Record<string, any>, ...children: unknown[]): Node => ({ type, props, children }) };
function renderModule(file: string, imports: Record<string, unknown>, extra: Record<string, unknown> = {}) {
  const exported: Record<string, any> = {};
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL(file, import.meta.url), "utf8"), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React },
  }).outputText, { exports: exported, React, ...extra, require(name: string) {
    if (name.endsWith(".scss")) return {};
    assert(Object.hasOwn(imports, name), `unexpected dependency ${name}`); return imports[name];
  } });
  return exported;
}

function actualProp(file: string, tag: string, name: string, scope: Record<string, unknown>) {
  const source = ts.createSourceFile(file, readFileSync(new URL(file, import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const expressions: ts.Expression[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isJsxSelfClosingElement(node) && node.tagName.getText(source) === tag) {
      for (const prop of node.attributes.properties) if (ts.isJsxAttribute(prop) && prop.name.getText(source) === name &&
        prop.initializer && ts.isJsxExpression(prop.initializer) && prop.initializer.expression) expressions.push(prop.initializer.expression);
    }
    ts.forEachChild(node, visit);
  };
  visit(source); assert.equal(expressions.length, 1, `one actual ${tag}.${name} binding`);
  return vm.runInNewContext(ts.transpileModule(`(${expressions[0]!.getText(source)});`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText, scope);
}

function planRenderer(clock: unknown = Date) {
  return renderModule("../content/plan/detail/plan-reference.tsx", {
    "@tarojs/components": { Text: "Text", View: "View" }, "@/components/source-attribution": { SourceAttribution: "Credit" },
    "@/components/source-entry": { SourceEntry: "Source" }, "@/components/forecast-coverage-note": { ForecastCoverageNote: "Coverage" },
    "@/components/semantic-asset": { SemanticIcon: "Icon" }, "@/components/status-panel": { StatusPanel: "Status" },
    "./plan-reference-model": { planReference }, "@/components/weather-source-presentation": sourcePresentation,
  }, { Date: clock }).PlanReference;
}

test("the real coverage note keeps cloud-only coverage and labels independent other-weather absence", () => {
  const render = renderModule("./forecast-coverage-note.tsx", {
    "@tarojs/components": { Text: "Text", View: "View" },
    "@/components/shared-button-press": { SharedButton: "Button" },
    react: { useState: () => [true, () => {}], useId: () => "coverage", useEffect: () => {} },
    "./forecast-coverage": coverage, "./status-panel": { StatusPanel: "StatusPanel" }, "@/utils/zoned-date": zonedDate,
  }).ForecastCoverageNote;
  const input = { starts: [], timezone: "UTC", scopeKey: "cloud", cloudIntervals: [
    { start: "2026-09-20T00:00:00Z", end: "2026-09-20T03:00:00Z" },
    { start: "2026-09-20T06:00:00Z", end: "2026-09-20T06:00:00Z" },
  ] };
  const tree = render(input), text = texts(tree).join("");
  assert.equal(nodes(tree).some(node => node.type === "StatusPanel"), false);
  assert(text.includes("总云量：09/20 00:00–09/20 03:00"));
  assert(text.includes("总云量：09/20 06:00")); assert(!text.includes("09/20 07:00"));
  assert(text.includes("其他天气暂无覆盖")); assert(text.includes("相邻有效时次"));
  assert(nodes(render({ ...input, cloudIntervals: [] })).some(node => node.type === "StatusPanel"));
  const { cloudIntervals: _cloud, ...legacy } = input;
  const legacyText = texts(render({ ...legacy, starts: ["2026-09-20T00:00:00Z"] })).join("");
  assert(!legacyText.includes("其他天气")); assert(legacyText.includes("09/20 01:00"));
});

test("actual plan reference renders required ECMWF credit and separate coverage without a QWeather hour", () => {
  const f = cloudSourceReport();
  const plan = { planId: "plan:a", revision: 1, spotId: "spot:a", contextSnapshot: { timezone: "UTC", selectedAtUtc: f.stamp(0) },
    timing: { endLocalDate: "2026-09-20", endLocalTime: "03:00" } } as ObservationPlan;
  class FixedDate extends Date { static override now() { return f.now; } }
  const PlanReference = planRenderer(FixedDate);
  const tree = PlanReference({ plan, report: f.report, loading: false, failed: false, onRetry: () => {} });
  const rendered = nodes(tree), credit = rendered.find(node => node.type === "Credit"), range = rendered.find(node => node.type === "Coverage");
  assert.deepEqual(credit?.props.sources, [f.source]);
  assert.deepEqual(range?.props.starts, []);
  assert.deepEqual(range?.props.cloudIntervals, [{ start: f.stamp(0), end: f.stamp(3) }]);
  assert(rendered.find(node => node.type === "Source")?.props.sections.some((section: any) => section.kind === "facts"));
  assert(texts(tree).join("").includes("0–0.4%"));
});

test("actual Spot and Plan source consumers use their query clock when the device is behind", t => {
  const f = cloudSourceReport(), until = Date.parse(f.binding.supports240HoursUntil);
  t.mock.method(Date, "now", () => until - 1);
  const offset = actualProp("../pages/map/index.tsx", "SpotInformationPanel", "forecastClockOffsetMs",
    { spotSky: { forecastClockOffsetMs: 2 } });
  const source = ts.createSourceFile("spot-panel.tsx", readFileSync(new URL("../pages/map/spot-panel.tsx", import.meta.url), "utf8"),
    ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const names = ["cloudIntervals", "selectedCloud", "weatherSections", "cloudMissing"], expressions = new Map<string, string>();
  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && names.includes(node.name.getText(source)) && node.initializer)
      expressions.set(node.name.getText(source), node.initializer.getText(source));
    ts.forEachChild(node, visit);
  };
  visit(source); assert.equal(expressions.size, names.length);
  const code = ts.transpileModule(names.map(name => `const ${name} = ${expressions.get(name)};`).join("\n") +
    `\n({${names.join(",")}});`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const slots: { deps: readonly unknown[]; value: unknown }[] = []; let cursor = 0;
  const useMemo = (read: () => unknown, deps: readonly unknown[]) => {
    const index = cursor++, previous = slots[index];
    if (!previous || deps.some((value, at) => !Object.is(value, previous.deps[at]))) slots[index] = { deps, value: read() };
    return slots[index]!.value;
  };
  const render = (forecastClockOffsetMs: number) => {
    cursor = 0;
    return vm.runInNewContext(code, { ...sourcePresentation, Date, useMemo, skyReport: f.report,
      astronomyAt: f.stamp(0), weatherTimezone: "UTC", weatherStale: false, forecastClockOffsetMs });
  };
  const prior = render(0); assert.equal(prior.selectedCloud.cloudPercent, 0); assert.equal(prior.cloudIntervals.length, 1);
  const boundary = render(1); assert.equal(boundary.selectedCloud.cloudPercent, 0); assert.equal(boundary.cloudIntervals.length, 1);
  const spot = render(offset);
  assert.deepEqual(Array.from(spot.cloudIntervals), []); assert.equal(spot.selectedCloud, null); assert.equal(spot.cloudMissing, "已过期");
  assert(spot.weatherSections.some((section: any) => section.kind === "facts" && section.items.some((item: any) => item.value === "已过期")));
  const planOffset = actualProp("../content/plan/detail/plan-editor-page.tsx", "PlanReference", "forecastClockOffsetMs",
    { skyQuery: { forecastClockOffsetMs: 2 } });
  const plan = { planId: "plan:a", revision: 1, spotId: "spot:a", contextSnapshot: { timezone: "UTC", selectedAtUtc: f.stamp(0) },
    timing: { endLocalDate: "2026-09-20", endLocalTime: "03:00" } } as ObservationPlan;
  const tree = planRenderer()({ plan, report: f.report, forecastClockOffsetMs: planOffset, loading: false, failed: false, onRetry: () => {} });
  const rendered = nodes(tree);
  assert.deepEqual(rendered.find(node => node.type === "Coverage")?.props.cloudIntervals, []);
  assert.equal(rendered.some(node => node.type === "Credit"), false);
  assert(texts(tree).join("").includes("暂无数据"));
});

test("source disclosure retains exact selected time, actual 3/6 hour brackets and sampler weight", () => {
  const f = cloudSourceReport(), at = new Date(Date.parse(f.stamp(147)) + 17_123).toISOString();
  const sections = weatherSourceSections(f.report, at, "Asia/Shanghai", false, f.now);
  const facts = sections.find(section => section.kind === "facts");
  assert(facts?.kind === "facts");
  assert(facts.items.some(item => item.label === "所选时刻" && item.value.includes("11:00:17.123")));
  assert(facts.items.some(item => item.label === "插值两端" && item.value.endsWith("14:00")));
  assert(facts.items.some(item => item.label === "两端权重" && item.value.includes("前 ") && item.value.includes("后 ")));
  assert(sections.some(section => section.kind === "text" && section.paragraphs.some(text => text.includes("其他天气") && text.includes("分别判定"))));
});

test("cloud-only credits preserve required statements and expiry does not revive the other supplier", () => {
  const f = cloudSourceReport();
  assert.deepEqual(weatherCreditSources(f.report, false, true), [f.source]);
  assert.deepEqual(weatherCreditSources(f.report, true, false), [f.other]);
  const failed = { ...f.report, weatherEvidence: { ...f.report.weatherEvidence,
    totalCloud: { ...f.report.weatherEvidence.totalCloud!, value: null, state: "UNAVAILABLE" as const, errorCode: "read_failed" } } };
  assert.deepEqual(totalCloudCoverage(failed, f.now), []);
  assert.equal(selectedTotalCloud(failed, f.stamp(0), f.now), null);
  const sections = weatherSourceSections(failed, f.stamp(0), "UTC", false, f.now);
  assert(sections.some(section => section.kind === "facts" && section.items.some(item => item.value === "读取失败")));
  const { totalCloud: _cloud, ...weatherEvidence } = f.report.weatherEvidence;
  const legacy = { ...f.report, weatherEvidence, hourly: f.report.hourly.map(({ cloudEvidence: _evidence, ...row }) => ({ ...row, weatherAt: row.at })) };
  assert.equal(totalCloudCoverage(legacy, f.now), undefined);
  assert.deepEqual(weatherCreditSources(legacy, true, false), legacy.sources);
  const legacySections = weatherSourceSections(legacy, f.stamp(0), "UTC", false, f.now);
  assert.equal(legacySections.length, 2); assert(legacySections[0]?.kind === "forecast" && legacySections[0].cloudIntervals === undefined);
});
