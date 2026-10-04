// Reuse published local bytes and the saved current report. Actual production
// Canvas owners, logical WebGL allocations; no native-memory/device claim.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
import {projectAdoptedSkyCatalog} from '../../../../apps/wechat-miniapp/src/services/sky-report-catalog.ts';
import {attachSkyCatalog,resolveSkyDeepSkyScene} from '../../../../apps/wechat-miniapp/src/features/sky/sky-stellar-scene.ts';
import {presentSkyTime} from '../../../../apps/wechat-miniapp/src/features/sky/sky-time-presentation.ts';
import {resolveConstellationFrame} from '../../../../apps/wechat-miniapp/src/features/sky/sky-constellation-scene.ts';
import {createSkyViewBasis} from '../../../../apps/wechat-miniapp/src/features/sky/sky-view-projection.ts';
import {artworkIntersectsView} from '../../../../apps/wechat-miniapp/src/features/sky/sky-artwork-visibility.ts';
import {constellationVisibility} from '../../../../apps/wechat-miniapp/src/features/sky/sky-constellation-visibility.ts';
import {skyMoonDiscAt} from '../../../../apps/wechat-miniapp/src/features/sky/sky-moon-disc.ts';
import {skyPlanetDiscsAt} from '../../../../apps/wechat-miniapp/src/features/sky/sky-planet-disc.ts';
import {skyGalacticBandAt} from '../../../../apps/wechat-miniapp/src/features/sky/sky-galactic-band.ts';
import {selectSkyHipsTiles} from '../../../../apps/wechat-miniapp/src/features/sky/sky-hips-tile-selection.ts';
import {exactSkyObservationFrame} from '../../../../apps/wechat-miniapp/src/features/sky/sky-observation-frame.ts';
import {projectSkyHipsTileMesh,prepareSkyHipsTile,skyHipsTileIntersectsView} from '../../../../apps/wechat-miniapp/src/features/sky/sky-hips-tile-mesh.ts';
import {resolveSkySceneFrame} from '../../../../apps/wechat-miniapp/src/features/sky/sky-stellar-scene.ts';
import {skyLandscapeViewOpacity} from '../../../../apps/wechat-miniapp/src/features/sky/sky-landscape-visibility.ts';
import {skyStarAppearance} from '../../../../apps/wechat-miniapp/src/features/sky/sky-star-appearance.ts';
import {skySolarLightAt} from '../../../../apps/wechat-miniapp/src/features/sky/sky-solar-light.ts';

const task='.codex/work-items/cloud-sky-native-2026-09-22';
const compare=false;
const nativeMatch=false;
const metadataOutput=path.resolve('output/playwright/cloud-sky-wide-resource-composition-1002');
const baselineOutput=metadataOutput+(nativeMatch?'-native-match':'');
let output=path.resolve('output/playwright/cloud-sky-full-sphere-1002');
for(let suffix=1;;suffix++){try{await fs.access(output);output=path.resolve('output/playwright/cloud-sky-full-sphere-1002-'+suffix);}catch(error){if(error.code==='ENOENT')break;throw error;}}
await assert.rejects(fs.access(output),{code:'ENOENT'});
await fs.mkdir(output,{recursive:true});
const sha=(bytes:Uint8Array|string)=>createHash('sha256').update(bytes).digest('hex');
const inputs:any[]=[];
const prior=JSON.parse(await fs.readFile(path.join(metadataOutput,'result.json'),'utf8'));
const json=async(route:string)=>{
  const record=prior.inputs.find((row:any)=>row.route===route);assert(record&&record.transport==='CURRENT_LOCAL_BFF_JSON');
  const index=prior.inputs.indexOf(record)+1,file=path.join(metadataOutput,'input-'+index+'.json');
  const bytes=await fs.readFile(file);assert.equal(sha(bytes),record.sha256);
  inputs.push({...record,path:file,transport:'FROZEN_CURRENT_BFF_JSON'});return JSON.parse(bytes.toString());
};
const reportBytes=await fs.readFile(task+'/tmp/current-native-report-2026-10-01.json');
assert.equal(sha(reportBytes),prior.report.sha256);
const raw=projectAdoptedSkyCatalog(JSON.parse(reportBytes.toString())).data;
const ref=raw.skyScene.catalog!;
const stars=(await json(`/v2/sky/catalogs/${ref.catalogVersion}/${ref.catalogHash}`)).data;
const figures=(await json('/v2/sky/constellations')).data;
const galaxy=await json('/v2/sky/galactic/manifest');
const landscape=await json('/v2/sky/landscape/manifest');
const w3=await json('/v2/sky/wide-field/manifest');
const publications=new Map<string,any>([['galactic',galaxy]]);
for(const body of ['moon','mars','mercury','jupiter','saturn','uranus','neptune'])
  publications.set(body,await json(`/v2/sky/${body}${body==='moon'?'/coverage':''}/manifest`));
