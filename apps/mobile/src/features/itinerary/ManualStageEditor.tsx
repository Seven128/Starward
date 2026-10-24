import { useMemo, useState } from "react";
import { randomUUID } from "expo-crypto";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { colors, minimumTouchTarget, radii, spacing, type as typeToken } from "@starward/ui-system/tokens";
import { validateTimeline } from "../../../../../packages/domain/src/itinerary/index";
import { manualStageClock, manualStageKinds, resolveManualStages, stageNames, type ManualStageInput, type StageMomentInput } from "./manual-stage-edit";

const palette = colors.planning;
function Action({ id, children, onPress, disabled = false, selected = false }: { id: string; children: string; onPress(): void; disabled?: boolean; selected?: boolean }) {
  return <Pressable testID={id} disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.action, selected && styles.selected, pressed && styles.pressed, disabled && styles.disabled]}><Text style={styles.label}>{children}</Text></Pressable>;
}
function MomentFields({ label, value, timezone, disabled, onChange }: { label: string; value: StageMomentInput; timezone: string; disabled: boolean; onChange(value: StageMomentInput): void }) {
  const clock = useMemo(() => manualStageClock(timezone), [timezone]);
  const { choices, instant: resolved } = clock.inspect(value);
  return <View style={styles.moment}>
    <Text style={styles.label}>{label}</Text>
    <TextInput accessibilityLabel={`${label}日期`} value={value.date} editable={!disabled} onChangeText={date => onChange({ ...value, date, selectedInstant: null })} placeholder="YYYY-MM-DD" style={styles.input} />
    <TextInput accessibilityLabel={`${label}时间`} value={value.time} editable={!disabled} onChangeText={time => onChange({ ...value, time, selectedInstant: null })} placeholder="HH:mm，可填秒与毫秒" style={styles.input} />
    {choices.length > 1 ? <View style={styles.moment}><Text style={styles.caption}>夏令时切换让这个当地时刻出现两次，请选择。</Text>{choices.map((choice, index) => <Action key={choice.instant} id={`plan-stage-${label === "开始" ? "start" : "end"}-occurrence-${index + 1}`} disabled={disabled} selected={resolved === choice.instant} onPress={() => onChange({ ...value, selectedInstant: choice.instant })}>{`${resolved === choice.instant ? "已选 · " : ""}第${index === 0 ? "一" : "二"}次 · ${choice.offset}`}</Action>)}</View> : null}
  </View>;
}

