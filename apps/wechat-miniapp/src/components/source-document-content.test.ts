import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";
import { validateExternalUrl } from "@starward/miniapp-contracts";
import * as mediaSources from "../utils/media-source";

function sourceLinks(url: string) {
  const source = ts.createSourceFile("source-document-content.tsx", readFileSync(new URL("./source-document-content.tsx", import.meta.url), "utf8"),
    ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const declaration = source.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === "SourceLinks");
  assert.ok(declaration);
  const writes: string[] = [], states: unknown[] = [];
  const render = vm.runInNewContext(ts.transpileModule(declaration.getText(source) + "\nSourceLinks;", {
    compilerOptions: { target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React },
  }).outputText, {
    ...mediaSources, validateExternalUrl, Text: "Text", View: "View", SoftButton: "Button",
    useState: (value: unknown) => [value, (value: unknown) => { states.push(value); }],
    Taro: { setClipboardData: async ({ data }: { data: string }) => { writes.push(data); } },
    React: { createElement: (type: unknown, props: unknown, ...children: unknown[]) => ({ type, props, children }) },
  });
  const tree = render({ section: { kind: "links", items: [{ label: "原始出处", url }] } });
  const nodes = (node: any): any[] => !node || typeof node !== "object" ? [] : Array.isArray(node) ? node.flatMap(nodes) : [node, ...nodes(node.children)];
  const button = nodes(tree).find(node => node.type === "Button");
  assert.ok(button, "the provided source keeps its rendered copy action");
  return { writes, states, async copy() { button.props.onClick(); await Promise.resolve(); await Promise.resolve(); } };
}

test("published media source copying resolves only the owned route against the current BFF", async () => {
  Object.assign(globalThis, { __MINIAPP_API_BASE__: "http://127.0.0.1:8798/" });
  const path = "/v2/spots/spot%3Aexample/media/upload%3A123-abc/image";
  const owned = sourceLinks(path);
  await owned.copy();
  assert.deepEqual(owned.writes, [`http://127.0.0.1:8798${path}`]);
  assert.ok(owned.states.some(value => typeof value === "string" && value.includes("已复制")));
  for (const invalid of ["http://127.0.0.1:8798/admin", "/v2/spots/spot%3Aexample/media/upload%3A123-abc/image?other=1", "/../private", "file:///private"]) {
    const link = sourceLinks(invalid); await link.copy();
    assert.equal(link.writes.length, 0, invalid);
    assert.ok(link.states.some(value => typeof value === "string" && value.includes("不可用")), invalid);
  }
  const external = sourceLinks("https://example.org/source"); await external.copy();
  assert.deepEqual(external.writes, ["https://example.org/source"]);
});
