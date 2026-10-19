export type OrientationRulerProjection = {
  stepPx: number;
  zeroOffsetPx: number;
};

type Rect = { left: number; width: number };
function rect(value: unknown): Rect | null {
  if (!value || typeof value !== "object") return null;
  const { left, width } = value as Partial<Rect>;
  return typeof left === "number" && Number.isFinite(left) &&
    typeof width === "number" && Number.isFinite(width) && width > 0 ? { left, width } : null;
}

// Axis, tick 0, tick 1 and the ScrollView's actual offset come from one
// selector batch. CSS rpx conversion does not establish native tick cadence.
export function orientationRulerProjection(values: readonly unknown[]): OrientationRulerProjection | null {
  const axis = rect(values[0]), first = rect(values[1]), second = rect(values[2]);
  const scrollLeft = (values[3] as { scrollLeft?: unknown } | undefined)?.scrollLeft;
  if (!axis || !first || !second || typeof scrollLeft !== "number" ||
    !Number.isFinite(scrollLeft) || scrollLeft < 0) return null;
  const firstCenter = first.left + first.width / 2;
  const stepPx = second.left + second.width / 2 - firstCenter;
  const zeroOffsetPx = scrollLeft + firstCenter - (axis.left + axis.width / 2);
  return Number.isFinite(stepPx) && stepPx > 0 && Number.isFinite(zeroOffsetPx)
    ? { stepPx, zeroOffsetPx } : null;
}

/** Sky's native layout only; selection/time/scroll settlement stay with their
 * existing owners. A missing layout uses the caller's nominal metric, then
 * retries at the next meaningful layout/interaction boundary. */
export function createOrientationRulerLayout(
  read: (accept: (values: readonly unknown[]) => void, current: () => boolean) => void,
  canAccept: () => boolean,
  onResolved: () => void,
) {
  let revision = 0, pending = false, needsMeasure = true;
  let projection: OrientationRulerProjection | null = null;
  const retire = () => { revision++; pending = false; };
  return {
    retire,
    invalidate(retainForDrag = false) {
      retire(); needsMeasure = true;
      if (!retainForDrag) projection = null;
    },
    measure() {
      if (!needsMeasure || pending || !canAccept()) return;
      const expected = ++revision;
      pending = true;
      const attempt = (remaining: number) => {
        const accept = (values: readonly unknown[]) => {
          if (expected !== revision) return;
          if (!canAccept()) { pending = false; return; }
          const next = orientationRulerProjection(values);
          if (next) {
            projection = next; needsMeasure = false; pending = false; onResolved();
          } else if (remaining > 0) attempt(remaining - 1);
          else { pending = false; onResolved(); }
        };
        try { read(accept, () => expected === revision && canAccept()); } catch { accept([]); }
      };
      // One next-layout retry handles nodes not installed on the first tick.
      // No timer/poll loop and no query on playback or continuous scrolling.
      attempt(1);
    },
    left(index: number, nominalStepPx: number) {
      return Math.max(0, (projection?.zeroOffsetPx ?? 0) + index * (projection?.stepPx ?? nominalStepPx));
    },
    index(left: number, nominalStepPx: number) {
      return (left - (projection?.zeroOffsetPx ?? 0)) / (projection?.stepPx ?? nominalStepPx);
    },
  };
}
