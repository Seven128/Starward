// Actual source JPEGs, current GPU/mesh owners, independent CDS pixel packing.
// A bounded transposed-geometry control must fail the same rendered comparison.
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { build } from "esbuild";
import { observationHorizontalFrame } from "../../../../packages/astronomy-core/src/observation-frame.ts";
const root=process.cwd(),output=path.join(root,"output/playwright/cloud-sky-hips-axes-0929");
assert(!fs.existsSync(path.join(output,"result.json")),"preserve_previous_rendered_evidence");
fs.mkdirSync(output,{recursive:true});
const sourceRoot=path.join(root,"output/allwise-w3-hips-0929");
const direct=JSON.parse(fs.readFileSync(path.join(sourceRoot,"input-result.json"),"utf8"));
const wideRoot=path.join(root,"workers/miniapp-api/assets/deep-sky/wide-field-w3");
const wide=JSON.parse(fs.readFileSync(path.join(wideRoot,"manifest.json"),"utf8"));
const wideAsset=wide.tiles.find((t:any)=>t.pixel===5);
const sha=(b:Uint8Array)=>createHash("sha256").update(b).digest("hex");
const sources=[{kind:"same-source detailed HiPS development sample",order:8,pixel:343034,
  file:path.join(sourceRoot,"m42-tile.jpg"),hash:direct.files.find((f:any)=>f.file==="m42-tile.jpg").sha256},
 {kind:"actual adopted broad W3 face",order:0,pixel:5,file:path.join(wideRoot,wideAsset.file),hash:wideAsset.sha256}]
 .map(s=>{const raw=fs.readFileSync(s.file);assert.equal(sha(raw),s.hash);return {...s,image:raw.toString("base64")};});
