import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";
import vm from "node:vm";
import { createSkyContextSession } from "./sky-context-session";
import { createSkyObservationTime } from "./sky-observation-time";
import { skyCommandStateSetter } from "./sky-command-state";
import { createSkyDisclosureCommands } from "./sky-disclosure-commands";
import { skyImageRecoveryTestOwner } from "./sky-image-recovery-test-support";
import { skyMenuProps } from "./sky-menu-test-support";
import { skyFailureTestEpisodes } from "./sky-failure-test-support";
import type { ContextVersion } from "../../services/observation-context-version";

const source = ts.createSourceFile("spot-sky-page.tsx", readFileSync(
  process.env.SKY_CONTROLS_SOURCE ?? new URL("./spot-sky-page.tsx", import.meta.url), "utf8"),
ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const page = source.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === "SpotSkyPage") as ts.FunctionDeclaration;
assert.ok(page?.body);
const names = ["skyInteractionRevision", "skyPageVisibleCurrent", "skyInteractionCurrent", "skyTimeIntentCurrent", "skyDisplayCurrent", "setSkyControlPanel",
  "canRetryReport", "retryReport", "retrySkyData", "recoverSkyResource", "retrySkyCanvas", "onSkyCanvasError",
  "retryConstellations", "retryStellarSupplement",
  "recoverCompass", "skyDisclosures"];
const commands = page.body.statements.filter(node => ts.isVariableStatement(node) &&
  node.declarationList.declarations.some(declaration => names.includes(declaration.name.getText(source))));
const menu = skyMenuProps(source);
const buttons = new Map<string, string>((["time", "list"] as const).map(kind =>
  [kind, menu.dock(kind).getText(source)]));
