import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { celestialInformationPartialDetail } from "../../services/celestial-information-presentation";

const source = ts.createSourceFile("index.tsx", readFileSync(new URL("./index.tsx", import.meta.url), "utf8"),
  ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const component = source.statements.find(node => ts.isFunctionDeclaration(node) &&
  node.name?.text === "CelestialSourcesPage") as ts.FunctionDeclaration;
assert.ok(component);
const code = ts.transpileModule(`${component.getText(source).replace(/^export\s+default\s+/, "")}\nCelestialSourcesPage;`,
  { compilerOptions: { target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React } }).outputText;

test("source route retains valid credit and offers recovery for a partial information publication", () => {
  let retries = 0;
  const render = vm.runInNewContext(code, {
    React: { createElement: (type: string, props: Record<string, unknown>, ...children: unknown[]) =>
      ({ type, props: props ?? {}, children }) },
    View: "View", ScrollView: "ScrollView", CustomNav: "CustomNav",
    Provenance: "Provenance", StatusPanel: "StatusPanel",
    useRouter: () => ({ params: { reference: "HR%3A7001" } }),
    useState: (value: unknown) => [value, () => {}], useDidHide: () => {}, useDidShow: () => {},
    useThemeClass: () => "mode-night", isCelestialObjectReference: () => true,
    useCelestialInformation: () => ({ isPending: false, isError: false, refreshError: null,
      data: { dataState: "PARTIAL", data: { displayName: "织女星", sources: [{ id: "bsc", provider: "BSC" }] } },
      refetch: () => { retries++; return Promise.resolve(); } }),
    isProductSource: () => true, deepSkyManifestUrl: () => undefined,
    celestialInformationPartialDetail,
  }) as () => any;
  const tree = render();
  function find(node: any, predicate: (candidate: any) => boolean): any {
    if (Array.isArray(node)) {
      for (const child of node) { const found = find(child, predicate); if (found) return found; }
      return null;
    }
    if (predicate(node)) return node;
    for (const child of node?.children ?? []) { const found = find(child, predicate); if (found) return found; }
    return null;
  }
  const partial = find(tree, node => node?.type === "StatusPanel" && node.props.state === "PARTIAL");
  assert.ok(partial);
  assert.ok(find(tree, node => node?.type === "Provenance" && node.props.source.provider === "BSC"));
  partial.props.onRecover();
  assert.equal(retries, 1);
});

test("the source route reads the image-bound publication and rejects an invalid binding before enabling a request", () => {
  const hash = "a".repeat(64), params = { reference: "M%3A42", imagePublicationHash: hash }, requests: unknown[][] = [];
  const render = vm.runInNewContext(code, {
    React: { createElement: (type: string, props: Record<string, unknown>, ...children: unknown[]) => ({ type, props: props ?? {}, children }) },
    View: "View", ScrollView: "ScrollView", CustomNav: "CustomNav", Provenance: "Provenance", StatusPanel: "StatusPanel",
    useRouter: () => ({ params }), useState: (value: unknown) => [value, () => {}], useDidHide() {}, useDidShow() {},
    useThemeClass: () => "mode-night", isCelestialObjectReference: () => true, isProductSource: () => true,
    deepSkyManifestUrl: (id: string) => `/manifest/${id.split(":").at(-1)}`,
    celestialInformationPartialDetail,
    useCelestialInformation: (...args: unknown[]) => { requests.push(args); return { isPending: false, isError: false,
      data: { dataState: "FRESH", data: { displayName: "M 42", sources: [{ id: `imagery:painted:${hash}`, limitations: [] }] } } }; },
  }) as () => any;
  const tree = render();
  assert.deepEqual(Array.from(requests[0]!), ["M:42", true, hash]);
  const stack = [tree]; let credit: any;
  while (stack.length) { const item = stack.pop(); if (Array.isArray(item)) stack.push(...item);
    else if (item?.type === "Provenance") { credit = item; break; } else stack.push(...(item?.children ?? [])); }
  assert.equal(credit?.props.downloadUrl, `/manifest/${hash}`);
  assert.ok(credit.props.source.limitations.some((value: string) => value.includes("非有限样本留空")));
  params.imagePublicationHash = "../outside";
  render();
  assert.equal(requests.at(-1)?.[1], false);
});
