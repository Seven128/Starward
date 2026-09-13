import { MINIAPP_DESIGN } from "../../theme/design-tokens";
import type { DisplayMode, SpotSummary } from "@starward/miniapp-contracts";

const MAP_MARKER_ICONS: Record<
  DisplayMode,
  { regular: string; selected: string }
> = {
  DAY: {
    regular: "/assets/b-icons/spot-marker--day--default.png",
    selected: "/assets/b-icons/spot-marker--day--selected.png",
  },
  NIGHT: {
    regular: "/assets/icons/formal-spot-marker-night.png",
    selected: "/assets/icons/formal-spot-marker-selected-night.png",
  },
  OBSERVATION: {
    regular: "/assets/icons/formal-spot-marker-observation.png",
    selected: "/assets/icons/formal-spot-marker-selected-observation.png",
  },
};

interface MarkerGroup {
  id: number;
  latitude: number;
  longitude: number;
  spots: readonly SpotSummary[];
}

export function markerGroups(
  spots: readonly SpotSummary[],
  zoom: number,
): MarkerGroup[] {
  if (zoom >= 9) {
    return spots.map((spot, index) => ({
      id: index + 1,
      latitude: spot.gcj02.latitude,
      longitude: spot.gcj02.longitude,
      spots: [spot],
    }));
  }
  const cellSize = zoom <= 7 ? 1.2 : 0.55;
  const cells = new globalThis.Map<string, SpotSummary[]>();
  for (const spot of spots) {
    const key =
      String(Math.round(spot.gcj02.latitude / cellSize)) +
      ":" +
      String(Math.round(spot.gcj02.longitude / cellSize));
    const cell = cells.get(key) ?? [];
    cell.push(spot);
    cells.set(key, cell);
  }
  return [...cells.values()].map((items, index) => ({
    id: index + 1,
    latitude:
      items.reduce((sum, spot) => sum + spot.gcj02.latitude, 0) / items.length,
    longitude:
      items.reduce((sum, spot) => sum + spot.gcj02.longitude, 0) / items.length,
    spots: items,
  }));
}

export function markerItems(
  groups: readonly MarkerGroup[],
  selectedSpotId: string | null,
  mode: DisplayMode,
  largeText = false,
) {
  const theme = MINIAPP_DESIGN.themes[mode === "DAY" ? "day" : mode === "NIGHT" ? "night" : "observation"];
  const palette = {
    selectedLabel: theme["choice-selected-label"],
    selectedSurface: theme["choice-selected-surface"],
    selectedBorder: theme["choice-selected-border"],
    text: theme["text-primary"],
    surface: theme.surface,
    border: theme["border-strong"],
  };
  const textScale = largeText ? 2 : 1;
  const icons = MAP_MARKER_ICONS[mode];
  return groups.map((group) => {
    const spot = group.spots[0]!;
    const clustered = group.spots.length > 1;
    const selected = group.spots.some((item) => item.spotId === selectedSpotId);
    return {
      id: group.id,
      latitude: group.latitude,
      longitude: group.longitude,
      iconPath: selected ? icons.selected : icons.regular,
      // Native Map marker dimensions are device pixels (not WXSS rpx).
      // Keep the regular/selected assets at the 32/40 visual-role steps;
      // clustered groups retain their slightly larger count treatment.
      width: selected ? 40 : clustered ? 38 : 32,
      height: selected ? 45 : clustered ? 42 : 36,
      anchor: { x: 0.5, y: 1 },
      alpha: 0.96,
      ...(clustered
        ? {
            label: {
              content: String(group.spots.length),
              color: selected ? palette.selectedLabel : palette.text,
              fontSize: MINIAPP_DESIGN.type.data.size * textScale,
              bgColor: selected ? palette.selectedSurface : palette.surface,
              borderColor: selected ? palette.selectedBorder : palette.border,
              borderWidth: 1,
              borderRadius: 12,
              padding: 5,
              anchorX: 0,
              anchorY: selected ? -48 : -40,
              textAlign: "center" as const,
            },
          }
        : {}),
      ...(clustered
        ? {
            callout: {
              content: String(group.spots.length) + " 个正式观星点，点击放大",
              color: palette.text,
              fontSize: MINIAPP_DESIGN.type.metadata.size * textScale,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: palette.border,
              bgColor: palette.surface,
              padding: 6,
              anchorX: 0,
              anchorY: 0,
              display: "BYCLICK" as const,
              textAlign: "center" as const,
            },
          }
        : {}),
      ariaLabel: clustered
        ? String(group.spots.length) + " 个正式观星点的聚合标记，点击放大"
        : spot.name + "，" + (selected ? "已选择" : "未选择") + "，正式观星点",
    };
  });
}
