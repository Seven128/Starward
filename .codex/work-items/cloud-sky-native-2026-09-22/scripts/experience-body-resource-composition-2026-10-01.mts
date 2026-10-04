// Reuse published local bytes and the saved current report. Actual production
// Canvas owners, logical WebGL allocations; no native-memory/device claim.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
import {projectAdoptedSkyCatalog} from '../../../../apps/wechat-miniapp/src/services/sky-report-catalog.ts';
import {attachSkyCatalog} from '../../../../apps/wechat-miniapp/src/features/sky/sky-stellar-scene.ts';
import {presentSkyTime} from '../../../../apps/wechat-miniapp/src/features/sky/sky-time-presentation.ts';
import {resolveConstellationFrame} from '../../../../apps/wechat-miniapp/src/features/sky/sky-constellation-scene.ts';
import {createSkyViewBasis} from '../../../../apps/wechat-miniapp/src/features/sky/sky-view-projection.ts';
import {artworkIntersectsView} from '../../../../apps/wechat-miniapp/src/features/sky/sky-artwork-visibility.ts';
import {constellationVisibility} from '../../../../apps/wechat-miniapp/src/features/sky/sky-constellation-visibility.ts';
import {skyMoonDiscAt} from '../../../../apps/wechat-miniapp/src/features/sky/sky-moon-disc.ts';
import {skyPlanetDiscsAt} from '../../../../apps/wechat-miniapp/src/features/sky/sky-planet-disc.ts';
import {skyGalacticBandAt} from '../../../../apps/wechat-miniapp/src/features/sky/sky-galactic-band.ts';

const task='.codex/work-items/cloud-sky-native-2026-09-22';
const compare=process.argv.includes('--after');
const baselineOutput=path.resolve('output/playwright/cloud-sky-body-resource-composition-1001');
const output=baselineOutput+(compare?'-after':'');
await assert.rejects(fs.access(output),{code:'ENOENT'});
await fs.mkdir(output,{recursive:true});
const sha=(bytes:Uint8Array|string)=>createHash('sha256').update(bytes).digest('hex');
const inputs:any[]=[];
const json=async(route:string)=>{
  if(compare){
    const prior=JSON.parse(await fs.readFile(path.join(baselineOutput,'result.json'),'utf8'));
    const record=prior.inputs.find((row:any)=>row.route===route);
    assert(record && record.transport==='CURRENT_LOCAL_BFF_JSON');
    const index=prior.inputs.indexOf(record)+1;
    const bytes=await fs.readFile(path.join(baselineOutput,'input-'+index+'.json'));
    assert.equal(sha(bytes),record.sha256);inputs.push({...record,transport:'FROZEN_CURRENT_BFF_JSON'});
    return JSON.parse(bytes.toString());
  }
  const response=await fetch('http://127.0.0.1:60065'+route,{signal:AbortSignal.timeout(15000)});
  assert.equal(response.status,200,route);const bytes=Buffer.from(await response.arrayBuffer());
  const value=JSON.parse(bytes.toString());
  inputs.push({route,transport:'CURRENT_LOCAL_BFF_JSON',bytes:bytes.length,sha256:sha(bytes)});
  await fs.writeFile(path.join(output,'input-'+inputs.length+'.json'),bytes,{flag:'wx'});
  return value;
};
const reportBytes=await fs.readFile(task+'/tmp/current-native-report-2026-10-01.json');
const raw=projectAdoptedSkyCatalog(JSON.parse(reportBytes.toString())).data;
const ref=raw.skyScene.catalog!;
const stars=(await json(`/v2/sky/catalogs/${ref.catalogVersion}/${ref.catalogHash}`)).data;
const figures=(await json('/v2/sky/constellations')).data;
const galaxy=await json('/v2/sky/galactic/manifest');
const landscape=await json('/v2/sky/landscape/manifest');
const publications=new Map<string,any>([['galactic',galaxy]]);
for(const body of ['moon','mars','mercury','jupiter','saturn','uranus','neptune'])
  publications.set(body,await json(`/v2/sky/${body}${body==='moon'?'/coverage':''}/manifest`));
