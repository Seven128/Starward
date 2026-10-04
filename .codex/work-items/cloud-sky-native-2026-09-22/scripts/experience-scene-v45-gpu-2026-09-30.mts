// Reproducible production WebGL check using this journey's public inputs.
// Software GPU only; does not certify the DevTools compositor or a phone.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
import { projectAdoptedSkyCatalog } from '../../../../apps/wechat-miniapp/src/services/sky-report-catalog.ts';
import { attachSkyCatalog } from '../../../../apps/wechat-miniapp/src/features/sky/sky-stellar-scene.ts';
import { presentSkyTime } from '../../../../apps/wechat-miniapp/src/features/sky/sky-time-presentation.ts';
import { resolveConstellationFrame } from '../../../../apps/wechat-miniapp/src/features/sky/sky-constellation-scene.ts';
import { createSkyViewBasis } from '../../../../apps/wechat-miniapp/src/features/sky/sky-view-projection.ts';
import { artworkIntersectsView } from '../../../../apps/wechat-miniapp/src/features/sky/sky-artwork-visibility.ts';
import { constellationVisibility } from '../../../../apps/wechat-miniapp/src/features/sky/sky-constellation-visibility.ts';

const root=process.cwd(),task=path.resolve('.codex/work-items/cloud-sky-native-2026-09-22');
const output=path.resolve('output/playwright/cloud-sky-scene-v45-0930');
await assert.rejects(fs.access(output),{code:'ENOENT'});await fs.mkdir(output,{recursive:true});
const sha=(bytes:Uint8Array|string)=>createHash('sha256').update(bytes).digest('hex');
const json=async(file:string)=>JSON.parse(await fs.readFile(path.join(task,file),'utf8'));
const context=(await json('tmp/v45-context-resolved.json')).data;
const raw=projectAdoptedSkyCatalog(await json('tmp/v45-current-public-report.json')).data;
const publication=(await json('tmp/v45-public-constellations.json')).data;
const selected=(await json('tmp/v45-public-altair-position.json')).data;
const at=context.selectedAtUtc;
assert.equal(at,'2026-09-30T13:50:33.000Z');
assert.equal(raw.context.contextId,context.contextId);assert.equal(selected.reference,'HR:7557');
const presentation=presentSkyTime(raw,at);assert(presentation);
const frame=resolveConstellationFrame(publication,presentation.report.skyScene,at);assert(frame);
const basis=createSkyViewBasis(selected.position.azimuthDeg,90+selected.position.altitudeDeg,0)!;
const get=async(route:string)=>{
  const reply=await fetch('http://127.0.0.1:60065'+route,{signal:AbortSignal.timeout(15000)});
  assert.equal(reply.status,200);return Buffer.from(await reply.arrayBuffer());
};
const catalogBytes=await get(`/v2/sky/catalogs/${raw.skyScene.catalog.catalogVersion}/${raw.skyScene.catalog.catalogHash}`);
const catalog=JSON.parse(catalogBytes.toString()).data;
const report=attachSkyCatalog(presentation.report,catalog);
const scenarios=[{name:'wide-on',fov:84.63316191100171,enabled:true},
  {name:'wide-off',fov:84.63316191100171,enabled:false},
  {name:'overview-fading',fov:115,enabled:true},{name:'overview-hidden',fov:140,enabled:true},
  {name:'local-fading',fov:15,enabled:true},{name:'local-hidden',fov:8.86,enabled:true},
  {name:'wide-restored',fov:84.63316191100171,enabled:true}];
