import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { QueryClient, QueryObserver } from "@tanstack/react-query";
import { recentWeatherFacts, recentWeatherImplications } from "./recent-weather-summary";
import { calendarDateInTimezone } from "../utils/zoned-date";

class TestDate extends Date {
  constructor() { super("2026-09-14T20:00:00Z"); }
  static now() { return Date.parse("2026-09-14T20:00:00Z"); }
}

function harness(queryClient = new QueryClient(), transform = (source: string) => source) {
  const ast = ts.createSourceFile("recent.tsx", transform(readFileSync(new URL("./recent-weather.tsx", import.meta.url), "utf8")), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const fn = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === "RecentWeather")!;
  const states: unknown[] = [], dependencies: unknown[][] = [];
  let stateIndex = 0, effectIndex = 0, pending: (() => void)[] = [];
  let query: any, options: any, hide = () => {}, show = () => {};
  const notifications: any[] = []; let retries = 0;
  const notify = (value: any) => notifications.push(value);
  const component = vm.runInNewContext(ts.transpileModule(fn.getText(ast).replace(/^export /, "") + "; RecentWeather;",
    { compilerOptions: { target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React } }).outputText, {
    useState(value: unknown) { const index = stateIndex++; if (!(index in states)) states[index] = value;
      return [states[index], (value: any) => { states[index] = typeof value === "function" ? value(states[index]) : value; }]; },
    useEffect(fn: () => void, deps: unknown[]) { const prev = dependencies[effectIndex];
      if (!prev || deps.some((value, index) => value !== prev[index])) pending.push(fn); dependencies[effectIndex++] = deps; },
    useDidHide(fn: () => void) { hide = fn; }, useDidShow(fn: () => void) { show = fn; },
    useResourceQuery(value: any) { options = value; return query; }, useAppStore: () => notify,
    useQueryClient: () => queryClient,
    getSpotRecentWeather() {}, recentWeatherFacts, recentWeatherImplications, Date: TestDate, calendarDateInTimezone,
    useCalendarDay: (timezone: string) => calendarDateInTimezone(new TestDate(), timezone),
    Button: "Button", Text: "Text", View: "View", Provenance: "Provenance", StatusPanel: "StatusPanel", SoftButton: "SoftButton", SourceAttribution: "SourceAttribution",
    React: { createElement: (type: string, props: any, ...children: any[]) => ({ type, props, children }) },
  });
  return {
    notifications, get options() { return options; }, get retries() { return retries; }, hide: () => hide(), show: () => show(),
    set(result: any) { query = { isPending: false, isError: false, ...result, refetch: async () => { retries++; } }; },
    render(spotId = "spot:a", visible = true) { stateIndex = effectIndex = 0; const tree = component({ spotId, timezone: "Asia/Shanghai", visible });
      if (!pending.length) return tree; pending.splice(0).forEach(fn => fn()); stateIndex = effectIndex = 0; return component({ spotId, timezone: "Asia/Shanghai", visible }); },
  };
}
const text = (value: any): string => value == null || typeof value === "boolean" ? "" : Array.isArray(value) ? value.map(text).join("") : typeof value === "object" ? text(value.children) : String(value);
function find(value: any, predicate: (node: any) => boolean): any {
  return Array.isArray(value) ? value.map(child => find(child, predicate)).find(Boolean) : value && typeof value === "object"
    ? predicate(value) ? value : find(value.children, predicate) : null;
}
const body = { spotId: "spot:a", region: { name: "区域甲", timezone: "Asia/Shanghai" }, asOfLocalDate: "2026-09-15", missingDates: ["2026-09-14"],
  days: [{ localDate: "2026-09-13", precipitationMm: 12, temperatureMinC: 8, temperatureMaxC: null, conditions: ["小雨"] }], unavailableReason: "REQUEST_FAILED" };

