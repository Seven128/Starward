import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { panelHeightProgress } from "./panel-snap";

const geometry = { small: 181, medium: 368, large: 661, startHeight: 368 };

/** Exercise the production draw dispatch without running unrelated Map effects. */
export function drawOwner(sourceText: string) {
  const source = ts.createSourceFile("map.tsx", sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let declaration: ts.VariableDeclaration | undefined;
  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && (node.name.getText(source) === "setPanelDragOffset" ||
      (ts.isArrayBindingPattern(node.name) && node.name.elements.some(element => element.getText(source) === "setPanelDragOffset")))) declaration = node;
    ts.forEachChild(node, visit);
  };
  visit(source); assert.ok(declaration);
  let mapUpdates = 0;
  const frames: any[] = [];
  const drag = { current: { extent: "medium", geometry } as any };
  const draw = vm.runInNewContext(ts.transpileModule(`const ${declaration.getText(source)}; setPanelDragOffset;`, {
    compilerOptions: { target: ts.ScriptTarget.ES2020 },
  }).outputText, {
    useState: () => [0, () => { mapUpdates++; }], panelDrag: drag,
    panelPresentation: { current: { setDragFrame: (frame: unknown) => frames.push(frame) } },
  }) as (offset: number) => void;
  for (let index = 1; index <= 32; index++) draw(-index * 4);
  drag.current = null; draw(0);
  return { mapUpdates, frames };
}

test("handle movement updates only its presentation owner and cancellation retires its frame", () => {
  const result = drawOwner(readFileSync(new URL("./index.tsx", import.meta.url), "utf8"));
  assert.equal(result.mapUpdates, 0, "continuous handle movement must not schedule whole-Map state updates");
  assert.equal(result.frames.length, 33);
  assert.equal(result.frames[0].offset, -4);
  assert.equal(result.frames[31].offset, -128);
  assert.equal(result.frames[0].geometry, geometry);
  assert.equal(result.frames.at(-1), null, "cancel/owner retirement removes the live draw frame");
});

test("Taro reconciliation retains content during drag while business changes remain live", async () => {
  // These are Taro's build-time optional DOM flags in this Node-only check.
  for (const name of ["ENABLE_INNER_HTML", "ENABLE_ADJACENT_HTML", "ENABLE_CLONE_NODE", "ENABLE_CONTAINS", "ENABLE_SIZE_APIS", "ENABLE_TEMPLATE_CONTENT", "ENABLE_MUTATION_OBSERVER"]) (globalThis as any)[name] = false;
  const renderer = await import("@tarojs/react");
  const { document } = await import("@tarojs/runtime");
  // Resolve the runtime explicitly: tsconfig maps the bare React name to types.
  const React = createRequire(import.meta.url)(fileURLToPath(new URL("../../../node_modules/react/index.js", import.meta.url)));
  const source = readFileSync(new URL("./panel-presentation.tsx", import.meta.url), "utf8")
    .replace(/^import .*;\r?\n/gm, "").replace(/^export /gm, "");
  const Presentation = vm.runInNewContext(ts.transpileModule(source + "\nMapPanelPresentation;", {
    compilerOptions: { target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.React },
  }).outputText, { React, forwardRef: React.forwardRef, useState: React.useState,
    useImperativeHandle: React.useImperativeHandle, View: "view", panelHeightProgress });
  const ref = React.createRef();
  let ownerRenders = 0, contentRenders = 0;
  let change: (value: string) => void = () => {};
  let deactivate: () => void = () => {};
  function Content({ value }: { value: string }) { contentRenders++; return React.createElement("text", {}, value); }
  function Owner() {
    ownerRenders++;
    const [value, setValue] = React.useState("A");
    const [active, setActive] = React.useState(true);
    change = setValue; deactivate = () => setActive(false);
    return React.createElement(Presentation, { ref, className: "map-page", style: {}, active,
      extent: "medium", hasMedia: true, deliveryTarget: "WEAPP" }, React.createElement(Content, { value }));
  }
  const container = document.createElement("view");
  try {
    renderer.render(React.createElement(Owner), container, () => {});
    assert.ok(ref.current);
    for (const offset of [-20, -80, -200, -280, -120, -40, 0]) {
      renderer.flushSync(() => ref.current.setDragFrame({ extent: "medium", geometry, offset }));
      const root = container.childNodes[0] as any;
      assert.match(root.style.cssText, new RegExp(`--panel-drag-offset: ?${offset}px`));
    }
    assert.equal(ownerRenders, 1);
    assert.equal(contentRenders, 1, "actual Taro React reconciliation skips the unchanged content subtree");
    renderer.flushSync(() => change("B"));
    assert.equal(contentRenders, 2, "a real content update must still reach the consumer");
    assert.equal((container.childNodes[0] as any).textContent, "B");
    renderer.flushSync(() => ref.current.setDragFrame({ extent: "medium", geometry, offset: -280 }));
    assert.match((container.childNodes[0] as any).className, /panel-chrome-hidden/);
    renderer.flushSync(deactivate);
    const hidden = container.childNodes[0] as any;
    assert.doesNotMatch(hidden.className, /panel-media-visible|panel-chrome-hidden/);
    assert.match(hidden.style.cssText, /--panel-drag-offset: ?0px/);
    assert.match(hidden.style.cssText, /--map-chrome-opacity: ?1/);
  } finally { renderer.unmountComponentAtNode(container); }
});
