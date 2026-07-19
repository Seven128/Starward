import { createHash, randomUUID } from "node:crypto";

export const hashRefreshToken = (token: string) => createHash("sha256").update(token, "utf8").digest("hex");

export function rotateRefreshToken(input: { sessionId: string; presentedToken: string; storedHash: string; rotation: number; revokedAt?: string | null }) {
  if (input.revokedAt || hashRefreshToken(input.presentedToken) !== input.storedHash) return { ok: false as const, reason: "invalid_or_revoked_refresh_token" };
  return { ok: true as const, nextRotation: input.rotation + 1, tokenFamilyNonce: randomUUID(), revokePrevious: true, accessTtlSeconds: 600, refreshTokenStoredAsHash: true };
}
