import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { mapCloudCellId, type ApiEnvelope, type MapCloudSnapshot, type MapLayerPolygon, type MapSceneData, type MapSceneTimeFrame } from "@starward/miniapp-contracts";
import { mapForecastPresentation } from "./forecast-presentation";
import * as cloudPresentation from "./map-cloud-presentation";

const noon = Date.parse("2026-10-18T12:00:00Z");
const hour = "2026-10-18T12:00:00Z", at = "2026-10-18T12:30:00Z";
const point = { latitude: 23, longitude: 114 };
const polygon = (weatherAt = hour, value = 0): MapLayerPolygon => ({
  id: mapCloudCellId(point), points: [point], fillColor: "#4E8E9B6B", strokeColor: "#4E8E9B6B", strokeWidth: 1,
  value, weatherAt, label: `总云量 ${value}%`, state: "FRESH",
});
const snapshot = (retrievedAt = "2026-10-18T11:55:00Z"): MapCloudSnapshot => ({
  schemaVersion: "map-cloud-snapshot-v1", snapshotId: "test-cloud", samplingPolicy: "viewport-nine-query-cells-v2",
  collectionWindow: { startedAt: retrievedAt, endedAt: retrievedAt }, requestedBoundsGcj02: null,
  queryCellDegrees: 0.01, maximumSourceAgeSeconds: 1800, maximumSamples: 9, mixedRetrievalTimes: false,
  requestBudget: { hourlyRequestAttempts: 1, reusedHourlyResponses: 0, category: "QWEATHER_WEATHER_HOURLY", alertRequests: 0, reuseUnit: "FULL_HOURLY_RESPONSE" },
  cells: [{ id: "planned-cell", requestedGcj02: point, sourceId: "source:test", providerTag: null, sourceRequestId: null,
    retrievedAt, sourceState: "FRESH", quality: "AVAILABLE", hours: [{ at: hour, cloudPercent: 0 }, { at: "2026-10-18T11:00:00Z", cloudPercent: 20 }] }],
});
const frame = (atUtc = at, cells = [polygon()]): MapSceneTimeFrame => ({ atUtc, moonPhase: null,
  spotSignals: {}, dynamicLayer: { kind: "CLOUD", polygons: cells, state: "FRESH" } });
function scene(frames = [frame()], samples: MapCloudSnapshot | null = snapshot()): MapSceneData {
  return { context: { selectedAtUtc: frames[0]!.atUtc }, evaluations: {}, spots: [], filterEvidence: {},
    filterCapabilities: { byGroup: { LESS_CLOUD: { state: "AVAILABLE", reason: "current" } } },
    timeFrames: frames, cloudSnapshot: samples, layer: { kind: "CLOUD", polygons: frames[0]!.dynamicLayer!.polygons, state: "FRESH" },
  } as unknown as MapSceneData;
}

test("geographic cloud hours expire without formal spots, while a genuine zero in a later hour survives", () => {
  const old = frame("2026-10-18T11:30:00Z", [polygon("2026-10-18T11:00:00Z", 20)]);
  const input = scene([old, frame()]);
  const before = structuredClone(input);
  const output = mapForecastPresentation.project(input, noon);
  assert.deepEqual(output.timeFrames[0]!.dynamicLayer!.polygons, []);
  assert.equal(output.timeFrames[0]!.dynamicLayer!.state, "UNAVAILABLE");
  assert.equal(output.layer.state, "UNAVAILABLE");
  assert.equal(output.timeFrames[1]!.dynamicLayer!.polygons[0]!.value, 0);
  assert.ok(mapForecastPresentation.boundaries(input).includes(noon));
  assert.deepEqual(input, before, "expiry cannot overwrite cached acquisition data");
});

test("expiry of unrelated spot weather cannot erase a still-valid geographic cloud cell", () => {
  const input = scene();
  const sampleFrame = input.timeFrames[0]!;
  sampleFrame.spotSignals = { "spot:test": { spotId: "spot:test", weatherAt: "2026-10-18T11:00:00Z", cloudPercent: 12, state: "FRESH" } as never };
  const output = mapForecastPresentation.project(input, noon);
  assert.equal(output.timeFrames[0]!.spotSignals["spot:test"]!.weatherAt, null);
  assert.equal(output.timeFrames[0]!.dynamicLayer!.polygons, sampleFrame.dynamicLayer!.polygons);
  assert.equal(output.layer.state, "FRESH");
});

test("source-age expiry removes future-hour cells and is scheduled even without spot signals", () => {
  const input = scene([frame()], snapshot("2026-10-18T11:30:00Z"));
  assert.equal(mapForecastPresentation.project(input, noon - 1), input);
  assert.ok(mapForecastPresentation.boundaries(input).includes(noon));
  const expired = mapForecastPresentation.project(input, noon);
  assert.deepEqual(expired.layer.polygons, []);
  assert.equal(expired.layer.state, "UNAVAILABLE");
});

