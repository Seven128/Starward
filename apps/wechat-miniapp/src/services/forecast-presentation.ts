import { airQualityBoundaries, CLOUD_SAMPLING_POLICY, projectAirQuality, type CloudForecastEvidence, type HourlySkyRow, type MapCloudData, type MapSceneData, type MapSpotTimeSignal, type SkyReport, type SpotAirQualityData } from "@starward/miniapp-contracts";
import { currentMapCloudFrame, mapCloudBoundaries } from "./map-cloud-presentation";

const HOUR = 3_600_000;
const hourEnd = (at: string | null) => Date.parse(at ?? "") + HOUR;
const covers = (weatherAt: string | null, at: string, now: number) => {
  const start = Date.parse(weatherAt ?? ""), instant = Date.parse(at);
  return start <= instant && instant < start + HOUR && now < start + HOUR;
};

export interface ForecastPresentation<T> {
  boundaries: (data: T) => readonly number[];
  project: (data: T, now: number) => T;
}

export const airQualityPresentation: ForecastPresentation<SpotAirQualityData> = {
  boundaries: airQualityBoundaries,
  project: projectAirQuality,
};

/** Compact cloud evidence has its own exact instant and publication lifetime.
 * An explicit new-source gap never falls back to the legacy provider hour. */
export function currentTotalCloudEvidence(evidence: CloudForecastEvidence | null | undefined, at: string,
  now: number): CloudForecastEvidence | null {
  if (!evidence || !Number.isFinite(now)) return null;
  const instant = Date.parse(at), selected = Date.parse(evidence.selectedAt), lower = Date.parse(evidence.lowerAt), upper = Date.parse(evidence.upperAt);
  return Number.isFinite(instant) && selected === instant && lower <= selected && selected <= upper &&
    evidence.samplingPolicy === CLOUD_SAMPLING_POLICY && /^ecmwf-tcc:[a-f0-9]{64}$/u.test(evidence.publicationId) &&
    Date.parse(evidence.runAt) <= now && now <= Date.parse(evidence.validUntil) &&
    Number.isFinite(evidence.cloudPercent) && evidence.cloudPercent >= 0 && evidence.cloudPercent <= 100 &&
    (evidence.interpolation === "NATIVE" ? lower === upper : evidence.interpolation === "LINEAR" && lower < upper)
    ? evidence : null;
}

function currentCloud<T extends Pick<MapSpotTimeSignal, "cloudPercent" | "cloudEvidence">>(row: T, at: string, now: number): T {
  if (row.cloudEvidence === undefined) return row;
  const cloudEvidence = currentTotalCloudEvidence(row.cloudEvidence, at, now), cloudPercent = cloudEvidence?.cloudPercent ?? null;
  return cloudEvidence === row.cloudEvidence && cloudPercent === row.cloudPercent ? row : { ...row, cloudEvidence, cloudPercent };
}

const cloudEnd = (evidence: CloudForecastEvidence | null | undefined) => Date.parse(evidence?.validUntil ?? "") + 1;
const cloudPublicationEnd = (data: SkyReport) => Date.parse(data.weatherEvidence?.totalCloud?.value?.binding.supports240HoursUntil ?? "") + 1;

function withoutWeather(row: HourlySkyRow): HourlySkyRow {
  const cloudAvailable = row.cloudEvidence != null && row.cloudPercent !== null;
  return { ...row, weatherAt: null, ...(row.cloudEvidence === undefined ? { cloudPercent: null } : {}), precipitationMm: null,
    precipitationProbabilityPercent: null, windKph: null, windGustKph: null, windDirectionDeg: null,
    temperatureC: null, relativeHumidityPercent: null, dewPointC: null, visibilityKm: null,
    opportunityScore: null, opportunityConfidence: null, opportunityEligible: false,
    opportunityBlockers: [...new Set([...row.opportunityBlockers, "WEATHER_UNAVAILABLE"])],
    opportunityInput: { ...row.opportunityInput, weatherTransmission: null }, state: cloudAvailable ? "PARTIAL" : "EXPIRED" };
}

/** Presentation only: never overwrite the query/persisted report or move its
 * astronomy axis. A failed refresh must not restore expired forecast values. */