const layers = [...menu.layers.values()].map(props => menu.expression(props, "onClick").getText(source));
let nativeError = "";
function visit(node: ts.Node) {
  if (ts.isJsxElement(node) && node.openingElement.tagName.getText(source) === "Button") {
    const attributes = node.openingElement.attributes.properties.filter(ts.isJsxAttribute);
    const click = attributes.find(attribute => attribute.name.getText(source) === "onClick")?.initializer;
    if (click && ts.isJsxExpression(click) && click.expression) {
      const action = click.expression.getText(source), label = node.children.filter(ts.isJsxText).map(child => child.text.trim()).join("");
      if (["重试天色", "重试银河", "重试太阳", "重试月球", "重试行星"].includes(label)) buttons.set(label, action);
      if (["更新来源", "重试暗星", "重试来源", "重试目录", "重试图片"].includes(label)) buttons.set(label, action);
    }
  }
  if ((ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) && node.tagName.getText(source) === "Canvas" &&
    node.attributes.properties.some(property => ts.isJsxAttribute(property) && property.name.getText(source) === "id" && property.initializer?.getText(source) === '{CANVAS_ID}')) {
    const attribute = node.attributes.properties.find(property => ts.isJsxAttribute(property) && property.name.getText(source) === "onError") as ts.JsxAttribute;
    if (attribute?.initializer && ts.isJsxExpression(attribute.initializer) && attribute.initializer.expression) nativeError = attribute.initializer.expression.getText(source);
  }
  ts.forEachChild(node, visit);
}
visit(page); assert.equal(layers.length, 5); assert.ok(nativeError);
for (const name of ["time", "list", "重试暗星"]) assert.ok(buttons.has(name), name);
const code = ts.transpileModule(commands.map(node => node.getText(source)).join("\n") + `\n({
  buttons:{${[...buttons].map(([name, action]) => `${JSON.stringify(name)}:${action}`).join(",")}},
  layers:[${layers.join(",")}],nativeError:${nativeError},
  retryReport,retrySkyData,retryConstellations,
  recoverCompass});`,
{ compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
const at = "2026-09-22T13:00:00.000Z", later = "2026-09-22T14:00:00.000Z";
const context = { contextId: "ctx:controls" as ContextVersion["contextId"], revision: 1, contextFingerprint: "fp:1", selectedAtUtc: at };

// Real synchronous Context/public-time/UI bridge and real recovery Hook. React
// renders and resource, sensor, Canvas ports are controlled boundaries, not a
// substitute for the already required native/physical acceptance.
function harness() {
  let store = { observationContext: context, selectedSpotId: "spot:a", mapResetVersion: 0, spotOpenRequestVersion: 0 };
  const session = createSkyContextSession(context.contextId, () => store), time = createSkyObservationTime();
  const binding = "ctx:controls:1:fp:1"; time.bind(binding, at, { startAt: at, endAt: later });
  const counts: Record<string, number> = {};
  const hit = (key: string) => { counts[key] = (counts[key] ?? 0) + 1; };
  let panel: "time" | "calibration" | null = null, list = false, alignmentMode = "auto", gpuFailure = false, mode = "NORMAL", sensorState = "READY";
  const settings: { resolve(): void; reject(error: Error): void }[] = [];
  const panelRef: { current: "time" | "calibration" | null } = { current: panel }, attempted = { current: true };
  const hookOwners = [skyImageRecoveryTestOwner(), skyImageRecoveryTestOwner()]; let hookCursor = 0;
  const query = (key: string) => () => hit(key);
  const retry = (key: string) => () => { hit(key); return gpuFailure; };
  const reportRecoveryRef = { current: { pageVisible: true, contextComplete: true, activeContext: context,
    refetch: query("report"), stellarReference: {}, refetchStars: query("stars") } };
  const flags = { landscape: true, constellations: true, wide: false, horizontal: false, equatorial: false };
  const setFlag = (key: "landscape" | "constellations" | "wide") => (update: (value: boolean) => boolean) => { hit("flags"); flags[key] = update(flags[key]); };
  const sandbox: Record<string, any> = {
    failureEpisodes: skyFailureTestEpisodes(),
    contextSession: session, observationTime: time, timeBinding: binding, committedAt: at,
    pageVisible: true, viewportActiveRef: { current: true }, viewportMountedRef: { current: true }, contextComplete: true,
    activeContext: context, timeSaving: false, mode: "NORMAL",
    useAppStore:{getState:()=>({...store,mode})},
    orientationController: { snapshot: () => ({ alignment: { mode: alignmentMode }, state: sensorState }) },
    reportRecoveryRef, autoRestoreAttemptedRef: attempted, useCallback: (callback: unknown) => callback,
    useSkyImageRecovery: (...args: unknown[]) => hookOwners[hookCursor++]!.useSkyImageRecovery(...args),
    skyCommandStateSetter, createSkyDisclosureCommands, skyControlPanel: null, skyControlPanelRef: panelRef,
    orientationObjectListOpenRef: { get current() { return list; } }, datePickerOpenRef: { current: false },
    selectedCatalogObjectRef: { current: null }, selectedTargetIdRef: { current: null }, catalogPickChoicesRef: { current: [] },
    skyTimeIntentRetirable: () => true, cancelSkyTimePreview: () => time.cancel(), returnToSkyEntry() {},
    setSkyControlPanel: (update: unknown) => { panel = typeof update === "function" ? update(panel) : update as typeof panel; panelRef.current = panel; },
    setSkyControlPanelState: (update: unknown) => { panel = typeof update === "function" ? update(panel) : update as typeof panel; },
    pauseSkyTime: () => time.pause(), setPreviewIndex: (index: number | null) => { if (index === null) time.cancel(); },
    cancelSkyCalibration() {}, closeSkyObjectDisclosure() {}, setDatePickerOpen() {},
    setOrientationObjectListOpen: (update: unknown) => { list = typeof update === "function" ? update(list) : Boolean(update); },
    manualBasis: null, alignment: { ready: true }, alignmentEditing:false,isPreviewing: false, skySceneReady: true, presentedSceneCurrent: true,
    beginSkyCalibration: () => hit("begin"),
    skyResourcesActive: true, constellationsEnabled: true, skyResourcesPaused: false, skyImageryActive: true,
    constellationCatalog: { refetch: query("constellation-metadata") }, artwork: { retryImages: retry("constellation-images") },
    optical: { retry: retry("optical") }, sdssOptical: { retry: retry("sdss") }, wideField: { retry: retry("wide") },
    galacticImage: { retry: retry("galaxy") }, landscapeImage: { retry: retry("landscape") },
    stellarSupplement: { retry: query("supplement") }, artworkContributionRetryRef: { current: query("contribution") },
    preparedDiscovery: { retry: query("discovery") }, preparedRegions: { retry: retry("prepared") },
    binding: { selection: { publicationHash: "controlled-publication" } },
    hipsRetryRef: { current: query("hips-shader") }, targetOpticalRetryRef: { current: query("target-shader") },
    bodyImageRetryRef: { current: query("body-shader") }, deepSkyImageIntentRef: { current: {} },
    deepSkyImages: { retry: retry("deep") },
    canvasLifecycle: { resize: query("resize"), retry: query("canvas-retry"), fail: query("canvas-fail") },
    draw: query("captured-draw"), browsingDrawRef: { current: query("live-draw") },
    setLandscapeEnabled: setFlag("landscape"), setConstellationsEnabled: setFlag("constellations"), setWideFieldEnabled: setFlag("wide"),
    setCoordinateGrids: (update: (value: Pick<typeof flags, "horizontal" | "equatorial">) => typeof flags) => {
      hit("flags"); Object.assign(flags, update({ horizontal: flags.horizontal, equatorial: flags.equatorial }));
    },
    setSunDiscUnavailable: query("sun-flag"), setMoonDiscUnavailable: query("moon-flag"), setPlanetDiscUnavailable: query("planet-flag"),
    orientationSensorState: "READY", stopCompass: query("stop-sensor"), startCompass: async () => hit("start-sensor"),
    orientationSettingsOpeningRef: { current: null },
    Taro: { openSetting: () => { hit("settings"); return new Promise<void>((resolve, reject) => settings.push({ resolve, reject })); } },
  };
  const render = (overrides: Record<string, unknown> = {}) => { hookCursor = 0; return vm.runInNewContext(code, { ...sandbox, ...overrides }); };
  return { sandbox, counts, session, time, flags, actions: render(), render, attempted,
    state: () => ({ panel, list }), setPanel: (value: typeof panel) => { sandbox.setSkyControlPanel(value); },
    setGpuFailure: () => { gpuFailure = true; }, setEditing: () => { alignmentMode = "editing"; },
    setMode:()=>{mode="OBSERVATION";},
    setDenied:()=>{sensorState="DENIED";},settings,
    replaceContext: () => { store = { ...store, observationContext: { ...context, revision: 2, contextFingerprint: "fp:2" } }; },
    dispose: () => hookOwners.forEach(owner => owner.dispose()) };
}

test("a time dock captured while closed retracts the live preview when it closes an already opened panel", () => {
  const page = harness(); page.setPanel("time"); page.time.preview(later);
  page.actions.buttons.time(); assert.equal(page.state().panel, "menu"); assert.equal(page.time.snapshot().at, at);
  page.actions.buttons.time(); assert.equal(page.state().panel, "time"); assert.equal(page.time.snapshot().at, at); page.dispose();
});

test("the list dock reads the current time disclosure before switching panels", () => {
  const page = harness(); page.setPanel("time"); page.time.preview(later);
  page.actions.buttons.list(); assert.deepEqual(page.state(), { panel: null, list: true });
  assert.equal(page.time.snapshot().at, at); page.dispose();
});

for (const boundary of ["hide", "hide-return", "unmount", "Context", "binding", "busy", "editing", "mode"] as const) {
  test(`${boundary}: public layers and all resource recovery mechanisms have no effect from old page callbacks`, async () => {
    const page = harness(); page.setGpuFailure();
    if (boundary === "hide" || boundary === "hide-return") page.session.hide();
    if (boundary === "hide-return") page.session.show();
    if (boundary === "unmount") page.sandbox.viewportMountedRef.current = false;
    if (boundary === "Context") page.replaceContext();
    if (boundary === "binding") page.time.bind("ctx:replacement", at, null);
    if (boundary === "busy") assert.ok(page.session.begin(context));
    if (boundary === "editing") page.setEditing();
    if (boundary === "mode") page.setMode();
    for (const callback of page.actions.layers) callback();
    for (const name of ["retryReport", "retrySkyData", "retryConstellations", "recoverCompass"]) page.actions[name]();
    for (const [name, callback] of Object.entries(page.actions.buttons)) if (!["time", "list", "calibration"].includes(name)) (callback as () => void)();
    assert.deepEqual(page.counts, {}); assert.equal(page.attempted.current, true); page.dispose();
  });
}

test("current recovery preserves transport versus GPU reset meaning and reaches metadata independently", () => {
  const page = harness();
  page.actions.retryConstellations();
  assert.equal(page.counts["constellation-metadata"], 1); assert.equal(page.counts.resize ?? 0, 0);
  assert.equal(page.counts["hips-shader"] ?? 0, 0); assert.equal(page.counts["target-shader"] ?? 0, 0);
  page.setGpuFailure(); page.actions.retryConstellations();
  assert.equal(page.counts.resize, 1); assert.equal(page.counts["hips-shader"] ?? 0, 0); assert.equal(page.counts["target-shader"] ?? 0, 0);
  assert.equal(page.counts["captured-draw"] ?? 0, 0, "render retry submits the current draw callback"); page.dispose();
});

test("a retained Hook recovery callback cannot restart after a page visibility cycle; the current one can", () => {
  const page = harness(), old = page.actions.retryConstellations;
  page.session.hide(); page.session.show(); const current = page.render();
  old(); assert.deepEqual(page.counts, {}); current.retryConstellations();
  assert.equal(page.counts["constellation-images"], 1); assert.equal(page.counts["constellation-metadata"], 1); page.dispose();
});

test("native Canvas failure can retire current editing but an old hidden-return error cannot fail the current page", () => {
  const page = harness(), old = page.actions.nativeError;
  page.session.hide(); page.session.show(); const current = page.render(); old();
  assert.deepEqual(page.counts, {}); page.setEditing(); current.nativeError(); assert.equal(page.counts["canvas-fail"], 1); page.dispose();
});

test("permission recovery reads live denial and opens settings once, then requires a new explicit tap after return", async () => {
  const page=harness();page.setDenied();page.actions.recoverCompass();page.actions.recoverCompass();
  assert.equal(page.counts.settings,1);assert.equal(page.counts["start-sensor"]??0,0);
  page.settings[0]!.resolve();await new Promise(resolve=>setImmediate(resolve));
  assert.equal(page.sandbox.orientationSettingsOpeningRef.current,null);assert.equal(page.counts["start-sensor"]??0,0);
  page.actions.recoverCompass();assert.equal(page.counts.settings,2);page.settings[1]!.reject(Error("controlled settings failure"));
  await new Promise(resolve=>setImmediate(resolve));assert.equal(page.sandbox.orientationSettingsOpeningRef.current,null);page.dispose();
});