const assets=new Map<string,any>(),workingSets=[];
for(const scenario of scenarios){
  const view={basis,verticalFovDeg:scenario.fov};
  const wanted=constellationVisibility(scenario.fov,scenario.enabled)>0
    ? frame.images.filter(image=>artworkIntersectsView(image.registration,view,390.4,844)).map(image=>image.source):[];
  workingSets.push({...scenario,opacity:constellationVisibility(scenario.fov,scenario.enabled),
    wanted:wanted.map(image=>image.id),decodedRgbaBytes:wanted.reduce((total,image)=>total+image.width*image.height*4,0)});
  for(const source of wanted)if(!assets.has(source.sha256)){
    const bytes=await get(`/v2/sky/constellations/${publication.catalogHash}/assets/${source.file}`);
    assert.equal(sha(bytes),source.sha256);assert.equal(bytes.length,source.bytes);
    assets.set(source.sha256,{id:source.id,sha256:source.sha256,bytes:bytes.length,width:source.width,height:source.height,
      dataUrl:'data:image/png;base64,'+bytes.toString('base64')});
  }
}
assert(workingSets[0].wanted.includes('Aql'),'the observed Aquila figure must be eligible');
assert(workingSets.every(set=>set.decodedRgbaBytes<=16*1024*1024),'assess expanded demand against the existing image budget');
const contents="export {createSkyGpuRenderer} from './apps/wechat-miniapp/src/features/sky/sky-gpu-renderer';export {drawSkyScene} from './apps/wechat-miniapp/src/features/sky/sky-scene-render';";
const options={stdin:{resolveDir:root,contents},bundle:true,write:false,metafile:true,
  platform:'browser' as const,format:'iife' as const,globalName:'scene45Gpu',target:'es2022',tsconfig:path.resolve('apps/wechat-miniapp/tsconfig.json')};
