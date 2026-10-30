import assert from "node:assert/strict";
import test from "node:test";
import type { HourlySkyRow } from "@starward/miniapp-contracts";
import { presentSkyTime } from "./sky-time-presentation";
import { skyTimeTestFixture } from "./sky-time-test-support";
import { totalCloudClientFixture } from "../../services/total-cloud-test-support";

function fixture() {
  const { source } = skyTimeTestFixture(), cloud = totalCloudClientFixture("2026-09-30T00:00:00.000Z");
  const now = Date.parse("2026-09-30T13:55:00.000Z");
  const report = { ...source.data, weatherEvidence: { ...source.data.weatherEvidence, totalCloud: cloud.forecast },
    hourly: source.data.hourly.map(row => {
      const hours = (Date.parse(row.at) - Date.parse(cloud.binding.runAt)) / 3_600_000, evidence = cloud.evidence(hours);
      return { ...row, cloudEvidence: evidence, cloudPercent: evidence.cloudPercent };
    }) };
  return { report, cloud, now };
}

test("continuous Sky cloud uses exact native interpolation while other fields retain the same QWeather hour", () => {
  const { report, cloud, now } = fixture(), before = structuredClone(report);
  const at = "2026-09-30T14:15:17.123Z", laterAt = "2026-09-30T14:45:17.123Z";
  const current = presentSkyTime(report, at, undefined, undefined, now), later = presentSkyTime(report, laterAt, undefined, undefined, now);
  assert(current?.weather); assert(later?.weather);
  assert.equal(current.mode, "MODEL"); assert.equal(later.mode, "MODEL");
  assert.equal(current.weather.weatherAt, later.weather.weatherAt);
  assert.notEqual(current.weather.cloudPercent, later.weather.cloudPercent);
  assert.equal(current.weather.cloudEvidence?.selectedAt, at);
  assert.equal(current.weather.cloudEvidence?.publicationId, cloud.binding.publicationId);
  assert.equal(Date.parse(current.weather.cloudEvidence!.lowerAt), Date.parse("2026-09-30T12:00:00Z"));
  assert.equal(Date.parse(current.weather.cloudEvidence!.upperAt), Date.parse("2026-09-30T15:00:00Z"));
  assert.equal(current.weather.temperatureC, later.weather.temperatureC);
  const exact = presentSkyTime(report, "2026-09-30T14:00:00.000Z", undefined, undefined, now);
  assert(exact?.weather); assert.equal(exact.mode, "EXACT");
  assert.equal(exact.weather.cloudPercent, cloud.evidence(14).cloudPercent);
  assert.deepEqual(report, before, "preview never writes a Play tick or resampled cloud into the report cache");
});

test("cloud-only preview preserves geometry and rejects missing native endpoints without borrowing another source", () => {
  const { report, cloud, now } = fixture(), at = "2026-09-30T14:15:17.123Z";
  const noOtherWeather = { ...report, hourly: report.hourly.map(row => ({ ...row, weatherAt: null,
    precipitationMm: null, precipitationProbabilityPercent: null, windKph: null, windGustKph: null, windDirectionDeg: null,
    temperatureC: null, relativeHumidityPercent: null, dewPointC: null, visibilityKm: null })) };
  const current = presentSkyTime(noOtherWeather, at, undefined, undefined, now);
  assert(current?.weather?.cloudEvidence); assert.equal(current.weather.weatherAt, null); assert.equal(current.weather.temperatureC, null);
  assert.equal(current.row.at, at); assert.notEqual(current.row.sunAltitudeDeg, null);
  const gap = { ...report, weatherEvidence: { ...report.weatherEvidence, totalCloud: { ...cloud.forecast, value: { ...cloud.series,
    frames: cloud.series.frames.map(frame => frame.stepHours === 15 ? { ...frame, fraction: null, quality: "MISSING" as const } : frame) } } } };
  const missing = presentSkyTime(gap, at, undefined, undefined, now);
  assert(missing?.weather); assert.equal(missing.weather.cloudPercent, null); assert.equal(missing.weather.cloudEvidence, null);
  assert.notEqual(missing.weather.weatherAt, null); assert.notEqual(missing.weather.temperatureC, null);
  const expired = presentSkyTime(noOtherWeather, at, undefined, undefined, Date.parse(cloud.binding.supports240HoursUntil) + 1);
  assert(expired); assert.equal(expired.weather, null); assert.equal(expired.row.at, at);
});

test("new cloud variation cannot mask contradictory other-weather copies, and legacy conflict semantics remain", () => {
  const { report, now } = fixture(), at = "2026-09-30T14:15:17.123Z";
  const sameHour = report.hourly.filter(row => row.weatherAt && Date.parse(row.weatherAt) <= Date.parse(at) &&
    Date.parse(at) < Date.parse(row.weatherAt) + 3_600_000);
  assert(sameHour.length >= 2);
  const inconsistent = { ...report, hourly: report.hourly.map(row => row === sameHour[1] ? { ...row, windKph: 999 } : row) };
  const current = presentSkyTime(inconsistent, at, undefined, undefined, now);
  assert(current?.weather?.cloudEvidence); assert.equal(current.weather.weatherAt, null);
  assert.equal(current.weather.windKph, null);
  const { totalCloud: _totalCloud, ...legacyWeather } = report.weatherEvidence;
  const legacy = { ...report, weatherEvidence: legacyWeather,
    hourly: report.hourly.map(({ cloudEvidence: _cloudEvidence, ...row }) => row) };
  assert.equal(presentSkyTime(legacy, at, undefined, undefined, now)?.weather, null,
    "conflicting legacy cloud values in the same provider hour stay unusable");
});
