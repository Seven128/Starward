import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";
import { validateExternalUrl, type SourceSummary } from "@starward/miniapp-contracts";
import { isProductSource, sourceAttributions } from "../utils/source-presentation";

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
    Text: "Text", View: "View", SoftButton: "SoftButton", isProductSource, sourceAttributions, validateExternalUrl,
    useState: () => [message, (value: string) => { message = value; }],
    Taro: { setClipboardData: async ({ data }: { data: string }) => { copied = data; } },
  });
  return { render, copied: () => copied };
}
function nodes(tree: any): any[] {
  return !tree || typeof tree !== "object" ? [] : Array.isArray(tree) ? tree.flatMap(nodes) : [tree, ...nodes(tree.children)];
}
function renderedText(tree: any): string {
  if (typeof tree === "string" || typeof tree === "number") return String(tree);
  if (Array.isArray(tree)) return tree.map(renderedText).join("");
  return tree && typeof tree === "object" ? renderedText(tree.children) : "";
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
  assert.match(renderedText(button), /^复制链接 · 和风天气 · https:\/\//u);
  button.props.onClick(); await new Promise<void>(resolve => setImmediate(resolve));
  assert.equal(h.copied(), "https://www.qweather.com/");
  assert.ok(nodes(h.render({ sources: [source()] })).some(node => node.children?.includes("来源链接已复制，可在浏览器中查看。")));
});

test("compact map credit keeps the legal notice and exact link action", async () => {
  const h = harness();
  const tree = h.render({ sources: [source()], compact: true });
  const button = nodes(tree).find(node => node.type === "SoftButton");
  assert.equal(renderedText(button), "复制来源链接");
  assert.equal(nodes(tree).find(node => node.type === "Text" && node.props?.selectable)?.children[0], notice);
  button.props.onClick(); await new Promise<void>(resolve => setImmediate(resolve));
  assert.equal(h.copied(), "https://www.qweather.com/");
});

test("disclosure credit keeps the full brand and URL beside its named official copy action", async () => {
  const h = harness(), input = source();
  const tree = h.render({ sources: [input, input], presentation: "disclosure" });
  const all = nodes(tree), buttons = all.filter(node => node.type === "SoftButton");
  assert.equal(buttons.length, 1, "the layout must retain exact attribution deduplication");
  assert.equal(renderedText(buttons[0]), "复制官方链接");
  assert.equal(buttons[0].props.label, "复制和风天气官方链接");
  assert.equal(all.find(node => node.props?.className === "source-attribution__name").children[0], "和风天气");
  assert.equal(all.find(node => node.props?.className === "source-attribution__url").children[0], input.attribution!.url);
  assert.equal(all.find(node => node.type === "Text" && node.props?.selectable && node.children[0] === notice)?.children[0], notice);
  buttons[0].props.onClick(); await new Promise<void>(resolve => setImmediate(resolve));
  assert.equal(h.copied(), "https://www.qweather.com/");
  assert.match(renderedText(h.render({ sources: [input], presentation: "disclosure" })), /来源链接已复制，可在浏览器中查看。/);
});

test("a source reading link cannot invent attribution or claim an undeclared official credit", async () => {
  const h = harness(), { attribution, ...input } = source();
  assert.deepEqual(sourceAttributions([input]), []);
  assert.equal(h.render({ sources: [input] }), null, "data-side credits remain explicitly declared only");
  const tree = h.render({ sources: [input, input], presentation: "disclosure" });
  const button = nodes(tree).find(node => node.type === "SoftButton");
  assert.equal(renderedText(button), "复制原始出处");
  assert.equal(button.props.label, "复制和风天气原始出处链接");
  assert.equal(nodes(tree).filter(node => node.type === "SoftButton").length, 1);
  assert.equal(nodes(tree).find(node => node.props?.className === "source-attribution__url").children[0], input.sourceUrl);
  assert.doesNotMatch(renderedText(tree), /原始发布机构|官方链接/);
  button.props.onClick(); await new Promise<void>(resolve => setImmediate(resolve));
  assert.equal(h.copied(), "https://www.qweather.com/");
  assert.deepEqual(sourceAttributions([input]), []);
  const combined = h.render({ sources: [input, source()], presentation: "disclosure" });
  assert.equal(nodes(combined).filter(node => node.type === "SoftButton").length, 1, "a declared credit replaces an identical reading row");
  assert.match(renderedText(combined), /复制官方链接/);
  assert.equal(nodes(combined).find(node => node.props?.selectable && node.children[0] === notice).children[0], notice);
});
