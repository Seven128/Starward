import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { createSkyDisclosureCommands } from "./sky-disclosure-commands";
import { createPageBlackoutTransition } from "../../navigation/page-blackout-transition";
import { primaryPageNativeRuntimeForTest } from "../../navigation/primary-page-navigation-test-support";
import { createSkyMapLifecycle } from "../../navigation/sky-map-lifecycle";

const source = ts.createSourceFile("spot-sky-page.tsx",
  readFileSync(new URL("./spot-sky-page.tsx", import.meta.url), "utf8"),
  ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const page = source.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === "SpotSkyPage") as ts.FunctionDeclaration;
assert.ok(page?.body);
const statements = page.body.statements;
const navigation = statements.find(node => ts.isVariableStatement(node) &&
  node.declarationList.declarations.some(declaration => declaration.name.getText(source) === "returnToSkyEntry"));
const errorBranch = statements.find(node => ts.isIfStatement(node) &&
  node.expression.getText(source) === "!contextComplete || !activeContext") as ts.IfStatement;
assert.ok(errorBranch);
const menu = statements.find(node => ts.isVariableStatement(node) &&
  node.declarationList.declarations.some(declaration => declaration.name.getText(source) === "navigationMenu"));
const disclosures = statements.find(node => ts.isVariableStatement(node) &&
  node.declarationList.declarations.some(declaration => declaration.name.getText(source) === "skyDisclosures"));
let leaveAction = "";
function visit(node: ts.Node) {
  if (ts.isJsxOpeningElement(node) && node.tagName.getText(source) === "SkyNavigationMenu") {
    const attribute = node.attributes.properties.find(property => ts.isJsxAttribute(property) && property.name.getText(source) === "onLeave") as ts.JsxAttribute;
    assert.ok(attribute?.initializer && ts.isJsxExpression(attribute.initializer));
    leaveAction = attribute.initializer.expression!.getText(source);
  }
  ts.forEachChild(node, visit);
}
assert.ok(menu && disclosures);
visit(menu);
assert.ok(leaveAction);
assert.ok(errorBranch.thenStatement.getText(source).includes("{navigationMenu}"));

test("context recovery recreates an unloaded Map and preserves legacy-stack fallback through the exit owner", async () => {
  assert.ok(navigation, "the recovery branch must reuse the normal Sky return owner");
  const code = ts.transpileModule(`${navigation.getText(source)}\n${disclosures.getText(source)}\n(${leaveAction})`,
    { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  for (const [restored, reject] of [[true, false], [false, false], [false, true]]) {
    const calls: string[] = [];
    let presentation: number | null = null;
    const transition = createPageBlackoutTransition({getScope: () => "recovery", onPresentation: id => {presentation = id;},
      schedule: () => () => {}});
    const panel = { current: "menu" }, noop = () => {};
    const sky = { route: "sky/detail/index" }, entry = { route: "content/spot/detail/index" };
    const native = primaryPageNativeRuntimeForTest(restored ? [sky] : [entry, sky]);
    const journey = createSkyMapLifecycle(), skyReturnPendingRef = { current: null };
    if (restored) { journey.beginEntry(); journey.mapUnloaded(); journey.skyMounted(); }
    const Taro = native.taro;
    const callback = vm.runInNewContext(code, { skyPageVisibleCurrent:()=>true,skyReturnPendingRef, createSkyDisclosureCommands,
      skyExit: {transition}, routeReducedMotion: false,
      skyMapLifecycle: journey,
      skyTimeIntentCurrent:()=>false, skyTimeIntentRetirable:()=>true, orientationController:{snapshot:()=>({alignment:{mode:"auto"}})},
      contextComplete:false, activeContext:null, skyControlPanelRef:panel, orientationObjectListOpenRef:{current:false}, datePickerOpenRef:{current:false},
      selectedCatalogObjectRef:{current:null}, selectedTargetIdRef:{current:null}, catalogPickChoicesRef:{current:[]},
      setSkyControlPanel:(value:string|null)=>{panel.current=value as string;}, setOrientationObjectListOpen:noop,setDatePickerOpen:noop,
      closeSkyObjectDisclosure:noop,cancelSkyTimePreview:noop,pauseSkyTime:noop,
      reportRuntimeError() {}, cancelSkyCalibration: () => calls.push("calibration-cancel"), Taro, ...native.dispatcher }) as () => void;
    callback();
    assert.deepEqual(calls, ["calibration-cancel"], "navigation waits until the actual exit fade completes");
    assert.equal(native.calls.length, 0);
    assert.notEqual(presentation, null); transition.finishFade(presentation!);
    await new Promise(resolve => setImmediate(resolve));
    if (!restored && reject) {
      assert.equal(native.calls[0]?.kind, "navigateBack"); native.calls[0]!.reject(Error("empty stack"));
      await new Promise(resolve => setImmediate(resolve));
    }
    const returning = native.calls.at(-1)!;
    if (restored || reject) {
      assert.equal(returning.kind, "reLaunch"); assert.equal(returning.url, "/pages/map/index");
      returning.resolve(); await new Promise(resolve => setImmediate(resolve));
      assert.notEqual(skyReturnPendingRef.current, null, "native acceptance cannot finish the return before the Map show");
      const map = { route: "pages/map/index" }; native.setStack([map]);
      if (restored) journey.mapMounted();
      assert.equal(native.showMap(map), true); await new Promise(resolve => setImmediate(resolve));
      assert.equal(native.taro.getCurrentPages().filter(page => page.route === "pages/map/index").length, 1);
      if (restored) assert.equal(journey.mapReturnPending(), true, "the rebuilt Map owns readiness and reveal");
    } else {
      assert.equal(returning.kind, "navigateBack"); native.setStack([entry]); returning.resolve();
      await new Promise(resolve => setImmediate(resolve));
    }
    assert.equal(native.calls.length, !restored && reject ? 2 : 1);
    assert.equal(skyReturnPendingRef.current, null);
    assert.equal(panel.current, null, "the menu retires its disclosure before returning to the actual entry");
    transition.dispose(); native.dispose();
  }
});
