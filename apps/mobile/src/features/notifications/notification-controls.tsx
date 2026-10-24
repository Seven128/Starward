import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { minimumTouchTarget, radii, spacing, type ColorPalette } from "@starward/ui-system/tokens";

export function RuleButton({ id, children, onPress, palette, disabled = false }: {
  id: string; children: ReactNode; onPress(): void; palette: ColorPalette; disabled?: boolean;
}) {
  return <Pressable testID={id} disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.button, {
    borderColor: palette.border, backgroundColor: pressed ? palette.surfaceMuted : palette.surface, opacity: disabled ? 0.55 : 1,
  }]}><Text style={{ color: palette.text }}>{children}</Text></Pressable>;
}
const styles = StyleSheet.create({ button: { minHeight: minimumTouchTarget, paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm, borderWidth: 1, borderRadius: radii.control, justifyContent: "center" } });
