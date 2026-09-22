import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { hashKey, onlineManager, QueryClient, QueryObserver } from "@tanstack/react-query";
import * as presentation from "../services/forecast-presentation";
import { airQualityState } from "./air-quality-state";
import { calendarDateInTimezone, clockTimeInTimezone } from "../utils/zoned-date";

const boundary = Date.parse("2026-09-20T12:00:00Z");
const snapshot = (display: string) => ({ indexes: [{ code: "cn-mee", name: "中国 AQI", value: Number(display), display, category: null, primaryPollutant: null }], pollutants: [] });
const source = (retrievedAt: string) => ({ retrievedAt, publishedAt: null, validTo: null, state: "FRESH" });
const text = (value: any): string => value == null || typeof value === "boolean" ? "" : Array.isArray(value) ? value.map(text).join("")
  : typeof value === "object" ? text(value.children) : String(value);

function mountedAirQuality(currentExpires: boolean) {
  const stripImports = (path: string) => {
    const ast = ts.createSourceFile(path, readFileSync(new URL(path, import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    return ast.statements.filter(node => !ts.isImportDeclaration(node)).map(node => node.getText(ast).replace(/^export /, "")).join("\n");
  };
  const code = stripImports("../hooks/use-forecast-query.ts") + "\n" + stripImports("./air-quality.tsx") + ";AirQuality;";
  const slots: any[] = [], effects: Array<() => void> = [], notifications: unknown[] = [], refreshOptions: Array<{ cancelRefetch?: boolean } | undefined> = [];
  let cursor = 0, dirty = true, tree: any, refreshes = 0, hide = () => {}, show = () => {};
  const notify = (value: unknown) => notifications.push(value);
  const envelope = { dataState: "FRESH", sources: [] as any[], data: {
    spotId: "spot:a",
    current: { value: snapshot("71"), state: "FRESH", unavailableReason: null,
      source: source(currentExpires ? "2026-09-20T11:00:00Z" : "2026-09-20T11:59:00Z") },
    forecast: { value: [{ ...snapshot("23"), at: currentExpires ? "2026-09-20T12:00:00Z" : "2026-09-20T11:00:00Z" }],
      state: "FRESH", unavailableReason: null, source: source("2026-09-20T11:00:00Z") },
  } };
  envelope.sources = [envelope.data.current.source, envelope.data.forecast.source];
  const query = { data: envelope, isPending: false, isError: false, refreshError: undefined as unknown,
    refetch: async (options?: { cancelRefetch?: boolean }) => { refreshOptions.push(options); refreshes++; return undefined; } };
  const same = (a: unknown[] | undefined, b: unknown[]) => a && a.length === b.length && b.every((value, index) => Object.is(a[index], value));
  const component = vm.runInNewContext(ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React } }).outputText, {
    ...presentation, Date, setTimeout, clearTimeout, hashKey, airQualityState, calendarDateInTimezone, clockTimeInTimezone,
    useResourceQuery: () => query, useAppStore: () => notify, getSpotAirQuality() {},
    useDidHide(fn: () => void) { hide = fn; }, useDidShow(fn: () => void) { show = fn; },
    useRef(value: unknown) { const index = cursor++; return slots[index] ??= { current: value }; },
    useState(value: unknown) { const index = cursor++; if (!(index in slots)) slots[index] = typeof value === "function" ? value() : value;
      return [slots[index], (next: any) => { slots[index] = typeof next === "function" ? next(slots[index]) : next; dirty = true; }]; },
    useMemo(fn: () => unknown, deps: unknown[]) { const index = cursor++; if (!same(slots[index]?.deps, deps)) slots[index] = { deps, value: fn() }; return slots[index].value; },
    useEffect(fn: () => unknown, deps: unknown[]) { const index = cursor++; if (!same(slots[index]?.deps, deps)) {
      const old = slots[index]; slots[index] = { deps }; effects.push(() => { old?.cleanup?.(); slots[index].cleanup = fn(); });
    } },
    Text: "Text", View: "View", ForecastCoverageNote: "ForecastCoverageNote", Provenance: "Provenance", SoftButton: "SoftButton", StatusPanel: "StatusPanel",
    React: { createElement: (type: any, props: any, ...children: any[]) => typeof type === "function" ? type(props) : ({ type, props, children }) },
  });
  const renderedSources = (node: any): any[] => Array.isArray(node) ? node.flatMap(renderedSources)
    : node && typeof node === "object" ? node.type === "Provenance" ? [node.props.source] : renderedSources(node.children) : [];
  return { envelope, notifications, query, refreshOptions, sources: () => renderedSources(tree), refreshes: () => refreshes, hide: () => hide(), show: () => show(),
    receive(data: typeof envelope) { query.data = data; dirty = true; },
    fail(error: unknown) { query.refreshError = error; dirty = true; },
    flush() {
      // Unlike calling render after a clock change, this only commits an actual
      // component state update. A missing boundary timer leaves the old tree.
      for (let pass = 0; dirty && pass < 20; pass++) {
        dirty = false; cursor = 0;
        tree = component({ spotId: "spot:a", visible: true, selectedAt: currentExpires ? "2026-09-20T12:30:00Z" : "2026-09-20T11:30:00Z", timezone: "UTC" });
        effects.splice(0).forEach(effect => effect());
      }
      assert.equal(dirty, false, "component should settle without a render loop");
      return text(tree);
    }, dispose() { slots.forEach(slot => slot?.cleanup?.()); },
  };
}

