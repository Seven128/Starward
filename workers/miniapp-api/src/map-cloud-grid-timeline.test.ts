import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import test, { type TestContext } from "node:test";
import { mapCloudReadInstant, mapCloudGridAvailabilityAt, mapCloudGridReadMatches, projectMapCloudGridTimeline,
  type ObservationContext } from "@starward/miniapp-contracts";
import { CloudPointWeather, unavailableCloudForecast } from "./cloud-point-weather.ts";
import { CloudNumericPublication, assertCloudBatch } from "./cloud-publication.ts";
import { cloudContextPin, type CloudPublicationRegistry } from "./cloud-publication-registry.ts";
import { createCloudPublicationFixture } from "./test-fixtures/cloud-publication-fixture.ts";
import { createTestMiniappService } from "./test-fixtures/create-test-service.ts";

const hash = (bytes: Buffer | string) => createHash("sha256").update(bytes).digest("hex");
const point = { system: "WGS84" as const, latitude: 22.95, longitude: 113.05 };
const stamp = (hours: number) => new Date(Date.parse("2026-10-27T00:00:00Z") + hours * 3_600_000).toISOString().replace(".000Z", "Z");
const now = Date.parse(stamp(18.5));

async function fixture(t: TestContext, mode: "normal" | "missing" | "failed" | "all-missing" | "all-unavailable" = "normal") {
  const data = await createCloudPublicationFixture(); t.after(() => data.dispose());
  let manifestSha256 = data.manifestSha256;
  if (mode === "missing" || mode === "all-missing" || mode === "all-unavailable") {
    const values = Buffer.alloc(16), mask = Buffer.alloc(4);
    for (let index = 0; index < 4; index++) values.writeFloatLE(NaN, index * 4);
    const file = `tcc-${hash(values)}`;
    await writeFile(path.join(data.directory, file + ".f32"), values);
    await writeFile(path.join(data.directory, file + ".mask"), mask);
    const missingSteps = mode === "all-missing" ? [0, 3, 6] : mode === "all-unavailable" ? [0, 6] : [3];
    for (const frame of data.manifest.frames.filter(frame => missingSteps.includes(frame.stepHours))) {
      frame.values = { file: file + ".f32", bytes: values.length, sha256: hash(values) };
      frame.mask = { file: file + ".mask", bytes: mask.length, sha256: hash(mask) };
      frame.validSamples = 0; frame.missingSamples = 4;
    }
    data.manifest.contentSha256 = hash(`synthetic-${mode}-frame`);
    data.manifest.publicationId = `ecmwf-tcc:${data.manifest.contentSha256}`;
    const raw = JSON.stringify(data.manifest); manifestSha256 = hash(raw);
    await writeFile(path.join(data.directory, "manifest.json"), raw);
  }
  if (mode === "failed" || mode === "all-unavailable") {
    const frame = data.manifest.frames.find(frame => frame.stepHours === 3)!;
    const file = path.join(data.directory, frame.values.file), damaged = await readFile(file);
    damaged[0] = damaged[0]! ^ 1; await writeFile(file, damaged);
  }
  const manifest = assertCloudBatch(data.manifest), binding = cloudContextPin(manifest, manifestSha256);
  const publications: Pick<CloudPublicationRegistry, "read" | "selectCurrent"> = {
    selectCurrent: async () => binding,
    read: async (pin, signal) => {
      assert.equal(pin.manifestSha256, manifestSha256);
      return CloudNumericPublication.open(data.directory, manifestSha256, signal);
    },
  };
  const weather = new CloudPointWeather(publications, () => now);
  const forecast = await weather.getForecast({ binding, point, windowUtc: { start: stamp(0), end: stamp(6) } });
  return { binding, forecast, weather };
}

test("the actual numeric owner keeps zero and precise interpolation AVAILABLE while display remains NOT_READY", async t => {
  const f = await fixture(t);
  const zero = projectMapCloudGridTimeline({ ...f, point, requestedAt: stamp(0), now });
  assert.equal(zero.gridTimeline.selection.state, "AVAILABLE");
  assert.equal(zero.gridTimeline.selection.evidence?.cloudPercent, 0);
  assert.equal(zero.gridTimeline.display.state, "NOT_READY");
  assert.equal("imageUrl" in zero.gridTimeline, false);
  const exact = "2026-10-27T02:30:12.345Z";
  const selected = projectMapCloudGridTimeline({ ...f, point, requestedAt: exact, now });
  assert.equal(selected.requestedAt, exact);
  assert.equal(selected.gridTimeline.selection.evidence?.selectedAt, exact);
  assert.equal(selected.gridTimeline.selection.evidence?.lowerAt, stamp(0));
  assert.equal(selected.gridTimeline.selection.evidence?.upperAt, stamp(3));
  assert.equal(selected.gridTimeline.selection.evidence?.cloudPercent, (Date.parse(exact) - Date.parse(stamp(0))) / (3 * 3_600_000) * 100);
  assert.deepEqual(selected.gridTimeline.intervals, [{ start: stamp(0), end: stamp(6) }]);
  assert.equal(mapCloudReadInstant("2026-10-27T10:30:12.345+08:00"), exact);
  for (const invalid of ["2026-02-30T12:00:00Z", "2026-10-27T02:30:12", "", [exact]])
    assert.throws(() => mapCloudReadInstant(invalid), /map_cloud_selected_at_invalid/u);
});

