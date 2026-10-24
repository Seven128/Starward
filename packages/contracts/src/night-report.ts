export type DataStatus = "fresh" | "cached" | "stale" | "partial" | "missing" | "failed";

export type Wgs84Location = {
  lat: number;
  lon: number;
  system: "WGS84";
  label: string;
};

export type NightReportRequest = {
  requestId: string;
  location: Wgs84Location;
  timezone: string;
  nightDate: string;
  profile: "neutral" | "beginner" | "family" | "milky-way" | "visual" | "camping";
  target: string;
  route: { origin: Wgs84Location; maxTravelMinutes: number; modes: Array<"drive" | "cycle" | "transit" | "walk"> };
};

export type DataPart = {
  state: DataStatus;
  source: string;
  sourceVersion: string | null;
  sourceTime: string | null;
  confidence: number;
  warning?: string;
};

export type NightReportSpot = {
  id: string;
  name: string;
  role: "primary" | "near-backup" | "weather-backup" | "dark-backup";
  score: number;
  distanceKm: number | null;
  travelMinutes: number | null;
  routeState: DataStatus;
  reasons: string[];
  risks: string[];
};

export type NightReportTarget = {
  id: string;
  name: string;
  visible: boolean;
  window: { start: string; end: string } | null;
  peak: { at: string; altitudeDeg: number; azimuthDeg: number } | null;
  difficulty: "easy" | "medium" | "hard";
  impact: string;
};

export type NightReportConditions = {
  weather: {
    at: string | null;
    conditionText: string | null;
    temperatureC: number | null;
    apparentTemperatureC: number | null;
    totalCloudPct: number | null;
    lowCloudPct: number | null;
    midCloudPct: number | null;
    highCloudPct: number | null;
    visibilityM: number | null;
    aqi: number | null;
    windSpeedMps: number | null;
    windDirectionDeg: number | null;
    precipitationProbabilityPct: number | null;
    relativeHumidityPct: number | null;
    dewPointC: number | null;
  } | null;
  astronomy: {
    moonIllumination: number | null;
    moonRise: string | null;
    moonSet: string | null;
    astronomicalDusk: string | null;
    astronomicalDawn: string | null;
    moonlessWindow: { start: string; end: string; durationMinutes: number } | null;
  } | null;
  lightPollution: { radiance: number | null; year: number | null; state: "unknown" | "available"; boundary: string };
};

export type NightReport = {
  id: string;
  revision: number;
  requestId: string;
  generatedAt: string;
  expiresAt: string;
  status: "ready" | "partial" | "insufficient-data" | "blocked";
  context: Omit<NightReportRequest, "requestId">;
  decision: {
    category: "excellent" | "good" | "mixed" | "not-recommended" | "safety-risk" | "insufficient-data";
    score: number | null;
    confidence: number;
    summary: string;
    reasons: string[];
    blockers: string[];
  };
  observationWindow: { start: string; end: string; durationMinutes: number } | null;
  primarySpot: NightReportSpot | null;
  backupSpots: NightReportSpot[];
  targets: NightReportTarget[];
  conditions: NightReportConditions;
  parts: Record<"weather" | "astronomy" | "spots" | "route", DataPart>;
  warnings: string[];
  provenance: Array<{ source: string; version: string; generatedAt: string }>;
};

const object = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === "object" && !Array.isArray(value);

