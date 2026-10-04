// Current public scene and image publications through the existing production
// renderer. Count actual texture uploads, compare pixels and retire resources.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { projectAdoptedSkyCatalog } from '../../../../apps/wechat-miniapp/src/services/sky-report-catalog.ts';
import { attachSkyCatalog } from '../../../../apps/wechat-miniapp/src/features/sky/sky-stellar-scene.ts';
import { presentSkyTime } from '../../../../apps/wechat-miniapp/src/features/sky/sky-time-presentation.ts';
import { resolveConstellationFrame } from '../../../../apps/wechat-miniapp/src/features/sky/sky-constellation-scene.ts';
import { createSkyViewBasis } from '../../../../apps/wechat-miniapp/src/features/sky/sky-view-projection.ts';
import { artworkIntersectsView } from '../../../../apps/wechat-miniapp/src/features/sky/sky-artwork-visibility.ts';
import { constellationVisibility } from '../../../../apps/wechat-miniapp/src/features/sky/sky-constellation-visibility.ts';
import { exactSkyObservationFrame } from '../../../../apps/wechat-miniapp/src/features/sky/sky-observation-frame.ts';
import { selectSkyHipsTiles } from '../../../../apps/wechat-miniapp/src/features/sky/sky-hips-tile-selection.ts';
import { skyGalacticBandAt } from '../../../../apps/wechat-miniapp/src/features/sky/sky-galactic-band.ts';
import { selectSkyLandscapeResource } from '../../../../apps/wechat-miniapp/src/features/sky/sky-landscape-resources.ts';
import { createSkyPanoramaMask } from '../../../../apps/wechat-miniapp/src/features/sky/sky-landscape-mask.ts';
import { decodeSkyLandscapeAlpha } from '../../../../packages/miniapp-contracts/src/sky-landscape-publication.ts';
import { assertGalacticImageManifest } from '../../../../apps/wechat-miniapp/src/services/galactic-image-publication.ts';

const task=path.resolve('.codex/work-items/cloud-sky-native-2026-09-22');
const output=path.resolve('output/playwright/cloud-sky-scene-v46-coexistence-0930');
await assert.rejects(fs.access(output),{code:'ENOENT'});await fs.mkdir(output,{recursive:true});
const sha=(bytes:Uint8Array|string)=>createHash('sha256').update(bytes).digest('hex');
const read=async(file:string)=>JSON.parse(await fs.readFile(path.join(task,file),'utf8'));
const get=async(route:string)=>{
  assert(route.startsWith('/v2/sky/'));
  const response=await fetch('http://127.0.0.1:60065'+route,{signal:AbortSignal.timeout(15000)});
  assert.equal(response.status,200);return Buffer.from(await response.arrayBuffer());
};
const publicInputs:any[]=[];
const json=async(route:string)=>{const bytes=await get(route);publicInputs.push({route,bytes:bytes.length,sha256:sha(bytes)});return JSON.parse(bytes.toString());};
const prior=JSON.parse(await fs.readFile('output/playwright/cloud-sky-scene-v46-cache-after-0930/result.json','utf8'));
for(const owner of prior.currentSourceHashes)assert.equal(sha(await fs.readFile(owner.path)),owner.sha256);
const after=await fs.readFile('output/playwright/cloud-sky-scene-v46-cache-after-0930/production.js');
const before=await fs.readFile('output/playwright/cloud-sky-scene-v45-0930/production.js');
assert.equal(sha(after),prior.productionBundleSha256);assert.equal(sha(before),prior.oldProductionBundleSha256);
const context=(await read('tmp/v45-context-resolved.json')).data;
const raw=projectAdoptedSkyCatalog(await read('tmp/v45-current-public-report.json')).data;
const presentation=presentSkyTime(raw,context.selectedAtUtc);assert(presentation);
const stars=(await json(`/v2/sky/catalogs/${raw.skyScene.catalog.catalogVersion}/${raw.skyScene.catalog.catalogHash}`)).data;
const report=attachSkyCatalog(presentation.report,stars);
const publication=(await json('/v2/sky/constellations')).data;
const frame=resolveConstellationFrame(publication,presentation.report.skyScene,context.selectedAtUtc);assert(frame);
const galactic=await json('/v2/sky/galactic/manifest');assertGalacticImageManifest(galactic);
const landscape=await json('/v2/sky/landscape/manifest');
const wide=await json('/v2/sky/wide-field/manifest');
const images=new Map<string,any>();
async function image(id:string,route:string,source:any){
  if(images.has(id))return;
  const bytes=await get(route);assert.equal(bytes.length,source.bytes);assert.equal(sha(bytes),source.sha256);
  images.set(id,{id,width:source.width,height:source.height,bytes:bytes.length,sha256:sha(bytes),
    dataUrl:`data:${route.endsWith('.png')?'image/png':'image/jpeg'};base64,${bytes.toString('base64')}`});
}
await image('galactic',galactic.image.downloadUrl,galactic.image);
const masks=[];
for(const resource of landscape.resources){
  await image('landscape:'+resource.id,resource.image.downloadUrl,resource.image);
  masks.push(createSkyPanoramaMask(landscape,resource,decodeSkyLandscapeAlpha(await json(resource.alpha.downloadUrl),resource)));
}
for(const tile of wide.tiles)await image('w3:'+tile.pixel,tile.downloadUrl,{...tile,width:512,height:512});
const fields=[prior.results[0].field,prior.results[1].field,prior.results[2].field,
  {name:'horizon',fov:84.63316191100171,azimuth:60,altitude:8}];
