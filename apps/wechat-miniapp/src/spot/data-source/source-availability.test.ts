import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { uniqueSourceRecords } from "@starward/miniapp-contracts";

type Node = { type: string; props: Record<string, any>; children: any[] };
const source = ts.createSourceFile("source-page.tsx", readFileSync(new URL("./index.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const page = source.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === "DataSourcePage");
const safe = source.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === "safe");
assert.ok(page && safe);
const code = ts.transpileModule(`${safe.getText(source)}\n${page.getText(source)}`, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, jsxFactory: "jsx", jsxFragmentFactory: "Fragment" } }).outputText;

function render(dataState: string, sources: readonly { id: string; kind: string; [key: string]: unknown }[], refreshError = false, options: { overviewFailed?: boolean; recentFailed?: boolean; invalid?: boolean; airSources?: any[]; recentSources?: any[] } = {}) {
  const requests: any[] = [], retries: string[] = [];
  const internal = { id: "internal", kind: "TEST_FIXTURE" };
  const scope = {
    exports: {} as any,
    jsx: (type: string, props: any, ...children: any[]): Node => ({ type, props: props ?? {}, children }),
    Fragment: "Fragment", SystemMotionProbe: "SystemMotionProbe", View: "View", Text: "Text", ScrollView: "ScrollView",
    SoftButton: "SoftButton", StatusPanel: "StatusPanel", Provenance: "Provenance", CustomNav: "CustomNav", FloatingNotificationHost: "FloatingNotificationHost",
    useRouter: () => ({ params: { spotId: "spot:a", contextId: options.invalid ? "ctx:wrong" : "ctx:a" } }),
    useAppStore: (selector: (state: unknown) => unknown) => selector({ observationContext: { contextId: "ctx:a", location: { kind: "FORMAL_SPOT", spotId: "spot:a" } }, notify() {} }),
    useState: (value: unknown) => [value, () => {}], useDidShow() {}, useDidHide() {}, useEffect() {}, useThemeClass: () => "day",
    useResourceQuery: (request: any) => { requests.push(request); return { isPending: false, isError: options.overviewFailed === true, refreshError: refreshError ? Error("offline") : undefined,
      data: options.overviewFailed ? undefined : { dataState, data: { spot: { spotId: "spot:a", name: "观星点" }, dataDisclosure: sources } }, refetch: async () => { retries.push("overview"); } }; },
    useAirQualityQuery: (request: any) => { requests.push(request); return { isPending: false, isError: false,
      data: { dataState: "FRESH", sources: options.airSources ?? [], data: { spotId: "spot:a", current: { source: internal }, forecast: { source: internal } } },
      refetch: () => { retries.push("air"); } }; },
    useRecentWeatherQuery: (request: any) => { requests.push(request); return { failed: options.recentFailed === true, liveFailed: options.recentFailed === true,
      envelope: options.recentFailed ? undefined : { sources: options.recentSources ?? [] }, query: { isPending: false }, retry: () => { retries.push("recent"); } }; },
    isProductSource: (item: { kind: string }) => item.kind !== "TEST_FIXTURE",
    uniqueSourceRecords,
    groupSources: (items: readonly { id: string; kind: string }[]) => items.map(item => ({ kind: item.kind, sources: [item] })),
    SOURCE_KIND_LABEL: { OPEN_DATA: "开放数据" }, Taro: { switchTab: async () => {} },
  };
  vm.runInNewContext(code, scope);
  const tree = scope.exports.default();
  const panels: Node[] = [], sourceCards: Node[] = [];
  function walk(node: any) {
    if (Array.isArray(node)) node.forEach(walk);
    else if (node && typeof node === "object") {
      if (node.type === "StatusPanel") panels.push(node);
      if (node.type === "Provenance") sourceCards.push(node);
      walk(node.children);
    }
  }
  walk(tree);
  return { panels, sourceCards, requests, retries };
}

test("unavailable or partial source envelopes do not claim a confirmed empty result", () => {
  for (const state of ["UNAVAILABLE", "EXPIRED", "PARTIAL"]) {
    const page = render(state, []);
    assert.deepEqual(page.panels.map(panel => panel.props.state), ["PARTIAL"]);
    assert.equal(page.panels[0]?.props.recoveryLabel, "重试地点与观测来源");
    assert.match(page.panels[0]?.props.detail, state === "EXPIRED" ? /已过期.*适用时段/u : /资料尚未齐全/u);
  }
});

test("independent sources remain visible while the overview is incomplete", () => {
  const page = render("UNAVAILABLE", [{ id: "spot-source", kind: "OPEN_DATA" }]);
  assert.deepEqual(page.panels.map(panel => panel.props.state), ["PARTIAL"]);
  assert.equal(page.sourceCards.length, 1);
});

test("confirmed usable zero sources use the empty state; stale refresh keeps recovery", () => {
  assert.deepEqual(render("FRESH", []).panels.map(panel => panel.props.state), ["EMPTY"]);
  assert.deepEqual(render("SAMPLE_DATA", []).panels.map(panel => panel.props.state), ["EMPTY"]);
  assert.deepEqual(render("FRESH", [], true).panels.map(panel => panel.props.state), ["STALE"]);
});

test("the complete source page keeps separate validity and license records sharing an ID", () => {
  const earlier = { id: "source:reading-regression", kind: "OPEN_DATA", validFrom: "2026-10-01T00:00:00Z", validTo: "2026-10-02T00:00:00Z", license: "TEST previous license record" };
  const current = { ...earlier, validFrom: "2026-10-02T00:00:00Z", validTo: null, license: "TEST current license record" };
  const page = render("FRESH", [earlier, current]);
  assert.deepEqual(page.sourceCards.map(card => card.props.source), [earlier, current]);
});


test("a failed overview does not block the independent air and live-history source requests", () => {
  const air = { id: "air", kind: "OPEN_DATA", title: "AQ区域来源" };
  const history = { id: "history", kind: "HISTORICAL_RECORD", title: "前两日地区记录" };
  const page = render("FRESH", [], false, { overviewFailed: true, airSources: [air], recentSources: [history] });
  assert.deepEqual(page.sourceCards.map(card => card.props.source), [air, history]);
  assert.ok(page.requests.slice(0, 2).every(request => request.enabled === true));
  assert.equal(page.requests[2].visible, true);
  const retry = page.panels.find(panel => panel.props.recoveryLabel === "重试地点与观测来源");
  assert.ok(retry); retry.props.onRecover();
  assert.deepEqual(page.retries, ["overview"]);
  assert.ok(!page.panels.some(panel => panel.props.state === "EMPTY"));
});

test("a live-history failure preserves other source cards and retries only history", () => {
  const site = { id: "site", kind: "OFFICIAL_REFERENCE" }, air = { id: "air", kind: "OPEN_DATA" };
  const page = render("FRESH", [site], false, { recentFailed: true, airSources: [air] });
  assert.deepEqual(page.sourceCards.map(card => card.props.source), [site, air]);
  const retry = page.panels.find(panel => panel.props.recoveryLabel === "重试近期天气来源");
  assert.ok(retry); retry.props.onRecover();
  assert.deepEqual(page.retries, ["recent"]);
  assert.ok(!page.panels.some(panel => panel.props.state === "EMPTY"));
});

test("an unconfirmed route starts none of the independent source requests", () => {
  const page = render("FRESH", [{ id: "old", kind: "OPEN_DATA" }], false, { invalid: true });
  assert.ok(page.requests.slice(0, 2).every(request => request.enabled === false));
  assert.equal(page.requests[2].visible, false);
  assert.equal(page.sourceCards.length, 0);
});
