import { Controller } from "react-hook-form";
import { createContext, useContext, useEffect, useMemo, useRef } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  equipmentKinds,
  facilityKinds,
  observerTypes,
  observingTargets,
  requirementLevels,
  travelModes,
  type PreferenceProfile,
  type RequirementLevel,
} from "@starward/domain/preferences";
import { minimumTouchTarget, radii, spacing, type as typeToken, type ColorPalette } from "@starward/ui-system/tokens";
import { useStarwardTheme } from "../../shell/useStarwardTheme";
import { useProfileEditor, type ProfileEditor } from "./use-profile-editor";
import { preferenceTargetLabels } from "./profile-target-labels";
import { observerTypeLabels } from "./observer-labels";

type WizardStyles = ReturnType<typeof createStyles>;
const WizardThemeContext = createContext<{ palette: ColorPalette; styles: WizardStyles } | null>(null);

function useWizardTheme() {
  const value = useContext(WizardThemeContext);
  if (!value) throw new Error("preference_wizard_theme_missing");
  return value;
}

const labels = {
  observer: observerTypeLabels,
  travel: { drive: "自驾", cycle: "骑行", "public-transit": "公共交通", walk: "步行" },
  target: preferenceTargetLabels,
  equipment: { "naked-eye": "裸眼", binoculars: "双筒", telescope: "天文望远镜", phone: "手机", camera: "相机", lens: "镜头", tripod: "三脚架", "equatorial-mount": "赤道仪", filter: "滤镜" },
  facility: { parking: "停车", toilet: "厕所", "mobile-signal": "手机信号", "flat-platform": "平整平台", "camping-allowed": "允许露营", "supply-store": "便利店/补给", "drinking-water": "饮用水", "safe-lighting-with-dark-observing-zone": "安全照明且观测区无明显光源" },
  requirement: { unrestricted: "未限制", preferred: "排序偏好", required: "硬性阻断" },
} as const;

function toggleItem<T extends string>(values: T[], value: T): T[] {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

function ChoiceChip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const { styles } = useWizardTheme();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={({ pressed }) => [styles.chip, selected && styles.chipSelected, pressed && styles.pressed]}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{selected ? "✓ " : ""}{label}</Text>
    </Pressable>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  const { styles } = useWizardTheme();
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      {children}
    </View>
  );
}

function BooleanRow({ label, detail, value, onValueChange }: { label: string; detail?: string; value: boolean; onValueChange: (value: boolean) => void }) {
  const { palette, styles } = useWizardTheme();
  return (
    <View style={styles.booleanRow}>
      <View style={styles.booleanCopy}>
        <Text style={styles.rowLabel}>{label}</Text>
        {detail ? <Text style={styles.hint}>{detail}</Text> : null}
      </View>
      <Switch accessibilityLabel={label} value={value} onValueChange={onValueChange} trackColor={{ false: palette.border, true: palette.primary }} />
    </View>
  );
}

