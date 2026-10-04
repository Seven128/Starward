import { createProgramInfoFromProgram, drawBufferInfo, setBuffersAndAttributes, setUniforms,
  type BufferInfo, type ProgramInfo } from "twgl.js";
import { skyArtworkLevelsFragment, type SkyArtworkContributionBudget,
  type SkyArtworkLevelsContribution, type SkyArtworkLevelsDraw,
  type SkyArtworkLevelsQualification } from "./sky-artwork-level-composition";

interface Target {
  readonly texture: WebGLTexture;
  readonly framebuffer: WebGLFramebuffer;
  readonly width: number;
  readonly height: number;
  readonly bytes: number;
}
interface Entry {
  readonly target: Target;
  readonly qualification: SkyArtworkLevelsQualification;
  photoUsable: boolean;
  receipt: SkyArtworkLevelsContribution | null;
}
export interface SkyGpuArtworkContributionDraw {
  readonly program: ProgramInfo;
  readonly buffer: BufferInfo;
  readonly primitive: number;
  readonly uniforms: Record<string, unknown>;
  readonly vertex: string;
  readonly cameraRay: string;
}
const unknownQualification: SkyArtworkLevelsQualification = Object.freeze({
  fine: "unknown", coarse: "unknown", any: "unknown",
});
const unknownContribution: SkyArtworkLevelsContribution = Object.freeze({
  completed: false, qualification: unknownQualification, finePhoto: "unknown", coarsePhoto: "unknown",
});
const reduceVertex = "attribute vec2 a_position;void main(){gl_Position=vec4(a_position,0.,1.);}";
const reduceFragment = `precision highp float;
  uniform sampler2D u_input;uniform vec2 u_size;
  vec4 sampleAt(vec2 p){return texture2D(u_input,clamp(p,vec2(.5),u_size-.5)/u_size);}
  void main(){vec2 p=floor(gl_FragCoord.xy)*2.+.5;
    gl_FragColor=max(max(sampleAt(p),sampleAt(p+vec2(1.,0.))),
      max(sampleAt(p+vec2(0.,1.)),sampleAt(p+vec2(1.,1.))));}`;
const reductionQuad = new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]);

/** Optional same-prepared draw tracking. RGBA8 stores fine/coarse weighted
 * photo components in R/G and selected fine/coarse eligibility in B/A.
 * Eligibility is measured over the complete actual drawing buffer. A positive
 * photo byte proves retained component participation; zero does not prove
 * mathematical absence or a post-clamp counterfactual display difference.
 *
 * Auxiliary storage is an explicit caller policy, not the image-cache pressure
 * target or a native capacity claim. No budget means no GL work or allocation.
 * Draw replay is synchronous: no historical VBO, texture or image lease is kept.
 */
