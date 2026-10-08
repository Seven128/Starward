import { View } from "@tarojs/components";
import { createContext, forwardRef, useContext, useLayoutEffect, useImperativeHandle, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { panelHeightProgress, type PanelExtent, type PanelSnapGeometry } from "./panel-snap";
import { panelPresentationAtProgress, type PanelCssMotion } from "./panel-spring-style";

type DragFrame = { extent: PanelExtent; geometry: PanelSnapGeometry; offset: number };
export type MapPanelPresentationHandle = { setDragFrame(frame: DragFrame | null): void; startReleaseClock(name: string): void };
const position: Record<PanelExtent, number> = { small: 0, medium: 0.5, large: 1 };
const ChromeHidden = createContext(false);

/** Only these small consumers update when the visible chrome crosses its phase. */
export function MapPanelChrome({ className, label, children, motionId = 0, onAnimationStart }: {
  className: string; label?: string; children: ReactNode; motionId?: number; onAnimationStart?: (name: string) => void;
}) {
  const hidden = useContext(ChromeHidden);
  // Native events retain their target ID at generation time; changing this
  // attribute preserves the node but rejects a late A→B→A animation event.
  const id = `${className}-${motionId}`;
  // The existing WEAPP base-template owner exposes ariaHidden; Taro's generic
  // View type does not declare this platform extension.
  return <View id={id} className={className} {...{ ariaHidden: hidden }} {...(label ? { ariaLabel: label } : {})}
    onAnimationStart={event => {
      const name = (event.detail as { animationName?: unknown }).animationName;
      if (event.target.id === id && event.currentTarget.id === id && typeof name === "string") onAnimationStart?.(name);
    }}
  >{children}</View>;
}

/** High-frequency presentation updates retain the caller's content elements. */
export const MapPanelPresentation = forwardRef<MapPanelPresentationHandle, {
  className: string; style: CSSProperties; active: boolean; extent: PanelExtent;
  hasMedia: boolean; motion?: PanelCssMotion | null; deliveryTarget: string; children: ReactNode;
}>(function MapPanelPresentation({ className, style, active, extent, hasMedia, motion, deliveryTarget, children }, ref) {
  const [dragFrame, setDragFrame] = useState<DragFrame | null>(null);
  const [phase, setPhase] = useState<{ motion: PanelCssMotion; hidden: boolean } | null>(null);
  const releaseClock = useRef<{ start(name: string): void } | null>(null);
  useImperativeHandle(ref, () => ({ setDragFrame, startReleaseClock: name => releaseClock.current?.start(name) }), []);
  useLayoutEffect(() => {
    if (!motion || !active || dragFrame) return;
    let current = true, started = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const clock = { start(name: string) {
      if (!current || started || name !== motion.style["--pcn"]) return;
      started = true;
      motion.started?.();
      for (const frame of motion.chrome.slice(1)) timers.push(setTimeout(() => {
        if (current) setPhase({ motion, hidden: frame.hidden });
      }, frame.at));
    } };
    releaseClock.current = clock;
    return () => { current = false; timers.forEach(clearTimeout); if (releaseClock.current === clock) releaseClock.current = null; };
  }, [motion, active, dragFrame !== null]);
  const progress = !active ? 0 : dragFrame
    ? panelHeightProgress(dragFrame.geometry, dragFrame.geometry[dragFrame.extent] - dragFrame.offset)
    : position[extent];
  const { reveal, chrome: chromeOpacity, style: projectionStyle } = panelPresentationAtProgress(progress, hasMedia, active);
  const chromeHidden = active && (!dragFrame && motion
    ? phase?.motion === motion ? phase.hidden : motion.chrome[0]!.hidden
    : chromeOpacity <= 0.08);
  return <ChromeHidden.Provider value={chromeHidden}><View
    className={className + (reveal > 0 ? " map-page--panel-media-visible" : "") +
      (chromeHidden ? " map-page--panel-chrome-hidden" : "")}
    style={{ ...style,
      "--panel-drag-offset": `${active ? dragFrame?.offset ?? 0 : 0}px`,
      ...projectionStyle,
    } as CSSProperties}
    data-miniapp-production-root data-route="map" data-delivery-target={deliveryTarget}
  >{children}</View></ChromeHidden.Provider>;
});
