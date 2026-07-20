import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NightReport, NightReportRequest } from "@starward/contracts/night-report";
import { colors, minimumTouchTarget, radii, spacing, type as typeToken } from "@starward/ui-system/tokens";
import { createNightReportClient } from "../../data/night-report-client";
import { createTonightContext } from "./index";
import { useShellStore } from "../../state/shell-store";

type ViewMode = "decision" | "spots" | "target";
const palette = colors.planning;
const client = createNightReportClient();

function localDate(timezone: string, offsetDays = 0) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(Date.now() + offsetDays * 86_400_000));
}

function requestForCurrentContext(input: { latitude: number; longitude: number; label: string; profile: NightReportRequest["profile"]; maxTravelMinutes: number; nightDate: string }): NightReportRequest {
  const location = { lat: input.latitude, lon: input.longitude, system: "WGS84" as const, label: input.label };
  return { requestId: `night-${Date.now()}-${Math.random().toString(36).slice(2)}`, location, timezone: "Asia/Shanghai", nightDate: input.nightDate, profile: input.profile, target: "milky-way-core", route: { origin: location, maxTravelMinutes: input.maxTravelMinutes, modes: ["drive"] } };
}

function Evidence({ testID, title, body, meta }: { testID: string; title: string; body: string; meta?: string }) {
  return <View testID={testID} style={styles.evidence}><Text style={styles.evidenceTitle}>{title}</Text><Text style={styles.evidenceBody}>{body}</Text>{meta ? <Text style={styles.evidenceMeta}>{meta}</Text> : null}</View>;
}

function utcTime(value?: string | null) { return value ? value.slice(11, 16) : "--:--"; }
const metric = (value: number | null | undefined, suffix: string) => value === null || value === undefined ? "暂无数据" : `${Math.round(value * 10) / 10}${suffix}`;
const categoryLabel: Record<NightReport["decision"]["category"], string> = { excellent: "非常适合", good: "适合", mixed: "条件一般", "not-recommended": "不建议", "safety-risk": "存在安全风险", "insufficient-data": "暂无法判断" };

function DecisionPanel({ report }: { report: NightReport }) {
  const departureAt = report.observationWindow && report.primarySpot?.travelMinutes !== null && report.primarySpot?.travelMinutes !== undefined
    ? new Date(Date.parse(report.observationWindow.start) - report.primarySpot.travelMinutes * 60_000).toISOString()
    : null;
  return <View style={styles.panel}>
    <Evidence testID="tonight-decision-summary" title={`${categoryLabel[report.decision.category]} · ${report.decision.score ?? "—"} 分`} body={`${report.decision.summary} · 可信度 ${Math.round(report.decision.confidence * 100)}% · ${report.decision.reasons.join("；") || "关键原因不足"}`} meta={report.decision.blockers.join("；") || "安全与可达性阻断独立于综合分数"} />
    <Evidence testID="tonight-observation-window" title="最佳观测窗口" body={report.observationWindow ? `${utcTime(report.observationWindow.start)}–${utcTime(report.observationWindow.end)} · ${report.observationWindow.durationMinutes} 分钟` : "未找到连续观测窗口"} meta={`时区 ${report.context.timezone} · 观星夜 ${report.context.nightDate}`} />
    <Evidence testID="tonight-departure-guidance" title={departureAt ? `建议 ${utcTime(departureAt)} 前出发` : "建议出发时间暂不可算"} body={departureAt ? `按当前路线预计 ${report.primarySpot?.travelMinutes} 分钟；临行刷新路线和安全状态。` : "真实路线或连续窗口缺失，不用直线距离伪造出发时间。"} />
    <Evidence testID="tonight-data-provenance" title="来源与有效性" body={`生成 ${report.generatedAt} · 有效至 ${report.expiresAt}`} meta={report.provenance.map((item) => `${item.source}@${item.version}`).join(" · ")} />
  </View>;
}

