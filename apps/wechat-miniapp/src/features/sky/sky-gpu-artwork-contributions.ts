import { createProgramInfoFromProgram, drawBufferInfo, setBuffersAndAttributes, setUniforms,
  type BufferInfo, type ProgramInfo } from "twgl.js";
import { skyArtworkLevelsFragment, type SkyArtworkContributionBudget,
  type SkyArtworkLevelsContribution, type SkyArtworkLevelsDraw,
  type SkyArtworkLevelsQualification, type SkyArtworkLocalObservation,
  unknownSkyArtworkLocalObservation } from "./sky-artwork-level-composition";
import type { SkyDeepSkyRegion } from "./sky-deep-sky-region";

interface Target {
  readonly texture: WebGLTexture;
  readonly framebuffer: WebGLFramebuffer;
  readonly width: number;
  readonly height: number;
  bytes: number;
  depth: WebGLRenderbuffer | null;
}
interface Entry {
  readonly target: Target;
  readonly qualification: SkyArtworkLevelsQualification;
  photoUsable: boolean;
  receipt: SkyArtworkLevelsContribution | null;
  revision: number;
  readonly camera: Record<string, unknown>;
  readonly cameraRay: string;
  readonly localCache: Map<SkyDeepSkyRegion, SkyArtworkLocalObservation>;
  /** A completed source-group RGBA is its own alpha signal. */
  readonly photoChannel?: "alpha";
}
export interface SkyGpuArtworkContributionDraw {
  readonly program: ProgramInfo;
  readonly buffer: BufferInfo;
  readonly primitive: number;
  readonly uniforms: Record<string, unknown>;
  readonly vertex: string;
  readonly cameraRay: string;
  /** Native mesh alpha signal; ordinary Prepared keeps its existing shader. */
  readonly alphaFragment?:string;
}
const unknownQualification: SkyArtworkLevelsQualification = Object.freeze({
  fine: "unknown", coarse: "unknown", any: "unknown",
});
const unknownContribution: SkyArtworkLevelsContribution = Object.freeze({
  completed: false, qualification: unknownQualification, finePhoto: "unknown", coarsePhoto: "unknown",
});
const reduceVertex = "attribute vec2 a_position;void main(){gl_Position=vec4(a_position,0.,1.);}";
/** 4x4 MAX preserves every source texel (including clamped odd edges) while
 * using fewer draw passes and intermediate RGBA8 texels than a 2x2 chain.
 * This fan-in is not a probe budget or a native timing/capacity guarantee. */
export const SKY_ARTWORK_MAX_REDUCTION_STRIDE = 4;
const reductionMain = `void main(){
  vec2 p=floor(gl_FragCoord.xy)*${SKY_ARTWORK_MAX_REDUCTION_STRIDE}.+.5;
  vec4 value=sampleAt(p);
  ${Array.from({length:SKY_ARTWORK_MAX_REDUCTION_STRIDE**2-1},(_unused,index)=>{
    const offset=index+1;
    return `value=max(value,sampleAt(p+vec2(${offset%SKY_ARTWORK_MAX_REDUCTION_STRIDE}.,${Math.floor(offset/SKY_ARTWORK_MAX_REDUCTION_STRIDE)}.)));`;
  }).join("\n  ")}
  gl_FragColor=value;
}`;
const reduceFragment = `precision highp float;
  uniform sampler2D u_input;uniform vec2 u_size;
  vec4 sampleAt(vec2 p){return texture2D(u_input,clamp(p,vec2(.5),u_size-.5)/u_size);}
  ${reductionMain}`;
