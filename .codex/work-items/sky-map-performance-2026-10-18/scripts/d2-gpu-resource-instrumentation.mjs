// TASK ONLY: add scalar reads at the existing GPU owners. This transformer does
// not install a global owner registry, observer callback or native method proxy.
// Returned native calls and logical RGBA storage are not GPU completion/bytes.
export const D2_GPU_RESOURCE_OBSERVATION_VERSION = 'starward-d2-gpu-resources-v1';
const normalize = source => source.replaceAll('\r\n', '\n');
function one(source, before, after, label) {
  if (source.split(before).length !== 2) throw Error('d2_gpu_resource_boundary_changed:' + label);
  return source.replace(before, after);
}
const scalarHelpers = `
  // Finite scalar accounting only; an unmeasurable total stays unknown.
  const d2Scalar = (value: number): number | null => Number.isSafeInteger(value) && value >= 0 && value <= 1e12 ? value : null;
  const d2Add = (key: string, amount = 1) => {
    const current = d2Counts[key];
    d2Counts[key] = current === null || current === undefined ? null : d2Scalar(current + amount);
  };
  let d2PeakBytes = 0, d2PeakComplete = true, d2AccountingComplete = true;
  const d2Peak = (value: number) => {
    const measured = d2Scalar(value);
    if (measured === null) d2PeakComplete = false;
    else d2PeakBytes = Math.max(d2PeakBytes, measured);
  };
`;
const counters = names => '  const d2Counts: Record<string, number | null> = {' + names.map(name => name + ': 0').join(', ') + '};\n';
const operationNames = (prefixes, outcomes = ['Attempts', 'Returned', 'Threw', 'Pixels']) => prefixes.flatMap(prefix => outcomes.map(outcome => prefix + outcome));
function operation(call, prefix, pixels, failure = 'Threw') {
  return `d2Add("${prefix}Attempts"); d2Add("${prefix}Pixels", ${pixels});
      try { ${call} d2Add("${prefix}Returned"); }
      catch (error) { d2Add("${prefix}${failure}"); d2PeakComplete = false; throw error; }`;
}
function deletion(call) {
  return `try { ${call} } catch (error) { d2Add("deleteFailures"); d2AccountingComplete = false; d2PeakComplete = false; throw error; }`;
}
function addTextures(source) {
  const names = operationNames(['sourceUpload', 'cropCopy'], ['Attempts', 'Returned', 'Failed', 'Pixels']);
  names.push('deleteFailures');
  source = one(source, '  let bytes = 0, copyUnavailable = false;',
    '  let bytes = 0, copyUnavailable = false;\n' + counters(names) + scalarHelpers, 'texture_scalar_state');
  source = one(source, '    if (entry?.texture) gl.deleteTexture(entry.texture);',
    '    if (entry?.texture) { ' + deletion('gl.deleteTexture(entry.texture);') + ' }', 'texture_entry_delete');
  source = one(source, '    const copiedFrom = copyCachedWindow ? cached!.window : full;',
    '    const copiedFrom = copyCachedWindow ? cached!.window : full;\n' +
    '    let d2HeldBytes = copyCachedWindow ? cached!.bytes : 0;', 'texture_transferred_local_storage');
  const upload = 'gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source as TexImageSource);';
  source = one(source, upload, operation(upload, 'sourceUpload', 'size > 0 ? size / 4 : NaN', 'Failed'), 'texture_source_upload');
  source = one(source,
    '        if (uploadError !== gl.NO_ERROR) throw new Error(`sky_gpu_draw_failed:${uploadError}`);\n' +
    '        if (!(size > 0 && Number.isFinite(size))) throw new Error("sky_gpu_image_upload_failed");',
    '        if (uploadError !== gl.NO_ERROR) { d2Add("sourceUploadFailed"); d2PeakComplete = false; throw new Error(`sky_gpu_draw_failed:${uploadError}`); }\n' +
    '        if (!(size > 0 && Number.isFinite(size))) { d2Add("sourceUploadFailed"); d2PeakComplete = false; throw new Error("sky_gpu_image_upload_failed"); }\n' +
    '        d2HeldBytes = size; d2Peak(bytes + d2HeldBytes);', 'texture_upload_validation');
  const crop = 'gl.copyTexImage2D(gl.TEXTURE_2D, 0, gl.RGBA, wanted.x-copiedFrom.x, wanted.y-copiedFrom.y, wanted.width, wanted.height, 0);';
  source = one(source, crop, operation(crop, 'cropCopy', 'wanted.width * wanted.height', 'Failed'), 'texture_crop_copy');
  source = one(source,
    '          if (copyError !== gl.NO_ERROR) throw new Error(`sky_gpu_draw_failed:${copyError}`);\n' +
    '          gl.deleteTexture(texture); texture = cropped; cropped = null; window = wanted;',
    '          if (copyError !== gl.NO_ERROR) { d2Add("cropCopyFailed"); d2PeakComplete = false; throw new Error(`sky_gpu_draw_failed:${copyError}`); }\n' +
    '          // entries exclude the transferred old resident. Count the local\n' +
    '          // source and new crop once each, before the original deletion.\n' +
    '          d2Peak(bytes + d2HeldBytes + wanted.width * wanted.height * 4);\n' +
    '          ' + deletion('gl.deleteTexture(texture);') + ' texture = cropped; cropped = null; window = wanted;\n' +
    '          d2HeldBytes = wanted.width * wanted.height * 4;', 'texture_crop_peak_and_transfer');
  source = one(source, '          if (cropped) gl.deleteTexture(cropped);',
    '          if (cropped) { ' + deletion('gl.deleteTexture(cropped);') + ' }', 'texture_partial_crop_delete');
  source = one(source, '      if (texture) gl.deleteTexture(texture);',
    '      if (texture) { ' + deletion('gl.deleteTexture(texture);') + ' }', 'texture_failed_upload_delete');
  source = one(source, '      entries.set(source, entry); bytes += entry.bytes;',
    '      entries.set(source, entry); bytes += entry.bytes; d2Peak(bytes);', 'texture_installed_storage');
  source = one(source, '  return {\n    begin(images: readonly object[] = []) {', `  return {
    __d2ResourceFacts(): Record<string, number | boolean | null> {
      let residentTextureCount = 0, failedIdentityCount = 0;
      for (const entry of entries.values()) { if (entry.texture) residentTextureCount++; else failedIdentityCount++; }
      return { residentTextureCount: d2AccountingComplete ? residentTextureCount : null, failedIdentityCount,
        residentRgbaBytes: d2AccountingComplete ? d2Scalar(bytes) : null,
        maxLogicalRgbaBytes: d2PeakComplete ? d2PeakBytes : null,
        logicalOwnershipComplete: d2AccountingComplete, logicalPeakComplete: d2PeakComplete,
        copyUnavailable, ...d2Counts };
    },
    begin(images: readonly object[] = []) {`, 'texture_inspect');
  return source;
}
function addContributions(source) {
  const names = operationNames(['targetAllocation', 'backdropCopySub', 'backdropStorageRedefine', 'signalStorageRedefine']);
  names.push('targetSetupFailures', 'auxiliaryFailures', 'deleteFailures');
  const state = '  let width = 0, height = 0, bytes = 0, frameOpen = false, finished = false, faulted = false, disposed = false;';
  source = one(source, state, state + '\n' + counters(names) + scalarHelpers +
    '  let d2LastDefaultAlphaBits: number | null = null;\n', 'contribution_scalar_state');
  source = one(source, '    gl.deleteFramebuffer(target.framebuffer); gl.deleteTexture(target.texture); bytes -= target.bytes;',
    '    ' + deletion('gl.deleteFramebuffer(target.framebuffer); gl.deleteTexture(target.texture);') + ' bytes -= target.bytes;', 'contribution_delete_target');
  source = one(source, '      if (!faulted) reportRuntimeError("render", "sky_gpu_contribution_failed", error);',
    '      d2Add("auxiliaryFailures"); d2PeakComplete = false;\n' +
    '      if (!faulted) reportRuntimeError("render", "sky_gpu_contribution_failed", error);', 'contribution_auxiliary_failure');
  const allocation = 'gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);';
  source = one(source, allocation, operation(allocation, 'targetAllocation', 'w * h'), 'contribution_target_storage');
  source = one(source, '      bytes += n;\n      return { texture, framebuffer, width: w, height: h, bytes: n, format: gl.RGBA };',
    '      bytes += n; d2Peak(bytes);\n      return { texture, framebuffer, width: w, height: h, bytes: n, format: gl.RGBA };', 'contribution_target_admitted');
  source = one(source, '    } catch (error) {\n      if (framebuffer) gl.deleteFramebuffer(framebuffer);\n      if (texture) gl.deleteTexture(texture);\n      throw error;',
    '    } catch (error) {\n      d2Add("targetSetupFailures"); d2PeakComplete = false;\n' +
    '      if (framebuffer) { ' + deletion('gl.deleteFramebuffer(framebuffer);') + ' }\n' +
    '      if (texture) { ' + deletion('gl.deleteTexture(texture);') + ' }\n      throw error;', 'contribution_failed_target_cleanup');
  const signal = 'gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, target.width, target.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);';
  source = one(source, signal, operation(signal, 'signalStorageRedefine', 'target.width * target.height'), 'contribution_signal_storage');
  source = one(source,
    '        const format = (gl.getParameter(gl.ALPHA_BITS) as number) > 0 ? gl.RGBA : gl.RGB;\n' +
    '        if (target.format === format) gl.copyTexSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 0, 0, w, h);',
    '        const d2DefaultAlphaBits = gl.getParameter(gl.ALPHA_BITS) as number;\n' +
    '        d2LastDefaultAlphaBits = d2Scalar(d2DefaultAlphaBits);\n' +
    '        const format = d2DefaultAlphaBits > 0 ? gl.RGBA : gl.RGB;\n' +
    '        if (target.format === format) { ' + operation('gl.copyTexSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 0, 0, w, h);',
      'backdropCopySub', 'w * h') + ' }', 'contribution_same_alpha_read_and_copy_sub');
  const redefine = 'gl.copyTexImage2D(gl.TEXTURE_2D, 0, format, 0, 0, w, h, 0);';
  source = one(source, redefine, operation(redefine, 'backdropStorageRedefine', 'w * h'), 'contribution_backdrop_redefine');
  source = one(source, '  return {\n    begin() {', `  return {
    __d2ResourceFacts(): Record<string, number | boolean | null> {
      let poolRgbaBytes = 0, scratchRgbaBytes = 0;
      for (const target of pool) poolRgbaBytes += target.bytes;
      for (const target of scratch) scratchRgbaBytes += target.bytes;
      return { enabled, faulted, disposed, frameOpen, finished, maxGroups: d2Scalar(maxGroups), groupCount: entries.size,
        poolCount: pool.length, scratchCount: scratch.length, width: d2Scalar(width), height: d2Scalar(height),
        residentRgbaBytes: d2AccountingComplete ? d2Scalar(bytes) : null,
        poolRgbaBytes: d2AccountingComplete ? d2Scalar(poolRgbaBytes) : null,
        scratchRgbaBytes: d2AccountingComplete ? d2Scalar(scratchRgbaBytes) : null,
        maxLogicalRgbaBytes: d2PeakComplete ? d2PeakBytes : null,
        logicalOwnershipComplete: d2AccountingComplete, logicalPeakComplete: d2PeakComplete,
        lastDefaultAlphaBits: d2LastDefaultAlphaBits, ...d2Counts };
    },
    begin() {`, 'contribution_inspect');
  return source;
}
function addRenderer(source) {
  source = one(source,
    'export interface SkyGpuRenderer extends SkyRenderSurface, SkyArtworkLevelSurface, SkyArtworkContributionSurface {',
    `export interface SkyGpuRenderer extends SkyRenderSurface, SkyArtworkLevelSurface, SkyArtworkContributionSurface {
  /** TASK ONLY scalar association, assigned by the existing surface receipt owner. */
  __d2SurfaceReceiptId: number;
  __d2ResourceFacts(): { disposed: boolean; disposeAttempts: number; disposeReturned: number; disposeThrew: number;
    textures: Record<string, number | boolean | null>; contributions: Record<string, number | boolean | null> };`, 'renderer_inspect_contract');
  source = one(source, '  let disposed = false;',
    '  let disposed = false;\n  let d2DisposeAttempts = 0, d2DisposeReturned = 0, d2DisposeThrew = 0;', 'renderer_dispose_counters');
  source = one(source, '  const dispose = () => {\n    if (disposed) return;\n    disposed = true;',
    '  const dispose = () => {\n    if (disposed) return;\n    d2DisposeAttempts++;\n    try {\n    disposed = true;', 'renderer_dispose_attempt');
  source = one(source, '    colors.clear();\n  };\n  const makeProgram',
    '    colors.clear();\n    d2DisposeReturned++;\n    } catch (error) { d2DisposeThrew++; throw error; }\n  };\n  const makeProgram', 'renderer_dispose_result');
  source = one(source, '    const surface:SkyGpuRenderer = {', `    const surface:SkyGpuRenderer = {
      __d2SurfaceReceiptId: 0,
      __d2ResourceFacts() {
        return { disposed, disposeAttempts: d2DisposeAttempts, disposeReturned: d2DisposeReturned, disposeThrew: d2DisposeThrew,
          textures: textures.__d2ResourceFacts(), contributions: contributions.__d2ResourceFacts() };
      },`, 'renderer_scalar_snapshot');
  return source;
}
export function addD2GpuResourceOwners({ textures, contributions, renderer }) {
  return { textures: addTextures(normalize(textures)), contributions: addContributions(normalize(contributions)),
    renderer: addRenderer(normalize(renderer)) };
}