for (const currentExpires of [true, false]) test(`AQ idle ${currentExpires ? "current" : "forecast"} expiry updates the mounted component without an unrelated render`, t => {
  t.mock.timers.enable({ apis: ["Date", "setTimeout"], now: boundary - 1000 });
  const host = mountedAirQuality(currentExpires);
  try {
    assert.match(host.flush(), /71/); assert.match(host.flush(), /23/);
    t.mock.timers.tick(1000);
    const after = host.flush();
    assert.doesNotMatch(after, currentExpires ? /71/ : /23/, "elapsed reading must leave the visible tree at its own boundary");
    assert.match(after, currentExpires ? /23/ : /71/, "independent valid sibling must remain visible");
    assert.equal(host.refreshes(), 1, "one boundary refresh, even when it yields no replacement envelope");
    assert.equal(host.refreshOptions[0]?.cancelRefetch, false, "automatic boundary refresh joins any request already in flight");
    assert.equal(host.notifications.length, 0, "normal elapsed coverage is not a transport error");
    assert.notEqual(host.sources()[currentExpires ? 0 : 1]?.state, "FRESH", "visible source card must not keep claiming fresh elapsed data");
    assert.equal(host.sources()[currentExpires ? 1 : 0]?.state, "FRESH", "independent source remains fresh");
    assert.equal(host.envelope.data.current.value.indexes[0]!.display, "71", "retained query cache is not mutated");
    assert.equal(host.envelope.data.forecast.value[0]!.indexes[0]!.display, "23");
  } finally { host.dispose(); }
});

test("AQ hidden expiry clears on return and schedules one recovery request", t => {
  t.mock.timers.enable({ apis: ["Date", "setTimeout"], now: boundary - 1000 });
  const host = mountedAirQuality(true);
  try {
    assert.match(host.flush(), /71/);
    host.hide(); host.flush();
    t.mock.timers.tick(1000);
    assert.equal(host.refreshes(), 0, "hidden component must not query on its former deadline");
    host.show();
    const resumed = host.flush();
    assert.doesNotMatch(resumed, /71/);
    assert.match(resumed, /23/);
    assert.equal(host.refreshes(), 1, "page show and boundary resume must share recovery ownership");
    assert.equal(host.refreshOptions[0]?.cancelRefetch, false, "resume joins the query's own enabled-state fetch");
    assert.equal(host.notifications.length, 0);
  } finally { host.dispose(); }
});

test("AQ refresh failure retains valid forecast and cannot restore elapsed current readings", t => {
  t.mock.timers.enable({ apis: ["Date", "setTimeout"], now: boundary - 1000 });
  const host = mountedAirQuality(true);
  try {
    host.flush(); t.mock.timers.tick(1000); host.flush();
    host.fail(new Error("network unavailable"));
    assert.doesNotMatch(host.flush(), /71/);
    assert.match(host.flush(), /23/);
    assert.equal(host.notifications.length, 1, "transport failure retains explicit notification");
    host.receive(structuredClone(host.envelope));
    assert.doesNotMatch(host.flush(), /71/);
    assert.equal(host.refreshes(), 1, "repeated elapsed envelopes do not loop recovery");
    assert.equal(host.notifications.length, 1);
  } finally { host.dispose(); }
});

