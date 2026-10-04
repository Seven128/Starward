// Reproducible production-WebGL check; no native UI or phone acceptance.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {build} from 'esbuild';
import {projectAdoptedSkyCatalog} from '../../../../apps/wechat-miniapp/src/services/sky-report-catalog.ts';
import {attachSkyCatalog} from '../../../../apps/wechat-miniapp/src/features/sky/sky-stellar-scene.ts';
import {createSkyViewBasis} from '../../../../apps/wechat-miniapp/src/features/sky/sky-view-projection.ts';
import {skyStarAppearance} from '../../../../apps/wechat-miniapp/src/features/sky/sky-star-appearance.ts';
import {skyStarDisplayColor} from '../../../../apps/wechat-miniapp/src/features/sky/sky-scene-render.ts';

const stage=process.argv[2];assert(['before','after'].includes(stage));
const root=process.cwd(),output=path.resolve(`output/playwright/cloud-sky-stellar-glare-0929-${stage}`);
await assert.rejects(fs.access(output),{code:'ENOENT'});await fs.mkdir(output,{recursive:true});
const digest=(data:Uint8Array|string)=>createHash('sha256').update(data).digest('hex');
const project=path.resolve('apps/wechat-miniapp/dist/weapp-check-sky-combined-clean-v32-0929').replaceAll('\\','/');
// Opaque native Context is read only, kept in memory, never printed or persisted.
const context=JSON.parse(execFileSync('pwsh',['-NoProfile','-Command',`
 $r=(& 'E:/微信web开发者工具/wechatide.cmd' -c codex automation_evaluate --project '${project}' --fn-source "function(){var s=wx.getStorageSync('starward.wechat-miniapp.state.current');return s&&s.observationContext;}")|ConvertFrom-Json;
 if(-not $r.ok){throw 'Native Context read failed'};
 $v=$r.result;while($v -is [pscustomobject] -and $v.PSObject.Properties.Name -contains 'result'){$v=$v.result};
 $v|ConvertTo-Json -Depth 8 -Compress;
`],{encoding:'utf8',windowsHide:true}));
const contextSha256=digest(context.contextId);
assert.equal(contextSha256,'6dc1c04956441e9fc33e6cae8e8b5cd9b2a747d4411ae2469810525362f9ac15');
const at='2026-09-29T13:00:00.000Z';assert.equal(Date.parse(context.selectedAtUtc),Date.parse(at));
const json=async(route:string)=>{const r=await fetch('http://127.0.0.1:8791'+route,
 {headers:{'x-starward-measurement-probe':'1'},signal:AbortSignal.timeout(15000)});assert.equal(r.status,200);return r.json();};
const suffix=`?contextId=${encodeURIComponent(context.contextId)}&catalogVersion=bsc5p-bright-stars.v3`;
const raw=projectAdoptedSkyCatalog(await json('/v2/spots/spot%3Atest-published/sky'+suffix)).data;
const catalog=(await json(`/v2/sky/catalogs/${raw.skyScene.catalog!.catalogVersion}/${raw.skyScene.catalog!.catalogHash}`)).data;
const report=attachSkyCatalog(raw,catalog);
const adoptedCatalog=report.skyScene.catalog!;assert(adoptedCatalog?.entries);
const selected=(await json('/v2/spots/spot%3Atest-published/sky/objects/HR%3A7557'+suffix+'&at='+encodeURIComponent(at))).data;
assert(selected.position);const basis=createSkyViewBasis(selected.position.azimuthDeg,90+selected.position.altitudeDeg,0)!;
const faint=adoptedCatalog.entries.find((star:any)=>star.magnitude>=5.9&&star.magnitude<6)!;assert(faint);
const saoProof=JSON.parse(await fs.readFile(path.resolve('.codex/work-items/cloud-sky-native-2026-09-22/evidence/experience-stellar-layer-frame-2026-09-29.json'),'utf8'));
const sao=saoProof.results.find((row:any)=>row.target)?.target;assert.equal(sao[0],'SAO:67132');
const entries=[adoptedCatalog.entries.find((s:any)=>s.objectRef==='HR:7557'),adoptedCatalog.entries.find((s:any)=>s.objectRef==='HR:7001'),
 adoptedCatalog.entries.find((s:any)=>s.objectRef==='HR:2061'),faint,{objectRef:sao[0],magnitude:sao[1],colorIndex:null}];
