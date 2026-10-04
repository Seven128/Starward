// Current public report/resources and existing production Canvas owners.
// Bounded visual diagnosis; no WXML, native lifecycle or device acceptance.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
import {projectAdoptedSkyCatalog} from '../../../../apps/wechat-miniapp/src/services/sky-report-catalog.ts';
import {attachSkyCatalog,resolveSkySceneFrame,resolveSkyDeepSkyScene} from '../../../../apps/wechat-miniapp/src/features/sky/sky-stellar-scene.ts';
import {presentSkyTime} from '../../../../apps/wechat-miniapp/src/features/sky/sky-time-presentation.ts';
import {resolveConstellationFrame} from '../../../../apps/wechat-miniapp/src/features/sky/sky-constellation-scene.ts';
import {createSkyViewBasis} from '../../../../apps/wechat-miniapp/src/features/sky/sky-view-projection.ts';
import {artworkIntersectsView} from '../../../../apps/wechat-miniapp/src/features/sky/sky-artwork-visibility.ts';
import {constellationVisibility} from '../../../../apps/wechat-miniapp/src/features/sky/sky-constellation-visibility.ts';

const task=path.resolve('.codex/work-items/cloud-sky-native-2026-09-22');
const output=path.resolve('output/playwright/cloud-sky-current-composition-0930');
await assert.rejects(fs.access(output),{code:'ENOENT'});await fs.mkdir(output,{recursive:true});
const sha=(raw:Uint8Array|string)=>createHash('sha256').update(raw).digest('hex');
const inputRecords:any[]=[];
const get=async(route:string)=>{
  const reply=await fetch('http://127.0.0.1:60065'+route,{signal:AbortSignal.timeout(15000)});
  assert.equal(reply.status,200,route);const bytes=Buffer.from(await reply.arrayBuffer());
  inputRecords.push({route,sha256:sha(bytes),bytes:bytes.length,headers:Object.fromEntries(reply.headers.entries())});
  return bytes;
};
const json=async(route:string)=>JSON.parse((await get(route)).toString());
const reportBytes=await fs.readFile(path.join(task,'tmp/v49-current-public-report.json'));
const raw=projectAdoptedSkyCatalog(JSON.parse(reportBytes.toString())).data;
const at=raw.context.at;
const starReference=raw.skyScene.catalog!;
const stars=(await json(`/v2/sky/catalogs/${starReference.catalogVersion}/${starReference.catalogHash}`)).data;
const publication=(await json('/v2/sky/constellations')).data;
const galactic=await json('/v2/sky/galactic/manifest');
const landscape=await json('/v2/sky/landscape/manifest');
const current=attachSkyCatalog(presentSkyTime(raw,at)!.report,stars);
const starFrame=resolveSkySceneFrame(current.skyScene,at)!;
const altairIndex=current.skyScene.catalog!.entries.findIndex(entry=>entry.objectRef==='HR:7557');
const altair=starFrame.points.find(point=>point[0]===altairIndex)!;assert(altair);
const altairBasis=createSkyViewBasis(altair[1],90+altair[2],0)!;
const deep=resolveSkyDeepSkyScene(current.skyScene,at)!;
const m31Index=deep.catalog.entries.findIndex(entry=>entry.objectRef==='M:31');
const m31=deep.frame.points!.find(point=>point[0]===m31Index)!;assert(m31&&m31[2]>0);
const m31Basis=createSkyViewBasis(m31[1],90+m31[2],0)!;
const horizonBasis=createSkyViewBasis(269.0634887703755,105,0)!;
const scenarios=[
  {name:'west-noon',at:'2026-09-30T04:00:00.000Z',fov:85,mode:'DAY',basis:horizonBasis},
  {name:'west-dusk',at:'2026-09-30T10:30:00.000Z',fov:85,mode:'DAY',basis:horizonBasis},
  {name:'west-night',at,fov:85,mode:'DAY',basis:horizonBasis},
  {name:'west-red',at,fov:85,mode:'OBSERVATION',basis:horizonBasis},
  {name:'night-dome',at,fov:274.9,mode:'DAY',basis:createSkyViewBasis(0,180,0)!},
  {name:'altair-wide',at,fov:84.63316191100171,mode:'DAY',basis:altairBasis},
  {name:'altair-without-galactic-image',at,fov:84.63316191100171,mode:'DAY',basis:altairBasis,galacticImage:false},
  {name:'altair-local',at,fov:8.86,mode:'DAY',basis:altairBasis},
  {name:'altair-wide-return',at,fov:84.63316191100171,mode:'DAY',basis:altairBasis},
  {name:'m31-wide',at,fov:5.83,mode:'DAY',basis:m31Basis,deep:true},
  {name:'m31-local',at,fov:.828,mode:'DAY',basis:m31Basis,deep:true},
  {name:'m31-without-image',at,fov:5.83,mode:'DAY',basis:m31Basis},
];
const prepared=scenarios.map(scenario=>{
  const presentation=presentSkyTime(raw,scenario.at);assert(presentation);
  const report=attachSkyCatalog(presentation.report,stars);
  const frame=resolveConstellationFrame(publication,report.skyScene,scenario.at);assert(frame);
  const sun=report.hourly.find(row=>row.at===scenario.at);assert(sun);
  const wanted=constellationVisibility(scenario.fov,true)>0?frame.images.filter(image=>
    artworkIntersectsView(image.registration,{basis:scenario.basis,verticalFovDeg:scenario.fov},390,844)).map(image=>image.source):[];
  return {...scenario,report,frame,wanted,sunAltitudeDeg:sun.sunAltitudeDeg,sunAzimuthDeg:sun.sunAzimuthDeg};
});
const images=new Map<string,any>();
const image=async(id:string,asset:any)=>{
  const bytes=await get(asset.downloadUrl);assert.equal(sha(bytes),asset.sha256);assert.equal(bytes.length,asset.bytes);
  const mime=inputRecords.at(-1).headers['content-type'].split(';')[0];assert(['image/png','image/jpeg'].includes(mime));
  images.set(id,{id,...asset,data:'data:'+mime+';base64,'+bytes.toString('base64')});
};
for(const asset of prepared.flatMap(scenario=>scenario.wanted))if(!images.has(asset.id))await image(asset.id,
  {...asset,downloadUrl:`/v2/sky/constellations/${publication.catalogHash}/assets/${asset.file}`});
