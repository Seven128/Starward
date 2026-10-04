// Correct the earlier diagnostic's fixed OVERVIEW input with the real LOD owner.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {projectAdoptedSkyCatalog} from '../../../../apps/wechat-miniapp/src/services/sky-report-catalog.ts';
import {attachSkyCatalog} from '../../../../apps/wechat-miniapp/src/features/sky/sky-stellar-scene.ts';
import {presentSkyTime} from '../../../../apps/wechat-miniapp/src/features/sky/sky-time-presentation.ts';
import {resolveConstellationFrame} from '../../../../apps/wechat-miniapp/src/features/sky/sky-constellation-scene.ts';
import {deepSkyImageLevelForFov} from '../../../../apps/wechat-miniapp/src/features/sky/sky-zoom.ts';
const task=path.resolve('.codex/work-items/cloud-sky-native-2026-09-22');
const priorDir='output/playwright/cloud-sky-current-composition-0930';
const output=path.resolve('output/playwright/cloud-sky-current-image-levels-0930');
await assert.rejects(fs.access(output),{code:'ENOENT'});await fs.mkdir(output,{recursive:true});
const sha=(bytes:Uint8Array|string)=>createHash('sha256').update(bytes).digest('hex');
const prior=JSON.parse(await fs.readFile(path.join(priorDir,'result.json'),'utf8'));
for(const owner of prior.sourceHashes)assert.equal(sha(await fs.readFile(owner.path)),owner.sha256);
const production=await fs.readFile(path.join(priorDir,'production.js'));assert.equal(sha(production),prior.productionBundleSha256);
const readbacks:any[]=[];
const get=async(route:string)=>{const response=await fetch('http://127.0.0.1:60065'+route,{signal:AbortSignal.timeout(15000)});assert.equal(response.status,200,route);
  const bytes=Buffer.from(await response.arrayBuffer());const header=Object.fromEntries(response.headers.entries());readbacks.push({route,bytes:bytes.length,sha256:sha(bytes),header});return {bytes,header};};
const json=async(route:string)=>JSON.parse((await get(route)).bytes.toString());
const reportBytes=await fs.readFile(path.join(task,'tmp/v49-current-public-report.json'));assert.equal(sha(reportBytes),prior.reportSha256);
const raw=projectAdoptedSkyCatalog(JSON.parse(reportBytes.toString())).data;
const stars=(await json(`/v2/sky/catalogs/${raw.skyScene.catalog!.catalogVersion}/${raw.skyScene.catalog!.catalogHash}`)).data;
const constellations=(await json('/v2/sky/constellations')).data;
const landscape=await json('/v2/sky/landscape/manifest');assert.equal(landscape.publicationHash,prior.landscapeHash);
const resource=landscape.resources.find((row:any)=>row.id==='detail');assert(resource);
const landscapeBytes=(await get(resource.image.downloadUrl)).bytes;assert.equal(sha(landscapeBytes),resource.image.sha256);
const alphaBytes=(await get(resource.alpha.downloadUrl)).bytes;assert.equal(sha(alphaBytes),resource.alpha.sha256);
const prepared=['west-dusk','m31-wide','m31-local','m31-wide'].map((name,index)=>{
  const original=prior.rows.find((row:any)=>row.condition.name===name).condition;
  const report=attachSkyCatalog(presentSkyTime(raw,original.at)!.report,stars);
  const frame=resolveConstellationFrame(constellations,report.skyScene,original.at)!;assert(frame);
  return {...original,name:index===3?'m31-wide-return':name,report,frame,level:original.deep?deepSkyImageLevelForFov(original.fov):null};
});
const imageInputs=[];
for(const level of ['MEDIUM','DETAIL']){const {bytes,header}=await get('/v2/celestial-objects/M%3A31/image?level='+level);
  assert.equal(header['content-type'].split(';')[0],'image/jpeg');imageInputs.push({level,header,base64:bytes.toString('base64')});}
