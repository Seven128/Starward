import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import ts from "typescript";
import { createSkyViewBasis, skyProjectionScale, unprojectSkyPoint } from "../../../../apps/wechat-miniapp/src/features/sky/sky-view-projection.ts";

// A bounded data/format trial. No engine replacement, adopted UI, publication,
// changed native candidate, site registration or device acceptance is implied.
const require = createRequire(import.meta.url);
const { chromium } = require("C:/Users/777/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const root = path.resolve(import.meta.dirname, "../../../..");
const output = path.resolve(root, "output/playwright/cloud-sky-landscape-panorama-trial-0928");
assert.ok(!fs.existsSync(path.join(output, "result.json")), "retain previous trial evidence");
fs.mkdirSync(output, { recursive: true });
const original = path.join(root, ".codex/work-items/cloud-sky-native-2026-09-22/evidence/landscape-input-trial-2026-09-28/stara_lesna/slnew.png");
const originalBytes = fs.readFileSync(original);
const gpuPath = path.join(root, "apps/wechat-miniapp/src/features/sky/sky-gpu-renderer.ts");
const source = ts.createSourceFile("sky-gpu-renderer.ts", fs.readFileSync(gpuPath, "utf8"), ts.ScriptTarget.Latest, true);
function shader(name: string, parts: Record<string, unknown> = {}): string {
  const declaration = source.statements.flatMap(statement => ts.isVariableStatement(statement)
    ? [...statement.declarationList.declarations] : []).find(value => value.name.getText(source) === name);
  assert.ok(declaration?.initializer, name);
  return vm.runInNewContext(declaration.initializer.getText(source), parts);
}
const vertex = shader("artworkVertex", { position: shader("position") });
const ray = shader("skyRay");
const textureOwner = ts.transpile(fs.readFileSync(path.join(root,
  "apps/wechat-miniapp/src/features/sky/sky-gpu-textures.ts"), "utf8"),
  { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS });
const fragment = `
precision highp float;
varying vec2 v_pixel;
${ray}
uniform sampler2D u_image;
uniform float u_sunAltitude, u_red;
void main() {
  vec3 direction = normalize(skyRay(v_pixel));
  // This trial explicitly registers the raw image seam at simulated north.
  // It does not infer the photographer's true north or the selected spot.
  vec2 uv = vec2(fract(atan(direction.x,direction.y)/6.28318530718),
    0.5-asin(clamp(direction.z,-1.0,1.0))/3.14159265359);
  vec4 material = texture2D(u_image,uv);
  float daylight = smoothstep(-18.0,10.0,u_sunAltitude);
  // A chart exposure cue, not physically relit shadows or local photometry.
  vec3 color = material.rgb*mix(0.12,1.0,daylight);
  if(u_red>0.5) color=vec3(0.005+0.045*dot(material.rgb,vec3(0.2126,0.7152,0.0722)),0.0,0.0);
  gl_FragColor=vec4(color,material.a);
}`;
const width = 390, height = 844;
const cases = [
  ...[0,90,180,270].flatMap(heading => [45,85].map(fov =>
    ({ name:`night-${heading}-${fov}`,heading,beta:100,gamma:0,fov,solar:-24,red:false }))),
  { name:"day-north-85",heading:0,beta:100,gamma:0,fov:85,solar:45,red:false },
  { name:"twilight-north-85",heading:0,beta:100,gamma:0,fov:85,solar:-6,red:false },
  { name:"red-north-85",heading:0,beta:100,gamma:0,fov:85,solar:-24,red:true },
  { name:"night-all-sky",heading:0,beta:180,gamma:0,fov:267.8,solar:-24,red:false },
  { name:"north-seam-close",heading:0,beta:90,gamma:0,fov:5,solar:-24,red:false },
  { name:"rotated-north-85",heading:0,beta:100,gamma:25,fov:85,solar:-24,red:false },
];
const browser = await chromium.launch({ headless:true, args:["--use-gl=angle","--use-angle=swiftshader"] });
try {
  const page = await browser.newPage({ viewport:{width,height} });
  await page.setContent(`<style>body{margin:0;background:#141a2f}</style><canvas id="view" width="${width}" height="${height}"></canvas>`);
  await page.evaluate("globalThis.__name = target => target");
  await page.evaluate(`(function(exports){${textureOwner}\nglobalThis.createSkyGpuTextures=exports.createSkyGpuTextures;})({})`);
  const input = await page.evaluate(async ({ data }) => {
    const image = new Image(); image.src=data; await image.decode();
    const original = document.createElement("canvas"); original.width=image.width; original.height=image.height;
    original.getContext("2d")!.drawImage(image,0,0);
    const variants = new Map<number,HTMLCanvasElement>();
    for(const side of [512,1024,2048,4096]) {
      const canvas=document.createElement("canvas");canvas.width=side;canvas.height=side/2;
      canvas.getContext("2d")!.drawImage(original,0,0,side,side/2);variants.set(side,canvas);
    }
    const rows=[...variants].map(([side,canvas])=>{
      const rgba=canvas.getContext("2d")!.getImageData(0,0,side,side/2).data;
      let transparent=0,opaque=0,partial=0,skyOpaque=0,groundTransparent=0,seamAlphaMax=0;
      for(let y=0;y<side/2;y++) {
        seamAlphaMax=Math.max(seamAlphaMax,Math.abs(rgba[(y*side)*4+3]!-rgba[(y*side+side-1)*4+3]!));
        for(let x=0;x<side;x++) {
          const alpha=rgba[(y*side+x)*4+3]!;
          if(alpha===0) transparent++; else if(alpha===255) opaque++; else partial++;
          if(y<side/8 && alpha>0) skyOpaque++;
          if(y>side*3/8 && alpha===0) groundTransparent++;
        }
      }
      return {side,height:side/2,rgbaBytes:side*side*2,transparent,opaque,partial,skyOpaque,groundTransparent,seamAlphaMax};
    });
    (globalThis as any).panoramaTrial={variants};
    return rows;
  },{data:`data:image/png;base64,${originalBytes.toString("base64")}`});
  assert.ok(input.every(row=>row.skyOpaque===0 && row.groundTransparent===0),"actual input has open high sky and solid low ground");
  const cache = await page.evaluate(() => {
    const gl=(document.querySelector("#view") as HTMLCanvasElement).getContext("webgl",{preserveDrawingBuffer:true,antialias:false})!;
    if(!gl) throw Error("webgl_unavailable");
    const create=gl.createTexture.bind(gl),remove=gl.deleteTexture.bind(gl);let created=0,deleted=0;
    gl.createTexture=()=>{created++;return create()};gl.deleteTexture=value=>{deleted++;remove(value)};
    const rows=[];
    for(const side of [4096,2048,1024,512]) {
      const owner=(globalThis as any).createSkyGpuTextures(gl);
      const image=(globalThis as any).panoramaTrial.variants.get(side);
      const beforeCreated=created,beforeDeleted=deleted;const identities=[];
      for(let frame=0;frame<3;frame++){owner.begin();const texture=owner.get(image);if(!texture)throw Error("trial_texture_failed");identities.push(texture);owner.finish()}
      const cacheStable=identities.every(texture=>texture===identities[0]);
      const deletedBeforeDispose=deleted-beforeDeleted;owner.dispose();
      rows.push({side,rgbaBytes:side*side*2,created:created-beforeCreated,deleted:deleted-beforeDeleted,deletedBeforeDispose,cacheStable,noGlError:gl.getError()===gl.NO_ERROR});
    }
    gl.createTexture=create;gl.deleteTexture=remove;
    return rows;
  });
  assert.equal(cache[0]!.cacheStable,false,"32 MiB input is correctly evicted by current 16 MiB cache");
  assert.equal(cache[0]!.created,3,"original would upload again each frame");
  assert.ok(cache.slice(1).every(row=>row.cacheStable&&row.created===1&&row.deleted===1&&row.noGlError));
  const results=[];
  for(const side of [1024,2048]) for(const scenario of cases) {
    const basis=createSkyViewBasis(scenario.heading,scenario.beta,scenario.gamma)!;
    const scale=skyProjectionScale(height,scenario.fov)!;
    const actual=await page.evaluate(({vertex,fragment,width,height,basis,scale,side,scenario}:any)=>{
      const canvas=document.querySelector("#view") as HTMLCanvasElement;
      const gl=canvas.getContext("webgl",{preserveDrawingBuffer:true,antialias:false})!;
      const source=(globalThis as any).panoramaTrial.variants.get(side) as HTMLCanvasElement;
      const rgba=source.getContext("2d")!.getImageData(0,0,side,side/2).data;
      function compile(type:number,code:string){const shader=gl.createShader(type)!;gl.shaderSource(shader,code);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(shader)!);return shader}
      const program=gl.createProgram()!,vs=compile(gl.VERTEX_SHADER,vertex),fs=compile(gl.FRAGMENT_SHADER,fragment);
      gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);
      if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program)!);gl.useProgram(program);
      const buffer=gl.createBuffer()!;gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
      gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([0,0,width,0,0,height,0,height,width,0,width,height]),gl.STATIC_DRAW);
      const attribute=gl.getAttribLocation(program,"a_position");gl.enableVertexAttribArray(attribute);gl.vertexAttribPointer(attribute,2,gl.FLOAT,false,8,0);
      function uniform(name:string,values:readonly number[]){const location=gl.getUniformLocation(program,name);if(values.length===1)gl.uniform1f(location,values[0]!);if(values.length===2)gl.uniform2fv(location,values);if(values.length===3)gl.uniform3fv(location,values)}
      uniform("u_resolution",[width,height]);uniform("u_center",[width/2,height/2]);uniform("u_scale",[scale]);uniform("u_right",basis.right);uniform("u_up",basis.up);uniform("u_forward",basis.forward);uniform("u_sunAltitude",[scenario.solar]);uniform("u_red",[scenario.red?1:0]);
      const owner=(globalThis as any).createSkyGpuTextures(gl);owner.begin();const texture=owner.get(source);if(!texture)throw Error("upload_failed");
      gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);
      // Candidate-only sampler variant. Production would need a known, owned
      // repeat-s policy for this POT panorama, leaving other consumers clamped.
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);gl.uniform1i(gl.getUniformLocation(program,"u_image"),0);
      gl.disable(gl.BLEND);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.viewport(0,0,width,height);gl.drawArrays(gl.TRIANGLES,0,6);
      const pixels=new Uint8Array(width*height*4);gl.readPixels(0,0,width,height,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
      const samples=[];let rendered=0,maxGreen=0,maxBlue=0;
      for(let y=0;y<height;y++)for(let x=0;x<width;x++){
        const index=((height-1-y)*width+x)*4;if(pixels[index+3]!>0){rendered++;maxGreen=Math.max(maxGreen,pixels[index+1]!);maxBlue=Math.max(maxBlue,pixels[index+2]!)}
        if(x%11===5&&y%11===5)samples.push({x:x+.5,y:y+.5,alpha:pixels[index+3]!});
      }
      owner.finish();owner.dispose();gl.deleteBuffer(buffer);gl.deleteProgram(program);gl.deleteShader(vs);gl.deleteShader(fs);
      return {samples,rendered,maxGreen,maxBlue,noGlError:gl.getError()===gl.NO_ERROR,alpha:Array.from({length:side*side/2},(_,i)=>rgba[i*4+3])};
    },{vertex,fragment,width,height,basis,scale,side,scenario});
    const differences=actual.samples.map((sample:{x:number;y:number;alpha:number})=>{
      const direction=unprojectSkyPoint(sample.x,sample.y,basis,width,height,scenario.fov)!;
      const u=((Math.atan2(direction[0],direction[1])/(2*Math.PI))%1+1)%1;
      const v=.5-Math.asin(Math.max(-1,Math.min(1,direction[2])))/Math.PI;
      const tx=u*side-.5,ty=v*(side/2)-.5,x0=Math.floor(tx),y0=Math.floor(ty),fx=tx-x0,fy=ty-y0;
      const at=(x:number,y:number)=>actual.alpha[Math.max(0,Math.min(side/2-1,y))*side+((x%side+side)%side)]!;
      const expected=(at(x0,y0)*(1-fx)+at(x0+1,y0)*fx)*(1-fy)+(at(x0,y0+1)*(1-fx)+at(x0+1,y0+1)*fx)*fy;
      return {x:sample.x,y:sample.y,gpu:sample.alpha,cpu:expected,difference:Math.abs(expected-sample.alpha)};
    });
    const maximumAlphaDifference=Math.max(...differences.map(row=>row.difference));
    const opaqueInteriorErrors=differences.filter(row=>(row.cpu===0&&row.gpu>1)||(row.cpu===255&&row.gpu<254));
    assert.equal(opaqueInteriorErrors.length,0,`${scenario.name} actual alpha interior`);
    assert.ok(actual.rendered>0&&actual.noGlError);
    if(scenario.red)assert.equal(actual.maxGreen+actual.maxBlue,0,"no hidden green/blue in red trial");
    await page.locator("#view").screenshot({path:path.join(output,`${side}-${scenario.name}.png`)});
    results.push({side,...scenario,samples:differences.length,rendered:actual.rendered,maximumAlphaDifference,opaqueInteriorErrors:opaqueInteriorErrors.length,noGlError:actual.noGlError});
  }
  const result={scope:"Candidate data and native-owner shader/cache feasibility in Chromium software WebGL; no native/phone, site, visual adoption or publication acceptance",originalBytes:originalBytes.length,sourceHash:"6591d5da60b77df296b06de930edf3c598868006cca476ff6a122617f0118226",declaredMapping:"Raw seam = simulated ENU north; top zenith; bottom nadir; no author/site true-north inference",sourceRights:"Package readme/info CC BY 4.0; registry/icon BY-SA indication retained as a more restrictive unresolved metadata difference",input,cache,results};
  fs.writeFileSync(path.join(output,"result.json"),JSON.stringify(result,null,2)+"\n");
  console.log(JSON.stringify({scope:result.scope,originalBytes:originalBytes.length,input,cache,frames:results.length,opaqueInteriorErrors:results.reduce((sum,row)=>sum+row.opaqueInteriorErrors,0),maxAlphaDifference:Math.max(...results.map(row=>row.maximumAlphaDifference))}));
}finally{await browser.close()}
