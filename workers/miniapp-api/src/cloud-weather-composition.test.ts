import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";
import { TOTAL_CLOUD_POLICY, cloudPointSeriesAt, type TotalCloudContext } from "@starward/miniapp-contracts";
import { TEST_PUBLISHED_SPOT } from "@starward/miniapp-contracts/test-fixtures";
import { CloudPointWeather } from "./cloud-point-weather.ts";
import { CloudNumericPublication, assertCloudBatch } from "./cloud-publication.ts";
import { CloudPublicationRegistry, cloudContextPin } from "./cloud-publication-registry.ts";
import { TotalCloudCompositeAdapter } from "./weather-provider.ts";
import { projectWeatherAt, weatherSnapshotHours } from "./weather-hour.ts";
import type { CanonicalWeatherHour, WeatherEvidenceResult, WeatherForecastResult, WeatherPort } from "./ports.ts";
import { createCloudPublicationFixture } from "./test-fixtures/cloud-publication-fixture.ts";
import { createTestMiniappService } from "./test-fixtures/create-test-service.ts";
import { InMemoryTestRepository } from "./test-fixtures/in-memory-repository.ts";
import { classifyExceptionMessage } from "./api-exception.filter.ts";
import { withDeadline } from "./provider-deadline.ts";
import { AstronomyService } from "./astronomy-service.ts";
import { createTestRuntimeConfig } from "./runtime-config.ts";
import { createTestSkyCatalogProvider } from "./sky-scene-catalog.ts";
import { setImmediate as nextTurn } from "node:timers/promises";

const NOW = Date.parse("2026-10-27T18:05:00Z");
const point = { system: "WGS84" as const, latitude: 22.95, longitude: 113.05 };
const at = (hour: number) => new Date(Date.parse("2026-10-27T00:00:00Z") + hour * 3_600_000).toISOString();
const input = { point, localDate: "2026-10-27", timezone: "Asia/Shanghai", windowUtc: { start: at(18), end: at(21) } };

function primaryResult(): WeatherEvidenceResult {
  const row: CanonicalWeatherHour = { at: at(18), cloudPercent: 73, temperatureC: 13, precipitationMm: 0,
    precipitationProbabilityPercent: 0, windKph: 8, windGustKph: 10, windDirectionDeg: 120, relativeHumidityPercent: 50,
    dewPointC: 3, visibilityKm: 20, thunderstorm: false, severeRain: false, severeWind: false, evidenceSourceIds: ["test:qweather"] };
  const source = { id: "test:qweather", kind: "TEST_FIXTURE" as const, provider: "QWeather test", title: "other weather test",
    sourceUrl: "", license: "test", licenseUrl: "", publishedAt: null, retrievedAt: at(18), validFrom: at(18), validTo: at(19),
    state: "FRESH" as const, confidence: null, precision: "test", limitations: [] };
  const warningSource = { ...source, id: "test:official-alert", validTo: at(18.75) };
  return { value: [row], state: "FRESH", source, sources: [source, warningSource], errorCode: null,
    warningState: "FRESH", warningSource, alerts: [{ id: "test:alert", headline: "official warning", description: "test",
      instruction: null, eventName: "rain", eventCode: "rain", severity: "severe", urgency: null, certainty: null,
      issuedAt: at(18), effectiveAt: at(18.25), expiresAt: at(18.75), status: "ACTIVE", material: true, sourceId: warningSource.id }],
    timelineRole: "PRIMARY", modelRuns: [], warnings: [] };
}

