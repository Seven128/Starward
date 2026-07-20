import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { MapSpotSummary, RouteMode } from "@starward/contracts/map";
import { colors, minimumTouchTarget, radii, spacing, type as typeToken } from "@starward/ui-system/tokens";
import { createForecastClient } from "../../data/forecast-client";
import { createMapClient } from "../../data/map-client";
import { useShellStore } from "../../state/shell-store";
import { useMapSelectionStore } from "./map-selection-store";

const palette = colors.planning;
const mapClient = createMapClient();
const forecastClient = createForecastClient();
type ViewKey = "status" | "filters" | "layer" | "selected" | "reorder" | "mode" | "degradation";

const actionRows: Array<{ key: ViewKey; id: string; label: string }> = [
  { key: "status", id: "map-open-status", label: "范围状态" }, { key: "filters", id: "map-apply-strict-filter", label: "严格筛选" },
  { key: "layer", id: "map-toggle-light-layer", label: "环境图层" }, { key: "selected", id: "map-select-spot", label: "选择地点" },
  { key: "reorder", id: "map-reorder-route", label: "调整顺序" }, { key: "mode", id: "map-change-route-mode", label: "出行方式" },
  { key: "degradation", id: "map-refresh-route", label: "刷新路线" },
];

function Evidence({ testID, title, body, meta }: { testID: string; title: string; body: string; meta?: string }) {
  return <View testID={testID} style={styles.evidence}><Text style={styles.evidenceTitle}>{title}</Text><Text style={styles.evidenceBody}>{body}</Text>{meta ? <Text style={styles.evidenceMeta}>{meta}</Text> : null}</View>;
}
const distance = (meters: number | null) => meters === null ? "暂无" : meters >= 1000 ? `${Math.round(meters / 100) / 10} km` : `${meters} m`;
const duration = (seconds: number | null) => seconds === null ? "暂无" : `${Math.round(seconds / 60)} 分钟`;

