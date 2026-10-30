import { CLOUD_NATIVE_STEPS, cloudInstant, cloudTimeBracket } from "./cloud-grid.ts";
import { copyTotalCloudContext, totalCloudSupports240Hours, type TotalCloudContext } from "./cloud-context.ts";
import { cloudPointSeriesAt, type CloudForecastEvidence, type CloudPointForecast, type CloudPointSeries } from "./cloud-point-series.ts";
import type { ObservationContext, Wgs84Point } from "./types.ts";

export type MapCloudNumericAvailability =
  | { state: "AVAILABLE"; evidence: CloudForecastEvidence }
  | { state: "NOT_READ" | "SOURCE_MISSING" | "READ_FAILED" | "OUTSIDE_COVERAGE" | "UNAVAILABLE" | "EXPIRED"; evidence: null };

/** Inclusive native instants/intervals actually supported by this point series.
 * A zero-length interval preserves an isolated qualified native instant. */
export interface MapCloudNumericInterval { start: string; end: string }

/** Temporal support at one declared query point, never a viewport aggregate or
 * evidence that an image has been prepared for every available instant. */
export interface MapCloudGridTimeline {
  schemaVersion: "map-cloud-grid-timeline-v1";
  binding: TotalCloudContext;
  point: Wgs84Point;
  forecast: CloudPointForecast;
  intervals: readonly MapCloudNumericInterval[];
  selection: MapCloudNumericAvailability;
  display: { state: "NOT_READY" | "READY" | "SOURCE_MISSING" | "READ_FAILED" | "OUTSIDE_COVERAGE" | "EXPIRED" };
}

/** Kept beside the committed response Context, not written into it. */
export interface MapCloudGridProjection { requestedAt: string; gridTimeline: MapCloudGridTimeline }

export function mapCloudReadInstant(value: unknown): string {
  const instant = typeof value === "string" ? cloudInstant(value) : null;
  if (!instant) throw new Error("map_cloud_selected_at_invalid");
  return instant;
}

function validPoint(point: Wgs84Point) {
  return point?.system === "WGS84" && Number.isFinite(point.latitude) && Math.abs(point.latitude) <= 90
    && Number.isFinite(point.longitude) && Math.abs(point.longitude) <= 180;
}

function sameBinding(left: TotalCloudContext, right: TotalCloudContext) {
  return JSON.stringify(copyTotalCloudContext(left)) === JSON.stringify(copyTotalCloudContext(right));
}

function readSeries(forecast: CloudPointForecast): CloudPointSeries | null {
  const absent = forecast.unavailability;
  if (absent?.reason !== "NATIVE_POINTS_UNAVAILABLE") return forecast.value;
  // Only unavailable scalar facts may accompany null value. They cannot revive
  // AVAILABLE values under an unavailable/expired header.
  if (forecast.value || !Array.isArray(absent.series.frames) || absent.series.frames.length < 1
    || absent.series.frames.length > CLOUD_NATIVE_STEPS.length || absent.series.frames.some(frame =>
      frame.fraction !== null || !["MISSING", "READ_FAILED"].includes(frame.quality)))
    throw new Error("map_cloud_grid_unavailability_invalid");
  return absent.series;
}

function assertIdentity(timeline: Pick<MapCloudGridTimeline, "binding" | "point" | "forecast">) {
  if (!validPoint(timeline.point)) throw new Error("map_cloud_grid_point_invalid");
  const binding = copyTotalCloudContext(timeline.binding), series = readSeries(timeline.forecast);
  const identity = series ?? timeline.forecast.unavailability;
  if (identity && "binding" in identity && (binding.state !== "PINNED" || !sameBinding(binding, identity.binding)
    || !validPoint(identity.point) || identity.point.latitude !== timeline.point.latitude || identity.point.longitude !== timeline.point.longitude))
    throw new Error("map_cloud_grid_identity_mismatch");
}

/** Numeric availability is independent of display readiness and QWeather.
 * The binding retains the complete native/source horizon. A per-night series
 * that was not read for another date is NOT_READ, not missing source data. */
