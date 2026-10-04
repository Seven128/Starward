// Render unchanged published W3 JPEGs through the actual scene/texture owners.
// The legacy composite is a bounded mutation control for the escaped grey box.
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {createRequire} from "node:module";
import {build} from "esbuild";
import {positionDeepSkyCatalog} from "../../../../packages/astronomy-core/src/deep-sky-catalog.ts";
const phase=process.argv[2];assert.ok(phase==="before"||phase==="after");
const root=path.resolve(import.meta.dirname,"../../../..");
const output=path.join(root,`output/playwright/cloud-sky-w3-background-0928-${phase}`);
assert.ok(!fs.existsSync(path.join(output,"result.json")),"preserve_historical_evidence");
fs.mkdirSync(output,{recursive:true});
const manifest=JSON.parse(fs.readFileSync(path.join(root,"workers/miniapp-api/assets/deep-sky/manifest.json"),"utf8"));
const sources=["M:31","M:101","M:42","M:51"].map(reference=>{
 const entry=manifest.entries.find((value:any)=>value.objectRef===reference),asset=entry.levels.MEDIUM;
 const bytes=fs.readFileSync(path.join(root,"workers/miniapp-api/assets/deep-sky",asset.file));
 assert.equal(createHash("sha256").update(bytes).digest("hex"),asset.sha256);
 return {reference,asset,image:bytes.toString("base64")};
});
const observer={latitude:22.6,longitude:114.5,elevationM:30},at="2026-09-28T16:00:00.000Z";
// Keep M31/M101's real registered frame; move only the controlled altitude of
// the other examples above the horizon to inspect their image presentation.
const positioned=positionDeepSkyCatalog({at:new Date(at),...observer});
const compiled=await build({stdin:{resolveDir:root,contents:`
 import {createSkyGpuRenderer} from './apps/wechat-miniapp/src/features/sky/sky-gpu-renderer';
 import {drawSkyScene} from './apps/wechat-miniapp/src/features/sky/sky-scene-render';
 import {createSkyViewBasis,unprojectSkyPoint} from './apps/wechat-miniapp/src/features/sky/sky-view-projection';
 import {registerSkySurvey} from './apps/wechat-miniapp/src/features/sky/sky-survey-registration';
 globalThis.skyImageCheck={createSkyGpuRenderer,drawSkyScene,createSkyViewBasis,unprojectSkyPoint,registerSkySurvey};
`},bundle:true,write:false,platform:"browser",format:"iife",target:"es2020",tsconfig:path.join(root,"apps/wechat-miniapp/tsconfig.json")});
const require=createRequire(import.meta.url);
const {chromium}=require("C:/Users/777/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const browser=await chromium.launch({headless:true,args:["--use-gl=angle","--use-angle=swiftshader"]});
const results=[];
try{
 const page=await browser.newPage({viewport:{width:390,height:844}});
 await page.setContent('<style>body{margin:0}</style><canvas width="390" height="844"></canvas>');
 await page.evaluate("globalThis.__name=target=>target");await page.addScriptTag({content:compiled.outputFiles[0]!.text});
 for(const source of sources){
  const row=positioned.find(value=>value.objectRef===source.reference)!;
  const actual=[0,row.azimuthDeg,row.altitudeDeg,row.northAzimuthDeg,row.northAltitudeDeg,row.eastAzimuthDeg,row.eastAltitudeDeg];
  const point=row.altitudeDeg>15?actual:[0,0,55,0,55.1,359.82565,54.99986];
  for(const magnification of [3.5,1.5,.5]){
   const fov=source.asset.fieldDegrees*magnification;
   const result=await page.evaluate(async({source,point,at,fov}:any)=>{
    const api=(globalThis as any).skyImageCheck,canvas=document.querySelector("canvas")!,width=390,height=844;
    const gl=canvas.getContext("webgl",{preserveDrawingBuffer:true,antialias:false})!;
    const image=new Image();image.src="data:image/jpeg;base64,"+source.image;await image.decode();
    const data={hourly:[{at}],skyScene:{state:"UNAVAILABLE",frames:[],deepSky:{state:"AVAILABLE",
      catalog:{imageRegistration:"ICRS_TAN_NORTH_0_1_V1",entries:[{objectRef:source.reference}]},
      frames:[{at,state:"AVAILABLE",points:[point]}]}},targetFrames:[]};
    const basis=api.createSkyViewBasis(point[1],90+point[2],0),registration=api.registerSkySurvey(point,source.asset.fieldDegrees,512,256);
    const dot=(a:number[],b:number[])=>a.reduce((sum,value,i)=>sum+value*b[i]!,0);
    function paint(legacy:boolean,enabled=true){
     const renderer=api.createSkyGpuRenderer(gl,1),args=Array(35).fill(undefined);let credit=false;
     const surface=legacy?{...renderer,artwork:(image:any,reg:any,view:any,opacity:number,tint:string)=>renderer.artwork(image,reg,view,opacity,tint,"additive")}:renderer;
     args.splice(0,7,surface,data,at,null,null,width,height);args[7]="NIGHT";args[8]=(_pick:any,sources:any)=>{credit=sources.deepSkyImage===image;};
     args[10]=fov;args[11]=enabled?{image,reference:source.reference,level:"MEDIUM",fieldDegrees:source.asset.fieldDegrees}:null;args[12]=basis;
     api.drawSkyScene(...args);const pixels=new Uint8Array(width*height*4);gl.readPixels(0,0,width,height,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
     const noGlError=gl.getError()===gl.NO_ERROR;renderer.dispose();return {pixels,credit,noGlError};
    }
    const base=paint(false,false),legacy=paint(true),current=paint(false);
    let borderLegacy=0,borderCurrent=0,borderPixels=0,brightPixels=0,brightRetained=0,coreLegacy=0,coreCurrent=0;
    let outsideChanged=0;const channels=(pixels:Uint8Array,index:number)=>Math.max(...[0,1,2].map(channel=>pixels[index+channel]!-base.pixels[index+channel]!));
    for(let y=0;y<height;y++)for(let x=0;x<width;x++){
     const ray=api.unprojectSkyPoint(x+.5,y+.5,basis,width,height,fov);
     const coefficients=registration.rows.map((row:number[])=>dot(row,ray)),sum=coefficients.reduce((a:number,b:number)=>a+b,0);
     const u=dot(coefficients,registration.anchorU)/sum,v=dot(coefficients,registration.anchorV)/sum,index=((height-1-y)*width+x)*4;
     const previous=channels(legacy.pixels,index),present=channels(current.pixels,index);
     if(u<0||v<0||u>1||v>1){if(present!==0)outsideChanged++;continue;}
     const edge=Math.min(u,v,1-u,1-v);
     if(edge<.008&&previous>=5){borderLegacy+=previous;borderCurrent+=present;borderPixels++;}
     if(u>.35&&u<.65&&v>.35&&v<.65){coreLegacy=Math.max(coreLegacy,previous);coreCurrent=Math.max(coreCurrent,present);
       if(previous>130){brightPixels++;if(present>=previous*.9)brightRetained++;}}
    }
    return {credit:current.credit,noGlError:current.noGlError&&legacy.noGlError,outsideChanged,
      borderPixels,borderLegacyMean:borderPixels?borderLegacy/borderPixels:null,borderCurrentMean:borderPixels?borderCurrent/borderPixels:null,
      coreLegacyMaximum:coreLegacy,coreCurrentMaximum:coreCurrent,brightPixels,brightRetained};
   },{source,point,at,fov});
   const filename=`${source.reference.replace(":","-")}-${magnification}field.png`;
   await page.locator("canvas").screenshot({path:path.join(output,filename)});
   results.push({reference:source.reference,level:"MEDIUM",sourceHash:source.asset.sha256,fieldDegrees:source.asset.fieldDegrees,fov,
    geometry:point===actual?"actual_observer_frame":"controlled_above_horizon",filename,...result});
  }
 }
 const record={phase,scope:"Unchanged original JPEGs, production scene/renderer, legacy additive mutation; software WebGL development, no phone or scientific validity-mask claim",observer,at,results};
 fs.writeFileSync(path.join(output,"result.json"),JSON.stringify(record,null,2)+"\n");
 for(const result of results){
  assert.ok(result.credit&&result.noGlError&&result.outsideChanged===0,`${result.reference}: scene integrity`);
  if(result.borderPixels>20)assert.ok(result.borderCurrentMean!<result.borderLegacyMean!*.2,`${result.reference}: grey rectangular edge remains`);
  if(result.brightPixels>0)assert.equal(result.brightRetained,result.brightPixels,`${result.reference}: bright central structure was lost`);
 }
 assert.ok(results.some(result=>result.borderPixels>20),"the check must actually expose a source boundary");
 console.log(JSON.stringify({scope:record.scope,phase,results}));
}finally{await browser.close();}