export function MapScreen() {
  const location = useShellStore((state) => state.location);
  const [active, setActive] = useState<ViewKey>("status");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<RouteMode>("drive");
  const [orderReversed, setOrderReversed] = useState(false);
  const selectSharedSpot = useMapSelectionStore((state) => state.selectSpot);
  const assignRole = useMapSelectionStore((state) => state.assignRole);
  const latitude = location.latitude ?? 22.529;
  const longitude = location.longitude ?? 113.9468;
  const spots = useQuery({ queryKey: ["map-spots", latitude, longitude], queryFn: ({ signal }) => mapClient.spots({ lat: latitude, lon: longitude, radiusMeters: 100_000, limit: 20 }, signal) });
  const selected = useMemo(() => spots.data?.items.find((item) => item.id === selectedId) ?? spots.data?.items[0], [selectedId, spots.data]);
  const route = useQuery({
    queryKey: ["map-route", latitude, longitude, selected?.id, mode], enabled: Boolean(selected),
    queryFn: ({ signal }) => mapClient.route({ requestId: `map-${selected!.id}-${mode}`, origin: { lat: latitude, lon: longitude, system: "WGS84" }, destination: selected!.coordinate, mode }, signal),
  });
  const forecast = useQuery({ queryKey: ["map-layers", latitude, longitude], queryFn: ({ signal }) => forecastClient.get({ latitude, longitude, timezone: "Asia/Shanghai", nightDate: new Date().toISOString().slice(0, 10), target: "milky-way-core" }, signal) });
  const strictResults = (spots.data?.items ?? []).filter((spot) => ["parking", "toilet", "wheelchair"].every((facility) => spot.facilities.includes(facility)) && spot.status === "verified");
  const ordered = [...(spots.data?.items.slice(0, 3) ?? [])];
  if (orderReversed) ordered.reverse();
  const layer = forecast.data?.layers.find((item) => item.id === "lowCloudPct") ?? forecast.data?.layers[0];

  const activate = (key: ViewKey) => {
    setActive(key);
    if (key === "selected" && selected) { setSelectedId(selected.id); selectSharedSpot(selected); assignRole(selected, "backup"); }
    if (key === "reorder") setOrderReversed((value) => !value);
    if (key === "mode") setMode((value) => value === "drive" ? "cycle" : "drive");
    if (key === "degradation") void route.refetch();
  };

  return <SafeAreaView testID="screen-map-route-discovery" style={styles.screen}><ScrollView contentContainerStyle={styles.content}>
    <Text style={styles.eyebrow}>地点与路线 · {location.label}</Text><Text style={styles.title}>观星地图</Text>
    <Text style={styles.subtitle}>WGS84 用于业务和距离；地图/路线供应商转换只发生在适配边界。开放 POI 仅作为未验证候选。</Text>
    <View accessibilityLabel="地点分布画布" style={styles.mapCanvas}>
      <Text style={styles.mapCount}>{spots.isLoading ? "正在加载当前范围…" : `当前范围 ${spots.data?.items.length ?? 0} 个候选`}</Text>
      <View style={styles.markerRow}>{(spots.data?.items.slice(0, 6) ?? []).map((spot, index) => <Pressable key={spot.id} accessibilityRole="button" accessibilityLabel={`${spot.name}，${spot.mapState}`} onPress={() => { setSelectedId(spot.id); selectSharedSpot(spot); setActive("selected"); }} style={[styles.marker, selected?.id === spot.id && styles.markerSelected]}><Text style={styles.markerText}>{index + 1}</Text><Text numberOfLines={1} style={styles.markerLabel}>{spot.name}</Text></Pressable>)}</View>
      {spots.isError ? <Text style={styles.error}>地点源不可用；保留视口，可重试，不显示幽灵标记。</Text> : null}
    </View>
    <View style={styles.actions}>{actionRows.map((action) => <Pressable key={action.key} testID={action.id} accessibilityRole="button" onPress={() => activate(action.key)} style={[styles.action, active === action.key && styles.actionActive]}><Text style={styles.actionText}>{action.label}</Text></Pressable>)}</View>
    {active === "status" ? <StatusPanel spots={spots.data?.items ?? []} selected={selected} generatedAt={spots.data?.generatedAt} loading={spots.isLoading} /> : null}
    {active === "filters" ? <View style={styles.panel}><Evidence testID="map-active-filters" title="4 项硬筛选" body="已验证 + 停车 + 厕所 + 无障碍；安全条件不会被自动移除。" /><Evidence testID="map-empty-reason" title={strictResults.length ? `${strictResults.length} 个结果` : "没有符合全部条件的地点"} body="最可能冲突：开放候选尚未完成人工核验，且设施标签不能证明夜间可用。" /><Evidence testID="map-relax-filter" title="逐项放宽" body="可先移除厕所或无障碍；也可重置额外筛选，当前视口和日期保持不变。" /></View> : null}
    {active === "layer" ? <View style={styles.panel}><Evidence testID="map-layer-version" title={layer ? `${layer.name} · ${layer.model}` : "低云图层暂无版本"} body={layer ? `批次 ${layer.runId} · ${layer.valueUnit} · 透明度 ${Math.round(layer.opacity * 100)}%` : "等待天气聚合服务返回。"} /><Evidence testID="map-layer-freshness" title={layer ? `生成 ${layer.generatedAt}` : "生成时间未知"} body={layer ? `预计更新 ${layer.nextUpdateAt} · ${layer.status}` : "基础地图不受影响。"} /><Evidence testID="map-layer-failure-state" title={layer?.tileUrl ? "图层已加载" : "图层不可用，未覆盖旧图例"} body={layer?.limitation ?? "点位数据仍可用；没有许可的瓦片不会被拼成覆盖层。"} /></View> : null}
    {active === "selected" ? <SelectedPanel spot={selected} routeState={route.data?.state} /> : null}
    {active === "reorder" ? <View style={styles.panel}><Evidence testID="route-stop-order" title={ordered.length ? ordered.map((spot, index) => `${index + 1}. ${spot.name}`).join(" → ") : "暂无可排序地点"} body="主备角色和编号按同一选择状态更新。" /><Evidence testID="route-recalculation-state" title={route.isFetching ? "正在重新计算受影响路线" : "顺序已更新；不可用路段保持缺失"} body="旧路线不会在重算期间被描述为最新。" /><Evidence testID="route-version" title={`路线请求 ${route.data?.requestId ?? "尚未生成"}`} body={route.data ? `${route.data.provider}@${route.data.providerVersion} · ${route.data.state}` : "等待至少一个目的地。"} /></View> : null}
    {active === "mode" ? <View style={styles.panel}><Evidence testID="route-mode" title={`当前方式：${mode === "cycle" ? "骑行" : "驾车"}`} body={route.data?.navigationUsable ? `${distance(route.data.distanceMeters)} · ${duration(route.data.durationSeconds)}` : "该方式没有可验证路线，不套用其他方式 ETA。"} /><Evidence testID="route-parking-end" title="停车/道路终点" body={selected?.facilities.includes("parking") ? "POI 标有停车标签，但夜间开放和容量仍需核验。" : "未验证停车点；不能直接导航到架设位置。"} /><Evidence testID="route-last-mile" title="最后一段步行/搬运" body="步行距离与坡度尚未现场验证，当前明确缺失；不会用直线距离替代最后一段路线。" /></View> : null}
    {active === "degradation" ? <View style={styles.panel}><Evidence testID="route-provider-state" title={route.data?.state === "cached" ? "路线供应商超时，降级到缓存" : route.data?.state === "fresh" ? "路线最新" : "路线降级：供应商不可用"} body={route.data?.warning ?? "当前没有可验证路线。"} /><Evidence testID="route-cache-age" title={route.data?.state === "cached" ? `缓存生成 ${route.data.generatedAt}` : "没有合格缓存"} body={`快照版本 ${route.data?.providerVersion ?? "unavailable"}`} /><Evidence testID="route-straight-line-fallback" title={`直线参考 ${distance(route.data?.straightLineReferenceMeters ?? null)}`} body="仅作方位参考，不是驾车路线；仍可保留停车点或交给外部地图复核。" /></View> : null}
  </ScrollView></SafeAreaView>;
}