test("a queried but missing cell does not borrow the neighbouring sample or turn into zero", () => {
  const data = snapshot();
  const input = scene([frame()], { ...data, cells: [{ ...data.cells[0]!, quality: "MISSING", hours: [{ at: hour, cloudPercent: null }] }] });
  assert.deepEqual(mapForecastPresentation.project(input, noon).layer.polygons, []);
});

function mountedCloud() {
  const code = ts.transpileModule(readFileSync(new URL("../hooks/use-map-cloud-presentation.ts", import.meta.url), "utf8"), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;
  const slots: any[] = [], effects: Array<() => void> = [];
  let cursor = 0, wakes = 0;
  const same = (left: unknown[] | undefined, right: unknown[]) => left?.length === right.length && right.every((value, index) => Object.is(value, left[index]));
  const react = {
    useRef: (value: unknown) => { const index = cursor++; return slots[index] ??= { current: value }; },
    useState: (value: unknown) => { const index = cursor++; slots[index] ??= value;
      return [slots[index], (next: any) => { wakes++; slots[index] = typeof next === "function" ? next(slots[index]) : next; }]; },
    useMemo: (compute: () => unknown, deps: unknown[]) => { const index = cursor++;
      if (!same(slots[index]?.deps, deps)) slots[index] = { deps, value: compute() }; return slots[index].value; },
    useEffect: (effect: () => unknown, deps: unknown[]) => { const index = cursor++;
      if (!same(slots[index]?.deps, deps)) { const previous = slots[index]; slots[index] = { deps };
        effects.push(() => { previous?.cleanup?.(); slots[index].cleanup = effect(); }); } },
  };
  const exports: any = {};
  vm.runInNewContext(code, { exports, Date, setTimeout, clearTimeout, require: (name: string) => {
    if (name === "react") return react;
    if (name === "../services/map-cloud-presentation") return cloudPresentation;
    throw Error(`Unexpected module: ${name}`);
  } });
  return {
    render(data?: MapSceneData, scope = "account:night", enabled = true, selectedAtUtc = at) {
      cursor = 0;
      const envelope = data ? { data, sources: [{ id: "source:retained", kind: "THIRD_PARTY_FORECAST" }] } as unknown as ApiEnvelope<MapSceneData> : undefined;
      const result = exports.useMapCloudPresentation({ scene: envelope, scope, enabled, selectedAtUtc });
      effects.splice(0).forEach(effect => effect()); return result;
    },
    wakes: () => wakes,
    dispose: () => slots.forEach(slot => slot?.cleanup?.()),
  };
}

test("viewport refresh retains only the same public sampled cells and provenance, with exact-hour selection", t => {
  t.mock.timers.enable({ apis: ["Date", "setTimeout"], now: noon });
  const host = mountedCloud(), input = scene();
  try {
    host.render(input);
    const pending = host.render();
    assert.equal(pending.retaining, true);
    assert.equal(pending.layer.polygons, input.layer.polygons, "old footprints are not stretched into the new viewport");
    assert.equal(pending.cloudSnapshot, input.cloudSnapshot);
    assert.equal(pending.sources[0].id, "source:retained");
    assert.equal(pending.context, undefined); assert.equal(pending.spots, undefined);
    assert.deepEqual(Object.keys(pending.timeFrames[0].spotSignals), []);
    assert.equal(host.render(undefined, "account:night", true, "2026-10-18T13:30:00Z").layer.polygons.length, 0);
  } finally { host.dispose(); }
});

test("retained cloud cells expire while the replacement is offline, without creating a request owner", t => {
  t.mock.timers.enable({ apis: ["Date", "setTimeout"], now: noon - 1 });
  const host = mountedCloud();
  try {
    host.render(scene([frame()], snapshot("2026-10-18T11:30:00Z")));
    assert.equal(host.render().layer.polygons.length, 1);
    t.mock.timers.tick(1);
    assert.equal(host.wakes(), 1);
    assert.equal(host.render().layer.state, "UNAVAILABLE");
    assert.equal(host.render().layer.polygons.length, 0);
  } finally { host.dispose(); }
});

test("a new missing response replaces retained coverage; account/night reset and leaving cloud retire it", t => {
  t.mock.timers.enable({ apis: ["Date", "setTimeout"], now: noon });
  const host = mountedCloud();
  try {
    host.render(scene());
    host.render(scene([frame(at, [])]));
    assert.equal(host.render().layer.polygons.length, 0, "known new missing coverage cannot resurrect old pixels");
    host.render(scene());
    assert.equal(host.render(undefined, "new-account:night"), undefined);
    host.render(scene());
    assert.equal(host.render(undefined, "account:other-night"), undefined);
    host.render(scene()); host.render(undefined, "account:night", false);
    assert.equal(host.render(), undefined);
  } finally { host.dispose(); }
});
