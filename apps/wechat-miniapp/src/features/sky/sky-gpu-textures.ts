/** Shared decoded-image identity, upload failure and GPU texture ownership.
 * Optional source windows retain original texels; URL/bitmap/file ownership
 * and explicit retry remain with the native-image loader. */
import { skyNativeImageIsCurrent } from "./sky-artwork-loader";
import { reportRuntimeError } from "../../services/runtime-error";
/** Allocation pressure target, shared with source-resolution selection.
 * Current-frame textures remain resident even above it: trimming that working
 * set would upload the same visible images again on every stationary frame.
 * Active demand, source upload/copy and driver memory need separate measurement. */
export const SKY_GPU_TEXTURE_PRESSURE_BYTES = 16 * 1024 * 1024;
/** Full native-source cost remains shared with source-resolution selection. */
export function skyImageRgbaBytes(source: object): number | null {
  const { width, height } = source as { width?: number; height?: number };
  const bytes = Number(width) * Number(height) * 4;
  return Number(width) > 0 && Number(height) > 0 && Number.isFinite(bytes) ? bytes : null;
}
export interface SkyGpuTextureWindow {
  readonly x: number; readonly y: number; readonly width: number; readonly height: number;
}
interface Entry { texture: WebGLTexture | null; bytes: number; window: SkyGpuTextureWindow }
const contains = (a: SkyGpuTextureWindow, b: SkyGpuTextureWindow) => a.x <= b.x && a.y <= b.y &&
  a.x + a.width >= b.x + b.width && a.y + a.height >= b.y + b.height;

