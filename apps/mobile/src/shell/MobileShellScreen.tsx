import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { createUnrestrictedProfile, profileImpactSummary, type PreferenceProfile } from "@starward/domain/preferences";
import { colors, minimumTouchTarget, radii, spacing, type as typeToken } from "@starward/ui-system/tokens";
import { PreferenceWizard } from "../features/preferences/PreferenceWizard";
import { expoPermissionGateway, type PermissionDecision } from "../native/permissions/permission-gateway";
import { useShellStore } from "../state/shell-store";

const palette = colors.planning;

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
    travel: {
      ...profile.travel,
      modes: ["drive"],
      maxOneWayMinutes: 120,
      maxWalkingKilometers: 0.8,
      acceptsMountainRoad: true,
      acceptsNightWalking: true,
    },
    facilities: { ...profile.facilities, parking: "preferred", "flat-platform": "required" },
    targets: ["milky-way"],
    equipment: ["camera", "lens", "tripod"],
    lensFocalLengthsMm: [14, 24],
  };
}

function PermissionDialog({
  visible,
  status,
  loading,
  onAllow,
  onManual,
  onClose,
}: {
  visible: boolean;
  status: PermissionDecision;
  loading: boolean;
  onAllow(): void;
  onManual(): void;
  onClose(): void;
}) {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View accessibilityViewIsModal style={styles.dialog}>
          <Text style={styles.eyebrow}>位置权限 · 使用时询问</Text>
          <Text style={styles.dialogTitle}>查找附近的观星条件</Text>
          <Text testID="permission-purpose" style={styles.body}>
            位置只用于计算出发距离、路线与天空方向。
          </Text>
          <View testID="permission-scope" style={styles.scopeBox}>
            <Text style={styles.cardTitle}>只请求前台位置</Text>
            <Text style={styles.meta}>不会请求永久后台定位；现场持续定位会在对应任务再次说明。</Text>
          </View>
          <Text testID="permission-denied-alternative" style={styles.alternative}>
            暂不允许仍可手动输入城市或出发地，基础查询不会被阻断。
          </Text>
          {status === "denied" ? (
            <Text accessibilityLiveRegion="polite" style={styles.error}>
              系统已拒绝；我们不会重复弹出强制请求。
            </Text>
          ) : null}
          <Pressable
            accessibilityRole="button"
            disabled={loading}
            onPress={onAllow}
            style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed, loading && styles.disabled]}
          >
            {loading ? <ActivityIndicator color={palette.onPrimary} /> : <Text style={styles.primaryButtonText}>允许使用期间定位</Text>}
          </Pressable>
          <View style={styles.actionRow}>
            <Pressable accessibilityRole="button" onPress={onManual} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>手动选择</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={onClose} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>暂不允许</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function ProfileSwitcherDialog({
  visible,
  profiles,
  activeId,
  onClose,
  onSelect,
  onCreate,
}: {
  visible: boolean;
  profiles: PreferenceProfile[];
  activeId: string;
  onClose(): void;
  onSelect(id: string): Promise<void>;
  onCreate(): void;
}) {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View accessibilityViewIsModal style={styles.dialog}>
          <Text style={styles.eyebrow}>当前推荐画像</Text>
          <Text style={styles.dialogTitle}>切换偏好预设</Text>
          {profiles.map((profile) => (
            <Pressable
              key={profile.id}
              accessibilityRole="radio"
              accessibilityState={{ selected: profile.id === activeId }}
              onPress={() => void onSelect(profile.id).then(onClose)}
              style={[styles.profileRow, profile.id === activeId && styles.profileRowSelected]}
            >
              <Text style={styles.profileRowText}>{profile.name}</Text>
              <Text style={styles.status}>{profile.id === activeId ? "当前" : "切换"}</Text>
            </Pressable>
          ))}
          <Pressable accessibilityRole="button" onPress={onCreate} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>新建预设</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={onClose} style={styles.secondaryButtonWide}>
            <Text style={styles.secondaryButtonText}>关闭</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

export function MobileShellScreen() {
  const {
    guest,
    location,
    profiles,
    activeProfileId,
    recommendationState,
    persistenceState,
    persistenceError,
    hydrateFromRuntime,
    setManualLocation,
    setDeviceLocation,
    saveProfile,
    activateProfile,
  } = useShellStore();
  const [manualLocation, setManualLocationDraft] = useState("深圳市 · 南山区");
  const [permissionVisible, setPermissionVisible] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<PermissionDecision>("undetermined");
  const [permissionLoading, setPermissionLoading] = useState(false);
  const [profileSwitcherVisible, setProfileSwitcherVisible] = useState(false);
  const [wizardVisible, setWizardVisible] = useState(false);

  useEffect(() => {
    void hydrateFromRuntime();
  }, [hydrateFromRuntime]);

  const activeProfile = useMemo(
    () => profiles.find((profile) => profile.id === activeProfileId) ?? profiles[0] ?? createUnrestrictedProfile(),
    [activeProfileId, profiles],
  );

  const saveStarterProfile = async () => {
    const existing = profiles.find((profile) => profile.id === "milky-way-photo");
    const next = makeMilkyWayProfile();
    await saveProfile({
      ...next,
      revision: (existing?.revision ?? 0) + 1,
      updatedAt: new Date().toISOString(),
    });
  };

  const requestLocation = async () => {
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
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>首次使用 · 3 / 4</Text>
          <Text style={styles.title}>把今晚变成可执行计划</Text>
          <Text style={styles.body}>权限按任务说明；不授权也能手动选择地点并有限使用。</Text>
        </View>
        <View testID="shell-guest-state" style={styles.guestPill}>
          <Text style={styles.guestText}>{guest ? "本机游客" : "已登录"}</Text>
        </View>
      </View>

      <View
        testID="shell-persistence-state"
        accessibilityLiveRegion="polite"
        style={[styles.persistence, persistenceState === "error" && styles.persistenceError]}
      >
        <Text style={styles.persistenceText}>
          {persistenceState === "loading"
            ? "正在恢复本机设置…"
            : persistenceState === "saving"
              ? "正在写入本机数据库…"
              : persistenceState === "error"
                ? persistenceError
                : "本机设置已同步"}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View
          testID="permission-step"
          accessible
          accessibilityLabel="位置权限步骤，可允许使用期间定位或手动选择"
          style={styles.card}
        >
          <View style={styles.cardHeading}>
            <Text style={styles.cardTitle}>位置权限</Text>
            <Text style={styles.status}>可随时更改</Text>
          </View>
          <Text style={styles.body}>用于计算出发距离、路线与天空方向。拒绝后仍可手动输入城市或坐标。</Text>
          <Pressable
            testID="shell-open-permission-feature"
            accessibilityRole="button"
            onPress={() => setPermissionVisible(true)}
            style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
          >
            <Text style={styles.primaryButtonText}>允许使用期间定位</Text>
          </Pressable>
          <TextInput
            testID="shell-manual-location-input"
            accessibilityLabel="手动位置"
            value={manualLocation}
            onChangeText={setManualLocationDraft}
            placeholder="城市或出发地"
            placeholderTextColor={palette.textSecondary}
            style={styles.input}
          />
          <Pressable
            testID="shell-set-manual-location"
            accessibilityRole="button"
            disabled={!manualLocation.trim() || persistenceState === "saving"}
            onPress={() => void setManualLocation(manualLocation.trim())}
            style={({ pressed }) => [styles.secondaryButtonWide, pressed && styles.pressed, !manualLocation.trim() && styles.disabled]}
          >
            <Text style={styles.secondaryButtonText}>使用这个手动位置</Text>
          </Pressable>
          <View style={styles.evidenceRow}>
            <Text testID="shell-location-label" style={styles.evidenceValue}>{location.label}</Text>
            <Text testID="shell-location-source" style={styles.status}>
              {location.source === "manual" ? "手动位置" : location.source === "device" ? "设备前台位置" : "未设置"}
            </Text>
          </View>
        </View>

        <View
          testID="preference-wizard"
          accessible
          accessibilityLabel="观测偏好向导，本机保存"
          style={styles.card}
        >
          <View style={styles.cardHeading}>
            <Text style={styles.cardTitle}>观测偏好</Text>
            <Text style={styles.status}>本机保存</Text>
          </View>
          <Text style={styles.body}>目标、交通与设施要求都会进入排序解释；未选择代表不限制。</Text>
          <Pressable accessibilityRole="button" onPress={() => setWizardVisible(true)} style={styles.secondaryButtonWide}>
            <Text style={styles.secondaryButtonText}>编辑完整偏好</Text>
          </Pressable>
          <Pressable
            testID="shell-switch-profile"
            accessibilityRole="button"
            onPress={() => void saveStarterProfile()}
            style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
          >
            <Text style={styles.primaryButtonText}>保存并切换银河摄影预设</Text>
          </Pressable>
          <View testID="preference-ranking-impact" accessibilityLiveRegion="polite">
            <Text style={styles.meta}>
              {recommendationState === "stale" ? "推荐正在按新预设重算；旧结果已标记缓存。" : "当前预设会影响排序与硬性阻断。"}
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeading}>
            <Text style={styles.cardTitle}>使用身份</Text>
            <Text style={styles.status}>游客数据在本机</Text>
          </View>
          <Pressable
            testID="profile-switcher"
            accessibilityRole="button"
            accessibilityLabel={`档案切换器，当前 ${activeProfile.name}`}
            accessibilityHint="切换当前推荐画像"
            accessibilityState={{ selected: true }}
            onPress={() => setProfileSwitcherVisible(true)}
            style={({ pressed }) => [styles.profileRow, styles.profileRowSelected, pressed && styles.pressed]}
          >
            <Text testID="preference-active-profile" style={styles.profileRowText}>{activeProfile.name}</Text>
            <Text testID="preference-saved-state" style={styles.status}>
              {activeProfile.id === "base" ? "基础模式 · 未限制" : "已保存 · 当前使用"}
            </Text>
          </Pressable>
          <Text style={styles.body}>{profileImpactSummary(activeProfile)}</Text>
          {profiles.filter((profile) => profile.id !== activeProfileId).map((profile) => (
            <Pressable
              key={profile.id}
              accessibilityRole="radio"
              accessibilityState={{ selected: false }}
              onPress={() => void activateProfile(profile.id)}
              style={styles.profileRow}
            >
              <Text style={styles.profileRowText}>{profile.name}</Text>
              <Text style={styles.status}>切换</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <PermissionDialog
        visible={permissionVisible}
        status={permissionStatus}
        loading={permissionLoading}
        onAllow={() => void requestLocation()}
        onManual={() => setPermissionVisible(false)}
        onClose={() => setPermissionVisible(false)}
      />
      <ProfileSwitcherDialog
        visible={profileSwitcherVisible}
        profiles={profiles}
        activeId={activeProfileId}
        onClose={() => setProfileSwitcherVisible(false)}
        onSelect={activateProfile}
        onCreate={() => {
          setProfileSwitcherVisible(false);
          setWizardVisible(true);
        }}
      />
      <PreferenceWizard
        visible={wizardVisible}
        initial={activeProfile}
        onClose={() => setWizardVisible(false)}
        onSave={saveProfile}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.canvas },
  header: {
    paddingHorizontal: spacing.x2,
    paddingVertical: spacing.x2,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.x2,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
    backgroundColor: palette.surface,
  },
  headerCopy: { flex: 1 },
  eyebrow: { color: palette.primaryActive, fontSize: typeToken.label, fontWeight: "700", letterSpacing: 0.4 },
  title: { marginTop: 4, color: palette.text, fontSize: typeToken.title, lineHeight: 31, fontWeight: "700" },
  body: { marginTop: 6, color: palette.textSecondary, fontSize: typeToken.label, lineHeight: 20 },
  guestPill: { minHeight: 32, justifyContent: "center", paddingHorizontal: 10, borderRadius: radii.pill, backgroundColor: palette.surfaceMuted },
  guestText: { color: palette.textSecondary, fontSize: typeToken.caption, fontWeight: "700" },
  persistence: { minHeight: 28, justifyContent: "center", paddingHorizontal: spacing.x2, backgroundColor: palette.surfaceMuted },
  persistenceError: { backgroundColor: "#FFF1F0" },
  persistenceText: { color: palette.textSecondary, fontSize: typeToken.caption, fontWeight: "600" },
  content: { padding: spacing.x2, paddingBottom: spacing.x3, gap: spacing.x2 },
  card: { minHeight: minimumTouchTarget, padding: spacing.x2, borderWidth: 1, borderColor: palette.border, borderRadius: radii.layer, backgroundColor: palette.surface },
  cardHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.x1 },
  cardTitle: { flex: 1, color: palette.text, fontSize: typeToken.section, fontWeight: "700" },
  status: { color: palette.primaryActive, fontSize: typeToken.caption, fontWeight: "700" },
  primaryButton: { minHeight: 52, marginTop: spacing.x2, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.x2, borderRadius: radii.control, backgroundColor: palette.primaryActive },
  primaryButtonText: { color: palette.onPrimary, fontSize: typeToken.body, fontWeight: "700" },
  input: { minHeight: minimumTouchTarget, marginTop: spacing.x1, paddingHorizontal: 12, color: palette.text, borderWidth: 1, borderColor: palette.border, borderRadius: radii.control, backgroundColor: palette.canvas },
  secondaryButtonWide: { minHeight: minimumTouchTarget, marginTop: spacing.x1, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.x2, borderWidth: 1, borderColor: palette.border, borderRadius: radii.control, backgroundColor: palette.surface },
  secondaryButtonText: { color: palette.text, fontWeight: "700" },
  evidenceRow: { minHeight: minimumTouchTarget, marginTop: spacing.x1, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.x1 },
  evidenceValue: { flex: 1, color: palette.text, fontWeight: "700" },
  meta: { marginTop: 6, color: palette.textSecondary, fontSize: typeToken.caption, lineHeight: 18 },
  profileName: { marginTop: spacing.x1, color: palette.text, fontSize: typeToken.body, fontWeight: "700" },
  profileRow: { minHeight: minimumTouchTarget, marginTop: spacing.x1, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12, borderWidth: 1, borderColor: palette.border, borderRadius: radii.control },
  profileRowSelected: { borderColor: palette.primaryActive, backgroundColor: "#E7F0FF" },
  profileRowText: { color: palette.text, fontWeight: "700" },
  backdrop: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.x2, backgroundColor: "rgba(7, 19, 33, 0.58)" },
  dialog: { width: "100%", maxWidth: 420, padding: spacing.x2, borderRadius: radii.layer, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.surface },
  dialogTitle: { marginTop: 6, color: palette.text, fontSize: typeToken.section, fontWeight: "700" },
  scopeBox: { marginTop: spacing.x2, padding: 12, borderRadius: radii.control, backgroundColor: palette.surfaceMuted },
  alternative: { marginTop: spacing.x2, color: palette.text, fontSize: typeToken.label, lineHeight: 20 },
  error: { marginTop: spacing.x1, color: palette.danger, fontSize: typeToken.label, fontWeight: "700" },
  actionRow: { flexDirection: "row", gap: spacing.x1, marginTop: spacing.x1 },
  secondaryButton: { flex: 1, minHeight: minimumTouchTarget, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.x1, borderWidth: 1, borderColor: palette.border, borderRadius: radii.control, backgroundColor: palette.surface },
  pressed: { opacity: 0.72 },
  disabled: { opacity: 0.5 },
});