async function fixture(t: TestContext, options: { now?: () => number; primary?: WeatherPort; failFrame?: (step: number) => string | null } = {}) {
  const data = await createCloudPublicationFixture(), manifest = assertCloudBatch(data.manifest);
  const pin = cloudContextPin(manifest, data.manifestSha256), registry = new CloudPublicationRegistry(null, options.now ?? (() => NOW));
  let current: TotalCloudContext | null = pin, selections = 0, frameReads = 0, primaryReads = 0;
  registry.selectCurrent = async () => { selections++; return current; };
  registry.read = async (binding, signal) => {
    assert.equal(binding.manifestSha256, pin.manifestSha256, "all reads must retain the chosen immutable publication");
    const publication = await CloudNumericPublication.open(data.directory, binding.manifestSha256, signal);
    const readFrame = publication.frame.bind(publication);
    publication.frame = async (index, readSignal) => {
      frameReads++;
      const failure = options.failFrame?.(publication.manifest.frames[index]!.stepHours);
      if (failure) throw new Error(failure);
      return readFrame(index, readSignal);
    };
    return publication;
  };
  const primary = options.primary ?? { key: "qweather-test", getHourly: async () => { primaryReads++; return primaryResult(); } };
  const cloud = new CloudPointWeather(registry, options.now ?? (() => NOW)), weather = new TotalCloudCompositeAdapter(primary, cloud);
  t.after(async () => { await registry.close(); await data.dispose(); });
  return { pin, registry, cloud, weather, selectCurrent: (value: TotalCloudContext | null) => { current = value; },
    counts: () => ({ selections, frameReads, primaryReads }) };
}

test("one source deadline retains the completed independent source and user cancellation still cancels both", async t => {
  const f = await fixture(t), readyCloud = await f.cloud.getForecast({ binding: f.pin, point, windowUtc: input.windowUtc });
  let cloudAborted = false, primaryAborted = false;
  const stalled = (signal: AbortSignal | undefined, onAbort: () => void): Promise<never> => new Promise((_resolve, reject) => {
    const abort = () => { onAbort(); reject(signal?.reason ?? new Error("request_aborted")); };
    if (signal?.aborted) abort();
    else signal?.addEventListener("abort", abort, { once: true });
  });
  const primary: WeatherPort = { key: "primary", getHourly: async () => primaryResult(),
    getForecastHourly: async () => ({ ...primaryResult(), modelRun: null }) };
  f.cloud.getForecast = async request => stalled(request.signal, () => { cloudAborted = true; });
  const combined = new TotalCloudCompositeAdapter(primary, f.cloud, 25);
  for (const read of [combined.getHourly.bind(combined), combined.getForecastHourly.bind(combined)]) {
    const result = await withDeadline<WeatherEvidenceResult | WeatherForecastResult>(signal => read({ ...input, totalCloud: f.pin, signal }), 200);
    assert.equal(result.value?.[0]?.temperatureC, 13, "cloud deadline must retain completed QWeather");
    assert.equal(result.totalCloud?.state, "UNAVAILABLE");
    assert.equal(result.totalCloud?.errorCode, "weather_deadline_exceeded");
  }
  assert.equal(cloudAborted, true);
  const cancel = new AbortController();
  const pending = combined.getHourly({ ...input, totalCloud: f.pin, signal: cancel.signal });
  const rejected = assert.rejects(pending, /user_cancelled/u);
  cancel.abort(new Error("user_cancelled")); await rejected;
  primary.getHourly = async request => stalled(request.signal, () => { primaryAborted = true; });
  f.cloud.getForecast = async () => readyCloud;
  const cloudOnly = await withDeadline(signal => combined.getHourly({ ...input, totalCloud: f.pin, signal }), 200);
  assert.equal(primaryAborted, true);
  assert.equal(cloudOnly.value, null);
  assert.deepEqual(cloudOnly.totalCloud, readyCloud, "primary deadline must retain completed ECMWF");
});

