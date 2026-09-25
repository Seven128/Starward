import { Picker, Text, View } from "@tarojs/components";
import type { PlanTiming } from "@starward/miniapp-contracts";

export const emptyPlanTiming = (): PlanTiming => ({
  endLocalDate: "", endLocalTime: "", departureLocalDate: "", departureLocalTime: "",
});

/** User input only: route or weather estimates never write these fields. */
export function PlanObservationEndField({ value, disabled, onChange }: {
  value: PlanTiming;
  disabled: boolean;
  onChange(value: PlanTiming): void;
}) {
  return <PlanTimeRow label="观测结束" dateKey="endLocalDate" timeKey="endLocalTime"
    value={value} disabled={disabled} onChange={onChange} />;
}

/** Kept with the travel fields visually; still writes only the user's PlanTiming. */
export function PlanDepartureTimeFields({ value, disabled, onChange }: {
  value: PlanTiming;
  disabled: boolean;
  onChange(value: PlanTiming): void;
}) {
  return <PlanTimeRow label="计划出发" dateKey="departureLocalDate" timeKey="departureLocalTime"
    value={value} disabled={disabled} onChange={onChange} />;
}

function PlanTimeRow({ label, dateKey, timeKey, value, disabled, onChange }: {
  label: string;
  dateKey: "endLocalDate" | "departureLocalDate";
  timeKey: "endLocalTime" | "departureLocalTime";
  value: PlanTiming;
  disabled: boolean;
  onChange(value: PlanTiming): void;
}) {
  return <View className="plan-field-row">
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
  </View>;
}
