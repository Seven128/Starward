import { cloudInstant, cloudInterpolateFraction, cloudTimeBracket, CLOUD_NATIVE_STEPS, CLOUD_SAMPLING_POLICY, type CloudPointEvidence } from "./cloud-grid.ts";
import { copyTotalCloudContext, totalCloudSupports240Hours, type TotalCloudPublicationPin } from "./cloud-context.ts";
import type { DataState, SourceSummary, Wgs84Point } from "./types.ts";

export interface CloudPointSeries {
  schemaVersion: "cloud-point-series-v1";
  binding: TotalCloudPublicationPin;
  point: Wgs84Point;
  frames: readonly {
    stepHours: number;
    validAt: string;
    fraction: number | null;
    quality: "AVAILABLE" | "MISSING" | "READ_FAILED";
  }[];
}

export interface CloudPointForecast {
  value: CloudPointSeries | null;
  state: DataState;
  source: SourceSummary;
  errorCode: string | null;
  /** Facts retained when value is unavailable. These never make the forecast
   * usable or extend the source horizon; older consumers may ignore them. */
  unavailability?:
    | { reason: "OUTSIDE_SPATIAL_COVERAGE" | "OUTSIDE_TIME_COVERAGE"; binding: TotalCloudPublicationPin; point: Wgs84Point }
    | { reason: "NATIVE_POINTS_UNAVAILABLE"; series: CloudPointSeries };
}

export interface CloudForecastEvidence extends CloudPointEvidence { validUntil: string }

/** Point series occur once in a weather report. Each rendered/signal row only
 * carries its compact actual bracket and validity, independent of weatherAt. */
export function cloudPointSeriesAt(series: CloudPointSeries, selectedAt: string, now: number): CloudForecastEvidence | null {
  if (series?.schemaVersion !== "cloud-point-series-v1" || series.point?.system !== "WGS84"
    || !Number.isFinite(series.point.latitude) || Math.abs(series.point.latitude) > 90
    || !Number.isFinite(series.point.longitude) || Math.abs(series.point.longitude) > 180
    || !Array.isArray(series.frames) || series.frames.length < 1 || series.frames.length > CLOUD_NATIVE_STEPS.length) return null;
  let binding;
  try { binding = copyTotalCloudContext(series.binding); } catch { return null; }
  if (!totalCloudSupports240Hours(binding, now)) return null;
  const selected = cloudInstant(selectedAt);
  if (!selected) return null;
  for (let i = 0; i < series.frames.length; i++) {
    const frame = series.frames[i]!, sourceIndex = CLOUD_NATIVE_STEPS.indexOf(frame.stepHours), nativeAt = cloudInstant(frame.validAt);
    if (sourceIndex < 0 || !nativeAt || Date.parse(nativeAt) !== Date.parse(binding.runAt) + frame.stepHours * 3_600_000
      || Date.parse(nativeAt) > Date.parse(binding.validTo)
      || i > 0 && sourceIndex !== CLOUD_NATIVE_STEPS.indexOf(series.frames[i - 1]!.stepHours) + 1
      || !["AVAILABLE", "MISSING", "READ_FAILED"].includes(frame.quality)
      || frame.quality === "AVAILABLE" && (frame.fraction === null || !Number.isFinite(frame.fraction) || frame.fraction < 0 || frame.fraction > 1)
      || frame.quality !== "AVAILABLE" && frame.fraction !== null) return null;
  }
  const bracket = cloudTimeBracket(series.frames, binding.runAt, selected);
  if (!bracket) return null;
  const lower = series.frames[bracket.lowerIndex]!, upper = series.frames[bracket.upperIndex]!;
  const value = cloudInterpolateFraction(lower.quality === "AVAILABLE" ? lower.fraction : null,
    upper.quality === "AVAILABLE" ? upper.fraction : null, bracket.fraction);
  if (value === null) return null;
  return { publicationId: binding.publicationId, runAt: binding.runAt, selectedAt: selected,
    lowerAt: bracket.lowerAt, upperAt: bracket.upperAt, interpolation: bracket.lowerIndex === bracket.upperIndex ? "NATIVE" : "LINEAR",
    samplingPolicy: CLOUD_SAMPLING_POLICY, cloudPercent: value * 100, validUntil: binding.supports240HoursUntil };
}
