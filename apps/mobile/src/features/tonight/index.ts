export function createTonightContext(input: { timezone: string; target: string }) {
  if (!input.timezone.includes("/")) throw new Error("tonight_timezone_required");
  if (!input.target) throw new Error("tonight_target_required");
  return { timezone: input.timezone, target: input.target, sourceAssembly: "server-aggregated-versioned-snapshot" as const, clientProviderStitching: false };
}
