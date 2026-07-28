import * as Haptics from "expo-haptics";
import { useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View, type ViewStyle } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { minimumTouchTarget, spacing, type as typeToken, type ColorPalette } from "@starward/ui-system/tokens";
import { type PrimaryDestination, useShellStore } from "../state/shell-store";
import { useStarwardTheme } from "./useStarwardTheme";
import {
  useDesignControlEvidence,
  useDesignScenarioEvidence,
} from "./DesignControlEvidence";

type GroupName = "(tonight)" | "(map)" | "(trips)" | "(sky)" | "(me)";

interface TabRoute {
  key: string;
  name: string;
  params?: Record<string, unknown>;
}

interface PrimaryTabBarProps {
  state: { index: number; routes: TabRoute[] };
  navigation: {
    emit(event: { type: "tabPress"; target: string; canPreventDefault: true }): { defaultPrevented: boolean };
    navigate(name: string, params?: Record<string, unknown>): void;
  };
}

const destinations: Array<{
  id: PrimaryDestination;
  group: GroupName;
  label: string;
  testID: string;
}> = [
  { id: "tonight", group: "(tonight)", label: "今晚", testID: "primary-tab-tonight" },
  { id: "map", group: "(map)", label: "地图", testID: "shell-open-map-tab" },
  { id: "trips", group: "(trips)", label: "行程", testID: "primary-tab-itinerary" },
  { id: "sky", group: "(sky)", label: "天空", testID: "primary-tab-sky" },
  { id: "me", group: "(me)", label: "我的", testID: "primary-tab-profile" },
];

function TabIcon({ id, color }: { id: PrimaryDestination; color: string }) {
  const common = { fill: "none", stroke: color, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, strokeWidth: 1.7 };
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width={20} height={20} viewBox="0 0 24 24">
        {id === "tonight" ? <Path {...common} d="M3 12h18M6 12a6 6 0 0 1 12 0M8 17h8" /> : null}
        {id === "map" ? <Path {...common} d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3zM9 3v15m6-12v15" /> : null}
        {id === "trips" ? <Path {...common} d="M5 5h14v16H5zM8 3v4m8-4v4M8 11h8m-8 4h5" /> : null}
        {id === "sky" ? <Path {...common} d="m12 3 1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5zM5 16l.8 2.2L8 19l-2.2.8L5 22l-.8-2.2L2 19l2.2-.8z" /> : null}
        {id === "me" ? (
          <>
            <Circle {...common} cx={12} cy={8} r={4} />
            <Path {...common} d="M4 21c0-4 4-7 8-7s8 3 8 7" />
          </>
        ) : null}
      </Svg>
    </View>
  );
}

export function PrimaryTabBar({ state, navigation }: PrimaryTabBarProps) {
  const designEvidence = useDesignControlEvidence("primary-tab-bar");
  const designScenario = useDesignScenarioEvidence("primary-tab-bar");
  const { palette } = useStarwardTheme();
  const styles = createStyles(palette);
  const setDestination = useShellStore((value) => value.setDestination);
  const [focused, setFocused] = useState<PrimaryDestination | null>(null);
  const activeRoute = state.routes[state.index];

  return (
    <View
      testID="primary-tab-bar"
      accessible={false}
      accessibilityLabel={`一级导航：今晚、地图、行程、天空、我的${designEvidence.accessibilityLabelSuffix}`}
      accessibilityState={designEvidence.accessibilityState}
      style={[styles.bar, designEvidence.style]}
    >
      {designEvidence.evidence}
      {designScenario.action(() => {
        const nextRoute = state.routes[(state.index + 1) % state.routes.length];
        if (nextRoute) navigation.navigate(nextRoute.name, nextRoute.params);
      })}
      {designScenario.result}
      {destinations.map((destination) => {
        const route = state.routes.find((candidate) => candidate.name === destination.group);
        const selected = activeRoute?.name === destination.group;
        const pressStyle = ({ pressed }: { pressed: boolean }): ViewStyle[] => [
          styles.tab,
          selected ? styles.tabSelected : styles.tabDefault,
          focused === destination.id ? styles.focused : styles.unfocused,
          pressed ? styles.pressed : styles.released,
        ];
        return (
          <Pressable
            key={destination.id}
            testID={destination.testID}
            accessibilityRole="tab"
            accessibilityLabel={destination.label}
            accessibilityHint={`切换到${destination.label}页面`}
            accessibilityState={{ selected }}
            hitSlop={4}
            onBlur={() => setFocused((value) => value === destination.id ? null : value)}
            onFocus={() => setFocused(destination.id)}
            onPress={() => {
              const event = route
                ? navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true })
                : { defaultPrevented: false };
              if (event.defaultPrevented) return;
              void setDestination(destination.id);
              if (!selected) {
                if (Platform.OS !== "web") void Haptics.selectionAsync().catch(() => undefined);
                navigation.navigate(destination.group, route?.params);
              }
            }}
            style={pressStyle}
          >
            <View style={[styles.selectionMark, selected && styles.selectionMarkVisible]} />
            <TabIcon id={destination.id} color={selected ? palette.primary : palette.textSecondary} />
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

function createStyles(palette: ColorPalette) {
  return StyleSheet.create({
    bar: {
      minHeight: 64,
      paddingHorizontal: 5,
      paddingTop: 4,
      paddingBottom: spacing.xxs,
      flexDirection: "row",
      alignItems: "stretch",
      borderTopWidth: 1,
      borderTopColor: palette.border,
      backgroundColor: palette.canvas,
    },
    tab: {
      flex: 1,
      minWidth: minimumTouchTarget,
      minHeight: 56,
      alignItems: "center",
      justifyContent: "center",
      gap: 2,
      borderRadius: 8,
      borderColor: "transparent",
    },
    tabDefault: {},
    tabSelected: {},
    focused: { borderWidth: 3, borderColor: palette.primary },
    unfocused: { borderWidth: 0 },
    pressed: { opacity: 0.78, transform: [{ scale: 0.98 }] },
    released: { opacity: 1, transform: [{ scale: 1 }] },
    selectionMark: {
      position: "absolute",
      top: 2,
      width: 16,
      height: 2,
      borderRadius: 1,
      backgroundColor: "transparent",
    },
    selectionMarkVisible: { backgroundColor: palette.anchor },
    label: {
      color: palette.textSecondary,
      fontFamily: typeToken.family,
      fontSize: typeToken.label,
      lineHeight: typeToken.labelLineHeight,
      fontWeight: "700",
      letterSpacing: 0.24,
    },
    labelSelected: { color: palette.primary, fontWeight: "700" },
  });
}
