import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

// Exercise the actual page's projection, notification effect and recovery JSX.
function renderFailure(owner: "scene" | "context", cached: boolean, visible = true) {
  const source = ts.createSourceFile("map.tsx", readFileSync(new URL("./index.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const declarations: string[] = [];
  let effect = "", recovery = "";
  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && ["pageState", "mapContextFailed", "mapSceneFailed", "mapDataStale"].includes(node.name.getText(source)))
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
    isPermissionError: () => false, notify: (notice: { placement: string; tone: string }) => notices.push(notice),
  });
  return { ...result, notices };
}

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
  const refetch = (owner: string) => async () => {
    calls.push(owner);
    const outcome = outcomes.shift();
    return outcome === "error" ? undefined : { dataState: outcome === "stale" ? "STALE_USABLE" : "FRESH" };
  };
  const run = vm.runInNewContext(ts.transpileModule(`const ${declaration}; refreshMap;`, {
    compilerOptions: { target: ts.ScriptTarget.ES2020 },
  }).outputText, {
    activeContext, mapContextFailed,
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

test("Map empty/error panel keeps concise recovery instead of rendering provider diagnostics", () => {
  const source = ts.createSourceFile("map.tsx", readFileSync(new URL("./index.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let expression = "";
  const visit = (node: ts.Node) => {
    if (ts.isJsxSelfClosingElement(node) && node.tagName.getText(source) === "StatusPanel" &&
      node.getText(source).includes('state={pageState}')) {
      const detail = node.attributes.properties.find(item => ts.isJsxAttribute(item) && item.name.getText(source) === "detail") as ts.JsxAttribute;
      expression = (detail.initializer as ts.JsxExpression).expression!.getText(source);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  assert.ok(expression);
  for (const pageState of ["EMPTY", "ERROR"]) {
    const diagnostic = "provider_internal_diagnostic";
    const text = vm.runInNewContext(expression, { pageState,
      bootstrapContext: { isError: false }, scene: { isError: pageState === "ERROR", error: diagnostic, data: { warnings: [diagnostic] } },
      isOfflineError: () => false, errorMessage: (error: unknown) => String(error),
    });
    assert.equal(text.includes(diagnostic), false);
    assert.ok(text.includes(pageState === "EMPTY" ? "搜索" : "重试"));
  }
});
