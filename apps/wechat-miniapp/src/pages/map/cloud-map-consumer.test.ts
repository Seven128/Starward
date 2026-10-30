import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { analysisLayerEnabled, independentMapLayerPolygons, mapSceneLayerForOverlay } from "./map-layer-selection";
import { createResourceFailureEpisode } from "../../services/resource-failure-episode";
import { mapCloudReadInstant } from "@starward/miniapp-contracts";
import { cloudForecastIntervals, cloudTimeFrameChoices, mapTimeFrameAt, projectMapEvaluations, projectedLayerPolygons } from "./map-time-frame";
import { totalCloudClientFixture } from "../../services/total-cloud-test-support";
import { createMapCloudRasterTestBoundaries } from "./map-page-test-support";
import { presentedMapCloudRasterSources } from "../../services/map-cloud-raster-presentation";

const page = ts.createSourceFile("map.tsx", readFileSync(new URL("./index.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const variables = new Map<string, ts.Expression>();
const panelProps = new Map<string, ts.Expression>();
const rulerProps = new Map<string, ts.Expression>();
let ruler = "", cloudFeedback = "", cloudLifecycle = "";
function visit(node: ts.Node) {
  if (ts.isVariableDeclaration(node) && node.initializer) variables.set(node.name.getText(page), node.initializer);
  if (ts.isJsxSelfClosingElement(node) && node.tagName.getText(page) === "MapTimeRuler") {
    ruler = node.getText(page);
    for (const prop of node.attributes.properties) if (ts.isJsxAttribute(prop) && prop.initializer && ts.isJsxExpression(prop.initializer) && prop.initializer.expression)
      rulerProps.set(prop.name.getText(page), prop.initializer.expression);
  }
  if (ts.isJsxSelfClosingElement(node) && node.tagName.getText(page) === "SpotInformationPanel") {
    for (const prop of node.attributes.properties) if (ts.isJsxAttribute(prop) && prop.initializer && ts.isJsxExpression(prop.initializer) && prop.initializer.expression) {
      panelProps.set(prop.name.getText(page), prop.initializer.expression);
    }
  }
  if (ts.isCallExpression(node) && node.expression.getText(page) === "useEffect" && node.arguments[0]?.getText(page).includes("cloudFailureEpisode.observe(")) cloudFeedback = node.arguments[0].getText(page);
  if (ts.isCallExpression(node) && node.expression.getText(page) === "useEffect" && node.arguments[0]?.getText(page).includes('cancelRequest("map-cloud")')) cloudLifecycle = node.arguments[0].getText(page);
  ts.forEachChild(node, visit);
}
visit(page);
const compile = (code: string) => ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React } }).outputText;
function read(name: string, scope: Record<string, any>): any {
  const initializer = variables.get(name); assert.ok(initializer, `actual Map declaration ${name}`);
  const actualScope: Record<string, any> = name === "cloud" ? { ...scope, cloudReadAt: read("cloudReadAt", scope) } : scope;
  return vm.runInNewContext(compile(`(${initializer.getText(page)});`), actualScope);
}
function panelProp(name: string, scope: Record<string, any>) {
  const expression = panelProps.get(name); assert.ok(expression, `actual panel prop ${name}`);
  return vm.runInNewContext(compile(`(${expression.getText(page)});`), scope);
}
function rulerProp(name: string, scope: Record<string, any>) {
  const expression = rulerProps.get(name); assert.ok(expression, `actual cloud ruler prop ${name}`);
  return vm.runInNewContext(compile(`(${expression.getText(page)});`), scope);
}
function readScene(scope: Record<string, any>) {
  return read("scene", { ...scope, mapSceneQueryKey: read("mapSceneQueryKey", scope) });
}
const at = "2026-09-15T12:30:00.000Z", laterAt = "2026-09-15T13:30:00.000Z";
function scope() {
  const values: Record<string, any> = { ...createMapCloudRasterTestBoundaries(), useMemo: (read: () => unknown) => read(),
    mapCloudReadInstant, timePreviewing: false, previewAt: null,
    independentMapLayerPolygons, mapSceneLayerForOverlay, cloudTimeFrameChoices, mapTimeFrameAt, projectMapEvaluations, projectedLayerPolygons,
    cloudClockOffsetMs: 0,
    accountOwnerId: null, mapResetVersion: 2, pageVisible: true, mapSceneRegionPending: false, analysisOverlay: "TOTAL_CLOUD", cloudLayerEnabled: true,
    activeContext: { contextId: "context:controlled", contextFingerprint: "one", revision: 2, weatherView: { cloudLayer: "TOTAL" } },
    observationContext: null, committedFilters: {}, debouncedFinderQuery: "unrelated marker filter",
    viewport: { center: { latitude: 22.5, longitude: 114.5 }, zoom: 12 },
    nativeViewport: { bounds: { west: 114.48, south: 22.48, east: 114.52, north: 22.52 }, error: null }, preferences: {},
    useMapCloudForecastQuery: (options: unknown) => options, useMapForecastQuery: (options: unknown) => options,
  };
  values.timeReference = { ...values.activeContext, selectedAtUtc: at, localDate: "2026-09-15", timezone: "Asia/Shanghai" };
  return values;
}

