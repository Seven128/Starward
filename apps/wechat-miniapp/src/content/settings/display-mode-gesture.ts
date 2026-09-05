import type { DisplayMode } from "@starward/miniapp-contracts";

export const DISPLAY_MODES: readonly DisplayMode[] = ["DAY", "NIGHT", "OBSERVATION"];
export const DISPLAY_MODE_LABEL: Record<DisplayMode, string> = {
  DAY: "日间", NIGHT: "夜间", OBSERVATION: "观测红光",
};

export function tappedMode(current: DisplayMode, target: DisplayMode): DisplayMode {
  return current === target
    ? DISPLAY_MODES[(DISPLAY_MODES.indexOf(current) + 1) % DISPLAY_MODES.length]!
    : target;
}

export type ModeDrag = {
  x: number; y: number; lastX: number; lastAt: number;
  origin: number; position: number; step: number; velocity: number;
  axis: "pending" | "horizontal" | "vertical";
};

export function moveModeDrag(drag: ModeDrag, x: number, y: number, at: number) {
  const dx = x - drag.x;
  const dy = y - drag.y;
  if (drag.axis === "pending" && Math.max(Math.abs(dx), Math.abs(dy)) >= 8)
    drag.axis = Math.abs(dx) > Math.abs(dy) ? "horizontal" : "vertical";
  if (drag.axis === "horizontal" && drag.step > 0) {
    drag.position = Math.max(0, Math.min(2, drag.origin + dx / drag.step));
    const elapsed = at - drag.lastAt;
    if (elapsed > 0) drag.velocity = (x - drag.lastX) / elapsed;
  }
  drag.lastX = x;
  drag.lastAt = at;
  return drag;
}

export function releasedMode(drag: ModeDrag, committed: DisplayMode, at: number): DisplayMode {
  if (drag.axis !== "horizontal" || !(drag.step > 0)) return committed;
  const origin = DISPLAY_MODES.indexOf(committed);
  const velocity = at - drag.lastAt <= 100 ? drag.velocity : 0;
  const projected = Math.round(drag.position + velocity * 120 / drag.step);
  const index = Math.max(0, Math.min(2, Math.max(origin - 1, Math.min(origin + 1, projected))));
  return DISPLAY_MODES[index]!;
}
