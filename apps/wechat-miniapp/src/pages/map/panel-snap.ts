export type PanelExtent = "small" | "medium" | "large";
export type PanelSnapGeometry = Record<PanelExtent, number> & { startHeight: number };

export function readPanelSnapGeometry(rows: unknown): PanelSnapGeometry | null {
  if (!Array.isArray(rows) || rows.length !== 4) return null;
  const heights = rows.map(row => row && typeof row === "object" ? (row as { height?: unknown }).height : undefined);
  if (!heights.every(height => typeof height === "number" && Number.isFinite(height) && height > 0)) return null;
  const [startHeight, small, medium, large] = heights as [number, number, number, number];
  if (!(small < medium && medium < large)) return null;
  return { small, medium, large, startHeight: Math.max(small, Math.min(large, startHeight)) };
}

export function nearestPanelExtent(geometry: PanelSnapGeometry, height: number, current: PanelExtent): PanelExtent {
  let selected = current;
  for (const extent of ["small", "medium", "large"] as const) {
    if (Math.abs(geometry[extent] - height) < Math.abs(geometry[selected] - height)) selected = extent;
  }
  return selected;
}

export function panelHeightProgress(geometry: PanelSnapGeometry, height: number): number {
  const fraction = height <= geometry.medium
    ? (height - geometry.small) / (geometry.medium - geometry.small) * 0.5
    : 0.5 + (height - geometry.medium) / (geometry.large - geometry.medium) * 0.5;
  return Math.max(0, Math.min(1, fraction));
}


export type PanelMotionSample = { y: number; at: number };

// Keep only recent physical samples; pausing before release discards old momentum.
export function panelReleaseVelocity(samples: readonly PanelMotionSample[], releasedAt: number): number {
  const recent = samples.filter(sample => Number.isFinite(sample.y) && Number.isFinite(sample.at)
    && sample.at <= releasedAt && releasedAt - sample.at <= 100);
  if (recent.length < 2) return 0;
  const first = recent[0]!, last = recent[recent.length - 1]!;
  const elapsed = last.at - first.at;
  if (elapsed < 8 || releasedAt - last.at > 50) return 0;
  return Math.max(-3, Math.min(3, (last.y - first.y) / elapsed));
}

export function releasePanelExtent(geometry: PanelSnapGeometry, height: number, current: PanelExtent, pointerVelocity: number): PanelExtent {
  const velocity = Number.isFinite(pointerVelocity) ? pointerVelocity : 0;
  const projected = Math.max(geometry.small, Math.min(geometry.large, height - velocity * 180));
  return nearestPanelExtent(geometry, projected, current);
}
