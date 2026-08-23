import {
  validateExternalUrl,
  type PlatformKind,
} from "@starward/miniapp-contracts";
export { validateExternalUrl } from "@starward/miniapp-contracts";

export const AUTO_IMPORT_POLICY = Object.freeze({
  enabled: false,
  licensedPlatforms: Object.freeze([] as PlatformKind[]),
  maxRedirects: 3,
  maxBytes: 2_000_000,
  allowedMime: Object.freeze(["text/html", "application/json"]),
  totalTimeoutMs: 4_000,
  dnsIpRecheckRequired: true,
  manualFallbackAlwaysAvailable: true,
  reason:
    "The current product has no verified third-party parser license or allowlisted server adapter",
});

export function parserGate(platform: PlatformKind, rawUrl: string) {
  const validation = validateExternalUrl(rawUrl);
  if (!validation.ok)
    return { allowed: false, validation, reason: validation.code };
  if (
    !AUTO_IMPORT_POLICY.enabled ||
    !AUTO_IMPORT_POLICY.licensedPlatforms.includes(platform)
  ) {
    return {
      allowed: false,
      validation,
      reason: "CAPABILITY_DISABLED_UNLICENSED",
      policy: AUTO_IMPORT_POLICY,
    };
  }
  return {
    allowed: true,
    validation,
    reason: "ALLOWLISTED",
    policy: AUTO_IMPORT_POLICY,
  };
}