assert(entries.every(Boolean));
const glyphs=entries.map((star:any,index:number)=>({reference:star.objectRef,magnitude:star.magnitude,
 color:skyStarDisplayColor(star.colorIndex)??'#dce4ef',appearance:skyStarAppearance(star.magnitude,2.67,-25,90)!,
 x:48+80*(index%3),y:index<3?48:128,profile:'star'}));
glyphs.push({reference:'CONTROL:RING',magnitude:0,color:'#a9bdd6',appearance:{radiusPx:3.2,opacity:.9},x:208,y:128,profile:'disc'});
const owner='apps/wechat-miniapp/src/features/sky/sky-gpu-renderer.ts';
const ownerBytes=await fs.readFile(owner);await fs.writeFile(path.join(output,'renderer-owner.ts'),ownerBytes,{flag:'wx'});
const bundle=await build({stdin:{resolveDir:root,contents:"export {createSkyGpuRenderer} from './apps/wechat-miniapp/src/features/sky/sky-gpu-renderer';export {drawSkyScene} from './apps/wechat-miniapp/src/features/sky/sky-scene-render';"},bundle:true,write:false,metafile:true,
 platform:'browser',format:'iife',globalName:'stellarGlareGpu',target:'es2022',tsconfig:path.resolve('apps/wechat-miniapp/tsconfig.json')});
