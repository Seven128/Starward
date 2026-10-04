export const SKY_GPU_TEXTURE_BYTE_BUDGET = 16 * 1024 * 1024;
export function skyImageRgbaBytes(source: object): number | null {
  const { width, height } = source as { width?: number; height?: number };
  const bytes = Number(width) * Number(height) * 4;
  return Number(width) > 0 && Number(height) > 0 && Number.isFinite(bytes) ? bytes : null;
}
interface Window { x: number; y: number; width: number; height: number }
interface Entry { texture: WebGLTexture | null; bytes: number; window: Window }
const contains = (a: Window, b: Window) => a.x <= b.x && a.y <= b.y &&
  a.x + a.width >= b.x + b.width && a.y + a.height >= b.y + b.height;

export function createSkyGpuTextures(gl: WebGLRenderingContext, imageFailed?: (image: object) => void,
  byteBudget = SKY_GPU_TEXTURE_BYTE_BUDGET) {
  if (!Number.isFinite(byteBudget) || byteBudget <= 0) throw new Error("sky_gpu_invalid_texture_budget");
  const entries = new Map<object, Entry>(), used = new Set<object>(), previousFrame = new Set<object>();
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
  const getWindow = (source: object, requested?: Window): Entry => {
    used.add(source);
    const dimensions = source as { width: number; height: number };
    const full = { x: 0, y: 0, width: dimensions.width, height: dimensions.height };
    const wanted = !copyUnavailable && requested &&
      Object.values(requested).every(Number.isInteger) && requested.width > 0 && requested.height > 0 &&
      contains(full, requested) ? requested : full;
    const cached = entries.get(source);
    const copyCachedFull = Boolean(cached?.texture && contains(cached.window, full) &&
      wanted.width * wanted.height < full.width * full.height);
    if (cached && (!cached.texture || contains(cached.window, wanted)) && !copyCachedFull) {
      entries.delete(source); entries.set(source, cached);
      return cached;
    }
    const priorError = gl.getError();
    if (priorError !== gl.NO_ERROR) throw new Error(`sky_gpu_draw_failed:${priorError}`);
    // Transfer a full resident into this synchronous copy operation; do not
    // upload its native image again when returning from a whole-sky view.
    let texture: WebGLTexture | null = copyCachedFull ? cached!.texture : null;
    if (copyCachedFull) { entries.delete(source); bytes -= cached!.bytes; }
    else if (cached) remove(source);
    try {
      const size = skyImageRgbaBytes(source) ?? 0;
      if (!texture && size > 0 && Number.isFinite(size)) {
        // A partial resident needs its complete source upload to reconstruct.
        // Prefer ordinary textures with equal upload/resident cost under the
        // same budget, then release partial residents if still necessary.
        for (const [key, entry] of entries) {
          if (bytes + size <= byteBudget) break;
          if (entry.texture && !previousFrame.has(key) && entry.bytes >= (skyImageRgbaBytes(key) ?? entry.bytes)) remove(key);
        }
        for (const [key, entry] of entries) {
          if (bytes + size <= byteBudget) break;
          if (entry.texture && !previousFrame.has(key)) remove(key);
        }
      }
      if (!texture) {
        texture = gl.createTexture();
        if (!texture) throw new Error("sky_gpu_texture_unavailable");
        configure(texture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source as TexImageSource);
        if (gl.getError() !== gl.NO_ERROR || !(size > 0 && Number.isFinite(size))) throw new Error("sky_gpu_image_upload_failed");
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
          gl.copyTexImage2D(gl.TEXTURE_2D, 0, gl.RGBA, wanted.x, wanted.y, wanted.width, wanted.height, 0);
          if (gl.getError() !== gl.NO_ERROR) throw new Error("sky_gpu_copy_failed");
          gl.deleteTexture(texture); texture = cropped; cropped = null; window = wanted;
        } catch {
          if (gl.isContextLost()) throw new Error("sky_gpu_context_lost");
          // Source upload remains valid. A copy capability failure keeps the
          // whole source and latches this optional path for this GPU owner.
          copyUnavailable = true;
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
      ((globalThis as unknown as { trialDiagnostics?: string[] }).trialDiagnostics ??= []).push('texture:' + String(error));
      if (texture) gl.deleteTexture(texture);
      if (gl.isContextLost()) throw new Error("sky_gpu_context_lost");
      const entry = { texture: null, bytes: 0, window: full };
      entries.set(source, entry); imageFailed?.(source);
      return entry;
    }
  };
  return {
    begin() { previousFrame.clear(); for (const source of used) previousFrame.add(source); used.clear(); },
    get(source: object) { return getWindow(source).texture; }, getWindow,
    finish() {
      for (const key of entries.keys()) if (!used.has(key)) remove(key);
      for (const [key, entry] of entries) {
        if (bytes <= byteBudget) break;
        if (entry.texture && entry.bytes >= (skyImageRgbaBytes(key) ?? entry.bytes)) remove(key);
      }
      for (const [key, entry] of entries) { if (bytes <= byteBudget) break; if (entry.texture) remove(key); }
      previousFrame.clear();
    },
    dispose() { for (const key of entries.keys()) remove(key); used.clear(); previousFrame.clear(); },
  };
}