/** Controlled draft data belongs to ItineraryScreen; only disclosure is local. */
export function ManualStageEditor({ values, timezone, observingDate, disabled, onChange, onError }: { values: ManualStageInput[]; timezone: string; observingDate: string; disabled: boolean; onChange(values: ManualStageInput[]): void; onError(error: string): void }) {
  const [expanded, setExpanded] = useState<string | null>(values[0]?.id ?? null);
  const clock = useMemo(() => manualStageClock(timezone), [timezone]);
  const change = (id: string, value: ManualStageInput) => onChange(values.map(stage => stage.id === id ? value : stage));
  const add = () => {
    if (disabled) return;
    const seed = randomUUID(); let id = seed, suffix = 1; while (values.some(stage => stage.id === id)) id = `${seed}-${suffix++}`;
    // A prior stored/manual order need not be chronological. Continue after
    // the latest qualified end, without changing any of the user's times.
    const lastInstant = values.reduce<string | null>((latest, stage) => {
      const candidate = clock.resolve(stage.end);
      return candidate && (!latest || Date.parse(candidate) > Date.parse(latest)) ? candidate : latest;
    }, null);
    const start: StageMomentInput = lastInstant ? clock.input(lastInstant) : { date: observingDate, time: "", selectedInstant: null, originalInstant: null };
    onChange([...values, { id, kind: "observation", start, end: { date: start.date, time: "", selectedInstant: null, originalInstant: null } }]); setExpanded(id);
  };
  const sort = () => {
    if (disabled) return;
    const checked = resolveManualStages(values, timezone); if (checked.error !== null) { onError(checked.error); return; }
    const ordered = validateTimeline(checked.stages).ordered;
    const byId = new Map(values.map(stage => [stage.id, stage])); onChange(ordered.map(stage => byId.get(stage.id)!));
  };
  return <View testID="plan-manual-stage-editor" style={styles.editor}>
    <Text style={styles.heading}>手工阶段</Text><Text style={styles.caption}>{`按 ${timezone} 当地时间填写；手工安排不会生成路线或天文窗口。`}</Text>
    {!values.length ? <Text style={styles.caption}>尚无手工阶段，可添加出发、勘察、观测或返回。</Text> : null}
    {values.map((value, index) => <View key={value.id} testID={`plan-stage-${value.id}`} style={styles.stage}>
      <Action id={`plan-stage-open-${value.id}`} disabled={disabled} onPress={() => setExpanded(expanded === value.id ? null : value.id)}>{`${index + 1}. ${stageNames[value.kind]} · ${expanded === value.id ? "收起" : "编辑"}`}</Action>
      <Text style={styles.caption}>{`${value.start.date} ${value.start.time || "开始待填"} → ${value.end.date} ${value.end.time || "结束待填"}`}</Text>
      {expanded === value.id ? <View testID={`plan-stage-fields-${value.id}`} style={styles.editor}>
        <View style={styles.actions}>{manualStageKinds.map(kind => <Action key={kind} id={`plan-stage-kind-${kind}`} disabled={disabled} selected={value.kind === kind} onPress={() => change(value.id, { ...value, kind })}>{`${value.kind === kind ? "已选 · " : ""}${stageNames[kind]}`}</Action>)}</View>
        <MomentFields label="开始" value={value.start} timezone={timezone} disabled={disabled} onChange={start => change(value.id, { ...value, start })} />
        <MomentFields label="结束" value={value.end} timezone={timezone} disabled={disabled} onChange={end => change(value.id, { ...value, end })} />
        <Text style={styles.caption}>可填时分，或保留秒与毫秒；取消编辑恢复已存安排。</Text>
        <Action id={`plan-stage-remove-${value.id}`} disabled={disabled} onPress={() => { onChange(values.filter(stage => stage.id !== value.id)); setExpanded(null); }}>移除阶段</Action>
      </View> : null}
    </View>)}
    <View style={styles.actions}><Action id="plan-stage-add" disabled={disabled} onPress={add}>添加阶段</Action><Action id="plan-stage-sort" disabled={disabled || values.length < 2} onPress={sort}>按时排序</Action></View>
    <Text style={styles.caption}>按时排序保留每个阶段的原时刻，保存草稿后生效。</Text>
  </View>;
}
const styles = StyleSheet.create({
  editor: { gap: spacing.x1 }, moment: { gap: spacing.x1 }, stage: { gap: spacing.x1, paddingVertical: spacing.x1, borderTopWidth: 1, borderColor: palette.border },
  heading: { color: palette.text, fontSize: typeToken.section, fontWeight: "700" }, label: { color: palette.text, fontSize: typeToken.body }, caption: { color: palette.textSecondary, fontSize: typeToken.caption, lineHeight: 17 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.x1 }, action: { minHeight: minimumTouchTarget, justifyContent: "center", paddingHorizontal: 12, borderWidth: 1, borderColor: palette.border, borderRadius: radii.control, backgroundColor: palette.surface },
  input: { minHeight: minimumTouchTarget, paddingHorizontal: 12, color: palette.text, fontSize: typeToken.data, borderWidth: 1, borderColor: palette.border, borderRadius: radii.control, backgroundColor: palette.surface },
  selected: { borderColor: palette.primaryActive, backgroundColor: palette.surfaceMuted }, pressed: { opacity: 0.7 }, disabled: { opacity: 0.6 },
});
