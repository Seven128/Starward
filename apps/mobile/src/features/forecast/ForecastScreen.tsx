import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { ForecastBundle, ProfessionalForecastHour } from "@starward/contracts/forecast";
import { colors, minimumTouchTarget, radii, spacing, type as typeToken } from "@starward/ui-system/tokens";
import { createForecastClient } from "../../data/forecast-client";
import { useShellStore } from "../../state/shell-store";

const palette = colors.planning;
type ViewKey = "hourly-professional-view" | "model-disagreement" | "future-trend" | "twilight-and-milky-way" | "layer-provenance";
const client = createForecastClient();

const actions: Array<{ key: ViewKey; testID: string; label: string }> = [
  { key: "hourly-professional-view", testID: "forecast-open-hourly", label: "小时矩阵" },
  { key: "model-disagreement", testID: "forecast-compare-models", label: "模型比较" },
  { key: "future-trend", testID: "forecast-select-future-night", label: "15 日趋势" },
  { key: "twilight-and-milky-way", testID: "forecast-open-astronomy-timeline", label: "天文时间带" },
  { key: "layer-provenance", testID: "forecast-open-layer-details", label: "图层来源" },
];

function Evidence({ testID, title, body, meta }: { testID: string; title: string; body: string; meta?: string }) {
  return <View testID={testID} style={styles.evidence}><Text style={styles.evidenceTitle}>{title}</Text><Text style={styles.evidenceBody}>{body}</Text>{meta ? <Text style={styles.evidenceMeta}>{meta}</Text> : null}</View>;
}
const value = (input: number | null, suffix = "") => input === null ? "暂无" : `${Math.round(input * 10) / 10}${suffix}`;
const time = (input: string | null) => input ? input.slice(11, 16) : "--:--";

function HourlyPanel({ hour }: { hour: ProfessionalForecastHour | undefined }) {
  if (!hour) return <State title="所选观星夜暂无小时数据" body="请检查日期或稍后刷新；缺失数据不会显示成晴天。" />;
  return <View style={styles.panel}>
    <Text style={styles.panelTitle}>{time(hour.validTimeUtc)} · 专业小时条件</Text>
    <Evidence testID="forecast-hourly-cloud" title="分层云" body={`总云 ${value(hour.totalCloudPct, "%")} · 低云 ${value(hour.lowCloudPct, "%")} · 中云 ${value(hour.midCloudPct, "%")} · 高云 ${value(hour.highCloudPct, "%")}`} meta="缺失值保留为空，不会转成 0。" />
    <Evidence testID="forecast-hourly-transparency" title={hour.atmosphere.label} body={`可信度 ${Math.round(hour.atmosphere.confidence * 100)}% · 能见度 ${value(hour.visibilityM === null ? null : hour.visibilityM / 1000, " km")} · AOD ${value(hour.aerosolOpticalDepth)}`} meta={hour.atmosphere.uncertainty} />
    <Evidence testID="forecast-hourly-seeing" title={hour.atmosphere.officialSeeing ? "经验证的视宁度" : "正式视宁度未启用"} body={hour.atmosphere.officialSeeing ? "由已校准供应商提供" : "不输出 arcsec 数字；实验性大气稳定度不会伪装成专业视宁度。"} meta={`温度 ${value(hour.temperatureC, "°C")} · 湿度 ${value(hour.relativeHumidityPct, "%")} · 风 ${value(hour.windSpeedMps, " m/s")}`} />
  </View>;
}

function ModelPanel({ bundle }: { bundle: ForecastBundle }) {
  const primary = bundle.primary.run;
  const secondary = bundle.comparison?.run;
  return <View style={styles.panel}>
    <Text style={styles.panelTitle}>模型一致与分歧</Text>
    <Evidence testID="forecast-model-a" title={`主模型 · ${primary.provider} ${primary.model}`} body={`批次 ${primary.runId} · ${primary.status}`} meta={`${primary.sourceLicense} · 分辨率 ${value(primary.resolutionKm, " km")}`} />
    <Evidence testID="forecast-model-b" title={secondary ? `对比模型 · ${secondary.provider} ${secondary.model}` : "对比模型暂不可用"} body={secondary ? `批次 ${secondary.runId} · ${secondary.status}` : "不复制主模型充当第二模型。"} meta={secondary?.sourceLicense} />
    <Evidence testID="forecast-disagreement" title={`模型可信度 ${Math.round(bundle.modelComparison.confidence * 100)}%`} body={bundle.modelComparison.explanation} meta={`比较字段：${bundle.modelComparison.comparedFields.join("、") || "无"}`} />
  </View>;
}