const current=await build(options);
const visibilityPath=path.resolve('apps/wechat-miniapp/src/features/sky/sky-constellation-visibility.ts');
const visibilityBytes=await fs.readFile(visibilityPath,'utf8');
assert(visibilityBytes.includes('(140-verticalFovDeg)/50'));
const mutation=visibilityBytes.replace('(140-verticalFovDeg)/50','(40-verticalFovDeg)/15');
assert.notEqual(mutation,visibilityBytes);
const previous=await build({...options,plugins:[{name:'bounded-old-window-mutation',setup(builder){
  builder.onLoad({filter:/sky-constellation-visibility\.ts$/},async({path:input})=>{
    assert.equal(path.resolve(input),visibilityPath);return {contents:mutation,loader:'ts'};
  });
}}]});
await fs.writeFile(path.join(output,'production.js'),current.outputFiles[0].text,{flag:'wx'});
await fs.writeFile(path.join(output,'old-window-mutation.js'),previous.outputFiles[0].text,{flag:'wx'});
const sourceHashes=await Promise.all(Object.keys(current.metafile!.inputs).filter(file=>file!=='<stdin>').map(async file=>({path:file,sha256:sha(await fs.readFile(file))})));
const {chromium}=createRequire(import.meta.url)('C:/Users/777/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader']});
const results:any[]=[];
try{
  for(const [edition,bundle] of [['old-window-mutation',previous],['current',current]] as const){
    const page=await browser.newPage({viewport:{width:390,height:844}});
    await page.setContent('<style>body{margin:0;background:#080d17}canvas{display:block;width:390px;height:844px}</style><canvas width="390" height="844"></canvas>');
    await page.evaluate('globalThis.__name=target=>target');await page.addScriptTag({content:bundle.outputFiles[0].text});
    await page.evaluate(async(assets)=>{
      const gl=document.querySelector('canvas')!.getContext('webgl',{preserveDrawingBuffer:true,antialias:false})!;
      const images=new Map();for(const source of assets){const image=new Image();image.src=source.dataUrl;await image.decode();images.set(source.id,image);}
      (globalThis as any).scene45={gl,images,renderer:(globalThis as any).scene45Gpu.createSkyGpuRenderer(gl,1)};
    },[...assets.values()]);
    for(const scenario of edition==='current'?scenarios:scenarios.slice(0,2)){
      const rendered=await page.evaluate(({scenario,report,at,basis,frame})=>{
        const value=(globalThis as any).scene45;let snapshot:any,failures=0;
        const layer={frame,images:value.images,enabled:scenario.enabled,failed(){failures++;}};
        const args:any[]=[value.renderer,report,at,null,null,390,844,'DAY',(painted:any)=>snapshot=painted,undefined,scenario.fov,null,basis];
        args[15]=layer;args[34]={enabled:false};args[35]={horizontal:false,equatorial:false};
        const samples=[];for(let i=0;i<4;i++){const start=performance.now();(globalThis as any).scene45Gpu.drawSkyScene(...args);value.gl.finish();samples.push(performance.now()-start);}
        const pixels=new Uint8Array(390*844*4);value.gl.readPixels(0,0,390,844,value.gl.RGBA,value.gl.UNSIGNED_BYTE,pixels);
        let binary='';for(let i=0;i<pixels.length;i+=32768)binary+=String.fromCharCode(...pixels.subarray(i,i+32768));
        return {rgbaBase64:btoa(binary),failures,error:value.gl.getError(),snapshot,samples};
      },{scenario,report,at,basis,frame});
      assert.equal(rendered.error,0);assert.equal(rendered.failures,0);
      assert(rendered.snapshot.objects.some((object:any)=>object.reference==='HR:7557'),'a nonempty rendered star field must survive the layer');
      const filename=`${edition}-${scenario.name}.png`;await page.locator('canvas').screenshot({path:path.join(output,filename)});
      results.push({edition,...scenario,filename,rgbaSha256:sha(Buffer.from(rendered.rgbaBase64,'base64')),
        pickSha256:sha(JSON.stringify(rendered.snapshot)),paintedObjects:rendered.snapshot.objects.length,glError:rendered.error,hostSamplesMs:rendered.samples});
    }
    await page.evaluate(()=>(globalThis as any).scene45.renderer.dispose());await page.close();
  }
}finally{await browser.close();}
const row=(edition:string,name:string)=>results.find(result=>result.edition===edition&&result.name===name)!;
assert.equal(row('old-window-mutation','wide-on').rgbaSha256,row('old-window-mutation','wide-off').rgbaSha256,'old gate produces an empty enabled constellation layer');
assert.equal(row('old-window-mutation','wide-off').rgbaSha256,row('current','wide-off').rgbaSha256,'the background/stellar field is unchanged');
assert.notEqual(row('current','wide-on').rgbaSha256,row('current','wide-off').rgbaSha256,'current enabled layer must change actual pixels');
assert.equal(row('current','wide-on').rgbaSha256,row('current','wide-restored').rgbaSha256,'widening restores the same actual image');
assert.equal(row('current','wide-on').pickSha256,row('current','wide-off').pickSha256,'constellation art cannot change celestial identity or picking');
const reference=await json('evidence/experience-scene-v45-reference-conditions-2026-09-30.json');
const azDifference=selected.position.azimuthDeg-reference.observedAltairAzAlt.azimuthDeg;
const altitudeDifference=selected.position.altitudeDeg-reference.observedAltairAzAlt.altitudeDeg;
const result={scope:'Reproducible software WebGL production-owner check with current public report/catalogue/geometry and verified original figure PNGs. Not native composition or target performance.',
  at,contextIdSha256:sha(context.contextId),contextRevision:context.revision,reportDataRevision:raw.context.dataRevision,
  reportRawSha256:sha(await fs.readFile(path.join(task,'tmp/v45-current-public-report.json'))),catalogResponseSha256:sha(catalogBytes),constellationHash:publication.catalogHash,
  sourceHashes,bundleSha256:sha(current.outputFiles[0].text),mutation:{owner:path.relative(root,visibilityPath).replaceAll('\\','/'),currentOwnerSha256:sha(visibilityBytes),oldWindowMutationSha256:sha(mutation),meaning:'Only the previously observed 40-degree broad cutoff is restored in the isolated compiled check; production source is not changed'},
  workingSets,assets:[...assets.values()].map(({dataUrl,...metadata})=>metadata),results,
  comparison:{referenceAltairAzAlt:reference.observedAltairAzAlt,miniAltairAzAlt:selected.position,
    angularDifferenceApproxDeg:Math.hypot(altitudeDifference,azDifference*Math.cos(selected.position.altitudeDeg*Math.PI/180)),
    meaning:'Numerically consistent for the qualitative wide composition comparison, not direct proof of browser timezone or identical astrometry/refraction'},
  limits:['No 2MASS/W3/planet texture or ordinary WXML composition claim from this controlled scene','Decoded working set is a logical RGBA sum, not measured native/GPU/GC peak','Host gl.finish timings are software samples, not target frame-time acceptance','10–25 and 90–140 vertical-degree windows remain presentation tuning; local line/label differences and final whole-scene quality remain open']};
await fs.writeFile(path.join(output,'result.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({output,at,workingSets,assets:assets.size,results,angularDifferenceApproxDeg:result.comparison.angularDifferenceApproxDeg}));
