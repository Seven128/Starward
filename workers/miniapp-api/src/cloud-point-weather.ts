import {
  cloudInstant, cloudGridCoversPoint, cloudSpatialSample, copyTotalCloudContext, totalCloudSupports240Hours,
  type CloudPointForecast, type CloudPointSeries, type DataState, type SourceSummary,
  type TotalCloudContext, type Wgs84Point,
} from "@starward/miniapp-contracts";
import type { CloudPublicationRegistry } from "./cloud-publication-registry.ts";
import type { CloudBatchManifest } from "./cloud-publication.ts";

type PublicationOwner = Pick<CloudPublicationRegistry, "selectCurrent" | "read">;
export interface CloudPointWeatherInput {
  binding: TotalCloudContext;
  point: Wgs84Point;
  windowUtc: { start: string; end: string };
  signal?: AbortSignal;
}

function sourceFor(binding: TotalCloudContext, state: DataState, manifest?: CloudBatchManifest): SourceSummary {
  const pin = binding.state === "PINNED" ? binding : null;
  const times = manifest?.frames.map(frame => frame.source.retrievedAt).filter(value => cloudInstant(value)) ?? [];
  const retrievedAt = times.reduce<string | null>((earliest, value) => !earliest || Date.parse(value) < Date.parse(earliest) ? value : earliest, null);
  return {
    id: pin?.publicationId ?? `ecmwf-tcc:${binding.state === "UNAVAILABLE" ? binding.reason.toLowerCase() : "unavailable"}`,
    kind: "THIRD_PARTY_FORECAST", provider: "ECMWF IFS", title: "ECMWF 总云量预报",
    sourceUrl: manifest?.source.url ?? "https://www.ecmwf.int/en/forecasts/datasets/open-data",
    license: "CC-BY-4.0", licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
    publishedAt: null, retrievedAt, validFrom: pin?.validFrom ?? null, validTo: pin?.validTo ?? null,
    state, confidence: null, precision: "0.1°原生经纬网格；按同批相邻有效时次对数值插值，不代表现场实测云量。",
    attribution: { name: "ECMWF", url: "https://www.ecmwf.int/en/forecasts/datasets/open-data",
      statements: [manifest?.source.attribution ?? "Contains modified ECMWF forecast data. Source: ECMWF.",
        "CC BY 4.0: https://creativecommons.org/licenses/by/4.0/", ...(manifest?.source.modifications ?? [])] },
    limitations: [
      "总云量预报与其它天气字段、官方预警具有独立来源和覆盖。",
      "前144小时原生间隔3小时，此后6小时；缺测或缺少相邻原生时次时不插值。",
      ...(pin ? [`模式起报时刻：${pin.runAt}；所选时刻及实际插值端点随结果保留。`] : []),
    ],
  };
}

export function unavailableCloudForecast(binding: TotalCloudContext, errorCode: string | null,
  state: "UNAVAILABLE" | "EXPIRED" = "UNAVAILABLE"): CloudPointForecast {
  const checked = copyTotalCloudContext(binding);
  return { value: null, state, source: sourceFor(checked, state), errorCode };
}

const readableError = (error: unknown) => error instanceof Error && error.message === "cloud_publication_read_queue_full"
  ? "cloud_publication_read_queue_full" : "cloud_publication_read_failed";

/** A point read retains only native scalar endpoints. The registry's shared
 * frame store owns file concurrency/cache; no reader fetches GRIB or a provider. */
export class CloudPointWeather {
  constructor(private readonly publications: PublicationOwner, private readonly now: () => number = Date.now) {}

  async select(binding: TotalCloudContext | null | undefined, signal?: AbortSignal): Promise<TotalCloudContext | null> {
    signal?.throwIfAborted();
    if (binding === null) return null;
    const selected = binding === undefined ? await this.publications.selectCurrent() : binding;
    signal?.throwIfAborted();
    return selected === null ? null : copyTotalCloudContext(selected);
  }