export const skyForecastPresentation: ForecastPresentation<SkyReport> = {
  boundaries: data => [cloudPublicationEnd(data), ...data.hourly.flatMap(row => [hourEnd(row.weatherAt), cloudEnd(row.cloudEvidence)])].filter(Number.isFinite),
  project(data, now) {
    const hourly = data.hourly.map(row => {
      const cloud = currentCloud(row, row.at, now);
      if (row.weatherAt && !covers(row.weatherAt, row.at, now)) return withoutWeather(cloud);
      return cloud === row ? row : { ...cloud, opportunityScore: null, opportunityConfidence: null, opportunityEligible: false,
        opportunityBlockers: [...new Set([...row.opportunityBlockers, "WEATHER_UNAVAILABLE"])],
        opportunityInput: { ...row.opportunityInput, weatherTransmission: null }, state: row.weatherAt ? "PARTIAL" as const : "EXPIRED" as const };
    });
    const rowsChanged = hourly.some((row, index) => row !== data.hourly[index]);
    const cloud = data.weatherEvidence?.totalCloud;
    const cloudExpired = Boolean(cloud?.value && now > Date.parse(cloud.value.binding.supports240HoursUntil));
    const totalCloud = cloudExpired && cloud && (cloud.state !== "EXPIRED" || cloud.source.state !== "EXPIRED")
      ? { ...cloud, state: "EXPIRED" as const, source: { ...cloud.source, state: "EXPIRED" as const },
        errorCode: cloud.errorCode ?? "cloud_publication_expired" } : cloud;
    const sourcesChanged = cloudExpired && data.sources?.some(source => source.id === cloud?.source.id && source.state !== "EXPIRED");
    if (!rowsChanged && totalCloud === cloud && !sourcesChanged) return data;
    return { ...data, hourly: rowsChanged ? hourly : data.hourly,
      ...(sourcesChanged ? { sources: data.sources.map(source => source.id === cloud?.source.id && source.state !== "EXPIRED"
        ? { ...source, state: "EXPIRED" as const } : source) } : {}),
      weatherEvidence: { ...data.weatherEvidence, ...(totalCloud === undefined ? {} : { totalCloud }),
        timelineRole: rowsChanged && !hourly.some(row => row.weatherAt || row.cloudEvidence) ? "UNAVAILABLE" : data.weatherEvidence.timelineRole } };
  },
};

function currentSignal<T extends MapSpotTimeSignal>(signal: T, at: string, now: number): T {
  const cloud = currentCloud(signal, at, now), weatherExpired = Boolean(signal.weatherAt && !covers(signal.weatherAt, at, now));
  if (!weatherExpired && cloud === signal) return signal;
  return { ...cloud, ...(weatherExpired ? { weatherAt: null,
    ...(signal.cloudEvidence === undefined ? { cloudPercent: null } : {}) } : {}), opportunityScore: null,
    opportunityConfidence: null, opportunityEligible: false, opportunityLabel: "当前时段暂无天气数据",
    state: cloud.cloudEvidence && cloud.cloudPercent !== null || !weatherExpired && signal.weatherAt ? "PARTIAL" : "UNAVAILABLE" };
}

