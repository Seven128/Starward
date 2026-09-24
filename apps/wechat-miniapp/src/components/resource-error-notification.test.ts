import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";
import vm from "node:vm";

function effect(path: string, marker: string) {
  const source = ts.createSourceFile(path, readFileSync(new URL(path, import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let callback: ts.ArrowFunction | undefined;
  const visit = (node: ts.Node) => {
    if (ts.isCallExpression(node) && node.expression.getText(source) === "useEffect" && node.getText(source).includes(marker))
      callback = node.arguments[0] as ts.ArrowFunction;
    ts.forEachChild(node, visit);
  };
  visit(source);
  assert.ok(callback, `missing notification effect ${marker}`);
  const code = ts.transpileModule(`result = (${callback!.getText(source)})();`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  return (context: Record<string, unknown>) => vm.runInNewContext(code, context);
}

test("map cold data failures emit a floating info while inactive and permission states stay quiet", () => {
  const effectRun = effect("../pages/map/index.tsx", "map-scene-failed");
  const run = (context: Record<string, unknown>) => effectRun({ mapContextFailed: false, mapSceneFailed: true, ...context });
  const notices: any[] = [], notify = (value: any) => notices.push(value);
  run({ pageVisible: false, pageState: "ERROR", activeContext: {}, notify });
  run({ pageVisible: true, pageState: "PERMISSION_DENIED", activeContext: {}, notify });
  assert.equal(notices.length, 0);
  run({ pageVisible: true, pageState: "ERROR", activeContext: {}, notify });
  assert.equal(JSON.stringify(notices[0]), JSON.stringify({ owner: "map", placement: "floating", tone: "info", title: "地图数据异常",
    body: "观星点数据暂时无法更新，可在页面中重试。", dedupeKey: "map-scene-failed" }));
});

test("spot resource notifications stay on the visible owning page and replay on return", () => {
  const run = effect("../features/spot/spot-detail-page.tsx", "spot-detail-resource-failed");
  for (const [segment, overviewError, guidesError, siteError, expected] of [
    ["GUIDES", true, false, false, "overview"],
    ["GUIDES", false, true, false, "guides"],
    ["SITE", false, false, true, "site"],
  ] as const) {
    const notices: any[] = [];
    run({ overview: { isError: overviewError }, guides: { isError: guidesError }, site: { isError: siteError }, pageVisible: false,
      segment, spotId: "spot:1", notify: (value: any) => notices.push(value) });
    assert.equal(notices.length, 0);
    run({ overview: { isError: overviewError }, guides: { isError: guidesError }, site: { isError: siteError }, pageVisible: true,
      segment, spotId: "spot:1", notify: (value: any) => notices.push(value) });
    assert.equal(notices.length, 1);
    assert.equal(notices[0].placement, "floating");
    assert.equal(notices[0].tone, "info");
    assert.equal(notices[0].dedupeKey, `spot-detail-resource-failed:${expected}:spot:1`);
  }
});

test("cold resource errors stay distinct from true empty results and retain retry", () => {
  const mapSource = readFileSync(new URL("../pages/map/index.tsx", import.meta.url), "utf8");
  const spotSource = readFileSync(new URL("../features/spot/spot-detail-page.tsx", import.meta.url), "utf8");
  const statusSource = readFileSync(new URL("./status-panel.tsx", import.meta.url), "utf8");
  assert.match(mapSource, /state=\{pageState\}/);
  assert.match(spotSource, /state="ERROR"/);
  assert.match(statusSource, /ERROR: "暂时无法获取数据"/);
  assert.match(spotSource, /recoveryLabel="重试概览"/);
  assert.match(mapSource, /pageState === "ERROR"[\s\S]*?"重试"/);
});

test("independent data pages notify only while visible and keep error recovery", () => {
  const cases = [
    { path: "../spot/data-source/index.tsx", marker: "data-source-failed", context: {
      validRoute: true, overview: { isError: true, refreshError: null }, spotId: "spot:1" } },
    { path: "../spot/plan/index.tsx", marker: "plan-spot-context-failed", context: {
      query: { isError: true }, contextId: "ctx:1", spotId: "spot:1" } },
    { path: "../content/plan/list/index.tsx", marker: "plan-list-failed", context: {
      query: { isError: true, refreshError: null }, owner: "user:1" } },
    { path: "../content/article/detail/index.tsx", marker: "article-resource-failed", context: {
      validRoute: true, guides: { isError: true, refreshError: null }, overview: { isError: false, refreshError: null },
      site: { isError: false, refreshError: null }, articleId: "article:1" } },
  ] as const;
  for (const item of cases) {
    const run = effect(item.path, item.marker);
    const notices: any[] = [], notify = (value: any) => notices.push(value);
    run({ ...item.context, pageVisible: false, notify });
    assert.equal(notices.length, 0, item.path);
    run({ ...item.context, pageVisible: true, notify });
    assert.equal(notices.length, 1, item.path);
    assert.equal(notices[0].placement, "floating");
    assert.equal(notices[0].tone, "info");
  }
  for (const path of cases.map(item => item.path)) {
    const source = readFileSync(new URL(path, import.meta.url), "utf8");
    assert.match(source, /state="ERROR"|"STALE" : "ERROR"/);
    assert.match(source, /recoveryLabel=/);
  }
});

test("successful cache fallbacks still emit the shared floating data warning", () => {
  const cases = [
    { path: "../spot/data-source/index.tsx", marker: "data-source-failed", context: {
      validRoute: true, overview: { isError: false, refreshError: null, data: { dataState: "STALE_USABLE" } }, spotId: "spot:1" } },
    { path: "../spot/plan/index.tsx", marker: "plan-spot-context-failed", context: {
      query: { isError: false, refreshError: null, data: { dataState: "STALE_USABLE" } }, contextId: "ctx:1", spotId: "spot:1" } },
    { path: "../content/plan/list/index.tsx", marker: "plan-list-failed", context: {
      query: { isError: false, refreshError: null, data: { dataState: "STALE_USABLE" } }, owner: "user:1" } },
    { path: "../content/article/detail/index.tsx", marker: "article-resource-failed", context: {
      validRoute: true,
      guides: { isError: false, refreshError: null, data: { dataState: "STALE_USABLE" } },
      overview: { isError: false, refreshError: null, data: { dataState: "FRESH" } },
      site: { isError: false, refreshError: null, data: { dataState: "FRESH" } }, articleId: "article:1" } },
    { path: "../pages/map/search-page.tsx", marker: "search-resource-failed", context: {
      queryPending: false,
      contextQuery: { error: null, refreshError: null, data: { dataState: "STALE_USABLE" } },
      scene: { error: null, refreshError: null, data: { dataState: "FRESH" } },
      placeSearch: { error: null, refreshError: null, data: { dataState: "FRESH" } }, isPermissionError: () => false } },
    { path: "../content/spot-feedback/index.tsx", marker: "formal-feedback-resource-failed", context: {
      query: { isError: false, refreshError: null, data: { dataState: "STALE_USABLE" } },
      history: { isError: false, refreshError: null, data: { dataState: "FRESH" } },
      site: { isError: false, refreshError: null, data: { dataState: "FRESH" } }, spotId: "spot:1" } },
  ] as const;
  for (const item of cases) {
    const notices: any[] = [];
    effect(item.path, item.marker)({ ...item.context, pageVisible: true, notify: (notice: any) => notices.push(notice) });
    assert.equal(notices.length, 1, item.path);
    assert.equal(notices[0].placement, "floating", item.path);
    assert.equal(notices[0].tone, "info", item.path);
  }
});

test("plan editor and contribution records cover every remote owner and suspend hidden notifications", () => {
  const plan = effect("../content/plan/detail/plan-editor-page.tsx", "plan-editor-resource-failed");
  const emptyQuery = { isError: false, refreshError: null, data: { dataState: "FRESH" } };
  for (const failedOwner of ["planQuery", "contextQuery", "spotsQuery", "eventsQuery", "siteOverviewQuery", "skyQuery"] as const) {
    const notices: any[] = [];
    const context: Record<string, unknown> = {
      pageVisible: true, notify: (notice: any) => notices.push(notice), activePlanId: "plan:1", requestedPlanId: null,
      eventModalOpen: false, eventModalPresent: false,
      planQuery: emptyQuery, contextQuery: emptyQuery, spotsQuery: emptyQuery, eventsQuery: emptyQuery,
      siteOverviewQuery: emptyQuery, skyQuery: emptyQuery,
    };
    context[failedOwner] = { ...emptyQuery, data: { dataState: "STALE_USABLE" } };
    plan(context);
    assert.equal(notices.length, 1, failedOwner);
    assert.equal(notices[0].placement, "floating", failedOwner);
  }
  const modalNotices: any[] = [];
  plan({ pageVisible: true, notify: (notice: any) => modalNotices.push(notice), activePlanId: "plan:1", requestedPlanId: null,
    eventModalOpen: true, eventModalPresent: true, planQuery: emptyQuery, contextQuery: emptyQuery, spotsQuery: emptyQuery,
    eventsQuery: { ...emptyQuery, isError: true }, siteOverviewQuery: emptyQuery, skyQuery: emptyQuery });
  assert.equal(modalNotices.length, 0);
  plan({ pageVisible: true, notify: (notice: any) => modalNotices.push(notice), activePlanId: "plan:1", requestedPlanId: null,
    eventModalOpen: false, eventModalPresent: true, planQuery: emptyQuery, contextQuery: emptyQuery, spotsQuery: emptyQuery,
    eventsQuery: { ...emptyQuery, isError: true }, siteOverviewQuery: emptyQuery, skyQuery: emptyQuery });
  assert.equal(modalNotices.length, 0);
  const contribution = effect("../content/contribution/use-contribution-form.ts", "contribution-resource-failed");
  const notices: any[] = [];
  contribution({ pageVisible: false, history: emptyQuery, capabilities: { ...emptyQuery, isError: true },
    MiniappApiError: Error, notify: (notice: any) => notices.push(notice) });
  assert.equal(notices.length, 0);
  contribution({ pageVisible: true, history: { ...emptyQuery, data: { dataState: "STALE_USABLE" }, error: null },
    capabilities: emptyQuery, MiniappApiError: Error, notify: (notice: any) => notices.push(notice) });
  assert.equal(notices.length, 1);
  assert.equal(notices[0].dedupeKey, "contribution-resource-failed:history");
});

test("event modal takes over an existing plan catalog notice and returns it only after exit", () => {
  const transfer = effect("../content/plan/detail/plan-editor-page.tsx", "planEventNoticeKey");
  const dismissed: string[] = [];
  transfer({ eventModalOpen: true, planEventNoticeKey: "plan-editor-resource-failed:plan:1:events",
    useAppStore: { getState: () => ({ notifications: [
      { id: "event", owner: "plan", placement: "floating", dedupeKey: "plan-editor-resource-failed:plan:1:events" },
      { id: "other", owner: "plan", placement: "floating", dedupeKey: "plan-editor-resource-failed:plan:1:sky" },
    ], dismissNotification: (id: string) => dismissed.push(id) }) } });
  assert.deepEqual(dismissed, ["event"]);
  const modalSource = readFileSync(new URL("./astronomical-event-modal.tsx", import.meta.url), "utf8");
  assert.match(modalSource, /if \(open\) return;[\s\S]*?clearNotifications\("event-modal"\)/);
});

test("shared formal spot lookup reports cache fallback only on its visible owner", () => {
  const run = effect("./formal-spot-field.tsx", "formal-spot-field-failed");
  const stale = { isError: false, refreshError: null, data: { dataState: "STALE_USABLE" } };
  const fresh = { isError: false, refreshError: null, data: { dataState: "FRESH" } };
  const notices: any[] = [];
  run({ pageVisible: false, savedSpot: stale, result: fresh, notificationOwner: "import", id: "spot", notify: (notice: any) => notices.push(notice) });
  run({ pageVisible: true, savedSpot: stale, result: fresh, notificationOwner: "import", id: "spot", notify: (notice: any) => notices.push(notice) });
  assert.equal(notices.length, 1);
  assert.equal(notices[0].owner, "import");
  assert.equal(notices[0].placement, "floating");
  assert.match(readFileSync(new URL("./formal-spot-field.tsx", import.meta.url), "utf8"), /result\.isError \? <StatusPanel state="ERROR"/);
  assert.match(readFileSync(new URL("../pages/map/search-page.tsx", import.meta.url), "utf8"),
    /searchState !== "READY" && !\(searchState === "STALE" && staleSearchResource\)/);
});

test("an open event modal cannot publish a late error from a hidden page", () => {
  const run = effect("./astronomical-event-modal.tsx", 'title: "天文事件数据异常"');
  const notices: unknown[] = [];
  const context = { open: true, detailId: "event:1", previewDate: "2026-09-16", detailFailed: true, catalogFailed: false, notify: (notice: unknown) => notices.push(notice) };
  run({ ...context, pageVisible: false }); assert.equal(notices.length, 0);
  run({ ...context, pageVisible: true }); assert.equal(notices.length, 1);
});
