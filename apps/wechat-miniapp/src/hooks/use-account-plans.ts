import { useId } from "react";
import { currentDraftUserId, getPlans } from "@/services/api-client";
import { useAppStore } from "@/state/app-store";
import { useResourceQuery } from "./use-resource-query";

/** Private plan readers follow account transitions even when theme is unchanged. */
export function useAccountPlans({ enabled = true, staleTime = 30_000 } = {}) {
  const mountId = useId();
  const boundOwner = useAppStore(state => state.accountOwnerId);
  // The reset generation also observes a batched A → B → A transition.
  useAppStore(state => state.mapResetVersion);
  const sessionOwner = currentDraftUserId();
  const owner = sessionOwner === boundOwner ? sessionOwner : null;
  const query = useResourceQuery({
    queryKey: ["plans", owner ?? `unresolved:${mountId}`],
    queryFn: signal => getPlans(signal, owner ?? undefined),
    enabled,
    // An unresolved entry may discover/bind an account, but is never its cache.
    staleTime: owner ? staleTime : 0,
  });
  if (!owner && query.data) return {
    owner,
    query: { ...query, data: undefined, error: null, isError: false as const, isPending: true as const },
  };
  return { owner, query };
}