test("AQ new response replaces its old expiry timer; foreground resume also refreshes unexpired data", t => {
  t.mock.timers.enable({ apis: ["Date", "setTimeout"], now: boundary - 1000 });
  const host = mountedAirQuality(true);
  try {
    host.flush();
    const next = structuredClone(host.envelope);
    next.data.current.source.retrievedAt = new Date(boundary - 1000).toISOString();
    next.sources = [next.data.current.source, next.data.forecast.source];
    host.receive(next); host.flush();
    t.mock.timers.tick(1000);
    assert.match(host.flush(), /71/);
    assert.equal(host.refreshes(), 0, "superseded deadline must not refresh the new response");
    host.hide(); host.flush(); host.show(); host.flush();
    assert.equal(host.refreshes(), 1, "foreground recovery must also run before all data expires");
    t.mock.timers.tick(3_599_000);
    assert.doesNotMatch(host.flush(), /71/);
    assert.match(host.flush(), /23/);
    assert.equal(host.refreshes(), 2);
  } finally { host.dispose(); }
});

test("automatic recovery joins the real QueryObserver enable fetch through the production resource owner", async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  let calls = 0, aborted = 0, finish!: (value: { reading: string }) => void;
  const options = { queryKey: ["aq-review-resume"], enabled: false, staleTime: 60_000,
    initialData: { reading: "retained" }, initialDataUpdatedAt: Date.now() - 120_000,
    queryFn: ({ signal }: { signal: AbortSignal }) => {
      calls++;
      return new Promise<{ reading: string }>(resolve => {
        finish = resolve;
        signal.addEventListener("abort", () => { aborted++; });
      });
    },
  };
  const observer = new QueryObserver(client, options);
  const unsubscribe = observer.subscribe(() => {});
  try {
    const ast = ts.createSourceFile("query.ts", readFileSync(new URL("../hooks/use-resource-query.ts", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
    const code = ast.statements.filter(node => !ts.isImportDeclaration(node)).map(node => node.getText(ast).replace(/^export /, "")).join("\n") + ";useResourceQuery;";
    const hook = vm.runInNewContext(ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, {
      useQuery: () => observer.getCurrentResult(), useEffect() {}, onlineManager, recordAcceptanceDiagnostic() {},
    });
    const retained = hook({ queryKey: options.queryKey, queryFn() {}, enabled: false });
    // useBaseQuery installs new enabled options before the outer hook's resume
    // effect. Exercise that real QueryObserver transition, then actual owner.
    observer.setOptions({ ...options, enabled: true });
    const recovery = retained.refetch({ cancelRefetch: false });
    finish({ reading: "renewed" });
    await recovery;
    assert.equal(calls, 1, "automatic recovery must join the enable-triggered request");
    assert.equal(aborted, 0, "a background resume must not cancel valid work already started");
    assert.equal(observer.getCurrentResult().data!.reading, "renewed");
  } finally { unsubscribe(); client.clear(); }
});

test("partial hourly expiry cannot erase an established forecast refresh failure", () => {
  const data = {
    spotId: "spot:a",
    current: { value: null, state: "UNAVAILABLE", unavailableReason: "NO_DATA", source: source("2026-09-20T11:59:00Z") },
    forecast: { value: [{ ...snapshot("23"), at: "2026-09-20T11:00:00Z" }, { ...snapshot("31"), at: "2026-09-20T12:00:00Z" }],
      state: "STALE_USABLE", unavailableReason: null, source: { ...source("2026-09-20T11:59:00Z"), state: "STALE_USABLE" } },
  };
  const view = airQualityState(data as any, "2026-09-20T12:30:00Z", boundary);
  assert.equal(view.hours.length, 1);
  assert.equal(view.forecast?.indexes[0]?.display, "31");
  assert.equal(view.failed, true, "removing an expired sibling must not reclassify a failed refresh as normal partial data");
});
