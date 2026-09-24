import { Picker, Text, View } from "@tarojs/components";
import type { PlanTiming } from "@starward/miniapp-contracts";

export const emptyPlanTiming = (): PlanTiming => ({
  endLocalDate: "", endLocalTime: "", departureLocalDate: "", departureLocalTime: "",
});

/** User input only: route or weather estimates never write these fields. */
export function PlanTimingFields({ value, timezone, disabled, onChange }: {
  value: PlanTiming;
  timezone: string | null;
  disabled: boolean;
  onChange(value: PlanTiming): void;
}) {
  return <View>
    <Text className="plan-form-footnote">{timezone
      ? `观星点当地时间 · ${timezone}，支持跨日观测。`
      : "选择正式观星点后显示当地时区；支持跨日观测。"}</Text>
    <View className="plan-fields-card">
    {([
      ["观测结束", "endLocalDate", "endLocalTime"],
      ["计划出发", "departureLocalDate", "departureLocalTime"],
    ] as const).map(([label, dateKey, timeKey]) => <View className="plan-field-row" key={dateKey}>
      <Text className="plan-field-row__label">{label}</Text>
      <View className="plan-field-row__controls">
        <Picker mode="date" value={value[dateKey]} disabled={disabled}
          aria-label={`${label}日期：${value[dateKey] || "未选择"}`}
          onChange={(event) => onChange({ ...value, [dateKey]: event.detail.value })}>
          <View className="plan-field-value focus-ring"><Text>{value[dateKey]?.replaceAll("-", "/") || "选择日期"}</Text></View>
        </Picker>
        <Picker mode="time" value={value[timeKey]} disabled={disabled}
          aria-label={`${label}时间：${value[timeKey] || "未选择"}`}
          onChange={(event) => onChange({ ...value, [timeKey]: event.detail.value })}>
          <View className="plan-field-value focus-ring"><Text>{value[timeKey] || "选择时间"}</Text></View>
        </Picker>
      </View>
    </View>)}
    </View>
  </View>;
}
