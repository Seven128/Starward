import { assertSkyTargetFrames, type ApiEnvelope, type SkyTargetInstantData } from "@starward/miniapp-contracts";

export type SkyTargetInstantBinding = Pick<SkyTargetInstantData,
  "spotId" | "contextId" | "contextRevision" | "contextFingerprint" | "at">;

/** A cached fine-time result must still belong to the current Context and
 * presentation instant. An absent frame is not a genuine zero-target result. */
export function matchingSkyTargetInstantResponse(response: ApiEnvelope<SkyTargetInstantData>,
  expected: SkyTargetInstantBinding): ApiEnvelope<SkyTargetInstantData> {
  if (!["FRESH", "PARTIAL", "STALE_USABLE", "SAMPLE_DATA"].includes(response?.dataState))
    throw new Error("sky_target_instant_availability_invalid");
  if (response.validAt !== expected.at || (response.contextRevision !== undefined &&
    response.contextRevision !== expected.contextRevision))
    throw new Error("sky_target_instant_metadata_invalid");
  const data = response?.data;
  if (!data || !["spotId", "contextId", "contextRevision", "contextFingerprint", "at"].every(
    key => data[key as keyof SkyTargetInstantBinding] === expected[key as keyof SkyTargetInstantBinding]))
    throw new Error("sky_target_instant_binding_invalid");
  assertSkyTargetFrames([{ at: data.at, targets: data.targets }], [expected.at]);
  if (data.targets.some(target => !target.displayName?.trim() || !target.reason?.trim() ||
    !target.direction?.trim() || !target.source?.id?.trim()))
    throw new Error("sky_target_instant_content_invalid");
  return response;
}
