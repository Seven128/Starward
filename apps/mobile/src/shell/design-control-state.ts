import type { AccessibilityState } from "react-native";

export function designControlAccessibilityState(state: string): AccessibilityState {
  return {
    busy: state === "loading" || state === "saving",
    disabled: state === "disabled",
    selected: state === "selected",
  };
}
