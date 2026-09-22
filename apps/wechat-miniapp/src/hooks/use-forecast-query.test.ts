import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { hashKey } from "@tanstack/react-query";
import type { HourlySkyRow, MapSceneData, ObservationPlan, SkyReport } from "@starward/miniapp-contracts";
import { mapForecastPresentation, skyForecastPresentation } from "../services/forecast-presentation";
import { planReference } from "../content/plan/detail/plan-reference-model";
import { cloudTimeFrameChoices, projectedLayerPolygons, projectMapEvaluations } from "../pages/map/map-time-frame";

const boundary = Date.parse("2026-09-20T12:00:00Z");
const weatherAt = "2026-09-20T11:00:00Z", at = "2026-09-20T11:30:00Z";
const hourly = (time = at, source = weatherAt, cloud = 10) => ({ at: time, weatherAt: source, cloudPercent: cloud,
  temperatureC: 18, windKph: 5, moonIllumination: 0.2, moonAltitudeDeg: 35, opportunityScore: 85,
  opportunityConfidence: .9, opportunityEligible: true, opportunityBlockers: [],
  opportunityInput: { weatherTransmission: .9, darkness: .8 }, state: "FRESH" }) as unknown as HourlySkyRow;
function sky(): SkyReport {
  return { context: { at, spotId: "spot:a", timezone: "UTC" }, hourly: [hourly(), hourly("2026-09-20T12:30:00Z", "2026-09-20T12:00:00Z", 0)],
    nightFacts: { startAt: "2026-09-20T00:00:00Z", endAt: "2026-09-21T00:00:00Z", astronomicalDuskAt: at },
    lunarFacts: { moonriseAt: at }, targetFrames: [{ at, targets: ["moon"] }], skyScene: { frames: [{ at }] },
    weatherEvidence: { timelineRole: "PRIMARY", warningState: "FRESH", alerts: [{ id: "independent-warning" }], modelRuns: [] },
  } as unknown as SkyReport;
}
const plan = { spotId: "spot:a", contextSnapshot: { selectedAtUtc: at, timezone: "UTC" },
  timing: { endLocalDate: "2026-09-20", endLocalTime: "12:00" } } as ObservationPlan;

test("elapsed source hours disappear from actual plan reference and sky rows without changing astronomy or retained cache", () => {
  const original = sky(), snapshot = structuredClone(original);
  assert.equal(planReference(plan, skyForecastPresentation.project(original, boundary - 1)).cloud, "10%");
  const current = skyForecastPresentation.project(original, boundary);
  const facts = planReference(plan, current);
  assert.equal(facts.cloud, "暂无数据"); assert.equal(facts.wind, "暂无数据"); assert.equal(facts.temperature, "暂无数据");
  assert.deepEqual(facts.weatherStarts, []);
  assert.equal(facts.illumination, "20%"); assert.equal(facts.dusk, "2026-09-20 11:30");
  assert.equal(current.hourly[0]!.opportunityEligible, false);
  assert.equal(current.hourly[0]!.opportunityInput.weatherTransmission, null);
  assert.equal(current.hourly[1]!.cloudPercent, 0, "future zero is valid, not missing");
  assert.equal(current.skyScene, original.skyScene); assert.equal(current.targetFrames, original.targetFrames);
  assert.equal(current.weatherEvidence.alerts, original.weatherEvidence.alerts);
  assert.deepEqual(original, snapshot);
});

