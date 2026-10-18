import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";
import { layerSheetOwnsSceneRecovery } from "./map-layer-selection";
import { retryObservationScene } from "./context-restore";

// Exercise the actual page's projection, notification effect and recovery JSX.
function renderFailure(owner: "scene" | "context", cached: boolean, visible = true,
  presentation: "none" | "layer-sheet" = "none", layer: "TOTAL_CLOUD" | "LIGHT" = "TOTAL_CLOUD") {
  const source = ts.createSourceFile("map.tsx", readFileSync(new URL("./index.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const declarations: string[] = [];
  let effect = "", recovery = "";
  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && ["pageState", "mapContextFailed", "mapSceneFailed", "mapDataStale", "layerSheetOwnsSceneFailure"].includes(node.name.getText(source)))
      declarations.push(`const ${node.getText(source)};`);
    if (ts.isCallExpression(node) && node.expression.getText(source) === "useEffect" && node.arguments[0]?.getText(source).includes('title: "地图数据异常"'))
      effect = node.arguments[0]!.getText(source);
    if (ts.isConditionalExpression(node) && ts.isJsxSelfClosingElement(node.whenTrue) && node.whenTrue.tagName.getText(source) === "StatusPanel" && node.whenTrue.getText(source).includes('state="STALE"'))
      recovery = node.condition.getText(source);
    ts.forEachChild(node, visit);
  };
  visit(source);
  assert.ok(effect && recovery);
  const query = () => ({ isError: false, isPending: false, error: null, refreshError: null as Error | null,
    data: { dataState: "FRESH" } });
  const scene = query(), bootstrapContext = query();
  const failed = owner === "scene" ? scene : bootstrapContext;
  if (cached) failed.data.dataState = "STALE_USABLE";
  else failed.refreshError = new Error("offline");
  const notices: { placement: string; tone: string }[] = [];
  const code = `${declarations.join("\n")}\n(${effect})();\n({ recovery: Boolean(${recovery}), pageState });`;
  const result = vm.runInNewContext(ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText, {
    scene, bootstrapContext, pageVisible: visible, activeContext: {}, spots: [{}],
    bottomPresentation: presentation, visibleLayer: layer, lightLayerState: "STALE", cloudTimeChoices: [],
    layerSheetOwnsSceneRecovery, useAppStore: { getState: () => ({ notifications: [], dismissNotification() {} }) },
    isPermissionError: () => false, notify: (notice: { placement: string; tone: string }) => notices.push(notice),
  });
  return { ...result, notices };
}

test("static light leaves Scene recovery available while cloud retains its existing local retry", () => {
  assert.equal(renderFailure("scene", true, true, "layer-sheet", "LIGHT").recovery, true);
  assert.equal(renderFailure("context", true, true, "layer-sheet", "LIGHT").recovery, true);
  assert.equal(renderFailure("scene", true, true, "layer-sheet", "TOTAL_CLOUD").recovery, false);
  assert.equal(renderFailure("context", true, true, "layer-sheet", "TOTAL_CLOUD").recovery, true);
});

for (const owner of ["scene", "context"] as const) {
  for (const cached of [false, true]) {
    test(`Map ${owner} ${cached ? "cached stale envelope" : "refresh rejection"} keeps recovery and one floating notice`, () => {
      const result = renderFailure(owner, cached);
      assert.equal(result.recovery, true, "cached content still needs a persistent retry");
      assert.equal(result.notices.length, 1);
      assert.equal(result.notices[0].placement, "floating");
      assert.equal(result.notices[0].tone, "info");
      assert.notEqual(result.pageState, "ERROR", "keep usable content");
      assert.equal(renderFailure(owner, cached, false).notices.length, 0);
    });
  }
}

async function retryMap(activeContext: object | null, mapContextFailed: boolean, outcomes: Array<"fresh" | "stale" | "error">) {
  const source = ts.createSourceFile("map.tsx", readFileSync(new URL("./index.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let declaration = "";
  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && node.name.getText(source) === "refreshMap") declaration = node.getText(source);
    ts.forEachChild(node, visit);
  };
  visit(source);
  assert.ok(declaration);
  const calls: string[] = [], announcements: string[] = [], notices: unknown[] = [];
  const confirmed = { contextId: "ctx:confirmed", revision: 1, contextFingerprint: "same" };
  const refetch = (owner: string) => async () => {
    calls.push(owner);
    const outcome = outcomes.shift();
    return outcome === "error" ? undefined : { data: owner === "context" ? confirmed : {}, dataState: outcome === "stale" ? "STALE_USABLE" : "FRESH" };
  };
  const run = vm.runInNewContext(ts.transpileModule(`const ${declaration}; refreshMap;`, {
    compilerOptions: { target: ts.ScriptTarget.ES2020 },
  }).outputText, {
    activeContext: activeContext ? confirmed : null, mapContextFailed, bootstrapReplacementBlocked: false, selected: null,
    analysisOverlay: "NONE", nativeViewport: { bounds: null },
    navigationEpoch: { current: 0 }, retryObservationScene,
    useAppStore: { getState: () => ({ accountOwnerId: "owner", mapResetVersion: 0 }) },
    failedMapRegion: { current: null }, mapPointIntent: { current: 0 },
    bootstrapContext: { refetch: refetch("context") }, scene: { refetch: refetch("scene") },
    setAnnouncement: (text: string) => announcements.push(text), notify: (notice: unknown) => notices.push(notice),
  });
  await run();
  return { calls, announcements, notices };
}

test("Map retry reaches the failed cached context and its scene, or only the needed cold/scene owner", async () => {
  assert.deepEqual((await retryMap({}, true, ["fresh", "fresh"])).calls, ["context", "scene"]);
  assert.deepEqual((await retryMap({}, false, ["fresh"])).calls, ["scene"]);
  assert.deepEqual((await retryMap(null, true, ["fresh"])).calls, ["context"]);
});

test("Map retry never announces success for a failed or stale owner and leaves notices to query state", async () => {
  for (const outcome of ["error", "stale"] as const) {
    const result = await retryMap({}, true, [outcome, "fresh"]);
    assert.notEqual(result.announcements.at(-1), "当前区域已刷新");
    assert.equal(result.notices.length, 0);
  }
  assert.equal((await retryMap({}, true, ["fresh", "fresh"])).announcements.at(-1), "当前区域已刷新");
});

// Follow the rendered feedback branch, including its current compact retry
// control. A particular component name is not the recovery contract.
function sceneFeedback(scope: Record<string, unknown>) {
  const source = ts.createSourceFile("map.tsx", readFileSync(new URL("./index.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let expression = "";
  const visit = (node: ts.Node) => {
    if (ts.isConditionalExpression(node) && node.condition.getText(source).includes('pageState !== "EMPTY"') &&
      node.whenTrue.getText(source).includes("state={pageState}")) expression = node.getText(source);
    ts.forEachChild(node, visit);
  };
  visit(source); assert.ok(expression, "the actual Map scene-feedback branch is exercised");
  return vm.runInNewContext(ts.transpileModule(`(${expression});`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React },
  }).outputText, {
    mapTerrainLoading: false, mapDataStale: false, layerSheetOwnsSceneFailure: false,
    bootstrapReplacementBlocked: false, visibleSpotContextAttempt: null, bottomPresentation: "none",
    StatusPanel: "StatusPanel", SoftButton: "SoftButton",
    React: { createElement: (type: string, props: object) => ({ type, props }) }, ...scope,
  });
}

test("Map empty availability and error recovery keep provider diagnostics out of visible feedback", async () => {
  const source = ts.createSourceFile("map.tsx", readFileSync(new URL("./index.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let notice = "", search = "";
  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && node.name.getText(source) === "ordinaryMapNotice") notice = node.initializer!.getText(source);
    if (ts.isJsxElement(node) && node.openingElement.tagName.getText(source) === "Button" &&
      node.openingElement.getText(source).includes('data-control="map-search-entry"')) {
      const action = node.openingElement.attributes.properties.find(item => ts.isJsxAttribute(item) && item.name.getText(source) === "onClick") as ts.JsxAttribute;
      search = (action.initializer as ts.JsxExpression).expression!.getText(source);
    }
    ts.forEachChild(node, visit);
  };
  visit(source); assert.ok(notice && search, "empty availability retains the real search action");
  const diagnostic = "provider_internal_diagnostic", actions: string[] = [];
  const failed = sceneFeedback({ pageState: "ERROR", scene: { error: diagnostic }, refreshMap: async () => actions.push("retry") });
  assert.equal(failed.type, "SoftButton"); assert.match(failed.props.label, /刷新|重试/u);
  assert.equal(JSON.stringify(failed.props).includes(diagnostic), false);
  await failed.props.onClick(); assert.deepEqual(actions, ["retry"], "the compact recovery reaches the real retry owner");
  assert.equal(sceneFeedback({ pageState: "EMPTY" }), null, "ordinary availability uses its floating message, without a persistent error card");
  const emptyNotice = vm.runInNewContext(notice, {
    pageVisible: true, mapRuntimeError: null, mapContextFailed: false, mapSceneFailed: false,
    scene: { isPending: false, isFetching: false, data: { warnings: [diagnostic] } }, analysisOverlay: "NORMAL",
    bottomPresentation: "none", pageState: "EMPTY", hasGeographicLayer: false,
  });
  assert.equal(emptyNotice, "当前区域暂无观星点"); assert.equal(emptyNotice.includes(diagnostic), false);
  const openSearch = vm.runInNewContext(ts.transpileModule(`(${search});`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText,
    { openMapPage: (route: string) => actions.push(route) });
  openSearch({ stopPropagation() {} }); assert.deepEqual(actions, ["retry", "/spot/search/index"]);
});

test("a retained point resolution owns its pending and cancelled feedback without a phantom map loader", () => {
  const shown = (pageState: string, blocked: boolean, attempt: { pending: boolean } | null, presentation = "spot-panel") =>
    sceneFeedback({ pageState, bootstrapReplacementBlocked: blocked, visibleSpotContextAttempt: attempt,
      bottomPresentation: presentation, refreshMap() {} }) !== null;
  assert.equal(shown("LOADING", true, { pending: false }), false, "cancelled selection has an owned retry, no running map request");
  assert.equal(shown("LOADING", true, { pending: true }), false, "pending selection already explains its own loading");
  assert.equal(shown("LOADING", false, null), true, "normal cold map loading remains visible");
  assert.equal(shown("LOADING", true, null), true, "an unclaimed recovery cannot silently disappear");
  assert.equal(shown("ERROR", true, { pending: false }), true, "a separate scene failure retains recovery");
  assert.equal(shown("LOADING", true, { pending: false }, "layer-sheet"), true, "the hidden spot panel cannot own visible layer feedback");
  assert.equal(shown("LOADING", true, { pending: false }, "none"), true, "closing the spot panel keeps map feedback");
});