  async getForecast(input: CloudPointWeatherInput): Promise<CloudPointForecast> {
    input.signal?.throwIfAborted();
    const binding = copyTotalCloudContext(input.binding), point = input.point;
    const startAt = cloudInstant(input.windowUtc.start), endAt = cloudInstant(input.windowUtc.end);
    if (!startAt || !endAt || Date.parse(startAt) >= Date.parse(endAt)) throw new Error("cloud_weather_window_invalid");
    if (point?.system !== "WGS84" || !Number.isFinite(point.latitude) || Math.abs(point.latitude) > 90
      || !Number.isFinite(point.longitude) || Math.abs(point.longitude) > 180) throw new Error("cloud_weather_point_invalid");
    const unavailable = (state: DataState, errorCode: string | null, manifest?: CloudBatchManifest,
      unavailability?: CloudPointForecast["unavailability"]): CloudPointForecast => ({
      value: null, state, source: sourceFor(binding, state, manifest), errorCode,
      ...(unavailability ? { unavailability } : {}),
    });
    if (binding.state === "UNAVAILABLE") return unavailable("UNAVAILABLE",
      binding.reason === "READ_FAILED" ? "cloud_publication_read_failed" : null);
    if (!totalCloudSupports240Hours(binding, this.now())) return unavailable("EXPIRED", "cloud_publication_expired");
    let publication;
    try { publication = await this.publications.read(binding, input.signal); }
    catch (error) { input.signal?.throwIfAborted(); return unavailable("UNAVAILABLE", readableError(error)); }
    try {
      input.signal?.throwIfAborted();
      const manifest = publication.manifest, grid = manifest.grid, start = Date.parse(startAt), end = Date.parse(endAt);
      if (!publication.supports240Hours(this.now())) return unavailable("EXPIRED", "cloud_publication_expired", manifest);
      // Use the sampler's own support rule without reading frame values. A
      // missing crop is different from masks missing inside that crop.
      if (!cloudGridCoversPoint(grid, point.latitude, point.longitude))
        return unavailable("UNAVAILABLE", null, manifest,
          { reason: "OUTSIDE_SPATIAL_COVERAGE", binding, point: { ...point } });
      const declarations = manifest.frames;
      if (end <= Date.parse(declarations[0]!.validAt) || start > Date.parse(declarations.at(-1)!.validAt))
        return unavailable("UNAVAILABLE", null, manifest,
          { reason: "OUTSIDE_TIME_COVERAGE", binding, point: { ...point } });
      let first = declarations.findIndex(frame => Date.parse(frame.validAt) >= start);
      if (first < 0) first = declarations.length - 1;
      else if (Date.parse(declarations[first]!.validAt) > start) first = Math.max(0, first - 1);
      let last = declarations.findIndex(frame => Date.parse(frame.validAt) >= end);
      if (last < 0) last = declarations.length - 1;
      const frames: CloudPointSeries["frames"][number][] = [];
      let errorCode: string | null = null;
      for (let index = first; index <= last; index++) {
        input.signal?.throwIfAborted();
        const declaration = declarations[index]!;
        try {
          const numeric = await publication.frame(index, input.signal);
          input.signal?.throwIfAborted();
          const fraction = cloudSpatialSample(grid, numeric, point.latitude, point.longitude);
          frames.push({ stepHours: declaration.stepHours, validAt: declaration.validAt, fraction,
            quality: fraction === null ? "MISSING" : "AVAILABLE" });
        } catch (error) {
          input.signal?.throwIfAborted();
          const frameError = readableError(error);
          errorCode ??= frameError;
          frames.push({ stepHours: declaration.stepHours, validAt: declaration.validAt, fraction: null, quality: "READ_FAILED" });
          if (frameError === "cloud_publication_read_queue_full") {
            errorCode = frameError;
            // Preserve already qualified endpoints, but do not send further
            // frame keys into an overloaded store during this same operation.
            for (let remaining = index + 1; remaining <= last; remaining++) {
              const deferred = declarations[remaining]!;
              frames.push({ stepHours: deferred.stepHours, validAt: deferred.validAt, fraction: null, quality: "READ_FAILED" });
            }
            break;
          }
        }
      }
      input.signal?.throwIfAborted();
      if (!publication.supports240Hours(this.now())) return unavailable("EXPIRED", "cloud_publication_expired", manifest);
      const series: CloudPointSeries = { schemaVersion: "cloud-point-series-v1", binding, point: { ...point }, frames };
      if (!frames.some(frame => frame.quality === "AVAILABLE")) return unavailable("UNAVAILABLE", errorCode, manifest,
        { reason: "NATIVE_POINTS_UNAVAILABLE", series });
      const complete = frames.every(frame => frame.quality === "AVAILABLE") && start >= Date.parse(binding.validFrom) && end <= Date.parse(binding.validTo);
      const state = complete ? "FRESH" : "PARTIAL";
      return { value: series, state, source: sourceFor(binding, state, manifest), errorCode };
    } finally { await publication.close(); }
  }
}