test("foreign regional date cleanup waits for explicit retry instead of fetching under the spot date", async () => {
  async function exercise(transform?: (source: string) => string) {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const h = harness(client, transform); h.set({ isPending: true }); h.render();
    let fail = false, calls = 0;
    const queryFn = async () => {
      calls++;
      if (fail) throw new Error("503");
      return { data: { ...body, region: { name: "纽约实时地区", timezone: "America/New_York" },
        asOfLocalDate: "2026-09-14", unavailableReason: null }, dataState: "FRESH", sources: [] };
    };
    const observer = new QueryObserver(client, { ...h.options, queryFn });
    const unsubscribe = observer.subscribe(() => {});
    const settle = () => new Promise(resolve => setTimeout(resolve, 10));
    const render = () => {
      const result = observer.getCurrentResult();
      h.set({ ...result, refreshError: result.error });
      const tree = h.render();
      // Reapply the actual component's changed date/enabled identity, as React does.
      observer.setOptions({ ...h.options, queryFn });
      return tree;
    };
    try {
      await settle(); render(); await settle(); render(); await settle();
      assert.equal(h.options.queryKey[2], "2026-09-14");
      assert.match(text(render()), /纽约实时地区/);
      fail = true; await observer.refetch();
      const afterFailure = calls;
      render(); await settle(); let tree = render(); await settle(); tree = render();
      assert.equal(h.options.queryKey[2], "2026-09-15", "Geo timezone is released to the spot timezone");
      assert.equal(calls, afterFailure, "date cleanup must not automatically retry");
      assert.doesNotMatch(text(tree), /纽约实时地区|降水 12|正在加载地区天气/);
      assert.ok(client.getQueryCache().getAll().every(query => query.state.data === undefined));
      const retry = find(tree, node => node.type === "StatusPanel" && node.props.recoveryLabel === "重试近期天气");
      assert.ok(retry);
      fail = false; retry.props.onRecover(); render(); await settle(); render(); await settle(); tree = render();
      assert.ok(calls > afterFailure, "the actual retry button releases the failure lock");
      assert.match(text(tree), /纽约实时地区.*降水 12/s);
    } finally { unsubscribe(); client.clear(); }
  }
  await exercise();
  await assert.rejects(exercise(source => {
    assert.ok(source.includes("const enabled = active && !liveFailed;"));
    return source.replace("const enabled = active && !liveFailed;", "const enabled = active;");
  }), /date cleanup must not automatically retry/, "removing the failure lock must expose the escaped defect");
});

test("real query lifecycle releases Geo state on hide, reacquires on show and cancels departed work", async () => {
  const h = harness(); h.set({ isPending: true }); h.render();
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  let calls = 0, signal: AbortSignal | undefined;
  const options = () => ({ ...h.options, queryFn: (context: { signal: AbortSignal }) => {
    calls++; signal = context.signal;
    return calls === 1 ? Promise.resolve({ region: "live-geo" }) : new Promise(() => {});
  } });
  const observer = new QueryObserver(client, options());
  const unsubscribe = observer.subscribe(() => {});
  const settle = () => new Promise(resolve => setTimeout(resolve, 10));
  try {
    await settle();
    assert.deepEqual(observer.getCurrentResult().data, { region: "live-geo" });
    h.hide(); h.render(); observer.setOptions(options()); await settle();
    assert.equal(observer.getCurrentResult().data, undefined);
    assert.ok(client.getQueryCache().getAll().every(query => query.state.data === undefined));
    h.show(); h.render(); observer.setOptions(options()); await settle();
    assert.equal(calls, 2, "show must acquire live Geo rather than use the prior result");
    h.render("spot:b"); observer.setOptions(options()); await settle();
    assert.equal(calls, 3);
    const departed = signal!;
    unsubscribe(); await settle();
    assert.equal(departed.aborted, true);
    assert.equal(client.getQueryCache().getAll().length, 0);
  } finally { unsubscribe(); client.clear(); }
});

test("refresh failure discards stored Geo data without automatically retrying and manual recovery still works", async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const h = harness(client); h.set({ isPending: true }); h.render();
  let fail = false, calls = 0;
  const options = { ...h.options, queryFn: async () => {
    calls++;
    if (fail) throw new Error("network failed");
    return { data: { ...body, unavailableReason: null }, dataState: "FRESH", sources: [] };
  } };
  const observer = new QueryObserver(client, options);
  const unsubscribe = observer.subscribe(() => {});
  const settle = () => new Promise(resolve => setTimeout(resolve, 10));
  try {
    await settle();
    fail = true; await observer.refetch();
    const result = observer.getCurrentResult();
    assert.ok(result.data, "TanStack preserves old data until the live-only owner discards it");
    h.set({ ...result, refreshError: result.error });
    const tree = h.render();
    assert.doesNotMatch(text(tree), /区域甲|降水 12/);
    assert.ok(find(tree, node => node.type === "StatusPanel" && node.props.state === "ERROR" && node.props.recoveryLabel === "重试近期天气"));
    assert.equal(client.getQueryData(options.queryKey), undefined, "the actual stored payload must be gone");
    await settle(); assert.equal(calls, 2, "discarding Geo must not start a retry loop");
    fail = false; await observer.refetch();
    assert.equal(calls, 3);
    assert.equal((observer.getCurrentResult().data as any).data.region.name, "区域甲");
  } finally { unsubscribe(); client.clear(); }
});

