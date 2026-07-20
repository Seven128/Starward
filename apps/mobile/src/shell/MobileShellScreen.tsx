import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { createUnrestrictedProfile, profileExamples, profileImpactSummary, type PreferenceProfile } from "@starward/domain/preferences";
import { presentDataState, type DataStateKind } from "@starward/ui-system/data-state";
import { colors, minimumTouchTarget, radii, spacing, type as typeToken } from "@starward/ui-system/tokens";
import { PreferenceWizard } from "../features/preferences/PreferenceWizard";
import { expoPermissionGateway, type PermissionDecision } from "../native/permissions/permission-gateway";
import { type PrimaryDestination, useShellStore } from "../state/shell-store";

const palette = colors.planning;

const destinations: Array<{ id: PrimaryDestination; label: string; glyph: string; testID: string }> = [
  { id: "tonight", label: "今晚", glyph: "☾", testID: "primary-tab-tonight" },
  { id: "map", label: "观星地图", glyph: "⌖", testID: "primary-tab-map" },
  { id: "itinerary", label: "行程", glyph: "≡", testID: "primary-tab-itinerary" },
  { id: "sky", label: "天空", glyph: "✦", testID: "primary-tab-sky" },
  { id: "profile", label: "我的", glyph: "●", testID: "primary-tab-profile" },
];

function makeMilkyWayProfile(): PreferenceProfile {
  const now = new Date().toISOString();
  const profile = createUnrestrictedProfile(now);
  return {
    ...profile,
    id: "milky-way-photo",
    name: "银河摄影",
    revision: 1,
    observerTypes: ["astrophotographer"],
    city: "深圳市",
    startingPlace: "南山区",
    travel: { ...profile.travel, modes: ["drive"], maxOneWayMinutes: 120, maxWalkingKilometers: 1.5, acceptsMountainRoad: true, acceptsNightWalking: true },
    facilities: { ...profile.facilities, parking: "preferred", "flat-platform": "required" },
    targets: ["milky-way"],
    equipment: ["camera", "lens", "tripod"],
    lensFocalLengthsMm: [14, 24],
  };
}

function DataStateCard({ state }: { state: DataStateKind }) {
  const value = presentDataState({ state, missing: state === "partial" ? ["路线"] : [] });
  return (
    <View accessibilityLabel={value.accessibilityLabel} style={styles.stateCard}>
      <View style={styles.stateDot} />
      <View style={styles.stateCopy}>
        <Text style={styles.stateTitle}>{value.label}</Text>
        <Text style={styles.stateDescription}>{value.description}</Text>
      </View>
      <Text style={styles.stateAction}>{value.action}</Text>
    </View>
  );
}

function PermissionModal({ visible, status, onClose, onAllow, onManual }: {
  visible: boolean;
  status: PermissionDecision;
  onClose: () => void;
  onAllow: () => void;
  onManual: () => void;
}) {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View accessibilityViewIsModal style={styles.dialog}>
          <Text style={styles.dialogEyebrow}>位置权限 · 使用时询问</Text>
          <Text style={styles.dialogTitle}>查找你附近的观星条件</Text>
          <Text testID="permission-purpose" style={styles.dialogBody}>现在需要位置，是为了计算附近地点、当地观星夜和出发距离。</Text>
          <View testID="permission-scope" style={styles.scopeBox}>
            <Text style={styles.scopeTitle}>只请求前台位置</Text>
            <Text style={styles.scopeBody}>不会请求永久后台定位。现场安全会话若未来需要持续定位，会再次说明，并在会话结束时自动停止。</Text>
          </View>
          <Text testID="permission-denied-alternative" style={styles.alternative}>暂不允许也可以手动选择城市或出发地，基础查询不会被阻断。</Text>
          {status === "denied" ? <Text accessibilityLiveRegion="polite" style={styles.statusWarning}>系统已拒绝；我们不会循环弹窗。</Text> : null}
          <Pressable accessibilityRole="button" onPress={onAllow} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
            <Text style={styles.primaryButtonText}>允许使用期间定位</Text>
          </Pressable>
          <View style={styles.dialogActions}>
            <Pressable accessibilityRole="button" onPress={onManual} style={styles.secondaryButton}><Text style={styles.secondaryButtonText}>手动选择</Text></Pressable>
            <Pressable accessibilityRole="button" onPress={onClose} style={styles.secondaryButton}><Text style={styles.secondaryButtonText}>暂不允许</Text></Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function ManualLocationModal({ visible, onClose, onConfirm }: { visible: boolean; onClose: () => void; onConfirm: (label: string) => Promise<void> }) {
  const [value, setValue] = useState("深圳市 · 南山区");
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View accessibilityViewIsModal style={styles.dialog}>
          <Text style={styles.dialogEyebrow}>手动位置</Text>
          <Text style={styles.dialogTitle}>选择城市或常用出发地</Text>
          <Text style={styles.dialogBody}>位置只用于本次基础查询；可以稍后再开启设备定位。</Text>
          <TextInput accessibilityLabel="手动位置" value={value} onChangeText={setValue} style={styles.input} />
          <Pressable accessibilityRole="button" onPress={() => void onConfirm(value.trim())} disabled={!value.trim()} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed, !value.trim() && styles.disabled]}>
            <Text style={styles.primaryButtonText}>使用这个位置</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={onClose} style={styles.secondaryButton}><Text style={styles.secondaryButtonText}>取消</Text></Pressable>
        </View>
      </View>
    </Modal>
  );
}

