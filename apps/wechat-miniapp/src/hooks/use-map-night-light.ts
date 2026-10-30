import { NIGHT_LIGHT_CONTRAST_DISPLAY, type MapNightLightRequest } from "@starward/miniapp-contracts";
import { useEffect } from "react";
import { cancelRequest, getMapNightLight } from "@/services/api-client";
import { useResourceQuery } from "./use-resource-query";

/** Public static products have no observation-hour, filter or account input.
 * Query and the existing raster owners retain cancellation and native lifetime. */
export function useMapNightLight(viewport: MapNightLightRequest["viewport"] | null, enabled: boolean) {
  useEffect(() => {
    if (!enabled) cancelRequest("map-night-light");
    return enabled ? () => { cancelRequest("map-night-light"); } : undefined;
  }, [enabled]);
  return useResourceQuery({
    queryKey: enabled && viewport ? ["map-night-light", NIGHT_LIGHT_CONTRAST_DISPLAY.styleVersion, [viewport.center.latitude.toFixed(6), viewport.center.longitude.toFixed(6),
      viewport.zoom, ...[viewport.bounds.west, viewport.bounds.south, viewport.bounds.east, viewport.bounds.north]
        .map(value => value.toFixed(7))].join(":")] : ["map-night-light-inactive"],
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
