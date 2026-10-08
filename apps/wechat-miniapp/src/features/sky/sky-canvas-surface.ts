import type { CanvasSize } from "./sky-canvas-lifecycle";

export interface SkyWebGLCanvas<Image = object> {
  width: number;
  height: number;
  getContext(type: "webgl", options?: { preserveDrawingBuffer: boolean }): WebGLRenderingContext | null;
  createImage(): Image;
}
export interface SkyDisplayCanvas {
  width: number;
  height: number;
  getContext(type: "2d"): {
    drawImage(source: object, x: number, y: number, width: number, height: number): void;
    clearRect(x: number, y: number, width: number, height: number): void;
  } | null;
}
export interface SkyCanvasSurface<Image = object> {
  readonly node: SkyWebGLCanvas<Image>;
  readonly gl: WebGLRenderingContext;
  isCurrent(display: SkyDisplayCanvas, size: CanvasSize, pixelRatio: number): boolean;
  /** Publish frame/source/pick identity only after this synchronous copy succeeds. */
  present(): void;
  dispose(): void;
}

/** TWGL still owns Scene rendering and native images. A same-layer 2D node
 * presents its completed pixels so ordinary controls can compose above them.
 * No CPU readback, encoded image, second Scene, or per-frame canvas allocation. */
export function createSkyCanvasSurface<Image>(display: SkyDisplayCanvas, size: CanvasSize, pixelRatio: number,
  createWebGL: (size: CanvasSize) => SkyWebGLCanvas<Image>): SkyCanvasSurface<Image> {
  const width = Math.round(size.width * pixelRatio), height = Math.round(size.height * pixelRatio);
  if (!Number.isFinite(pixelRatio) || pixelRatio <= 0 || !Number.isFinite(size.width) || size.width <= 0 ||
    !Number.isFinite(size.height) || size.height <= 0 ||
    !Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width <= 0 || height <= 0)
    throw new Error("sky_canvas_surface_size_invalid");
  let node: SkyWebGLCanvas<Image> | undefined, gl: WebGLRenderingContext | null = null, disposed = false;
  const retire = () => {
    if (disposed) return;
    disposed = true;
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
    return {
      node: ownedNode, gl: ownedGl,
      isCurrent(next, nextSize, nextRatio) {
        return !disposed && next === display && width === Math.round(nextSize.width * nextRatio) &&
          height === Math.round(nextSize.height * nextRatio) && display.width === width && display.height === height &&
          ownedNode.width === width && ownedNode.height === height && !ownedGl.isContextLost();
      },
      present() {
        if (disposed || ownedGl.isContextLost() || display.width !== width || display.height !== height ||
          ownedNode.width !== width || ownedNode.height !== height)
          throw new Error("sky_canvas_surface_invalidated");
        ownedGl.flush();
        context.drawImage(ownedNode, 0, 0, width, height);
      },
      dispose: retire,
    };
  } catch (error) { retire(); throw error; }
}
