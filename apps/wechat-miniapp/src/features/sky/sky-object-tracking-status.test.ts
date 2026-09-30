import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const source = ts.createSourceFile("sky-object-tracking-status.tsx",
  readFileSync(new URL("./sky-object-tracking-status.tsx", import.meta.url), "utf8"),
  ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const component = source.statements.find(node => ts.isFunctionDeclaration(node) &&
  node.name?.text === "SkyObjectTrackingStatus") as ts.FunctionDeclaration;
assert.ok(component);
const code = ts.transpileModule(`${component.getText(source).replace(/^export\s+/, "")}\nSkyObjectTrackingStatus;`,
  { compilerOptions: { target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React } }).outputText;

function retryFor(catalog: { catalogVersion: string; catalogHash: string } | null) {
  const calls: string[] = [];
  const tree = vm.runInNewContext(code, {
    React: { createElement: (type: string, props: Record<string, unknown>, ...children: unknown[]) =>
      ({ type, props: props ?? {}, children }) },
    Button: "Button", Text: "Text", View: "View",
    useRef: (current: unknown) => ({ current }), useEffect: () => {},
    useCelestialPosition: () => ({ isError: true, isPending: false, data: undefined,
      refetch: () => { calls.push("position"); return Promise.resolve(); } }),
  }) as (props: Record<string, unknown>) => unknown;
  const rendered = tree({ name: "织女星", binding: {}, catalog, overview: false, suspended: false,
    onPosition: () => {}, onStop: () => {}, onRetrySky: () => calls.push("sky") });
  const findRetry = (node: any): (() => void) | null => {
    if (!node || typeof node !== "object") return null;
    if (node.type === "Button" && node.props.className === "sky-view-mode__button") return node.props.onClick;
    for (const child of node.children ?? []) {
      const found = findRetry(child);
      if (found) return found;
    }
    return null;
  };
  const retry = findRetry(rendered);
  assert.ok(retry, "the failure state retains a recovery action");
  retry();
  return calls;
}

test("tracking retries the missing sky catalog before attempting an identity-bound position query", () => {
  assert.deepEqual(retryFor(null), ["sky"]);
  assert.deepEqual(retryFor({ catalogVersion: "bsc-v3", catalogHash: "a".repeat(64) }), ["sky", "position"]);
});
