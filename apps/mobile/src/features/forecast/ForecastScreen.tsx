import { useEffect, useMemo, useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { describeAtmosphere, intersectNightWindows, normalizeWeatherHour } from "@starward/domain/forecast";
import { colors, minimumTouchTarget, radii, spacing, type as typeToken } from "@starward/ui-system/tokens";

const palette = colors.planning;

type CaseKey = "hourly-professional-view" | "model-disagreement" | "future-trend" | "twilight-and-milky-way" | "layer-provenance";

const actionByCase: Record<CaseKey, string> = {
  "hourly-professional-view": "forecast-open-hourly",
  "model-disagreement": "forecast-compare-models",
  "future-trend": "forecast-select-future-night",
  "twilight-and-milky-way": "forecast-open-astronomy-timeline",
  "layer-provenance": "forecast-open-layer-details",
};

const fixtures = {
  hour: normalizeWeatherHour({ validTimeUtc: "2026-08-12T16:00:00Z", providerRunId: "fixture-qweather-20260812-20", temperatureC: 24, totalCloud: 18, lowCloud: 8, midCloud: 12, highCloud: 22, visibilityM: 18000, windMps: 2.1, humidity: 54 }),
  atmosphere: describeAtmosphere({ providerSeeing: null, calibrated: false, cloud: 0.18, windMps: 2.1, humidity: 0.54 }),
};

function Evidence({ testID, title, body, meta }: { testID: string; title: string; body: string; meta?: string }) {
  return <View testID={testID} style={styles.evidence}><Text style={styles.evidenceTitle}>{title}</Text><Text style={styles.evidenceBody}>{body}</Text>{meta ? <Text style={styles.evidenceMeta}>{meta}</Text> : null}</View>;
}

function HourlyPanel() {
  return <View style={styles.panel}>
    <Text style={styles.panelTitle}>20:00 · 专业小时条件</Text>
    <Evidence testID="forecast-hourly-cloud" title="分层云" body="总云 18% · 低云 8% · 中云 12% · 高云 22%" meta="供应商层高定义已标准化；缺失值保留为空，不转成 0" />
    <Evidence testID="forecast-hourly-transparency" title={fixtures.atmosphere.label} body="中等偏好 · 可信度 56%" meta={`因素：云量、${fixtures.hour.windMps} m/s 风、${fixtures.hour.humidity}% 湿度；${fixtures.atmosphere.uncertainty}`} />
    <Evidence testID="forecast-hourly-seeing" title="正式视宁度未启用" body="数据未获验证，不显示 arcsec 数字" meta="实验性指标不参与安全硬阻断" />
  </View>;
}

function ModelPanel() {
  return <View style={styles.panel}>
    <Text style={styles.panelTitle}>模型一致与分歧</Text>
    <Evidence testID="forecast-model-a" title="主模型 · QWeather fixture" body="前半夜低云 8–14%，批次 20260812-20" meta="验收夹具，不代表实时生产数据" />
    <Evidence testID="forecast-model-b" title="对比模型 · Open-Meteo fixture" body="前半夜接近；02:00 后低云升至 48%" meta="商业生产端点尚待合同确认" />
    <Evidence testID="forecast-disagreement" title="02:00 后出现明显分歧" body="前半夜一致，后半夜可信度降为中低；建议按主窗口行动并临行刷新。" meta="可查看各模型来源、运行批次与分辨率" />
  </View>;
}

function TrendPanel() {
  return <View style={styles.panel}>
    <Text testID="forecast-night-selector" style={styles.panelTitle}>未来第 12 夜 · 8 月 24 日</Text>
    <Evidence testID="forecast-trend-confidence" title="远期趋势 · 低可信度 31%" body="多云趋势，18–27°C；无月黑夜约 3 小时 10 分" meta="这是规划趋势，不是实时确定结果" />
    <Evidence testID="forecast-validity" title="有效性边界" body="生成于 7 月 20 日；临近出发必须刷新天气、预警与路线" meta="可带入计划，但保存为带版本的趋势快照" />
  </View>;
}

function TimelinePanel() {
  const overlap = intersectNightWindows(
    { startUtc: "2026-08-12T13:18:00Z", endUtc: "2026-08-12T21:02:00Z" },
    { startUtc: "2026-08-12T16:20:00Z", endUtc: "2026-08-12T20:10:00Z" },
    { startUtc: "2026-08-12T15:35:00Z", endUtc: "2026-08-12T18:45:00Z" },
  );
  return <View style={styles.panel}>
    <Text style={styles.panelTitle}>连续天文时间带 · Asia/Shanghai</Text>
    <Evidence testID="astronomy-twilight" title="完全天黑" body="21:18–次日 05:02" meta="天文昏影结束至天文晨光开始" />
    <Evidence testID="astronomy-moon-window" title="无月窗口" body="次日 00:20–04:10" meta="月落后至晨光前；月光条件单独计算" />
    <Evidence testID="astronomy-milky-way-window" title="银河最佳真实交集" body={overlap ? `00:20–02:45 · ${overlap.durationMinutes} 分钟` : "本夜无交集"} meta="仅取完全天黑 ∩ 无月 ∩ 银河高度/遮挡可用区间" />
  </View>;
}

function LayerPanel() {
  return <View style={styles.panel}>
    <Text style={styles.panelTitle}>低云图层详情</Text>
    <Evidence testID="forecast-layer-source" title="数据来源" body="QWeather hourly-grid fixture" meta="生产使用权与配额仍待 commercial-provider-rights-and-quotas 确认" />
    <Evidence testID="forecast-layer-version" title="批次与图例" body="fixture-20260812-20 · 0–100% 低云覆盖 · 透明度 65%" meta="验收夹具，不是当前实时图层" />
    <Evidence testID="forecast-layer-freshness" title="生成与更新" body="生成 20:00 · 预计下次 21:00 · 当前状态：fixture" meta="加载失败时原子回退上一可用图层，不混合半加载瓦片" />
  </View>;
}

export function ForecastScreen({ fixture }: { fixture?: string }) {
  const fixtureCase = fixture?.split(":")[1] as CaseKey | undefined;
  const [active, setActive] = useState<CaseKey | null>(null);
  const [capabilityState, setCapabilityState] = useState<"loading" | "ready" | "unavailable">(Platform.OS === "web" ? "loading" : "ready");
  const cases = useMemo(() => Object.keys(actionByCase) as CaseKey[], []);
  useEffect(() => {
    if (Platform.OS !== "web") return;
    let current = true;
    fetch("/forecast-capabilities.json", { cache: "no-store" })
      .then(async (response) => response.ok ? response.json() : Promise.reject(new Error(`capability_manifest_${response.status}`)))
      .then((value: { feature?: string; surfaces?: string[] }) => {
        if (current) setCapabilityState(value.feature === "forecast-and-astronomy" && cases.every((key) => value.surfaces?.includes(key)) ? "ready" : "unavailable");
      })
      .catch(() => { if (current) setCapabilityState("unavailable"); });
    return () => { current = false; };
  }, [cases]);
  return <SafeAreaView testID="screen-forecast-and-astronomy" style={styles.screen}>
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.eyebrow}>完整条件</Text>
      <Text style={styles.title}>专业天气与天文证据</Text>
      <Text style={styles.subtitle}>位置、时区、单位、来源、批次、质量状态和不确定性一起展示。供应商不可用时保留可验证的降级状态。</Text>
      {capabilityState === "loading" ? <View style={styles.empty}><Text style={styles.emptyTitle}>正在核对能力版本…</Text></View> : <View style={styles.actions}>{cases.map((key) => <Pressable key={key} testID={actionByCase[key]} accessibilityRole="button" onPress={() => capabilityState === "ready" ? setActive(key) : setActive(null)} style={({ pressed }) => [styles.action, fixtureCase === key && styles.actionRecommended, pressed && styles.pressed]}><Text style={styles.actionText}>{({ "hourly-professional-view": "小时矩阵", "model-disagreement": "模型比较", "future-trend": "15 日趋势", "twilight-and-milky-way": "天文时间带", "layer-provenance": "图层来源" } as Record<CaseKey, string>)[key]}</Text></Pressable>)}</View>}
      {capabilityState === "unavailable" ? <View style={styles.empty}><Text style={styles.emptyTitle}>专业条件能力暂不可用</Text><Text style={styles.emptyBody}>能力清单缺失或版本不匹配。基础壳仍可使用，但不会伪造小时、模型、趋势、时间带或图层证据。</Text></View> : null}
      {active === "hourly-professional-view" ? <HourlyPanel /> : null}
      {active === "model-disagreement" ? <ModelPanel /> : null}
      {active === "future-trend" ? <TrendPanel /> : null}
      {active === "twilight-and-milky-way" ? <TimelinePanel /> : null}
      {active === "layer-provenance" ? <LayerPanel /> : null}
      {!active && capabilityState === "ready" ? <View style={styles.empty}><Text style={styles.emptyTitle}>选择一种证据视图</Text><Text style={styles.emptyBody}>摘要不会用单一分数代替专业指标；各视图共享同一选中时刻和位置上下文。</Text></View> : null}
    </ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.canvas },
  content: { padding: spacing.x2, paddingBottom: 48, gap: spacing.x2 },
  eyebrow: { color: palette.primaryActive, fontSize: typeToken.label, fontWeight: "700" },
  title: { color: palette.text, fontSize: typeToken.title, lineHeight: 32, fontWeight: "700" },
  subtitle: { color: palette.textSecondary, fontSize: typeToken.body, lineHeight: 23 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.x1 },
  action: { minHeight: minimumTouchTarget, justifyContent: "center", paddingHorizontal: 14, borderWidth: 1, borderColor: palette.border, borderRadius: radii.pill, backgroundColor: palette.surface },
  actionRecommended: { borderColor: palette.primaryActive },
  actionText: { color: palette.text, fontSize: typeToken.label, fontWeight: "700" },
  panel: { gap: spacing.x1, padding: spacing.x2, borderWidth: 1, borderColor: palette.border, borderRadius: radii.layer, backgroundColor: palette.surface },
  panelTitle: { color: palette.text, fontSize: typeToken.section, fontWeight: "700" },
  evidence: { minHeight: 86, padding: 12, borderRadius: radii.control, backgroundColor: palette.surfaceMuted },
  evidenceTitle: { color: palette.text, fontSize: typeToken.body, fontWeight: "700" },
  evidenceBody: { marginTop: 5, color: palette.text, fontSize: typeToken.label, lineHeight: 19 },
  evidenceMeta: { marginTop: 5, color: palette.textSecondary, fontSize: typeToken.caption, lineHeight: 17 },
  empty: { minHeight: 180, justifyContent: "center", padding: spacing.x2, borderWidth: 1, borderColor: palette.border, borderRadius: radii.layer, backgroundColor: palette.surface },
  emptyTitle: { color: palette.text, fontSize: typeToken.section, fontWeight: "700" },
  emptyBody: { marginTop: spacing.x1, color: palette.textSecondary, lineHeight: 21 },
  pressed: { opacity: 0.7 },
});
