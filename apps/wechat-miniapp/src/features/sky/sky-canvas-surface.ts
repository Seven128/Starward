import type { CanvasSize, SkyCanvasFrameCanvas } from "./sky-canvas-lifecycle";
import { createSkySelectionLayer, paintSkySelectionReticle } from "./sky-selection-reticle";
import { reportRuntimeError } from "../../services/runtime-error";

export interface SkyWebGLCanvas<Image = object> {
  width: number;
  height: number;
  getContext(type: "webgl", options?: { preserveDrawingBuffer: boolean }): WebGLRenderingContext | null;
  createImage(): Image;
}
export interface SkyDisplayCanvas extends SkyCanvasFrameCanvas {
  width: number;
  height: number;
  getContext(type: "2d"): {
    drawImage(source: object, x: number, y: number, width: number, height: number): void;
    clearRect(x: number, y: number, width: number, height: number): void;
    save(): void;
    restore(): void;
    scale(x: number, y: number): void;
    beginPath(): void;
    arc(x: number, y: number, radius: number, start: number, end: number): void;
    moveTo(x: number, y: number): void;
    lineTo(x: number, y: number): void;
    stroke(): void;
    strokeStyle: string;
    lineWidth: number;
    globalAlpha: number;
    // Text is an optional extension of the port; existing no-caption consumers
    // need only the original image/reticle capabilities.
    fillText?(text: string, x: number, y: number): void;
    measureText?(text: string): { width: number; actualBoundingBoxLeft?: number; actualBoundingBoxRight?: number;
      actualBoundingBoxAscent?: number; actualBoundingBoxDescent?: number };
    fill?(): void;
    font?: string;
    textAlign?: string;
    textBaseline?: string;
    direction?: string;
    fontKerning?: string;
    fontStretch?: string;
    fontVariantCaps?: string;
    textRendering?: string;
    letterSpacing?: string;
    wordSpacing?: string;
    fillStyle?: string;
    shadowColor?: string;
    shadowBlur?: number;
    shadowOffsetX?: number;
    shadowOffsetY?: number;
  } | null;
}
export interface SkyCanvasReticle {
  readonly x: number;
  readonly y: number;
  readonly radiusPx: number;
  readonly shape: "circle" | "cross";
  readonly color: string;
}
export interface SkyCanvasCaption {
  readonly text: string;
  readonly x: number;
  readonly y: number;
  readonly opacity: number;
  readonly font?: string;
  readonly lineHeight?: number;
  readonly color?: string;
  readonly letterSpacing?: number;
  readonly textAlign?: "left" | "center";
  readonly marker?: { readonly x: number; readonly y: number; readonly radius: number; readonly color?:string };
}
export interface SkyCanvasTextMetrics { readonly width: number; readonly left: number; readonly right: number;
  readonly ascent: number; readonly descent: number }
interface MeasuredCaption {
  readonly metrics: SkyCanvasTextMetrics;
  readonly advances: readonly number[] | null;
  readonly textUnits: number;
}
// This bounded working set covers all 88 constellation names plus changing
// object/target labels. Eviction only repeats exact measurement, never drops text.
export const SKY_TEXT_MEASUREMENT_CACHE_ENTRIES = 256;
// Bound long labels/advances as well as entry count; this is not a text limit.
const TEXT_MEASUREMENT_CACHE_UNITS = 16_384;
const systemLineHeight = (font: string) => font === "12px sans-serif" ? 18 : font === "600 14px sans-serif" ? 21 : null;
export interface SkyCanvasSurface<Image = object> {
  readonly node: SkyWebGLCanvas<Image>;
  readonly gl: WebGLRenderingContext;
  isCurrent(display: SkyDisplayCanvas, size: CanvasSize, pixelRatio: number, selectionDisplay?: SkyDisplayCanvas): boolean;
  /** Publish frame/source/pick identity only after this synchronous copy succeeds. */
  present(reticle?: SkyCanvasReticle | null, captions?: readonly SkyCanvasCaption[]): void;
  clearSelection(): void;
  disableSelectionLayer(): void;
  measureText(text: string, font: string, lineHeight: number, letterSpacing?:number): SkyCanvasTextMetrics;
  dispose(): void;
}

/** TWGL still owns Scene rendering and native images. A same-layer 2D node
 * presents its completed pixels so ordinary controls can compose above them.
 * No CPU readback, encoded image, second Scene, or per-frame canvas allocation. */
