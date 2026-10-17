import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const source = ts.createSourceFile("search-page.tsx", readFileSync(new URL("./search-page.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const partitions: ts.JsxElement[] = [];
function visit(node: ts.Node) {
  if (ts.isJsxElement(node) && node.openingElement.tagName.getText(source) === "SearchResultPartition") partitions.push(node);
  ts.forEachChild(node, visit);
}
visit(source);
assert.equal(partitions.length, 2);
const [first, second] = partitions;
assert.ok(first && second);
let owner: ts.Node = first;
while (!(owner.pos <= second.pos && owner.end >= second.end)) owner = owner.parent;
if (ts.isJsxFragment(owner) && ts.isConditionalExpression(owner.parent)) owner = owner.parent;
const expression = ts.transpileModule(`(${owner.getText(source)})`, {
  compilerOptions: { target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.React },
}).outputText;

function render(state: "READY" | "LOADING" | "EMPTY") {
  return vm.runInNewContext(expression, {
    React: { createElement: (type: string, props: unknown, ...children: unknown[]) => ({ type, props, children }) },
    View: "View", Text: "Text", SearchResultPartition: "partition", SearchResultCard: "card",
    formalSpots: [], wanted: [], other: [], searchState: state,
    queryUnconfirmed: state === "LOADING", expiredEmptyFilter: false,
    hasUnknownIncludedSpot: false, showPartitionEmpty: state === "READY",
    activeFilterGroups: [], visibleScene: null, reducedMotion: false,
    partitionContentRevision: () => "test", selectFormal: () => {},
  }) as { props: { style?: { display: string } }; children: unknown[] } | null;
}
function countPartitions(node: unknown): number {
  if (!node || typeof node !== "object") return 0;
  if (Array.isArray(node)) return node.reduce((sum, child) => sum + countPartitions(child), 0);
  const element = node as { type: string; children: unknown[] };
  return Number(element.type === "partition") + countPartitions(element.children);
}

test("request waiting and genuine empty results retain disclosure owners without showing them", () => {
  for (const state of ["READY", "LOADING", "EMPTY"] as const) {
    const tree = render(state);
    assert.equal(countPartitions(tree), 2, `${state} must not discard the user's disclosure state`);
    assert.equal(tree?.props?.style?.display === "none", state !== "READY",
      "waiting and page-empty states must not expose stale results or duplicate zero groups");
  }
});
