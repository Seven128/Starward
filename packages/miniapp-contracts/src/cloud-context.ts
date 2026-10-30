import { CLOUD_NATIVE_STEPS, CLOUD_SAMPLING_POLICY, cloudInstant } from "./cloud-grid.ts";

export const TOTAL_CLOUD_POLICY = "ECMWF_IFS_TCC_V1" as const;
export const TOTAL_CLOUD_CONTEXT_SCHEMA = "total-cloud-context-v1" as const;

/** A server-selected immutable publication, shared by every reader of one
 * Observation Context. This is a public identity, never a filesystem locator. */
export interface TotalCloudPublicationPin {
  schemaVersion: typeof TOTAL_CLOUD_CONTEXT_SCHEMA;
  policy: typeof TOTAL_CLOUD_POLICY;
  state: "PINNED";
  publicationId: string;
  manifestSha256: string;
  runAt: string;
  validFrom: string;
  validTo: string;
  supports240HoursUntil: string;
  samplingPolicy: typeof CLOUD_SAMPLING_POLICY;
}

/** An enabled ECMWF lane that could not select a qualified publication. It
 * must not be mistaken for the absent legacy QWeather compatibility field. */
export interface TotalCloudUnavailableContext {
  schemaVersion: typeof TOTAL_CLOUD_CONTEXT_SCHEMA;
  policy: typeof TOTAL_CLOUD_POLICY;
  state: "UNAVAILABLE";
  reason: "NOT_READY" | "READ_FAILED";
}

export type TotalCloudContext = TotalCloudPublicationPin | TotalCloudUnavailableContext;

/** The BFF supplies publication selection. null means deliberately unconfigured;
 * a configured but unavailable lane returns UNAVAILABLE or throws a read error. */
export interface TotalCloudContextOwner {
  selectCurrent(): Promise<TotalCloudContext | null>;
  /** Re-admit a cached public identity without consulting current. */
  restore?(binding: TotalCloudPublicationPin): Promise<TotalCloudPublicationPin>;
}

export function unavailableTotalCloud(reason: TotalCloudUnavailableContext["reason"]): TotalCloudUnavailableContext {
  return { schemaVersion: TOTAL_CLOUD_CONTEXT_SCHEMA, policy: TOTAL_CLOUD_POLICY, state: "UNAVAILABLE", reason };
}

/** Validate/copy at persisted and owner boundaries. This does not grant a client
 * permission to select a publication. Recovery must re-admit its identity with
 * the server publication owner; normal resolve/update accept policy intent. */
export function copyTotalCloudContext(value: unknown): TotalCloudContext {
  const fail = (): never => { throw new Error("observation_cloud_binding_invalid"); };
  if (!value || typeof value !== "object" || Array.isArray(value)) return fail();
  const binding = value as Record<string, unknown>;
  const common = ["schemaVersion", "policy", "state"];
  if (binding.schemaVersion !== TOTAL_CLOUD_CONTEXT_SCHEMA || binding.policy !== TOTAL_CLOUD_POLICY) return fail();
  if (binding.state === "UNAVAILABLE") {
    if (Object.keys(binding).sort().join() !== [...common, "reason"].sort().join()
      || !["NOT_READY", "READ_FAILED"].includes(binding.reason as string)) return fail();
    return unavailableTotalCloud(binding.reason as TotalCloudUnavailableContext["reason"]);
  }
  const keys = [...common, "publicationId", "manifestSha256", "runAt", "validFrom", "validTo", "supports240HoursUntil", "samplingPolicy"];
  if (binding.state !== "PINNED" || Object.keys(binding).sort().join() !== keys.sort().join()
    || typeof binding.publicationId !== "string" || !/^ecmwf-tcc:[a-f0-9]{64}$/u.test(binding.publicationId)
    || typeof binding.manifestSha256 !== "string" || !/^[a-f0-9]{64}$/u.test(binding.manifestSha256)
    || binding.samplingPolicy !== CLOUD_SAMPLING_POLICY) return fail();
  const runAt = cloudInstant(binding.runAt), validFrom = cloudInstant(binding.validFrom), validTo = cloudInstant(binding.validTo),
    supports240HoursUntil = cloudInstant(binding.supports240HoursUntil);
  if (!runAt || !validFrom || !validTo || !supports240HoursUntil) return fail();
  const run = Date.parse(runAt), end = Date.parse(validTo), stepHours = (end - run) / 3_600_000;
  if (run % (12 * 3_600_000) !== 0 || Date.parse(validFrom) !== run || stepHours < 240
    || !CLOUD_NATIVE_STEPS.includes(stepHours) || Date.parse(supports240HoursUntil) !== end - 240 * 3_600_000) return fail();
  return { schemaVersion: TOTAL_CLOUD_CONTEXT_SCHEMA, policy: TOTAL_CLOUD_POLICY, state: "PINNED",
    publicationId: binding.publicationId, manifestSha256: binding.manifestSha256,
    runAt, validFrom, validTo, supports240HoursUntil, samplingPolicy: CLOUD_SAMPLING_POLICY };
}

/** Only complete future coverage is tested here, not forecast accuracy or a
 * promise that this remains the newest source run. Expiry never selects latest. */
export function totalCloudSupports240Hours(binding: TotalCloudContext, now: number): binding is TotalCloudPublicationPin {
  return binding.state === "PINNED" && Number.isFinite(now) && now >= Date.parse(binding.runAt)
    && now <= Date.parse(binding.supports240HoursUntil);
}
