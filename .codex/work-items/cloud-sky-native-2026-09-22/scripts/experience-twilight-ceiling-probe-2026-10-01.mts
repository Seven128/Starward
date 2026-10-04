// Actual current shader and saved public reference; no production mutation.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
import {projectAdoptedSkyCatalog} from '../../../../apps/wechat-miniapp/src/services/sky-report-catalog.ts';
import {presentSkyTime} from '../../../../apps/wechat-miniapp/src/features/sky/sky-time-presentation.ts';
import {skySolarLightAt} from '../../../../apps/wechat-miniapp/src/features/sky/sky-solar-light.ts';
import {createSkyViewBasis} from '../../../../apps/wechat-miniapp/src/features/sky/sky-view-projection.ts';

const task=path.resolve('.codex/work-items/cloud-sky-native-2026-09-22');
const output=path.resolve('output/playwright/cloud-sky-twilight-ceiling-1001-r2');
await assert.rejects(fs.access(output),{code:'ENOENT'});await fs.mkdir(output,{recursive:true});
const sha=(bytes:Uint8Array|string)=>createHash('sha256').update(bytes).digest('hex');
const conditions=JSON.parse(await fs.readFile(task+'/evidence/experience-twilight-reference-conditions-2026-09-30.json','utf8'));
const reportBytes=await fs.readFile(task+'/tmp/current-native-report-2026-10-01.json');
const raw=projectAdoptedSkyCatalog(JSON.parse(reportBytes.toString())).data;
assert.equal(raw.skyScene.observer.latitude,conditions.observerRequested.latitudeDeg);
assert.equal(raw.skyScene.observer.longitude,conditions.observerRequested.longitudeDeg);
const presentation=presentSkyTime(raw,conditions.utcAt);assert(presentation);
const sun=skySolarLightAt(presentation.report.hourly,conditions.utcAt);assert(sun);
const row=presentation.report.hourly.find(row=>row.at===conditions.utcAt);assert(row);
const basis=createSkyViewBasis(conditions.centerInferredFromArcturusUi.azimuthDeg,90+conditions.centerInferredFromArcturusUi.altitudeDeg,0)!;
const fov=720/Math.PI*Math.atan(Math.tan(conditions.shortSideFovDegRequested*Math.PI/720)*conditions.canvas.cssHeight/conditions.canvas.cssWidth);
const referenceBytes=await fs.readFile(task+'/evidence/'+conditions.image);
const rendererPath='apps/wechat-miniapp/src/features/sky/sky-gpu-renderer.ts';
const original=await fs.readFile(rendererPath);
await fs.writeFile(task+'/tmp/environment-transfer-before-renderer-2026-10-01.ts',original,{flag:'wx'});
const compiled=await build({stdin:{resolveDir:path.resolve('.'),contents:
  "export {createSkyGpuRenderer} from './apps/wechat-miniapp/src/features/sky/sky-gpu-renderer'; export {projectSkyDirection} from './apps/wechat-miniapp/src/features/sky/sky-view-projection';"},
  bundle:true,write:false,metafile:true,format:'iife',globalName:'skyCeilingProbe',platform:'browser',target:'es2022',tsconfig:path.resolve('apps/wechat-miniapp/tsconfig.json')});
const sources=await Promise.all(Object.keys(compiled.metafile!.inputs).filter(file=>file!=='<stdin>').map(async file=>({path:file,sha256:sha(await fs.readFile(file))})));
await fs.writeFile(output+'/current.js',compiled.outputFiles[0]!.text,{flag:'wx'});
const {chromium}=createRequire(import.meta.url)('C:/Users/777/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader']});
try{
  const page=await browser.newPage({viewport:{width:390,height:844}});const errors:string[]=[];
  page.on('pageerror',(error:any)=>errors.push(String(error)));
  await page.setContent('<style>body{margin:0}canvas{display:block}</style><canvas width="390" height="844"></canvas>');
  await page.evaluate('globalThis.__name=target=>target');await page.addScriptTag({content:compiled.outputFiles[0]!.text});
  const result=await page.evaluate(async(input:any)=>{
    const api=(globalThis as any).skyCeilingProbe,gl=document.querySelector('canvas')!.getContext('webgl',{preserveDrawingBuffer:true,antialias:false})!;
    assertGl:if(!gl)throw Error('no_webgl');
    const reference=new Image();reference.src=input.reference;await reference.decode();
    const referenceCanvas=document.createElement('canvas');referenceCanvas.width=reference.width;referenceCanvas.height=reference.height;
    const reference2d=referenceCanvas.getContext('2d')!;reference2d.drawImage(reference,0,0);
    const renderer=api.createSkyGpuRenderer(gl,1);renderer.begin(390,844,'#080D17');
    if(!renderer.solarLight({basis:input.basis,verticalFovDeg:input.fov},input.sun))throw Error('solar_draw_failed');
    renderer.finish();gl.finish();
    const median=(bytes:Uint8Array|Uint8ClampedArray,channel:number)=>{const values=[];for(let i=channel;i<bytes.length;i+=4)values.push(bytes[i]);values.sort((a,b)=>a-b);return values[Math.floor(values.length/2)];};
    const samples=[];
    for(const altitude of [10,20,30,40,50,60]){
      const point=api.projectSkyDirection(input.sunAzimuthDeg,altitude,input.basis,390,844,input.fov);
      if(!point||point.x<3||point.x>386||point.y<60||point.y>586){samples.push({altitudeDeg:altitude,outsideComparableSky:true});continue;}
      const x=Math.floor(point.x),y=Math.floor(point.y),current=new Uint8Array(5*5*4);
      gl.readPixels(x-2,843-y-2,5,5,gl.RGBA,gl.UNSIGNED_BYTE,current);
      // JPEG was 390x843; scale to corresponding CSS y instead of pretending
      // it is an identical 844-row framebuffer. UI/tree samples are excluded.
      const referenceY=Math.floor(y*reference.height/844);
      const pixels=reference2d.getImageData(x-2,referenceY-2,5,5).data;
      samples.push({azimuthDeg:input.sunAzimuthDeg,altitudeDeg:altitude,x,y,referenceY,
        currentRgb:[0,1,2].map(channel=>median(current,channel)),referenceRgb:[0,1,2].map(channel=>median(pixels,channel))});
    }
    const glError=gl.getError();renderer.dispose();return{samples,glError,referenceDimensions:{width:reference.width,height:reference.height}};
  },{basis,fov,sun,sunAzimuthDeg:row.sunAzimuthDeg,reference:'data:image/jpeg;base64,'+referenceBytes.toString('base64')});
  assert.equal(result.glError,0);assert.equal(errors.length,0);
  await page.locator('canvas').screenshot({path:output+'/current-solar.png'});
  await fs.writeFile(output+'/result.json',JSON.stringify({scope:'Current shader ceiling diagnosis; saved JPEG reference and software WebGL1, not native acceptance',
    sourceSha256:sha(original),sources,productionBundleSha256:sha(compiled.outputFiles[0]!.text),reportSha256:sha(reportBytes),referenceSha256:sha(referenceBytes),
    conditions:{at:conditions.utcAt,observer:raw.skyScene.observer,basis,fov,sun,viewport:{width:390,height:844}},...result,errors,
    limits:['Reference engine exposure/atmospheric parameters unobserved','JPEG quantization and <=1s reference timing uncertainty','Different legitimate landscapes; comparable unobstructed sky rays only']},null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify({output,sunAltitudeDeg:sun.altitudeDeg,samples:result.samples}));
}finally{await browser.close();}
