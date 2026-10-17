import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { primaryNavigationLayout } from "../../navigation/primary-navigation";

const mapSource = ts.createSourceFile("map.tsx", readFileSync(new URL("./index.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

function declaration(name: string) {
  let text = "";
  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && node.name.getText(mapSource) === name) text = `const ${node.getText(mapSource)};`;
    ts.forEachChild(node, visit);
  };
  visit(mapSource);
  assert.ok(text, name);
  return text;
}

function backRuntime(presentation: "layer-sheet" | "spot-panel", busy: "none" | "saving" | "missing-context" | "mismatched-spot" = "none") {
  const effects: string[] = [];
  const scope = {
    photoHandoff: { active: false, cancel: () => effects.push("photo-warning") },
    navigationHandoff: { active: false, cancel: () => effects.push("navigation-warning") },
    eventModalOpenRef: { current: false }, eventModalRef: { current: { back: () => effects.push("event") } },
    imageViewerBack: { current: null as (() => void) | null },
    bottomPresentationRef: { current: presentation }, bottomPresentation: presentation,
    panelExtentRef: { current: "large" }, datePickerVisible: true,
    timeSaving: busy === "saving", activeContext: busy === "missing-context" ? null : {}, detailContextReady: busy !== "mismatched-spot",
    setDatePickerOpen: (open: boolean) => { scope.datePickerVisible = open; effects.push(open ? "calendar-open" : "calendar-close"); },
    closeLayerSheet: () => effects.push("layer-close"), closeSpotPanel: () => effects.push("panel-close"),
    previousPanelExtent: () => "medium", setPanelExtent: (extent: string) => effects.push("extent-" + extent),
  };
  const back = vm.runInNewContext(ts.transpileModule(declaration("handleMapPresentationSystemBack") + "\nhandleMapPresentationSystemBack", {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText, scope) as () => Promise<void>;
  return { back, effects, scope };
}

test("Map Back closes each open calendar before its underlying layer or large panel", async () => {
  for (const presentation of ["layer-sheet", "spot-panel"] as const) {
    const map = backRuntime(presentation);
    await map.back();
    assert.deepEqual(map.effects, ["calendar-close"], "the first Back preserves the underlying presentation and extent");
    await map.back();
    assert.deepEqual(map.effects, ["calendar-close", presentation === "layer-sheet" ? "layer-close" : "extent-medium"]);
  }
});

test("busy calendars consume Back while higher visible disclosures retain their own priority", async () => {
  for (const presentation of ["layer-sheet", "spot-panel"] as const) {
    for (const busy of ["saving", "missing-context", ...(presentation === "spot-panel" ? ["mismatched-spot" as const] : [])] as const) {
      const map = backRuntime(presentation, busy);
      await map.back();
      assert.deepEqual(map.effects, [], "Back cannot close the parent through a disabled date selection");
      assert.equal(map.scope.datePickerVisible, true);
    }
  }
  const map = backRuntime("spot-panel");
  map.scope.eventModalOpenRef.current = true;
  await map.back(); assert.deepEqual(map.effects, ["event"]);
  map.scope.eventModalOpenRef.current = false;
  map.scope.imageViewerBack.current = () => map.effects.push("image");
  await map.back(); assert.deepEqual(map.effects, ["event", "image"]);
  assert.equal(map.scope.datePickerVisible, true);
});

test("both Map date consumers hand native Back to the page's single owner", () => {
  for (const file of ["./index.tsx", "./spot-panel.tsx"]) {
    const source = ts.createSourceFile(file, readFileSync(new URL(file, import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const boundaries: boolean[] = [];
    const visit = (node: ts.Node) => {
      if (ts.isJsxSelfClosingElement(node) && node.tagName.getText(source) === "ObservationDateControl") {
        const attribute = node.attributes.properties.find(prop => ts.isJsxAttribute(prop) && prop.name.getText(source) === "nativeBackBoundary") as ts.JsxAttribute | undefined;
        boundaries.push(Boolean(attribute && ts.isJsxExpression(attribute.initializer!) && attribute.initializer.expression?.kind === ts.SyntaxKind.FalseKeyword));
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
    assert.deepEqual(boundaries, [true], file);
  }
});

test("a post-render navigation effect cannot invalidate a current calendar opener", () => {
  let epochEffect = "";
  const visit = (node: ts.Node) => {
    if (ts.isCallExpression(node) && node.expression.getText(mapSource) === "useEffect" &&
      node.arguments[0]?.getText(mapSource).includes("navigationEpoch.current += 1")) epochEffect = node.arguments[0].getText(mapSource);
    ts.forEachChild(node, visit);
  };
  visit(mapSource); assert.ok(epochEffect);
  const scope = {
    accountOwnerId: "account:A", mapResetVersion: 1, navigationEpoch: { current: 3 },
    bottomPresentation: "layer-sheet", panelGeometryIdentity: "formal:A", retiredObservationContextId: null as string | null,
    timeReference: { contextId: "context:A", revision: 1, contextFingerprint: "first" },
    pageVisible: true, visibleLayer: "TOTAL_CLOUD", selectedProposal: null, spotTimeContext: {},
    calendarOwner: null as string | null, setCalendarOwner: (value: string | null) => { scope.calendarOwner = value; },
  };
  const render = () => vm.runInNewContext(ts.transpileModule(
    "(() => {" + ["calendarScope", "setDatePickerOpen", "datePickerVisible"].map(declaration).join("\n") + "\nreturn { open: setDatePickerOpen, visible: datePickerVisible }; })();", {
      compilerOptions: { target: ts.ScriptTarget.ES2022 },
    }).outputText, scope);
  const view = render();
  vm.runInNewContext(ts.transpileModule(`(${epochEffect})`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, scope)();
  view.open(true);
  assert.equal(render().visible, true, "a valid first click remains open even before an unrelated rerender");
  scope.timeReference = { ...scope.timeReference, revision: 2, contextFingerprint: "second" };
  assert.equal(render().visible, false, "a new confirmed Context revision retires the previous calendar");
  const current = render(); current.open(true); assert.equal(render().visible, true);
  scope.mapResetVersion++; assert.equal(render().visible, false);
});

test("calendar notification space uses current native geometry and retires late measurements", () => {
  let effect = "";
  const visit = (node: ts.Node) => {
    if (ts.isCallExpression(node) && node.expression.getText(mapSource) === "useEffect" &&
      node.getText(mapSource).includes('.select(".observation-calendar__sheet")')) effect = node.arguments[0]!.getText(mapSource);
    ts.forEachChild(node, visit);
  };
  visit(mapSource); assert.ok(effect);
  const mount = (identity: string | null = "calendar:A", unavailable = false) => {
    const writes: unknown[] = [], selectors: string[] = [];
    let tick = () => {}, receive = (_rects: unknown) => {};
    const query = {
      select(value: string) { selectors.push(value); return query; }, boundingClientRect() { return query; },
      exec(callback: typeof receive) { receive = callback; },
    };
    const run = vm.runInNewContext(ts.transpileModule(`(${effect})`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, {
      calendarLayoutIdentity: identity, setCalendarBounds: (value: unknown) => writes.push(value),
      Taro: { nextTick: (callback: () => void) => { tick = callback; },
        createSelectorQuery: () => { if (unavailable) throw new Error("unavailable native geometry"); return query; } },
    });
    const dispose = run() as (() => void) | undefined;
    return { writes, selectors, tick: () => tick(), receive: (rects: unknown) => receive(rects), dispose: () => dispose?.() };
  };
  const active = mount(); active.tick();
  assert.deepEqual(active.selectors, [".observation-calendar__sheet"]);
  for (const rects of [null, [], [null], [{}], [{ top: NaN }], [{ top: -1 }]]) active.receive(rects);
  assert.deepEqual(active.writes, [], "unavailable/invalid geometry cannot grant a floating hit area");
  active.receive([{ top: 371.4 }]);
  assert.deepEqual(JSON.parse(JSON.stringify(active.writes)), [{ identity: "calendar:A", top: 371.4 }]);
  active.dispose(); active.receive([{ top: 450 }]);
  assert.equal(active.writes.length, 1, "a replaced, hidden or unmounted calendar cannot commit a late rectangle");
  const retired = mount(); retired.dispose(); retired.tick();
  assert.deepEqual(retired.selectors, [], "retirement also cancels a queued native read");
  const missing = mount("calendar:A", true); missing.tick(); assert.deepEqual(missing.writes, []);
  const closed = mount(null); assert.deepEqual(closed.writes, [null]);

  const style = (identity: string, visible = true) => vm.runInNewContext(ts.transpileModule(declaration("mapPresentationStyle") + "\nmapPresentationStyle", {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText, {
    datePickerVisible: visible, calendarLayoutIdentity: identity, calendarBounds: { identity: "calendar:A", top: 371.4 },
    mapStatusBarHeight: undefined, mapCapsuleBottom: undefined, mapSafeTop: undefined,
    primaryNavigation: primaryNavigationLayout("pages/map/index"),
    spotEditorPhase: "open", SPOT_EDITOR_ENTER_MS: 180, SPOT_EDITOR_EXIT_MS: 180, panelCssMotion: null,
  });
  assert.equal(style("calendar:A")["--map-calendar-top"], "371.4px");
  assert.equal(style("calendar:B")["--map-calendar-top"], "0px", "old calendar geometry is unavailable to the new owner");
  assert.equal(style("calendar:A", false)["--map-calendar-top"], undefined);
});
