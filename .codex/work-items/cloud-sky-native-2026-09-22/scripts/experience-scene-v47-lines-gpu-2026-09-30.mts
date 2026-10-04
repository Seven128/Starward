// Current published geometry and original PNGs in the production software GPU.
// This evidence cannot certify native composition or target frame performance.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { performance } from 'node:perf_hooks';
import { build } from 'esbuild';
import { projectAdoptedSkyCatalog } from '../../../../apps/wechat-miniapp/src/services/sky-report-catalog.ts';
import { attachSkyCatalog } from '../../../../apps/wechat-miniapp/src/features/sky/sky-stellar-scene.ts';
import { presentSkyTime } from '../../../../apps/wechat-miniapp/src/features/sky/sky-time-presentation.ts';
import { resolveConstellationFrame } from '../../../../apps/wechat-miniapp/src/features/sky/sky-constellation-scene.ts';
import { createSkyViewBasis } from '../../../../apps/wechat-miniapp/src/features/sky/sky-view-projection.ts';
import { artworkIntersectsView } from '../../../../apps/wechat-miniapp/src/features/sky/sky-artwork-visibility.ts';
import { constellationVisibility, constellationLineVisibility } from '../../../../apps/wechat-miniapp/src/features/sky/sky-constellation-visibility.ts';
import { constellationLineSegments } from '../../../../apps/wechat-miniapp/src/features/sky/sky-constellation-render.ts';

