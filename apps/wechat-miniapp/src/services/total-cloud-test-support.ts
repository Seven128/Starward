import { CLOUD_NATIVE_STEPS, CLOUD_SAMPLING_POLICY, TOTAL_CLOUD_CONTEXT_SCHEMA, TOTAL_CLOUD_POLICY,
  cloudPointSeriesAt, type CloudPointForecast, type CloudPointSeries, type SourceSummary } from "@starward/miniapp-contracts";

/** One valid native-series fixture shared by client consumer checks. */
export function totalCloudClientFixture(runAt = "2026-09-20T00:00:00.000Z") {
  const run = Date.parse(runAt), stamp = (hours: number) => new Date(run + hours * 3_600_000).toISOString();
  const binding = { schemaVersion: TOTAL_CLOUD_CONTEXT_SCHEMA, policy: TOTAL_CLOUD_POLICY, state: "PINNED" as const,
    publicationId: `ecmwf-tcc:${"a".repeat(64)}`, manifestSha256: "b".repeat(64), runAt: stamp(0), validFrom: stamp(0),
    validTo: stamp(360), supports240HoursUntil: stamp(120), samplingPolicy: CLOUD_SAMPLING_POLICY };
  const series: CloudPointSeries = { schemaVersion: "cloud-point-series-v1", binding,
    point: { system: "WGS84", latitude: 30, longitude: 110 },
    frames: CLOUD_NATIVE_STEPS.map(stepHours => ({ stepHours, validAt: stamp(stepHours), fraction: stepHours / 360, quality: "AVAILABLE" })) };
  const source = { id: "ecmwf-tcc", provider: "ECMWF", state: "FRESH" } as unknown as SourceSummary;
  const forecast: CloudPointForecast = { value: series, state: "FRESH", source, errorCode: null };
  const now = run + 60_000;
  return { binding, series, forecast, stamp, now, evidence: (hours: number) => cloudPointSeriesAt(series, stamp(hours), now)! };
}