export const mapForecastPresentation: ForecastPresentation<MapSceneData> = {
  boundaries: data => [Date.parse(data.forecastValidUntil ?? ""), ...mapCloudBoundaries(data),
    ...[...Object.values(data.evaluations), ...data.timeFrames.flatMap(frame => Object.values(frame.spotSignals))]
      .flatMap(signal => [hourEnd(signal.weatherAt), cloudEnd(signal.cloudEvidence)])].filter(Number.isFinite),
  project(data, now) {
    let changed = false;
    const signalsAt = <T extends MapSpotTimeSignal>(signals: Readonly<Record<string, T>>, at: string) =>
      Object.fromEntries(Object.entries(signals).map(([id, signal]) => {
        const current = currentSignal(signal, at, now);
        changed ||= current !== signal;
        return [id, current];
      }));
    const timeFrames = data.timeFrames.map(frame => {
      const spotSignals = signalsAt(frame.spotSignals, frame.atUtc);
      const signalsChanged = Object.keys(spotSignals).some(id => spotSignals[id] !== frame.spotSignals[id]);
      if (frame.dynamicLayer?.kind === "CLOUD") {
        const current = currentMapCloudFrame(signalsChanged ? { ...frame, spotSignals } : frame, data.cloudSnapshot, now);
        changed ||= current !== frame;
        return current;
      }
      if (!signalsChanged) return frame;
      // The historical opportunity layer remains formal-place based.
      const dynamic = frame.dynamicLayer;
      const allowed = new Set(Object.values(spotSignals).filter(signal => signal.weatherAt).map(signal => "opportunity:" + signal.spotId));
      const polygons = dynamic?.polygons.filter(polygon => allowed.has(polygon.id)) ?? [];
      return { ...frame, spotSignals, dynamicLayer: dynamic ? { ...dynamic, polygons,
        state: polygons.length ? "PARTIAL" as const : "UNAVAILABLE" as const } : null };
    });
    const evaluations = signalsAt(data.evaluations, data.context.selectedAtUtc);
    const scopeExpired = Date.parse(data.forecastValidUntil ?? "") <= now;
    if (!changed && !scopeExpired) return data;
    const elapsedSpotIds = new Set(Object.keys(evaluations).filter(id =>
      evaluations[id]!.cloudPercent !== data.evaluations[id]!.cloudPercent ||
      evaluations[id]!.cloudEvidence !== data.evaluations[id]!.cloudEvidence));
    const filterEvidence = elapsedSpotIds.size ? Object.fromEntries(Object.entries(data.filterEvidence).map(([id, evidence]) => [id,
      elapsedSpotIds.has(id) ? { ...evidence, LESS_CLOUD: { state: "UNKNOWN" as const,
        reason: "少云：云量预报已失效，当前云量待核验" } } : evidence,
    ])) : data.filterEvidence;
    const independentCloud = data.context.weatherView?.totalCloud !== undefined ||
      [...Object.values(data.evaluations), ...data.timeFrames.flatMap(frame => Object.values(frame.spotSignals))]
        .some(signal => signal.cloudEvidence !== undefined);
    const legacyScopeExpired = scopeExpired && !independentCloud;
    const filterCapabilities = elapsedSpotIds.size || legacyScopeExpired ? { ...data.filterCapabilities,
      byGroup: { ...data.filterCapabilities.byGroup, LESS_CLOUD: {
        state: Object.values(filterEvidence).some(evidence => evidence.LESS_CLOUD.state !== "UNKNOWN") ? "PARTIAL" as const : "UNAVAILABLE" as const,
        reason: "查询范围内的部分云量预报已失效；少云条件需刷新后重新核验。",
      } },
    } : data.filterCapabilities;
    const selectedFrame = timeFrames.find(frame => Date.parse(frame.atUtc) === Date.parse(data.context.selectedAtUtc));
    const dynamic = selectedFrame?.dynamicLayer;
    const layer = ["CLOUD", "OPPORTUNITY"].includes(data.layer.kind)
      ? { ...data.layer, polygons: dynamic?.kind === data.layer.kind ? dynamic.polygons : [],
          state: dynamic?.kind === data.layer.kind ? dynamic.state : "UNAVAILABLE" as const }
      : data.layer;
    // Keep returned candidates as unknown, matching the BFF filter semantics.
    // Only a new server response can recover candidates previously excluded.
    return { ...data, evaluations, timeFrames, layer, filterEvidence, filterCapabilities };
  },
};

export const mapCloudForecastPresentation: ForecastPresentation<MapCloudData> = {
  boundaries: data => mapCloudBoundaries(data),
  project(data, now) {
    const timeFrames = data.timeFrames.map(frame => currentMapCloudFrame(frame, data.cloudSnapshot, now));
    if (timeFrames.every((frame, index) => frame === data.timeFrames[index])) return data;
    const selected = timeFrames.find(frame => Date.parse(frame.atUtc) === Date.parse(data.context.selectedAtUtc))?.dynamicLayer;
    return { ...data, timeFrames, layer: { ...data.layer,
      polygons: selected?.kind === "CLOUD" ? selected.polygons : [],
      state: selected?.kind === "CLOUD" ? selected.state : "UNAVAILABLE",
    } };
  },
};
