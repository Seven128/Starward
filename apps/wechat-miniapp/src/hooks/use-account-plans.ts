import { getPlans } from "@/services/api-client";
import { useAccountResourceQuery } from "./use-account-resource-query";

/** Private plan readers follow account transitions even when theme is unchanged. */
export function useAccountPlans(options: { enabled?: boolean; staleTime?: number } = {}) {
  return useAccountResourceQuery("plans", getPlans, options);
}