const at=new Date(raw.context.at).toISOString();
const current=presentSkyTime(raw,at)!.report;
const moonRow=current.hourly.find(row=>row.at===at)!;assert(moonRow);
const moonBasis=createSkyViewBasis(moonRow.moonAzimuthDeg!,90+moonRow.moonAltitudeDeg!,0)!;
const north=createSkyViewBasis(0,135,0)!;
const sdss=JSON.parse(await fs.readFile('workers/miniapp-api/assets/deep-sky/sdss-m51/manifest.json','utf8'));
const currentWithStars=attachSkyCatalog(current,stars),currentStarFrame=resolveSkySceneFrame(currentWithStars.skyScene,at)!;
const lowerStars=currentStarFrame.points!.map(point=>({point,entry:currentWithStars.skyScene.catalog!.entries[point[0]]})).filter(row=>
  row.point[2]<-1&&row.point[2]>-12&&row.entry.magnitude<3).sort((a,b)=>a.entry.magnitude-b.entry.magnitude);
const lowerStar=lowerStars.find(row=>(skyStarAppearance(row.entry.magnitude,5,skySolarLightAt(current.hourly,at)!.altitudeDeg,row.point[2])?.opacity??0)>=.1);
assert(lowerStar,'saved genuine lower star required');
const heading=lowerStars[0].point[1];
const cases:any[]=[];
for(const mode of ['DAY','OBSERVATION'])for(const [index,altitude]of [30,0,-5,-15,-45,0,30].entries())
  cases.push({name:'path-'+mode.toLowerCase()+'-'+index+'-alt'+altitude,at,fov:45,basis:createSkyViewBasis(heading,90+altitude,0)!,mode});
cases.push({name:'offset-rolled-lower',at,fov:85,basis:createSkyViewBasis(heading,60,27)!,center:{x:145,y:477}});
cases.push({name:'wide-lower-w3',at,fov:139,basis:createSkyViewBasis(heading,45,0)!,w3:true});
cases.push({name:'wide-lower-w3-no-mesh',at,fov:139,basis:createSkyViewBasis(heading,45,0)!,w3:true,noMesh:true});
for(const noFigures of [false,true])cases.push({name:'lower-constellation'+(noFigures?'-no-images':''),at,fov:45,
  basis:createSkyViewBasis(heading,45,0)!,ground:false,noFigures});
cases.push({name:'dome-full',at,fov:274.9,basis:createSkyViewBasis(0,180,0)!,w3:true});
cases.push({name:'dome-full-red',at,fov:274.9,basis:createSkyViewBasis(0,180,0)!,mode:'OBSERVATION'});
const starCondition={at,fov:5,basis:createSkyViewBasis(lowerStar.point[1],90+lowerStar.point[2],0)!,targetReference:lowerStar.entry.objectRef};
for(const [name,extra]of [['lower-star-auto',{}],['lower-star-without-points',{noStars:true}],
  ['lower-star-force-opaque',{groundOpacity:1}],['lower-star-force-partial',{groundOpacity:.5}],['lower-star-force-zero',{groundOpacity:0}]])
  cases.push({name,...starCondition,...extra});
