import { useAppStore } from "@/state/app-store";
import { useSystemMotionStore } from "@/theme/system-motion-state";
import { effectiveReducedMotion } from "@/theme/system-motion";

export function useReducedMotion() {
  const account = useAppStore(state => state.preferences.reducedMotion);
  const system = useSystemMotionStore(state => state.value);
  return effectiveReducedMotion(account, system);
}

export function getReducedMotion() {
  return effectiveReducedMotion(useAppStore.getState().preferences.reducedMotion, useSystemMotionStore.getState().value);
}
