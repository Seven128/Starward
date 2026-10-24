import { describe, expect, it } from "vitest";
import { ForecastQueryService } from "../modules/forecast/forecast-query-service";
import { nativeForecastClock, nativeForecastQuery, nativeForecastRun, type ForecastComparisonSample } from "../../../../tests/fixtures/native-forecast";

async function compare(primary: ForecastComparisonSample[], secondary: ForecastComparisonSample[]) {
  return new ForecastQueryService({
    primary: { load: async () => nativeForecastRun("gfs_seamless", 0, primary) },
    comparison: { load: async () => nativeForecastRun("ecmwf_ifs025", 0, secondary) },
    now: () => new Date(nativeForecastClock),
  }).get(nativeForecastQuery);
}
const sample = (hour: number, cloud: number | null, rain: number | null): ForecastComparisonSample => ({ hour, totalCloudPct: cloud, precipitationProbabilityPct: rain });
const time = (hour: number) => new Date(Date.parse("2026-07-20T12:00:00.000Z") + hour * 3_600_000).toISOString();

describe("native forecast comparison missingness", () => {
  it("does not turn a missing second rain value into a disagreement or full consensus", async () => {
    const result = await compare([sample(0, 50, 40), sample(1, 50, 40)], [sample(0, 50, null), sample(1, 50, null)]);
    expect(result.primary.hours).toHaveLength(2);
    expect(result.comparison?.hours.every(hour => hour.precipitationProbabilityPct === null)).toBe(true);
    expect(result.modelComparison).toMatchObject({ status: "partial", comparedFields: ["totalCloudPct"], disagreementStartUtc: null, disagreementEndUtc: null, consensusStartUtc: null, consensusEndUtc: null });
  });

  it("keeps both absent comparison fields unavailable while preserving independent temperatures", async () => {
    const result = await compare([sample(0, null, null), sample(1, null, null)], [sample(0, null, null), sample(1, null, null)]);
    expect(result.primary.hours[0].temperatureC).toBe(28);
    expect(result.comparison?.hours).toHaveLength(2);
    expect(result.modelComparison).toMatchObject({ status: "missing", comparedFields: [], consensusStartUtc: null, consensusEndUtc: null, disagreementStartUtc: null, disagreementEndUtc: null });
  });

  it("uses genuine zero values as paired evidence", async () => {
    const points = [sample(0, 0, 0), sample(1, 0, 0)];
    const result = await compare(points, points);
    expect(result.modelComparison).toMatchObject({ status: "fresh", comparedFields: ["totalCloudPct", "precipitationProbabilityPct"], consensusStartUtc: time(0), consensusEndUtc: time(1), disagreementStartUtc: null });
  });

  it("retains a real disagreement and does not bridge a missing field inside consensus", async () => {
    const result = await compare(
      [sample(0, 0, 0), sample(1, null, 0), sample(2, 0, 0), sample(3, 50, 0)],
      [sample(0, 0, 0), sample(1, 0, 0), sample(2, 0, 0), sample(3, 80, 0)],
    );
    expect(result.modelComparison).toMatchObject({ status: "partial", consensusStartUtc: time(0), consensusEndUtc: time(0), disagreementStartUtc: time(3), disagreementEndUtc: time(3) });
    expect(result.primary.hours).toHaveLength(4);
    expect(result.comparison?.hours).toHaveLength(4);
  });

  it("does not claim comparison for disjoint source times", async () => {
    const result = await compare([sample(0, 0, 0)], [sample(1, 0, 0)]);
    expect(result.modelComparison).toMatchObject({ status: "missing", comparedFields: [], consensusStartUtc: null, consensusEndUtc: null, disagreementStartUtc: null, disagreementEndUtc: null });
  });

  it("does not bridge an omitted hour in both sources or label that coverage complete", async () => {
    const points = [sample(0, 0, 0), sample(2, 0, 0)];
    const result = await compare(points, points);
    expect(result.modelComparison).toMatchObject({ status: "partial", consensusStartUtc: time(0), consensusEndUtc: time(0), disagreementStartUtc: null });
    expect(result.primary.hours.map(hour => hour.validTimeUtc)).toEqual([time(0), time(2)]);
    expect(result.comparison?.hours).toHaveLength(2);
  });

  it("retains the existing source expiry instead of presenting old paired values as fresh", async () => {
    const points = [sample(0, 0, 0), sample(1, 0, 0)];
    const result = await new ForecastQueryService({
      primary: { load: async () => nativeForecastRun("gfs_seamless", 0, points) },
      comparison: { load: async () => nativeForecastRun("ecmwf_ifs025", 0, points) },
      now: () => new Date("2026-07-20T14:00:00.000Z"),
    }).get(nativeForecastQuery);
    expect(result.primary.run.status).toBe("stale");
    expect(result.modelComparison.status).toBe("stale");
    expect(result.modelComparison.comparedFields).toHaveLength(2);
  });
});
