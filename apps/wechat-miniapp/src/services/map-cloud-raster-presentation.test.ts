import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { displayRasterWindowBounds, displayRasterWindowForBounds } from "@starward/coordinate-system";
import { CLOUD_DISPLAY_STYLE, CLOUD_SAMPLING_POLICY, cloudInstant, copyTotalCloudContext, projectMapCloudGridTimeline,
  type ApiEnvelope, type MapCloudData, type MapCloudRaster, type ObservationContext, type SourceSummary,
} from "@starward/miniapp-contracts";
import { totalCloudClientFixture } from "./total-cloud-test-support";
import * as presentation from "./map-cloud-raster-presentation";

function fixture() {
  const base = totalCloudClientFixture("2026-10-28T00:00:00.000Z");
  const binding = copyTotalCloudContext(base.binding);
  assert.equal(binding.state, "PINNED");
  if (binding.state !== "PINNED") throw new Error("test_cloud_pin_missing");
  const stamp = (hours: number) => cloudInstant(base.stamp(hours))!;
  const series = { ...base.series, binding, frames: base.series.frames.map(frame => ({ ...frame, validAt: stamp(frame.stepHours) })) };
  const cloud = { ...base, binding, stamp, series, forecast: { ...base.forecast, value: series } };
  const context = { contextId: "context:cloud", contextFingerprint: "cloud-fingerprint", revision: 1,
    selectedAtUtc: cloud.stamp(1), weatherView: { cloudLayer: "TOTAL", totalCloud: cloud.binding },
  } as ObservationContext;
  const selectedAt = cloud.stamp(1.25), viewport = { west: 109.99, east: 110.01, south: 29.99, north: 30.01 };
  const window = displayRasterWindowForBounds(viewport), width = window.columns * 256, height = window.rows * 256;
  const source: SourceSummary = { id: cloud.binding.publicationId, kind: "THIRD_PARTY_FORECAST", provider: "ECMWF IFS",
    title: "ECMWF 总云量预报", sourceUrl: "https://www.ecmwf.int/en/forecasts/datasets/open-data",
    license: "CC-BY-4.0", licenseUrl: "https://creativecommons.org/licenses/by/4.0/", publishedAt: null,
    retrievedAt: cloud.stamp(0), validFrom: cloud.binding.validFrom, validTo: cloud.binding.validTo,
    state: "FRESH", confidence: null, precision: "0.1°", limitations: ["Contains modified ECMWF forecast data."],
  };
  const raster: MapCloudRaster = { schemaVersion: "map-cloud-raster-v1", publicationId: `cloud-display:${"c".repeat(64)}`,
    sourcePublicationId: cloud.binding.publicationId, sourceManifestSha256: cloud.binding.manifestSha256,
    runAt: cloud.binding.runAt, sourceValidUntil: cloud.binding.supports240HoursUntil, selectedAt,
    brackets: { lowerAt: cloud.stamp(0), upperAt: cloud.stamp(3), fraction: 1.25 / 3,
      lowerValuesSha256: "d".repeat(64), upperValuesSha256: "e".repeat(64) },
    samplingPolicy: CLOUD_SAMPLING_POLICY, nativeGrid: { crs: "WGS84", registration: "grid-point-centres", resolutionDegrees: 0.1 },
    coordinateGrid: window.grid, window, boundsGcj02: displayRasterWindowBounds(window), width, height,
    styleVersion: CLOUD_DISPLAY_STYLE, unit: "%", validPixelCount: width * height, zeroPixelCount: width * height,
    missingPixelCount: 0, imageUrl: `https://maps.example.com/v2/cloud/assets/${cloud.binding.manifestSha256}/cloud-${"c".repeat(64)}.png`,
    imageBytes: 1024, imageSha256: "f".repeat(64),
  };
  const grid = projectMapCloudGridTimeline({ binding: cloud.binding, point: cloud.series.point,
    forecast: { ...cloud.forecast, source }, requestedAt: selectedAt, now: cloud.now });
  grid.gridTimeline.display = { state: "READY" };
  const data: MapCloudData = { context, ...grid, forecastValidUntil: cloud.binding.supports240HoursUntil,
    cloudSnapshot: null, timeFrames: [], layer: { kind: "CLOUD", cloudLayer: "TOTAL", polygons: [], legend: [],
      validAt: selectedAt, datasetVersion: cloud.binding.publicationId, precision: "0.1°", state: "FRESH", source, cloudRaster: raster } };
  const scene: ApiEnvelope<MapCloudData> = { apiVersion: "v2", requestId: "cloud-raster-test", data, dataState: "FRESH", generatedAt: new Date(cloud.now).toISOString(),
    validAt: selectedAt, etag: "cloud-raster", sources: [source], warnings: [],
  };
  return { ...cloud, context, selectedAt, viewport, scene, raster, source,
    input: { scene, context, selectedAt, viewport, clockOffsetMs: 0 } };
}

