import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { useTabRestorationEvidence } from "./TabRestorationEvidence";
import {
  useDesignControlEvidence,
  useDesignScenarioEvidence,
} from "./DesignControlEvidence";
import {
  createUnrestrictedProfile,
  profileImpactSummary,
  type ObservingTarget,
  type PreferenceProfile,
} from "@starward/domain/preferences";
import {
  minimumTouchTarget,
  radii,
  spacing,
  type as typeToken,
  type ColorPalette,
} from "@starward/ui-system/tokens";
import { PreferenceWizard } from "../features/preferences/PreferenceWizard";
import { expoPermissionGateway, type PermissionDecision } from "../native/permissions/permission-gateway";
import { useShellStore } from "../state/shell-store";
import { useStarwardTheme } from "./useStarwardTheme";

type QuickTarget = Extract<ObservingTarget, "milky-way" | "planets" | "meteor-shower">;
type WalkingChoice = 0 | 0.8 | 2;
type ShellStyles = ReturnType<typeof createStyles>;

const targetOptions: Array<{ value: QuickTarget; label: string }> = [
  { value: "milky-way", label: "银河" },
  { value: "planets", label: "行星" },
  { value: "meteor-shower", label: "流星" },
];

const walkingOptions: Array<{ value: WalkingChoice; label: string }> = [
  { value: 0, label: "不步行" },
  { value: 0.8, label: "≤ 800 m" },
  { value: 2, label: "≤ 2 km" },
];

function makeQuickProfile(target: QuickTarget, maxWalkingKilometers: WalkingChoice, previous?: PreferenceProfile): PreferenceProfile {
  const now = new Date().toISOString();
  const base = createUnrestrictedProfile(now);
  return {
    ...base,
    id: "quick-observing-profile",
    name: target === "milky-way" ? "银河优先" : target === "planets" ? "行星优先" : "流星优先",
    revision: (previous?.revision ?? 0) + 1,
    updatedAt: now,
    observerTypes: target === "milky-way" ? ["astrophotographer"] : ["visual-observer"],
    travel: {
      ...base.travel,
      modes: ["drive"],
      maxWalkingKilometers,
      directAccessRequired: maxWalkingKilometers === 0,
    },
    targets: [target],
    equipment: target === "milky-way" ? ["camera", "lens", "tripod"] : ["naked-eye"],
    lensFocalLengthsMm: target === "milky-way" ? [14, 24] : [],
  };
}

function ContextHeader({ styles, palette }: { styles: ShellStyles; palette: ColorPalette }) {
  const location = useShellStore((state) => state.location);
  const decisionContext = useShellStore((state) => state.decisionContext);
  const recommendationState = useShellStore((state) => state.recommendationState);
  return (
    <View style={styles.contextHeader}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="返回我的"
        hitSlop={4}
        onPress={() => router.canGoBack() ? router.back() : router.replace("/me")}
        style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
      >
        <Svg width={20} height={20} viewBox="0 0 24 24">
          <Path d="m15 18-6-6 6-6" fill="none" stroke={palette.text} strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
        </Svg>
      </Pressable>
      <View style={styles.contextCopy}>
        <Text numberOfLines={1} style={styles.contextTitle}>
          {location.source === "unset" ? "尚未选择地点 · 偏好设置" : `${location.label} · 偏好设置`}
        </Text>
        <Text numberOfLines={1} style={styles.contextMeta}>
          r{decisionContext.revision} · 当前任务上下文保持
        </Text>
      </View>
      <View style={styles.freshnessBadge}>
        <Text style={styles.freshnessText}>{recommendationState === "ready" ? "LOCAL" : recommendationState.toUpperCase()}</Text>
      </View>
    </View>
  );
}

