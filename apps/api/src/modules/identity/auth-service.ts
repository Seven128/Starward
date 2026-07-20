import { createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { availableAuthMethods, type AuthMethod } from "@starward/domain/identity";

const digest = (value: string) => createHash("sha256").update(value).digest();
export interface OtpChallenge { id: string; phoneHash: string; codeHash: string; expiresAt: string; attempts: number; consumedAt: string | null }
export function issueOtpChallenge(phoneE164: string, now: string, code = String(Math.floor(100000 + Math.random() * 900000))) {
  if (!/^\+[1-9]\d{7,14}$/u.test(phoneE164)) throw new TypeError("invalid_phone");
  return { challenge: { id: randomUUID(), phoneHash: digest(phoneE164).toString("hex"), codeHash: digest(code).toString("hex"), expiresAt: new Date(Date.parse(now) + 300_000).toISOString(), attempts: 0, consumedAt: null } satisfies OtpChallenge, deliveryCode: code };
}
export function verifyOtpChallenge(challenge: OtpChallenge, code: string, now: string) {
  if (challenge.consumedAt || Date.parse(now) > Date.parse(challenge.expiresAt) || challenge.attempts >= 5) return { ok: false as const, reason: "expired_or_locked" };
  const actual = digest(code); const expected = Buffer.from(challenge.codeHash, "hex");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return { ok: false as const, reason: "invalid_code", nextAttempts: challenge.attempts + 1 };
  return { ok: true as const, consumedAt: now, accessTtlSeconds: 600, refreshToken: randomBytes(32).toString("base64url"), deviceSessionId: randomUUID() };
}
export function loginSurface(input: { platform: "ios" | "android" | "web"; region: string; providerApprovals: Partial<Record<AuthMethod, boolean>> }) { return { methods: availableAuthMethods({ platform: input.platform, region: input.region, approvals: input.providerApprovals }), guestAvailable: true }; }
