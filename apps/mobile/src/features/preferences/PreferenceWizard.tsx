import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { useState } from "react";
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
import { colors, minimumTouchTarget, radii, spacing, type as typeToken } from "@starward/ui-system/tokens";
import { preferenceProfileSchema } from "./profile-schema";

const palette = colors.planning;

const labels = {
  observer: { beginner: "新手观星", astrophotographer: "星空摄影", "visual-observer": "目视观测", camping: "露营观星", family: "亲子观星" },
  travel: { drive: "自驾", cycle: "骑行", "public-transit": "公共交通", walk: "步行" },
  target: { stars: "普通星空", "milky-way": "银河", moon: "月亮", planets: "行星", "meteor-shower": "流星雨", comet: "彗星", "space-station": "空间站", "deep-sky": "深空目标", "sunrise-sunset-composite": "日出/日落联合摄影" },
  equipment: { "naked-eye": "裸眼", binoculars: "双筒", telescope: "天文望远镜", phone: "手机", camera: "相机", lens: "镜头", tripod: "三脚架", "equatorial-mount": "赤道仪", filter: "滤镜" },
  facility: { parking: "停车", toilet: "厕所", "mobile-signal": "手机信号", "flat-platform": "平整平台", "camping-allowed": "允许露营", "supply-store": "便利店/补给", "drinking-water": "饮用水", "safe-lighting-with-dark-observing-zone": "安全照明且观测区无明显光源" },
  requirement: { unrestricted: "未限制", preferred: "排序偏好", required: "硬性阻断" },
} as const;

function toggleItem<T extends string>(values: T[], value: T): T[] {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

function ChoiceChip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
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
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      {children}
    </View>
  );
}

function BooleanRow({ label, detail, value, onValueChange }: { label: string; detail?: string; value: boolean; onValueChange: (value: boolean) => void }) {
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

export function PreferenceWizard({ visible, initial, onClose, onSave }: {
  visible: boolean;
  initial: PreferenceProfile;
  onClose: () => void;
  onSave: (profile: PreferenceProfile) => Promise<void>;
}) {
  const [saveError, setSaveError] = useState<string | null>(null);
  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<PreferenceProfile>({
    resolver: zodResolver(preferenceProfileSchema),
    values: initial,
  });

  const submit = handleSubmit(async (value) => {
    const now = new Date().toISOString();
    setSaveError(null);
    try {
      await onSave({ ...value, revision: value.revision + 1, updatedAt: now });
      onClose();
    } catch {
      setSaveError("保存失败，预设没有被写入本机数据库。请重试。");
    }
  });

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.modal}>
        <View style={styles.modalHeader}>
          <View>
            <Text style={styles.modalEyebrow}>推荐偏好预设</Text>
            <Text style={styles.modalTitle}>告诉我们怎样才算适合你</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="关闭偏好编辑" onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeText}>关闭</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.formContent} keyboardShouldPersistTaps="handled">
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
          <Pressable accessibilityRole="button" disabled={isSubmitting} onPress={submit} style={({ pressed }) => [styles.primaryButton, pressed && styles.primaryPressed, isSubmitting && styles.disabled]}>
            <Text style={styles.primaryButtonText}>{isSubmitting ? "正在保存…" : "保存并设为当前预设"}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
  chipSelected: { borderColor: palette.primaryActive, backgroundColor: "#E7F0FF" },
  chipText: { color: palette.text, fontSize: typeToken.label, fontWeight: "600" },
  chipTextSelected: { color: palette.primaryActive },
  pressed: { opacity: 0.72 },
  numberGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.x1, marginTop: spacing.x1 },
  numberInput: { minWidth: 110, flexGrow: 1, minHeight: minimumTouchTarget, paddingHorizontal: spacing.x1, color: palette.text, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border, borderRadius: radii.control },
  booleanRow: { minHeight: 60, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.x2, paddingVertical: spacing.x1, borderBottomWidth: 1, borderBottomColor: palette.border },
  booleanCopy: { flex: 1 },
  rowLabel: { color: palette.text, fontSize: typeToken.body, fontWeight: "600" },
  facilityList: { gap: spacing.x1 },
  requirementRow: { minHeight: minimumTouchTarget, paddingHorizontal: spacing.x2, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderRadius: radii.control, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.surface },
  requirementHard: { borderColor: palette.danger, backgroundColor: "#FFF1F0" },
  requirementValue: { color: palette.textSecondary, fontSize: typeToken.label, fontWeight: "700" },
  requirementHardText: { color: palette.danger },
  footer: { padding: spacing.x2, borderTopWidth: 1, borderTopColor: palette.border, backgroundColor: palette.surface },
  primaryButton: { minHeight: 52, alignItems: "center", justifyContent: "center", borderRadius: radii.control, backgroundColor: palette.primaryActive },
  primaryPressed: { transform: [{ scale: 0.99 }], opacity: 0.9 },
  primaryButtonText: { color: palette.onPrimary, fontSize: typeToken.body, fontWeight: "700" },
  disabled: { opacity: 0.55 },
});
