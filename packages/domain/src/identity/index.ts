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

export function authorizeCoordinate(input: { visibility: "private" | "invite_only" | "members" | "approximate" | "public"; viewer: "owner" | "invitee" | "member" | "anonymous"; lat: number; lon: number }) {
  const precise = input.viewer === "owner" || (input.visibility === "invite_only" && input.viewer === "invitee") || (input.visibility === "members" && input.viewer === "member") || input.visibility === "public";
  return precise ? { precision: "precise", coordinate: { lat: input.lat, lon: input.lon } } : { precision: "coarse", coordinate: { lat: Math.round(input.lat * 10) / 10, lon: Math.round(input.lon * 10) / 10 } };
}
