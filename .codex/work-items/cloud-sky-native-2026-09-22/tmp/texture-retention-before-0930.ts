/** One native-image owner for survey imagery and constellation art. Identity is
 * the decoded image object, never a URL whose bytes may change after retry. */
export const SKY_GPU_TEXTURE_BYTE_BUDGET = 16 * 1024 * 1024;

/** The upload owner and source-resolution selection use the same RGBA cost.
 * Unknown dimensions cannot be treated as an empty texture. */
export function skyImageRgbaBytes(source: object): number | null {
  const { width, height } = source as { width?: number; height?: number };
  const bytes = Number(width) * Number(height) * 4;
  return Number(width) > 0 && Number(height) > 0 && Number.isFinite(bytes) ? bytes : null;
}

export function createSkyGpuTextures(gl: WebGLRenderingContext, imageFailed?: (image: object) => void,
  byteBudget = SKY_GPU_TEXTURE_BYTE_BUDGET) {
  if (!Number.isFinite(byteBudget) || byteBudget <= 0) throw new Error("sky_gpu_invalid_texture_budget");
  const entries = new Map<object, { texture: WebGLTexture | null; bytes: number }>();
  const used = new Set<object>();
  const previousFrame = new Set<object>();
  let bytes = 0;
  const remove = (source: object) => {
    const entry = entries.get(source);
    if (entry?.texture) gl.deleteTexture(entry.texture);
    bytes -= entry?.bytes ?? 0;
    entries.delete(source);
  };
  return {
    begin() {
      previousFrame.clear();
      for (const source of used) previousFrame.add(source);
      used.clear();
    },
    get(source: object): WebGLTexture | null {
      used.add(source);
      const cached = entries.get(source);
      if (cached) {
        // Map insertion order is LRU. Failed identities also remain latched
        // until unused or replaced by a newly decoded retry image.
        entries.delete(source); entries.set(source,cached);
        return cached.texture;
      }
      const priorError = gl.getError();
      if (priorError !== gl.NO_ERROR) throw new Error(`sky_gpu_draw_failed:${priorError}`);
      let texture: WebGLTexture | null = null;
      try {
        const size = skyImageRgbaBytes(source) ?? 0;
        if (Number.isFinite(size) && size > 0) {
          // Keep last frame's reusable textures through this submission. If
          // the visible set exceeds retention, evicting them here creates a
          // full cyclic re-upload even with an unchanged field. Temporary
          // frame ownership is trimmed by finish; this allowance does not
          // claim to cap upload/driver peak memory.
          for (const key of entries.keys()) {
            if (bytes+size <= byteBudget) break;
            if (!previousFrame.has(key)) remove(key);
          }
        }
        texture = gl.createTexture();
        if (!texture) throw new Error("sky_gpu_texture_unavailable");
        gl.bindTexture(gl.TEXTURE_2D,texture);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);
        gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,source as TexImageSource);
        if (gl.getError() !== gl.NO_ERROR || !(size > 0 && Number.isFinite(size))) throw new Error("sky_gpu_image_upload_failed");
        entries.set(source,{texture,bytes:size}); bytes+=size;
        return texture;
      } catch {
        if (texture) gl.deleteTexture(texture);
        if (gl.isContextLost()) throw new Error("sky_gpu_context_lost");
        entries.set(source,{texture:null,bytes:0});
        imageFailed?.(source);
        return null;
      }
    },
    finish() {
      for (const key of entries.keys()) if (!used.has(key)) remove(key);
      for (const key of entries.keys()) { if (bytes <= byteBudget) break; remove(key); }
      previousFrame.clear();
    },
    dispose() { for (const key of entries.keys()) remove(key); used.clear(); previousFrame.clear(); },
  };
}
