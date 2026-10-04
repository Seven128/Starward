// Observe actual production texture traffic at the previously measured
// pressure fields, with current public inputs. No product-state injection.
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

const root=process.cwd(),task=path.resolve('.codex/work-items/cloud-sky-native-2026-09-22');
const output=path.resolve('output/playwright/cloud-sky-scene-v46-cache-after-0930');
await assert.rejects(fs.access(output),{code:'ENOENT'});await fs.mkdir(output,{recursive:true});
const sha=(bytes:Uint8Array|string)=>createHash('sha256').update(bytes).digest('hex');
const read=async(file:string)=>JSON.parse(await fs.readFile(path.join(task,file),'utf8'));
const prior=JSON.parse(await fs.readFile('output/playwright/cloud-sky-scene-v45-0930/result.json','utf8'));
for(const owner of prior.sourceHashes)if(!owner.path.endsWith('/sky-gpu-textures.ts'))assert.equal(sha(await fs.readFile(owner.path)),owner.sha256,'unaffected production drawing input changed');
const oldProduction=await fs.readFile('output/playwright/cloud-sky-scene-v45-0930/production.js');
assert.equal(sha(oldProduction),prior.bundleSha256);
const compiled=await build({stdin:{resolveDir:root,contents:"export {createSkyGpuRenderer} from './apps/wechat-miniapp/src/features/sky/sky-gpu-renderer';export {drawSkyScene} from './apps/wechat-miniapp/src/features/sky/sky-scene-render';"},
  bundle:true,write:false,metafile:true,platform:'browser',format:'iife',globalName:'scene45Gpu',target:'es2022',tsconfig:path.resolve('apps/wechat-miniapp/tsconfig.json')});
const production=Buffer.from(compiled.outputFiles[0].text);
await fs.writeFile(path.join(output,'production.js'),production,{flag:'wx'});
const currentSourceHashes=await Promise.all(Object.keys(compiled.metafile!.inputs).filter(file=>file!=='<stdin>').map(async file=>({path:file,sha256:sha(await fs.readFile(file))})));
const context=(await read('tmp/v45-context-resolved.json')).data;
const raw=projectAdoptedSkyCatalog(await read('tmp/v45-current-public-report.json')).data;
const publication=(await read('tmp/v45-public-constellations.json')).data;
const presentation=presentSkyTime(raw,context.selectedAtUtc);assert(presentation);
const frame=resolveConstellationFrame(publication,presentation.report.skyScene,context.selectedAtUtc);assert(frame);
const get=async(route:string)=>{
  const response=await fetch('http://127.0.0.1:60065'+route,{signal:AbortSignal.timeout(15000)});
  assert.equal(response.status,200);return Buffer.from(await response.arrayBuffer());
};
const catalogBytes=await get(`/v2/sky/catalogs/${raw.skyScene.catalog.catalogVersion}/${raw.skyScene.catalog.catalogHash}`);
const report=attachSkyCatalog(presentation.report,JSON.parse(catalogBytes.toString()).data);
const selected=(await read('tmp/v45-public-altair-position.json')).data;
const cases=[{name:'identification',fov:84.63316191100171,azimuth:selected.position.azimuthDeg,altitude:selected.position.altitudeDeg},
  {name:'fading-pressure',fov:115,azimuth:30,altitude:60},
  {name:'near-hidden-pressure',fov:139,azimuth:60,altitude:75}];