test("actual Map cloud coverage keeps the retained candidate's forecast clock rather than a new query clock", t => {
  const cloud = totalCloudClientFixture(), until = Date.parse(cloud.binding.supports240HoursUntil);
  t.mock.method(Date, "now", () => until - 1);
  const frames = [{ atUtc: cloud.stamp(0), moonPhase: null, dynamicLayer: null, spotSignals: {
    "spot:a": { spotId: "spot:a", weatherAt: null, cloudPercent: 0, cloudEvidence: cloud.evidence(0), state: "FRESH" },
  } }];
  const values: Record<string, any> = { ...scope(), Date, cloudForecastIntervals,
    cloud: { forecastClockOffsetMs: 0 }, cloudPresentation: { clockOffsetMs: 2, timeFrames: frames } };
  const update = () => { for (const name of ["cloudFrames", "cloudClockOffsetMs", "cloudIntervals", "cloudTimeChoices"])
    values[name] = read(name, values); };
  update();
  assert.deepEqual(Array.from(values.cloudIntervals), []); assert.deepEqual(Array.from(values.cloudTimeChoices), []);
  values.cloudPresentation.clockOffsetMs = 1; update();
  assert.equal(values.cloudIntervals.length, 1); assert.equal(values.cloudTimeChoices.length, 1);
  assert.equal(values.cloudTimeChoices[0].sourceIndex, 0);
});

test("actual Map enables both readers for composition, then stops both for all-off", () => {
  const values = scope();
  Object.assign(values, { analysisOverlay: "LIGHT_AND_CLOUD", analysisLayerEnabled,
    useMapNightLight: (_viewport: unknown, enabled: boolean) => ({ enabled }) });
  const update = () => {
    values.lightEnabled = read("lightEnabled", values); values.cloudLayerEnabled = read("cloudLayerEnabled", values);
    values.cloudEnabled = read("cloudEnabled", values);
  };
  update();
  assert.equal(read("nightLight", values).enabled, true); assert.equal(read("cloud", values).enabled, true);
  values.analysisOverlay = "NONE"; update();
  assert.equal(read("nightLight", values).enabled, false); assert.equal(read("cloud", values).enabled, false);
});

