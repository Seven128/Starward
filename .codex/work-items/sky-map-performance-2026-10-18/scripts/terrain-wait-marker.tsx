// TASK ONLY temporal anchor. Its asynchronous rendering is not an event clock.
import Taro from "@tarojs/taro";
import { View } from "@tarojs/components";
import { useEffect, useState } from "react";
import { terrainWait, TERRAIN_WAIT_STORAGE_KEY } from "@/services/terrain-wait-observer";

export function TerrainWaitMarker({ visible }: { visible: boolean }) {
  const [label, setLabel] = useState(terrainWait.marker());
  useEffect(() => {
    terrainWait.configureWriter(receipt => {
      // One bounded write after measurement; never read or clear account keys.
      Taro.setStorageSync(TERRAIN_WAIT_STORAGE_KEY, receipt);
    });
    const unsubscribe = terrainWait.subscribe(() => setLabel(terrainWait.marker()));
    return () => { unsubscribe(); terrainWait.seal("unmount"); };
  }, []);
  useEffect(() => { if (!visible) terrainWait.seal("hidden"); }, [visible]);
  return visible ? <View data-control="task-terrain-wait-marker" style={{ position: "fixed", top: "100Px", left: "12Px",
    zIndex: 9999, pointerEvents: "none", maxWidth: "270Px", padding: "2Px 4Px", background: "#202020",
    color: "#dddddd", fontSize: "11Px", lineHeight: "14Px" }}>{label}</View> : null;
}
