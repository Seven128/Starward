import Taro from "@tarojs/taro";
import { useEffect } from "react";
import { currentDraftUserId } from "@/services/api-client";
import { useAppStore } from "@/state/app-store";
import { usePageNavigation } from "./use-page-navigation";

/** Success is an accepted handoff, not permission to write hidden source UI. */
type NavigationFeedback = (phase: "start" | "success" | "failure") => void;

/** Account pages own current navigation; consumers retain their feedback form. */
export function useAccountNavigation(owner: string | null) {
  const navigation = usePageNavigation();
  useEffect(() => {
    return useAppStore.subscribe((next, previous) => {
      if (next.accountOwnerId !== previous.accountOwnerId || next.mapResetVersion !== previous.mapResetVersion) {
        navigation.retire();
      }
    });
  }, []);
  const open = (url: string, feedback?: NavigationFeedback) => {
    const reset = useAppStore.getState().mapResetVersion;
    const attempt = navigation.begin({ valid: () => {
      const state = useAppStore.getState();
      return currentDraftUserId() === owner &&
        state.accountOwnerId === owner && state.mapResetVersion === reset;
    } });
    if (!attempt) return;
    const failed = () => {
      if (attempt.active()) {
        if (feedback) feedback("failure");
        else attempt.fail();
      }
    };
    if (feedback) feedback("start");
    try {
      return Taro.navigateTo({ url }).then(() => {
        if (attempt.completed() && feedback) feedback("success");
      }, failed).finally(attempt.release);
    }
    catch { failed(); attempt.release(); }
  };
  return { open, navigationError: navigation.navigationError };
}
