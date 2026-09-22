import { useMemo, useRef, useState, useEffect } from "react";
import Taro from "@tarojs/taro";
import { createPoseFramePublisher } from "./sky-canvas-lifecycle";
import { createSkyOrientationController, type SkyOrientationSnapshot } from "./sky-orientation-controller";
import type { SkyViewBasis } from "./sky-view-projection";
import { createSkyPresentationFilter } from "./sky-presentation-filter";

export function useSkyOrientation() {
  const presented = useRef<SkyViewBasis | null>(null);
  const latestPresentation = useRef<SkyOrientationSnapshot | null>(null);
  const [snapshot, setSnapshot] = useState<SkyOrientationSnapshot | null>(null);
  const publisher = useMemo(() => createPoseFramePublisher<SkyOrientationSnapshot>(setSnapshot), []);
  const controller = useMemo(() => {
    let platform = "";
    try { platform = String(Taro.getDeviceInfo().platform ?? ""); } catch {}
    const stabilize = platform.toLowerCase() === "android" ? createSkyPresentationFilter() :
      (next: SkyOrientationSnapshot) => next;
    return createSkyOrientationController({ port: Taro, platform,
      presented: () => presented.current, changed: next => {
        const displayed = stabilize(next);
        latestPresentation.current = displayed;
        publisher.set(displayed);
      } });
  }, [publisher]);
  useEffect(() => () => { publisher.dispose(); controller.dispose(); }, [controller, publisher]);
  return { controller, presented, latestPresentation, snapshot: snapshot ?? controller.snapshot() };
}
