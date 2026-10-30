import { useEffect, useRef } from "react";
import { useResourceQuery } from "../../hooks/use-resource-query";
import { getSkyTargetInstant } from "../../services/sky-celestial-client";
import { skyTargetInstantQueryKey, type SkyTargetInstantBinding } from "../../services/sky-target-instant-response";
import { MiniappRequestCancelled } from "../../services/request-lifecycle";

// Reuse is limited to the already adopted one-minute freshness window. A
// mounted Sky/Sources observer still owns its current result beyond this
// period; only inactive exact instants retire. Both consumers must use this
// owner because Query retains the longest gcTime seen for a shared key.
export const SKY_TIME_TARGET_REUSE_MS = 60_000;

type TargetQueryKey = ReturnType<typeof skyTargetInstantQueryKey>;
type TargetQueryReader = { queryKey: TargetQueryKey; readCurrent: () => boolean };

// Cached callbacks own only request identity and this retirable reader ref,
// never the hook's render scope or its page callback after hide/unmount.
// Keep the factory at module scope after compression as well. Inlining it
// inside the hook gives these callbacks the effect cleanup's reader context,
// retaining that old page even after latest.current has been replaced/cleared.
const targetQueryCallbacks = Object.freeze(function targetQueryCallbacks(
  binding: SkyTargetInstantBinding | null, queryKey: TargetQueryKey,
  latest: { current: TargetQueryReader | null }) {
  const current = () => {
    const reader = latest.current;
    return Boolean(binding && reader && queryKey.every((part, index) => part === reader.queryKey[index]) && reader.readCurrent());
  };
  // A native step/hide can precede Query's queued observer effect. Once an
  // options generation is retired it stays disabled, so A -> B -> A can
  // install a fresh enabled generation instead of reviving the old one.
  let enabled = true;
  return {
    enabled: () => { enabled = enabled && current(); return enabled; },
    queryFn: (signal?: AbortSignal) => {
      if (!current()) return Promise.reject(new MiniappRequestCancelled("superseded"));
      // Query's signal owns shared in-flight lifetime. A source page which
      // joins this exact key may still need the response after Sky hides;
      // do not cancel it merely because the initiating observer retired.
      return getSkyTargetInstant(binding!, signal);
    },
  };
});

export function useSkyTimeTargetQuery(binding: SkyTargetInstantBinding | null, dataRevision: string | undefined,
  active: boolean, readCurrent: () => boolean) {
  // A hidden/invalid reader releases the old subscription. Merely disabling
  // its observer would keep that old query mounted (and exempt from GC).
  const queryKey = skyTargetInstantQueryKey(active ? binding : null, active ? dataRevision : undefined);
  const latest = useRef<TargetQueryReader | null>(null);
  const reader = active && binding ? { queryKey, readCurrent } : null;
  latest.current = reader;
  useEffect(() => {
    latest.current = reader;
    return () => { if (latest.current === reader) latest.current = null; };
  }, [reader]);
  const callbacks = targetQueryCallbacks(binding, queryKey, latest);
  return useResourceQuery({ queryKey, queryFn: callbacks.queryFn,
    enabled: binding && active ? callbacks.enabled : false,
    staleTime: SKY_TIME_TARGET_REUSE_MS, gcTime: SKY_TIME_TARGET_REUSE_MS });
}
