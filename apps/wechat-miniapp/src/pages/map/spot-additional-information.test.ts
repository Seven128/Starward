import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const text = (node: any): string => node == null || typeof node === "boolean" ? "" : Array.isArray(node) ? node.map(text).join("") : typeof node === "object" ? text(node.children) : String(node);
const find = (node: any, type: string): any => Array.isArray(node) ? node.map(child => find(child, type)).find(Boolean) : node && typeof node === "object" ? node.type === type ? node : find(node.children, type) : null;
function harness() {
  const ast = ts.createSourceFile("additional.tsx", readFileSync(new URL("./spot-additional-information.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const fn = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === "SpotAdditionalInformation")!;
  let expanded: unknown = null, previousSpot: unknown, effects: (() => void)[] = [], layoutChanges = 0;
  const renderComponent = vm.runInNewContext(ts.transpileModule(fn.getText(ast).replace(/^export /, "") + ";SpotAdditionalInformation", {
    compilerOptions: { target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React },
  }).outputText, {
    useState: () => [expanded, (value: unknown) => { expanded = value; }],
    useEffect: (fn: () => void, deps: unknown[]) => { if (previousSpot !== deps[0]) effects.push(fn); previousSpot = deps[0]; },
    Button: "Button", Text: "Text", View: "View", SemanticIcon: "Icon", Provenance: "Source", FacilityEvidenceDetails: "Facility",
    React: { createElement: (type: string, props: any, ...children: any[]) => ({ type, props, children }) },
  });
  return { get layoutChanges() { return layoutChanges; }, render(spotId = "spot:a", empty = false) {
    const props = { spotId, detail: { formalFacts: empty ? {} : { platform: `${spotId}平台`, signal: "通信待核验" },
      accessAndSafety: { guidance: empty ? [] : ["请沿原路返回"], restrictions: [] }, dataDisclosure: [] }, facilities: [],
      facilityLabel: (value: string) => value, onLayoutChange: () => layoutChanges++ };
    let tree = renderComponent(props);
    if (effects.length) { effects.splice(0).forEach(fn => fn()); tree = renderComponent(props); }
    return tree;
  } };
}
test("more site information expands the current document, preserves actual facts, and collapses without navigation", () => {
  const h = harness(); let tree = h.render();
  assert.doesNotMatch(text(tree), /spot:a平台|原路返回/);
  find(tree, "Button").props.onClick(); tree = h.render();
  assert.match(text(tree), /spot:a平台.*通信待核验.*原路返回/s);
  assert.equal(find(tree, "Button").props["aria-expanded"], true);
  assert.equal(h.layoutChanges, 1, "chapter offsets must be remeasured after the document expands");
  find(tree, "Button").props.onClick(); tree = h.render();
  assert.doesNotMatch(text(tree), /spot:a平台|原路返回/);
  assert.equal(h.layoutChanges, 2);
});
test("changing spot closes the disclosure and no extra evidence creates no empty disclosure", () => {
  const h = harness(); find(h.render(), "Button").props.onClick(); h.render();
  assert.doesNotMatch(text(h.render("spot:b")), /spot:a平台|spot:b平台/);
  assert.equal(find(h.render("spot:a"), "Button").props["aria-expanded"], false);
  assert.equal(h.render("spot:empty", true), null);
});