function numberFromText(value: string): number | null {
  if (!value.trim()) return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

type WizardPresentationProps = {
  visible: boolean;
  onClose: () => void;
  ready?: boolean;
};
type OwnedWizardProps = WizardPresentationProps & {
  initial: PreferenceProfile;
  onSave: (profile: PreferenceProfile) => Promise<void>;
  resolveProfile?(id: string): PreferenceProfile | undefined;
};

export function PreferenceWizard(props: OwnedWizardProps | (WizardPresentationProps & { editor: ProfileEditor })) {
  return "editor" in props ? <PreferenceWizardView {...props} /> : <OwnedPreferenceWizard {...props} />;
}

function OwnedPreferenceWizard({ initial, visible, ready = true, onSave, resolveProfile, onClose }: OwnedWizardProps) {
  const editor = useProfileEditor({ initial, visible, ready, onSave, resolveProfile });
  return <PreferenceWizardView editor={editor} visible={visible} ready={ready} onClose={onClose} />;
}

/** Full fields are a view of the caller's draft, not another editor session. */
function PreferenceWizardView({ visible, editor, onClose, ready = true }: WizardPresentationProps & { editor: ProfileEditor }) {
  const { palette } = useStarwardTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const { control, submit, saveError, formState: { errors, isSubmitting } } = editor;
  const presentation = useRef(Symbol());
  useEffect(() => { presentation.current = Symbol(); }, [visible]);
  const close = () => { presentation.current = Symbol(); onClose(); };
  const save = async () => {
    const owner = presentation.current;
    const saved = await submit(undefined, () => presentation.current === owner);
    if (saved && presentation.current === owner) close();
  };

  return (
    <WizardThemeContext.Provider value={{ palette, styles }}>
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={close}>
      <SafeAreaView style={styles.modal}>
        <View style={styles.modalHeader}>
          <View>
            <Text style={styles.modalEyebrow}>推荐偏好预设</Text>
            <Text style={styles.modalTitle}>告诉我们怎样才算适合你</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="关闭偏好编辑" onPress={close} style={styles.closeButton}>
            <Text style={styles.closeText}>关闭</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.formContent} keyboardShouldPersistTaps="handled">
          {editor.sourceChanged ? <View style={styles.section}><Text style={styles.hint}>{editor.confirmsOriginalSave ? "当前预设已变化。确认上次保存不会切换当前预设。" : "当前预设已变化，原编辑内容已保留。保存后会设为当前预设。"}</Text><Pressable disabled={isSubmitting || editor.hasUnresolvedSave} onPress={editor.readCurrent}><Text style={styles.rowLabel}>放弃修改并读取当前预设</Text></Pressable></View> : null}
          <Section title="预设名称" hint="示例只用于启发，不会自动成为默认值。">
            <Controller control={control} name="name" render={({ field: { value, onChange } }) => (
              <TextInput accessibilityLabel="预设名称" value={value} onChangeText={onChange} placeholder="例如：银河摄影" placeholderTextColor={palette.textSecondary} style={styles.input} />
            )} />
            {errors.name ? <Text style={styles.errorText}>{errors.name.message}</Text> : null}
          </Section>

          <Section title="位置与出发地">
            <Controller control={control} name="city" render={({ field: { value, onChange } }) => (
              <TextInput accessibilityLabel="所在城市" value={value} onChangeText={onChange} placeholder="所在城市" placeholderTextColor={palette.textSecondary} style={styles.input} />
            )} />
            <Controller control={control} name="startingPlace" render={({ field: { value, onChange } }) => (
              <TextInput accessibilityLabel="常用出发地" value={value} onChangeText={onChange} placeholder="常用出发地" placeholderTextColor={palette.textSecondary} style={styles.input} />
            )} />
          </Section>

          <Section title="你怎样观星" hint="可多选。未选择代表不限制，不会暗中套用人群默认值。">
            <Controller control={control} name="observerTypes" render={({ field: { value, onChange } }) => (
              <View style={styles.wrap}>{observerTypes.map((item) => <ChoiceChip key={item} label={labels.observer[item]} selected={value.includes(item)} onPress={() => onChange(toggleItem(value, item))} />)}</View>
            )} />
          </Section>

          <Section title="交通方式与范围" hint="空白表示未限制；单位与边界会进入推荐解释。">
            <Controller control={control} name="travel.modes" render={({ field: { value, onChange } }) => (
              <View style={styles.wrap}>{travelModes.map((item) => <ChoiceChip key={item} label={labels.travel[item]} selected={value.includes(item)} onPress={() => onChange(toggleItem(value, item))} />)}</View>
            )} />
            <View style={styles.numberGrid}>
              <Controller control={control} name="travel.maxOneWayMinutes" render={({ field: { value, onChange } }) => <TextInput accessibilityLabel="最大单程时间（分钟）" keyboardType="numeric" value={value === null ? "" : String(value)} onChangeText={(text) => onChange(numberFromText(text))} placeholder="单程分钟" placeholderTextColor={palette.textSecondary} style={styles.numberInput} />} />
              <Controller control={control} name="travel.maxDrivingKilometers" render={({ field: { value, onChange } }) => <TextInput accessibilityLabel="最大驾车距离（公里）" keyboardType="numeric" value={value === null ? "" : String(value)} onChangeText={(text) => onChange(numberFromText(text))} placeholder="驾车公里" placeholderTextColor={palette.textSecondary} style={styles.numberInput} />} />
              <Controller control={control} name="travel.maxWalkingKilometers" render={({ field: { value, onChange } }) => <TextInput accessibilityLabel="最大徒步距离（公里）" keyboardType="numeric" value={value === null ? "" : String(value)} onChangeText={(text) => onChange(numberFromText(text))} placeholder="徒步公里" placeholderTextColor={palette.textSecondary} style={styles.numberInput} />} />
            </View>
            {([
              ["travel.directAccessRequired", "必须车辆直达", "启用后，不满足即阻断"],
              ["travel.acceptsMountainRoad", "接受山路", "仅表示意愿，路线风险仍单独判断"],
              ["travel.acceptsUnpavedRoad", "接受非铺装路", "会提高车辆与天气风险要求"],
              ["travel.acceptsNightWalking", "接受夜间徒步", "现场模式仍要求最后一公里说明"],
              ["travel.acceptsCamping", "接受露营", undefined],
              ["travel.acceptsOvernight", "接受过夜", undefined],
            ] as const).map(([name, label, detail]) => (
              <Controller key={name} control={control} name={name} render={({ field: { value, onChange } }) => <BooleanRow label={label} detail={detail} value={value} onValueChange={onChange} />} />
            ))}
          </Section>

          <Section title="设施条件" hint="点击每项在“未限制 → 排序偏好 → 硬性阻断”之间切换。">
            <Controller control={control} name="facilities" render={({ field: { value, onChange } }) => (
              <View style={styles.facilityList}>
                {facilityKinds.map((item) => {
                  const current = value[item];
                  const next = requirementLevels[(requirementLevels.indexOf(current) + 1) % requirementLevels.length] as RequirementLevel;
                  return (
                    <Pressable key={item} accessibilityRole="button" accessibilityLabel={`${labels.facility[item]}，${labels.requirement[current]}`} onPress={() => onChange({ ...value, [item]: next })} style={({ pressed }) => [styles.requirementRow, current === "required" && styles.requirementHard, pressed && styles.pressed]}>
                      <Text style={styles.rowLabel}>{labels.facility[item]}</Text>
                      <Text style={[styles.requirementValue, current === "required" && styles.requirementHardText]}>{labels.requirement[current]}</Text>
                    </Pressable>
                  );
                })}
              </View>
            )} />
          </Section>

          <Section title="观测目标">
            <Controller control={control} name="targets" render={({ field: { value, onChange } }) => (
              <View style={styles.wrap}>{observingTargets.map((item) => <ChoiceChip key={item} label={labels.target[item]} selected={value.includes(item)} onPress={() => onChange(toggleItem(value, item))} />)}</View>
            )} />
          </Section>

          <Section title="设备">
            <Controller control={control} name="equipment" render={({ field: { value, onChange } }) => (
              <View style={styles.wrap}>{equipmentKinds.map((item) => <ChoiceChip key={item} label={labels.equipment[item]} selected={value.includes(item)} onPress={() => onChange(toggleItem(value, item))} />)}</View>
            )} />
            <Controller control={control} name="lensFocalLengthsMm" render={({ field: { value, onChange } }) => (
              <TextInput accessibilityLabel="镜头焦段（毫米）" value={value.join(", ")} onChangeText={(text) => onChange(text.split(/[,，\s]+/u).map(Number).filter((item) => Number.isFinite(item) && item > 0))} placeholder="镜头焦段，例如 14, 24, 85" placeholderTextColor={palette.textSecondary} style={styles.input} />
            )} />
          </Section>

          <Section title="能力意愿" hint="这些开关只记录意愿；系统权限会在实际使用相应功能时另行请求。">
            <Controller control={control} name="willingness.continuousLocationWhenFieldSessionStarts" render={({ field: { value, onChange } }) => <BooleanRow label="现场行程开始后允许限时持续定位" detail="仅现场会话期间，结束后自动停止" value={value} onValueChange={onChange} />} />
            <Controller control={control} name="willingness.weatherAndAstronomyNotifications" render={({ field: { value, onChange } }) => <BooleanRow label="愿意接收天气与天象提醒" detail="保存不会立即弹出通知权限" value={value} onValueChange={onChange} />} />
          </Section>
        </ScrollView>
        <View style={styles.footer}>
          {saveError ? <Text testID="preference-save-error" accessibilityLiveRegion="assertive" style={styles.errorText}>{saveError}</Text> : null}
          <Pressable accessibilityRole="button" disabled={isSubmitting || !ready} onPress={() => void save()} style={({ pressed }) => [styles.primaryButton, pressed && styles.primaryPressed, (isSubmitting || !ready) && styles.disabled]}>
            <Text style={styles.primaryButtonText}>{isSubmitting ? "正在保存…" : editor.confirmsOriginalSave ? "确认上次保存" : editor.hasUnresolvedSave ? "保存新的修改" : "保存并设为当前预设"}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
    </WizardThemeContext.Provider>
  );
}

