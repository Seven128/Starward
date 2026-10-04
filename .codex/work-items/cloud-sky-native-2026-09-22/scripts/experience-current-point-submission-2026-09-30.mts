// Measure existing shared point submission before proposing an optimization.
// BSC/current ephemerides and production GPU; no images, SAO, WXML or target FPS claim.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {projectAdoptedSkyCatalog} from '../../../../apps/wechat-miniapp/src/services/sky-report-catalog.ts';
import {attachSkyCatalog,resolveSkySceneFrame} from '../../../../apps/wechat-miniapp/src/features/sky/sky-stellar-scene.ts';
import {presentSkyTime} from '../../../../apps/wechat-miniapp/src/features/sky/sky-time-presentation.ts';
import {createSkyViewBasis} from '../../../../apps/wechat-miniapp/src/features/sky/sky-view-projection.ts';
const task=path.resolve('.codex/work-items/cloud-sky-native-2026-09-22');
const output=path.resolve('output/playwright/cloud-sky-current-point-submission-0930');
await assert.rejects(fs.access(output),{code:'ENOENT'});await fs.mkdir(output,{recursive:true});
const sha=(bytes:Uint8Array|string)=>createHash('sha256').update(bytes).digest('hex');
const prior=JSON.parse(await fs.readFile('output/playwright/cloud-sky-current-composition-0930/result.json','utf8'));
for(const owner of prior.sourceHashes)assert.equal(sha(await fs.readFile(owner.path)),owner.sha256);
const production=await fs.readFile('output/playwright/cloud-sky-current-composition-0930/production.js');
assert.equal(sha(production),prior.productionBundleSha256);
const bytes=await fs.readFile(path.join(task,'tmp/v49-current-public-report.json'));
assert.equal(sha(bytes),prior.reportSha256);
const raw=projectAdoptedSkyCatalog(JSON.parse(bytes.toString())).data;
const ref=raw.skyScene.catalog!;
const response=await fetch(`http://127.0.0.1:60065/v2/sky/catalogs/${ref.catalogVersion}/${ref.catalogHash}`,{signal:AbortSignal.timeout(15000)});
assert.equal(response.status,200);const catalogBytes=Buffer.from(await response.arrayBuffer());
const report=attachSkyCatalog(presentSkyTime(raw,raw.context.at)!.report,JSON.parse(catalogBytes.toString()).data);
const frame=resolveSkySceneFrame(report.skyScene,raw.context.at)!;
const index=report.skyScene.catalog!.entries.findIndex(entry=>entry.objectRef==='HR:7557');
const altair=frame.points.find(point=>point[0]===index)!;
const basis=createSkyViewBasis(altair[1],90+altair[2],0)!;
const cases=[{name:'local',fov:8.86,basis},{name:'common',fov:84.63316191100171,basis},
  {name:'wide',fov:139,basis},{name:'dome',fov:274.9,basis:createSkyViewBasis(0,180,0)!}];
const {chromium}=createRequire(import.meta.url)('C:/Users/777/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader']});
try{
  const page=await browser.newPage({viewport:{width:390,height:844}});const errors:string[]=[];
  page.on('pageerror',(error:any)=>errors.push(String(error)));
  await page.setContent('<style>body{margin:0}</style><canvas width="390" height="844"></canvas>');
  await page.evaluate('globalThis.__name=target=>target');await page.addScriptTag({content:production.toString()});
  await page.evaluate(()=>{
    const gl=document.querySelector('canvas')!.getContext('webgl',{preserveDrawingBuffer:true,antialias:false})!;
    if(!gl)throw Error('no_webgl');
    const counters={drawArrays:0,drawElements:0,pointDraws:0,pointVertices:0,bufferData:0,bufferBytes:0};
    const draw=gl.drawArrays.bind(gl),elements=gl.drawElements.bind(gl),buffer=gl.bufferData.bind(gl);
    gl.drawArrays=(mode,first,count)=>{counters.drawArrays++;if(mode===gl.POINTS){counters.pointDraws++;counters.pointVertices+=count;}draw(mode,first,count);};
    gl.drawElements=(...args)=>{counters.drawElements++;elements(...args);};
    gl.bufferData=((target:any,data:any,usage:any)=>{counters.bufferData++;counters.bufferBytes+=typeof data==='number'?data:data?.byteLength??0;buffer(target,data,usage);}) as any;
    const api=(globalThis as any).composition49;
    (globalThis as any).pointMeasure={api,gl,counters,renderer:api.createSkyGpuRenderer(gl,1)};
  });
  const rows=[];
  for(const condition of cases){const observed=await page.evaluate(({condition,report,at}:any)=>{
    const input=(globalThis as any).pointMeasure;
    const render=()=>{let snapshot:any;const args=Array(36).fill(undefined);Object.assign(args,{0:input.renderer,1:report,2:at,3:null,4:null,5:390,6:844,7:'DAY',
      8:(value:any)=>snapshot=value,10:condition.fov,12:condition.basis,35:{horizontal:false,equatorial:false}});
      input.api.drawSkyScene(...args);input.gl.finish();return snapshot;};
    render();for(const key of Object.keys(input.counters))input.counters[key]=0;
    const snapshot=render();const pixels=new Uint8Array(390*844*4);input.gl.readPixels(0,0,390,844,input.gl.RGBA,input.gl.UNSIGNED_BYTE,pixels);
    let binary='';for(let i=0;i<pixels.length;i+=32768)binary+=String.fromCharCode(...pixels.subarray(i,i+32768));
    return {frameAt:snapshot.frameAt,objects:snapshot.objects.length,starObjects:snapshot.objects.filter((object:any)=>object.kind==='STAR').length,
      counters:{...input.counters},glError:input.gl.getError(),rgba:btoa(binary)};
  },{condition,report,at:raw.context.at});assert.equal(observed.frameAt,raw.context.at);assert.equal(observed.glError,0);assert(observed.objects>0);
    const {rgba,...actual}=observed;const image=condition.name+'.png';await page.locator('canvas').screenshot({path:path.join(output,image)});
    rows.push({condition,...actual,rgbaSha256:sha(Buffer.from(rgba,'base64')),image,imageSha256:sha(await fs.readFile(path.join(output,image)))});}
  await page.evaluate(()=>(globalThis as any).pointMeasure.renderer.dispose());assert.equal(errors.length,0);
  const result={scope:'Actual production shared point-channel submission counts with current BSC and ephemerides; images, SAO, WXML and actual target frame time/memory excluded',
    reportSha256:sha(bytes),catalogResponseSha256:sha(catalogBytes),sourceHashes:prior.sourceHashes,productionBundleSha256:sha(production),rows,errors};
  await fs.writeFile(path.join(output,'result.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify({output,rows:rows.map(row=>({name:row.condition.name,objects:row.objects,starObjects:row.starObjects,counters:row.counters}))}));
}finally{await browser.close();}
