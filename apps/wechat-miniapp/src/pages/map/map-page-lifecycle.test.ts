import { createMapPageTestBoundaries } from "./map-page-test-support";
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
    for (const reason of ["native", "my"]) {
    const source = ts.createSourceFile("map.tsx", sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const hooks: string[] = [];
    const visit = (node: ts.Node) => {
      if (ts.isVariableStatement(node) && node.declarationList.declarations.some(item => item.name.getText(source) === "foregroundLife"))
        hooks.push(node.getText(source));
      if (ts.isExpressionStatement(node) && ts.isBinaryExpression(node.expression) &&
          ["foregroundLife.current.show", "foregroundLife.current.hide"].includes(node.expression.left.getText(source)))
        hooks.push(node.getText(source));
      if (ts.isExpressionStatement(node) && ts.isCallExpression(node.expression) &&
          node.expression.expression.getText(source) === "useLayoutEffect" &&
          node.expression.arguments[1]?.getText(source) === "[primaryNavigation.controller]")
        hooks.push(node.getText(source));
      ts.forEachChild(node, visit);
    };
    visit(source);
    let cleanup: (() => void) | undefined;
    let visible = false, stopped = 0, offset = 40, dragging = true, calendarOwner: string | null = "current-calendar";
    let retainedFailure = false;
    const epoch = { current: 3 }, drag = { current: {} as object | null };
    const editorScope = {current: "visible owner" as string | null};
    let cancelledEditor = 0, presentation = "spot-editor";
    const skyLifecycle: string[] = [];
    const boundaries = createMapPageTestBoundaries();
    vm.runInNewContext(ts.transpileModule(hooks.join("\n"), { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText, {
      ...boundaries.scope,
      useRef: (current: unknown) => ({ current }),
      useLayoutEffect: (callback: () => () => void) => { cleanup = callback(); },
      setPageVisible: (value: boolean) => { visible = value; },
      setCalendarOwner: (value: string | null) => { calendarOwner = value; },
      invalidateMapPointIntent: (preserveFailure: boolean) => { retainedFailure = preserveFailure; },
      stopPanelSpring: () => { stopped++; }, navigationEpoch: epoch, panelDrag: drag,
      setPanelDragOffset: (value: number) => { offset = value; },
      setPanelDragging: (value: boolean) => { dragging = value; },
      editorPresentationScope: editorScope,
      editorPresentation: {isClosing: () => editorClosing, cancel: () => {cancelledEditor++;}},
      skyEntry: {show() {skyLifecycle.push("show");}, hide() {skyLifecycle.push("hide");}},
      setBottomPresentation: (next: string) => {presentation = next; cancelledEditor++;},
    });
    assert.ok(cleanup, "the actual Map foreground effect must subscribe to the primary owner");
    assert.equal(visible, true);
    const controller = boundaries.scope.primaryNavigation.controller;
    if (reason === "native") controller.hide(); else controller.openMy();
    assert.equal(visible, false);
    assert.deepEqual(boundaries.calls, ["focus-cancel", "location-cancel"], "hide retires pending camera and location work");
    assert.equal(stopped, 1);
    assert.equal(epoch.current, 4);
    assert.equal(drag.current, null);
    assert.equal(offset, 0);
    assert.equal(dragging, false);
    assert.equal(calendarOwner, null, "a hidden retained page cannot reopen its previous calendar");
    assert.equal(retainedFailure, true, "hiding cancels in-flight work but retains the failed location for recovery");
    assert.deepEqual(skyLifecycle, ["show", "hide"], "Map retires the same Sky entry owner and restores it on a later show");
    assert.equal(editorScope.current, null, "a late confirmation or exit cannot retain the hidden page's scope");
    assert.equal(cancelledEditor, 1);
    assert.equal(presentation, editorClosing ? "none" : "spot-editor", "only an already approved exit is finalized on hide");
    if (reason === "my") {
      controller.closeMy();
      assert.equal(visible, false, "Map work must not resume underneath My's left exit");
      controller.finishTransition(controller.getSnapshot().transitionTicket!);
      assert.equal(visible, true, "only the completed exit restores Map's existing owner");
    }
    cleanup();
    controller.dispose();
    }
    }
  }
});
