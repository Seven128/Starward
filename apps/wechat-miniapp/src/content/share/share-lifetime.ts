/** Conservatively remove the whole request transit time from the server's relative validity window. */
export function remainingPublicPlanLifetimeMs(
  generatedAt: string,
  expiresAt: string,
  requestStartedAtMs: number,
  receivedAtMs: number,
): number {
  const serverLifetimeMs = Date.parse(expiresAt) - Date.parse(generatedAt);
  const requestElapsedMs = receivedAtMs - requestStartedAtMs;
  if (!Number.isFinite(serverLifetimeMs) || !Number.isFinite(requestElapsedMs) || requestElapsedMs < 0) return 0;
  return Math.max(0, serverLifetimeMs - requestElapsedMs);
}