const localReduceFragment = (cameraRay: string) => `precision highp float;
  uniform sampler2D u_input; uniform vec2 u_size, u_logicalSize;
  uniform vec3 u_regionRow0,u_regionRow1,u_regionRow2,u_regionAnchorU,u_regionAnchorV;
  uniform float u_regionDeterminant;
  ${cameraRay}
  vec4 sampleAt(vec2 point) {
    vec2 p=clamp(point,vec2(.5),u_size-.5);
    vec2 pixel=vec2(p.x/u_size.x*u_logicalSize.x,(u_size.y-p.y)/u_size.y*u_logicalSize.y);
    vec3 ray=skyRay(pixel);
    vec3 c=vec3(dot(u_regionRow0,ray),dot(u_regionRow1,ray),dot(u_regionRow2,ray));
    float s=c.x+c.y+c.z;
    // No epsilon/padding or general precision certificate. Strict model-only
    // boundary/branch skips yield UNKNOWN, never absence/area EMPTY.
    if(s==0.0 || u_regionDeterminant/s<=0.0) return vec4(0.0);
    vec2 pq=2.0*vec2(dot(c,u_regionAnchorU),dot(c,u_regionAnchorV))-vec2(s);
    if(!(dot(pq,pq)<s*s)) return vec4(0.0);
    return texture2D(u_input,p/u_size);
  }
  ${reductionMain}`;
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
  const auxiliaryBytesLimit = options?.auxiliaryBytesLimit ?? 0, maxGroups = options?.maxGroups ?? 0;
  const enabled = !!options && Number.isFinite(auxiliaryBytesLimit) &&
    auxiliaryBytesLimit > 0 && Number.isSafeInteger(maxGroups) && maxGroups > 0;
  const entries = new Map<object, Entry>();
  const pool: Target[] = [], scratch: Target[] = [], used = new Set<Target>();
  let width = 0, height = 0, bytes = 0, frameOpen = false, finished = false, faulted = false, disposed = false;
  let signalProgram: ProgramInfo | null = null, reduceProgram: ProgramInfo | null = null;
  let meshSignalProgram:ProgramInfo|null=null,meshProgramKey="";
  let reduceBuffer: WebGLBuffer | null = null, positionLocation = -1, programKey = "";
  let localReduceProgram: ProgramInfo | null = null, signalRevision = 0;

  const deleteTarget = (target: Target) => {
    if (target.depth) gl.deleteRenderbuffer(target.depth);
    gl.deleteFramebuffer(target.framebuffer); gl.deleteTexture(target.texture); bytes -= target.bytes;
  };
  const deletePrograms = () => {
    if (signalProgram) gl.deleteProgram(signalProgram.program);
    if (reduceProgram) gl.deleteProgram(reduceProgram.program);
    if (localReduceProgram) gl.deleteProgram(localReduceProgram.program);
    if (meshSignalProgram) gl.deleteProgram(meshSignalProgram.program);
    if (reduceBuffer) gl.deleteBuffer(reduceBuffer);
    signalProgram = null; reduceProgram = null; localReduceProgram = null; reduceBuffer = null; programKey = ""; positionLocation = -1;
    meshSignalProgram=null;meshProgramKey="";
  };
  const retire = () => {
    pool.splice(0).forEach(deleteTarget); scratch.splice(0).forEach(deleteTarget);
    used.clear(); deletePrograms(); width = 0; height = 0; bytes = 0;
  };
  const invalidate = () => { entries.clear(); faulted = true; finished = false; retire(); };
  const changed = (entry: Entry) => { entry.revision = ++signalRevision; entry.localCache.clear(); };
  const invalidatePhoto = () => {
    for (const entry of entries.values()) { entry.photoUsable = false; entry.receipt = null; changed(entry); }
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
    while (w > 1 || h > 1) {
      w = Math.ceil(w / SKY_ARTWORK_MAX_REDUCTION_STRIDE); h = Math.ceil(h / SKY_ARTWORK_MAX_REDUCTION_STRIDE);
      sizes.push([w, h]);
    }
    return sizes;
  };

  /** Only the position pointer is modified. WebGL cannot restore a null array
   * pointer after assigning a buffer, so probing requires a real current one. */
  const guarded = <T>(location: number, work: () => T, groupState = false): T => {
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
      size: gl.getVertexAttrib(location, gl.VERTEX_ATTRIB_ARRAY_SIZE) as number,
      type: gl.getVertexAttrib(location, gl.VERTEX_ATTRIB_ARRAY_TYPE) as number,
      normalized: gl.getVertexAttrib(location, gl.VERTEX_ATTRIB_ARRAY_NORMALIZED) as boolean,
      stride: gl.getVertexAttrib(location, gl.VERTEX_ATTRIB_ARRAY_STRIDE) as number,
      offset: gl.getVertexAttribOffset(location, gl.VERTEX_ATTRIB_ARRAY_POINTER),
    };
    const enabledAttributes = Array.from({ length: gl.getParameter(gl.MAX_VERTEX_ATTRIBS) as number },
      (_unused, index) => gl.getVertexAttrib(index, gl.VERTEX_ATTRIB_ARRAY_ENABLED) as boolean);
    const caps = [gl.BLEND, gl.SCISSOR_TEST, gl.DEPTH_TEST, gl.STENCIL_TEST, gl.CULL_FACE, gl.DITHER];
    const enabledCaps = caps.map(cap => gl.isEnabled(cap));
    const blend = [gl.BLEND_SRC_RGB, gl.BLEND_DST_RGB, gl.BLEND_SRC_ALPHA, gl.BLEND_DST_ALPHA,
      gl.BLEND_EQUATION_RGB, gl.BLEND_EQUATION_ALPHA].map(name => gl.getParameter(name) as number);
    const scissor = Array.from(gl.getParameter(gl.SCISSOR_BOX) as Int32Array) as [number, number, number, number];
    const mask = Array.from(gl.getParameter(gl.COLOR_WRITEMASK) as boolean[]) as [boolean, boolean, boolean, boolean];
    const clear = Array.from(gl.getParameter(gl.COLOR_CLEAR_VALUE) as Float32Array) as [number, number, number, number];
    const depth = groupState ? {
      func: gl.getParameter(gl.DEPTH_FUNC) as number, write: gl.getParameter(gl.DEPTH_WRITEMASK) as boolean,
      clear: gl.getParameter(gl.DEPTH_CLEAR_VALUE) as number,
      renderbuffer: gl.getParameter(gl.RENDERBUFFER_BINDING) as WebGLRenderbuffer | null,
      pointers: enabledAttributes.map((_enabled, index) => ({ index,
        buffer: gl.getVertexAttrib(index,gl.VERTEX_ATTRIB_ARRAY_BUFFER_BINDING) as WebGLBuffer | null,
        size: gl.getVertexAttrib(index,gl.VERTEX_ATTRIB_ARRAY_SIZE) as number,
        type: gl.getVertexAttrib(index,gl.VERTEX_ATTRIB_ARRAY_TYPE) as number,
        normalized: gl.getVertexAttrib(index,gl.VERTEX_ATTRIB_ARRAY_NORMALIZED) as boolean,
        stride: gl.getVertexAttrib(index,gl.VERTEX_ATTRIB_ARRAY_STRIDE) as number,
        offset: gl.getVertexAttribOffset(index,gl.VERTEX_ATTRIB_ARRAY_POINTER),
      })),
    } : null;
    try { return work(); }
    finally {
      gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer); gl.viewport(...viewport); gl.useProgram(program);
      textureBindings.forEach((texture, unit) => { gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, texture); });
      gl.activeTexture(activeTexture);
      gl.bindBuffer(gl.ARRAY_BUFFER, attributeBuffer);
      gl.vertexAttribPointer(location, attribute.size, attribute.type, attribute.normalized, attribute.stride, attribute.offset);
      if (depth) for (const pointer of depth.pointers) if (pointer.buffer) {
        gl.bindBuffer(gl.ARRAY_BUFFER,pointer.buffer);
        gl.vertexAttribPointer(pointer.index,pointer.size,pointer.type,pointer.normalized,pointer.stride,pointer.offset);
      }
      enabledAttributes.forEach((enabled, index) => enabled ? gl.enableVertexAttribArray(index) : gl.disableVertexAttribArray(index));
      gl.bindBuffer(gl.ARRAY_BUFFER, arrayBuffer);
      caps.forEach((cap, index) => enabledCaps[index] ? gl.enable(cap) : gl.disable(cap));
      gl.blendFuncSeparate(blend[0]!, blend[1]!, blend[2]!, blend[3]!);
      gl.blendEquationSeparate(blend[4]!, blend[5]!); gl.scissor(...scissor);
      gl.colorMask(...mask); gl.clearColor(...clear);
      if (depth) {
        gl.depthFunc(depth.func); gl.depthMask(depth.write); gl.clearDepth(depth.clear);
        gl.bindRenderbuffer(gl.RENDERBUFFER,depth.renderbuffer);
      }
    }
  };
  const auxiliary = <T>(location: number, work: () => T, groupState = false): T | null => {
    checkPriorError();
    try {
      const result = guarded(location, work, groupState);
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
    if (!Number.isSafeInteger(n) || bytes + n > auxiliaryBytesLimit) throw new Error("sky_gpu_contribution_budget");
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
      return { texture, framebuffer, width: w, height: h, bytes: n, depth: null };
    } catch (error) {
      if (framebuffer) gl.deleteFramebuffer(framebuffer);
      if (texture) gl.deleteTexture(texture);
      throw error;
    }
  };
  const ensureDepth = (target: Target) => {
    if (target.depth) return;
    const n = target.width * target.height * 2;
    if (!Number.isSafeInteger(n) || bytes + n > auxiliaryBytesLimit) throw new Error("sky_gpu_contribution_budget");
    const depth = gl.createRenderbuffer();
    if (!depth) throw new Error("sky_gpu_group_depth_unavailable");
    try {
      gl.bindRenderbuffer(gl.RENDERBUFFER,depth);
      gl.renderbufferStorage(gl.RENDERBUFFER,gl.DEPTH_COMPONENT16,target.width,target.height);
      gl.bindFramebuffer(gl.FRAMEBUFFER,target.framebuffer);
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.RENDERBUFFER,depth);
      if (gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE || gl.getError()!==gl.NO_ERROR)
        throw new Error("sky_gpu_group_depth_incomplete");
      target.depth=depth;target.bytes+=n;bytes+=n;
    } catch (error) {
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.RENDERBUFFER,null);
      gl.deleteRenderbuffer(depth);throw error;
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
  const maximum = (source: Target, local?: { region: SkyDeepSkyRegion; entry: Entry }): Uint8Array => {
    let current = source;
    gl.disable(gl.BLEND); gl.disable(gl.SCISSOR_TEST); gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.STENCIL_TEST); gl.disable(gl.CULL_FACE); gl.disable(gl.DITHER);
    gl.colorMask(true, true, true, true); gl.useProgram(reduceProgram!.program);
    gl.bindBuffer(gl.ARRAY_BUFFER, reduceBuffer);
    // Some native GL drivers validate even attributes unused by this shader.
    // The preceding point/line draw can expose fewer than these six vertices.
    for (let index = 0, count = gl.getParameter(gl.MAX_VERTEX_ATTRIBS) as number; index < count; index++) {
      index === positionLocation ? gl.enableVertexAttribArray(index) : gl.disableVertexAttribArray(index);
    }
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
    for (const [index,target] of scratch.entries()) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, target.framebuffer); gl.viewport(0, 0, target.width, target.height);
      const program=local && index===0 ? localReduceProgram! : reduceProgram!;
      gl.useProgram(program.program);
      const registration=local?.region.registration;
      setUniforms(program, {u_input:current.texture,u_size:[current.width,current.height],
        ...(local && index===0 ? {...local.entry.camera,
          u_regionRow0:registration!.rows[0],u_regionRow1:registration!.rows[1],u_regionRow2:registration!.rows[2],
          u_regionAnchorU:registration!.anchorU,u_regionAnchorV:registration!.anchorV,u_regionDeterminant:registration!.determinant} : {})});
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
  const currentEntry = (draw: object) => {
    const entry = entries.get(draw);
    // Disabled, foreign and retired draw queries do not touch GL. Current
    // receipts must also fence loss/resize occurring after the last finish.
    if (!entry) return undefined;
    if (gl.isContextLost()) { invalidate(); return undefined; }
    if (!currentSize()) {
      entries.clear(); frameOpen = false; finished = false; retire();
      // Resizing is an ordinary frame boundary, not an auxiliary failure latch.
      // A new begin rechecks the new dimensions against the original budget.
      return undefined;
    }
    return entry;
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
      if (entries.size >= maxGroups || !supportedFramebuffer() || !fullRgbWrite()) return;
      const size = dimensions(), location = gl.getAttribLocation(prepared.program.program, "a_position");
      if (!size || location < 0 || !gl.getVertexAttrib(location, gl.VERTEX_ATTRIB_ARRAY_BUFFER_BINDING)) return;
      const [w, h] = size;
      if (width > 0 && (width !== w || height !== h)) { invalidate(); return; }
      const chain = scratchDimensions(w, h);
      const free = pool.find(target => !used.has(target));
      const needed = (free ? 0 : w * h * 4) + (scratch.length ? 0 : chain.reduce((sum, [x, y]) => sum + x * y * 4, 0));
      if (!Number.isSafeInteger(needed) || bytes + needed > auxiliaryBytesLimit) return;
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
        const camera: Record<string, unknown> = {};
        for (const name of ["u_center","u_scale","u_right","u_up","u_forward"]) {
          const value=prepared.uniforms[name]; camera[name]=Array.isArray(value)?Object.freeze([...value]):value;
        }
        camera.u_logicalSize=Object.freeze([...(prepared.uniforms.u_resolution as number[])]);
        return {target, qualification, photoUsable:true, receipt:null,revision:++signalRevision,
          camera:Object.freeze(camera),cameraRay:prepared.cameraRay,localCache:new Map()} as Entry;
      });
      if (captured) entries.set(draw, captured);
    },
    /** Every tile of one source accumulates into its existing frame signal.
     * Actual later draws already attenuate it through afterDraw, including
     * another source, a transparent PNG, landscape and navigation clear. */
    captureMeshAlpha(group:object,prepared:SkyGpuArtworkContributionDraw){
      if(!enabled||disposed||!frameOpen||faulted||!prepared.alphaFragment)return;
      reopen();checkPriorError();
      if(gl.isContextLost()){invalidate();return;}
      const existing=entries.get(group);
      if(existing&&!existing.photoUsable)return;
      if((!existing&&entries.size>=maxGroups)||!supportedFramebuffer()||!fullRgbWrite())return;
      const size=dimensions(),location=gl.getAttribLocation(prepared.program.program,"a_position");
      if(!size||location<0||!gl.getVertexAttrib(location,gl.VERTEX_ATTRIB_ARRAY_BUFFER_BINDING))return;
      const [w,h]=size;
      if(width>0&&(width!==w||height!==h)){invalidate();return;}
      const chain=scratchDimensions(w,h),free=existing?.target??pool.find(target=>!used.has(target));
      const needed=(free?0:w*h*4)+(scratch.length?0:chain.reduce((sum,[x,y])=>sum+x*y*4,0));
      if(!Number.isSafeInteger(needed)||bytes+needed>auxiliaryBytesLimit)return;
      const captured=auxiliary(location,()=>{
        const key=JSON.stringify([prepared.vertex,prepared.alphaFragment,location]);
        if(meshProgramKey!==key||!meshSignalProgram){
          if(meshSignalProgram)gl.deleteProgram(meshSignalProgram.program);
          meshSignalProgram=makeProgram(prepared.vertex,prepared.alphaFragment!,location);meshProgramKey=key;
        }
        if(!reduceProgram){reduceProgram=makeProgram(reduceVertex,reduceFragment,location);positionLocation=location;}
        // An incompatible normal position layout is not silently reinterpreted.
        if(positionLocation!==location)throw new Error("sky_gpu_mesh_contribution_layout_unavailable");
        if(!reduceBuffer){reduceBuffer=gl.createBuffer();if(!reduceBuffer)throw new Error("sky_gpu_contribution_buffer_unavailable");gl.bindBuffer(gl.ARRAY_BUFFER,reduceBuffer);gl.bufferData(gl.ARRAY_BUFFER,reductionQuad,gl.STATIC_DRAW);}
        width=w;height=h;if(!scratch.length)for(const [x,y] of chain)scratch.push(makeTarget(x,y));
        const target=free??makeTarget(w,h);if(!free)pool.push(target);used.add(target);
        const scissor=gl.isEnabled(gl.SCISSOR_TEST);
        gl.bindFramebuffer(gl.FRAMEBUFFER,target.framebuffer);
        if(!existing){gl.disable(gl.SCISSOR_TEST);gl.colorMask(true,true,true,true);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);if(scissor)gl.enable(gl.SCISSOR_TEST);}
        gl.enable(gl.BLEND);gl.blendEquation(gl.FUNC_ADD);gl.blendFuncSeparate(gl.ONE,gl.ONE,gl.ONE,gl.ONE);
        gl.colorMask(true,true,false,false);gl.useProgram(meshSignalProgram!.program);
        setBuffersAndAttributes(gl,meshSignalProgram!,prepared.buffer);setUniforms(meshSignalProgram!,prepared.uniforms);
        drawBufferInfo(gl,prepared.buffer,prepared.primitive);
        if(existing){changed(existing);return existing;}
        return {target,qualification:unknownQualification,photoUsable:true,receipt:null,revision:++signalRevision,
          camera:Object.freeze({}),cameraRay:"",localCache:new Map()} as Entry;
      });
      if(captured)entries.set(group,captured);
    },
    /** One source's finest-first colour work target becomes its A-channel
     * contribution signal after the completed composite. No second full image
     * or retained input/VBO is required. Refusal leaves the caller's independent
     * draw untouched; GL faults latch until the existing explicit reset. */
    composeMeshGroup(group:object,prepared:SkyGpuArtworkContributionDraw,
      draw:()=>readonly boolean[],composite:(texture:WebGLTexture)=>void):readonly boolean[]|null {
      if(!enabled||disposed||!frameOpen||faulted)return null;
      reopen();checkPriorError();
      if(gl.isContextLost()){invalidate();return null;}
      if(entries.has(group)||entries.size>=maxGroups||!supportedFramebuffer()||!fullRgbWrite())return null;
      const size=dimensions(),location=gl.getAttribLocation(prepared.program.program,"a_position");
      if(!size||location<0||!gl.getVertexAttrib(location,gl.VERTEX_ATTRIB_ARRAY_BUFFER_BINDING))return null;
      const [w,h]=size;
      if(width>0&&(width!==w||height!==h)){invalidate();return null;}
      const chain=scratchDimensions(w,h),free=pool.find(target=>!used.has(target));
      const needed=(free?(free.depth?0:w*h*2):w*h*6)+
        (scratch.length?0:chain.reduce((sum,[x,y])=>sum+x*y*4,0));
      if(!Number.isSafeInteger(needed)||bytes+needed>auxiliaryBytesLimit)return null;
      const maxDepth=gl.getParameter(gl.MAX_RENDERBUFFER_SIZE) as number;
      if(!Number.isFinite(maxDepth)||w>maxDepth||h>maxDepth)return null;
      const rendered=auxiliary(location,()=>{
        if(!reduceProgram){reduceProgram=makeProgram(reduceVertex,reduceFragment,location);positionLocation=location;}
        if(positionLocation!==location)throw new Error("sky_gpu_group_contribution_layout_unavailable");
        if(!reduceBuffer){reduceBuffer=gl.createBuffer();if(!reduceBuffer)throw new Error("sky_gpu_contribution_buffer_unavailable");gl.bindBuffer(gl.ARRAY_BUFFER,reduceBuffer);gl.bufferData(gl.ARRAY_BUFFER,reductionQuad,gl.STATIC_DRAW);}
        width=w;height=h;if(!scratch.length)for(const [x,y] of chain)scratch.push(makeTarget(x,y));
        const target=free??makeTarget(w,h);if(!free)pool.push(target);used.add(target);ensureDepth(target);
        gl.bindFramebuffer(gl.FRAMEBUFFER,target.framebuffer);gl.viewport(0,0,w,h);
        gl.disable(gl.SCISSOR_TEST);gl.disable(gl.STENCIL_TEST);gl.disable(gl.CULL_FACE);
        gl.colorMask(true,true,true,true);gl.clearColor(0,0,0,0);gl.clearDepth(1);gl.depthMask(true);
        gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LESS);
        const results=draw();
        return {target,results};
      },true);
      if(!rendered)return null;
      // Normal-frame error and cross-source attenuation belong to the actual
      // composite. Register this signal afterwards, avoiding texture feedback.
      composite(rendered.target.texture);checkPriorError();
      entries.set(group,{target:rendered.target,qualification:unknownQualification,photoUsable:true,
        receipt:null,revision:++signalRevision,camera:Object.freeze({}),cameraRay:"",localCache:new Map(),photoChannel:"alpha"});
      return rendered.results;
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
        gl.blendFuncSeparate(gl.ZERO, destination, gl.ZERO, destination);
        for (const entry of entries.values()) if (entry.photoUsable) {
          gl.colorMask(entry.photoChannel!=="alpha",entry.photoChannel!=="alpha",false,entry.photoChannel==="alpha");
          gl.bindFramebuffer(gl.FRAMEBUFFER, entry.target.framebuffer); replay(); changed(entry);
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
        gl.clearColor(0, 0, 0, 0);
        for (const entry of entries.values()) if (entry.photoUsable) {
          gl.colorMask(entry.photoChannel!=="alpha",entry.photoChannel!=="alpha",false,entry.photoChannel==="alpha");
          gl.bindFramebuffer(gl.FRAMEBUFFER, entry.target.framebuffer); gl.clear(gl.COLOR_BUFFER_BIT); changed(entry);
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
              finePhoto: max && max[entry.photoChannel==="alpha"?3:0]! > 0 ? "positive" : "unknown",
              coarsePhoto: max && entry.photoChannel!=="alpha" && max[1]! > 0 ? "positive" : "unknown" });
          }
          return true;
        });
        if (!result) return;
      }
      trimUnused(); finished = true;
    },
    qualification(draw: SkyArtworkLevelsDraw): SkyArtworkLevelsQualification {
      return currentEntry(draw)?.qualification ?? unknownQualification;
    },
    contribution(draw: SkyArtworkLevelsDraw): SkyArtworkLevelsContribution {
      const entry = currentEntry(draw);
      if (!entry) return unknownContribution;
      return finished && entry.receipt ? entry.receipt : Object.freeze({
        completed: false, qualification: entry.qualification, finePhoto: "unknown", coarsePhoto: "unknown",
      });
    },
    meshAlphaContribution(group:object):"positive"|"unknown"{
      const entry=currentEntry(group);
      return finished&&entry?.receipt?.finePhoto==="positive"?"positive":"unknown";
    },
    observeRegion(draw:SkyArtworkLevelsDraw,region:SkyDeepSkyRegion|null): SkyArtworkLocalObservation {
      const entry=currentEntry(draw);
      if(!entry || !region || finished || !entry.photoUsable || scratch.length===0) return unknownSkyArtworkLocalObservation;
      const cached=entry.localCache.get(region); if(cached) return cached;
      const observed=auxiliary(positionLocation,()=>{
        if(!localReduceProgram) localReduceProgram=makeProgram(reduceVertex,localReduceFragment(entry.cameraRay),positionLocation);
        const max=maximum(entry.target,{region,entry});
        const slot=(selected:number,photo:number)=>Object.freeze({
          // Original expected-slot completeness belongs to the science caller.
          selection:selected>0 ? "has" as const : "unknown" as const,
          photo:photo>0 ? "positive" as const : "unknown" as const,
        });
        return Object.freeze({scope:"frozen-highp-shader-pixel-centers" as const,precision:"unknown" as const,
          signalRevision:entry.revision,fine:slot(max[2]!,max[0]!),coarse:slot(max[3]!,max[1]!)});
      });
      if(!observed || entries.get(draw)!==entry) return unknownSkyArtworkLocalObservation;
      entry.localCache.set(region,observed); return observed;
    },
    hasPending, invalidate,
    meshGroupsEnabled() { return enabled&&!disposed&&frameOpen&&!faulted; },
    failed() { return enabled && !disposed && faulted; },
    /** Explicit retry only. begin never repeatedly recompiles/reallocates after
     * a probe failure. Reset also retires every old-frame receipt and object. */
    reset() { entries.clear(); finished = false; frameOpen = false; retire(); faulted = false; },
    dispose() { entries.clear(); frameOpen = false; finished = false; disposed = true; retire(); },
  };
}
