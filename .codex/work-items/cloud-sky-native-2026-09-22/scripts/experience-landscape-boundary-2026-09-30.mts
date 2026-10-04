// Current published PNG/RLE, production panorama and completed-frame picking.
// Software GL registration check. Does not operate DevTools, phone or reference UI.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {PNG} from 'pngjs';
import {build} from 'esbuild';
import {assertSkyLandscapeManifest,decodeSkyLandscapeAlpha} from '../../../../packages/miniapp-contracts/src/sky-landscape-publication.ts';
import {projectAdoptedSkyCatalog} from '../../../../apps/wechat-miniapp/src/services/sky-report-catalog.ts';
import {attachSkyCatalog} from '../../../../apps/wechat-miniapp/src/features/sky/sky-stellar-scene.ts';
import {presentSkyTime} from '../../../../apps/wechat-miniapp/src/features/sky/sky-time-presentation.ts';
import {createSkyViewBasis} from '../../../../apps/wechat-miniapp/src/features/sky/sky-view-projection.ts';
import {skySolarLightAt} from '../../../../apps/wechat-miniapp/src/features/sky/sky-solar-light.ts';

const task=path.resolve('.codex/work-items/cloud-sky-native-2026-09-22');
const output=path.resolve('output/playwright/cloud-sky-landscape-boundary-0930');
await assert.rejects(fs.access(output),{code:'ENOENT'});
await fs.mkdir(output,{recursive:true});
const sha=(value:Uint8Array|string)=>createHash('sha256').update(value).digest('hex');
const reads:any[]=[];
async function get(route:string){
  const response=await fetch('http://127.0.0.1:60065'+route,{signal:AbortSignal.timeout(15000)});
  assert.equal(response.status,200,route);
  const bytes=Buffer.from(await response.arrayBuffer());
  reads.push({route,bytes:bytes.length,sha256:sha(bytes),headers:Object.fromEntries(response.headers.entries())});
  return bytes;
}
const manifest=JSON.parse((await get('/v2/sky/landscape/manifest')).toString());
assertSkyLandscapeManifest(manifest);
const assets:any[]=[],sourceFacts:any[]=[];
for(const resource of manifest.resources){
  const pngBytes=await get(resource.image.downloadUrl),rleBytes=await get(resource.alpha.downloadUrl);
  assert.equal(sha(pngBytes),resource.image.sha256);assert.equal(pngBytes.length,resource.image.bytes);
  assert.equal(sha(rleBytes),resource.alpha.sha256);assert.equal(rleBytes.length,resource.alpha.bytes);
  const png=PNG.sync.read(pngBytes),encoded=JSON.parse(rleBytes.toString()),alpha=decodeSkyLandscapeAlpha(encoded,resource);
  assert.equal(png.width,resource.image.width);assert.equal(png.height,resource.image.height);
  const facts={resource:resource.id,pixels:alpha.length,transparent:0,opaque:0,partial:0,pngRleDifferences:0};
  let edge:any=null,seamContrast=0;
  for(let y=0;y<png.height;y++){
    seamContrast=Math.max(seamContrast,Math.abs(alpha[y*png.width]!-alpha[(y+1)*png.width-1]!));
    for(let x=0;x<png.width;x++){
      const i=y*png.width+x,a=alpha[i]!;
      facts.pngRleDifferences+=Number(png.data[i*4+3]!==a);
      if(a===0)facts.transparent++;else if(a===255)facts.opaque++;else facts.partial++;
      // A real photograph edge above the horizon, not fabricated opaque/sky data.
      if(!edge&&y<png.height/2&&a>32&&a<223&&x>png.width*.75)
        edge={x,y,alpha:a,azimuthDeg:(x+.5)*360/png.width,altitudeDeg:90-(y+.5)*180/png.height};
    }
  }
  assert.equal(facts.pngRleDifferences,0);assert(facts.partial>0&&facts.transparent>0&&facts.opaque>0&&edge);
  sourceFacts.push({...facts,seamContrast,edge,decodedAlphaSha256:sha(alpha)});
  assets.push({resource,encoded,data:'data:image/png;base64,'+pngBytes.toString('base64')});
}
const frozenBytes=await fs.readFile(path.join(task,'tmp/v49-current-public-report.json'));
const raw=projectAdoptedSkyCatalog(JSON.parse(frozenBytes.toString())).data;
const ref=raw.skyScene.catalog!;
const stars=JSON.parse((await get(`/v2/sky/catalogs/${ref.catalogVersion}/${ref.catalogHash}`)).toString()).data;
const at=raw.context.at,west=createSkyViewBasis(269.0634887703755,105,0)!;
const composed=[
  {name:'west-day',at:'2026-09-30T04:00:00.000Z',mode:'DAY',landscape:true},
  {name:'west-dusk',at:'2026-09-30T10:30:00.000Z',mode:'DAY',landscape:true},
  {name:'west-night',at,mode:'DAY',landscape:true},
  {name:'west-night-off',at,mode:'DAY',landscape:false},
  {name:'west-night-return',at,mode:'DAY',landscape:true},
  {name:'west-night-red',at,mode:'OBSERVATION',landscape:true},
].map(condition=>{
  const report=attachSkyCatalog(presentSkyTime(raw,condition.at)!.report,stars);
  return {...condition,report,sun:skySolarLightAt(report.hourly,condition.at)};
});
assert(composed.every(row=>row.sun));
const exports=`export {createSkyGpuRenderer} from './apps/wechat-miniapp/src/features/sky/sky-gpu-renderer';
export {drawSkyScene} from './apps/wechat-miniapp/src/features/sky/sky-scene-render';
export {createSkyPanoramaMask,skyPanoramaAlpha} from './apps/wechat-miniapp/src/features/sky/sky-landscape-mask';
export {decodeSkyLandscapeAlpha} from './packages/miniapp-contracts/src/sky-landscape-publication';
export {unprojectSkyPoint} from './apps/wechat-miniapp/src/features/sky/sky-view-projection';
export {paintedSkyPointVisible,pickPaintedSkyObjects} from './apps/wechat-miniapp/src/features/sky/sky-object-picking';`;
const options:any={stdin:{resolveDir:path.resolve('.'),contents:exports},bundle:true,write:false,metafile:true,
  format:'iife',globalName:'landscape53',platform:'browser',target:'es2022',tsconfig:path.resolve('apps/wechat-miniapp/tsconfig.json')};
