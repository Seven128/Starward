import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
import {projectAdoptedSkyCatalog} from '../../../../apps/wechat-miniapp/src/services/sky-report-catalog.ts';
import {attachSkyCatalog} from '../../../../apps/wechat-miniapp/src/features/sky/sky-stellar-scene.ts';
import {presentSkyTime} from '../../../../apps/wechat-miniapp/src/features/sky/sky-time-presentation.ts';
import {resolveConstellationFrame} from '../../../../apps/wechat-miniapp/src/features/sky/sky-constellation-scene.ts';
import {createSkyViewBasis} from '../../../../apps/wechat-miniapp/src/features/sky/sky-view-projection.ts';
import {artworkIntersectsView} from '../../../../apps/wechat-miniapp/src/features/sky/sky-artwork-visibility.ts';
import {skySolarLightAt} from '../../../../apps/wechat-miniapp/src/features/sky/sky-solar-light.ts';

const task='.codex/work-items/cloud-sky-native-2026-09-22',baseline='output/playwright/cloud-sky-wide-resource-composition-1002';
const sha=(bytes:Uint8Array|string)=>createHash('sha256').update(bytes).digest('hex');
const prior=JSON.parse(await fs.readFile(baseline+'/result.json','utf8')),inputs:any[]=[];
const json=async(route:string)=>{const record=prior.inputs.find((row:any)=>row.route===route);assert(record);
  const file=baseline+'/input-'+(prior.inputs.indexOf(record)+1)+'.json',bytes=await fs.readFile(file);assert.equal(sha(bytes),record.sha256);
  inputs.push({...record,path:file,transport:'FROZEN_CURRENT_BFF_JSON'});return JSON.parse(bytes.toString());};
const reportBytes=await fs.readFile(task+'/tmp/current-native-report-2026-10-01.json');assert.equal(sha(reportBytes),prior.report.sha256);
const raw=projectAdoptedSkyCatalog(JSON.parse(reportBytes.toString())).data,at=new Date(raw.context.at).toISOString(),ref=raw.skyScene.catalog!;
const stars=(await json('/v2/sky/catalogs/'+ref.catalogVersion+'/'+ref.catalogHash)).data,figures=(await json('/v2/sky/constellations')).data;
const landscape=await json('/v2/sky/landscape/manifest'),report=attachSkyCatalog(presentSkyTime(raw,at)!.report,stars);
const frame=resolveConstellationFrame(figures,report.skyScene,at)!;assert(frame);
const sun=skySolarLightAt(report.hourly,at)!;assert(sun);
const conditions:any[]=[];
for(const mode of ['DAY','OBSERVATION'])for(const altitude of [15,0]){
  const group=mode.toLowerCase()+'-view'+altitude,basis=createSkyViewBasis(243.2015782860865,90+altitude,0)!;
  const steps=[['fallback',{noBitmap:true,failed:true}],['retry-pending',{noBitmap:true,pending:true}],['ready0',{readiness:0}],
    ['ready-half',{readiness:.5}],['ready1',{readiness:1}],['pure-photo-control',{readiness:1,noPrevious:true}],
    ['photo-failure',{readiness:1,failPhoto:true}],['retry-return-pending',{noBitmap:true,pending:true}],
    ['return-ready-half',{readiness:.5}],['return-ready1',{readiness:1}]] as const;
  for(const [step,variation]of steps)conditions.push({name:group+'-'+step,group,mode,basis,altitude,step,...variation});
}
for(const [step,variation]of [['fallback',{noBitmap:true,failed:true}],['half-photo-failure',{readiness:.5,failPhoto:true}],
  ['half-photo-failure-old-restore-counterfactual',{readiness:.5,failPhoto:true,oldRestore:true}],
  ['partial-model-only-after-photo-and-restore-fail',{readiness:.5,failPhoto:true,failModelAt:2}],
  ['first-model-failed-photo-succeeds',{readiness:.5,failModelAt:1}],
  ['both-model-and-photo-failed',{readiness:.5,failPhoto:true,failModelAll:true}],
  ['known-mask-pending-without-previous',{noBitmap:true,pending:true,noPrevious:true}]] as const)
  conditions.push({name:'failure-view0-'+step,group:'failure-view0',mode:'DAY',basis:createSkyViewBasis(243.2015782860865,90,0)!,altitude:0,step,...variation});
