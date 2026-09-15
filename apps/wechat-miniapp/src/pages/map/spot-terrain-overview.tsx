import { Button, Image, Slider, Text, View } from "@tarojs/components";
import type { SpotSummary } from "@starward/miniapp-contracts";
import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { SemanticIcon } from "@/components/semantic-asset";
import { StatusPanel } from "@/components/status-panel";
import { Provenance } from "@/components/provenance";
import { SoftButton } from "@/components/soft-button";
import { useAppStore } from "@/state/app-store";
import { useTerrainOverlay } from "@/hooks/use-terrain-overlay";
import { TERRAIN_RADIUS_TICKS, terrainCropPercent, terrainRadiusForSlider, terrainSliderForRadius, terrainViewportBounds } from "./terrain-geometry";

export function SpotTerrainOverview({ spot, visible }: { spot: SpotSummary; visible: boolean }) {
  const [radiusKm, setRadiusKm] = useState(5);
  const [terrainVisible, setTerrainVisible] = useState(true);
  const [lightVisible, setLightVisible] = useState(true);
  const terrain = useTerrainOverlay({
    purpose: "SPOT",
    center: { system: "GCJ02", latitude: spot.gcj02.latitude, longitude: spot.gcj02.longitude },
    radiusKm,
  }, visible && (terrainVisible || lightVisible), visible && terrainVisible);
  const data = terrain.data?.data;
  const requested = useMemo(() => terrainViewportBounds(spot.gcj02, radiusKm), [radiusKm, spot.gcj02]);
  const cropStyle = useMemo(() => {
    const published = data?.imageBoundsGcj02;
    if (!published) return undefined;
    const crop = terrainCropPercent(published, requested);
    return {
      width: `${crop.width}%`, height: `${crop.height}%`, left: `${crop.left}%`, top: `${crop.top}%`,
    } as CSSProperties;
  }, [data?.imageBoundsGcj02, requested]);
  const lightCells = data?.lightPollution.cells ?? [];
  const ready = Boolean(data && data.state !== "UNAVAILABLE" && terrain.imagePath);
  const notify = useAppStore(state => state.notify);
  const terrainMissing = data?.state === "UNAVAILABLE" && !data.failureCode;
  const lightMissing = data?.lightPollution.state === "UNAVAILABLE" && !data.lightPollution.failureCode;
  const terrainFailed = Boolean(terrain.isError || terrain.refreshError || terrain.imageError || data?.failureCode);
  const lightFailed = Boolean(terrain.isError || terrain.refreshError || data?.lightPollution.failureCode);
  const failed = (terrainVisible && terrainFailed) || (lightVisible && lightFailed);
  const hasPicture = (terrainVisible && ready) || (lightVisible && lightCells.length > 0);
  const pending = terrain.isPending || (terrainVisible && terrain.imagePending);
  useEffect(() => {
    if (visible && failed) notify({ owner: "spot-terrain", placement: "floating", tone: "info", title: "图层数据异常",
      body: "部分图层暂时无法读取，可在地形与光污染中重试。", dedupeKey: spot.spotId });
  }, [visible, failed, notify, spot.spotId]);
  return <View className="spot-terrain" data-control="spot-terrain-horizon">
    <View className="spot-terrain__heading">
      <View><Text className="type-label">地形与光污染</Text><Text className="type-caption">北向上</Text></View>
    </View>
    <View className="spot-terrain__radius-row"><Text className="type-secondary">查看半径</Text><Text className="spot-terrain__radius-value">{radiusKm.toFixed(1)} <Text className="type-caption">km</Text></Text></View>
    <Slider className="spot-terrain__slider" min={0} max={100} step={1} value={terrainSliderForRadius(radiusKm)} activeColor="#8ca89a" backgroundColor="#dde4df" blockColor="#8ca89a" blockSize={18}
      ariaLabel={`查看半径 ${radiusKm.toFixed(1)} 公里`} onChanging={(event) => setRadiusKm(terrainRadiusForSlider(event.detail.value))} onChange={(event) => setRadiusKm(terrainRadiusForSlider(event.detail.value))} />
    <View className="spot-terrain__ticks" aria-hidden="true">{TERRAIN_RADIUS_TICKS.map(value => <Text key={value} style={{ left: `${terrainSliderForRadius(value)}%` }}>{value}</Text>)}</View>
    <View className="spot-terrain__map" ariaLabel={`${spot.name}周边 ${radiusKm.toFixed(1)} 公里地形概览，真北向上`}>
      {terrainVisible && ready && cropStyle ? <Image className="spot-terrain__image" src={terrain.imagePath!} mode="scaleToFill" style={cropStyle} aria-hidden="true"
        onError={() => terrain.reportImageFailure(new Error("terrain_image_decode_failed"), terrain.imagePath)} /> : null}
      {lightVisible && data?.lightPollution.state !== "UNAVAILABLE" ? lightCells.map(cell => {
        const width = requested.east - requested.west;
        const height = requested.north - requested.south;
        return <View key={cell.id} className="spot-terrain__light-cell" ariaLabel={`${cell.label}，${cell.radiance} ${cell.unit}`} style={{ left: `${(cell.boundsGcj02.west - requested.west) / width * 100}%`, top: `${(requested.north - cell.boundsGcj02.north) / height * 100}%`, width: `${(cell.boundsGcj02.east - cell.boundsGcj02.west) / width * 100}%`, height: `${(cell.boundsGcj02.north - cell.boundsGcj02.south) / height * 100}%`, backgroundColor: cell.color }} />;
      }) : null}
      {!terrainVisible && !lightVisible ? <View className="spot-terrain__empty"><Text>地形与光污染均已关闭</Text></View> : null}
      {!hasPicture && (terrainVisible || lightVisible) ? <View className="spot-terrain__empty"><StatusPanel state={pending ? "LOADING" : "EMPTY"}
        detail={pending ? "正在加载图层…" : "当前所选图层暂无可用数据。"} /></View> : null}
      <View className="spot-terrain__ring spot-terrain__ring--outer" aria-hidden="true" /><View className="spot-terrain__ring spot-terrain__ring--inner" aria-hidden="true" />
      <Text className="spot-terrain__direction spot-terrain__direction--north">北</Text><Text className="spot-terrain__direction spot-terrain__direction--east">东</Text><Text className="spot-terrain__direction spot-terrain__direction--south">南</Text><Text className="spot-terrain__direction spot-terrain__direction--west">西</Text>
      <Image className="spot-terrain__center" src="/assets/b-icons/spot-marker--day--selected.png" mode="aspectFit" ariaLabel="当前观星点" />
      {(() => { const scaleKm = radiusKm <= 5 ? 1 : radiusKm <= 20 ? 5 : 10; return <View className="spot-terrain__scale" aria-hidden="true"><View style={{ width: `${scaleKm / (2 * radiusKm) * 100}%` }} /><Text>{scaleKm} km</Text></View>; })()}
    </View>
    <View className="spot-terrain__coverage"><Text>外圈半径 {radiusKm.toFixed(1)} km</Text><Text>{data?.state === "PARTIAL" ? "局部缺测" : data?.state === "AVAILABLE" ? "地形可用" : "地形不可用"}</Text></View>
    <View className="spot-terrain__toggles" ariaLabel="地形图层选择">
      {[{ key: "terrain", label: "地形", detail: "高程派生阴影", enabled: terrainVisible && !terrainMissing, disabled: terrainMissing, icon: "terrain" as const }, { key: "light", label: "光污染", detail: "年度卫星估算", enabled: lightVisible && !lightMissing, disabled: lightMissing, icon: "bulb" as const }].map(item => <Button key={item.key} disabled={item.disabled} className={`spot-terrain__toggle${item.enabled ? " spot-terrain__toggle--active" : ""}`} ariaLabel={`${item.label}${item.disabled ? "，当前地区暂无数据" : item.enabled ? "，已开启" : "，已关闭"}`} aria-checked={item.enabled} onClick={() => item.key === "terrain" ? setTerrainVisible(value => !value) : setLightVisible(value => !value)}>
        <SemanticIcon name={item.icon} /><View><Text>{item.label}</Text><Text>{item.detail}</Text></View>{item.enabled ? <SemanticIcon name="check" /> : null}
      </Button>)}
    </View>
    {terrainMissing ? <Text className="spot-terrain__layer-state">地形：当前地区暂无数据</Text> : null}
    {failed ? <SoftButton label="重新读取图层" onClick={() => void terrain.refetch()}>重试</SoftButton> : null}
    {lightVisible ? data?.lightPollution.state === "UNAVAILABLE" ? <Text className="spot-terrain__layer-state">光污染：{data.lightPollution.coverageLabel}</Text> : <View className="spot-terrain__legend">{data?.lightPollution.legend.map(item => <View key={item.label}><View style={{ backgroundColor: item.color }} /><Text>{item.label}</Text></View>)}</View> : null}
    <View className="spot-terrain__source" data-control="spot-terrain-source">
      {data?.datasetVersion ? <Text>{data.datasetVersion}</Text> : null}
      {data?.sourceResolution && data.derivedResolutionM !== null ? <Text>源分辨率 {data.sourceResolution} · 派生约 {data.derivedResolutionM} m · {data.coverageLabel}</Text> : null}
      <Text>不含近处树木、围墙、临时灯及逐方向遮挡角。</Text>
      {data?.source ? <Provenance source={data.source} showKind={false} /> : null}
    </View>
  </View>;
}