function PermissionDialog({
  visible,
  status,
  loading,
  styles,
  palette,
  onAllow,
  onManual,
  onClose,
}: {
  visible: boolean;
  status: PermissionDecision;
  loading: boolean;
  styles: ShellStyles;
  palette: ColorPalette;
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
            <Text style={styles.moduleTitle}>只请求前台位置</Text>
            <Text style={styles.meta}>不会请求永久后台定位；现场持续定位会在对应任务再次说明。</Text>
          </View>
          <Text testID="permission-denied-alternative" style={styles.alternative}>
            暂不允许仍可手动输入城市或出发地，基础查询不会被阻断。
          </Text>
          {status === "denied" ? (
            <Text accessibilityLiveRegion="polite" style={styles.error}>
              系统已拒绝；不会重复强迫授权。你可以继续使用手动地点。
            </Text>
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ busy: loading, disabled: loading }}
            disabled={loading}
            onPress={onAllow}
            style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed, loading && styles.disabled]}
          >
            {loading
              ? <ActivityIndicator color={palette.onPrimary} />
              : <Text style={styles.primaryButtonText}>允许使用期间定位</Text>}
          </Pressable>
          <View style={styles.dialogActions}>
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
  styles,
  onClose,
  onSelect,
  onCreate,
}: {
  visible: boolean;
  profiles: PreferenceProfile[];
  activeId: string;
  styles: ShellStyles;
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
          <View style={styles.dialogList}>
            {profiles.map((profile) => (
              <Pressable
                key={profile.id}
                accessibilityRole="radio"
                accessibilityState={{ selected: profile.id === activeId }}
                onPress={() => void onSelect(profile.id).then(onClose)}
                style={({ pressed }) => [
                  styles.dialogListRow,
                  profile.id === activeId && styles.selectedRow,
                  pressed && styles.pressed,
                ]}
              >
                <View style={styles.listCopy}>
                  <Text style={styles.listTitle}>{profile.name}</Text>
                  <Text style={styles.listMeta}>{profileImpactSummary(profile)}</Text>
                </View>
                <Text style={styles.rowAction}>{profile.id === activeId ? "当前" : "切换"}</Text>
              </Pressable>
            ))}
          </View>
          <Pressable accessibilityRole="button" onPress={onCreate} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>新建完整预设</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={onClose} style={styles.secondaryButtonWide}>
            <Text style={styles.secondaryButtonText}>关闭</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function choiceStyle(pressed: boolean, selected: boolean, styles: ShellStyles): ViewStyle[] {
  return [styles.choice, selected ? styles.choiceSelected : styles.choiceDefault, pressed ? styles.pressed : styles.released];
}

export function MobileShellScreen() {
  const permissionEvidence = useDesignControlEvidence("permission-step");
  const preferenceEvidence = useDesignControlEvidence("preference-wizard");
  const profileEvidence = useDesignControlEvidence("profile-switcher");
  const permissionScenario = useDesignScenarioEvidence("permission-step");
  const preferenceScenario = useDesignScenarioEvidence("preference-wizard");
  const profileScenario = useDesignScenarioEvidence("profile-switcher");
  const restoration = useTabRestorationEvidence({
    testID: "tab-restoration-me",
    tabId: "primary-tab-profile",
    rootRoute: "/me",
    nestedRoute: "/onboarding-preferences",
    ownerType: "scroll",
    ownerId: "me-preferences-scroll-owner",
  });
  const { palette } = useStarwardTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
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
  const [manualEditorVisible, setManualEditorVisible] = useState(false);
  const [permissionVisible, setPermissionVisible] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<PermissionDecision>("undetermined");
  const [permissionLoading, setPermissionLoading] = useState(false);
  const [profileSwitcherVisible, setProfileSwitcherVisible] = useState(false);
  const [wizardVisible, setWizardVisible] = useState(false);
  const [quickTarget, setQuickTarget] = useState<QuickTarget>("milky-way");
  const [walking, setWalking] = useState<WalkingChoice>(0.8);

  useEffect(() => {
    void hydrateFromRuntime();
  }, [hydrateFromRuntime]);

  const activeProfile = useMemo(
    () => profiles.find((profile) => profile.id === activeProfileId) ?? profiles[0] ?? createUnrestrictedProfile(),
    [activeProfileId, profiles],
  );
  const manualVisible = manualEditorVisible || location.source === "manual";
  const persistenceLabel = persistenceState === "loading"
    ? "正在恢复"
    : persistenceState === "saving"
      ? "正在保存"
      : persistenceState === "error"
        ? "保存失败"
        : "本机保存";

  const saveQuickProfile = async () => {
    const previous = profiles.find((profile) => profile.id === "quick-observing-profile");
    await saveProfile(makeQuickProfile(quickTarget, walking, previous));
  };

  const chooseManualLocation = async () => {
    setManualEditorVisible(true);
    if (manualLocation.trim()) await setManualLocation(manualLocation.trim());
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
      <ContextHeader styles={styles} palette={palette} />
      <ScrollView
        onScroll={restoration.onScroll}
        scrollEventThrottle={restoration.scrollEventThrottle}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {restoration.evidence}
        <View style={styles.pageHead}>
          <Text testID={persistenceState === "ready" ? "me-preferences-ready" : undefined} style={styles.eyebrow}>首次使用 · 3 / 4</Text>
          <Text style={styles.pageTitle}>把今晚变成可执行计划</Text>
          <Text style={styles.pageSubtitle}>权限按任务说明；不授权也能手动选择地点与有限使用。</Text>
        </View>

        <View
          testID="permission-step"
          collapsable={false}
          accessibilityLabel={`位置权限步骤，可允许使用期间定位或手动选择${permissionEvidence.accessibilityLabelSuffix}`}
          accessibilityState={permissionEvidence.accessibilityState}
          style={[styles.boxModule, permissionEvidence.style]}
        >
          {permissionEvidence.evidence}
          <View style={styles.moduleHeading}>
            <Text style={styles.moduleTitle}>位置权限</Text>
            <Text style={styles.moduleMeta}>可随时更改</Text>
          </View>
          <Text style={styles.moduleBody}>用于计算出发距离、路线与天空方向。拒绝后仍可手动输入城市或坐标。</Text>
          <View style={styles.twoColumns}>
            <Pressable
              testID="shell-open-permission-feature"
              accessibilityRole="button"
              accessibilityLabel="允许使用期间定位"
              onPress={() => setPermissionVisible(true)}
              style={({ pressed }) => [styles.strongButton, pressed && styles.pressed]}
            >
              <Text style={styles.strongButtonText}>允许使用期间</Text>
            </Pressable>
            <Pressable
              testID="shell-set-manual-location"
              accessibilityRole="button"
              accessibilityLabel="手动选择位置"
              accessibilityState={{ busy: persistenceState === "saving" }}
              disabled={persistenceState === "saving"}
              onPress={() => void chooseManualLocation()}
              style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed, persistenceState === "saving" && styles.disabled]}
            >
              <Text style={styles.secondaryButtonText}>手动选择</Text>
            </Pressable>
          </View>
          {permissionScenario.action(chooseManualLocation)}
          {permissionScenario.result}
          {manualVisible ? (
            <View style={styles.manualEditor}>
              <TextInput
                testID="shell-manual-location-input"
                accessibilityLabel="手动位置"
                value={manualLocation}
                onChangeText={setManualLocationDraft}
                onSubmitEditing={() => void chooseManualLocation()}
                placeholder="城市或出发地"
                placeholderTextColor={palette.textSecondary}
                returnKeyType="done"
                style={styles.input}
              />
              <View style={styles.locationResult}>
                <Text testID="shell-location-label" style={styles.locationValue}>{location.label}</Text>
                <Text testID="shell-location-source" style={styles.rowAction}>
                  {location.source === "manual" ? "手动位置" : location.source === "device" ? "设备前台位置" : "未设置"}
                </Text>
              </View>
            </View>
          ) : null}
        </View>

        <View
          testID="preference-wizard"
          collapsable={false}
          accessibilityLabel={`观测偏好向导，本机保存${preferenceEvidence.accessibilityLabelSuffix}`}
          accessibilityState={preferenceEvidence.accessibilityState}
          style={[styles.boxModule, preferenceEvidence.style]}
        >
          {preferenceEvidence.evidence}
          <View style={styles.moduleHeading}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="编辑完整观测偏好"
              accessibilityHint="打开完整偏好字段"
              hitSlop={4}
              onPress={() => setWizardVisible(true)}
            >
              <Text style={styles.moduleTitle}>观测偏好</Text>
            </Pressable>
            <Text style={styles.moduleMeta}>{persistenceLabel}</Text>
          </View>
          <View style={styles.preferenceStack}>
            <View>
              <Text style={styles.fieldLabel}>今晚主要目标</Text>
              <View style={styles.choiceRow}>
                {targetOptions.map((option) => (
                  <Pressable
                    key={option.value}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: quickTarget === option.value }}
                    onPress={() => setQuickTarget(option.value)}
                    style={({ pressed }) => choiceStyle(pressed, quickTarget === option.value, styles)}
                  >
                    <Text style={[styles.choiceText, quickTarget === option.value && styles.choiceTextSelected]}>{option.label}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
            <View>
              <Text style={styles.fieldLabel}>步行容忍度</Text>
              <View style={styles.segmented}>
                {walkingOptions.map((option) => (
                  <Pressable
                    key={option.value}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: walking === option.value }}
                    onPress={() => setWalking(option.value)}
                    style={({ pressed }) => [
                      styles.segmentOption,
                      walking === option.value && styles.segmentSelected,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text style={[styles.segmentText, walking === option.value && styles.segmentTextSelected]}>{option.label}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
            <Pressable
              testID="shell-switch-profile"
              accessibilityRole="button"
              accessibilityState={{ busy: persistenceState === "saving" }}
              disabled={persistenceState === "saving"}
              onPress={() => void saveQuickProfile()}
              style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed, persistenceState === "saving" && styles.disabled]}
            >
              {persistenceState === "saving"
                ? <ActivityIndicator color={palette.onPrimary} />
                : <Text style={styles.primaryButtonText}>保存偏好</Text>}
            </Pressable>
            {preferenceScenario.action(saveQuickProfile)}
            {preferenceScenario.result}
            <Text testID="preference-ranking-impact" accessibilityLiveRegion="polite" style={styles.meta}>
              {recommendationState === "stale"
                ? "推荐正在按新预设重算；旧结果已标记 stale。"
                : persistenceState === "error"
                  ? persistenceError ?? "偏好保存失败；输入仍保留。"
                  : "未选择的完整字段保持“不限制”，不会静默套用样例默认值。"}
            </Text>
          </View>
        </View>

        <View style={styles.identityModule}>
          <View style={styles.moduleHeading}>
            <Text style={styles.moduleTitle}>使用身份</Text>
            <Text style={styles.moduleMeta}>游客数据在本机</Text>
          </View>
          <View style={styles.list}>
            <Pressable
              testID="profile-switcher"
              accessibilityRole="button"
              accessibilityLabel={`档案切换器，当前 ${activeProfile.name}${profileEvidence.accessibilityLabelSuffix}`}
              accessibilityHint="切换当前推荐画像"
              accessibilityState={{
                selected: true,
                busy: persistenceState === "loading",
                ...profileEvidence.accessibilityState,
              }}
              onPress={() => setProfileSwitcherVisible(true)}
              style={({ pressed }) => [styles.listRow, profileEvidence.style, pressed && styles.pressed]}
            >
              {profileEvidence.evidence}
              <View style={styles.listCopy}>
                <Text testID="shell-guest-state" style={styles.listTitle}>{guest ? "本机游客" : activeProfile.name}</Text>
                <Text testID="preference-active-profile" style={styles.listMeta}>
                  {activeProfile.name} · {activeProfile.id === "base" ? "未设置限制" : "用于当前推荐"}
                </Text>
              </View>
              <View style={styles.currentBadge}>
                <Text testID="preference-saved-state" style={styles.currentBadgeText}>
                  {activeProfile.id === "base" ? "当前" : "已保存 · 当前"}
                </Text>
              </View>
            </Pressable>
            {profileScenario.action(() => activateProfile(activeProfile.id))}
            {profileScenario.result}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="预览档案切换与游客数据合并范围"
              onPress={() => setProfileSwitcherVisible(true)}
              style={({ pressed }) => [styles.listRow, pressed && styles.pressed]}
            >
              <View style={styles.listCopy}>
                <Text style={styles.listTitle}>档案与预设</Text>
                <Text style={styles.listMeta}>{profiles.length} 套本机预设 · 切换前保留旧推荐直到重算</Text>
              </View>
              <Svg width={20} height={20} viewBox="0 0 24 24">
                <Path d="m9 18 6-6-6-6" fill="none" stroke={palette.text} strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} />
              </Svg>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      <PermissionDialog
        visible={permissionVisible}
        status={permissionStatus}
        loading={permissionLoading}
        styles={styles}
        palette={palette}
        onAllow={() => void requestLocation()}
        onManual={() => {
          setPermissionVisible(false);
          void chooseManualLocation();
        }}
        onClose={() => setPermissionVisible(false)}
      />
      <ProfileSwitcherDialog
        visible={profileSwitcherVisible}
        profiles={profiles}
        activeId={activeProfileId}
        styles={styles}
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

function createStyles(palette: ColorPalette) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: palette.canvas },
    contextHeader: {
      height: 52,
      paddingHorizontal: spacing.sm,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs,
      borderBottomWidth: 1,
      borderBottomColor: palette.border,
      backgroundColor: palette.canvas,
    },
    backButton: {
      width: minimumTouchTarget,
      height: minimumTouchTarget,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: radii.control,
    },
    contextCopy: { flex: 1, minWidth: 0 },
    contextTitle: { color: palette.text, fontSize: 13, lineHeight: 17, fontWeight: "700" },
    contextMeta: {
      color: palette.textSecondary,
      fontFamily: typeToken.mono,
      fontSize: 10,
      lineHeight: 14,
    },
    freshnessBadge: {
      paddingHorizontal: 6,
      paddingVertical: 5,
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: radii.control,
    },
    freshnessText: {
      color: palette.text,
      fontFamily: typeToken.mono,
      fontSize: 9,
      lineHeight: 12,
      fontWeight: "700",
    },
    content: { paddingBottom: spacing.lg },
    pageHead: { paddingHorizontal: 18, paddingTop: 18, paddingBottom: spacing.sm },
    eyebrow: {
      marginBottom: 6,
      color: palette.textSecondary,
      fontFamily: typeToken.mono,
      fontSize: 10,
      lineHeight: 14,
      fontWeight: "700",
      letterSpacing: 0.8,
    },
    pageTitle: {
      color: palette.text,
      fontFamily: typeToken.family,
      fontSize: typeToken.title,
      lineHeight: typeToken.titleLineHeight,
      fontWeight: "700",
      letterSpacing: -0.22,
    },
    pageSubtitle: {
      marginTop: spacing.xs,
      color: palette.textSecondary,
      fontSize: 13,
      lineHeight: 19,
    },
    boxModule: {
      marginHorizontal: 18,
      marginBottom: spacing.sm,
      padding: spacing.sm,
      gap: spacing.xs,
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: radii.control,
      backgroundColor: palette.surface,
    },
    identityModule: {
      marginHorizontal: 18,
      paddingTop: 14,
      borderTopWidth: 1,
      borderTopColor: palette.border,
    },
    moduleHeading: {
      minHeight: 24,
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: spacing.xs,
    },
    moduleTitle: {
      color: palette.text,
      fontFamily: typeToken.family,
      fontSize: 18,
      lineHeight: 23,
      fontWeight: "700",
    },
    moduleMeta: {
      color: palette.textSecondary,
      fontFamily: typeToken.mono,
      fontSize: 10,
      lineHeight: 15,
    },
    moduleBody: { color: palette.text, fontSize: typeToken.body, lineHeight: typeToken.bodyLineHeight },
    twoColumns: { flexDirection: "row", gap: spacing.xs },
    strongButton: {
      flex: 1,
      minHeight: minimumTouchTarget,
      paddingHorizontal: spacing.sm,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: palette.anchor,
      borderRadius: radii.control,
      backgroundColor: palette.anchor,
    },
    strongButtonText: { color: palette.canvas, fontSize: typeToken.label, lineHeight: typeToken.labelLineHeight, fontWeight: "700" },
    secondaryButton: {
      flex: 1,
      minHeight: minimumTouchTarget,
      paddingHorizontal: spacing.sm,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: radii.control,
      backgroundColor: palette.canvas,
    },
    secondaryButtonWide: {
      minHeight: minimumTouchTarget,
      marginTop: spacing.xs,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: spacing.sm,
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: radii.control,
      backgroundColor: palette.canvas,
    },
    secondaryButtonText: { color: palette.text, fontSize: typeToken.label, lineHeight: typeToken.labelLineHeight, fontWeight: "700" },
    manualEditor: { gap: spacing.xs, paddingTop: spacing.xxs, borderTopWidth: 1, borderTopColor: palette.border },
    input: {
      minHeight: minimumTouchTarget,
      paddingHorizontal: 11,
      color: palette.text,
      fontSize: typeToken.body,
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: radii.control,
      backgroundColor: palette.canvas,
    },
    locationResult: {
      minHeight: minimumTouchTarget,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing.xs,
    },
    locationValue: { flex: 1, color: palette.text, fontSize: typeToken.body, fontWeight: "700" },
    preferenceStack: { gap: 10 },
    fieldLabel: {
      marginBottom: 5,
      color: palette.textSecondary,
      fontFamily: typeToken.mono,
      fontSize: typeToken.caption,
      lineHeight: typeToken.captionLineHeight,
    },
    choiceRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
    choice: {
      minWidth: minimumTouchTarget,
      minHeight: minimumTouchTarget,
      paddingHorizontal: 11,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderRadius: radii.control,
    },
    choiceDefault: { borderColor: palette.border, backgroundColor: palette.canvas },
    choiceSelected: { borderColor: palette.anchor, backgroundColor: palette.anchor },
    choiceText: { color: palette.text, fontSize: typeToken.label, lineHeight: typeToken.labelLineHeight },
    choiceTextSelected: { color: palette.canvas, fontWeight: "700" },
    segmented: {
      padding: 3,
      flexDirection: "row",
      gap: 2,
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: radii.control,
      backgroundColor: palette.surface,
    },
    segmentOption: {
      flex: 1,
      minHeight: minimumTouchTarget,
      paddingHorizontal: spacing.xs,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 6,
    },
    segmentSelected: { backgroundColor: palette.anchor },
    segmentText: { color: palette.text, fontSize: typeToken.label, lineHeight: typeToken.labelLineHeight },
    segmentTextSelected: { color: palette.canvas, fontWeight: "700" },
    primaryButton: {
      minHeight: minimumTouchTarget,
      paddingHorizontal: spacing.sm,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: palette.primaryActive,
      borderRadius: radii.control,
      backgroundColor: palette.primaryActive,
    },
    primaryButtonText: {
      color: palette.onPrimary,
      fontSize: typeToken.label,
      lineHeight: typeToken.labelLineHeight,
      fontWeight: "700",
    },
    meta: {
      color: palette.textSecondary,
      fontFamily: typeToken.mono,
      fontSize: typeToken.caption,
      lineHeight: typeToken.captionLineHeight,
    },
    list: { borderTopWidth: 1, borderTopColor: palette.border },
    listRow: {
      minHeight: 52,
      paddingVertical: 9,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      borderBottomWidth: 1,
      borderBottomColor: palette.border,
    },
    listCopy: { flex: 1, minWidth: 0 },
    listTitle: { color: palette.text, fontSize: 13, lineHeight: 18, fontWeight: "700" },
    listMeta: { marginTop: 2, color: palette.textSecondary, fontSize: typeToken.caption, lineHeight: typeToken.captionLineHeight },
    rowAction: {
      color: palette.textSecondary,
      fontFamily: typeToken.mono,
      fontSize: typeToken.caption,
      lineHeight: typeToken.captionLineHeight,
      fontWeight: "700",
    },
    currentBadge: {
      paddingHorizontal: spacing.xs,
      paddingVertical: 5,
      borderRadius: radii.pill,
      backgroundColor: palette.anchor,
    },
    currentBadgeText: { color: palette.canvas, fontSize: 10, lineHeight: 13, fontWeight: "700" },
    backdrop: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.md, backgroundColor: "rgba(0,0,0,0.56)" },
    dialog: {
      width: "100%",
      maxWidth: 420,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: radii.layer,
      backgroundColor: palette.canvas,
    },
    dialogTitle: {
      marginTop: 6,
      color: palette.text,
      fontSize: typeToken.title,
      lineHeight: typeToken.titleLineHeight,
      fontWeight: "700",
    },
    body: { marginTop: spacing.xs, color: palette.textSecondary, fontSize: typeToken.body, lineHeight: typeToken.bodyLineHeight },
    scopeBox: { marginTop: spacing.md, padding: spacing.sm, borderRadius: radii.control, backgroundColor: palette.surface },
    alternative: { marginTop: spacing.md, color: palette.text, fontSize: typeToken.body, lineHeight: typeToken.bodyLineHeight },
    error: { marginTop: spacing.xs, color: palette.danger, fontSize: typeToken.label, lineHeight: typeToken.labelLineHeight, fontWeight: "700" },
    dialogActions: { marginTop: spacing.xs, flexDirection: "row", gap: spacing.xs },
    dialogList: { marginTop: spacing.sm, borderTopWidth: 1, borderTopColor: palette.border },
    dialogListRow: {
      minHeight: 52,
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.xs,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs,
      borderBottomWidth: 1,
      borderBottomColor: palette.border,
    },
    selectedRow: { backgroundColor: palette.surface },
    pressed: { opacity: 0.76, transform: [{ scale: 0.98 }] },
    released: { opacity: 1, transform: [{ scale: 1 }] },
    disabled: { opacity: 0.5 },
  });
}
