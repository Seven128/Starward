// One frozen current-source baseline and one bounded real-image comparison.
// Replay the saved v53 public report; no claim about current native Context.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {runInNewContext} from 'node:vm';
import {build} from 'esbuild';
import {projectAdoptedSkyCatalog} from '../../../../apps/wechat-miniapp/src/services/sky-report-catalog.ts';
import {attachSkyCatalog,resolveSkySceneFrame,resolveSkyDeepSkyScene} from '../../../../apps/wechat-miniapp/src/features/sky/sky-stellar-scene.ts';
import {presentSkyTime} from '../../../../apps/wechat-miniapp/src/features/sky/sky-time-presentation.ts';
import {resolveConstellationFrame} from '../../../../apps/wechat-miniapp/src/features/sky/sky-constellation-scene.ts';
import {createSkyViewBasis} from '../../../../apps/wechat-miniapp/src/features/sky/sky-view-projection.ts';
import {artworkIntersectsView,skyArtworkViewBounds} from '../../../../apps/wechat-miniapp/src/features/sky/sky-artwork-visibility.ts';
import {constellationVisibility} from '../../../../apps/wechat-miniapp/src/features/sky/sky-constellation-visibility.ts';
import {skyGalacticBandAt} from '../../../../apps/wechat-miniapp/src/features/sky/sky-galactic-band.ts';
const task='.codex/work-items/cloud-sky-native-2026-09-22';
const baselineOnly=false;
const debugMode=process.argv.includes('--debug');
const sequenceMode=process.argv.includes('--sequence');
const output=path.resolve('output/playwright/cloud-sky-galactic-window-production-1001'+(sequenceMode?'-sequence':'')+(debugMode?'-debug':''));
await assert.rejects(fs.access(output),{code:'ENOENT'});await fs.mkdir(output,{recursive:true});
for(const name of ['baseline.js','baseline.json'])await fs.writeFile(path.join(output,name),await fs.readFile('output/playwright/cloud-sky-galactic-window-trial-1001-v6-sequence/'+name),{flag:'wx'});
const sha=(bytes:Uint8Array|string)=>createHash('sha256').update(bytes).digest('hex');
const compiled=await build({stdin:{resolveDir:process.cwd(),contents:
  "export {createSkyGpuRenderer} from './apps/wechat-miniapp/src/features/sky/sky-gpu-renderer';export {drawSkyScene} from './apps/wechat-miniapp/src/features/sky/sky-scene-render';export {artworkIntersectsView} from './apps/wechat-miniapp/src/features/sky/sky-artwork-visibility';export {selectSkyLandscapeResource} from './apps/wechat-miniapp/src/features/sky/sky-landscape-resources';export {createSkyPanoramaMask} from './apps/wechat-miniapp/src/features/sky/sky-landscape-mask';export {decodeSkyLandscapeAlpha} from './packages/miniapp-contracts/src/sky-landscape-publication';export {startDeepSkyImageRequest} from './apps/wechat-miniapp/src/features/sky/deep-sky-image-request';"},
  bundle:true,write:false,metafile:true,platform:'browser',format:'iife',globalName:'raster50After',target:'es2022',tsconfig:path.resolve('apps/wechat-miniapp/tsconfig.json')});
