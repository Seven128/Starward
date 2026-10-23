import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, minimumTouchTarget, radii, spacing, type as typography } from "@starward/ui-system/tokens";
import { createFieldClient } from "../../data/field-client";
import type { createFieldReportsClient } from "../../data/field-reports-client";
import { resolveRuntimeApiBaseUrl } from "../../data/runtime-api-base-url";
import { useTabRestorationEvidence } from "../../shell/TabRestorationEvidence";
import { useShellStore } from "../../state/shell-store";
import { FieldReportsPanel } from "./FieldReportsPanel";

type ViewKey = "pack" | "red" | "tools" | "return" | "route" | "session" | "share" | "queue" | "offline";
const defaultClient = createFieldClient({ baseUrl: resolveRuntimeApiBaseUrl() });
const actions: Array<{ key: ViewKey; id: string; label: string; controlId?: string }> = [
  { key: "pack", id: "field-verify-pack", label: "离线包", controlId: "offline-pack-manager" },
  { key: "red", id: "field-toggle-red-mode", label: "显示模式", controlId: "night-red-mode-toggle" },
  { key: "tools", id: "field-open-tool-grid", label: "现场工具", controlId: "field-tool-grid" },
  { key: "return", id: "field-return-to-parking", label: "返车路线", controlId: "return-to-parking" },
  { key: "route", id: "field-open-offline-route", label: "切换备选", controlId: "backup-switcher" },
  { key: "session", id: "field-start-session", label: "安全会话", controlId: "safety-session-panel" },
  { key: "share", id: "field-share-location", label: "分享位置", controlId: "location-share-action" },
  { key: "queue", id: "field-save-report", label: "现场记录", controlId: "offline-sync-queue" },
  { key: "offline", id: "field-enter-airplane-mode", label: "离线状态" },
];
const unavailable: Partial<Record<ViewKey, { title: string; body: string }>> = {
  pack: { title: "尚无可用观测包", body: "下载、真实文件校验、原子激活与回滚尚未接入，当前不能标为可离线。" },
  return: { title: "尚无已确认停车点", body: "停车保存、位置精度、路线快照和指南针尚未接入，不会显示示例方向或距离。请使用你已核实的返程方式。" },
  route: { title: "备选切换尚不可用", body: "当前未关联经过核实的主备地点、路线、风险与窗口，未替换当前地点或原计划。" },
  session: { title: "安全会话尚未开启", body: "本地提醒、后台定位与自动停止尚未接入，未申请权限，也未建立跟踪。此功能不是救援服务。" },
  share: { title: "位置分享尚不可用", body: "尚未接入位置与访问策略、接收者预览、过期或撤回；没有生成分享链接，也没有发送位置。" },
  offline: { title: "完全离线尚不可用", body: "尚无经过真实文件校验的观测包，本机队列、图片补传和断网恢复仍未接入。私人文字草稿保存需要联网，不能代替离线观测能力。" },
};
export function FieldScreen({ client = defaultClient, reportsClient }: { client?: ReturnType<typeof createFieldClient>; reportsClient?: ReturnType<typeof createFieldReportsClient> } = {}) {
  const restoration = useTabRestorationEvidence({ testID: "tab-restoration-trips", tabId: "primary-tab-itinerary", rootRoute: "/trips", nestedRoute: "/field", ownerType: "scroll", ownerId: "trips-field-scroll-owner" });
  const context = useShellStore(state => state.decisionContext), spot = useShellStore(state => state.selectedSpot), location = useShellStore(state => state.location);
  const mode = useShellStore(state => state.displayMode), setDisplayMode = useShellStore(state => state.setDisplayMode), palette = colors[mode];
  const [activeView, setActiveView] = useState<ViewKey | null>(null), [reportsOpened, setReportsOpened] = useState(false);
  const query = useQuery({ queryKey: ["field-status"], queryFn: ({ signal }) => client.get(signal) });
  const place = spot?.name ?? (location.source === "unset" ? "尚未选择地点" : location.label), missing = activeView ? unavailable[activeView] : undefined;
  const text = [styles.text, { color: palette.text }], muted = [styles.text, { color: palette.textSecondary }];
  const buttonStyle = ({ pressed }: { pressed: boolean }) => [styles.action, { borderColor: palette.border, backgroundColor: pressed ? palette.surfaceMuted : palette.surface }];
  return <SafeAreaView testID="screen-field-offline-safety" style={[styles.screen, { backgroundColor: palette.canvas }]}>
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView onScroll={restoration.onScroll} scrollEventThrottle={restoration.scrollEventThrottle} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        {restoration.evidence}
        <View testID="field-dashboard" accessibilityLabel={`field-dashboard:现场仪表盘，${place}，当前尚无可用观测包与安全会话`} style={[styles.dashboard, { backgroundColor: palette.surface }]}>
          <Text testID={query.data ? "field-dashboard-ready" : undefined} style={[styles.eyebrow, { color: palette.primaryActive }]}>现场 · {place}</Text>
          <Text style={[styles.title, { color: palette.text }]}>核对现场与返程条件</Text>
          <Text style={muted}>{`所选时刻 ${context.moment} · ${context.timezone}`}</Text>
          <Text style={text}>观测包、方向、天气与返程资料尚未就绪。请勿把当前页面当作离线或安全保障。</Text>
        </View>
        <View style={styles.actions}>{actions.map(action => <Pressable key={action.key} testID={action.id} accessibilityLabel={action.controlId ? `${action.controlId}:${action.label}` : action.label} onPress={() => { setActiveView(action.key); if (action.key === "queue") setReportsOpened(true); }} style={buttonStyle}><Text style={text}>{action.label}</Text></Pressable>)}</View>
        {missing ? <View testID={`field-${activeView}-unavailable`} style={[styles.panel, { backgroundColor: palette.surface }]}><Text style={[styles.section, { color: palette.text }]}>{missing.title}</Text><Text style={text}>{missing.body}</Text></View> : null}
        {activeView === "red" ? <View testID="field-display-mode" style={[styles.panel, { backgroundColor: palette.surface }]}>
          <Text style={[styles.section, { color: palette.text }]}>显示模式</Text>
          <Text style={text}>仅控制应用内显示。系统键盘、系统提示和外部应用可能较亮，打开前会提示。</Text>
          <View style={styles.actions}>{([ ["planning", "日间"], ["night", "夜间"], ["redLight", "红光"] ] as const).map(([value, label]) => <Pressable key={value} testID={`field-mode-${value}`} onPress={() => setDisplayMode(value)} style={buttonStyle}><Text style={text}>{`${mode === value ? "当前 · " : ""}${label}`}</Text></Pressable>)}</View>
        </View> : null}
        {activeView === "tools" ? <View testID="field-tool-availability" style={[styles.panel, { backgroundColor: palette.surface }]}>
          <Text style={[styles.section, { color: palette.text }]}>现场工具</Text><Text style={muted}>沿用当前地点、时刻和目标；断网可用性尚未验证。</Text>
          <View style={styles.actions}>{([ ["/sky", "天空方向"], ["/shooting", "拍摄参数"], ["/map", "地图"] ] as const).map(([route, label]) => <Pressable key={route} testID={`field-tool-${route.slice(1)}`} disabled={mode === "redLight"} onPress={() => router.push(route)} style={buttonStyle}><Text style={text}>{label}</Text></Pressable>)}</View>
          {mode === "redLight" ? <Text style={muted}>这些工具的红光显示尚未核验，暂不可打开。可先切换显示模式，或留在当前现场页面。</Text> : null}
          <Text style={text}>离线地图、指南针、停车与装备清单尚未接入。</Text>
        </View> : null}
        {reportsOpened ? <View style={activeView === "queue" ? undefined : styles.hidden}><FieldReportsPanel client={reportsClient} /></View> : null}
        {query.isError ? <Pressable testID="field-status-retry" onPress={() => { void query.refetch(); }} style={buttonStyle}><Text style={text}>现场能力读取失败，点按重试。尚不能确认可用能力。</Text></Pressable> : null}
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
const styles = StyleSheet.create({ screen: { flex: 1 }, content: { padding: spacing.md, paddingBottom: spacing.xxl, gap: spacing.md }, dashboard: { padding: spacing.md, gap: spacing.xs, borderRadius: radii.layer }, eyebrow: { fontSize: typography.label, fontWeight: "700" }, title: { fontSize: typography.title, lineHeight: typography.titleLineHeight, fontWeight: "700" }, section: { fontSize: typography.section, lineHeight: typography.sectionLineHeight, fontWeight: "700" }, text: { fontSize: typography.body, lineHeight: typography.bodyLineHeight }, actions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs }, action: { minHeight: minimumTouchTarget, justifyContent: "center", paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderWidth: 1, borderRadius: radii.control }, panel: { gap: spacing.sm, padding: spacing.md, borderRadius: radii.layer }, hidden: { display: "none" } });
