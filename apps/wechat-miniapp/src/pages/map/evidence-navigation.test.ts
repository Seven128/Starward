import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { sourceNavigationForTest } from "../../services/source-navigation-test-support";

test("map evidence entries preserve selected spot/context and reject unrelated articles", async () => {
  const source = ts.createSourceFile("map.tsx", readFileSync(new URL("./index.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const declarations: string[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && ["openMapPage", "onPanelEvidence"].includes(node.name.getText(source))) declarations.push(`const ${node.getText(source)};`);
    ts.forEachChild(node, visit);
  };
  visit(source);
  assert.equal(declarations.length, 2);
  const urls: string[] = [];
  const Taro = { getCurrentPages: () => [{ route: "pages/map/index" }],
    navigateTo: ({ url }: { url: string }) => { urls.push(url); return Promise.resolve(); } };
  const getState = () => ({ accountOwnerId: null, mapResetVersion: 0, selectedSpotId: "spot:a",
    observationContext: { contextId: "context:a&b", revision: 1, contextFingerprint: "test" }, notifications: [] });
  const open = vm.runInNewContext(ts.transpileModule(declarations.join("\n") + "\nonPanelEvidence;", { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText, {
    selected: { spotId: "spot:a" }, activeContext: { contextId: "context:a&b" }, detailContextReady: true,
    spotDetail: { guides: [{ articleId: "article:a", spotId: "spot:a" }, { articleId: "article:b", spotId: "spot:b" }] },
    Taro, ...sourceNavigationForTest(Taro, getState), notify() {},
    useAppStore: { getState },
  }) as (kind: string, articleId?: string) => Promise<void>;
  await open("guides"); await open("field"); await open("sources"); await open("guides", "article:a");
  await open("guides", "article:b"); await open("guides", "missing");
  assert.equal(urls.length, 4);
  assert.deepEqual(urls.map(url => new URL(url, "https://local.invalid").pathname), ["/spot/guides/index", "/spot/field/index", "/spot/data-source/index", "/content/article/detail/index"]);
  for (const url of urls) {
    const parsed = new URL(url, "https://local.invalid");
    assert.equal(parsed.searchParams.get("spotId"), "spot:a");
    assert.equal(parsed.searchParams.get("contextId"), "context:a&b");
  }
  assert.equal(new URL(urls[3]!, "https://local.invalid").searchParams.get("articleId"), "article:a");
});
