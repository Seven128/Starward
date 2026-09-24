export type ViewerGestureAxis = "horizontal" | "vertical";
export type ViewerDragFrame = { x: number; y: number; scale: number; backdrop: number };

export const REST_FRAME: ViewerDragFrame = { x: 0, y: 0, scale: 1, backdrop: .98 };

export type ViewerTouchPoint = { x: number; y: number };
export type ViewerRect = { left: number; top: number; width: number; height: number };

export function viewerStageRect(windowWidth: number, windowHeight: number, frame: ViewerDragFrame = REST_FRAME): ViewerRect {
  const height = Math.min(windowHeight * .72, Math.max(0, windowHeight - 240));
  return {
    left: (windowWidth * (1 - frame.scale)) / 2 + frame.x,
    top: windowHeight / 2 - height * frame.scale / 2 + frame.y,
    width: windowWidth * frame.scale,
    height: height * frame.scale,
  };
}

export function viewerImageRect(windowWidth: number, windowHeight: number, aspectRatio: number, frame: ViewerDragFrame = REST_FRAME): ViewerRect {
  const stage = viewerStageRect(windowWidth, windowHeight);
  const width = Math.min(stage.width, stage.height * aspectRatio);
  const height = width / aspectRatio;
  return {
    left: (windowWidth - width * frame.scale) / 2 + frame.x,
    top: (windowHeight - height * frame.scale) / 2 + frame.y,
    width: width * frame.scale,
    height: height * frame.scale,
  };
}

export function viewerSourceRect(value: unknown, windowWidth: number, windowHeight: number): ViewerRect | null {
  if (!value || typeof value !== "object") return null;
  const rect = value as Partial<ViewerRect>;
  const { left, top, width, height } = rect;
  if (![left, top, width, height].every(Number.isFinite) || width! < 16 || height! < 16
    || left! < 0 || top! < 0 || left! + width! > windowWidth + 1 || top! + height! > windowHeight + 1) return null;
  return { left: left!, top: top!, width: width!, height: height! };
}

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
