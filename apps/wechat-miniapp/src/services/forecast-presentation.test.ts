import assert from "node:assert/strict";
import test from "node:test";
import type { HourlySkyRow, MapSceneData, SkyReport } from "@starward/miniapp-contracts";
import { currentTotalCloudEvidence, mapForecastPresentation, skyForecastPresentation } from "./forecast-presentation";
import { totalCloudClientFixture } from "./total-cloud-test-support";

function fixture() {
  const cloud = totalCloudClientFixture(), at = cloud.stamp(11.5), weatherAt = cloud.stamp(11);
  const row = { at, weatherAt, cloudPercent: cloud.evidence(11.5).cloudPercent, cloudEvidence: cloud.evidence(11.5),
    precipitationMm: 0, precipitationProbabilityPercent: 0, windKph: 5, windGustKph: 7, windDirectionDeg: 80,
    temperatureC: 18, relativeHumidityPercent: 60, dewPointC: 10, visibilityKm: 20,
    opportunityScore: 80, opportunityConfidence: .9, opportunityEligible: true, opportunityBlockers: [],
    opportunityInput: { weatherTransmission: .8 }, state: "FRESH" } as unknown as HourlySkyRow;
  const report = { hourly: [row], weatherEvidence: { totalCloud: cloud.forecast, timelineRole: "PRIMARY", alerts: [], modelRuns: [] } } as unknown as SkyReport;
  return { cloud, at, row, report, hourEnd: Date.parse(cloud.stamp(12)), cloudEnd: Date.parse(cloud.binding.supports240HoursUntil) };
}

test("Sky keeps qualified cloud after QWeather expires, then expires cloud on its own bound", () => {
  const { cloud, row, report, hourEnd, cloudEnd } = fixture(), before = structuredClone(report);
  const weatherExpired = skyForecastPresentation.project(report, hourEnd);
  assert.equal(weatherExpired.hourly[0]!.cloudPercent, row.cloudPercent);
  assert.equal(weatherExpired.hourly[0]!.cloudEvidence, row.cloudEvidence);
  assert.equal(weatherExpired.hourly[0]!.weatherAt, null);
  assert.equal(weatherExpired.hourly[0]!.temperatureC, null);
  assert.equal(weatherExpired.hourly[0]!.windKph, null);
  assert.equal(weatherExpired.hourly[0]!.opportunityEligible, false);
  assert.equal(weatherExpired.weatherEvidence.timelineRole, "PRIMARY");
  assert(skyForecastPresentation.boundaries(report).includes(cloudEnd + 1));
  assert.equal(skyForecastPresentation.project(report, cloudEnd).hourly[0]!.cloudPercent, row.cloudPercent);
  const expired = skyForecastPresentation.project(weatherExpired, cloudEnd + 1);
  assert.equal(expired.hourly[0]!.cloudPercent, null); assert.equal(expired.hourly[0]!.cloudEvidence, null);
  assert.equal(expired.weatherEvidence.timelineRole, "UNAVAILABLE");
  assert.equal(expired.weatherEvidence.totalCloud?.value, cloud.forecast.value, "retained native history is not replaced or extended");
  assert.equal(expired.weatherEvidence.totalCloud?.state, "EXPIRED");
  assert.equal(cloud.forecast.state, "FRESH", "the acquired report remains immutable");
  assert.deepEqual(report, before);
});

test("new cloud gaps do not borrow QWeather while valid other-weather fields stay available", () => {
  const { report, row, hourEnd } = fixture();
  const gap = { ...report, hourly: [{ ...row, cloudPercent: 75, cloudEvidence: null }] };
  const projected = skyForecastPresentation.project(gap, hourEnd - 1);
  assert.equal(projected.hourly[0]!.cloudPercent, null);
  assert.equal(projected.hourly[0]!.weatherAt, row.weatherAt);
  assert.equal(projected.hourly[0]!.temperatureC, 18);
  assert.equal(currentTotalCloudEvidence({ ...row.cloudEvidence!, selectedAt: row.weatherAt! }, row.at, hourEnd - 1), null);
  const legacyRow = { ...row, cloudPercent: 75 }; delete legacyRow.cloudEvidence;
  const legacy = { ...report, hourly: [legacyRow] };
  assert.equal(skyForecastPresentation.project(legacy, hourEnd - 1).hourly[0]!.cloudPercent, 75);
  assert.equal(skyForecastPresentation.project(legacy, hourEnd).hourly[0]!.cloudPercent, null);
});

