import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { airQualityState } from "./air-quality-state";
import { calendarDateInTimezone, clockTimeInTimezone } from "../utils/zoned-date";

function harness() {
  const ast = ts.createSourceFile("air.tsx", readFileSync(new URL("./air-quality.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const declarations = ast.statements.filter(ts.isFunctionDeclaration).map(fn => fn.getText(ast).replace(/^export /, "")).join("\n");
  let active = true, query: any, options: any, hide = () => {}, show = () => {}, retries = 0;
  let previous: unknown[] | undefined;
  const notifications: any[] = [], notify = (value: any) => notifications.push(value);
  class TestDate extends Date { static now() { return Date.parse("2026-09-15T00:00:00Z"); } }
  const component = vm.runInNewContext(ts.transpileModule(declarations + "; AirQuality;", {
    compilerOptions: { target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React },
  }).outputText, {
    useState: () => [active, (value: boolean) => { active = value; }],
    useEffect(fn: () => void, dependencies: unknown[]) { if (!previous || dependencies.some((value, index) => value !== previous![index])) fn(); previous = dependencies; },
    useDidHide(fn: () => void) { hide = fn; }, useDidShow(fn: () => void) { show = fn; },
    useAirQualityQuery(value: any) { options = value; return query; }, useAppStore: () => notify,
    getSpotAirQuality() {}, airQualityState, Date: TestDate, calendarDateInTimezone, clockTimeInTimezone,
    Text: "Text", View: "View", ForecastCoverageNote: "ForecastCoverageNote", Provenance: "Provenance", SoftButton: "SoftButton", StatusPanel: "StatusPanel",
    React: { createElement: (type: any, props: any, ...children: any[]) => typeof type === "function" ? type(props) : ({ type, props, children }) },
  });
  return { notifications, get options() { return options; }, get retries() { return retries; }, hide: () => hide(), show: () => show(),
    set(data: any, extra = {}) { query = { data, isPending: false, isError: false, ...extra, refetch: async () => { retries++; } }; },
    render(spotId = "spot:a", visible = true) { return component({ spotId, visible, selectedAt: "2026-09-15T01:30:00Z", timezone: "Asia/Shanghai" }); },
  };
}
const text = (value: any): string => value == null || typeof value === "boolean" ? "" : Array.isArray(value) ? value.map(text).join("") : typeof value === "object" ? text(value.children) : String(value);
const find = (value: any, predicate: (node: any) => boolean): any => Array.isArray(value) ? value.map(child => find(child, predicate)).find(Boolean)
  : value && typeof value === "object" ? predicate(value) ? value : find(value.children, predicate) : null;
const source = { retrievedAt: "2026-09-15T00:00:00Z" };
const body = { spotId: "spot:a", current: { value: null, state: "UNAVAILABLE", unavailableReason: "REQUEST_FAILED", source },
  forecast: { value: [{ at: "2026-09-15T01:00:00Z", indexes: [{ code: "cn-mee", name: "中国 AQI", display: "32", category: "优" }], pollutants: [] }], state: "FRESH", source } };

test("visible AQ retains forecast on current error, offers persistent retry and suspends hidden queries", () => {
  const h = harness(); h.set({ data: body, dataState: "PARTIAL", sources: [] });
  const tree = h.render();
  assert.match(text(tree), /所选时刻.*对应小时.*中国 AQI.*32.*优/s);
  assert.ok(find(tree, node => node.type === "StatusPanel" && node.props.state === "EMPTY"));
  assert.equal(h.notifications.length, 1);
  find(tree, node => node.type === "SoftButton").props.onClick(); assert.equal(h.retries, 1);
  assert.equal(find(tree, node => node.type === "ForecastCoverageNote").props.scope, "air");
  h.render(); assert.equal(h.notifications.length, 1);
  assert.equal(h.options.refetchInterval, 60_000);
  h.hide(); h.render(); assert.equal(h.options.enabled, false);
  h.show(); h.render(); assert.equal(h.options.enabled, true); assert.equal(h.retries, 1, "resume refresh belongs to the shared query hook");
});

test("unsupported AQ emits no error, changing spot rejects old readings and pending proposal does not query", () => {
  const h = harness(); h.set({ data: { ...body, current: { ...body.current, unavailableReason: "NO_DATA" } }, dataState: "PARTIAL", sources: [] });
  h.render(); assert.equal(h.notifications.length, 0);
  assert.doesNotMatch(text(h.render("spot:b")), /中国 AQI|32/);
  assert.equal(h.render("contribution:private"), null); assert.equal(h.options.enabled, false);
  h.show(); assert.equal(h.retries, 0);
});

test("sample AQ keeps values and ordinary failure recovery without adding test explanations", () => {
  const h = harness(); h.set({ data: body, dataState: "SAMPLE_DATA", sources: [] });
  const tree = h.render();
  assert.match(text(tree), /中国 AQI.*32.*优/s);
  assert.doesNotMatch(text(tree), /测试|验收|示例|真实天气/);
  assert.equal(h.notifications.length, 1);
  find(tree, node => node.type === "SoftButton").props.onClick();
  assert.equal(h.retries, 1);
});
