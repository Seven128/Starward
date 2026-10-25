import { View } from "@tarojs/components";
import { SharedButton as Button } from "@/components/shared-button-press";
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useOverlayPresence, type OverlayPhase } from "@/hooks/use-overlay-presence";
import { skyRetainedLayerStyle } from "./sky-retained-layer";
import "./sky-overlay-motion.scss";

const FADE_MS = 180;
export interface SkyOverlayMotionState {
  readonly present: boolean;
  readonly active: boolean;
  readonly phase: OverlayPhase;
  readonly style: CSSProperties;
}

/** Presentation lifetime only; selection, queries and Back keep their owners.
 * Reopening a still-mounted surface reverses its live CSS transition. */
export function useSkyOverlayMotion(open: boolean, enabled: boolean, reducedMotion: boolean, prepared = true): SkyOverlayMotionState {
  return { ...useOverlayPresence(open, enabled, reducedMotion, FADE_MS, prepared),
    style: { "--sky-overlay-motion-ms": `${reducedMotion ? 0 : FADE_MS}ms` } as CSSProperties };
}

/** Viewport rects during the surface's scale transition are not native scroll
 * units. Layout consumers wait for that surface's real transition endpoint;
 * phase=open starts the transition and is not its completion. */
export function useSkyOverlayLayoutReady(motion: SkyOverlayMotionState, reducedMotion: boolean) {
  const token = useMemo(() => ({}), [motion.active, motion.phase, reducedMotion]);
  const current = useRef<object | null>(token);
  current.current = token;
  const [settled, setSettled] = useState<object | null>(null);
  useEffect(() => {
    current.current = token;
    return () => { if (current.current === token) current.current = null; };
  }, [token]);
  return {
    ready: motion.active && motion.phase === "open" && (reducedMotion || settled === token),
    finish: () => {
      if (current.current === token && motion.active && motion.phase === "open") setSettled(token);
    },
  };
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
export function SkyDisclosureSurface({ kind, onClose, children, className = "", style, id, label, onMotionEnd }: {
  kind: "search" | "object" | "time" | "layers";
  onClose: () => void;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  id?: string;
  label: string;
  onMotionEnd?: () => void;
}) {
  const outsideDrag = useRef(false);
  const stop = (event: { stopPropagation(): void }) => event.stopPropagation();
  return <View className={`sky-disclosure sky-disclosure--${kind}`}>
    {kind !== "time" ? <Button pressVariant="none" className="sky-disclosure__backdrop sky-overlay-motion__backdrop"
      ariaLabel={`收起${label}`} onTouchStart={() => { outsideDrag.current = false; }}
      onTouchMove={() => { outsideDrag.current = true; }}
      onTouchCancel={() => { outsideDrag.current = true; }}
      onClick={() => { if (!outsideDrag.current) onClose(); }} /> : null}
    <View {...(id ? { id } : {})} className={`sky-disclosure__surface sky-overlay-motion__surface ${className}`}
      {...(style ? { style } : {})} role="dialog" aria-label={label}
      onTransitionEnd={event => {
        // Child transitions (buttons, ticks) cannot qualify this surface.
        if (id && event.target.id === id && event.currentTarget.id === id) onMotionEnd?.();
      }}
      onClick={stop} onTouchStart={stop} onTouchMove={stop} onTouchEnd={stop}>
      {children}
    </View>
  </View>;
}