test("map removes only expired sample cells and weather choices while preserving frame indices, Moon and static layers", () => {
  const signal = { spotId: "spot:a", weatherAt, cloudPercent: 10, moonImpact: "HIGH", opportunityEligible: true, state: "FRESH" };
  const polygon = { id: "cloud:spot:a", value: 10 };
  const original = { context: { selectedAtUtc: at }, evaluations: { "spot:a": { ...signal, distanceKm: 12 } },
    spots: [{ spotId: "spot:a" }], filterEvidence: { "spot:a": { LESS_CLOUD: { state: "MATCH", reason: "当前总云量为10%" } } },
    filterCapabilities: { byGroup: { LESS_CLOUD: { state: "AVAILABLE", reason: "已知云量" } } },
    timeFrames: [{ atUtc: at, moonPhase: "FULL", spotSignals: { "spot:a": signal }, dynamicLayer: { kind: "CLOUD", polygons: [polygon], state: "FRESH" } },
      { atUtc: "2026-09-20T12:30:00Z", moonPhase: "FULL", spotSignals: { "spot:a": { ...signal, weatherAt: "2026-09-20T12:00:00Z", cloudPercent: 0 } },
        dynamicLayer: { kind: "CLOUD", polygons: [{ ...polygon, value: 0 }], state: "FRESH" } }],
    layer: { kind: "CLOUD", polygons: [polygon], state: "FRESH" },
  } as unknown as MapSceneData;
  const snapshot = structuredClone(original);
  const current = mapForecastPresentation.project(original, boundary);
  assert.deepEqual(cloudTimeFrameChoices(current.timeFrames).map(choice => choice.sourceIndex), [1]);
  assert.equal(current.timeFrames.length, 2);
  assert.deepEqual(projectedLayerPolygons(current.layer, current.timeFrames[0]!), []);
  assert.equal(projectedLayerPolygons(current.layer, current.timeFrames[1]!)[0]!.value, 0);
  const evaluation = projectMapEvaluations(current.evaluations, current.timeFrames[0]!)["spot:a"]!;
  assert.equal(evaluation.cloudPercent, null); assert.equal(evaluation.moonImpact, "HIGH"); assert.equal(evaluation.distanceKm, 12);
  assert.equal(current.filterEvidence["spot:a"]!.LESS_CLOUD.state, "UNKNOWN");
  assert.doesNotMatch(current.filterEvidence["spot:a"]!.LESS_CLOUD.reason, /10%/);
  assert.equal(current.filterCapabilities.byGroup.LESS_CLOUD.state, "UNAVAILABLE");
  assert.equal(current.spots, original.spots, "retain returned unknown candidates, do not invent excluded results");
  const light = { ...original, layer: { ...original.layer, kind: "LIGHT_POLLUTION" as const } };
  assert.equal(mapForecastPresentation.project(light, boundary).layer, light.layer);
  assert.deepEqual(original, snapshot);
});

