import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import type { SourceSummary } from "@starward/miniapp-contracts";
import { isProductSource } from "../utils/source-presentation";

function harness(transform = (value: string) => value) {
  const code = transform(readFileSync(new URL("./source-disclosure.tsx", import.meta.url), "utf8"));
  const ast = ts.createSourceFile("disclosure.tsx", code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const fn = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === "SourceDisclosure")!;
  let expanded = false;
  const render = vm.runInNewContext(ts.transpileModule(fn.getText(ast).replace(/^export /, "") + ";SourceDisclosure;", {
    compilerOptions: { target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React },
  }).outputText, {
    React: { createElement: (type: unknown, props: unknown, ...children: unknown[]) => ({ type, props, children }) },
    Button: "Button", Text: "Text", View: "View", Provenance: "Provenance", isProductSource,
    useState: () => [expanded, (value: boolean | ((previous: boolean) => boolean)) => { expanded = typeof value === "function" ? value(expanded) : value; }],
  });
  return { render: (sources: SourceSummary[], children?: unknown) => render({ id: "reading-source", label: "来源与有效时间", sources, children }) };
}
function nodes(tree: any): any[] {
  return !tree || typeof tree !== "object" ? [] : Array.isArray(tree) ? tree.flatMap(nodes) : [tree, ...nodes(tree.children)];
}
const source: SourceSummary = {
  id: "declared-source", kind: "OPEN_DATA", provider: "已发布资料", title: "有边界的年度记录", state: "FRESH",
  retrievedAt: "2026-10-07T04:00:00Z", publishedAt: null, validFrom: "2025-01-01T00:00:00Z", validTo: null,
  sourceUrl: "https://example.org/source", licenseUrl: "https://example.org/license", license: "保留原始许可",
  precision: "既有网格尺度", limitations: ["不表示现场实测"], confidence: null,
};

function readingJourney(transform?: (value: string) => string) {
  const h = harness(transform);
  let tree = h.render([source]);
  const button = () => nodes(tree).find(node => node.type === "Button");
  assert.equal(button().props["aria-expanded"], false);
  assert.equal(button().props["aria-controls"], "reading-source-body");
  assert.equal(nodes(tree).some(node => node.type === "Provenance"), false, "closed details must leave the data readable");
  button().props.onClick(); tree = h.render([source]);
  assert.equal(button().props["aria-expanded"], true);
  assert.ok(nodes(tree).some(node => node.props?.id === "reading-source-body"));
  assert.equal(nodes(tree).find(node => node.type === "Provenance").props.source, source, "opening must pass the complete current source to its existing owner");
  assert.equal(nodes(tree).find(node => node.type === "Provenance").props.presentation, "disclosure");
  assert.equal(nodes(tree).find(node => node.type === "Provenance").props.showKind, false);
  button().props.onClick(); tree = h.render([source]);
  assert.equal(button().props["aria-expanded"], false);
  assert.equal(nodes(tree).some(node => node.props?.id === "reading-source-body"), false);
}

test("source reading opens complete current provenance and closes through the same accessible control", () => {
  readingJourney();
  assert.throws(() => readingJourney(code => {
    const handler = "onClick={() => setExpanded(value => !value)}";
    assert.ok(code.includes(handler));
    return code.replace(handler, "onClick={() => undefined}");
  }), { name: "AssertionError" }, "a button with no reading effect must fail this journey");
});

test("internal source records do not leak, while independent records with the same ID keep their distinct coverage", () => {
  const h = harness();
  const internal = { ...source, kind: "TEST_FIXTURE" as const };
  assert.equal(h.render([internal]), null);
  const later = { ...source, validFrom: "2026-01-01T00:00:00Z", precision: "另一有效范围" };
  let tree = h.render([internal, source, later]);
  nodes(tree).find(node => node.type === "Button").props.onClick(); tree = h.render([internal, source, later]);
  const cards = nodes(tree).filter(node => node.type === "Provenance");
  assert.equal(cards.length, 2);
  assert.equal(cards[0].props.source, source);
  assert.equal(cards[1].props.source, later);
  assert.notEqual(cards[0].props.key, cards[1].props.key);
});

test("a useful range explanation remains reachable with no source record and an empty disclosure has no dead control", () => {
  const h = harness();
  assert.equal(h.render([]), null);
  let tree = h.render([], "前两个自然日；不含今天，也不是现场实测。");
  assert.equal(nodes(tree).some(node => node.props?.className === "source-disclosure__note"), false);
  nodes(tree).find(node => node.type === "Button").props.onClick(); tree = h.render([], "前两个自然日；不含今天，也不是现场实测。");
  assert.ok(nodes(tree).some(node => node.props?.className === "source-disclosure__note"));
  assert.equal(nodes(tree).some(node => node.type === "Provenance"), false);
});