const {chromium}=createRequire(import.meta.url)('C:/Users/777/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader']});
try{
  const page=await browser.newPage({viewport:{width:390,height:844}});const errors:string[]=[];page.on('pageerror',(error:any)=>errors.push(String(error)));
  await page.setContent('<style>body{margin:0}canvas{display:block}</style><canvas width="390" height="844"></canvas>');await page.evaluate('globalThis.__name=target=>target');await page.addScriptTag({content:production.toString()});
  await page.evaluate(async(input:any)=>{
    const api=(globalThis as any).composition49;const assets=new Map();const files={writes:0,removes:0,failed:0};
    for(const row of input.imageInputs){let ready:any;api.startDeepSkyImageRequest({asset:{reference:'M:31',level:row.level,tempFilePath:'/owned/m31-'+row.level+'.jpg'},url:'/actual-body',
      request:(options:any)=>{options.success({statusCode:200,header:row.header,data:Uint8Array.from(atob(row.base64),(c:string)=>c.charCodeAt(0)).buffer});return{};},
      writeFile:(options:any)=>{files.writes++;options.success();},removeFile:()=>files.removes++,onReady:(asset:any)=>ready=asset,onError:()=>files.failed++});
      if(!ready)throw Error('not_ready');const image=new Image();image.src='data:image/jpeg;base64,'+row.base64;await image.decode();assets.set(row.level,{...ready,image});}
    const image=new Image();image.src='data:image/png;base64,'+input.landscapeBase64;await image.decode();
    const panorama={image,mask:api.createSkyPanoramaMask(input.landscape,input.resource,api.decodeSkyLandscapeAlpha(input.alpha,input.resource))};
    const gl=document.querySelector('canvas')!.getContext('webgl',{preserveDrawingBuffer:true,antialias:false})!;if(!gl)throw Error('no_webgl');
    const resources={created:0,deleted:0},create=gl.createTexture.bind(gl),remove=gl.deleteTexture.bind(gl);
    gl.createTexture=()=>{const texture=create();if(texture)resources.created++;return texture;};gl.deleteTexture=texture=>{if(texture)resources.deleted++;remove(texture);};
    const failures:string[]=[];const renderer=api.createSkyGpuRenderer(gl,1,{imageFailed:()=>failures.push('image')});
    (globalThis as any).levelsInput={api,assets,panorama,gl,renderer,resources,files,failures};
  },{imageInputs,landscape,resource,landscapeBase64:landscapeBytes.toString('base64'),alpha:JSON.parse(alphaBytes.toString())});
  const rows=[];
  for(const scenario of prepared){const effect=await page.evaluate((scenario:any)=>{
    const input=(globalThis as any).levelsInput;let snapshot:any,sources:any;const args:any[]=Array(36).fill(undefined);
    Object.assign(args,{0:input.renderer,1:scenario.report,2:scenario.at,3:null,4:null,5:390,6:844,7:scenario.mode,8:(value:any,painted:any)=>{snapshot=value;sources=painted;},
      10:scenario.fov,11:scenario.level?input.assets.get(scenario.level):null,12:scenario.basis,15:{frame:scenario.frame,images:new Map(),enabled:scenario.name!=='west-dusk'},
      34:{enabled:true,panorama:input.panorama},35:{horizontal:true,equatorial:false}});
    input.api.drawSkyScene(...args);input.gl.finish();const rgba=new Uint8Array(390*844*4);input.gl.readPixels(0,0,390,844,input.gl.RGBA,input.gl.UNSIGNED_BYTE,rgba);
    let binary='';for(let i=0;i<rgba.length;i+=32768)binary+=String.fromCharCode(...rgba.subarray(i,i+32768));
    return {frameAt:snapshot.frameAt,paintedDeepSky:!!sources.deepSkyImage,references:snapshot.objects.map((object:any)=>object.reference),glError:input.gl.getError(),rgba:btoa(binary)};
  },scenario);assert.equal(effect.glError,0);assert.equal(effect.frameAt,scenario.at);assert.equal(effect.paintedDeepSky,!!scenario.level);
    const image=scenario.name+'.png';await page.locator('canvas').screenshot({path:path.join(output,image)});
    const {report,frame,...condition}=scenario;const {rgba,...actual}=effect;rows.push({condition,...actual,rgbaSha256:sha(Buffer.from(rgba,'base64')),image,imageSha256:sha(await fs.readFile(path.join(output,image)))});}
  assert.equal(rows[1].rgbaSha256,rows[3].rgbaSha256);
  const retired=await page.evaluate(()=>{const input=(globalThis as any).levelsInput;input.renderer.dispose();for(const asset of input.assets.values())asset.release();return{resources:input.resources,files:input.files,failures:input.failures};});
  assert.equal(retired.resources.created,retired.resources.deleted);assert.equal(retired.files.writes,retired.files.removes);assert.equal(retired.files.failed,0);assert.equal(retired.failures.length,0);assert.equal(errors.length,0);
  const result={scope:'Software visual diagnosis with actual MEDIUM/DETAIL HTTP and existing LOD/response/render owners; no native chain/composition or performance acceptance',
    priorResultSha256:sha(await fs.readFile(path.join(priorDir,'result.json'))),sourceHashes:prior.sourceHashes,lodOwner:{path:'apps/wechat-miniapp/src/features/sky/sky-zoom.ts',sha256:sha(await fs.readFile('apps/wechat-miniapp/src/features/sky/sky-zoom.ts'))},
    productionBundleSha256:sha(production),contextIdSha256:sha(raw.context.contextId),reportSha256:sha(reportBytes),readbacks,rows,retired,errors,
    limitations:['Earlier fixed OVERVIEW pixels are not current fine-layer quality evidence','Same 390×844 viewport, fixed public Context and actual preview rows; no Context writes',
      'SAO, optional W3, solar texture refinement and WXML absent; no full star-density/quality/lifecycle acceptance',
      'Dusk figure OFF is a controlled public display-intent comparison; photos are simulated landscape, not site measurements']};
  await fs.writeFile(path.join(output,'result.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({output,levels:rows.map(row=>row.condition.level),returnedPixelsEqual:true,retired}));
}finally{await browser.close();}