await image('galactic',galactic.image);
const masks=[];
for(const resource of landscape.resources){
  await image('landscape:'+resource.id,resource.image);
  const bytes=await get(resource.alpha.downloadUrl);assert.equal(sha(bytes),resource.alpha.sha256);assert.equal(bytes.length,resource.alpha.bytes);
  masks.push({resource,encoded:JSON.parse(bytes.toString())});
}
const imageBytes=await get('/v2/celestial-objects/M%3A31/image?level=OVERVIEW');
const m31Headers=inputRecords.at(-1).headers;
assert.equal(m31Headers['content-type'].split(';')[0],'image/jpeg');
const compiled=await build({stdin:{resolveDir:path.resolve('.'),contents:
  "export {createSkyGpuRenderer} from './apps/wechat-miniapp/src/features/sky/sky-gpu-renderer';export {drawSkyScene} from './apps/wechat-miniapp/src/features/sky/sky-scene-render';export {selectSkyLandscapeResource} from './apps/wechat-miniapp/src/features/sky/sky-landscape-resources';export {createSkyPanoramaMask} from './apps/wechat-miniapp/src/features/sky/sky-landscape-mask';export {decodeSkyLandscapeAlpha} from './packages/miniapp-contracts/src/sky-landscape-publication';export {startDeepSkyImageRequest} from './apps/wechat-miniapp/src/features/sky/deep-sky-image-request';"},
  bundle:true,write:false,metafile:true,format:'iife',globalName:'composition49',platform:'browser',target:'es2022',tsconfig:path.resolve('apps/wechat-miniapp/tsconfig.json')});