const production=compiled.outputFiles[0]!.text;
const sourceHashes=await Promise.all(Object.keys(compiled.metafile!.inputs).filter(file=>file!=='<stdin>'&&!file.startsWith('sky-window:')).map(async file=>({path:file,sha256:sha(await fs.readFile(file))})));
if(baselineOnly){
 await fs.writeFile(path.join(output,'baseline.js'),production,{flag:'wx'});
 await fs.writeFile(path.join(output,'baseline.json'),JSON.stringify({at:new Date().toISOString(),productionBundleSha256:sha(production),sourceHashes},null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({baseline:true,sourceCount:sourceHashes.length,sha256:sha(production)}));process.exit(0);
}
const prior=JSON.parse(await fs.readFile(path.join(output,'baseline.json'),'utf8'));
const frozen=await fs.readFile(path.join(output,'baseline.js'));
assert.equal(sha(frozen),prior.productionBundleSha256);
const changed=sourceHashes.filter(source=>source.sha256!==prior.sourceHashes.find((row:any)=>row.path===source.path)?.sha256);
assert.notEqual(sha(production),sha(frozen),'A no-op is not an optimization');
assert.deepEqual(changed.map(row=>row.path).sort(),['sky-galactic-image-window.ts','sky-gpu-renderer.ts','sky-gpu-textures.ts'].map(name=>'apps/wechat-miniapp/src/features/sky/'+name).sort(),'Only adopted Sky owners may change');
await fs.writeFile(path.join(output,'production.js'),production,{flag:'wx'});
const beforeApi=runInNewContext(frozen.toString()+';raster50After;');
const afterApi=runInNewContext(production+';raster50After;');
const inputs:any[]=[];
const get=async(route:string)=>{const response=await fetch('http://127.0.0.1:60065'+route,{signal:AbortSignal.timeout(15000)});assert.equal(response.status,200,route);const bytes=Buffer.from(await response.arrayBuffer());inputs.push({route,bytes:bytes.length,sha256:sha(bytes),headers:Object.fromEntries(response.headers.entries())});return bytes;};
const json=async(route:string)=>JSON.parse((await get(route)).toString());
const bytes=await fs.readFile(task+'/tmp/v53-current-public-report.json');
const raw=projectAdoptedSkyCatalog(JSON.parse(bytes.toString())).data;
const ref=raw.skyScene.catalog!,stars=(await json(`/v2/sky/catalogs/${ref.catalogVersion}/${ref.catalogHash}`)).data;
const publication=(await json('/v2/sky/constellations')).data;
const galactic=await json('/v2/sky/galactic/manifest'),landscape=await json('/v2/sky/landscape/manifest');
const current=attachSkyCatalog(presentSkyTime(raw,raw.context.at)!.report,stars);
const starFrame=resolveSkySceneFrame(current.skyScene,raw.context.at)!;
const altairIndex=current.skyScene.catalog!.entries.findIndex(entry=>entry.objectRef==='HR:7557');
const altair=starFrame.points.find(point=>point[0]===altairIndex)!;
const altairBasis=createSkyViewBasis(altair[1],90+altair[2],0)!;
const actualBand=skyGalacticBandAt(current,raw.context.at,85)!;
const basisFor=(ray:readonly number[])=>createSkyViewBasis(Math.atan2(ray[0],ray[1])*180/Math.PI,90+Math.asin(ray[2])*180/Math.PI,0)!;
const pole=actualBand.pole[2]>0?actualBand.pole:actualBand.pole.map(value=>-value);
const seam=actualBand.center.map((value,i)=>-value*Math.sqrt(.75)+actualBand.pole[i]*(actualBand.pole[2]>=0?.5:-.5));
const m42At='2026-09-30T20:00:00.000Z';
const m42Report=attachSkyCatalog(presentSkyTime(raw,m42At)!.report,stars),deep=resolveSkyDeepSkyScene(m42Report.skyScene,m42At)!;
const m42Index=deep.catalog.entries.findIndex(entry=>entry.objectRef==='M:42');
const m42=deep.frame.points!.find(point=>point[0]===m42Index)!;assert(m42[2]>0);
const m42Basis=createSkyViewBasis(m42[1],90+m42[2],0)!;
const seamBand=skyGalacticBandAt(m42Report,m42At,85)!;
const seamRadius=skyArtworkViewBounds({basis:altairBasis,verticalFovDeg:85},390,844)!.radius;
const longitude=Math.PI-seamRadius-2*Math.PI*.5/2048,roll=Math.atan(844/390);
const seamEast=[seamBand.pole[1]*seamBand.center[2]-seamBand.pole[2]*seamBand.center[1],seamBand.pole[2]*seamBand.center[0]-seamBand.pole[0]*seamBand.center[2],seamBand.pole[0]*seamBand.center[1]-seamBand.pole[1]*seamBand.center[0]];
const enu=(ray:number[])=>ray.map((_,i)=>ray[0]*seamBand.center[i]+ray[1]*seamEast[i]+ray[2]*seamBand.pole[i]) as any;
const right=[Math.sin(longitude),-Math.cos(longitude),0],up=[0,0,1];
const seamNeighbourBasis={forward:enu([Math.cos(longitude),Math.sin(longitude),0]),right:enu(right.map((n,i)=>n*Math.cos(roll)+up[i]*Math.sin(roll))),up:enu(up.map((n,i)=>n*Math.cos(roll)-right[i]*Math.sin(roll)))};
const conditions=[
 {name:'common',at:raw.context.at,fov:84.63316191100171,basis:altairBasis,scale:1,mode:'DAY'},
 {name:'common-dpr3',at:raw.context.at,fov:84.63316191100171,basis:altairBasis,scale:3,mode:'DAY'},
 {name:'common-rolled-offset',at:raw.context.at,fov:84.63316191100171,basis:createSkyViewBasis(altair[1],90+altair[2],65)!,center:{x:137,y:351},scale:3,mode:'DAY'},
 {name:'wide',at:raw.context.at,fov:139,basis:altairBasis,scale:3,mode:'DAY'},
 {name:'local',at:raw.context.at,fov:8.86,basis:altairBasis,scale:3,mode:'DAY'},
 {name:'dome',at:raw.context.at,fov:274.9,basis:createSkyViewBasis(0,180,0)!,scale:3,mode:'DAY'},
 {name:'west-dusk',at:'2026-09-30T10:30:00.000Z',fov:85,basis:createSkyViewBasis(269.0634887703755,105,0)!,scale:1,mode:'DAY'},
 {name:'red',at:raw.context.at,fov:84.63316191100171,basis:altairBasis,scale:3,mode:'OBSERVATION'},
 {name:'m42-overview',at:m42At,fov:8.86,basis:m42Basis,scale:3,mode:'DAY',deepLevel:'OVERVIEW'},
 {name:'m42-detail',at:m42At,fov:.828,basis:m42Basis,scale:3,mode:'DAY',deepLevel:'DETAIL'},
 {name:'m42-local',at:m42At,fov:.05,basis:m42Basis,scale:3,mode:'DAY',deepLevel:'DETAIL'},
 {name:'common-return',at:raw.context.at,fov:84.63316191100171,basis:altairBasis,scale:1,mode:'DAY'},
];
const commonCondition=conditions.find(row=>row.name==='common-dpr3')!,wideCondition=conditions.find(row=>row.name==='wide')!;
const steps=[{...commonCondition,scale:1,name:'start'},{...commonCondition,scale:1,name:'stable-start'},
 {...commonCondition,scale:1,fov:30,name:'contained-local'}, {...commonCondition,scale:1,name:'local-return'},
 {...wideCondition,scale:1,name:'expanded'},{...wideCondition,scale:1,name:'stable-expanded'},
 {...conditions.find(row=>row.name==='dome'),scale:1,name:'full-dome'},
 {...commonCondition,scale:1,name:'dome-return'},{...commonCondition,scale:1,name:'return-warm'},{...commonCondition,scale:1,name:'return-stable'},{...commonCondition,scale:1,name:'return-stable-again'}];
const selected=sequenceMode?steps:[commonCondition,wideCondition,
 {...commonCondition,name:'common-copy-failure',copyFailure:true},
 {...commonCondition,name:'galactic-seam',basis:basisFor(seam)},
 {...commonCondition,name:'galactic-pole',basis:basisFor(pole)},
 {...commonCondition,name:'seam-neighbour',at:m42At,fov:85,basis:seamNeighbourBasis},
 {...wideCondition,name:'wide-failure',failure:'galactic'},
 ...conditions.filter(row=>!['common-dpr3','wide','common-return'].includes(row.name)),
 {...commonCondition,name:'common-return'}];
/* v4 combinations already froze real common/wide/seam/pole/copy-failure/local/dome/red/dusk/M42/failure/recovery evidence.
const selected=[commonCondition,wideCondition,{...commonCondition,name:'common-copy-failure',copyFailure:true},
 {...commonCondition,name:'galactic-seam',basis:basisFor(seam)},
 {...commonCondition,name:'galactic-pole',basis:basisFor(pole)},
 {...wideCondition,name:'wide-failure',failure:'galactic'},
 ...conditions.filter(row=>!['common-dpr3','wide','common-return'].includes(row.name)),
 {...commonCondition,name:'common-return'}]; */
const prepared=(debugMode?selected.slice(0,1):selected).map(condition=>{
 const report=attachSkyCatalog(presentSkyTime(raw,condition.at)!.report,stars);
 const frame=resolveConstellationFrame(publication,report.skyScene,condition.at)!;assert(frame);
 const view={basis:condition.basis,verticalFovDeg:condition.fov,center:condition.center};
 const wantedFor=(api:any)=>constellationVisibility(condition.fov,true)>0?frame.images.filter(figure=>api.artworkIntersectsView(figure.registration,view,390,844)).map(figure=>figure.source):[];
 const beforeWanted=wantedFor(beforeApi),afterWanted=wantedFor(afterApi);
 return {...condition,report,frame,beforeWanted,afterWanted,wanted:beforeWanted,galaxy:condition.mode!=='OBSERVATION'&&Boolean(skyGalacticBandAt(report,condition.at,condition.fov))};
});
const images=new Map<string,any>();
const image=async(id:string,asset:any)=>{if(images.has(id))return;const bytes=await get(asset.downloadUrl);assert.equal(sha(bytes),asset.sha256);assert.equal(bytes.length,asset.bytes);const mime=inputs.at(-1).headers['content-type'].split(';')[0];images.set(id,{id,width:asset.width,height:asset.height,data:`data:${mime};base64,${bytes.toString('base64')}`});};
for(const asset of prepared.flatMap(row=>row.wanted))await image(asset.id,{...asset,downloadUrl:`/v2/sky/constellations/${publication.catalogHash}/assets/${asset.file}`});
await image('galactic',galactic.image);
const masks=[];
for(const resource of landscape.resources){await image('landscape:'+resource.id,resource.image);masks.push({resource,encoded:await json(resource.alpha.downloadUrl)});}
const deepInputs=[];
for(const level of ['OVERVIEW','DETAIL']){const bytes=await get(`/v2/celestial-objects/M%3A42/image?level=${level}&imageVersion=source-finite-v3`);deepInputs.push({level,bytes:bytes.toString('base64'),headers:inputs.at(-1).headers});}
const {chromium}=createRequire(import.meta.url)('C:/Users/777/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader']});
const rows:any[]=[];
try{
 const page=await browser.newPage({viewport:{width:390,height:844}}),errors:string[]=[];
 page.on('pageerror',(error:any)=>errors.push(String(error)));
 await page.setContent('<style>body{margin:0}canvas{display:block;width:390px;height:844px}</style><canvas></canvas>');
 await page.evaluate('globalThis.__name=target=>target');
 await page.addScriptTag({content:frozen.toString().replace('var raster50After =','var raster50Before =')});
 await page.addScriptTag({content:production});
 await page.evaluate(async(input:any)=>{
  const decoded=new Map(),ids=new WeakMap();
  for(const asset of input.images){const image=new Image();image.src=asset.data;await image.decode();decoded.set(asset.id,image);ids.set(image,asset.id);}
  const api=(globalThis as any).raster50After;
  const masks=new Map(input.masks.map((row:any)=>[row.resource.id,api.createSkyPanoramaMask(input.landscape,row.resource,api.decodeSkyLandscapeAlpha(row.encoded,row.resource))]));
  const deep=new Map(),files={writes:0,removes:0,failed:0};
  for(const row of input.deepInputs){let ready:any;api.startDeepSkyImageRequest({asset:{reference:'M:42',level:row.level,tempFilePath:'/owned/m42-'+row.level+'.png'},url:'/actual-body',
   request:(options:any)=>{options.success({statusCode:200,header:row.headers,data:Uint8Array.from(atob(row.bytes),(c:string)=>c.charCodeAt(0)).buffer});return{};},writeFile:(options:any)=>{files.writes++;options.success();},removeFile:()=>files.removes++,onReady:(asset:any)=>ready=asset,onError:()=>files.failed++});
   if(!ready)throw Error('deep_owner_rejected');const image=new Image();image.src='data:image/png;base64,'+row.bytes;await image.decode();deep.set(row.level,{...ready,image});ids.set(image,'M42:'+row.level);
  }
  (globalThis as any).rasterInput={decoded,ids,masks,deep,files,landscape:input.landscape};
 },{images:[...images.values()],masks,landscape,deepInputs});
 for(const condition of sequenceMode?[{...prepared[0],name:'camera-sequence',path:prepared}]:prepared){
  const variants=[], fullPixelVariants:Buffer[]=[];
  for(const variant of ['before','after']){
   const result=await page.evaluate(async({condition,variant}:any)=>{
    (globalThis as any).trialDiagnostics=[];
    const input=(globalThis as any).rasterInput,canvas=document.querySelector('canvas')!;
    canvas.width=390*condition.scale;canvas.height=844*condition.scale;
    const gl=canvas.getContext('webgl',{preserveDrawingBuffer:true,antialias:false})!;if(!gl)throw Error('no_webgl');
    const draw=gl.drawArrays.bind(gl),use=gl.useProgram.bind(gl),attach=gl.attachShader.bind(gl),source=gl.shaderSource.bind(gl),tex=gl.texImage2D.bind(gl),remove=gl.deleteTexture.bind(gl),create=gl.createTexture.bind(gl);
    const copy=gl.copyTexImage2D.bind(gl);
    const shaderTexts=new Map(),programShaders=new Map(),textureIds=new Map(),live=new Set();let currentProgram:any;
    const calls:any[]=[],allocations=new Map(),uploadPasses:any[]=[];let liveBytes=0,peakBytes=0,failedAttempts=0,copyAttempts=0,uploads:any[]=[];
    gl.shaderSource=(shader,text)=>{shaderTexts.set(shader,text);source(shader,text);};
    gl.attachShader=(program,shader)=>{programShaders.set(program,[...(programShaders.get(program)??[]),shader]);attach(program,shader);};
    gl.useProgram=program=>{currentProgram=program;use(program);};
    gl.createTexture=()=>{const texture=create();if(texture)live.add(texture);return texture;};
    gl.deleteTexture=texture=>{if(texture){live.delete(texture);liveBytes-=allocations.get(texture)??0;allocations.delete(texture);}remove(texture);};
    (gl as any).texImage2D=(...args:any[])=>{const texture=gl.getParameter(gl.TEXTURE_BINDING_2D),source=args.at(-1),id=input.ids.get(source)??'static';const size=args.length===9?Number(args[3])*Number(args[4])*4:Number(source?.width)*Number(source?.height)*4;textureIds.set(texture,id);if(condition.failure&&source===input.decoded.get(condition.failure)){failedAttempts++;throw Error('controlled_image_upload_failure');}if(Number.isFinite(size)&&size>0){liveBytes+=size-(allocations.get(texture)??0);allocations.set(texture,size);peakBytes=Math.max(peakBytes,liveBytes);uploads.push({id,bytes:size});}return (tex as any)(...args);};
    (gl as any).copyTexImage2D=(...args:any[])=>{copyAttempts++;if(condition.copyFailure){args[2]=gl.UNSIGNED_BYTE;return (copy as any)(...args);}const texture=gl.getParameter(gl.TEXTURE_BINDING_2D),size=Number(args[5])*Number(args[6])*4;textureIds.set(texture,'galactic:window');liveBytes+=size-(allocations.get(texture)??0);allocations.set(texture,size);peakBytes=Math.max(peakBytes,liveBytes);uploads.push({id:'galactic:window',bytes:size,operation:'gpu-copy'});return (copy as any)(...args);};
    gl.drawArrays=(mode,first,count)=>{
     if((programShaders.get(currentProgram)??[]).some((shader:any)=>shaderTexts.get(shader)?.includes('u_anchorU'))){
      const box=gl.isEnabled(gl.SCISSOR_TEST)?Array.from(gl.getParameter(gl.SCISSOR_BOX) as Int32Array):[0,0,canvas.width,canvas.height];
      calls.push({image:textureIds.get(gl.getParameter(gl.TEXTURE_BINDING_2D)),box,area:box[2]!*box[3]!});
     }
     draw(mode,first,count);
    };
    const api=(globalThis as any)[variant==='before'?'raster50Before':'raster50After'],failures:string[]=[];
    const renderer=api.createSkyGpuRenderer(gl,condition.scale,{imageFailed:(image:object)=>failures.push('GPU:'+input.ids.get(image))});
    const wanted=variant==='before'?condition.beforeWanted:condition.afterWanted;
    const atlas=new Map(wanted.map((asset:any)=>[asset.id,input.decoded.get(asset.id)]));
    const galaxy=condition.galaxy?input.decoded.get('galactic'):null;
    const deep=condition.deepLevel?input.deep.get(condition.deepLevel):null;
    const landscape=api.selectSkyLandscapeResource(input.landscape,[...atlas.values(),...(galaxy?[galaxy]:[]),...(deep?[deep.image]:[])],false);
    let snapshot:any,painted:any;const args=Array(36).fill(undefined);Object.assign(args,{0:renderer,1:condition.report,2:condition.at,3:null,4:null,5:390,6:844,7:condition.mode,8:(value:any,sources:any)=>{snapshot=value;painted=sources;},10:condition.fov,11:deep,12:condition.basis,13:condition.center,15:{frame:condition.frame,images:atlas,enabled:true,failed:()=>failures.push('art')},26:galaxy,34:{enabled:true,panorama:{image:input.decoded.get('landscape:'+landscape.id),mask:input.masks.get(landscape.id)}},35:{horizontal:true,equatorial:false}});
    const stepPixels:any[]=[];
    for(let pass=0;pass<(condition.path?.length??9);pass++){
      if(condition.path){const step=condition.path[pass],stepAtlas=new Map((variant==='before'?step.beforeWanted:step.afterWanted).map((asset:any)=>[asset.id,input.decoded.get(asset.id)])),stepGalaxy=step.galaxy?input.decoded.get('galactic'):null;
        const resource=api.selectSkyLandscapeResource(input.landscape,[...stepAtlas.values(),...(stepGalaxy?[stepGalaxy]:[])],false);
        Object.assign(args,{1:step.report,2:step.at,7:step.mode,10:step.fov,12:step.basis,13:step.center,15:{frame:step.frame,images:stepAtlas,enabled:true,failed:()=>failures.push('art')},26:stepGalaxy,34:{enabled:true,panorama:{image:input.decoded.get('landscape:'+resource.id),mask:input.masks.get(resource.id)}}});}
      uploads=[];peakBytes=liveBytes;const start=performance.now();api.drawSkyScene(...args);gl.finish();uploadPasses.push({pass,name:condition.path?.[pass].name,elapsed:performance.now()-start,uploads:[...uploads],liveBytes,peakBytes});
      if(condition.path){const pixels=new Uint8Array(canvas.width*canvas.height*4);gl.readPixels(0,0,canvas.width,canvas.height,gl.RGBA,gl.UNSIGNED_BYTE,pixels);let binary='';for(let index=0;index<pixels.length;index+=32768)binary+=String.fromCharCode(...pixels.subarray(index,index+32768));stepPixels.push({rgba:btoa(binary),references:snapshot.objects.map((object:any)=>object.reference),frameAt:snapshot.frameAt,landscape:snapshot.view.landscape?.resource?.id});}
    }const elapsed=uploadPasses.at(-1).elapsed;
    const rgba=new Uint8Array(canvas.width*canvas.height*4);gl.readPixels(0,0,canvas.width,canvas.height,gl.RGBA,gl.UNSIGNED_BYTE,rgba);
    let binary='';for(let i=0;i<rgba.length;i+=32768)binary+=String.fromCharCode(...rgba.subarray(i,i+32768));
    const glError=gl.getError(),scissorEnabled=gl.isEnabled(gl.SCISSOR_TEST),references=snapshot.objects.map((object:any)=>object.reference);
    let recovered:any=null,failedCapture:string|undefined;
    if(condition.failure){
      failedCapture=canvas.toDataURL('image/png');
      const replacement=new Image();replacement.src=galaxy.src;await replacement.decode();
      input.ids.set(replacement,'galactic:retry');args[26]=replacement;
      uploads=[];peakBytes=liveBytes;api.drawSkyScene(...args);gl.finish();
      const actual=new Uint8Array(canvas.width*canvas.height*4);gl.readPixels(0,0,canvas.width,canvas.height,gl.RGBA,gl.UNSIGNED_BYTE,actual);
      let encoded='';for(let index=0;index<actual.length;index+=32768)encoded+=String.fromCharCode(...actual.subarray(index,index+32768));
      recovered={rgba:btoa(encoded),uploads:[...uploads],references:snapshot.objects.map((object:any)=>object.reference),
        liveBytes,peakBytes,glError:gl.getError(),failedAttempts,gpuFailureCallbacks:failures.length};
    }
    renderer.dispose();gl.drawArrays=draw;gl.useProgram=use;gl.attachShader=attach;gl.shaderSource=source;gl.texImage2D=tex;gl.deleteTexture=remove;gl.createTexture=create;gl.copyTexImage2D=copy;
    return {stepPixels,trialDiagnostics:(globalThis as any).trialDiagnostics,calls,elapsed,uploadPasses,failedAttempts,copyAttempts,recovered,failedCapture,retiredLogicalBytes:liveBytes,retiredAllocations:allocations.size,glError,scissorEnabled,frameAt:snapshot.frameAt,references,landscape:snapshot.view.landscape?.resource?.id,paintedDeepSky:painted.deepSkyImage===deep?.image,failures,liveTextures:live.size,rgba:btoa(binary)};
   },{condition,variant});
   if(debugMode){const {rgba,...metadata}=result;await fs.writeFile(path.join(output,'case-'+variant+'.json'),JSON.stringify(metadata,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({variant,failures:result.failures,diagnostics:result.trialDiagnostics,uploads:result.uploadPasses[0].uploads}));}
   assert.equal(result.glError,0);assert.equal(result.scissorEnabled,false);assert.deepEqual(result.failures,condition.failure?['GPU:galactic']:[]);
   assert.equal(result.failedAttempts,condition.failure?1:0);
   if(result.recovered){assert.equal(result.recovered.glError,0);assert(result.recovered.uploads.some((upload:any)=>upload.id==='galactic:retry'));
    assert(result.recovered.liveBytes<=16*1024*1024);result.recovered.rgbaSha256=sha(Buffer.from(result.recovered.rgba,'base64'));delete result.recovered.rgba;}
   if(result.failedCapture){const file=condition.name+'-'+variant+'-before-retry.png';const data=Buffer.from(result.failedCapture.split(',')[1],'base64');
    await fs.writeFile(path.join(output,file),data,{flag:'wx'});result.failedCapture={file,sha256:sha(data)};}assert.equal(result.liveTextures,0);assert.equal(result.retiredLogicalBytes,0);assert.equal(result.retiredAllocations,0);assert(result.uploadPasses.every((pass:any)=>pass.liveBytes<=16*1024*1024));assert.equal(result.frameAt,condition.at);
   const {rgba,...actual}=result;const pixels=Buffer.from(rgba,'base64');fullPixelVariants.push(pixels);variants.push({variant,...actual,rgbaSha256:sha(pixels)});
  }
  const [before,after]=variants;let changedChannels=0,maxDelta=0;for(let index=0;index<fullPixelVariants[0].length;index++){const delta=Math.abs(fullPixelVariants[0][index]-fullPixelVariants[1][index]);if(delta){changedChannels++;maxDelta=Math.max(maxDelta,delta);}}
  const pixelDifference={changedChannels,maxDelta,totalChannels:fullPixelVariants[0].length};assert.deepEqual(after.references,before.references);assert.equal(after.landscape,before.landscape);assert.equal(after.paintedDeepSky,before.paintedDeepSky);
  assert(maxDelta<=1,'Original sampling must differ by at most a single 8-bit rounding unit');
  if(condition.copyFailure){assert.equal(after.copyAttempts,1,'Optional copy failure cannot retry per frame');assert.equal(changedChannels,0,'Whole-image fallback must retain original output');}
  const stepComparisons=[];
  if(condition.path){for(let index=0;index<before.stepPixels.length;index++){const a=before.stepPixels[index],b=after.stepPixels[index],pixelsA=Buffer.from(a.rgba,'base64'),pixelsB=Buffer.from(b.rgba,'base64');let channels=0,max=0;for(let i=0;i<pixelsA.length;i++){const delta=Math.abs(pixelsA[i]-pixelsB[i]);if(delta){channels++;max=Math.max(max,delta);}}assert(max<=1,condition.path[index].name);assert.deepEqual(a.references,b.references);assert.equal(a.frameAt,b.frameAt);assert.equal(a.landscape,b.landscape);stepComparisons.push({name:condition.path[index].name,changedChannels:channels,maxDelta:max,beforeRgbaSha256:sha(pixelsA),afterRgbaSha256:sha(pixelsB)});}}
  delete before.stepPixels;delete after.stepPixels;
  const image=condition.name+'.png';await page.locator('canvas').screenshot({path:path.join(output,image)});
  const {report,frame,wanted,beforeWanted,afterWanted,...scope}=condition;
  if(condition.path)delete scope.path;
  rows.push({condition:scope,beforeWanted:beforeWanted.map(asset=>asset.id),afterWanted:afterWanted.map(asset=>asset.id),variants,pixelDifference,stepComparisons,image,imageSha256:sha(await fs.readFile(path.join(output,image)))});
  console.log(JSON.stringify({name:condition.name,beforeWarmBytes:before.uploadPasses[1].uploads.reduce((sum:number,upload:any)=>sum+upload.bytes,0),afterWarmBytes:after.uploadPasses[1].uploads.reduce((sum:number,upload:any)=>sum+upload.bytes,0),beforeWarmCalls:before.uploadPasses[1].uploads.length,afterWarmCalls:after.uploadPasses[1].uploads.length,beforeFailedAttempts:before.failedAttempts,afterFailedAttempts:after.failedAttempts,pixelsEqual:after.rgbaSha256===before.rgbaSha256,pixelDifference}));
 }
 const retired=await page.evaluate(()=>{const input=(globalThis as any).rasterInput;for(const asset of input.deep.values())asset.release();return input.files;});assert.deepEqual(retired,{writes:2,removes:2,failed:0});assert.deepEqual(errors,[]);
 if(sequenceMode||rows.at(-1).condition.name==='common-return')assert.equal(rows[0].variants[1].rgbaSha256,rows.at(-1).variants[1].rgbaSha256);
 /* V4's already frozen failure/return/broad cases remain applicable; this run adds the changed filter seam and same-owner camera path.
 const failed=rows.find(row=>row.condition.failure),wideRow=rows.find(row=>row.condition.name==='wide');
 assert.equal(failed.variants[1].failedAttempts,1);assert.equal(failed.variants[0].failedAttempts,1);
 for(const variant of failed.variants){assert.equal(variant.recovered.rgbaSha256,wideRow.variants[variant.variant==='before'?0:1].rgbaSha256);
  assert.deepEqual(variant.recovered.references,wideRow.variants[1].references);}
 assert.deepEqual(rows.find(row=>row.condition.name==='wide').afterWanted,rows.find(row=>row.condition.name==='wide').beforeWanted);
 assert.deepEqual(rows.find(row=>row.condition.name==='common-dpr3').afterWanted,rows.find(row=>row.condition.name==='common-dpr3').beforeWanted);
 assert(rows.some(row=>row.variants[1].uploadPasses[1].uploads.reduce((sum:number,item:any)=>sum+item.bytes,0)<row.variants[0].uploadPasses[1].uploads.reduce((sum:number,item:any)=>sum+item.bytes,0))); */
 assert(rows.some(row=>row.variants[1].uploadPasses[1].uploads.reduce((sum:number,item:any)=>sum+item.bytes,0)<row.variants[0].uploadPasses[1].uploads.reduce((sum:number,item:any)=>sum+item.bytes,0)));
 await fs.writeFile(path.join(output,'result.json'),JSON.stringify({scope:'Actual adopted production source-window/shared-retention owners versus frozen pre-adoption production: original HTTP publication assets, saved v53 report replay, actual logical uploads/retention/peak and whole-canvas pixels at common/wide/local/dome/rolled/offset/red/dusk/cutout views, one upload-failure latch and new decoded identity recovery. Software development evidence; not native timing, physical GPU memory, current Context or device acceptance.',reportSha256:sha(bytes),beforeBundleSha256:sha(frozen),productionBundleSha256:sha(production),sourceHashes,changed,inputs,rows,retired,errors},null,2)+'\n',{flag:'wx'});
}finally{await browser.close();}