function TrendPanel({ bundle }: { bundle: ForecastBundle }) {
  const trend = bundle.trends.at(-1);
  return <View style={styles.panel}>
    <Text testID="forecast-night-selector" style={styles.panelTitle}>{trend ? `${trend.date} · 远期规划夜` : "暂无远期趋势"}</Text>
    <Evidence testID="forecast-trend-confidence" title={trend ? `趋势可信度 ${Math.round(trend.confidence * 100)}%` : "趋势不可用"} body={trend ? `${trend.conditionText ?? "天气现象未知"} · ${value(trend.lowTemperatureC, "°C")}–${value(trend.highTemperatureC, "°C")} · 平均总云 ${value(trend.averageTotalCloudPct, "%")}` : "供应商没有返回可用日数据。"} meta={trend ? `无月黑夜约 ${value(trend.moonlessDarkMinutes, " 分钟")} · 目标可见 ${value(trend.targetVisibleMinutes, " 分钟")}` : undefined} />
    <Evidence testID="forecast-validity" title="有效性边界" body={`生成 ${bundle.generatedAt} · 有效至 ${bundle.expiresAt}`} meta="远期结果只用于规划；临近出发必须刷新天气、预警和路线。" />
  </View>;
}

function TimelinePanel({ bundle }: { bundle: ForecastBundle }) {
  const sky = bundle.astronomy;
  return <View style={styles.panel}>
    <Text style={styles.panelTitle}>连续天文时间带 · {sky.timezone}</Text>
    <Evidence testID="astronomy-twilight" title="完全天黑" body={sky.astronomicalDarkWindow ? `${time(sky.astronomicalDarkWindow.startUtc)}–${time(sky.astronomicalDarkWindow.endUtc)} · ${sky.astronomicalDarkWindow.durationMinutes} 分钟` : "本夜无完整天文黑夜"} meta={`算法 ${sky.algorithmVersion} · ${sky.coordinateSystem}`} />
    <Evidence testID="astronomy-moon-window" title="无月窗口" body={sky.moonlessWindow ? `${time(sky.moonlessWindow.startUtc)}–${time(sky.moonlessWindow.endUtc)} · ${sky.moonlessWindow.durationMinutes} 分钟` : "完全天黑期间没有连续无月窗口"} meta={`月升 ${time(sky.moonRise)} · 月落 ${time(sky.moonSet)}`} />
    <Evidence testID="astronomy-milky-way-window" title="目标最佳真实交集" body={sky.bestIntersection ? `${time(sky.bestIntersection.startUtc)}–${time(sky.bestIntersection.endUtc)} · ${sky.bestIntersection.durationMinutes} 分钟` : "完全天黑、无月和目标高度没有交集"} meta={sky.limitations.join("；")} />
  </View>;
}

function LayerPanel({ bundle }: { bundle: ForecastBundle }) {
  const layer = bundle.layers[1] ?? bundle.layers[0];
  return <View style={styles.panel}>
    <Text style={styles.panelTitle}>{layer?.name ?? "天气图层"}详情</Text>
    <Evidence testID="forecast-layer-source" title="数据来源" body={layer ? `${layer.provider} · ${layer.model}` : "来源不可用"} meta={layer?.attribution.map((item) => `${item.label} · ${item.licenseId}`).join("；")} />
    <Evidence testID="forecast-layer-version" title="批次与图例" body={layer ? `${layer.runId} · ${layer.legend.map((item) => item.label).join(" / ")} · 透明度 ${Math.round(layer.opacity * 100)}%` : "无可验证批次"} meta={layer?.limitation ?? undefined} />
    <Evidence testID="forecast-layer-freshness" title="生成与更新" body={layer ? `生成 ${layer.generatedAt} · 下次更新 ${layer.nextUpdateAt}` : "更新时间不可用"} meta={`状态：${layer?.status ?? "missing"}`} />
  </View>;
}

function State({ title, body, retry }: { title: string; body: string; retry?: () => void }) {
  return <View style={styles.state}><Text style={styles.stateTitle}>{title}</Text><Text style={styles.stateBody}>{body}</Text>{retry ? <Pressable accessibilityRole="button" onPress={retry} style={styles.retry}><Text style={styles.retryText}>重试</Text></Pressable> : null}</View>;
}