const scenarios=[];
for(const field of fields){
  const basis=createSkyViewBasis(field.azimuth,90+field.altitude,0)!;
  const view={basis,verticalFovDeg:field.fov};
  const eligible=constellationVisibility(field.fov,true)>0?frame.images.filter(figure=>artworkIntersectsView(figure.registration,view,390,844)):[];
  for(const figure of eligible)await image(figure.source.id,`/v2/sky/constellations/${publication.catalogHash}/assets/${figure.source.file}`,figure.source);
  for(const background of ['galactic','w3'] as const){
    const selection=selectSkyHipsTiles({frame:exactSkyObservationFrame(report,context.selectedAtUtc)!,view,width:390,height:844,maxOrder:0,minOrder:0});
    assert.equal(selection.state,'SELECTED');
    const w3=background==='w3'?(selection as any).pixels:[];
    const other=[...eligible.map(figure=>figure.source),...w3.map((pixel:number)=>images.get('w3:'+pixel)),
      ...(background==='galactic'&&skyGalacticBandAt(report,context.selectedAtUtc,field.fov)?[galactic.image]:[])];
    const resource=selectSkyLandscapeResource(landscape,other,false);
    scenarios.push({field,basis,background,visibleIds:eligible.map(figure=>figure.source.id),w3,resourceId:resource.id,
      reservedLogicalBytes:other.reduce((sum:number,value:any)=>sum+value.width*value.height*4,0)});
  }
}
// Both frozen production bundles share the same scene inputs and source
// selection; only texture-cache ownership differs.
const {chromium}=createRequire(import.meta.url)('C:/Users/777/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader']});
const rows:any[]=[];
try{
  for(const scenario of scenarios){
    const page=await browser.newPage({viewport:{width:390,height:844}});
    await page.setContent('<style>body{margin:0}canvas{display:block}</style><canvas width="390" height="844"></canvas>');
    await page.evaluate('globalThis.__name=target=>target');
    await page.addScriptTag({content:before.toString().replaceAll('scene45Gpu','scene46Before')});
    await page.addScriptTag({content:after.toString()});
    await page.evaluate(async(sources)=>{const decoded=new Map(),ids=new WeakMap();for(const source of sources){
      const image=new Image();image.src=source.dataUrl;await image.decode();
      if(image.width!==source.width||image.height!==source.height)throw Error('decoded_dimension_mismatch');
      decoded.set(source.id,image);ids.set(image,source.id);
    }(globalThis as any).coexist46={decoded,ids};},[...images.values()]);
    const variants=[];
    for(const variant of ['before','after']){
      const rendered=await page.evaluate(({variant,scenario,report,frame,masks,at})=>{
        const {decoded,ids}=(globalThis as any).coexist46;
        const gl=document.querySelector('canvas')!.getContext('webgl',{preserveDrawingBuffer:true,antialias:false})!;
        const upload=gl.texImage2D.bind(gl),remove=gl.deleteTexture.bind(gl);
        const allocations=new Map(),stats={liveBytes:0,peakLogicalBytes:0,uploads:[] as string[]};
        (gl as any).texImage2D=(...args:any[])=>{const texture=gl.getParameter(gl.TEXTURE_BINDING_2D),source=args.at(-1);
          const size=args.length===9?Number(args[3])*Number(args[4])*4:Number(source?.width||0)*Number(source?.height||0)*4;
          stats.liveBytes+=size-(allocations.get(texture)||0);allocations.set(texture,size);
          stats.peakLogicalBytes=Math.max(stats.peakLogicalBytes,stats.liveBytes);stats.uploads.push(ids.get(source)||'other');return (upload as any)(...args);};
        gl.deleteTexture=texture=>{if(texture){stats.liveBytes-=allocations.get(texture)||0;allocations.delete(texture);}return remove(texture);};
        const owner=(globalThis as any)[variant==='before'?'scene46Before':'scene45Gpu'];
        const failures=[] as string[],renderer=owner.createSkyGpuRenderer(gl,1,{imageFailed:(source:object)=>failures.push(ids.get(source))});
        const mask=masks.find((value:any)=>value.resource.id===scenario.resourceId);
        const args:any[]=[renderer,report,at,null,null,390,844,'DAY',undefined,undefined,scenario.field.fov,null,scenario.basis];
        let snapshot:any;args[8]=(value:any)=>snapshot=value;
        args[15]={frame,images:new Map(scenario.visibleIds.map((id:string)=>[id,decoded.get(id)])),enabled:true,failed:(source:object)=>failures.push(ids.get(source))};
        args[21]=scenario.w3.map((pixel:number)=>({layer:'WIDE_FIELD_W3',order:0,pixel,image:decoded.get('w3:'+pixel)}));
        args[26]=scenario.background==='galactic'?decoded.get('galactic'):null;
        args[34]={enabled:true,panorama:{image:decoded.get('landscape:'+scenario.resourceId),mask}};
        args[35]={horizontal:false,equatorial:false};
        const passes=[];
        for(let i=0;i<3;i++){
          stats.uploads=[];stats.peakLogicalBytes=stats.liveBytes;
          owner.drawSkyScene(...args);gl.finish();
          passes.push({uploads:[...stats.uploads],liveBytes:stats.liveBytes,peakLogicalBytes:stats.peakLogicalBytes,
            objects:snapshot.objects.length,landscape:snapshot.view.landscape?.resource?.id,glError:gl.getError()});
        }
        const pixels=new Uint8Array(390*844*4);gl.readPixels(0,0,390,844,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
        let binary='';for(let i=0;i<pixels.length;i+=32768)binary+=String.fromCharCode(...pixels.subarray(i,i+32768));
        const result={passes,failures,rgbaBase64:btoa(binary)};
        (globalThis as any).disposeCoexist46=()=>{renderer.dispose();gl.texImage2D=upload;gl.deleteTexture=remove;return {liveBytes:stats.liveBytes,textures:allocations.size,glError:gl.getError()};};
        return result;
      },{variant,scenario,report,frame,masks,at:context.selectedAtUtc});
      assert.deepEqual(rendered.failures,[]);
      assert(rendered.passes.every(row=>row.glError===0&&row.objects>0&&row.landscape===scenario.resourceId&&row.liveBytes<=16*1024*1024));
      const {rgbaBase64,...result}=rendered;
      variants.push({variant,...result,rgbaSha256:sha(Buffer.from(rgbaBase64,'base64'))});
      if(variant==='after')await page.locator('canvas').screenshot({path:path.join(output,scenario.field.name+'-'+scenario.background+'.png')});
      const disposed=await page.evaluate(()=>(globalThis as any).disposeCoexist46());
      assert.deepEqual(disposed,{liveBytes:0,textures:0,glError:0});
    }
    assert.equal(variants[0].rgbaSha256,variants[1].rgbaSha256,'cache repair preserves full composite pixels');
    assert.deepEqual(variants[0].passes.map(row=>row.objects),variants[1].passes.map(row=>row.objects));
    rows.push({scenario,variants});await page.close();
  }
}finally{await browser.close();}
const result={at:context.selectedAtUtc,productionBundleSha256:sha(after),beforeBundleSha256:sha(before),
  scope:'Eight current public constellation/background/landscape combinations through real production software GPU; texture uploads, pixels and retirement only',
  publicInputs,assets:[...images.values()].map(({dataUrl,...value})=>value),rows,
  limits:['Logical texture ownership is not native bitmap/driver/GC peak or target performance',
    'Uses actual existing source selection; does not cap decoded wanted image memory',
    'Does not certify every layer combination, native WXML composition, source quality or devices']};
await fs.writeFile(path.join(output,'result.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({output,rows:rows.map(({scenario,variants})=>({field:scenario.field.name,background:scenario.background,
  resource:scenario.resourceId,beforeWarmUploads:variants[0].passes[1].uploads.length,afterWarmUploads:variants[1].passes[1].uploads.length,
  afterPeak:variants[1].passes[1].peakLogicalBytes,pixelsEqual:variants[0].rgbaSha256===variants[1].rgbaSha256}))}));
