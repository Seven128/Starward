import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import * as eventModel from "../content/event/event-model";
import { calendarDateInTimezone } from "../utils/zoned-date";
import { isProductSource, productSourceNames } from "../utils/source-presentation";

type Tree = { type: any; props: any; children: any[] };
const text = (node: any): string => node == null || typeof node === "boolean" ? "" : Array.isArray(node)
  ? node.map(text).join("") : typeof node === "object" ? text(node.children) : String(node);
function find(node: any, predicate: (node: Tree) => boolean): Tree[] {
  if (!node || typeof node !== "object") return [];
  if (Array.isArray(node)) return node.flatMap(child => find(child, predicate));
  return [...(predicate(node) ? [node] : []), ...find(node.children, predicate)];
}
const source = { id: "gmn", kind: "OPEN_DATA", state: "FRESH", provider: "GMN", title: "GMN", limitations: [] };
const meteor = { occurrenceId: "urs", kind: "METEOR_SHOWER", code: "URS", displayName: "小熊座流星雨", sourceId: "gmn",
  peakDate: "2026-12-22", activeStartDate: "2026-12-21", activeEndDate: "2026-12-24", annualReference: {},
  nominalPeakZhr: null, velocityKmPerSecond: null };
const eclipse = { ...meteor, occurrenceId: "solar", kind: "SOLAR_ECLIPSE", displayName: "日全食", peakDate: "2026-08-13",
  peakAtUtc: "2026-08-12T17:46:00Z", activeStartDate: "2026-08-13", activeEndDate: "2026-08-13" };

