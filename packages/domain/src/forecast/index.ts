export type DataQuality = "fresh" | "cached" | "partial" | "missing";

export interface AstronomyEvidenceInput {
  instant: string;
  location: { lat: number; lon: number; system: "WGS84" };
  timezone: string;
  target: string;
  orbitEpoch?: string;
}

export interface AstronomyEvidence {
  target: string;
  instantUtc: string;
  timezone: string;
  coordinateSystem: "WGS84";
  observer: { lat: number; lon: number };
  algorithmVersion: string;
  catalogOrOrbitVersion: string;
  orbitEpoch: string | null;
  confidence: number;
  stale: boolean;
  limitations: string[];
}

const validInstant = (value: string, field: string) => {
  const millis = Date.parse(value);
  if (!Number.isFinite(millis) || !/[zZ]|[+-]\d\d:\d\d$/u.test(value)) {
    throw new TypeError(`${field}_must_include_timezone`);
  }
  return millis;
};

export function computeAstronomyEvidence(input: AstronomyEvidenceInput): AstronomyEvidence {
  const instant = validInstant(input.instant, "instant");
  if (input.location.system !== "WGS84") throw new TypeError("astronomy_requires_wgs84");
  if (!input.timezone.includes("/")) throw new TypeError("timezone_must_be_iana");

  const orbitEpoch = input.orbitEpoch ?? null;
  const ageHours = orbitEpoch ? Math.abs(instant - validInstant(orbitEpoch, "orbit_epoch")) / 3_600_000 : 0;
  const isSatellite = /ISS|SATELLITE|TIANGONG/iu.test(input.target);
  const stale = isSatellite && (!orbitEpoch || ageHours > 12);

  return {
    target: input.target,
    instantUtc: new Date(instant).toISOString(),
    timezone: input.timezone,
    coordinateSystem: "WGS84",
    observer: { lat: input.location.lat, lon: input.location.lon },
    algorithmVersion: "starward-astronomy-adapter@1.0.0",
    catalogOrOrbitVersion: isSatellite ? "celestrak-omm-schema@1" : "astronomy-engine-catalog@1",
    orbitEpoch,
    confidence: stale ? 0.42 : 0.86,
    stale,
    limitations: stale ? ["轨道根数超过空间站 12 小时更新窗口", "仅作方向参考，等待新 OMM 批次"] : [],
  };
}

export interface AtmosphereInput {
  providerSeeing: number | null;
  calibrated: boolean;
  cloud: number | null;
  windMps: number | null;
  humidity: number | null;
}

export function describeAtmosphere(input: AtmosphereInput) {
  const factors = [
    { key: "cloud", label: "总云量", value: input.cloud, unit: "ratio" },
    { key: "wind", label: "地面风速", value: input.windMps, unit: "m/s" },
    { key: "humidity", label: "相对湿度", value: input.humidity, unit: "ratio" },
  ];
  const hasOfficialSeeing = input.providerSeeing !== null && input.calibrated;
  const availableFactors = factors.filter((factor) => factor.value !== null).length;
  return {
    label: hasOfficialSeeing ? "经验证的视宁度" : "通透度估计 / 实验性大气稳定度",
    officialSeeing: hasOfficialSeeing,
    providerValue: hasOfficialSeeing ? input.providerSeeing : null,
    confidence: hasOfficialSeeing ? 0.82 : Math.round((0.26 + availableFactors * 0.1) * 100) / 100,
    factors,
    uncertainty: hasOfficialSeeing ? "受观测设备和近地湍流影响" : `没有专业视宁度供应商或现场校准，不输出 arcsec 结论；${3 - availableFactors} 项输入缺失`,
    methodVersion: "atmosphere-explainable@1.0.0",
  };
}

export interface ProviderHourInput {
  validTimeUtc: string;
  providerRunId: string;
  temperatureC: number | null;
  totalCloud: number | null;
  lowCloud: number | null;
  midCloud: number | null;
  highCloud: number | null;
  visibilityM: number | null;
  windMps: number | null;
  humidity: number | null;
}

export function normalizeWeatherHour(input: ProviderHourInput) {
  validInstant(input.validTimeUtc, "valid_time");
  const values = Object.values(input).filter((value): value is number => typeof value === "number");
  if (values.some((value) => !Number.isFinite(value))) throw new TypeError("weather_value_must_be_finite_or_null");
  return {
    ...input,
    units: { temperatureC: "°C", cloud: "%", visibilityM: "m", windMps: "m/s", humidity: "%" },
    quality: values.length >= 7 ? "fresh" as const : "partial" as const,
    missingFields: Object.entries(input).filter(([, value]) => value === null).map(([key]) => key),
  };
}

export function intersectNightWindows(...windows: Array<{ startUtc: string; endUtc: string }>) {
  if (!windows.length) return null;
  const start = Math.max(...windows.map((item) => validInstant(item.startUtc, "window_start")));
  const end = Math.min(...windows.map((item) => validInstant(item.endUtc, "window_end")));
  return start < end ? { startUtc: new Date(start).toISOString(), endUtc: new Date(end).toISOString(), durationMinutes: Math.round((end - start) / 60_000) } : null;
}
