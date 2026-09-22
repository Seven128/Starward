import { isCelestialObjectReference } from "@starward/miniapp-contracts";
import { getCelestialObjectInformation } from "@/services/api-client";
import { useResourceQuery } from "./use-resource-query";

/** The object modal and its source page share one identity-bound resource. */
export function useCelestialInformation(reference: string, enabled = true) {
  return useResourceQuery({
    queryKey: ["celestial-object-information", reference, "zh-CN"],
    queryFn: signal => getCelestialObjectInformation(reference, signal),
    enabled: enabled && isCelestialObjectReference(reference),
    staleTime: 24 * 60 * 60 * 1_000,
  });
}