function harness(mutate = (source: string) => source, overrides: Record<string, unknown> = {}) {
  const file = ts.createSourceFile("modal.tsx", mutate(readFileSync(new URL("./astronomical-event-modal.tsx", import.meta.url), "utf8")), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const body = file.statements.filter(node => !ts.isImportDeclaration(node)).map(node => node.getText(file).replace(/^export /u, "")).join("\n");
  const states: any[] = [];
  let cursor = 0;
  const resource = { data: { data: { events: [meteor, eclipse], sources: [source], catalogVersion: "v1" }, dataState: "FRESH" }, isPending: false, isError: false, refetch: () => {} };
  const context = { ...eventModel, calendarDateInTimezone, isProductSource, productSourceNames,
    React: { createElement: (type: any, props: any, ...children: any[]) => ({ type, props: props ?? {}, children }), Fragment: "Fragment" },
    Button: "Button", View: "View", Text: "Text", ScrollView: "ScrollView", RootPortal: "RootPortal", StatusPanel: "StatusPanel",
    SemanticIcon: "SemanticIcon", Provenance: "Provenance", NativeBackBoundary: "NativeBackBoundary", FloatingNotificationHost: "FloatingNotificationHost",
    forwardRef: (fn: any) => fn, useEffect: () => {}, useDidHide: () => {}, useDidShow: () => {}, useImperativeHandle: () => {}, useMemo: (fn: any) => fn(),
    useRef: (initial: any) => ({ current: initial }),
    useState: (initial: any) => { const slot = cursor++; if (!(slot in states)) states[slot] = initial; return [states[slot], (value: any) => { states[slot] = value; }]; },
    useAppStore: (fn: any) => fn({ preferences: { reducedMotion: false }, mode: "DAY", notify: () => {} }),
    useResourceQuery: (options: any) => options.queryKey[0] === "astronomical-events" ? resource : { isPending: false, isError: true, refetch: () => {} },
    getAstronomicalEvents: () => {},
    ...overrides,
  };
  const component = vm.runInNewContext(ts.transpileModule(body + "\n({AstronomicalEventModal, EventModalDetail});", {
    compilerOptions: { target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React },
  }).outputText, context);
  return { detail: component.EventModalDetail, render: (props: object) => { cursor = 0; return component.AstronomicalEventModal(props, null); } };
}

test("detail selection stages the viewed identity, then only confirmation commits it", () => {
  const ui = harness();
  const committed: any[] = [];
  const props = { open: true, mode: "select-one", context: null, initialOccurrenceIds: ["solar"], initialDetailId: "urs", onClose: () => {}, onConfirm: (id: string) => committed.push(id) };
  const choose = find(ui.render(props), node => node.type === "Button" && text(node) === "选择此事件")[0]!;
  assert.ok(choose);
  choose.props.onClick();
  assert.deepEqual(committed, []);
  const list = ui.render(props);
  assert.equal(find(list, node => node.props.ariaLabel === "返回事件列表").length, 0);
  const selected = find(list, node => node.props.ariaLabel === "已选择小熊座流星雨")[0];
  assert.ok(selected);
  find(list, node => node.type === "Button" && text(node) === "确认选择")[0]!.props.onClick();
  assert.deepEqual(committed, ["urs"]);
});

test("hiding the modal host suspends new queries and notices without losing draft selection", () => {
  let hide: (() => void) | undefined, show: (() => void) | undefined;
  const enabled: boolean[] = [], cleared: string[] = [];
  const store = Object.assign((select: any) => select({ preferences: { reducedMotion: false }, mode: "DAY", notify() {} }), {
    getState: () => ({ clearNotifications: (owner: string) => cleared.push(owner) }),
  });
  const ui = harness(undefined, { useDidHide: (callback: () => void) => { hide = callback; }, useDidShow: (callback: () => void) => { show = callback; }, useAppStore: store,
    useResourceQuery: (options: any) => {
      enabled.push(options.enabled);
      return options.queryKey[0] === "astronomical-events" ? { data: { data: { events: [meteor], sources: [source], catalogVersion: "v1" } }, isPending: false, isError: false, refetch() {} } : { isPending: false, isError: false, refetch() {} };
    } });
  const props = { open: true, mode: "select-one", context: { localDate: "2026-12-22", location: { kind: "FORMAL_SPOT" } }, initialOccurrenceIds: ["urs"], initialDetailId: "urs", onClose() {} };
  ui.render(props); assert.deepEqual(enabled.splice(0), [true, true, true]);
  hide!(); const hidden = ui.render(props); assert.deepEqual(enabled.splice(0), [false, false, false]); assert.deepEqual(cleared, ["event-modal"]);
  assert.ok(find(hidden, node => node.type === "Button" && text(node) === "确认选择").length);
  show!(); const returned = ui.render(props); assert.deepEqual(enabled.splice(0), [true, true, true]);
  assert.ok(find(returned, node => node.type === "Button" && text(node) === "确认选择").length);
});

test("detail Back returns to list but backdrop cancels the whole modal, in both modes", () => {
  function check(mutate?: (source: string) => string) {
    for (const mode of ["browse", "select-one"]) {
      let closed = 0;
      const props = { open: true, mode, context: null, initialDetailId: "urs", onClose: () => closed++ };
      const ui = harness(mutate);
      find(ui.render(props), node => node.props.ariaLabel === "返回事件列表")[0]!.props.onClick();
      assert.equal(closed, 0);
      assert.equal(find(ui.render(props), node => node.props.ariaLabel === "返回事件列表").length, 0);
      const backdrop = find(harness(mutate).render(props), node => node.props.className === "event-modal__backdrop")[0]!;
      backdrop.props.onClick();
      assert.equal(closed, 1);
    }
  }
  check();
  assert.throws(() => check(source => source.replace('onClick={() => { if (phase !== "closing") onClose(); }}', "onClick={requestClose}")), assert.AssertionError);
});

test("real meteor conditions render their window and moon; missing direction has one standard placeholder", () => {
  const props = { event: meteor, mode: "browse", previewDate: "2026-12-22", onPreviewDate: () => {}, locationName: "北京", timezone: "Asia/Shanghai", pending: false, source, catalogVersion: "v1" };
  const detail = harness().detail;
  const available = detail({ ...props, visibility: { state: "AVAILABLE", reason: "几何窗口", bestWindowStartLocal: "2026-12-23 00:15", bestWindowEndLocal: "2026-12-23 02:45", bestAtLocal: "2026-12-23 01:45", moonIllumination: 0.95, bestAltitudeDeg: 18, bestAzimuthDeg: 14 } });
  assert.match(text(available), /几何观测时段2026-12-23 00:15 — 2026-12-23 02:45/);
  assert.match(text(available), /月面照明95%/);
  const unavailable = detail({ ...props, visibility: { state: "UNAVAILABLE", reason: "方向缺测" } });
  const panels = find(unavailable, node => node.type === "StatusPanel");
  assert.equal(panels.length, 1);
  assert.equal(panels[0]!.props.state, "PARTIAL");
  assert.doesNotMatch(text(unavailable), /最佳几何时刻|95%/);
  assert.equal(find(detail({ ...props, visibility: { state: "NOT_VISIBLE", reason: "地平线以下" } }), node => node.type === "StatusPanel").length, 0);
});

test("an unavailable local projection stays distinct from a true empty result, including failed refresh", () => {
  const props = { event: meteor, mode: "browse", previewDate: "2026-12-22", onPreviewDate: () => {},
    locationName: "北京", timezone: "Asia/Shanghai", pending: false, source, catalogVersion: "v1",
    visibility: { state: "UNAVAILABLE", reason: "当前地点的观测条件暂不可用。" }, onRetry: () => {} };
  const detail = harness().detail;
  const unavailable = find(detail(props), node => node.type === "StatusPanel");
  assert.deepEqual(unavailable.map(node => node.props.state), ["PARTIAL"]);
  assert.equal(unavailable[0]!.props.detail, props.visibility.reason);
  const failed = find(detail({ ...props, failed: true }), node => node.type === "StatusPanel");
  assert.deepEqual(failed.map(node => node.props.state), ["ERROR"]);
  assert.equal(failed[0]!.props.recoveryLabel, "重试事件详情");
});

test("catalog failure and unavailable envelopes never render a second true-empty card", () => {
  for (const dataState of ["UNAVAILABLE", "FRESH"]) {
    const ui = harness(undefined, {
      useResourceQuery: (options: any) => options.queryKey[0] === "astronomical-events"
        ? { data: { data: { events: [], sources: [], catalogVersion: "v1" }, dataState },
          isPending: false, isError: dataState === "FRESH", refetch: () => {} }
        : { isPending: false, isError: false, refetch: () => {} },
    });
    const tree = ui.render({ open: true, mode: "browse", context: null, onClose: () => {} });
    assert.deepEqual(find(tree, node => node.type === "StatusPanel").map(node => node.props.state), ["ERROR"]);
  }
});

test("a failed catalog refresh keeps usable event rows and one retry state", () => {
  const ui = harness(undefined, {
    useResourceQuery: (options: any) => options.queryKey[0] === "astronomical-events"
      ? { data: { data: { events: [meteor], sources: [source], catalogVersion: "v1" }, dataState: "FRESH" },
        isPending: false, isError: false, refreshError: new Error("offline"), refetch: () => {} }
      : { isPending: false, isError: false, refetch: () => {} },
  });
  const tree = ui.render({ open: true, mode: "browse", context: null, onClose: () => {} });
  assert.deepEqual(find(tree, node => node.type === "StatusPanel").map(node => node.props.state), ["STALE"]);
  assert.equal(find(tree, node => node.props.ariaLabel === "查看小熊座流星雨详情").length, 1);
});

test("only a confirmed empty catalog uses the shared empty state", () => {
  for (const [dataState, expected] of [["FRESH", "EMPTY"], ["PARTIAL", "PARTIAL"]] as const) {
    const ui = harness(undefined, {
      useResourceQuery: (options: any) => options.queryKey[0] === "astronomical-events"
        ? { data: { data: { events: [], sources: [], catalogVersion: "v1" }, dataState }, isPending: false, isError: false, refetch: () => {} }
        : { isPending: false, isError: false, refetch: () => {} },
    });
    const tree = ui.render({ open: true, mode: "browse", context: null, onClose: () => {} });
    assert.deepEqual(find(tree, node => node.type === "StatusPanel").map(node => node.props.state), [expected]);
  }
});

test("fixed eclipse date and phases cannot masquerade as the caller's September date", () => {
  const tree = harness().detail({ event: eclipse, mode: "browse", previewDate: "2026-09-13", onPreviewDate: () => {}, locationName: "北京", timezone: "Asia/Shanghai", pending: false,
    visibility: { state: "NOT_VISIBLE", reason: "地平线以下", phases: [{ key: "PEAK", localDateTime: "2026-08-13 01:46", altitudeDeg: -18 }] } });
  assert.match(text(tree), /事件当地日期2026\/08\/13/);
  assert.match(text(tree), /地图日期仍为 2026\/09\/13/);
  assert.match(text(tree), /食甚2026-08-13 01:46高度 -18° · 地平线以下/);
  assert.match(text(tree), /合格太阳观测防护/);
  assert.equal(find(tree, node => node.props.ariaLabel === "弹窗内预览日期").length, 0);
});

test("fixture metadata never creates a source heading or catalog-version explanation", () => {
  const tree = harness().detail({ event: meteor, mode: "browse", previewDate: "2026-12-22", onPreviewDate: () => {}, timezone: "Asia/Shanghai", pending: false,
    source: { ...source, kind: "TEST_FIXTURE", state: "SAMPLE_DATA" }, catalogVersion: "test-version" });
  assert.equal(find(tree, node => node.type === "Provenance").length, 0);
  assert.doesNotMatch(text(tree), /资料来源|目录版本|test-version/);
});

test("reviewed article keeps every paragraph and an independent source without creating a test explanation", () => {
  const article = { title: "测试文章题目", authorName: "测试作者", publishedTime: "2026-09-15", paragraphs: ["开头与 <script> 都作为文字。", "独立第二段。"], sourceId: "article-source" };
  const articleSource = { ...source, id: "article-source", kind: "EDITORIAL_REFERENCE", provider: "文章作者" };
  const props = { event: { ...meteor, article }, mode: "browse", previewDate: "2026-12-22", onPreviewDate: () => {}, timezone: "Asia/Shanghai", pending: false, source, articleSource };
  const tree = harness().detail(props);
  assert.match(text(tree), /测试文章题目作者：测试作者原文日期：2026-09-15开头与 <script> 都作为文字。独立第二段。/);
  assert.deepEqual(find(tree, node => node.type === "Provenance").map(node => node.props.source.id), ["gmn", "article-source"]);
  assert.doesNotMatch(text(tree), /测试数据说明|测试模式|示例数据说明/);
  const missing = harness().detail({ ...props, event: meteor, articleSource: undefined });
  assert.doesNotMatch(text(missing), /测试文章题目|独立第二段/);
});

test("article query and visible text survive local context failure and date changes", async () => {
  const articleEvent = { ...meteor, article: { title: "已发布文章", paragraphs: ["正文不依赖地点计算。"] } };
  const queries: any[] = [];
  let recordReads = 0;
  const ui = harness(undefined, {
    useResourceQuery: (options: any) => {
      queries.push(options);
      const data = options.queryKey[0] === "astronomical-events" ? { events: [meteor], sources: [source], catalogVersion: "v1" }
        : options.queryKey[0] === "astronomical-event-record" ? { event: articleEvent, source, catalogVersion: "v1" } : undefined;
      return { data: data ? { data, dataState: "FRESH" } : undefined, isPending: false, isError: !data, refetch: () => {} };
    },
    getAstronomicalEvent: async () => { recordReads++; return { data: { event: articleEvent } }; },
    eventPreviewContextInput: () => ({}),
    resolveObservationContext: async () => { throw new Error("location_context_unavailable"); },
  });
  const props = { open: true, mode: "browse", initialDetailId: "urs", context: { localDate: "2026-12-22", contextId: "ctx", location: { kind: "MAP_CENTER", displayName: "地图中心" } }, onClose: () => {} };
  const rendered = ui.render(props);
  await assert.rejects(queries.find(query => query.queryKey[0] === "astronomical-event-modal-detail").queryFn(), /location_context_unavailable/);
  await queries.find(query => query.queryKey[0] === "astronomical-event-record").queryFn();
  assert.equal(recordReads, 1);
  const detail = find(rendered, node => node.type === ui.detail)[0]!;
  assert.equal(detail.props.event.article.title, "已发布文章");
  assert.equal(detail.props.visibility, null);
  assert.equal(detail.props.failed, true);
  detail.props.onPreviewDate("2026-12-23");
  const changed = find(ui.render(props), node => node.type === ui.detail)[0]!;
  assert.equal(changed.props.previewDate, "2026-12-23");
  assert.deepEqual(changed.props.event.article.paragraphs, ["正文不依赖地点计算。"]);
});
