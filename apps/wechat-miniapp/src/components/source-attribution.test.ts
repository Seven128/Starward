import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";
import { validateExternalUrl, type SourceSummary } from "@starward/miniapp-contracts";
import { sourceAttributions } from "../utils/source-presentation";

const notice = "  原始发布机构 © A & B\n不得更改此声明。  ";
const source = (statements = [notice]): SourceSummary => ({ id: "forecast", provider: "和风天气", title: "逐小时预报",
  sourceUrl: "https://www.qweather.com", licenseUrl: "https://dev.qweather.com/docs/terms/tos/", license: "QWeather terms",
  retrievedAt: null, publishedAt: null, validFrom: null, validTo: null, state: "FRESH", precision: "来源网格", limitations: [], confidence: null,
  kind: "THIRD_PARTY_FORECAST", attribution: {
  name: "和风天气", url: "https://www.qweather.com", statements,
} });

function harness() {
  const ast = ts.createSourceFile("credit.tsx", readFileSync(new URL("./source-attribution.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const code = ast.statements.filter(node => !ts.isImportDeclaration(node)).map(node => node.getText(ast).replace(/^export /, "")).join("\n");
  let message = "", copied = "";
  const render = vm.runInNewContext(ts.transpileModule(code + ";SourceAttribution;", { compilerOptions: { target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React } }).outputText, {
    React: { createElement: (type: any, props: any, ...children: any[]) => ({ type, props, children }) },
    Text: "Text", View: "View", SoftButton: "SoftButton", sourceAttributions, validateExternalUrl,
    useState: () => [message, (value: string) => { message = value; }],
    Taro: { setClipboardData: async ({ data }: { data: string }) => { copied = data; } },
  });
  return { render, copied: () => copied };
}
function nodes(tree: any): any[] {
  return !tree || typeof tree !== "object" ? [] : Array.isArray(tree) ? tree.flatMap(nodes) : [tree, ...nodes(tree.children)];
}

test("mandatory attribution preserves complete original text and deduplicates only exact repeats", () => {
  const credits = sourceAttributions([source(), source([notice, notice.trim()]), { kind: "OPEN_DATA" } as SourceSummary]);
  assert.deepEqual(credits, [{ name: "和风天气", url: "https://www.qweather.com", statements: [notice, notice.trim()] }]);
  const h = harness();
  const statements = nodes(h.render({ sources: [source(), source()] })).filter(node => node.type === "Text" && node.props?.selectable);
  assert.equal(statements.length, 1);
  assert.equal(statements[0].children[0], notice);
  assert.equal(h.render({ sources: [{ kind: "OPEN_DATA" } as SourceSummary] }), null, "unknown notices are not invented");
  assert.equal(h.render({ sources: [{ ...source(), kind: "TEST_FIXTURE" }] }), null);
});

test("source link explicitly copies the actual official URL, without claiming navigation", async () => {
  const h = harness();
  const button = nodes(h.render({ sources: [source()] })).find(node => node.type === "SoftButton");
  assert.equal(button.props.label, "复制和风天气官方链接");
  assert.match(button.children.join(""), /^复制链接 · 和风天气 · https:\/\//u);
  button.props.onClick(); await new Promise<void>(resolve => setImmediate(resolve));
  assert.equal(h.copied(), "https://www.qweather.com/");
  assert.ok(nodes(h.render({ sources: [source()] })).some(node => node.children?.includes("来源链接已复制，可在浏览器中查看。")));
});