test("actual overall deadline returns completed QWeather through the shared Astronomy acquisition", async t => {
  t.mock.timers.enable({ apis: ["Date", "setTimeout"], now: NOW });
  const f = await fixture(t), spot = { ...TEST_PUBLISHED_SPOT, wgs84: point }, repository = new InMemoryTestRepository([spot]);
  let observed!: () => void, aborted = false;
  const observedPrimary = new Promise<void>(resolve => { observed = resolve; });
  f.cloud.getForecast = request => new Promise((_resolve, reject) => {
    request.signal?.addEventListener("abort", () => { aborted = true; reject(request.signal?.reason); }, { once: true });
  });
  const weather: WeatherPort = { key: f.weather.key, getHourly: request => f.weather.getHourly({ ...request,
    onIndependentResult: value => { request.onIndependentResult?.(value); if (value.value?.length) observed(); },
  }) };
  const service = createTestMiniappService({ repository, weather, cloudPublications: f.registry });
  try {
    const context = (await service.resolveObservationContext({ location: { kind: "FORMAL_SPOT", spotId: spot.spotId },
      localDate: input.localDate, selectedAt: at(18.5), totalCloudPolicy: TOTAL_CLOUD_POLICY })).data;
    const astronomy = new AstronomyService(weather, repository, createTestRuntimeConfig(), createTestSkyCatalogProvider());
    const result = astronomy.computeDecision(context);
    await observedPrimary;
    t.mock.timers.tick(6_500);
    const report = await result;
    assert.equal(aborted, true);
    assert.equal(report.data.hourly.find(row => row.at === at(18.5))?.temperatureC, 13);
    assert.deepEqual(report.data.weatherEvidence.alerts, primaryResult().alerts);
    assert.equal(report.data.weatherEvidence.totalCloud?.state, "UNAVAILABLE");
    assert.equal(report.data.hourly.find(row => row.at === at(18.5))?.cloudPercent, null);
  } finally { await service.onModuleDestroy(); }
});

test("short waiter deadline and user cancellation retain independent facts without cancelling a shared peer", async t => {
  t.mock.timers.enable({ apis: ["Date"], now: NOW });
  const f = await fixture(t), readyCloud = await f.cloud.getForecast({ binding: f.pin, point, windowUtc: input.windowUtc });
  const spot = { ...TEST_PUBLISHED_SPOT, wgs84: point }, repository = new InMemoryTestRepository([spot]);
  let releaseCloud!: () => void, observed!: () => void, upstream: AbortSignal | undefined, primaryReads = 0;
  const observedPrimary = new Promise<void>(resolve => { observed = resolve; });
  f.cloud.getForecast = () => new Promise(resolve => { releaseCloud = () => resolve(readyCloud); });
  const primary: WeatherPort = { key: "primary", getHourly: async () => { primaryReads++; return primaryResult(); } };
  const combined = new TotalCloudCompositeAdapter(primary, f.cloud);
  const weather: WeatherPort = { key: combined.key, getHourly: request => {
    upstream = request.signal;
    return combined.getHourly({ ...request, onIndependentResult: value => {
      request.onIndependentResult?.(value); if (value.value?.length) observed();
    } });
  } };
  const service = createTestMiniappService({ repository, weather, cloudPublications: f.registry });
  try {
    const context = (await service.resolveObservationContext({ location: { kind: "FORMAL_SPOT", spotId: spot.spotId },
      localDate: input.localDate, selectedAt: at(18.5), totalCloudPolicy: TOTAL_CLOUD_POLICY })).data;
    const astronomy = new AstronomyService(weather, repository, createTestRuntimeConfig(), createTestSkyCatalogProvider(), () => NOW);
    const controller = new AbortController();
    const short = astronomy.computeDecision(context, undefined, undefined, NOW + 25);
    const cancelled = astronomy.computeDecision({ ...context, contextId: "ctx:cancelled" as typeof context.contextId }, undefined, controller.signal, NOW + 500);
    const rejection = assert.rejects(cancelled, /user_cancelled/u);
    let peerFinished = false;
    const peer = astronomy.computeDecision({ ...context, contextId: "ctx:peer" as typeof context.contextId }, undefined, undefined, NOW + 500)
      .then(value => { peerFinished = true; return value; });
    await observedPrimary;
    controller.abort(new Error("user_cancelled")); await rejection;
    const partial = await short;
    assert.equal(partial.data.hourly.find(row => row.at === at(18.5))?.temperatureC, 13);
    assert.equal(partial.data.weatherEvidence.totalCloud?.state, "UNAVAILABLE");
    assert.equal(partial.data.hourly.find(row => row.at === at(18.5))?.cloudPercent, null);
    assert.equal(upstream?.aborted, false, "one waiter's deadline or cancellation cannot abort shared acquisition");
    assert.equal(peerFinished, false);
    releaseCloud();
    const full = await peer;
    assert.equal(full.data.hourly.find(row => row.at === at(18.5))?.cloudPercent, 50);
    assert.equal(full.data.hourly.find(row => row.at === at(18.5))?.temperatureC, 13);
    assert.equal(primaryReads, 1);
    assert.equal(partial.data.hourly.find(row => row.at === at(18.5))?.cloudPercent, null, "late completion cannot mutate a returned partial result");
    const cached = await astronomy.computeDecision(context);
    assert.equal(cached.data.hourly.find(row => row.at === at(18.5))?.cloudPercent, 50);
    assert.equal(primaryReads, 1);
  } finally { releaseCloud?.(); await service.onModuleDestroy(); }
});

