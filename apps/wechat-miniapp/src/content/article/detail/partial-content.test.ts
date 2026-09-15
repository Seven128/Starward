import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

function render(options: { pending?: boolean; failed?: boolean; article?: boolean; valid?: boolean; refreshFailed?: boolean; staleEnvelope?: boolean; fixture?: boolean; spotId?: string; paragraph?: string; facilityState?: "pending" | "failed" | "missing" | "cached-error" | "stale" }) {
  const source = ts.createSourceFile("article.tsx", readFileSync(new URL("./index.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const page = source.statements.find((node): node is ts.FunctionDeclaration => ts.isFunctionDeclaration(node) && node.name?.text === "ArticlePage")!;
  const result = page.body!.statements.find(ts.isReturnStatement)!;
  const loading = page.body!.statements.filter(ts.isVariableStatement).flatMap(node => [...node.declarationList.declarations]).find(node => node.name.getText(source) === "loading")!;
  const article = options.article === false ? undefined : {
    title: "自有测试攻略", authorType: "SELF", authorName: "测试", source: {},
    blocks: [{ type: "paragraph", text: options.paragraph ?? "正文独立保留" }, ...(options.facilityState ? [{ type: "facility_ref", facilityType: "PARKING" }] : [{ type: "media", mediaId: "missing" }])],
  };
  const retries: string[] = [];
  const context: Record<string, unknown> = {
    React: { Fragment: "Fragment", createElement: (type: unknown, props: unknown, ...children: unknown[]) => ({ type, props, children }) },
    __MINIAPP_DEVELOPMENT_FIXTURE_MODE__: options.fixture === true, spotId: options.spotId ?? "spot:real",
    themeClass: "day", validRoute: options.valid !== false, article, detail: undefined,
    guides: { data: options.staleEnvelope ? { dataState: "STALE_USABLE" } : undefined, isPending: false, isError: false, refreshError: options.refreshFailed ? new Error("offline") : undefined, refetch: () => retries.push("guides") },
    overview: { isPending: options.pending, isError: options.failed, refetch: () => retries.push("overview") },
    site: {
      isPending: options.facilityState === "pending", isError: options.facilityState === "failed",
      refreshError: options.facilityState === "cached-error" ? new Error("offline") : undefined,
      data: options.facilityState === "cached-error" || options.facilityState === "stale" ? {
        dataState: options.facilityState === "stale" ? "STALE_USABLE" : "FRESH",
        data: { facilities: [{ type: "PARKING", status: "UNAVAILABLE", summary: "道路封闭，不能停车" }] },
      } : undefined,
      refetch: () => retries.push("site"),
    }, FACILITY_LABEL: { PARKING: "停车" }, GUIDE_AUTHOR_LABELS: { SELF: "作者" }, formatDisplayDate: () => "未知日期",
  };
  for (const name of ["View", "Text", "ScrollView", "CustomNav", "FloatingNotificationHost", "StatusPanel", "Provenance", "FacilityEvidenceDetails"]) context[name] = name;
  const tree = vm.runInNewContext(ts.transpileModule(`const ${loading.getText(source)}; (${result.expression!.getText(source)});`, {
    compilerOptions: { target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.React },
  }).outputText, context);
  return { tree, retries };
}

test("article body survives pending or failed overview without inventing media", () => {
  for (const options of [{ pending: true }, { failed: true }]) {
    const { tree } = render(options);
    const output = JSON.stringify(tree);
    assert.match(output, /正文独立保留/);
    assert.match(output, /媒体资料尚不可用/);
    assert.doesNotMatch(output, /没有符合授权/);
  }
});

test("missing article and invalid route never display a borrowed body", () => {
  assert.doesNotMatch(JSON.stringify(render({ article: false }).tree), /正文独立保留/);
  assert.match(JSON.stringify(render({ article: false }).tree), /重试攻略/);
  assert.doesNotMatch(JSON.stringify(render({ valid: false }).tree), /正文独立保留/);
});

test("failed refresh and stale envelopes retain article text with a working recovery", () => {
  for (const options of [{ refreshFailed: true }, { staleEnvelope: true }]) {
    const { tree, retries } = render(options);
    const output = JSON.stringify(tree);
    assert.match(output, /正文独立保留/);
    assert.match(output, /上次读取的内容/);
    let recovery: { state: string; onRecover: () => void } | undefined;
    function visit(node: any) {
      if (!node || typeof node !== "object") return;
      if (node.type === "StatusPanel" && node.props?.recoveryLabel === "重试更新") recovery = node.props;
      for (const value of Object.values(node)) if (typeof value === "object") visit(value);
    }
    visit(tree);
    assert.equal(recovery?.state, "STALE");
    recovery!.onRecover();
    assert.deepEqual(retries, ["guides"]);
  }
});

test("article text comes directly from content without fixture-dependent rewriting or appended explanations", () => {
  const paragraph = "示例攻略：出发前核验开放情况。";
  for (const fixture of [false, true]) {
    for (const spotId of ["spot:test-published", "spot:real"]) {
      const output = JSON.stringify(render({ fixture, spotId, paragraph }).tree);
      assert.ok(output.includes(paragraph));
      assert.doesNotMatch(output, /仅用于测试|不用于现实判断|测试数据说明/);
    }
  }
});

test("facility references distinguish loading, request failure and absent evidence without hiding article text", () => {
  for (const [facilityState, expected] of [["pending", "正在读取设施记录"], ["failed", "设施资料暂不可用"], ["missing", "不代表设施可用"]] as const) {
    const { tree, retries } = render({ facilityState });
    const output = JSON.stringify(tree);
    assert.ok(output.includes(expected));
    assert.match(output, /正文独立保留/);
    assert.doesNotMatch(output, /FacilityEvidenceDetails/);
    if (facilityState === "failed") {
      const recoveries: (() => void)[] = [];
      function visit(node: any) {
        if (!node || typeof node !== "object") return;
        if (node.props?.recoveryLabel === "重试设施资料") recoveries.push(node.props.onRecover);
        for (const value of Object.values(node)) if (typeof value === "object") visit(value);
      }
      visit(tree);
      assert.equal(recoveries.length, 1);
      recoveries[0]!();
      assert.deepEqual(retries, ["site"]);
    }
  }
});

test("stale facility evidence retains its closure warning and has one targeted recovery", () => {
  for (const facilityState of ["cached-error", "stale"] as const) {
    const { tree, retries } = render({ facilityState });
    const output = JSON.stringify(tree);
    assert.match(output, /使用条件可能已变化/);
    assert.match(output, /道路封闭，不能停车/);
    assert.match(output, /UNAVAILABLE/);
    assert.doesNotMatch(output, /暂无该设施的核验记录/);
    const recoveries: (() => void)[] = [];
    function visit(node: any) {
      if (!node || typeof node !== "object") return;
      if (node.props?.recoveryLabel === "重试设施资料") recoveries.push(node.props.onRecover);
      for (const value of Object.values(node)) if (typeof value === "object") visit(value);
    }
    visit(tree);
    assert.equal(recoveries.length, 1);
    recoveries[0]!();
    assert.deepEqual(retries, ["site"]);
  }
});
