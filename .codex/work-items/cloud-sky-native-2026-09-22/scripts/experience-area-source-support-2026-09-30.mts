// Actual published M42 alpha and current production drawing. No native controls,
// Context write, new service, source-image edit or scientific coverage inference.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {projectAdoptedSkyCatalog} from '../../../../apps/wechat-miniapp/src/services/sky-report-catalog.ts';
import {attachSkyCatalog} from '../../../../apps/wechat-miniapp/src/features/sky/sky-stellar-scene.ts';
import {presentSkyTime} from '../../../../apps/wechat-miniapp/src/features/sky/sky-time-presentation.ts';
import {createSkyViewBasis} from '../../../../apps/wechat-miniapp/src/features/sky/sky-view-projection.ts';

const task=path.resolve('.codex/work-items/cloud-sky-native-2026-09-22');
const output=path.resolve('output/playwright/cloud-sky-area-support-0930-final');
await assert.rejects(fs.access(output),{code:'ENOENT'});await fs.mkdir(output,{recursive:true});
const sha=(value:Uint8Array|string)=>createHash('sha256').update(value).digest('hex');
const read=async(file:string)=>JSON.parse(await fs.readFile(path.join(task,file),'utf8'));
const prior=JSON.parse(await fs.readFile('output/playwright/cloud-sky-scene-v47-lines-checked-0930/result.json','utf8'));
for(const owner of prior.sourceHashes)assert.equal(sha(await fs.readFile(owner.path)),owner.sha256);
const production=await fs.readFile('output/playwright/cloud-sky-scene-v47-lines-checked-0930/production.js');
assert.equal(sha(production),prior.productionBundleSha256);
const manifest=await read('tmp/area-source-finite-publication-read.json');
const entry=manifest.entries.find((value:any)=>value.objectRef==='M:42');assert(entry);
const source=entry.levels.DETAIL;
const imageBytes=await fs.readFile(path.join(task,'tmp/area-source-m42-detail.png'));
assert.equal(imageBytes.length,source.bytes);assert.equal(sha(imageBytes),source.sha256);
const raw=projectAdoptedSkyCatalog(await read('tmp/v45-current-public-report.json')).data;
// An actual frame already present in this report, during the same observing night.
// This does not submit or replace the user's committed 21:50:33 Context.
const at='2026-09-30T20:00:00.000Z',presentation=presentSkyTime(raw,at);assert(presentation);
const starsRoute=`/v2/sky/catalogs/${raw.skyScene.catalog.catalogVersion}/${raw.skyScene.catalog.catalogHash}`;
const reply=await fetch('http://127.0.0.1:60065'+starsRoute,{signal:AbortSignal.timeout(15000)});
assert.equal(reply.status,200);const starBytes=Buffer.from(await reply.arrayBuffer());
const report=attachSkyCatalog(presentation.report,JSON.parse(starBytes.toString()).data);
const frame=report.skyScene.deepSky!.frames.find(value=>value.at===at)!;
const index=report.skyScene.deepSky!.catalog!.entries.findIndex(value=>value.objectRef==='M:42');
const point=frame.points!.find(value=>value[0]===index)!;assert(point&&point[2]>0);
assert(report.hourly.find(value=>value.at===at)!.sunAltitudeDeg! < -18);
const basis=createSkyViewBasis(point[1],90+point[2],0)!;
const require=createRequire(import.meta.url);
const {chromium}=require('C:/Users/777/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader']});
const rows:any[]=[],errors:string[]=[];
try{
  const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});
  page.on('pageerror',(error:any)=>errors.push(String(error)));
  await page.setContent('<style>body{margin:0}canvas{display:block}</style><canvas width="390" height="844"></canvas>');
  await page.evaluate('globalThis.__name = target => target');
  await page.addScriptTag({content:production.toString()});
  const alpha=await page.evaluate(async input=>{
    const image=new Image();image.src=input.image;await image.decode();
    if(image.width!==512||image.height!==512)throw Error('image_dimensions');
    const read=document.createElement('canvas');read.width=512;read.height=512;
    const ctx=read.getContext('2d')!;ctx.drawImage(image,0,0);const pixels=ctx.getImageData(0,0,512,512).data;
    let missing=0;for(let i=3;i<pixels.length;i+=4)if(pixels[i]===0)missing++;
    const gl=document.querySelector('canvas')!.getContext('webgl',{preserveDrawingBuffer:true,antialias:false})!;
    if(!gl)throw Error('software_webgl_missing');
    const resources={created:0,deleted:0},create=gl.createTexture.bind(gl),remove=gl.deleteTexture.bind(gl);
    gl.createTexture=()=>{const t=create();if(t)resources.created++;return t;};
    gl.deleteTexture=t=>{if(t)resources.deleted++;remove(t);};
    const renderer=(globalThis as any).scene47Gpu.createSkyGpuRenderer(gl,1);
    (globalThis as any).inputs={...input,image,gl,renderer,resources};
    return {missing,centerAlpha:pixels[(256*512+255)*4+3]};
  },{report,at,basis,image:`data:image/png;base64,${imageBytes.toString('base64')}`,field:source.fieldDegrees});
  assert.equal(alpha.missing,source.sourceFiniteMask.missingPixels);
  for(const fov of [.05,.12,.8])for(const scenario of ['actual-image','omit-image-only','no-image'] as const){
    const row=await page.evaluate(({fov,scenario})=>{
      const input=(globalThis as any).inputs;let snapshot:any,sources:any,submitted=0;
      // Bounded counterfactual: omit only this artwork GPU submission while
      // returning the same success receipt, to detect a claim with no pixel effect.
      const surface=scenario==='omit-image-only'?new Proxy(input.renderer,{get:(target,key)=>
        key==='artwork'?()=>{submitted++;return true;}:Reflect.get(target,key)}):input.renderer;
      const args:any[]=Array(36).fill(undefined);args[0]=surface;args[1]=input.report;args[2]=input.at;
      args[3]=null;args[4]=null;args[5]=390;args[6]=844;args[7]='NIGHT';
      args[8]=(value:any,painted:any)=>{snapshot=value;sources=painted;};
      args[10]=fov;args[11]=scenario==='no-image'?null:{image:input.image,reference:'M:42',level:'DETAIL',fieldDegrees:input.field};
      args[12]=input.basis;args[34]={enabled:false};args[35]={horizontal:false,equatorial:false};
      (globalThis as any).scene47Gpu.drawSkyScene(...args);input.gl.finish();
      const pixels=new Uint8Array(390*844*4);input.gl.readPixels(0,0,390,844,input.gl.RGBA,input.gl.UNSIGNED_BYTE,pixels);
      return {fov,scenario,claimedImage:sources?.deepSkyImage===input.image,submitted,
        frameAt:snapshot?.frameAt,objects:snapshot?.objects?.map((value:any)=>value.reference)??[],glError:input.gl.getError(),pixels:Array.from(pixels)};
    },{fov,scenario});
    assert.equal(row.glError,0);assert.equal(row.frameAt,at);assert(row.objects.includes('M:42'));
    const file=`m42-${fov}-${scenario}.png`;await page.screenshot({path:path.join(output,file)});
    const {pixels,...rest}=row;rows.push({...rest,rgbaSha256:sha(Uint8Array.from(pixels)),image:file,imageSha256:sha(await fs.readFile(path.join(output,file)))});
  }
  const resources=await page.evaluate(()=>{const input=(globalThis as any).inputs;input.renderer.dispose();return input.resources;});
  assert.equal(resources.created,resources.deleted);assert.equal(errors.length,0);
  const narrow=rows.filter(value=>value.fov===.05);
  const diagnosis={narrowImageHasNoPixelEffect:narrow[0].rgbaSha256===narrow[1].rgbaSha256,
    narrowImageStillClaimed:narrow[0].claimedImage,
    missingImageCatalogCueDiffers:narrow[0].rgbaSha256!==narrow[2].rgbaSha256};
  const result={scope:'Real published source-finite M42 PNG alpha, actual report night frame and frozen-current production software WebGL; no native composition, device performance or measured scientific coverage',
    at,localAt:'2026-10-01 04:00:00 Asia/Shanghai',committedContextUnchanged:true,point,source:{publicationHash:manifest.publicationHash,sha256:source.sha256,bytes:source.bytes,field:source.fieldDegrees,sourceFiniteMask:source.sourceFiniteMask},
    reportSha256:sha(await fs.readFile(path.join(task,'tmp/v45-current-public-report.json'))),starInput:{route:starsRoute,bytes:starBytes.length,sha256:sha(starBytes)},
    productionBundleSha256:sha(production),sourceHashes:prior.sourceHashes,alpha,rows,diagnosis,resources,errors};
  await fs.writeFile(path.join(output,'result.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify({output,alpha,diagnosis,resources,scenarios:rows.length}));
}finally{await browser.close();}
