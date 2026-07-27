import { router, usePathname, type Href } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, minimumTouchTarget, radii, spacing, type as typeToken } from "@starward/ui-system/tokens";
import { type PrimaryDestination, useShellStore } from "../state/shell-store";

const palette = colors.planning;

const destinations: Array<{
  id: PrimaryDestination;
  href: "/tonight" | "/map" | "/trips" | "/sky" | "/me";
  label: string;
  testID: string;
}> = [
  { id: "tonight", href: "/tonight", label: "今晚", testID: "primary-tab-tonight" },
  { id: "map", href: "/map", label: "地图", testID: "shell-open-map-tab" },
  { id: "trips", href: "/trips", label: "行程", testID: "primary-tab-itinerary" },
  { id: "sky", href: "/sky", label: "天空", testID: "primary-tab-sky" },
  { id: "me", href: "/me", label: "我的", testID: "primary-tab-profile" },
];

function LineIcon({ id, selected }: { id: PrimaryDestination; selected: boolean }) {
  return (
    <View accessibilityElementsHidden style={styles.icon}>
      <View style={[styles.iconLine, styles.iconLineTop, selected && styles.iconSelected]} />
      <View style={[styles.iconLine, id === "sky" ? styles.iconLineDiagonal : styles.iconLineBottom, selected && styles.iconSelected]} />
      {id === "map" || id === "me" ? <View style={[styles.iconDot, selected && styles.iconDotSelected]} /> : null}
    </View>
  );
}

export function PrimaryTabBar() {
  const pathname = usePathname();
  const setDestination = useShellStore((state) => state.setDestination);

  return (
    <View
      testID="primary-tab-bar"
      accessible
      accessibilityRole="tablist"
      accessibilityLabel="一级导航：今晚、地图、行程、天空、我的"
      style={styles.bar}
    >
      {destinations.map((destination) => {
        const selected = pathname === destination.href || pathname.startsWith(`${destination.href}/`);
        return (
          <Pressable
            key={destination.id}
            testID={destination.testID}
            accessibilityRole="tab"
            accessibilityLabel={destination.label}
            accessibilityState={{ selected }}
            onPress={() => {
              void setDestination(destination.id);
              router.navigate(destination.href as Href);
            }}
            style={({ pressed }) => [styles.tab, selected && styles.tabSelected, pressed && styles.pressed]}
          >
            <LineIcon id={destination.id} selected={selected} />
            <Text
              testID={destination.id === "map" ? "primary-tab-map" : undefined}
              style={[styles.label, selected && styles.labelSelected]}
            >
              {destination.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    minHeight: 72,
    paddingHorizontal: spacing.x1,
    paddingTop: 6,
    paddingBottom: 8,
    flexDirection: "row",
    alignItems: "stretch",
    borderTopWidth: 1,
    borderTopColor: palette.border,
    backgroundColor: palette.surface,
  },
  tab: {
    flex: 1,
    minHeight: minimumTouchTarget,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.control,
  },
  tabSelected: { backgroundColor: "#E7F0FF" },
  icon: { width: 24, height: 22, alignItems: "center", justifyContent: "center" },
  iconLine: { position: "absolute", width: 16, height: 2, borderRadius: 1, backgroundColor: palette.textSecondary },
  iconLineTop: { top: 5 },
  iconLineBottom: { bottom: 5 },
  iconLineDiagonal: { transform: [{ rotate: "-45deg" }] },
  iconSelected: { backgroundColor: palette.primaryActive },
  iconDot: { width: 7, height: 7, borderRadius: 4, borderWidth: 2, borderColor: palette.textSecondary, backgroundColor: palette.surface },
  iconDotSelected: { borderColor: palette.primaryActive, backgroundColor: "#E7F0FF" },
  label: { marginTop: 2, color: palette.textSecondary, fontSize: typeToken.caption, fontWeight: "600" },
  labelSelected: { color: palette.primaryActive, fontWeight: "700" },
  pressed: { opacity: 0.7 },
});
