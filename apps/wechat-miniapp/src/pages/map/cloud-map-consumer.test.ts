import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { mapSceneLayerForOverlay, mapLayerKindForOverlay } from "./map-layer-selection";
import { cloudTimeFrameChoices, mapTimeFrameAt, projectMapEvaluations, projectedLayerPolygons } from "./map-time-frame";

const page = ts.createSourceFile("map.tsx", readFileSync(new URL("./index.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const variables = new Map<string, ts.Expression>();
const panelProps = new Map<string, ts.Expression>();
let ruler = "", retry = "", cloudLifecycle = "";
function visit(node: ts.Node) {
  if (ts.isVariableDeclaration(node) && node.initializer) variables.set(node.name.getText(page), node.initializer);
  if (ts.isJsxSelfClosingElement(node) && node.tagName.getText(page) === "MapTimeRuler") ruler = node.getText(page);
  if (ts.isJsxSelfClosingElement(node) && node.tagName.getText(page) === "SpotInformationPanel") {
    for (const prop of node.attributes.properties) if (ts.isJsxAttribute(prop) && prop.initializer && ts.isJsxExpression(prop.initializer) && prop.initializer.expression) {
      panelProps.set(prop.name.getText(page), prop.initializer.expression);
    }
  }
  if (ts.isConditionalExpression(node) && node.whenTrue.getText(page).includes('recoveryLabel="重试云量预报"')) retry = node.getText(page);
  if (ts.isCallExpression(node) && node.expression.getText(page) === "useEffect" && node.arguments[0]?.getText(page).includes('cancelRequest("map-cloud")')) cloudLifecycle = node.arguments[0].getText(page);
  ts.forEachChild(node, visit);
}
visit(page);
const compile = (code: string) => ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React } }).outputText;
function read(name: string, scope: Record<string, any>) {
  const initializer = variables.get(name); assert.ok(initializer, `actual Map declaration ${name}`);
  return vm.runInNewContext(compile(`(${initializer.getText(page)});`), scope);
}
function panelProp(name: string, scope: Record<string, any>) {
  const expression = panelProps.get(name); assert.ok(expression, `actual panel prop ${name}`);
  return vm.runInNewContext(compile(`(${expression.getText(page)});`), scope);
}
const at = "2026-09-15T12:30:00.000Z", laterAt = "2026-09-15T13:30:00.000Z";
function scope() {
  const values: Record<string, any> = { useMemo: (read: () => unknown) => read(),
    mapSceneLayerForOverlay, mapLayerKindForOverlay, cloudTimeFrameChoices, mapTimeFrameAt, projectMapEvaluations, projectedLayerPolygons,
    accountOwnerId: null, mapResetVersion: 2, pageVisible: true, analysisOverlay: "TOTAL_CLOUD",
    activeContext: { contextId: "context:controlled", contextFingerprint: "one", revision: 2, weatherView: { cloudLayer: "TOTAL" } },
    observationContext: null, committedFilters: {}, debouncedFinderQuery: "unrelated marker filter",
    viewport: { center: { latitude: 22.5, longitude: 114.5 }, zoom: 12 },
    nativeViewport: { bounds: { west: 114.48, south: 22.48, east: 114.52, north: 22.52 }, error: null }, preferences: {},
    useMapCloudForecastQuery: (options: unknown) => options, useMapForecastQuery: (options: unknown) => options,
  };
  values.timeReference = { ...values.activeContext, selectedAtUtc: at, localDate: "2026-09-15", timezone: "Asia/Shanghai" };
  return values;
}