test("a precise cloud raster keeps its own units, zero pixels, source, bounds and UTC identity", () => {
  const f = fixture(), before = structuredClone(f.scene);
  const view = presentation.mapCloudRasterView({ ...f.input, selectedAt: "2026-10-28T09:15:00+08:00" })!;
  assert.equal(view.raster, f.raster);
  assert.equal(view.raster.zeroPixelCount, view.raster.width * view.raster.height);
  assert.deepEqual(view.sources, [f.source]);
  assert.equal(presentation.currentMapCloudRaster(view, f.now), true);
  assert.deepEqual(f.scene, before);
  assert.equal(presentation.mapCloudRasterRetentionKey("account", f.context, f.selectedAt),
    presentation.mapCloudRasterRetentionKey("account", f.context, "2026-10-28T09:15:00+08:00"));
});

test("numeric availability and a pending display cannot authorize raster installation", () => {
  const f = fixture();
  delete f.scene.data.layer.cloudRaster;
  f.scene.data.gridTimeline!.display = { state: "NOT_READY" };
  assert.equal(f.scene.data.gridTimeline!.selection.state, "AVAILABLE");
  assert.equal(presentation.mapCloudRasterView(f.input), null);
  f.scene.data.layer.cloudRaster = f.raster;
  assert.equal(presentation.mapCloudRasterView(f.input), null, "a leftover URL cannot make NOT_READY display-ready");
  for (const state of ["SOURCE_MISSING", "OUTSIDE_COVERAGE", "EXPIRED"] as const) {
    f.scene.data.gridTimeline!.display = { state };
    assert.equal(presentation.mapCloudRasterView(f.input), null, state);
    assert.equal(f.scene.data.gridTimeline!.display.state, state, "the consumer can still explain the actual reason");
  }
  f.scene.data.gridTimeline!.display = { state: "READ_FAILED" };
  assert.throws(() => presentation.mapCloudRasterView(f.input), /cloud_display_read_failed/u);
});

test("the raster boundary rejects incompatible source, read intent, geometry and quality", () => {
  const corruptions: Array<[string, (f: ReturnType<typeof fixture>) => void]> = [
    ["manifest URL", f => { f.raster.imageUrl = f.raster.imageUrl.replace("b".repeat(64), "a".repeat(64)); }],
    ["descriptor URL", f => { f.raster.imageUrl = f.raster.imageUrl.replace("c".repeat(64), "a".repeat(64)); }],
    ["publication", f => { f.raster.sourcePublicationId = `ecmwf-tcc:${"c".repeat(64)}`; }],
    ["run", f => { f.raster.runAt = f.stamp(12); }],
    ["precise time", f => { f.raster.selectedAt = f.stamp(1); }],
    ["interpolation", f => { f.raster.brackets.fraction = 0.5; }],
    ["geometry", f => { f.raster.boundsGcj02.east += 0.1; }],
    ["quality total", f => { f.raster.missingPixelCount = 1; }],
    ["partial claimed fresh", f => { f.raster.validPixelCount--; f.raster.zeroPixelCount--; f.raster.missingPixelCount++; }],
    ["source coverage", f => { f.source.validTo = f.stamp(6); }],
    ["source record", f => { f.scene.sources = [{ ...f.source, license: "unknown" }]; }],
    ["source explanations", f => { f.source.limitations = undefined as never; }],
    ["unbounded clock", f => { f.input.clockOffsetMs = Infinity; }],
    ["clock moved backwards", f => { f.input.clockOffsetMs = -1000; }],
  ];
  for (const [label, corrupt] of corruptions) {
    const f = fixture(); corrupt(f);
    assert.throws(() => presentation.mapCloudRasterView(f.input), /map_cloud_raster_identity_invalid/u, label);
  }
});