conditions.push({name:'true-zero-source',group:'zero-source',mode:'DAY',basis:createSkyViewBasis(243.2015782860865,145,0)!,altitude:55,noBitmap:true,pending:true});
conditions.push({name:'zero-opacity',group:'zero-opacity',mode:'DAY',basis:createSkyViewBasis(243.2015782860865,45,0)!,altitude:-45,noBitmap:true,pending:true});
for(const condition of conditions){const view={basis:condition.basis,verticalFovDeg:45};condition.wanted=frame.images.filter(figure=>artworkIntersectsView(figure.registration,view,390,844)).map(figure=>figure.source);}
const images=new Map<string,any>();
const localImage=async(id:string,asset:any,folder:string)=>{if(images.has(id))return;const file=path.join('workers/miniapp-api/assets',folder,asset.file),bytes=await fs.readFile(file);
  assert.equal(sha(bytes),asset.sha256);assert.equal(bytes.length,asset.bytes);inputs.push({path:file,transport:'BOUND_LOCAL_PUBLICATION_BYTES',bytes:bytes.length,sha256:sha(bytes)});
  images.set(id,{id,...asset,data:'data:image/'+(file.endsWith('.png')?'png':'jpeg')+';base64,'+bytes.toString('base64')});};
for(const asset of conditions.flatMap(condition=>condition.wanted))await localImage(asset.id,asset,'constellations');
const masks=[];for(const resource of landscape.resources){await localImage('landscape:'+resource.id,resource.image,'landscape');
  const file=path.join('workers/miniapp-api/assets/landscape',resource.alpha.file),bytes=await fs.readFile(file);assert.equal(sha(bytes),resource.alpha.sha256);
  inputs.push({path:file,transport:'BOUND_LOCAL_PUBLICATION_BYTES',bytes:bytes.length,sha256:sha(bytes)});masks.push({resource,encoded:JSON.parse(bytes.toString())});}
let output='output/playwright/cloud-sky-landscape-retry-1002';for(let suffix=1;;suffix++){try{await fs.access(output);output='output/playwright/cloud-sky-landscape-retry-1002-'+suffix;}catch(error){if(error.code==='ENOENT')break;throw error;}}
await fs.mkdir(output,{recursive:true});
const compiled=await build({stdin:{resolveDir:process.cwd(),contents:
  "export {createSkyGpuRenderer} from './apps/wechat-miniapp/src/features/sky/sky-gpu-renderer';export {drawSkyScene} from './apps/wechat-miniapp/src/features/sky/sky-scene-render';export {selectSkyLandscapeResource,selectSkyLandscapeImageResources} from './apps/wechat-miniapp/src/features/sky/sky-landscape-resources';export {createSkyPanoramaMask,skyLandscapeMaskAlpha,skyLandscapePaintedPanorama} from './apps/wechat-miniapp/src/features/sky/sky-landscape-mask';export {decodeSkyLandscapeAlpha} from './packages/miniapp-contracts/src/sky-landscape-publication';export {pickPaintedSkyObjects} from './apps/wechat-miniapp/src/features/sky/sky-object-picking';export {unprojectSkyPoint} from './apps/wechat-miniapp/src/features/sky/sky-view-projection';export {skyLandscapeViewOpacity} from './apps/wechat-miniapp/src/features/sky/sky-landscape-visibility';"},
  bundle:true,write:false,metafile:true,platform:'browser',format:'iife',globalName:'retryComposition',target:'es2022',tsconfig:path.resolve('apps/wechat-miniapp/tsconfig.json')});