for(const body of ['MOON','SUN','SATURN']){
  const row=raw.hourly.find(row=>body==='MOON'?row.moonAltitudeDeg!<-15:body==='SUN'?row.sunAltitudeDeg!<-15:
    row.planets?.some(p=>p.body===body&&p.altitudeDeg<-15));assert(row,'saved real lower '+body);
  const object=body==='MOON'?{azimuth:row.moonAzimuthDeg,altitude:row.moonAltitudeDeg}:body==='SUN'?{azimuth:row.sunAzimuthDeg,altitude:row.sunAltitudeDeg}:
    {azimuth:row.planets!.find(p=>p.body===body)!.azimuthDeg,altitude:row.planets!.find(p=>p.body===body)!.altitudeDeg};
  for(const variant of ['current','legacy','suppressed'])cases.push({name:body.toLowerCase()+'-lower'+(variant==='legacy'?'-legacy-gpu':variant==='suppressed'?'-suppressed':''),at:row.at,
    fov:body==='SATURN'?.05:2.4,basis:createSkyViewBasis(object.azimuth!,90+object.altitude!,0)!,
    altitude:object.altitude,targetReference:body==='MOON'?'SOLAR:MOON':body==='SUN'?'SOLAR:SUN':'PLANET:SATURN',legacyGpu:variant==='legacy',suppressBody:variant==='suppressed'?body:null,ground:false});
}
let lowerOptical:any;
for(const row of raw.hourly){const report=attachSkyCatalog(presentSkyTime(raw,row.at)!.report,stars),deep=resolveSkyDeepSkyScene(report.skyScene,row.at)!;
  const index=deep.catalog.entries.findIndex(entry=>entry.objectRef==='M:51'),point=deep.frame.points!.find(point=>point[0]===index);
  if(point&&point[2]<-15){lowerOptical={at:row.at,basis:createSkyViewBasis(point[1],90+point[2],0)!,altitude:point[2],targetReference:'M:51'};break;}}
assert(lowerOptical);
for(const variant of ['current','legacy','suppressed'])cases.push({name:'m51-lower-optical'+(variant==='legacy'?'-legacy-gpu':variant==='suppressed'?'-suppressed':''),...lowerOptical,
  fov:.08,optical:'DETAIL',coarser:true,legacyGpu:variant==='legacy',suppressOptical:variant==='suppressed',ground:false});