export function createSkyCanvasSurface<Image>(display: SkyDisplayCanvas, size: CanvasSize, pixelRatio: number,
  createWebGL: (size: CanvasSize) => SkyWebGLCanvas<Image>,
  selectionDisplay?: SkyDisplayCanvas): SkyCanvasSurface<Image> {
  const width = Math.round(size.width * pixelRatio), height = Math.round(size.height * pixelRatio);
  if (!Number.isFinite(pixelRatio) || pixelRatio <= 0 || !Number.isFinite(size.width) || size.width <= 0 ||
    !Number.isFinite(size.height) || size.height <= 0 ||
    !Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width <= 0 || height <= 0)
    throw new Error("sky_canvas_surface_size_invalid");
  let node: SkyWebGLCanvas<Image> | undefined, gl: WebGLRenderingContext | null = null, disposed = false;
  const textMeasurements = new Map<string, MeasuredCaption>();
  let retainedTextUnits = 0;
  let selectionLayer: ReturnType<typeof createSkySelectionLayer> | null = null;
  const retireSelection = () => {
    selectionLayer?.dispose(); selectionLayer = null;
    for (const axis of ["width", "height"] as const) {
      try { if (selectionDisplay && selectionDisplay[axis] !== 0) selectionDisplay[axis] = 0; }
      catch (error) { reportRuntimeError("native", "sky_selection_layer_retirement_failed", error); }
    }
  };
  const retire = () => {
    if (disposed) return;
    disposed = true;
    textMeasurements.clear(); retainedTextUnits = 0;
    retireSelection();
    // Each retirement step is independent; losing a native context must not
    // leave the other backing store or a retained Sources surface alive.
    try { gl?.getExtension("WEBGL_lose_context")?.loseContext(); } catch { /* already unavailable */ }
    try { if (node) node.width = 0; } catch { /* native node retired */ }
    try { if (node) node.height = 0; } catch { /* native node retired */ }
    try { display.width = 0; } catch { /* native node retired */ }
    try { display.height = 0; } catch { /* native node retired */ }
  };
  try {
    display.width = width; display.height = height;
    const context = display.getContext("2d");
    if (!context) throw new Error("sky_canvas_display_context_unavailable");
    node = createWebGL({ width, height });
    node.width = width; node.height = height;
    gl = node.getContext("webgl", { preserveDrawingBuffer: true });
    if (!gl) throw new Error("sky_canvas_webgl_context_unavailable");
    const ownedNode = node, ownedGl = gl;
    if (selectionDisplay) {
      try { selectionLayer = createSkySelectionLayer(selectionDisplay, width, height, pixelRatio); }
      catch (error) { reportRuntimeError("native", "sky_selection_layer_unavailable", error); retireSelection(); }
    }
    const measureCaption = (text: string, font: string, lineHeight: number, letterSpacing: number): MeasuredCaption => {
      if (disposed || !context.measureText) throw new Error("sky_canvas_text_context_unavailable");
      if (!Number.isFinite(letterSpacing) || !Number.isFinite(lineHeight) || lineHeight <= 0)
        throw new Error("sky_canvas_caption_invalid");
      // Only these existing system fonts are stable for the surface lifetime.
      // There is no application font loader. Custom/unknown fonts always take
      // the native path, including after asynchronous load/replacement under
      // the same family string. Do not enroll them without their loader owner.
      const key = systemLineHeight(font) !== null && letterSpacing >= 0 && text.length <= TEXT_MEASUREMENT_CACHE_UNITS
        ? JSON.stringify([font, text, lineHeight, letterSpacing, "left", "middle",
          context.direction, context.fontKerning, context.fontStretch, context.fontVariantCaps,
          context.textRendering, context.letterSpacing, context.wordSpacing]) : null;
      const cached = key === null ? undefined : textMeasurements.get(key);
      if (cached) {
        textMeasurements.delete(key!); textMeasurements.set(key!, cached);
        return cached;
      }
      let result: MeasuredCaption;
      context.save();
      try {
        context.font = font; context.textAlign = "left"; context.textBaseline = "middle";
        const positive = (value: number | undefined, fallback: number) =>
          Number.isFinite(value) && value! >= 0 ? value! : fallback;
        let metrics: SkyCanvasTextMetrics, advances: readonly number[] | null = null;
        if (letterSpacing !== 0) {
          const values = Array.from(text, glyph => context.measureText!(glyph));
          if (!values.length || values.some(value => !Number.isFinite(value.width) || value.width < 0))
            throw new Error("sky_canvas_caption_invalid");
          advances = Object.freeze(values.map(value => value.width));
          const width = advances.reduce((sum, value) => sum + value, 0) + (values.length - 1) * letterSpacing;
          const last = values.at(-1)!;
          metrics = { width, left: positive(values[0]!.actualBoundingBoxLeft, 0),
            right: Math.max(width, width - last.width + positive(last.actualBoundingBoxRight, last.width)),
            ascent: Math.max(lineHeight / 2, ...values.map(value => positive(value.actualBoundingBoxAscent, lineHeight / 2))),
            descent: Math.max(lineHeight / 2, ...values.map(value => positive(value.actualBoundingBoxDescent, lineHeight / 2))) };
        } else {
          // Keep native whole-string shaping/kerning when manual spacing is zero.
          const value = context.measureText(text);
          if (!Number.isFinite(value.width) || value.width < 0) throw new Error("sky_canvas_caption_invalid");
          metrics = { width: value.width, left: positive(value.actualBoundingBoxLeft, 0),
            right: Math.max(value.width, positive(value.actualBoundingBoxRight, value.width)),
            ascent: Math.max(lineHeight / 2, positive(value.actualBoundingBoxAscent, lineHeight / 2)),
            descent: Math.max(lineHeight / 2, positive(value.actualBoundingBoxDescent, lineHeight / 2)) };
        }
        // Retain only plain numeric copies, never native TextMetrics.
        result = { metrics: Object.freeze(metrics), advances, textUnits: text.length };
      } finally { context.restore(); }
      if (key !== null && Object.values(result.metrics).every(value => Number.isFinite(value) && value >= 0)) {
        while (textMeasurements.size >= SKY_TEXT_MEASUREMENT_CACHE_ENTRIES ||
          retainedTextUnits + text.length > TEXT_MEASUREMENT_CACHE_UNITS) {
          const oldest = textMeasurements.keys().next().value!;
          retainedTextUnits -= textMeasurements.get(oldest)!.textUnits;
          textMeasurements.delete(oldest);
        }
        textMeasurements.set(key, result); retainedTextUnits += text.length;
      }
      return result;
    };
    return {
      node: ownedNode, gl: ownedGl,
      isCurrent(next, nextSize, nextRatio, nextSelection) {
        return !disposed && next === display && width === Math.round(nextSize.width * nextRatio) &&
          height === Math.round(nextSize.height * nextRatio) && display.width === width && display.height === height &&
          ownedNode.width === width && ownedNode.height === height && !ownedGl.isContextLost() &&
          (!selectionLayer || selectionLayer.isCurrent(nextSelection));
      },
      measureText(text, font, lineHeight, letterSpacing=0) {
        if (disposed || !context.measureText) throw new Error("sky_canvas_text_context_unavailable");
        if (letterSpacing < 0) throw new Error("sky_canvas_caption_invalid");
        // A caller can retain/mutate its result without changing the painter's
        // private copy or a subsequent layout's bounds.
        const metrics = measureCaption(text, font, lineHeight, letterSpacing).metrics;
        return { width: metrics.width, left: metrics.left, right: metrics.right,
          ascent: metrics.ascent, descent: metrics.descent };
      },
      present(reticle, captions = []) {
        if (disposed || ownedGl.isContextLost() || display.width !== width || display.height !== height ||
          ownedNode.width !== width || ownedNode.height !== height)
          throw new Error("sky_canvas_surface_invalidated");
        ownedGl.flush();
        context.drawImage(ownedNode, 0, 0, width, height);
        if (captions.length) {
          if (!context.fillText || !context.measureText) throw new Error("sky_canvas_text_context_unavailable");
          context.save();
          try {
            context.scale(pixelRatio, pixelRatio);
            context.font = "12px sans-serif";
            context.textAlign = "left";
            context.textBaseline = "middle";
            context.fillStyle = "#becbdf";
            context.shadowColor = "#080d17";
            context.shadowBlur = 6 * pixelRatio;
            context.shadowOffsetX = 0;
            context.shadowOffsetY = pixelRatio;
            // The full-viewport display matches the original 1rpx spacing.
            // Native Canvas2D does not require a non-portable letterSpacing API.
            for (const caption of captions) {
              const font = caption.font ?? "12px sans-serif";
              context.font = font;
              context.fillStyle = caption.color ?? "#becbdf";
              const spacing = caption.letterSpacing ?? size.width / 750;
              context.globalAlpha = caption.opacity;
              if (![caption.x,caption.y,caption.opacity,spacing].every(Number.isFinite)) throw new Error("sky_canvas_caption_invalid");
              if (caption.marker) {
                if (!context.fill) throw new Error("sky_canvas_text_context_unavailable");
                context.fillStyle=caption.marker.color??caption.color??"#becbdf";
                context.beginPath();context.arc(caption.marker.x,caption.marker.y,caption.marker.radius,0,Math.PI*2);context.fill();
                context.fillStyle=caption.color??"#becbdf";
              }
              // Natural, measured whole names use no maxWidth or glyph scaling.
              const lineHeight = caption.lineHeight ?? systemLineHeight(font) ?? 18;
              if (spacing === 0) { const x=caption.textAlign==='center'
                ?caption.x-measureCaption(caption.text,font,lineHeight,spacing).metrics.width/2:caption.x;
                context.fillText(caption.text,x,caption.y);continue; }
              const glyphs = Array.from(caption.text);
              if (!glyphs.length) continue;
              const measured = measureCaption(caption.text,font,lineHeight,spacing), advances = measured.advances!;
              let x = caption.textAlign === "left" ? caption.x : caption.x -
                measured.metrics.width / 2;
              for (let index = 0; index < glyphs.length; index++) {
                context.fillText(glyphs[index]!, x, caption.y);
                x += advances[index]! + spacing;
              }
            }
          } finally { context.restore(); }
        }
        if (selectionLayer) {
          try { selectionLayer.paint(reticle); }
          catch (error) { reportRuntimeError("native", "sky_selection_layer_paint_failed", error); retireSelection(); }
        }
        if (!selectionLayer && reticle) paintSkySelectionReticle(context, reticle, pixelRatio);
      },
      clearSelection() {
        try { selectionLayer?.clear(); }
        catch (error) { reportRuntimeError("native", "sky_selection_layer_clear_failed", error); retireSelection(); }
      },
      disableSelectionLayer: retireSelection,
      dispose: retire,
    };
  } catch (error) { retire(); throw error; }
}
