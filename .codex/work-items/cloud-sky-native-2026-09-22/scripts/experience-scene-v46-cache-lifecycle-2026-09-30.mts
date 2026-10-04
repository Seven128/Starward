// Exercise the same production GPU owner across camera changes and retirement.
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

const output=path.resolve('output/playwright/cloud-sky-scene-v46-cache-lifecycle-0930');
await assert.rejects(fs.access(output),{code:'ENOENT'});await fs.mkdir(output,{recursive:true});
const task=path.resolve('.codex/work-items/cloud-sky-native-2026-09-22');
const sha=(bytes:Uint8Array|string)=>createHash('sha256').update(bytes).digest('hex');
const read=async(file:string)=>JSON.parse(await fs.readFile(path.join(task,file),'utf8'));
const prior=JSON.parse(await fs.readFile('output/playwright/cloud-sky-scene-v46-cache-after-0930/result.json','utf8'));
for(const owner of prior.currentSourceHashes)assert.equal(sha(await fs.readFile(owner.path)),owner.sha256);
const production=await fs.readFile('output/playwright/cloud-sky-scene-v46-cache-after-0930/production.js');
assert.equal(sha(production),prior.productionBundleSha256);
const context=(await read('tmp/v45-context-resolved.json')).data;
const raw=projectAdoptedSkyCatalog(await read('tmp/v45-current-public-report.json')).data;
const publication=(await read('tmp/v45-public-constellations.json')).data;
const time=presentSkyTime(raw,context.selectedAtUtc);assert(time);
const frame=resolveConstellationFrame(publication,time.report.skyScene,context.selectedAtUtc);assert(frame);
const response=await fetch(`http://127.0.0.1:60065/v2/sky/catalogs/${raw.skyScene.catalog.catalogVersion}/${raw.skyScene.catalog.catalogHash}`);
assert.equal(response.status,200);
const report=attachSkyCatalog(time.report,(await response.json() as any).data);
const assets=await Promise.all(prior.assets.map(async (source:any)=>{
  const image=publication.images.find((image:any)=>image.id===source.id);assert(image);assert.equal(image.sha256,source.sha256);
  const bytes=await fs.readFile(path.resolve('workers/miniapp-api/assets/constellations',image.file));
  assert.equal(sha(bytes),source.sha256);
  return {...source,dataUrl:'data:image/png;base64,'+bytes.toString('base64')};
}));
const pressure=prior.results.find((row:any)=>row.field.name==='near-hidden-pressure');
const identification=prior.results.find((row:any)=>row.field.name==='identification');
const cases=[{...pressure.field,name:'pressure'}, {...identification.field,name:'changed-view'},
  {...identification.field,name:'overview-hidden',fov:180},{...pressure.field,name:'pressure-restored'}];
const {chromium}=createRequire(import.meta.url)('C:/Users/777/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader']});
const results:any[]=[];let disposal:any;
try{
  const page=await browser.newPage({viewport:{width:390,height:844}});
  await page.setContent('<style>body{margin:0}canvas{display:block}</style><canvas width="390" height="844"></canvas>');
  await page.evaluate('globalThis.__name=target=>target');await page.addScriptTag({content:production.toString()});
  await page.evaluate(async(sources)=>{
    const gl=document.querySelector('canvas')!.getContext('webgl',{preserveDrawingBuffer:true,antialias:false})!;
    const images=new Map();for(const source of sources){const image=new Image();image.src=source.dataUrl;await image.decode();images.set(source.id,image);}
    const allocated=new Map<WebGLTexture,number>();const stats={uploads:0,deletes:0,liveBytes:0,peakLogicalBytes:0};
    const upload=gl.texImage2D.bind(gl);(gl as any).texImage2D=(...args:any[])=>{
      const texture=gl.getParameter(gl.TEXTURE_BINDING_2D);const source=args.at(-1);
      const size=args.length===9?Number(args[3])*Number(args[4])*4:Number(source?.width||0)*Number(source?.height||0)*4;
      stats.uploads++;stats.liveBytes+=size-(allocated.get(texture)||0);allocated.set(texture,size);
      stats.peakLogicalBytes=Math.max(stats.peakLogicalBytes,stats.liveBytes);return (upload as any)(...args);
    };
    const remove=gl.deleteTexture.bind(gl);gl.deleteTexture=texture=>{
      stats.deletes++;if(texture){stats.liveBytes-=allocated.get(texture)||0;allocated.delete(texture);}return remove(texture);
    };
    (globalThis as any).cacheLife46={gl,images,allocated,stats,renderer:(globalThis as any).scene45Gpu.createSkyGpuRenderer(gl,1)};
  },assets);
  for(const field of cases){
    const basis=createSkyViewBasis(field.azimuth,90+field.altitude,0)!;
    const rendered=await page.evaluate(({field,basis,report,frame,at})=>{
      const value=(globalThis as any).cacheLife46;const rows=[];let snapshot:any,failed=0;
      const args:any[]=[value.renderer,report,at,null,null,390,844,'DAY',(painted:any)=>snapshot=painted,undefined,field.fov,null,basis];
      args[15]={frame,images:value.images,enabled:true,failed(){failed++;}};args[34]={enabled:false};args[35]={horizontal:false,equatorial:false};
      for(let i=0;i<3;i++){
        Object.assign(value.stats,{uploads:0,deletes:0,peakLogicalBytes:value.stats.liveBytes});
        (globalThis as any).scene45Gpu.drawSkyScene(...args);value.gl.finish();
        const pixels=new Uint8Array(390*844*4);value.gl.readPixels(0,0,390,844,value.gl.RGBA,value.gl.UNSIGNED_BYTE,pixels);
        let binary='';for(let j=0;j<pixels.length;j+=32768)binary+=String.fromCharCode(...pixels.subarray(j,j+32768));
        rows.push({...value.stats,rgbaBase64:btoa(binary),glError:value.gl.getError(),objects:snapshot.objects.length});
      }
      return {rows,failed};
    },{field,basis,report,frame,at:context.selectedAtUtc});
    assert.equal(rendered.failed,0);
    const rows=rendered.rows.map(({rgbaBase64,...row}:any)=>({...row,rgbaSha256:sha(Buffer.from(rgbaBase64,'base64'))}));
    assert(rows.every((row:any)=>row.glError===0&&row.objects>0&&row.liveBytes<=16*1024*1024));
    if(field.name==='overview-hidden')assert(rows.every((row:any)=>row.liveBytes===0&&row.uploads===0));
    else{
      const expected=field.name==='changed-view'?identification:pressure;
      assert(rows.every((row:any)=>row.rgbaSha256===expected.rows[0].rgbaSha256),'camera changes must preserve the exact corresponding rendered field');
    }
    results.push({field,rows});await page.locator('canvas').screenshot({path:path.join(output,field.name+'.png')});
  }
  disposal=await page.evaluate(()=>{
    const value=(globalThis as any).cacheLife46;value.renderer.dispose();return {liveBytes:value.stats.liveBytes,textures:value.allocated.size,glError:value.gl.getError()};
  });
  assert.deepEqual(disposal,{liveBytes:0,textures:0,glError:0});await page.close();
}finally{await browser.close();}
const result={at:context.selectedAtUtc,productionBundleSha256:sha(production),results,disposal,
  limits:['Software production owner: exact corresponding field pixels/objects, counted texture retention and retirement',
    'Logical texture lifetime is not driver/native/GC peak memory; no target-performance claim',
    'No other texture layer or ordinary WXML composition claim']};
await fs.writeFile(path.join(output,'result.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({output,results,disposal}));
