// Compare frozen v49 with the current renderer using actual registered images.
// Pixel/raster work evidence; neither native timing nor a new source publication.
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
import {skyGalacticBandAt} from '../../../../apps/wechat-miniapp/src/features/sky/sky-galactic-band.ts';
const task='.codex/work-items/cloud-sky-native-2026-09-22';
const withoutRaster=process.argv.includes('--original-retention');
const output=path.resolve('output/playwright/cloud-sky-texture-retention-trial-0930'+(withoutRaster?'-mutation':''));
await assert.rejects(fs.access(output),{code:'ENOENT'});await fs.mkdir(output,{recursive:true});
const sha=(bytes:Uint8Array|string)=>createHash('sha256').update(bytes).digest('hex');
const prior=JSON.parse(await fs.readFile('output/playwright/cloud-sky-artwork-raster-0930/result.json','utf8'));
for(const source of prior.sourceHashes)if(!source.path.endsWith('/sky-gpu-textures.ts'))assert.equal(sha(await fs.readFile(source.path)),source.sha256,source.path);
const frozen=await fs.readFile('output/playwright/cloud-sky-artwork-raster-0930/production.js');
assert.equal(sha(frozen),prior.productionBundleSha256);
const compiled=await build({stdin:{resolveDir:process.cwd(),contents:
  "export {createSkyGpuRenderer} from './apps/wechat-miniapp/src/features/sky/sky-gpu-renderer';export {drawSkyScene} from './apps/wechat-miniapp/src/features/sky/sky-scene-render';export {selectSkyLandscapeResource} from './apps/wechat-miniapp/src/features/sky/sky-landscape-resources';export {createSkyPanoramaMask} from './apps/wechat-miniapp/src/features/sky/sky-landscape-mask';export {decodeSkyLandscapeAlpha} from './packages/miniapp-contracts/src/sky-landscape-publication';export {startDeepSkyImageRequest} from './apps/wechat-miniapp/src/features/sky/deep-sky-image-request';"},
  bundle:true,write:false,metafile:true,platform:'browser',format:'iife',globalName:'raster50After',target:'es2022',plugins:[{name:'task-local-retention-trial',setup(build){build.onLoad({filter:/sky-gpu-textures\.ts$/},async()=>({contents:await fs.readFile(task+'/tmp/texture-retention-candidate-0930.ts','utf8'),loader:'ts'}));}}],tsconfig:path.resolve('apps/wechat-miniapp/tsconfig.json')});
