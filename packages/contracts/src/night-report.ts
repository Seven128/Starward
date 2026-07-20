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
  profile: "family" | "milky-way";
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
  parts: Record<"weather" | "astronomy" | "spots" | "route", DataPart>;
  warnings: string[];
  provenance: Array<{ source: string; version: string; generatedAt: string }>;
};

export function assertNightReportRequest(input: NightReportRequest) {
  if (!input.requestId) throw new Error("night_report_request_id_required");
  if (input.location.system !== "WGS84" || input.route.origin.system !== "WGS84") throw new Error("night_report_wgs84_required");
  if (!Number.isFinite(input.location.lat) || input.location.lat < -90 || input.location.lat > 90) throw new Error("night_report_latitude_invalid");
  if (!Number.isFinite(input.location.lon) || input.location.lon < -180 || input.location.lon > 180) throw new Error("night_report_longitude_invalid");
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(input.nightDate)) throw new Error("night_report_date_invalid");
  if (!input.timezone.includes("/")) throw new Error("night_report_timezone_invalid");
  if (!Number.isFinite(input.route.maxTravelMinutes) || input.route.maxTravelMinutes <= 0) throw new Error("night_report_route_limit_invalid");
  if (!input.route.modes.length) throw new Error("night_report_route_mode_required");
  return input;
}

export function isNightReport(value: unknown): value is NightReport {
  if (!value || typeof value !== "object") return false;
  const report = value as Partial<NightReport>;
  return typeof report.id === "string"
    && typeof report.revision === "number"
    && typeof report.generatedAt === "string"
    && typeof report.expiresAt === "string"
    && Boolean(report.decision && report.parts)
    && Array.isArray(report.backupSpots)
    && Array.isArray(report.targets)
    && Array.isArray(report.provenance);
}
