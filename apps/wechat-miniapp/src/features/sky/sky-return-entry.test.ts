import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { createSkyDisclosureCommands } from "./sky-disclosure-commands";
import { createPageBlackoutTransition } from "../../navigation/page-blackout-transition";

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
    const callback = vm.runInNewContext(code, { skyPageVisibleCurrent:()=>true,skyReturnPendingRef:{current:null}, createSkyDisclosureCommands,
      skyExit: {transition}, routeReducedMotion: false,
      skyMapLifecycle: {beginReturn: () => restored ? {} : null, cancelReturn: () => assert.fail("navigation succeeds")},
      skyTimeIntentCurrent:()=>false, skyTimeIntentRetirable:()=>true, orientationController:{snapshot:()=>({alignment:{mode:"auto"}})},
      contextComplete:false, activeContext:null, skyControlPanelRef:panel, orientationObjectListOpenRef:{current:false}, datePickerOpenRef:{current:false},
      selectedCatalogObjectRef:{current:null}, selectedTargetIdRef:{current:null}, catalogPickChoicesRef:{current:[]},
      setSkyControlPanel:(value:string|null)=>{panel.current=value as string;}, setOrientationObjectListOpen:noop,setDatePickerOpen:noop,
      closeSkyObjectDisclosure:noop,cancelSkyTimePreview:noop,pauseSkyTime:noop,
      reportRuntimeError() {}, cancelSkyCalibration: () => calls.push("calibration-cancel"), Taro: {
      getCurrentPages: () => [{}, {}],
      navigateBack: () => { calls.push("entry"); return reject ? Promise.reject(new Error("empty stack")) : Promise.resolve(); },
      switchTab: ({ url }: { url: string }) => { calls.push(url); return Promise.resolve(); },
    } }) as () => void;
    callback();
    assert.deepEqual(calls, ["calibration-cancel"], "navigation waits until the actual exit fade completes");
    assert.notEqual(presentation, null); transition.finishFade(presentation!);
    await new Promise(resolve => setImmediate(resolve));
    assert.deepEqual(calls, restored ? ["calibration-cancel", "/pages/map/index"] :
      reject ? ["calibration-cancel", "entry", "/pages/map/index"] : ["calibration-cancel", "entry"]);
    assert.equal(panel.current, null, "the menu retires its disclosure before returning to the actual entry");
    transition.dispose();
  }
});
