import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { skyObjectKindLabel } from "./sky-object-picking";
import { celestialInformationPartialDetail } from "../../services/celestial-information-presentation";

const source = ts.createSourceFile("spot-sky-page.tsx",
  readFileSync(new URL("./spot-sky-page.tsx", import.meta.url), "utf8"),
  ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const component = source.statements.find(node => ts.isFunctionDeclaration(node) &&
  node.name?.text === "SkyCatalogInformation") as ts.FunctionDeclaration;
assert.ok(component);
const code = ts.transpileModule(`${component.getText(source)}\nSkyCatalogInformation;`,
  { compilerOptions: { target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React } }).outputText;

test("a retained stale object description offers an inline retry without losing its facts", () => {
  let retries = 0;
  const information = { isPending: false, isError: false, refreshError: new Error("offline"),
    data: { dataState: "STALE_USABLE", data: { displayName: "织女星", kind: "STAR",
      contentState: "BASIC_ONLY", introduction: null, aliases: ["Vega"],
      facts: [{ label: "视星等", value: "0.03", unit: "mag" }],
      limitations: [], sources: [] } }, refetch: () => { retries++; return Promise.resolve(); } };
  const render = vm.runInNewContext(code, {
    React: { createElement: (type: string, props: Record<string, unknown>, ...children: unknown[]) =>
      ({ type, props: props ?? {}, children }) },
    View: "View", Button: "Button", ScrollView: "ScrollView", Text: "Text",
    SemanticIcon: "SemanticIcon", SoftButton: "SoftButton", StatusPanel: "StatusPanel",
    useRef: (current: unknown) => ({ current }), useEffect: () => {},
    useAppStore: (selector: (state: unknown) => unknown) => selector({ notify: () => {} }),
    useCelestialInformation: () => information, productSourceNames: () => "", skyObjectKindLabel,
    celestialInformationPartialDetail,
  }) as (props: Record<string, unknown>) => any;
  const tree = render({ reference: "HR:7001", knownName: "Vega", knownKind: "STAR",
    onClose: () => {}, positionAction: null });
  function find(node: any, predicate: (candidate: any) => boolean): any {
    if (Array.isArray(node)) {
      for (const child of node) {
        const found = find(child, predicate);
        if (found) return found;
      }
      return null;
    }
    if (predicate(node)) return node;
    for (const child of node?.children ?? []) {
      const found = find(child, predicate);
      if (found) return found;
    }
    return null;
  }
  assert.ok(find(tree, node => node?.type === "Text" && node.children?.includes("0.03")));
  const status = find(tree, node => node?.type === "StatusPanel" && node.props.state === "STALE");
  assert.ok(status, "the retained facts need an actionable stale-state explanation");
  status.props.onRecover();
  assert.equal(retries, 1);

  information.refreshError = null as unknown as Error;
  information.data.dataState = "UNAVAILABLE";
  const unavailableTree = render({ reference: "HR:7001", knownName: "Vega", knownKind: "STAR",
    onClose: () => {}, positionAction: null });
  const unavailable = find(unavailableTree, node => node?.type === "StatusPanel" && node.props.state === "ERROR");
  assert.ok(unavailable, "an unavailable response exposes a retry");
  assert.equal(find(unavailableTree, node => node?.type === "Text" && node.children?.includes("0.03")), null,
    "unavailable data must not pose as usable facts");
  unavailable.props.onRecover();
  assert.equal(retries, 2);

  information.data.dataState = "PARTIAL";
  const partialTree = render({ reference: "HR:7001", knownName: "Vega", knownKind: "STAR",
    onClose: () => {}, positionAction: null });
  const partial = find(partialTree, node => node?.type === "StatusPanel" && node.props.state === "PARTIAL");
  assert.ok(partial, "the service's partial Chinese-alias publication needs a retry");
  assert.ok(find(partialTree, node => node?.type === "Text" && node.children?.includes("0.03")));
  partial.props.onRecover();
  assert.equal(retries, 3);
});

test("the actual object modal sends its painted publication to both details and the source route", async () => {
  const publicationHash = "a".repeat(64), requests: unknown[][] = [], urls: string[] = [];
  const render = vm.runInNewContext(code, {
    React: { createElement: (type: string, props: Record<string, unknown>, ...children: unknown[]) => ({ type, props: props ?? {}, children }) },
    View: "View", Button: "Button", ScrollView: "ScrollView", Text: "Text", SemanticIcon: "SemanticIcon",
    SoftButton: "SoftButton", StatusPanel: "StatusPanel", useRef: (current: unknown) => ({ current }), useEffect: () => {},
    useAppStore: (select: (value: unknown) => unknown) => select({ notify() {} }), skyObjectKindLabel,
    Taro: { async navigateTo({ url }: { url: string }) { urls.push(url); } },
    productSourceNames: () => "IRSA",
    celestialInformationPartialDetail,
    useCelestialInformation: (...args: unknown[]) => { requests.push(args); return { isPending: false, isError: false,
      data: { dataState: "FRESH", data: { displayName: "M 42", kind: "NEBULA", contentState: "BASIC_ONLY", introduction: null,
        aliases: [], facts: [], limitations: [], sources: [{ id: `imagery:published:${publicationHash}` }] } } }; },
  }) as (props: Record<string, unknown>) => any;
  const tree = render({ reference: "M:42", knownName: "M 42", knownKind: "NEBULA", imagePublicationHash: publicationHash, onClose() {} });
  assert.deepEqual(Array.from(requests[0]!), ["M:42", true, publicationHash]);
  const stack = [tree];
  let button: any;
  while (stack.length) { const item = stack.pop(); if (Array.isArray(item)) stack.push(...item);
    else if (item?.type === "SoftButton") { button = item; break; } else stack.push(...(item?.children ?? [])); }
  assert.ok(button); button.props.onClick();
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(urls, [`/sky/sources/index?reference=M%3A42&imagePublicationHash=${publicationHash}`]);
});
