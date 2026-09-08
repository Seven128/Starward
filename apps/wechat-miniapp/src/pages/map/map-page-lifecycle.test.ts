import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

test("map foreground/hide callbacks stop pending interaction and invalidate late navigation", () => {
  const text = readFileSync(new URL("./index.tsx", import.meta.url), "utf8");
  for (const sourceText of [text, text.replaceAll(" => ", "  =>  ")]) {
    const source = ts.createSourceFile("map.tsx", sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const hooks: string[] = [];
    const visit = (node: ts.Node) => {
      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && ["useDidShow", "useDidHide"].includes(node.expression.text))
        hooks.push(`${node.getText(source)};`);
      ts.forEachChild(node, visit);
    };
    visit(source);
    let show: (() => void) | undefined, hide: (() => void) | undefined;
    let visible = false, stopped = 0, offset = 40, dragging = true;
    const epoch = { current: 3 }, drag = { current: {} as object | null };
    vm.runInNewContext(ts.transpileModule(hooks.join("\n"), { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText, {
      useDidShow: (callback: () => void) => { show = callback; },
      useDidHide: (callback: () => void) => { hide = callback; },
      setPageVisible: (value: boolean) => { visible = value; },
      stopPanelSpring: () => { stopped++; }, navigationEpoch: epoch, panelDrag: drag,
      setPanelDragOffset: (value: number) => { offset = value; },
      setPanelDragging: (value: boolean) => { dragging = value; },
    });
    assert.ok(show && hide);
    show();
    assert.equal(visible, true);
    hide();
    assert.equal(visible, false);
    assert.equal(stopped, 1);
    assert.equal(epoch.current, 4);
    assert.equal(drag.current, null);
    assert.equal(offset, 0);
    assert.equal(dragging, false);
  }
});
