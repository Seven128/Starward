import { validBasis, type SkyVector, type SkyViewBasis } from "./sky-view-projection";

export type DirectionAlignmentMode = "auto" | "editing" | "aligned" | "needs-alignment";
export interface DirectionAlignmentSnapshot {
  readonly epoch: number;
  readonly ready: boolean;
  readonly mode: DirectionAlignmentMode;
  readonly view: SkyViewBasis | null;
}
const axes = ["right", "up", "forward"] as const;
const copy = (basis: SkyViewBasis): SkyViewBasis => ({
  right: [...basis.right], up: [...basis.up], forward: [...basis.forward],
});
const dot = (a: SkyVector, b: SkyVector) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

// target * transpose(reference) * current: the complete rigid rotation,
// including roll and the poles, without inferring magnetic accuracy.
function applyReference(reference: SkyViewBasis, target: SkyViewBasis, current: SkyViewBasis): SkyViewBasis {
  const rotate = (vector: SkyVector): SkyVector => {
    const local = axes.map(key => dot(reference[key], vector));
    const component = (i: number) => axes.reduce((sum, key, k) => sum + target[key][i]! * local[k]!, 0);
    return [component(0), component(1), component(2)];
  };
  return { right: rotate(current.right), up: rotate(current.up), forward: rotate(current.forward) };
}

/** Session-only visual alignment. Raw sampling must precede any render throttle. */
export function createDirectionAlignment({ now = () => Date.now() }: { now?: () => number } = {}) {
  let epoch = 0;
  let active = false;
  let raw: SkyViewBasis | null = null;
  let view: SkyViewBasis | null = null;
  let lastAt = -Infinity;
  let correction: { reference: SkyViewBasis; target: SkyViewBasis } | null = null;
  let frozen: SkyViewBasis | null = null;
  let needsAlignment = false;
  const redraw = () => {
    if (!raw || frozen || needsAlignment) return;
    view = correction ? applyReference(correction.reference, correction.target, raw) : copy(raw);
  };
  const ready = () => active && raw !== null && now() - lastAt >= 0 && now() - lastAt <= 500;
  const snapshot = (): DirectionAlignmentSnapshot => ({ epoch, ready: ready(),
    mode: frozen ? "editing" : needsAlignment ? "needs-alignment" : correction ? "aligned" : "auto",
    view: view ? copy(view) : null });
  return {
    snapshot,
    startReference() {
      needsAlignment = needsAlignment || correction !== null || frozen !== null;
      epoch += 1; active = true; raw = null; lastAt = -Infinity;
      correction = null; frozen = null;
      return epoch;
    },
    endReference(presented?: SkyViewBasis | null) {
      if (validBasis(presented)) view = copy(presented);
      needsAlignment = needsAlignment || correction !== null || frozen !== null;
      active = false; raw = null; correction = null; frozen = null;
    },
    update(reference: number, basis: SkyViewBasis, at: number) {
      if (!active || reference !== epoch || !validBasis(basis) || !Number.isFinite(at) || at <= lastAt) return false;
      raw = copy(basis); lastAt = at; redraw(); return true;
    },
    begin(presented: SkyViewBasis | null = view) {
      if (!ready() || frozen || !validBasis(presented)) return false;
      frozen = copy(presented); view = copy(frozen); return true;
    },
    commit() {
      if (!frozen || !raw || !ready()) return false;
      correction = { reference: copy(raw), target: copy(frozen) };
      frozen = null; needsAlignment = false; redraw(); return true;
    },
    cancel() {
      if (!frozen) return false;
      frozen = null; redraw(); return true;
    },
    // Diagnostic reset, deliberately not a product action: discards alignment.
    restoreAuto() {
      if (!ready()) return false;
      correction = null; frozen = null; needsAlignment = false; redraw(); return true;
    },
  };
}