const assets=new Map<string,any>();
for(const field of cases){
  const basis=createSkyViewBasis(field.azimuth,90+field.altitude,0)!;
  for(const image of frame.images.filter(image=>artworkIntersectsView(image.registration,{basis,verticalFovDeg:field.fov},390,844))){
    const source=image.source;if(assets.has(source.sha256))continue;
    const bytes=await get(`/v2/sky/constellations/${publication.catalogHash}/assets/${source.file}`);
    assert.equal(sha(bytes),source.sha256);assert.equal(bytes.length,source.bytes);
    assets.set(source.sha256,{id:source.id,sha256:source.sha256,bytes:bytes.length,width:source.width,height:source.height,
      dataUrl:'data:image/png;base64,'+bytes.toString('base64')});
  }
}
const {chromium}=createRequire(import.meta.url)('C:/Users/777/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader']});
const results:any[]=[];
try{
  for(const field of cases){
    const page=await browser.newPage({viewport:{width:390,height:844}});
    await page.setContent('<style>body{margin:0}canvas{display:block}</style><canvas width="390" height="844"></canvas>');
    await page.evaluate('globalThis.__name=target=>target');await page.addScriptTag({content:production.toString()});
    await page.evaluate(async(sources)=>{
      const gl=document.querySelector('canvas')!.getContext('webgl',{preserveDrawingBuffer:true,antialias:false})!;
      const images=new Map();for(const source of sources){const image=new Image();image.src=source.dataUrl;await image.decode();images.set(source.id,image);}
      const stats={uploads:0,bytes:0,deletes:0,liveBytes:0,peakLogicalBytes:0};const allocated=new Map<WebGLTexture,number>();
      const upload=gl.texImage2D.bind(gl);(gl as any).texImage2D=(...args:any[])=>{
        stats.uploads++;const source=args[args.length-1];stats.bytes+=Number(source?.width||0)*Number(source?.height||0)*4;
                const texture=gl.getParameter(gl.TEXTURE_BINDING_2D) as WebGLTexture;
        const size=args.length===9?Number(args[3])*Number(args[4])*4:Number(source?.width||0)*Number(source?.height||0)*4;
        stats.liveBytes+=size-(allocated.get(texture)||0);allocated.set(texture,size);
        stats.peakLogicalBytes=Math.max(stats.peakLogicalBytes,stats.liveBytes);
        return (upload as any)(...args);
      };
      const remove=gl.deleteTexture.bind(gl);gl.deleteTexture=(texture)=>{stats.deletes++;if(texture){stats.liveBytes-=allocated.get(texture)||0;allocated.delete(texture);}return remove(texture);};
      (globalThis as any).pressure46={gl,images,stats,renderer:(globalThis as any).scene45Gpu.createSkyGpuRenderer(gl,1)};
    },[...assets.values()]);
    const basis=createSkyViewBasis(field.azimuth,90+field.altitude,0)!;
    const renders=await page.evaluate(({field,report,at,frame,basis})=>{
      const value=(globalThis as any).pressure46;const rows=[];let snapshot:any,failures=0;
      const args:any[]=[value.renderer,report,at,null,null,390,844,'DAY',(painted:any)=>snapshot=painted,undefined,field.fov,null,basis];
      args[15]={frame,images:value.images,enabled:true,failed(){failures++;}};
      args[34]={enabled:false};args[35]={horizontal:false,equatorial:false};
      for(let i=0;i<5;i++){
        Object.assign(value.stats,{uploads:0,bytes:0,deletes:0,peakLogicalBytes:value.stats.liveBytes});const start=performance.now();
        (globalThis as any).scene45Gpu.drawSkyScene(...args);value.gl.finish();
        const pixels=new Uint8Array(390*844*4);value.gl.readPixels(0,0,390,844,value.gl.RGBA,value.gl.UNSIGNED_BYTE,pixels);
        let binary='';for(let j=0;j<pixels.length;j+=32768)binary+=String.fromCharCode(...pixels.subarray(j,j+32768));
        rows.push({...value.stats,hostMs:performance.now()-start,rgbaBase64:btoa(binary),glError:value.gl.getError(),paintedObjects:snapshot.objects.length});
      }
      return {rows,failures};
    },{field,report,at:context.selectedAtUtc,frame,basis});
    assert.equal(renders.failures,0);
    const rows=renders.rows.map(({rgbaBase64,...row}:any)=>({...row,rgbaSha256:sha(Buffer.from(rgbaBase64,'base64'))}));
    assert(rows.every((row:any)=>row.glError===0&&row.paintedObjects>0));
    assert(rows.every((row:any)=>row.rgbaSha256===rows[0].rgbaSha256),'stable field must not trade away output for cache traffic');
    await page.locator('canvas').screenshot({path:path.join(output,field.name+'.png')});
    await page.evaluate(()=>(globalThis as any).pressure46.renderer.dispose());await page.close();
    results.push({field,rows});
  }
}finally{await browser.close();}
const before=JSON.parse(await fs.readFile('output/playwright/cloud-sky-scene-v46-pressure-0930/result.json','utf8'));
assert.equal(before.at,context.selectedAtUtc);assert.equal(before.constellationHash,publication.catalogHash);
for(const result of results){
  const old=before.results.find((row:any)=>row.field.name===result.field.name);assert(old);
  assert.deepEqual(result.field,old.field);
  assert(result.rows.every((row:any)=>row.rgbaSha256===old.rows[0].rgbaSha256&&row.paintedObjects===old.rows[0].paintedObjects),'cached ownership cannot alter actual pixels/objects');
  assert(result.rows.every((row:any)=>row.liveBytes<=16*1024*1024),'retention stays within the existing allowance after every frame');
  if(result.field.name!=='identification')assert(result.rows.slice(1).every((row:any)=>row.uploads<old.rows[1].uploads),'stable pressure field must reuse retained images');
}
const result={at:context.selectedAtUtc,productionBundleSha256:sha(production),oldProductionBundleSha256:sha(oldProduction),currentSourceHashes,constellationHash:publication.catalogHash,
  results,assets:[...assets.values()].map(({dataUrl,...asset})=>asset),
  limits:['Actual production software WebGL upload counts, not native/device/GC resource or performance acceptance',
    'Controlled star/constellation scene excludes all other texture layers and WXML',
    'Readback instrumentation and Swiftshader timings are not production frame-time measurements']};
await fs.writeFile(path.join(output,'result.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({output,results}));