test("contextless deadline retains the admitted pin and late source completion cannot republish it", async t => {
  const f = await fixture(t), readyCloud = await f.cloud.getForecast({ binding: f.pin, point, windowUtc: input.windowUtc });
  let selectStarted!: () => void, releaseSelect!: (value: TotalCloudContext) => void, readStarted!: () => void;
  let releaseRead!: (value: typeof readyCloud) => void, selections = 0;
  const selecting = new Promise<void>(resolve => { selectStarted = resolve; });
  const reading = new Promise<void>(resolve => { readStarted = resolve; });
  f.registry.selectCurrent = async () => { selections++; selectStarted(); return new Promise(resolve => { releaseSelect = resolve; }); };
  f.cloud.getForecast = async () => { readStarted(); return new Promise(resolve => { releaseRead = resolve; }); };
  const snapshots: WeatherEvidenceResult[] = [];
  const combined = new TotalCloudCompositeAdapter({ key: "primary", getHourly: async () => primaryResult() }, f.cloud, 25);
  const pending = combined.getHourly({ ...input, onIndependentResult: value => snapshots.push(value) });
  await selecting;
  releaseSelect(f.pin); await reading;
  const result = await pending;
  assert.equal(result.value?.[0]?.temperatureC, 13);
  assert.equal(result.totalCloud?.state, "UNAVAILABLE");
  assert.equal(result.totalCloud?.source.id, f.pin.publicationId);
  assert.equal(selections, 1);
  const count = snapshots.length;
  releaseRead(readyCloud); await nextTurn();
  assert.equal(snapshots.length, count, "retired acquisition cannot emit a late completed source");
  assert.equal(result.totalCloud?.state, "UNAVAILABLE");
});

test("same-pin exact cloud projection preserves other weather hours and official warning identity", async t => {
  const f = await fixture(t), result = await f.weather.getHourly({ ...input, totalCloud: f.pin });
  assert.equal(f.counts().selections, 0);
  assert.equal(result.value![0]!.cloudPercent, null, "a QWeather-labelled row must not carry ECMWF values");
  assert.deepEqual(result.alerts, primaryResult().alerts);
  assert.equal(result.warningSource?.id, "test:official-alert");
  const projected = projectWeatherAt(result, at(18.5), NOW);
  assert.equal(projected.weatherAt, at(18));
  assert.equal(projected.weather?.temperatureC, 13);
  assert.equal(projected.weather?.cloudPercent, 50);
  assert.equal(projected.cloudEvidence?.publicationId, f.pin.publicationId);
  assert.equal(Date.parse(projected.cloudEvidence!.selectedAt), Date.parse(at(18.5)));
  assert.equal(Date.parse(projected.cloudEvidence!.lowerAt), Date.parse(at(18)));
  assert.equal(Date.parse(projected.cloudEvidence!.upperAt), Date.parse(at(21)));
  const cloudOnly = projectWeatherAt(result, at(19.5), NOW);
  assert.equal(cloudOnly.weatherAt, null);
  assert.equal(cloudOnly.weather, null);
  assert.equal(cloudOnly.cloudPercent, 50, "independent total cloud survives a non-cloud forecast hole");
  assert.equal(projectWeatherAt(result, at(18.5), Date.parse(f.pin.supports240HoursUntil) + 1).cloudPercent, null);
});