function ProfileSwitcher({ visible, profiles, activeId, onClose, onSelect, onCreate }: {
  visible: boolean;
  profiles: PreferenceProfile[];
  activeId: string;
  onClose: () => void;
  onSelect: (id: string) => Promise<void>;
  onCreate: () => void;
}) {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View accessibilityViewIsModal style={styles.dialog}>
          <Text style={styles.dialogEyebrow}>当前推荐画像</Text>
          <Text style={styles.dialogTitle}>切换偏好预设</Text>
          {profiles.map((profile) => (
            <Pressable key={profile.id} accessibilityRole="radio" accessibilityState={{ selected: profile.id === activeId }} onPress={() => { void onSelect(profile.id).then(onClose); }} style={[styles.profileOption, profile.id === activeId && styles.profileOptionActive]}>
              <Text style={styles.profileOptionTitle}>{profile.id === activeId ? "✓ " : ""}{profile.name}</Text>
              <Text style={styles.profileOptionSummary}>{profileImpactSummary(profile)}</Text>
            </Pressable>
          ))}
          <Pressable accessibilityRole="button" onPress={onCreate} style={styles.primaryButton}><Text style={styles.primaryButtonText}>新建预设</Text></Pressable>
          <Pressable accessibilityRole="button" onPress={onClose} style={styles.secondaryButton}><Text style={styles.secondaryButtonText}>关闭</Text></Pressable>
        </View>
      </View>
    </Modal>
  );
}

