import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";
import { QueryClient, QueryObserver } from "@tanstack/react-query";

test("returning to a formal spot refreshes its published facts without querying the hidden map", async () => {
  const source = ts.createSourceFile("map.tsx", readFileSync(new URL("./index.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let optionsText = "";
  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && node.name.getText(source) === "spotOverview" && node.initializer && ts.isCallExpression(node.initializer))
      optionsText = node.initializer.arguments[0]!.getText(source);
    ts.forEachChild(node, visit);
  };
  visit(source);assert.ok(optionsText);
  const scope = { pageVisible: false, bottomPresentation: "spot-panel", detailContextReady: true,
    selected: {spotId: "spot:published"}, activeContext: {contextId: "context:same", contextFingerprint: "same", revision: 1},
    parking: "original published parking", calls: 0,
    getSpotOverview: async () => {scope.calls++;return {parking: scope.parking};},
  };
  const readOptions = () => vm.runInNewContext(ts.transpileModule(`(${optionsText})`, {compilerOptions:{target:ts.ScriptTarget.ES2020}}).outputText, scope);
  const queryOptions = () => {const o=readOptions();return {...o,queryFn:({signal}:{signal:AbortSignal})=>o.queryFn(signal)};};
  const client = new QueryClient({defaultOptions:{queries:{retry:false,gcTime:0}}});
  const observer = new QueryObserver<{parking:string}>(client,queryOptions());
  const stop = observer.subscribe(() => {});
  const settle = () => new Promise(resolve => setTimeout(resolve,20));
  try {
    await settle();assert.equal(scope.calls,0,"a hidden retained panel must not fetch");
    scope.pageVisible=true;observer.setOptions(queryOptions());await settle();
    assert.equal(observer.getCurrentResult().data?.parking,"original published parking");
    scope.pageVisible=false;observer.setOptions(queryOptions());scope.parking="new reviewed published parking";
    await settle();assert.equal(scope.calls,1);
    scope.pageVisible=true;observer.setOptions(queryOptions());await settle();
    assert.equal(observer.getCurrentResult().data?.parking,"new reviewed published parking","returning within the old freshness window must show current facts");
    assert.equal(scope.calls,2);
  } finally {stop();client.clear();}
});

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
    let visible = false, stopped = 0, offset = 40, dragging = true, calendarOwner: string | null = "current-calendar";
    let retainedFailure = false;
    const epoch = { current: 3 }, drag = { current: {} as object | null };
    const editorScope = {current: "visible owner" as string | null};
    let cancelledEditor = 0, presentation = "spot-editor";
    vm.runInNewContext(ts.transpileModule(hooks.join("\n"), { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText, {
      useDidShow: (callback: () => void) => { show = callback; },
      useDidHide: (callback: () => void) => { hide = callback; },
      setPageVisible: (value: boolean) => { visible = value; },
      setCalendarOwner: (value: string | null) => { calendarOwner = value; },
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
    assert.equal(calendarOwner, null, "a hidden retained page cannot reopen its previous calendar");
    assert.equal(retainedFailure, true, "hiding cancels in-flight work but retains the failed location for recovery");
    assert.equal(editorScope.current, null, "a late confirmation or exit cannot retain the hidden page's scope");
    assert.equal(cancelledEditor, 1);
    assert.equal(presentation, editorClosing ? "none" : "spot-editor", "only an already approved exit is finalized on hide");
    }
  }
});