const root=process.cwd(),task=path.resolve('.codex/work-items/cloud-sky-native-2026-09-22');
const output=path.resolve('output/playwright/cloud-sky-scene-v47-lines-checked-0930');
await assert.rejects(fs.access(output),{code:'ENOENT'});await fs.mkdir(output,{recursive:true});
const sha=(value:Uint8Array|string)=>createHash('sha256').update(value).digest('hex');
const read=async(file:string)=>JSON.parse(await fs.readFile(path.join(task,file),'utf8'));
const prior=JSON.parse(await fs.readFile('output/playwright/cloud-sky-scene-v46-cache-after-0930/result.json','utf8'));
const changed=[];
for(const owner of prior.currentSourceHashes)if(sha(await fs.readFile(owner.path))!==owner.sha256)changed.push(owner.path);
assert.deepEqual(changed.sort(),['apps/wechat-miniapp/src/features/sky/sky-constellation-render.ts','apps/wechat-miniapp/src/features/sky/sky-constellation-visibility.ts']);
const previous=await fs.readFile('output/playwright/cloud-sky-scene-v46-cache-after-0930/production.js');
assert.equal(sha(previous),prior.productionBundleSha256);
const context=(await read('tmp/v45-context-resolved.json')).data;
const raw=projectAdoptedSkyCatalog(await read('tmp/v45-current-public-report.json')).data;
const publication=(await read('tmp/v45-public-constellations.json')).data;
const selected=(await read('tmp/v45-public-altair-position.json')).data;
assert.equal(context.selectedAtUtc,'2026-09-30T13:50:33.000Z');assert.equal(selected.reference,'HR:7557');
assert.equal(raw.context.contextId,context.contextId);
const presentation=presentSkyTime(raw,context.selectedAtUtc);assert(presentation);
const frame=resolveConstellationFrame(publication,presentation.report.skyScene,context.selectedAtUtc);assert(frame);
const basis=createSkyViewBasis(selected.position.azimuthDeg,90+selected.position.altitudeDeg,0)!;
const publicInputs:any[]=[];
async function get(route:string){
  assert(route.startsWith('/v2/sky/'));
  const reply=await fetch('http://127.0.0.1:60065'+route,{signal:AbortSignal.timeout(15000)});
  assert.equal(reply.status,200);const bytes=Buffer.from(await reply.arrayBuffer());
  publicInputs.push({route,bytes:bytes.length,sha256:sha(bytes)});return bytes;
}
const catalogBytes=await get(`/v2/sky/catalogs/${raw.skyScene.catalog.catalogVersion}/${raw.skyScene.catalog.catalogHash}`);
const report=attachSkyCatalog(presentation.report,JSON.parse(catalogBytes.toString()).data);
const scenarios=[
  {name:'wide-on',fov:84.63316191100171,enabled:true,mode:'DAY'},
  {name:'local-on',fov:8.89,enabled:true,mode:'DAY'},
  {name:'local-off',fov:8.89,enabled:false,mode:'DAY'},
  {name:'local-red-on',fov:8.89,enabled:true,mode:'OBSERVATION'},
  {name:'local-red-off',fov:8.89,enabled:false,mode:'OBSERVATION'},
  {name:'deep-on',fov:.05,enabled:true,mode:'DAY'},
  {name:'local-fading',fov:15,enabled:true,mode:'DAY'},
  {name:'art-restored',fov:25,enabled:true,mode:'DAY'},
  {name:'overview-fading',fov:115,enabled:true,mode:'DAY'},
  {name:'overview-hidden',fov:140,enabled:true,mode:'DAY'},
  {name:'wide-off',fov:84.63316191100171,enabled:false,mode:'DAY'},
  {name:'wide-restored',fov:84.63316191100171,enabled:true,mode:'DAY'},
];
const assets=new Map<string,any>(),workingSets=[];
for(const scenario of scenarios){
  const view={basis,verticalFovDeg:scenario.fov};
  const wanted=constellationVisibility(scenario.fov,scenario.enabled)>0
    ?frame.images.filter(image=>artworkIntersectsView(image.registration,view,390,844)).map(image=>image.source):[];
  workingSets.push({...scenario,artOpacity:constellationVisibility(scenario.fov,scenario.enabled),
    lineOpacity:constellationLineVisibility(scenario.fov,scenario.enabled),wanted:wanted.map(image=>image.id),
    decodedRgbaBytes:wanted.reduce((sum,image)=>sum+image.width*image.height*4,0)});
  for(const source of wanted)if(!assets.has(source.id)){
    const bytes=await get(`/v2/sky/constellations/${publication.catalogHash}/assets/${source.file}`);
    assert.equal(sha(bytes),source.sha256);assert.equal(bytes.length,source.bytes);
    assets.set(source.id,{id:source.id,width:source.width,height:source.height,bytes:bytes.length,sha256:sha(bytes),
      dataUrl:'data:image/png;base64,'+bytes.toString('base64')});
  }
}
assert(workingSets[0].wanted.includes('Aql'));assert.equal(workingSets[1].wanted.length,0);
const lineCosts=[];
for(const fov of [.05,.3,2.67,8.89,15,25,84.63316191100171]){
  const view={basis,verticalFovDeg:fov};const samples=[];let segments:any[]=[];
  constellationLineSegments(frame.lines,view,390,844);
  for(let i=0;i<10;i++){
    const start=performance.now();segments=constellationLineSegments(frame.lines,view,390,844);samples.push(performance.now()-start);
  }
  assert(segments.length>0,'Altair endpoint retains local identification');
  assert(segments.every(segment=>segment.every(Number.isFinite)), 'no singular fine-zoom geometry');
  const maxClippedExcessPx=Math.max(0,...segments.flatMap(([x0,y0,x1,y1])=>[-x0,x0-390,-x1,x1-390,-y0,y0-844,-y1,y1-844]));
  assert(maxClippedExcessPx<=1e-7, `submitted arcs stay clipped within floating-point error: ${fov}, ${maxClippedExcessPx}`);
  lineCosts.push({fov,inputArcs:frame.lines.length,submittedSegments:segments.length,maxClippedExcessPx,hostSamplesMs:samples});
}
const compiled=await build({stdin:{resolveDir:root,contents:
  "export {createSkyGpuRenderer} from './apps/wechat-miniapp/src/features/sky/sky-gpu-renderer';export {drawSkyScene} from './apps/wechat-miniapp/src/features/sky/sky-scene-render';export {pickPaintedSkyObjects} from './apps/wechat-miniapp/src/features/sky/sky-object-picking';"},
  bundle:true,write:false,metafile:true,platform:'browser',format:'iife',globalName:'scene47Gpu',target:'es2022',tsconfig:path.resolve('apps/wechat-miniapp/tsconfig.json')});
