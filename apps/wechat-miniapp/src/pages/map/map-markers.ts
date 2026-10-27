import { MINIAPP_DESIGN } from "../../theme/design-tokens";
import type { DisplayMode, SpotSummary } from "@starward/miniapp-contracts";

export function formalSpotMarkerIconPath(mode: DisplayMode, selected: boolean) {
  return mode === "DAY"
    ? `/assets/b-icons/spot-marker--day--${selected ? "selected" : "default"}.png`
    : `/assets/icons/formal-spot-marker${selected ? "-selected" : ""}-${mode.toLowerCase()}.png`;
}

interface MarkerGroup {
  key: string;
  id: number;
  latitude: number;
  longitude: number;
  spots: readonly SpotSummary[];
}

export function markerGroups(
  spots: readonly SpotSummary[],
  zoom: number,
  previous: readonly MarkerGroup[] = [],
): MarkerGroup[] {
  const stableIds = (groups: MarkerGroup[]) => {
    const previousIds = new globalThis.Map(previous.map(group => [group.key, group.id]));
    const used = new Set(groups.flatMap(group => previousIds.has(group.key) ? [previousIds.get(group.key)!] : []));
    let nextId = 1;
    for (const group of groups) {
      const existing = previousIds.get(group.key);
      if (existing !== undefined) group.id = existing;
      else {
        while (used.has(nextId)) nextId++;
        group.id = nextId++; used.add(group.id);
      }
    }
    return groups.sort((a, b) => a.id - b.id);
  };
  if (zoom >= 9) {
    return stableIds(spots.map((spot, index) => ({
      key: `spot:${spot.spotId}`,
      id: index + 1,
      latitude: spot.gcj02.latitude,
      longitude: spot.gcj02.longitude,
      spots: [spot],
    })));
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
  return stableIds([...cells.entries()].map(([cell, items], index) => ({
    key: items.length === 1 ? `spot:${items[0]!.spotId}` : `cell:${cellSize}:${cell}`,
    id: index + 1,
    latitude:
      items.reduce((sum, spot) => sum + spot.gcj02.latitude, 0) / items.length,
    longitude:
      items.reduce((sum, spot) => sum + spot.gcj02.longitude, 0) / items.length,
    spots: items,
  })));
}

const NO_SPOTS: readonly SpotSummary[] = [];

/** Keep only the current marker summaries while the new viewport's Scene is
 * pending. Scene evaluations/time frames stay with the current query. */
export function createMapMarkerPresentation() {
  let scope: string | null = null;
  let spots: readonly SpotSummary[] = NO_SPOTS;
  let confirmed = false;
  let groups: MarkerGroup[] = [];
  let markers: ReturnType<typeof markerItems> = [];
  let rendering = "";
  let renderedSpots: readonly SpotSummary[] | null = null;
  return {
    present(input: { scope: string; spots?: readonly SpotSummary[] | undefined; denied: boolean;
      zoom: number; selectedSpotId: string | null; mode: DisplayMode; largeText: boolean }) {
      if (input.scope !== scope || input.denied) {
        scope = input.scope; spots = NO_SPOTS; confirmed = false; groups = []; markers = [];
        rendering = ""; renderedSpots = null;
      }
      if (!input.denied && input.spots !== undefined) { spots = input.spots; confirmed = true; }
      // Fractional camera changes do not change these three clustering levels.
      const nextRendering = JSON.stringify([input.zoom >= 9 ? 9 : input.zoom <= 7 ? 7 : 8,
        input.selectedSpotId, input.mode, input.largeText]);
      if (spots !== renderedSpots || rendering !== nextRendering) {
        groups = markerGroups(spots, input.zoom, groups);
        const next = markerItems(groups, input.selectedSpotId, input.mode, input.largeText);
        // Keep unchanged native marker props and ordering across new query
        // envelopes. This avoids clearing/replacing the same native images.
        if (JSON.stringify(next) !== JSON.stringify(markers)) markers = next;
        renderedSpots = spots; rendering = nextRendering;
      }
      return { groups, markers, hasConfirmed: confirmed, retained: confirmed && input.spots === undefined };
    },
  };
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
  return groups.map((group) => {
    const spot = group.spots[0]!;
    const clustered = group.spots.length > 1;
    const selected = group.spots.some((item) => item.spotId === selectedSpotId);
    return {
      id: group.id,
      latitude: group.latitude,
      longitude: group.longitude,
      iconPath: formalSpotMarkerIconPath(mode, selected),
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