test("the current Context and exact time gate both fresh and retained cloud candidates", () => {
  const f = fixture(), first = presentation.mapCloudRasterRetentionKey("account", f.context, f.selectedAt);
  assert.notEqual(first, presentation.mapCloudRasterRetentionKey("account", f.context, f.stamp(1.25 + 1 / 3600)));
  assert.notEqual(first, presentation.mapCloudRasterRetentionKey("other-account", f.context, f.selectedAt));
  assert.notEqual(first, presentation.mapCloudRasterRetentionKey("account", { ...f.context, revision: 2 }, f.selectedAt));
  const changed = structuredClone(f.context);
  changed.weatherView.totalCloud = { ...f.binding, manifestSha256: "c".repeat(64) };
  assert.notEqual(first, presentation.mapCloudRasterRetentionKey("account", changed, f.selectedAt));
  assert.throws(() => presentation.mapCloudRasterView({ ...f.input, context: changed }), /map_cloud_raster_identity_invalid/u);
  assert.throws(() => presentation.mapCloudRasterView({ ...f.input, context: { ...f.context, revision: 2 } }), /map_cloud_raster_identity_invalid/u);
});

test("partial support remains usable and a native instant binds both ends to the same values", () => {
  const f = fixture();
  f.raster.validPixelCount--; f.raster.zeroPixelCount--; f.raster.missingPixelCount++;
  f.scene.data.layer.state = "PARTIAL";
  const partial = presentation.mapCloudRasterView(f.input)!;
  assert.equal(partial.layer.state, "PARTIAL");
  assert.equal(presentation.currentMapCloudRaster(partial, f.now), true);
  const selectedAt = f.stamp(3);
  f.input.selectedAt = selectedAt;
  const grid = projectMapCloudGridTimeline({ binding: f.binding, point: f.series.point,
    forecast: f.forecast, requestedAt: selectedAt, now: f.now });
  grid.gridTimeline.display = { state: "READY" };
  Object.assign(f.scene.data, grid);
  f.raster.selectedAt = f.scene.data.layer.validAt = selectedAt;
  f.raster.brackets = { lowerAt: selectedAt, upperAt: selectedAt, fraction: 0,
    lowerValuesSha256: "e".repeat(64), upperValuesSha256: "e".repeat(64) };
  assert.equal(presentation.mapCloudRasterView(f.input)!.raster.brackets.lowerAt, selectedAt);
  f.raster.brackets.upperValuesSha256 = "a".repeat(64);
  assert.throws(() => presentation.mapCloudRasterView(f.input), /map_cloud_raster_identity_invalid/u);
});

test("expiry preserves actual old provenance without relabelling it fresh or rewriting acquisition", () => {
  const f = fixture(), view = presentation.mapCloudRasterView(f.input)!;
  const expiry = Date.parse(f.binding.supports240HoursUntil);
  assert.equal(presentation.currentMapCloudRaster(view, expiry), true);
  assert.equal(presentation.currentMapCloudRaster(view, expiry + 1), false);
  assert.equal(presentation.presentedMapCloudRasterSources(view, expiry + 1)[0]!.state, "EXPIRED");
  const shown = presentation.presentedMapCloudRasterSources(view, f.now)[0]!;
  assert.equal(shown.id, f.source.id); assert.equal(shown.license, f.source.license);
  assert.deepEqual(shown.limitations.slice(0, -1), f.source.limitations);
  assert.equal(shown.limitations.at(-1), `当前地图影像时刻（UTC）：${f.selectedAt}`);
  f.source.state = "EXPIRED";
  assert.equal(presentation.currentMapCloudRaster(view, f.now), false);
  assert.equal(presentation.presentedMapCloudRasterSources(view, f.now)[0]!.state, "EXPIRED",
    "a slow device clock cannot turn known expiry into a different source state");
});