await fs.writeFile(path.join(output,'production.js'),compiled.outputFiles[0].text,{flag:'wx'});
const sourceHashes=await Promise.all(Object.keys(compiled.metafile!.inputs).filter(file=>file!=='<stdin>').map(async file=>({path:file,sha256:sha(await fs.readFile(file))})));
const {chromium}=createRequire(import.meta.url)('C:/Users/777/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader']});
const results:any[]=[];const retirement=[];
try{
  for(const edition of ['before','current']){
    const page=await browser.newPage({viewport:{width:390,height:844}});
    await page.setContent('<style>body{margin:0}canvas{display:block}</style><canvas width="390" height="844"></canvas>');
    await page.evaluate('globalThis.__name=target=>target');
    await page.addScriptTag({content:previous.toString()});await page.addScriptTag({content:compiled.outputFiles[0].text});
    await page.evaluate(async({sources,edition})=>{
      const images=new Map(),ids=new WeakMap();for(const source of sources){
        const image=new Image();image.src=source.dataUrl;await image.decode();
        if(image.width!==source.width||image.height!==source.height)throw Error('decoded_dimension_mismatch');images.set(source.id,image);ids.set(image,source.id);
      }
      const gl=document.querySelector('canvas')!.getContext('webgl',{preserveDrawingBuffer:true,antialias:false})!;
      const upload=gl.texImage2D.bind(gl),remove=gl.deleteTexture.bind(gl);const allocations=new Map();
      const stats={uploads:[] as string[],liveBytes:0};
      (gl as any).texImage2D=(...args:any[])=>{const texture=gl.getParameter(gl.TEXTURE_BINDING_2D),source=args.at(-1);
        const size=args.length===9?Number(args[3])*Number(args[4])*4:Number(source?.width||0)*Number(source?.height||0)*4;
        stats.liveBytes+=size-(allocations.get(texture)||0);allocations.set(texture,size);stats.uploads.push(ids.get(source)||'other');return (upload as any)(...args);};
      gl.deleteTexture=texture=>{if(texture){stats.liveBytes-=allocations.get(texture)||0;allocations.delete(texture);}return remove(texture);};
      const owner=(globalThis as any)[edition==='before'?'scene45Gpu':'scene47Gpu'];const renderer=owner.createSkyGpuRenderer(gl,1);
      const segments=renderer.segments.bind(renderer);const lineCalls:any[]=[];
      renderer.segments=(lines:any[],color:string,opacity:number)=>{lineCalls.push({segments:lines.length,color,opacity});return segments(lines,color,opacity);};
      (globalThis as any).scene47={gl,images,renderer,stats,allocations,owner,lineCalls};
    },{sources:[...assets.values()],edition});
    for(const scenario of scenarios){
      const rendered=await page.evaluate(({scenario,report,at,basis,frame})=>{
        const value=(globalThis as any).scene47;let snapshot:any;const failures:any[]=[];
        const layer={frame,images:value.images,enabled:scenario.enabled,failed(){failures.push('artwork');}};
        const args:any[]=[value.renderer,report,at,null,null,390,844,scenario.mode,(painted:any)=>snapshot=painted,undefined,scenario.fov,null,basis];
        args[15]=layer;args[34]={enabled:false};args[35]={horizontal:false,equatorial:false};
        const passes=[];
        for(let i=0;i<3;i++){
          value.stats.uploads=[];value.lineCalls.length=0;const start=performance.now();value.owner.drawSkyScene(...args);value.gl.finish();
          passes.push({hostMs:performance.now()-start,uploads:[...value.stats.uploads],liveBytes:value.stats.liveBytes,lineCalls:[...value.lineCalls]});
        }
        const target=snapshot.objects.find((object:any)=>object.reference==='HR:7557');
        if(!target)throw Error('nonempty_painted_altair_required');
        const input={x:target.x,y:target.y,frameAt:snapshot.frameAt,catalogVersion:snapshot.catalogVersion,catalogHash:snapshot.catalogHash};
        const picked=(globalThis as any).scene47Gpu.pickPaintedSkyObjects(snapshot,input).map((object:any)=>object.reference);
        const pixels=new Uint8Array(390*844*4);value.gl.readPixels(0,0,390,844,value.gl.RGBA,value.gl.UNSIGNED_BYTE,pixels);
        let binary='';for(let i=0;i<pixels.length;i+=32768)binary+=String.fromCharCode(...pixels.subarray(i,i+32768));
        return {rgbaBase64:btoa(binary),snapshot,picked,passes,failures,glError:value.gl.getError()};
      },{scenario,report,at:context.selectedAtUtc,basis,frame});
      assert.equal(rendered.glError,0);assert.deepEqual(rendered.failures,[]);assert.equal(rendered.picked[0],'HR:7557');
      const filename=['wide-on','local-on','local-off','local-red-on','art-restored','local-fading','deep-on'].includes(scenario.name)
        ?`${edition}-${scenario.name}.png`:null;
      if(filename)
        await page.locator('canvas').screenshot({path:path.join(output,filename)});
      results.push({edition,...scenario,filename,rgbaSha256:sha(Buffer.from(rendered.rgbaBase64,'base64')),
        pickSha256:sha(JSON.stringify(rendered.snapshot)),paintedObjects:rendered.snapshot.objects.length,picked:rendered.picked,
        passes:rendered.passes,failures:rendered.failures,glError:rendered.glError});
    }
    const disposed=await page.evaluate(()=>{const value=(globalThis as any).scene47;value.renderer.dispose();return {textures:value.allocations.size,liveBytes:value.stats.liveBytes,glError:value.gl.getError()};});
    assert.deepEqual(disposed,{textures:0,liveBytes:0,glError:0});retirement.push({edition,...disposed});await page.close();
  }
}finally{await browser.close();}
const row=(edition:string,name:string)=>results.find(result=>result.edition===edition&&result.name===name)!;
for(const name of ['wide-on','local-off','local-red-off','art-restored','overview-fading','overview-hidden','wide-off','wide-restored'])
  assert.equal(row('before',name).rgbaSha256,row('current',name).rgbaSha256,'unaffected fields keep exactly the same pixels');
