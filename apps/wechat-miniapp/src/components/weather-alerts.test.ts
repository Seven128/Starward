import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import type { WeatherEvidenceSummary, WeatherAlertEvidence, SourceSummary } from "@starward/miniapp-contracts";
import { weatherAlertState } from "./weather-alert-state";
import { calendarDateInTimezone, clockTimeInTimezone } from "../utils/zoned-date";
import { skyReportTestPolicy } from "../features/sky/sky-report-test-support";
import { skyFailureTestEpisodes } from "../features/sky/sky-failure-test-support";
import { createResourceFailureEpisode } from "../services/resource-failure-episode";
const {skyReportRecovery}=skyReportTestPolicy;

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
    { Date, setTimeout, clearTimeout, weatherAlertState, SourceAttribution: "SourceAttribution", SourceEntry: "SourceEntry",
      useState: (value: unknown) => [value, () => {}], useMemo: (create: () => unknown) => create(),
      createResourceFailureEpisode, ...context });
}

test("one official-warning failure survives source return and automatic refresh until health or accepted retry", () => {
  const notices: unknown[] = [], dependencies: unknown[][] = [];
  let slot = 0, memo: unknown, allowRetry = false, retries = 0, refreshes = 0;
  let clockRefresh = () => {};
  const notify = (notice: unknown) => notices.push(notice);
  const component = load("./weather-alerts.tsx", "WeatherAlerts", {
    React: { createElement: (type: unknown, props: unknown, ...children: unknown[]) => ({ type, props, children }) },
    Text: "Text", View: "View", StatusPanel: "StatusPanel", calendarDateInTimezone, clockTimeInTimezone,
    useWeatherAlertClock: (_evidence: unknown, _active: boolean, refresh: () => void) => { clockRefresh = refresh; return now; },
    useAppStore: (select: any) => select({ notify }),
    useMemo: (create: () => unknown) => memo ??= create(),
    useEffect: (effect: () => void, next: unknown[]) => {
      const index = slot++, prior = dependencies[index];
      dependencies[index] = next;
      if (!prior || next.some((value, position) => value !== prior[position])) effect();
    },
  });
  const failed = evidence({ alerts: [], warningState: "UNAVAILABLE" });
  const props = { evidence: failed, timezone: "Asia/Shanghai", active: true, scopeKey: "spot:a",
    onRecover: () => { if (!allowRetry) return false; retries++; return true; }, onRefresh: () => { refreshes++; } };
  const render = (change: object = {}) => { slot = 0; return component({ ...props, ...change }); };
  const status = (tree: any) => tree.children.flat().find((child: any) => child?.type === "StatusPanel");
  render(); render({ active: false }); render();
  assert.equal(notices.length, 1, "returning from Sources cannot restart the same failed warning episode");
  render({ refreshing: true }); render();
  render({ evidence: undefined }); render();
  assert.equal(notices.length, 1, "refresh and temporary absence do not establish recovery");
  render({ evidence: evidence({ alerts: [] }) }); render();
  assert.equal(notices.length, 2, "a verified fresh empty feed ends the failure");
  status(render()).props.onRecover(); render({ refreshing: true }); render();
  assert.equal(retries, 0); assert.equal(notices.length, 2, "a rejected parent command cannot rearm feedback");
  allowRetry = true; status(render()).props.onRecover(); render({ refreshing: true }); render();
  assert.equal(retries, 1); assert.equal(notices.length, 3);
  clockRefresh(); render({ refreshing: true }); render();
  assert.equal(refreshes, 1); assert.equal(retries, 1, "the expiry clock uses refresh, not the parent's explicit retry policy");
  assert.equal(notices.length, 3);
  render({ scopeKey: "spot:b" }); assert.equal(notices.length, 4);
});

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

