import { useAppStore } from "@/state/app-store";
import { useSystemMotionStore } from "@/theme/system-motion-state";
import { effectiveReducedMotion } from "@/theme/system-motion";
import { pageBlackoutReducedMotion } from "@/navigation/page-blackout-transition";

export function usePageBlackoutReducedMotion() {
  const account = useAppStore(state => state.preferences.reducedMotion);
  const system = useSystemMotionStore(state => state.value);
  return pageBlackoutReducedMotion(account, system);
}

export function useReducedMotion() {
  const account = useAppStore(state => state.preferences.reducedMotion);
  const system = useSystemMotionStore(state => state.value);
  return effectiveReducedMotion(account, system);
}

export function getReducedMotion() {
  return effectiveReducedMotion(useAppStore.getState().preferences.reducedMotion, useSystemMotionStore.getState().value);
}
