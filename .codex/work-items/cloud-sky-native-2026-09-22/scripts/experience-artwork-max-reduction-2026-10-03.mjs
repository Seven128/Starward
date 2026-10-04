// Actual private reduction shaders exposed only in an executed task buffer.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../../../..");
const out=path.resolve(process.argv[2]);assert.equal(path.dirname(out),path.join(root,"output/playwright"));
assert(path.basename(out).startsWith("cloud-sky-artwork-max-reduction-"));await mkdir(out);
const sha=b=>createHash("sha256").update(b).digest("hex");
const bind=async p=>{const b=await readFile(p);return {path:path.relative(root,p).replaceAll("\\","/"),bytes:b.length,sha256:sha(b)};};
const save=(name,value)=>writeFile(path.join(out,name),JSON.stringify(value,null,2)+"\n",{flag:"wx"});
const require=createRequire(path.join(root,"apps/wechat-miniapp/package.json"));
const {chromium}=require("C:/Users/777/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const owner=path.join(root,"apps/wechat-miniapp/src/features/sky/sky-gpu-artwork-contributions.ts");
const protectedRows=JSON.parse(await readFile(path.join(root,".codex/work-items/cloud-sky-native-2026-09-22/tmp/resume-preserved-hashes-2026-10-01.json"),"utf8"));
const files=[fileURLToPath(import.meta.url),owner,process.execPath,chromium.executablePath(),...protectedRows.map(row=>path.join(root,row.path))];
const before=await Promise.all(files.map(bind));for(const row of protectedRows)assert.equal(before.find(x=>x.path===row.path).sha256,row.sha256);
await save("inputs-before.json",before);await writeFile(path.join(out,"executed-driver.mjs"),await readFile(fileURLToPath(import.meta.url)),{flag:"wx"});
const entry=`
import {taskMaxFragment,taskLocalMaxFragment,SKY_ARTWORK_MAX_REDUCTION_STRIDE as stride} from './apps/wechat-miniapp/src/features/sky/sky-gpu-artwork-contributions';
const vertex='attribute vec2 a_position;void main(){gl_Position=vec4(a_position,0.,1.);}';
const linearRay='vec3 skyRay(vec2 pixel){return vec3(pixel,1.0);}';
const local=taskLocalMaxFragment(linearRay);
const missed=taskMaxFragment.replace('value=max(value,sampleAt(p+vec2(3.,3.)));','');
if(missed===taskMaxFragment)throw Error('single-offset mutant did not change executed shader');
const averaged=taskMaxFragment.replaceAll('value=max(value,','value+=')
 .replaceAll(')));','));').replace('gl_FragColor=value;','gl_FragColor=value/16.0;');
function run(){
 const canvas=document.createElement('canvas'),gl=canvas.getContext('webgl');if(!gl)throw Error('WebGL unavailable');
 const resources={created:{texture:0,framebuffer:0,buffer:0,program:0,shader:0},deleted:{texture:0,framebuffer:0,buffer:0,program:0,shader:0}};
 const shaders=[];
 function program(fragment){const p=gl.createProgram();if(!p)throw Error('program unavailable');resources.created.program++;
  for(const [type,source] of [[gl.VERTEX_SHADER,vertex],[gl.FRAGMENT_SHADER,fragment]]){const s=gl.createShader(type);if(!s)throw Error('shader unavailable');resources.created.shader++;
   gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));gl.attachShader(p,s);shaders.push([p,s]);}
  gl.bindAttribLocation(p,0,'a_position');gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));return p;}
 const programs={global:program(taskMaxFragment),local:program(local),missed:program(missed),averaged:program(averaged)};
 const buffer=gl.createBuffer();resources.created.buffer++;gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
 gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
 gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);gl.disable(gl.BLEND);gl.disable(gl.DITHER);
 function texture(w,h,data){const x=gl.createTexture();resources.created.texture++;gl.bindTexture(gl.TEXTURE_2D,x);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,w,h,0,gl.RGBA,gl.UNSIGNED_BYTE,data);return x;}
 function reduce(w,h,data,kind='global',branch=1){let source=texture(w,h,data),original=[w,h],first=true;const allocated=[source],fb=[];
  while(w>1||h>1){const nextW=Math.ceil(w/stride),nextH=Math.ceil(h/stride),next=texture(nextW,nextH,null),f=gl.createFramebuffer();resources.created.framebuffer++;
   allocated.push(next);fb.push(f);gl.bindFramebuffer(gl.FRAMEBUFFER,f);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,next,0);
   if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)throw Error('incomplete FBO');
   const p=first?programs[kind]:programs.global;gl.useProgram(p);gl.viewport(0,0,nextW,nextH);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,source);
   gl.uniform1i(gl.getUniformLocation(p,'u_input'),0);gl.uniform2f(gl.getUniformLocation(p,'u_size'),w,h);
   if(first&&kind==='local'){
    gl.uniform2f(gl.getUniformLocation(p,'u_logicalSize'),...original);
    gl.uniform3f(gl.getUniformLocation(p,'u_regionRow0'),1/original[0],0,0);
    gl.uniform3f(gl.getUniformLocation(p,'u_regionRow1'),0,1/original[1],0);
    gl.uniform3f(gl.getUniformLocation(p,'u_regionRow2'),-1/original[0],-1/original[1],1);
    gl.uniform3f(gl.getUniformLocation(p,'u_regionAnchorU'),1,0,0);gl.uniform3f(gl.getUniformLocation(p,'u_regionAnchorV'),0,1,0);
    gl.uniform1f(gl.getUniformLocation(p,'u_regionDeterminant'),branch/(original[0]*original[1]));
   }
   gl.drawArrays(gl.TRIANGLES,0,6);source=next;w=nextW;h=nextH;first=false;
  }
  const pixel=new Uint8Array(4);gl.readPixels(0,0,1,1,gl.RGBA,gl.UNSIGNED_BYTE,pixel);
  fb.forEach(f=>{gl.deleteFramebuffer(f);resources.deleted.framebuffer++;});allocated.forEach(x=>{gl.deleteTexture(x);resources.deleted.texture++;});return Array.from(pixel);
 }
 const rows=[];
 for(let offset=0;offset<16;offset++){const bytes=new Uint8Array(4*4*4);bytes.set([255,254,129,1],offset*4);
  rows.push({kind:'one-hot-every-4x4-offset',offset,expected:[255,254,129,1],actual:reduce(4,4,bytes)});}
 for(const [w,h] of [[61,93],[1,17],[17,1]]){const bytes=new Uint8Array(w*h*4);bytes.set([255,254,253,1],(w*h-1)*4);
  rows.push({kind:'odd-edge-last-texel',size:[w,h],expected:[255,254,253,1],actual:reduce(w,h,bytes)});}
 const w=61,h=93,dense=new Uint8Array(w*h*4),expected=[0,0,0,0];let minimumBoundaryMargin=1;
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const radius=((2*x+1)/w-1)**2+((2*y+1)/h-1)**2,inside=radius<1;minimumBoundaryMargin=Math.min(minimumBoundaryMargin,Math.abs(radius-1));
  const color=inside?[127,93,41,1]:[255,254,253,252];dense.set(color,(y*w+x)*4);
  if(inside)for(let channel=0;channel<4;channel++)expected[channel]=Math.max(expected[channel],color[channel]);
 }
 rows.push({kind:'local-model-circle-excludes-bright-exterior',size:[w,h],minimumBoundaryMargin,expected,actual:reduce(w,h,dense,'local')});
 rows.push({kind:'local-model-negative-branch',expected:[0,0,0,0],actual:reduce(w,h,dense,'local',-1)});
 const hot=new Uint8Array(64);hot.set([255,254,129,1],60);
 const mutants={missedLastOffset:{expected:[255,254,129,1],actual:reduce(4,4,hot,'missed')},averaging:{expected:[255,254,129,1],actual:reduce(4,4,hot,'averaged')}};
 shaders.forEach(([p,s])=>{gl.detachShader(p,s);gl.deleteShader(s);resources.deleted.shader++;});Object.values(programs).forEach(p=>{gl.deleteProgram(p);resources.deleted.program++;});
 gl.deleteBuffer(buffer);resources.deleted.buffer++;const error=gl.getError();canvas.remove();
 return {stride,rows,mutants,resources,error,shaderSources:{global:taskMaxFragment,local,missed,averaged}};
}
globalThis.maxReductionProbe={run};`;
await writeFile(path.join(out,"executed-browser-entry.ts"),entry,{flag:"wx"});
const parsed=new Map();
const bundle=await build({stdin:{contents:entry,resolveDir:root,loader:"ts"},absWorkingDir:root,bundle:true,platform:"browser",format:"iife",target:"es2022",write:false,
 plugins:[{name:"read-private-shaders-only",setup(api){api.onLoad({filter:/\.(?:[cm]?js|tsx?|json)$/},async args=>{
  const original=await readFile(args.path),append=args.path===owner?'\nexport {reduceFragment as taskMaxFragment,localReduceFragment as taskLocalMaxFragment};\n':'',bytes=append?Buffer.concat([original,Buffer.from(append)]):original;
  parsed.set(args.path,{...await bind(args.path),executedBytes:bytes.length,executedSha256:sha(bytes)});
  if(append)await writeFile(path.join(out,"executed-task-owner.ts"),bytes,{flag:"wx"});
  const ext=path.extname(args.path).slice(1);return {contents:bytes.toString("utf8"),loader:ext==='json'?'json':ext==='tsx'?'tsx':ext==='ts'?'ts':'js',resolveDir:path.dirname(args.path)};
 });}}]});
const sourceBefore=[...parsed.values()];await save("parsed-inputs.json",sourceBefore);
await writeFile(path.join(out,"executed-browser-bundle.js"),bundle.outputFiles[0].contents,{flag:"wx"});
const launch={executablePath:chromium.executablePath(),headless:true,args:["--use-gl=angle","--use-angle=swiftshader"]};await save("launch-options.json",launch);
const browser=await chromium.launch(launch);let captured=null,failure=null;
try{const page=await browser.newPage();await page.setContent('<!doctype html><body></body>');await page.addScriptTag({content:bundle.outputFiles[0].text});
 captured=await page.evaluate(()=>globalThis.maxReductionProbe.run());await save("actual-controls.json",captured);
 for(const row of captured.rows)assert.deepEqual(row.actual,row.expected,row.kind);assert.equal(captured.error,0);
 for(const value of Object.values(captured.mutants))assert.notDeepEqual(value.actual,value.expected);
 assert.deepEqual(captured.resources.created,captured.resources.deleted);
}catch(error){failure=String(error);}finally{await browser.close();}
const after=await Promise.all(files.map(bind)),sourceAfter=[];
for(const p of parsed.keys()){const b=await readFile(p),append=p===owner?'\nexport {reduceFragment as taskMaxFragment,localReduceFragment as taskLocalMaxFragment};\n':'';
 sourceAfter.push({...await bind(p),executedBytes:b.length+Buffer.byteLength(append),executedSha256:sha(Buffer.concat([b,Buffer.from(append)]))});}
await save("inputs-after.json",after);await save("parsed-inputs-after.json",sourceAfter);
const exact=JSON.stringify(before)===JSON.stringify(after)&&JSON.stringify(sourceBefore)===JSON.stringify(sourceAfter);
const result={status:!failure&&exact?'PASSED_BOUND_ACTUAL_MAX_SHADER_CONTROLS':'FAILED',failure,beforeAfterExact:exact,hostInputs:before.length,actualParserInputs:sourceBefore.length,
 controls:captured?captured.rows.length:0,actual:captured?await bind(path.join(out,'actual-controls.json')):null,
 scope:'Current actual MAX/local shader strings; task-only accessor append, unchanged original prefix. Raw controlled RGBA8 shader primitives, all 16 offsets, odd last texels, declared stable linear camera circle/branch, two actual GPU mutants. Not original source/astronomical accuracy, ordinary/default/native support or performance/total memory/capacity acceptance. Normal Scene resource/pixel readback is separately bound.'};
await save('result.json',result);console.log(JSON.stringify({...result,result:await bind(path.join(out,'result.json'))}));process.exitCode=result.status==='FAILED'?1:0;
