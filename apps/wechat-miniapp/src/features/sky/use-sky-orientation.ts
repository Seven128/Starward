import { useMemo, useRef, useState, useEffect } from "react";
import Taro from "@tarojs/taro";
import { createPoseFramePublisher } from "./sky-canvas-lifecycle";
import { createSkyOrientationController, type SkyOrientationSnapshot } from "./sky-orientation-controller";
import type { SkyViewBasis } from "./sky-view-projection";

export function useSkyOrientation() {
  const presented = useRef<SkyViewBasis | null>(null);
  const [snapshot, setSnapshot] = useState<SkyOrientationSnapshot | null>(null);
  const publisher = useMemo(() => createPoseFramePublisher<SkyOrientationSnapshot>(setSnapshot), []);
  const controller = useMemo(() => {
    let platform = "";
    try { platform = String(Taro.getDeviceInfo().platform ?? ""); } catch {}
    return createSkyOrientationController({ port: Taro, platform,
      presented: () => presented.current, changed: next => publisher.set(next) });
  }, [publisher]);
  useEffect(() => () => { publisher.dispose(); controller.dispose(); }, [controller, publisher]);
  return { controller, presented, snapshot: snapshot ?? controller.snapshot() };
}
