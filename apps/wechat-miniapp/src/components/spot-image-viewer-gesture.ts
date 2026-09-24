export type ViewerGestureAxis = "horizontal" | "vertical";
export type ViewerDragFrame = { x: number; y: number; scale: number; backdrop: number };

export const REST_FRAME: ViewerDragFrame = { x: 0, y: 0, scale: 1, backdrop: .98 };

export type ViewerTouchPoint = { x: number; y: number };

export function viewerEndPoint(reported: ViewerTouchPoint | null, last: ViewerTouchPoint | null): ViewerTouchPoint | null {
  // WEAPP may expose an empty (0, 0) changedTouch after a valid move.
  return reported?.x === 0 && reported.y === 0 && last ? last : reported ?? last;
}

/** The edge image resists a swipe that has no neighboring photo. */
export function viewerDragFrame(axis: ViewerGestureAxis, dx: number, dy: number, index: number, count: number): ViewerDragFrame {
  if (axis === "horizontal") {
    const blocked = dx > 0 ? index === 0 : index === count - 1;
    return { ...REST_FRAME, x: blocked ? dx * .25 : dx };
  }
  const y = Math.max(0, Math.min(480, dy));
  return { x: dx * .25, y, scale: Math.max(.55, 1 - y / 650), backdrop: .98 * Math.max(.25, 1 - y / 380) };
}

export function viewerRelease(axis: ViewerGestureAxis | null, dx: number, dy: number, index: number, count: number):
  { kind: "close" } | { kind: "page"; index: number } | { kind: "rebound" } {
  if (axis === "vertical" && dy > 85) return { kind: "close" };
  if (axis === "horizontal" && Math.abs(dx) > 60) {
    const next = index + (dx < 0 ? 1 : -1);
    if (next >= 0 && next < count) return { kind: "page", index: next };
  }
  return { kind: "rebound" };
}
