export interface DeviceSession {
  id: string;
  userId: string;
  refreshTokenHash: string;
  current: boolean;
  revokedAt: string | null;
  rotation: number;
}

export function revokeSession(sessions: DeviceSession[], targetId: string, actorId: string, reauthenticated: boolean) {
  if (!reauthenticated) return { ok: false as const, reason: "reauthentication_required", sessions };
  const target = sessions.find((item) => item.id === targetId && item.userId === actorId);
  if (!target || target.current) return { ok: false as const, reason: target?.current ? "current_session_requires_logout_flow" : "session_not_found", sessions };
  const revokedAt = new Date().toISOString();
  return { ok: true as const, sessions: sessions.map((item) => item.id === targetId ? { ...item, revokedAt } : item), audit: { action: "session.revoked", sessionId: targetId, actorId, at: revokedAt } };
}

export type CoordinateVisibility = "private" | "invite_only" | "collaborators" | "members" | "approximate" | "public";
export function authorizeCoordinate(input: { visibility: CoordinateVisibility; viewer: "owner" | "invitee" | "collaborator" | "member" | "anonymous"; lat: number; lon: number }) {
  const precise = input.viewer === "owner" || (input.visibility === "invite_only" && input.viewer === "invitee") || (input.visibility === "collaborators" && input.viewer === "collaborator") || (input.visibility === "members" && input.viewer === "member") || input.visibility === "public";
  return precise ? { precision: "precise", coordinate: { lat: input.lat, lon: input.lon } } : { precision: "coarse", coordinate: { lat: Math.round(input.lat * 10) / 10, lon: Math.round(input.lon * 10) / 10 } };
}

export type AuthMethod = "phone-otp" | "apple" | "wechat";
export function availableAuthMethods(input: { platform: "ios" | "android" | "web"; region: string; approvals: Partial<Record<AuthMethod, boolean>> }): AuthMethod[] {
  const candidates: AuthMethod[] = ["phone-otp"];
  if (input.platform === "ios") candidates.push("apple");
  if (input.region === "CN") candidates.push("wechat");
  return candidates.filter((method) => input.approvals[method] === true);
}

const analyticsForbidden = /^(?:lat|lon|latitude|longitude|trajectory|contacts|privateSpot|exif|exactLocation|routeGeometry)$/u;
export function sanitizeAnalyticsPayload(input: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(input).flatMap(([key, value]) => {
    if (analyticsForbidden.test(key)) return [];
    if (value && typeof value === "object" && !Array.isArray(value)) return [[key, sanitizeAnalyticsPayload(value as Record<string, unknown>)]];
    return [[key, value]];
  }));
}

export const RETENTION_POLICY = Object.freeze({ preciseSessionHours: 24, rawExifHours: 24, diagnosticsDays: 30, rawAnalyticsDays: 90, aggregateMetricsMonths: 13, securityEvidenceDays: 180, backupMaxDays: 90, deletionCoolingOffDays: 7, primaryDeletionDays: 30 });
export type DeletionState = "cooling-off" | "executing" | "completed" | "cancelled" | "legal-hold";
export interface DeletionRequest { id: string; userId: string; state: DeletionState; requestedAt: string; coolingOffEndsAt: string; sessionsRevokedAt: string; primaryDeleteBy: string; backupExpiryBy: string; publicContributionChoice: "delete-personal" | "anonymize-facts"; legalHoldReason?: string }
export function createDeletionRequest(input: { id: string; userId: string; requestedAt: string; reauthenticated: boolean; publicContributionChoice: DeletionRequest["publicContributionChoice"] }): DeletionRequest {
  if (!input.reauthenticated) throw new Error("reauthentication_required");
  const at = Date.parse(input.requestedAt); if (!Number.isFinite(at)) throw new TypeError("invalid_requested_at");
  const plusDays = (days: number) => new Date(at + days * 86_400_000).toISOString();
  return { id: input.id, userId: input.userId, state: "cooling-off", requestedAt: input.requestedAt, coolingOffEndsAt: plusDays(RETENTION_POLICY.deletionCoolingOffDays), sessionsRevokedAt: input.requestedAt, primaryDeleteBy: plusDays(RETENTION_POLICY.primaryDeletionDays), backupExpiryBy: plusDays(RETENTION_POLICY.backupMaxDays), publicContributionChoice: input.publicContributionChoice };
}

export interface ExportProjection { schemaVersion: 1; userId: string; generatedAt: string; expiresAt: string; included: string[]; excluded: Array<{ category: string; reason: string }>; payload: Record<string, unknown> }
export function buildExportProjection(input: { userId: string; generatedAt: string; payload: Record<string, unknown> }): ExportProjection {
  const allowed = ["account", "preferences", "equipment", "favorites", "itineraries", "contributions", "shooting", "notifications", "consents"];
  const payload = Object.fromEntries(allowed.filter((key) => key in input.payload).map((key) => [key, input.payload[key]]));
  return { schemaVersion: 1, userId: input.userId, generatedAt: input.generatedAt, expiresAt: new Date(Date.parse(input.generatedAt) + 86_400_000).toISOString(), included: Object.keys(payload), excluded: [{ category: "third-party-restricted", reason: "license" }, { category: "other-user-private-fields", reason: "privacy" }, { category: "exact-analytics-location", reason: "not-collected" }], payload };
}
