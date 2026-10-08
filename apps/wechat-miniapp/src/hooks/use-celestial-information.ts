import { DEEP_SKY_SOURCE_FINITE_IMAGE_VERSION, isCelestialObjectReference, isDeepSkyObjectReference } from "@starward/miniapp-contracts";
import { getCelestialObjectInformation } from "@/services/api-client";
import { useResourceQuery } from "./use-resource-query";

/** The object modal and its source page share one identity-bound resource. */
export function useCelestialInformation(reference: string, enabled = true, imagePublicationHash?: string,
  opticalPublicationHash?: string) {
  return useResourceQuery({
    queryKey: ["celestial-object-information", reference, "zh-CN", DEEP_SKY_SOURCE_FINITE_IMAGE_VERSION, imagePublicationHash ?? "current",
      ...(opticalPublicationHash ? ["optical", opticalPublicationHash] : [])],
    queryFn: signal => getCelestialObjectInformation(reference, signal, imagePublicationHash, opticalPublicationHash),
    enabled: enabled && isCelestialObjectReference(reference) && (opticalPublicationHash === undefined ||
      isDeepSkyObjectReference(reference) && /^[a-f0-9]{64}$/u.test(opticalPublicationHash)),
    staleTime: 24 * 60 * 60 * 1_000,
  });
}
