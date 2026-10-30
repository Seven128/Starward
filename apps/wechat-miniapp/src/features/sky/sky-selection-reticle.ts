import type { SkyCanvasReticle, SkyDisplayCanvas } from "./sky-canvas-surface";

type Context = NonNullable<ReturnType<SkyDisplayCanvas["getContext"]>>;
type Segment = readonly [number, number, number, number];

/** The name occupies the top; only left, right and bottom mark the object. */
export function skySelectionReticleSegments(reticle: SkyCanvasReticle): readonly Segment[] {
  const { x, y, radiusPx } = reticle;
  if (![x, y, radiusPx].every(Number.isFinite) || radiusPx < 0) return [];
  const inner = Math.max(10, radiusPx + 4), outer = inner + 7;
  return [[x - outer, y, x - inner, y], [x + inner, y, x + outer, y], [x, y + inner, x, y + outer]];
}

export function paintSkySelectionReticle(context: Context, reticle: SkyCanvasReticle,
  pixelRatio: number, opacity = .8, segments = skySelectionReticleSegments(reticle)): void {
  if (!segments.length) return;
  context.save();
  try {
    context.scale(pixelRatio, pixelRatio);
    context.strokeStyle = reticle.color;
    context.lineWidth = 1.5;
    context.globalAlpha = opacity;
    context.beginPath();
    for (const [x1, y1, x2, y2] of segments) { context.moveTo(x1, y1); context.lineTo(x2, y2); }
    context.stroke();
  } finally { context.restore(); }
}

/** Transparent pixels move with the accepted copy. CSS owns opacity; this
 * owner has no clock, background copy or access to the Scene. */
export function createSkySelectionLayer(display: SkyDisplayCanvas, width: number, height: number, pixelRatio: number) {
  display.width = 0; display.height = 0;
  let context: Context | null = null;
  let previous: readonly Segment[] = [], disposed = false;
  const clear = () => {
    for (const [x1, y1, x2, y2] of previous) {
      const left = Math.floor(Math.min(x1, x2) * pixelRatio - 2 * pixelRatio - 1);
      const top = Math.floor(Math.min(y1, y2) * pixelRatio - 2 * pixelRatio - 1);
      context!.clearRect(left, top, Math.ceil(Math.abs(x2 - x1) * pixelRatio + 4 * pixelRatio + 2),
        Math.ceil(Math.abs(y2 - y1) * pixelRatio + 4 * pixelRatio + 2));
    }
    previous = [];
  };
  return {
    isCurrent(node: SkyDisplayCanvas | undefined) {
      return !disposed && display === node && display.width === (context ? width : 0) && display.height === (context ? height : 0);
    },
    paint(reticle?: SkyCanvasReticle | null, selectionActive = Boolean(reticle)) {
      if (disposed) return;
      if (!selectionActive) { this.clear(); return; }
      // A new exact-time sky can precede its selected object's position.
      // Hide the old strokes without retiring the live selection's backing;
      // the next qualified position reuses it. No backing is allocated early.
      if (!reticle) { clear(); return; }
      if (!context) {
        display.width = width; display.height = height;
        context = display.getContext("2d");
        if (!context) throw new Error("sky_selection_layer_context_unavailable");
      }
      clear();
      previous = skySelectionReticleSegments(reticle);
      paintSkySelectionReticle(context, reticle, pixelRatio, 1, previous);
    },
    clear() {
      if (disposed) return;
      previous = []; context = null;
      // A failed getContext can still leave allocated backing. Inspect the
      // dimensions, rather than treating a missing context as already retired.
      if (display.width !== 0) display.width = 0;
      if (display.height !== 0) display.height = 0;
    },
    dispose() { if (disposed) return; disposed = true; previous = []; context = null; },
  };
}
