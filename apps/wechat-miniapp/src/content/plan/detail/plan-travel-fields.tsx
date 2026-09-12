import { Input, Picker, Text, View } from "@tarojs/components";
import { PLAN_TRAVEL_ORIGIN_MAX_LENGTH, type PlanTravel, type PlanTravelMode } from "@starward/miniapp-contracts";
import { emptyPlanTravel, planTravelModeLabel } from "./plan-travel";

export { emptyPlanTravel, planTravelMatchesRouteOrigin, planTravelModeLabel } from "./plan-travel";

const modes: readonly { value: PlanTravelMode; label: string }[] = [
  { value: "DRIVING", label: "驾车" },
  { value: "TRANSIT", label: "公共交通" },
  { value: "WALKING", label: "步行" },
];

export function PlanTravelFields({ value, disabled, onChange }: {
  value: PlanTravel;
  disabled: boolean;
  onChange(value: PlanTravel): void;
}) {
  const modeIndex = Math.max(0, modes.findIndex(item => item.value === value.mode));
  return <View className="plan-fields-card plan-travel-fields">
    <View className="plan-field-row">
      <Text className="plan-field-row__label">出发地</Text>
      <Input className="plan-field-input" value={value.origin} maxlength={PLAN_TRAVEL_ORIGIN_MAX_LENGTH}
        disabled={disabled} placeholder="填写实际出发地" aria-label="计划出发地"
        onInput={event => onChange({ ...value, origin: event.detail.value })} />
    </View>
    <View className="plan-field-row">
      <Text className="plan-field-row__label">交通方式</Text>
      <Picker mode="selector" range={modes.map(item => item.label)} value={modeIndex} disabled={disabled}
        aria-label={`交通方式：${planTravelModeLabel(value.mode)}`}
        onChange={event => onChange({ ...value, mode: modes[Number(event.detail.value)]?.value ?? value.mode })}>
        <View className="plan-field-value plan-field-value--select focus-ring"><Text>{planTravelModeLabel(value.mode)}</Text><Text aria-hidden="true">⌄</Text></View>
      </Picker>
    </View>
  </View>;
}