const production=compiled.outputFiles[0]!.text;
const sourceHashes=await Promise.all(Object.keys(compiled.metafile!.inputs).filter(file=>file!=='<stdin>').map(async file=>({path:file,sha256:sha(await fs.readFile(file))})));
await fs.writeFile(path.join(output,'production.js'),production,{flag:'wx'});
console.log(JSON.stringify({phase:'current-inputs-ready',constellationHash:publication.catalogHash,galacticHash:galactic.publicationHash,landscapeHash:landscape.publicationHash}));
const {chromium}=createRequire(import.meta.url)('C:/Users/777/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader']});
const rows:any[]=[];
try{
  const page=await browser.newPage({viewport:{width:390,height:844}});const errors:string[]=[];
  page.on('pageerror',(error:any)=>errors.push(String(error)));
  await page.setContent('<style>body{margin:0}canvas{display:block}</style><canvas width="390" height="844"></canvas>');
  await page.evaluate('globalThis.__name=target=>target');await page.addScriptTag({content:production});
  await page.evaluate(async(input:any)=>{
    const api=(globalThis as any).composition49;const decoded=new Map();
    for(const asset of input.images){const image=new Image();image.src=asset.data;await image.decode();decoded.set(asset.id,image);}
    const masks=new Map(input.masks.map((row:any)=>[row.resource.id,api.createSkyPanoramaMask(input.landscape,row.resource,api.decodeSkyLandscapeAlpha(row.encoded,row.resource))]));
    const gl=document.querySelector('canvas')!.getContext('webgl',{preserveDrawingBuffer:true,antialias:false})!;if(!gl)throw Error('no_webgl');
    const resources={created:0,deleted:0};const create=gl.createTexture.bind(gl),remove=gl.deleteTexture.bind(gl);
    gl.createTexture=()=>{const texture=create();if(texture)resources.created++;return texture;};gl.deleteTexture=texture=>{if(texture)resources.deleted++;remove(texture);};
    const failures:string[]=[];const renderer=api.createSkyGpuRenderer(gl,1,{imageFailed:()=>failures.push('GPU image failure')});
    const fileCounts={writes:0,removes:0,failed:0};let ready:any;
    api.startDeepSkyImageRequest({asset:{reference:'M:31',level:'OVERVIEW',tempFilePath:'/owned/m31.jpg'},url:'/actual-HTTP-body',
      request:(options:any)=>{options.success({statusCode:200,header:input.m31Headers,data:Uint8Array.from(atob(input.m31Base64),(c:string)=>c.charCodeAt(0)).buffer});return{};},
      writeFile:(options:any)=>{fileCounts.writes++;options.success();},removeFile:()=>{fileCounts.removes++;},
      onReady:(asset:any)=>ready=asset,onError:()=>{fileCounts.failed++;}});
    if(!ready||fileCounts.failed)throw Error('image_owner_failed');
    const m31=new Image();m31.src='data:image/jpeg;base64,'+input.m31Base64;await m31.decode();
    (globalThis as any).compositionInput={api,decoded,masks,gl,renderer,resources,failures,landscape:input.landscape,deep:{...ready,image:m31},fileCounts};
  },{images:[...images.values()],masks,landscape,m31Headers,m31Base64:imageBytes.toString('base64')});
  for(const scenario of prepared){
    const row=await page.evaluate((scenario:any)=>{
      const input=(globalThis as any).compositionInput,atlas=new Map(scenario.wanted.map((asset:any)=>[asset.id,input.decoded.get(asset.id)]));
      const galactic=scenario.galacticImage===false?null:input.decoded.get('galactic');
      const resource=input.api.selectSkyLandscapeResource(input.landscape,[...atlas.values(),...(galactic?[galactic]:[]),...(scenario.deep?[input.deep.image]:[])],false);
      let snapshot:any,sources:any;const failuresBefore=input.failures.length;
      const args:any[]=Array(36).fill(undefined);Object.assign(args,{0:input.renderer,1:scenario.report,2:scenario.at,3:null,4:null,5:390,6:844,7:scenario.mode,
        8:(value:any,painted:any)=>{snapshot=value;sources=painted;},10:scenario.fov,11:scenario.deep?input.deep:null,12:scenario.basis,
        15:{frame:scenario.frame,images:atlas,enabled:true,failed:()=>input.failures.push('constellation image failure')},
        26:galactic,34:{enabled:true,panorama:{image:input.decoded.get('landscape:'+resource.id),mask:input.masks.get(resource.id)}},35:{horizontal:true,equatorial:false}});
      input.api.drawSkyScene(...args);input.gl.finish();
      const pixels=new Uint8Array(390*844*4);input.gl.readPixels(0,0,390,844,input.gl.RGBA,input.gl.UNSIGNED_BYTE,pixels);
      let binary='';for(let i=0;i<pixels.length;i+=32768)binary+=String.fromCharCode(...pixels.subarray(i,i+32768));
      return {frameAt:snapshot?.frameAt,paintedLandscape:snapshot?.view.landscape?.resource?.id,paintedDeepSky:sources?.deepSkyImage===input.deep.image,
        references:snapshot?.objects.map((object:any)=>object.reference),glError:input.gl.getError(),failed:input.failures.length-failuresBefore,rgbaBase64:btoa(binary)};
    },scenario);
    assert.equal(row.glError,0);assert.equal(row.failed,0);assert.equal(row.frameAt,scenario.at);assert(row.paintedLandscape);
    const file=scenario.name+'.png';await page.locator('canvas').screenshot({path:path.join(output,file)});
    const {report,frame,wanted,...condition}=scenario;const {rgbaBase64,...effect}=row;
    rows.push({condition,eligibleImages:wanted.map(asset=>asset.id),...effect,rgbaSha256:sha(Buffer.from(rgbaBase64,'base64')),image:file,imageSha256:sha(await fs.readFile(path.join(output,file)))});
  }
  assert.equal(rows.find(row=>row.condition.name==='altair-wide')!.rgbaSha256,rows.find(row=>row.condition.name==='altair-wide-return')!.rgbaSha256);
  for(const name of ['m31-wide','m31-local'])assert.equal(rows.find(row=>row.condition.name===name)!.paintedDeepSky,true);
  const retired=await page.evaluate(()=>{const input=(globalThis as any).compositionInput;input.renderer.dispose();input.deep.release();return {resources:input.resources,fileCounts:input.fileCounts,failures:input.failures};});
  assert.equal(retired.resources.created,retired.resources.deleted);assert.equal(retired.fileCounts.writes,retired.fileCounts.removes);assert.equal(retired.fileCounts.failed,0);assert.equal(errors.length,0);
  const result={scope:'Current software-GPU visual diagnosis using existing full Canvas owners; no ordinary WEAPP/WXML, SDK journey or device acceptance',contextIdSha256:sha(raw.context.contextId),reportSha256:sha(reportBytes),
    observer:raw.skyScene.observer,viewport:{width:390,height:844,deviceScale:1,fov:'vertical stereographic, not reference short-side FOV'},productionBundleSha256:sha(production),sourceHashes,inputRecords,
    galacticHash:galactic.publicationHash,landscapeHash:landscape.publicationHash,constellationHash:publication.catalogHash,rows,retired,errors,
    limits:['BSC base and source imagery are actual; SAO is not loaded for these environment/image diagnosis rows, so star-density comparison remains unverified',
      'Optional W3 wide-field layer OFF and solar texture refinement absent; existing production fallbacks remain, no complete layer-combination acceptance',
      'Day/dusk/night camera held fixed; temporary software frame selection performs no Context write',
      'Figures, panorama and galaxy share existing resource owner; source decoded preload is diagnostic, not native residency or loader performance',
      'Reference quality needs actual comparable viewport/time/layers and visual assessment; successful submissions and return equality do not certify it']};
  await fs.writeFile(path.join(output,'result.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify({output,scenarios:rows.length,returnedPixelsEqual:true,retired}));
}finally{await browser.close();}
