import { useEffect, useRef, useState } from "react";

type MapInstanceState = { generation: number; status: "ready" | "pending" | "error" };

/** Each retry owns a new native node. Old node events cannot settle its result. */
export function useNativeMapRecovery() {
  const [state, setState] = useState<MapInstanceState>({ generation: 0, status: "ready" });
  const current = useRef(state);
  const active = useRef(true);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const clearTimer = () => { clearTimeout(timer.current); timer.current = undefined; };
  const commit = (next: MapInstanceState) => { current.current = next; setState(next); };
  const isCurrent = () => active.current && current.current.generation === state.generation;
  useEffect(() => {
    active.current = true;
    return () => { active.current = false; clearTimer(); };
  }, []);
  return {
    mapId: state.generation === 0 ? "spot-map" : `spot-map-${state.generation}`,
    generation: state.generation,
    error: state.status === "error",
    pending: state.status === "pending",
    isCurrent,
    retry() {
      if (!active.current || current.current.status === "pending") return;
      clearTimer();
      const generation = current.current.generation + 1;
      commit({ generation, status: "pending" });
      // A missing native update/error callback must leave a usable retry path.
      timer.current = setTimeout(() => {
        if (active.current && current.current.generation === generation && current.current.status === "pending")
          commit({ generation, status: "error" });
      }, 10000);
    },
    onError() {
      if (!isCurrent()) return;
      clearTimer(); commit({ generation: state.generation, status: "error" });
    },
    onUpdated() {
      if (!isCurrent() || current.current.status !== "pending") return;
      clearTimer(); commit({ generation: state.generation, status: "ready" });
    },
  };
}