assert.equal(row('before','local-on').rgbaSha256,row('before','local-off').rgbaSha256,'old local gate loses real arcs');
assert.notEqual(row('current','local-on').rgbaSha256,row('current','local-off').rgbaSha256,'retained local arcs change real pixels');
assert.notEqual(row('current','local-red-on').rgbaSha256,row('current','local-red-off').rgbaSha256,'retained red arcs change real pixels');
assert.equal(row('current','wide-on').rgbaSha256,row('current','wide-restored').rgbaSha256,'narrow/off/red/deep/wide journey restores the actual original image');
for(const scenario of scenarios)assert.equal(row('before',scenario.name).pickSha256,row('current',scenario.name).pickSha256,'line rendering leaves identity and actual picking untouched');
for(const name of ['local-on','local-off','local-red-on','local-red-off','deep-on'])
  assert(row('current',name).passes.every((pass:any)=>pass.uploads.length===0&&pass.liveBytes===0),'fine views do not retain/upload faded constellation PNGs');
assert(row('current','local-on').passes[0].lineCalls.some((call:any)=>call.segments>0&&call.color==='#9BADCA'&&call.opacity===.35));
const result={scope:'Real current published sky, clipped constellation geometry and original PNGs through before/current production software GPU; no native or full-quality acceptance',
  at:context.selectedAtUtc,contextIdSha256:sha(context.contextId),contextRevision:context.revision,contextFingerprint:context.contextFingerprint,
  constellationHash:publication.catalogHash,catalogResponseSha256:sha(catalogBytes),changedProductionOwners:changed,sourceHashes,
  productionBundleSha256:sha(compiled.outputFiles[0].text),previousProductionBundleSha256:sha(previous),publicInputs,
  assets:[...assets.values()].map(({dataUrl,...source})=>source),workingSets,lineCosts,results,retirement,
  reference:'Same v45 paused portrait reference: local 4.1-degree shorter-side field retains real arcs while the Aquila illustration disappears; qualitative composition only',
  limits:['Software GPU and host clipping timings do not certify WeChat/phone compositor, driver peaks or target frame cost',
    'No SAO fine catalogue/background/globe/WXML/dock/modal/reticle quality acceptance from this controlled scene',
    'Existing local artwork/name and broad-view opacity tuning still needs whole-scene comparison',
    'Source-resolution/decoded active demand and repeated full-image combination uploads remain an open separate module obligation']};
await fs.writeFile(path.join(output,'result.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({output,changed,at:result.at,lineCosts:lineCosts.map(({hostSamplesMs,...value})=>({...value,maxHostMs:Math.max(...hostSamplesMs)})),
  results:results.map(({edition,name,rgbaSha256,paintedObjects,picked,passes})=>({edition,name,rgbaSha256,paintedObjects,picked,
    lastUploads:passes.at(-1).uploads.length,lines:passes.at(-1).lineCalls})),retirement}));
