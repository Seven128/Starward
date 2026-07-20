import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { buildLocationShare, startSafetySession, stopSafetySession, switchOfflineBackup, validateObservationPack } from "@starward/domain/offline";
import { colors, minimumTouchTarget, radii, spacing, type as typeToken } from "@starward/ui-system/tokens";

type CaseKey = "pack-integrity" | "red-mode-accessible" | "parking-and-backup-offline" | "bounded-safety-session" | "explicit-location-share" | "offline-write-replay" | "offline-field-use";
type EvidenceItem = [string, string, string, string?];
const p = colors.planning;
const actions: Array<[CaseKey, string, string]> = [
  ["pack-integrity", "field-verify-pack", "离线包"], ["red-mode-accessible", "field-toggle-red-mode", "红光"],
  ["parking-and-backup-offline", "field-open-offline-route", "停车/备选"], ["bounded-safety-session", "field-start-session", "安全会话"],
  ["explicit-location-share", "field-share-location", "分享位置"], ["offline-write-replay", "field-save-report", "同步队列"],
  ["offline-field-use", "field-enter-airplane-mode", "完全离线"],
];

function Evidence({ item, red }: { item: EvidenceItem; red: boolean }) {
  return <View testID={item[0]} style={[s.evidence, red && s.redCard]}><Text style={[s.evidenceTitle, red && s.redText]}>{item[1]}</Text><Text style={[s.evidenceBody, red && s.redMuted]}>{item[2]}</Text>{item[3] ? <Text style={[s.meta, red && s.redMuted]}>{item[3]}</Text> : null}</View>;
}

