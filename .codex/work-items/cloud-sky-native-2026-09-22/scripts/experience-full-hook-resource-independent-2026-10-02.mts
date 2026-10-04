/** Independent task-only readback and bounded actual scene/window/texture-owner replay.
 * No browser, HTTP, native driver or production edit; GL is explicit logical bookkeeping. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import ts from 'typescript';
import {decodeSkyLandscapeAlpha} from '../../../../packages/miniapp-contracts/src/sky-landscape-publication.ts';
import {projectAdoptedSkyCatalog} from '../../../../apps/wechat-miniapp/src/services/sky-report-catalog.ts';
import {attachSkyCatalog} from '../../../../apps/wechat-miniapp/src/features/sky/sky-stellar-scene.ts';
import {presentSkyTime} from '../../../../apps/wechat-miniapp/src/features/sky/sky-time-presentation.ts';
import {resolveConstellationFrame} from '../../../../apps/wechat-miniapp/src/features/sky/sky-constellation-scene.ts';
import {artworkIntersectsView} from '../../../../apps/wechat-miniapp/src/features/sky/sky-artwork-visibility.ts';
import {constellationVisibility} from '../../../../apps/wechat-miniapp/src/features/sky/sky-constellation-visibility.ts';
import {skyArtworkTextureWindow} from '../../../../apps/wechat-miniapp/src/features/sky/sky-artwork-texture-window.ts';
import {skyGalacticImageWindow} from '../../../../apps/wechat-miniapp/src/features/sky/sky-galactic-image-window.ts';
import {createSkyGpuTextures,SKY_GPU_TEXTURE_BYTE_BUDGET} from '../../../../apps/wechat-miniapp/src/features/sky/sky-gpu-textures.ts';
import {createSkyPanoramaMask,skyPanoramaMaskIntersectsView} from '../../../../apps/wechat-miniapp/src/features/sky/sky-landscape-mask.ts';
import {selectSkyLandscapeResource,selectSkyLandscapePanorama} from '../../../../apps/wechat-miniapp/src/features/sky/sky-landscape-resources.ts';
import {drawSkyScene} from '../../../../apps/wechat-miniapp/src/features/sky/sky-scene-render.ts';
import {registerSkyNativeImageLifetime} from '../../../../apps/wechat-miniapp/src/features/sky/sky-artwork-loader.ts';

const ROOT=fileURLToPath(new URL('../../../../',import.meta.url));
const task='.codex/work-items/cloud-sky-native-2026-09-22',r4='output/playwright/cloud-sky-full-hook-resource-1002-r4';
const relative=process.argv[2];assert.match(relative??'',/^output\/[a-z0-9-]+$/);
const file=(p:string)=>path.join(ROOT,p),sha=(b:Buffer|string)=>createHash('sha256').update(b).digest('hex');
const bind=(p:string)=>{const b=fs.readFileSync(file(p));return {path:p,bytes:b.length,sha256:sha(b)}};
assert(!fs.existsSync(file(relative)));fs.mkdirSync(file(relative));
fs.copyFileSync(fileURLToPath(import.meta.url),file(relative+'/executed-script.mts.txt'),fs.constants.COPYFILE_EXCL);
const save=(p:string,value:any)=>fs.writeFileSync(file(relative+'/'+p),JSON.stringify(value,null,2)+'\n',{flag:'wx'});
const result=JSON.parse(fs.readFileSync(file(r4+'/result.json'),'utf8'));
assert.equal(bind(r4+'/result.json').sha256,'548b96c4dd399fcc88ff24cb3d73a18a09d884463890bb2a67eb24a4661ba20b');
const inputPaths=new Set<string>([r4+'/result.json',r4+'/executed-script.mts.txt',r4+'/extracted-page-entry.ts.txt',r4+'/inputs.json',r4+'/bundle.js',
 r4+'/diagnostic-cache.ts.txt',r4+'/diagnostic-hook.ts.txt',r4+'/diagnostic-loader.ts.txt',result.report.path,
 task+'/scripts/experience-full-hook-resource-independent-2026-10-02.mts']);
for(const item of result.sourceBindings){assert.deepEqual(bind(item.path),item);inputPaths.add(item.path)}
for(const item of result.inputs)if(item.path){assert.equal(bind(item.path).sha256,item.sha256);inputPaths.add(item.path)}
for(const row of result.rows)for(const suffix of ['.json','.png','.rgba'])inputPaths.add(r4+'/'+row.condition.name+suffix);
const baseline=JSON.parse(fs.readFileSync(file(task+'/tmp/resume-preserved-hashes-2026-10-01.json'),'utf8'));
for(const b of baseline){assert.equal(bind(b.path).sha256,b.sha256);inputPaths.add(b.path)}
for(const e of fs.readdirSync(file('workers/miniapp-api/assets/deep-sky'),{recursive:true,withFileTypes:true}))if(e.isFile())
 inputPaths.add(path.relative(ROOT,path.join(e.parentPath,e.name)).replaceAll('\\','/'));
const before=[...inputPaths].sort().map(bind);
for(const p of ['apps/wechat-miniapp/src/features/sky/sky-gpu-textures.ts','apps/wechat-miniapp/src/features/sky/sky-gpu-renderer.ts',
 'apps/wechat-miniapp/src/features/sky/sky-scene-render.ts','apps/wechat-miniapp/src/features/sky/sky-artwork-loader.ts',
 'apps/wechat-miniapp/src/features/sky/use-sky-artwork.ts','apps/wechat-miniapp/src/features/sky/sky-constellation-visibility.ts',
 'apps/wechat-miniapp/src/features/sky/sky-artwork-texture-window.ts','apps/wechat-miniapp/src/features/sky/sky-galactic-image-window.ts',
 'apps/wechat-miniapp/src/features/sky/spot-sky-page.tsx']){
 const target=relative+'/source-snapshots/'+p;fs.mkdirSync(path.dirname(file(target)),{recursive:true});fs.copyFileSync(file(p),file(target),fs.constants.COPYFILE_EXCL);
}
const controls:any[]=[];
const diagnosticChecks=[
 ['apps/wechat-miniapp/src/features/sky/sky-artwork-loader.ts','diagnostic-loader.ts.txt',(s:string)=>s.replace('update(next:readonly Asset[]){',
  '__measure(){return [...entries.values()].map(e=>({asset:e.asset,ids:[...e.ids],state:e.state,loaded:Boolean(e.loaded),file:Boolean(e.file),image:e.loaded?.image??null,current:!!usable(e)}));},\n    update(next:readonly Asset[]){')],
 ['apps/wechat-miniapp/src/features/sky/use-sky-artwork.ts','diagnostic-hook.ts.txt',(s:string)=>s.replace('return {...value,failedImage:failed,retryImages,suspendUnusedDecoded};',
  'globalThis.__controlled.hook({active,hash,wanted,byteBudget,retainedFallbackIds,owner:loader.current,value});\n  return {...value,failedImage:failed,retryImages,suspendUnusedDecoded};')],
 ['apps/wechat-miniapp/src/services/sky-public-image-cache.ts','diagnostic-cache.ts.txt',(s:string)=>s.replace('export function createSkyPublicImageCache(',
  'function createActualSkyPublicImageCache(')+'\nexport function createSkyPublicImageCache(...a:Parameters<typeof createActualSkyPublicImageCache>){const owner=createActualSkyPublicImageCache(...a);globalThis.__controlled.caches.push(owner);return owner;}\n'],
] as const;
for(const [p,diagnostic,derive] of diagnosticChecks){const original=fs.readFileSync(file(p),'utf8'),expected=derive(original);
 assert.equal(fs.readFileSync(file(r4+'/'+diagnostic),'utf8'),expected);controls.push({path:p,diagnostic,onlyDeclaredReadOnlyTap:true});}
assert.equal(sha(fs.readFileSync(file(r4+'/bundle.js'))),result.compiledSha256);
// Verify extracted hook initializers against current page AST, not the author's selected list count.
const pagePath='apps/wechat-miniapp/src/features/sky/spot-sky-page.tsx';
const pageAst=ts.createSourceFile(pagePath,fs.readFileSync(file(pagePath),'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
const extracted=fs.readFileSync(file(r4+'/extracted-page-entry.ts.txt'),'utf8'),extractedAst=ts.createSourceFile('entry.ts',extracted,ts.ScriptTarget.Latest,true);
const find=(ast:ts.SourceFile)=>{const m=new Map<string,ts.VariableDeclaration>();const visit=(n:ts.Node)=>{
 if(ts.isVariableDeclaration(n)&&ts.isIdentifier(n.name))m.set(n.name.text,n);ts.forEachChild(n,visit)};visit(ast);return m};
const actualVariables=find(pageAst),extractedVariables=find(extractedAst),names=['optical','sdssOptical','wideField','moonTexture','marsTexture','mercuryTexture',
 'jupiterBands','saturnBands','uranusBands','neptuneBands','galacticImage','artwork','landscapeImage'];
for(const name of names){const a=actualVariables.get(name)!.initializer!.getText(pageAst),b=extractedVariables.get(name)!.initializer!;
 assert(ts.isCallExpression(b)&&ts.isArrowFunction(b.arguments[1]!));const expression=b.arguments[1]!.body;
 assert(ts.isParenthesizedExpression(expression));assert.equal(expression.expression.getText(extractedAst),a);}
for(const name of ['hipsTiles','constellationFrame','coordinateGridFrame','visibleFigures'])
 assert.equal(extractedVariables.get(name)!.initializer!.getText(extractedAst),actualVariables.get(name)!.initializer!.getText(pageAst));
controls.push({pageInitializers:17,unchangedAgainstActualAst:true,controlledPageVisible:true,controlledMode:'DAY',selected:null,w3:false,
 controlledCanvasRevision:1,logicalAndFramebufferSize:[390,844],pixelRatio:1,queryOwner:'controlled cached scheduling; actual client queryFn',fileOwner:'Map FS; actual bytes/validation/runtime/core',
 strongMeasurementImageReferences:'all created HTMLImage objects retained in task images[]; not heap/native GC measurement'});

const metadata=new Map<string,any>();
for(const i of result.inputs)if(i.route&&i.transport?.includes('JSON'))metadata.set(i.route,JSON.parse(fs.readFileSync(file(i.path),'utf8')));
const raw=projectAdoptedSkyCatalog(JSON.parse(fs.readFileSync(file(result.report.path),'utf8'))).data;
const at=new Date(raw.context.at).toISOString(),starRoute=`/v2/sky/catalogs/${raw.skyScene.catalog!.catalogVersion}/${raw.skyScene.catalog!.catalogHash}`;
const current=attachSkyCatalog(presentSkyTime(raw,at)!.report,metadata.get(starRoute).data),figures=metadata.get('/v2/sky/constellations').data;
const frame=resolveConstellationFrame(figures,current.skyScene,at)!;assert(frame);
const assets=result.inputs.filter((i:any)=>i.transport==='ACTUAL_LOCAL_PUBLISHED_BYTES_OFFER_ONLY');
const assetBySha=new Map<string,any>();for(const a of assets)assetBySha.set(a.sha256,a);
const dimensions=(b:Buffer):readonly [number,number]=>{
 if(b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return [b.readUInt32BE(16),b.readUInt32BE(20)];
 assert.equal(b.readUInt16BE(0),0xffd8);let offset=2;
 while(offset<b.length){assert.equal(b[offset],255);while(b[offset]===255)offset++;const marker=b[offset++]!;
  if(marker===217||marker===218)break;if(marker===1||marker>=208&&marker<=215)continue;
  const length=b.readUInt16BE(offset);assert(length>=2);
  if([192,193,194,195,197,198,199,201,202,203,205,206,207].includes(marker))return [b.readUInt16BE(offset+5),b.readUInt16BE(offset+3)];offset+=length;
 }throw Error('original_dimensions_absent');
};
for(const a of assets)assert.deepEqual(dimensions(fs.readFileSync(file(a.path))),[a.width,a.height],a.path);
const metrics:any[]=[];let priorLive=0,allObjectIds=new Set<number>();
for(const row of result.rows){
 assert.deepEqual(JSON.parse(fs.readFileSync(file(r4+'/'+row.condition.name+'.json'),'utf8')),row);
 assert.equal(bind(r4+'/'+row.condition.name+'.rgba').sha256,row.rgbaSha256);assert.equal(bind(r4+'/'+row.condition.name+'.png').sha256,row.pngSha256);
 const recompute=(state:any)=>{
  const refs=state.hooks.flatMap((h:any)=>h.entries.filter((e:any)=>e.current).map((e:any)=>e.image));
  const unique=[...new Map(refs.map((i:any)=>[i.objectId,i])).values()] as any[];
  for(const i of unique){const a=assetBySha.get(i.sha256);assert(a);assert.deepEqual([i.width,i.height],[a.width,a.height]);assert.equal(i.status,'decoded');}
  assert.equal(refs.length,state.decodedOwnerReferences);assert.equal(unique.length,state.decodedUniqueImages);
  assert.equal(unique.reduce((n,i)=>n+i.width*i.height*4,0),state.decodedSourceRgbaModel);
  assert.equal(state.hooks.reduce((n:number,h:any)=>n+h.entries.filter((e:any)=>e.state==='cold').length,0),state.coldFileOwnerEntries);
  return unique.reduce((n,i)=>n+i.width*i.height*4,0);
 };
 for(const state of [...row.states,row.ready])recompute(state);
 for(const t of row.transfers.filter((t:any)=>t.type==='image')){const a=assetBySha.get(t.sha256);assert(a);assert.equal(t.bytes,a.bytes);assert.equal(t.route,a.url);}
 for(const d of row.newDecodes){assert(!allObjectIds.has(d.objectId));allObjectIds.add(d.objectId);const a=assetBySha.get(d.sha256);assert(a);assert.equal(d.width,a.width);assert.equal(d.height,a.height);}
 const passes=[];
 for(const pass of row.passes){let live=priorLive,peak=live;const uploads=[],deletes=[];let copyBytes=0;
  for(const e of pass.events){assert(['source-upload','gpu-copy','delete'].includes(e.operation));
   if(e.operation==='source-upload'){const a=assetBySha.get(e.source.sha256);assert(a);assert.equal(e.bytes,a.width*a.height*4);live+=e.bytes;uploads.push({id:e.source.offeredId,objectId:e.source.objectId,bytes:e.bytes});}
   else if(e.operation==='gpu-copy'){copyBytes+=e.bytes;live+=e.bytes;}
   else {live-=e.bytes;deletes.push({id:e.source?.offeredId??null,objectId:e.source?.objectId??null,bytes:e.bytes});}
   assert.equal(live,e.liveBytes);assert(live>=0);peak=Math.max(peak,live);
  }
  assert.equal(live,pass.liveBytes);assert.equal(peak,pass.peakBytes);assert.equal(pass.retained.reduce((n:number,e:any)=>n+e.bytes,0),live);
  passes.push({pass:pass.pass,sourceUploads:uploads,sourceUploadBytes:uploads.reduce((n,e)=>n+e.bytes,0),copyBytes,deletes,peakBytes:peak,retainedBytes:live});priorLive=live;
 }
 const view={basis:row.condition.basis,verticalFovDeg:row.condition.fov,center:{x:195,y:422}};
 const wanted=constellationVisibility(row.condition.fov,true)>0?frame.images.filter(f=>artworkIntersectsView(f.registration,view,390,844)).map(f=>f.source.id):[];
 assert.deepEqual(row.ready.hooks.find((h:any)=>h.name==='artwork').wanted.map((a:any)=>a.id),wanted);
 metrics.push({condition:row.condition.name,decodedSourceRgbaModel:row.ready.decodedSourceRgbaModel,
  sourceRgbaSampleMaximum:Math.max(...row.states.map(recompute),recompute(row.ready)),cold:row.ready.coldFileOwnerEntries,
  decodeStarts:row.newDecodes.map((d:any)=>({id:d.offeredId,objectId:d.objectId,sha256:d.sha256})),
  imageTransfers:row.transfers.filter((t:any)=>t.type==='image').length,constellationVisibility:constellationVisibility(row.condition.fov,true),
  actualArtworkOpacity:.2*constellationVisibility(row.condition.fov,true),wanted,passes});
}
assert.deepEqual(fs.readFileSync(file(r4+'/w3-off-0-45.rgba')),fs.readFileSync(file(r4+'/w3-off-4-45.rgba')));
const warm=metrics[2].passes[2],wanted28=metrics[2].wanted;
assert.equal(warm.sourceUploadBytes,14155776);assert.equal(warm.peakBytes,30932992);assert.equal(warm.sourceUploads.length,18);
assert.deepEqual(warm.deletes.map((e:any)=>[e.objectId,e.bytes]),warm.sourceUploads.map((e:any)=>[e.objectId,e.bytes]));
assert.equal(wanted28.length,28);assert.equal(metrics[4].imageTransfers,0);assert.equal(metrics[4].decodeStarts.length,8);

// New replay computes registrations/windows from frozen raw metadata and executes
// actual scene submission + actual texture owner. Mock GL gives no pixel/driver proof.
const objectCache=new Map<number,any>(),infoBySource=new Map<object,any>();let eligibleObjects=new Set<number>();
const source=(i:any)=>{let value=objectCache.get(i.objectId);if(!value){value={width:i.width,height:i.height};objectCache.set(i.objectId,value);infoBySource.set(value,i);
 registerSkyNativeImageLifetime(value,()=>eligibleObjects.has(i.objectId));}return value;};
let texture:any=null,framebuffer:any=null,textureId=0,live=0,peak=0,events:any[]=[];
const allocated=new Map<any,number>(),sourceByTexture=new Map<any,object>(),attachments=new Map<any,any>();
const record=(operation:string,bytes:number,src:any)=>{events.push({operation,bytes,id:src?.offeredId??null,objectId:src?.objectId??null,liveBytes:live});peak=Math.max(peak,live);};
const gl:any={NO_ERROR:0,TEXTURE_2D:3553,TEXTURE_MIN_FILTER:10241,TEXTURE_MAG_FILTER:10240,TEXTURE_WRAP_S:10242,TEXTURE_WRAP_T:10243,LINEAR:9729,
 CLAMP_TO_EDGE:33071,RGBA:6408,UNSIGNED_BYTE:5121,UNPACK_FLIP_Y_WEBGL:37440,UNPACK_PREMULTIPLY_ALPHA_WEBGL:37441,
 FRAMEBUFFER:36160,FRAMEBUFFER_BINDING:36006,COLOR_ATTACHMENT0:36064,FRAMEBUFFER_COMPLETE:36053,
 createTexture(){return {id:++textureId}},bindTexture(_target:any,t:any){texture=t},texParameteri(){},pixelStorei(){},getError(){return 0},isContextLost(){return false},
 texImage2D(...a:any[]){const s=a.at(-1),bytes=s.width*s.height*4;assert(!allocated.has(texture));allocated.set(texture,bytes);sourceByTexture.set(texture,s);live+=bytes;record('source-upload',bytes,infoBySource.get(s));},
 deleteTexture(t:any){const bytes=allocated.get(t)??0;live-=bytes;record('delete',bytes,infoBySource.get(sourceByTexture.get(t)!));allocated.delete(t);sourceByTexture.delete(t);},
 createFramebuffer(){return {}},bindFramebuffer(_target:any,f:any){framebuffer=f},framebufferTexture2D(_target:any,_attachment:any,_type:any,t:any){attachments.set(framebuffer,t)},
 checkFramebufferStatus(){return 36053},getParameter(){return framebuffer},deleteFramebuffer(f:any){attachments.delete(f)},
 copyTexImage2D(...a:any[]){const bytes=a[5]*a[6]*4,s=sourceByTexture.get(attachments.get(framebuffer))!;assert(!allocated.has(texture));allocated.set(texture,bytes);sourceByTexture.set(texture,s);live+=bytes;record('gpu-copy',bytes,infoBySource.get(s));},
};
const owner=createSkyGpuTextures(gl),landscape=metadata.get('/v2/sky/landscape/manifest'),masks=new Map();
for(const resource of landscape.resources)masks.set(resource.id,createSkyPanoramaMask(landscape,resource,
 decodeSkyLandscapeAlpha(metadata.get(resource.alpha.downloadUrl),resource)));
let previousLandscape:any=null;const replay:any[]=[];
for(const row of result.rows){
 eligibleObjects=new Set(row.ready.hooks.flatMap((h:any)=>h.entries.filter((e:any)=>e.current).map((e:any)=>e.image.objectId)));
 const h=(name:string)=>row.ready.hooks.find((h:any)=>h.name===name),art=new Map(h('artwork').ready.map((i:any)=>[i.id,source(i)]));
 const galInfo=h('galacticImage').ready[0],gal=galInfo?source(galInfo):null;
 const land=h('landscapeImage'),landImages=new Map(land.ready.map((i:any)=>[i.id,source(i)])),retained=new Map(land.retainedReady.map((i:any)=>[i.id,source(i)]));
 const resource=selectSkyLandscapeResource(landscape,[...art.values(),gal].filter(Boolean),false);
 const panorama=selectSkyLandscapePanorama(resource,masks,landImages,retained),mask=panorama?.mask??masks.get(resource.id)??masks.get('overview');
 const view={basis:row.condition.basis,verticalFovDeg:row.condition.fov,center:{x:195,y:422}};
 for(let pass=0;pass<3;pass++){
  events=[];peak=live;const textureCalls:any[]=[];
  const surface:any={begin(){owner.begin()},solarLight(){return true},sun(){return true},moon(){return true},planet(){return true},saturnRings(){return true},
   segments(){},disc(){},image(){throw Error('unexpected_image_path')},skyImageMesh(){throw Error('unexpected_hips_path')},
   galacticBand(v:any,band:any,image:any){if(image){const window=skyGalacticImageWindow(v,390,844,band,image.width,image.height);textureCalls.push({kind:'galactic',info:infoBySource.get(image),window});owner.getWindow(image,window);}return true;},
   artwork(image:any,registration:any,v:any,opacity:number){assert(opacity>0);const window=skyArtworkTextureWindow(registration,v,390,844,image.width,image.height);textureCalls.push({kind:'artwork',info:infoBySource.get(image),window:window??null,opacity});owner.getWindow(image,window);return true;},
   landscape(v:any,_sun:any,_observation:any,p:any,opacity:number){if(p&&opacity>0&&skyPanoramaMaskIntersectsView(p.mask,v,390,844)){textureCalls.push({kind:'landscape',info:infoBySource.get(p.image)});owner.get(p.image);}return true;},
   finish(){owner.finish()},
  };
  const args:any[]=Array(36).fill(undefined);Object.assign(args,{0:surface,1:current,2:at,3:null,4:null,5:390,6:844,7:'DAY',
   8:(snapshot:any)=>{previousLandscape=snapshot?.view?.landscape??null},10:row.condition.fov,12:row.condition.basis,13:view.center,
   15:{frame,images:art,enabled:true,failed(){throw Error('unexpected_constellation_failure')}},21:[],26:gal,
   34:{enabled:true,panorama,mask,readiness:1,pending:false,failed:false,previous:previousLandscape},35:{horizontal:false,equatorial:false}});
  (drawSkyScene as any)(...args);
  const expected=row.passes[pass].events.map((e:any)=>({operation:e.operation,bytes:e.bytes,id:e.source?.offeredId??null,objectId:e.source?.objectId??null,liveBytes:e.liveBytes}));
  assert.deepEqual(events,expected,'actual scene/window/texture replay matches observed GPU event sequence '+row.condition.name+'/'+pass);
  assert.equal(live,row.passes[pass].liveBytes);assert.equal(peak,row.passes[pass].peakBytes);
  replay.push({condition:row.condition.name,pass,actualSceneAndTextureOwner:true,controlledGlBookkeeping:true,textureCalls,events:[...events],liveBytes:live,peakBytes:peak});
 }
}
owner.dispose();assert.equal(live,0);assert.equal(allocated.size,0);
save('result.json',{status:'PASS',reviewedResult:bind(r4+'/result.json'),sourceBindings:result.sourceBindings,controls,metrics,replay,
 findings:{warm139SourceUploadBytes:warm.sourceUploadBytes,warm139SourceIdentities:warm.sourceUploads,
  warm139EachUploadedSourceDeletedAtSameFrameEnd:true,warm139NativeDecodeStartsWithinDrawPasses:0,
  return45ImageTransfers:0,return45FreshDecodeStarts:metrics[4].decodeStarts.length,
  encodedCacheFinalBytes:result.final.cache[0].bytes,retentionBudget:SKY_GPU_TEXTURE_BYTE_BUDGET,
  drawBindingIsNotActualShaderSourceCredit:true,sourceRgbaReferenceModelIsNotHeapMeasurement:true},
 scope:'Independent frozen bytes/AST/diagnostic/event arithmetic readback plus actual scene/window/GPU texture-owner replay with logical GL bookkeeping. Original software WebGL evidence observed separately; no new browser, native/driver/GC/FS/performance/capacity or complete-page acceptance.'});
const after=before.map(b=>bind(b.path));assert.deepEqual(after,before);
save('binding.json',{executedScript:bind(relative+'/executed-script.mts.txt'),inputsBefore:before,inputsAfter:after,unchanged:true});
console.log(JSON.stringify({result:bind(relative+'/result.json'),binding:bind(relative+'/binding.json'),inputs:before.length,warm139:warm.sourceUploadBytes,replayFrames:replay.length}));