function mountedRaster() {
  const code = ts.transpileModule(readFileSync(new URL("../hooks/use-map-cloud-raster.ts", import.meta.url), "utf8"), {
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
  const exports: { useMapCloudRaster?: typeof import("../hooks/use-map-cloud-raster").useMapCloudRaster } = {};
  vm.runInNewContext(code, { exports, Date, setTimeout, clearTimeout, require: (name: string) => {
    if (name === "react") return react;
    if (name === "../services/map-cloud-raster-presentation") return presentation;
    throw Error(`Unexpected module: ${name}`);
  } });
  return {
    render(input: Parameters<NonNullable<typeof exports.useMapCloudRaster>>[0]) {
      cursor = 0;
      const result = exports.useMapCloudRaster!(input);
      effects.splice(0).forEach(effect => effect()); return result;
    },
    wakes: () => wakes,
    dispose: () => slots.forEach(slot => slot?.cleanup?.()),
  };
}

test("pending viewport discovery keeps actual old coverage and its own clock until expiry", t => {
  const f = fixture(), expiry = Date.parse(f.binding.supports240HoursUntil);
  t.mock.timers.enable({ apis: ["Date", "setTimeout"], now: expiry - 1001 });
  const host = mountedRaster(), input = { ...f.input, scope: "account", enabled: true, clockOffsetMs: 1000 };
  try {
    const first = host.render(input);
    assert.equal(first.view?.raster, f.raster);
    const pending = host.render({ ...input, scene: undefined, viewport: { ...f.viewport, east: 115 }, clockOffsetMs: 0 });
    assert.equal(pending.view, first.view);
    assert.equal(pending.retaining, true);
    assert.equal(pending.view!.raster.boundsGcj02.east, f.raster.boundsGcj02.east);
    t.mock.timers.tick(2);
    assert.equal(host.wakes(), 1);
    const expired = host.render({ ...input, scene: undefined, clockOffsetMs: 0 });
    assert.equal(expired.view, null);
    assert.equal(expired.unavailable, true);
    assert.equal(expired.unavailability, "EXPIRED");
  } finally { host.dispose(); }
});

test("viewport temporarily unknown does not fabricate a missing display or retire valid old coverage", t => {
  const f = fixture(); t.mock.timers.enable({ apis: ["Date", "setTimeout"], now: f.now });
  const host = mountedRaster(), input = { ...f.input, scope: "account", enabled: true };
  try {
    const first = host.render(input), pending = host.render({ ...input, viewport: null });
    assert.equal(pending.view, first.view);
    assert.equal(pending.retaining, true);
    assert.equal(pending.unavailable, false);
    assert.equal(pending.unavailability, null);
  } finally { host.dispose(); }
});

test("new missing data, a new time, account change and disable cannot resurrect the prior candidate", t => {
  const f = fixture(); t.mock.timers.enable({ apis: ["Date", "setTimeout"], now: f.now });
  const host = mountedRaster(), input = { ...f.input, scope: "account", enabled: true };
  try {
    host.render(input);
    const missing = structuredClone(f.scene);
    delete missing.data.layer.cloudRaster;
    missing.data.gridTimeline!.display = { state: "NOT_READY" };
    assert.equal(host.render({ ...input, scene: missing }).unavailable, true);
    assert.equal(host.render({ ...input, scene: missing }).unavailability, "NOT_READY");
    for (const state of ["SOURCE_MISSING", "OUTSIDE_COVERAGE", "EXPIRED"] as const) {
      const unavailable = structuredClone(missing);
      unavailable.data.gridTimeline!.display = { state };
      assert.equal(host.render({ ...input, scene: unavailable }).unavailability, state);
    }
    const failed = structuredClone(missing);
    failed.data.gridTimeline!.display = { state: "READ_FAILED" };
    const failure = host.render({ ...input, scene: failed });
    assert.match(String(failure.error), /cloud_display_read_failed/u);
    assert.equal(failure.unavailability, null);
    assert.equal(host.render({ ...input, scene: undefined }).view, null);
    for (const change of [{ selectedAt: f.stamp(2) }, { scope: "other-account" }, { enabled: false }]) {
      host.render(input);
      assert.equal(host.render({ ...input, scene: undefined, ...change }).view, null);
    }
  } finally { host.dispose(); }
});
