// Actual current report and HTTP images, existing LOD/request/render owners.
// Software-GPU field inspection, not a native journey or scientific-mask claim.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {projectAdoptedSkyCatalog} from '../../../../apps/wechat-miniapp/src/services/sky-report-catalog.ts';
import {attachSkyCatalog,resolveSkyDeepSkyScene} from '../../../../apps/wechat-miniapp/src/features/sky/sky-stellar-scene.ts';
import {presentSkyTime} from '../../../../apps/wechat-miniapp/src/features/sky/sky-time-presentation.ts';
import {createSkyViewBasis} from '../../../../apps/wechat-miniapp/src/features/sky/sky-view-projection.ts';
import {deepSkyImageLevelForFov} from '../../../../apps/wechat-miniapp/src/features/sky/sky-zoom.ts';

const task=path.resolve('.codex/work-items/cloud-sky-native-2026-09-22');
const priorDir=path.resolve('output/playwright/cloud-sky-current-composition-0930');
const isolate=process.argv[2]==='isolate';
assert(process.argv.length===2||process.argv.length===3&&isolate,'only original or isolated field inspection');
const output=path.resolve(isolate?'output/playwright/cloud-sky-current-deep-field-effect-0930':'output/playwright/cloud-sky-current-deep-field-0930');
await assert.rejects(fs.access(output),{code:'ENOENT'});
await fs.mkdir(output,{recursive:true});
const sha=(bytes:Uint8Array|string)=>createHash('sha256').update(bytes).digest('hex');
const prior=JSON.parse(await fs.readFile(path.join(priorDir,'result.json'),'utf8'));
for(const owner of prior.sourceHashes)assert.equal(sha(await fs.readFile(owner.path)),owner.sha256,owner.path);
const production=await fs.readFile(path.join(priorDir,'production.js'));
assert.equal(sha(production),prior.productionBundleSha256);
const reportBytes=await fs.readFile(path.join(task,'tmp/v49-current-public-report.json'));
assert.equal(sha(reportBytes),prior.reportSha256);
const raw=projectAdoptedSkyCatalog(JSON.parse(reportBytes.toString())).data;
const readbacks:any[]=[];
async function get(route:string){
  const response=await fetch('http://127.0.0.1:60065'+route,{signal:AbortSignal.timeout(15000)});
  assert.equal(response.status,200,route);
  const bytes=Buffer.from(await response.arrayBuffer());
  const headers=Object.fromEntries(response.headers.entries());
  readbacks.push({route,bytes:bytes.length,sha256:sha(bytes),headers});
  return {bytes,headers};
}
const reference=raw.skyScene.catalog!;
const catalog=JSON.parse((await get(`/v2/sky/catalogs/${reference.catalogVersion}/${reference.catalogHash}`)).bytes.toString()).data;
const references=['M:81','M:82','M:101','M:63','M:27','M:57'];
const cases=[];
const images=[];
for(const reference of references){
  const index=raw.skyScene.deepSky!.catalog!.entries.findIndex(entry=>entry.objectRef===reference);
  assert(index>=0);
  const choices=raw.hourly.filter(row=>row.sunAltitudeDeg!==null&&row.sunAltitudeDeg < -18).map(row=>{
    const report=attachSkyCatalog(presentSkyTime(raw,row.at)!.report,catalog);
    const point=resolveSkyDeepSkyScene(report.skyScene,row.at)?.frame.points?.find(point=>point[0]===index);
    return {at:row.at,report,point};
  }).filter(choice=>choice.point&&choice.point[2]>0).sort((a,b)=>b.point![2]-a.point![2]);
  assert(choices.length,`${reference}: no actual dark above-horizon frame`);
  const chosen=choices[0]!;
  const basis=createSkyViewBasis(chosen.point![1],90+chosen.point![2],0)!;
  for(const level of ['OVERVIEW','MEDIUM','DETAIL']){
    const route=`/v2/celestial-objects/${encodeURIComponent(reference)}/image?level=${level}&imageVersion=source-finite-v3`;
    const {bytes,headers}=await get(route);
    images.push({reference,level,headers,base64:bytes.toString('base64')});
  }
  cases.push({reference,at:chosen.at,point:chosen.point!,report:chosen.report,basis});
}
const {chromium}=createRequire(import.meta.url)('C:/Users/777/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader']});
const rows=[];
try{
  const page=await browser.newPage({viewport:{width:390,height:844}});
  const errors:string[]=[];
  page.on('pageerror',(error:any)=>errors.push(String(error)));
  await page.setContent('<style>body{margin:0}canvas{display:block}</style><canvas width="390" height="844"></canvas>');
  await page.evaluate('globalThis.__name=target=>target');
  await page.addScriptTag({content:production.toString()});
  await page.evaluate(async(images:any[])=>{
    const api=(globalThis as any).composition49;
    const assets=new Map(),files={writes:0,removes:0,failed:0},transparent=new Map();
    for(const row of images){
      let ready:any;
      api.startDeepSkyImageRequest({asset:{reference:row.reference,level:row.level,tempFilePath:'/owned/'+row.reference.replace(':','-')+'-'+row.level+'.jpg'},url:'/actual-http-body',
        request:(options:any)=>{options.success({statusCode:200,header:row.headers,data:Uint8Array.from(atob(row.base64),(c:string)=>c.charCodeAt(0)).buffer});return{};},
        writeFile:(options:any)=>{files.writes++;options.success();},removeFile:()=>files.removes++,onReady:(asset:any)=>ready=asset,onError:()=>files.failed++});
      if(!ready)throw Error('image_not_accepted:'+row.reference+':'+row.level);
      const image=new Image();
      image.src='data:'+row.headers['content-type'].split(';')[0]+';base64,'+row.base64;
      await image.decode();
      if(image.width!==ready.pixelSize||image.height!==ready.pixelSize)throw Error('decoded_size_mismatch');
      assets.set(row.reference+'/'+row.level,{...ready,image});
      if(!transparent.has(ready.pixelSize)){
        const blank=document.createElement('canvas');blank.width=blank.height=ready.pixelSize;
        const control=new Image();control.src=blank.toDataURL('image/png');await control.decode();
        transparent.set(ready.pixelSize,control);
      }
    }
    const gl=document.querySelector('canvas')!.getContext('webgl',{preserveDrawingBuffer:true,antialias:false})!;
    if(!gl)throw Error('no_webgl');
    const resources={created:0,deleted:0},create=gl.createTexture.bind(gl),remove=gl.deleteTexture.bind(gl);
    gl.createTexture=()=>{const texture=create();if(texture)resources.created++;return texture;};
    gl.deleteTexture=texture=>{if(texture)resources.deleted++;remove(texture);};
    const failures:string[]=[];
    const renderer=api.createSkyGpuRenderer(gl,1,{imageFailed:()=>failures.push('image')});
    (globalThis as any).deepField={api,assets,files,transparent,gl,renderer,resources,failures};
  },images);
  for(const chosen of cases){
    let firstHash:string|undefined;
    for(const [step,fov] of [8.86,4.83,.828,.05,8.86].entries()){
      const level=deepSkyImageLevelForFov(fov)!;
      const effect=await page.evaluate((scenario:any)=>{
        const input=(globalThis as any).deepField;
        const asset=input.assets.get(scenario.reference+'/'+scenario.level);
        let snapshot:any,sources:any;
        const paint=(withImage:boolean)=>{
          const args:any[]=Array(36).fill(undefined);
          Object.assign(args,{0:input.renderer,1:scenario.report,2:scenario.at,3:null,4:null,5:390,6:844,7:'DAY',
            8:(value:any,painted:any)=>{snapshot=value;sources=painted;},10:scenario.fov,
            11:withImage?asset:scenario.isolate?{...asset,image:input.transparent.get(asset.pixelSize)}:null,12:scenario.basis,
            35:{horizontal:false,equatorial:false}});
          input.api.drawSkyScene(...args);input.gl.finish();
          const pixels=new Uint8Array(390*844*4);input.gl.readPixels(0,0,390,844,input.gl.RGBA,input.gl.UNSIGNED_BYTE,pixels);
          return pixels;
        };
        const baseline=paint(false),pixels=paint(true);
        let changed=0,maximum=0,centerMaximum=0,totalDifference=0;
        for(let y=0;y<844;y++)for(let x=0;x<390;x++){
          const offset=((843-y)*390+x)*4;
          const change=Math.max(...[0,1,2].map(channel=>Math.abs(pixels[offset+channel]!-baseline[offset+channel]!)));
          if(change)changed++;maximum=Math.max(maximum,change);totalDifference+=change;
          if(Math.hypot(x-195,y-422)<24)centerMaximum=Math.max(centerMaximum,change);
        }
        let binary='';for(let i=0;i<pixels.length;i+=32768)binary+=String.fromCharCode(...pixels.subarray(i,i+32768));
        return {frameAt:snapshot.frameAt,paintedDeepSky:sources.deepSkyImage===asset.image,
          references:snapshot.objects.map((object:any)=>object.reference),changed,maximum,centerMaximum,totalDifference,
          glError:input.gl.getError(),rgba:btoa(binary)};
      },{...chosen,fov,level,isolate});
      assert.equal(effect.frameAt,chosen.at);assert.equal(effect.glError,0);
      assert(effect.references.includes(chosen.reference));
      const filename=chosen.reference.replace(':','-')+'-'+step+'-'+fov+'.png';
      await page.locator('canvas').screenshot({path:path.join(output,filename)});
      const {rgba,...actual}=effect;
      const rgbaSha256=sha(Buffer.from(rgba,'base64'));
      if(step===0)firstHash=rgbaSha256;
      if(step===4)assert.equal(rgbaSha256,firstHash,'reverse zoom must restore the same actual rendered pixels');
      rows.push({reference:chosen.reference,at:chosen.at,point:chosen.point,basis:chosen.basis,step,fov,level,
        ...actual,rgbaSha256,image:filename,imageSha256:sha(await fs.readFile(path.join(output,filename)))});
    }
  }
  const retired=await page.evaluate(()=>{const input=(globalThis as any).deepField;input.renderer.dispose();
    for(const asset of input.assets.values())asset.release();return{resources:input.resources,files:input.files,failures:input.failures};});
  assert.equal(retired.resources.created,retired.resources.deleted);
  assert.equal(retired.files.writes,retired.files.removes);
  assert.equal(retired.files.failed,0);assert.equal(retired.failures.length,0);assert.equal(errors.length,0);
  await fs.writeFile(path.join(output,'result.json'),JSON.stringify({scope:'Six representative actual current night frames and versioned image levels; production software GPU; native, WXML, SAO, source validity, detailed astrometry and performance remain unverified',
    baseline:isolate?'Explicit transparent-image color control preserves the same catalog-cue retirement; its pixels are never published or a production request result':'No-image baseline also changes catalog-cue retirement; difference counts do not isolate source-image contribution',
    reportSha256:sha(reportBytes),contextIdSha256:sha(raw.context.contextId),productionBundleSha256:sha(production),sourceHashes:prior.sourceHashes,
    lodOwner:{path:'apps/wechat-miniapp/src/features/sky/sky-zoom.ts',sha256:sha(await fs.readFile('apps/wechat-miniapp/src/features/sky/sky-zoom.ts'))},readbacks,rows,retired,errors},null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify({output,rows:rows.map(({reference,fov,level,paintedDeepSky,changed,maximum,centerMaximum})=>({reference,fov,level,paintedDeepSky,changed,maximum,centerMaximum})),retired}));
}finally{await browser.close();}
