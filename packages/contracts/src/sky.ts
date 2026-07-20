export type SkyDataState = "fresh" | "partial" | "missing";

export interface SkyQuery {
  latitude: number;
  longitude: number;
  elevationM: number;
  timezone: string;
  at: string;
  target: "milky-way-core" | "sirius" | "vega" | "antares" | "m31";
}

export interface SkyPosition {
  id: string;
  name: string;
  kind: "star" | "deep-sky" | "constellation-anchor" | "milky-way-core";
  magnitude: number;
  altitudeDeg: number;
  azimuthDeg: number;
  visible: boolean;
  obstructed: boolean | null;
}

export interface SkyTrajectorySample {
  at: string;
  altitudeDeg: number;
  azimuthDeg: number;
  aboveAstronomicalHorizon: boolean;
}

export interface SkyContext {
  schemaVersion: "starward-sky-context-v1";
  state: SkyDataState;
  generatedAt: string;
  algorithm: { name: "Astronomy Engine"; version: string; coordinateSystem: "WGS84"; refraction: "normal" };
  context: SkyQuery;
  catalog: { loadedChunk: "bright"; deferredChunks: string[]; magnitudeLimit: number };
  objects: SkyPosition[];
  selectedTarget: SkyPosition | null;
  trajectory: SkyTrajectorySample[];
  bestTargetTime: string | null;
  horizon: null;
  warnings: string[];
}

const dateTime = /^\d{4}-\d{2}-\d{2}T/u;
const targets = new Set<SkyQuery["target"]>(["milky-way-core", "sirius", "vega", "antares", "m31"]);

export function parseSkyQuery(input: Record<string, unknown>): SkyQuery {
  const latitude = Number(input.latitude);
  const longitude = Number(input.longitude);
  const elevationM = input.elevationM === undefined ? 0 : Number(input.elevationM);
  const timezone = String(input.timezone ?? "");
  const at = String(input.at ?? "");
  const target = String(input.target ?? "milky-way-core") as SkyQuery["target"];
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) throw new TypeError("sky_latitude_invalid");
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) throw new TypeError("sky_longitude_invalid");
  if (!Number.isFinite(elevationM) || elevationM < -500 || elevationM > 10_000) throw new TypeError("sky_elevation_invalid");
  if (!dateTime.test(at) || !Number.isFinite(new Date(at).getTime())) throw new TypeError("sky_time_invalid");
  if (!targets.has(target)) throw new TypeError("sky_target_invalid");
  try { new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format(new Date()); }
  catch { throw new TypeError("sky_timezone_invalid"); }
  return { latitude, longitude, elevationM, timezone, at: new Date(at).toISOString(), target };
}

export function isSkyContext(value: unknown): value is SkyContext {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<SkyContext>;
  return candidate.schemaVersion === "starward-sky-context-v1"
    && Array.isArray(candidate.objects)
    && Array.isArray(candidate.trajectory)
    && typeof candidate.algorithm?.version === "string";
}
