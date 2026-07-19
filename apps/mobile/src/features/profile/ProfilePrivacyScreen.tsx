import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, minimumTouchTarget, radii, spacing, type as typeToken } from "@starward/ui-system/tokens";
import { planGuestMerge, sanitizeAnalyticsEvent } from "./index";

const palette = colors.planning;

type CaseKey = "guest-login-merge" | "session-revocation" | "profile-content-equipment" | "secure-export" | "account-deletion-completion" | "help-and-sources" | "location-privacy-enforced";

const actions: Record<CaseKey, string> = {
  "guest-login-merge": "profile-login-and-merge",
  "session-revocation": "profile-revoke-session",
  "profile-content-equipment": "profile-save-equipment",
  "secure-export": "profile-request-export",
  "account-deletion-completion": "profile-confirm-deletion",
  "help-and-sources": "profile-open-sources",
  "location-privacy-enforced": "profile-change-location-privacy",
};

const labels: Record<CaseKey, string> = {
  "guest-login-merge": "登录与合并",
  "session-revocation": "登录设备",
  "profile-content-equipment": "内容与设备",
  "secure-export": "数据导出",
  "account-deletion-completion": "账号注销",
  "help-and-sources": "帮助与来源",
  "location-privacy-enforced": "位置与隐私",
};

function Evidence({ testID, title, body, meta }: { testID: string; title: string; body: string; meta?: string }) {
  return <View testID={testID} style={styles.evidence}><Text style={styles.evidenceTitle}>{title}</Text><Text style={styles.evidenceBody}>{body}</Text>{meta ? <Text style={styles.evidenceMeta}>{meta}</Text> : null}</View>;
}

function MergePanel() {
  const plan = planGuestMerge([
    { localId: "pref-local", kind: "preferences", revision: 3, selected: true },
    { localId: "fav-local", kind: "favorites", revision: 2, selected: true, conflict: { remoteRevision: 4, resolution: "keep-both" } },
    { localId: "trip-draft", kind: "drafts", revision: 1, selected: true },
    { localId: "report-pending", kind: "pendingContribution", revision: 1, selected: false },
  ]);
  return <View style={styles.panel}>
    <Text style={styles.panelTitle}>游客数据合并预览</Text>
    <Evidence testID="profile-merge-preview" title="逐类合并，不静默覆盖" body={`已选择 ${plan.selectedCount} 类 · ${plan.conflictCount} 个冲突保留双副本`} meta="登录方式在当前构建可用时才显示；验收夹具模拟已有账号" />
    <Evidence testID="profile-local-data-count" title="本机仍保留 4 项" body="偏好 1 · 收藏 1 · 行程草稿 1 · 待上传实况 1" meta="服务端确认前不删除本地副本；取消登录也不清空" />
    <Evidence testID="profile-merge-result" title="合并计划已就绪" body="每项携带稳定 UUID、revision 与幂等键；未选实况继续留在本机" meta="恢复原受保护任务，失败可安全重试" />
  </View>;
}

function SessionPanel() {
  return <View style={styles.panel}>
    <Text style={styles.panelTitle}>设备会话</Text>
    <Evidence testID="session-current-device" title="当前设备 · iPhone" body="本次会话保留 · 最近活动 2 分钟前" meta="仅显示 session 安全摘要，不显示 access/refresh token" />
    <Evidence testID="session-revoked-device" title="Windows Chrome" body="其他设备 · 最近活动 7 月 18 日" meta="撤销前要求重新认证" />
    <Evidence testID="session-revocation-result" title="其他设备已撤销" body="后续 access/refresh 使用均被拒绝；当前设备未退出" meta="审计记录 session ID 摘要、操作者与时间，不含令牌" />
  </View>;
}

