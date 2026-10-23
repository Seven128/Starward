import { Image, Slider, Text, View } from "@tarojs/components";
import { SharedButton as Button } from "@/components/shared-button-press";
import type { SpotSummary } from "@starward/miniapp-contracts";
import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { SemanticIcon } from "@/components/semantic-asset";
import { StatusPanel } from "@/components/status-panel";
import { SourceEntry } from "@/components/source-entry";
import { SourceAttribution } from "@/components/source-attribution";
import { SoftButton } from "@/components/soft-button";
import { useAppStore } from "@/state/app-store";
import { useTerrainOverlay } from "@/hooks/use-terrain-overlay";
import { useTerrainHorizon } from "@/hooks/use-terrain-horizon";
import { useRasterImage } from "@/hooks/use-raster-image";
import { mercatorRasterCropPercent } from "@/services/raster-image-geometry";
import { TERRAIN_RADIUS_TICKS, terrainCropPercent, terrainRadiusForSlider, terrainSliderForRadius, terrainViewportBounds } from "./terrain-geometry";
import { terrainLayerAvailability } from "./terrain-layer-availability";
import { formalSpotMarkerIconPath } from "./map-markers";
import { SpotTerrainHorizon } from "./spot-terrain-horizon";

export function SpotTerrainOverview({ spot, visible, onLayoutChange }: { spot: SpotSummary; visible: boolean; onLayoutChange?: (() => void) | undefined }) {
  const mode = useAppStore(state => state.mode);
  const observation = mode === "OBSERVATION";
  const sliderColor = observation ? "#ff6b58" : "#8ca89a";
  const [radiusKm, setRadiusKm] = useState(5);
  const radiusText = radiusKm.toFixed(1);
  const updateRadius = (event: { detail: { value: number } }) => setRadiusKm(terrainRadiusForSlider(event.detail.value));
  const [terrainVisible, setTerrainVisible] = useState(true);
  const [lightVisible, setLightVisible] = useState(true);
  const horizon = useTerrainHorizon({ center: { system: "GCJ02", latitude: spot.gcj02.latitude, longitude: spot.gcj02.longitude } }, visible);
  const terrain = useTerrainOverlay({
    purpose: "SPOT",
    center: { system: "GCJ02", latitude: spot.gcj02.latitude, longitude: spot.gcj02.longitude },
    radiusKm,
  }, visible && (terrainVisible || lightVisible), visible && terrainVisible);
  const data = terrain.data?.data;
  const lightRaster = data?.lightPollution.raster ?? null;
  const lightImage = useRasterImage(lightRaster ? { key: `${lightRaster.publicationId}:${lightRaster.imageUrl}`,
    url: lightRaster.imageUrl, expectedBytes: lightRaster.imageBytes, expectedSha256: lightRaster.imageSha256 } : null,
  visible && lightVisible && Boolean(lightRaster?.validPixelCount));
  const requested = useMemo(() => terrainViewportBounds(spot.gcj02, radiusKm), [radiusKm, spot.gcj02]);
  const cropStyle = useMemo(() => {
    const published = data?.imageBoundsGcj02;
    if (!published) return undefined;
    const crop = terrainCropPercent(published, requested);
    return {
      width: `${crop.width}%`, height: `${crop.height}%`, left: `${crop.left}%`, top: `${crop.top}%`,
    } as CSSProperties;
  }, [data?.imageBoundsGcj02, requested]);
  const lightCropStyle = useMemo(() => {
    if (!lightRaster) return undefined;
    const crop = mercatorRasterCropPercent(lightRaster.boundsGcj02, requested);
    return { width: `${crop.width}%`, height: `${crop.height}%`, left: `${crop.left}%`, top: `${crop.top}%` } as CSSProperties;
  }, [lightRaster, requested]);
  const lightCells = data?.lightPollution.cells ?? [];
  const ready = Boolean(data && data.state !== "UNAVAILABLE" && terrain.imagePath);
  const terrainShown = terrainVisible && ready && cropStyle;
  const lightRasterShown = lightVisible && data?.lightPollution.state !== "UNAVAILABLE" && lightImage.imagePath && lightCropStyle;
  const lightShown = lightRasterShown || (lightVisible && !lightRaster && data?.lightPollution.state !== "UNAVAILABLE" && lightCells.length > 0);
  const displayedSources = [
    ...(terrainShown && data?.source ? [data.source] : []),
    ...(lightShown && data?.lightPollution.source ? [data.lightPollution.source] : []),
    // The original chapter credit block covers both Copernicus derivatives;
    // SourceAttribution deduplicates the shared mandatory notices.
    ...(horizon.data?.data.state !== "UNAVAILABLE" && horizon.data?.data.source ? [horizon.data.data.source] : []),
  ];
  const encoding = terrainShown ? data?.elevationColorEncoding : null;
  const notify = useAppStore(state => state.notify);
  const requestFailed = Boolean(terrain.isError || terrain.refreshError);
  const terrainAvailability = terrainLayerAvailability(data?.state, data?.failureCode, requestFailed);
  const lightAvailability = terrainLayerAvailability(data?.lightPollution.state, data?.lightPollution.failureCode, requestFailed);
  const terrainMissing = terrainAvailability === "EMPTY";
  const lightMissing = lightAvailability === "EMPTY" || Boolean(lightRaster && lightRaster.validPixelCount === 0);
  const terrainFailed = terrainAvailability === "ERROR" || Boolean(terrain.imageError);
  const lightFailed = lightAvailability === "ERROR" || Boolean(lightImage.imageError);
  const failed = (terrainVisible && terrainFailed) || (lightVisible && lightFailed);
  const hasPicture = terrainShown || lightShown;
  const pending = terrain.isPending || (terrainVisible && terrain.imagePending) || (lightVisible && lightImage.imagePending);
  useEffect(() => { onLayoutChange?.(); }, [data, terrainShown, lightRasterShown, lightShown, pending, failed, terrainMissing, lightMissing, onLayoutChange]);
  const retryLayers = () => { lightImage.retryImage(); void terrain.refetch(); };
  useEffect(() => {
    if (visible && failed) notify({ owner: "spot-terrain", placement: "floating", tone: "info", title: "图层数据异常",
      body: "部分图层暂时无法读取，可在地形与光污染中重试。", dedupeKey: spot.spotId });
  }, [visible, failed, notify, spot.spotId]);
  return <View className="spot-terrain" data-control="spot-terrain-horizon">
    <View className="spot-terrain__heading">
      <View><Text className="type-label">地形与光污染</Text><Text className="type-caption">北向上</Text></View>
    </View>
    <View className="spot-terrain__radius-row"><Text className="type-secondary">查看半径</Text><Text className="spot-terrain__radius-value">{radiusText} <Text className="type-caption">km</Text></Text></View>
    <Slider className="spot-terrain__slider" min={0} max={100} step={1} value={terrainSliderForRadius(radiusKm)} activeColor={sliderColor} backgroundColor={observation ? "#7a1e18" : "#dde4df"} blockColor={sliderColor} blockSize={18}
      ariaLabel={`查看半径 ${radiusText} 公里`} onChanging={updateRadius} onChange={updateRadius} />
    <View className="spot-terrain__ticks" aria-hidden="true">{TERRAIN_RADIUS_TICKS.map(value => <Text key={value} style={{ left: `${terrainSliderForRadius(value)}%` }}>{value}</Text>)}</View>
    <View id="spot-panel-reading-terrain-map" className="spot-terrain__map panel-reading-anchor" ariaLabel={`${spot.name}周边 ${radiusText} 公里地形概览，真北向上`}>
      {terrainShown ? <Image className="spot-terrain__image" src={terrain.imagePath!} mode="scaleToFill" style={terrainShown} aria-hidden="true"
        onError={() => terrain.reportImageFailure(new Error("terrain_image_decode_failed"), terrain.imagePath)} /> : null}
      {lightRasterShown ? <Image className="spot-terrain__light-image" src={lightImage.imagePath!} mode="scaleToFill" style={lightCropStyle} aria-hidden="true"
        onError={() => lightImage.reportImageFailure(new Error("nightlight_image_decode_failed"), lightImage.imagePath)} /> : null}
      {lightShown && !lightRaster ? lightCells.map(cell => {
        const width = requested.east - requested.west;
        const height = requested.north - requested.south;
        return <View key={cell.id} className="spot-terrain__light-cell" ariaLabel={`${cell.label}，${cell.radiance} ${cell.unit}`} style={{ left: `${(cell.boundsGcj02.west - requested.west) / width * 100}%`, top: `${(requested.north - cell.boundsGcj02.north) / height * 100}%`, width: `${(cell.boundsGcj02.east - cell.boundsGcj02.west) / width * 100}%`, height: `${(cell.boundsGcj02.north - cell.boundsGcj02.south) / height * 100}%`, backgroundColor: cell.color }} />;
      }) : null}
      {!terrainVisible && !lightVisible ? <View className="spot-terrain__empty"><Text>地形与光污染均已关闭</Text></View> : null}
      {!hasPicture && (terrainVisible || lightVisible) ? <View className="spot-terrain__empty" /> : null}
      <View className="spot-terrain__ring spot-terrain__ring--outer" aria-hidden="true" /><View className="spot-terrain__ring spot-terrain__ring--inner" aria-hidden="true" />
      {([["north", "北"], ["east", "东"], ["south", "南"], ["west", "西"]] as const).map(([direction, label]) => <Text key={direction} className={`spot-terrain__direction spot-terrain__direction--${direction}`}>{label}</Text>)}
      <Image className="spot-terrain__center" src={formalSpotMarkerIconPath(mode, true)} mode="aspectFit" ariaLabel="当前观星点" />
      {(() => { const scaleKm = radiusKm <= 5 ? 1 : radiusKm <= 20 ? 5 : 10; return <View className="spot-terrain__scale" aria-hidden="true"><View style={{ width: `${scaleKm / (2 * radiusKm) * 100}%` }} /><Text>{scaleKm} km</Text></View>; })()}
    </View>
    {!hasPicture && (terrainVisible || lightVisible) ? <StatusPanel state={pending ? "LOADING" : failed ? "ERROR" : "EMPTY"}
      detail={pending ? "正在加载图层…" : failed ? "图层暂时无法读取，请重试。" : "当前所选图层暂无可用数据。"}
      recoveryLabel={failed && !pending ? "重试图层" : undefined} onRecover={failed && !pending ? retryLayers : undefined} /> : null}
    <View className="spot-terrain__coverage"><Text>外圈半径 {radiusText} km</Text><Text>{!terrainVisible ? "地形已关闭" : terrainFailed ? "地形读取失败" : terrainAvailability === "PENDING" || terrain.imagePending ? "地形加载中" : data?.state === "PARTIAL" ? "局部缺测" : data?.state === "AVAILABLE" ? "地形可用" : "地形不可用"}</Text></View>
    <View className="spot-terrain__toggles" ariaLabel="地形图层选择">
      {[{ key: "terrain", label: "地形", detail: "显示地势起伏", enabled: terrainVisible && !terrainMissing, disabled: terrainMissing, icon: "terrain" as const }, { key: "light", label: "光污染", detail: "年度卫星估算", enabled: lightVisible && !lightMissing, disabled: lightMissing, icon: "bulb" as const }].map(item => <Button key={item.key} disabled={item.disabled} className={`spot-terrain__toggle spot-terrain__toggle--${item.key}${item.enabled ? " spot-terrain__toggle--active" : ""}${!item.disabled ? " spot-terrain__toggle--ready" : ""}`} ariaLabel={`${item.label}，${item.detail}${item.disabled ? "，当前地区暂无数据" : item.enabled ? "，已开启" : "，已关闭"}`} aria-checked={item.enabled} onClick={() => item.key === "terrain" ? setTerrainVisible(value => !value) : setLightVisible(value => !value)}>
        <SemanticIcon name={item.icon} /><View><Text>{item.label}</Text><Text className="spot-terrain__toggle-detail">{item.detail}</Text></View>{item.enabled ? <SemanticIcon name="terrain-toggle-check" /> : <View className="spot-terrain__unchecked" aria-hidden />}
      </Button>)}
    </View>
    {terrainMissing ? <Text className="spot-terrain__layer-state">地形：当前地区暂无数据</Text> : null}
    {failed && hasPicture ? <SoftButton label="重新读取图层" onClick={retryLayers}>重试</SoftButton> : null}
    <View className="spot-terrain__legends">
      {encoding ? <View className="spot-terrain__elevation-key" ariaLabel="地形高程基色，低至高">
        <Text className="type-caption">地形</Text><View aria-hidden="true" style={{ background: `linear-gradient(90deg,rgb(${encoding.lowRgb}),rgb(${encoding.highRgb}))`, opacity: encoding.alpha / 255 }} /><Text className="type-caption">低 — 高</Text>
      </View> : null}
      {lightVisible ? data?.lightPollution.state === "UNAVAILABLE" ? <Text className="spot-terrain__layer-state">光污染：{lightFailed ? "暂时无法读取，请重试" : data.lightPollution.coverageLabel}</Text> : <View className="spot-terrain__legend">{data?.lightPollution.legend.map(item => <View key={item.label}><View style={{ backgroundColor: item.color }} /><Text>{item.label}</Text></View>)}</View> : null}
      {lightVisible && lightImage.imagePending ? <Text className="spot-terrain__layer-state">光污染：正在加载年度夜光</Text> : null}
      {lightVisible && lightRaster && lightFailed ? <Text className="spot-terrain__layer-state">光污染：暂时无法显示，请重试</Text> : null}
    </View>
    <SpotTerrainHorizon key={spot.spotId} query={horizon} visible={visible} onLayoutChange={onLayoutChange} />
    <View id="spot-panel-reading-terrain-source" className="spot-terrain__source panel-reading-anchor" data-control="spot-terrain-source">
      {displayedSources.length ? <SourceAttribution presentation="credit" sources={displayedSources} /> : null}
      <Text>俯视图不表示逐方向遮挡角；近处树木、围墙及临时灯仍需现场核对。</Text>
      {lightVisible && lightRaster ? <Text>{data?.lightPollution.coverageLabel}</Text> : null}
      {data ? <SourceEntry key={spot.spotId} id="terrain-data-source" label="地形与夜光来源" sources={[...(data.source ? [data.source] : []), ...(data.lightPollution.source ? [data.lightPollution.source] : [])]}
        sections={[{ kind: "text", paragraphs: [
          ...(data.datasetVersion ? [data.datasetVersion] : []),
          ...(data.sourceResolution && data.derivedResolutionM !== null ? [`源分辨率 ${data.sourceResolution} · 派生约 ${data.derivedResolutionM} m · ${data.coverageLabel}`] : [data.coverageLabel]),
        ] }]} /> : null}
    </View>
  </View>;
}