export function ForecastScreen() {
  const location = useShellStore((state) => state.location);
  const [active, setActive] = useState<ViewKey>("hourly-professional-view");
  const latitude = location.latitude ?? 22.529;
  const longitude = location.longitude ?? 113.9468;
  const nightDate = new Date().toISOString().slice(0, 10);
  const query = useQuery({ queryKey: ["forecast", latitude, longitude, nightDate], queryFn: ({ signal }) => client.get({ latitude, longitude, timezone: "Asia/Shanghai", nightDate, target: "milky-way-core" }, signal), retry: 1 });
  const open = (next: ViewKey) => { setActive(next); if (query.isError) void query.refetch(); };
  const firstNightHour = query.data?.primary.hours.find((hour) => hour.validTimeUtc >= (query.data?.astronomy.astronomicalDusk ?? "")) ?? query.data?.primary.hours[0];
  return <SafeAreaView testID="screen-forecast-and-astronomy" style={styles.screen}>
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.eyebrow}>完整条件 · {location.label}</Text><Text style={styles.title}>专业天气与天文证据</Text>
      <Text style={styles.subtitle}>位置、时区、来源、批次、质量状态和不确定性共同展示。供应商不可用时保留明确降级状态。</Text>
      <View style={styles.actions}>{actions.map((action) => <Pressable key={action.key} testID={action.testID} accessibilityRole="button" onPress={() => open(action.key)} style={({ pressed }) => [styles.action, active === action.key && styles.actionActive, pressed && styles.pressed]}><Text style={styles.actionText}>{action.label}</Text></Pressable>)}</View>
      {query.isLoading ? <State title="正在加载天气和天文证据…" body="服务端正在合并小时预报、模型来源与版本化天文计算。" /> : null}
      {query.isError ? <State title="专业条件暂不可用" body={query.error instanceof Error && query.error.message === "forecast_api_base_url_missing" ? "尚未配置 EXPO_PUBLIC_API_BASE_URL；不会以内置数字替代真实数据。" : "上游或聚合 API 请求失败；可以安全重试。"} retry={() => void query.refetch()} /> : null}
      {query.data?.warnings.map((warning) => <View key={warning} style={styles.warning}><Text style={styles.warningText}>{warning}</Text></View>)}
      {query.data && active === "hourly-professional-view" ? <HourlyPanel hour={firstNightHour} /> : null}
      {query.data && active === "model-disagreement" ? <ModelPanel bundle={query.data} /> : null}
      {query.data && active === "future-trend" ? <TrendPanel bundle={query.data} /> : null}
      {query.data && active === "twilight-and-milky-way" ? <TimelinePanel bundle={query.data} /> : null}
      {query.data && active === "layer-provenance" ? <LayerPanel bundle={query.data} /> : null}
    </ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.canvas }, content: { padding: spacing.x2, paddingBottom: 48, gap: spacing.x2 }, eyebrow: { color: palette.primaryActive, fontSize: typeToken.label, fontWeight: "700" }, title: { color: palette.text, fontSize: typeToken.title, lineHeight: 32, fontWeight: "700" }, subtitle: { color: palette.textSecondary, fontSize: typeToken.body, lineHeight: 23 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.x1 }, action: { minHeight: minimumTouchTarget, justifyContent: "center", paddingHorizontal: 14, borderWidth: 1, borderColor: palette.border, borderRadius: radii.pill, backgroundColor: palette.surface }, actionActive: { borderColor: palette.primaryActive, backgroundColor: palette.surfaceMuted }, actionText: { color: palette.text, fontSize: typeToken.label, fontWeight: "700" }, pressed: { opacity: 0.7 },
  panel: { gap: spacing.x1, padding: spacing.x2, borderWidth: 1, borderColor: palette.border, borderRadius: radii.layer, backgroundColor: palette.surface }, panelTitle: { color: palette.text, fontSize: typeToken.section, fontWeight: "700" }, evidence: { minHeight: 86, padding: 12, borderRadius: radii.control, backgroundColor: palette.surfaceMuted }, evidenceTitle: { color: palette.text, fontSize: typeToken.body, fontWeight: "700" }, evidenceBody: { marginTop: 5, color: palette.text, fontSize: typeToken.label, lineHeight: 19 }, evidenceMeta: { marginTop: 5, color: palette.textSecondary, fontSize: typeToken.caption, lineHeight: 17 },
  state: { minHeight: 180, justifyContent: "center", padding: spacing.x2, borderWidth: 1, borderColor: palette.border, borderRadius: radii.layer, backgroundColor: palette.surface }, stateTitle: { color: palette.text, fontSize: typeToken.section, fontWeight: "700" }, stateBody: { marginTop: spacing.x1, color: palette.textSecondary, lineHeight: 21 }, retry: { minHeight: minimumTouchTarget, marginTop: spacing.x2, alignItems: "center", justifyContent: "center", borderRadius: radii.control, backgroundColor: palette.primaryActive }, retryText: { color: palette.onPrimary, fontWeight: "700" }, warning: { padding: spacing.x1, borderRadius: radii.control, backgroundColor: palette.surfaceMuted }, warningText: { color: palette.text, fontSize: typeToken.caption, lineHeight: 18 },
});