test("native zero and bounded interpolation survive real numeric reads without extrapolation", async t => {
  const f = await fixture(t), result = await f.cloud.getForecast({ binding: f.pin, point, windowUtc: { start: at(0), end: at(3) } });
  assert(result.value);
  assert.equal(cloudPointSeriesAt(result.value, at(0), NOW)?.cloudPercent, 0);
  assert.equal(cloudPointSeriesAt(result.value, at(1.5), NOW)?.cloudPercent, 50);
  assert.equal(cloudPointSeriesAt(result.value, at(3), NOW)?.cloudPercent, 100);
  assert.equal(cloudPointSeriesAt(result.value, at(3.25), NOW), null);
  assert.equal(cloudPointSeriesAt(result.value, at(-.25), NOW), null);
});

test("missing native endpoint and expired publication never fall back to primary cloud", async t => {
  let now = NOW;
  const f = await fixture(t, { now: () => now, failFrame: step => step === 21 ? "file_read_failed" : null });
  const result = await f.weather.getHourly({ ...input, totalCloud: f.pin });
  assert.equal(result.totalCloud?.state, "PARTIAL");
  assert.equal(projectWeatherAt(result, at(18), NOW).cloudPercent, 50);
  const hole = projectWeatherAt(result, at(18.5), NOW);
  assert.equal(hole.cloudPercent, null);
  assert.equal(hole.cloudEvidence, null);
  assert.equal(hole.weather?.temperatureC, 13);
  assert.equal(hole.weather?.cloudPercent, null);
  const reads = f.counts().frameReads;
  now = Date.parse(f.pin.supports240HoursUntil) + 1;
  const expired = await f.weather.getHourly({ ...input, totalCloud: f.pin });
  assert.equal(expired.totalCloud?.state, "EXPIRED");
  assert.equal(projectWeatherAt(expired, at(18.5), now).cloudPercent, null);
  assert.equal(f.counts().frameReads, reads, "expired input cannot issue another frame read");
});

test("cloud-only snapshots explicitly retain missing other weather and no invented hazard flags", async t => {
  const f = await fixture(t, { primary: { key: "failed-primary", getHourly: async () => { throw new Error("primary_provider_failed"); } } });
  const result = await f.weather.getHourly({ ...input, totalCloud: f.pin });
  assert.equal(result.value, null);
  assert.equal(result.state, "PARTIAL");
  const rows = weatherSnapshotHours(result, input.windowUtc, NOW);
  assert.equal(rows.length, 3);
  for (const row of rows) {
    assert("schemaVersion" in row);
    assert.equal(row.schemaVersion, "weather-snapshot-hour-v2");
    assert.equal(row.weatherAt, null);
    assert.equal(row.weather, null);
    assert.equal(row.cloudPercent, 50);
    assert.equal(row.cloudEvidence?.publicationId, f.pin.publicationId);
    assert.equal("thunderstorm" in row, false);
  }
});

test("legacy null selects nothing; one contextless batch selection remains pinned after current changes", async t => {
  const f = await fixture(t), legacy = await f.weather.getHourly({ ...input, totalCloud: null });
  assert.equal(legacy.value![0]!.cloudPercent, 73);
  assert.equal(legacy.totalCloud, undefined);
  assert.equal(projectWeatherAt(legacy, at(18.5), NOW).cloudEvidence, undefined);
  assert.deepEqual(f.counts(), { selections: 0, frameReads: 0, primaryReads: 1 });
  const binding = await f.weather.selectTotalCloud();
  f.selectCurrent(null);
  const batch = await Promise.all([f.weather.getHourly({ ...input, totalCloud: binding }),
    f.weather.getHourly({ ...input, point: { ...point, latitude: 22.96 }, totalCloud: binding })]);
  assert.equal(f.counts().selections, 1);
  assert(batch.every(result => result.totalCloud?.value?.binding.publicationId === f.pin.publicationId));
  assert(batch.every(result => projectWeatherAt(result, at(18.5), NOW).cloudPercent === 50));
});