const production=compiled.outputFiles[0]!.text,sourceHashes=await Promise.all(Object.keys(compiled.metafile!.inputs).filter(file=>file!=='<stdin>').map(async file=>({path:file,sha256:sha(await fs.readFile(file))})));
await fs.writeFile(output+'/production.js',production,{flag:'wx'});
const {chromium}=createRequire(import.meta.url)('C:/Users/777/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader']});
const errors:string[]=[];try{const page=await browser.newPage({viewport:{width:390,height:844}});page.on('pageerror',error=>errors.push(String(error)));
  await page.setContent('<style>body{margin:0}canvas{display:block}</style><canvas width="390" height="844"></canvas>');await page.evaluate('globalThis.__name=target=>target');await page.addScriptTag({content:production});
  await page.evaluate(async(input:any)=>{const api=(globalThis as any).retryComposition,decoded=new Map(),ids=new WeakMap();for(const asset of input.images){const image=new Image();image.src=asset.data;await image.decode();assertDimensions(image,asset);decoded.set(asset.id,image);ids.set(image,asset.id);}
    function assertDimensions(image:any,asset:any){if(image.width!==asset.width||image.height!==asset.height)throw Error('dimensions '+asset.id);}
    const masks=new Map(input.masks.map((row:any)=>[row.resource.id,api.createSkyPanoramaMask(input.landscape,row.resource,api.decodeSkyLandscapeAlpha(row.encoded,row.resource))]));
    (globalThis as any).retryInput={api,decoded,ids,masks,landscape:input.landscape,group:null,previous:null,renderer:null,trace:[],liveBytes:0,peakBytes:0,allocated:new Map(),liveTextures:new Set(),liveFramebuffers:new Set()};
  },{images:[...images.values()],masks,landscape});
  const rows:any[]=[];console.log(JSON.stringify({phase:'inputs-ready',output,scenes:conditions.length,localImages:images.size,sourceCount:sourceHashes.length}));
  for(const condition of conditions){const row=await page.evaluate((condition:any)=>{
    const input=(globalThis as any).retryInput,api=input.api,canvas=document.querySelector('canvas')!,gl=canvas.getContext('webgl',{preserveDrawingBuffer:true,antialias:false})!;
    if(!gl)throw Error('no_webgl');
    if(!input.instrumented){input.instrumented=true;const create=gl.createTexture.bind(gl),remove=gl.deleteTexture.bind(gl),tex=gl.texImage2D.bind(gl),copy=gl.copyTexImage2D.bind(gl),fb=gl.createFramebuffer.bind(gl),deleteFb=gl.deleteFramebuffer.bind(gl);
      gl.createTexture=()=>{const texture=create();if(texture)input.liveTextures.add(texture);return texture;};gl.deleteTexture=(texture:any)=>{input.liveTextures.delete(texture);input.liveBytes-=input.allocated.get(texture)??0;input.allocated.delete(texture);remove(texture);};
      gl.createFramebuffer=()=>{const framebuffer=fb();if(framebuffer)input.liveFramebuffers.add(framebuffer);return framebuffer;};gl.deleteFramebuffer=(framebuffer:any)=>{input.liveFramebuffers.delete(framebuffer);deleteFb(framebuffer);};
      const allocate=(texture:any,bytes:number)=>{input.liveBytes+=bytes-(input.allocated.get(texture)??0);input.allocated.set(texture,bytes);input.peakBytes=Math.max(input.peakBytes,input.liveBytes);};
      (gl as any).texImage2D=(...args:any[])=>{const source=args.at(-1),bytes=args.length===9?args[3]*args[4]*4:source.width*source.height*4;allocate(gl.getParameter(gl.TEXTURE_BINDING_2D),bytes);return (tex as any)(...args);};
      (gl as any).copyTexImage2D=(...args:any[])=>{allocate(gl.getParameter(gl.TEXTURE_BINDING_2D),args[5]*args[6]*4);return (copy as any)(...args);};
    }
    if(input.group!==condition.group){input.renderer?.dispose();if(input.liveBytes!==0||input.liveTextures.size||input.liveFramebuffers.size)throw Error('group-release');
      input.group=condition.group;input.previous=null;input.renderer=api.createSkyGpuRenderer(gl,1,{imageFailed:(image:any)=>input.trace.push({type:'image-failed',image:input.ids.get(image)})});input.actualLandscape=input.renderer.landscape.bind(input.renderer);}
    const previous=condition.noPrevious?null:input.previous,trace:any[]=[],successful:any[]=[];let modelCalls=0,availability:any;
    input.renderer.landscape=(...values:any[])=>{const photo=Boolean(values[3]);if(!photo)modelCalls++;const requestedOpacity=values[4];
      if(condition.oldRestore&&!photo&&modelCalls===2)values[4]=api.skyLandscapeViewOpacity(values[0],390,844);
      const forcedFailure=photo?Boolean(condition.failPhoto):Boolean(condition.failModelAll||condition.failModelAt===modelCalls);
      const result=forcedFailure?false:input.actualLandscape(...values);trace.push({kind:photo?'photo':'procedural',source:photo?values[3].mask.resource.id:null,requestedOpacity,actualOpacity:values[4],success:result,forcedFailure});
      if(result&&values[4]>0)successful.push(values);return result;};
    const view={basis:condition.basis,verticalFovDeg:45},atlas=new Map(condition.wanted.map((asset:any)=>[asset.id,input.decoded.get(asset.id)]));
    const resource=api.selectSkyLandscapeResource(input.landscape,[...atlas.values()],Boolean(condition.pending)),mask=input.masks.get(resource.id);
    const eligible=api.selectSkyLandscapeImageResources([resource],input.masks,{view,width:390,height:844});
    const panorama=!condition.noBitmap&&eligible.length?{image:input.decoded.get('landscape:'+resource.id),mask}:null;
    let snapshot:any;const args:any[]=Array(36).fill(undefined);Object.assign(args,{0:input.renderer,1:condition.report,2:condition.at,3:null,4:null,5:390,6:844,7:condition.mode,
      8:(value:any)=>{snapshot=value;},10:45,12:condition.basis,15:{frame:condition.frame,images:atlas,enabled:true},34:{enabled:true,panorama,mask,readiness:condition.readiness,
        pending:condition.pending,failed:condition.failed,previous,availability:(value:any)=>{availability=value;}},35:{horizontal:false,equatorial:false}});
    input.peakBytes=input.liveBytes;const started=performance.now();api.drawSkyScene(...args);const cpuMs=performance.now()-started;gl.finish();const completedMs=performance.now()-started;
    const pixels=new Uint8Array(390*844*4);gl.readPixels(0,0,390,844,gl.RGBA,gl.UNSIGNED_BYTE,pixels);const capture=canvas.toDataURL('image/png');
    const encode=(pixels:Uint8Array)=>{let binary='';for(let i=0;i<pixels.length;i+=32768)binary+=String.fromCharCode(...pixels.subarray(i,i+32768));return btoa(binary);};
    const summary=(mask:any):any=>!mask?null:mask.kind==='transition'?{kind:'transition',background:summary(mask.background),foreground:summary(mask.foreground)}:
      {kind:mask.kind,opacity:mask.opacity??1,resource:mask.resource?.id??null};
    const actual=snapshot.view.landscape,photo=api.skyLandscapePaintedPanorama(actual),picks=[];
    for(const object of snapshot.objects){const ray=api.unprojectSkyPoint(object.x,object.y,condition.basis,390,844,45);if(!ray||ray[2]>=0)continue;
      const alpha=actual?api.skyLandscapeMaskAlpha(actual,ray):0,picked=api.pickPaintedSkyObjects(snapshot,{x:object.x,y:object.y,frameAt:snapshot.frameAt,catalogVersion:snapshot.catalogVersion,catalogHash:snapshot.catalogHash}).some((candidate:any)=>candidate.reference===object.reference);
      picks.push({reference:object.reference,x:object.x,y:object.y,altitude:Math.asin(ray[2])*180/Math.PI,alpha,picked});}
    // Replay only the actual successful ground passes on transparent background.
    // Same renderer/camera/source, explicit probe; this does not change previous.
    input.renderer.begin(390,844,'#000000');gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);for(const values of successful)input.actualLandscape(...values);input.renderer.finish();gl.finish();
    const alphaPixels=new Uint8Array(390*844*4);gl.readPixels(0,0,390,844,gl.RGBA,gl.UNSIGNED_BYTE,alphaPixels);
    const alphaSamples=[];for(const x of [60,195,329])for(const y of [300,420,480,650,790]){const ray=api.unprojectSkyPoint(x+.5,y+.5,condition.basis,390,844,45)!;
      const cpu=actual?api.skyLandscapeMaskAlpha(actual,ray):0,gpu=alphaPixels[((843-y)*390+x)*4+3]/255;alphaSamples.push({x,y,cpu,gpu,delta:Math.abs(cpu-gpu)});}
    input.previous=actual;
    return {previous:summary(previous),actualMask:summary(actual),availability,trace,photoCredit:photo?{resource:photo.resource.id,sha256:photo.resource.image.sha256,publication:photo.publication.publicationId}:null,
      successfulPhotoPasses:trace.filter(pass=>pass.kind==='photo'&&pass.success&&pass.actualOpacity>0).length,modelCalls,picks,alphaSamples,
      maskIntersects:eligible.length>0,viewOpacity:api.skyLandscapeViewOpacity(view,390,844),cpuMs,completedMs,logicalRetainedBytes:input.liveBytes,logicalPeakBytes:input.peakBytes,
      glError:gl.getError(),rgba:encode(pixels),alphaRgba:encode(alphaPixels),capture,frameAt:snapshot.frameAt,catalogHash:snapshot.catalogHash,references:snapshot.objects.map((object:any)=>object.reference)};
  },{...condition,report,frame,at});
    const {rgba,capture,alphaRgba,...metadata}=row;const bytes=Buffer.from(rgba,'base64');await fs.writeFile(output+'/'+condition.name+'.rgba',bytes,{flag:'wx'});
    await fs.writeFile(output+'/'+condition.name+'.png',Buffer.from(capture.split(',')[1],'base64'),{flag:'wx'});await fs.writeFile(output+'/'+condition.name+'-alpha.rgba',Buffer.from(alphaRgba,'base64'),{flag:'wx'});
    assert.equal(row.glError,0);rows.push({name:condition.name,group:condition.group,step:condition.step,mode:condition.mode,basis:condition.basis,readiness:condition.readiness??null,counterfactual:condition.oldRestore??false,rgbaSha256:sha(bytes),...metadata});
    await fs.writeFile(output+'/rows-partial.json',JSON.stringify(rows,null,2)+'\n');console.log(JSON.stringify({name:condition.name,mask:row.actualMask,trace:row.trace,alphaMax:Math.max(...row.alphaSamples.map(sample=>sample.delta))}));
  }
  const release=await page.evaluate(()=>{const input=(globalThis as any).retryInput;input.renderer.dispose();return{bytes:input.liveBytes,textures:input.liveTextures.size,framebuffers:input.liveFramebuffers.size};});assert.deepEqual(release,{bytes:0,textures:0,framebuffers:0});assert.deepEqual(errors,[]);
  const comparisons:any[]=[];const compare=async(left:string,right:string)=>{const a=await fs.readFile(output+'/'+left+'.rgba'),b=await fs.readFile(output+'/'+right+'.rgba');let changedPixels=0,maxDelta=0;
    for(let i=0;i<a.length;i+=4){let changed=false;for(let k=0;k<4;k++){const delta=Math.abs(a[i+k]-b[i+k]);changed ||=delta>0;maxDelta=Math.max(maxDelta,delta);}if(changed)changedPixels++;}
    const row={left,right,changedPixels,maxDelta};comparisons.push(row);return row;};
  for(const mode of ['day','observation'])for(const altitude of [15,0]){const group=mode+'-view'+altitude;
    assert.equal((await compare(group+'-fallback',group+'-retry-pending')).changedPixels,0);assert.equal((await compare(group+'-fallback',group+'-ready0')).changedPixels,0);
    assert.equal((await compare(group+'-ready1',group+'-pure-photo-control')).changedPixels,0);assert.equal((await compare(group+'-fallback',group+'-retry-return-pending')).changedPixels,0);
    assert.equal((await compare(group+'-ready1',group+'-return-ready1')).changedPixels,0);assert((await compare(group+'-ready0',group+'-ready-half')).changedPixels>0);
    const half=rows.find(row=>row.name===group+'-ready-half');assert.equal(half.actualMask.kind,'transition');assert.equal(half.actualMask.background.opacity,altitude===0?.25:.5);assert.equal(half.actualMask.foreground.opacity,altitude===0?.25:.5);
  }
  const restored=rows.find(row=>row.name==='failure-view0-half-photo-failure'),old=rows.find(row=>row.name==='failure-view0-half-photo-failure-old-restore-counterfactual');
  assert.equal(restored.actualMask.opacity,.5);assert.equal(restored.trace[2].actualOpacity,1/3);assert((await compare(restored.name,old.name)).changedPixels>0);
  const fallbackDifference=await compare('failure-view0-fallback',restored.name);assert(fallbackDifference.maxDelta<=1,'quantized source-over restore matches full model');
  assert.equal(rows.find(row=>row.name==='failure-view0-partial-model-only-after-photo-and-restore-fail').actualMask.opacity,.25);
  assert.equal(rows.find(row=>row.name==='failure-view0-first-model-failed-photo-succeeds').actualMask.kind,'panorama');
  assert.equal(rows.find(row=>row.name==='failure-view0-both-model-and-photo-failed').actualMask,null);
  const pending=rows.find(row=>row.name==='failure-view0-known-mask-pending-without-previous');assert.equal(pending.actualMask,null);assert.equal(pending.availability,null);assert.deepEqual(pending.trace,[]);
  const zero=rows.find(row=>row.name==='true-zero-source');assert.equal(zero.maskIntersects,false);assert.deepEqual(zero.trace,[]);assert(zero.alphaSamples.every(sample=>sample.cpu===0&&sample.gpu===0));
  for(const row of rows.filter(row=>!row.counterfactual)){assert(row.alphaSamples.every(sample=>sample.delta<=1.1/255),'GPU/CPU source-over alpha '+row.name);
    for(const pick of row.picks)assert.equal(pick.picked,pick.alpha<254.5/255,'actual completed pick alpha '+row.name+' '+pick.reference);}
  assert(old.alphaSamples.some(sample=>sample.delta>.1),'old restore model counterfactual exposes real GPU/CPU mismatch');
  for(const source of sourceHashes)assert.equal(sha(await fs.readFile(source.path)),source.sha256,'production changed '+source.path);
  const artifactHashes=await Promise.all((await fs.readdir(output)).filter(file=>/\.(png|rgba|js)$/.test(file)).map(async file=>({path:output+'/'+file,sha256:sha(await fs.readFile(output+'/'+file))})));
  await fs.writeFile(output+'/result.json',JSON.stringify({scope:'Current production software-GPU full-scene model/photo retry timeline on one live Canvas per group. Previous comes only from the preceding actual completed mask. Failure controls explicitly return false before a GPU pass; old-restore is a marked pixel counterfactual. Actual successful passes are replayed on transparent background for GPU/CPU source-over alpha. Manual readiness inputs do not prove native timer/gesture/lifecycle or driver/OS/native total memory. Image bytes are predecoded; logical textures only. Original 41/48 matrices remain prior-generation evidence, not current full-suite verification.',report:{path:task+'/tmp/current-native-report-2026-10-01.json',sha256:sha(reportBytes)},productionBundleSha256:sha(production),sourceHashes,harness:{path:task+'/scripts/experience-landscape-retry-composition-2026-10-02.mts',sha256:sha(await fs.readFile(task+'/scripts/experience-landscape-retry-composition-2026-10-02.mts'))},inputs,rows,comparisons,release,errors,artifactHashes},null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify({phase:'verified',output,rows:rows.length,comparisons,release}));
}finally{await browser.close();}
