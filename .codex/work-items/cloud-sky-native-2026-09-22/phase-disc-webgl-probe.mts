import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import ts from "typescript";
import { SATURN_BANDS, SATURN_EQUATORIAL_RADIUS_KM } from "../../../apps/wechat-miniapp/src/features/sky/sky-saturn-rings.ts";

const require = createRequire(import.meta.url);
const { chromium } = require("C:/Users/777/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const root = path.resolve(import.meta.dirname, "../../..");
const source = ts.createSourceFile("sky-gpu-renderer.ts", fs.readFileSync(path.join(root,
  "apps/wechat-miniapp/src/features/sky/sky-gpu-renderer.ts"), "utf8"), ts.ScriptTarget.Latest, true);
function shader(name: string, parts: Record<string, unknown> = {}): string {
  const declaration = source.statements.flatMap(statement => ts.isVariableStatement(statement)
    ? [...statement.declarationList.declarations] : []).find(value => value.name.getText(source) === name);
  assert.ok(declaration?.initializer, name);
  return vm.runInNewContext(declaration.initializer.getText(source), parts);
}
const vertex = shader("imageVertex", { position: shader("position") });
const fragment = shader("moonFragment", { skyRay: shader("skyRay"),
  saturnRingShadowFragment: shader("saturnRingShadowFragment", { SATURN_BANDS, SATURN_EQUATORIAL_RADIUS_KM }) });
const output = path.join(root, "artifacts/miniapp/cloud-sky-native/phase-disc-0928");
fs.mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ headless: true, args: ["--use-gl=angle", "--use-angle=swiftshader"] });
try {
  const page = await browser.newPage({ viewport: { width: 512, height: 512 } });
  await page.setContent('<style>body{margin:0;background:#000}</style><canvas width="512" height="512"></canvas>');
  // tsx preserves function names with this helper when serializing evaluate.
  await page.evaluate("globalThis.__name = target => target");
  const result = await page.evaluate(({ vertex, fragment }: { vertex: string; fragment: string }) => {
    const gl = document.querySelector("canvas")!.getContext("webgl", { preserveDrawingBuffer: true, antialias: false })!;
    if (!gl) throw Error("webgl_unavailable");
    function compile(type: number, code: string) {
      const value = gl.createShader(type)!; gl.shaderSource(value, code); gl.compileShader(value);
      if (!gl.getShaderParameter(value, gl.COMPILE_STATUS)) throw Error(gl.getShaderInfoLog(value)!);
      return value;
    }
    const program = gl.createProgram()!;
    gl.attachShader(program, compile(gl.VERTEX_SHADER, vertex)); gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragment));
    gl.linkProgram(program); if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw Error(gl.getProgramInfoLog(program)!);
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([56,56,0,0,456,56,1,0,56,456,0,1,
      56,456,0,1,456,56,1,0,456,456,1,1]), gl.STATIC_DRAW);
    const attribute = gl.getAttribLocation(program, "a_position"); gl.enableVertexAttribArray(attribute);
    gl.vertexAttribPointer(attribute, 2, gl.FLOAT, false, 16, 0);
    const uv = gl.getAttribLocation(program, "a_uv"); gl.enableVertexAttribArray(uv);
    gl.vertexAttribPointer(uv, 2, gl.FLOAT, false, 16, 8);
    function uniform(name: string, values: number[]) {
      const location = gl.getUniformLocation(program, name);
      if (values.length === 1) gl.uniform1f(location, values[0]!);
      if (values.length === 2) gl.uniform2fv(location, values);
      if (values.length === 3) gl.uniform3fv(location, values);
    }
    uniform("u_resolution", [512,512]); uniform("u_center", [256,256]); uniform("u_scale", [1000]);
    uniform("u_right", [1,0,0]); uniform("u_up", [0,1,0]); uniform("u_forward", [0,0,1]);
    uniform("u_discCenter", [256,256]); uniform("u_discRadius", [200]);
    uniform("u_minorDirection", [0,1]); uniform("u_minorRatio", [1]); uniform("u_ringShadowAvailable", [0]);
    gl.viewport(0,0,512,512);
    function draw(fraction: number, direction: number[], tint: number[]) {
      uniform("u_tint", tint); uniform("u_sunward", direction); uniform("u_illuminatedFraction", [fraction]);
      gl.clearColor(0,0,0,0); gl.clear(gl.COLOR_BUFFER_BIT); gl.drawArrays(gl.TRIANGLES, 0, 6);
      const pixels = new Uint8Array(512*512*4); gl.readPixels(0,0,512,512,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
      let count = 0, day = 0, cx = 0, cy = 0;
      for (let y=0;y<512;y++) for (let x=0;x<512;x++) {
        const index = (y*512+x)*4;
        if (pixels[index+3] === 0) continue;
        count++;
        // Display night floor is 0.045; day is >0.62. Threshold classifies the
        // geometric bright region; it is not an absolute radiance measurement.
        if (pixels[index]!/tint[0]! > 128) { day++; cx += x+.5-256; cy += 511-y+.5-256; }
      }
      return { fraction, direction, tint, measured: day/count,
        centroidAlongSun: day ? (cx*direction[0]!+cy*direction[1]!)/day : null,
        error: Math.abs(day/count-fraction), count };
    }
    const samples = [];
    for (const tint of [[1,1,1], [1,.24,.18]]) for (const direction of [[1,0],[-1,0],[0,1],[0,-1]])
      for (const fraction of [0,.05,.175,.25,.5,.9,1]) samples.push(draw(fraction,direction,tint));
    // Save the batch window's representative Venus crescent with the actual
    // scene display tint; no image source or surface/weather detail is implied.
    draw(.175, [1,0], [234/255,223/255,199/255]);
    return { scope: "Production common phase shader, Chromium WebGL1 only; no target/photometric acceptance",
      samples, noGlError: gl.getError() === gl.NO_ERROR };
  }, { vertex, fragment });
  await page.screenshot({ path: path.join(output, "venus-phase.png") });
  fs.writeFileSync(path.join(output, "result.json"), JSON.stringify(result, null, 2)+"\n");
  // At r=200 px, a one-pixel disk circumference is at most 2/r = 1% of
  // its area. Budget includes the existing edge/terminator anti-alias band.
  assert.ok(result.noGlError && result.samples.every((sample: {error:number;fraction:number;centroidAlongSun:number|null}) =>
    sample.error <= .01 && (sample.fraction === 0 || sample.fraction === 1 || sample.centroidAlongSun! > 0)));
  console.log(JSON.stringify({ samples: result.samples.length,
    maximumAreaError: Math.max(...result.samples.map((sample: {error:number}) => sample.error)), scope: result.scope }));
} finally { await browser.close(); }
