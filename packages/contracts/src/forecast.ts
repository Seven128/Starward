export type ForecastDataStatus = "fresh" | "cached" | "stale" | "partial" | "missing" | "failed";
export type ForecastRuntimeMode = "production" | "noncommercial-poc";

export interface ForecastQuery {
  latitude: number;
  longitude: number;
  timezone: string;
  nightDate: string;
  target: "milky-way-core" | "moon" | "mercury" | "venus" | "mars" | "jupiter" | "saturn";
}

export interface ForecastAttribution {
  label: string;
  url: string;
  licenseId: string;
  licenseVersion: string;
  modified: boolean;
}

export interface ForecastRunDescriptor {
  provider: string;
  model: string;
  runId: string;
  modelRunTimeUtc: string;
  ingestedAt: string;
  expiresAt: string;
  resolutionKm: number | null;
  status: ForecastDataStatus;
  sourceLicense: string;
  use: ForecastRuntimeMode;
  attribution: ForecastAttribution[];
  qualityFlags: string[];
}

export interface ProfessionalForecastHour {
  validTimeUtc: string;
  conditionText: string | null;
  temperatureC: number | null;
  apparentTemperatureC: number | null;
  relativeHumidityPct: number | null;
  dewPointC: number | null;
  dewPointSpreadC: number | null;
  pressureHpa: number | null;
  pressureChangeHpa: number | null;
  totalCloudPct: number | null;
  lowCloudPct: number | null;
  midCloudPct: number | null;
  highCloudPct: number | null;
  visibilityM: number | null;
  windSpeedMps: number | null;
  windGustMps: number | null;
  windDirectionDeg: number | null;
  precipitationMm: number | null;
  precipitationProbabilityPct: number | null;
  fogProbabilityPct: number | null;
  aqi: number | null;
  aqiScale: string | null;
  pm25UgM3: number | null;
  pm10UgM3: number | null;
  aerosolOpticalDepth: number | null;
  moonIlluminationPct: number | null;
  moonAltitudeDeg: number | null;
  moonAzimuthDeg: number | null;
  targetAltitudeDeg: number | null;
  targetAzimuthDeg: number | null;
  atmosphere: {
    label: string;
    confidence: number;
    factors: Array<{ key: string; label: string; value: number | null; unit: string }>;
    uncertainty: string;
    methodVersion: string;
    officialSeeing: boolean;
  };
  quality: ForecastDataStatus;
  missingFields: string[];
}

export interface ForecastModelSeries {
  run: ForecastRunDescriptor;
  hours: ProfessionalForecastHour[];
}

export interface ForecastModelComparison {
  status: ForecastDataStatus;
  confidence: number;
  explanation: string;
  consensusStartUtc: string | null;
  consensusEndUtc: string | null;
  disagreementStartUtc: string | null;
  disagreementEndUtc: string | null;
  comparedFields: string[];
}

export interface ForecastTrendDay {
  date: string;
  status: ForecastDataStatus;
  confidence: number;
  conditionText: string | null;
  lowTemperatureC: number | null;
  highTemperatureC: number | null;
  averageTotalCloudPct: number | null;
  precipitationMm: number | null;
  precipitationProbabilityPct: number | null;
  moonIlluminationPct: number | null;
  astronomicalDarkMinutes: number | null;
  moonlessDarkMinutes: number | null;
  targetVisibleMinutes: number | null;
  planningOnly: true;
}

export interface AstronomyTimelineEvidence {
  algorithmVersion: string;
  coordinateSystem: "WGS84";
  timezone: string;
  nightDate: string;
  observer: { latitude: number; longitude: number; elevationM: number };
  civilDusk: string | null;
  nauticalDusk: string | null;
  astronomicalDusk: string | null;
  astronomicalDawn: string | null;
  nauticalDawn: string | null;
  civilDawn: string | null;
  moonRise: string | null;
  moonSet: string | null;
  astronomicalDarkWindow: { startUtc: string; endUtc: string; durationMinutes: number } | null;
  moonlessWindow: { startUtc: string; endUtc: string; durationMinutes: number } | null;
  targetWindow: { startUtc: string; endUtc: string; durationMinutes: number } | null;
  bestIntersection: { startUtc: string; endUtc: string; durationMinutes: number } | null;
  limitations: string[];
}

export interface ForecastLayerDescriptor {
  id: string;
  name: string;
  status: ForecastDataStatus;
  provider: string;
  model: string;
  runId: string;
  generatedAt: string;
  nextUpdateAt: string;
  opacity: number;
  legend: Array<{ from: number; to: number; label: string; color: string }>;
  valueUnit: "%";
  timeUtc: string;
  tileUrl: string | null;
  limitation: string | null;
  attribution: ForecastAttribution[];
}

export interface ForecastBundle {
  schemaVersion: "starward-forecast-bundle-v1";
  status: ForecastDataStatus;
  runtimeMode: ForecastRuntimeMode;
  generatedAt: string;
  expiresAt: string;
  context: ForecastQuery & { coordinateSystem: "WGS84" };
  primary: ForecastModelSeries;
  comparison: ForecastModelSeries | null;
  modelComparison: ForecastModelComparison;
  trends: ForecastTrendDay[];
  astronomy: AstronomyTimelineEvidence;
  layers: ForecastLayerDescriptor[];
  warnings: string[];
}

const validDate = /^\d{4}-\d{2}-\d{2}$/u;

export function parseForecastQuery(input: Record<string, unknown>): ForecastQuery {
  const latitude = Number(input.latitude);
  const longitude = Number(input.longitude);
  const timezone = String(input.timezone ?? "");
  const nightDate = String(input.nightDate ?? "");
  const target = String(input.target ?? "milky-way-core") as ForecastQuery["target"];
  const targets = new Set<ForecastQuery["target"]>(["milky-way-core", "moon", "mercury", "venus", "mars", "jupiter", "saturn"]);
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) throw new TypeError("forecast_latitude_invalid");
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) throw new TypeError("forecast_longitude_invalid");
  if (!validDate.test(nightDate)) throw new TypeError("forecast_night_date_invalid");
  if (!targets.has(target)) throw new TypeError("forecast_target_invalid");
  try { new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format(new Date()); }
  catch { throw new TypeError("forecast_timezone_invalid"); }
  return { latitude, longitude, timezone, nightDate, target };
}
