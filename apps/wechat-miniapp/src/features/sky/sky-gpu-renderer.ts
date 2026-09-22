import { createProgramInfo, setBuffersAndAttributes, setUniforms, drawBufferInfo,
  type ProgramInfo, type BufferInfo } from "twgl.js";
import type { SkyRenderSurface } from "./sky-render-surface";
import { skyArtworkViewParameters } from "./sky-artwork-registration";
import { createSkyGpuTextures } from "./sky-gpu-textures";

const position = `
  vec4 screenPosition(vec2 p) {
    return vec4(p.x / u_resolution.x * 2.0 - 1.0, 1.0 - p.y / u_resolution.y * 2.0, 0.0, 1.0);
  }`;
const pointVertex = `
  attribute vec2 a_position;
  attribute vec2 a_shape;
  attribute vec4 a_color;
  uniform vec2 u_resolution;
  uniform float u_pixelRatio;
  varying vec4 v_color;
  varying vec2 v_shape;
  varying float v_size;
  ${position}
  void main() {
    gl_Position = screenPosition(a_position);
    v_size = 2.0 * (a_shape.x * u_pixelRatio + 1.0);
    gl_PointSize = v_size;
    v_shape = a_shape * u_pixelRatio;
    v_color = a_color;
  }`;
const pointFragment = `
  precision mediump float;
  varying vec4 v_color;
  varying vec2 v_shape;
  varying float v_size;
  void main() {
    float d = length(gl_PointCoord - 0.5) * v_size;
    float alpha = 1.0 - smoothstep(v_shape.x - 0.5, v_shape.x + 0.5, d);
    if (v_shape.y > 0.0) alpha *= smoothstep(v_shape.x - v_shape.y - 0.5, v_shape.x - v_shape.y + 0.5, d);
    gl_FragColor = vec4(v_color.rgb, v_color.a * alpha);
  }`;
const lineVertex = `
  attribute vec2 a_position;
  attribute vec4 a_color;
  uniform vec2 u_resolution;
  varying vec4 v_color;
  ${position}
  void main() { gl_Position = screenPosition(a_position); v_color = a_color; }`;
const lineFragment = `
  precision mediump float;
  varying vec4 v_color;
  void main() { gl_FragColor = v_color; }`;
const imageVertex = `
  attribute vec2 a_position;
  attribute vec2 a_uv;
  uniform vec2 u_resolution;
  varying vec2 v_uv;
  ${position}
  void main() { gl_Position = screenPosition(a_position); v_uv = a_uv; }`;
const imageFragment = `
  precision mediump float;
  uniform sampler2D u_image;
  uniform float u_opacity;
  varying vec2 v_uv;
  void main() { vec4 c = texture2D(u_image, v_uv); gl_FragColor = vec4(c.rgb, c.a * u_opacity); }`;
const artworkVertex = `
  attribute vec2 a_position;
  uniform vec2 u_resolution;
  varying vec2 v_pixel;
  ${position}
  void main() { v_pixel = a_position; gl_Position = screenPosition(a_position); }`;
// Inverse of sky-view-projection, followed by intersection with the three-anchor
// image plane. Uses ENU throughout; the research prototype's NEU is not copied.
const artworkFragment = `
  precision highp float;
  varying vec2 v_pixel;
  uniform vec2 u_center;
  uniform float u_scale;
  uniform vec3 u_right, u_up, u_forward;
  uniform vec3 u_row0, u_row1, u_row2, u_anchorU, u_anchorV;
  uniform float u_determinant;
  uniform sampler2D u_image;
  uniform float u_opacity;
  uniform vec3 u_tint;
  void main() {
    vec2 p = (v_pixel-u_center)/u_scale;
    p.y = -p.y;
    float squared = dot(p,p);
    vec3 camera = vec3(2.0*p,1.0-squared)/(1.0+squared);
    vec3 ray = u_right*camera.x+u_up*camera.y+u_forward*camera.z;
    if (ray.z < 0.0) discard;
    vec3 coefficients = vec3(dot(u_row0,ray),dot(u_row1,ray),dot(u_row2,ray));
    float sum = coefficients.x+coefficients.y+coefficients.z;
    if (abs(sum)<0.0000001 || u_determinant/sum<=0.0) discard;
    vec2 uv = vec2(dot(coefficients,u_anchorU),dot(coefficients,u_anchorV))/sum;
    if (uv.x<0.0 || uv.y<0.0 || uv.x>1.0 || uv.y>1.0) discard;
    vec4 source = texture2D(u_image,uv);
    gl_FragColor = vec4(source.rgb*u_tint,source.a*u_opacity);
  }`;

export interface SkyGpuRenderer extends SkyRenderSurface { dispose(): void }

