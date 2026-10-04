import Taro, { useDidHide, useDidShow } from "@tarojs/taro";
import { useEffect, useRef, useState } from "react";
import { currentDraftUserId } from "@/services/api-client";
import { useAppStore } from "@/state/app-store";

/** Read-only plan pages own only their current navigation and its feedback. */
export function usePlanNavigation(owner: string | null) {
  const [navigationError, setNavigationError] = useState(false);
  const life = useRef({ mounted: true, visible: true, epoch: 0, pending: null as symbol | null });
  const retire = () => { life.current.epoch++; life.current.pending = null; };
  useDidHide(() => { life.current.visible = false; retire(); setNavigationError(false); });
  useDidShow(() => { life.current.visible = true; setNavigationError(false); });
  useEffect(() => {
    life.current.mounted = true;
    life.current.visible = true;
    let previous = useAppStore.getState();
    const unsubscribe = useAppStore.subscribe(next => {
      if (next.accountOwnerId !== previous.accountOwnerId || next.mapResetVersion !== previous.mapResetVersion) {
        retire();
        setNavigationError(false);
      }
      previous = next;
    });
    return () => { life.current.mounted = false; retire(); unsubscribe(); };
  }, []);
  const open = async (url: string) => {
    const state = useAppStore.getState();
    if (!life.current.mounted || !life.current.visible || life.current.pending ||
        currentDraftUserId() !== owner || state.accountOwnerId !== owner) return;
    const epoch = life.current.epoch, reset = state.mapResetVersion;
    const currentPage = () => { try { return Taro.getCurrentPages().at(-1) ?? null; } catch { return null; } };
    const page = currentPage();
    if (page === null) { setNavigationError(true); return; }
    const attempt = Symbol("plan-navigation");
    life.current.pending = attempt;
    setNavigationError(false);
    const current = () => life.current.mounted && life.current.visible && life.current.epoch === epoch &&
      life.current.pending === attempt && currentDraftUserId() === owner &&
      useAppStore.getState().accountOwnerId === owner && useAppStore.getState().mapResetVersion === reset &&
      currentPage() === page;
    try { await Taro.navigateTo({ url }); }
    catch { if (current()) setNavigationError(true); }
    finally { if (life.current.pending === attempt) life.current.pending = null; }
  };
  return { open, navigationError };
}
