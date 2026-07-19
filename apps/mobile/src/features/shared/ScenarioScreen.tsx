import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, minimumTouchTarget, radii, spacing, type as typeToken } from "@starward/ui-system/tokens";

export type Scenario = { key: string; action: string; label: string; evidence: ReadonlyArray<{ id: string; title: string; body: string; meta?: string }> };
export type FeatureConfig = { outcome: string; eyebrow: string; title: string; subtitle: string; scenarios: ReadonlyArray<Scenario> };

export function ScenarioScreen({ config, fixture }: { config: FeatureConfig; fixture?: string }) {
  const requested = fixture?.split(":")[1];
  const initial = useMemo(() => config.scenarios.find((item) => item.key === requested)?.key, [config, requested]);
  const actionScenarios = useMemo(() => [...new Map(config.scenarios.map((item) => [item.action, item])).values()], [config]);
  const [active, setActive] = useState<string | undefined>(undefined);
  const selected = config.scenarios.find((item) => item.key === active);
  return <SafeAreaView testID={`screen-${config.outcome}`} style={styles.screen}>
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.eyebrow}>{config.eyebrow}</Text>
      <Text style={styles.title}>{config.title}</Text>
      <Text style={styles.subtitle}>{config.subtitle}</Text>
      <View style={styles.actions}>{actionScenarios.map((item) => <Pressable key={item.action} testID={item.action} accessibilityRole="button" onPress={() => setActive(config.scenarios.find((candidate) => candidate.action === item.action && candidate.key === initial)?.key ?? item.key)} style={({ pressed }) => [styles.action, config.scenarios.some((candidate) => candidate.action === item.action && candidate.key === initial) && styles.recommended, pressed && styles.pressed]}><Text style={styles.actionText}>{item.label}</Text></Pressable>)}</View>
      {selected ? <View style={styles.panel}><Text style={styles.panelTitle}>{selected.label}</Text>{selected.evidence.map((item) => <View key={item.id} testID={item.id} style={styles.evidence}><Text style={styles.evidenceTitle}>{item.title}</Text><Text style={styles.evidenceBody}>{item.body}</Text>{item.meta ? <Text style={styles.evidenceMeta}>{item.meta}</Text> : null}</View>)}</View> : <View style={styles.empty}><Text style={styles.emptyTitle}>选择一项操作</Text><Text style={styles.emptyBody}>结论、下一步与证据保持同一位置、时刻和版本上下文；缺失内容会显示影响与降级路径。</Text></View>}
    </ScrollView>
  </SafeAreaView>;
}

const palette = colors.planning;
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.canvas }, content: { padding: spacing.x2, paddingBottom: 48, gap: spacing.x2 },
  eyebrow: { color: palette.primaryActive, fontSize: typeToken.label, fontWeight: "700" }, title: { color: palette.text, fontSize: typeToken.title, lineHeight: 32, fontWeight: "700" }, subtitle: { color: palette.textSecondary, fontSize: typeToken.body, lineHeight: 23 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.x1 }, action: { minHeight: minimumTouchTarget, justifyContent: "center", paddingHorizontal: 14, borderWidth: 1, borderColor: palette.border, borderRadius: radii.pill, backgroundColor: palette.surface }, recommended: { borderColor: palette.primaryActive, backgroundColor: "#E8F1FF" }, pressed: { opacity: 0.7 }, actionText: { color: palette.text, fontSize: typeToken.label, fontWeight: "700" },
  panel: { gap: spacing.x1, padding: spacing.x2, borderWidth: 1, borderColor: palette.border, borderRadius: radii.layer, backgroundColor: palette.surface }, panelTitle: { color: palette.text, fontSize: typeToken.section, fontWeight: "700" }, evidence: { minHeight: 86, padding: 12, borderRadius: radii.control, backgroundColor: palette.surfaceMuted }, evidenceTitle: { color: palette.text, fontSize: typeToken.body, fontWeight: "700" }, evidenceBody: { marginTop: 5, color: palette.text, fontSize: typeToken.label, lineHeight: 19 }, evidenceMeta: { marginTop: 5, color: palette.textSecondary, fontSize: typeToken.caption, lineHeight: 17 },
  empty: { minHeight: 180, justifyContent: "center", padding: spacing.x2, borderWidth: 1, borderColor: palette.border, borderRadius: radii.layer, backgroundColor: palette.surface }, emptyTitle: { color: palette.text, fontSize: typeToken.section, fontWeight: "700" }, emptyBody: { marginTop: spacing.x1, color: palette.textSecondary, lineHeight: 21 },
});