export function mapCloudGridAvailabilityAt(timeline: Pick<MapCloudGridTimeline, "binding" | "point" | "forecast">,
  selectedAt: string, now: number): MapCloudNumericAvailability {
  const requestedAt = mapCloudReadInstant(selectedAt);
  if (!Number.isFinite(now)) throw new Error("map_cloud_grid_clock_invalid");
  assertIdentity(timeline);
  const binding = copyTotalCloudContext(timeline.binding), forecast = timeline.forecast;
  if (binding.state !== "PINNED") return { state: "UNAVAILABLE", evidence: null };
  const until = Date.parse(binding.supports240HoursUntil);
  if (!totalCloudSupports240Hours(binding, now)) return {
    state: now > until ? "EXPIRED" : "UNAVAILABLE", evidence: null,
  };
  if (forecast.state === "EXPIRED") return { state: "EXPIRED", evidence: null };
  const requested = Date.parse(requestedAt);
  if (requested < Date.parse(binding.validFrom) || requested > Date.parse(binding.validTo))
    return { state: "OUTSIDE_COVERAGE", evidence: null };
  const series = readSeries(forecast), absent = forecast.unavailability;
  if (!series && absent?.reason === "OUTSIDE_SPATIAL_COVERAGE") return { state: "OUTSIDE_COVERAGE", evidence: null };
  // A read whose entire window was outside the source learned nothing about a
  // different, in-range requested instant. The pin's own range was checked above.
  if (!series && absent?.reason === "OUTSIDE_TIME_COVERAGE") return { state: "NOT_READ", evidence: null };
  if (!series || forecast.state === "UNAVAILABLE" && absent?.reason !== "NATIVE_POINTS_UNAVAILABLE") return {
    state: forecast.errorCode ? "READ_FAILED" : "UNAVAILABLE", evidence: null,
  };
  const evidence = cloudPointSeriesAt(series, requestedAt, now);
  if (evidence) return { state: "AVAILABLE", evidence };
  const bracket = cloudTimeBracket(series.frames, binding.runAt, requestedAt);
  if (!bracket) return { state: "NOT_READ", evidence: null };
  const lower = series.frames[bracket.lowerIndex]!, upper = series.frames[bracket.upperIndex]!;
  if (lower.quality === "READ_FAILED" || upper.quality === "READ_FAILED") return { state: "READ_FAILED", evidence: null };
  if (lower.quality === "MISSING" || upper.quality === "MISSING") return { state: "SOURCE_MISSING", evidence: null };
  return { state: "UNAVAILABLE", evidence: null };
}

function numericIntervals(timeline: Pick<MapCloudGridTimeline, "binding" | "point" | "forecast">, now: number) {
  const intervals: MapCloudNumericInterval[] = [], series = readSeries(timeline.forecast);
  if (!series) return intervals;
  let previousAvailable = false;
  for (const frame of series.frames) {
    const current = mapCloudGridAvailabilityAt(timeline, frame.validAt, now);
    if (current.state !== "AVAILABLE") { previousAvailable = false; continue; }
    const last = intervals.at(-1), at = current.evidence.selectedAt;
    if (previousAvailable && last) last.end = at;
    else intervals.push({ start: at, end: at });
    previousAvailable = true;
  }
  return intervals;
}

/** Projects an already-read native scalar series. No image, URL, publication,
 * Context mutation or background task is created. The current producer's
 * finite PNG set cannot make arbitrary precise requests READY. */
export function projectMapCloudGridTimeline(input: {
  binding: TotalCloudContext; point: Wgs84Point; forecast: CloudPointForecast; requestedAt: string; now: number;
}): MapCloudGridProjection {
  const requestedAt = mapCloudReadInstant(input.requestedAt), binding = copyTotalCloudContext(input.binding);
  const copySeries = (series: CloudPointSeries): CloudPointSeries => ({ ...series,
    binding: copyTotalCloudContext(series.binding) as typeof series.binding, point: { ...series.point },
    frames: series.frames.map(frame => ({ ...frame })) });
  const absent = input.forecast.unavailability;
  const forecast: CloudPointForecast = { ...input.forecast,
    value: input.forecast.value ? copySeries(input.forecast.value) : null,
    ...(absent ? { unavailability: absent.reason === "NATIVE_POINTS_UNAVAILABLE"
      ? { reason: absent.reason, series: copySeries(absent.series) }
      : { ...absent, binding: copyTotalCloudContext(absent.binding) as typeof absent.binding, point: { ...absent.point } } } : {}) };
  const source = { binding, point: { ...input.point }, forecast };
  const selection = mapCloudGridAvailabilityAt(source, requestedAt, input.now);
  return { requestedAt, gridTimeline: { schemaVersion: "map-cloud-grid-timeline-v1", ...source,
    intervals: numericIntervals(source, input.now), selection, display: { state: "NOT_READY" } } };
}

/** A preview response retains the committed Context and pin. The requested
 * instant is separate; an old server's legacy/default-time response cannot
 * silently satisfy a new read. Rendering/native acknowledgment is separate. */
export function mapCloudGridReadMatches(result: {
  context: ObservationContext; requestedAt?: string; gridTimeline?: MapCloudGridTimeline;
}, context: ObservationContext, requestedAt: string): boolean {
  try {
    if (!result.gridTimeline || result.gridTimeline.schemaVersion !== "map-cloud-grid-timeline-v1"
      || !context.weatherView.totalCloud || result.context.contextId !== context.contextId
      || result.context.revision !== context.revision || result.context.contextFingerprint !== context.contextFingerprint
      || mapCloudReadInstant(result.context.selectedAtUtc) !== mapCloudReadInstant(context.selectedAtUtc)
      || result.requestedAt !== mapCloudReadInstant(requestedAt)
      || !result.context.weatherView.totalCloud || !sameBinding(result.context.weatherView.totalCloud, context.weatherView.totalCloud)
      || !sameBinding(result.gridTimeline.binding, context.weatherView.totalCloud)) return false;
    assertIdentity(result.gridTimeline);
    const selected = result.gridTimeline.selection;
    const binding = result.gridTimeline.binding;
    return selected.state !== "AVAILABLE" || binding.state === "PINNED" && selected.evidence.selectedAt === result.requestedAt
      && selected.evidence.publicationId === binding.publicationId && selected.evidence.runAt === binding.runAt
      && selected.evidence.samplingPolicy === binding.samplingPolicy && selected.evidence.validUntil === binding.supports240HoursUntil;
  } catch { return false; }
}
