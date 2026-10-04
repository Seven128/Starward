import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import ts from "typescript";
import { skyLandscapeFragment } from "../../../../apps/wechat-miniapp/src/features/sky/sky-landscape.ts";
import { skyLandscapeOccludes } from "../../../../apps/wechat-miniapp/src/features/sky/sky-landscape-geometry.ts";
import { createSkyViewBasis, unprojectSkyPoint, skyProjectionScale } from "../../../../apps/wechat-miniapp/src/features/sky/sky-view-projection.ts";

// Reproducible production-shader framebuffer check, not browsing the reference
// or claiming a WeChat/device performance result. Reuse the installed runtime.
const require = createRequire(import.meta.url);
const { chromium } = require("C:/Users/777/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const root = path.resolve(import.meta.dirname, "../../../..");
const output = path.resolve(root, process.argv[2] ?? "output/playwright/cloud-sky-landscape-0928");
assert.ok(output.startsWith(path.join(root, "output", "playwright") + path.sep), "task output stays under output/playwright");
assert.ok(!fs.existsSync(path.join(output, "result.json")), "preserve previous framebuffer evidence");
fs.mkdirSync(output, { recursive: true });
const source = ts.createSourceFile("sky-gpu-renderer.ts", fs.readFileSync(path.join(root,
  "apps/wechat-miniapp/src/features/sky/sky-gpu-renderer.ts"), "utf8"), ts.ScriptTarget.Latest, true);
function shader(name: string, parts: Record<string, unknown> = {}): string {
  const declaration = source.statements.flatMap(statement => ts.isVariableStatement(statement)
    ? [...statement.declarationList.declarations] : []).find(value => value.name.getText(source) === name);
  assert.ok(declaration?.initializer, name);
  return vm.runInNewContext(declaration.initializer.getText(source), parts);
}
const vertex = shader("artworkVertex", { position: shader("position") });
const fragment = skyLandscapeFragment(shader("skyRay"));
const width = 390, height = 844;
const cases = [
  { name: "night-northwest-85", heading: 315, beta: 100, fov: 85, sunAltitude: -24, red: false },
  { name: "day-northwest-85", heading: 315, beta: 100, fov: 85, sunAltitude: 45, red: false },
  { name: "twilight-northwest-85", heading: 315, beta: 100, fov: 85, sunAltitude: -6, red: false },
  { name: "red-northwest-85", heading: 315, beta: 100, fov: 85, sunAltitude: -24, red: true },
  { name: "night-northeast-45", heading: 45, beta: 100, fov: 45, sunAltitude: -24, red: false },
  { name: "night-all-sky", heading: 0, beta: 180, fov: 267.8, sunAltitude: -24, red: false },
  { name: "night-canopy-close", heading: 324.462322, beta: 100, fov: 5, sunAltitude: -24, red: false },
  { name: "night-canopy-notch-close", heading: 315.41919695144884, beta: 102.04631425223917, fov: .5, sunAltitude: -24, red: false },
];
const browser = await chromium.launch({ headless: true, args: ["--use-gl=angle", "--use-angle=swiftshader"] });
try {
  const page = await browser.newPage({ viewport: { width, height } });
  await page.setContent(`<style>body{margin:0;background:#141a2f}</style><canvas width="${width}" height="${height}"></canvas>`);
  await page.evaluate("globalThis.__name = target => target");
  const results = [];
  for (const scenario of cases) {
    const basis = createSkyViewBasis(scenario.heading, scenario.beta, 0)!;
    const scale = skyProjectionScale(height, scenario.fov)!;
    const solar = scenario.sunAltitude * Math.PI / 180;
    const pixels = await page.evaluate(({ vertex, fragment, width, height, basis, scale, solar, scenario }: any) => {
      const canvas = document.querySelector("canvas")!;
      const gl = canvas.getContext("webgl", { preserveDrawingBuffer: true, antialias: false })!;
      if (!gl) throw Error("webgl_unavailable");
      function compile(type: number, code: string) {
        const value = gl.createShader(type)!; gl.shaderSource(value, code); gl.compileShader(value);
        if (!gl.getShaderParameter(value, gl.COMPILE_STATUS)) throw Error(gl.getShaderInfoLog(value)!);
        return value;
      }
      const program = gl.createProgram()!, vs = compile(gl.VERTEX_SHADER, vertex), fs = compile(gl.FRAGMENT_SHADER, fragment);
      gl.attachShader(program, vs); gl.attachShader(program, fs); gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw Error(gl.getProgramInfoLog(program)!);
      gl.useProgram(program);
      const buffer = gl.createBuffer()!; gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0,0,width,0,0,height,0,height,width,0,width,height]), gl.STATIC_DRAW);
      const attribute = gl.getAttribLocation(program, "a_position"); gl.enableVertexAttribArray(attribute);
      gl.vertexAttribPointer(attribute, 2, gl.FLOAT, false, 8, 0);
      function uniform(name: string, values: number[]) {
        const location = gl.getUniformLocation(program, name);
        if (values.length === 1) gl.uniform1f(location, values[0]!);
        if (values.length === 2) gl.uniform2fv(location, values);
        if (values.length === 3) gl.uniform3fv(location, values);
      }
      uniform("u_resolution", [width,height]); uniform("u_center", [width/2,height/2]); uniform("u_scale", [scale]);
      uniform("u_right", basis.right); uniform("u_up", basis.up); uniform("u_forward", basis.forward);
      uniform("u_sunDirection", [-Math.cos(solar),0,Math.sin(solar)]);
      uniform("u_sunAltitude", [scenario.sunAltitude]); uniform("u_observationMode", [scenario.red ? 1 : 0]);
      uniform("u_base", [20/255,26/255,47/255]); gl.viewport(0,0,width,height);
      gl.disable(gl.BLEND); gl.clearColor(0,0,0,0); gl.clear(gl.COLOR_BUFFER_BIT); gl.drawArrays(gl.TRIANGLES,0,6);
      const values = new Uint8Array(width*height*4); gl.readPixels(0,0,width,height,gl.RGBA,gl.UNSIGNED_BYTE,values);
      const samples = [];
      let opaque = 0, maximumGreen = 0, maximumBlue = 0;
      for (let y=0;y<height;y++) for (let x=0;x<width;x++) {
        const index = ((height-1-y)*width+x)*4;
        if (values[index+3] === 255) { opaque++; maximumGreen=Math.max(maximumGreen,values[index+1]!);maximumBlue=Math.max(maximumBlue,values[index+2]!); }
        if (x%7===3 && y%7===3) samples.push({ x:x+.5, y:y+.5, covered:values[index+3]===255 });
      }
      // Synchronous readback forces host command completion; gl.finish alone
      // can return before cross-process execution. This is diagnostic cost,
      // not a target-device frame-time or performance budget.
      const times = [];
      const timingPixel = new Uint8Array(4);
      for (let index=0;index<12;index++) {
        const start=performance.now();gl.drawArrays(gl.TRIANGLES,0,6);
        gl.readPixels(0,0,1,1,gl.RGBA,gl.UNSIGNED_BYTE,timingPixel);times.push(performance.now()-start);
      }
      const noGlError=gl.getError()===gl.NO_ERROR;
      gl.deleteBuffer(buffer);gl.deleteProgram(program);gl.deleteShader(vs);gl.deleteShader(fs);
      return { samples,opaque,maximumGreen,maximumBlue,noGlError,times };
    }, { vertex, fragment, width, height, basis, scale, solar, scenario });
    const mismatches = pixels.samples.filter((sample: { x:number; y:number; covered:boolean }) => {
      const ray=unprojectSkyPoint(sample.x,sample.y,basis,width,height,scenario.fov)!;
      return skyLandscapeOccludes(ray)!==sample.covered;
    });
    // Float shader arithmetic may put an edge on the other side of a pixel
    // center at extreme close-up. Keep such differences visible in the record
    // and allow them only when this one pixel's footprint actually straddles
    // the geometric edge. An opaque/open interior mismatch still fails.
    const boundaryDifferences = mismatches.filter((sample: {x:number;y:number;covered:boolean}) => {
      const corners=[[-.5,-.5],[.5,-.5],[-.5,.5],[.5,.5]].map(([dx,dy])=>
        skyLandscapeOccludes(unprojectSkyPoint(sample.x+dx!,sample.y+dy!,basis,width,height,scenario.fov)!));
      return corners.some(Boolean)&&corners.some(value=>!value);
    });
    const interiorMismatches=mismatches.filter(value=>!boundaryDifferences.includes(value));
    assert.equal(interiorMismatches.length,0,`${scenario.name} GPU/CPU interior coverage ${JSON.stringify(interiorMismatches.slice(0,6))}`);
    assert.ok(pixels.noGlError && pixels.opaque>0);
    if (scenario.red) assert.equal(pixels.maximumGreen+pixels.maximumBlue,0,"red scene contains no hidden blue or green");
    await page.locator("canvas").screenshot({ path:path.join(output,`${scenario.name}.png`) });
    results.push({ ...scenario, checkedRays:pixels.samples.length, mismatches:mismatches.length,
      boundaryCoverageDifferences:boundaryDifferences, interiorMismatches:interiorMismatches.length,
      opaquePixels:pixels.opaque, noGlError:pixels.noGlError,
      hostDrawMs:pixels.times, maximumGreen:pixels.maximumGreen, maximumBlue:pixels.maximumBlue });
  }
  const result = { scope:"Actual production WebGL1 shader in Chromium software rendering; not WEAPP/device/photometric acceptance",
    width,height,fragmentBytes:Buffer.byteLength(fragment),results };
  fs.writeFileSync(path.join(output,"result.json"),JSON.stringify(result,null,2)+"\n");
  console.log(JSON.stringify({ scope:result.scope, cases:results.length,
    checkedRays:results.reduce((sum,row)=>sum+row.checkedRays,0),
    boundaryDifferences:results.reduce((sum,row)=>sum+row.boundaryCoverageDifferences.length,0),
    interiorMismatches:0,fragmentBytes:result.fragmentBytes }));
} finally { await browser.close(); }
