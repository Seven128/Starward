import { airQualityBoundaries, projectAirQuality, type HourlySkyRow, type MapSceneData, type MapSpotTimeSignal, type SkyReport, type SpotAirQualityData } from "@starward/miniapp-contracts";

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

function withoutWeather(row: HourlySkyRow): HourlySkyRow {
  return { ...row, weatherAt: null, cloudPercent: null, precipitationMm: null,
    precipitationProbabilityPercent: null, windKph: null, windGustKph: null, windDirectionDeg: null,
    temperatureC: null, relativeHumidityPercent: null, dewPointC: null, visibilityKm: null,
    opportunityScore: null, opportunityConfidence: null, opportunityEligible: false,
    opportunityBlockers: [...new Set([...row.opportunityBlockers, "WEATHER_UNAVAILABLE"])],
    opportunityInput: { ...row.opportunityInput, weatherTransmission: null }, state: "EXPIRED" };
}

/** Presentation only: never overwrite the query/persisted report or move its
 * astronomy axis. A failed refresh must not restore expired forecast values. */
export const skyForecastPresentation: ForecastPresentation<SkyReport> = {
  boundaries: data => data.hourly.map(row => hourEnd(row.weatherAt)).filter(Number.isFinite),
  project(data, now) {
    const hourly = data.hourly.map(row => row.weatherAt && !covers(row.weatherAt, row.at, now) ? withoutWeather(row) : row);
    if (hourly.every((row, index) => row === data.hourly[index])) return data;
    return { ...data, hourly, weatherEvidence: { ...data.weatherEvidence,
      timelineRole: hourly.some(row => row.weatherAt) ? data.weatherEvidence.timelineRole : "UNAVAILABLE" } };
  },
};

function currentSignal<T extends MapSpotTimeSignal>(signal: T, at: string, now: number): T {
  if (!signal.weatherAt || covers(signal.weatherAt, at, now)) return signal;
  return { ...signal, weatherAt: null, cloudPercent: null, opportunityScore: null,
    opportunityConfidence: null, opportunityEligible: false, opportunityLabel: "当前时段暂无天气数据", state: "UNAVAILABLE" };
}

export const mapForecastPresentation: ForecastPresentation<MapSceneData> = {
  boundaries: data => [Date.parse(data.forecastValidUntil ?? ""),
    ...[...Object.values(data.evaluations), ...data.timeFrames.flatMap(frame => Object.values(frame.spotSignals))]
      .map(signal => hourEnd(signal.weatherAt))].filter(Number.isFinite),
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
      if (Object.keys(spotSignals).every(id => spotSignals[id] === frame.spotSignals[id])) return frame;
      // Current BFF polygons are explicitly keyed by their formal forecast
      // sampling point. Never retain an old cell when its sample has elapsed.
      const dynamic = frame.dynamicLayer;
      const prefix = dynamic?.kind === "CLOUD" ? "cloud:" : "opportunity:";
      const allowed = new Set(Object.values(spotSignals).filter(signal => signal.weatherAt).map(signal => prefix + signal.spotId));
      const polygons = dynamic?.polygons.filter(polygon => allowed.has(polygon.id)) ?? [];
      return { ...frame, spotSignals, dynamicLayer: dynamic ? { ...dynamic, polygons,
        state: polygons.length ? "PARTIAL" as const : "UNAVAILABLE" as const } : null };
    });
    const evaluations = signalsAt(data.evaluations, data.context.selectedAtUtc);
    const scopeExpired = Date.parse(data.forecastValidUntil ?? "") <= now;
    if (!changed && !scopeExpired) return data;
    const elapsedSpotIds = new Set(Object.keys(evaluations).filter(id => evaluations[id] !== data.evaluations[id]));
    const filterEvidence = Object.fromEntries(Object.entries(data.filterEvidence).map(([id, evidence]) => [id,
      elapsedSpotIds.has(id) ? { ...evidence, LESS_CLOUD: { state: "UNKNOWN" as const,
        reason: "少云：对应小时预报已结束，当前云量待核验" } } : evidence,
    ]));
    const filterCapabilities = elapsedSpotIds.size || scopeExpired ? { ...data.filterCapabilities,
      byGroup: { ...data.filterCapabilities.byGroup, LESS_CLOUD: {
        state: Object.values(filterEvidence).some(evidence => evidence.LESS_CLOUD.state !== "UNKNOWN") ? "PARTIAL" as const : "UNAVAILABLE" as const,
        reason: "查询范围内的部分小时预报已结束；少云条件需刷新后重新核验。",
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