function DestinationContent({ destination, location, recommendationState, activeProfile, onPermission, onManual, onWizard, onStarter }: {
  destination: PrimaryDestination;
  location: ReturnType<typeof useShellStore.getState>["location"];
  recommendationState: ReturnType<typeof useShellStore.getState>["recommendationState"];
  activeProfile: PreferenceProfile;
  onPermission(): void; onManual(): void; onWizard(): void; onStarter(): Promise<void>;
}) {
  return <>
    {recommendationState === "stale" ? <View testID="preference-ranking-impact" accessibilityLiveRegion="polite" style={styles.staleBanner}><Text style={styles.staleTitle}>推荐正在按新预设重算</Text><Text style={styles.staleBody}>旧结果会保留，但已标记为缓存结果，不会冒充新结论。</Text></View> : <View testID="preference-ranking-impact"><Text style={styles.srHint}>当前预设会影响后续排序与硬性阻断。</Text></View>}
    {destination === "tonight" ? <>
      <View style={styles.hero}><Text style={styles.heroEyebrow}>今晚决策</Text><Text style={styles.heroTitle}>{location.source === "unset" ? "先选择位置，再判断今晚是否值得出发" : `准备查看 ${location.label} 的今晚条件`}</Text><Text style={styles.heroBody}>先给结论、可执行窗口和下一步，再下钻天气、月光、暗度、路线与风险证据。</Text><Pressable testID="shell-open-permission-feature" accessibilityRole="button" onPress={onPermission} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}><Text style={styles.primaryButtonText}>{location.source === "unset" ? "查找附近观星条件" : "更新附近位置"}</Text></Pressable><Pressable accessibilityRole="button" onPress={onManual} style={styles.inlineAction}><Text style={styles.inlineActionText}>或手动选择城市 / 出发地</Text></Pressable></View>
      <DataStateCard state={location.source === "unset" ? "empty" : recommendationState === "stale" ? "stale" : "loading"} />
      <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>偏好预设</Text><Pressable accessibilityRole="button" onPress={onWizard} style={styles.smallAction}><Text style={styles.smallActionText}>编辑当前预设</Text></Pressable></View>
      <Text style={styles.profileSummary}>{profileImpactSummary(activeProfile)}</Text>
      <View style={styles.starterProfileCard}><View style={styles.starterProfileCopy}><Text style={styles.starterProfileTitle}>银河摄影起步预设</Text><Text style={styles.starterProfileBody}>自驾 · 120 分钟 · 停车优先 · 平整平台必需 · 银河 · 相机 / 镜头 / 三脚架</Text><Text style={styles.starterProfileMeta}>这是可检查、可继续编辑的起步值，不会在未点击时自动启用。</Text></View><Pressable testID="shell-switch-profile" accessibilityRole="button" onPress={() => void onStarter()} style={({ pressed }) => [styles.starterProfileButton, pressed && styles.pressed]}><Text style={styles.starterProfileButtonText}>保存并切换</Text></Pressable></View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.exampleRow}>{profileExamples.map((example) => <View key={example.id} style={styles.exampleCard}><Text style={styles.exampleTitle}>{example.name}</Text><Text style={styles.exampleBody}>{example.summary}</Text><Text style={styles.exampleMeta}>示例 · 不会自动启用</Text></View>)}</ScrollView>
    </> : null}
    {destination === "map" ? <View style={styles.destinationPanel}><Text style={styles.heroEyebrow}>观星地图</Text><Text style={styles.destinationTitle}>在位置、暗度、路线和安全之间做选择</Text><Text style={styles.destinationBody}>地图会保留当前位置和推荐画像。供应商或图层尚不可用时，会明确显示缓存、缺失与降级路径。</Text><DataStateCard state="empty" /></View> : null}
    {destination === "itinerary" ? <View style={styles.destinationPanel}><Text style={styles.heroEyebrow}>行程</Text><Text style={styles.destinationTitle}>把地点、时间窗、路线与备选装进同一个计划</Text><DataStateCard state="empty" /></View> : null}
    {destination === "sky" ? <View style={styles.destinationPanel}><Text style={styles.heroEyebrow}>天空</Text><Text style={styles.destinationTitle}>即使相机或传感器不可用，也能查看通用天空</Text><Text style={styles.destinationBody}>相机、方向和 AR 只在你主动进入相应能力时请求；拒绝后保留静态天空路径。</Text><DataStateCard state="empty" /></View> : null}
    {destination === "profile" ? <View style={styles.destinationPanel}><Text style={styles.heroEyebrow}>我的</Text><Text style={styles.destinationTitle}>预设、出发地、设备与隐私控制</Text><Pressable accessibilityRole="button" onPress={onWizard} style={styles.listAction}><Text style={styles.listActionTitle}>偏好预设</Text><Text style={styles.listActionMeta}>{activeProfile.name} · {profileImpactSummary(activeProfile)}</Text></Pressable><Pressable accessibilityRole="button" onPress={onManual} style={styles.listAction}><Text style={styles.listActionTitle}>常用出发地</Text><Text style={styles.listActionMeta}>{location.label}</Text></Pressable><View style={styles.listAction}><Text style={styles.listActionTitle}>隐私与权限</Text><Text style={styles.listActionMeta}>按功能请求 · 后台定位默认关闭</Text></View></View> : null}
  </>;
}

