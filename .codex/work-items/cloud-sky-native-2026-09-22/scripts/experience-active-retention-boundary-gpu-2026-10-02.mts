/** Task-only active-retention shared-boundary probes, actual original M42 texels and software GL. */
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
const ROOT=fileURLToPath(new URL('../../../../',import.meta.url));
const task='.codex/work-items/cloud-sky-native-2026-09-22';
const sha=(b:Uint8Array|string)=>createHash('sha256').update(b).digest('hex');
const read=(p:string)=>fs.readFile(path.join(ROOT,p));
const bind=async(p:string)=>{const b=await read(p);return {path:p,bytes:b.length,sha256:sha(b)};};
const output=process.argv.find(p=>p.startsWith('--output='))?.slice(9)!;
assert.match(output??'',/^output\/playwright\/cloud-sky-active-retention-boundary-1002-r\d+$/);
const directory=path.join(ROOT,output);await assert.rejects(fs.access(directory),{code:'ENOENT'});await fs.mkdir(directory,{recursive:true});
await fs.copyFile(fileURLToPath(import.meta.url),path.join(directory,'executed-script.mts.txt'));
const candidatePath='output/active-texture-retention-candidate-1002-r2/candidate-owner.ts.txt';
const ownerPath='apps/wechat-miniapp/src/features/sky/sky-gpu-textures.ts';
const original=(await read(ownerPath)).toString(),candidate=(await read(candidatePath)).toString();
assert.equal(sha(original),'cbbe372034a2b49d0ed04af9c25eb4b986318842dd06b4fba931bb351e3c6b3e');
assert.equal(sha(candidate),'0201b42d5cbe371f1a3b45d2baba36b06a5a8dedc3585d1fc4111d167fa45448');
const guards='!previousFrame.has(key) && !pinned.has(key)',start=original.indexOf('      // Partial residents cost a whole source upload to recreate.',original.indexOf('    finish() {')),end=original.indexOf('      previousFrame.clear();',start);
assert.equal(original.split(guards).length-1,2);assert(start>0&&end>start);
assert.equal(candidate,(original.slice(0,start)+'      // Task candidate: retain every current-frame texture; retire inactive identities.\n      for (const key of entries.keys()) if (!used.has(key)) remove(key);\n'+original.slice(end)).replaceAll(guards,'!used.has(key) && !pinned.has(key)'));
// Bounded mutation removes both live-owner checks. It does not change image bytes or expected pixels.
assert.equal(candidate.split('!skyNativeImageIsCurrent(source)').length-1,2);
const mutated=candidate.replaceAll('!skyNativeImageIsCurrent(source)','false /* task-only retirement bypass */');
const tap=(source:string)=>{
 const needle='  return {\n    begin() {';assert.equal(source.split(needle).length-1,1);
 const suffix='  };\n}';assert.equal(source.split(suffix).length-1,1);
 return source.replace(needle,'  const owner = {\n    begin() {').replace(suffix,`  };
  const world=(globalThis as any).__boundaryWorld;
  world.owner=owner;
  const taskBoundaryOriginalGetWindow=owner.getWindow;
  owner.getWindow=function(source:any,requested?:any) {
    try {const value=taskBoundaryOriginalGetWindow(source,requested);world.calls.push({method:'getWindow',source:world.ids.get(source),requested:requested??null,window:value.window,bytes:value.bytes,texture:world.textureId(value.texture)});return value;}
    catch(error){world.calls.push({method:'getWindow',source:world.ids.get(source),requested:requested??null,error:String(error)});throw error;}
  };
  const pin=owner.withPinned;
  owner.withPinned=function(sources:any,submit:any) {world.calls.push({method:'pin-enter',sources:sources.map((s:any)=>world.ids.get(s))});try{return pin(sources,submit);}finally{world.calls.push({method:'pin-exit'});}};
  return owner;
}`);
};
const frozenPath='output/playwright/cloud-sky-artwork-window-sampling-1001-r2/result.json';
const frozen=JSON.parse((await read(frozenPath)).toString());
const assets:any[]=[];for(const a of frozen.assets.filter((a:any)=>a.reference==='M:42')){
 const b=await read(a.file);assert.equal(sha(b),a.sha256);assert.equal(b.length,a.bytes);
 assets.push({...a,data:'data:image/png;base64,'+b.toString('base64')});
}assert.equal(assets.length,2);
const settings={stdin:{resolveDir:ROOT,contents:"export {createSkyGpuRenderer} from './apps/wechat-miniapp/src/features/sky/sky-gpu-renderer'; export {createSkyGpuTextures} from './apps/wechat-miniapp/src/features/sky/sky-gpu-textures'; export {registerSkyNativeImageLifetime,skyNativeImageIsCurrent} from './apps/wechat-miniapp/src/features/sky/sky-artwork-loader';"},bundle:true,write:false,metafile:true,platform:'browser' as const,format:'iife' as const,globalName:'boundaryApi',target:'es2022',tsconfig:path.join(ROOT,'apps/wechat-miniapp/tsconfig.json')};
const variants:Record<string,any>={};const allInputs=new Set<string>([ownerPath,candidatePath,frozenPath,...assets.map(a=>a.file)]);
for(const [name,source] of Object.entries({baseline:original,active:candidate,retirementMutant:mutated})){
 const tapped=tap(source);await fs.writeFile(path.join(directory,name+'-tapped-owner.ts.txt'),tapped,{flag:'wx'});
 const compiled=await build({...settings,plugins:[{name:'task-only-owner-injection',setup(b){b.onLoad({filter:/sky-gpu-textures\.ts$/},()=>({contents:tapped,loader:'ts'}));}}]});
 for(const p of Object.keys(compiled.metafile!.inputs).filter(p=>p!=='<stdin>'))allInputs.add(path.relative(ROOT,path.resolve(ROOT,p)).replaceAll('\\','/'));
 const bundle=compiled.outputFiles[0]!.text;await fs.writeFile(path.join(directory,name+'.js'),bundle,{flag:'wx'});
 variants[name]={sourceHash:sha(source),tappedHash:sha(tapped),bundleHash:sha(bundle),bundle,metafile:compiled.metafile};
}
const before=await Promise.all([...allInputs].sort().map(bind));
await fs.writeFile(path.join(directory,'inputs-before.json'),JSON.stringify(before,null,2)+'\n',{flag:'wx'});
const {chromium}=createRequire(import.meta.url)('C:/Users/777/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader']});
const rows:any[]=[],errors:any[]=[];
const pixels=new Map<string,Buffer>();
try{
 for(const [variant,b] of Object.entries(variants)){
  const page=await browser.newPage({viewport:{width:390,height:844}});page.on('pageerror',(e:Error)=>errors.push({variant,error:e.message}));
  await page.setContent('<canvas id="probe" width="390" height="844"></canvas>');await page.addScriptTag({content:'globalThis.__name=(fn,name)=>fn;'});await page.addScriptTag({content:b.bundle});
  await page.evaluate(async (assets:any[])=>{const images=new Map(),ids=new WeakMap();for(const a of assets){const image=new Image();image.src=a.data;await image.decode();if(image.width!==a.pixels||image.height!==a.pixels)throw Error('actual_image_dimensions');images.set(a.level,image);ids.set(image,a.level);} (globalThis as any).__boundaryImages={images,ids};},assets);
  const cases=variant==='retirementMutant'?['retire']:['coarse-only','pair','same-image','fine-failure','copy-failure','retire','context-loss'];
  for(const name of cases){
   const value=await page.evaluate(async({name,assets}:any)=>{
    const api=(globalThis as any).boundaryApi,input=(globalThis as any).__boundaryImages;
    // Each mechanism has an isolated GPU owner so optional-path/failure latches cannot contaminate another case.
    const canvas=document.createElement('canvas');canvas.width=390;canvas.height=844;document.body.append(canvas);
    const gl=canvas.getContext('webgl',{preserveDrawingBuffer:true,antialias:false})!;if(!gl)throw Error('software_webgl_unavailable');
    const methods:any={};for(const key of ['createTexture','deleteTexture','texImage2D','copyTexImage2D','bindFramebuffer','framebufferTexture2D','createFramebuffer','deleteFramebuffer','createBuffer','deleteBuffer','createProgram','deleteProgram','drawArrays'])methods[key]=(gl as any)[key].bind(gl);
    let sequence=0,liveBytes=0,peak=0,copyAttempts=0,failAttempts=0,frame=0,currentDraw=false;
    const events:any[]=[],calls:any[]=[],sizes=new Map(),textureIds=new Map(),textureSources=new Map(),attachments=new Map(),owned=new Set(),framebuffers=new Set(),buffers=new Set(),programs=new Set();
    const ids=input.ids,textureId=(t:any)=>t?textureIds.get(t):null;
    const event=(operation:string,detail:any={})=>{peak=Math.max(peak,liveBytes);events.push({operation,frame,liveBytes,...detail});};
    const identity=(source:any)=>ids.get(source)??'unknown';
    gl.createTexture=()=>{const t=methods.createTexture();if(t){owned.add(t);textureIds.set(t,++sequence);event('texture-create',{texture:textureId(t)});}return t;};
    gl.deleteTexture=(t:any)=>{if(t){if(!owned.delete(t))throw Error('delete_unowned_texture');const bytes=sizes.get(t)??0;liveBytes-=bytes;sizes.delete(t);event('texture-delete',{texture:textureId(t),bytes,source:textureSources.get(t)??null});}methods.deleteTexture(t);};
    const allocate=(t:any,n:number,source:string,operation:string)=>{const old=sizes.get(t)??0;liveBytes+=n-old;sizes.set(t,n);textureSources.set(t,source);event(operation,{texture:textureId(t),source,bytes:n});};
    (gl as any).texImage2D=(...args:any[])=>{const source=args.at(-1),id=identity(source),t=gl.getParameter(gl.TEXTURE_BINDING_2D);if(name==='fine-failure'&&id==='DETAIL'){failAttempts++;event('upload-injected-failure',{source:id,texture:textureId(t)});throw Error('controlled_fine_upload_exception');}const result=methods.texImage2D(...args);allocate(t,source.width*source.height*4,id,'source-upload');return result;};
    (gl as any).copyTexImage2D=(...args:any[])=>{copyAttempts++;if(name==='copy-failure'){event('copy-injected-failure');throw Error('controlled_optional_copy_exception');}if(name==='context-loss'){gl.getExtension('WEBGL_lose_context')!.loseContext();event('actual-context-loss',{lost:gl.isContextLost()});throw Error('controlled_copy_exception_after_actual_context_loss');}const result=methods.copyTexImage2D(...args),t=gl.getParameter(gl.TEXTURE_BINDING_2D),source=textureSources.get(attachments.get(gl.getParameter(gl.FRAMEBUFFER_BINDING)))??'unknown';allocate(t,args[5]*args[6]*4,source,'window-copy');return result;};
    gl.createFramebuffer=()=>{const f=methods.createFramebuffer();if(f)framebuffers.add(f);return f;};gl.deleteFramebuffer=(f:any)=>{if(f&&!framebuffers.delete(f))throw Error('delete_unowned_framebuffer');attachments.delete(f);methods.deleteFramebuffer(f);};
    gl.framebufferTexture2D=(...a:any[])=>{attachments.set(gl.getParameter(gl.FRAMEBUFFER_BINDING),a[3]);return methods.framebufferTexture2D(...a);};
    for(const [create,remove,set] of [['createBuffer','deleteBuffer',buffers],['createProgram','deleteProgram',programs]] as any[]){(gl as any)[create]=()=>{const v=methods[create]();if(v)set.add(v);return v;};(gl as any)[remove]=(v:any)=>{set.delete(v);return methods[remove](v);};}
    gl.drawArrays=(...a:any[])=>{event('draw',{group:currentDraw,texture0:textureId(gl.getParameter(gl.TEXTURE_BINDING_2D))});return methods.drawArrays(...a);};
    (globalThis as any).__boundaryWorld={ids,calls,textureId,owner:null};
    const failures:string[]=[],renderer=api.createSkyGpuRenderer(gl,1,{imageFailed:(s:any)=>failures.push(identity(s)),textureByteBudget:1}),owner=(globalThis as any).__boundaryWorld.owner;
    const co=assets.find((a:any)=>a.level==='OVERVIEW'),fine=assets.find((a:any)=>a.level==='DETAIL');
    const view={basis:co.basis,verticalFovDeg:.16};
    let coImage=input.images.get('OVERVIEW'),fineImage=input.images.get('DETAIL');
    const retireStops:any[]=[],registeredImages:any[]=[];
    const register=(image:any,current:any)=>{const stop=api.registerSkyNativeImageLifetime(image,current);retireStops.push(stop);registeredImages.push(image);return stop;};
    const lifetime={live:true},retire=register(coImage,()=>lifetime.live);
    register(fineImage,()=>true);
    const level=(image:any,registration:any)=>({image,registration,sampleAvailability:'joint-area-alpha'});
    const frames:any[]=[];
    const capture=(label:string,prepared:any,firstEvent:number,firstCall:number)=>{gl.finish();const rgba=new Uint8Array(390*844*4);gl.readPixels(0,0,390,844,gl.RGBA,gl.UNSIGNED_BYTE,rgba);let binary='';for(let i=0;i<rgba.length;i+=32768)binary+=String.fromCharCode(...rgba.subarray(i,i+32768));frames.push({label,prepared,events:events.slice(firstEvent),calls:calls.slice(firstCall),rgba:btoa(binary),png:canvas.toDataURL('image/png'),glError:gl.getError(),liveBytes,peakBytes:peak,ownedTextures:owned.size,framebufferRestored:gl.getParameter(gl.FRAMEBUFFER_BINDING)===null});};
    const submit=(label:string,kind:string)=>{frame++;const e=events.length,c=calls.length;peak=liveBytes;renderer.begin(390,844,'#21344C');currentDraw=true;let prepared:any;try{prepared=renderer.artworkLevels({coarse:level(coImage,co.registration),fine:kind==='coarse'?null:level(name==='same-image'?coImage:fineImage,fine.registration)},view,.73);}finally{currentDraw=false;}renderer.finish();capture(label,prepared,e,c);};
    let contextError:string|null=null,stale:any=null;
    if(name==='context-loss'){
     // Non-empty pre-loss frame establishes functioning actual renderer/source, then force copy on a new owner frame.
     frame++;renderer.begin(390,844,'#21344C');renderer.artwork(coImage,co.registration,{...view,verticalFovDeg:8},.73,'#FFFFFF');renderer.finish();capture('before-loss',{submitted:true},0,0);
     frame++;try{renderer.begin(390,844,'#21344C');renderer.artworkLevels({coarse:level(coImage,co.registration),fine:null},view,.73);}catch(error){contextError=String(error);}if(!gl.isContextLost())throw Error('real_context_loss_not_observed');
    }else if(name==='retire'){
     submit('ready','coarse');lifetime.live=false;retire();
     const firstEvent=events.length,firstCall=calls.length;
     stale=owner.getWindow(coImage);stale={texture:textureId(stale.texture),bytes:stale.bytes,window:stale.window};
     event('stale-direct-observation',{...stale});submit('retired','coarse');
     const replacement=new Image();replacement.src=coImage.src;await replacement.decode();ids.set(replacement,'OVERVIEW:replacement');register(replacement,()=>true);coImage=replacement;
     submit('replacement','coarse');
     // Capture direct stale guard independently of begin pruning, including events absent from later frame slice.
     frames[1].directStale={events:events.slice(firstEvent,events.findIndex((x:any,i:number)=>i>=firstEvent&&x.operation==='stale-direct-observation')+1),calls:calls.slice(firstCall,firstCall+1),result:stale};
    }else{
     const kind=name==='coarse-only'?'coarse':'pair';for(let pass=0;pass<3;pass++)submit('pass-'+pass,kind);
     if(name==='fine-failure'){const replacement=new Image();replacement.src=fineImage.src;await replacement.decode();ids.set(replacement,'DETAIL:replacement');register(replacement,()=>true);fineImage=replacement;submit('recovered','pair');}
    }
    let empty:any=null;if(!gl.isContextLost()){frame++;const e=events.length,c=calls.length;peak=liveBytes;renderer.begin(390,844,'#21344C');renderer.finish();capture('empty',{submitted:false},e,c);empty={liveBytes,ownedTextures:owned.size};}
    const beforeDispose={liveBytes,ownedTextures:owned.size,framebuffers:framebuffers.size,buffers:buffers.size,programs:programs.size,lost:gl.isContextLost()};
    retireStops.forEach(stop=>stop());
    const lifetimesAfterOwnerRetirement=registeredImages.map(image=>({source:identity(image),current:api.skyNativeImageIsCurrent(image)}));
    const afterRetirementBeforeDispose=registeredImages.map(image=>{const v=owner.getWindow(image);return {source:identity(image),texture:textureId(v.texture),bytes:v.bytes};});
    renderer.dispose();renderer.dispose();
    const disposed={liveBytes,ownedTextures:owned.size,framebuffers:framebuffers.size,buffers:buffers.size,programs:programs.size};
    retire();const isCurrentAfterRetirement=api.skyNativeImageIsCurrent(input.images.get('OVERVIEW'));
    const result={name,frames,events,calls,failures,failAttempts,copyAttempts,contextError,beforeDispose,lifetimesAfterOwnerRetirement,afterRetirementBeforeDispose,disposed,empty,isCurrentAfterRetirement,precision:(()=>{const p=gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER,gl.HIGH_FLOAT);return p?{rangeMin:p.rangeMin,rangeMax:p.rangeMax,precision:p.precision}:null;})()};
    if(!gl.isContextLost())gl.getExtension('WEBGL_lose_context')?.loseContext();canvas.remove();return result;
   },{name,assets:assets.map(({data,...a})=>a)});
   for(const f of value.frames){const raw=Buffer.from(f.rgba,'base64'),png=Buffer.from(f.png.split(',')[1],'base64');const id=[variant,name,f.label].join('-');await fs.writeFile(path.join(directory,id+'.rgba'),raw,{flag:'wx'});await fs.writeFile(path.join(directory,id+'.png'),png,{flag:'wx'});pixels.set(id,raw);f.rgbaSha256=sha(raw);f.pngSha256=sha(png);delete f.rgba;delete f.png;}
   assert.deepEqual(value.disposed,{liveBytes:0,ownedTextures:0,framebuffers:0,buffers:0,programs:0});
   assert.equal(value.isCurrentAfterRetirement,false);assert(value.lifetimesAfterOwnerRetirement.every((i:any)=>i.current===false));if(variant!=='retirementMutant')assert(value.afterRetirementBeforeDispose.every((i:any)=>i.texture===null&&i.bytes===0));for(const f of value.frames){assert.equal(f.glError,0);assert.equal(f.framebufferRestored,true);}
   if(name==='context-loss'){assert.equal(value.contextError,'Error: sky_gpu_context_lost');assert.equal(value.beforeDispose.lost,true);assert.deepEqual(value.failures,[]);}
   else{assert.deepEqual(value.empty,{liveBytes:0,ownedTextures:0});assert.deepEqual(value.failures,name==='fine-failure'?['DETAIL']:[]);}
   rows.push({variant,...value});
  }await page.close();
 }
 await fs.writeFile(path.join(directory,'observations-before-oracles.json'),JSON.stringify({rows,errors},null,2)+'\n',{flag:'wx'});
 const comparisons:any[]=[];
 const compare=(a:string,b:string,equal:boolean)=>{const x=pixels.get(a)!,y=pixels.get(b)!;assert(x&&y);assert.equal(x.length,y.length);let changedPixels=0,maxDelta=0;for(let i=0;i<x.length;i+=4){let changed=false;for(let c=0;c<4;c++){const d=Math.abs(x[i+c]!-y[i+c]!);maxDelta=Math.max(maxDelta,d);changed ||=d!==0;}if(changed)changedPixels++;}assert.equal(changedPixels===0,equal,a+' vs '+b);const value={a,b,changedPixels,maxDelta,expectedEqual:equal};comparisons.push(value);return value;};
 for(const row of rows.filter(r=>r.variant==='active'))for(const f of row.frames)compare(['active',row.name,f.label].join('-'),['baseline',row.name,f.label].join('-'),true);
 for(const variant of ['baseline','active']){
  for(let p=0;p<3;p++)compare(`${variant}-fine-failure-pass-${p}`,`${variant}-coarse-only-pass-${p}`,true);
  compare(`${variant}-fine-failure-recovered`,`${variant}-pair-pass-0`,true);
  compare(`${variant}-pair-pass-0`,`${variant}-pair-empty`,false);
  compare(`${variant}-same-image-pass-0`,`${variant}-same-image-empty`,false);
  compare(`${variant}-retire-ready`,`${variant}-retire-replacement`,true);
  compare(`${variant}-retire-retired`,`${variant}-retire-empty`,true);
  compare(`${variant}-retire-ready`,`${variant}-retire-retired`,false);
  const r=rows.find(r=>r.variant===variant&&r.name==='retire')!;assert.equal(r.frames[1].directStale.result.texture,null);assert.equal(r.frames[1].directStale.result.bytes,0);assert(!r.frames[1].events.some((e:any)=>e.operation==='source-upload'));
  const fail=rows.find(r=>r.variant===variant&&r.name==='fine-failure')!;assert.equal(fail.failAttempts,1);assert(fail.frames.slice(0,3).every((f:any)=>f.prepared.coarsePrepared&&!f.prepared.finePrepared));
  const copy=rows.find(r=>r.variant===variant&&r.name==='copy-failure')!;assert.equal(copy.copyAttempts,1);assert(copy.frames.slice(0,3).flatMap((f:any)=>f.calls).filter((c:any)=>c.method==='getWindow').every((c:any)=>c.window.x===0&&c.window.y===0&&c.window.width===(c.source==='OVERVIEW'?256:512)&&c.window.height===(c.source==='OVERVIEW'?256:512)));
  const same=rows.find(r=>r.variant===variant&&r.name==='same-image')!;assert(same.frames.slice(0,3).flatMap((f:any)=>f.calls).filter((c:any)=>c.method==='getWindow').every((c:any)=>c.requested===null&&c.window.width===256&&c.window.height===256));assert.equal(same.events.filter((e:any)=>e.operation==='source-upload').length,variant==='active'?1:3,'full same-source texture uploads per actual changed frame-end policy');
  compare(`${variant}-context-loss-before-loss`,`${variant}-coarse-only-empty`,false);
 }
 compare('retirementMutant-retire-retired','active-retire-empty',false);compare('retirementMutant-retire-retired','retirementMutant-retire-ready',true);
 assert(rows.find(r=>r.variant==='retirementMutant')!.frames[1].directStale.result.texture!==null,'retirement oracle detects a resident stale identity with actual visible pixels');
 assert.deepEqual(errors,[]);
 const after=await Promise.all(before.map(b=>bind(b.path)));assert.deepEqual(after,before);
 const artifacts=await Promise.all((await fs.readdir(directory)).filter(n=>/\.(rgba|png|js|txt)$/.test(n)).map(n=>bind(output+'/'+n)));
 const result={status:'BOUNDED_SHARED_BOUNDARY_SOFTWARE_GPU_NOT_ADOPTED',script:await bind(output+'/executed-script.mts.txt'),inputsBefore:before,inputsAfter:after,inputsUnchanged:true,assets:assets.map(({data,...a})=>a),variants:Object.fromEntries(Object.entries(variants).map(([k,{bundle,...v}])=>[k,v])),rows,comparisons,artifacts,errors,
 limits:['Two original/candidate policies through the same actual renderer, weak lifetime owner, HTML-decoded frozen original M42 overview/detail RGBA bytes and original saved report-derived registration. No publication, opacity, shader or texel change.',
 'Task-specific one-byte allocation-pressure budget makes the multisampler/fallback boundary necessary; it is not a production budget or capacity finding. Active candidate may retain every used texture above the original16MiB frame-end cap.',
 'Actual optional copy/upload exceptions are injected at the corresponding GL-call boundary; fine failure tests independent coarse pixels, one latch and fresh identity recovery, not native retry UI. Actual WEBGL_lose_context is invoked during copy after a non-empty pre-loss frame; after-loss pixels are intentionally not interpreted.',
 'Each case creates an isolated GPU owner and the same decoded HTML image identities are re-registered to that controlled lifetime; this directly exercises the real weak-registry checks, not the complete public file-core/Canvas lifecycle.',
 'Retirement bypass mutation removes both owner fences from candidate code and must produce stale visible full pixels; it is a bounded oracle sensitivity check, not another adopted policy.',
 'Software GL event byte ledger excludes physical driver/deferred deletion/native GC, backbuffer, texture bookkeeping and target precision/performance. Full RGBA equality is bounded to these mechanism cases, not whole-page WEAPP/device/quality/capacity acceptance.']};
 await fs.writeFile(path.join(directory,'result.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({result:await bind(output+'/result.json'),rows:rows.length,comparisons:comparisons.length,mutantDifference:comparisons.find(c=>c.a==='retirementMutant-retire-retired'&&!c.expectedEqual)},null,2));
}catch(error){await fs.writeFile(path.join(directory,'failed.json'),JSON.stringify({status:'FAILED',message:String(error),completedRows:rows.map(r=>({variant:r.variant,name:r.name})),errors},null,2)+'\n',{flag:'wx'});throw error;}
finally{await browser.close();}
