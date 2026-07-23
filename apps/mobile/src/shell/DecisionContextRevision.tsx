import { StyleSheet, Text } from "react-native";
import { colors, type as typeToken } from "@starward/ui-system/tokens";
import { useShellStore } from "../state/shell-store";

export function DecisionContextRevision() {
  const context = useShellStore((state) => state.decisionContext);

  return (
    <Text
      testID="decision-context-revision"
      accessibilityLabel={`决策上下文版本 ${context.revision}`}
      style={styles.label}
    >
      {`决策上下文 r${context.revision} · ${context.observingNight} · ${context.origin} · ${context.target} · ${context.profileId}`}
    </Text>
  );
}

const styles = StyleSheet.create({
  label: {
    color: colors.planning.textSecondary,
    fontSize: typeToken.caption,
    lineHeight: 18,
  },
});
