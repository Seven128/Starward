import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { primaryPageNativeRuntimeForTest } from "../../navigation/primary-page-navigation-test-support";
import { sdssOpticalPublication, skySourceSelectionPath } from "@starward/miniapp-contracts";
import { createSkyContextSession } from "./sky-context-session";
import { createPageBlackoutTransition } from "../../navigation/page-blackout-transition";
import { createSkyMapLifecycle } from "../../navigation/sky-map-lifecycle";
import { createSkyObservationTime, skyPresentedTimeCurrent } from "./sky-observation-time";
import { skyCommandStateSetter } from "./sky-command-state";
import { createSkyDisclosureCommands } from "./sky-disclosure-commands";
import { registerSkyNativeImageLifetime, skyNativeImageIsCurrent } from "./sky-artwork-loader";
import { skyOpticalSourceCredit } from "./sky-optical-source-credit";
import { skyHipsSourceCredit } from "./sky-hips-source-credit";
import type { ContextVersion } from "../../services/observation-context-version";
import type { SkyTargetOpticalCompletion } from "./sky-sdss-optical-completion";
import { skyPageAcceptedTestFrame, skyPageSceneTestDependencies } from "./sky-optical-page-test-support";
import { createSkyViewBasis } from "./sky-view-projection";
import type { ResolvedSkyReport } from "./sky-stellar-scene";