const compiled=await build(options),production=compiled.outputFiles[0]!.text;
const sources=await Promise.all(Object.keys(compiled.metafile!.inputs).filter(file=>file!=='<stdin>').map(async file=>({path:file,sha256:sha(await fs.readFile(file))})));
await fs.writeFile(path.join(output,'production.js'),production,{flag:'wx'});
// Check sensitivity to a real registration defect while leaving source/candidates untouched.
const originalShaderLine='float v=0.5-asin(clamp(ray.z,-1.0,1.0))/3.141592653589793;';
const mutated=await build({...options,globalName:'landscape53Mutated',plugins:[{name:'bounded-vertical-registration-mutation',setup(builder:any){
  builder.onLoad({filter:/[\\/]sky-landscape\.ts$/},async(args:any)=>{
    const source=await fs.readFile(args.path,'utf8');assert.equal(source.split(originalShaderLine).length,2);
    return {contents:source.replace(originalShaderLine,'float v=0.5+asin(clamp(ray.z,-1.0,1.0))/3.141592653589793;'),loader:'ts'};
  });
}}]});
const mutationSource=mutated.outputFiles[0]!.text;
await fs.writeFile(path.join(output,'bounded-mutation.js'),mutationSource,{flag:'wx'});
const {chromium}=createRequire(import.meta.url)('C:/Users/777/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader']});
const rows:any[]=[],composition:any[]=[],errors:string[]=[];
try{
  const page=await browser.newPage({viewport:{width:390,height:844}});
  page.on('pageerror',(error:any)=>errors.push(String(error)));
  await page.setContent('<style>body{margin:0}canvas{display:block;width:390px;height:844px}</style><canvas width="390" height="844"></canvas>');
  await page.evaluate('globalThis.__name=target=>target');
  await page.addScriptTag({content:production});await page.addScriptTag({content:mutationSource});
  await page.evaluate(async(input:any)=>{
    const api=(globalThis as any).landscape53,decoded=new Map(),masks=new Map();
    for(const asset of input.assets){const image=new Image();image.src=asset.data;await image.decode();decoded.set(asset.resource.id,image);
      masks.set(asset.resource.id,api.createSkyPanoramaMask(input.manifest,asset.resource,api.decodeSkyLandscapeAlpha(asset.encoded,asset.resource)));}
    const canvas=document.querySelector('canvas')!,gl=canvas.getContext('webgl',{preserveDrawingBuffer:true,antialias:false})!;
    if(!gl)throw Error('no_webgl');
    const live:any={textures:new Set(),buffers:new Set(),programs:new Set(),shaders:new Set()};
    for(const [noun,key] of [['Texture','textures'],['Buffer','buffers'],['Program','programs'],['Shader','shaders']]){
      const create=(gl as any)['create'+noun].bind(gl),remove=(gl as any)['delete'+noun].bind(gl);
      (gl as any)['create'+noun]=(...args:any[])=>{const value=create(...args);if(value)live[key].add(value);return value;};
      (gl as any)['delete'+noun]=(value:any)=>{live[key].delete(value);remove(value);};
    }
    (globalThis as any).boundaryInput={api,decoded,masks,canvas,gl,live,failures:[],renderer:null,pixelRatio:null};
  },{manifest,assets});
  async function probe(condition:any,mutate=false){
    const row=await page.evaluate(({condition,mutate}:any)=>{
      const input=(globalThis as any).boundaryInput,api=input.api;
      if(input.renderer&&(input.pixelRatio!==condition.dpr||mutate)){input.renderer.dispose();input.renderer=null;}
      if(!input.renderer){input.canvas.width=390*condition.dpr;input.canvas.height=844*condition.dpr;
        const renderApi=mutate?(globalThis as any).landscape53Mutated:api;
        input.renderer=renderApi.createSkyGpuRenderer(input.gl,condition.dpr,{imageFailed:()=>input.failures.push(condition.name)});input.pixelRatio=condition.dpr;}
      const mask=input.masks.get(condition.resource),view={basis:condition.basis,verticalFovDeg:condition.fov};
      input.renderer.begin(390,844,'#000000');
      // Diagnostic state isolates shader alpha from the normal opaque scene destination.
      input.gl.disable(input.gl.BLEND);input.gl.clearColor(0,0,0,0);input.gl.clear(input.gl.COLOR_BUFFER_BIT);
      const ok=input.renderer.landscape(view,{direction:[0,0,1],altitudeDeg:10},false,{image:input.decoded.get(condition.resource),mask});
      input.renderer.finish();input.gl.finish();
      const width=input.canvas.width,height=input.canvas.height,bytes=new Uint8Array(width*height*4);
      input.gl.readPixels(0,0,width,height,input.gl.RGBA,input.gl.UNSIGNED_BYTE,bytes);
      let maxError=0,errorSum=0,aboveTwo=0,robustWrongOpacity=0,samples=0,transparent=0,opaque=0,partial=0;
      let seamSamples=0,seamMaxError=0,maximum:any=null;
      // Every CSS pixel centre, including the centre physical pixel at DPR3.
      for(let y=0;y<844;y++)for(let x=0;x<390;x++){
        const ray=api.unprojectSkyPoint(x+.5,y+.5,view.basis,390,844,view.verticalFovDeg)!;
        const cpu=api.skyPanoramaAlpha(mask,ray);
        const px=x*condition.dpr+Math.floor(condition.dpr/2),py=y*condition.dpr+Math.floor(condition.dpr/2);
        const gpu=bytes[((height-1-py)*width+px)*4+3]!,error=Math.abs(cpu-gpu);
        samples++;errorSum+=error;if(error>2)aboveTwo++;
        if((cpu===0&&gpu>2)||(cpu===255&&gpu<253))robustWrongOpacity++;
        if(error>maxError){maxError=error;maximum={x:x+.5,y:y+.5,cpu,gpu};}
        if(gpu===0)transparent++;else if(gpu===255)opaque++;else partial++;
        const azimuth=Math.atan2(ray[0],ray[1]);
        if(Math.abs(azimuth)<Math.PI/mask.resource.image.width){seamSamples++;seamMaxError=Math.max(seamMaxError,error);}
      }
      // Save actual raster in top-left order, without screenshot resampling.
      const top=new Uint8Array(bytes.length);
      for(let y=0;y<height;y++)top.set(bytes.subarray((height-1-y)*width*4,(height-y)*width*4),y*width*4);
      let binary='';for(let i=0;i<top.length;i+=32768)binary+=String.fromCharCode(...top.subarray(i,i+32768));
      const result={ok,samples,maxError,meanError:errorSum/samples,aboveTwo,robustWrongOpacity,transparent,opaque,partial,
        seamSamples,seamMaxError,maximum,glError:input.gl.getError(),width,height,rgbaBase64:btoa(binary)};
      if(mutate){input.renderer.dispose();input.renderer=null;}
      return result;
    },{condition,mutate});
    const bytes=Buffer.from(row.rgbaBase64,'base64'),png=new PNG({width:row.width,height:row.height});png.data=bytes;
    const file=condition.name+(mutate?'-mutated':'')+'.png';await fs.writeFile(path.join(output,file),PNG.sync.write(png),{flag:'wx'});
    const {rgbaBase64,...facts}=row;
    const result={condition,...facts,rgbaSha256:sha(bytes),image:file,imageSha256:sha(await fs.readFile(path.join(output,file)))};
    console.log(JSON.stringify({name:condition.name,mutate,maxError:row.maxError,aboveTwo:row.aboveTwo,robustWrongOpacity:row.robustWrongOpacity,seamSamples:row.seamSamples}));
    return result;
  }
  for(const resource of manifest.resources){
    const edge=sourceFacts.find(row=>row.resource===resource.id).edge;
    const conditions=[
      {name:resource.id+'-west-wide',basis:west,fov:85,dpr:1},
      {name:resource.id+'-north-wide',basis:createSkyViewBasis(0,92,0),fov:85,dpr:3},
      {name:resource.id+'-north-seam-local',basis:createSkyViewBasis(0,92,0),fov:9.1,dpr:3},
      {name:resource.id+'-photo-edge-local',basis:createSkyViewBasis(edge.azimuthDeg,90+edge.altitudeDeg,0),fov:9.1,dpr:3},
      {name:resource.id+'-dome',basis:createSkyViewBasis(0,180,0),fov:274.9,dpr:1},
      {name:resource.id+'-north-wide-return',basis:createSkyViewBasis(0,92,0),fov:85,dpr:3},
    ];
    for(const condition of conditions){const row=await probe({...condition,resource:resource.id});rows.push(row);}
    assert.equal(rows.find(row=>row.condition.name===resource.id+'-north-wide')!.rgbaSha256,rows.at(-1)!.rgbaSha256);
  }
  const sensitivity=await probe({name:'detail-west-wide',resource:'detail',basis:west,fov:85,dpr:1},true);
  assert(sensitivity.aboveTwo>1000&&sensitivity.robustWrongOpacity>1000,'the current-input check must reject a vertically inverted photograph');
  for(const row of composed){
    const result=await page.evaluate((condition:any)=>{
      const input=(globalThis as any).boundaryInput,api=input.api;
      if(input.renderer){input.renderer.dispose();input.renderer=null;}
      input.canvas.width=390;input.canvas.height=844;input.renderer=api.createSkyGpuRenderer(input.gl,1,{imageFailed:()=>input.failures.push(condition.name)});input.pixelRatio=1;
      let snapshot:any=null;const args:any[]=Array(36).fill(undefined),mask=input.masks.get('detail');
      Object.assign(args,{0:input.renderer,1:condition.report,2:condition.at,3:null,4:null,5:390,6:844,7:condition.mode,
        8:(value:any)=>snapshot=value,10:85,12:condition.basis,
        34:{enabled:condition.landscape,panorama:{image:input.decoded.get('detail'),mask}},35:{horizontal:true,equatorial:false}});
      api.drawSkyScene(...args);input.gl.finish();
      const picks=snapshot.objects.map((object:any)=>{
        const visible=api.paintedSkyPointVisible(snapshot,object.x,object.y);
        const ray=api.unprojectSkyPoint(object.x,object.y,snapshot.view.basis,390,844,85);
        const alpha=api.skyPanoramaAlpha(mask,ray);
        const candidates=api.pickPaintedSkyObjects(snapshot,{x:object.x,y:object.y,frameAt:snapshot.frameAt,catalogVersion:snapshot.catalogVersion,catalogHash:snapshot.catalogHash},0);
        return {reference:object.reference,x:object.x,y:object.y,altitudeDeg:Math.asin(Math.max(-1,Math.min(1,ray[2])))*180/Math.PI,alpha,visible,picked:candidates.some((item:any)=>item.reference===object.reference)};
      });
      const bytes=new Uint8Array(390*844*4);input.gl.readPixels(0,0,390,844,input.gl.RGBA,input.gl.UNSIGNED_BYTE,bytes);
      let redDominanceViolations=0;for(let i=0;i<bytes.length;i+=4)if(bytes[i+1]>bytes[i]||bytes[i+2]>bytes[i])redDominanceViolations++;
      let binary='';for(let i=0;i<bytes.length;i+=32768)binary+=String.fromCharCode(...bytes.subarray(i,i+32768));
      return {frameAt:snapshot.frameAt,paintedResource:snapshot.view.landscape?.resource?.id??null,picks,redDominanceViolations,glError:input.gl.getError(),rgbaBase64:btoa(binary)};
    },{...row,basis:west});
    assert.equal(result.frameAt,row.at);assert.equal(result.paintedResource,row.landscape?'detail':null);assert.equal(result.glError,0);
    for(const pick of result.picks){assert.equal(pick.picked,pick.visible);if(row.landscape)assert.equal(pick.visible,pick.altitudeDeg>=0&&pick.alpha<254.5);}
    if(row.mode==='OBSERVATION')assert.equal(result.redDominanceViolations,0);
    const file=row.name+'.png';await page.locator('canvas').screenshot({path:path.join(output,file)});
    const {rgbaBase64,...effect}=result;
    composition.push({condition:{name:row.name,at:row.at,mode:row.mode,landscape:row.landscape,basis:west,fov:85,sun:row.sun},...effect,
      rgbaSha256:sha(Buffer.from(rgbaBase64,'base64')),image:file,imageSha256:sha(await fs.readFile(path.join(output,file)))});
  }
  assert.equal(composition.find(row=>row.condition.name==='west-night')!.rgbaSha256,composition.find(row=>row.condition.name==='west-night-return')!.rgbaSha256);
  const retired=await page.evaluate(()=>{const input=(globalThis as any).boundaryInput;input.renderer.dispose();return {
    resources:Object.fromEntries(Object.entries(input.live).map(([key,value]:any)=>[key,value.size])),failures:input.failures,glError:input.gl.getError()};});
  const result={scope:'Current published image/mask registration and core completed-scene picking in software GL; not reference quality, all-layer composition, native or device acceptance',
    manifestHash:manifest.publicationHash,observer:raw.skyScene.observer,contextIdSha256:sha(raw.context.contextId),reportSha256:sha(frozenBytes),
    sourceFacts,reads,sources,productionBundleSha256:sha(production),rows,sensitivity:{mutation:'Only panorama vertical coordinate inverted in an in-memory build; production files and candidates unchanged',...sensitivity},
    composition,retired,errors,limits:['Shader alpha uses diagnostic blend OFF and transparent destination; ordinary scene uses production blend and opaque canvas',
      'Registration samples every CSS pixel centre; DPR3 physical subpixels between these centres are not exhaustively compared',
      'Core composition uses real BSC/targets and normal production fallbacks; SAO, constellation photographs, external galactic photograph, W3 and solar refined textures are absent',
      'Predecoded images and source arrays do not establish native files, GPU/native memory, frame-time, weak-network performance or request-owner recovery',
      'No current Stellarium reference frame was obtained; twilight and photographic captured-light quality remain open',
      'No Context write, IDE restart, preview, phone action, deployment or candidate change']};
  await fs.writeFile(path.join(output,'result.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});
  assert(rows.every(row=>row.ok&&row.glError===0&&row.robustWrongOpacity===0&&row.aboveTwo===0),'current PNG/RLE/GPU registration must agree outside the bounded 8-bit sampling tolerance');
  assert(Object.values(retired.resources).every(value=>value===0));assert.equal(retired.glError,0);assert.equal(retired.failures.length,0);assert.equal(errors.length,0);
  console.log(JSON.stringify({output,registrationRows:rows.length,coreCompositions:composition.length,pngRleDifferences:0,retired}));
}finally{await browser.close();}