test("actual mask absence and failed reads do not become zero or missing images", async t => {
  const missing = await fixture(t, "missing"), failed = await fixture(t, "failed");
  const gap = projectMapCloudGridTimeline({ ...missing, point, requestedAt: stamp(1.5), now });
  assert.equal(gap.gridTimeline.selection.state, "SOURCE_MISSING");
  assert.equal(gap.gridTimeline.selection.evidence, null);
  assert.deepEqual(gap.gridTimeline.intervals, [{ start: stamp(0), end: stamp(0) }, { start: stamp(6), end: stamp(6) }]);
  assert.equal(gap.gridTimeline.display.state, "NOT_READY", "one missing point cannot declare an entire image source-missing");
  assert.equal(mapCloudGridAvailabilityAt(gap.gridTimeline, stamp(0), now).evidence?.cloudPercent, 0);
  const readFailure = projectMapCloudGridTimeline({ ...failed, point, requestedAt: stamp(1.5), now });
  assert.equal(readFailure.gridTimeline.selection.state, "READ_FAILED");
  assert.equal(readFailure.gridTimeline.display.state, "NOT_READY");
});

test("an all-missing numeric read preserves source absence without claiming another date was read", async t => {
  const f = await fixture(t, "all-missing");
  assert.equal(f.forecast.value, null);
  assert.equal(f.forecast.state, "UNAVAILABLE");
  assert.equal(f.forecast.errorCode, null, "source masks are not a read error");
  const model = projectMapCloudGridTimeline({ ...f, point, requestedAt: stamp(1.5), now });
  assert.equal(model.gridTimeline.selection.state, "SOURCE_MISSING");
  assert.equal(model.gridTimeline.selection.evidence, null);
  assert.deepEqual(model.gridTimeline.intervals, []);
  assert.equal(model.gridTimeline.display.state, "NOT_READY");
  assert.equal(mapCloudGridAvailabilityAt(model.gridTimeline, stamp(240), now).state, "NOT_READ");
  assert.equal(mapCloudGridAvailabilityAt(model.gridTimeline, stamp(265), now).state, "OUTSIDE_COVERAGE");
  assert.equal(mapCloudGridAvailabilityAt(model.gridTimeline, stamp(1.5), Date.parse(f.binding.supports240HoursUntil) + 1).state, "EXPIRED");
  assert.throws(() => projectMapCloudGridTimeline({ ...f, point: { ...point, longitude: 113.06 },
    requestedAt: stamp(1.5), now }), /identity_mismatch/u, "native absence facts retain their actual query point");
});

test("crop absence, an unread source date and an unknown failure remain distinct", async t => {
  const f = await fixture(t), windowUtc = { start: stamp(0), end: stamp(6) };
  for (const longitude of [112, 113 - 5e-8]) {
    const outsidePoint = { ...point, longitude };
    const forecast = await f.weather.getForecast({ binding: f.binding, point: outsidePoint, windowUtc });
    assert.equal(forecast.value, null);
    assert.equal(forecast.errorCode, null);
    assert.equal(projectMapCloudGridTimeline({ binding: f.binding, point: outsidePoint, forecast,
      requestedAt: stamp(1.5), now }).gridTimeline.selection.state, "OUTSIDE_COVERAGE");
    assert.throws(() => projectMapCloudGridTimeline({ binding: f.binding, point, forecast,
      requestedAt: stamp(1.5), now }), /identity_mismatch/u, "crop absence cannot be reused for another point");
  }
  const edgePoint = { ...point, longitude: 113 - 1e-11 };
  const edge = await f.weather.getForecast({ binding: f.binding, point: edgePoint, windowUtc });
  assert.equal(projectMapCloudGridTimeline({ binding: f.binding, point: edgePoint, forecast: edge,
    requestedAt: stamp(0), now }).gridTimeline.selection.evidence?.cloudPercent, 0, "the original sampler's edge convention remains valid");
  const unread = await f.weather.getForecast({ binding: f.binding, point, windowUtc: { start: stamp(-3), end: stamp(0) } });
  const model = projectMapCloudGridTimeline({ binding: f.binding, point, forecast: unread, requestedAt: stamp(0), now });
  assert.equal(unread.value, null);
  assert.equal(unread.errorCode, null);
  assert.equal(model.gridTimeline.selection.state, "NOT_READ");
  assert.equal(mapCloudGridAvailabilityAt(model.gridTimeline, stamp(-1), now).state, "OUTSIDE_COVERAGE");
  assert.equal(projectMapCloudGridTimeline({ binding: f.binding, point,
    forecast: unavailableCloudForecast(f.binding, null), requestedAt: stamp(1.5), now }).gridTimeline.selection.state, "UNAVAILABLE");
});

