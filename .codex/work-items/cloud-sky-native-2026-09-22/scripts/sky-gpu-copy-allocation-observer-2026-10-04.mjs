/** Task-only logical allocation model, not driver/native physical memory.
 * Observe copy-created mip storage as well as texImage2D. Keep GL error ownership
 * with the renderer; successful actual sampled readback is separate evidence. */
export function observeSkyGpuCopyAllocations(gl, currentTexture, allocationFor, sample) {
  const copy = gl.copyTexImage2D.bind(gl);
  gl.copyTexImage2D = (...args) => {
    const result = copy(...args), row = allocationFor(currentTexture(args[0]));
    if (row) {
      if (args[2] !== gl.RGBA) throw new Error('task_copy_allocation_format_unmeasured');
      row.levels ??= {};
      row.levels[args[1]] = args[5] * args[6] * 4;
      row.bytes = Object.values(row.levels).reduce((sum, bytes) => sum + bytes, 0);
      sample();
    }
    return result;
  };
}
