import { StyleSheet, Text } from "react-native";
import { colors, type as typeToken } from "@starward/ui-system/tokens";
import { useDecisionSnapshot } from "../state/use-decision-snapshot";

export function DecisionContextRevision({ viewedSpot }: { viewedSpot?: { id: string; name: string } } = {}) {
  const context = useDecisionSnapshot();
  const selectedTime = new Intl.DateTimeFormat("zh-CN", { timeZone: context.timezone, month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).format(new Date(context.moment));
  const timeLabel = context.momentSource === "night-preview" ? "预览 18:00，尚未选定时刻" : `${context.momentSource === "selected" ? "已选" : "默认时刻"} ${selectedTime}`;

  return (
    <Text
      testID="decision-context-revision"
      accessibilityLabel={`决策上下文版本 ${context.revision}`}
      style={styles.label}
    >
      {`观测地点 ${context.observer.label} · ${context.observingNight}夜\n${timeLabel} · 默认北京时间；地点时区尚未确认。`}
      {viewedSpot && viewedSpot.id !== context.observer.locationId ? `\n正在浏览 ${viewedSpot.name}；尚未用于当前观星安排。` : null}
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