function buildEvidence(key: CaseKey): EvidenceItem[] {
  if (key === "pack-integrity") {
    const pack = validateObservationPack({ id: "xichong-night-7", revision: 7, components: [
      { id: "manifest", kind: "manifest", version: "7", bytes: 8_192, sha256: "a7", observedSha256: "a7", required: true, licenseAllowsOffline: true },
      { id: "route", kind: "route", version: "route-18", bytes: 2_400_000, sha256: "r18", observedSha256: "r18", required: true, coordinateGrant: "exact-device-encrypted", licenseAllowsOffline: true },
      { id: "weather", kind: "weather", version: "run-42", bytes: 240_000, sha256: "w42", observedSha256: "w42", required: true, expiresAt: "2026-07-21T03:00:00+08:00", licenseAllowsOffline: true },
    ] }, { now: "2026-07-20T23:20:00+08:00", availableBytes: 12 * 1024 ** 3, globalUsedBytes: 310 * 1024 ** 2 });
    return [["offline-pack-version", "观测包 revision 7 · 2.5 MB", "manifest、授权坐标、路线、天气/天文、拍摄、清单和联系人逐组件版本化", "默认仅 Wi‑Fi；500 MB 提醒，单包 2 GB / 全局 4 GB 上限"], ["offline-pack-checksum", "3/3 必需组件哈希一致", `保留空间 ${Math.round(pack.reserveBytes / 1024 ** 3)} GB · 临时区校验后原子激活 · 上一版可回滚`, "未获离线许可的底图不会抓取"], ["offline-pack-validity", pack.canActivate ? "校验通过 · 可离线" : "需要更新 · 不可激活", "天气有效至 03:00；过期后仍可读但标 stale，安全/预警不冒充实时", "受限坐标与联系人使用设备密钥；撤权或登出触发清理"]];
  }
  if (key === "red-mode-accessible") return [["field-red-mode-state", "红光模式 · 应用内已启用", "降低发光面积和动效；主题原子切换，不出现白帧", "系统键盘、媒体和外部地图可能无法完全变红"], ["field-primary-action", "▣ 主操作：返回停车点", "44 px 以上触控区；文本与图形共同表达，不只依赖红色"], ["field-status-label", "⚠ 风险 · 路线缓存已 38 分钟", "危险、选中和禁用状态带图标/文字；支持文本放大与 reduced motion"]];
  if (key === "parking-and-backup-offline") {
    const switched = switchOfflineBackup("西涌主点 · plan rev 7", "东涌备选 · route snapshot 12");
    return [["field-parking-point", "停车点 · 西北 286° · 1.2 km", "WGS84 已确认 · 精度 ±9 m · 23:06 缓存", "定位不可用时回退静态关系，不显示虚假实时箭头"], ["field-walking-segment", "最后步行 820 m · 约 14 分钟", "缓存路线 snapshot 18；直线方向与步行几何明确区分"], ["field-backup-spot", "备选已确认 · 东涌窗口 00:55–02:10", `${switched.atomic ? "主备原子切换" : "待切换"}；保留原计划和撤回点`, "路线、风险和缓存新鲜度已在切换前比较"]];
  }
  if (key === "bounded-safety-session") {
    const active = startSafetySession({ now: "2026-07-20T23:20:00+08:00", plannedEndAt: "2026-07-21T02:50:00+08:00", requestedHours: 4, backgroundPermission: true });
    const stopped = stopSafetySession(active);
    return [["field-session-window", "安全时段 · 预计结束 02:50 · 自动停止 03:20", "逐次授权限时后台位置；最长 12 小时，状态持续可见", "不是救援服务，也不保证联系人必达"], ["field-checkin-control", "本地签到提醒 02:40 / 03:05", "后台平衡精度约 5 分钟或 250 m；低电/系统限制会降频并提示"], ["field-overdue-action", `结束证明 · 定位采样 ${stopped.sampling}`, "主动结束或超时会停止后台定位和计划任务；权限拒绝只运行前台计时", "外发必须用户主动选择通道"]];
  }
  if (key === "explicit-location-share") {
    const payload = buildLocationShare({ latitude: 22.529, longitude: 113.9468, accuracyM: 9, capturedAt: "23:24", access: "invite_only", recipient: "系统分享面板：家人", expiresAt: "03:24" });
    return [["share-location-scope", "仅本次 · 指定接收者 · 精确位置", `${payload.latitude}, ${payload.longitude} · ±${payload.accuracyM} m · 23:24`, "受限坐标不会进入公开地点页或分析事件"], ["share-location-expiry", "有效至 03:24", "发送前预览接收者、精度、时间与行程摘要；当前尚未发送"], ["share-location-revoke", "可撤销链接 · 不自动重发", "系统只返回已发起/失败/未知；没有 receipt 不显示已送达"]];
  }
  if (key === "offline-write-replay") return [["offline-write-state", "已保存在本机 · 4 项待同步", "实况 → 图片 1/2 → 清单 revision 7，原始草稿均保留", "状态：排队 / 上传 / 待审核 / 已发布 / 冲突 / 失败"], ["offline-replay-key", "幂等键 report-7-23:31", "网络恢复后按依赖续传；已确认键跳过，不重复发布"], ["offline-conflict-action", "清单存在冲突 · 选择合并或保留版本", "第一次上传中断不删除本地图片；其他队列项继续"]];
  return [["field-offline-banner", "完全离线 · 包校验通过", "地点、时间、定位精度、缓存时间和安全会话状态持续可见", "天气/预警/路况不可更新，不伪装实时"], ["field-cached-plan", "西涌主点 · 最佳窗口 00:35–02:20", "路线 23:06 · 天文规则 v3 · 天气 22:50 · 返程建议 02:35"], ["field-offline-toolbox", "离线可用：地图 · 停车 · 天空方向 · 拍摄 · 清单 · 实况 · 备选", "联网专属动作已禁用并提供本地替代；页面不会退化为空壳"]];
}