const at=new Date(raw.context.at).toISOString();
const current=presentSkyTime(raw,at)!.report;
const moonRow=current.hourly.find(row=>row.at===at)!;assert(moonRow);
const moonBasis=createSkyViewBasis(moonRow.moonAzimuthDeg!,90+moonRow.moonAltitudeDeg!,0)!;
const north=createSkyViewBasis(0,135,0)!;
const cases:any[]=[
  {name:'north-entry',at,fov:45,basis:north},
  ...[45,60,85,123.30438593956445,5.362239485073433].map(fov=>({name:'moon-'+fov,at,fov,basis:moonBasis})),
  {name:'moon-return-45',at,fov:45,basis:moonBasis},
  {name:'moon-red',at,fov:45,basis:moonBasis,mode:'OBSERVATION'},
  {name:'dome',at,fov:274.9,basis:createSkyViewBasis(0,180,0)!},
  {name:'north-return',at,fov:45,basis:north},
];
for(const body of ['MARS','MERCURY','JUPITER','SATURN','URANUS','NEPTUNE']){
  const row=raw.hourly.find(row=>row.planets?.some(p=>p.body===body&&p.altitudeDeg>10));
  assert(row,'No saved supported observation for '+body);
  const planet=row.planets!.find(p=>p.body===body)!;
  cases.push({name:body.toLowerCase()+'-local',at:row.at,fov:.1,
    basis:createSkyViewBasis(planet.azimuthDeg,90+planet.altitudeDeg,0)!});
}
const prepared=cases.map(condition=>{
  const report=attachSkyCatalog(presentSkyTime(raw,condition.at)!.report,stars);
  const frame=resolveConstellationFrame(figures,report.skyScene,condition.at)!;assert(frame);
  const view={basis:condition.basis,verticalFovDeg:condition.fov};
  const wanted=constellationVisibility(condition.fov,true)>0?frame.images.filter(figure=>
    artworkIntersectsView(figure.registration,view,390,844)).map(figure=>figure.source):[];
  const mode=condition.mode??'DAY',bodies:string[]=[];
  const moon=skyMoonDiscAt(report.hourly,condition.at,condition.basis,390,844,condition.fov);
  const planets=skyPlanetDiscsAt(report.hourly,condition.at,condition.basis,390,844,condition.fov)??[];
  if(mode!=='OBSERVATION'){
    if(moon?.surfaceOrientation&&moon.radiusPx>=4)bodies.push('moon');
    for(const disc of planets)if(disc.surfaceOrientation&&
      (['MARS','MERCURY'].includes(disc.body)?disc.radiusPx>=4:Boolean(disc.oblate&&disc.oblate.majorRadiusPx>=4)))
      bodies.push(disc.body.toLowerCase());
  }
  return {...condition,report,frame,wanted,mode,bodies,
    moonRadiusPx:moon?.radiusPx??null,
    galaxy:mode!=='OBSERVATION'&&Boolean(skyGalacticBandAt(report,condition.at,condition.fov))};
});
const images=new Map<string,any>();
const localImage=async(id:string,asset:any,folder:string)=>{
  if(images.has(id))return;
  const file=path.join('workers/miniapp-api/assets',folder,asset.file);
  const bytes=await fs.readFile(file);assert.equal(sha(bytes),asset.sha256,file);assert.equal(bytes.length,asset.bytes,file);
  inputs.push({route:asset.downloadUrl??file,path:file,transport:'BOUND_LOCAL_PUBLICATION_BYTES',bytes:bytes.length,sha256:sha(bytes)});
  images.set(id,{id,...asset,data:`data:image/${file.endsWith('.png')?'png':'jpeg'};base64,${bytes.toString('base64')}`});
};
for(const asset of prepared.flatMap(row=>row.wanted))await localImage(asset.id,asset,'constellations');
for(const [body,publication] of publications)await localImage(body,publication.image,body==='galactic'?'deep-sky/galactic-2mass':body);
const masks=[];
for(const resource of landscape.resources){
  await localImage('landscape:'+resource.id,resource.image,'landscape');
  const file=path.join('workers/miniapp-api/assets/landscape',resource.alpha.file),bytes=await fs.readFile(file);
  assert.equal(sha(bytes),resource.alpha.sha256);assert.equal(bytes.length,resource.alpha.bytes);
  masks.push({resource,encoded:JSON.parse(bytes.toString())});
  inputs.push({path:file,transport:'BOUND_LOCAL_PUBLICATION_BYTES',bytes:bytes.length,sha256:sha(bytes)});
}
const compiled=await build({stdin:{resolveDir:process.cwd(),contents:
  "export {createSkyGpuRenderer} from './apps/wechat-miniapp/src/features/sky/sky-gpu-renderer';export {drawSkyScene} from './apps/wechat-miniapp/src/features/sky/sky-scene-render';export {selectSkyLandscapeResource,selectSkyLandscapeImageResources} from './apps/wechat-miniapp/src/features/sky/sky-landscape-resources';export {createSkyPanoramaMask} from './apps/wechat-miniapp/src/features/sky/sky-landscape-mask';export {decodeSkyLandscapeAlpha} from './packages/miniapp-contracts/src/sky-landscape-publication';"},
  bundle:true,write:false,metafile:true,platform:'browser',format:'iife',globalName:'bodyComposition',target:'es2022',
  tsconfig:path.resolve('apps/wechat-miniapp/tsconfig.json')});
