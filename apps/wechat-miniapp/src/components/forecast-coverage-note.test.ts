import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { forecastCoverage } from "./forecast-coverage";
import { calendarDateInTimezone, clockTimeInTimezone } from "../utils/zoned-date";

test("question disclosure opens, closes, distinguishes map coverage and resets after a location change", () => {
  const ast = ts.createSourceFile("note.tsx", readFileSync(new URL("./forecast-coverage-note.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const declaration = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === "ForecastCoverageNote")!;
  let open = false, dependencies: unknown[][] = [], effectIndex = 0, effects: (() => void)[] = [];
  const component = vm.runInNewContext(ts.transpileModule(declaration.getText(ast).replace(/^export /, "") + "; ForecastCoverageNote;",
    { compilerOptions: { target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React } }).outputText, {
    useState: () => [open, (value: boolean | ((old: boolean) => boolean)) => { open = typeof value === "function" ? value(open) : value; }],
    useId: () => "coverage-note", useEffect: (fn: () => void, deps: unknown[]) => {
      const previous = dependencies[effectIndex];
      if (!previous || deps.some((value, index) => value !== previous[index])) effects.push(fn);
      dependencies[effectIndex++] = deps;
    }, forecastCoverage, calendarDateInTimezone, clockTimeInTimezone, StatusPanel: "StatusPanel", Button: "Button", Text: "Text", View: "View",
    React: { createElement: (type: string, props: any, ...children: any[]) => ({ type, props, children }) },
  });
  const input = { starts: ["2026-09-15T12:00:00Z"], timezone: "Asia/Shanghai", scopeKey: "spot:a" };
  const text = (v: any): string => v == null || typeof v === "boolean" ? "" : Array.isArray(v) ? v.map(text).join("") : typeof v === "object" ? text(v.children) : String(v);
  const find = (v: any, label: string): any => Array.isArray(v) ? v.map(child => find(child, label)).find(Boolean)
    : v?.props?.["aria-label"] === label ? v : v?.children ? find(v.children, label) : null;
  const render = (props = input) => { effectIndex = 0; const first = component(props); if (!effects.length) return first; effects.splice(0).forEach(fn => fn()); effectIndex = 0; return component(props); };
  let tree = render(); assert.doesNotMatch(text(tree), /未返回及中断/);
  find(tree, "说明天气数据范围").props.onClick(); tree = render();
  assert.match(text(tree), /20:00.*21:00/); assert.match(text(tree), /本地点/); assert.match(text(tree), /天文查看和手动计划/);
  assert.equal(find(tree, "说明天气数据范围").props["aria-expanded"], true);
  find(tree, "关闭天气范围说明").props.onClick(); assert.doesNotMatch(text(render()), /未返回及中断/);
  find(render(), "说明天气数据范围").props.onClick(); tree = render({ ...input, scopeKey: "map:b", scope: "map" } as typeof input);
  assert.doesNotMatch(text(tree), /未返回及中断/);
  find(tree, "说明天气数据范围").props.onClick(); tree = render({ ...input, scopeKey: "map:b", scope: "map" } as typeof input);
  assert.match(text(tree), /地图采样点/); assert.match(text(tree), /不代表整片区域/);
  const empty = render({ ...input, starts: [], scopeKey: "map:empty", scope: "map" } as typeof input);
  const section = (empty.children as any[]).find(child => child?.type === "StatusPanel");
  assert.equal(section.props.state, "EMPTY");
  assert.equal(section.props.emptyLevel, "section");
  assert.match(section.props.detail, /地图采样点/);
  assert.doesNotMatch(text(empty), /暂无数据/);
  const emptyAir = render({ ...input, starts: [], scopeKey: "air:empty", scope: "air" } as typeof input);
  const airSection = (emptyAir.children as any[]).find(child => child?.type === "StatusPanel");
  assert.match(airSection.props.detail, /空气质量小时预报/);
  assert.match(airSection.props.detail, /若有读数/,
    "an empty forecast must not promise a current reading when both AQ segments are unavailable");
  const stale = render({ ...input, starts: [], scopeKey: "map:stale", scope: "map", stale: true } as typeof input);
  assert.equal(stale, null);
  const staleWithRange = render({ ...input, scopeKey: "map:stale-range", scope: "map", stale: true } as typeof input);
  assert.match(text(staleWithRange), /上次获取的预报时段/);
});
