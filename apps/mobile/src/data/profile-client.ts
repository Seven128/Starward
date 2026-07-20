export type ProfileCommand = "merge-guest" | "revoke-session" | "inspect-content" | "request-export" | "request-deletion" | "open-sources" | "restrict-location";
export interface ProfileSnapshot {
  schemaVersion: "starward-profile-v1"; revision: number;
  user: { displayName: string; observerTypes: string[]; activePreset: string };
  localGuestData: { total: number; retainedUntilAcknowledged: boolean };
  merge: { state: string; selectedCount: number; conflictCount: number; idempotencyKeys: string[] };
  sessions: Array<{ id: string; label: string; current: boolean; revokedAt: string | null; lastActiveAt: string }>;
  content: { contributions: Record<string, number>; offlinePacks: number; equipment: Array<{ id: string; label: string; referencedByPlans: number; state: string }> };
  exportJob: null | { schemaVersion: number; generatedAt: string; expiresAt: string; included: string[]; excluded: Array<{ category: string; reason: string }> };
  deletion: null | { state: string; coolingOffEndsAt: string; primaryDeleteBy: string; backupExpiryBy: string; sessionsRevokedAt: string };
  privacy: { analyticsConsent: boolean; consentRevision: number; locationHistoryState: string; sharedCoordinate: { precision: string; coordinate: { lat: number; lon: number } }; sanitizedAnalytics: Record<string, unknown> };
  sources: { appBuild: string; registryVersion: string; items: Array<{ category: string; source: string; version: string; licenseState: string; updatedAt: string }> };
  boundaries: string[];
}
export function createProfileClient(options: { baseUrl?: string; fetcher?: typeof fetch } = {}) {
  const baseUrl = options.baseUrl ?? process.env.EXPO_PUBLIC_API_BASE_URL; const fetcher = options.fetcher ?? fetch;
  const request = async (path: string, init?: RequestInit) => { if (!baseUrl) throw new Error("profile_api_base_url_missing"); const response = await fetcher(`${baseUrl.replace(/\/$/u, "")}${path}`, { headers: { accept: "application/json", "content-type": "application/json" }, ...init }); if (!response.ok) throw new Error(`profile_http_${response.status}`); const value = await response.json() as ProfileSnapshot; if (value.schemaVersion !== "starward-profile-v1") throw new Error("profile_response_invalid"); return value; };
  return { get: (signal?: AbortSignal) => request("/v1/profile", { signal }), command: (command: ProfileCommand) => request("/v1/profile/commands", { method: "POST", body: JSON.stringify({ command }) }) };
}
