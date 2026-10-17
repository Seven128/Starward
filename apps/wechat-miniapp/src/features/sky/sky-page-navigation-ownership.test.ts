import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { sdssOpticalPublication } from "@starward/miniapp-contracts";
import { createSkyContextSession } from "./sky-context-session";
import { createSkyObservationTime, skyPresentedTimeCurrent } from "./sky-observation-time";
import { skyCommandStateSetter } from "./sky-command-state";
import { createSkyDisclosureCommands } from "./sky-disclosure-commands";
import { registerSkyNativeImageLifetime } from "./sky-artwork-loader";
import { skyOpticalSourceCredit } from "./sky-optical-source-credit";
import { skyHipsSourceCredit } from "./sky-hips-source-credit";
import type { ContextVersion } from "../../services/observation-context-version";
import type { SkyTargetOpticalCompletion } from "./sky-sdss-optical-completion";

const source = ts.createSourceFile("spot-sky-page.tsx", readFileSync(
  process.env.SKY_NAVIGATION_SOURCE ?? new URL("./spot-sky-page.tsx", import.meta.url), "utf8"),
ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const page = source.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === "SpotSkyPage") as ts.FunctionDeclaration;
assert.ok(page?.body);
const names = ["skyInteractionRevision", "skyPageVisibleCurrent", "skyInteractionCurrent", "skyTimeIntentCurrent",
  "openSkySources", "openOpticalSources", "skyReturnPendingRef", "returnToSkyEntry", "goBack",
  "setDatePickerOpen", "setSelectedCatalogObject", "setSelectedTargetId", "setCatalogPickChoices", "closeSkyObjectDisclosure", "skyDisclosures"];
const commands = page.body.statements.filter(node => ts.isVariableStatement(node) &&
  node.declarationList.declarations.some(declaration => names.includes(declaration.name.getText(source))));
