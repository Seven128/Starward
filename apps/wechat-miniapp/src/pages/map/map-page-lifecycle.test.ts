import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

test("map foreground/hide callbacks stop pending interaction and invalidate late navigation", () => {
  const text = readFileSync(new URL("./index.tsx", import.meta.url), "utf8");
  for (const sourceText of [text, text.replaceAll(" => ", "  =>  ")]) {
    for (const editorClosing of [false, true]) {
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
    let retainedFailure = false;
    const epoch = { current: 3 }, drag = { current: {} as object | null };
    const editorScope = {current: "visible owner" as string | null};
    let cancelledEditor = 0, presentation = "spot-editor";
    vm.runInNewContext(ts.transpileModule(hooks.join("\n"), { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText, {
      useDidShow: (callback: () => void) => { show = callback; },
      useDidHide: (callback: () => void) => { hide = callback; },
      setPageVisible: (value: boolean) => { visible = value; },
      invalidateMapPointIntent: (preserveFailure: boolean) => { retainedFailure = preserveFailure; },
      stopPanelSpring: () => { stopped++; }, navigationEpoch: epoch, panelDrag: drag,
      setPanelDragOffset: (value: number) => { offset = value; },
      setPanelDragging: (value: boolean) => { dragging = value; },
      editorPresentationScope: editorScope,
      editorPresentation: {isClosing: () => editorClosing, cancel: () => {cancelledEditor++;}},
      setBottomPresentation: (next: string) => {presentation = next; cancelledEditor++;},
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
    assert.equal(retainedFailure, true, "hiding cancels in-flight work but retains the failed location for recovery");
    assert.equal(editorScope.current, null, "a late confirmation or exit cannot retain the hidden page's scope");
    assert.equal(cancelledEditor, 1);
    assert.equal(presentation, editorClosing ? "none" : "spot-editor", "only an already approved exit is finalized on hide");
    }
  }
});