export function FieldScreen({ fixture }: { fixture?: string }) {
  const recommended = fixture?.split(":")[1] as CaseKey | undefined;
  const [active, setActive] = useState<CaseKey | null>(null);
  const red = active === "red-mode-accessible";
  const evidence = useMemo(() => active ? buildEvidence(active) : [], [active]);
  return <SafeAreaView testID="screen-field-offline-safety" style={[s.screen, red && s.redScreen]}><ScrollView contentContainerStyle={s.content}>
    <View style={s.context}><View><Text style={[s.eyebrow, red && s.redAccent]}>现场模式 · 西涌主点</Text><Text style={[s.title, red && s.redText]}>断网也能找到方向和退路</Text></View><Text style={[s.status, red && s.redPill]}>离线包 ✓</Text></View>
    <Text style={[s.subtitle, red && s.redMuted]}>00:35–02:20 最佳窗口 · 云量缓存 12% · 停车点 1.2 km · 建议 02:35 返程</Text>
    <View style={s.actions}>{actions.map(([key, id, label]) => <Pressable key={key} testID={id} accessibilityRole="button" onPress={() => setActive(key)} style={({ pressed }) => [s.action, red && s.redAction, recommended === key && s.recommended, pressed && s.pressed]}><Text style={[s.actionText, red && s.redText]}>{label}</Text></Pressable>)}</View>
    {active ? <View style={[s.panel, red && s.redPanel]}>{evidence.map((item) => <Evidence key={item[0]} item={item} red={red} />)}</View> : <View style={[s.empty, red && s.redPanel]}><Text style={[s.emptyTitle, red && s.redText]}>先校验离线包，再进入现场</Text><Text style={[s.emptyBody, red && s.redMuted]}>本地包立即呈现；联网更新只替换带来源、生成时间和有效期的字段。安全会话默认关闭。</Text></View>}
  </ScrollView></SafeAreaView>;
}

const s = StyleSheet.create({ screen: { flex: 1, backgroundColor: p.canvas }, redScreen: { backgroundColor: "#090000" }, content: { padding: spacing.x2, paddingBottom: 48, gap: spacing.x2 }, context: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: spacing.x1 }, eyebrow: { color: p.primaryActive, fontSize: typeToken.label, fontWeight: "700" }, redAccent: { color: "#FF5B52" }, title: { marginTop: 5, color: p.text, fontSize: typeToken.title, fontWeight: "700" }, subtitle: { color: p.textSecondary, fontSize: typeToken.body, lineHeight: 23 }, status: { paddingHorizontal: 10, paddingVertical: 6, overflow: "hidden", borderRadius: radii.pill, color: p.text, backgroundColor: p.surfaceMuted, fontWeight: "700" }, redPill: { color: "#FFB0AA", backgroundColor: "#2A0604" }, actions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.x1 }, action: { minHeight: minimumTouchTarget, justifyContent: "center", paddingHorizontal: 14, borderWidth: 1, borderColor: p.border, borderRadius: radii.pill, backgroundColor: p.surface }, redAction: { borderColor: "#74211D", backgroundColor: "#170302" }, recommended: { borderColor: p.primaryActive }, pressed: { opacity: 0.68 }, actionText: { color: p.text, fontSize: typeToken.label, fontWeight: "700" }, panel: { gap: spacing.x1, padding: spacing.x2, borderRadius: radii.layer, backgroundColor: p.surface }, redPanel: { backgroundColor: "#130202", borderWidth: 1, borderColor: "#4B1612" }, evidence: { minHeight: 92, padding: 12, borderRadius: radii.control, backgroundColor: p.surfaceMuted }, redCard: { backgroundColor: "#210504" }, evidenceTitle: { color: p.text, fontSize: typeToken.body, fontWeight: "700" }, evidenceBody: { marginTop: 5, color: p.text, lineHeight: 19 }, meta: { marginTop: 5, color: p.textSecondary, fontSize: typeToken.caption, lineHeight: 17 }, redText: { color: "#FFB7B1" }, redMuted: { color: "#D37D76" }, empty: { minHeight: 170, justifyContent: "center", padding: spacing.x2, borderRadius: radii.layer, backgroundColor: p.surface }, emptyTitle: { color: p.text, fontSize: typeToken.section, fontWeight: "700" }, emptyBody: { marginTop: spacing.x1, color: p.textSecondary, lineHeight: 21 } });
