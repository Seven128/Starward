// TASK ONLY temporal anchor. Its asynchronous rendering is not an event clock.
import Taro from "@tarojs/taro";
import { View } from "@tarojs/components";
import { useEffect, useState } from "react";
import { terrainWait, TERRAIN_WAIT_STORAGE_KEY, createTerrainWaitExporter } from "@/services/terrain-wait-observer";
import { mapRasterFiles } from "@/services/map-raster-files";

const exporter = createTerrainWaitExporter(() => terrainWait.snapshot(), body => Taro.request({
  url: `${__MINIAPP_API_BASE__}/__development_r17_phone_probe_metrics`, method: "POST", data: body,
  header: { "content-type": "application/json" }, timeout: 10000,
}));

export function TerrainWaitMarker({ visible }: { visible: boolean }) {
  const [label, setLabel] = useState(terrainWait.marker());
  const [exportStatus, setExportStatus] = useState(exporter.status());
  useEffect(() => {
    terrainWait.configureResources(() => mapRasterFiles.snapshot());
    terrainWait.configureWriter(receipt => {
      // One bounded write after measurement; never read or clear account keys.
      Taro.setStorageSync(TERRAIN_WAIT_STORAGE_KEY, receipt);
    });
    const unsubscribe = terrainWait.subscribe(() => setLabel(terrainWait.marker()));
    return () => { unsubscribe(); terrainWait.seal("unmount"); };
  }, []);
  useEffect(() => { if (!visible) terrainWait.seal("hidden"); }, [visible]);
  const finishAndExport = () => {
    terrainWait.seal("manual");
    const pending = exporter.export(); setExportStatus(exporter.status());
    void pending.then(() => setExportStatus(exporter.status()));
  };
  return visible ? <View data-control="task-terrain-wait-marker" style={{ position: "fixed", top: "100Px", left: "12Px",
    zIndex: 10050, maxWidth: "270Px", padding: "2Px 4Px", background: "#202020",
    color: "#dddddd", fontSize: "11Px", lineHeight: "14Px" }}>
    <View>{label}</View>
    <View onClick={() => terrainWait.arm()} style={{ display: "inline-block", padding: "6Px" }}>准备地形观察</View>
    <View onClick={finishAndExport} style={{ display: "inline-block", padding: "6Px" }}>结束并导出</View>
    <View>{exportStatus}</View>
  </View> : null;
}