test("shared queue overload stops this point read while retaining qualified native endpoints", async t => {
  const f = await fixture(t, { failFrame: step => step === 18 ? "file_read_failed" : step === 21 ? "cloud_publication_read_queue_full" : null });
  const result = await f.cloud.getForecast({ binding: f.pin, point, windowUtc: { start: at(15), end: at(30) } });
  assert.equal(result.errorCode, "cloud_publication_read_queue_full");
  assert.equal(f.counts().frameReads, 3);
  assert(result.value);
  assert.equal(cloudPointSeriesAt(result.value, at(15), NOW)?.cloudPercent, 50);
  assert.equal(cloudPointSeriesAt(result.value, at(15.5), NOW), null);
  assert(result.value.frames.slice(1).every(frame => frame.quality === "READ_FAILED"));
});

test("Sky and Map compose one negotiated pin without using legacy cloud polygons or erasing cloud-only rows", async t => {
  t.mock.timers.enable({ apis: ["Date"], now: NOW });
  const f = await fixture(t), spot = { ...TEST_PUBLISHED_SPOT, wgs84: point };
  const service = createTestMiniappService({ repository: new InMemoryTestRepository([spot]),
    weather: f.weather, cloudPublications: f.registry });
  try {
    const context = (await service.resolveObservationContext({ location: { kind: "FORMAL_SPOT", spotId: spot.spotId },
      localDate: "2026-10-27", selectedAt: at(18.5), totalCloudPolicy: TOTAL_CLOUD_POLICY })).data;
    assert.deepEqual(context.weatherView.totalCloud, f.pin);
    const report = (await service.getSky(spot.spotId, context.contextId)).data;
    const row = report.hourly.find(row => row.at === at(18.5))!;
    assert.equal(row.weatherAt, at(18)); assert.equal(row.cloudPercent, 50); assert.equal(row.temperatureC, 13);
    assert.equal(row.cloudEvidence?.publicationId, f.pin.publicationId);
    assert(row.opportunityBlockers.includes("OFFICIAL_SEVERE_WEATHER_ALERT"));
    const cloudOnly = report.hourly.find(row => row.at === at(19.5))!;
    assert.equal(cloudOnly.weatherAt, null); assert.equal(cloudOnly.cloudPercent, 50); assert.equal(cloudOnly.temperatureC, null);
    assert.equal(cloudOnly.state, "PARTIAL");
    assert(cloudOnly.opportunityBlockers.includes("CRITICAL_WEATHER_DATA_UNAVAILABLE"));
    assert.equal(report.weatherEvidence.totalCloud?.value?.binding.publicationId, f.pin.publicationId);
    const readsBeforeMap = f.counts().primaryReads;
    const map = (await service.getMapScene({ contextId: context.contextId, layer: "CLOUD" })).data;
    const mapRow = map.timeFrames.find(row => row.atUtc === at(19.5))!;
    assert.equal(mapRow.spotSignals[spot.spotId]?.cloudPercent, 50);
    assert.equal(mapRow.spotSignals[spot.spotId]?.cloudEvidence?.publicationId, f.pin.publicationId);
    assert.deepEqual(mapRow.dynamicLayer?.polygons, []);
    assert.equal(f.counts().primaryReads, readsBeforeMap, "combined Map cannot issue nine legacy QWeather samples");
    await assert.rejects(service.getMapCloud({ contextId: context.contextId, viewport: { center: { latitude: 22.95, longitude: 113.05 },
      bounds: { west: 113, east: 113.1, south: 22.9, north: 23 }, zoom: 10 } }), /cloud_grid_provider_not_ready/);
    assert.deepEqual(classifyExceptionMessage("cloud_grid_provider_not_ready"), { status: 503, code: "PROVIDER_UNAVAILABLE", retryable: true });
    await assert.rejects(service.getMapCloud({ contextId: context.contextId, viewport: { center: { latitude: 22.95, longitude: 113.05 },
      bounds: { west: 113, east: 113.1, south: 22.9, north: 23 }, zoom: 10 }, selectedAt: "2026-10-28T02:17:12.345+08:00" }), /cloud_grid_provider_not_ready/);
    assert.deepEqual(await service.observationContexts.get(context.contextId), context, "a precise read never commits or changes the Context");
    await assert.rejects(service.getMapCloud({ contextId: context.contextId, viewport: { center: { latitude: 22.95, longitude: 113.05 },
      bounds: { west: 113, east: 113.1, south: 22.9, north: 23 }, zoom: 10 }, selectedAt: "2026-02-30T12:00:00Z" }), /map_cloud_selected_at_invalid/);
    assert.deepEqual(classifyExceptionMessage("map_cloud_selected_at_invalid"), { status: 400, code: "INVALID_INPUT", retryable: false });
    assert.equal(f.counts().selections, 1, "only Context resolution chooses latest");
    const legacy = (await service.resolveObservationContext({ location: { kind: "FORMAL_SPOT", spotId: spot.spotId },
      localDate: "2026-10-27", selectedAt: at(18.5) })).data;
    const oldReport = (await service.getSky(spot.spotId, legacy.contextId)).data;
    assert.equal(oldReport.hourly.find(row => row.at === at(18.5))?.cloudPercent, 73,
      "same-point/date legacy Context must not reuse a new-pin weather cache entry");
    assert.equal(oldReport.weatherEvidence.totalCloud, undefined);
    assert.equal(oldReport.hourly.find(row => row.at === at(18.5))?.cloudEvidence, undefined);
    assert.equal(f.counts().primaryReads, readsBeforeMap + 1);
    assert.equal(f.counts().selections, 1, "legacy report must pass explicit null instead of chasing current");
    const readsBeforePreview = f.counts().primaryReads;
    await assert.rejects(service.getMapCloud({ contextId: legacy.contextId, viewport: { center: { latitude: 22.95, longitude: 113.05 },
      bounds: { west: 113, east: 113.1, south: 22.9, north: 23 }, zoom: 10 }, selectedAt: at(19.5) }), /map_cloud_preview_unsupported/);
    assert.deepEqual(classifyExceptionMessage("map_cloud_preview_unsupported"), { status: 400, code: "INVALID_INPUT", retryable: false });
    assert.equal(f.counts().primaryReads, readsBeforePreview, "a legacy preview cannot start nine new QWeather reads");
  } finally { await service.onModuleDestroy(); }
});