const observer=exactSkyObservationFrame(currentWithStars,at)!;assert(observer);
const eqBasis=createSkyViewBasis(22,45,0)!,rotate=(ray:readonly number[])=>[0,1,2].map(row=>observer.equatorialToEnu[row*3]*ray[0]+observer.equatorialToEnu[row*3+1]*ray[1]+observer.equatorialToEnu[row*3+2]*ray[2]);
const antipodeBasis={right:rotate(eqBasis.right),up:rotate(eqBasis.up),forward:rotate(eqBasis.forward)};
cases.push({name:'hips-antipode-all',at,fov:45,basis:antipodeBasis,w3:true,allW3:true,ground:false,forceW3:true});
cases.push({name:'hips-antipode-only-facing',at,fov:45,basis:antipodeBasis,w3:true,onlyVisibleW3:true,ground:false,forceW3:true});
cases.push({name:'hips-antipode-only-opposite',at,fov:45,basis:antipodeBasis,w3:true,onlyW3:[2],ground:false,forceW3:true});
const prepared=cases.map(condition=>{
  const report=attachSkyCatalog(presentSkyTime(raw,condition.at)!.report,stars);
  const frame=resolveConstellationFrame(figures,report.skyScene,condition.at)!;assert(frame);
  const width=condition.width??390,height=condition.height??844;
  const view={basis:condition.basis,verticalFovDeg:condition.fov,center:condition.center};
  const wanted=constellationVisibility(condition.fov,true)>0?frame.images.filter(figure=>
    artworkIntersectsView(figure.registration,view,width,height)).map(figure=>figure.source):[];
  const mode=condition.mode??'DAY',bodies:string[]=[];
  const moon=skyMoonDiscAt(report.hourly,condition.at,condition.basis,width,height,condition.fov,condition.center);
  const planets=skyPlanetDiscsAt(report.hourly,condition.at,condition.basis,width,height,condition.fov,condition.center)??[];
  if(mode!=='OBSERVATION'){
    if(moon?.surfaceOrientation&&moon.radiusPx>=4)bodies.push('moon');
    for(const disc of planets)if(disc.surfaceOrientation&&
      (['MARS','MERCURY'].includes(disc.body)?disc.radiusPx>=4:Boolean(disc.oblate&&disc.oblate.majorRadiusPx>=4)))
      bodies.push(disc.body.toLowerCase());
  }
  const solar=skySolarLightAt(report.hourly,condition.at),observation=exactSkyObservationFrame(report,condition.at);
  const w3Active=condition.forceW3||(condition.w3&&mode!=='OBSERVATION'&&condition.fov>=60&&solar&&solar.altitudeDeg<=-12);
  const selection=w3Active&&observation?selectSkyHipsTiles({frame:observation,view,width,height,maxOrder:0,minOrder:0}):null;
  const candidatePixels=selection?.state==='SELECTED'?selection.pixels:[];
  const w3Pixels=condition.onlyW3??(condition.allW3?Array.from({length:12},(_,pixel)=>pixel):(condition.onlyVisibleW3?Array.from({length:12},(_,pixel)=>pixel):candidatePixels).filter(pixel=>
    skyHipsTileIntersectsView(0,pixel,observation!.equatorialToEnu,view,width,height)));
  const submittedPixels=w3Pixels.filter(pixel=>Boolean(projectSkyHipsTileMesh(prepareSkyHipsTile(0,pixel,16)!,observation!.equatorialToEnu,view,width,height)?.length));
  return {...condition,width,height,report,frame,wanted,mode,bodies,w3Pixels,submittedPixels,
    moonRadiusPx:moon?.radiusPx??null,
    galaxy:mode!=='OBSERVATION'&&!w3Active&&Boolean(skyGalacticBandAt(report,condition.at,condition.fov))};
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
for(const tile of w3.tiles)await localImage('w3:'+tile.pixel,{...tile,width:512,height:512},'deep-sky/wide-field-w3');
for(const level of ['OVERVIEW','DETAIL'])await localImage('optical:'+level,{...sdss.levels[level],width:512,height:512},'deep-sky/sdss-m51');
const masks=[];
for(const resource of landscape.resources){
  await localImage('landscape:'+resource.id,resource.image,'landscape');
  const file=path.join('workers/miniapp-api/assets/landscape',resource.alpha.file),bytes=await fs.readFile(file);
  assert.equal(sha(bytes),resource.alpha.sha256);assert.equal(bytes.length,resource.alpha.bytes);
  masks.push({resource,encoded:JSON.parse(bytes.toString())});
  inputs.push({path:file,transport:'BOUND_LOCAL_PUBLICATION_BYTES',bytes:bytes.length,sha256:sha(bytes)});
}
  const compiled=await build({stdin:{resolveDir:process.cwd(),contents:
  "export {createSkyGpuRenderer} from './apps/wechat-miniapp/src/features/sky/sky-gpu-renderer';export {drawSkyScene} from './apps/wechat-miniapp/src/features/sky/sky-scene-render';export {selectSkyLandscapeResource,selectSkyLandscapeImageResources} from './apps/wechat-miniapp/src/features/sky/sky-landscape-resources';export {createSkyPanoramaMask} from './apps/wechat-miniapp/src/features/sky/sky-landscape-mask';export {decodeSkyLandscapeAlpha} from './packages/miniapp-contracts/src/sky-landscape-publication';export {pickPaintedSkyObjects} from './apps/wechat-miniapp/src/features/sky/sky-object-picking';export {unprojectSkyPoint} from './apps/wechat-miniapp/src/features/sky/sky-view-projection';export {skyLandscapeViewOpacity} from './apps/wechat-miniapp/src/features/sky/sky-landscape-visibility';"},
  bundle:true,write:false,metafile:true,platform:'browser',format:'iife',globalName:'bodyComposition',target:'es2022',
  tsconfig:path.resolve('apps/wechat-miniapp/tsconfig.json')});
const production=nativeMatch&&!compare?await fs.readFile(path.join(metadataOutput,'production.js'),'utf8'):compiled.outputFiles[0]!.text;
const sourceHashes=nativeMatch&&!compare?JSON.parse(await fs.readFile(path.join(metadataOutput,'result.json'),'utf8')).sourceHashes:
  await Promise.all(Object.keys(compiled.metafile!.inputs).filter(file=>file!=='<stdin>').map(async file=>
  ({path:file,sha256:sha(await fs.readFile(file))})));
const reusedOutput=process.argv.find(value=>value.startsWith('--reuse-bound='))?.slice('--reuse-bound='.length);
const reusedRows=reusedOutput?JSON.parse(await fs.readFile(path.join(reusedOutput,'rows-partial.json'),'utf8')):null;
if(reusedOutput)assert.equal(sha(await fs.readFile(path.join(reusedOutput,'production.js'))),sha(production),'reuse only the same production bundle');
await fs.writeFile(path.join(output,'production.js'),production,{flag:'wx'});
console.log(JSON.stringify({phase:'inputs-ready',conditions:prepared.length,localImages:images.size,sourceCount:sourceHashes.length}));
const {chromium}=createRequire(import.meta.url)('C:/Users/777/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader']});
try{
  const page=await browser.newPage({viewport:{width:390,height:844}}),errors:string[]=[];
  page.on('pageerror',(error:any)=>errors.push(String(error)));
  await page.setContent('<style>body{margin:0}canvas{display:block}</style><canvas width="390" height="844"></canvas>');
  await page.evaluate('globalThis.__name=target=>target');
  const legacyProduction=await fs.readFile(path.join(metadataOutput,'production.js'),'utf8');
  assert.equal(sha(legacyProduction),prior.productionBundleSha256);
  await page.addScriptTag({content:legacyProduction.replace('var bodyComposition','var legacyComposition')});
  await page.addScriptTag({content:production});
  await page.evaluate(async(input:any)=>{
    const api=(globalThis as any).bodyComposition,decoded=new Map(),ids=new WeakMap();
    for(const asset of input.images){const image=new Image();image.src=asset.data;await image.decode();
      if(image.width!==asset.width||image.height!==asset.height)throw Error('decoded_dimensions_mismatch:'+asset.id);
      decoded.set(asset.id,image);ids.set(image,asset.id);}
    const masks=new Map(input.masks.map((row:any)=>[row.resource.id,api.createSkyPanoramaMask(input.landscape,row.resource,api.decodeSkyLandscapeAlpha(row.encoded,row.resource))]));
    (globalThis as any).bodyInput={api,decoded,ids,masks,landscape:input.landscape,sdss:input.sdss};
  },{images:[...images.values()],masks,landscape,sdss});
  const rows=[];
  for(const condition of prepared){
    if(reusedRows&&!condition.name.startsWith('lower-star-')){
      const previous=reusedRows.find((row:any)=>row.name===condition.name);assert(previous);
      for(const [key,value] of Object.entries({at:condition.at,fov:condition.fov,basis:condition.basis,center:condition.center??null,
        width:condition.width,height:condition.height,bodies:condition.bodies,w3Pixels:condition.w3Pixels,submittedPixels:condition.submittedPixels,
        figureCount:condition.wanted.length,optical:condition.optical??null,legacyGpu:condition.legacyGpu??false}))assert.deepEqual(previous[key],value,'unchanged capture '+condition.name+' '+key);
      const rgba=await fs.readFile(path.join(reusedOutput!,condition.name+'.rgba'));assert.equal(sha(rgba),previous.rgbaSha256);
      const capture=await fs.readFile(path.join(reusedOutput!,condition.name+'.png'));
      await fs.writeFile(path.join(output,condition.name+'.rgba'),rgba,{flag:'wx'});
      await fs.writeFile(path.join(output,condition.name+'.png'),capture,{flag:'wx'});
      rows.push({...previous,reusedBoundCapture:{output:reusedOutput,rgbaSha256:sha(rgba),captureSha256:sha(capture)}});
      console.log(JSON.stringify({name:condition.name,reusedBoundCapture:true}));continue;
    }
    const row=await page.evaluate((condition:any)=>{
      const input=(globalThis as any).bodyInput,canvas=document.querySelector('canvas')!,
        gl=canvas.getContext('webgl',{preserveDrawingBuffer:true,antialias:false})!;
      const width=condition.width,height=condition.height;
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
      const failures:string[]=[],renderer=(condition.legacyGpu?(globalThis as any).legacyComposition:input.api).createSkyGpuRenderer(gl,1,{imageFailed:(image:object)=>failures.push(input.ids.get(image))});
      const draws:any[]=[];
      for(const name of ['sun','moon','planet','saturnRings','artwork','skyImageMesh']){const original=renderer[name].bind(renderer);
        renderer[name]=(...values:any[])=>{const suppressed=(condition.suppressBody==='SUN'&&name==='sun')||(condition.suppressBody==='MOON'&&name==='moon')||
          (condition.suppressBody==='SATURN'&&(name==='planet'||name==='saturnRings')&&values[0]?.body==='SATURN')||
          (condition.suppressOptical&&name==='artwork'&&String(input.ids.get(values[0])).startsWith('optical:'))||
          (condition.noMesh&&name==='skyImageMesh')||(condition.noFigures&&name==='artwork'&&condition.wanted.some((asset:any)=>asset.id===input.ids.get(values[0])));
          const result=suppressed?true:original(...values);draws.push({name,suppressed,image:name==='artwork'||name==='skyImageMesh'?input.ids.get(values[0]):null,
          body:values[0]?.body??null,success:result,vertices:name==='skyImageMesh'?values[1].length/4:null});return result;};}
      if(condition.noStars){const original=renderer.disc.bind(renderer);renderer.disc=(...values:any[])=>{if(values[6]!=='star')original(...values);};}
      if(condition.groundOpacity!==undefined){const original=renderer.landscape.bind(renderer);renderer.landscape=(...values:any[])=>original(...values.slice(0,4),condition.groundOpacity);}
      const atlas=new Map(condition.wanted.map((asset:any)=>[asset.id,input.decoded.get(asset.id)]));
      const galaxy=condition.galaxy?input.decoded.get('galactic'):null;
      const hips=condition.w3Pixels.map((pixel:number)=>({layer:'WIDE_FIELD_W3',order:0,pixel,image:input.decoded.get('w3:'+pixel)}));
      const opticalIds=condition.optical?['optical:'+condition.optical,...(condition.coarser?['optical:OVERVIEW']:[])]:[];
      const optical=condition.optical?{reference:'M:51',publicationHash:input.sdss.publicationId,level:condition.optical,
        image:input.decoded.get('optical:'+condition.optical),fieldDegrees:input.sdss.levels[condition.optical].fieldDegrees,
        ...(condition.coarser?{coarser:{image:input.decoded.get('optical:OVERVIEW'),level:'OVERVIEW',fieldDegrees:input.sdss.levels.OVERVIEW.fieldDegrees}}:{})}:null;
      const celestial=[...atlas.values(),...(galaxy?[galaxy]:[]),...condition.bodies.map((body:string)=>input.decoded.get(body)),
        ...hips.map((tile:any)=>tile.image),...opticalIds.map((id:string)=>input.decoded.get(id))];
      const resource=input.api.selectSkyLandscapeResource(input.landscape,celestial,false);
      const wantedLandscape=input.api.selectSkyLandscapeImageResources(input.landscape.resources.filter((row:any)=>row.id==='overview'||row.id===resource.id),input.masks,
        {view:{basis:condition.basis,verticalFovDeg:condition.fov,center:condition.center},width,height});
      const panorama=wantedLandscape.some((row:any)=>row.id===resource.id)?{image:input.decoded.get('landscape:'+resource.id),mask:input.masks.get(resource.id)}:null;
      const wantedIds=[...condition.wanted.map((asset:any)=>asset.id),...(galaxy?['galactic']:[]),...condition.bodies,
        ...condition.w3Pixels.map((pixel:number)=>'w3:'+pixel),...opticalIds,...wantedLandscape.map((row:any)=>'landscape:'+row.id)];
      const sourceBytes=Object.fromEntries(wantedIds.map(id=>{const image=input.decoded.get(id);return [id,image.width*image.height*4];}));
      const args:any[]=Array(36).fill(undefined);let snapshot:any;
      Object.assign(args,{0:renderer,1:condition.report,2:condition.at,3:null,4:null,5:width,6:height,7:condition.mode,
        8:(value:any)=>{snapshot=value;},10:condition.fov,12:condition.basis,13:condition.center,
        15:{frame:condition.frame,images:atlas,enabled:true,failed:()=>failures.push('art')},21:hips,26:galaxy,30:optical,
        34:{enabled:condition.ground!==false,panorama,mask:input.masks.get(resource.id)},35:{horizontal:false,equatorial:false}});
      for(const [body,index] of Object.entries({moon:24,mars:25,mercury:27,jupiter:28,saturn:29,uranus:32,neptune:33}))
        args[index]=condition.bodies.includes(body)?input.decoded.get(body):null;
      const passes=[];
      for(let pass=0;pass<3;pass++){
        uploads=[];draws.length=0;peakBytes=liveBytes;const started=performance.now();input.api.drawSkyScene(...args);const cpuMs=performance.now()-started;gl.finish();const softwareCompletedMs=performance.now()-started;
        passes.push({pass,cpuMs,softwareCompletedMs,draws:[...draws],uploads:[...uploads],liveBytes,peakBytes,
          retained:[...allocated].map(([texture,bytes])=>({id:textureIds.get(texture),bytes}))});
      }
      const capture=canvas.toDataURL('image/png'),pixels=new Uint8Array(390*844*4);
      gl.readPixels(0,0,390,844,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
      let binary='';for(let i=0;i<pixels.length;i+=32768)binary+=String.fromCharCode(...pixels.subarray(i,i+32768));
      if(condition.groundOpacity!==undefined&&snapshot.view.landscape)snapshot={...snapshot,view:{...snapshot.view,landscape:{...snapshot.view.landscape,opacity:condition.groundOpacity}}};
      const lowerObjects=snapshot.objects.filter((object:any)=>input.api.unprojectSkyPoint(object.x,object.y,condition.basis,width,height,condition.fov,condition.center)?.[2]<0);
      const target=snapshot.objects.find((object:any)=>object.reference===condition.targetReference);
      const pick=target?input.api.pickPaintedSkyObjects(snapshot,{x:target.x,y:target.y,frameAt:snapshot.frameAt,catalogVersion:snapshot.catalogVersion,catalogHash:snapshot.catalogHash}).map((object:any)=>object.reference):[];
      const result={passes,draws:[...draws],lowerReferences:lowerObjects.map((object:any)=>object.reference),target:target??null,pick,
        effectiveGroundOpacity:condition.ground===false?null:condition.groundOpacity??input.api.skyLandscapeViewOpacity({basis:condition.basis,verticalFovDeg:condition.fov,center:condition.center},width,height),sourceBytes,sourceRgbaBytes:Object.values(sourceBytes).reduce((sum:number,n:any)=>sum+n,0),
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
    const result={name:condition.name,at:condition.at,fov:condition.fov,basis:condition.basis,center:condition.center??null,
      width:condition.width,height:condition.height,bodies:condition.bodies,
      w3Pixels:condition.w3Pixels,submittedPixels:condition.submittedPixels,optical:condition.optical??null,coarser:condition.coarser??false,
      moonRadiusPx:condition.moonRadiusPx,altitude:condition.altitude??null,legacyGpu:condition.legacyGpu??false,noStars:condition.noStars??false,groundOpacity:condition.groundOpacity??null,targetReference:condition.targetReference??null,figureCount:condition.wanted.length,galaxy:condition.galaxy,rgbaSha256:sha(rgbaBytes),...metadata};
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
      const omitted=before.w3Pixels.filter((pixel:number)=>!result.w3Pixels.includes(pixel));
      assert.deepEqual(Object.fromEntries(Object.entries(row.sourceBytes).filter(([id])=>!id.startsWith('landscape:'))),
        Object.fromEntries(Object.entries(before.sourceBytes).filter(([id])=>!id.startsWith('landscape:')&&
          !omitted.some((pixel:number)=>id==='w3:'+pixel))),'only certified empty W3 faces may leave celestial demand');
      if(!nativeMatch)assert.equal(row.landscape,before.landscape);
      assert.deepEqual(result.submittedPixels,before.submittedPixels,'all previously submitted W3 triangles remain');
    }
    rows.push(result);console.log(JSON.stringify({name:result.name,bodies:result.bodies,figures:result.figureCount,
      decodedRgbaModel:row.sourceRgbaBytes,firstPeak:row.passes[0].peakBytes,
      warmSourceUploads:row.passes[2].uploads.filter((row:any)=>row.operation==='source-upload').reduce((sum:number,row:any)=>sum+row.bytes,0),
      warmRetained:row.passes[2].liveBytes,...(compare?{pixels:result.pixelComparison}:{})}));
    await fs.writeFile(path.join(output,'rows-partial.json'),JSON.stringify(rows,null,2)+'\n');
  }
  assert.deepEqual(errors,[]);
  const comparisons=[];
  const comparePixels=async(left:string,right:string)=>{const a=await fs.readFile(path.join(output,left+'.rgba')),b=await fs.readFile(path.join(output,right+'.rgba'));assert.equal(a.length,b.length);
    let changedPixels=0,maxDelta=0;for(let index=0;index<a.length;index+=4){let changed=false;for(let channel=0;channel<4;channel++){const delta=Math.abs(a[index+channel]-b[index+channel]);maxDelta=Math.max(maxDelta,delta);changed ||=delta>0;}if(changed)changedPixels++;}
    const row={left,right,changedPixels,maxDelta};comparisons.push(row);return row;};
  for(const mode of ['day','observation']){assert.equal((await comparePixels('path-'+mode+'-0-alt30','path-'+mode+'-6-alt30')).changedPixels,0);
    assert.equal((await comparePixels('path-'+mode+'-1-alt0','path-'+mode+'-5-alt0')).changedPixels,0);}
  for(const name of ['moon','sun','saturn','m51'])assert((await comparePixels(name==='m51'?'m51-lower-optical':name+'-lower',name==='m51'?'m51-lower-optical-legacy-gpu':name+'-lower-legacy-gpu')).changedPixels>0,'real below-horizon pixels versus legacy GPU '+name);
  for(const name of ['moon','sun','saturn','m51'])assert((await comparePixels(name==='m51'?'m51-lower-optical':name+'-lower',name==='m51'?'m51-lower-optical-suppressed':name+'-lower-suppressed')).changedPixels>0,'actual resolved lower pixels '+name);
  assert((await comparePixels('lower-star-auto','lower-star-without-points')).changedPixels>0);
  assert((await comparePixels('wide-lower-w3','wide-lower-w3-no-mesh')).changedPixels>0);
  assert((await comparePixels('lower-constellation','lower-constellation-no-images')).changedPixels>0);
  for(const name of ['partial','zero'])assert((await comparePixels('lower-star-force-opaque','lower-star-force-'+name)).changedPixels>0);
  assert.equal((await comparePixels('hips-antipode-all','hips-antipode-only-facing')).changedPixels,0,'opposite faces cannot cover a valid face');
  assert((await comparePixels('hips-antipode-all','hips-antipode-only-opposite')).changedPixels>0,'valid facing source produces actual GPU pixels');
  const lower=rows.find(row=>row.name==='lower-star-auto');assert(lower.lowerReferences.includes(lowerStar.entry.objectRef));assert(lower.pick.includes(lowerStar.entry.objectRef));
  assert.equal(rows.find(row=>row.name==='lower-star-force-opaque').pick.includes(lowerStar.entry.objectRef),false);
  assert.equal(rows.find(row=>row.name==='lower-star-force-zero').pick.includes(lowerStar.entry.objectRef),true);
  for(const name of ['moon','sun','saturn','m51']){const row=rows.find(row=>row.name===(name==='m51'?'m51-lower-optical':name+'-lower'));assert(row.target&&row.pick.includes(row.targetReference),name+' lower identity pick');}
  assert(rows.find(row=>row.name==='saturn-lower').draws.some(row=>row.name==='saturnRings'&&row.success));
  assert.deepEqual(rows.find(row=>row.name==='hips-antipode-only-opposite').submittedPixels,[]);
  for(const record of sourceHashes)assert.equal(sha(await fs.readFile(record.path)),record.sha256,'production changed during harness '+record.path);
  console.log(JSON.stringify({phase:'verified',output,lowerStar:{reference:lowerStar.entry.objectRef,point:lowerStar.point,magnitude:lowerStar.entry.magnitude},comparisons}));
  await fs.writeFile(path.join(output,'result.json'),JSON.stringify({scope:'Current production complete software-GPU scenes with immutable local original image/publication bytes and frozen real report: full-sphere return paths, actual lower star/body/optical identities, fading/opaque/partial/zero ground controls, and real-frame HiPS antipode geometry. Legacy renderer and suppressed-star cases are explicit counterfactuals; forced opacity cases amend snapshot mask to the actual forced pass only inside this harness. Images are predecoded; source/GPU allocations and Chromium SwiftShader CPU/completion timings are logical development models, not native/driver/OS memory, network, physical gestures, real-device performance, complete journey or final quality acceptance.',
    comparisons,lowerStar:{reference:lowerStar.entry.objectRef,point:lowerStar.point,magnitude:lowerStar.entry.magnitude},legacyBundle:{path:path.join(metadataOutput,'production.js'),sha256:prior.productionBundleSha256},report:{path:task+'/tmp/current-native-report-2026-10-01.json',sha256:sha(reportBytes)},productionBundleSha256:sha(production),sourceHashes,inputs,rows,errors},null,2)+'\n',{flag:'wx'});
}finally{await browser.close();}
