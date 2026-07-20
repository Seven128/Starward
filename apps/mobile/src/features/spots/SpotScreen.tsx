import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { SpotTrustDetail } from "@starward/contracts/spot";
import { colors, minimumTouchTarget, radii, spacing, type as typeToken } from "@starward/ui-system/tokens";
import { createSpotClient } from "../../data/spot-client";
import { presentSpotFact, safetyOverridesRecommendation } from "./index";

const palette = colors.planning;
const client = createSpotClient();
type ViewKey = "decision" | "light" | "media" | "access" | "safety" | "coordinate" | "reviews";
const actions: Array<{ key: ViewKey; id: string; label: string }> = [
  { key: "decision", id: "spot-open-detail", label: "决策摘要" }, { key: "light", id: "spot-open-light-details", label: "暗度与遮挡" },
  { key: "media", id: "spot-open-media", label: "媒体" }, { key: "access", id: "spot-open-access", label: "到达设施" },
  { key: "safety", id: "spot-open-safety", label: "安全" }, { key: "coordinate", id: "spot-share-coordinate", label: "坐标策略" },
  { key: "reviews", id: "spot-open-reviews", label: "评价可信度" },
];

function Evidence({ testID, title, body, meta }: { testID: string; title: string; body: string; meta?: string }) {
  return <View testID={testID} style={styles.evidence}><Text style={styles.evidenceTitle}>{title}</Text><Text style={styles.evidenceBody}>{body}</Text>{meta ? <Text style={styles.evidenceMeta}>{meta}</Text> : null}</View>;
}

function fact(detail: SpotTrustDetail | undefined, key: string) { return detail?.facts.find((item) => item.key === key); }
function factText(detail: SpotTrustDetail | undefined, key: string) {
  const item = fact(detail, key);
  return item ? presentSpotFact(item).label : "正在核对";
}
function sourceText(detail: SpotTrustDetail | undefined, key: string) {
  return fact(detail, key)?.sources.map((source) => `${source.sourceLabel}@${source.version} · ${source.observedAt}`).join("；") || "没有可验证来源";
}