test("actual Map query and API binding read cloud independently of Scene filters and transmit the current context/view/signal", async () => {
  const calls: any[][] = [], values = scope(), signal = new AbortController().signal;
  const client = ts.createSourceFile("client.ts", readFileSync(new URL("../../services/api-client.ts", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
  const selected = client.statements.filter(node => ts.isFunctionDeclaration(node) && ["getMapCloud", "getMapScene"].includes(node.name?.text ?? ""));
  const functions = vm.runInNewContext(compile(selected.map(node => node.getText(client).replace(/^export /u, "")).join("\n") + ";({getMapCloud,getMapScene});"), {
    mapCloudReadInstant,
    requestOperation: (...args: any[]) => { calls.push(args); return Promise.resolve({ data: { deliberatelyBound: true } }); },
  });
  Object.assign(values, functions);
  values.cloudEnabled = read("cloudEnabled", values);
  const cloud = read("cloud", values), scene = readScene(values);
  assert.equal(cloud.enabled, true);
  await cloud.queryFn(signal); await scene.queryFn(signal);
  const cloudCall = calls[0]!, sceneCall = calls[1]!;
  assert.equal(cloudCall[0], "map-cloud"); assert.equal(cloudCall[1], "mapCloudGet");
  assert.equal(cloudCall[2].signal, signal); assert.equal(cloudCall[2].cache, false);
  const query = new URLSearchParams(cloudCall[2].query);
  assert.equal(query.get("contextId"), values.activeContext.contextId);
  assert.equal(query.get("centerLat"), "22.500000"); assert.equal(query.get("viewportBounds"), "114.4800000,22.4800000,114.5200000,22.5200000");
  assert.equal(query.has("filters"), false); assert.equal(query.has("preferences"), false);
  assert.equal(new URLSearchParams(sceneCall[2].query).get("layer"), "NORMAL", "marker Scene no longer repeats the cloud read");
  assert.equal(new URLSearchParams(sceneCall[2].query).has("viewportBounds"), false, "marker radius does not change when a layer measures native bounds");
  const sceneKey = JSON.stringify(scene.queryKey);
  const actualBounds = values.nativeViewport.bounds;
  values.nativeViewport.bounds = null;
  assert.equal(JSON.stringify(readScene(values).queryKey), sceneKey);
  values.nativeViewport.bounds = actualBounds;
  values.mapSceneRegionPending = true;
  assert.equal(readScene(values).enabled, false, "the existing camera/Context transaction gates Scene");
  values.mapSceneRegionPending = false;
  values.cloud = { data: { data: { identity: "cloud-only" } }, forecastClockOffsetMs: 123 };
  values.scene = { data: undefined, forecastClockOffsetMs: 999 };
  values.useMapCloudPresentation = (input: unknown) => input;
  const presentation = read("cloudPresentation", values);
  assert.equal(presentation.scene, values.cloud.data);
  assert.equal(presentation.clockOffsetMs, 123, "receipt clock belongs to the cloud reply, not a slower Scene");
  const key = JSON.stringify(cloud.queryKey);
  values.committedFilters = { unrelated: true }; values.debouncedFinderQuery = "other";
  assert.equal(JSON.stringify(read("cloud", values).queryKey), key);
  values.activeContext = null;
  assert.equal(read("cloudEnabled", values), false);
  assert.throws(() => read("cloud", values).queryFn(signal), /map_cloud_context_or_viewport_pending/);
});

test("actual cloud ruler previews key precise grid reads without committing Context or refetching legacy cells", async () => {
  const calls: any[][] = [], values = scope(), fixture = totalCloudClientFixture("2026-09-15T00:00:00.000Z");
  const client = ts.createSourceFile("client.ts", readFileSync(new URL("../../services/api-client.ts", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
  const get = client.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === "getMapCloud")!;
  const getMapCloud = vm.runInNewContext(compile(get.getText(client).replace(/^export /u, "") + ";getMapCloud;"), {
    mapCloudReadInstant, requestOperation: (...args: any[]) => { calls.push(args); return Promise.resolve({}); },
  });
  const committed = at, preview = "2026-09-15T13:30:12.345Z";
  values.activeContext = { ...values.activeContext, selectedAtUtc: committed,
    weatherView: { cloudLayer: "TOTAL", totalCloud: fixture.binding } };
  const original = JSON.stringify(values.activeContext);
  Object.assign(values, { getMapCloud, cloudEnabled: true, cloudTimeChoices: [{ frame: { atUtc: preview } }],
    setPreviewAt: (value: string) => { values.previewAt = value; },
    setTimePreviewing: (value: boolean) => { values.timePreviewing = value; },
    commitMapTime: () => { throw new Error("preview_cannot_commit_context"); } });
  const initial = read("cloud", values), signal = new AbortController().signal;
  rulerProp("onPreview", values)(0);
  const next = read("cloud", values);
  assert.notEqual(JSON.stringify(next.queryKey), JSON.stringify(initial.queryKey));
  await next.queryFn(signal);
  assert.equal(new URLSearchParams(calls[0]![2].query).get("selectedAt"), preview);
  assert.equal(calls[0]![1], "mapCloudGet"); assert.equal(calls[0]![2].signal, signal);
  rulerProp("onCancel", values)();
  assert.equal(JSON.stringify(read("cloud", values).queryKey), JSON.stringify(initial.queryKey));
  assert.equal(JSON.stringify(values.activeContext), original);
  values.activeContext = { ...values.activeContext, weatherView: { cloudLayer: "TOTAL" } };
  const legacy = read("cloud", values);
  rulerProp("onPreview", values)(0);
  assert.equal(JSON.stringify(read("cloud", values).queryKey), JSON.stringify(legacy.queryKey));
  await read("cloud", values).queryFn(signal);
  assert.equal(new URLSearchParams(calls[1]![2].query).has("selectedAt"), false);
  assert.equal(calls.length, 2, "only the two explicit read invocations ran; preview/cancel issued no write");
});

test("actual Map cloud polygons, selected hour and ruler are ready while marker Scene is pending; marker evidence keeps its own frame", () => {
  const values = scope();
  const polygons = [0, 80].map((value, index) => ({ id: "cloud:query:22.50:114.50", value,
    weatherAt: index ? "2026-09-15T13:00:00Z" : "2026-09-15T12:00:00Z", state: "FRESH", points: [],
    fillColor: index ? "#A9C9CE6B" : "#4E8E9B6B", strokeColor: "#4E8E9B6B", strokeWidth: 1 }));
  const frames = [at, laterAt].map((atUtc, index) => ({ atUtc, moonPhase: null, spotSignals: {},
    dynamicLayer: { kind: "CLOUD", polygons: [polygons[index]], state: "FRESH" } }));
  Object.assign(values, { cloudPresentation: { timeFrames: frames, layer: { kind: "CLOUD", polygons: [polygons[0]] } },
    cloud: { isPending: false, isError: false, data: { dataState: "FRESH" } },
    scene: { isPending: true, data: undefined }, timePreviewing: false, previewAt: null, nightLayer: null,
    timeSaving: false, timeRulerIdentity: "controlled", mapTodayCivilDate: "2026-09-15", observationNightLabel: () => "selected night",
    setPreviewAt() {}, setTimePreviewing() {}, commitMapTime() {},
    React: { createElement: (_tag: unknown, props: unknown) => props }, MapTimeRuler: "ruler" });
  const update = () => {
    for (const name of ["timeFrames", "cloudFrames", "cloudTimeChoices", "projectedAt", "projectedFrame", "projectedEvaluations", "layerPolygons", "cloudFailed"]) values[name] = read(name, values);
  };
  update();
  assert.equal(values.layerPolygons[0].fillColor, polygons[0]!.fillColor, "pending Scene cannot delay genuine zero cloud");
  assert.ok(ruler);
  const rendered = vm.runInNewContext(compile(`(${ruler});`), values);
  assert.equal(rendered.pending, false); assert.equal(rendered.disabled, false); assert.equal(rendered.frames.length, 2);
  values.timePreviewing = true; values.previewAt = laterAt; update();
  assert.equal(values.projectedAt, laterAt); assert.equal(values.layerPolygons[0].fillColor, polygons[1]!.fillColor);
  const signal = { spotId: "spot:one", cloudPercent: 42, weatherAt: "2026-09-15T13:00:00Z", moonImpact: "LOW", state: "FRESH" };
  values.scene.data = { data: { evaluations: { "spot:one": { ...signal, distanceKm: 5 } }, timeFrames: [{ atUtc: laterAt, spotSignals: { "spot:one": signal } }] } };
  update();
  assert.equal(values.projectedEvaluations["spot:one"].cloudPercent, 42, "geographic sample cannot replace formal-spot evidence");
  assert.equal(values.projectedEvaluations["spot:one"].distanceKm, 5);
});

test("the actual panel retains Scene moon/time facts while cloud is pending and both time axes commit their own exact instant", () => {
  const values = scope(), commits: string[] = [];
  const middleAt = "2026-09-15T13:00:00.000Z";
  const sceneFrames = [at, middleAt, laterAt].map(atUtc => ({ atUtc, moonPhase: "FULL", spotSignals: {}, dynamicLayer: null }));
  Object.assign(values, { scene: { isPending: false, data: { data: { timeFrames: sceneFrames } } }, mapSceneFailed: false,
    cloud: { isPending: true }, cloudPresentation: undefined, previewAt: null, timePreviewing: false,
    setPreviewAt: (instant: string) => { values.previewAt = instant; }, setTimePreviewing: (value: boolean) => { values.timePreviewing = value; },
    commitMapTime: (instant: string) => { commits.push(instant); },
    timeRulerIdentity: "context", timeSaving: false, mapTodayCivilDate: "2026-09-15", observationNightLabel: () => "night",
    React: { createElement: (_tag: unknown, props: unknown) => props }, MapTimeRuler: "ruler" });
  const update = () => { for (const name of ["timeFrames", "cloudFrames", "cloudTimeChoices", "projectedAt", "projectedFrame", "cloudFailed"]) values[name] = read(name, values); };
  update();
  assert.equal(panelProp("timeFrames", values), sceneFrames);
  assert.equal(panelProp("timeFramesPending", values), false);
  assert.equal(panelProp("timeFramesFailed", values), false);
  assert.equal(panelProp("timeFrames", values)[1].moonPhase, "FULL");
  panelProp("onTimePreview", values)(1); update();
  assert.equal(values.projectedAt, middleAt);
  panelProp("onTimeCommit", values)(1);
  assert.deepEqual(commits, [middleAt], "panel index belongs only to its Scene axis");
  values.cloudPresentation = { timeFrames: [laterAt, at].map(atUtc => ({ atUtc, moonPhase: null, spotSignals: {},
    dynamicLayer: { kind: "CLOUD", state: "FRESH", polygons: [{ value: atUtc === laterAt ? 80 : 0 }] } })) };
  values.cloud = { isPending: false }; update();
  assert.equal(panelProp("timeFrames", values), sceneFrames);
  assert.equal(values.projectedFrame.dynamicLayer, null, "an absent cloud instant never borrows an adjacent hour");
  const rendered = vm.runInNewContext(compile(`(${ruler});`), values);
  rendered.onPreview(0); update(); rendered.onCommit(0);
  assert.equal(values.projectedAt, laterAt);
  assert.equal(values.projectedFrame.dynamicLayer.polygons[0].value, 80);
  assert.deepEqual(commits, [middleAt, laterAt], "cloud index is converted to its own instant before committing");
  values.cloudPresentation.timeFrames.reverse(); update();
  assert.equal(values.projectedAt, laterAt, "a newer reordered reply cannot move an already previewed instant");
});

test("actual cloud failure retry and hide retirement use the cloud transport owner", async () => {
  const calls: string[] = [], values = scope(), notices: any[] = [];
  Object.assign(values, { cloudFailed: true, cloudTimeChoices: [], cloud: { data: undefined, refetch: async () => calls.push("cloud-retry") },
    refreshMap: () => { throw new Error("cloud_retry_must_not_wait_for_scene"); },
    cloudFailureEpisode: createResourceFailureEpisode(), rasterFailureScope: "current-map", cloudPresentation: undefined,
    cloudImage: { retryImage: () => calls.push("image-retry") },
    setCloudNativeRetry: () => calls.push("native-retry"),
    notify: (notice: unknown) => notices.push(notice), rasterRetryCurrent: () => true,
    cloudEnabled: true, cancelRequest: (key: string) => calls.push(`cancel:${key}`) });
  assert.ok(cloudFeedback && cloudLifecycle);
  values.showCloudFailure = read("showCloudFailure", values);
  const emit = vm.runInNewContext(compile(`(${cloudFeedback});`), values);
  emit(); emit(); assert.equal(notices.length, 1); assert.equal(notices[0].action.label, "重试");
  await read("retryCloudLayer", values)();
  values.cloudPresentation = { layer: { polygons: [{}] } };
  emit(); assert.equal(notices.length, 2); assert.match(notices[1].body, /保留仍有效的云量覆盖/);
  await read("retryCloudLayer", values)();
  const cleanup = vm.runInNewContext(compile(`(${cloudLifecycle})();`), values);
  cleanup();
  assert.deepEqual(calls, ["image-retry", "native-retry", "cloud-retry", "image-retry", "native-retry", "cloud-retry", "cancel:map-cloud"]);
});

test("the grid consumer sends its exact image identity through the shared file and native owners", () => {
  const values = scope(), image = { publicationId: "cloud-display:current", imageUrl: "https://assets.example.org/current.png",
    imageBytes: 321, imageSha256: "a".repeat(64), validPixelCount: 20, boundsGcj02: values.nativeViewport.bounds };
  const view = { raster: image }, fileCalls: unknown[][] = [];
  Object.assign(values, { cloudGridLane: true, cloudRaster: { identity: "pin:precise-time", view, unavailable: false },
    cloudNativeRetry: 0, nativeMap: { mapId: "map-current" }, mapRuntimeError: null,
    CLOUD_GROUND_OVERLAY_ID: read("CLOUD_GROUND_OVERLAY_ID", {}),
    useRasterImage: (...args: unknown[]) => { fileCalls.push(args); return { imagePath: "wxfile://owned/cloud.png", reportImageFailure() {} }; },
    useMapRasterInstallation: (input: unknown) => input, setAnnouncement() {} });
  values.cloudImage = read("cloudImage", values);
  const native = read("cloudInstallation", values);
  assert.deepEqual(JSON.parse(JSON.stringify(fileCalls[0])), [{ key: `${image.publicationId}:${image.imageUrl}`,
    url: image.imageUrl, expectedBytes: image.imageBytes, expectedSha256: image.imageSha256 }, true]);
  assert.equal(native.id, 91305); assert.equal(native.zIndex, 2); assert.equal(native.opacity, 1);
  assert.equal(native.data, view); assert.equal(native.src, "wxfile://owned/cloud.png");
  assert.equal(native.bounds, image.boundsGcj02); assert.equal(native.retentionKey, "pin:precise-time");
  assert.equal(native.enabled, true);
  values.cloudLayerEnabled = false;
  read("cloudImage", values);
  assert.equal(fileCalls[1]![1], false); assert.equal(read("cloudInstallation", values).enabled, false);
  values.cloudLayerEnabled = true; values.cloudRaster.view = null;
  read("cloudImage", values); assert.equal(fileCalls[2]![0], null, "metadata without an image cannot invent a download");
  values.cloudGridLane = false;
  assert.equal(read("cloudInstallation", values).enabled, false, "old DTOs stay on the polygon contract");
});

test("grid source follows native acknowledgement and remains disclosed through off or Context replacement", t => {
  t.mock.method(Date, "now", () => Date.parse("2026-09-20T01:00:00Z"));
  const values = scope(), source = { id: "cloud:installed", state: "FRESH", limitations: ["original source qualification"] },
    view = { layer: { source, state: "FRESH" }, sources: [source], clockOffsetMs: 0,
      raster: { runAt: "2026-09-20T00:00:00Z", selectedAt: "2026-09-20T01:23:45.678Z", sourceValidUntil: "2026-09-25T00:00:00Z", validPixelCount: 20 } };
  Object.assign(values, { Date, cloudGridLane: true, presentedMapCloudRasterSources,
    cloudRaster: { view }, cloudPresentation: { sources: [{ id: "cloud:pending" }] },
    uniqueSourceRecords: (sources: unknown[]) => sources,
    displayedLightLayer: null, terrainEnabled: false, presentedTerrainData: null, terrainDisclosure: null });
  const readSources = () => {
    values.presentedCloudRaster = read("presentedCloudRaster", values);
    values.displayedCloudSources = read("displayedCloudSources", values);
    return Array.from(read("layerDataSources", values));
  };
  assert.deepEqual(readSources(), [], "metadata/download alone cannot advance displayed provenance");
  values.cloudInstallation.presentedData = view;
  const displayed: any[] = readSources();
  assert.equal(displayed.length, 1); assert.equal(displayed[0].id, source.id);
  assert.equal(displayed[0].state, "FRESH");
  assert.ok(displayed[0].limitations.includes("original source qualification"));
  assert.ok(displayed[0].limitations.some((line: string) => line.includes("2026-09-20T01:23:45.678Z")), "disclosure names the actual acknowledged image instant");
  values.cloudLayerEnabled = false;
  assert.deepEqual(readSources(), displayed, "logical off cannot retire a still-acknowledged native source");
  values.cloudGridLane = false;
  assert.deepEqual(readSources(), displayed, "a Context transition cannot relabel pending old pixels as legacy weather");
  values.cloudInstallation.presentedData = null;
  assert.deepEqual(readSources(), [], "real retirement removes the old disclosure");
});

test("cloud availability messages distinguish unprepared images, missing source, coverage and expiry", () => {
  const values: Record<string, any> = { ...scope(), cloudGridLane: true };
  for (const [state, expected] of [
    ["NOT_READY", "当前云量图像尚未就绪"], ["SOURCE_MISSING", "当前范围云量源数据缺测"],
    ["OUTSIDE_COVERAGE", "当前范围或时刻暂无云量覆盖"], ["EXPIRED", "当前云量预报已过期"],
  ]) {
    values.cloudRaster = { unavailability: state };
    assert.equal(read("cloudUnavailable", values), true);
    assert.equal(read("cloudUnavailableMessage", values), expected);
  }
  values.cloudRaster = { unavailability: null };
  assert.equal(read("cloudUnavailable", values), false, "valid zero cloud remains available");
});

test("a failed native cloud clearance reports recovery even while metadata is refreshing", () => {
  const values = scope(), notices: any[] = [];
  Object.assign(values, { cloud: { isFetching: true, isPending: false },
    cloudInstallation: { ...values.cloudInstallation, error: new Error("native_remove_failed"),
      clearingPriorIdentity: true, requiresMapRecovery: true },
    cloudFailureEpisode: createResourceFailureEpisode(), rasterFailureScope: "current-map",
    notify: (notice: unknown) => notices.push(notice), cloudPresentation: undefined });
  values.cloudFailed = read("cloudFailed", values);
  values.cloudFailurePending = read("cloudFailurePending", values);
  values.showCloudFailure = read("showCloudFailure", values);
  assert.equal(values.cloudFailed, true); assert.equal(values.cloudFailurePending, false);
  vm.runInNewContext(compile(`(${cloudFeedback})();`), values);
  assert.equal(notices.length, 1); assert.equal(notices[0].action.label, "重新加载地图");
});

test("Map departure waits for all three native owners and cancellation resumes those same tickets", async () => {
  const values = scope(), resumed: string[] = [], tickets: Record<string, any> = {};
  for (const name of ["terrain", "light", "cloud"]) {
    tickets[name] = { ready: Promise.resolve(name !== "cloud"), current: true,
      isCurrent() { return this.current; }, resume() { resumed.push(name); } };
    values[`${name}Installation`] = { suspendForExit: () => tickets[name] };
  }
  const exit = read("suspendMapRasters", values)();
  assert.equal(await exit.ready, false, "two retired layers do not certify the still-owned cloud image");
  assert.equal(exit.isCurrent(), true); tickets.cloud.current = false; assert.equal(exit.isCurrent(), false);
  exit.resume(); assert.deepEqual(resumed, ["terrain", "light", "cloud"]);
});
