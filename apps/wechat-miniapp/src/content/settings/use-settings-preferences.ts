import { useEffect } from "react";
import { useAccountResourceQuery } from "@/hooks/use-account-resource-query";
import { currentDraftUserId, getPreferences } from "@/services/api-client";
import { useAppStore } from "@/state/app-store";

/** Cloud readiness is distinct from the local preference values and pending local edits. */
export function useSettingsPreferences() {
  const { owner, query } = useAccountResourceQuery("preferences", getPreferences);
  const revision = useAppStore(state => state.preferencesRevision);
  useEffect(() => {
    if (owner && query.data && currentDraftUserId() === owner && useAppStore.getState().accountOwnerId === owner)
      useAppStore.getState().applyServerPreferences(query.data.data);
  }, [owner, query.data]);
  const confirmed = !owner || revision > 0;
  return { confirmed, state: !owner ? "LOCAL" as const : query.isError || query.refreshError
    ? confirmed ? "STALE" as const : "ERROR" as const
    : query.isPending && !confirmed ? "LOADING" as const : "READY" as const,
    retry: () => void query.refetch() };
}
