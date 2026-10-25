import { View } from "@tarojs/components";
import { useRef, type CSSProperties, type ReactNode } from "react";
import { useOverlayPresence } from "@/hooks/use-overlay-presence";

// The adopted local navigation source owns the bottom drawer's 240ms motion.
export const MAP_LAYER_TRANSITION_MS = 240;

/** Retain only the last visible layer content during exit. The Map coordinator
 * changes business presentation immediately, independently of visual retirement. */
export function MapLayerPresentation({ open, enabled, reducedMotion, children }: {
  open: boolean; enabled: boolean; reducedMotion: boolean; children: ReactNode;
}) {
  const motion = useOverlayPresence(open, enabled, reducedMotion, MAP_LAYER_TRANSITION_MS);
  const content = useRef<ReactNode>(null);
  if (motion.active) content.current = children;
  if (!motion.present) { content.current = null; return null; }
  const stop = (event: { stopPropagation(): void }) => event.stopPropagation();
  return <View className={`map-layer-layer map-layer-layer--${motion.phase}`}
    style={{ "--map-layer-motion-ms": `${reducedMotion ? 0 : MAP_LAYER_TRANSITION_MS}ms` } as CSSProperties}
    onClick={stop}>
    {content.current}
    {!motion.active ? <View className="map-layer-motion-shield" catchMove
      onClick={stop} onTouchStart={stop} onTouchMove={stop} onTouchEnd={stop} /> : null}
  </View>;
}
