// Current public report/resources and existing production Canvas owners.
// Bounded visual diagnosis; no WXML, native lifecycle or device acceptance.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
import {PNG} from 'pngjs';
import {projectAdoptedSkyCatalog} from '../../../../apps/wechat-miniapp/src/services/sky-report-catalog.ts';
import {attachSkyCatalog,resolveSkySceneFrame,resolveSkyDeepSkyScene} from '../../../../apps/wechat-miniapp/src/features/sky/sky-stellar-scene.ts';
import {presentSkyTime} from '../../../../apps/wechat-miniapp/src/features/sky/sky-time-presentation.ts';
import {resolveConstellationFrame} from '../../../../apps/wechat-miniapp/src/features/sky/sky-constellation-scene.ts';
import {createSkyViewBasis} from '../../../../apps/wechat-miniapp/src/features/sky/sky-view-projection.ts';
import {artworkIntersectsView} from '../../../../apps/wechat-miniapp/src/features/sky/sky-artwork-visibility.ts';
import {constellationVisibility} from '../../../../apps/wechat-miniapp/src/features/sky/sky-constellation-visibility.ts';
import {skySolarLightAt} from '../../../../apps/wechat-miniapp/src/features/sky/sky-solar-light.ts';

const task=path.resolve('.codex/work-items/cloud-sky-native-2026-09-22');
const output=path.resolve('output/playwright/cloud-sky-environment-pipeline-1001-r2');
await assert.rejects(fs.access(output),{code:'ENOENT'});await fs.mkdir(output,{recursive:true});
const sha=(raw:Uint8Array|string)=>createHash('sha256').update(raw).digest('hex');
const inputRecords:any[]=[];
const prior=JSON.parse(await fs.readFile('output/playwright/cloud-sky-environment-composition-0930-r3/result.json','utf8'));
const get=async(route:string)=>{
  const pathname=route.split('?')[0],file=path.basename(pathname);
  const local=pathname.includes('/constellations/')&&pathname.includes('/assets/')?'workers/miniapp-api/assets/constellations/'+file:
    pathname.includes('/sky/landscape/')&&file!=='manifest'?'workers/miniapp-api/assets/landscape/'+file:
    pathname.includes('/sky/galactic/')&&file!=='manifest'?'workers/miniapp-api/assets/deep-sky/galactic-2mass/'+file:null;
  if(local){
    const record=prior.inputRecords.find((record:any)=>record.route===route);
    const bytes=await fs.readFile(local);
    if(record){assert.equal(sha(bytes),record.sha256);assert.equal(bytes.length,record.bytes);}
    // Every image/alpha caller also checks the current parsed publication hash
    // and byte count. Extra grid+figure conditions reuse already-owned files.
    const headers=record?.headers??{'content-type':file.endsWith('.png')?'image/png':file.endsWith('.jpg')?'image/jpeg':'application/json'};
    inputRecords.push({route,bytes:bytes.length,sha256:sha(bytes),headers,transport:'BOUND_LOCAL_PUBLICATION_BYTES',path:local,previousBinding:Boolean(record)});return bytes;
  }
  const reply=await fetch('http://127.0.0.1:60065'+route,{signal:AbortSignal.timeout(15000)});
  assert.equal(reply.status,200,route);const bytes=Buffer.from(await reply.arrayBuffer());
  inputRecords.push({route,sha256:sha(bytes),bytes:bytes.length,headers:Object.fromEntries(reply.headers.entries())});
  return bytes;
};
const json=async(route:string)=>JSON.parse((await get(route)).toString());
const reportBytes=await fs.readFile(path.join(task,'tmp/current-native-report-2026-10-01.json'));
const reference=JSON.parse(await fs.readFile(task+'/evidence/experience-twilight-reference-conditions-2026-09-30.json','utf8'));
const referenceBasis=createSkyViewBasis(reference.centerInferredFromArcturusUi.azimuthDeg,90+reference.centerInferredFromArcturusUi.altitudeDeg,0)!;
const referenceFov=720/Math.PI*Math.atan(Math.tan(reference.shortSideFovDegRequested*Math.PI/720)*reference.canvas.cssHeight/reference.canvas.cssWidth);
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
// A screen roll preserves the forward ray. The platform gamma angle is a
// device tilt and must not be passed off as an isolated camera roll.
const lowBasis=createSkyViewBasis(269.62298567015705,100,0)!;
const roll=22*Math.PI/180;
const lowRolledBasis={forward:lowBasis.forward,
  right:lowBasis.right.map((value,index)=>value*Math.cos(roll)+lowBasis.up[index]!*Math.sin(roll)),
  up:lowBasis.up.map((value,index)=>value*Math.cos(roll)-lowBasis.right[index]!*Math.sin(roll))};