function ConditionsPanel({ report, expanded, onToggle }: { report: NightReport; expanded: boolean; onToggle: () => void }) {
  const weather = report.conditions.weather;
  const astronomy = report.conditions.astronomy;
  return <View style={styles.panel}>
    <Text style={styles.panelTitle}>今晚条件摘要</Text>
    <Evidence testID="tonight-condition-weather" title={weather?.conditionText ?? "天气现象暂无数据"} body={`温度 ${metric(weather?.temperatureC, "°C")} · 体感 ${metric(weather?.apparentTemperatureC, "°C")} · 总云 ${metric(weather?.totalCloudPct, "%")} · 风 ${metric(weather?.windSpeedMps, " m/s")}`} meta={`湿度 ${metric(weather?.relativeHumidityPct, "%")} · 露点 ${metric(weather?.dewPointC, "°C")} · 降雨概率 ${metric(weather?.precipitationProbabilityPct, "%")}`} />
    <Evidence testID="tonight-condition-astronomy" title={`月面照明 ${metric(astronomy?.moonIllumination === null || astronomy?.moonIllumination === undefined ? null : astronomy.moonIllumination * 100, "%")}`} body={`月升 ${utcTime(astronomy?.moonRise)} · 月落 ${utcTime(astronomy?.moonSet)} · 天文黑夜 ${utcTime(astronomy?.astronomicalDusk)}–${utcTime(astronomy?.astronomicalDawn)}`} meta={astronomy?.moonlessWindow ? `无月黑夜 ${utcTime(astronomy.moonlessWindow.start)}–${utcTime(astronomy.moonlessWindow.end)} · ${astronomy.moonlessWindow.durationMinutes} 分钟` : "没有达到最短时长的连续无月黑夜"} />
    {expanded ? <>
      <Evidence testID="tonight-condition-cloud-layers" title="专业分层条件" body={`低云 ${metric(weather?.lowCloudPct, "%")} · 中云 ${metric(weather?.midCloudPct, "%")} · 高云 ${metric(weather?.highCloudPct, "%")}`} meta={`能见度 ${metric(weather?.visibilityM === null || weather?.visibilityM === undefined ? null : weather.visibilityM / 1000, " km")} · AQI ${metric(weather?.aqi, "")} · 风向 ${metric(weather?.windDirectionDeg, "°")}`} />
      <Evidence testID="tonight-condition-light" title="光污染：暂无经校准数据" body={report.conditions.lightPollution.boundary} meta="卫星夜光不等于现场天空亮度；不输出伪造 Bortle/SQM。" />
    </> : null}
    <Pressable testID="tonight-toggle-conditions" accessibilityRole="button" onPress={onToggle} style={styles.retry}><Text style={styles.retryText}>{expanded ? "收起专业条件" : "查看完整条件"}</Text></Pressable>
  </View>;
}

function SpotsPanel({ report }: { report: NightReport }) {
  return <View style={styles.panel}>
    <Evidence testID="tonight-primary-spot" title={`主地点 · ${report.primarySpot?.name ?? "未选出"}`} body={report.primarySpot ? `${report.primarySpot.distanceKm ?? "—"} km · ${report.primarySpot.travelMinutes ?? "—"} 分钟 · ${report.primarySpot.score} 分` : "候选均被阻断或数据不足"} meta={report.primarySpot?.risks.join("；")} />
    <Evidence testID="tonight-backup-spots" title="备选地点" body={report.backupSpots.length ? report.backupSpots.map((spot) => `${spot.role} · ${spot.name}（${spot.score}）`).join(" · ") : "暂无可证明差异的备选"} meta={`${report.backupSpots.some((spot) => spot.role === "weather-backup") ? "天气备选有地点级天气证据" : "天气备选缺失：当前没有候选地点级天气，未用相邻分数伪造"}；近距离/暗空角色只在数据支持时显示。`} />
    <Evidence testID="tonight-switch-impact" title="切换影响" body="切换主地点将原子更新路线、到达、观测窗口、目标方向和风险；未重算项标记为 stale。" />
  </View>;
}

