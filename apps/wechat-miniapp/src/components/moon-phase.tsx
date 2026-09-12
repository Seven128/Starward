import { Image, Text, View } from "@tarojs/components";
import type { MoonPhaseKey } from "@starward/miniapp-contracts";

const PHASES: Readonly<Record<MoonPhaseKey, { index: number; label: string }>> = {
  NEW: { index: 0, label: "新月" },
  WAXING_CRESCENT: { index: 1, label: "蛾眉月" },
  FIRST_QUARTER: { index: 2, label: "上弦月" },
  WAXING_GIBBOUS: { index: 3, label: "盈凸月" },
  FULL: { index: 4, label: "满月" },
  WANING_GIBBOUS: { index: 5, label: "亏凸月" },
  LAST_QUARTER: { index: 6, label: "下弦月" },
  WANING_CRESCENT: { index: 7, label: "残月" },
};

export function moonPhaseLabel(phase: MoonPhaseKey | null) {
  return phase ? PHASES[phase].label : "月相暂无数据";
}

export function MoonPhaseImage({
  phase,
  className = "",
  decorative = false,
}: {
  phase: MoonPhaseKey | null;
  className?: string;
  decorative?: boolean;
}) {
  if (!phase) {
    return (
      <View
        className={`moon-phase-image moon-phase-image--unknown ${className}`.trim()}
        {...(decorative
          ? { "aria-hidden": "true" as const }
          : { ariaLabel: "月相暂无数据" })}
      >
        <Text>?</Text>
      </View>
    );
  }
  const definition = PHASES[phase];
  return (
    <Image
      className={`moon-phase-image ${className}`.trim()}
      src={`/assets/moon/phase-${definition.index}.svg`}
      mode="aspectFit"
      {...(decorative
        ? { "aria-hidden": "true" as const }
        : { ariaLabel: definition.label })}
    />
  );
}