const production=withoutRaster?frozen.toString():compiled.outputFiles[0]!.text;
await fs.writeFile(path.join(output,'production.js'),production,{flag:'wx'});
const sourceHashes=await Promise.all(Object.keys(compiled.metafile!.inputs).filter(file=>file!=='<stdin>').map(async file=>{const actual=file.endsWith('/sky-gpu-textures.ts')?task+'/tmp/texture-retention-candidate-0930.ts':file;return {path:actual,sha256:sha(await fs.readFile(actual))};}));
const inputs:any[]=[];
const get=async(route:string)=>{const response=await fetch('http://127.0.0.1:60065'+route,{signal:AbortSignal.timeout(15000)});assert.equal(response.status,200,route);const bytes=Buffer.from(await response.arrayBuffer());inputs.push({route,bytes:bytes.length,sha256:sha(bytes),headers:Object.fromEntries(response.headers.entries())});return bytes;};
const json=async(route:string)=>JSON.parse((await get(route)).toString());
const bytes=await fs.readFile(task+'/tmp/v49-current-public-report.json');assert.equal(sha(bytes),prior.reportSha256);
const raw=projectAdoptedSkyCatalog(JSON.parse(bytes.toString())).data;
const ref=raw.skyScene.catalog!,stars=(await json(`/v2/sky/catalogs/${ref.catalogVersion}/${ref.catalogHash}`)).data;
const publication=(await json('/v2/sky/constellations')).data;
const galactic=await json('/v2/sky/galactic/manifest'),landscape=await json('/v2/sky/landscape/manifest');
const current=attachSkyCatalog(presentSkyTime(raw,raw.context.at)!.report,stars);
const starFrame=resolveSkySceneFrame(current.skyScene,raw.context.at)!;
const altairIndex=current.skyScene.catalog!.entries.findIndex(entry=>entry.objectRef==='HR:7557');
const altair=starFrame.points.find(point=>point[0]===altairIndex)!;
const altairBasis=createSkyViewBasis(altair[1],90+altair[2],0)!;
const m42At='2026-09-30T20:00:00.000Z';
const m42Report=attachSkyCatalog(presentSkyTime(raw,m42At)!.report,stars),deep=resolveSkyDeepSkyScene(m42Report.skyScene,m42At)!;
const m42Index=deep.catalog.entries.findIndex(entry=>entry.objectRef==='M:42');
const m42=deep.frame.points!.find(point=>point[0]===m42Index)!;assert(m42[2]>0);
const m42Basis=createSkyViewBasis(m42[1],90+m42[2],0)!;
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
const prepared=conditions.map(condition=>{
 const report=attachSkyCatalog(presentSkyTime(raw,condition.at)!.report,stars);
 const frame=resolveConstellationFrame(publication,report.skyScene,condition.at)!;assert(frame);
 const view={basis:condition.basis,verticalFovDeg:condition.fov,center:condition.center};
 const wanted=constellationVisibility(condition.fov,true)>0?frame.images.filter(figure=>artworkIntersectsView(figure.registration,view,390,844)).map(figure=>figure.source):[];
 return {...condition,report,frame,wanted,galaxy:condition.mode!=='OBSERVATION'&&Boolean(skyGalacticBandAt(report,condition.at,condition.fov))};
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
 for(const condition of prepared){
  const variants=[];
  for(const variant of ['before','after']){
   const result=await page.evaluate(({condition,variant}:any)=>{
    const input=(globalThis as any).rasterInput,canvas=document.querySelector('canvas')!;
    canvas.width=390*condition.scale;canvas.height=844*condition.scale;
    const gl=canvas.getContext('webgl',{preserveDrawingBuffer:true,antialias:false})!;if(!gl)throw Error('no_webgl');
    const draw=gl.drawArrays.bind(gl),use=gl.useProgram.bind(gl),attach=gl.attachShader.bind(gl),source=gl.shaderSource.bind(gl),tex=gl.texImage2D.bind(gl),remove=gl.deleteTexture.bind(gl),create=gl.createTexture.bind(gl);
    const shaderTexts=new Map(),programShaders=new Map(),textureIds=new Map(),live=new Set();let currentProgram:any;
    const calls:any[]=[],allocations=new Map(),uploadPasses:any[]=[];let liveBytes=0,peakBytes=0,uploads:any[]=[];
    gl.shaderSource=(shader,text)=>{shaderTexts.set(shader,text);source(shader,text);};
    gl.attachShader=(program,shader)=>{programShaders.set(program,[...(programShaders.get(program)??[]),shader]);attach(program,shader);};
    gl.useProgram=program=>{currentProgram=program;use(program);};
    gl.createTexture=()=>{const texture=create();if(texture)live.add(texture);return texture;};
    gl.deleteTexture=texture=>{if(texture){live.delete(texture);liveBytes-=allocations.get(texture)??0;allocations.delete(texture);}remove(texture);};
    (gl as any).texImage2D=(...args:any[])=>{const texture=gl.getParameter(gl.TEXTURE_BINDING_2D),source=args.at(-1),id=input.ids.get(source)??'static';const size=args.length===9?Number(args[3])*Number(args[4])*4:Number(source?.width)*Number(source?.height)*4;textureIds.set(texture,id);if(Number.isFinite(size)&&size>0){liveBytes+=size-(allocations.get(texture)??0);allocations.set(texture,size);peakBytes=Math.max(peakBytes,liveBytes);uploads.push({id,bytes:size});}return (tex as any)(...args);};
    gl.drawArrays=(mode,first,count)=>{
     if((programShaders.get(currentProgram)??[]).some((shader:any)=>shaderTexts.get(shader)?.includes('u_anchorU'))){
      const box=gl.isEnabled(gl.SCISSOR_TEST)?Array.from(gl.getParameter(gl.SCISSOR_BOX) as Int32Array):[0,0,canvas.width,canvas.height];
      calls.push({image:textureIds.get(gl.getParameter(gl.TEXTURE_BINDING_2D)),box,area:box[2]!*box[3]!});
     }
     draw(mode,first,count);
    };
    const api=(globalThis as any)[variant==='before'?'raster50Before':'raster50After'],failures:string[]=[];
    const renderer=api.createSkyGpuRenderer(gl,condition.scale,{imageFailed:()=>failures.push('GPU')});
    const atlas=new Map(condition.wanted.map((asset:any)=>[asset.id,input.decoded.get(asset.id)]));
    const galaxy=condition.galaxy?input.decoded.get('galactic'):null;
    const deep=condition.deepLevel?input.deep.get(condition.deepLevel):null;
    const landscape=api.selectSkyLandscapeResource(input.landscape,[...atlas.values(),...(galaxy?[galaxy]:[]),...(deep?[deep.image]:[])],false);
    let snapshot:any,painted:any;const args=Array(36).fill(undefined);Object.assign(args,{0:renderer,1:condition.report,2:condition.at,3:null,4:null,5:390,6:844,7:condition.mode,8:(value:any,sources:any)=>{snapshot=value;painted=sources;},10:condition.fov,11:deep,12:condition.basis,13:condition.center,15:{frame:condition.frame,images:atlas,enabled:true,failed:()=>failures.push('art')},26:galaxy,34:{enabled:true,panorama:{image:input.decoded.get('landscape:'+landscape.id),mask:input.masks.get(landscape.id)}},35:{horizontal:true,equatorial:false}});
    for(let pass=0;pass<9;pass++){uploads=[];peakBytes=liveBytes;const start=performance.now();api.drawSkyScene(...args);gl.finish();uploadPasses.push({pass,elapsed:performance.now()-start,uploads:[...uploads],liveBytes,peakBytes});}const elapsed=uploadPasses.at(-1).elapsed;
    const rgba=new Uint8Array(canvas.width*canvas.height*4);gl.readPixels(0,0,canvas.width,canvas.height,gl.RGBA,gl.UNSIGNED_BYTE,rgba);
    let binary='';for(let i=0;i<rgba.length;i+=32768)binary+=String.fromCharCode(...rgba.subarray(i,i+32768));
    const glError=gl.getError(),scissorEnabled=gl.isEnabled(gl.SCISSOR_TEST),references=snapshot.objects.map((object:any)=>object.reference);
    renderer.dispose();gl.drawArrays=draw;gl.useProgram=use;gl.attachShader=attach;gl.shaderSource=source;gl.texImage2D=tex;gl.deleteTexture=remove;gl.createTexture=create;
    return {calls,elapsed,uploadPasses,retiredLogicalBytes:liveBytes,retiredAllocations:allocations.size,glError,scissorEnabled,frameAt:snapshot.frameAt,references,landscape:snapshot.view.landscape?.resource?.id,paintedDeepSky:painted.deepSkyImage===deep?.image,failures,liveTextures:live.size,rgba:btoa(binary)};
   },{condition,variant});
   assert.equal(result.glError,0);assert.equal(result.scissorEnabled,false);assert.deepEqual(result.failures,[]);assert.equal(result.liveTextures,0);assert.equal(result.retiredLogicalBytes,0);assert.equal(result.retiredAllocations,0);assert(result.uploadPasses.every((pass:any)=>pass.liveBytes<=16*1024*1024));assert.equal(result.frameAt,condition.at);
   const {rgba,...actual}=result;variants.push({variant,...actual,rgbaSha256:sha(Buffer.from(rgba,'base64'))});
  }
  const [before,after]=variants;assert.equal(after.rgbaSha256,before.rgbaSha256,condition.name);assert.deepEqual(after.references,before.references);assert.equal(after.landscape,before.landscape);assert.equal(after.paintedDeepSky,before.paintedDeepSky);
  const image=condition.name+'.png';await page.locator('canvas').screenshot({path:path.join(output,image)});
  const {report,frame,wanted,...scope}=condition;
  rows.push({condition:scope,wanted:wanted.map(asset=>asset.id),variants,image,imageSha256:sha(await fs.readFile(path.join(output,image)))});
  console.log(JSON.stringify({name:condition.name,beforeWarmBytes:before.uploadPasses[1].uploads.reduce((sum:number,upload:any)=>sum+upload.bytes,0),afterWarmBytes:after.uploadPasses[1].uploads.reduce((sum:number,upload:any)=>sum+upload.bytes,0),beforeWarmCalls:before.uploadPasses[1].uploads.length,afterWarmCalls:after.uploadPasses[1].uploads.length,pixelsEqual:true}));
 }
 const retired=await page.evaluate(()=>{const input=(globalThis as any).rasterInput;for(const asset of input.deep.values())asset.release();return input.files;});assert.deepEqual(retired,{writes:2,removes:2,failed:0});assert.deepEqual(errors,[]);
 assert.equal(rows[0].variants[1].rgbaSha256,rows.at(-1).variants[1].rgbaSha256);
 const common=rows.find(row=>row.condition.name==='common-dpr3');const warmBytes=(variant:any)=>variant.uploadPasses[1].uploads.reduce((sum:number,upload:any)=>sum+upload.bytes,0);assert(warmBytes(common.variants[1])<warmBytes(common.variants[0]));for(const row of rows)assert(warmBytes(row.variants[1])<=warmBytes(row.variants[0]),row.condition.name);
 await fs.writeFile(path.join(output,'result.json'),JSON.stringify({scope:'Task-local candidate retention policy against frozen current v50 production; actual upload bytes, completed-frame logical retention and software pixels; no native timing/GC/peak acceptance or source adoption',reportSha256:sha(bytes),beforeBundleSha256:sha(frozen),productionBundleSha256:sha(production),sourceHashes,inputs,rows,retired,errors},null,2)+'\n',{flag:'wx'});
}finally{await browser.close();}