function PartialPanel({ report }: { report: NightReport }) {
  const missing = Object.entries(report.parts).filter(([, part]) => part.state !== "fresh");
  return <View style={styles.panel}>
    <Evidence testID="tonight-partial-state" title={`部分可用 · ${missing.map(([key, part]) => `${key}:${part.state}`).join(" · ")}`} body={report.warnings.join("；") || "部分来源不是最新状态"} />
    <Evidence testID="tonight-missing-impact" title="缺失影响" body="天气与天文仍可形成窗口；路线不新鲜会降低可信度，且不能据此承诺实时可达。" />
    <Evidence testID="tonight-route-fallback" title="路线降级" body="显示缓存路线及时间，不把直线距离描述为驾车路线；临行必须在导航服务复核。" meta={`路线来源 ${report.parts.route.sourceVersion ?? "缺失"} · ${report.parts.route.sourceTime ?? "无时间"}`} />
  </View>;
}

function TargetPanel({ report, selectedId, onSelect }: { report: NightReport; selectedId: string; onSelect: (id: string) => void }) {
  const target = report.targets.find((item) => item.id === selectedId) ?? report.targets[0];
  return <View style={styles.panel}>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.targetTabs}>{report.targets.map((item) => <Pressable key={item.id} accessibilityRole="button" onPress={() => onSelect(item.id)} style={[styles.action, item.id === target?.id && styles.actionActive]}><Text style={styles.actionText}>{item.name} · {item.visible ? "可见" : "待确认"}</Text></Pressable>)}</ScrollView>
    <Evidence testID="target-visible-window" title={`${target?.name ?? "目标"} · ${target?.visible ? "可见" : "不可见"}`} body={target?.window ? `${utcTime(target.window.start)}–${utcTime(target.window.end)}` : "本夜无可见窗口"} meta={target?.impact} />
    <Evidence testID="target-altitude-azimuth" title="最高位置" body={target?.peak ? `高度 ${target.peak.altitudeDeg}° · 方位 ${target.peak.azimuthDeg}° · ${utcTime(target.peak.at)}` : "无峰值位置"} />
    <Evidence testID="target-next-action" title="下一步" body="查看天空遮挡轨迹、视场与所选地点方向；加入计划后共同保存位置和时刻版本。" />
  </View>;
}