let metadataSource = "";
function visit(node: ts.Node) {
  if (ts.isJsxSelfClosingElement(node) && node.tagName.getText(source) === "SkyCatalogInformation") {
    const attribute = node.attributes.properties.find(property => ts.isJsxAttribute(property) &&
      property.name.getText(source) === "openSourceRoute") as ts.JsxAttribute;
    assert.ok(attribute?.initializer && ts.isJsxExpression(attribute.initializer) && attribute.initializer.expression);
    metadataSource = attribute.initializer.expression.getText(source);
  }
  ts.forEachChild(node, visit);
}
visit(page); assert.ok(metadataSource);
const code = ts.transpileModule(commands.map(node => node.getText(source)).join("\n") + `\n({
  openSources:typeof openSkySources === 'function' ? openSkySources : url=>openOpticalSources({sourceRoute:url}),
  openImage:openOpticalSources,metadataSource:${metadataSource},goBack,returnToSkyEntry,
  setDatePickerOpen,setSelectedCatalogObject,setSelectedTargetId,setCatalogPickChoices});`,
{ compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
const at = "2026-09-22T13:00:00.000Z", later = "2026-09-22T14:00:00.000Z";
const context = { contextId: "ctx:a" as ContextVersion["contextId"], revision: 1, contextFingerprint: "fp:1", selectedAtUtc: at,
  timezone: "Asia/Shanghai", localDate: "2026-09-22" };
const object = { reference: "HR:7001", displayName: "Vega", kind: "STAR" };

function harness() {
  let store = { observationContext: context, selectedSpotId: "spot:a", mapResetVersion: 0, spotOpenRequestVersion: 0 };
  const session = createSkyContextSession(context.contextId, () => store), time = createSkyObservationTime();
  const binding = "ctx:a:1:fp:1";
  time.bind(binding, at, { startAt: at, endAt: later });
  const navigation: { kind: string; url: string | undefined; resolve(): void; reject(error: Error): void }[] = [];
  const notices: unknown[] = [], retirements: (() => void)[] = [], runtimeErrors: unknown[][] = [];
  let releases = 0, calibrationCancels = 0;
  const ui = { date: false, object: object as typeof object | null, target: null as string | null, choices: [] as unknown[] };
  const dateRef = { current: ui.date }, objectRef = { current: ui.object }, targetRef = { current: ui.target }, choicesRef = { current: ui.choices };
  const writer = (key: keyof typeof ui) => (value: unknown) => { (ui as any)[key] = typeof value === "function" ? value(ui[key]) : value; };
  const completion = (reference: string) => {
    const image = {}; retirements.push(registerSkyNativeImageLifetime(image, () => true));
    return { kind: "legacy", reference, publicationHash: sdssOpticalPublication(reference)!.publicationHash,
      field: { image, level: "DETAIL", fieldDegrees: 1 } } as SkyTargetOpticalCompletion;
  };
  const data = { context: { contextId: context.contextId, contextRevision: 1, contextFingerprint: "fp:1", spotId: "spot:a" } };
  const accepted = { data, frameAt: at, mode: "normal", nativeCanvasGeneration: 1,
    sdssOptical: completion("M:51"), preparedRegions: [], opticalHips: [] };
  const sandbox: Record<string, any> = {
    contextSession: session, observationTime: time, timeBinding: binding, committedAt: at,
    pageVisible: true, viewportActiveRef: { current: true }, viewportMountedRef: { current: true }, contextComplete: true,
    activeContext: context, timeSaving: false, mode: "normal", alignmentMode: "auto", active: true,
    orientationController: { snapshot: () => ({ alignment: { mode: sandbox.alignmentMode } }) },
    opticalSourcesOpeningRef: { current: null }, sourceReturnRef: { current: false },
    setSourceReturn() {}, canvasNodeRef: { current: {} }, canvasLifecycle: { hide: () => { releases++; } },
    cancelSkyCalibration: () => { calibrationCancels++; }, notify: (notice: unknown) => notices.push(notice),
    reportRuntimeError: (...event: unknown[]) => runtimeErrors.push(event),
    presentedSkyFrameRef: { current: accepted }, canvasGenerationRef: { current: 1 },
    nativeCanvasMounted: true, canvasError: null, orientationData: data, rawReportData: data,
    skyPresentedTimeCurrent, skyOpticalSourceCredit, skyHipsSourceCredit, skyCommandStateSetter, createSkyDisclosureCommands,
    skyControlPanelRef: { current: null }, orientationObjectListOpenRef: { current: false },
    setSkyControlPanel() {}, setOrientationObjectListOpen() {}, skyTimeIntentRetirable: () => true,
    cancelSkyTimePreview: () => time.cancel(), pauseSkyTime: () => time.pause(), beginSkyCalibration() {},
    datePickerOpen: false, selectedCatalogObject: object, selectedTargetId: null, catalogPickChoices: [],
    datePickerOpenRef: dateRef, selectedCatalogObjectRef: objectRef, selectedTargetIdRef: targetRef, catalogPickChoicesRef: choicesRef,
    setDatePickerOpenState: writer("date"), setSelectedCatalogObjectState: writer("object"),
    setSelectedTargetIdState: writer("target"), setCatalogPickChoicesState: writer("choices"),
    setSelectedTargetId: (value: string | null) => { targetRef.current = value; ui.target = value; },
    setCatalogPickChoices: (value: unknown[]) => { choicesRef.current = value; ui.choices = value; },
    useRef: (value: unknown) => ({ current: value }),
    Taro: Object.fromEntries(["navigateTo", "navigateBack", "switchTab"].map(kind => [kind, (options?: { url: string }) =>
      new Promise<void>((resolve, reject) => navigation.push({ kind, url: options?.url, resolve, reject }))])),
  };
  const actions = vm.runInNewContext(code, sandbox) as Record<string, (...args: any[]) => any>;
  return { actions, sandbox, session, time, navigation, notices, runtimeErrors, ui, completion,
    credit: () => skyOpticalSourceCredit(sandbox.presentedSkyFrameRef.current.sdssOptical)!,
    replaceContext: () => { store = { ...store, observationContext: { ...context, revision: 2, contextFingerprint: "fp:2" } }; },
    counts: () => ({ releases, calibrationCancels }), dispose: () => retirements.forEach(retire => retire()) };
}

for (const boundary of ["hide", "hide-return", "unmount", "Context", "binding", "commit-lock", "calibration"] as const) {
  test(`${boundary}: queued Sources cannot navigate or retain a Canvas`, async () => {
    const page = harness(), credit = page.credit();
    if (boundary === "hide" || boundary === "hide-return") page.session.hide();
    if (boundary === "hide-return") page.session.show();
    if (boundary === "unmount") page.sandbox.viewportMountedRef.current = false;
    if (boundary === "Context") page.replaceContext();
    if (boundary === "binding") page.time.bind("ctx:b:1:fp:2", at, { startAt: at, endAt: later });
    if (boundary === "commit-lock") assert.ok(page.session.begin(context));
    if (boundary === "calibration") page.sandbox.alignmentMode = "editing";
    const pending = page.actions.openImage!(credit);
    assert.equal(page.navigation.length, 0); assert.equal(page.sandbox.sourceReturnRef.current, false);
    assert.equal(page.counts().calibrationCancels, 0); await pending; page.dispose();
  });
}

for (const change of ["different-picture", "generation", "time", "cleared", "retired-image", "report"] as const) {
  test(`${change}: an old image credit is no longer an eligible Sources tap`, async () => {
    const page = harness(), credit = page.credit(), frame = page.sandbox.presentedSkyFrameRef.current;
    if (change === "different-picture") page.sandbox.presentedSkyFrameRef.current = { ...frame, sdssOptical: page.completion("M:82") };
    if (change === "generation") page.sandbox.canvasGenerationRef.current++;
    if (change === "time") page.time.preview(later);
    if (change === "cleared") page.sandbox.presentedSkyFrameRef.current = null;
    if (change === "retired-image") page.dispose();
    if (change === "report") page.sandbox.orientationData = { ...frame.data };
    const pending = page.actions.openImage!(credit);
    assert.equal(page.navigation.length, 0); assert.equal(page.sandbox.sourceReturnRef.current, false);
    await pending; page.dispose();
  });
}

test("current painted credit opens once; a hidden navigation failure releases retained Canvas without a foreign notice", async () => {
  const page = harness(), first = page.actions.openImage!(page.credit());
  assert.equal(page.navigation.length, 1); assert.equal(page.sandbox.sourceReturnRef.current, true);
  await page.actions.openImage!(page.credit()); assert.equal(page.navigation.length, 1);
  page.session.hide(); page.sandbox.viewportActiveRef.current = false;
  page.navigation[0]!.reject(Error("controlled route failure")); await first;
  assert.equal(page.counts().releases, 1); assert.equal(page.sandbox.sourceReturnRef.current, false);
  assert.equal(page.notices.length, 0); page.dispose();
});

test("a current visible Sources failure releases the navigation lock and supports a real retry", async () => {
  const page = harness(), first = page.actions.openImage!(page.credit());
  page.navigation[0]!.reject(Error("controlled route failure")); await first;
  assert.equal(page.runtimeErrors.length, 1, "a handled Sources failure must reach the shared error owner");
  assert.equal(page.runtimeErrors[0]![0], "native");
  assert.equal(page.notices.length, 1); assert.equal(Boolean(page.sandbox.opticalSourcesOpeningRef.current), false);
  const retry = page.actions.openImage!(page.credit()); assert.equal(page.navigation.length, 2);
  page.navigation[1]!.resolve(); await retry; page.dispose();
});

test("a retired Sources completion cannot clear the next navigation's retention or lock", async () => {
  const page = harness(), old = page.actions.openImage!(page.credit()); assert.equal(page.navigation.length, 1);
  page.sandbox.opticalSourcesOpeningRef.current = null; // PageShow retires the old navigation instance.
  const next = page.actions.openImage!(page.credit()); assert.equal(page.navigation.length, 2);
  const owner = page.sandbox.opticalSourcesOpeningRef.current;
  page.navigation[0]!.reject(Error("late failure")); await old;
  assert.strictEqual(page.sandbox.opticalSourcesOpeningRef.current, owner);
  assert.equal(page.sandbox.sourceReturnRef.current, true); assert.equal(page.notices.length, 0);
  page.navigation[1]!.resolve(); await next; page.dispose();
});

test("current catalog metadata Sources remain usable without Canvas; an old object disclosure cannot navigate", async () => {
  const page = harness(); page.sandbox.nativeCanvasMounted = false; page.sandbox.presentedSkyFrameRef.current = null;
  const current = page.actions.metadataSource!("/sky/sources/index?reference=HR%3A7001");
  assert.equal(page.navigation.length, 1); page.navigation[0]!.resolve(); await current;
  page.actions.setSelectedCatalogObject!({ ...object, reference: "HR:424" });
  const stale = page.actions.metadataSource!("/sky/sources/index?reference=HR%3A7001");
  assert.equal(page.navigation.length, 1); await stale; page.dispose();
});

test("Back closes each current disclosure before navigating, including commands before React commits", () => {
  const page = harness(); page.actions.setDatePickerOpen!(true);
  page.actions.setCatalogPickChoices!([{ reference: "HR:424" }]); page.actions.setSelectedTargetId!("VENUS");
  page.actions.goBack!(); assert.equal(page.ui.date, false); assert.equal(page.navigation.length, 0);
  page.actions.goBack!(); assert.equal(page.ui.object, null); assert.equal(page.navigation.length, 0);
  assert.equal(page.ui.choices.length, 0); assert.equal(page.ui.target, null);
  assert.equal(page.navigation.length, 0, "closing an object clears mutually exclusive stale disclosure values together");
  page.actions.goBack!(); assert.equal(page.navigation[0]?.kind, "navigateBack");
  page.navigation[0]!.resolve(); page.dispose();
});

test("recovery Back works without Context, prevents duplicates, and catches a failed Map fallback for retry", async () => {
  const page = harness(); page.sandbox.contextComplete = false; page.sandbox.activeContext = null;
  const first = page.actions.returnToSkyEntry!(); await page.actions.returnToSkyEntry!(); assert.equal(page.navigation.length, 1);
  page.navigation[0]!.reject(Error("empty stack")); await new Promise(resolve => setImmediate(resolve));
  assert.equal(page.navigation[1]?.url, "/pages/map/index"); page.navigation[1]!.reject(Error("controlled fallback failure")); await first;
  assert.equal(page.notices.length, 1);
  const retry = page.actions.returnToSkyEntry!(); assert.equal(page.navigation.length, 3); page.navigation[2]!.resolve(); await retry; page.dispose();
});

for (const boundary of ["hide", "hide-return", "unmount"] as const) {
  test(`${boundary}: old Back neither closes current disclosure nor starts a late fallback`, async () => {
    const page = harness(), pending = page.actions.returnToSkyEntry!(); assert.equal(page.navigation.length, 1);
    if (boundary === "unmount") page.sandbox.viewportMountedRef.current = false;
    else { page.session.hide(); if (boundary === "hide-return") page.session.show(); }
    page.actions.goBack!(); assert.equal(page.ui.object, object);
    page.navigation[0]!.reject(Error("late stack failure")); await pending;
    assert.equal(page.navigation.length, 1); assert.equal(page.notices.length, 0); page.dispose();
  });
}

test("the shared command setter folds functional writes against live state and publishes the identical accepted value", () => {
  const current = { current: 1 }, commits: (() => number)[] = [];
  const set = skyCommandStateSetter(current, write => { assert.equal(typeof write, "function"); commits.push(write as () => number); });
  set(previous => previous + 1); set(previous => previous * 3);
  assert.equal(current.current, 6); assert.deepEqual(commits.map(commit => commit()), [2, 6]);
});
