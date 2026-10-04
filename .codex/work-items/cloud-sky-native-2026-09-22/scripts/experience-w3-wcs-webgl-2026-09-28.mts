// Independent FITS-WCS sampling versus the actual shared registration/GPU path.
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import {createRequire} from "node:module";
import {build} from "esbuild";
import {positionDeepSkyCatalog} from "../../../../packages/astronomy-core/src/deep-sky-catalog.ts";
import {EquatorFromVector,Horizon,Observer,RotateVector,Rotation_EQJ_EQD,Spherical,VectorFromSphere}
  from "../../../../packages/astronomy-core/src/astronomy-engine-runtime.ts";
const require=createRequire(import.meta.url);
const {chromium}=require("C:/Users/777/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const root=path.resolve(import.meta.dirname,"../../../.."),output=path.join(root,"output/playwright/cloud-sky-w3-wcs-0928");
fs.mkdirSync(output,{recursive:true});
const fixture=JSON.parse(fs.readFileSync(path.join(root,"apps/wechat-miniapp/src/features/sky/sky-survey-wcs.fixture.json"),"utf8"));
const manifest=JSON.parse(fs.readFileSync(path.join(root,"workers/miniapp-api/assets/deep-sky/manifest.json"),"utf8"));
const source=manifest.entries.find((entry:any)=>entry.objectRef==="M:31"),asset=source.levels.OVERVIEW;
const image=fs.readFileSync(path.join(root,"workers/miniapp-api/assets/deep-sky",asset.file)).toString("base64");
const observer={latitude:22.6,longitude:114.5,elevationM:30},at=new Date("2026-09-28T16:00:00.000Z");
const astronomyObserver=new Observer(observer.latitude,observer.longitude,observer.elevationM),rotation=Rotation_EQJ_EQD(at),rad=Math.PI/180;
const toHorizontal=(ra:number,dec:number)=>{
  const equator=EquatorFromVector(RotateVector(rotation,VectorFromSphere(new Spherical(dec,ra,1),at)));
  const horizon=Horizon(at,astronomyObserver,equator.ra,equator.dec,"");
  return [Math.sin(horizon.azimuth*rad)*Math.cos(horizon.altitude*rad),Math.cos(horizon.azimuth*rad)*Math.cos(horizon.altitude*rad),Math.sin(horizon.altitude*rad)];};
const row=positionDeepSkyCatalog({at,...observer}).find(value=>value.objectRef==="M:31")!;assert.ok(row.altitudeDeg>5);
const point=[0,row.azimuthDeg,row.altitudeDeg,row.northAzimuthDeg,row.northAltitudeDeg,row.eastAzimuthDeg,row.eastAltitudeDeg];
// Actual FITS CDELT and CRPIX plus ICRS axes define the expectation, independently
// of the three-anchor registration and the fragment shader's inverse plane.
const c=toHorizontal(source.center.raDeg,source.center.decDeg),north=toHorizontal(0,90);
const ra=source.center.raDeg*rad,dec=source.center.decDeg*rad;
const equatorialX=toHorizontal(0,0),equatorialY=toHorizontal(90,0);
const e=equatorialX.map((v:number,i:number)=>-Math.sin(ra)*v+Math.cos(ra)*equatorialY[i]!);
const n=equatorialX.map((v:number,i:number)=>-Math.sin(dec)*Math.cos(ra)*v-Math.sin(dec)*Math.sin(ra)*equatorialY[i]!+Math.cos(dec)*north[i]!);
const compiled=await build({stdin:{resolveDir:root,contents:`
 import {createSkyGpuRenderer} from './apps/wechat-miniapp/src/features/sky/sky-gpu-renderer';
 import {registerSkySurvey} from './apps/wechat-miniapp/src/features/sky/sky-survey-registration';
 import {createSkyViewBasis,unprojectSkyPoint} from './apps/wechat-miniapp/src/features/sky/sky-view-projection';
 globalThis.skyWcs={createSkyGpuRenderer,registerSkySurvey,createSkyViewBasis,unprojectSkyPoint};
`},bundle:true,write:false,platform:"browser",format:"iife",target:"es2020",tsconfig:path.join(root,"apps/wechat-miniapp/tsconfig.json")});
const browser=await chromium.launch({headless:true,args:["--use-gl=angle","--use-angle=swiftshader"]});
try{
 const page=await browser.newPage({viewport:{width:390,height:844}});
 await page.setContent('<style>body{margin:0}</style><canvas width="390" height="844"></canvas>');
 await page.evaluate("globalThis.__name = target => target");await page.addScriptTag({content:compiled.outputFiles[0]!.text});
 const results=[];
 for(const [fov,roll] of [[5,0],[2,45],[1,-60]]){
  const scenario={fov,roll};
  const result=await page.evaluate(async ({scenario,point,image,fixture,c,e,n}:any)=>{
   const api=(globalThis as any).skyWcs,canvas=document.querySelector("canvas")!;
   const gl=canvas.getContext("webgl",{preserveDrawingBuffer:true,antialias:false})!;
   const source=new Image();source.src="data:image/jpeg;base64,"+image;await source.decode();
   const sourceCanvas=document.createElement("canvas");sourceCanvas.width=sourceCanvas.height=256;
   const context=sourceCanvas.getContext("2d")!;context.drawImage(source,0,0);const decoded=context.getImageData(0,0,256,256).data;
   const unrolled=api.createSkyViewBasis(point[1],90+point[2],0),angle=scenario.roll*Math.PI/180;
   // Rotate the image-plane axes about the unchanged target direction. Device
   // gamma is a different Euler angle and would move this narrow view off target.
   const basis={forward:unrolled.forward,
    right:unrolled.right.map((value:number,i:number)=>Math.cos(angle)*value+Math.sin(angle)*unrolled.up[i]),
    up:unrolled.up.map((value:number,i:number)=>Math.cos(angle)*value-Math.sin(angle)*unrolled.right[i])};
   const center={x:163.8,y:481.08};
   const view={basis,verticalFovDeg:scenario.fov,center};
   const dot=(a:any,b:any)=>a.reduce((sum:number,value:number,i:number)=>sum+value*b[i],0);
   function measure(crpix:number){
    const renderer=api.createSkyGpuRenderer(gl,1);renderer.begin(390,844,"#000000");
    const registration=api.registerSkySurvey(point,4,256,crpix);
    if(!registration||!renderer.artwork(source,registration,view,1,"#FFFFFF","source-over"))throw Error("artwork_failed");
    renderer.finish();
    const pixels=new Uint8Array(390*844*4);gl.readPixels(0,0,390,844,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
    const samples=[];
    for(const y of [101,202,337,422,506,641,742])for(const x of [39,97,164,253,351]){
     const ray=api.unprojectSkyPoint(x+.5,y+.5,basis,390,844,scenario.fov,center),normal=dot(ray,c);
     const u=(fixture.crpix[0]-.5+dot(ray,e)/normal/(fixture.cdelt[0]*Math.PI/180))/256;
     const v=1-(fixture.crpix[1]-.5+dot(ray,n)/normal/(fixture.cdelt[1]*Math.PI/180))/256;
     if(u<.01||v<.01||u>.99||v>.99||ray[2]<0)continue;
     const sx=u*256-.5,sy=v*256-.5,x0=Math.floor(sx),y0=Math.floor(sy),tx=sx-x0,ty=sy-y0;
     const expected=[0,1,2].map(channel=>[0,1].reduce((sum,dx)=>sum+[0,1].reduce((sumY,dy)=>
      sumY+decoded[((y0+dy)*256+x0+dx)*4+channel]*(dx?tx:1-tx)*(dy?ty:1-ty),0),0));
     const actual=[0,1,2].map(channel=>pixels[((843-y)*390+x)*4+channel]);
     const delta=Math.max(...actual.map((value:number,i:number)=>Math.abs(value-expected[i]!)));
     samples.push({screen:[x,y],sourceUv:[u,v],expected,actual,maximumChannelDelta:delta});
    }
    const noGlError=gl.getError()===gl.NO_ERROR;renderer.dispose();
    return {samples,noGlError,maximumChannelDelta:Math.max(...samples.map(value=>value.maximumChannelDelta))};
   }
   const correct=measure(128),wrongOrigin=measure(129);measure(128);
   return {correct,wrongOrigin};
  },{scenario,point,image,fixture,c,e,n});
  console.log(JSON.stringify({scenario,samples:result.correct.samples.length,noGlError:result.correct.noGlError,
   maximumChannelDelta:result.correct.maximumChannelDelta,wrongOriginMaximumChannelDelta:result.wrongOrigin.maximumChannelDelta}));
  assert.ok(result.correct.noGlError&&result.correct.samples.length>=12);
  assert.ok(result.correct.maximumChannelDelta<2,`FITS-WCS sample differs: ${result.correct.maximumChannelDelta}`);
  assert.ok(result.wrongOrigin.maximumChannelDelta>5,"wrong pixel origin must fail the independent rendered comparison");
  await page.locator("canvas").screenshot({path:path.join(output,`m31-${fov}deg-roll${roll}.png`)});
  results.push({scenario,...result});
 }
 const record={scope:"Actual production renderer, unchanged M31 JPEG, independent actual FITS header and ICRS observer axes; development WebGL, not phone astrometry",
  observer,at:at.toISOString(),reference:"M:31",sourceWcsFitsSha256:fixture.fitsSha256,jpegSha256:asset.sha256,results};
 fs.writeFileSync(path.join(output,"result.json"),JSON.stringify(record,null,2)+"\n");
 console.log(JSON.stringify({scope:record.scope,cases:results.map(value=>({scenario:value.scenario,samples:value.correct.samples.length,
  maximumChannelDelta:value.correct.maximumChannelDelta,wrongOriginMaximumChannelDelta:value.wrongOrigin.maximumChannelDelta}))}));
}finally{await browser.close();}
