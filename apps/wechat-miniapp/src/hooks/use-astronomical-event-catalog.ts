import { useResourceQuery } from "./use-resource-query";
import { getAstronomicalEvents } from "@/services/api-client";

/** Banner, browse page and plan modal subscribe to the same catalogue owner. */
export function useAstronomicalEventCatalog(enabled: boolean) {
  return useResourceQuery({
    queryKey: ["astronomical-events"],
    queryFn: getAstronomicalEvents,
    enabled,
    staleTime: 6 * 60 * 60 * 1000,
  });
}