export function assertNightReportRequest(value: unknown): NightReportRequest {
  if (!object(value)) throw new Error("night_report_body_required");
  if (typeof value.requestId !== "string" || !value.requestId.trim()) throw new Error("night_report_request_id_required");
  if (!object(value.location) || !object(value.route) || !object(value.route.origin)) throw new Error("night_report_context_invalid");
  for (const location of [value.location, value.route.origin]) {
    if (location.system !== "WGS84") throw new Error("night_report_wgs84_required");
    if (typeof location.lat !== "number" || !Number.isFinite(location.lat) || location.lat < -90 || location.lat > 90) throw new Error("night_report_latitude_invalid");
    if (typeof location.lon !== "number" || !Number.isFinite(location.lon) || location.lon < -180 || location.lon > 180) throw new Error("night_report_longitude_invalid");
    if (typeof location.label !== "string") throw new Error("night_report_location_label_invalid");
  }
  if (typeof value.nightDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/u.test(value.nightDate) || !Number.isFinite(Date.parse(`${value.nightDate}T00:00:00Z`)) || new Date(`${value.nightDate}T00:00:00Z`).toISOString().slice(0, 10) !== value.nightDate) throw new Error("night_report_date_invalid");
  if (typeof value.timezone !== "string" || !value.timezone.trim()) throw new Error("night_report_timezone_invalid");
  try { new Intl.DateTimeFormat("en", { timeZone: value.timezone }); } catch { throw new Error("night_report_timezone_invalid"); }
  if (typeof value.profile !== "string" || !["neutral", "beginner", "family", "milky-way", "visual", "camping"].includes(value.profile)) throw new Error("night_report_profile_invalid");
  if (typeof value.target !== "string" || !value.target || value.target.length > 80) throw new Error("night_report_target_invalid");
  if (typeof value.route.maxTravelMinutes !== "number" || !Number.isFinite(value.route.maxTravelMinutes) || value.route.maxTravelMinutes <= 0) throw new Error("night_report_route_limit_invalid");
  if (!Array.isArray(value.route.modes) || !value.route.modes.length || value.route.modes.some(mode => typeof mode !== "string" || !["drive", "cycle", "transit", "walk"].includes(mode))) throw new Error("night_report_route_mode_required");
  return value as NightReportRequest;
}

/** Fixed field order binds every supported input; object insertion order is not identity. */
export function nightReportRequestIdentity(value: NightReportRequest): string {
  const input = assertNightReportRequest(value);
  const location = (item: Wgs84Location) => ({ lat: item.lat, lon: item.lon, system: item.system, label: item.label });
  return JSON.stringify({ requestId: input.requestId, location: location(input.location), timezone: input.timezone, nightDate: input.nightDate, profile: input.profile, target: input.target, route: { origin: location(input.route.origin), maxTravelMinutes: input.route.maxTravelMinutes, modes: input.route.modes } });
}

export function nightReportMatchesRequest(report: NightReport, request: NightReportRequest): boolean {
  try { return report.requestId === request.requestId && nightReportRequestIdentity({ requestId: report.requestId, ...report.context }) === nightReportRequestIdentity(request); }
  catch { return false; }
}

export interface NightReportReceipt {
  requestId: string; reportId: string; revision: number; committedAt: string;
}
export interface PersistedNightReport {
  schemaVersion: "starward-night-report-persistence-v1";
  scope: "local-owner-poc";
  ownerId: string;
  report: NightReport;
  receipt: NightReportReceipt;
  replayed: boolean;
}

/** Server-derived dispatch qualification; a client may restrict, never grant, authority. */
export type NightReportSession = { schemaVersion: "starward-night-report-session-v1" } & (
  { storage: "ephemeral" } | { storage: "local-owner-poc-v1"; ownerId: string }
);

export function isNightReport(value: unknown): value is NightReport {
  if (!value || typeof value !== "object") return false;
  const report = value as Partial<NightReport>;
  return typeof report.id === "string"
    && report.id.length > 0
    && Number.isSafeInteger(report.revision) && report.revision! > 0
    && typeof report.requestId === "string"
    && typeof report.generatedAt === "string" && Number.isFinite(Date.parse(report.generatedAt))
    && typeof report.expiresAt === "string" && Number.isFinite(Date.parse(report.expiresAt))
    && ["ready", "partial", "insufficient-data", "blocked"].includes(report.status ?? "")
    && Boolean(report.decision && report.parts)
    && Array.isArray(report.backupSpots)
    && Array.isArray(report.targets)
    && Boolean(report.conditions)
    && Array.isArray(report.provenance);
}
