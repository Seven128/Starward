import { useIsFocused } from "expo-router";
import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

export function TabStackFrame({ children }: { children: ReactNode }) {
  const focused = useIsFocused();
  return (
    <View
      aria-hidden={!focused}
      accessibilityElementsHidden={!focused}
      importantForAccessibility={focused ? "auto" : "no-hide-descendants"}
      pointerEvents={focused ? "auto" : "none"}
      style={[styles.frame, !focused && styles.inactive]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { flex: 1 },
  inactive: { display: "none" },
});