export function TonightScreen() {
  const location = useShellStore((state) => state.location);
  const profiles = useShellStore((state) => state.profiles);
  const activeProfileId = useShellStore((state) => state.activeProfileId);
  const activeProfile = profiles.find((profile) => profile.id === activeProfileId);
  const latitude = location.latitude ?? 22.529;
  const longitude = location.longitude ?? 113.9468;
  const reportProfile: NightReportRequest["profile"] = activeProfile?.observerTypes.includes("family") ? "family"
    : activeProfile?.observerTypes.includes("beginner") ? "beginner"
      : activeProfile?.observerTypes.includes("astrophotographer") || activeProfile?.targets.includes("milky-way") ? "milky-way"
        : activeProfile?.observerTypes.includes("visual-observer") ? "visual"
          : activeProfile?.observerTypes.includes("camping") ? "camping" : "neutral";
  const maxTravelMinutes = activeProfile?.travel.maxOneWayMinutes ?? 120;
  const [mode, setMode] = useState<ViewMode>("decision");
  const [conditionsExpanded, setConditionsExpanded] = useState(false);
  const [selectedTargetId, setSelectedTargetId] = useState("milky-way-core");
  const [dateMode, setDateMode] = useState<"tonight" | "tomorrow" | "custom">("tonight");
  const [customDate, setCustomDate] = useState(localDate("Asia/Shanghai"));
  const nightDate = dateMode === "tonight" ? localDate("Asia/Shanghai") : dateMode === "tomorrow" ? localDate("Asia/Shanghai", 1) : customDate;
  const dateValid = /^\d{4}-\d{2}-\d{2}$/u.test(nightDate) && Number.isFinite(Date.parse(`${nightDate}T12:00:00Z`));
  const effectiveLabel = location.latitude === undefined || location.longitude === undefined ? "深圳市 · 南山区（POC 地区默认；未使用文本地点定位）" : location.label;
  const context = createTonightContext({ timezone: "Asia/Shanghai", target: "milky-way-core" });
  const query = useQuery({
    queryKey: ["night-report", latitude, longitude, reportProfile, maxTravelMinutes, nightDate, context.target],
    queryFn: ({ signal }) => client.create(requestForCurrentContext({ latitude, longitude, label: effectiveLabel, profile: reportProfile, maxTravelMinutes, nightDate }), signal),
    enabled: dateValid,
    retry: 1,
  });
  const load = (next: ViewMode) => { setMode(next); if (!query.data || query.isError) void query.refetch(); };
  return <SafeAreaView testID="screen-tonight-decision" style={styles.screen}>
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.eyebrow}>今晚决策 · {context.timezone}</Text><Text style={styles.title}>值得出发吗？</Text>
      <Text testID="tonight-context" style={styles.context}>{effectiveLabel} · {latitude.toFixed(4)}, {longitude.toFixed(4)} · {nightDate} · {reportProfile} · {location.source === "device" ? "设备位置" : "地区默认/手动上下文"}</Text>
      <View style={styles.actions}>
        <Pressable testID="tonight-date-tonight" accessibilityRole="button" onPress={() => setDateMode("tonight")} style={[styles.action, dateMode === "tonight" && styles.actionActive]}><Text style={styles.actionText}>今晚</Text></Pressable>
        <Pressable testID="tonight-date-tomorrow" accessibilityRole="button" onPress={() => setDateMode("tomorrow")} style={[styles.action, dateMode === "tomorrow" && styles.actionActive]}><Text style={styles.actionText}>明晚</Text></Pressable>
        <Pressable testID="tonight-date-custom" accessibilityRole="button" onPress={() => setDateMode("custom")} style={[styles.action, dateMode === "custom" && styles.actionActive]}><Text style={styles.actionText}>自定义日期</Text></Pressable>
      </View>
      {dateMode === "custom" ? <TextInput testID="tonight-custom-date" accessibilityLabel="自定义观星夜日期" value={customDate} onChangeText={setCustomDate} placeholder="YYYY-MM-DD" style={styles.input} /> : null}
      {!dateValid ? <Text style={styles.warningText}>请输入有效的 YYYY-MM-DD 日期；旧报告不会被无效输入覆盖。</Text> : null}
      <Text style={styles.subtitle}>结论、连续窗口、主备地点和行动共享同一版本快照；缺失路线、过期来源与安全阻断不会被总分隐藏。</Text>
      <View style={styles.actions}>
        <Pressable testID="tonight-refresh" accessibilityRole="button" onPress={() => { setMode("decision"); void query.refetch(); }} style={styles.action}><Text style={styles.actionText}>刷新夜报</Text></Pressable>
        <Pressable testID="tonight-select-primary" accessibilityRole="button" onPress={() => load("spots")} style={styles.action}><Text style={styles.actionText}>主备地点</Text></Pressable>
        <Pressable testID="tonight-select-target" accessibilityRole="button" onPress={() => load("target")} style={styles.action}><Text style={styles.actionText}>可见目标</Text></Pressable>
      </View>
      {query.isFetching && !query.data ? <View style={styles.state}><Text style={styles.stateTitle}>正在生成版本化夜报…</Text><Text style={styles.stateBody}>天气、天文、地点和路线分别加载；部分失败不会被合并成假成功。</Text></View> : null}
      {query.isError ? <View style={styles.state}><Text style={styles.stateTitle}>夜报暂不可用</Text><Text style={styles.stateBody}>{query.error instanceof Error && query.error.message === "night_report_api_base_url_missing" ? "尚未配置 EXPO_PUBLIC_API_BASE_URL。可返回首页设置位置，或配置后端环境后重试。" : "请求失败；保留当前上下文，可安全重试。"}</Text><Pressable accessibilityRole="button" onPress={() => query.refetch()} style={styles.retry}><Text style={styles.retryText}>重试</Text></Pressable></View> : null}
      {query.data && mode === "decision" ? <DecisionPanel report={query.data} /> : null}
      {query.data && mode === "decision" ? <ConditionsPanel report={query.data} expanded={conditionsExpanded} onToggle={() => setConditionsExpanded((value) => !value)} /> : null}
      {query.data && mode === "spots" ? <SpotsPanel report={query.data} /> : null}
      {query.data && mode === "target" ? <TargetPanel report={query.data} selectedId={selectedTargetId} onSelect={setSelectedTargetId} /> : null}
      {query.data && query.data.status !== "ready" ? <PartialPanel report={query.data} /> : null}
      {!query.data && !query.isFetching && !query.isError ? <View style={styles.state}><Text style={styles.stateTitle}>准备生成今晚报告</Text><Text style={styles.stateBody}>位置：{effectiveLabel}。报告由聚合 API 生成，不在客户端拼接供应商数据。</Text></View> : null}
    </ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.canvas }, content: { padding: spacing.x2, paddingBottom: 48, gap: spacing.x2 }, eyebrow: { color: palette.primaryActive, fontSize: typeToken.label, fontWeight: "700" }, title: { color: palette.text, fontSize: typeToken.title, fontWeight: "700" }, subtitle: { color: palette.textSecondary, fontSize: typeToken.body, lineHeight: 23 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.x1 }, action: { minHeight: minimumTouchTarget, justifyContent: "center", paddingHorizontal: 14, borderWidth: 1, borderColor: palette.border, borderRadius: radii.pill, backgroundColor: palette.surface }, actionText: { color: palette.text, fontSize: typeToken.label, fontWeight: "700" },
  context: { color: palette.textSecondary, fontSize: typeToken.caption, lineHeight: 18 }, input: { minHeight: minimumTouchTarget, paddingHorizontal: 12, borderWidth: 1, borderColor: palette.border, borderRadius: radii.control, color: palette.text, backgroundColor: palette.surface }, panel: { gap: spacing.x1, padding: spacing.x2, borderWidth: 1, borderColor: palette.border, borderRadius: radii.layer, backgroundColor: palette.surface }, panelTitle: { color: palette.text, fontSize: typeToken.section, fontWeight: "700" }, targetTabs: { gap: spacing.x1 }, actionActive: { borderColor: palette.primaryActive, backgroundColor: palette.surfaceMuted }, evidence: { minHeight: 86, padding: 12, borderRadius: radii.control, backgroundColor: palette.surfaceMuted }, evidenceTitle: { color: palette.text, fontSize: typeToken.body, fontWeight: "700" }, evidenceBody: { marginTop: 5, color: palette.text, fontSize: typeToken.label, lineHeight: 19 }, evidenceMeta: { marginTop: 5, color: palette.textSecondary, fontSize: typeToken.caption, lineHeight: 17 },
  state: { minHeight: 180, justifyContent: "center", padding: spacing.x2, borderWidth: 1, borderColor: palette.border, borderRadius: radii.layer, backgroundColor: palette.surface }, stateTitle: { color: palette.text, fontSize: typeToken.section, fontWeight: "700" }, stateBody: { marginTop: spacing.x1, color: palette.textSecondary, lineHeight: 21 }, warningText: { color: palette.textSecondary, fontSize: typeToken.caption, lineHeight: 18 }, retry: { minHeight: minimumTouchTarget, marginTop: spacing.x2, alignItems: "center", justifyContent: "center", borderRadius: radii.control, backgroundColor: palette.primaryActive }, retryText: { color: palette.onPrimary, fontWeight: "700" },
});