export function SpotScreen() {
  const [active, setActive] = useState<ViewKey>("decision");
  const query = useQuery({ queryKey: ["spot-detail", "current"], queryFn: ({ signal }) => client.get("current", signal) });
  const detail = query.data;
  const safetyConservative = detail?.facts.some((item) => item.safetyConservative) ?? true;
  const recommendation = safetyOverridesRecommendation({ status: detail?.status ?? "caution", safetyConservative, score: null });
  const navigateAction = detail?.actions.find((item) => item.action === "navigate");
  return <SafeAreaView testID="screen-spot-detail-and-trust" style={styles.screen}><ScrollView contentContainerStyle={styles.content}>
    <Text style={styles.eyebrow}>地点证据 · {detail?.updatedAt ?? "正在同步"}</Text><Text style={styles.title}>{detail?.name ?? "正在加载地点身份…"}</Text>
    <Text style={styles.subtitle}>静态身份与动态证据分开呈现；未知、冲突、临时不可用和安全阻断不会被总分或漂亮卡片覆盖。</Text>
    {query.isError ? <View style={styles.error}><Text style={styles.errorTitle}>地点证据暂不可用</Text><Text style={styles.errorBody}>保留页面上下文，不展示旧评分或合成事实。</Text><Pressable onPress={() => query.refetch()} style={styles.retry}><Text style={styles.retryText}>重试</Text></Pressable></View> : null}
    <View style={styles.actions}>{actions.map((action) => <Pressable key={action.key} testID={action.id} accessibilityRole="button" onPress={() => setActive(action.key)} style={[styles.action, active === action.key && styles.actionActive]}><Text style={styles.actionText}>{action.label}</Text></Pressable>)}</View>
    {active === "decision" ? <View style={styles.panel}><Evidence testID="spot-decision-summary" title={recommendation.blocked ? "谨慎 · 资料不足或存在阻断" : "适合继续评估"} body={detail?.statusReason ?? "今晚动态报告尚未生成；不会把历史条件当成当前结论。"} /><Evidence testID="spot-observation-window" title="观测窗口正在刷新" body="地点身份先显示；天气和天文窗口需由同一日期/位置版本生成。" /><Evidence testID="spot-primary-action" title={navigateAction?.allowed ? "可加入计划并核对导航" : "先完成核验，导航暂不可用"} body={navigateAction?.reason ?? "行动权限按坐标与风险策略计算。"} /></View> : null}
    {active === "light" ? <View style={styles.panel}><Evidence testID="spot-light-estimate" title={`卫星夜光辐射：${factText(detail, "light_radiance")}`} body="没有区域校准时不显示 Bortle 或银河可见保证。" /><Evidence testID="spot-horizon-profile" title={`地平线轮廓：${factText(detail, "horizon_profile")}`} body="地形、人工遮挡和全景证据缺失时不合成虚假轮廓。" /><Evidence testID="spot-light-provenance" title="来源与估算边界" body={`${sourceText(detail, "light_radiance")}；当前为估算/缺失边界。`} /></View> : null}
    {active === "media" ? <View style={styles.panel}><Evidence testID="spot-media-capture-time" title="真实缺图 · 拍摄时间未知" body="没有审核媒体时保留空状态，不用装饰图冒充现场实景。" /><Evidence testID="spot-media-source" title="媒体来源：暂无" body={sourceText(detail, "media")} /><Evidence testID="spot-media-moderation" title="审核与隐私管线" body="公开前必须清理 EXIF 位置并保留受保护原图、方向、时间、设备与审核记录。" /></View> : null}
    {active === "access" ? <View style={styles.panel}><Evidence testID="spot-parking" title={`停车：${factText(detail, "parking")}`} body={sourceText(detail, "parking")} /><Evidence testID="spot-last-mile" title={`最后一段步行：${factText(detail, "last_mile")}`} body="未知不等于没有；坡度、照明、搬运距离和返回路线需单独核验。" /><Evidence testID="spot-facilities" title={`厕所：${factText(detail, "toilet")}`} body="POI 标签不能证明夜间开放、收费、容量、水电或应急条件。" /></View> : null}
    {active === "safety" ? <View style={styles.panel}><Evidence testID="spot-safety-block" title="安全风险未核验 · 导航阻断" body={detail?.statusReason ?? "正在核对开放、封路、潮汐、山路和治安风险。"} /><Evidence testID="spot-score-suppressed" title="总分已抑制" body="安全缺口不会被暗度、天气或个人偏好抵消。" /><Evidence testID="spot-safe-alternative" title="选择已核验备选" body="返回地图筛选管理员核验且路线可用的地点；本候选仍可作为待核验资料。" /></View> : null}
    {active === "coordinate" ? <View style={styles.panel}><Evidence testID="spot-authoritative-coordinate" title={`权威坐标 WGS84 · ${detail?.coordinate.level ?? "待加载"}`} body={detail?.coordinate.coordinate ? `${detail.coordinate.coordinate.lat.toFixed(2)}, ${detail.coordinate.coordinate.lon.toFixed(2)}` : "坐标已隐藏"} /><Evidence testID="spot-map-coordinate-label" title="WGS84 权威 / GCJ-02 仅地图展示" body="转换结果不得回写天气、天文、PostGIS 或分享真值。" /><Evidence testID="spot-share-coordinate-policy" title="分享、导航、离线和行程同一策略" body={detail?.coordinate.exact ? "当前角色可读取精确点。" : `${detail?.coordinate.reason ?? "仅公开近似区域"}；深链、文件和遥测不含精确坐标。`} /></View> : null}
    {active === "reviews" ? <View style={styles.panel}><Evidence testID="spot-review-dimensions" title="多维评价暂无合格样本" body="暗度、开阔、云量、交通、设施、安全、拥挤、信号和摄影/目视适配将分别统计。" /><Evidence testID="spot-review-trust" title={`可信来源 ${detail?.trust.verifiedSources ?? 0} · 需现场核验`} body="贡献者等级、样本、时间和审核状态逐项展示，不压成单一星级。" /><Evidence testID="spot-review-moderation" title={`冲突：${detail?.trust.conflicts.join("、") || "暂无已识别冲突"}`} body="普通贡献不能覆盖官方或管理员安全阻断；可提交纠错并查看审核状态。" /></View> : null}
  </ScrollView></SafeAreaView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.canvas }, content: { padding: spacing.x2, paddingBottom: 48, gap: spacing.x2 }, eyebrow: { color: palette.primaryActive, fontSize: typeToken.label, fontWeight: "700" }, title: { color: palette.text, fontSize: typeToken.title, fontWeight: "700" }, subtitle: { color: palette.textSecondary, fontSize: typeToken.body, lineHeight: 23 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.x1 }, action: { minHeight: minimumTouchTarget, justifyContent: "center", paddingHorizontal: 12, borderWidth: 1, borderColor: palette.border, borderRadius: radii.pill, backgroundColor: palette.surface }, actionActive: { borderColor: palette.primaryActive }, actionText: { color: palette.text, fontSize: typeToken.caption, fontWeight: "700" },
  panel: { gap: spacing.x1, padding: spacing.x2, borderWidth: 1, borderColor: palette.border, borderRadius: radii.layer, backgroundColor: palette.surface }, evidence: { minHeight: 88, padding: 12, borderRadius: radii.control, backgroundColor: palette.surfaceMuted }, evidenceTitle: { color: palette.text, fontSize: typeToken.body, fontWeight: "700" }, evidenceBody: { marginTop: 5, color: palette.text, fontSize: typeToken.label, lineHeight: 19 }, evidenceMeta: { marginTop: 5, color: palette.textSecondary, fontSize: typeToken.caption, lineHeight: 17 },
  error: { padding: spacing.x2, borderRadius: radii.layer, backgroundColor: palette.surface }, errorTitle: { color: palette.danger, fontWeight: "700" }, errorBody: { marginTop: spacing.x1, color: palette.textSecondary }, retry: { minHeight: minimumTouchTarget, marginTop: spacing.x1, alignItems: "center", justifyContent: "center", borderRadius: radii.control, backgroundColor: palette.primaryActive }, retryText: { color: palette.onPrimary, fontWeight: "700" },
});