test("actual Map query and API binding read cloud independently of Scene filters and transmit the current context/view/signal", async () => {
  const calls: any[][] = [], values = scope(), signal = new AbortController().signal;
  const client = ts.createSourceFile("client.ts", readFileSync(new URL("../../services/api-client.ts", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
  const selected = client.statements.filter(node => ts.isFunctionDeclaration(node) && ["getMapCloud", "getMapScene"].includes(node.name?.text ?? ""));
  const functions = vm.runInNewContext(compile(selected.map(node => node.getText(client).replace(/^export /u, "")).join("\n") + ";({getMapCloud,getMapScene});"), {
    requestOperation: (...args: any[]) => { calls.push(args); return Promise.resolve({ data: { deliberatelyBound: true } }); },
  });
  Object.assign(values, functions);
  values.cloudEnabled = read("cloudEnabled", values);
  const cloud = read("cloud", values), scene = read("scene", values);
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

test("actual Map cloud polygons, selected hour and ruler are ready while marker Scene is pending; marker evidence keeps its own frame", () => {
  const values = scope();
  const polygons = [0, 80].map((value, index) => ({ id: "cloud:query:22.50:114.50", value,
    weatherAt: index ? "2026-09-15T13:00:00Z" : "2026-09-15T12:00:00Z", state: "FRESH", points: [],
    fillColor: "#4E8E9B6B", strokeColor: "#4E8E9B6B", strokeWidth: 1 }));
  const frames = [at, laterAt].map((atUtc, index) => ({ atUtc, moonPhase: null, spotSignals: {},
    dynamicLayer: { kind: "CLOUD", polygons: [polygons[index]], state: "FRESH" } }));
  Object.assign(values, { cloudPresentation: { timeFrames: frames, layer: { kind: "CLOUD", polygons: [polygons[0]] } },
    cloud: { isPending: false, isError: false, data: { dataState: "FRESH" } },
    scene: { isPending: true, data: undefined }, timePreviewing: false, previewAt: null, nightLayer: null,
    timeSaving: false, timeRulerIdentity: "controlled", mapTodayCivilDate: "2026-09-15", observationNightLabel: () => "selected night",
    setPreviewAt() {}, setTimePreviewing() {}, commitMapTime() {},
    React: { createElement: (_tag: unknown, props: unknown) => props }, MapTimeRuler: "ruler" });
  const update = () => {
    for (const name of ["timeFrames", "cloudFrames", "cloudTimeChoices", "projectedAt", "projectedFrame", "projectedEvaluations", "geographicLayer", "projectedPolygonSource", "cloudFailed"]) values[name] = read(name, values);
  };
  update();
  assert.equal(values.projectedPolygonSource[0].value, 0, "pending Scene cannot delay genuine zero cloud");
  assert.ok(ruler);
  const rendered = vm.runInNewContext(compile(`(${ruler});`), values);
  assert.equal(rendered.pending, false); assert.equal(rendered.disabled, false); assert.equal(rendered.frames.length, 2);
  values.timePreviewing = true; values.previewAt = laterAt; update();
  assert.equal(values.projectedAt, laterAt); assert.equal(values.projectedPolygonSource[0].value, 80);
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
  const calls: string[] = [], values = scope();
  Object.assign(values, { cloudFailed: true, cloudTimeChoices: [], cloud: { data: undefined, refetch: async () => calls.push("cloud-retry") },
    refreshMap: () => { throw new Error("cloud_retry_must_not_wait_for_scene"); },
    React: { createElement: (_tag: unknown, props: unknown) => props }, StatusPanel: "status",
    cloudEnabled: true, cancelRequest: (key: string) => calls.push(`cancel:${key}`) });
  assert.ok(retry && cloudLifecycle);
  const rendered = vm.runInNewContext(compile(`(${retry});`), values);
  assert.equal(rendered.state, "ERROR"); await rendered.onRecover();
  values.cloudTimeChoices = [{ frame: { atUtc: at } }];
  const retained = vm.runInNewContext(compile(`(${retry});`), values);
  assert.equal(retained.state, "STALE");
  assert.match(retained.detail, /保留仍有效的覆盖/);
  await retained.onRecover();
  const cleanup = vm.runInNewContext(compile(`(${cloudLifecycle})();`), values);
  cleanup();
  assert.deepEqual(calls, ["cloud-retry", "cloud-retry", "cancel:map-cloud"]);
});
