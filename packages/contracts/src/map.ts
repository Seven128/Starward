export type SpotMapState = "recommended" | "caution" | "risk" | "insufficient" | "closed";
export type RouteMode = "drive" | "walk" | "cycle" | "transit";

export interface MapSpotSummary {
  id: string;
  name: string;
  coordinate: { lat: number; lon: number; system: "WGS84" };
  distanceMeters: number;
  status: "verified" | "provisional";
  mapState: SpotMapState;
  facilities: string[];
  verificationAt: string | null;
  imageUrl: string | null;
  source: { label: string; url: string; licenseId: string; fetchedAt: string };
  factsBoundary: string;
}

export interface MapSpotPage {
  items: MapSpotSummary[];
  nextCursor: string | null;
  context: { center: { lat: number; lon: number; system: "WGS84" }; radiusMeters: number; limit: number };
  generatedAt: string;
  status: "fresh" | "partial" | "empty";
}

export interface MapRouteRequest {
  requestId: string;
  origin: { lat: number; lon: number; system: "WGS84" };
  destination: { lat: number; lon: number; system: "WGS84" };
  mode: RouteMode;
}

export interface MapRouteSnapshot {
  id: string;
  requestId: string;
  provider: string;
  providerVersion: string;
  generatedAt: string;
  expiresAt: string;
  state: "fresh" | "cached" | "missing";
  authoritativeCoordinates: { origin: MapRouteRequest["origin"]; destination: MapRouteRequest["destination"] };
  providerCoordinateSystem: "GCJ-02";
  mode: RouteMode;
  distanceMeters: number | null;
  durationSeconds: number | null;
  straightLineReferenceMeters: number;
  navigationUsable: boolean;
  geometry: string | null;
  warning: string | null;
}

export function isMapSpotPage(value: unknown): value is MapSpotPage {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<MapSpotPage>;
  return Array.isArray(item.items) && typeof item.generatedAt === "string" && typeof item.context?.radiusMeters === "number";
}

export function isMapRouteSnapshot(value: unknown): value is MapRouteSnapshot {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<MapRouteSnapshot>;
  return typeof item.id === "string" && ["fresh", "cached", "missing"].includes(item.state ?? "") && item.authoritativeCoordinates?.origin.system === "WGS84";
}