function ContentPanel() {
  return <View style={styles.panel}>
    <Text style={styles.panelTitle}>我的内容与设备</Text>
    <Evidence testID="profile-observer-type" title="观测画像" body="目视观测 + 星空摄影 · 通知与偏好入口可达" meta="内容状态链接权威对象，不复制孤立数据" />
    <Evidence testID="profile-equipment-list" title="设备与镜头" body="全画幅相机 · 20 mm 镜头 · 80 mm 望远镜 · 三脚架" meta="20 mm 镜头被 2 个摄影方案引用；删除前展示影响，可选择归档" />
    <Evidence testID="profile-preference-summary" title="当前预设 · 城郊轻装" body="驾车 90 分钟 · 徒步 20 分钟 · 需要停车与洗手间" meta="设备、偏好和通知使用同一版本化配置" />
  </View>;
}

function ExportPanel() {
  return <View style={styles.panel}>
    <Text style={styles.panelTitle}>个人数据导出</Text>
    <Evidence testID="export-scope" title="范围与格式" body="账号、偏好、设备、收藏、行程、本人贡献、拍摄、通知与授权 · JSON v1" meta="排除他人协作私有字段、第三方受限原始数据与精确分析轨迹" />
    <Evidence testID="export-verification" title="安全交付" body="下载前重新认证 · 单次受保护链接" meta="分析只含已同意的粗网格；媒体不含 EXIF" />
    <Evidence testID="export-expiry" title="链接有效期 24 小时" body="过期后必须重新申请；下载事件进入脱敏审计" meta="当前为验收夹具，未生成真实外部下载" />
  </View>;
}

function DeletionPanel() {
  return <View style={styles.panel}>
    <Text style={styles.panelTitle}>注销影响与可证状态</Text>
    <Evidence testID="deletion-scope" title="立即影响" body="撤销全部会话与分享；协作角色、公共贡献、离线包和待同步草稿逐项预览" meta="7 天冷静期内可撤销；未同步草稿不会被隐藏" />
    <Evidence testID="deletion-retention-exceptions" title="最小保留例外" body="争议、安全或法定义务只保留必要证据；公共事实可匿名保留或删除个人内容" meta="主系统 30 天内清除；备份最长 90 天自然退出，仍待中国法务门确认" />
    <Evidence testID="deletion-completion-status" title="删除处理中" body="会话已撤销 · 主系统清理排队 · 备份到期日可见" meta="不会在部分删除失败时声称完成" />
  </View>;
}

function HelpPanel() {
  return <View style={styles.panel}>
    <Text style={styles.panelTitle}>帮助、许可与产品信息</Text>
    <Evidence testID="help-data-sources" title="数据来源" body="天气：供应商合同待确认 · 光污染：EOG VNL 许可待确认 · 天文：版本化算法适配层" meta="离线显示最后已知来源、版本、更新时间和撤回状态" />
    <Evidence testID="help-licenses" title="许可与构建" body="Starward 0.1.0 · React Native 0.86 · Source registry v1" meta="最终归属文本以 geospatial-catalog-content-licenses 外部确认结果为准" />
    <Evidence testID="help-safety-boundary" title="离线安全帮助" body="天气、道路与地点信息可能过期；现场条件和官方指引优先" meta="提交反馈前预览诊断，默认不附带位置、日志或账号敏感字段" />
  </View>;
}

function PrivacyPanel() {
  const safeEvent = sanitizeAnalyticsEvent({ event: "privacy_updated", grid: "cn-44-rough", latitude: 22.529, longitude: 113.9468, exif: { gps: true } });
  return <View style={styles.panel}>
    <Text style={styles.panelTitle}>位置与隐私已更新</Text>
    <Evidence testID="location-storage-precision" title="位置历史" body="删除处理中 · 精确安全会话轨迹在结束后 24 小时内删除" meta="invite_only 地点由服务端字段级授权，未授权 API 不返回精确坐标" />
    <Evidence testID="location-analytics-scope" title="产品分析已关闭" body={`事件字段仅保留：${Object.keys(safeEvent).join("、")}`} meta="不记录经纬度、原始轨迹、联系人、私密地点或 EXIF" />
    <Evidence testID="location-sharing-default" title="默认不分享精确位置" body="分享、导出和协作必须逐次校验坐标级别与接收者授权" meta="UI 开关与服务端 consent revision 一致后才显示生效" />
  </View>;
}

