import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NightReport, NightReportRequest } from "@starward/contracts/night-report";
import { colors, minimumTouchTarget, radii, spacing, type as typeToken } from "@starward/ui-system/tokens";
import { createNightReportClient } from "../../data/night-report-client";
import { tonightAcceptanceFixture } from "./acceptance-fixtures";
import { createTonightContext } from "./index";

type ViewMode = "decision" | "spots" | "target" | "partial";
const palette = colors.planning;
const client = createNightReportClient();

function requestForCurrentContext(): NightReportRequest {
  const location = { lat: 22.529, lon: 113.9468, system: "WGS84" as const, label: "深圳市 · 南山区" };
  return { requestId: `night-${Date.now()}`, location, timezone: "Asia/Shanghai", nightDate: new Date().toISOString().slice(0, 10), profile: "milky-way", target: "milky-way-core", route: { origin: location, maxTravelMinutes: 120, modes: ["drive"] } };
}

function Evidence({ testID, title, body, meta }: { testID: string; title: string; body: string; meta?: string }) {
  return <View testID={testID} style={styles.evidence}><Text style={styles.evidenceTitle}>{title}</Text><Text style={styles.evidenceBody}>{body}</Text>{meta ? <Text style={styles.evidenceMeta}>{meta}</Text> : null}</View>;
}

function utcTime(value?: string | null) { return value ? value.slice(11, 16) : "--:--"; }

function DecisionPanel({ report }: { report: NightReport }) {
  return <View style={styles.panel}>
    <Evidence testID="tonight-decision-summary" title={`${report.decision.score ?? "—"} · ${report.decision.summary}`} body={`可信度 ${Math.round(report.decision.confidence * 100)}% · ${report.decision.reasons.join("；") || "关键原因不足"}`} meta={report.decision.blockers.join("；") || "安全与可达性阻断独立于综合分数"} />
    <Evidence testID="tonight-observation-window" title="最佳观测窗口" body={report.observationWindow ? `${utcTime(report.observationWindow.start)}–${utcTime(report.observationWindow.end)} · ${report.observationWindow.durationMinutes} 分钟` : "未找到连续观测窗口"} meta={`时区 ${report.context.timezone} · 观星夜 ${report.context.nightDate}`} />
    <Evidence testID="tonight-data-provenance" title="来源与有效性" body={`生成 ${report.generatedAt} · 有效至 ${report.expiresAt}`} meta={report.provenance.map((item) => `${item.source}@${item.version}`).join(" · ")} />
  </View>;
}