test("header-only native coverage expires independently when every displayed row lacks cloud", () => {
  const { cloud, row, report, cloudEnd } = fixture();
  const frames = cloud.series.frames.filter(frame => frame.stepHours >= 123 && frame.stepHours <= 150).map(frame => frame.stepHours === 123
    ? frame : { ...frame, fraction: null, quality: "MISSING" as const });
  const totalCloud = { ...cloud.forecast, value: { ...cloud.series, frames } };
  const other = { ...cloud.forecast.source, id: "qweather:independent", state: "FRESH" as const };
  const currentRow = { ...row, at: cloud.stamp(124.5), weatherAt: cloud.stamp(124), cloudPercent: null, cloudEvidence: null };
  const source = { ...report, hourly: [currentRow], sources: [other, totalCloud.source],
    weatherEvidence: { ...report.weatherEvidence, totalCloud } };
  const before = structuredClone(source);
  assert(skyForecastPresentation.boundaries(source).includes(cloudEnd + 1));
  assert.equal(skyForecastPresentation.project(source, cloudEnd), source, "the stated deadline itself remains qualified");
  const expired = skyForecastPresentation.project(source, cloudEnd + 1);
  assert.notEqual(expired, source);
  assert.equal(expired.weatherEvidence.totalCloud?.state, "EXPIRED");
  assert.equal(expired.weatherEvidence.totalCloud?.value, totalCloud.value, "native history identity is retained");
  assert.equal(expired.weatherEvidence.totalCloud?.source.state, "EXPIRED");
  assert.equal(expired.sources[1]?.state, "EXPIRED"); assert.equal(expired.sources[0], other);
  assert.equal(expired.hourly[0], currentRow, "independent QWeather and astronomy do not expire with the cloud batch");
  assert.equal(expired.hourly, source.hourly);
  assert.equal(expired.weatherEvidence.timelineRole, source.weatherEvidence.timelineRole);
  assert.deepEqual(source, before);
});

test("Map cloud-only evidence and LESS_CLOUD survive the independent weather cutoff", () => {
  const { at, row, hourEnd, cloudEnd } = fixture();
  const signal = { spotId: "spot:a", weatherAt: row.weatherAt, cloudPercent: row.cloudPercent,
    cloudEvidence: row.cloudEvidence, moonImpact: "HIGH", opportunityEligible: true, state: "FRESH" };
  const data = { context: { selectedAtUtc: at }, forecastValidUntil: new Date(hourEnd).toISOString(),
    evaluations: { "spot:a": signal }, timeFrames: [{ atUtc: at, spotSignals: { "spot:a": signal }, dynamicLayer: null }],
    filterEvidence: { "spot:a": { LESS_CLOUD: { state: "MATCH", reason: "当前总云量" } } },
    filterCapabilities: { byGroup: { LESS_CLOUD: { state: "AVAILABLE", reason: "已知云量" } } },
    layer: { kind: "NORMAL", polygons: [] } } as unknown as MapSceneData;
  const projected = mapForecastPresentation.project(data, hourEnd);
  assert.equal(projected.evaluations["spot:a"]!.weatherAt, null);
  assert.equal(projected.evaluations["spot:a"]!.cloudPercent, row.cloudPercent);
  assert.equal(projected.evaluations["spot:a"]!.moonImpact, "HIGH");
  assert.equal(projected.filterEvidence, data.filterEvidence, "weather-only expiry keeps the cloud verdict");
  assert.equal(projected.filterCapabilities, data.filterCapabilities);
  const expired = mapForecastPresentation.project(projected, cloudEnd + 1);
  assert.equal(expired.evaluations["spot:a"]!.cloudPercent, null);
  assert.equal(expired.filterEvidence["spot:a"]!.LESS_CLOUD.state, "UNKNOWN");
  assert.equal(expired.filterCapabilities.byGroup.LESS_CLOUD.state, "UNAVAILABLE");
});