export function MobileShellScreen() {
  const insets = useSafeAreaInsets();
  const {
    guest,
    activeDestination,
    location,
    profiles,
    activeProfileId,
    recommendationState,
    persistenceState,
    persistenceError,
    hydrateFromRuntime,
    setDestination,
    setManualLocation,
    setDeviceLocation,
    saveProfile,
    activateProfile,
  } = useShellStore();
  const [permissionVisible, setPermissionVisible] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<PermissionDecision>("undetermined");
  const [permissionLoading, setPermissionLoading] = useState(false);
  const [manualVisible, setManualVisible] = useState(false);
  const [manualDraft, setManualDraft] = useState("深圳市 · 南山区");
  const [profileSwitcherVisible, setProfileSwitcherVisible] = useState(false);
  const [wizardVisible, setWizardVisible] = useState(false);

  useEffect(() => {
    void hydrateFromRuntime();
  }, [hydrateFromRuntime]);

  const activeProfile = useMemo(() => profiles.find((item) => item.id === activeProfileId) ?? profiles[0] ?? createUnrestrictedProfile(), [activeProfileId, profiles]);

  const commitManualLocation = async (label = "深圳市 · 南山区") => {
    await setManualLocation(label);
    setManualVisible(false);
    setPermissionVisible(false);
  };

  const handleManualAction = () => setManualVisible(true);

  const applyStarterProfile = async () => {
    const existing = profiles.find((item) => item.id === "milky-way-photo");
    const profile = makeMilkyWayProfile();
    await saveProfile({
      ...profile,
      revision: (existing?.revision ?? 0) + 1,
      updatedAt: new Date().toISOString(),
    });
  };

  const requestForegroundLocation = async () => {
    if (permissionLoading) return;
    setPermissionLoading(true);
    try {
      const result = await expoPermissionGateway.requestForegroundLocation();
      setPermissionStatus(result.decision);
      if (result.decision === "granted") {
        await setDeviceLocation("当前位置", 0, 0);
        setPermissionVisible(false);
      }
    } finally {
      setPermissionLoading(false);
    }
  };

  return (
    <SafeAreaView testID="screen-mobile-shell-and-preferences" style={styles.screen} edges={["top", "left", "right"]}>
      <View style={styles.topBar}>
        <View>
          <Text style={styles.brand}>今晚去观星</Text>
          <Text style={styles.date}>从黄昏走入星夜</Text>
        </View>
        <View testID="shell-guest-state" style={styles.guestPill}><Text style={styles.guestText}>{guest ? "游客模式" : "已登录"}</Text></View>
      </View>

      <View testID="shell-persistence-state" accessibilityLiveRegion="polite" style={[styles.persistenceBanner, persistenceState === "error" && styles.persistenceBannerError]}>
        <Text style={styles.persistenceText}>
          {persistenceState === "loading" ? "正在恢复本机设置…" : persistenceState === "saving" ? "正在写入本机数据库…" : persistenceState === "error" ? persistenceError : "本机设置已同步"}
        </Text>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 104 + insets.bottom }]} keyboardShouldPersistTaps="handled">
        <View style={styles.contextRow}>
          <Pressable accessibilityRole="button" accessibilityLabel={`当前位置，${location.label}。点击手动选择`} onPress={handleManualAction} style={({ pressed }) => [styles.contextCard, pressed && styles.pressed]}>
            <Text style={styles.contextLabel}>位置</Text>
            <Text testID="shell-location-label" numberOfLines={1} style={styles.contextValue}>{location.label}</Text>
            <Text testID="shell-location-source" style={styles.contextMeta}>{location.source === "manual" ? "手动位置" : location.source === "device" ? "设备前台位置" : "未设置 · 可手动选择"}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={`当前预设，${activeProfile.name}。点击切换`} onPress={() => setProfileSwitcherVisible(true)} style={({ pressed }) => [styles.contextCard, pressed && styles.pressed]}>
            <Text style={styles.contextLabel}>推荐画像</Text>
            <Text testID="preference-active-profile" numberOfLines={1} style={styles.contextValue}>{activeProfile.name}</Text>
            <Text testID="preference-saved-state" style={styles.contextMeta}>{activeProfile.id === "base" ? "基础模式 · 未限制" : "已保存 · 当前使用"}</Text>
          </Pressable>
        </View>

        <View style={styles.quickSetupCard}>
          <Text style={styles.quickSetupEyebrow}>手动位置 · 无需登录或授权</Text>
          <Text style={styles.quickSetupTitle}>选择今晚查询的城市或出发地</Text>
          <TextInput
            testID="shell-manual-location-input"
            accessibilityLabel="今晚查询的手动位置"
            value={manualDraft}
            onChangeText={setManualDraft}
            placeholder="城市或出发地"
            placeholderTextColor={palette.textSecondary}
            style={styles.quickSetupInput}
          />
          <Pressable
            testID="shell-set-manual-location"
            accessibilityRole="button"
            disabled={!manualDraft.trim()}
            onPress={() => void commitManualLocation(manualDraft)}
            style={({ pressed }) => [styles.quickSetupButton, pressed && styles.pressed, (!manualDraft.trim() || persistenceState === "saving") && styles.disabled]}
          >
            <Text style={styles.quickSetupButtonText}>使用这个手动位置</Text>
          </Pressable>
        </View>

        <DestinationContent destination={activeDestination} location={location} recommendationState={recommendationState} activeProfile={activeProfile} onPermission={() => setPermissionVisible(true)} onManual={handleManualAction} onWizard={() => setWizardVisible(true)} onStarter={applyStarterProfile} />
      </ScrollView>

      <View style={[styles.tabBar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        {destinations.map((item) => {
          const selected = item.id === activeDestination;
          return (
            <Pressable
              key={item.id}
              testID={item.id === "map" ? "shell-open-map-tab" : item.testID}
              accessibilityRole="tab"
              accessibilityLabel={item.label}
              accessibilityState={{ selected }}
              onPress={() => void setDestination(item.id)}
              style={({ pressed }) => [styles.tab, selected && styles.tabSelected, pressed && styles.pressed]}
            >
              <Text style={[styles.tabGlyph, selected && styles.tabTextSelected]}>{item.glyph}</Text>
              <Text testID={item.id === "map" ? item.testID : undefined} style={[styles.tabText, selected && styles.tabTextSelected]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <PermissionModal visible={permissionVisible} status={permissionStatus} onClose={() => setPermissionVisible(false)} onManual={() => { setPermissionVisible(false); setManualVisible(true); }} onAllow={requestForegroundLocation} />
      {permissionLoading ? <View accessibilityLiveRegion="polite" style={styles.loadingOverlay}><ActivityIndicator color={palette.primaryActive} /><Text style={styles.loadingText}>正在等待系统权限…</Text></View> : null}
      <ManualLocationModal visible={manualVisible} onClose={() => setManualVisible(false)} onConfirm={commitManualLocation} />
      <ProfileSwitcher visible={profileSwitcherVisible} profiles={profiles} activeId={activeProfileId} onClose={() => setProfileSwitcherVisible(false)} onSelect={activateProfile} onCreate={() => { setProfileSwitcherVisible(false); setWizardVisible(true); }} />
      <PreferenceWizard visible={wizardVisible} initial={activeProfile} onClose={() => setWizardVisible(false)} onSave={saveProfile} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.canvas },
  topBar: { minHeight: 72, paddingHorizontal: spacing.x2, paddingVertical: spacing.x1, flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: palette.surface, borderBottomWidth: 1, borderBottomColor: palette.border },
  persistenceBanner: { minHeight: 28, justifyContent: "center", paddingHorizontal: spacing.x2, backgroundColor: palette.surfaceMuted, borderBottomWidth: 1, borderBottomColor: palette.border },
  persistenceBannerError: { backgroundColor: "#FFF1F0", borderBottomColor: palette.danger },
  persistenceText: { color: palette.textSecondary, fontSize: typeToken.caption, fontWeight: "600" },
  brand: { color: palette.text, fontSize: typeToken.section, fontWeight: "700" },
  date: { marginTop: 3, color: palette.textSecondary, fontSize: typeToken.caption },
  guestPill: { minHeight: 32, justifyContent: "center", paddingHorizontal: 12, borderRadius: radii.pill, backgroundColor: palette.surfaceMuted },
  guestText: { color: palette.textSecondary, fontSize: typeToken.label, fontWeight: "700" },
  content: { padding: spacing.x2, gap: spacing.x2 },
  contextRow: { flexDirection: "row", gap: spacing.x1 },
  contextCard: { flex: 1, minHeight: 92, padding: 12, borderWidth: 1, borderColor: palette.border, borderRadius: radii.control, backgroundColor: palette.surface },
  contextLabel: { color: palette.textSecondary, fontSize: typeToken.caption, fontWeight: "700" },
  contextValue: { marginTop: 5, color: palette.text, fontSize: typeToken.body, fontWeight: "700" },
  contextMeta: { marginTop: 6, color: palette.primaryActive, fontSize: 11, fontWeight: "600" },
  quickSetupCard: { padding: spacing.x2, borderWidth: 1, borderColor: palette.border, borderRadius: radii.control, backgroundColor: palette.surface, gap: spacing.x1 },
  quickSetupEyebrow: { color: palette.primaryActive, fontSize: typeToken.label, fontWeight: "700" },
  quickSetupTitle: { color: palette.text, fontSize: typeToken.section, fontWeight: "700" },
  quickSetupInput: { minHeight: minimumTouchTarget, paddingHorizontal: 12, color: palette.text, borderWidth: 1, borderColor: palette.border, borderRadius: radii.control, backgroundColor: palette.canvas },
  quickSetupButton: { minHeight: minimumTouchTarget, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.x2, borderRadius: radii.control, backgroundColor: palette.primaryActive },
  quickSetupButtonText: { color: palette.onPrimary, fontWeight: "700" },
  staleBanner: { padding: 12, borderWidth: 1, borderColor: "#E7B866", borderRadius: radii.control, backgroundColor: "#FFF7E8" },
  staleTitle: { color: palette.warning, fontWeight: "700" },
  staleBody: { marginTop: 4, color: palette.textSecondary, fontSize: typeToken.label, lineHeight: 18 },
  srHint: { color: palette.textSecondary, fontSize: typeToken.caption },
  hero: { padding: spacing.x2, borderRadius: radii.layer, backgroundColor: "#E8F1FF", borderWidth: 1, borderColor: "#C7DDFB" },
  heroEyebrow: { color: palette.primaryActive, fontSize: typeToken.label, fontWeight: "700", letterSpacing: 0.6 },
  heroTitle: { marginTop: spacing.x1, color: palette.text, fontSize: typeToken.title, lineHeight: 31, fontWeight: "700" },
  heroBody: { marginTop: spacing.x1, color: palette.textSecondary, fontSize: typeToken.body, lineHeight: 22 },
  primaryButton: { minHeight: 52, marginTop: spacing.x2, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.x2, borderRadius: radii.control, backgroundColor: palette.primaryActive },
  primaryButtonText: { color: palette.onPrimary, fontSize: typeToken.body, fontWeight: "700" },
  inlineAction: { minHeight: minimumTouchTarget, alignItems: "center", justifyContent: "center" },
  inlineActionText: { color: palette.primaryActive, fontSize: typeToken.label, fontWeight: "700" },
  stateCard: { minHeight: 88, padding: spacing.x2, flexDirection: "row", alignItems: "center", gap: 12, borderRadius: radii.control, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.surface },
  stateDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: palette.warning },
  stateCopy: { flex: 1 },
  stateTitle: { color: palette.text, fontWeight: "700" },
  stateDescription: { marginTop: 3, color: palette.textSecondary, fontSize: typeToken.label, lineHeight: 18 },
  stateAction: { color: palette.primaryActive, fontSize: typeToken.label, fontWeight: "700" },
  sectionHeader: { marginTop: spacing.x1, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionTitle: { color: palette.text, fontSize: typeToken.section, fontWeight: "700" },
  smallAction: { minHeight: minimumTouchTarget, justifyContent: "center", paddingHorizontal: spacing.x1 },
  smallActionText: { color: palette.primaryActive, fontSize: typeToken.label, fontWeight: "700" },
  profileSummary: { marginTop: -8, color: palette.textSecondary, fontSize: typeToken.label, lineHeight: 19 },
  starterProfileCard: { padding: 12, borderWidth: 1, borderColor: palette.border, borderRadius: radii.control, backgroundColor: palette.surface, gap: spacing.x1 },
  starterProfileCopy: { gap: 4 },
  starterProfileTitle: { color: palette.text, fontWeight: "700" },
  starterProfileBody: { color: palette.text, fontSize: typeToken.label, lineHeight: 19 },
  starterProfileMeta: { color: palette.textSecondary, fontSize: typeToken.caption, lineHeight: 17 },
  starterProfileButton: { minHeight: minimumTouchTarget, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.x2, borderRadius: radii.control, borderWidth: 1, borderColor: palette.primaryActive },
  starterProfileButtonText: { color: palette.primaryActive, fontWeight: "700" },
  exampleRow: { gap: spacing.x1, paddingRight: spacing.x2 },
  exampleCard: { width: 190, minHeight: 118, padding: 12, borderRadius: radii.control, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.surface },
  exampleTitle: { color: palette.text, fontWeight: "700" },
  exampleBody: { marginTop: 6, color: palette.textSecondary, fontSize: typeToken.label, lineHeight: 18 },
  exampleMeta: { marginTop: "auto", paddingTop: 8, color: palette.primaryActive, fontSize: typeToken.caption, fontWeight: "600" },
  destinationPanel: { minHeight: 420, padding: spacing.x2, borderRadius: radii.layer, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.surface, gap: spacing.x2 },
  destinationTitle: { color: palette.text, fontSize: typeToken.title, lineHeight: 31, fontWeight: "700" },
  destinationBody: { color: palette.textSecondary, fontSize: typeToken.body, lineHeight: 22 },
  listAction: { minHeight: 72, justifyContent: "center", paddingHorizontal: 12, borderRadius: radii.control, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.canvas },
  listActionTitle: { color: palette.text, fontSize: typeToken.body, fontWeight: "700" },
  listActionMeta: { marginTop: 4, color: palette.textSecondary, fontSize: typeToken.label },
  tabBar: { position: "absolute", left: 0, right: 0, bottom: 0, minHeight: 72, paddingTop: 6, paddingHorizontal: 6, flexDirection: "row", alignItems: "flex-start", backgroundColor: palette.surface, borderTopWidth: 1, borderTopColor: palette.border },
  tab: { flex: 1, minHeight: 54, alignItems: "center", justifyContent: "center", borderRadius: radii.control },
  tabSelected: { backgroundColor: "#E7F0FF" },
  tabGlyph: { color: palette.textSecondary, fontSize: 17, lineHeight: 20 },
  tabText: { marginTop: 2, color: palette.textSecondary, fontSize: 10, fontWeight: "600" },
  tabTextSelected: { color: palette.primaryActive, fontWeight: "700" },
  modalBackdrop: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.x2, backgroundColor: "rgba(7, 19, 33, 0.58)" },
  dialog: { width: "100%", maxWidth: 420, padding: spacing.x2, borderRadius: radii.layer, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border },
  dialogEyebrow: { color: palette.primaryActive, fontSize: typeToken.label, fontWeight: "700" },
  dialogTitle: { marginTop: 6, color: palette.text, fontSize: typeToken.section, fontWeight: "700" },
  dialogBody: { marginTop: spacing.x1, color: palette.textSecondary, fontSize: typeToken.body, lineHeight: 22 },
  scopeBox: { marginTop: spacing.x2, padding: 12, borderRadius: radii.control, backgroundColor: palette.surfaceMuted },
  scopeTitle: { color: palette.text, fontWeight: "700" },
  scopeBody: { marginTop: 4, color: palette.textSecondary, fontSize: typeToken.label, lineHeight: 18 },
  alternative: { marginTop: spacing.x2, color: palette.text, fontSize: typeToken.label, lineHeight: 19 },
  statusWarning: { marginTop: spacing.x1, color: palette.warning, fontSize: typeToken.label, fontWeight: "700" },
  dialogActions: { flexDirection: "row", gap: spacing.x1, marginTop: spacing.x1 },
  secondaryButton: { flex: 1, minHeight: minimumTouchTarget, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.x1, borderRadius: radii.control, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.surface },
  secondaryButtonText: { color: palette.text, fontWeight: "700" },
  input: { minHeight: minimumTouchTarget, marginTop: spacing.x2, paddingHorizontal: 12, color: palette.text, borderWidth: 1, borderColor: palette.border, borderRadius: radii.control, backgroundColor: palette.canvas },
  profileOption: { minHeight: 68, marginTop: spacing.x1, justifyContent: "center", padding: 12, borderWidth: 1, borderColor: palette.border, borderRadius: radii.control },
  profileOptionActive: { borderColor: palette.primaryActive, backgroundColor: "#E7F0FF" },
  profileOptionTitle: { color: palette.text, fontWeight: "700" },
  profileOptionSummary: { marginTop: 4, color: palette.textSecondary, fontSize: typeToken.caption },
  loadingOverlay: { position: "absolute", left: spacing.x2, right: spacing.x2, top: "45%", minHeight: 72, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.x1, borderRadius: radii.control, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border },
  loadingText: { color: palette.text, fontWeight: "700" },
  pressed: { opacity: 0.72 },
  disabled: { opacity: 0.5 },
});
