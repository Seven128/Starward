import { Button, View } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { skyRetainedLayerStyle } from "./sky-retained-layer";
import "./sky-overlay-motion.scss";

const FADE_MS = 180;
type Phase = "opening" | "open" | "closing" | "closed";
export interface SkyOverlayMotionState {
  readonly present: boolean;
  readonly active: boolean;
  readonly phase: Phase;
  readonly style: CSSProperties;
}

/** Presentation lifetime only; selection, queries and Back keep their owners.
 * Reopening a still-mounted surface reverses its live CSS transition. */
export function useSkyOverlayMotion(open: boolean, enabled: boolean, reducedMotion: boolean): SkyOverlayMotionState {
  const [present, setPresent] = useState(open && enabled);
  const [phase, setPhase] = useState<Phase>("opening");
  const generation = useRef(0);
  useEffect(() => {
    const expected = ++generation.current;
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (!enabled || reducedMotion) {
      setPresent(enabled && open);
      setPhase(enabled && open ? "open" : "closed");
    } else if (open) {
      setPresent(true);
      if (present && phase !== "opening") setPhase("open");
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
      }, FADE_MS);
    }
    return () => { generation.current++; if (timer !== undefined) clearTimeout(timer); };
  }, [open, enabled, reducedMotion]);
  return { present: enabled && (present || open), active: enabled && open,
    phase: !enabled ? "closed" : !open ? "closing" : phase,
    style: { "--sky-overlay-motion-ms": `${reducedMotion ? 0 : FADE_MS}ms` } as CSSProperties };
}

/** Retain the last visible content only for its exit. Pass active=false to its
 * resource consumers immediately; a fading surface cannot launch old actions. */
export function SkyOverlayMotion({ motion, kind, children, keepMounted = false }: {
  motion: SkyOverlayMotionState;
  kind: "search" | "object" | "time" | "layers";
  keepMounted?: boolean;
  children: (active: boolean) => ReactNode;
}) {
  const content = useRef<typeof children | null>(null);
  if (motion.active || keepMounted && !content.current) content.current = children;
  if (!motion.present && !keepMounted) { content.current = null; return null; }
  const stop = (event: { stopPropagation(): void }) => event.stopPropagation();
  return <View className={`sky-overlay-motion sky-overlay-motion--${kind} sky-overlay-motion--${motion.phase}`}
    style={{ ...motion.style, ...skyRetainedLayerStyle(!motion.present) }}>
    {content.current?.(motion.active)}
    {!motion.active ? <View className="sky-overlay-motion__shield" catchMove
      onClick={stop} onTouchStart={stop} onTouchMove={stop} onTouchEnd={stop} /> : null}
  </View>;
}

/** The four disclosures share one material and outside-tap boundary. A native
 * click after a drag must not dismiss the panel. The unpainted time backdrop
 * is omitted so the existing Canvas remains the owner of sky gestures. */
export function SkyDisclosureSurface({ kind, onClose, children, className = "", style, id, label }: {
  kind: "search" | "object" | "time" | "layers";
  onClose: () => void;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  id?: string;
  label: string;
}) {
  const outsideDrag = useRef(false);
  const stop = (event: { stopPropagation(): void }) => event.stopPropagation();
  return <View className={`sky-disclosure sky-disclosure--${kind}`}>
    {kind !== "time" ? <Button className="sky-disclosure__backdrop sky-overlay-motion__backdrop"
      ariaLabel={`收起${label}`} onTouchStart={() => { outsideDrag.current = false; }}
      onTouchMove={() => { outsideDrag.current = true; }}
      onTouchCancel={() => { outsideDrag.current = true; }}
      onClick={() => { if (!outsideDrag.current) onClose(); }} /> : null}
    <View {...(id ? { id } : {})} className={`sky-disclosure__surface sky-overlay-motion__surface ${className}`}
      {...(style ? { style } : {})} role="dialog" aria-label={label}
      onClick={stop} onTouchStart={stop} onTouchMove={stop} onTouchEnd={stop}>
      {children}
    </View>
  </View>;
}