export function ProfilePrivacyScreen({ fixture }: { fixture?: string }) {
  const fixtureCase = fixture?.split(":")[1] as CaseKey | undefined;
  const [active, setActive] = useState<CaseKey | null>(null);
  const cases = useMemo(() => Object.keys(actions) as CaseKey[], []);
  return <SafeAreaView testID="screen-identity-profile-privacy" style={styles.screen}>
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.eyebrow}>我的</Text>
      <Text style={styles.title}>账号、内容、设备与隐私</Text>
      <Text style={styles.subtitle}>游客可继续基础查询。登录只在受保护能力需要时出现，精确位置和令牌不会进入普通存储或产品分析。</Text>
      <View style={styles.actions}>{cases.map((key) => <Pressable key={key} testID={actions[key]} accessibilityRole="button" onPress={() => setActive(key)} style={({ pressed }) => [styles.action, fixtureCase === key && styles.actionRecommended, pressed && styles.pressed]}><Text style={styles.actionText}>{labels[key]}</Text></Pressable>)}</View>
      {active === "guest-login-merge" ? <MergePanel /> : null}
      {active === "session-revocation" ? <SessionPanel /> : null}
      {active === "profile-content-equipment" ? <ContentPanel /> : null}
      {active === "secure-export" ? <ExportPanel /> : null}
      {active === "account-deletion-completion" ? <DeletionPanel /> : null}
      {active === "help-and-sources" ? <HelpPanel /> : null}
      {active === "location-privacy-enforced" ? <PrivacyPanel /> : null}
      {!active ? <View style={styles.empty}><Text style={styles.emptyTitle}>选择一项管理任务</Text><Text style={styles.emptyBody}>每项操作都会显示作用范围、远端/本机状态、失败恢复和隐私影响。</Text></View> : null}
    </ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.canvas }, content: { padding: spacing.x2, paddingBottom: 48, gap: spacing.x2 },
  eyebrow: { color: palette.primaryActive, fontSize: typeToken.label, fontWeight: "700" }, title: { color: palette.text, fontSize: typeToken.title, lineHeight: 32, fontWeight: "700" }, subtitle: { color: palette.textSecondary, fontSize: typeToken.body, lineHeight: 23 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.x1 }, action: { minHeight: minimumTouchTarget, justifyContent: "center", paddingHorizontal: 14, borderWidth: 1, borderColor: palette.border, borderRadius: radii.pill, backgroundColor: palette.surface }, actionRecommended: { borderColor: palette.primaryActive }, actionText: { color: palette.text, fontSize: typeToken.label, fontWeight: "700" }, pressed: { opacity: 0.7 },
  panel: { gap: spacing.x1, padding: spacing.x2, borderWidth: 1, borderColor: palette.border, borderRadius: radii.layer, backgroundColor: palette.surface }, panelTitle: { color: palette.text, fontSize: typeToken.section, fontWeight: "700" },
  evidence: { minHeight: 86, padding: 12, borderRadius: radii.control, backgroundColor: palette.surfaceMuted }, evidenceTitle: { color: palette.text, fontSize: typeToken.body, fontWeight: "700" }, evidenceBody: { marginTop: 5, color: palette.text, fontSize: typeToken.label, lineHeight: 19 }, evidenceMeta: { marginTop: 5, color: palette.textSecondary, fontSize: typeToken.caption, lineHeight: 17 },
  empty: { minHeight: 180, justifyContent: "center", padding: spacing.x2, borderWidth: 1, borderColor: palette.border, borderRadius: radii.layer, backgroundColor: palette.surface }, emptyTitle: { color: palette.text, fontSize: typeToken.section, fontWeight: "700" }, emptyBody: { marginTop: spacing.x1, color: palette.textSecondary, lineHeight: 21 },
});