test("an entirely unavailable native window retains each endpoint's missing or failed-read meaning", async t => {
  const f = await fixture(t, "all-unavailable");
  assert.equal(f.forecast.value, null);
  assert.equal(f.forecast.state, "UNAVAILABLE");
  assert.equal(f.forecast.errorCode, "cloud_publication_read_failed");
  const model = projectMapCloudGridTimeline({ ...f, point, requestedAt: stamp(0), now });
  assert.equal(model.gridTimeline.selection.state, "SOURCE_MISSING");
  assert.equal(mapCloudGridAvailabilityAt(model.gridTimeline, stamp(1.5), now).state, "READ_FAILED");
  assert.equal(mapCloudGridAvailabilityAt(model.gridTimeline, stamp(6), now).state, "SOURCE_MISSING");
  assert.equal(mapCloudGridAvailabilityAt(model.gridTimeline, stamp(240), now).state, "NOT_READ");
});

test("one night of scalar reads does not shorten the pin's 240h/date horizon or revive an expired series", async t => {
  const f = await fixture(t), model = projectMapCloudGridTimeline({ ...f, point, requestedAt: stamp(1.5), now });
  assert.equal(mapCloudGridAvailabilityAt(model.gridTimeline, stamp(240), now).state, "NOT_READ");
  assert.equal(model.gridTimeline.binding.state, "PINNED");
  assert.equal(model.gridTimeline.binding.state === "PINNED" && model.gridTimeline.binding.validTo, stamp(264).replace(".000Z", "Z"));
  assert.equal(mapCloudGridAvailabilityAt(model.gridTimeline, stamp(265), now).state, "OUTSIDE_COVERAGE");
  const until = Date.parse(f.binding.supports240HoursUntil);
  assert.equal(mapCloudGridAvailabilityAt(model.gridTimeline, stamp(1.5), until).state, "AVAILABLE");
  assert.equal(mapCloudGridAvailabilityAt(model.gridTimeline, stamp(1.5), until + 1).state, "EXPIRED");
  const expired = projectMapCloudGridTimeline({ ...f, point, forecast: { ...f.forecast, state: "EXPIRED" }, requestedAt: stamp(1.5), now });
  assert.equal(expired.gridTimeline.selection.state, "EXPIRED");
  assert.deepEqual(expired.gridTimeline.intervals, []);
});

test("a grid read result matches its independent requested time and unchanged committed Context", async t => {
  const f = await fixture(t), service = createTestMiniappService();
  t.after(() => service.onModuleDestroy());
  const legacy = (await service.resolveObservationContext({ location: { kind: "MAP_POINT", source: "MAP_VIEWPORT",
    displayName: "controlled public time reference", wgs84: point, timezoneHint: "Asia/Shanghai" },
    localDate: "2026-10-27", selectedAt: stamp(18.5) })).data;
  const context: ObservationContext = { ...legacy, weatherView: { ...legacy.weatherView, totalCloud: f.binding } };
  const before = structuredClone(context), read = projectMapCloudGridTimeline({ ...f, point, requestedAt: stamp(1.5), now });
  const result = { context, ...read };
  assert.equal(mapCloudGridReadMatches(result, context, stamp(1.5)), true);
  assert.deepEqual(context, before);
  assert.notEqual(result.requestedAt, result.context.selectedAtUtc);
  assert.equal(mapCloudGridReadMatches({ context }, context, stamp(1.5)), false, "old response cannot satisfy a precise grid read");
  assert.equal(mapCloudGridReadMatches(result, context, stamp(2)), false);
  assert.equal(mapCloudGridReadMatches({ ...result, context: { ...context, selectedAtUtc: read.requestedAt } }, context, stamp(1.5)), false);
  assert.equal(mapCloudGridReadMatches({ ...result, context: { ...context, revision: context.revision + 1 } }, context, stamp(1.5)), false);
  assert.equal(mapCloudGridReadMatches({ ...result, context: legacy }, context, stamp(1.5)), false);
  if (result.gridTimeline.selection.state === "AVAILABLE") assert.equal(mapCloudGridReadMatches({ ...result,
    gridTimeline: { ...result.gridTimeline, selection: { state: "AVAILABLE", evidence: {
      ...result.gridTimeline.selection.evidence, publicationId: "wrong-publication" } } } }, context, stamp(1.5)), false);
  assert.throws(() => projectMapCloudGridTimeline({ ...f, point: { ...point, longitude: 113.06 }, requestedAt: stamp(1.5), now }), /identity_mismatch/u);
});