function SpotsPanel({ report }: { report: NightReport }) {
  return <View style={styles.panel}>
    <Evidence testID="tonight-primary-spot" title={`主地点 · ${report.primarySpot?.name ?? "未选出"}`} body={report.primarySpot ? `${report.primarySpot.distanceKm ?? "—"} km · ${report.primarySpot.travelMinutes ?? "—"} 分钟 · ${report.primarySpot.score} 分` : "候选均被阻断或数据不足"} meta={report.primarySpot?.risks.join("；")} />
    <Evidence testID="tonight-backup-spots" title="备选地点" body={report.backupSpots.length ? report.backupSpots.map((spot) => `${spot.name}（${spot.score}）`).join(" · ") : "暂无备选"} meta="近距离、天气和更暗备选保留不同角色" />
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

function TargetPanel({ report }: { report: NightReport }) {
  const target = report.targets[0];
  return <View style={styles.panel}>
    <Evidence testID="target-visible-window" title={`${target?.name ?? "目标"} · ${target?.visible ? "可见" : "不可见"}`} body={target?.window ? `${utcTime(target.window.start)}–${utcTime(target.window.end)}` : "本夜无可见窗口"} meta={target?.impact} />
    <Evidence testID="target-altitude-azimuth" title="最高位置" body={target?.peak ? `高度 ${target.peak.altitudeDeg}° · 方位 ${target.peak.azimuthDeg}° · ${utcTime(target.peak.at)}` : "无峰值位置"} />
    <Evidence testID="target-next-action" title="下一步" body="查看天空遮挡轨迹、视场与所选地点方向；加入计划后共同保存位置和时刻版本。" />
  </View>;
}

export function TonightScreen({ fixture }: { fixture?: string }) {
  const fixtureCase = fixture?.split(":")[1];
  const fixtureReport = useMemo(() => fixture ? tonightAcceptanceFixture(fixtureCase === "partial-provider-failure") : null, [fixture, fixtureCase]);
  const [mode, setMode] = useState<ViewMode>(fixtureCase === "partial-provider-failure" ? "partial" : "decision");
  const context = createTonightContext({ timezone: "Asia/Shanghai", target: "milky-way-core" });
  const query = useQuery({ queryKey: ["night-report", fixtureReport?.id ?? context.target], queryFn: ({ signal }) => fixtureReport ? Promise.resolve(fixtureReport) : client.create(requestForCurrentContext(), signal), enabled: Boolean(fixtureReport), retry: 1 });
  const load = async (next: ViewMode) => { setMode(next); if (!query.data) await query.refetch(); };
  return <SafeAreaView testID="screen-tonight-decision" style={styles.screen}>
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.eyebrow}>今晚决策 · {context.timezone}</Text><Text style={styles.title}>值得出发吗？</Text>
      <Text style={styles.subtitle}>结论、连续窗口、主备地点和行动共享同一版本快照；缺失路线、过期来源与安全阻断不会被总分隐藏。</Text>
      <View style={styles.actions}>
        <Pressable testID="tonight-refresh" accessibilityRole="button" onPress={() => load(fixtureCase === "partial-provider-failure" ? "partial" : "decision")} style={styles.action}><Text style={styles.actionText}>刷新夜报</Text></Pressable>
        <Pressable testID="tonight-select-primary" accessibilityRole="button" onPress={() => load("spots")} style={styles.action}><Text style={styles.actionText}>主备地点</Text></Pressable>
        <Pressable testID="tonight-select-target" accessibilityRole="button" onPress={() => load("target")} style={styles.action}><Text style={styles.actionText}>可见目标</Text></Pressable>
      </View>
      {query.isFetching && !query.data ? <View style={styles.state}><Text style={styles.stateTitle}>正在生成版本化夜报…</Text><Text style={styles.stateBody}>天气、天文、地点和路线分别加载；部分失败不会被合并成假成功。</Text></View> : null}
      {query.isError ? <View style={styles.state}><Text style={styles.stateTitle}>夜报暂不可用</Text><Text style={styles.stateBody}>{query.error instanceof Error && query.error.message === "night_report_api_base_url_missing" ? "尚未配置 EXPO_PUBLIC_API_BASE_URL。可返回首页设置位置，或配置后端环境后重试。" : "请求失败；保留当前上下文，可安全重试。"}</Text><Pressable accessibilityRole="button" onPress={() => query.refetch()} style={styles.retry}><Text style={styles.retryText}>重试</Text></Pressable></View> : null}
      {query.data && mode === "decision" ? <DecisionPanel report={query.data} /> : null}
      {query.data && mode === "spots" ? <SpotsPanel report={query.data} /> : null}
      {query.data && mode === "partial" ? <PartialPanel report={query.data} /> : null}
      {query.data && mode === "target" ? <TargetPanel report={query.data} /> : null}
      {!query.data && !query.isFetching && !query.isError ? <View style={styles.state}><Text style={styles.stateTitle}>准备生成今晚报告</Text><Text style={styles.stateBody}>位置：深圳市 · 南山区。点击刷新后由聚合 API 生成，不在客户端拼接供应商数据。</Text></View> : null}
    </ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.canvas }, content: { padding: spacing.x2, paddingBottom: 48, gap: spacing.x2 }, eyebrow: { color: palette.primaryActive, fontSize: typeToken.label, fontWeight: "700" }, title: { color: palette.text, fontSize: typeToken.title, fontWeight: "700" }, subtitle: { color: palette.textSecondary, fontSize: typeToken.body, lineHeight: 23 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.x1 }, action: { minHeight: minimumTouchTarget, justifyContent: "center", paddingHorizontal: 14, borderWidth: 1, borderColor: palette.border, borderRadius: radii.pill, backgroundColor: palette.surface }, actionText: { color: palette.text, fontSize: typeToken.label, fontWeight: "700" },
  panel: { gap: spacing.x1, padding: spacing.x2, borderWidth: 1, borderColor: palette.border, borderRadius: radii.layer, backgroundColor: palette.surface }, evidence: { minHeight: 86, padding: 12, borderRadius: radii.control, backgroundColor: palette.surfaceMuted }, evidenceTitle: { color: palette.text, fontSize: typeToken.body, fontWeight: "700" }, evidenceBody: { marginTop: 5, color: palette.text, fontSize: typeToken.label, lineHeight: 19 }, evidenceMeta: { marginTop: 5, color: palette.textSecondary, fontSize: typeToken.caption, lineHeight: 17 },
  state: { minHeight: 180, justifyContent: "center", padding: spacing.x2, borderWidth: 1, borderColor: palette.border, borderRadius: radii.layer, backgroundColor: palette.surface }, stateTitle: { color: palette.text, fontSize: typeToken.section, fontWeight: "700" }, stateBody: { marginTop: spacing.x1, color: palette.textSecondary, lineHeight: 21 }, retry: { minHeight: minimumTouchTarget, marginTop: spacing.x2, alignItems: "center", justifyContent: "center", borderRadius: radii.control, backgroundColor: palette.primaryActive }, retryText: { color: palette.onPrimary, fontWeight: "700" },
});
