import { Button, Text, View } from "@tarojs/components";
import { SemanticIcon, type SemanticIconName } from "./semantic-asset";
import "./toggle-field.scss";

/** One controlled setting and one full-row activation surface. */
export function ToggleField({ id, label, description, checked, disabled = false, onChange, stateLabels, icon, iconTone }: {
  id: string;
  label: string;
  description?: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
  stateLabels?: { checked: string; unchecked: string };
  icon?: SemanticIconName;
  iconTone?: "plain" | "gold" | "lilac";
}) {
  return (
    <Button
      id={id}
      className={`toggle-field setting-row focus-ring${checked ? " toggle-field--checked" : ""}`}
      disabled={disabled}
      ariaLabel={`${label}，${stateLabels ? (checked ? stateLabels.checked : stateLabels.unchecked) : (checked ? "已开启" : "已关闭")}${disabled ? "，不可更改" : `，点击${stateLabels ? (checked ? stateLabels.unchecked : stateLabels.checked) : (checked ? "关闭" : "开启")}`}`}
      hoverClass="toggle-field--pressed"
      hoverStartTime={0}
      hoverStayTime={0}
      onClick={() => { if (!disabled) onChange(!checked); }}
    >
      {icon ? <View className={`toggle-field__icon toggle-field__icon--${iconTone ?? "plain"}`} aria-hidden="true">
        <SemanticIcon name={icon} />
      </View> : null}
      <View className="toggle-field__copy">
        <Text className="type-label">{label}</Text>
        {description ? <Text className="type-caption">{description}</Text> : null}
      </View>
      <View className="toggle-field__indicator" aria-hidden="true">
        <View className="toggle-field__track"><View className="toggle-field__thumb" /></View>
        <Text className="toggle-field__state">{stateLabels ? (checked ? stateLabels.checked : stateLabels.unchecked) : (checked ? "开" : "关")}</Text>
      </View>
    </Button>
  );
}
