// Verify source-bound candidate alpha through the existing registered GPU owner.
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {createRequire} from "node:module";
import {build} from "esbuild";
import {positionDeepSkyCatalog} from "../../../../packages/astronomy-core/src/deep-sky-catalog.ts";
const root=process.cwd(),input=path.join(root,"output/allwise-w3-hips-0929/candidate-axes-corrected");
const output=path.join(root,"output/playwright/cloud-sky-w3-finite-0929");
assert(!fs.existsSync(path.join(output,"result.json")),"preserve_previous_rendered_evidence");fs.mkdirSync(output,{recursive:true});
const candidate=JSON.parse(fs.readFileSync(path.join(input,"candidate-result.json"),"utf8"));
const observer={latitude:22.6,longitude:114.5,elevationM:30},at="2026-09-29T20:00:00.000Z";
const row=positionDeepSkyCatalog({at:new Date(at),...observer}).find(r=>r.objectRef==="M:42")!;
assert(row.altitudeDeg>20);const point=[0,row.azimuthDeg,row.altitudeDeg,row.northAzimuthDeg,row.northAltitudeDeg,row.eastAzimuthDeg,row.eastAltitudeDeg];
const built=await build({stdin:{resolveDir:root,contents:`
 import {createSkyGpuRenderer} from './apps/wechat-miniapp/src/features/sky/sky-gpu-renderer';
 import {registerSkySurvey} from './apps/wechat-miniapp/src/features/sky/sky-survey-registration';
 import {createSkyViewBasis,unprojectSkyPoint} from './apps/wechat-miniapp/src/features/sky/sky-view-projection';
 import {skyArtworkUvAtDirection} from './apps/wechat-miniapp/src/features/sky/sky-artwork-registration';
 globalThis.finiteCheck={createSkyGpuRenderer,registerSkySurvey,createSkyViewBasis,unprojectSkyPoint,skyArtworkUvAtDirection};
`},bundle:true,write:false,format:"iife",platform:"browser",target:"es2020",tsconfig:path.join(root,"apps/wechat-miniapp/tsconfig.json")});
const require=createRequire(import.meta.url),{chromium}=require("C:/Users/777/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const browser=await chromium.launch({headless:true,args:["--use-gl=angle","--use-angle=swiftshader"]});
const results=[];
try{
 const page=await browser.newPage({viewport:{width:390,height:844}});
 await page.setContent('<style>body{margin:0}</style><canvas width="390" height="844"></canvas>');
 await page.evaluate("globalThis.__name=t=>t");await page.addScriptTag({content:built.outputFiles[0]!.text});
 for(const level of candidate.levels){
  const raw=fs.readFileSync(path.join(input,level.file));assert.equal(createHash("sha256").update(raw).digest("hex"),level.sha256);
  const measured=await page.evaluate(async({level,point,image}:any)=>{
   const api=(globalThis as any).finiteCheck,width=390,height=844,canvas=document.querySelector("canvas")!;
   const gl=canvas.getContext("webgl",{preserveDrawingBuffer:true,antialias:false})!;
   const source=new Image();source.src="data:image/png;base64,"+image;await source.decode();
   const sample=document.createElement("canvas");sample.width=sample.height=level.pixels;const ctx=sample.getContext("2d")!;
   ctx.drawImage(source,0,0);const original=ctx.getImageData(0,0,level.pixels,level.pixels),mutated=ctx.getImageData(0,0,level.pixels,level.pixels);
   for(let i=0;i<mutated.data.length;i+=4)if(mutated.data[i+3]===0)mutated.data.set([255,255,255,255],i);
   ctx.putImageData(mutated,0,0);
   const registration=api.registerSkySurvey(point,level.fieldDegrees,level.pixels,level.wcsHeader.CRPIX1);
   const basis=api.createSkyViewBasis(point[1],90+point[2],0),fov=level.fieldDegrees*.6,view={basis,verticalFovDeg:fov};
   function paint(input:object|null){
    const renderer=api.createSkyGpuRenderer(gl,1);renderer.begin(width,height,"#142238");
    if(input&&!renderer.artwork(input,registration,view,1,"#FFFFFF","infrared-cutout"))throw Error("candidate_not_drawn");
    renderer.finish();const pixels=new Uint8Array(width*height*4);gl.readPixels(0,0,width,height,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
    const noGlError=gl.getError()===gl.NO_ERROR;renderer.dispose();return {pixels,noGlError};
   }
   const baseline=paint(null),wrong=paint(sample),current=paint(source);let missing=0,maximumMissingChange=0,wrongMissingChange=0,bright=0,retained=0;
   for(let y=1;y<height-1;y+=2)for(let x=1;x<width-1;x+=2){
    const q=api.unprojectSkyPoint(x+.5,y+.5,basis,width,height,fov);const uv=api.skyArtworkUvAtDirection(registration,q);
    if(!uv||uv[0]<.02||uv[0]>.98||uv[1]<.02||uv[1]>.98)continue;
    const sx=Math.floor(uv[0]*level.pixels-.5),sy=Math.floor(uv[1]*level.pixels-.5);
    const neighbors=[0,1].flatMap(dx=>[0,1].map(dy=>((sy+dy)*level.pixels+sx+dx)*4));
    const p=((height-1-y)*width+x)*4;
    const delta=(v:Uint8Array)=>Math.max(...[0,1,2].map(c=>Math.abs(v[p+c]!-baseline.pixels[p+c]!)));
    if(neighbors.every(i=>original.data[i+3]===0)){
     missing++;maximumMissingChange=Math.max(maximumMissingChange,delta(current.pixels));wrongMissingChange=Math.max(wrongMissingChange,delta(wrong.pixels));
    }else if(neighbors.every(i=>original.data[i+3]===255&&original.data[i]>230)){
     bright++;if(delta(current.pixels)>180)retained++;
    }
   }
   return {noGlError:baseline.noGlError&&wrong.noGlError&&current.noGlError,missingInteriorSamples:missing,
     maximumMissingChange,filledWhiteMissingChange:wrongMissingChange,brightSamples:bright,brightRetained:retained};
  },{level,point,image:raw.toString("base64")});
  const filename=`m42-${level.level.toLowerCase()}-registered.png`;await page.locator("canvas").screenshot({path:path.join(output,filename)});
  results.push({level:level.level,sourceSha256:level.sha256,fieldDegrees:level.fieldDegrees,filename,...measured});
 }
 const result={scope:"Three local candidate PNGs through the existing registered infrared GPU owner, real M42 observer/time. Missing samples remain base sky and bright real measurements survive; no BFF/native/phone acceptance or finite detector-band repair",observer,at,results};
 fs.writeFileSync(path.join(output,"result.json"),JSON.stringify(result,null,2)+"\n");
 for(const r of results){assert(r.noGlError&&r.missingInteriorSamples>0&&r.maximumMissingChange===0);assert(r.filledWhiteMissingChange>180);assert(r.brightSamples>0&&r.brightRetained===r.brightSamples);}
 console.log(JSON.stringify(result));
}finally{await browser.close();}
