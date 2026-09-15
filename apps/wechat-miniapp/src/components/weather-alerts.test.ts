import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import type { WeatherEvidenceSummary, WeatherAlertEvidence, SourceSummary } from "@starward/miniapp-contracts";
import { weatherAlertState } from "./weather-alert-state";
import { calendarDateInTimezone, clockTimeInTimezone } from "../utils/zoned-date";

const now = Date.parse("2026-09-15T04:00:00Z");
const iso = (offset: number) => new Date(now + offset).toISOString();
const alert: WeatherAlertEvidence = { id: "a", headline: "暴雨预警", description: "发布机构预警正文", instruction: "注意安全",
  eventName: "暴雨", eventCode: "rain", severity: "severe", urgency: null, certainty: null,
  issuedAt: iso(-60_000), effectiveAt: iso(-1000), expiresAt: iso(2000), status: "ACTIVE", material: true, sourceId: "warning" };
const evidence = (changes: Partial<WeatherEvidenceSummary> = {}): WeatherEvidenceSummary => ({ timelineRole: "PRIMARY", warningState: "FRESH",
  warningSource: { id: "warning", validTo: iso(300_000) } as SourceSummary, alerts: [alert], modelRuns: [], ...changes });
const text = (node: any): string => node == null || typeof node === "boolean" ? "" : Array.isArray(node) ? node.map(text).join("")
  : typeof node === "object" ? text(node.children) : String(node);