export function createSkyGpuTextures(gl: WebGLRenderingContext, imageFailed?: (image: object) => void,
  pressureBytes = SKY_GPU_TEXTURE_PRESSURE_BYTES) {
  if (!Number.isFinite(pressureBytes) || pressureBytes <= 0) throw new Error("sky_gpu_invalid_texture_budget");
  const entries = new Map<object, Entry>(), used = new Set<object>(), pinned = new Set<object>();
  const framePins = new Set<object>();
  let bytes = 0, copyUnavailable = false;
  const remove = (source: object) => {
    const entry = entries.get(source);
    if (entry?.texture) gl.deleteTexture(entry.texture);
    bytes -= entry?.bytes ?? 0;
    entries.delete(source);
  };
  const configure = (texture: WebGLTexture) => {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  };
  const getWindow = (source: object, requested?: SkyGpuTextureWindow, exact = false): Entry => {
    const dimensions = source as { width: number; height: number };
    const full = { x: 0, y: 0, width: dimensions.width, height: dimensions.height };
    // A queued frame can outlive file retirement and React cleanup. Both a
    // previously uploaded texture and a new upload must obey the live owner.
    if (!skyNativeImageIsCurrent(source)) {
      remove(source); used.delete(source);
      return { texture: null, bytes: 0, window: full };
    }
    used.add(source);
    const requestedWindow = !copyUnavailable && requested &&
      Object.values(requested).every(Number.isInteger) && requested.width > 0 && requested.height > 0 &&
      contains(full, requested) ? requested : full;
    const cached = entries.get(source);
    // Ordinary artwork can keep its complete source while it fits the existing
    // pressure allowance. An existing crop that already covers the request
    // also stays valid when unrelated demand leaves more headroom; promoting
    // it solely because the budget changed would upload the same pixels again.
    // The panorama caller supplies its canonical window, preserving cold/warm
    // sampling independently of transient headroom or prior resident coverage.
    const sourceBytes = skyImageRgbaBytes(source);
    const wanted = !exact && sourceBytes !== null &&
      bytes - (cached?.bytes ?? 0) + sourceBytes <= pressureBytes
      ? cached?.texture && contains(cached.window, requestedWindow) ? cached.window : full
      : requestedWindow;
    const sameWindow = cached && cached.window.x === wanted.x && cached.window.y === wanted.y &&
      cached.window.width === wanted.width && cached.window.height === wanted.height;
    const copyCachedWindow = Boolean(cached?.texture && contains(cached.window, wanted) &&
      (exact || contains(cached.window, full)) &&
      wanted.width * wanted.height < cached.window.width * cached.window.height);
    if (cached && (!cached.texture || (exact ? sameWindow : contains(cached.window, wanted))) && !copyCachedWindow) {
      entries.delete(source); entries.set(source, cached);
      return cached;
    }
    const priorError = gl.getError();
    if (priorError !== gl.NO_ERROR) throw new Error(`sky_gpu_draw_failed:${priorError}`);
    // Transfer a containing resident into this synchronous copy operation.
    // A canonical smaller window need not reupload the complete native image.
    let texture: WebGLTexture | null = copyCachedWindow ? cached!.texture : null;
    const copiedFrom = copyCachedWindow ? cached!.window : full;
    if (copyCachedWindow) { entries.delete(source); bytes -= cached!.bytes; }
    else if (cached) remove(source);
    try {
      const size = sourceBytes ?? 0;
      // Current-frame identities remain protected during submission. Failed
      // zero-byte identities retain their latch independently of byte pressure.
      if (!texture && size > 0 && Number.isFinite(size)) {
        // A partial resident needs its complete source upload to reconstruct.
        // Prefer ordinary textures with equal upload/resident cost under the
        // pressure target, then release inactive partial residents if needed.
        for (const [key, entry] of entries) {
          if (bytes + size <= pressureBytes) break;
          if (entry.texture && !used.has(key) && !pinned.has(key) && !framePins.has(key) && entry.bytes >= (skyImageRgbaBytes(key) ?? entry.bytes)) remove(key);
        }
        for (const [key, entry] of entries) {
          if (bytes + size <= pressureBytes) break;
          if (entry.texture && !used.has(key) && !pinned.has(key) && !framePins.has(key)) remove(key);
        }
      }
      if (!texture) {
        texture = gl.createTexture();
        if (!texture) throw new Error("sky_gpu_texture_unavailable");
        configure(texture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);

        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source as TexImageSource);

        const uploadError = gl.getError();
        if (uploadError !== gl.NO_ERROR) throw new Error(`sky_gpu_draw_failed:${uploadError}`);
        if (!(size > 0 && Number.isFinite(size))) throw new Error("sky_gpu_image_upload_failed");
      }
      let window = full;
      if (wanted.width * wanted.height < full.width * full.height) {
        const previousFramebuffer = gl.getParameter(gl.FRAMEBUFFER_BINDING) as WebGLFramebuffer | null;
        let framebuffer: WebGLFramebuffer | null = null, cropped: WebGLTexture | null = null;
        try {
          framebuffer = gl.createFramebuffer();
          if (!framebuffer) throw new Error("sky_gpu_copy_framebuffer_unavailable");
          gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
          gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
          if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) throw new Error("sky_gpu_copy_incomplete");
          cropped = gl.createTexture();
          if (!cropped) throw new Error("sky_gpu_copy_texture_unavailable");
          configure(cropped);

          gl.copyTexImage2D(gl.TEXTURE_2D, 0, gl.RGBA, wanted.x-copiedFrom.x, wanted.y-copiedFrom.y, wanted.width, wanted.height, 0);

          const copyError = gl.getError();
          if (copyError !== gl.NO_ERROR) throw new Error(`sky_gpu_draw_failed:${copyError}`);
          gl.deleteTexture(texture); texture = cropped; cropped = null; window = wanted;
        } catch (error) {
          if (gl.isContextLost()) throw error;
          reportRuntimeError("render", "sky_gpu_texture_copy_failed", error, { stage: "texture_copy" });
          // Source upload remains valid. A copy capability failure keeps the
          // whole source and latches this optional path for this GPU owner.
          copyUnavailable = true;
          // A failed copy still owns the original resident and its coordinates.
          window = copiedFrom;
          gl.getError();
        } finally {
          gl.bindFramebuffer(gl.FRAMEBUFFER, previousFramebuffer);
          if (framebuffer) gl.deleteFramebuffer(framebuffer);
          if (cropped) gl.deleteTexture(cropped);
        }
      }
      const entry = { texture, window, bytes: window.width * window.height * 4 };
      entries.set(source, entry); bytes += entry.bytes;
      return entry;
    } catch (error) {
      reportRuntimeError("render", "sky_gpu_texture_failed", error, { stage: "texture_upload" });
      if (texture) gl.deleteTexture(texture);
      if (gl.isContextLost()) throw new Error("sky_gpu_context_lost");
      const entry = { texture: null, bytes: 0, window: full };
      entries.set(source, entry); imageFailed?.(source);
      return entry;
    }
  };
  return {
    begin(images: readonly object[] = []) {
      for (const source of entries.keys()) if (!skyNativeImageIsCurrent(source)) remove(source);
      used.clear();
      // A prepared current-frame draw can follow an allocating background
      // pass. Protect its existing residents before that first allocation.
      // This declaration neither uploads nor grants rendered/source credit.
      framePins.clear();
      for (const source of images) framePins.add(source);
    },
    get(source: object) { return getWindow(source).texture; }, getWindow,
    /** One canonical sampling window for the same panorama and view, cold or
     * warm. A source within the existing single-source allowance keeps all its
     * texels while moving, avoiding reconstruction at each crop boundary. This
     * choice depends only on immutable source dimensions, not other residents.
     * Larger sources retain the exact quantized viewport crop. Both paths keep
     * the original texels, LINEAR filtering, frame pins and retirement owner. */
    getPanoramaWindow(source: object, window: SkyGpuTextureWindow) {
      const sourceBytes = skyImageRgbaBytes(source);
      const dimensions = source as { width: number; height: number };
      const canonical = sourceBytes !== null && sourceBytes <= pressureBytes
        ? { x: 0, y: 0, width: dimensions.width, height: dimensions.height } : window;
      return getWindow(source, canonical, true);
    },
    /** Synchronous multi-texture prepare/submit lease protects sources that have
     * not yet been used by this frame, including nested scopes and exceptions.
     * A pin does not preserve an old window when that same identity is replaced. */
    withPinned<T>(sources: readonly object[], submit: () => T): T {
      const added = [...new Set(sources)].filter(source => !pinned.has(source));
      added.forEach(source => pinned.add(source));
      try { return submit(); }
      finally { added.forEach(source => pinned.delete(source)); }
    },
    finish() {
      // Retain the actual working set, not an accumulating multi-frame cache.
      // Never retire a visible source just to reupload it on the next frame.
      for (const key of entries.keys()) if (!used.has(key)) remove(key);
      framePins.clear();
    },
    dispose() { for (const key of entries.keys()) remove(key); used.clear(); pinned.clear(); framePins.clear(); },
  };
}
