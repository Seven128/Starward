export type SpotFactState = "known" | "unknown" | "temporary-unavailable" | "conflict";
export interface SpotTrustDetail {
  id: string;
  name: string;
  status: "open" | "caution" | "closed";
  statusReason: string | null;
  updatedAt: string;
  coordinate: { level: "hidden" | "exact" | "approximate"; coordinate: { lat: number; lon: number; system: "WGS84" } | null; exact: boolean; reason: string | null };
  facts: Array<{ key: string; state: SpotFactState; value: string | number | boolean | null; sources: Array<{ id: string; sourceType: string; sourceLabel: string; observedAt: string; expiresAt: string | null; version: string }>; conflict: boolean; safetyConservative: boolean }>;
  actions: Array<{ action: "share" | "navigate" | "offline" | "itinerary"; allowed: boolean; coordinateLevel: string; reason: string | null }>;
  trust: { verifiedSources: number; conflicts: string[]; fieldVerificationRequired: boolean };
}

export function isSpotTrustDetail(value: unknown): value is SpotTrustDetail {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<SpotTrustDetail>;
  return typeof item.id === "string" && typeof item.name === "string" && Array.isArray(item.facts) && Array.isArray(item.actions) && typeof item.coordinate?.exact === "boolean";
}