const observer={latitude:22.6,longitude:114.5,elevationM:30},at="2026-09-29T20:00:00.000Z";
const frame=observationHorizontalFrame({at,...observer});
const built=await build({stdin:{resolveDir:root,contents:`
 import {prepareSkyHipsTile,projectSkyHipsTileMesh} from './apps/wechat-miniapp/src/features/sky/sky-hips-tile-mesh';
 import {createSkyGpuRenderer} from './apps/wechat-miniapp/src/features/sky/sky-gpu-renderer';
 import {createSkyViewBasis,unprojectSkyPoint} from './apps/wechat-miniapp/src/features/sky/sky-view-projection';
 import {pix2VecNest,vec2PixNest,bitDecombine} from 'healpix-ts';
 globalThis.hipsAxisCheck={prepareSkyHipsTile,projectSkyHipsTileMesh,createSkyGpuRenderer,createSkyViewBasis,unprojectSkyPoint,pix2VecNest,vec2PixNest,bitDecombine};
`},bundle:true,write:false,platform:"browser",format:"iife",target:"es2020",tsconfig:path.join(root,"apps/wechat-miniapp/tsconfig.json")});
const require=createRequire(import.meta.url);
const {chromium}=require("C:/Users/777/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const browser=await chromium.launch({headless:true,args:["--use-gl=angle","--use-angle=swiftshader"]});
const results=[];
try{
 const page=await browser.newPage({viewport:{width:390,height:844}});
 await page.setContent('<style>body{margin:0}</style><canvas width="390" height="844"></canvas>');
 await page.evaluate("globalThis.__name=t=>t");await page.addScriptTag({content:built.outputFiles[0]!.text});
 for(const source of sources)for(const roll of [0,57]){
  const fov=source.order===0?120:.75;
  const measured=await page.evaluate(async({source,frame,fov,roll}:any)=>{
   const api=(globalThis as any).hipsAxisCheck,width=390,height=844,canvas=document.querySelector("canvas")!;
   const gl=canvas.getContext("webgl",{preserveDrawingBuffer:true,antialias:false})!;
   const image=new Image();image.src="data:image/jpeg;base64,"+source.image;await image.decode();
   const original=document.createElement("canvas");original.width=original.height=512;
   const ctx=original.getContext("2d")!;ctx.drawImage(image,0,0);const jpeg=ctx.getImageData(0,0,512,512).data;
   const m=frame.equatorialToEnu;
   const multiply=(q:any)=>[0,1,2].map(i=>m[i*3]*q[0]+m[i*3+1]*q[1]+m[i*3+2]*q[2]);
   const center=multiply(api.pix2VecNest(2**source.order,source.pixel));
   const azi=(Math.atan2(center[0],center[1])*180/Math.PI+360)%360,alt=Math.asin(center[2])*180/Math.PI;
   if(alt<=20)throw Error("sample_tile_not_above_horizon");
   const base=api.createSkyViewBasis(azi,90+alt,0),angle=roll*Math.PI/180;
   const basis={forward:base.forward,right:base.right.map((v:number,i:number)=>Math.cos(angle)*v+Math.sin(angle)*base.up[i]),
     up:base.up.map((v:number,i:number)=>Math.cos(angle)*v-Math.sin(angle)*base.right[i])};
   const view={basis,verticalFovDeg:fov};
   const tile=api.prepareSkyHipsTile(source.order,source.pixel,16),side=17;
   const wrong={...tile,directions:tile.directions.map((_v:any,i:number)=>tile.directions[(i%side)*side+Math.floor(i/side)])};
   function paint(geometry:any){
    const renderer=api.createSkyGpuRenderer(gl,1);renderer.begin(width,height,"#000000");
    const triangles=api.projectSkyHipsTileMesh(geometry,m,view,width,height);
    if(!triangles?.length||!renderer.skyImageMesh(image,triangles,view,1))throw Error("real_source_mesh_not_drawn");
    renderer.finish();const pixels=new Uint8Array(width*height*4);gl.readPixels(0,0,width,height,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
    const noGlError=gl.getError()===gl.NO_ERROR;renderer.dispose();return {pixels,noGlError};
   }
   const previous=paint(wrong),current=paint(tile),correctErrors:number[]=[],wrongErrors:number[]=[],probes=[];
   for(let y=9;y<height-9;y+=9)for(let x=9;x<width-9;x+=9){
    const enu=api.unprojectSkyPoint(x+.5,y+.5,basis,width,height,fov);if(enu[2]<=0)continue;
    const q=[0,1,2].map(i=>m[i]*enu[0]+m[3+i]*enu[1]+m[6+i]*enu[2]);
    // More finely subdivided celestial cells provide an independent continuous
    // source coordinate oracle. JPEG column uses high interleaved bits, row low.
    const deep=api.vec2PixNest(2**(source.order+13),q),span=8192;
    if(Math.floor(deep/(span*span))!==source.pixel)continue;
    const {x:ne,y:nw}=api.bitDecombine(deep%(span*span));
    const u=(nw+.5)/span,v=(ne+.5)/span;
    if(u<.03||u>.97||v<.03||v>.97)continue;
    const sx=u*512-.5,sy=v*512-.5,x0=Math.floor(sx),y0=Math.floor(sy),tx=sx-x0,ty=sy-y0;
    const expected=[0,1,2].map(c=>[0,1].reduce((a,dx)=>a+[0,1].reduce((b,dy)=>b+
      jpeg[((y0+dy)*512+x0+dx)*4+c]*(dx?tx:1-tx)*(dy?ty:1-ty),0),0));
    const index=((height-1-y)*width+x)*4;
    const correct=Math.max(...expected.map((v:number,c:number)=>Math.abs(v-current.pixels[index+c])));
    const before=Math.max(...expected.map((v:number,c:number)=>Math.abs(v-previous.pixels[index+c])));
    correctErrors.push(correct);wrongErrors.push(before);
    if(probes.length<12&&before>30)probes.push({screen:[x,y],sourceUv:[u,v],expected,correctError:correct,transposedError:before});
   }
   const stats=(values:number[])=>{const s=[...values].sort((a,b)=>a-b);return {mean:s.reduce((a,b)=>a+b,0)/s.length,p95:s[Math.floor(s.length*.95)],maximum:s.at(-1)};};
   return {sourceAltitude:alt,samples:correctErrors.length,noGlError:current.noGlError&&previous.noGlError,current:stats(correctErrors),transposed:stats(wrongErrors),probes};
  },{source,frame,fov,roll});
  const filename=`order${source.order}-roll${roll}.png`;
  await page.locator("canvas").screenshot({path:path.join(output,filename)});
  results.push({kind:source.kind,order:source.order,pixel:source.pixel,sourceSha256:source.hash,fov,roll,filename,...measured});
 }
 const record={scope:"Production mesh/GPU, actual source JPEGs, exact observer frame and independent CDS source-packing oracle. Software WebGL development, not native/phone or complete scene acceptance",observer,at,results};
 fs.writeFileSync(path.join(output,"result.json"),JSON.stringify(record,null,2)+"\n");
 for(const r of results){
  assert(r.samples>=100&&r.noGlError,"actual source must reach output");
  assert(r.current.mean<3&&r.current.p95!<8,"correct source mapping must agree with actual GPU pixels");
  assert(r.transposed.mean>r.current.mean*4&&r.transposed.maximum!>30,"previous transposition must escape the same check");
 }
 console.log(JSON.stringify({scope:record.scope,results:results.map(({probes,...r})=>r)}));
}finally{await browser.close();}