const source = ts.createSourceFile("spot-sky-page.tsx", readFileSync(
  process.env.SKY_NAVIGATION_SOURCE ?? new URL("./spot-sky-page.tsx", import.meta.url), "utf8"),
ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const page = source.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === "SpotSkyPage") as ts.FunctionDeclaration;
assert.ok(page?.body);
const names = ["skyInteractionRevision", "skyPageVisibleCurrent", "skyInteractionCurrent", "skyTimeIntentCurrent",
  "openSkySources", "currentPaintedSkySourceFrame", "openOpticalSources", "openBodyImageSources", "openLandscapeSources", "openConstellationSources",
  "skyReturnPendingRef", "returnToSkyEntry", "goBack",
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
  openImage:openOpticalSources,openBodyImageSources,openLandscapeSources,openConstellationSources,metadataSource:${metadataSource},goBack,returnToSkyEntry,pendingReturn:()=>skyReturnPendingRef.current,
  setDatePickerOpen,setSelectedCatalogObject,setSelectedTargetId,setCatalogPickChoices});`,
{ compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
const at = "2026-09-22T13:00:00.000Z", later = "2026-09-22T14:00:00.000Z";
const context = { contextId: "ctx:a" as ContextVersion["contextId"], revision: 1, contextFingerprint: "fp:1", selectedAtUtc: at,
  timezone: "Asia/Shanghai", localDate: "2026-09-22" };
const object = { reference: "HR:7001", displayName: "Vega", kind: "STAR" };

function harness(options: { unloadedMap?: boolean } = {}) {
  let store = { observationContext: context, selectedSpotId: "spot:a", mapResetVersion: 0, spotOpenRequestVersion: 0 };
  const session = createSkyContextSession(context.contextId, () => store), time = createSkyObservationTime();
  const binding = "ctx:a:1:fp:1";
  time.bind(binding, at, { startAt: at, endAt: later });
  const navigation: { kind: string; url: string | undefined; resolve(): void; reject(error: Error): void }[] = [];
  const mapPage = { route: "pages/map/index" }, skyPage = { route: "sky/detail/index" };
  const native = primaryPageNativeRuntimeForTest([mapPage], call => navigation.push({
    kind: call.kind, url: call.url, resolve: call.resolve, reject: call.reject,
  }));
  assert.equal(native.showMap(mapPage), true); native.hideMap(mapPage);
  if (options.unloadedMap) native.dispose();
  native.setStack(options.unloadedMap ? [skyPage] : [mapPage, skyPage]);
  const notices: unknown[] = [], retirements: (() => void)[] = [], runtimeErrors: unknown[][] = [];
  const sourceDocuments: unknown[] = [];
  let releases = 0, calibrationCancels = 0;
  const ui = { date: false, object: object as typeof object | null, target: null as string | null, choices: [] as unknown[] };
  const dateRef = { current: ui.date }, objectRef = { current: ui.object }, targetRef = { current: ui.target }, choicesRef = { current: ui.choices };
  const writer = (key: keyof typeof ui) => (value: unknown) => { (ui as any)[key] = typeof value === "function" ? value(ui[key]) : value; };
  const nativeImage = () => {
    const image = {}; retirements.push(registerSkyNativeImageLifetime(image, () => true)); return image;
  };
  const completion = (reference: string) => {
    const image = nativeImage();
    return { kind: "legacy", reference, publicationHash: sdssOpticalPublication(reference)!.publicationHash,
      field: { image, level: "DETAIL", fieldDegrees: 1 } } as SkyTargetOpticalCompletion;
  };
  const data = { context: { contextId: context.contextId, contextRevision: 1, contextFingerprint: "fp:1", spotId: "spot:a" } };
  const accepted = skyPageAcceptedTestFrame({
    observation:{data:data as unknown as ResolvedSkyReport,frameAt:at},
    view:{heading:null,pose:null,manualBasis:createSkyViewBasis(0,35,0)!,mode:"NIGHT",verticalFovDeg:45,center:{x:195,y:422}},
    canvas:{generation:1,width:390,height:844},
  },{sdssOptical:completion("M:51"),preparedRegions:[],opticalHips:[],bodyImages:[]},
  {catalogVersion:"controlled-navigation",catalogHash:"controlled-navigation",objects:[]});
  const sandbox: Record<string, any> = {
    ...skyPageSceneTestDependencies,
    contextSession: session, observationTime: time, timeBinding: binding, committedAt: at,
    pageVisible: true, viewportActiveRef: { current: true }, viewportMountedRef: { current: true }, contextComplete: true,
    activeContext: context, timeSaving: false, mode: "NIGHT", alignmentMode: "auto", active: true,
    orientationController: { snapshot: () => ({ alignment: { mode: sandbox.alignmentMode } }) },
    opticalSourcesOpeningRef: { current: null }, sourceReturnRef: { current: false },
    setSourceReturn() {}, canvasNodeRef: { current: {} }, canvasLifecycle: { hide: () => { releases++; } },
    cancelSkyCalibration: () => { calibrationCancels++; }, notify: (notice: unknown) => notices.push(notice),
    reportRuntimeError: (...event: unknown[]) => runtimeErrors.push(event),
    presentedSkyFrameRef: { current: accepted.frame }, paintedSkyObjectsRef:{current:accepted.picked},
    canvasGenerationRef: { current: 1 },
    nativeCanvasMounted: true, canvasError: null, orientationData: data, rawReportData: data,
    skyNativeImageIsCurrent, skySourceSelectionPath, SOURCE_READING_ROUTE: "/spot/data-source/index?reading=1",
    skyLandscapePaintedPanorama: (mask: unknown) => mask,
    skyLandscapeSourceDocument: (photo: unknown) => ({ title: "来源", sources: [], selected: photo }),
    skyConstellationSourceDocument: (catalog: unknown) => ({ title: "来源", sources: [], selected: catalog }),
    sourceMetadataRef: { current: { constellation: null } }, skyDisplayCurrent: () => true,
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
    Taro: { ...native.taro, navigateTo: (options: { url: string }) =>
      new Promise<void>((resolve, reject) => navigation.push({ kind: "navigateTo", url: options.url, resolve, reject })) },
  };
  Object.assign(sandbox, native.dispatcher);
  sandbox.navigateToSource = (options: { url: string; document?: unknown }) => {
    sourceDocuments.push(options.document); return sandbox.Taro.navigateTo(options);
  };
  sandbox.reducedMotion = false;
  sandbox.routeReducedMotion = false;
  sandbox.skyMapLifecycle = createSkyMapLifecycle();
  let exitPresentation: number | null = null;
  const exitTimers = new Map<number, () => void>();
  const visibility = session.visibilityRevision;
  const exit = createPageBlackoutTransition({
    getScope: () => session.visibilityRevision === visibility && sandbox.viewportActiveRef.current && sandbox.viewportMountedRef.current
      ? String(visibility) : null,
    onPresentation: id => { exitPresentation = id; },
    schedule(callback, milliseconds) { exitTimers.set(milliseconds, callback); return () => { exitTimers.delete(milliseconds); }; },
  });
  sandbox.skyExit = { transition: exit };
  const finishExit = async () => {
    assert.notEqual(exitPresentation, null, "whole-page blackout must be committed before navigation");
    exit.presented(exitPresentation!); exit.finishFade(exitPresentation!);
    await new Promise(resolve => setImmediate(resolve));
  };
  const actions = vm.runInNewContext(code, sandbox) as Record<string, (...args: any[]) => any>;
  return { actions, sandbox, session, time, native, mapPage, navigation, notices, runtimeErrors, sourceDocuments, ui, completion, nativeImage, finishExit, exit, exitTimers,
    credit: () => skyOpticalSourceCredit(sandbox.presentedSkyFrameRef.current.sdssOptical)!,
    replaceContext: () => { store = { ...store, observationContext: { ...context, revision: 2, contextFingerprint: "fp:2" } }; },
    counts: () => ({ releases, calibrationCancels }), dispose: () => { exit.dispose(); native.dispose(); retirements.forEach(retire => retire()); } };
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

for (const change of ["different-picture", "generation", "time", "cleared", "retired-image", "report", "pick-frame"] as const) {
  test(`${change}: an old image credit is no longer an eligible Sources tap`, async () => {
    const page = harness(), credit = page.credit(), frame = page.sandbox.presentedSkyFrameRef.current;
    if (change === "different-picture") page.sandbox.presentedSkyFrameRef.current = { ...frame, sdssOptical: page.completion("M:82") };
    if (change === "generation") page.sandbox.canvasGenerationRef.current++;
    if (change === "time") page.time.preview(later);
    if (change === "cleared") page.sandbox.presentedSkyFrameRef.current = null;
    if (change === "retired-image") page.dispose();
    if (change === "report") page.sandbox.orientationData = { ...frame.data };
    if (change === "pick-frame") page.sandbox.paintedSkyObjectsRef.current=skyPageAcceptedTestFrame({
      ...frame.identity,view:{...frame.identity.view,manualBasis:createSkyViewBasis(90,35,0)!},
    },frame,page.sandbox.paintedSkyObjectsRef.current).picked;
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

test("new Body and landscape page actions retain exact painted identities and reject replaced resources", async () => {
  const page = harness(), frame = page.sandbox.presentedSkyFrameRef.current;
  const body = { reference: "SOLAR:MOON", image: page.nativeImage(), publication: { publicationHash: "c".repeat(64) } };
  frame.bodyImages = [body];
  const bodyOpen = page.actions.openBodyImageSources!(body);
  assert.equal(page.navigation[0]?.url, `/sky/sources/index?reference=SOLAR%3AMOON&bodyImagePublicationHash=${body.publication.publicationHash}`);
  page.navigation[0]!.resolve(); await bodyOpen;
  frame.bodyImages = [{ ...body, image: {} }];
  await page.actions.openBodyImageSources!(body); assert.equal(page.navigation.length, 1);

  const photo = { publication: { publicationHash: "d".repeat(64) }, resource: { image: { downloadUrl: "/current-detail.png" } } };
  frame.landscape = photo;
  const photoOpen = page.actions.openLandscapeSources!(photo);
  assert.equal(page.navigation[1]?.url, "/spot/data-source/index?reading=1");
  assert.equal((page.sourceDocuments[1] as { selected: unknown }).selected, photo);
  page.navigation[1]!.resolve(); await photoOpen;
  frame.landscape = { ...photo, resource: { image: { downloadUrl: "/other-level.png" } } };
  await page.actions.openLandscapeSources!(photo); assert.equal(page.navigation.length, 2, "same publication cannot lend a different selected image link");
  page.dispose();
});

test("data-only source documents use current metadata without requiring Canvas or retaining a replaced query result", async () => {
  const page = harness(), catalog = { data: { catalogHash: "e".repeat(64) }, sources: [] };
  page.sandbox.nativeCanvasMounted = false; page.sandbox.presentedSkyFrameRef.current = null;
  page.sandbox.sourceMetadataRef.current.constellation = catalog;
  const open = page.actions.openConstellationSources!(catalog);
  assert.equal(page.navigation.length, 1);
  assert.equal((page.sourceDocuments[0] as { selected: unknown }).selected, catalog);
  page.navigation[0]!.resolve(); await open;
  page.sandbox.sourceMetadataRef.current.constellation = { ...catalog };
  await page.actions.openConstellationSources!(catalog); assert.equal(page.navigation.length, 1);
  page.dispose();
});

test("Back closes each current disclosure before navigating, including commands before React commits", async () => {
  const page = harness(); page.actions.setDatePickerOpen!(true);
  page.actions.setCatalogPickChoices!([{ reference: "HR:424" }]); page.actions.setSelectedTargetId!("VENUS");
  page.actions.goBack!(); assert.equal(page.ui.date, false); assert.equal(page.navigation.length, 0);
  page.actions.goBack!(); assert.equal(page.ui.object, null); assert.equal(page.navigation.length, 0);
  assert.equal(page.ui.choices.length, 0); assert.equal(page.ui.target, null);
  assert.equal(page.navigation.length, 0, "closing an object clears mutually exclusive stale disclosure values together");
  page.actions.goBack!(); assert.equal(page.navigation.length, 0); await page.finishExit(); assert.equal(page.navigation[0]?.kind, "navigateBack");
  page.navigation[0]!.resolve(); page.dispose();
});

test("recovery Back fades the complete page, prevents duplicates, and retries failed Map fallback", async () => {
  const page = harness(); page.sandbox.contextComplete = false; page.sandbox.activeContext = null;
  await page.actions.returnToSkyEntry!(); await page.actions.returnToSkyEntry!();
  assert.equal(page.navigation.length, 0, "no route can race the source fade");
  await page.finishExit(); assert.equal(page.navigation.length, 1);
  page.navigation[0]!.reject(Error("empty stack")); await new Promise(resolve => setImmediate(resolve));
  assert.equal(page.navigation[1]?.kind, "navigateBack");
  assert.equal(page.native.calls[1]?.delta, 1, "fallback returns to the exact retained Map rather than recreating it");
  page.navigation[1]!.reject(Error("controlled fallback failure")); await new Promise(resolve => setImmediate(resolve));
  assert.equal(page.notices.length, 1); assert.equal(page.exit.isActive(), false);
  await page.actions.returnToSkyEntry!(); await page.finishExit();
  assert.equal(page.navigation.length, 3);
  page.native.setStack([page.mapPage]); assert.equal(page.native.showMap(page.mapPage), true);
  page.navigation[2]!.resolve(); page.dispose();
});

test("a replaced Map is recreated as one native root after blackout, including an empty-Context recovery", async () => {
  const page = harness({ unloadedMap: true }), journey = page.sandbox.skyMapLifecycle as ReturnType<typeof createSkyMapLifecycle>;
  journey.beginEntry(); journey.mapUnloaded(); journey.skyMounted();
  page.sandbox.contextComplete = false; page.sandbox.activeContext = null;
  await page.actions.returnToSkyEntry!(); await page.finishExit();
  assert.equal(page.navigation.length, 1);
  assert.equal(page.navigation[0]?.kind, "reLaunch");
  assert.equal(page.navigation[0]?.url, "/pages/map/index");
  assert.equal(journey.mapReturnPending(), true);
  page.navigation[0]!.reject(Error("native route failure")); await new Promise(resolve => setImmediate(resolve));
  assert.equal(journey.mapReturnPending(), false);
  assert.equal(page.notices.length, 1);
  await page.actions.returnToSkyEntry!(); await page.finishExit();
  assert.equal(page.navigation[1]?.kind, "reLaunch");
  page.navigation[1]!.resolve(); await new Promise(resolve => setImmediate(resolve));
  assert.notEqual(page.actions.pendingReturn!(), null, "acceptance is not actual Map arrival");
  const rebuiltMap = { route: "pages/map/index" }; page.native.setStack([rebuiltMap]);
  assert.notEqual(page.actions.pendingReturn!(), null, "stack projection is not native show");
  journey.mapMounted(); assert.equal(page.native.showMap(rebuiltMap), true); await new Promise(resolve => setImmediate(resolve));
  assert.equal(page.actions.pendingReturn!(), null);
  assert.equal(page.native.taro.getCurrentPages().filter(item => item.route === "pages/map/index").length, 1);
  assert.equal(journey.mapReturnPending(), true, "actual Map owns ready/reveal after navigation"); page.dispose();
});

test("late native success after the UI timeout still restores the unloaded Map", async () => {
  const page = harness({ unloadedMap: true }), journey = page.sandbox.skyMapLifecycle as ReturnType<typeof createSkyMapLifecycle>;
  journey.beginEntry(); journey.mapUnloaded(); journey.skyMounted();
  await page.actions.returnToSkyEntry!(); await page.finishExit();
  page.exitTimers.get(10_000)!();
  assert.equal(page.exit.isActive(), false, "timeout releases the blackout and permits recovery");
  assert.equal(journey.mapReturnPending(), true, "accepted native return remains uncancellable");
  page.navigation[0]!.resolve(); await new Promise(resolve => setImmediate(resolve));
  const rebuiltMap = { route: "pages/map/index" }; page.native.setStack([rebuiltMap]);
  journey.mapMounted(); assert.equal(page.native.showMap(rebuiltMap), true); await new Promise(resolve => setImmediate(resolve));
  assert.equal(journey.mapReturnPending(), true, "Map still owns readiness and reveal");
  assert.notEqual(journey.snapshot()?.mapMountedAt, undefined); page.dispose();
});

test("a timed-out UI return joins the one native operation; only its rejection permits a fresh Map root", async () => {
  const page = harness({ unloadedMap: true }), journey = page.sandbox.skyMapLifecycle as ReturnType<typeof createSkyMapLifecycle>;
  journey.beginEntry(); journey.mapUnloaded(); journey.skyMounted();
  await page.actions.returnToSkyEntry!(); await page.finishExit();
  page.exitTimers.get(10_000)!();
  assert.equal(journey.mapReturnPending(), true, "timed-out native navigation may still succeed");
  await page.actions.returnToSkyEntry!(); await page.finishExit();
  assert.equal(journey.mapReturnPending(), true);
  assert.equal(page.navigation.length, 1, "UI timeout cannot resend an uncancellable root operation");
  assert.equal(page.navigation[0]?.kind, "reLaunch");
  page.navigation[0]!.reject(Error("old return rejected late")); await new Promise(resolve => setImmediate(resolve));
  assert.equal(journey.mapReturnPending(), false, "both UI tickets belonged to the same failed native operation");
  assert.equal(page.exit.isActive(), false);
  await page.actions.returnToSkyEntry!(); await page.finishExit();
  assert.equal(page.navigation.length, 2, "a fresh explicit retry is allowed after the real native failure");
  assert.equal(page.navigation[1]?.kind, "reLaunch");
  page.navigation[1]!.resolve(); await new Promise(resolve => setImmediate(resolve));
  assert.notEqual(page.actions.pendingReturn!(), null, "callback acceptance cannot claim a Map show");
  const rebuiltMap = { route: "pages/map/index" }; page.native.setStack([rebuiltMap]);
  journey.mapMounted(); assert.equal(page.native.showMap(rebuiltMap), true); await new Promise(resolve => setImmediate(resolve));
  assert.equal(page.actions.pendingReturn!(), null);
  assert.equal(journey.mapReturnPending(), true, "the fresh Map still owns readiness and reveal");
  assert.equal(page.native.taro.getCurrentPages().filter(item => item.route === "pages/map/index").length, 1); page.dispose();
});

for (const boundary of ["hide", "hide-return", "unmount"] as const) {
  test(`${boundary}: old Back neither closes current disclosure nor starts a late fallback`, async () => {
    const page = harness(); await page.actions.returnToSkyEntry!(); await page.finishExit();
    assert.equal(page.navigation.length, 1);
    if (boundary === "unmount") page.sandbox.viewportMountedRef.current = false;
    else { page.session.hide(); if (boundary === "hide-return") page.session.show(); }
    page.actions.goBack!(); assert.equal(page.ui.object, object);
    page.navigation[0]!.reject(Error("late stack failure")); await new Promise(resolve => setImmediate(resolve));
    assert.equal(page.navigation.length, 1); assert.equal(page.notices.length, 0); page.dispose();
  });
}

test("the shared command setter folds functional writes against live state and publishes the identical accepted value", () => {
  const current = { current: 1 }, commits: (() => number)[] = [];
  const set = skyCommandStateSetter(current, write => { assert.equal(typeof write, "function"); commits.push(write as () => number); });
  set(previous => previous + 1); set(previous => previous * 3);
  assert.equal(current.current, 6); assert.deepEqual(commits.map(commit => commit()), [2, 6]);
});
