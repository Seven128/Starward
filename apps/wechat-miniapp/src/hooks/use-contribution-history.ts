import { useId, useState } from "react";
import { useDidShow } from "@tarojs/taro";
import { currentDraftUserId, getContributions } from "@/services/api-client";
import { useResourceQuery } from "./use-resource-query";

/** Private history is never cached under a shared anonymous/accountless key. */
export function useContributionHistory(enabled = true) {
  const mountId = useId();
  const [, refreshIdentity] = useState(0);
  useDidShow(() => refreshIdentity((value) => value + 1));
  const owner = currentDraftUserId();
  return useResourceQuery({
    queryKey: ["contributions", owner ?? `unresolved:${mountId}`],
    queryFn: (signal) => getContributions(signal, owner ?? undefined),
    staleTime: 10_000,
    throwOnRefetchError: true,
    enabled,
  });
}
