import { Input, Picker, Text, View } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { useEffect, useRef, useState } from "react";
import { SoftButton } from "@/components/soft-button";
import { SemanticIcon } from "@/components/semantic-asset";
import { choosePlatformLocation } from "@/services/platform-location";
import { currentDraftUserId, errorMessage } from "@/services/api-client";
import { useAppStore } from "@/state/app-store";
import { PLAN_TRAVEL_ORIGIN_MAX_LENGTH, type PlanTravel, type PlanTravelMode } from "@starward/miniapp-contracts";
import { emptyPlanTravel, planTravelModeLabel } from "./plan-travel";

export { emptyPlanTravel, planTravelMatchesRouteOrigin, planTravelModeLabel, planTravelNeedsExplicitOrigin } from "./plan-travel";

const modes: readonly { value: PlanTravelMode; label: string }[] = [
  { value: "DRIVING", label: "驾车" },
  { value: "TRANSIT", label: "公共交通" },
  { value: "WALKING", label: "步行" },
];

export function PlanTravelFields({ value, disabled, ownerKey, onChange }: {
  value: PlanTravel;
  disabled: boolean;
  ownerKey: string;
  onChange(value: PlanTravel): void;
}) {
  const [choosing, setChoosing] = useState(false);
  const pending = useRef(false);
  const live = useRef({ value, disabled, ownerKey });
  live.current = { value, disabled, ownerKey };
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const chooseOrigin = async () => {
    if (pending.current || disabled) return;
    pending.current = true;
    setChoosing(true);
    const original = live.current;
    const account = currentDraftUserId();
    const page = Taro.getCurrentPages().at(-1);
    const current = () => mounted.current && !live.current.disabled && live.current.ownerKey === original.ownerKey &&
      live.current.value === original.value && currentDraftUserId() === account && Taro.getCurrentPages().at(-1) === page;
    try {
      const selected = await choosePlatformLocation({ isCurrent: current });
      if (!selected || !current()) return;
      onChange({ ...original.value, origin: selected.label.slice(0, PLAN_TRAVEL_ORIGIN_MAX_LENGTH),
        originLocation: { source: "WECHAT_CHOOSE_LOCATION", address: selected.address.slice(0, 500), wgs84: selected.wgs84 } });
    } catch (error) {
      if (current() && !/cancel/iu.test(errorMessage(error))) useAppStore.getState().notify({
        owner: "plan", placement: "floating", tone: "warning", title: "出发地未选择",
        body: "微信选点暂不可用，请重试或手动填写。原出发地已保留。", dismissible: true, dedupeKey: "plan-origin-selection" });
    } finally { pending.current = false; if (mounted.current) setChoosing(false); }
  };
  const modeIndex = Math.max(0, modes.findIndex(item => item.value === value.mode));
  return <View className="plan-fields-card plan-travel-fields">
    <View className="plan-field-row">
      <Text className="plan-field-row__label">出发地</Text>
      <Input className="plan-field-input" value={value.origin} maxlength={PLAN_TRAVEL_ORIGIN_MAX_LENGTH}
        disabled={disabled} placeholder="填写实际出发地" aria-label="计划出发地"
        onInput={event => onChange({ ...value, origin: event.detail.value, originLocation: null })} />
    </View>
    <View className="plan-origin-selection">
      <SoftButton variant="ghost" label="在微信地图选择出发地" disabled={disabled || choosing} onClick={() => void chooseOrigin()}>
        {choosing ? "选择中…" : "在微信地图选择"}
      </SoftButton>
      {value.originLocation?.address ? <Text className="plan-form-footnote">{value.originLocation.address}</Text> : null}
    </View>
    <View className="plan-field-row">
      <Text className="plan-field-row__label">交通方式</Text>
      <Picker mode="selector" range={modes.map(item => item.label)} value={modeIndex} disabled={disabled}
        aria-label={`交通方式：${planTravelModeLabel(value.mode)}`}
        onChange={event => onChange({ ...value, mode: modes[Number(event.detail.value)]?.value ?? value.mode })}>
        <View className="plan-field-value plan-field-value--select focus-ring"><Text>{planTravelModeLabel(value.mode)}</Text><SemanticIcon name="chevron-down" className="plan-field-row__chevron" /></View>
      </Picker>
    </View>
  </View>;
}