const scenarios=[
  {name:'reference-twilight',at:reference.utcAt,fov:referenceFov,mode:'DAY',basis:referenceBasis,grids:false,figures:false},
  {name:'west-noon',at:'2026-09-30T04:00:00.000Z',fov:85,mode:'DAY',basis:horizonBasis},
  {name:'west-sunset',at:'2026-09-30T10:00:00.000Z',fov:85,mode:'DAY',basis:horizonBasis},
  {name:'west-dusk',at:'2026-09-30T10:30:00.000Z',fov:85,mode:'DAY',basis:horizonBasis},
  {name:'west-late-twilight',at:'2026-09-30T11:00:00.000Z',fov:85,mode:'DAY',basis:horizonBasis},
  {name:'west-night',at,fov:85,mode:'DAY',basis:horizonBasis},
  {name:'west-night-off',at,fov:85,mode:'DAY',basis:horizonBasis,landscape:false},
  {name:'west-night-return',at,fov:85,mode:'DAY',basis:horizonBasis},
  {name:'west-night-procedural',at,fov:85,mode:'DAY',basis:horizonBasis,procedural:true},
  {name:'west-red',at,fov:85,mode:'OBSERVATION',basis:horizonBasis},
  {name:'procedural-red',at,fov:85,mode:'OBSERVATION',basis:horizonBasis,procedural:true},
  {name:'twilight-dome',at:reference.utcAt,fov:274.9,mode:'DAY',basis:createSkyViewBasis(0,180,0)!},
  {name:'night-dome',at,fov:274.9,mode:'DAY',basis:createSkyViewBasis(0,180,0)!},
  {name:'day-dome',at:'2026-09-30T04:00:00.000Z',fov:274.9,mode:'DAY',basis:createSkyViewBasis(0,180,0)!},
  {name:'dawn-east',at:'2026-09-30T22:10:00.000Z',fov:85,mode:'DAY',basis:createSkyViewBasis(90,105,0)!},
  {name:'twilight-local-rolled',at:reference.utcAt,fov:9.1,mode:'DAY',basis:lowRolledBasis},
  {name:'altair-wide',at,fov:84.63316191100171,mode:'DAY',basis:altairBasis},
  {name:'altair-without-galactic-image',at,fov:84.63316191100171,mode:'DAY',basis:altairBasis,galacticImage:false},
  {name:'altair-local',at,fov:8.86,mode:'DAY',basis:altairBasis},
  {name:'altair-wide-return',at,fov:84.63316191100171,mode:'DAY',basis:altairBasis},
  {name:'m31-wide',at,fov:5.83,mode:'DAY',basis:m31Basis,deep:true},
  {name:'m31-local',at,fov:.828,mode:'DAY',basis:m31Basis,deep:true},
  {name:'m31-without-image',at,fov:5.83,mode:'DAY',basis:m31Basis},
  {name:'reference-twilight-all-grids',at:reference.utcAt,fov:referenceFov,mode:'DAY',basis:referenceBasis,equatorial:true},
  {name:'reference-twilight-off',at:reference.utcAt,fov:referenceFov,mode:'DAY',basis:referenceBasis,landscape:false,grids:false,figures:false},
  {name:'reference-twilight-return',at:reference.utcAt,fov:referenceFov,mode:'DAY',basis:referenceBasis,grids:false,figures:false},
];
const prepared=scenarios.map(scenario=>{
  const presentation=presentSkyTime(raw,scenario.at);assert(presentation);
  const report=attachSkyCatalog(presentation.report,stars);
  const frame=resolveConstellationFrame(publication,report.skyScene,scenario.at);assert(frame);
  const sun=report.hourly.find(row=>row.at===scenario.at);assert(sun);
  const wanted=scenario.figures!==false&&constellationVisibility(scenario.fov,true)>0?frame.images.filter(image=>
    artworkIntersectsView(image.registration,{basis:scenario.basis,verticalFovDeg:scenario.fov},390,844)).map(image=>image.source):[];
  return {...scenario,report,frame,wanted,sun:skySolarLightAt(report.hourly,scenario.at),sunAltitudeDeg:sun.sunAltitudeDeg,sunAzimuthDeg:sun.sunAzimuthDeg};
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
const buildOptions={stdin:{resolveDir:path.resolve('.'),contents:
  "export {createSkyGpuRenderer} from './apps/wechat-miniapp/src/features/sky/sky-gpu-renderer';export {drawSkyScene} from './apps/wechat-miniapp/src/features/sky/sky-scene-render';export {selectSkyLandscapeResource} from './apps/wechat-miniapp/src/features/sky/sky-landscape-resources';export {createSkyPanoramaMask} from './apps/wechat-miniapp/src/features/sky/sky-landscape-mask';export {decodeSkyLandscapeAlpha} from './packages/miniapp-contracts/src/sky-landscape-publication';export {startDeepSkyImageRequest} from './apps/wechat-miniapp/src/features/sky/deep-sky-image-request';export {projectSkyDirection} from './apps/wechat-miniapp/src/features/sky/sky-view-projection';export {paintedSkyPointVisible,pickPaintedSkyObjects} from './apps/wechat-miniapp/src/features/sky/sky-object-picking';"},
  bundle:true,write:false,metafile:true,format:'iife',globalName:'composition49',platform:'browser',target:'es2022',tsconfig:path.resolve('apps/wechat-miniapp/tsconfig.json')} as const;
const versions=[];
const replacements={before:await fs.readFile(task+'/tmp/environment-transfer-before-renderer-2026-10-01.ts','utf8'),
  current:await fs.readFile('output/playwright/cloud-sky-twilight-pipeline-1001/experiment-renderer.ts','utf8')};
for(const name of ['before','current']){
  const compiled=await build({...buildOptions,plugins:[{name:'bounded-pipeline-owner',setup(builder){
    builder.onLoad({filter:/[\\/]sky-gpu-renderer\.ts$/},()=>({contents:replacements[name as keyof typeof replacements],loader:'ts'}));
  }}]});
  const production=compiled.outputFiles[0]!.text;
  const sourceHashes=await Promise.all(Object.keys(compiled.metafile!.inputs).filter(file=>file!=='<stdin>').map(async file=>({path:file,
    sha256:sha(path.basename(file)==='sky-gpu-renderer.ts'?replacements[name as keyof typeof replacements]:await fs.readFile(file))})));
  await fs.writeFile(path.join(output,name+'.js'),production,{flag:'wx'});versions.push({name,production,sourceHashes});
}
console.log(JSON.stringify({phase:'current-inputs-ready',constellationHash:publication.catalogHash,galacticHash:galactic.publicationHash,landscapeHash:landscape.publicationHash}));
const {chromium}=createRequire(import.meta.url)('C:/Users/777/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader']});
const versionsResult:any[]=[];
try{
for(const version of versions){
  const production=version.production,rows:any[]=[];
  const page=await browser.newPage({viewport:{width:390,height:844}});const errors:string[]=[];
  page.on('pageerror',(error:any)=>errors.push(String(error)));
  await page.setContent('<style>body{margin:0}canvas{display:block}</style><canvas width="390" height="844"></canvas>');
  await page.evaluate('globalThis.__name=target=>target');await page.addScriptTag({content:production});
  await page.evaluate(async(input:any)=>{
    const api=(globalThis as any).composition49;const decoded=new Map();
    for(const asset of input.images){const image=new Image();image.src=asset.data;await image.decode();decoded.set(asset.id,image);}
    const masks=new Map(input.masks.map((row:any)=>[row.resource.id,api.createSkyPanoramaMask(input.landscape,row.resource,api.decodeSkyLandscapeAlpha(row.encoded,row.resource))]));
    const gl=document.querySelector('canvas')!.getContext('webgl',{preserveDrawingBuffer:true,antialias:false})!;if(!gl)throw Error('no_webgl');
    const resources:any={textures:new Set(),buffers:new Set(),programs:new Set(),shaders:new Set()};
    const created:any={textures:0,buffers:0,programs:0,shaders:0};
    for(const [noun,key] of [['Texture','textures'],['Buffer','buffers'],['Program','programs'],['Shader','shaders']]){
      const create=(gl as any)['create'+noun].bind(gl),remove=(gl as any)['delete'+noun].bind(gl);
      (gl as any)['create'+noun]=(...args:any[])=>{const value=create(...args);if(value){resources[key].add(value);created[key]++;}return value;};
      (gl as any)['delete'+noun]=(value:any)=>{resources[key].delete(value);remove(value);};
    }
    const failures:string[]=[];const renderer=api.createSkyGpuRenderer(gl,1,{imageFailed:()=>failures.push('GPU image failure')});
    const fileCounts={writes:0,removes:0,failed:0};let ready:any;
    api.startDeepSkyImageRequest({asset:{reference:'M:31',level:'OVERVIEW',tempFilePath:'/owned/m31.jpg'},url:'/actual-HTTP-body',
      request:(options:any)=>{options.success({statusCode:200,header:input.m31Headers,data:Uint8Array.from(atob(input.m31Base64),(c:string)=>c.charCodeAt(0)).buffer});return{};},
      writeFile:(options:any)=>{fileCounts.writes++;options.success();},removeFile:()=>{fileCounts.removes++;},
      onReady:(asset:any)=>ready=asset,onError:()=>{fileCounts.failed++;}});
    if(!ready||fileCounts.failed)throw Error('image_owner_failed');
    const m31=new Image();m31.src='data:image/jpeg;base64,'+input.m31Base64;await m31.decode();
    (globalThis as any).compositionInput={api,decoded,masks,gl,renderer,resources,created,failures,landscape:input.landscape,deep:{...ready,image:m31},fileCounts};
  },{images:[...images.values()],masks,landscape,m31Headers,m31Base64:imageBytes.toString('base64')});
  for(const scenario of prepared){
    const row=await page.evaluate((scenario:any)=>{
      const input=(globalThis as any).compositionInput,atlas=new Map(scenario.wanted.map((asset:any)=>[asset.id,input.decoded.get(asset.id)]));
      const bytes=()=>{const p=new Uint8Array(390*844*4);input.gl.readPixels(0,0,390,844,input.gl.RGBA,input.gl.UNSIGNED_BYTE,p);let b='';for(let i=0;i<p.length;i+=32768)b+=String.fromCharCode(...p.subarray(i,i+32768));return btoa(b);};
      const readSamples=()=>[['solar-low',scenario.sunAzimuthDeg,2],['solar-ten',scenario.sunAzimuthDeg,10],['upper',scenario.sunAzimuthDeg,50],['opposite-ten',(scenario.sunAzimuthDeg+180)%360,10],['ground',scenario.sunAzimuthDeg,-10]].map(([label,az,alt]:any)=>{
        const point=input.api.projectSkyDirection(az,alt,scenario.basis,390,844,scenario.fov);if(!point)return {label,outside:true};
        const pixel=new Uint8Array(4);input.gl.readPixels(Math.floor(point.x),843-Math.floor(point.y),1,1,input.gl.RGBA,input.gl.UNSIGNED_BYTE,pixel);
        return {label,azimuthDeg:az,altitudeDeg:alt,x:point.x,y:point.y,rgba:Array.from(pixel)};
      });
      let solarBase64=null,solarSamples=null;
      if(scenario.mode!=='OBSERVATION'){
        input.renderer.begin(390,844,'#080D17');if(!input.renderer.solarLight({basis:scenario.basis,verticalFovDeg:scenario.fov},scenario.sun))throw Error('solar pass failed');
        input.renderer.finish();input.gl.finish();solarBase64=bytes();solarSamples=readSamples();
      }
      const galactic=scenario.galacticImage===false?null:input.decoded.get('galactic');
      const resource=input.api.selectSkyLandscapeResource(input.landscape,[...atlas.values(),...(galactic?[galactic]:[]),...(scenario.deep?[input.deep.image]:[])],false);
      let snapshot:any,sources:any;const failuresBefore=input.failures.length;
      const args:any[]=Array(36).fill(undefined);Object.assign(args,{0:input.renderer,1:scenario.report,2:scenario.at,3:null,4:null,5:390,6:844,7:scenario.mode,
        8:(value:any,painted:any)=>{snapshot=value;sources=painted;},10:scenario.fov,11:scenario.deep?input.deep:null,12:scenario.basis,
        15:{frame:scenario.frame,images:atlas,enabled:scenario.figures!==false,failed:()=>input.failures.push('constellation image failure')},
        26:galactic,34:{enabled:scenario.landscape!==false,panorama:scenario.procedural?null:{image:input.decoded.get('landscape:'+resource.id),mask:input.masks.get(resource.id)}},35:{horizontal:scenario.grids!==false,equatorial:scenario.equatorial===true}});
      input.api.drawSkyScene(...args);input.gl.finish();
      const pixels=new Uint8Array(390*844*4);input.gl.readPixels(0,0,390,844,input.gl.RGBA,input.gl.UNSIGNED_BYTE,pixels);
      let binary='';for(let i=0;i<pixels.length;i+=32768)binary+=String.fromCharCode(...pixels.subarray(i,i+32768));
      return {frameAt:snapshot?.frameAt,paintedLandscape:snapshot?.view.landscape?.resource?.id,paintedDeepSky:sources?.deepSkyImage===input.deep.image,
        references:snapshot?.objects.map((object:any)=>object.reference),
        picks:snapshot.objects.map((object:any)=>({reference:object.reference,visible:input.api.paintedSkyPointVisible(snapshot,object.x,object.y),
          hit:input.api.pickPaintedSkyObjects(snapshot,object.x,object.y).some((pick:any)=>pick.reference===object.reference)})),
        hasLandscape:Boolean(snapshot.view.landscape),solarBase64,solarSamples,sceneSamples:readSamples(),
        glError:input.gl.getError(),failed:input.failures.length-failuresBefore,rgbaBase64:btoa(binary)};
    },scenario);
    assert.equal(row.glError,0);assert.equal(row.failed,0);assert.equal(row.frameAt,scenario.at);assert.equal(row.hasLandscape,scenario.landscape!==false);
    const file=version.name+'-'+scenario.name+'.png';await page.locator('canvas').screenshot({path:path.join(output,file)});
    const {report,frame,wanted,sun,...condition}=scenario;const {rgbaBase64,solarBase64,...effect}=row;
    rows.push({condition,eligibleImages:wanted.map(asset=>asset.id),...effect,solarRgbaSha256:solarBase64?sha(Buffer.from(solarBase64,'base64')):null,
      rgbaSha256:sha(Buffer.from(rgbaBase64,'base64')),image:file,imageSha256:sha(await fs.readFile(path.join(output,file)))});
  }
  assert.equal(rows.find(row=>row.condition.name==='altair-wide')!.rgbaSha256,rows.find(row=>row.condition.name==='altair-wide-return')!.rgbaSha256);
  for(const pair of [['west-night','west-night-return'],['reference-twilight','reference-twilight-return']])
    assert.equal(rows.find(row=>row.condition.name===pair[0])!.rgbaSha256,rows.find(row=>row.condition.name===pair[1])!.rgbaSha256);
  for(const name of ['m31-wide','m31-local'])assert.equal(rows.find(row=>row.condition.name===name)!.paintedDeepSky,true);
  const retired=await page.evaluate(()=>{const input=(globalThis as any).compositionInput;input.renderer.dispose();input.deep.release();return {
    resources:Object.fromEntries(Object.entries(input.resources).map(([key,value]:any)=>[key,value.size])),created:input.created,
    fileCounts:input.fileCounts,failures:input.failures,glError:input.gl.getError()};});
  assert(Object.values(retired.resources).every(value=>value===0));assert.equal(retired.glError,0);assert.equal(retired.fileCounts.writes,retired.fileCounts.removes);assert.equal(retired.fileCounts.failed,0);assert.equal(errors.length,0);
  versionsResult.push({name:version.name,productionBundleSha256:sha(production),sourceHashes:version.sourceHashes,rows,retired,errors});
  await page.close();
}
  const before=versionsResult[0].rows,current=versionsResult[1].rows;
  const byName=(rows:any[],name:string)=>rows.find(row=>row.condition.name===name);
  const unchanged=[];
  for(let index=0;index<current.length;index++){
    const a=current[index],b=before[index];assert.equal(a.condition.name,b.condition.name);
    assert.deepEqual(a.references,b.references);assert.deepEqual(a.picks,b.picks,'changed identity/picking: '+a.condition.name);
    if(a.condition.sunAltitudeDeg<=-18||a.condition.mode==='OBSERVATION'){
      assert.equal(a.rgbaSha256,b.rgbaSha256,'night/red composite must remain identical: '+a.condition.name);unchanged.push(a.condition.name);
    }
  }
  assert.deepEqual(versionsResult[0].retired,versionsResult[1].retired,'no additional GPU allocation or failed image/resource retirement');
  const oldTwilight=byName(before,'reference-twilight'),newTwilight=byName(current,'reference-twilight');
  const sample=(row:any,label:string)=>row.solarSamples.find((sample:any)=>sample.label===label).rgba;
  assert(sample(newTwilight,'solar-ten')[0]>sample(oldTwilight,'solar-ten')[0]*2,'visible twilight must escape the former cap');
  assert.deepEqual(sample(newTwilight,'ground'),sample(oldTwilight,'ground'),'atmosphere must not invent below-horizon light');
  const changed=current.filter((row:any,index:number)=>row.rgbaSha256!==before[index].rgbaSha256).map((row:any)=>row.condition.name);
  const result={scope:'Bounded complete software WebGL1 scene composition trial of the linear-display pipeline; no production adoption/native acceptance',
    reportSha256:sha(reportBytes),reference,observer:raw.skyScene.observer,viewport:{width:390,height:844,deviceScale:1},inputRecords,
    versions:versionsResult,regression:{unchangedNightAndRed:unchanged,changed,identityAndPickingUnchanged:true,noAdditionalGpuResources:true},
    limits:['BSC/88 figures/2MASS/landscape/M31 use existing actual source bytes; no SAO/W3/fine planet or Moon refinement in this bounded batch',
      'Temporary software times/camera perform no Context mutation; predecoded images do not measure native memory, loading or OS recovery',
      'Twilight reference luminance improves in finite rays; spectral/low-horizon mismatch and complete environment quality remain open']};
  await fs.writeFile(path.join(output,'result.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify({output,conditions:current.length,regression:result.regression,retired:versionsResult.map(row=>row.retired)}));
}finally{await browser.close();}
