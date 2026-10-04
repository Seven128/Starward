// Actual current local sky frame and published constellation geometry. The SDK
// route identifiers remain in memory; this is CPU development evidence only.
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { build } from "esbuild";
import ts from "typescript";
import sdk from "miniprogram-automator";
import { boundedWechatConnect, boundWechatProtocol } from "../../../../tools/miniapp/wechat-protocol.mjs";
import { resolveConstellationFrame } from "../../../../apps/wechat-miniapp/src/features/sky/sky-constellation-scene.ts";
import { constellationLineSegments } from "../../../../apps/wechat-miniapp/src/features/sky/sky-constellation-render.ts";
import { skyArtworkViewParameters } from "../../../../apps/wechat-miniapp/src/features/sky/sky-artwork-registration.ts";
import { skyArtworkViewBounds } from "../../../../apps/wechat-miniapp/src/features/sky/sky-artwork-visibility.ts";
import { clipSkyLineToViewport } from "../../../../apps/wechat-miniapp/src/features/sky/sky-line-clip.ts";
import { createSkyViewBasis } from "../../../../apps/wechat-miniapp/src/features/sky/sky-view-projection.ts";

const phase = process.argv[2];
assert.ok(phase === "before" || phase === "after" || phase === "matrix");
const root = path.resolve(import.meta.dirname, "../../../..");
const evidence = path.join(root, ".codex/work-items/cloud-sky-native-2026-09-22/evidence");
const destination = path.join(evidence, `experience-constellation-hot-path-${phase}-2026-09-28.json`);
assert.ok(!fs.existsSync(destination), "preserve historical measurement");
const sourcePath = "apps/wechat-miniapp/src/features/sky/sky-constellation-render.ts";
const text = fs.readFileSync(path.join(root, sourcePath), "utf8");
const snapshot = path.join(evidence, "experience-constellation-render-before-2026-09-28.ts");
if (phase === "before") fs.writeFileSync(snapshot, text, { flag: "wx" });
function counted(body: string) {
  const source = ts.createSourceFile(sourcePath, body, ts.ScriptTarget.Latest, true);
  const selected = source.statements.filter(statement => {
    if (ts.isFunctionDeclaration(statement)) return ["hemisphere", "constellationLineSegments"].includes(statement.name?.text ?? "");
    return ts.isVariableStatement(statement) && statement.declarationList.declarations.some(declaration => ["dot", "normalized"].includes(declaration.name.getText(source)));
  }).map(statement => statement.getText(source).replace(/^export /, "")).join("\n");
  let attempts = 0;
  const context = vm.createContext({ skyArtworkViewParameters, skyArtworkViewBounds,
    clipSkyLineToViewport(...args: Parameters<typeof clipSkyLineToViewport>) { attempts++; return clipSkyLineToViewport(...args); } });
  vm.runInContext(ts.transpileModule(selected, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, context);
  return { run: context.constellationLineSegments as typeof constellationLineSegments,
    reset() { attempts = 0; }, count() { return attempts; } };
}
const measured = counted(text), legacy = counted(fs.readFileSync(snapshot, "utf8"));
const candidate = JSON.parse(fs.readFileSync(path.join(evidence, "experience-combined-clean-v4-candidate-2026-09-28.json"), "utf8"));
const program = await boundedWechatConnect(() => sdk.launcher.connectTool({ wsEndpoint: "ws://127.0.0.1:9437" }), 5000);
boundWechatProtocol(program, 5000);
async function json(relative: string): Promise<any> {
  const response = await fetch(candidate.apiOrigin + relative, { signal: AbortSignal.timeout(8000) });
  assert.ok(response.ok, `local service ${response.status}`); return response.json();
}
try {
  const page = await program.currentPage(); assert.equal(page?.path, "sky/detail/index");
  const description = await (await page.$(".sky-orientation-canvas"))!.attribute("aria-label");
  const at = description?.match(/场景时刻 ([0-9T:.Z-]+)/)?.[1]; assert.ok(at && description?.includes("已呈现"));
  const spotId = decodeURIComponent(String(page.query.spotId ?? page.query.spot_id ?? ""));
  const contextId = decodeURIComponent(String(page.query.contextId ?? page.query.context_id ?? ""));
  assert.ok(spotId.startsWith("spot:") && contextId);
  const raw = await json(`/v2/spots/${encodeURIComponent(spotId)}/sky?contextId=${encodeURIComponent(contextId)}&catalogVersion=bsc5p-bright-stars.v3`);
  const publication = await json("/v2/sky/constellations");
  const frame = resolveConstellationFrame(publication.data, raw.data.skyScene, at); assert.ok(frame, "actual geometry must resolve");
  const size = await (await page.$("#spot-night-sky-scene"))!.size();
  assert.ok(size.width > 0 && size.height > 0);
  const scenarios: Array<{name:string;heading:number;beta:number;fov:number;gamma?:number;center?:{x:number;y:number}}> = [
    { name: "north-25", heading: 0, beta: 120, fov: 25 },
    { name: "east-5", heading: 90, beta: 135, fov: 5 },
    { name: "north-min-zoom", heading: 0, beta: 120, fov: .05 },
    { name: "west-min-zoom", heading: 270, beta: 100, fov: .05 },
    { name: "offset-min-zoom", heading: 315, beta: 170, fov: .05, center: { x: size.width * .3, y: size.height * .42 } },
  ];
  if (phase === "matrix") {
    scenarios.length = 0;
    for (const heading of Array.from({length:12},(_,index)=>index*30))
      for (const beta of [90,110,150]) for (const fov of [.05,.5,5,25,39.9])
        scenarios.push({name:`arc-${heading}-${beta}-${fov}`,heading,beta,fov});
    for (const heading of [0,90,180,270]) scenarios.push({name:`rolled-offset-${heading}`,
      heading,beta:110,gamma:73,fov:25,center:{x:size.width*.12,y:size.height*.73}});
  }
  const results = [];
  const framebufferInputs = [];
  for (const scenario of scenarios) {
    const view = { basis: createSkyViewBasis(scenario.heading, scenario.beta, scenario.gamma??0)!, verticalFovDeg: scenario.fov,
      ...(scenario.center ? { center: scenario.center } : {}) };
    measured.reset(); const output = measured.run(frame.lines, view, size.width, size.height);
    const direct = constellationLineSegments(frame.lines, view, size.width, size.height);
    assert.equal(JSON.stringify(output), JSON.stringify(direct), "counter must execute actual owner semantics");
    const clipAttempts = measured.count();
    legacy.reset(); const previous = legacy.run(frame.lines, view, size.width, size.height);
    assert.equal(JSON.stringify(output), JSON.stringify(previous), "visible curved arcs cannot change during hot-path work");
    const previousAttempts = legacy.count(), samples = [];
    for (let index = 0; index < (phase === "matrix" ? 0 : 7); index++) {
      const start = performance.now(); constellationLineSegments(frame.lines, view, size.width, size.height); samples.push(performance.now() - start);
    }
    results.push({ scenario, visibleSegments: output.length, clipAttempts, previousAttempts,
      invisibleClipAttempts: clipAttempts - output.length, hostCpuMs: samples,
      medianHostCpuMs: [...samples].sort((a, b) => a - b)[3], visibleSegmentsUnchanged: true });
    if (phase === "matrix") framebufferInputs.push({name:scenario.name,previous,current:output});
  }
  let gpu: any = null;
  if (phase === "matrix") {
    const output = path.join(root,"output/playwright/cloud-sky-constellation-working-0928");
    assert.ok(!fs.existsSync(path.join(output,"result.json")),"preserve GPU evidence"); fs.mkdirSync(output,{recursive:true});
    const compiled = await build({stdin:{resolveDir:root,contents:
      "import {createSkyGpuRenderer} from './apps/wechat-miniapp/src/features/sky/sky-gpu-renderer';globalThis.skyWorking={createSkyGpuRenderer};"},
      bundle:true,write:false,platform:"browser",format:"iife",target:"es2020",tsconfig:path.join(root,"apps/wechat-miniapp/tsconfig.json")});
    const require = createRequire(import.meta.url);
    const {chromium} = require("C:/Users/777/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
    const browser = await chromium.launch({headless:true,args:["--use-gl=angle","--use-angle=swiftshader"]});
    try {
      const page = await browser.newPage({viewport:{width:390,height:844}});
      await page.setContent('<style>body{margin:0}</style><canvas width="390" height="844"></canvas>');
      await page.evaluate("globalThis.__name = target => target"); await page.addScriptTag({content:compiled.outputFiles[0]!.text});
      gpu = await page.evaluate(({inputs,size}:any)=>{
        const canvas=document.querySelector("canvas")!,gl=canvas.getContext("webgl",{preserveDrawingBuffer:true,antialias:false})!;
        if(!gl)throw Error("WebGL unavailable");
        const allocations:any={},live:any={};
        for(const [create,remove]of [["createBuffer","deleteBuffer"],["createProgram","deleteProgram"],["createShader","deleteShader"]]){
          const start=(gl as any)[create],end=(gl as any)[remove];allocations[create]=0;allocations[remove]=0;live[create]=new Set();
          (gl as any)[create]=function(...args:any[]){const value=start.apply(gl,args);if(value){allocations[create]++;live[create].add(value);}return value;};
          (gl as any)[remove]=function(value:any){if(live[create].delete(value))allocations[remove]++;return end.call(gl,value);};
        }
        const renderer=(globalThis as any).skyWorking.createSkyGpuRenderer(gl,1);
        const pixels=()=>{const bytes=new Uint8Array(390*844*4);gl.readPixels(0,0,390,844,gl.RGBA,gl.UNSIGNED_BYTE,bytes);return bytes;};
        const draw=(segments:any)=>{renderer.begin(size.width,size.height,"#080D17");renderer.segments(segments,"#9BADCA",.35);renderer.finish();return pixels();};
        const base=draw([]),rows=[];
        for(const input of inputs){const previous=draw(input.previous),current=draw(input.current);let differences=0,drawnPixels=0;
          for(let i=0;i<previous.length;i+=4){if([0,1,2,3].some(c=>previous[i+c]!==current[i+c]))differences++;
            if([0,1,2].some(c=>current[i+c]!==base[i+c]))drawnPixels++;}
          rows.push({name:input.name,changedPixels:differences,drawnPixels});
        }
        const visible=inputs.find((input:any)=>input.current.length>0);if(visible)draw(visible.current);
        const noGlError=gl.getError()===gl.NO_ERROR;renderer.dispose();
        return {scope:"Actual production TWGL line submission and framebuffer in software WebGL; no native/phone performance claim",rows,
          allocations,remaining:Object.fromEntries(Object.entries(live).map(([key,values]:any)=>[key,values.size])),noGlError};
      },{inputs:framebufferInputs,size});
      assert.ok(gpu.noGlError); assert.ok(gpu.rows.some((row:any)=>row.drawnPixels>0),"no-effect frames cannot certify line output");
      assert.ok(gpu.rows.every((row:any)=>row.changedPixels===0),"pixel difference after culling");
      assert.ok(Object.values(gpu.remaining).every(value=>value===0),"GPU owner resources retained after release");
      await page.locator("canvas").screenshot({path:path.join(output,"actual-lines.png")});
      fs.writeFileSync(path.join(output,"result.json"),JSON.stringify(gpu,null,2)+"\n",{flag:"wx"});
    } finally {await browser.close();}
  }
  const record = { scope: "Actual published current-frame constellation arcs through production CPU owner; counted leaf clipping and host timings, not GPU/WeChat/phone frame-time acceptance",
    phase, sourcePath, sourceSha256: createHash("sha256").update(text).digest("hex"), at,
    catalogVersion: publication.data.catalogVersion, catalogHash: publication.data.catalogHash,
    sourceArcs: frame.lines.length, canvasSize: size, results,gpu };
  fs.writeFileSync(destination, JSON.stringify(record, null, 2) + "\n", { flag: "wx" });
  console.log(JSON.stringify(phase === "matrix" ? {scope:record.scope,phase,sourceArcs:frame.lines.length,cases:results.length,
    visibleCases:results.filter(row=>row.visibleSegments>0).length,previousClipAttempts:results.reduce((sum,row)=>sum+row.previousAttempts,0),
    clipAttempts:results.reduce((sum,row)=>sum+row.clipAttempts,0),gpu:{noGlError:gpu.noGlError,changedPixels:gpu.rows.reduce((sum:any,row:any)=>sum+row.changedPixels,0),
      allocations:gpu.allocations,remaining:gpu.remaining}} : { scope: record.scope, phase, sourceArcs: frame.lines.length, results }));
} finally { await program.disconnect(); }
