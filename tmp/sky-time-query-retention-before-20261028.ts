import { useRef } from "react";
import { useResourceQuery } from "../../hooks/use-resource-query";
import { getSkyTargetInstant } from "../../services/sky-celestial-client";
import { skyTargetInstantQueryKey, type SkyTargetInstantBinding } from "../../services/sky-target-instant-response";
import { MiniappRequestCancelled } from "../../services/request-lifecycle";

// Reuse is limited to the already adopted one-minute freshness window. A
// mounted Sky/Sources observer still owns its current result beyond this
// period; only inactive exact instants retire. Both consumers must use this
// owner because Query retains the longest gcTime seen for a shared key.
export const SKY_TIME_TARGET_REUSE_MS = 60_000;

export function useSkyTimeTargetQuery(binding: SkyTargetInstantBinding | null, dataRevision: string | undefined,
  active: boolean, readCurrent: () => boolean) {
  // A hidden/invalid reader releases the old subscription. Merely disabling
  // its observer would keep that old query mounted (and exempt from GC).
  const queryKey = skyTargetInstantQueryKey(active ? binding : null, active ? dataRevision : undefined);
  const latest = useRef({ queryKey, active, readCurrent });
  latest.current = { queryKey, active, readCurrent };
  const current = () => Boolean(binding && latest.current.active &&
    queryKey.every((part, index) => part === latest.current.queryKey[index]) && latest.current.readCurrent());
  // A native step/hide can precede Query's queued observer effect. Once an
  // options generation is retired it stays disabled, so A -> B -> A can
  // install a fresh enabled generation instead of reviving the old one.
  let enabled = true;
  return useResourceQuery({ queryKey,
    enabled: binding && active ? () => { enabled = enabled && current(); return enabled; } : false,
    queryFn: signal => {
      if (!current()) return Promise.reject(new MiniappRequestCancelled("superseded"));
      // Query's signal owns shared in-flight lifetime. A source page which
      // joins this exact key may still need the response after Sky hides;
      // do not cancel it merely because the initiating observer retired.
      return getSkyTargetInstant(binding!, signal);
    }, staleTime: SKY_TIME_TARGET_REUSE_MS, gcTime: SKY_TIME_TARGET_REUSE_MS });
}
