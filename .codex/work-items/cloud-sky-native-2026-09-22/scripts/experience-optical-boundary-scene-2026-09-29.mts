// Reproducible before/after diagnostic of real production scene/GPU owners.
// Actual immutable HTTP images and public astronomy; no phone acceptance.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
import {createPublicationBackend} from './experience-w3-proxy-backend-2026-09-29.mts';
import {projectAdoptedSkyCatalog} from '../../../../apps/wechat-miniapp/src/services/sky-report-catalog.ts';
import {attachSkyCatalog} from '../../../../apps/wechat-miniapp/src/features/sky/sky-stellar-scene.ts';
import {createSkyViewBasis} from '../../../../apps/wechat-miniapp/src/features/sky/sky-view-projection.ts';
import {SDSS_OPTICAL_PUBLICATIONS,assertSdssOpticalManifest} from '../../../../packages/miniapp-contracts/src/index.ts';
const after=process.argv.includes('--after'),root=process.cwd();
const base=path.join(root,'output/playwright/cloud-sky-optical-boundary-0929');
const output=path.join(base,after?(process.argv.includes('--r2')?'after-r2':'after'):'before');
await assert.rejects(fs.access(path.join(output,'result.json')),{code:'ENOENT'});
await fs.mkdir(output,{recursive:true});
const digest=(bytes:Uint8Array|string)=>createHash('sha256').update(bytes).digest('hex');
let backend:Awaited<ReturnType<typeof createPublicationBackend>>|undefined,browser:any;
try {
 let input:any;
 if(after)input=JSON.parse(await fs.readFile(path.join(base,'before/input.json'),'utf8'));
 else {
  backend=await createPublicationBackend();const origin=`http://127.0.0.1:${backend.port}`;
  async function json(relative:string,body?:unknown){const response=await fetch(origin+relative,{signal:AbortSignal.timeout(10000),...(body===undefined?{}:{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)})});assert([200,201].includes(response.status));return response.json() as Promise<any>;}
  const search=await json('/v2/places/search?q='+encodeURIComponent('示例观星点'));
  const spot=search.data.formalSpots.find((row:any)=>row.name==='示例观星点');
  assert.equal(spot.wgs84.latitude,22.4826799);assert.equal(spot.wgs84.longitude,114.5557147);
  const at='2026-09-29T11:00:00.000Z';
  const context=(await json('/v2/observation-contexts/resolve',{location:{kind:'FORMAL_SPOT',spotId:spot.spotId},localDate:'2026-09-29',selectedAt:at})).data;
  assert.equal(context.selectedAtUtc,at);
  const raw=projectAdoptedSkyCatalog(await json(`/v2/spots/${encodeURIComponent(spot.spotId)}/sky?contextId=${encodeURIComponent(context.contextId)}&catalogVersion=bsc5p-bright-stars.v3`));
  const catalog=raw.data.skyScene.catalog!;
  const stars=(await json(`/v2/sky/catalogs/${catalog.catalogVersion}/${catalog.catalogHash}`)).data;
  const attached=attachSkyCatalog(raw.data,stars);
  // Drawing consumes these public astronomy owners, with no Context ID/token.
  const report={skyScene:attached.skyScene,hourly:attached.hourly,targetFrames:attached.targetFrames,observationFrames:attached.observationFrames};
  const frame=report.skyScene.deepSky!.frames.find(row=>row.at===at)!;
  assert(frame?.state==='AVAILABLE'&&frame.points);
  const index=report.skyScene.deepSky!.catalog!.entries.findIndex(row=>row.objectRef==='M:63');
  const point=frame.points!.find(row=>row[0]===index)!;assert(point[2]>0);
  const optical=await json(`/v2/sky/sdss-optical/${SDSS_OPTICAL_PUBLICATIONS['M:63'].publicationHash}/manifest`);
  assertSdssOpticalManifest(optical,'M:63');
  const infrared=(await json(`/v2/sky/deep-sky/${backend.publicationHash}/manifest`)).entries.find((row:any)=>row.objectRef==='M:63');assert(infrared);
  const images:any[]=[];
  for(const [level,asset] of [...Object.entries(optical.levels),['W3',infrared.levels.OVERVIEW]] as Array<[string,any]>){
   const response=await fetch(origin+asset.downloadUrl,{signal:AbortSignal.timeout(10000)});assert.equal(response.status,200);
   const bytes=Buffer.from(await response.arrayBuffer());assert.equal(bytes.length,asset.bytes);assert.equal(digest(bytes),asset.sha256);
   images.push({id:level,bytes:bytes.length,sha256:digest(bytes),width:asset.pixels??512,height:asset.pixels??512,data:`data:${response.headers.get('content-type')!.split(';')[0]};base64,${bytes.toString('base64')}`});
  }
  input={scope:'Actual compiled task BFF with explicit Memory/weather ports; public astronomy only, not current weather or native Context identity',spot:{latitude:spot.wgs84.latitude,longitude:spot.wgs84.longitude,timezone:spot.timezone},at,report,point,
   basis:createSkyViewBasis(point[1],90+point[2],0),optical,infrared:{reference:'M:63',publicationHash:backend.publicationHash,level:'OVERVIEW',fieldDegrees:infrared.levels.OVERVIEW.fieldDegrees},images};
  await fs.writeFile(path.join(output,'input.json'),JSON.stringify(input)+'\n',{flag:'wx'});
  await backend.close();backend=undefined;
 }
 const bundle=await build({stdin:{resolveDir:root,contents:"export {createSkyGpuRenderer} from './apps/wechat-miniapp/src/features/sky/sky-gpu-renderer'; export {drawSkyScene} from './apps/wechat-miniapp/src/features/sky/sky-scene-render'; export {registerSkySurvey} from './apps/wechat-miniapp/src/features/sky/sky-survey-registration'; export {skyArtworkUvAtDirection} from './apps/wechat-miniapp/src/features/sky/sky-artwork-registration'; export {unprojectSkyPoint} from './apps/wechat-miniapp/src/features/sky/sky-view-projection';"},bundle:true,write:false,metafile:true,format:'iife',globalName:'skyProduction',platform:'browser',target:'es2022',tsconfig:path.join(root,'apps/wechat-miniapp/tsconfig.json')});
 const sourceHashes=await Promise.all(Object.keys(bundle.metafile!.inputs).filter(file=>file!=='<stdin>').map(async file=>({file,sha256:digest(await fs.readFile(path.join(root,file)))})));
 await fs.writeFile(path.join(output,'production.js'),bundle.outputFiles[0]!.text,{flag:'wx'});
 const require=createRequire(import.meta.url);const {chromium}=require('C:/Users/777/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
 browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader']});
 const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});
 await page.setContent('<style>body{margin:0}canvas{display:block}</style><canvas width="390" height="844"></canvas>');
 await page.evaluate('globalThis.__name = target => target');await page.addScriptTag({content:bundle.outputFiles[0]!.text});
 await page.evaluate(async input=>{
  const decoded=new Map(),ids=new WeakMap();for(const asset of input.images){const image=new Image();image.src=asset.data;await image.decode();if(image.width!==asset.width||image.height!==asset.height)throw Error('image_dimensions');decoded.set(asset.id,image);ids.set(image,asset.id);}
  const gl=document.querySelector('canvas')!.getContext('webgl',{preserveDrawingBuffer:true,antialias:false})!;if(!gl)throw Error('no_webgl');
  const resources={created:0,deleted:0},create=gl.createTexture.bind(gl),remove=gl.deleteTexture.bind(gl);
  gl.createTexture=()=>{const result=create();if(result)resources.created++;return result;};gl.deleteTexture=value=>{if(value)resources.deleted++;remove(value);};
  const failures:string[]=[];const renderer=(globalThis as any).skyProduction.createSkyGpuRenderer(gl,1,{imageFailed:(image:object)=>failures.push(ids.get(image))});
  (globalThis as any).skyInput={...input,decoded,ids,gl,renderer,resources,failures};
 },input);
 const scenarios=[
  {name:'medium-single',level:'MEDIUM',fov:.15}, {name:'medium-composed',level:'MEDIUM',coarser:'OVERVIEW',fov:.15}, {name:'overview-at-medium',level:'OVERVIEW',fov:.15},
  {name:'detail-single',level:'DETAIL',fov:.05}, {name:'detail-composed',level:'DETAIL',coarser:'MEDIUM',fov:.05}, {name:'medium-at-detail',level:'MEDIUM',fov:.05},
  {name:'detail-rejected',level:'DETAIL',coarser:'MEDIUM',fov:.05,rejected:['DETAIL']}, {name:'coarse-rejected',level:'DETAIL',coarser:'MEDIUM',fov:.05,rejected:['MEDIUM']},
  {name:'both-rejected',level:'DETAIL',coarser:'MEDIUM',fov:.05,rejected:['DETAIL','MEDIUM']}, {name:'red-composed',level:'MEDIUM',coarser:'OVERVIEW',fov:.15,mode:'OBSERVATION'},
 ];
 const rows:any[]=[];
 for(const scenario of scenarios){
  const row=await page.evaluate(scenario=>{
   const input=(globalThis as any).skyInput,production=(globalThis as any).skyProduction;
   const field=(level:string)=>({image:input.decoded.get(level),level,fieldDegrees:input.optical.levels[level].fieldDegrees});
   const optical={...field(scenario.level),reference:input.optical.objectRef,publicationHash:input.optical.publicationHash,coarser:scenario.coarser?field(scenario.coarser):null};
   const submissions:string[]=[],failures:string[]=[];
   const surface=new Proxy(input.renderer,{get(target,key){if(key==='artwork')return(image:object,...args:any[])=>{const id=input.ids.get(image);submissions.push(id);if(scenario.rejected?.includes(id))return false;return target.artwork(image,...args);};return Reflect.get(target,key);}});
   const args:any[]=Array(36).fill(undefined);let snapshot:any,sources:any;
   args[0]=surface;args[1]=input.report;args[2]=input.at;args[3]=null;args[4]=null;args[5]=390.4;args[6]=844;args[7]=scenario.mode??'DAY';
   args[8]=(value:any,painted:any)=>{snapshot=value;sources=painted;};args[10]=scenario.fov;args[11]={...input.infrared,image:input.decoded.get('W3')};args[12]=input.basis;args[30]=optical;args[31]=(image:object)=>failures.push(input.ids.get(image));args[34]={enabled:false};args[35]={horizontal:false,equatorial:false};
   const render=()=>{production.drawSkyScene(...args);input.gl.finish();};render();
   const pixels=new Uint8Array(390*844*4);input.gl.readPixels(0,0,390,844,input.gl.RGBA,input.gl.UNSIGNED_BYTE,pixels);
   const encoded=(bytes:Uint8Array)=>{let text='';for(let i=0;i<bytes.length;i+=16384)text+=String.fromCharCode(...bytes.subarray(i,i+16384));return btoa(text);};
   const registration=production.registerSkySurvey(input.point,optical.fieldDegrees,512,256.5);
   const parent=scenario.coarser?production.registerSkySurvey(input.point,input.optical.levels[scenario.coarser].fieldDegrees,512,256.5):null;
   const regions=new Uint8Array(390*844);
   if(parent)for(let y=0;y<844;y++)for(let x=0;x<390;x++){
    const ray=production.unprojectSkyPoint((x+.5)*390.4/390,y+.5,input.basis,390.4,844,scenario.fov);
    const fine=production.skyArtworkUvAtDirection(registration,ray),coarse=production.skyArtworkUvAtDirection(parent,ray);
    const inner=(uv:number[]|null,margin:number)=>uv&&uv.every(n=>n>=margin&&n<=1-margin);
    regions[(843-y)*390+x]=inner(fine,.1)?1:!inner(fine,0)&&inner(coarse,.1)?2:
      inner(fine,0)&&!inner(fine,.08)&&inner(coarse,.1)?3:0;
   }
   const result={name:scenario.name,fov:scenario.fov,mode:scenario.mode??'DAY',paintedOptical:sources?.sdssOpticalImage?input.ids.get(sources.sdssOpticalImage):null,paintedInfrared:sources?.deepSkyImage?input.ids.get(sources.deepSkyImage):null,submissions:[...submissions],rejectedAtSceneBoundary:[...failures],realGpuFailures:[...input.failures],successfulFrame:snapshot?.frameAt,paintedObjects:snapshot?.objects?.map((row:any)=>row.reference)??[],glError:input.gl.getError(),pixels:encoded(pixels),regions:encoded(regions)};
   if(scenario.name==='medium-single'||scenario.name==='medium-composed'){
    for(let i=0;i<8;i++)render();const timings=[];for(let i=0;i<40;i++){const start=performance.now();render();timings.push(performance.now()-start);}timings.sort((a,b)=>a-b);
    Object.assign(result,{timings:{samples:40,medianMs:timings[20],p95Ms:timings[37],maxMs:timings.at(-1),scope:'One software GPU full-scene serial trial with gl.finish; not target frame latency or resource peak'}});
   }
   return result;
  },scenario);
  assert.equal(row.glError,0);assert.equal(row.realGpuFailures.length,0);assert.equal(row.successfulFrame,input.at);
  const pixels=Buffer.from(row.pixels,'base64'),regions=Buffer.from(row.regions,'base64');delete row.pixels;delete row.regions;
  await fs.writeFile(path.join(output,scenario.name+'.rgba'),pixels,{flag:'wx'});await fs.writeFile(path.join(output,scenario.name+'.regions'),regions,{flag:'wx'});
  await page.screenshot({path:path.join(output,scenario.name+'.png')});
  row.imageSha256=digest(await fs.readFile(path.join(output,scenario.name+'.png')));row.rgbaSha256=digest(pixels);
  if(scenario.mode==='OBSERVATION'){assert.equal(row.paintedOptical,null);assert.equal(row.paintedInfrared,null);}
  else if(scenario.rejected?.includes(scenario.level))assert.equal(row.paintedOptical,after&&scenario.name==='detail-rejected'?'MEDIUM':null);
  else assert.equal(row.paintedOptical,scenario.level);
  assert.equal(row.paintedInfrared,row.paintedOptical||scenario.mode==='OBSERVATION'?null:'W3');rows.push(row);
 }
 const resources=await page.evaluate(()=>{const input=(globalThis as any).skyInput;input.renderer.dispose();return input.resources;});assert(resources.created>0);assert.equal(resources.created,resources.deleted);
 const comparisons:any[]=[];
 if(after){
  for(const [fine,parent] of [['medium','overview-at-medium'],['detail','medium-at-detail']]){
   const composed=await fs.readFile(path.join(output,fine+'-composed.rgba')),single=await fs.readFile(path.join(output,fine+'-single.rgba')),coarse=await fs.readFile(path.join(output,parent+'.rgba')),before=await fs.readFile(path.join(base,'before',fine+'-composed.rgba')),mask=await fs.readFile(path.join(output,fine+'-composed.regions'));
   const stats={fine,corePixels:0,changedCore:0,outerPixels:0,changedOuter:0,outerVsCoarse:0,transitionPixels:0,changedTransition:0,changedFromBefore:0,maxDeltaFromBefore:0};
   for(let i=0;i<mask.length;i++){const offset=i*4,equal=(a:Buffer,b:Buffer)=>a.subarray(offset,offset+4).equals(b.subarray(offset,offset+4));
    if(mask[i]===1){stats.corePixels++;if(!equal(composed,single))stats.changedCore++;}
    if(mask[i]===2){stats.outerPixels++;if(!equal(composed,single))stats.changedOuter++;if(!equal(composed,coarse))stats.outerVsCoarse++;}
    if(mask[i]===3){stats.transitionPixels++;if(!equal(composed,single))stats.changedTransition++;}
    if(!equal(composed,before)){stats.changedFromBefore++;for(let c=0;c<4;c++)stats.maxDeltaFromBefore=Math.max(stats.maxDeltaFromBefore,Math.abs(composed[offset+c]!-before[offset+c]!));}
   }
   assert(stats.corePixels>1000);assert.equal(stats.changedCore,0,'opaque fine field retains the exact core pixels');
   if(fine==='medium'){assert(stats.outerPixels>1000);assert(stats.changedOuter>1000,'valid coarse structure must replace empty single-field exterior');}
   else {assert.equal(stats.outerPixels,0,'at the actual minimum 0.05-degree centered view, the detail footprint contains this viewport');assert(stats.transitionPixels>1000);assert(stats.changedTransition>1000,'the real wider field supports the detail taper without changing its opaque core');}
   assert.equal(stats.outerVsCoarse,0,'outside the fine field must use the actual registered coarse image');assert(stats.changedFromBefore>1000);
   assert(single.equals(await fs.readFile(path.join(base,'before',fine+'-single.rgba'))),'unchanged single-field rendering stays byte-identical');comparisons.push(stats);
  }
 }
 const result={scope:'Real production full-scene/GPU with exact public astronomy and hash-bound HTTP originals. Software Chromium/SwiftShader; forced per-image scene rejection verifies consumer recovery, not a native GPU fault. No viewport/native controls/phone/final quality/performance acceptance.',after,spot:input.spot,at:input.at,point:input.point,logicalViewport:{width:390.4,height:844},backingViewport:{width:390,height:844},inputSha256:digest(await fs.readFile(path.join(base,'before/input.json'))),sourceBundleSha256:digest(bundle.outputFiles[0]!.text),sourceHashes,publicationHash:input.optical.publicationHash,assets:input.images.map(({data,...asset}:any)=>asset),rows,resources,comparisons};
 await fs.writeFile(path.join(output,'result.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({output,cases:rows.length,resources,comparisons,timings:rows.filter(row=>row.timings).map(row=>({name:row.name,...row.timings}))}));
} finally {await browser?.close();await backend?.close();}