test("compact warning facts keep the original authority, missing times and complete defence reading", () => {
  let expanded: string[] = [];
  const React = { createElement(type: any, props: any, ...children: any[]): any {
    return typeof type === "function" ? type({ ...props, children }) : { type, props, children };
  } };
  const render = load("./weather-alerts.tsx", "WeatherAlerts", {
    React, Text: "Text", View: "View", Button: "Button", SemanticIcon: "SemanticIcon", StatusPanel: "StatusPanel",
    useState: () => [expanded, (value: any) => { expanded = typeof value === "function" ? value(expanded) : value; }],
    useWeatherAlertClock: () => now, useEffect: () => {}, useAppStore: () => () => {}, calendarDateInTimezone, clockTimeInTimezone,
  });
  const current = { ...alert, senderName: "原始发布机构", effectiveAt: null, expiresAt: null,
    instruction: "注意安全。\n请停止露天观测，远离孤立树木、金属围栏与水边。" };
  const props = { evidence: evidence({ alerts: [current] }), timezone: "Asia/Shanghai", active: true, scopeKey: "spot:a", onRecover() {} };
  const nodes = (tree: any): any[] => !tree || typeof tree !== "object" ? [] : Array.isArray(tree) ? tree.flatMap(nodes) : [tree, ...nodes(tree.children)];
  const closed = render({ ...props, compact: true });
  assert.match(text(closed), /暴雨预警.*原始发布机构.*发布2026-09-15 11:59.*生效来源未提供.*到期来源未提供.*北京时间 UTC\+8/);
  assert.doesNotMatch(text(closed), /发布机构预警正文/);
  assert.equal(nodes(closed).find(node => node.props?.className === "weather-alerts__instruction")?.children[0], current.instruction,
    "the complete original safety instruction is readable before expanding details");
  const toggle = nodes(closed).find(node => node.type === "Button" && node.props["aria-expanded"] === false);
  assert.equal(toggle.props.ariaLabel, "完整预警与防御指引");
  assert.equal(nodes(closed).filter(node => node.type === "SourceAttribution").length, 1, "required attribution is beside collapsed content");
  toggle.props.onClick();
  const opened = render({ ...props, compact: true });
  assert.match(text(opened), /发布机构预警正文/);
  assert.equal(nodes(opened).filter(node => node.props?.className === "weather-alerts__instruction").length, 1);
  assert.equal(nodes(opened).find(node => node.type === "SourceEntry").props.sources[0], props.evidence.warningSource);
  assert.equal(nodes(opened).find(node => node.type === "SourceEntry").props.sections, undefined,
    "the source page must not become the owner of the warning description or defence instruction");
  nodes(opened).find(node => node.type === "Button").props.onClick();
  const closedAgain = render({ ...props, compact: true });
  assert.doesNotMatch(text(closedAgain), /发布机构预警正文/);
  assert.ok(text(closedAgain).includes(current.instruction));
  assert.equal(nodes(render({ ...props, compact: true, evidence: evidence({ alerts: [{ ...current, instruction: null }] }) }))
    .some(node => node.props?.className === "weather-alerts__instruction"), false, "no safety action is invented when the source omits it");
  assert.match(text(render(props)), /发布机构预警正文.*注意安全/, "default Sky presentation keeps the complete original text visible");
});

test("warning content changes notify a measured parent on activation and expiry, without a report replacement",()=>{
  let currentTime=now-2000,measurements=0,slot=0;
  const deps:Array<unknown[]>=[];
  const render=load("./weather-alerts.tsx","WeatherAlerts",{
    React:{createElement:(type:any,props:any,...children:any[])=>({type,props,children})},Text:"Text",View:"View",StatusPanel:"StatusPanel",
    calendarDateInTimezone,clockTimeInTimezone,useWeatherAlertClock:()=>currentTime,
    useAppStore:(selector:any)=>selector({notify:()=>{}}),
    useEffect:(fn:any,next:unknown[])=>{const index=slot++;if(!deps[index]||next.some((value,i)=>value!==deps[index]![i]))fn();deps[index]=next;},
  });
  const props={evidence:evidence(),timezone:"Asia/Shanghai",active:true,scopeKey:"spot:a",onRecover:()=>{},onContentChange:()=>measurements++};
  const draw=()=>{slot=0;render(props);};
  draw();assert.equal(measurements,1);
  currentTime=now;draw();assert.equal(measurements,2,"local activation changes height");
  currentTime=now+1000;draw();assert.equal(measurements,2,"unchanged content does not trigger a measurement on every render");
  currentTime=now+2000;draw();assert.equal(measurements,3,"local expiry releases height without needing a new report");
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
      if (ts.isCallExpression(node) && node.expression.getText(ast) === 'useSkyForecastQuery') {
        assert.equal(expression,'','one report forecast consumer per page');
        expression = node.arguments[0]!.getText(ast);
      }
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

test("the actual Sky warning clock refresh respects the live guard without explicit-retry bookkeeping", () => {
  const page = ts.createSourceFile("sky.tsx", readFileSync(new URL("../features/sky/spot-sky-page.tsx", import.meta.url), "utf8"),
    ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let expression = "";
  function visit(node: ts.Node) {
    if (ts.isJsxSelfClosingElement(node) && node.tagName.getText(page) === "WeatherAlerts") {
      const property = node.attributes.properties.find(item => ts.isJsxAttribute(item) && item.name.getText(page) === "onRefresh");
      if (property && ts.isJsxAttribute(property) && property.initializer && ts.isJsxExpression(property.initializer))
        expression = property.initializer.expression?.getText(page) ?? "";
    }
    ts.forEachChild(node, visit);
  }
  visit(page); assert.ok(expression);
  let allowed = false, requests = 0, manualRetries = 0;
  const current = { current: { refetch: () => { requests++; } } }, restore = { current: true };
  const refresh = vm.runInNewContext(ts.transpileModule(`(${expression})`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText,
    { canRetryReport: () => allowed, reportRecoveryRef: current, autoRestoreAttemptedRef: restore,
      retryReport: () => { manualRetries++; }, failureEpisodes: { report: { retry: () => { manualRetries++; } } } });
  refresh(); assert.equal(requests, 0);
  allowed = true; refresh(); assert.equal(requests, 1);
  current.current = { refetch: () => { requests += 10; } }; refresh(); assert.equal(requests, 11);
  assert.equal(manualRetries, 0); assert.equal(restore.current, true);
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
    run(`(${hostEffect})()`, { report,reportRecovery:skyReportRecovery(undefined,true,dataState as any),
      failureEpisodes:skyFailureTestEpisodes(),carriedReport:null,contextMatches:true,
      activeContext:{contextId:'ctx'},contextComplete: true, pageVisible: true, notify, routeContext: { spotId: "spot:a", localDate: "2026-09-15" } });
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
