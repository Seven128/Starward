import { useEffect, useRef, useState } from "react";
import { nativeMapSessions, NATIVE_MAP_RETIREMENT_MESSAGE, NATIVE_MAP_RASTER_RETIREMENT_MESSAGE, type NativeMapSession } from "./native-map-session";

type MapInstanceState = { session: NativeMapSession; generation: number; status: "ready" | "pending" | "error" };

/** Each retry owns a new native node. Old node events cannot settle its result. */
export function useNativeMapRecovery() {
  const [state, setState] = useState<MapInstanceState>(() => ({ session: nativeMapSessions.create(), generation: 0, status: "ready" }));
  const [, setResourceRevision] = useState(0);
  const current = useRef(state);
  const active = useRef(true);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const clearTimer = () => { clearTimeout(timer.current); timer.current = undefined; };
  const commit = (next: MapInstanceState) => { current.current = next; setState(next); };
  const isCurrent = () => active.current && current.current.session === state.session && state.session.isCurrent();
  useEffect(() => {
    active.current = true;
    const unsubscribe = nativeMapSessions.subscribe(() => { if (active.current) setResourceRevision(value => value + 1); });
    return () => { active.current = false; clearTimer(); unsubscribe(); current.current.session.retire(); };
  }, []);
  return {
    mapId: state.session.mapId,
    // Retiring nodes stay keyed in the same host until their actual native
    // removals settle. The new node can recover without awaiting that debt.
    mapIds: [...state.session.retiringMapIds(), state.session.mapId],
    generation: state.generation,
    error: state.status === "error",
    pending: state.status === "pending",
    rastersBlocked: !state.session.canInstallRasters(),
    retirementMessage: NATIVE_MAP_RETIREMENT_MESSAGE,
    rasterRetirementMessage: NATIVE_MAP_RASTER_RETIREMENT_MESSAGE,
    canInstallRasters: () => isCurrent() && state.session.canInstallRasters(),
    registerRaster: state.session.registerRaster,
    isCurrent,
    retry() {
      if (!isCurrent() || current.current.status === "pending") return false;
      const session = current.current.session.recover();
      if (!session) return false;
      clearTimer();
      const generation = current.current.generation + 1;
      commit({ session, generation, status: "pending" });
      // A missing update ends visible waiting. Unknown old native-instance
      // retirement keeps further fault replacements bounded and recoverable
      // through the visible restart guidance, never a timeout-based release.
      timer.current = setTimeout(() => {
        if (active.current && current.current.generation === generation && current.current.status === "pending")
          commit({ session, generation, status: "error" });
      }, 10000);
      return true;
    },
    onError() {
      if (!isCurrent()) return;
      clearTimer(); commit({ ...state, status: "error" });
    },
    onUpdated() {
      if (!isCurrent() || current.current.status !== "pending") return;
      clearTimer(); commit({ ...state, status: "ready" });
    },
  };
}