/** Native WEAPP WebGL node only; no DOM, offscreen canvas, readback or second camera. */
export function createSkyGpuRenderer(gl: WebGLRenderingContext, pixelRatio: number, options: {
  imageFailed?(image: object): void;
  textureByteBudget?: number;
} = {}): SkyGpuRenderer {
  let disposed = false;
  const programs: ProgramInfo[] = [];
  const buffers: WebGLBuffer[] = [];
  const textures = createSkyGpuTextures(gl,options.imageFailed,options.textureByteBudget);
  let width = 0, height = 0;
  let kind: "points" | "lines" | null = null;
  const vertices: number[] = [];
  const colors = new Map<string, readonly number[]>();
  const color = (hex: string) => {
    let rgb = colors.get(hex);
    if (!rgb) {
      if (!/^#[\da-f]{6}$/i.test(hex)) throw new Error("sky_gpu_invalid_color");
      rgb = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);
      colors.set(hex, rgb);
    }
    return rgb;
  };
  const assertAvailable = () => {
    if (disposed) throw new Error("sky_gpu_disposed");
    if (gl.isContextLost()) throw new Error("sky_gpu_context_lost");
  };
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    textures.dispose();
    for (const buffer of buffers) gl.deleteBuffer(buffer);
    for (const program of programs) gl.deleteProgram(program.program);
    buffers.length = programs.length = vertices.length = 0;
    colors.clear();
  };
  const makeProgram = (vertex: string, fragment: string) => {
    // TWGL deletes failed shaders/programs; retain each successful allocation
    // immediately so a later shader or buffer failure releases the earlier ones.
    const program = createProgramInfo(gl, [vertex, fragment], () => {});
    if (!program) throw new Error("sky_gpu_shader_unavailable");
    programs.push(program);
    const shaders = gl.getAttachedShaders(program.program);
    shaders?.forEach(shader => { gl.detachShader(program.program, shader); gl.deleteShader(shader); });
    return program;
  };
  const makeBuffer = (stride: number, attributes: Record<string, [number, number]>): BufferInfo => {
    const buffer = gl.createBuffer();
    if (!buffer) throw new Error("sky_gpu_buffer_unavailable");
    buffers.push(buffer);
    return { numElements: 0, attribs: Object.fromEntries(Object.entries(attributes).map(([name, [size, offset]]) =>
      [name, { buffer, numComponents: size, type: gl.FLOAT, stride: stride * 4, offset: offset * 4 }])) };
  };
  try {
    assertAvailable();
    if (!Number.isFinite(pixelRatio) || pixelRatio <= 0) throw new Error("sky_gpu_invalid_pixel_ratio");
    const points = makeProgram(pointVertex, pointFragment);
    const lines = makeProgram(lineVertex, lineFragment);
    const image = makeProgram(imageVertex, imageFragment);
    const pointBuffer = makeBuffer(8, { a_position: [2, 0], a_shape: [2, 2], a_color: [4, 4] });
    const lineBuffer = makeBuffer(6, { a_position: [2, 0], a_color: [4, 2] });
    const imageBuffer = makeBuffer(4, { a_position: [2, 0], a_uv: [2, 2] });
    let artwork: ProgramInfo | null = null, artworkBuffer: BufferInfo | null = null, artworkUnavailable = false;
    const maxAttributes = gl.getParameter(gl.MAX_VERTEX_ATTRIBS) as number;
    const submit = (program: ProgramInfo, buffer: BufferInfo, data: readonly number[], stride: number, primitive: number,
      uniforms: Record<string, unknown> = {}) => {
      if (!data.length) return;
      // Switching a dense star buffer to a 6-vertex image must disable unused
      // attribute arrays. Leaving an old enabled array caused GL1282 on Android.
      for (let i = 0; i < maxAttributes; i++) gl.disableVertexAttribArray(i);
      const first = Object.values(buffer.attribs!)[0]!;
      gl.bindBuffer(gl.ARRAY_BUFFER, first.buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.DYNAMIC_DRAW);
      buffer.numElements = data.length / stride;
      gl.useProgram(program.program);
      setBuffersAndAttributes(gl, program, buffer);
      setUniforms(program, { u_resolution: [width, height], u_pixelRatio: pixelRatio, ...uniforms });
      drawBufferInfo(gl, buffer, primitive);
    };
    const flush = () => {
      if (kind === "points") submit(points, pointBuffer, vertices, 8, gl.POINTS);
      if (kind === "lines") submit(lines, lineBuffer, vertices, 6, gl.TRIANGLES);
      vertices.length = 0; kind = null;
    };
    const use = (next: typeof kind) => { if (kind !== next) flush(); kind = next; };
    return {
      begin(w, h, background) {
        assertAvailable();
        if (!(w > 0 && h > 0 && Number.isFinite(w) && Number.isFinite(h))) throw new Error("sky_gpu_invalid_size");
        width = w; height = h; textures.begin();
        vertices.length = 0; kind = null;
        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
        gl.disable(gl.DEPTH_TEST); gl.disable(gl.CULL_FACE); gl.disable(gl.SCISSOR_TEST);
        gl.colorMask(true, true, true, true);
        gl.enable(gl.BLEND);
        gl.blendEquation(gl.FUNC_ADD);
        // Straight alpha source, opaque destination. Avoid translucent canvas
        // composition and keep the star's magnitude/alpha meaning unchanged.
        gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
        const rgb = color(background);
        gl.clearColor(rgb[0]!, rgb[1]!, rgb[2]!, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);
      },
      image(source, transform, opacity) {
        assertAvailable(); flush();
        const texture = textures.get(source);
        if (!texture) return false;
        const [a, b, c, d, e, f] = transform;
        const quad: number[] = [];
        for (const [u, v] of [[0,0],[1,0],[0,1],[0,1],[1,0],[1,1]]) {
          const x = u! - 0.5, y = v! - 0.5;
          quad.push(a*x+c*y+e, b*x+d*y+f, u!, v!);
        }
        submit(image, imageBuffer, quad, 4, gl.TRIANGLES, { u_image: texture, u_opacity: opacity });
        return true;
      },
      artwork(source, registration, view, opacity, tint) {
        assertAvailable();
        const parameters = skyArtworkViewParameters(view,width,height);
        if (!parameters || !Number.isFinite(opacity)) return false;
        if (opacity <= 0) return true;
        if (artworkUnavailable) return false;
        flush();
        if (!artwork) {
          const programCount = programs.length, bufferCount = buffers.length;
          try {
            artwork = makeProgram(artworkVertex,artworkFragment);
            artworkBuffer = makeBuffer(2,{a_position:[2,0]});
          } catch {
            for (const program of programs.splice(programCount)) gl.deleteProgram(program.program);
            for (const buffer of buffers.splice(bufferCount)) gl.deleteBuffer(buffer);
            artwork = null; artworkBuffer = null; artworkUnavailable = true;
            assertAvailable();
            return false; // Decorative shader failure keeps valid stars usable.
          }
        }
        const texture = textures.get(source);
        if (!texture) return false;
        const {rows,determinant,anchorU,anchorV} = registration;
        // Add faint source light without the image's black backing obscuring
        // valid sky content. Alpha keeps transparent original PNG pixels empty.
        gl.blendFuncSeparate(gl.SRC_ALPHA,gl.ONE,gl.ZERO,gl.ONE);
        try {
          submit(artwork,artworkBuffer!,[0,0,width,0,0,height,0,height,width,0,width,height],2,gl.TRIANGLES,{
            u_center:[parameters.center.x,parameters.center.y],u_scale:parameters.scale,
            u_right:view.basis.right,u_up:view.basis.up,u_forward:view.basis.forward,
            u_row0:rows[0],u_row1:rows[1],u_row2:rows[2],u_determinant:determinant,
            u_anchorU:anchorU,u_anchorV:anchorV,u_image:texture,u_opacity:Math.min(1,opacity),u_tint:color(tint),
          });
        } finally { gl.blendFuncSeparate(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA,gl.ONE,gl.ONE_MINUS_SRC_ALPHA); }
        return true;
      },
      segments(segments, hex, opacity = 1) {
        use("lines"); const rgb = color(hex);
        for (const [x1,y1,x2,y2] of segments) {
          const length = Math.hypot(x2-x1, y2-y1);
          if (length <= 0) continue;
          const dx = -(y2-y1) / length * 0.5, dy = (x2-x1) / length * 0.5;
          for (const [x,y] of [[x1+dx,y1+dy],[x1-dx,y1-dy],[x2+dx,y2+dy],
            [x2+dx,y2+dy],[x1-dx,y1-dy],[x2-dx,y2-dy]]) vertices.push(x!, y!, ...rgb, opacity);
        }
      },
      disc(x, y, radius, hex, opacity, strokeWidth = 0) {
        use("points"); vertices.push(x, y, radius, strokeWidth, ...color(hex), opacity);
      },
      finish() {
        assertAvailable(); flush();
        textures.finish();
        // Submission is not physical presentation evidence. Detect native GL
        // failures before the page publishes a usable picking snapshot.
        const error = gl.getError();
        if (error !== gl.NO_ERROR) throw new Error(`sky_gpu_draw_failed:${error}`);
        assertAvailable();
      },
      dispose,
    };
  } catch (error) { dispose(); throw error; }
}
