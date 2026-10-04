// Observe the actual image Hook/queue with published PNGs and real browser
// decoding, then paint with the frozen production renderer. React effects and
// native filesystem callbacks are controlled; this is not WEAPP/phone or GC proof.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import ts from 'typescript';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
import {projectAdoptedSkyCatalog} from '../../../../apps/wechat-miniapp/src/services/sky-report-catalog.ts';
import {attachSkyCatalog} from '../../../../apps/wechat-miniapp/src/features/sky/sky-stellar-scene.ts';
import {presentSkyTime} from '../../../../apps/wechat-miniapp/src/features/sky/sky-time-presentation.ts';
import {resolveConstellationFrame} from '../../../../apps/wechat-miniapp/src/features/sky/sky-constellation-scene.ts';
import {createSkyViewBasis} from '../../../../apps/wechat-miniapp/src/features/sky/sky-view-projection.ts';
import {artworkIntersectsView} from '../../../../apps/wechat-miniapp/src/features/sky/sky-artwork-visibility.ts';

const task=path.resolve('.codex/work-items/cloud-sky-native-2026-09-22');
const output=path.resolve('output/playwright/cloud-sky-image-intent-0930');
await assert.rejects(fs.access(output),{code:'ENOENT'});await fs.mkdir(output,{recursive:true});
const sha=(value:Uint8Array|string)=>createHash('sha256').update(value).digest('hex');
const read=async(file:string)=>JSON.parse(await fs.readFile(path.join(task,file),'utf8'));
const prior=JSON.parse(await fs.readFile('output/playwright/cloud-sky-scene-v47-lines-checked-0930/result.json','utf8'));
for(const source of prior.sourceHashes)assert.equal(sha(await fs.readFile(source.path)),source.sha256);
const rendererBytes=await fs.readFile('output/playwright/cloud-sky-scene-v47-lines-checked-0930/production.js');
assert.equal(sha(rendererBytes),prior.productionBundleSha256);
const context=(await read('tmp/v45-context-resolved.json')).data;
const raw=projectAdoptedSkyCatalog(await read('tmp/v45-current-public-report.json')).data;
const selected=(await read('tmp/v45-public-altair-position.json')).data;
const base='http://127.0.0.1:60065',publicInputs:any[]=[];
async function get(route:string){
  assert(route.startsWith('/v2/sky/'));
  const reply=await fetch(base+route,{signal:AbortSignal.timeout(15000)});assert.equal(reply.status,200);
  const bytes=Buffer.from(await reply.arrayBuffer());publicInputs.push({route,bytes:bytes.length,sha256:sha(bytes)});return bytes;
}
const publication=JSON.parse((await get('/v2/sky/constellations')).toString()).data;
assert.equal(publication.catalogHash,prior.constellationHash);
const presentation=presentSkyTime(raw,context.selectedAtUtc);assert(presentation);
const catalog=JSON.parse((await get(`/v2/sky/catalogs/${raw.skyScene.catalog.catalogVersion}/${raw.skyScene.catalog.catalogHash}`)).toString()).data;
const report=attachSkyCatalog(presentation.report,catalog);
const frame=resolveConstellationFrame(publication,presentation.report.skyScene,context.selectedAtUtc);assert(frame);
const basis=createSkyViewBasis(selected.position.azimuthDeg,90+selected.position.altitudeDeg,0)!;
const fov=84.63316191100171;
const sources=frame.images.filter(image=>artworkIntersectsView(image.registration,{basis,verticalFovDeg:fov},390,844)).map(image=>image.source);
assert(sources.length>0&&sources.some(source=>source.id==='Aql'));
const hookPath='apps/wechat-miniapp/src/features/sky/use-sky-artwork.ts';
const hookBytes=await fs.readFile(hookPath,'utf8');
const hookSource=ts.createSourceFile(hookPath,hookBytes,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
const hook=hookSource.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='useSkyNativeImages');assert(hook);
const hookJs=ts.transpileModule(hook.getText(hookSource).replace(/^export /u,''),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
const apiPath='apps/wechat-miniapp/src/services/api-client.ts',apiBytes=await fs.readFile(apiPath,'utf8');
const apiSource=ts.createSourceFile(apiPath,apiBytes,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
const urlFunction=apiSource.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='constellationAssetUrl');assert(urlFunction);
const urlJs=ts.transpileModule(urlFunction.getText(apiSource).replace(/^export /u,''),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
const activation:any={},pageHashes=[];
for(const edition of ['before','current']){
  const filename=edition==='before'?path.join(task,'evidence/experience-image-intent-before-2026-09-30.tsx'):'apps/wechat-miniapp/src/features/sky/spot-sky-page.tsx';
  const bytes=await fs.readFile(filename,'utf8'),source=ts.createSourceFile(filename,bytes,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  const calls:ts.CallExpression[]=[];const visit=(node:ts.Node)=>{if(ts.isCallExpression(node)&&ts.isIdentifier(node.expression)&&node.expression.text==='useSkyArtwork')calls.push(node);ts.forEachChild(node,visit);};visit(source);
  assert.equal(calls.length,1);const argument=calls[0]!.arguments[3];assert(argument);
  const expression=ts.transpileModule(`(${argument.getText(source)})`,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
  const evaluate=(enabled:boolean)=>Boolean(vm.runInNewContext(expression,{pageVisible:true,constellationsEnabled:enabled,rawReportData:{},report:{data:{dataState:'FRESH'},isError:false}}));
  activation[edition]={on:evaluate(true),off:evaluate(false)};pageHashes.push({edition,path:filename,sha256:sha(bytes)});
}
assert.deepEqual(activation,{before:{on:true,off:true},current:{on:true,off:false}});
const native=await build({stdin:{resolveDir:process.cwd(),contents:
  "export {createSkyArtworkLoader} from './apps/wechat-miniapp/src/features/sky/sky-artwork-loader';export {startSkyArtworkRequest} from './apps/wechat-miniapp/src/features/sky/sky-artwork-request';export {skyImageFileSession} from './apps/wechat-miniapp/src/services/sky-image-file-session';"},
  bundle:true,write:false,metafile:true,platform:'browser',format:'iife',globalName:'imageOwner',target:'es2022'});
const nativeBytes=native.outputFiles[0]!.text;await fs.writeFile(path.join(output,'owner.js'),nativeBytes,{flag:'wx'});
const sourceHashes=await Promise.all(Object.keys(native.metafile!.inputs).filter(file=>file!=='<stdin>').map(async file=>({path:file,sha256:sha(await fs.readFile(file))})));
const {chromium}=createRequire(import.meta.url)('C:/Users/777/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader']});
const results:any[]=[];
try{
  for(const edition of ['before','current']){
    const page=await browser.newPage({viewport:{width:390,height:844}}),errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
    await page.route(base+'/__task/image-intent-observation',route=>route.fulfill({contentType:'text/html',body:'<style>body{margin:0}canvas{display:block}</style><canvas width="390" height="844"></canvas>'}));
    await page.goto(base+'/__task/image-intent-observation');await page.evaluate('globalThis.__name=target=>target');
    await page.addScriptTag({content:nativeBytes});await page.addScriptTag({content:rendererBytes.toString()});
    await page.evaluate(({hookJs,urlJs,sources,hash,activation,base})=>{
      const api=(globalThis as any).imageOwner,slots:any[]=[],effects:Array<()=>void>=[],files=new Map<string,ArrayBuffer>(),blobUrls=new Map<string,string>();
      const metrics={requests:[] as any[],removed:[] as string[],decoded:0,heldWrites:[] as any[],holdWrites:false};
      let cursor=0,dirty=false,active=true,wanted=sources,last:any;
      const same=(a:unknown[]|undefined,b:unknown[])=>a?.length===b.length&&b.every((value,index)=>Object.is(value,a![index]));
      const bindings:any={EMPTY:{images:new Map(),retainedImages:new Map(),loading:false,failed:false},...api,
        useRef(initial:unknown){const index=cursor++;return slots[index]??={current:initial};},
        useState(initial:unknown){const index=cursor++;if(!(index in slots))slots[index]=initial;return [slots[index],(value:any)=>{const next=typeof value==='function'?value(slots[index]):value;if(!Object.is(next,slots[index])){slots[index]=next;dirty=true;}}];},
        useCallback(callback:unknown){cursor++;return callback;},
        useEffect(effect:()=>void|(()=>void),deps:unknown[]){const index=cursor++,previous=slots[index];if(same(previous?.deps,deps))return;slots[index]={deps};effects.push(()=>{previous?.cleanup?.();slots[index].cleanup=effect();});},
        Taro:{env:{USER_DATA_PATH:'/owned'},request(options:any){const controller=new AbortController(),item:any={url:options.url,status:null,bytes:0,sha256:null,aborted:false};metrics.requests.push(item);
          fetch(options.url,{signal:AbortSignal.any([controller.signal,AbortSignal.timeout(15000)])}).then(async response=>{const data=await response.arrayBuffer();item.status=response.status;item.bytes=data.byteLength;
            item.sha256=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',data))).map(value=>value.toString(16).padStart(2,'0')).join('');options.success({statusCode:response.status,data});}).catch(()=>options.fail());
          return {abort(){item.aborted=true;controller.abort();}};},
          getFileSystemManager(){return {writeFile(options:any){if(metrics.holdWrites){metrics.heldWrites.push(options);return;}files.set(options.filePath,options.data);options.success();},unlink(options:any){metrics.removed.push(options.filePath);files.delete(options.filePath);const blob=blobUrls.get(options.filePath);if(blob)URL.revokeObjectURL(blob);blobUrls.delete(options.filePath);}};}}};
      const loadHook=new Function(...Object.keys(bindings),hookJs+';return useSkyNativeImages;')(...Object.values(bindings));
      const resolveUrl=new Function('__MINIAPP_API_BASE__','MINIAPP_API_BASE_PATH',urlJs+';return constellationAssetUrl;')(base,'/v2');
      const canvas={createImage(){const image=new Image(),nativeSrc=Object.getOwnPropertyDescriptor(HTMLImageElement.prototype,'src')!;let filePath='';
        Object.defineProperty(image,'src',{get:()=>filePath,set(value:string){filePath=value;const data=files.get(value);if(!data)throw Error('owned_file_required');const blob=URL.createObjectURL(new Blob([data],{type:'image/png'}));blobUrls.set(value,blob);nativeSrc.set!.call(image,blob);}});
        metrics.decoded++;return image;}};
      const render=()=>{cursor=0;dirty=false;last=loadHook(canvas,1,hash,active,wanted,(asset:any)=>({url:resolveUrl(hash,asset.file),format:'png'}));return last;};
      const flush=()=>{do{for(const effect of effects.splice(0))effect();if(dirty)render();}while(effects.length||dirty);return render();};
      const step=(enabled:boolean,figures:any[])=>{active=enabled?activation.on:activation.off;wanted=figures;render();return flush();};
      const observe=()=>{flush();const held=slots.find(slot=>slot?.owner&&slot?.value?.images instanceof Map),unique=new Set<object>([...last.images.values(),...last.retainedImages.values()]);
        return {images:last.images.size,retained:last.retainedImages.size,uniqueDecodedImages:unique.size,heldRgbaBytes:[...unique].reduce((sum,image:any)=>sum+image.width*image.height*4,0),heldHookState:Boolean(held),loading:last.loading,failed:last.failed,files:files.size,encodedBytes:[...files.values()].reduce((sum,bytes)=>sum+bytes.byteLength,0),blobUrls:blobUrls.size,requests:metrics.requests.length,createdImages:metrics.decoded};};
      (globalThis as any).intent={step,flush,observe,value:()=>last,metrics,files,
        hide(){active=false;wanted=[];render();flush();},
        finishWrites(){metrics.holdWrites=false;for(const options of metrics.heldWrites.splice(0)){files.set(options.filePath,options.data);options.success();}}};
      step(true,sources);
    },{hookJs,urlJs,sources,hash:publication.catalogHash,activation:activation[edition],base});
    const ready=()=>page.waitForFunction(count=>{const h=(globalThis as any).intent,value=h.observe();return value.images===count&&!value.loading&&!value.failed;},sources.length,{timeout:30000});
    await ready();const observations:any[]=[];
    const observe=async(name:string)=>{const value=await page.evaluate(()=>(globalThis as any).intent.observe());observations.push({name,...value});return value;};
    const initial=await observe('wide-ready');assert.equal(initial.images,sources.length);
    async function paint(name:string,enabled:boolean,field=fov){
      const painted=await page.evaluate(({report,at,basis,frame,enabled,field})=>{
        const gl=document.querySelector('canvas')!.getContext('webgl',{preserveDrawingBuffer:true,antialias:false})!;
        const owner=(globalThis as any).scene47Gpu,h=(globalThis as any).intent;
        const renderer=(globalThis as any).intentRenderer??=owner.createSkyGpuRenderer(gl,1);let snapshot:any;const failures:any[]=[];
        const args:any[]=[renderer,report,at,null,null,390,844,'DAY',(value:any)=>snapshot=value,undefined,field,null,basis];
        args[15]={frame,images:h.value().images,enabled,failed(){failures.push('artwork');}};args[34]={enabled:false};args[35]={horizontal:false,equatorial:false};
        owner.drawSkyScene(...args);gl.finish();const pixels=new Uint8Array(390*844*4);gl.readPixels(0,0,390,844,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
        const target=snapshot.objects.find((object:any)=>object.reference==='HR:7557');if(!target)throw Error('painted_altair_required');
        const picked=owner.pickPaintedSkyObjects(snapshot,{x:target.x,y:target.y,frameAt:snapshot.frameAt,catalogVersion:snapshot.catalogVersion,catalogHash:snapshot.catalogHash}).map((object:any)=>object.reference);
        let binary='';for(let i=0;i<pixels.length;i+=32768)binary+=String.fromCharCode(...pixels.subarray(i,i+32768));
        return {rgbaBase64:btoa(binary),snapshot,picked,failures,glError:gl.getError()};
      },{report,at:context.selectedAtUtc,basis,frame,enabled,field});
      assert.equal(painted.glError,0);assert.deepEqual(painted.failures,[]);assert.equal(painted.picked[0],'HR:7557');
      const rgbaSha256=sha(Buffer.from(painted.rgbaBase64,'base64'));
      if(['wide-ready','wide-off','wide-restored','local-cache'].includes(name))await page.locator('canvas').screenshot({path:path.join(output,`${edition}-${name}.png`)});
      return {name,rgbaSha256,pickSha256:sha(JSON.stringify(painted.snapshot)),paintedObjects:painted.snapshot.objects.length,picked:painted.picked};
    }
    const pictures=[await paint('wide-ready',true)];
    await page.evaluate(()=>(globalThis as any).intent.step(true,[]));const local=await observe('local-cache');
    assert.equal(local.retained,sources.length);assert.equal(local.requests,initial.requests);assert.equal(local.heldRgbaBytes,initial.heldRgbaBytes);
    pictures.push(await paint('local-cache',true,8.89));
    await page.evaluate(sources=>(globalThis as any).intent.step(true,sources),sources);await ready();
    assert.equal((await observe('wide-cache-return')).requests,initial.requests);
    await page.evaluate(()=>(globalThis as any).intent.step(false,[]));const off=await observe('wide-off');pictures.push(await paint('wide-off',false));
    if(edition==='current'){assert.equal(off.files,0);assert.equal(off.uniqueDecodedImages,0);assert.equal(off.heldHookState,false);assert.equal(off.blobUrls,0);}
    else {assert.equal(off.files,initial.files);assert.equal(off.heldRgbaBytes,initial.heldRgbaBytes);assert.equal(off.heldHookState,true);}
    await page.evaluate(sources=>(globalThis as any).intent.step(true,sources),sources);await ready();const restored=await observe('wide-restored');pictures.push(await paint('wide-restored',true));
    assert.equal(pictures[0].rgbaSha256,pictures.at(-1)!.rgbaSha256);assert.equal(pictures[0].pickSha256,pictures.at(-1)!.pickSha256);
    assert.equal(restored.requests,edition==='current'?initial.requests*2:initial.requests);
    if(edition==='current'){
      await page.evaluate(()=>{const h=(globalThis as any).intent;h.step(false,[]);h.metrics.holdWrites=true;});
      await page.evaluate(sources=>(globalThis as any).intent.step(true,sources),sources);
      await page.waitForFunction(()=>(globalThis as any).intent.metrics.heldWrites.length===2,null,{timeout:30000});
      const pending=await observe('pending-two-writes');
      await page.evaluate(()=>{const h=(globalThis as any).intent;h.step(false,[]);h.finishWrites();});
      const canceled=await observe('late-writes-after-off');assert.equal(canceled.files,0);assert.equal(canceled.heldHookState,false);assert.equal(canceled.createdImages,pending.createdImages);
    }
    const requests=await page.evaluate(()=>(globalThis as any).intent.metrics.requests);
    for(const request of requests){const source=sources.find(source=>request.url.endsWith('/'+source.file));assert(source);assert.equal(request.status,200);assert.equal(request.bytes,source.bytes);assert.equal(request.sha256,source.sha256);}
    await page.evaluate(()=>{(globalThis as any).intentRenderer.dispose();(globalThis as any).intent.hide();});
    const retired=await observe('page-retired');assert.equal(retired.files,0);assert.equal(retired.heldHookState,false);assert.equal(retired.blobUrls,0);
    assert.deepEqual(errors,[]);results.push({edition,observations,pictures,requests,errors});await page.close();
  }
}finally{await browser.close();}
for(const name of ['wide-ready','wide-off','wide-restored','local-cache']){
  const a=results[0].pictures.find((row:any)=>row.name===name),b=results[1].pictures.find((row:any)=>row.name===name);
  assert.equal(a.rgbaSha256,b.rgbaSha256);assert.equal(a.pickSha256,b.pickSha256);
}
assert.notEqual(results[1].pictures[0].rgbaSha256,results[1].pictures[2].rgbaSha256,'on/off intent must affect real pixels');
const result={scope:'Actual production Hook/queue/request and published PNG HTTP bytes, real HTMLImage decoding, original production software WebGL and painted picking; controlled React/native callbacks',
  at:context.selectedAtUtc,publicationHash:publication.catalogHash,rendererSha256:sha(rendererBytes),ownerBundleSha256:sha(nativeBytes),hookSha256:sha(hookBytes),apiClientSha256:sha(apiBytes),pageHashes,sourceHashes,
  activation,publicInputs,sources,results,limits:['Not WEAPP SDK, phone delivery, ordinary overlays, native/driver GC, peak memory or target frame performance','Closing the layer intentionally re-fetches/re-decodes its published images when re-enabled; local reverse zoom retains its existing bounded cache','No source image, coordinates, texture quality or renderer budget changed']};
await fs.writeFile(path.join(output,'result.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({output,sources:sources.length,heldRgbaBytes:results[0].observations[0].heldRgbaBytes,
  beforeOff:results[0].observations.find((row:any)=>row.name==='wide-off'),afterOff:results[1].observations.find((row:any)=>row.name==='wide-off'),
  pixelAndPickEquality:true,localReturnRequests:results[1].observations.find((row:any)=>row.name==='wide-cache-return').requests,lateWritesReleased:true,limits:result.limits}));
