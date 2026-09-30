import { useResourceQuery } from "./use-resource-query";
import { getCelestialObjectPosition } from "@/services/api-client";
import type { CelestialPositionBinding } from "@/services/celestial-position-response";

/** Explicit location and active tracking share the same cancellable resource. */
export function useCelestialPosition(binding: CelestialPositionBinding,
  catalog: { catalogVersion: string; catalogHash: string } | null, enabled = true) {
  return useResourceQuery({
    queryKey: ["celestial-position", binding.reference, binding.spotId, binding.contextId,
      binding.contextRevision, binding.contextFingerprint, binding.dataRevision, binding.algorithmVersion, binding.at, catalog?.catalogVersion, catalog?.catalogHash],
    queryFn: signal => getCelestialObjectPosition(binding, catalog!, signal),
    enabled: enabled && Boolean(catalog), staleTime: 60_000, gcTime: 60_000,
  });
}
