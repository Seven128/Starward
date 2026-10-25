import Taro from "@tarojs/taro";
import { useEffect, useRef, useState } from "react";

export type OverlayPhase = "preparing" | "opening" | "open" | "closing" | "closed";

/** Presentation lifetime only. Business intent and resource consumers become
 * inactive immediately; reopening reverses the mounted surface's CSS motion. */
export function useOverlayPresence(open: boolean, enabled: boolean, reducedMotion: boolean,
  duration: number, prepared = true) {
  const [present, setPresent] = useState(open && enabled);
  const [phase, setPhase] = useState<OverlayPhase>("opening");
  const generation = useRef(0);
  useEffect(() => {
    const expected = ++generation.current;
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (enabled && open && !prepared) {
      setPresent(true);
      setPhase("preparing");
    } else if (!enabled || reducedMotion) {
      setPresent(enabled && open);
      setPhase(enabled && open ? "open" : "closed");
    } else if (open) {
      setPresent(true);
      if (present && phase !== "opening" && phase !== "preparing") setPhase("open");
      else {
        setPhase("opening");
        Taro.nextTick(() => {
          if (generation.current !== expected) return;
          timer = setTimeout(() => {
            if (generation.current === expected) setPhase("open");
          }, 16);
        });
      }
    } else if (present) {
      setPhase("closing");
      timer = setTimeout(() => {
        if (generation.current !== expected) return;
        setPresent(false);
        setPhase("closed");
      }, duration);
    }
    return () => { generation.current++; if (timer !== undefined) clearTimeout(timer); };
  }, [open, enabled, reducedMotion, prepared, duration]);
  return { present: enabled && (present || open), active: enabled && open,
    phase: !enabled ? "closed" as const : !open ? "closing" as const : phase };
}
