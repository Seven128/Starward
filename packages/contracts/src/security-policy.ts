export const securityPolicy = Object.freeze({
  transport: { httpsRequired: true },
  token: { accessTtlSeconds: 600, refreshRotationRequired: true, storage: "secure-store" },
  admin: { mfaRequired: true },
  upload: { credentialTtlSeconds: 600 },
  logs: { redactSecrets: true, redactExactLocation: true },
});

export function evaluateSecurityRequest(input: { actor?: { role?: string; mfa?: boolean }; action?: string; signatureAgeSeconds?: number; outcome?: string }) {
  if (input.action?.startsWith("admin.") && (input.actor?.role !== "admin" || input.actor?.mfa !== true)) return { allowed: false, reason: "admin_mfa_required" };
  if ((input.signatureAgeSeconds ?? 0) > 900) return { allowed: false, reason: "request_signature_expired" };
  if (!input.actor?.role || input.actor.role === "anonymous") return { allowed: false, reason: "authentication_required" };
  return { allowed: true, outcome: input.outcome, audit: { action: input.action, secretsRedacted: true } };
}
