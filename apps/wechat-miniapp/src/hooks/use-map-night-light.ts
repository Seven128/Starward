import type { MapNightLightRequest } from "@starward/miniapp-contracts";
import { getMapNightLight } from "@/services/api-client";
import { useResourceQuery } from "./use-resource-query";

/** Public static products have no observation-hour, filter or account input.
 * Query and the existing raster owners retain cancellation and native lifetime. */
export function useMapNightLight(viewport: MapNightLightRequest["viewport"] | null, enabled: boolean) {
  return useResourceQuery({
    queryKey: ["map-night-light", viewport ? [viewport.center.latitude.toFixed(6), viewport.center.longitude.toFixed(6),
      viewport.zoom, ...[viewport.bounds.west, viewport.bounds.south, viewport.bounds.east, viewport.bounds.north]
        .map(value => value.toFixed(7))].join(":") : null],
    queryFn: signal => {
      if (!viewport) throw new Error("map_viewport_required");
      return getMapNightLight(viewport, signal);
    },
    enabled: enabled && Boolean(viewport),
    // Discovery can change to a newer published dataset. Immutable image bytes
    // retain their separate file cache; a failed body remains retryable.
    staleTime: value => value?.data.failureCode ? 0 : 60_000,
  });
}