function load(file: string, name: string, context: object) {
  const ast = ts.createSourceFile(file, readFileSync(new URL(file, import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const code = ast.statements.filter(node => !ts.isImportDeclaration(node)).map(node => node.getText(ast).replace(/^export /, "")).join("\n");
  return vm.runInNewContext(ts.transpileModule(code + `;${name};`, { compilerOptions: { target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React } }).outputText,
    { Date, setTimeout, clearTimeout, weatherAlertState, ...context });
}

test("current warnings respect activation and expiry independently of available forecast hours", () => {
  const current = evidence({ timelineRole: "UNAVAILABLE" });
  assert.equal(weatherAlertState(current, now).alerts.length, 1);
  assert.equal(weatherAlertState(current, now + 2000).alerts.length, 0);
  assert.equal(weatherAlertState(evidence({ alerts: [{ ...alert, effectiveAt: iso(1000) }] }), now).alerts.length, 0);
  for (const status of ["CANCELLED", "EXPIRED", "UNKNOWN"] as const)
    assert.equal(weatherAlertState(evidence({ alerts: [{ ...alert, status }] }), now).alerts.length, 0);
  // The escaped production predicate demonstrably fails this expiry requirement.
  assert.equal(current.alerts.filter(item => item.status === "ACTIVE" && item.material).length, 1);
});

test("a successful empty warning feed differs from failed, partial, legacy and aged feeds", () => {
  assert.equal(weatherAlertState(evidence({ alerts: [] }), now).failed, false);
  for (const warningState of ["UNAVAILABLE", "PARTIAL", "EXPIRED", "STALE_USABLE"] as const)
    assert.equal(weatherAlertState(evidence({ alerts: [], warningState }), now).failed, true);
  const legacy = evidence(); delete legacy.warningSource;
  assert.equal(weatherAlertState(legacy, now).failed, true);
  assert.equal(weatherAlertState(evidence(), now + 300_000).failed, true);
  assert.equal(weatherAlertState(evidence(), now, true).failed, true);
});

test("shared actual rendering removes resolved alerts, shows timestamps, and retains an actionable failure", () => {
  let currentTime = now, recovery = 0;
  const notices: any[] = [];
  const React = { createElement(type: any, props: any, ...children: any[]): any {
    return typeof type === "function" ? type({ ...props, children }) : { type, props, children };
  } };
  const render = load("./weather-alerts.tsx", "WeatherAlerts", { React, Text: "Text", View: "View", StatusPanel: (props: any) => ({ type: "StatusPanel", props, children: props.detail }),
    useWeatherAlertClock: () => currentTime, useEffect: (effect: () => void) => effect(),
    useAppStore: (select: any) => select({ notify: (value: any) => notices.push(value) }), calendarDateInTimezone, clockTimeInTimezone });
  const props = { evidence: evidence(), timezone: "Asia/Shanghai", active: true, scopeKey: "spot:a", onRecover: () => recovery++ };
  assert.match(text(render(props)), /暴雨预警.*发布：2026-09-15 11:59.*截至 2026-09-15 12:00/);
  assert.doesNotMatch(text(render(props)), /出行建议|阻断/);
  assert.equal(render({ ...props, evidence: evidence({ alerts: [] }) }), null);
  currentTime += 2000;
  assert.equal(render(props), null, "expiration cannot leave a queued persistent warning");
  const failed = render({ ...props, evidence: evidence({ alerts: [], warningState: "UNAVAILABLE" }) });
  const status = failed.children.flat().find((child: any) => child?.type === "StatusPanel");
  assert.match(text(failed), /官方预警暂未确认最新状态/);
  assert.equal(status.props.recoveryLabel, "重试官方预警"); status.props.onRecover(); assert.equal(recovery, 1);
  assert.equal(notices.length, 1);
  render({ ...props, active: false, evidence: evidence({ alerts: [], warningState: "UNAVAILABLE" }) });
  assert.equal(notices.length, 1, "hidden consumers do not emit floating failures");
  currentTime = now + 300_000;
  const pending = render({ ...props, refreshing: true });
  assert.match(text(pending), /正在更新官方预警/);
  assert.equal(notices.length, 1, "ordinary expiry revalidation is not an exception");
  render({ ...props, refreshFailed: true });
  assert.equal(notices.length, 1, "report transport owner already emits this failure");
  render({ ...props, reportHandlesFailure: true });
  assert.equal(notices.length, 1, "unavailable/expired report already reports failure");
  currentTime = now;
  assert.match(text(render({ ...props, reportHandlesFailure: true })), /示例|暴雨预警/,
    "missing forecast must not erase independently valid warning evidence");
});

test("mounted clock expires alerts without input, refreshes, stops on hide and resamples on show", t => {
  t.mock.timers.enable({ apis: ["Date", "setTimeout"], now });
  let state: number, deps: any[] | undefined, effect: any, cleanup: any, refreshes = 0;
  const hook = load("./use-weather-alert-clock.ts", "useWeatherAlertClock", {
    useState: (initial: any) => { state ??= initial(); return [state, (next: number) => { state = next; }]; },
    useRef: (value: any) => ({ current: value }),
    useEffect: (fn: any, next: any[]) => { if (!deps || next.some((v, i) => v !== deps![i])) { cleanup?.(); effect = fn; deps = next; } },
  });
  const input = evidence();
  const render = (active: boolean) => { let time = hook(input, active, () => refreshes++); if (effect) { cleanup = effect(); effect = null; time = hook(input, active, () => refreshes++); } return time; };
  assert.equal(weatherAlertState(input, render(true)).alerts.length, 1);
  t.mock.timers.tick(2000);
  assert.equal(weatherAlertState(input, render(true)).alerts.length, 0);
  assert.equal(refreshes, 1);
  render(false); t.mock.timers.tick(600_000); assert.equal(refreshes, 1);
  assert.equal(weatherAlertState(input, render(true)).failed, true);
  cleanup?.();
});

test("actual Map and Sky report queries refresh while visible, including a previously unavailable feed", () => {
  const query = (file: string, declaration: string, context: object) => {
    const ast = ts.createSourceFile(file, readFileSync(new URL(file, import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    let expression = "";
    function visit(node: ts.Node) {
      if (ts.isVariableDeclaration(node) && node.name.getText(ast) === declaration && node.initializer && ts.isCallExpression(node.initializer))
        expression = node.initializer.arguments[0]!.getText(ast);
      ts.forEachChild(node, visit);
    }
    visit(ast); assert.ok(expression);
    return vm.runInNewContext(ts.transpileModule(`const options = ${expression}; options;`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText,
      { WEATHER_ALERT_REFRESH_MS: 300_000, ...context });
  };
  for (const pageVisible of [true, false]) {
    const common = { pageVisible, activeContext: { contextId: "ctx" }, getSkyReport: (...args: unknown[]) => args };
    const map = query("../pages/map/index.tsx", "spotSky", { ...common, selected: { spotId: "spot:a" }, bottomPresentation: "spot-panel", detailContextReady: true });
    const sky = query("../features/sky/spot-sky-page.tsx", "report", { ...common, routeContext: { spotId: "spot:a" }, contextComplete: true });
    for (const options of [map, sky]) {
      assert.equal(options.enabled, pageVisible);
      assert.equal(options.staleTime, 0);
      assert.equal(options.refetchInterval, 300_000);
      assert.equal(options.queryFn(undefined)[0], "spot:a", "actual report consumer, not a sibling overview query");
    }
  }
});

test("actual Sky report feedback and warning consumer produce one notice without discarding independent alerts", () => {
  const ast = ts.createSourceFile("sky.tsx", readFileSync(new URL("../features/sky/spot-sky-page.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let hostEffect = "";
  const expressions: Record<string, string> = {};
  function visit(node: ts.Node) {
    if (ts.isCallExpression(node) && node.expression.getText(ast) === "useEffect" && node.arguments[0]?.getText(ast).includes("spot-night-state:"))
      hostEffect = node.arguments[0].getText(ast);
    if (ts.isJsxSelfClosingElement(node) && node.tagName.getText(ast) === "WeatherAlerts") {
      for (const property of node.attributes.properties) {
        if (ts.isJsxAttribute(property) && ["refreshFailed", "reportHandlesFailure"].includes(property.name.getText(ast)) &&
          property.initializer && ts.isJsxExpression(property.initializer) && property.initializer.expression)
          expressions[property.name.getText(ast)] = property.initializer.expression.getText(ast);
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(ast); assert.ok(hostEffect); assert.equal(Object.keys(expressions).length, 2);
  const run = (code: string, scope: object) => vm.runInNewContext(ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, scope);
  const notices: any[] = [];
  const React = { createElement(type: any, props: any, ...children: any[]): any {
    return typeof type === "function" ? type({ ...props, children }) : { type, props, children };
  } };
  const notify = (value: any) => notices.push(value);
  const render = load("./weather-alerts.tsx", "WeatherAlerts", { React, Text: "Text", View: "View", StatusPanel: "StatusPanel",
    useWeatherAlertClock: () => now, useEffect: (effect: () => void) => effect(), useAppStore: (select: any) => select({ notify }), calendarDateInTimezone, clockTimeInTimezone });
  for (const dataState of ["STALE_USABLE", "UNAVAILABLE", "EXPIRED", "PARTIAL"]) for (const fresh of [false, true]) {
    notices.length = 0;
    const report = { data: { dataState, warnings: [] }, isFetching: false, isError: false, refreshError: undefined };
    run(`(${hostEffect})()`, { report, contextComplete: true, pageVisible: true, notify, routeContext: { spotId: "spot:a", localDate: "2026-09-15" } });
    const tree = render({ evidence: evidence({ warningState: fresh ? "FRESH" : "UNAVAILABLE", alerts: fresh ? [alert] : [] }),
      timezone: "Asia/Shanghai", active: true, scopeKey: "spot:a", refreshing: false,
      ...Object.fromEntries(Object.entries(expressions).map(([key, expression]) => [key, run(expression, { report })])), onRecover: () => {} });
    assert.deepEqual(notices.map(item => item.owner), dataState === "PARTIAL" ? fresh ? [] : ["weather-alerts"] : ["spot-night"]);
    if (fresh && dataState !== "STALE_USABLE") {
      assert.match(text(tree), /暴雨预警/);
      assert.doesNotMatch(JSON.stringify(tree), /"type":"StatusPanel"/);
    }
  }
});
