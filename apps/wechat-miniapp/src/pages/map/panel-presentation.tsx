import { View } from "@tarojs/components";
import { forwardRef, useImperativeHandle, useState, type CSSProperties, type ReactNode } from "react";
import { panelHeightProgress, type PanelExtent, type PanelSnapGeometry } from "./panel-snap";

type DragFrame = { extent: PanelExtent; geometry: PanelSnapGeometry; offset: number };
export type MapPanelPresentationHandle = { setDragFrame(frame: DragFrame | null): void };
const position: Record<PanelExtent, number> = { small: 0, medium: 0.5, large: 1 };
const unit = (value: number) => Math.min(1, Math.max(0, value));

/** High-frequency presentation updates retain the caller's content elements. */
export const MapPanelPresentation = forwardRef<MapPanelPresentationHandle, {
  className: string; style: CSSProperties; active: boolean; extent: PanelExtent;
  hasMedia: boolean; deliveryTarget: string; children: ReactNode;
}>(function MapPanelPresentation({ className, style, active, extent, hasMedia, deliveryTarget, children }, ref) {
  const [dragFrame, setDragFrame] = useState<DragFrame | null>(null);
  useImperativeHandle(ref, () => ({ setDragFrame }), []);
  const progress = !active ? 0 : dragFrame
    ? panelHeightProgress(dragFrame.geometry, dragFrame.geometry[dragFrame.extent] - dragFrame.offset)
    : position[extent];
  const reveal = hasMedia && active ? unit((progress - 0.5) / 0.28) : 0;
  const chromeOpacity = active ? unit(1 - unit((progress - 0.82) / 0.12)) : 1;
  return <View
    className={className + (reveal > 0 ? " map-page--panel-media-visible" : "") +
      (active && chromeOpacity <= 0.08 ? " map-page--panel-chrome-hidden" : "")}
    style={{ ...style,
      "--panel-drag-offset": `${active ? dragFrame?.offset ?? 0 : 0}px`,
      "--map-chrome-opacity": String(chromeOpacity),
      "--panel-media-reveal": String(reveal),
      // The adopted gallery stays about 156px at 390px width, even on tall screens.
      "--panel-media-height": `${Math.round(300 * reveal)}rpx`,
      "--panel-media-margin-top": reveal ? "-40rpx" : "0rpx",
      "--panel-handle-band-height": `${Math.round(40 * (1 - reveal))}rpx`,
      "--panel-media-image-offset": `${Math.round(-18 * (1 - reveal))}rpx`,
      "--panel-media-image-scale": String(1.02 - 0.02 * reveal),
    } as CSSProperties}
    data-miniapp-production-root data-route="map" data-delivery-target={deliveryTarget}
  >{children}</View>;
});