export function createSkyGpuArtworkContributions(gl: WebGLRenderingContext,
  options?: SkyArtworkContributionBudget) {
  const enabled = !!options && Number.isFinite(options.auxiliaryBytesLimit) &&
    options.auxiliaryBytesLimit > 0 && Number.isSafeInteger(options.maxGroups) && options.maxGroups > 0;
  const entries = new Map<SkyArtworkLevelsDraw, Entry>();
  const pool: Target[] = [], scratch: Target[] = [], used = new Set<Target>();
  let width = 0, height = 0, bytes = 0, frameOpen = false, finished = false, faulted = false, disposed = false;
  let signalProgram: ProgramInfo | null = null, reduceProgram: ProgramInfo | null = null;
  let reduceBuffer: WebGLBuffer | null = null, positionLocation = -1, programKey = "";

  const deleteTarget = (target: Target) => {
    gl.deleteFramebuffer(target.framebuffer); gl.deleteTexture(target.texture); bytes -= target.bytes;
  };
  const deletePrograms = () => {
    if (signalProgram) gl.deleteProgram(signalProgram.program);
    if (reduceProgram) gl.deleteProgram(reduceProgram.program);
    if (reduceBuffer) gl.deleteBuffer(reduceBuffer);
    signalProgram = null; reduceProgram = null; reduceBuffer = null; programKey = ""; positionLocation = -1;
  };
  const retire = () => {
    pool.splice(0).forEach(deleteTarget); scratch.splice(0).forEach(deleteTarget);
    used.clear(); deletePrograms(); width = 0; height = 0; bytes = 0;
  };
  const invalidate = () => { entries.clear(); faulted = true; finished = false; retire(); };
  const invalidatePhoto = () => {
    for (const entry of entries.values()) { entry.photoUsable = false; entry.receipt = null; }
  };
  const hasPending = () => {
    if (!frameOpen || faulted) return false;
    for (const entry of entries.values()) if (entry.photoUsable) return true;
    return false;
  };
  const reopen = () => {
    if (!finished) return;
    finished = false;
    for (const entry of entries.values()) entry.receipt = null;
  };
  const checkPriorError = () => {
    // This is a normal-renderer error. It must reach its owner, not be mistaken
    // for optional probe failure and silently consumed by auxiliary recovery.
    const error = gl.getError();
    if (error !== gl.NO_ERROR) { invalidate(); throw new Error(`sky_gpu_draw_failed:${error}`); }
  };
  const supportedFramebuffer = () => gl.getParameter(gl.FRAMEBUFFER_BINDING) === null &&
    !gl.isEnabled(gl.DEPTH_TEST) && !gl.isEnabled(gl.STENCIL_TEST);
  const fullRgbWrite = () => {
    const mask = gl.getParameter(gl.COLOR_WRITEMASK) as boolean[];
    return mask[0] === true && mask[1] === true && mask[2] === true;
  };
  const dimensions = () => {
    const w = gl.drawingBufferWidth, h = gl.drawingBufferHeight;
    const maxTexture = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number;
    const maxViewport = gl.getParameter(gl.MAX_VIEWPORT_DIMS) as Int32Array;
    return Number.isSafeInteger(w) && Number.isSafeInteger(h) && w > 0 && h > 0 &&
      w <= maxTexture && h <= maxTexture && w <= maxViewport[0]! && h <= maxViewport[1]! ? [w, h] as const : null;
  };
  const currentSize = () => width === gl.drawingBufferWidth && height === gl.drawingBufferHeight;
  const scratchDimensions = (w: number, h: number) => {
    const sizes: (readonly [number, number])[] = [];
    while (w > 1 || h > 1) { w = Math.ceil(w / 2); h = Math.ceil(h / 2); sizes.push([w, h]); }
    return sizes;
  };

  /** Only the position pointer is modified. WebGL cannot restore a null array
   * pointer after assigning a buffer, so probing requires a real current one. */
  const guarded = <T>(location: number, work: () => T): T => {
    const attributeBuffer = gl.getVertexAttrib(location, gl.VERTEX_ATTRIB_ARRAY_BUFFER_BINDING) as WebGLBuffer | null;
    if (!attributeBuffer) throw new Error("sky_gpu_contribution_unrestorable_position");
    const framebuffer = gl.getParameter(gl.FRAMEBUFFER_BINDING) as WebGLFramebuffer | null;
    const viewport = Array.from(gl.getParameter(gl.VIEWPORT) as Int32Array) as [number, number, number, number];
    const program = gl.getParameter(gl.CURRENT_PROGRAM) as WebGLProgram | null;
    const arrayBuffer = gl.getParameter(gl.ARRAY_BUFFER_BINDING) as WebGLBuffer | null;
    const activeTexture = gl.getParameter(gl.ACTIVE_TEXTURE) as number;
    const textureBindings: (WebGLTexture | null)[] = [];
    for (let unit = 0; unit < 2; unit++) {
      gl.activeTexture(gl.TEXTURE0 + unit);
      textureBindings.push(gl.getParameter(gl.TEXTURE_BINDING_2D) as WebGLTexture | null);
    }
    gl.activeTexture(activeTexture);
    const attribute = {
      enabled: gl.getVertexAttrib(location, gl.VERTEX_ATTRIB_ARRAY_ENABLED) as boolean,
      size: gl.getVertexAttrib(location, gl.VERTEX_ATTRIB_ARRAY_SIZE) as number,
      type: gl.getVertexAttrib(location, gl.VERTEX_ATTRIB_ARRAY_TYPE) as number,
      normalized: gl.getVertexAttrib(location, gl.VERTEX_ATTRIB_ARRAY_NORMALIZED) as boolean,
      stride: gl.getVertexAttrib(location, gl.VERTEX_ATTRIB_ARRAY_STRIDE) as number,
      offset: gl.getVertexAttribOffset(location, gl.VERTEX_ATTRIB_ARRAY_POINTER),
    };
    const caps = [gl.BLEND, gl.SCISSOR_TEST, gl.DEPTH_TEST, gl.STENCIL_TEST, gl.CULL_FACE, gl.DITHER];
    const enabledCaps = caps.map(cap => gl.isEnabled(cap));
    const blend = [gl.BLEND_SRC_RGB, gl.BLEND_DST_RGB, gl.BLEND_SRC_ALPHA, gl.BLEND_DST_ALPHA,
      gl.BLEND_EQUATION_RGB, gl.BLEND_EQUATION_ALPHA].map(name => gl.getParameter(name) as number);
    const scissor = Array.from(gl.getParameter(gl.SCISSOR_BOX) as Int32Array) as [number, number, number, number];
    const mask = Array.from(gl.getParameter(gl.COLOR_WRITEMASK) as boolean[]) as [boolean, boolean, boolean, boolean];
    const clear = Array.from(gl.getParameter(gl.COLOR_CLEAR_VALUE) as Float32Array) as [number, number, number, number];
    try { return work(); }
    finally {
      gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer); gl.viewport(...viewport); gl.useProgram(program);
      textureBindings.forEach((texture, unit) => { gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, texture); });
      gl.activeTexture(activeTexture);
      gl.bindBuffer(gl.ARRAY_BUFFER, attributeBuffer);
      gl.vertexAttribPointer(location, attribute.size, attribute.type, attribute.normalized, attribute.stride, attribute.offset);
      attribute.enabled ? gl.enableVertexAttribArray(location) : gl.disableVertexAttribArray(location);
      gl.bindBuffer(gl.ARRAY_BUFFER, arrayBuffer);
      caps.forEach((cap, index) => enabledCaps[index] ? gl.enable(cap) : gl.disable(cap));
      gl.blendFuncSeparate(blend[0]!, blend[1]!, blend[2]!, blend[3]!);
      gl.blendEquationSeparate(blend[4]!, blend[5]!); gl.scissor(...scissor);
      gl.colorMask(...mask); gl.clearColor(...clear);
    }
  };
  const auxiliary = <T>(location: number, work: () => T): T | null => {
    checkPriorError();
    try {
      const result = guarded(location, work);
      if (gl.getError() !== gl.NO_ERROR || gl.isContextLost()) throw new Error("sky_gpu_contribution_failed");
      return result;
    } catch {
      // Ordinary drawing has already succeeded. Optional setup/readback failure
      // does not fail it or retain partially created auxiliary objects.
      invalidate();
      // Consume only errors produced after the checked normal-renderer boundary.
      // WebGL keeps distinct pending error flags. Recovery is bounded even on a
      // lost context, and clears only the auxiliary generation checked above.
      for (let attempt = 0; attempt < 6; attempt++) {
        const error = gl.getError();
        if (error === gl.NO_ERROR || error === gl.CONTEXT_LOST_WEBGL) break;
      }
      return null;
    }
  };
  const makeProgram = (vertex: string, fragment: string, location: number): ProgramInfo => {
    const program = gl.createProgram();
    if (!program) throw new Error("sky_gpu_contribution_program_unavailable");
    const shaders: WebGLShader[] = [], attached: WebGLShader[] = [];
    let succeeded = false;
    try {
      for (const [type, source] of [[gl.VERTEX_SHADER, vertex], [gl.FRAGMENT_SHADER, fragment]] as const) {
        const shader = gl.createShader(type);
        if (!shader) throw new Error("sky_gpu_contribution_shader_unavailable");
        shaders.push(shader); gl.shaderSource(shader, source); gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error("sky_gpu_contribution_shader_failed");
        gl.attachShader(program, shader); attached.push(shader);
      }
      gl.bindAttribLocation(program, location, "a_position"); gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error("sky_gpu_contribution_program_failed");
      const result = createProgramInfoFromProgram(gl, program);
      succeeded = true;
      return result;
    }
    finally {
      attached.forEach(shader => gl.detachShader(program, shader));
      shaders.forEach(shader => gl.deleteShader(shader));
      if (!succeeded) gl.deleteProgram(program);
    }
  };
  const makeTarget = (w: number, h: number): Target => {
    const n = w * h * 4;
    if (!Number.isSafeInteger(n) || bytes + n > options!.auxiliaryBytesLimit) throw new Error("sky_gpu_contribution_budget");
    const texture = gl.createTexture(); let framebuffer: WebGLFramebuffer | null = null;
    try {
      if (!texture) throw new Error("sky_gpu_contribution_texture_unavailable");
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      framebuffer = gl.createFramebuffer();
      if (!framebuffer) throw new Error("sky_gpu_contribution_framebuffer_unavailable");
      gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
      if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) throw new Error("sky_gpu_contribution_framebuffer_incomplete");
      if (gl.getError() !== gl.NO_ERROR) throw new Error("sky_gpu_contribution_target_failed");
      bytes += n;
      return { texture, framebuffer, width: w, height: h, bytes: n };
    } catch (error) {
      if (framebuffer) gl.deleteFramebuffer(framebuffer);
      if (texture) gl.deleteTexture(texture);
      throw error;
    }
  };
  const ensurePrograms = (prepared: SkyGpuArtworkContributionDraw, location: number) => {
    const key = JSON.stringify([prepared.vertex, prepared.cameraRay, location]);
    if (key === programKey && signalProgram && reduceProgram && reduceBuffer) return;
    deletePrograms();
    signalProgram = makeProgram(prepared.vertex, skyArtworkLevelsFragment(prepared.cameraRay, "contribution"), location);
    reduceProgram = makeProgram(reduceVertex, reduceFragment, location);
    reduceBuffer = gl.createBuffer();
    if (!reduceBuffer) throw new Error("sky_gpu_contribution_buffer_unavailable");
    gl.bindBuffer(gl.ARRAY_BUFFER, reduceBuffer); gl.bufferData(gl.ARRAY_BUFFER, reductionQuad, gl.STATIC_DRAW);
    positionLocation = location; programKey = key;
  };
  const maximum = (source: Target): Uint8Array => {
    let current = source;
    gl.disable(gl.BLEND); gl.disable(gl.SCISSOR_TEST); gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.STENCIL_TEST); gl.disable(gl.CULL_FACE); gl.disable(gl.DITHER);
    gl.colorMask(true, true, true, true); gl.useProgram(reduceProgram!.program);
    gl.bindBuffer(gl.ARRAY_BUFFER, reduceBuffer); gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
    for (const target of scratch) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, target.framebuffer); gl.viewport(0, 0, target.width, target.height);
      setUniforms(reduceProgram!, { u_input: current.texture, u_size: [current.width, current.height] });
      gl.drawArrays(gl.TRIANGLES, 0, 6); current = target;
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, current.framebuffer);
    const result = new Uint8Array(4); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, result);
    return result;
  };
  const trimUnused = () => {
    for (let index = pool.length - 1; index >= 0; index--) {
      const target = pool[index]!;
      if (!used.has(target)) { pool.splice(index, 1); deleteTarget(target); }
    }
    if (pool.length === 0) { scratch.splice(0).forEach(deleteTarget); deletePrograms(); width = 0; height = 0; }
  };

  return {
    begin() {
      entries.clear(); used.clear(); frameOpen = !disposed; finished = false;
      if (disposed || !enabled) return;
      if (gl.isContextLost()) invalidate();
      else if (width > 0 && !currentSize()) retire();
    },
    capture(draw: SkyArtworkLevelsDraw, prepared: SkyGpuArtworkContributionDraw) {
      if (!enabled || disposed || !frameOpen || faulted || !draw.submitted) return;
      reopen();
      checkPriorError();
      if (gl.isContextLost()) { invalidate(); return; }
      if (entries.has(draw)) { invalidate(); return; }
      if (entries.size >= options!.maxGroups || !supportedFramebuffer() || !fullRgbWrite()) return;
      const size = dimensions(), location = gl.getAttribLocation(prepared.program.program, "a_position");
      if (!size || location < 0 || !gl.getVertexAttrib(location, gl.VERTEX_ATTRIB_ARRAY_BUFFER_BINDING)) return;
      const [w, h] = size;
      if (width > 0 && (width !== w || height !== h)) { invalidate(); return; }
      const chain = scratchDimensions(w, h);
      const free = pool.find(target => !used.has(target));
      const needed = (free ? 0 : w * h * 4) + (scratch.length ? 0 : chain.reduce((sum, [x, y]) => sum + x * y * 4, 0));
      if (!Number.isSafeInteger(needed) || bytes + needed > options!.auxiliaryBytesLimit) return;
      const captured = auxiliary(location, () => {
        ensurePrograms(prepared, location); width = w; height = h;
        if (scratch.length === 0) for (const [x, y] of chain) scratch.push(makeTarget(x, y));
        const target = free ?? makeTarget(w, h);
        if (!free) pool.push(target);
        used.add(target);
        // Clear every pixel, then replay the original viewport/scissor. A zero
        // elsewhere belongs to the full measured target rather than an ROI guess.
        const scissor = gl.isEnabled(gl.SCISSOR_TEST);
        gl.bindFramebuffer(gl.FRAMEBUFFER, target.framebuffer); gl.disable(gl.SCISSOR_TEST);
        gl.colorMask(true, true, true, true); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
        if (scissor) gl.enable(gl.SCISSOR_TEST);
        gl.disable(gl.BLEND); gl.useProgram(signalProgram!.program);
        setBuffersAndAttributes(gl, signalProgram!, prepared.buffer); setUniforms(signalProgram!, prepared.uniforms);
        drawBufferInfo(gl, prepared.buffer, prepared.primitive);
        const max = maximum(target);
        const qualification: SkyArtworkLevelsQualification = Object.freeze({
          fine: max[2]! > 0 ? "has" : "empty", coarse: max[3]! > 0 ? "has" : "empty",
          any: max[2]! > 0 || max[3]! > 0 ? "has" : "empty",
        });
        return { target, qualification, photoUsable: true, receipt: null } as Entry;
      });
      if (captured) entries.set(draw, captured);
    },
    afterDraw(replay: () => void) {
      if (!hasPending()) return;
      reopen();
      checkPriorError();
      if (!currentSize() || gl.isContextLost()) { invalidate(); return; }
      const blend = gl.isEnabled(gl.BLEND), destination = blend ? gl.getParameter(gl.BLEND_DST_RGB) as number : gl.ZERO;
      if (blend && gl.getParameter(gl.BLEND_EQUATION_RGB) !== gl.FUNC_ADD) { invalidatePhoto(); return; }
      if (destination === gl.ONE) return;
      if ((destination !== gl.ZERO && destination !== gl.ONE_MINUS_SRC_ALPHA) || !supportedFramebuffer() || !fullRgbWrite()) {
        invalidatePhoto(); return;
      }
      auxiliary(positionLocation, () => {
        gl.enable(gl.BLEND); gl.blendEquation(gl.FUNC_ADD);
        gl.blendFuncSeparate(gl.ZERO, destination, gl.ZERO, destination); gl.colorMask(true, true, false, false);
        for (const entry of entries.values()) if (entry.photoUsable) {
          gl.bindFramebuffer(gl.FRAMEBUFFER, entry.target.framebuffer); replay();
        }
        return true;
      });
    },
    clearPhoto() {
      if (!hasPending()) return;
      reopen();
      checkPriorError();
      if (!currentSize() || gl.isContextLost()) { invalidate(); return; }
      if (gl.getParameter(gl.FRAMEBUFFER_BINDING) !== null || !fullRgbWrite()) { invalidatePhoto(); return; }
      auxiliary(positionLocation, () => {
        gl.colorMask(true, true, false, false); gl.clearColor(0, 0, 0, 0);
        for (const entry of entries.values()) if (entry.photoUsable) {
          gl.bindFramebuffer(gl.FRAMEBUFFER, entry.target.framebuffer); gl.clear(gl.COLOR_BUFFER_BIT);
        }
        return true;
      });
    },
    finish() {
      if (!enabled || disposed || !frameOpen || finished || faulted) return;
      checkPriorError();
      if (gl.isContextLost() || (width > 0 && !currentSize())) { invalidate(); return; }
      if (entries.size > 0) {
        const result = auxiliary(positionLocation, () => {
          for (const entry of entries.values()) {
            const max = entry.photoUsable ? maximum(entry.target) : null;
            entry.receipt = Object.freeze({ completed: true, qualification: entry.qualification,
              finePhoto: max && max[0]! > 0 ? "positive" : "unknown",
              coarsePhoto: max && max[1]! > 0 ? "positive" : "unknown" });
          }
          return true;
        });
        if (!result) return;
      }
      trimUnused(); finished = true;
    },
    qualification(draw: SkyArtworkLevelsDraw): SkyArtworkLevelsQualification {
      return entries.get(draw)?.qualification ?? unknownQualification;
    },
    contribution(draw: SkyArtworkLevelsDraw): SkyArtworkLevelsContribution {
      const entry = entries.get(draw);
      if (!entry) return unknownContribution;
      return finished && entry.receipt ? entry.receipt : Object.freeze({
        completed: false, qualification: entry.qualification, finePhoto: "unknown", coarsePhoto: "unknown",
      });
    },
    hasPending, invalidate,
    /** Explicit retry only. begin never repeatedly recompiles/reallocates after
     * a probe failure. Reset also retires every old-frame receipt and object. */
    reset() { entries.clear(); finished = false; frameOpen = false; retire(); faulted = false; },
    dispose() { entries.clear(); frameOpen = false; finished = false; disposed = true; retire(); },
  };
}