test("cloud-only Sky has its own cache life and expires without borrowing primary cloud", async t => {
  t.mock.timers.enable({ apis: ["Date"], now: NOW });
  let primaryReads = 0;
  const f = await fixture(t, { now: () => Date.now(), primary: { key: "unavailable-primary",
    getHourly: async () => { primaryReads++; throw new Error("primary_provider_failed"); } } });
  const spot = { ...TEST_PUBLISHED_SPOT, wgs84: point };
  const service = createTestMiniappService({ repository: new InMemoryTestRepository([spot]),
    weather: f.weather, cloudPublications: f.registry });
  try {
    const context = (await service.resolveObservationContext({ location: { kind: "FORMAL_SPOT", spotId: spot.spotId },
      localDate: "2026-10-27", selectedAt: at(18.5), totalCloudPolicy: TOTAL_CLOUD_POLICY })).data;
    const first = (await service.getSky(spot.spotId, context.contextId)).data;
    assert.equal(first.hourly.find(row => row.at === at(18.5))?.cloudPercent, 50);
    assert.equal(first.hourly.find(row => row.at === at(18.5))?.weatherAt, null);
    await service.getSky(spot.spotId, context.contextId);
    assert.equal(primaryReads, 1, "weather.value null cannot immediately evict an independent valid cloud source");
    t.mock.timers.tick(Date.parse(f.pin.supports240HoursUntil) + 1 - NOW);
    const expired = (await service.getSky(spot.spotId, context.contextId)).data;
    assert.equal(expired.weatherEvidence.totalCloud?.state, "EXPIRED");
    assert.equal(expired.weatherEvidence.totalCloud?.value, null);
    assert.equal(expired.hourly.find(row => row.at === at(18.5))?.cloudPercent, null);
    assert.equal(expired.hourly.find(row => row.at === at(18.5))?.cloudEvidence, null);
    assert.equal(primaryReads, 2);
    assert.equal(f.counts().selections, 1, "expiration cannot replace the Context's pin with current");
  } finally { await service.onModuleDestroy(); }
});
