import { selectedPreparedOpticalPublication, type PreparedOpticalDiscovery } from "@starward/miniapp-contracts";
import { useResourceQuery } from "@/hooks/use-resource-query";
import { getPreparedOpticalDiscovery } from "@/services/prepared-optical-client";
import { useSkyImageRecovery } from "./use-sky-image-recovery";

/** One shared mutable selection Query. Images and source links subsequently
 * use only the selected immutable edition in useSkyTargetOptical. */
export function useSkyPreparedOpticalDiscovery(reference: string | null, active: boolean, paused = false) {
  const eligible = active && !paused;
  const discovery = useResourceQuery<PreparedOpticalDiscovery>({
    queryKey: ["prepared-optical-discovery"], queryFn: getPreparedOpticalDiscovery,
    enabled: eligible, staleTime: 60_000,
  });
  const retry = useSkyImageRecovery(eligible, () => false, discovery.refetch);
  return {
    publication: active ? selectedPreparedOpticalPublication(discovery.data, reference) : undefined,
    publications: active ? discovery.data?.publications : undefined,
    failed: eligible && (discovery.isError || Boolean(discovery.refreshError)),
    retry,
  };
}