const production=compiled.outputFiles[0]!.text;
const sourceHashes=await Promise.all(Object.keys(compiled.metafile!.inputs).filter(file=>file!=='<stdin>').map(async file=>
  ({path:file,sha256:sha(await fs.readFile(file))})));
await fs.writeFile(path.join(output,'production.js'),production,{flag:'wx'});
console.log(JSON.stringify({phase:'inputs-ready',conditions:prepared.length,localImages:images.size,sourceCount:sourceHashes.length}));
const {chromium}=createRequire(import.meta.url)('C:/Users/777/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader']});
try{
  const page=await browser.newPage({viewport:{width:390,height:844}}),errors:string[]=[];
  page.on('pageerror',(error:any)=>errors.push(String(error)));
  await page.setContent('<style>body{margin:0}canvas{display:block}</style><canvas width="390" height="844"></canvas>');
  await page.evaluate('globalThis.__name=target=>target');await page.addScriptTag({content:production});
  await page.evaluate(async(input:any)=>{
    const api=(globalThis as any).bodyComposition,decoded=new Map(),ids=new WeakMap();
    for(const asset of input.images){const image=new Image();image.src=asset.data;await image.decode();
      if(image.width!==asset.width||image.height!==asset.height)throw Error('decoded_dimensions_mismatch:'+asset.id);
      decoded.set(asset.id,image);ids.set(image,asset.id);}
    const masks=new Map(input.masks.map((row:any)=>[row.resource.id,api.createSkyPanoramaMask(input.landscape,row.resource,api.decodeSkyLandscapeAlpha(row.encoded,row.resource))]));
    (globalThis as any).bodyInput={api,decoded,ids,masks,landscape:input.landscape};
  },{images:[...images.values()],masks,landscape});
  const rows=[];
  for(const condition of prepared){
    const row=await page.evaluate((condition:any)=>{
      const input=(globalThis as any).bodyInput,canvas=document.querySelector('canvas')!,
        gl=canvas.getContext('webgl',{preserveDrawingBuffer:true,antialias:false})!;
      if(!gl)throw Error('no_webgl');
      const tex=gl.texImage2D.bind(gl),copy=gl.copyTexImage2D.bind(gl),remove=gl.deleteTexture.bind(gl),
        create=gl.createTexture.bind(gl),framebuffers=gl.createFramebuffer.bind(gl),retireFramebuffer=gl.deleteFramebuffer.bind(gl);
      const allocated=new Map(),textureIds=new Map(),liveTextures=new Set(),liveFramebuffers=new Set();
      let liveBytes=0,peakBytes=0,uploads:any[]=[];
      gl.createTexture=()=>{const texture=create();if(texture)liveTextures.add(texture);return texture;};
      gl.deleteTexture=texture=>{liveTextures.delete(texture);liveBytes-=allocated.get(texture)??0;allocated.delete(texture);remove(texture);};
      gl.createFramebuffer=()=>{const framebuffer=framebuffers();if(framebuffer)liveFramebuffers.add(framebuffer);return framebuffer;};
      gl.deleteFramebuffer=framebuffer=>{liveFramebuffers.delete(framebuffer);retireFramebuffer(framebuffer);};
      (gl as any).texImage2D=(...args:any[])=>{
        const texture=gl.getParameter(gl.TEXTURE_BINDING_2D),source=args.at(-1),id=input.ids.get(source)??'static';
        const bytes=args.length===9?Number(args[3])*Number(args[4])*4:Number(source?.width)*Number(source?.height)*4;
        textureIds.set(texture,id);liveBytes+=bytes-(allocated.get(texture)??0);allocated.set(texture,bytes);
        peakBytes=Math.max(peakBytes,liveBytes);uploads.push({id,bytes,operation:'source-upload'});return (tex as any)(...args);
      };
      (gl as any).copyTexImage2D=(...args:any[])=>{
        const source=gl.getFramebufferAttachmentParameter(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.FRAMEBUFFER_ATTACHMENT_OBJECT_NAME),
          texture=gl.getParameter(gl.TEXTURE_BINDING_2D),bytes=Number(args[5])*Number(args[6])*4;
        const id=(textureIds.get(source)??'unknown')+':window';textureIds.set(texture,id);
        liveBytes+=bytes-(allocated.get(texture)??0);allocated.set(texture,bytes);peakBytes=Math.max(peakBytes,liveBytes);
        uploads.push({id,bytes,operation:'gpu-copy'});return (copy as any)(...args);
      };
      const failures:string[]=[],renderer=input.api.createSkyGpuRenderer(gl,1,{imageFailed:(image:object)=>failures.push(input.ids.get(image))});
      const atlas=new Map(condition.wanted.map((asset:any)=>[asset.id,input.decoded.get(asset.id)]));
      const galaxy=condition.galaxy?input.decoded.get('galactic'):null;
      const celestial=[...atlas.values(),...(galaxy?[galaxy]:[]),...condition.bodies.map((body:string)=>input.decoded.get(body))];
      const resource=input.api.selectSkyLandscapeResource(input.landscape,celestial,false);
      const wantedLandscape=input.api.selectSkyLandscapeImageResources(input.landscape.resources.filter((row:any)=>row.id==='overview'||row.id===resource.id),input.masks,
        {view:{basis:condition.basis,verticalFovDeg:condition.fov},width:390,height:844});
      const panorama=wantedLandscape.some((row:any)=>row.id===resource.id)?{image:input.decoded.get('landscape:'+resource.id),mask:input.masks.get(resource.id)}:null;
      const wantedIds=[...condition.wanted.map((asset:any)=>asset.id),...(galaxy?['galactic']:[]),...condition.bodies,...wantedLandscape.map((row:any)=>'landscape:'+row.id)];
      const sourceBytes=Object.fromEntries(wantedIds.map(id=>{const image=input.decoded.get(id);return [id,image.width*image.height*4];}));
      const args:any[]=Array(36).fill(undefined);let snapshot:any;
      Object.assign(args,{0:renderer,1:condition.report,2:condition.at,3:null,4:null,5:390,6:844,7:condition.mode,
        8:(value:any)=>{snapshot=value;},10:condition.fov,12:condition.basis,
        15:{frame:condition.frame,images:atlas,enabled:true,failed:()=>failures.push('art')},26:galaxy,
        34:{enabled:true,panorama,mask:input.masks.get(resource.id)},35:{horizontal:true,equatorial:false}});
      for(const [body,index] of Object.entries({moon:24,mars:25,mercury:27,jupiter:28,saturn:29,uranus:32,neptune:33}))
        args[index]=condition.bodies.includes(body)?input.decoded.get(body):null;
      const passes=[];
      for(let pass=0;pass<3;pass++){
        uploads=[];peakBytes=liveBytes;input.api.drawSkyScene(...args);gl.finish();
        passes.push({pass,uploads:[...uploads],liveBytes,peakBytes,
          retained:[...allocated].map(([texture,bytes])=>({id:textureIds.get(texture),bytes}))});
      }
      const capture=canvas.toDataURL('image/png'),pixels=new Uint8Array(390*844*4);
      gl.readPixels(0,0,390,844,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
      let binary='';for(let i=0;i<pixels.length;i+=32768)binary+=String.fromCharCode(...pixels.subarray(i,i+32768));
      const result={passes,sourceBytes,sourceRgbaBytes:Object.values(sourceBytes).reduce((sum:number,n:any)=>sum+n,0),
        frameAt:snapshot.frameAt,references:snapshot.objects.map((object:any)=>object.reference),
        landscape:resource.id,paintedLandscape:Boolean(panorama),glError:gl.getError(),failures,
        rgba:btoa(binary),capture};
      renderer.dispose();Object.assign(gl,{texImage2D:tex,copyTexImage2D:copy,deleteTexture:remove,createTexture:create,
        createFramebuffer:framebuffers,deleteFramebuffer:retireFramebuffer});
      return {...result,retiredLogicalBytes:liveBytes,retiredTextures:liveTextures.size,retiredFramebuffers:liveFramebuffers.size};
    },condition);
    const {capture,rgba,...metadata}=row;
    await fs.writeFile(path.join(output,condition.name+'.png'),Buffer.from(capture.split(',')[1],'base64'),{flag:'wx'});
    const rgbaBytes=Buffer.from(rgba,'base64');await fs.writeFile(path.join(output,condition.name+'.rgba'),rgbaBytes,{flag:'wx'});
    assert.equal(row.glError,0,condition.name);assert.deepEqual(row.failures,[],condition.name);
    assert.equal(row.retiredLogicalBytes,0);assert.equal(row.retiredTextures,0);assert.equal(row.retiredFramebuffers,0);
    const result={name:condition.name,at:condition.at,fov:condition.fov,basis:condition.basis,bodies:condition.bodies,
      moonRadiusPx:condition.moonRadiusPx,figureCount:condition.wanted.length,galaxy:condition.galaxy,rgbaSha256:sha(rgbaBytes),...metadata};
    if(compare){
      const prior=JSON.parse(await fs.readFile(path.join(baselineOutput,'result.json'),'utf8'));
      const before=prior.rows.find((row:any)=>row.name===result.name);assert(before);
      const previous=await fs.readFile(path.join(baselineOutput,result.name+'.rgba'));
      assert.equal(sha(previous),before.rgbaSha256);assert.equal(previous.length,rgbaBytes.length);
      let changedPixels=0,maxDelta=0;
      for(let i=0;i<previous.length;i+=4){let changed=false;for(let channel=0;channel<4;channel++){
        const delta=Math.abs(previous[i+channel]!-rgbaBytes[i+channel]!);changed ||= delta>0;maxDelta=Math.max(maxDelta,delta);
      }if(changed)changedPixels++;}
      Object.assign(result,{pixelComparison:{changedPixels,maxDelta,strictStatus:changedPixels===0?'EXACT':'DIFFERENT'},
        beforeWarmSourceUploads:before.passes[2].uploads.filter((row:any)=>row.operation==='source-upload').reduce((sum:number,row:any)=>sum+row.bytes,0)});
      assert.deepEqual(row.references,before.references);assert.equal(row.frameAt,before.frameAt);
      assert.deepEqual(row.sourceBytes,before.sourceBytes,'GPU cropping must not narrow image demand or change source quality');
    }
    rows.push(result);console.log(JSON.stringify({name:result.name,bodies:result.bodies,figures:result.figureCount,
      decodedRgbaModel:row.sourceRgbaBytes,firstPeak:row.passes[0].peakBytes,
      warmSourceUploads:row.passes[2].uploads.filter((row:any)=>row.operation==='source-upload').reduce((sum:number,row:any)=>sum+row.bytes,0),
      warmRetained:row.passes[2].liveBytes,...(compare?{pixels:result.pixelComparison}:{})}));
  }
  assert.deepEqual(errors,[]);
  assert.equal(rows.find(row=>row.name==='moon-45').rgbaSha256,rows.find(row=>row.name==='moon-return-45').rgbaSha256);
  assert.equal(rows.find(row=>row.name==='north-entry').rgbaSha256,rows.find(row=>row.name==='north-return').rgbaSha256);
  if(compare)assert.equal(rows.find(row=>row.name==='moon-45').passes[2].uploads.filter((row:any)=>row.operation==='source-upload').reduce((sum:number,row:any)=>sum+row.bytes,0),0,
    'Moon, Galaxy, figures and landscape must coexist without repeated warm source uploads');
  await fs.writeFile(path.join(output,'result.json'),JSON.stringify({scope:'Real current production scene with bound original published images, saved report and actual logical WebGL transfer/copy/retirement at whole-scene Moon browsing and each supported fixed body. All images are predecoded by the software harness; source RGBA is a model, not native/driver/OS allocation, network concurrency, full journey, SAO/W3/optical/deep-image performance or target acceptance.',
    report:{path:task+'/tmp/current-native-report-2026-10-01.json',sha256:sha(reportBytes)},productionBundleSha256:sha(production),sourceHashes,inputs,rows,errors},null,2)+'\n',{flag:'wx'});
}finally{await browser.close();}