await fs.writeFile(path.join(output,'production.js'),bundle.outputFiles[0]!.text,{flag:'wx'});
const sourceInputs=await Promise.all(Object.keys(bundle.metafile!.inputs).filter(file=>file!=='<stdin>').map(async file=>({file,sha256:digest(await fs.readFile(file))})));
const {chromium}=createRequire(import.meta.url)('C:/Users/777/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader']});
const glyphRows:any[]=[],scenes:any[]=[];
try{
 for(const dpr of [1,3]){
  const page=await browser.newPage({viewport:{width:256,height:176},deviceScaleFactor:dpr});
  await page.setContent(`<style>body{margin:0}canvas{display:block;width:256px;height:176px}</style><canvas width="${256*dpr}" height="${176*dpr}"></canvas>`);
  await page.evaluate('globalThis.__name=target=>target');await page.addScriptTag({content:bundle.outputFiles[0]!.text});
  const painted=await page.evaluate(({glyphs,dpr})=>{
   const gl=document.querySelector('canvas')!.getContext('webgl',{preserveDrawingBuffer:true,antialias:false})!;
   const renderer=(globalThis as any).stellarGlareGpu.createSkyGpuRenderer(gl,dpr);
   renderer.begin(256,176,'#080d17');
   for(const g of glyphs)renderer.disc(g.x,g.y,g.appearance.radiusPx,g.color,g.appearance.opacity,g.profile==='disc'?1:0,g.profile);
   renderer.finish();gl.finish();
   const pixels=new Uint8Array(256*dpr*176*dpr*4);gl.readPixels(0,0,256*dpr,176*dpr,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
   const rows=glyphs.map(g=>{
    let axes=0,diagonals=0,axisCount=0,diagonalCount=0;const radius=g.appearance.radiusPx;
    const crop:number[]=[];
    for(let y=Math.ceil(g.y-24);y<g.y+24;y++)for(let x=Math.ceil(g.x-24);x<g.x+24;x++){
     const offset=4*((176*dpr-1-Math.floor(y*dpr))*256*dpr+Math.floor(x*dpr));
     crop.push(pixels[offset],pixels[offset+1],pixels[offset+2]);
     const dx=Math.abs(x+.5-g.x),dy=Math.abs(y+.5-g.y),distance=Math.hypot(dx,dy);
     if(distance<3.5*radius||distance>5*radius)continue;
     const energy=Math.max(0,pixels[offset]-8)+Math.max(0,pixels[offset+1]-13)+Math.max(0,pixels[offset+2]-23);
     if(Math.min(dx,dy)<.8){axes+=energy;axisCount++;}
     if(Math.abs(dx-dy)<.8){diagonals+=energy;diagonalCount++;}
    }
    return{reference:g.reference,radius,axes:axes/Math.max(1,axisCount),diagonals:diagonals/Math.max(1,diagonalCount),crop};
   });
   const range=Array.from(gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE));
   renderer.dispose();return{rows,range,error:gl.getError()};
  },{glyphs,dpr});assert.equal(painted.error,0);
  await page.locator('canvas').screenshot({path:path.join(output,`glyphs-dpr${dpr}.png`)});
  glyphRows.push({dpr,pointSizeRange:painted.range,rows:painted.rows.map((row:any)=>({...row,crop:undefined,cropSha256:digest(new Uint8Array(row.crop))}))});
  await page.close();
 }
 const page=await browser.newPage({viewport:{width:390,height:844}});
 await page.setContent('<style>body{margin:0}canvas{display:block}</style><canvas width="390" height="844"></canvas>');
 await page.evaluate('globalThis.__name=target=>target');await page.addScriptTag({content:bundle.outputFiles[0]!.text});
 await page.evaluate(()=>{const gl=document.querySelector('canvas')!.getContext('webgl',{preserveDrawingBuffer:true,antialias:false})!;
  (globalThis as any).stellarInputs={gl,renderer:(globalThis as any).stellarGlareGpu.createSkyGpuRenderer(gl,1)};});
 for(const [name,fov] of [['wide',45],['fine',2.67],['fine-return',2.67]] as const){
  const row=await page.evaluate(({report,at,basis,fov})=>{const input=(globalThis as any).stellarInputs;
   const draw=()=>{let snapshot:any;const start=performance.now();(globalThis as any).stellarGlareGpu.drawSkyScene(input.renderer,report,at,null,null,390,844,'DAY',(s:any)=>snapshot=s,undefined,fov,null,basis);
    input.gl.finish();return{duration:performance.now()-start,snapshot};};
   draw();const times:number[]=[];let snapshot:any;for(let i=0;i<16;i++){const row=draw();times.push(row.duration);snapshot=row.snapshot;}
   const pixels=new Uint8Array(390*844*4);input.gl.readPixels(0,0,390,844,input.gl.RGBA,input.gl.UNSIGNED_BYTE,pixels);
   let binary='';for(let i=0;i<pixels.length;i+=32768)binary+=String.fromCharCode(...pixels.subarray(i,i+32768));
   return{times,snapshot,rgbaBase64:btoa(binary),error:input.gl.getError()};},{report,at,basis,fov});
  assert.equal(row.error,0);assert(row.snapshot.objects.some((s:any)=>s.reference==='HR:7557'));
  await page.locator('canvas').screenshot({path:path.join(output,name+'.png')});
  scenes.push({name,fov,rgbaSha256:digest(Buffer.from(row.rgbaBase64,'base64')),objectsSha256:digest(JSON.stringify(row.snapshot.objects)),
   paintedObjectCount:row.snapshot.objects.length,times:row.times,error:row.error});
 }
 await page.evaluate(()=>(globalThis as any).stellarInputs.renderer.dispose());
 assert.equal(scenes[1].rgbaSha256,scenes[2].rgbaSha256);
}finally{await browser.close();}
const useful=glyphRows.every(row=>row.rows.slice(0,3).every((g:any)=>g.axes>g.diagonals+1&&g.diagonals>0));
const record={scope:'Real adopted catalogue values with controlled glyph layout/zenith and production shader; real current formal-spot full-scene inputs. Software GPU, not native/phone or calibrated stellar PSF.',
 stage,contextSha256,at,catalogHash:catalog.catalogHash,ownerSha256:digest(ownerBytes),sourceInputs,sourceBundleSha256:digest(bundle.outputFiles[0]!.text),glyphs,glyphRows,scenes,useful,
 limits:['New values are display tuning, not measured diffraction/flux.','Host gl.finish timings include software rendering and are not target frame-time acceptance.',
 'Same catalogue/Context/pose/colour and unchanged pick snapshots must be compared before/after; no late/failing source or whole native composition claim.']};
assert(!JSON.stringify(record).includes(context.contextId));
await fs.writeFile(path.join(output,'result.json'),JSON.stringify(record,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({output,stage,useful,glyphRows,scenes}));
assert(useful,'bright point sources need visible extended halo and axis wings beyond their existing core');