test("partial evidence is visible with dated facts, conditional relevance, question disclosure and persistent retry", () => {
  const h = harness(); h.set({ data: { data: body, dataState: "PARTIAL", sources: [] } });
  let tree = h.render();
  assert.match(text(tree), /区域甲.*2026-09-15.*2026-09-13.*降水 12 mm/s);
  assert.doesNotMatch(text(tree), /最高 0/);
  assert.match(text(tree), /可能湿滑/);
  assert.equal(h.notifications.length, 1);
  find(tree, node => node.props?.["aria-label"] === "说明近期天气数据范围").props.onClick(); tree = h.render();
  assert.match(text(tree), /不含今天.*不是点位过去48小时/);
  assert.match(text(tree), /暂无数据：2026-09-14/);
  find(tree, node => node.type === "SoftButton").props.onClick(); assert.equal(h.retries, 1);
  assert.equal(h.notifications.length, 1, "rerenders do not restart transient notifications");
  h.hide(); h.render(); assert.equal(h.options.enabled, false);
  h.set({ data: undefined, isPending: true }); tree = h.render("spot:b");
  assert.doesNotMatch(text(tree), /区域甲|降水 12|过去48小时/);
});

test("no coverage uses the shared empty state without an exception notification; unpublished spots never query", () => {
  const h = harness(); h.set({ data: { data: { ...body, region: null, days: [], unavailableReason: "NO_DATA" }, dataState: "UNAVAILABLE", sources: [] } });
  const tree = h.render();
  assert.ok(find(tree, node => node.type === "StatusPanel" && node.props.state === "EMPTY"));
  assert.equal(h.notifications.length, 0);
  assert.equal(h.render("contribution:private"), null);
  assert.equal(h.options.enabled, false);
});

test("sample history uses ordinary dated facts and recovery without test explanations", () => {
  const h = harness(); h.set({ data: { data: body, dataState: "SAMPLE_DATA", sources: [] } });
  const tree = h.render();
  assert.match(text(tree), /区域甲.*降水 12 mm.*可能湿滑/s);
  assert.doesNotMatch(text(tree), /测试|验收|示例|真实天气/);
  assert.equal(h.notifications.length, 1);
  find(tree, node => node.type === "SoftButton").props.onClick();
  assert.equal(h.retries, 1);
});

test("Geo-bearing stale responses and older day sets cannot restore recent facts", () => {
  const h = harness(); h.set({ data: { data: { ...body, unavailableReason: null }, dataState: "STALE_USABLE", sources: [] } });
  assert.doesNotMatch(text(h.render()), /区域甲|降水 12|可能湿滑/);
  const next = harness(); next.set({ data: { data: { ...body, asOfLocalDate: "2026-09-14", unavailableReason: null }, dataState: "FRESH", sources: [] } });
  const tree = next.render();
  assert.doesNotMatch(text(tree), /降水 12|可能湿滑/);
  assert.equal(next.notifications.length, 1);
  assert.ok(find(tree, node => node.type === "StatusPanel" && node.props.state === "ERROR" && node.props.recoveryLabel === "重试近期天气"));
});

test("a valid regional calendar day differing from the spot day never emits a false failure", () => {
  const h = harness();
  h.set({ data: { data: { ...body, region: { name: "区域乙", timezone: "America/New_York" },
    asOfLocalDate: "2026-09-14", unavailableReason: null }, dataState: "FRESH", sources: [] } });
  const tree = h.render();
  assert.equal(h.notifications.length, 0, "the first response must be checked in its own regional timezone before effects synchronize the query clock");
  assert.match(text(tree), /区域乙.*2026-09-14.*降水 12/s);
  assert.equal(h.options.queryKey[2], "2026-09-14");
});
