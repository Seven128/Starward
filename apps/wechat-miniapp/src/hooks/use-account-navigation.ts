import Taro, { useDidHide, useDidShow } from "@tarojs/taro";
import { useEffect, useRef, useState } from "react";
import { currentDraftUserId } from "@/services/api-client";
import { useAppStore } from "@/state/app-store";

/** Success is an accepted handoff, not permission to write hidden source UI. */
type NavigationFeedback = (phase: "start" | "success" | "failure") => void;

/** Account pages own current navigation; consumers retain their feedback form. */
export function useAccountNavigation(owner: string | null) {
  const [navigationError, setNavigationError] = useState(false);
  const life = useRef({ mounted: true, visible: true, attempt: 0, pending: null as number | null }).current;
  const retire = () => { life.pending = null; setNavigationError(false); };
  useDidHide(() => { life.visible = false; retire(); });
  useDidShow(() => { life.visible = true; setNavigationError(false); });
  useEffect(() => {
    life.mounted = true;
    life.visible = true;
    const unsubscribe = useAppStore.subscribe((next, previous) => {
      if (next.accountOwnerId !== previous.accountOwnerId || next.mapResetVersion !== previous.mapResetVersion) {
        retire();
        life.attempt++;
      }
    });
    return () => { life.mounted = false; life.attempt++; life.pending = null; unsubscribe(); };
  }, []);
  const open = (url: string, feedback?: NavigationFeedback) => {
    const state = useAppStore.getState();
    if (!life.mounted || !life.visible || life.pending ||
        currentDraftUserId() !== owner || state.accountOwnerId !== owner) return;
    const reset = state.mapResetVersion;
    const currentPage = () => { try { return Taro.getCurrentPages().at(-1) ?? null; } catch { return null; } };
    const page = currentPage();
    if (page === null) { setNavigationError(true); return; }
    const attempt = ++life.attempt;
    life.pending = attempt;
    setNavigationError(false);
    const completed = () => {
      const state = useAppStore.getState();
      return life.mounted && life.attempt === attempt && currentDraftUserId() === owner &&
        state.accountOwnerId === owner && state.mapResetVersion === reset;
    };
    const failed = () => {
      if (completed() && life.visible && life.pending === attempt && currentPage() === page) {
        if (feedback) feedback("failure");
        else setNavigationError(true);
      }
    };
    const release = () => { if (life.pending === attempt) life.pending = null; };
    if (feedback) feedback("start");
    try {
      return Taro.navigateTo({ url }).then(() => {
        if (completed() && feedback) feedback("success");
      }, failed).finally(release);
    }
    catch { failed(); release(); }
  };
  return { open, navigationError };
}
