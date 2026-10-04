/** Task-only policy study over the independently closed actual texture calls.
 * Mock GL counts allocations; it does not draw pixels or measure a driver. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import ts from 'typescript';
const ROOT=fileURLToPath(new URL('../../../../',import.meta.url));
const relative=process.argv[2];assert.match(relative??'',/^output\/[a-z0-9-]+$/);
const file=(p:string)=>path.join(ROOT,p),sha=(b:Buffer|string)=>createHash('sha256').update(b).digest('hex');
const bind=(p:string)=>{const b=fs.readFileSync(file(p));return {path:p,bytes:b.length,sha256:sha(b)}};
assert(!fs.existsSync(file(relative)));fs.mkdirSync(file(relative));
fs.copyFileSync(fileURLToPath(import.meta.url),file(relative+'/executed-script.mts.txt'),fs.constants.COPYFILE_EXCL);
const reviewPath='output/full-hook-resource-independent-1002-r2/result.json',beforePath='output/playwright/cloud-sky-full-hook-resource-1002-r4/result.json';
assert.equal(bind(reviewPath).sha256,'8bd7f8e49a40e3995abfab33b8c8e37cf7db7bf2127634c1b01c257304e7e41f');
assert.equal(bind(beforePath).sha256,'548b96c4dd399fcc88ff24cb3d73a18a09d884463890bb2a67eb24a4661ba20b');
const review=JSON.parse(fs.readFileSync(file(reviewPath),'utf8')),before=JSON.parse(fs.readFileSync(file(beforePath),'utf8'));
const sourcePath='apps/wechat-miniapp/src/features/sky/sky-gpu-textures.ts',original=fs.readFileSync(file(sourcePath),'utf8');
assert.equal(sha(original),'cbbe372034a2b49d0ed04af9c25eb4b986318842dd06b4fba931bb351e3c6b3e');
const guard='!previousFrame.has(key) && !pinned.has(key)';assert.equal(original.split(guard).length-1,2);
const finishStart=original.indexOf('      // Partial residents cost a whole source upload to recreate.',original.indexOf('    finish() {'));
const finishEnd=original.indexOf('      previousFrame.clear();',finishStart);assert(finishStart>0&&finishEnd>finishStart);
const inactiveOnly='      // Task candidate: retain every current-frame texture; retire inactive identities.\n      for (const key of entries.keys()) if (!used.has(key)) remove(key);\n';
const keepPrevious=original.slice(0,finishStart)+inactiveOnly+original.slice(finishEnd);
const candidate=keepPrevious.replaceAll(guard,'!used.has(key) && !pinned.has(key)');
fs.writeFileSync(file(relative+'/original-owner.ts.txt'),original,{flag:'wx'});
fs.writeFileSync(file(relative+'/candidate-owner.ts.txt'),candidate,{flag:'wx'});
fs.writeFileSync(file(relative+'/keep-previous-owner.ts.txt'),keepPrevious,{flag:'wx'});
const inputs=[reviewPath,beforePath,sourcePath,...before.sourceBindings.map((b:any)=>b.path),
 ...JSON.parse(fs.readFileSync(file('.codex/work-items/cloud-sky-native-2026-09-22/tmp/resume-preserved-hashes-2026-10-01.json'),'utf8')).map((b:any)=>b.path)];
const bindings=[...new Set(inputs)].sort().map(bind);for(const b of before.sourceBindings)assert.deepEqual(bind(b.path),b);
function replay(code:string,copyFailure=false){
 const objects=new Map<number,any>(),info=new Map<object,any>();let eligible=new Set<number>();
 const source=(i:any)=>{let s=objects.get(i.objectId);if(!s){s={width:i.width,height:i.height};objects.set(i.objectId,s);info.set(s,i);}return s;};
 let bound:any=null,framebuffer:any=null,id=0,live=0,peak=0,events:any[]=[];
 const allocations=new Map<any,number>(),sources=new Map<any,object>(),attachments=new Map<any,any>();
 const record=(operation:string,bytes:number,s:any)=>{events.push({operation,bytes,id:s?.offeredId??null,objectId:s?.objectId??null,liveBytes:live});peak=Math.max(peak,live);};
 const gl:any={NO_ERROR:0,TEXTURE_2D:3553,TEXTURE_MIN_FILTER:10241,TEXTURE_MAG_FILTER:10240,TEXTURE_WRAP_S:10242,TEXTURE_WRAP_T:10243,LINEAR:9729,CLAMP_TO_EDGE:33071,
  RGBA:6408,UNSIGNED_BYTE:5121,UNPACK_FLIP_Y_WEBGL:37440,UNPACK_PREMULTIPLY_ALPHA_WEBGL:37441,FRAMEBUFFER:36160,FRAMEBUFFER_BINDING:36006,COLOR_ATTACHMENT0:36064,FRAMEBUFFER_COMPLETE:36053,
  createTexture(){return {id:++id}},bindTexture(_t:any,v:any){bound=v},texParameteri(){},pixelStorei(){},getError(){return 0},isContextLost(){return false},
  texImage2D(...a:any[]){const s=a.at(-1),bytes=s.width*s.height*4;assert(!allocations.has(bound));allocations.set(bound,bytes);sources.set(bound,s);live+=bytes;record('source-upload',bytes,info.get(s));},
  deleteTexture(t:any){const bytes=allocations.get(t)??0;live-=bytes;record('delete',bytes,info.get(sources.get(t)!));allocations.delete(t);sources.delete(t);},
  createFramebuffer(){return {}},bindFramebuffer(_t:any,f:any){framebuffer=f},framebufferTexture2D(_t:any,_a:any,_type:any,t:any){attachments.set(framebuffer,t)},
  checkFramebufferStatus(){return copyFailure?0:36053},getParameter(){return framebuffer},deleteFramebuffer(f:any){attachments.delete(f)},
  copyTexImage2D(...a:any[]){const bytes=a[5]*a[6]*4,s=sources.get(attachments.get(framebuffer))!;assert(!allocations.has(bound));allocations.set(bound,bytes);sources.set(bound,s);live+=bytes;record('gpu-copy',bytes,info.get(s));},
 };
 const module={exports:{} as any};
 const compiled=ts.transpileModule(code,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 vm.runInNewContext(compiled,{exports:module.exports,module,require(name:string){assert.equal(name,'./sky-artwork-loader');return {skyNativeImageIsCurrent(s:object){return eligible.has(info.get(s)?.objectId)}}}});
 const owner=module.exports.createSkyGpuTextures(gl),rows:any[]=[];
 for(const observed of review.replay){
  const row=before.rows.find((r:any)=>r.condition.name===observed.condition);assert(row);
  eligible=new Set(row.ready.hooks.flatMap((h:any)=>h.entries.filter((e:any)=>e.current).map((e:any)=>e.image.objectId)));
  events=[];peak=live;owner.begin();const returned:any[]=[];
  for(const call of observed.textureCalls){const s=source(call.info),prepared=owner.getWindow(s,call.window??undefined);
   assert(prepared.texture);assert(allocations.has(prepared.texture));returned.push({id:call.info.offeredId,objectId:call.info.objectId,window:prepared.window,bytes:prepared.bytes});}
  owner.finish();const retained=[...allocations].map(([texture,bytes])=>({info:info.get(sources.get(texture)!),bytes}));
  rows.push({condition:observed.condition,pass:observed.pass,events:[...events],returned,retained,liveBytes:live,peakBytes:peak,
   sourceUploadBytes:events.filter(e=>e.operation==='source-upload').reduce((n,e)=>n+e.bytes,0),copyBytes:events.filter(e=>e.operation==='gpu-copy').reduce((n,e)=>n+e.bytes,0)});
 }
 events=[];peak=live;owner.begin();owner.finish();assert.equal(live,0);assert.equal(allocations.size,0);
 const emptyFrame={events:[...events],liveBytes:live};
 // Exact ownership callback boundary: all ready identities become retired;
 // stale get must neither reuse a resident nor create a replacement texture.
 const finalCalls=review.replay.at(-1).textureCalls;eligible=new Set(finalCalls.map((c:any)=>c.info.objectId));owner.begin();
 for(const c of finalCalls)owner.getWindow(source(c.info),c.window??undefined);owner.finish();assert(live>0);
 eligible.clear();events=[];owner.begin();assert.equal(live,0);
 for(const c of finalCalls)assert.equal(owner.getWindow(source(c.info),c.window??undefined).texture,null);
 assert(!events.some(e=>e.operation==='source-upload'||e.operation==='gpu-copy'));owner.finish();owner.dispose();assert.equal(live,0);
 return {rows,emptyFrame,retirement:{logicalTextureBytes:live,noStaleUpload:true},dispose:{logicalTextureBytes:live}};
}
const baseline=replay(original),active=replay(candidate),copyBaseline=replay(original,true),copyActive=replay(candidate,true);
const activePrevious=replay(keepPrevious),copyPrevious=replay(keepPrevious,true);
// Original/candidate run in separate VM realms. Compare the plain published
// window values, rather than treating realm-specific Object prototypes as a
// source-pixel discrepancy (the first fixture run stopped at that distinction).
const plain=(value:any)=>JSON.parse(JSON.stringify(value));
for(let i=0;i<review.replay.length;i++){
 const observed=review.replay[i];assert.deepEqual(baseline.rows[i].events,observed.events);assert.equal(baseline.rows[i].peakBytes,observed.peakBytes);assert.equal(baseline.rows[i].liveBytes,observed.liveBytes);
 assert.deepEqual(plain(active.rows[i].returned),plain(baseline.rows[i].returned),'each call sees the same source-pixel window; this is not rendered pixel proof');
 assert.deepEqual(plain(copyActive.rows[i].returned),plain(copyBaseline.rows[i].returned),'optional-copy failure keeps the same full source window');
 assert.deepEqual(plain(activePrevious.rows[i].returned),plain(baseline.rows[i].returned),'narrow finish-only candidate keeps original pressure guards and source-pixel windows');
 assert.deepEqual(plain(copyPrevious.rows[i].returned),plain(copyBaseline.rows[i].returned),'narrow finish-only candidate preserves full-source copy failure');
}
const aggregate=(r:any)=>({maximumPeakBytes:Math.max(...r.rows.map((r:any)=>r.peakBytes)),maximumFrameEndBytes:Math.max(...r.rows.map((r:any)=>r.liveBytes)),
 sourceUploadBytes:r.rows.reduce((n:number,r:any)=>n+r.sourceUploadBytes,0),copyBytes:r.rows.reduce((n:number,r:any)=>n+r.copyBytes,0),
 warm139:r.rows.filter((r:any)=>r.condition==='w3-off-2-139'&&r.pass>0).map((r:any)=>({pass:r.pass,sourceUploadBytes:r.sourceUploadBytes,peakBytes:r.peakBytes,frameEndBytes:r.liveBytes}))});
const result={status:'TASK_ONLY_ACTIVE_RETENTION_POLICY_CANDIDATE_NOT_ADOPTED',input:bind(reviewPath),original:bind(sourcePath),
 changes:['Before a needed source upload, protect identities already used by this frame and pinned multisampler identities, rather than every previous-frame identity.',
  'At frame end, retire identities not used; retain the irreducible current-frame working set even if over the former 16MiB frame-end retention cap.'],
 unchanged:'Original upload/window/copy/failure/lifetime paths; 16MiB remains allocation-pressure target in the task candidate. No production edit, new sources, image resampling, opacity change or new numerical crop.',
 baseline,active,activePrevious,copyFailure:{baseline:copyBaseline,active:copyActive,activePrevious:copyPrevious},summary:{baseline:aggregate(baseline),active:aggregate(active),activePrevious:aggregate(activePrevious),copyFailureBaseline:aggregate(copyBaseline),copyFailureActive:aggregate(copyActive),copyFailureActivePrevious:aggregate(copyPrevious)},
 finishOnlyControl:'A new finding from the actual 13-scene GPU A/B showed extra first-139 uploads with the used-protection change. This bounded alternative keeps the original previous-frame/pinned allocation-pressure guards, changing finish only. It remains unadopted and changes the same sustained-retention policy.',
 limits:['Recorded actual calls from five W3-off/selected-null default-hook scenes at DPR1; not the whole page, W3/Moon/SDSS/selected or moving rotation/fallback acceptance.',
  'Mock GL bookkeeping excludes driver/deferred deletion, native decoding/GC, backbuffer and platform precision. No new rendered pixels or timing measured.',
  'Current-frame retention above 16MiB is an explicit changed policy and sustained memory cost, not a free cache gain or preservation of the old frame-end cap.',
  'No device capacity/budget conclusion or production adoption; broader real moving scenes, failure/multisampler and context lifecycle plus independent review remain prerequisites.']};
fs.writeFileSync(file(relative+'/result.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});
const after=bindings.map(b=>bind(b.path));assert.deepEqual(after,bindings);
fs.writeFileSync(file(relative+'/binding.json'),JSON.stringify({inputsBefore:bindings,inputsAfter:after,unchanged:true,executedScript:bind(relative+'/executed-script.mts.txt'),candidate:bind(relative+'/candidate-owner.ts.txt')},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({result:bind(relative+'/result.json'),summary:result.summary}));
