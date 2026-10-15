import { useId } from "react";
import { currentDraftUserId } from "@/services/api-client";
import { useAppStore } from "@/state/app-store";
import { useResourceQuery } from "./use-resource-query";

/** Private readers share identity visibility, while each API keeps its payload. */
export function useAccountResourceQuery<T>(
  resource: "plans" | "user-library" | "preferences",
  read: (signal: AbortSignal | undefined, owner: string | undefined) => Promise<T>,
  { enabled = true, staleTime = 30_000 } = {},
) {
  const mountId = useId();
  const boundOwner = useAppStore(state => state.accountOwnerId);
  // Observe even a batched A → B → A transition without relying on theme/clock.
  useAppStore(state => state.mapResetVersion);
  const sessionOwner = currentDraftUserId();
  const owner = sessionOwner === boundOwner ? sessionOwner : null;
  const query = useResourceQuery({
    queryKey: [resource, owner ?? `unresolved:${mountId}`],
    queryFn: signal => read(signal, owner ?? undefined),
    enabled: enabled && Boolean(owner),
    // Only the explicit shortcut-login owner establishes a visitor's identity.
    staleTime: owner ? staleTime : 0,
  });
  if (!owner) return {
    owner,
    query: { ...query, data: undefined, refreshError: undefined, error: null, isError: false as const,
      isPending: true as const, refetch: async () => undefined },
  };
  return { owner, query };
}