function StatusPanel({ spots, selected, generatedAt, loading }: { spots: MapSpotSummary[]; selected?: MapSpotSummary; generatedAt?: string; loading: boolean }) {
  const states = new Set(spots.map((spot) => spot.mapState));
  return <View style={styles.panel}><Evidence testID="map-location-context" title="深圳南山 · 今晚 · 银河预设" body={`WGS84 出发地；当前范围 ${spots.length} 个${loading ? "（加载中）" : ""}`} /><Evidence testID="map-data-state" title={loading ? "部分可用 · 正在加载地点" : spots.length ? "部分可用 · 开放候选待核验" : "无结果"} body={`状态：${[...states].join("、") || "暂无"}；形状、文字和标签共同表达，不只靠颜色。`} /><Evidence testID="map-provenance" title={selected?.source.label ?? "地点来源待加载"} body={selected ? `${selected.source.licenseId} · 抓取 ${selected.source.fetchedAt}` : "不会在来源缺失时制造地点。"} meta={generatedAt ? `聚合生成 ${generatedAt}` : undefined} /></View>;
}

function SelectedPanel({ spot, routeState }: { spot?: MapSpotSummary; routeState?: string }) {
  return <View style={styles.panel}><Evidence testID="map-selected-spot" title={spot?.name ?? "尚未选中地点"} body={spot ? `${distance(spot.distanceMeters)} · ${spot.status} · ${spot.mapState}` : "从可访问地点列表选择。"} /><Evidence testID="map-spot-summary" title={spot?.imageUrl ? "实景可用" : "真实缺图"} body={spot ? `设施：${spot.facilities.join("、") || "未知"} · 路线 ${routeState ?? "加载中"}` : "评分、设施与路线分别显示缺失。"} meta={spot?.factsBoundary} /><Evidence testID="map-add-to-plan" title="加入计划 · 备选" body={spot ? "角色会与今晚和行程共享；写入失败时回滚，不改变地点事实。" : "需要先选择地点。"} /></View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.canvas }, content: { padding: spacing.x2, paddingBottom: 48, gap: spacing.x2 }, eyebrow: { color: palette.primaryActive, fontSize: typeToken.label, fontWeight: "700" }, title: { color: palette.text, fontSize: typeToken.title, fontWeight: "700" }, subtitle: { color: palette.textSecondary, fontSize: typeToken.body, lineHeight: 23 },
  mapCanvas: { minHeight: 240, padding: spacing.x2, borderRadius: radii.layer, backgroundColor: "#DCE8F3", justifyContent: "space-between" }, mapCount: { color: palette.text, fontWeight: "700" }, markerRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.x1 }, marker: { width: 92, minHeight: 62, padding: 8, borderWidth: 1, borderColor: palette.border, borderRadius: radii.control, backgroundColor: palette.surface }, markerSelected: { borderColor: palette.primaryActive, borderWidth: 2 }, markerText: { color: palette.primaryActive, fontWeight: "800" }, markerLabel: { marginTop: 4, color: palette.text, fontSize: typeToken.caption }, error: { color: palette.danger, fontSize: typeToken.caption },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.x1 }, action: { minHeight: minimumTouchTarget, justifyContent: "center", paddingHorizontal: 12, borderWidth: 1, borderColor: palette.border, borderRadius: radii.pill, backgroundColor: palette.surface }, actionActive: { borderColor: palette.primaryActive }, actionText: { color: palette.text, fontSize: typeToken.caption, fontWeight: "700" },
  panel: { gap: spacing.x1, padding: spacing.x2, borderWidth: 1, borderColor: palette.border, borderRadius: radii.layer, backgroundColor: palette.surface }, evidence: { minHeight: 84, padding: 12, borderRadius: radii.control, backgroundColor: palette.surfaceMuted }, evidenceTitle: { color: palette.text, fontSize: typeToken.body, fontWeight: "700" }, evidenceBody: { marginTop: 5, color: palette.text, fontSize: typeToken.label, lineHeight: 19 }, evidenceMeta: { marginTop: 5, color: palette.textSecondary, fontSize: typeToken.caption, lineHeight: 17 },
});