function mountedQuery(sourceData: SkyReport | MapSceneData, map = false) {
  const ast = ts.createSourceFile("hook.ts", readFileSync(new URL("./use-forecast-query.ts", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
  const code = ast.statements.filter(node => !ts.isImportDeclaration(node)).map(node => node.getText(ast).replace(/^export /, "")).join("\n");
  const slots: any[] = [], effects: Array<() => void> = [];
  let cursor = 0, dirty = false, refreshes = 0;
  const query = { data: { data: sourceData, dataState: "FRESH" }, isError: false, isPending: false,
    refetch: async () => { refreshes++; return undefined; }, refreshError: new Error("offline") };
  const same = (left: unknown[] | undefined, right: unknown[]) => left && right.every((item, index) => Object.is(item, left[index]));
  const hook = vm.runInNewContext(ts.transpileModule(code + (map ? ";useMapForecastQuery;" : ";useSkyForecastQuery;"), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, {
    Date, setTimeout, clearTimeout, hashKey, skyForecastPresentation, mapForecastPresentation, useResourceQuery: () => query,
    useRef: (value: unknown) => { const index = cursor++; return slots[index] ??= { current: value }; },
    useState: (value: unknown) => { const index = cursor++; slots[index] ??= value; return [slots[index], (update: any) => { slots[index] = typeof update === "function" ? update(slots[index]) : update; dirty = true; }]; },
    useMemo: (fn: () => unknown, deps: unknown[]) => { const index = cursor++; if (!same(slots[index]?.deps, deps)) slots[index] = { deps, value: fn() }; return slots[index].value; },
    useEffect: (fn: () => unknown, deps: unknown[]) => { const index = cursor++; if (!same(slots[index]?.deps, deps)) {
      const previous = slots[index]; slots[index] = { deps }; effects.push(() => { previous?.cleanup?.(); slots[index].cleanup = fn(); });
    } },
  });
  return { query, refreshes: () => refreshes, render(enabled = true) {
    let result: any;
    do { dirty = false; cursor = 0; result = hook({ enabled, queryKey: ["test"], queryFn: async () => query.data }); effects.splice(0).forEach(fn => fn()); } while (dirty);
    return result;
  }, dispose() { slots.forEach(slot => slot?.cleanup?.()); } };
}

test("mounted forecast query expires while idle/offline, survives identical refetch, and resumes from hidden state", t => {
  t.mock.timers.enable({ apis: ["Date", "setTimeout"], now: boundary - 1000 });
  const host = mountedQuery(sky());
  try {
    const before = host.render();
    assert.equal(planReference(plan, before.data.data).cloud, "10%");
    t.mock.timers.tick(1000);
    const after = host.render();
    assert.equal(planReference(plan, after.data.data).cloud, "暂无数据");
    assert.equal(host.refreshes(), 1); assert.equal(after.data.dataState, "PARTIAL", "normal elapsed coverage is not a transport failure");
    assert.equal(after.data.data.hourly[1].cloudPercent, 0);
    assert.equal(host.render().data, after.data, "pose/unrelated renders preserve projected report identity");
    assert.equal((host.query.data.data as SkyReport).hourly[0]!.cloudPercent, 10, "query cache remains immutable");
    host.render(false); t.mock.timers.tick(3_600_000);
    assert.equal(host.refreshes(), 1, "hidden page stops timers");
    const resumed = host.render();
    assert.equal(host.refreshes(), 2); assert.equal(resumed.data.data.hourly[1].cloudPercent, null);
    assert.equal(resumed.data.data.targetFrames, before.data.data.targetFrames);
  } finally { host.dispose(); }
});

test("empty filtered results still expire, and opening an expired cache revalidates only once", t => {
  t.mock.timers.enable({ apis: ["Date", "setTimeout"], now: boundary - 1000 });
  const original = { context: { selectedAtUtc: at }, forecastValidUntil: new Date(boundary).toISOString(),
    spots: [], evaluations: {}, filterEvidence: {}, filterCapabilities: { byGroup: { LESS_CLOUD: { state: "AVAILABLE", reason: "已知" } } },
    timeFrames: [{ atUtc: at, moonPhase: "FULL", spotSignals: {}, dynamicLayer: null }],
    layer: { kind: "NORMAL", polygons: [] },
  } as unknown as MapSceneData;
  const host = mountedQuery(original, true);
  let reopened: ReturnType<typeof mountedQuery> | undefined;
  try {
    assert.equal(host.render().data.data, original);
    t.mock.timers.tick(1000);
    const current = host.render();
    assert.equal(host.refreshes(), 1);
    assert.equal(current.data.dataState, "PARTIAL");
    assert.equal(current.data.data.filterCapabilities.byGroup.LESS_CLOUD.state, "UNAVAILABLE");
    assert.deepEqual(current.data.data.spots, []);
    assert.equal(current.data.data.timeFrames[0].moonPhase, "FULL");
    host.query.data = { ...host.query.data, data: structuredClone(original) };
    host.render();
    assert.equal(host.refreshes(), 1, "repeated expired response cannot start a refresh loop");
    reopened = mountedQuery(original, true);
    assert.equal(reopened.render().data.dataState, "PARTIAL");
    assert.equal(reopened.refreshes(), 1, "an already elapsed cache must revalidate on entry");
    reopened.render(); assert.equal(reopened.refreshes(), 1);
  } finally { host.dispose(); reopened?.dispose(); }
});

test("all forecast page queries bind the shared lifecycle owner instead of retaining raw report data", () => {
  for (const [file, bindings] of [
    ["../pages/map/index.tsx", { scene: "useMapForecastQuery", spotSky: "useSkyForecastQuery" }],
    ["../pages/map/search-page.tsx", { scene: "useMapForecastQuery" }],
    ["../features/sky/spot-sky-page.tsx", { report: "useSkyForecastQuery" }],
    ["../content/plan/detail/plan-editor-page.tsx", { skyQuery: "useSkyForecastQuery" }],
  ] as const) {
    const ast = ts.createSourceFile(file, readFileSync(new URL(file, import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const found: Record<string, string> = {};
    const visit = (node: ts.Node) => { if (ts.isVariableDeclaration(node) && node.initializer && ts.isCallExpression(node.initializer))
      found[node.name.getText(ast)] = node.initializer.expression.getText(ast); ts.forEachChild(node, visit); };
    visit(ast);
    for (const [variable, owner] of Object.entries(bindings)) assert.equal(found[variable], owner);
  }
});
