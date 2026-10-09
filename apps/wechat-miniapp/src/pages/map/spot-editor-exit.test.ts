import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { createSpotEditorPresentation } from "./spot-editor-presentation";

function actualMapCommand(name: string, environment: Record<string, unknown>) {
  const source = ts.createSourceFile("map.tsx", readFileSync(new URL("./index.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let declaration = "";
  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && node.name.getText(source) === name) declaration = node.getText(source);
    ts.forEachChild(node, visit);
  };
  visit(source);
  assert.ok(declaration, `production ${name} exists`);
  return vm.runInNewContext(ts.transpileModule(`const ${declaration}; ${name};`, {compilerOptions: {target: ts.ScriptTarget.ES2022}}).outputText, {
    photoHandoff: { active: false }, datePickerVisible: false, ...environment,
  }) as () => unknown;
}

function actualSubmittedCommand(environment: Record<string, unknown>) {
  const source = ts.createSourceFile("map.tsx", readFileSync(new URL("./index.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let callback = "";
  const visit = (node: ts.Node) => {
    if (ts.isJsxSelfClosingElement(node) && node.tagName.getText(source) === "ContributionEditor") {
      const prop = node.attributes.properties.find(item => ts.isJsxAttribute(item) && item.name.getText(source) === "onSubmitted") as ts.JsxAttribute;
      callback = (prop.initializer as ts.JsxExpression).expression!.getText(source);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  assert.ok(callback, "Map receives the real contribution receipt");
  return vm.runInNewContext(ts.transpileModule(`(${callback});`, {compilerOptions: {target: ts.ScriptTarget.ES2022}}).outputText, environment) as (submission: object) => void;
}

test("Map Close retains the editor until the shared exit owner completes", async () => {
  const effects: string[] = [];
  let complete: (() => void) | undefined;
  const close = actualMapCommand("closeSpotEditor", {
    editorLeaveGuard: {current: () => true},
    setCandidatePreview: () => effects.push("clear candidate"),
    setBottomPresentation: (value: string) => effects.push(value),
    finishSpotEditorPresentation: (after?: () => void) => {complete = () => {effects.push("none"); after?.();};},
  });
  await close();
  assert.deepEqual(effects, [], "the visible editor and candidate must survive the start of exit");
  assert.ok(complete, "Close actually starts an exit, rather than becoming a no-op");
  complete();
  assert.deepEqual(effects, ["none"]);
});

test("Map system Back asks the embedded editor guard before requesting Close", async () => {
  let requested = 0, closed = 0;
  const back = actualMapCommand("handleMapPresentationSystemBack", {
    setMapPresentationBackBoundaryVisible: () => undefined,
    navigationHandoff: {active: false}, eventModalOpenRef: {current: false},
    imageViewerBack: {current: null}, editorHandoffBack: {current: null},
    bottomPresentationRef: {current: "spot-editor"},
    editorPresentation: {isClosing: () => false},
    editorPresentationScope: {current: "same owner"},
    confirmEditorLeave: async () => {requested++; return true;},
    closeSpotEditor: () => {closed++;}, nativeMap: {isCurrent: () => true},
    currentDraftUserId: () => "same owner", pageVisible: true,
  });
  await back();
  assert.equal(requested, 1, "Back must reach the same busy/dirty guard as Close");
  assert.equal(closed, 1);
});

test("embedded warning, busy/declined leave and an in-progress exit never close the editor", async () => {
  for (const scenario of ["warning", "blocked", "closing"]) {
    let confirms = 0, cancelledWarning = 0, closed = 0;
    const back = actualMapCommand("handleMapPresentationSystemBack", {
      navigationHandoff: {active: false}, eventModalOpenRef: {current: false},
      imageViewerBack: {current: null}, bottomPresentationRef: {current: "spot-editor"},
      editorHandoffBack: {current: scenario === "warning" ? () => {cancelledWarning++;} : null},
      editorPresentation: {isClosing: () => scenario === "closing"},
      confirmEditorLeave: async () => {confirms++; return false;},
      closeSpotEditor: () => {closed++;},
    });
    await back();
    assert.equal(closed, 0, scenario);
    assert.equal(confirms, scenario === "blocked" ? 1 : 0, scenario);
    assert.equal(cancelledWarning, scenario === "warning" ? 1 : 0);
  }
});

test("one pending leave confirmation is shared and cannot approve a replaced owner or hidden page", async () => {
  for (const interruption of ["none", "hidden", "account", "reset"]) {
    let owner = "A", resetVersion = 1, confirms = 0;
    let answer!: (accepted: boolean) => void;
    const pending = new Promise<boolean>(resolve => {answer = resolve;});
    const scope = {current: "visible Map" as string | null};
    const confirm = actualMapCommand("confirmEditorLeave", {
      bottomPresentationRef: {current: "spot-editor"}, editorPresentation: {isClosing: () => false},
      editorLeaveGuard: {current: () => {confirms++; return pending;}}, editorLeaveRequest: {current: null},
      editorPresentationScope: scope, currentDraftUserId: () => owner,
      useAppStore: {getState: () => ({mapResetVersion: resetVersion})},
    }) as () => Promise<boolean>;
    const first = confirm(), duplicate = confirm();
    await Promise.resolve();
    assert.equal(confirms, 1);
    if (interruption === "hidden") scope.current = null;
    if (interruption === "account") owner = "B";
    if (interruption === "reset") resetVersion++;
    answer(true);
    assert.deepEqual(await Promise.all([first, duplicate]), [interruption === "none", interruption === "none"]);
  }
});

test("a successful Map submission exits before centering its proposal and opening the medium panel", () => {
  const effects: string[] = [];
  let owner = "A", complete: (() => void) | undefined;
  const presentation = createSpotEditorPresentation({getScope: () => owner, onPhase: () => undefined,
    schedule: callback => {complete = callback; return () => {complete = undefined;};}});
  const submitted = actualSubmittedCommand({
    invalidateMapPointIntent() {}, contributionHistory: {refetch: async () => undefined},
    finishSpotEditorPresentation: (afterExit: () => void) => presentation.close(() => {effects.push("closed"); afterExit();}, false),
    privateContributionMarkers: () => [{latitude: 22, longitude: 113}], viewport: {zoom: 8},
    setViewport: () => effects.push("center"), selectSpot: () => effects.push("clear formal identity"),
    setSelectedFallback() {}, setSelectedProposal: () => effects.push("proposal"),
    setPanelExtent: (extent: string) => effects.push(extent), setPanelPhase() {},
    setBottomPresentation: (mode: string) => effects.push(mode),
  });
  submitted({}); assert.deepEqual(effects, []); assert.ok(complete);
  complete();
  assert.deepEqual(effects, ["closed", "center", "clear formal identity", "proposal", "medium", "spot-panel"]);
  effects.length = 0; submitted({}); assert.ok(complete); owner = "B"; complete();
  assert.deepEqual(effects, [], "an old receipt never selects a private proposal on a new account");
});

test("Map system Back preserves event, viewer, layer and three-stage panel priority", async () => {
  for (const mode of ["event", "viewer", "layer", "large", "medium", "small"]) {
    const effects: string[] = [];
    const back = actualMapCommand("handleMapPresentationSystemBack", {
      navigationHandoff: {active:false}, eventModalOpenRef:{current:mode==="event"},
      eventModalRef:{current:{back:()=>{effects.push("event");return true;}}},
      imageViewerBack:{current:mode==="viewer"?()=>effects.push("viewer"):null},
      bottomPresentationRef:{current:mode==="layer"?"layer-sheet":"spot-panel"},
      closeLayerSheet:()=>effects.push("layer"), panelExtentRef:{current:mode},
      previousPanelExtent:(extent:string)=>extent==="large"?"medium":extent==="medium"?"small":null,
      setPanelExtent:(extent:string)=>effects.push(extent), closeSpotPanel:()=>effects.push("closed"),
    });
    await back();
    assert.deepEqual(effects, [mode==="large"?"medium":mode==="medium"?"small":mode==="small"?"closed":mode]);
  }
});
