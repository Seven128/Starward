import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {projectAdoptedSkyCatalog} from '../../../../apps/wechat-miniapp/src/services/sky-report-catalog.ts';
import {attachSkyCatalog} from '../../../../apps/wechat-miniapp/src/features/sky/sky-stellar-scene.ts';
import {presentSkyTime} from '../../../../apps/wechat-miniapp/src/features/sky/sky-time-presentation.ts';
import {resolveConstellationFrame} from '../../../../apps/wechat-miniapp/src/features/sky/sky-constellation-scene.ts';
const sha=(bytes:Uint8Array|string)=>createHash('sha256').update(bytes).digest('hex');
const output=path.resolve('output/playwright/cloud-sky-artwork-raster-state-0930');
await assert.rejects(fs.access(output),{code:'ENOENT'});await fs.mkdir(output,{recursive:true});
const prior=JSON.parse(await fs.readFile('output/playwright/cloud-sky-artwork-raster-0930/result.json','utf8'));
for(const source of prior.sourceHashes)assert.equal(sha(await fs.readFile(source.path)),source.sha256);
const production=await fs.readFile('output/playwright/cloud-sky-artwork-raster-0930/production.js');assert.equal(sha(production),prior.productionBundleSha256);
const old=await fs.readFile('output/playwright/cloud-sky-current-composition-0930/production.js');assert.equal(sha(old),prior.beforeBundleSha256);
const raw=projectAdoptedSkyCatalog(JSON.parse(await fs.readFile('.codex/work-items/cloud-sky-native-2026-09-22/tmp/v49-current-public-report.json','utf8'))).data;
const ref=raw.skyScene.catalog!,reads:any[]=[];
const get=async(route:string)=>{const reply=await fetch('http://127.0.0.1:60065'+route,{signal:AbortSignal.timeout(10000)});assert.equal(reply.status,200);const bytes=Buffer.from(await reply.arrayBuffer());reads.push({route,bytes:bytes.length,sha256:sha(bytes)});return bytes;};
const stars=JSON.parse((await get(`/v2/sky/catalogs/${ref.catalogVersion}/${ref.catalogHash}`)).toString()).data;
const publication=JSON.parse((await get('/v2/sky/constellations')).toString()).data;
const report=attachSkyCatalog(presentSkyTime(raw,raw.context.at)!.report,stars);
const figure=resolveConstellationFrame(publication,report.skyScene,raw.context.at)!.images.find(figure=>figure.source.id==='Aql')!;
const pixels=await get(`/v2/sky/constellations/${publication.catalogHash}/assets/${figure.source.file}`);assert.equal(sha(pixels),figure.source.sha256);
const {chromium}=createRequire(import.meta.url)('C:/Users/777/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader']});
try{
 const page=await browser.newPage();await page.setContent('<canvas width="1170" height="2532"></canvas>');
 await page.evaluate('globalThis.__name=target=>target');await page.addScriptTag({content:old.toString().replace('var composition49 =','var raster50Before =')});await page.addScriptTag({content:production.toString()});
 const result=await page.evaluate(async(input:any)=>{
  const image=new Image();image.src='data:image/png;base64,'+input.pixels;await image.decode();
  const canvas=document.querySelector('canvas')!,gl=canvas.getContext('webgl',{preserveDrawingBuffer:true,antialias:false})!;
  const read=()=>{const bytes=new Uint8Array(canvas.width*canvas.height*4);gl.readPixels(0,0,canvas.width,canvas.height,gl.RGBA,gl.UNSIGNED_BYTE,bytes);let binary='';for(let i=0;i<bytes.length;i+=32768)binary+=String.fromCharCode(...bytes.subarray(i,i+32768));return btoa(binary);};
  const view={basis:input.condition.basis,verticalFovDeg:input.condition.fov},rows=[];
  for(const composite of ['additive','source-over','infrared-cutout','optical-cutout']){
   const variants=[];
   for(const variant of ['before','after']){
    const api=(globalThis as any)[variant==='before'?'raster50Before':'raster50After'],renderer=api.createSkyGpuRenderer(gl,3);
    renderer.begin(390,844,'#111521');const painted=renderer.artwork(image,input.registration,view,.4,'#ffffff',composite);
    const scissorAfterArtwork=gl.isEnabled(gl.SCISSOR_TEST);
    renderer.disc(5,5,4,'#ff00ff',1);renderer.finish();gl.finish();
    variants.push({variant,painted,scissorAfterArtwork,glError:gl.getError(),rgba:read()});renderer.dispose();
   }
   rows.push({composite,variants});
  }
  const renderer=(globalThis as any).raster50After.createSkyGpuRenderer(gl,3);renderer.begin(390,844,'#111521');
  const draw=gl.drawArrays.bind(gl);let failure='',boundedDraws=0;
  gl.drawArrays=(...args)=>{if(gl.isEnabled(gl.SCISSOR_TEST)){boundedDraws++;throw Error('controlled_bounded_draw_failure');}draw(...args);};
  try{renderer.artwork(image,input.registration,view,.4,'#ffffff');}catch(error){failure=String(error);}
  const restored={scissor:gl.isEnabled(gl.SCISSOR_TEST),src:gl.getParameter(gl.BLEND_SRC_RGB),dst:gl.getParameter(gl.BLEND_DST_RGB)};
  gl.drawArrays=draw;renderer.disc(5,5,4,'#ff00ff',1);renderer.finish();gl.finish();
  const marker=new Uint8Array(4);gl.readPixels(15,canvas.height-15,1,1,gl.RGBA,gl.UNSIGNED_BYTE,marker);const error=gl.getError();renderer.dispose();
  return {rows,failure,boundedDraws,restored,expectedBlend:{src:gl.SRC_ALPHA,dst:gl.ONE_MINUS_SRC_ALPHA},marker:Array.from(marker),error};
 },{pixels:pixels.toString('base64'),registration:figure.registration,condition:prior.rows.find((row:any)=>row.condition.name==='common-dpr3').condition});
 for(const row of result.rows){for(const variant of row.variants){assert.equal(variant.painted,true);assert.equal(variant.scissorAfterArtwork,false);assert.equal(variant.glError,0);variant.rgbaSha256=sha(Buffer.from(variant.rgba,'base64'));delete variant.rgba;}
  assert.equal(row.variants[0].rgbaSha256,row.variants[1].rgbaSha256);}
 assert.match(result.failure,/controlled_bounded_draw_failure/);assert.equal(result.boundedDraws,1);assert.equal(result.restored.scissor,false);
 assert.equal(result.restored.src,result.expectedBlend.src);assert.equal(result.restored.dst,result.expectedBlend.dst);
 assert.deepEqual(result.marker,[255,0,255,255]);assert.equal(result.error,0);
 await fs.writeFile(path.join(output,'result.json'),JSON.stringify({scope:'Shared registered-image composite controls using one actual source, plus controlled submit failure and actual subsequent point pixels; not source admission/native acceptance',productionBundleSha256:sha(production),sourceHashes:prior.sourceHashes,reads,...result},null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({composites:result.rows.length,pixelsEqual:true,boundedSubmitFailure:result.boundedDraws,scissorRestored:true,subsequentPoint:result.marker}));
}finally{await browser.close();}