function createStyles(palette: ColorPalette) {
  return StyleSheet.create({
  modal: { flex: 1, backgroundColor: palette.canvas },
  modalHeader: { minHeight: 88, paddingHorizontal: spacing.x2, paddingVertical: spacing.x2, flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: palette.border, backgroundColor: palette.surface },
  modalEyebrow: { color: palette.primaryActive, fontSize: typeToken.label, fontWeight: "700" },
  modalTitle: { marginTop: 4, color: palette.text, fontSize: typeToken.section, fontWeight: "700" },
  closeButton: { minWidth: minimumTouchTarget, minHeight: minimumTouchTarget, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.x1 },
  closeText: { color: palette.primaryActive, fontWeight: "700" },
  formContent: { padding: spacing.x2, paddingBottom: spacing.x5 },
  section: { marginBottom: spacing.x3 },
  sectionTitle: { color: palette.text, fontSize: typeToken.section, fontWeight: "700", marginBottom: spacing.x1 },
  hint: { color: palette.textSecondary, fontSize: typeToken.label, lineHeight: 18, marginBottom: spacing.x1 },
  input: { minHeight: minimumTouchTarget, marginBottom: spacing.x1, paddingHorizontal: spacing.x2, color: palette.text, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border, borderRadius: radii.control, fontSize: typeToken.body },
  errorText: { color: palette.danger, fontSize: typeToken.label },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.x1 },
  chip: { minHeight: minimumTouchTarget, justifyContent: "center", paddingHorizontal: 14, borderRadius: radii.pill, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.surface },
  chipSelected: { borderColor: palette.anchor, backgroundColor: palette.anchor },
  chipText: { color: palette.text, fontSize: typeToken.label, fontWeight: "600" },
  chipTextSelected: { color: palette.canvas },
  pressed: { opacity: 0.72 },
  numberGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.x1, marginTop: spacing.x1 },
  numberInput: { minWidth: 110, flexGrow: 1, minHeight: minimumTouchTarget, paddingHorizontal: spacing.x1, color: palette.text, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border, borderRadius: radii.control },
  booleanRow: { minHeight: 60, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.x2, paddingVertical: spacing.x1, borderBottomWidth: 1, borderBottomColor: palette.border },
  booleanCopy: { flex: 1 },
  rowLabel: { color: palette.text, fontSize: typeToken.body, fontWeight: "600" },
  facilityList: { gap: spacing.x1 },
  requirementRow: { minHeight: minimumTouchTarget, paddingHorizontal: spacing.x2, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderRadius: radii.control, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.surface },
  requirementHard: { borderColor: palette.danger, borderStyle: "dashed", backgroundColor: palette.surface },
  requirementValue: { color: palette.textSecondary, fontSize: typeToken.label, fontWeight: "700" },
  requirementHardText: { color: palette.danger },
  footer: { padding: spacing.x2, borderTopWidth: 1, borderTopColor: palette.border, backgroundColor: palette.surface },
  primaryButton: { minHeight: 52, alignItems: "center", justifyContent: "center", borderRadius: radii.control, backgroundColor: palette.primaryActive },
  primaryPressed: { transform: [{ scale: 0.99 }], opacity: 0.9 },
  primaryButtonText: { color: palette.onPrimary, fontSize: typeToken.body, fontWeight: "700" },
  disabled: { opacity: 0.55 },
  });
}
