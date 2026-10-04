// Real publication/client/loader/scene/picking path in one software GL owner.
// The controlled tile failure and promise pacing do not simulate native input.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
import {createSaoCatalogClient} from '../../../../apps/wechat-miniapp/src/services/sao-catalog-client.ts';
import {createSkyStellarTileLoader,type SkyStellarTileState} from '../../../../apps/wechat-miniapp/src/features/sky/sky-stellar-tile-loader.ts';
import {selectSkyStellarTiles} from '../../../../apps/wechat-miniapp/src/features/sky/sky-stellar-tile-selection.ts';
import {resolveSkyStellarSupplement,supplementGeometry} from '../../../../apps/wechat-miniapp/src/features/sky/sky-stellar-supplement-scene.ts';
import {drawSkyScene} from '../../../../apps/wechat-miniapp/src/features/sky/sky-scene-render.ts';
import {resolveConstellationFrame} from '../../../../apps/wechat-miniapp/src/features/sky/sky-constellation-scene.ts';
import {artworkIntersectsView} from '../../../../apps/wechat-miniapp/src/features/sky/sky-artwork-visibility.ts';
import {constellationVisibility} from '../../../../apps/wechat-miniapp/src/features/sky/sky-constellation-visibility.ts';
import {skySolarLightAt} from '../../../../apps/wechat-miniapp/src/features/sky/sky-solar-light.ts';
import {skyGalacticBandAt} from '../../../../apps/wechat-miniapp/src/features/sky/sky-galactic-band.ts';
import {matchingCelestialInformationResponse} from '../../../../apps/wechat-miniapp/src/services/celestial-information-response.ts';
import {matchingCelestialSearchResponse} from '../../../../apps/wechat-miniapp/src/services/celestial-search-response.ts';
import {matchingCelestialPositionResponse} from '../../../../apps/wechat-miniapp/src/services/celestial-position-response.ts';
const task='.codex/work-items/cloud-sky-native-2026-09-22';
const output=path.resolve('output/playwright/cloud-sky-sao-composition-0930-current');
await assert.rejects(fs.access(output),{code:'ENOENT'});await fs.mkdir(output,{recursive:true});
const sha=(bytes:Uint8Array|string)=>createHash('sha256').update(bytes).digest('hex');
const inputBytes=await fs.readFile(task+'/tmp/sao-current-inputs-0930.json');
const input=JSON.parse(inputBytes.toString()),report=input.report,at=report.context.at,reads:any[]=[];
const catalogVersion=report.skyScene.catalog.catalogVersion;
const clientSource=await fs.readFile('apps/wechat-miniapp/src/services/api-client.ts','utf8');
assert.equal(/const ADOPTED_SKY_REPORT_CATALOG_VERSION = "([^"]+)"/u.exec(clientSource)?.[1],catalogVersion);
async function get(route:string,signal?:AbortSignal){
  const response=await fetch('http://127.0.0.1:60065'+route,{signal:signal??AbortSignal.timeout(15000)});
  const bytes=Buffer.from(await response.arrayBuffer());assert.equal(response.status,200,route);
  reads.push({route,bytes:bytes.length,sha256:sha(bytes),headers:Object.fromEntries(response.headers.entries())});return bytes;
}
const json=async(route:string,signal?:AbortSignal)=>JSON.parse((await get(route,signal)).toString());
const client=createSaoCatalogClient({index:signal=>json('/v2/sky/supplements/sao/v2',signal),
  tile:(hash,id,signal)=>json(`/v2/sky/supplements/sao/v2/${hash}/tiles/${id}`,signal),
  invalidateIndex(){assert.fail('valid current index');},invalidateTile(){assert.fail('valid current tile');}});
const publication=(await client.getIndex()).data;assert.equal(publication.publicationHash,input.index.data.publicationHash);
const geometry=supplementGeometry(publication,report.skyScene,at)!;
const wanted=(fov:number)=>selectSkyStellarTiles(publication.index.tiles,{basis:input.basis,width:390,height:844,
  verticalFovDeg:fov,frame:geometry,sunAltitudeDeg:skySolarLightAt(report.hourly,at)?.altitudeDeg,
  expected:{catalog:report.skyScene.publication,at,observer:report.skyScene.observer}});
const priorTiles=new Map(input.tiles.map((tile:any)=>[tile.tile.tileId,tile]));
function pointCount(id:string){
  const frame=resolveSkyStellarSupplement(publication,[priorTiles.get(id) as any],report.skyScene,at);
  let snapshot:any;const surface=new Proxy({},{get:()=>()=>true});
  const args:any[]=[surface,report,at,null,null,390,844,'DAY',(value:any)=>snapshot=value,undefined,45,null,input.basis];
  args[16]=frame;drawSkyScene(...args as Parameters<typeof drawSkyScene>);
  return snapshot.objects.filter((object:any)=>object.reference.startsWith('SAO:')).length;
}
const commonWanted=new Set(wanted(84.63316191100171).map(tile=>tile.id));
const failedId=wanted(45).filter(tile=>!commonWanted.has(tile.id)).sort((a,b)=>pointCount(b.id)-pointCount(a.id))[0]!.id;
assert(pointCount(failedId)>0,'the controlled failure must remove actual visible stars');
const tick=()=>new Promise<void>(resolve=>setImmediate(resolve));
let state:SkyStellarTileState={tiles:[],loading:false,failed:false},failOnce=true;
const requests:Array<{id:string;signal:AbortSignal;settled:boolean;finish():Promise<void>}>=[],stages:any[]=[];
const loader=createSkyStellarTileLoader({publication,changed:value=>state=value,
  load:(id,signal)=>new Promise((resolve,reject)=>{
    const request={id,signal,settled:false,async finish(){
      assert.equal(request.settled,false);request.settled=true;
      if(id===failedId&&failOnce){failOnce=false;reject(Error('controlled_sao_transport_failure'));}
      else{try{resolve(await client.getTile(publication,id,signal));}catch(error){reject(error);}}
      await tick();
    }};requests.push(request);
  })});
function take(name:string,fov:number){stages.push({name,fov,tiles:[...state.tiles],loading:state.loading,failed:state.failed,
  wanted:wanted(fov).map(tile=>tile.id),wantedBytes:wanted(fov).reduce((sum,tile)=>sum+tile.bytes,0)});}
async function finish(count=Infinity){
  for(let n=0;n<count&&state.loading;n++){
    const request=requests.find(request=>!request.settled&&!request.signal.aborted);assert(request,'loading must own a request');
    await request.finish();
  }
}
loader.update(wanted(84.63316191100171).map(tile=>tile.id));await tick();take('common-cold',84.63316191100171);
await finish();take('common-ready',84.63316191100171);
loader.update(wanted(45).map(tile=>tile.id));await tick();take('45-retained',45);
await finish(7);take('45-partial',45);await finish();take('45-failed',45);
assert.equal(state.failed,true);assert(state.tiles.length>0);
loader.retry();await tick();take('45-retrying',45);await finish();take('45-ready',45);
assert.equal(state.failed,false);assert.equal(state.tiles.length,wanted(45).length);
for(const fov of [9.1,1.8,.3,84.63316191100171]){
  loader.update(wanted(fov).map(tile=>tile.id));await tick();take(`${fov}-retained`,fov);
  await finish();take(`${fov}-ready`,fov);
}
assert.equal(state.failed,false);loader.dispose();assert(requests.every(request=>request.settled||request.signal.aborted));
await fs.writeFile(task+'/tmp/sao-composition-loader-0930-current.json',JSON.stringify({publicationHash:publication.publicationHash,failedId,
  requests:requests.map(({id,signal,settled})=>({id,aborted:signal.aborted,settled})),
  stages:stages.map(({tiles,...stage})=>({...stage,loaded:tiles.map((tile:any)=>tile.tile.tileId)}))},null,2)+'\n',{flag:'wx'});
const constellation=(await json('/v2/sky/constellations')).data;
const galactic=await json('/v2/sky/galactic/manifest'),landscape=await json('/v2/sky/landscape/manifest');
const prepared=stages.map(stage=>{
  const frame=resolveConstellationFrame(constellation,report.skyScene,at)!;
  const figures=constellationVisibility(stage.fov,true)>0?frame.images.filter(figure=>
    artworkIntersectsView(figure.registration,{basis:input.basis,verticalFovDeg:stage.fov},390,844)).map(figure=>figure.source):[];
  return {...stage,wantedFigures:figures,galaxy:Boolean(skyGalacticBandAt(report,at,stage.fov))};
});
const images=new Map<string,any>();
async function image(id:string,asset:any){
  if(images.has(id))return;const bytes=await get(asset.downloadUrl);assert.equal(sha(bytes),asset.sha256);assert.equal(bytes.length,asset.bytes);
  images.set(id,{id,width:asset.width,height:asset.height,data:`data:${reads.at(-1).headers['content-type'].split(';')[0]};base64,${bytes.toString('base64')}`});
}
for(const asset of prepared.flatMap(stage=>stage.wantedFigures))await image(asset.id,{...asset,downloadUrl:`/v2/sky/constellations/${constellation.catalogHash}/assets/${asset.file}`});
await image('galactic',galactic.image);const masks=[];
for(const resource of landscape.resources){await image('landscape:'+resource.id,resource.image);masks.push({resource,encoded:await json(resource.alpha.downloadUrl)});}
const compiled=await build({stdin:{resolveDir:process.cwd(),contents:
  "export {createSkyGpuRenderer} from './apps/wechat-miniapp/src/features/sky/sky-gpu-renderer';export {drawSkyScene} from './apps/wechat-miniapp/src/features/sky/sky-scene-render';export {resolveSkyStellarSupplement} from './apps/wechat-miniapp/src/features/sky/sky-stellar-supplement-scene';export {resolveConstellationFrame} from './apps/wechat-miniapp/src/features/sky/sky-constellation-scene';export {pickPaintedSkyObjects,paintedSkyPointVisible} from './apps/wechat-miniapp/src/features/sky/sky-object-picking';export {selectSkyLandscapeResource} from './apps/wechat-miniapp/src/features/sky/sky-landscape-resources';export {createSkyPanoramaMask} from './apps/wechat-miniapp/src/features/sky/sky-landscape-mask';export {decodeSkyLandscapeAlpha} from './packages/miniapp-contracts/src/sky-landscape-publication';"},
  bundle:true,write:false,metafile:true,platform:'browser',format:'iife',globalName:'sao52',target:'es2022',tsconfig:path.resolve('apps/wechat-miniapp/tsconfig.json')});
const production=compiled.outputFiles[0]!.text;await fs.writeFile(path.join(output,'production.js'),production,{flag:'wx'});
const sourceHashes=await Promise.all(Object.keys(compiled.metafile!.inputs).filter(file=>file!=='<stdin>').map(async file=>({path:file,sha256:sha(await fs.readFile(file))})));
const {chromium}=createRequire(import.meta.url)('C:/Users/777/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader']});const rows:any[]=[],errors:string[]=[];
try{
  const page=await browser.newPage({viewport:{width:390,height:844}});page.on('pageerror',(error:any)=>errors.push(String(error)));
  await page.setContent('<style>body{margin:0}canvas{display:block;width:390px;height:844px}</style><canvas width="1170" height="2532"></canvas>');
  await page.evaluate('globalThis.__name=target=>target');await page.addScriptTag({content:production});
  await page.evaluate(async(data:any)=>{
    const api=(globalThis as any).sao52,canvas=document.querySelector('canvas')!,gl=canvas.getContext('webgl',{preserveDrawingBuffer:true,antialias:false})!;
    if(!gl)throw Error('no_webgl');const decoded=new Map();
    for(const asset of data.images){const image=new Image();image.src=asset.data;await image.decode();decoded.set(asset.id,image);}
    const masks=new Map(data.masks.map((row:any)=>[row.resource.id,api.createSkyPanoramaMask(data.landscape,row.resource,api.decodeSkyLandscapeAlpha(row.encoded,row.resource))]));
    const live={textures:new Set(),buffers:new Set(),programs:new Set()},counts={points:0,pointDraws:0,draws:0,uploads:0};
    for(const [create,remove,key] of [['createTexture','deleteTexture','textures'],['createBuffer','deleteBuffer','buffers'],['createProgram','deleteProgram','programs']]){
      const make=(gl as any)[create].bind(gl),release=(gl as any)[remove].bind(gl);
      (gl as any)[create]=(...args:any[])=>{const value=make(...args);live[key].add(value);return value;};
      (gl as any)[remove]=(value:any)=>{live[key].delete(value);release(value);};
    }
    const draw=gl.drawArrays.bind(gl),upload=gl.texImage2D.bind(gl);
    gl.drawArrays=(mode,first,count)=>{counts.draws++;if(mode===gl.POINTS){counts.points+=count;counts.pointDraws++;}draw(mode,first,count);};
    (gl as any).texImage2D=(...args:any[])=>{counts.uploads++;return (upload as any)(...args);};
    const failures:string[]=[],renderer=api.createSkyGpuRenderer(gl,3,{imageFailed:()=>failures.push('GPU')});
    (globalThis as any).saoInput={...data,decoded,masks,gl,canvas,renderer,live,counts,failures,frames:new Map()};
  },{images:[...images.values()],masks,landscape,report,publication,constellation,basis:input.basis,at});
  for(const stage of prepared){
    const actual=await page.evaluate((stage:any)=>{
      const api=(globalThis as any).sao52,h=(globalThis as any).saoInput;
      const frame=api.resolveConstellationFrame(h.constellation,h.report.skyScene,h.at);
      const atlas=new Map(stage.wantedFigures.map((asset:any)=>[asset.id,h.decoded.get(asset.id)]));
      const galaxy=stage.galaxy?h.decoded.get('galactic'):null;
      const terrain=api.selectSkyLandscapeResource(h.landscape,[...atlas.values(),...(galaxy?[galaxy]:[])],false);
      const supplement=api.resolveSkyStellarSupplement(h.publication,stage.tiles,h.report.skyScene,h.at);
      let snapshot:any;const args=Array(36).fill(undefined);Object.assign(args,{0:h.renderer,1:h.report,2:h.at,3:null,4:null,5:390,6:844,7:'DAY',
        8:(value:any)=>snapshot=value,10:stage.fov,12:h.basis,15:{frame,images:atlas,enabled:true,failed:()=>h.failures.push('art')},
        16:supplement,26:galaxy,34:{enabled:true,panorama:{image:h.decoded.get('landscape:'+terrain.id),mask:h.masks.get(terrain.id)}},
        35:{horizontal:true,equatorial:false}});
      for(const key of Object.keys(h.counts))h.counts[key]=0;
      api.drawSkyScene(...args);h.gl.finish();
      const rgba=new Uint8Array(h.canvas.width*h.canvas.height*4);h.gl.readPixels(0,0,h.canvas.width,h.canvas.height,h.gl.RGBA,h.gl.UNSIGNED_BYTE,rgba);
      h.frames.set(stage.name,{rgba,snapshot});
      const stars=snapshot.objects.filter((object:any)=>object.reference.startsWith('SAO:'));
      const picks=stars.filter((object:any)=>api.paintedSkyPointVisible(snapshot,object.x,object.y)&&object.x>30&&object.x<360&&object.y>40&&object.y<804)
        .sort((a:any,b:any)=>a.magnitude-b.magnitude).slice(0,3).map((object:any)=>{
          const picked=api.pickPaintedSkyObjects(snapshot,{x:object.x,y:object.y,frameAt:snapshot.frameAt,catalogVersion:snapshot.catalogVersion,catalogHash:snapshot.catalogHash});
          return {reference:object.reference,first:picked[0]?.reference,x:object.x,y:object.y,magnitude:object.magnitude};
        });
      let binary='';for(let i=0;i<rgba.length;i+=32768)binary+=String.fromCharCode(...rgba.subarray(i,i+32768));
      return {rgba:btoa(binary),glError:h.gl.getError(),counts:{...h.counts},failures:[...h.failures],frameAt:snapshot.frameAt,
        references:snapshot.objects.map((object:any)=>object.reference),sao:stars.length,picks,landscape:snapshot.view.landscape?.resource?.id,
        sources:{constellations:atlas.size,galactic:Boolean(galaxy)},loading:stage.loading,failed:stage.failed};
    },stage);
    assert.equal(actual.glError,0);assert.deepEqual(actual.failures,[]);assert.equal(actual.frameAt,at);
    for(const pick of actual.picks)assert.equal(pick.first,pick.reference,stage.name);
    const {rgba,...value}=actual,imageFile=stage.name+'.png';
    await page.locator('canvas').screenshot({path:path.join(output,imageFile)});
    rows.push({name:stage.name,fov:stage.fov,...value,wantedBytes:stage.wantedBytes,tiles:stage.tiles.map((tile:any)=>tile.tile.tileId),
      rgbaSha256:sha(Buffer.from(rgba,'base64')),image:imageFile,imageSha256:sha(await fs.readFile(path.join(output,imageFile)))});
    console.log(JSON.stringify({name:stage.name,fov:stage.fov,sao:actual.sao,loading:stage.loading,failed:stage.failed,
      points:actual.counts.points,pointDraws:actual.counts.pointDraws}));
  }
  const comparisons=await page.evaluate(()=>{
    const h=(globalThis as any).saoInput,api=(globalThis as any).sao52;
    const compare=(beforeName:string,afterName:string)=>{
      const before=h.frames.get(beforeName),after=h.frames.get(afterName);let changed=0,increased=0;
      for(let i=0;i<before.rgba.length;i+=4){
        if([0,1,2].some(k=>before.rgba[i+k]!==after.rgba[i+k]))changed++;
        if(after.rgba[i]+after.rgba[i+1]+after.rgba[i+2]>before.rgba[i]+before.rgba[i+1]+before.rgba[i+2])increased++;
      }
      const added=after.snapshot.objects.filter((object:any)=>object.reference.startsWith('SAO:')&&
        !before.snapshot.objects.some((old:any)=>old.reference===object.reference)&&api.paintedSkyPointVisible(after.snapshot,object.x,object.y));
      const pixels=added.map((object:any)=>{
        const x=Math.round(object.x*3),y=Math.round((844-object.y)*3);let delta=0;
        for(let py=Math.max(0,y-3);py<=Math.min(2531,y+3);py++)for(let px=Math.max(0,x-3);px<=Math.min(1169,x+3);px++){
          const i=(py*1170+px)*4;delta=Math.max(delta,after.rgba[i]+after.rgba[i+1]+after.rgba[i+2]-before.rgba[i]-before.rgba[i+1]-before.rgba[i+2]);
        }
        return {reference:object.reference,delta};
      });
      const bsc=before.snapshot.objects.find((object:any)=>object.reference==='HR:7557'),core=[];
      const bx=Math.round(bsc.x*3),by=Math.round((844-bsc.y)*3);
      for(let py=by-2;py<=by+2;py++)for(let px=bx-2;px<=bx+2;px++)for(let k=0;k<3;k++){
        const i=(py*1170+px)*4+k;core.push(before.rgba[i]===after.rgba[i]);
      }
      return {before:beforeName,after:afterName,changed,increased,newVisibleObjects:added.length,
        addedWithPositivePixels:pixels.filter((point:any)=>point.delta>0).length,pixelExamples:pixels.filter((point:any)=>point.delta>0).slice(0,5),bscCoreEqual:core.every(Boolean)};
    };
    return [compare('45-retained','45-partial'),compare('45-failed','45-retrying'),compare('45-failed','45-ready'),
      compare('9.1-retained','9.1-ready'),compare('84.63316191100171-retained','84.63316191100171-ready')];
  });
  assert(comparisons[0].changed>0);assert(comparisons[0].addedWithPositivePixels>0);
  assert.equal(comparisons[1].changed,0,'retry pending preserves the existing composed frame');
  assert(comparisons[2].changed>0);assert(comparisons[2].addedWithPositivePixels>0);
  assert(comparisons.every((row:any)=>row.bscCoreEqual),'valid independent BSC core must remain');
  const byName=new Map(rows.map(row=>[row.name,row]));
  assert(byName.get('45-ready').sao>byName.get('45-retained').sao);
  assert(byName.get('9.1-ready').sao>byName.get('45-ready').sao);
  assert.equal(byName.get('0.3-ready').sao,0,'this chosen narrow field has no adopted SAO stars; do not fabricate density');
  assert.equal(byName.get('common-ready').rgbaSha256,byName.get('84.63316191100171-ready').rgbaSha256,'one-owner return must recover the original composed frame');
  const identities=[];
  for(const name of ['45-ready','9.1-ready']){
    const reference=byName.get(name).picks[0].reference;
    const information=matchingCelestialInformationResponse(await json(`/v2/celestial-objects/${encodeURIComponent(reference)}?locale=zh-CN&catalogVersion=${catalogVersion}`),reference);
    const search=matchingCelestialSearchResponse(await json(`/v2/celestial-objects?q=${encodeURIComponent(reference)}&catalogVersion=${catalogVersion}`),reference);
    assert(search.data.results.some((row:any)=>row.reference===reference));
    const context=report.context,expected={reference,...Object.fromEntries(['spotId','contextId','contextRevision','contextFingerprint','dataRevision','algorithmVersion','at'].map(key=>[key,context[key]]))};
    // Match the actual page's positionCatalog: SAO uses the supplement index's
    // scientific catalogue identity, not the independent BSC base catalogue.
    const position=matchingCelestialPositionResponse(await json(`/v2/spots/${encodeURIComponent(context.spotId)}/sky/objects/${encodeURIComponent(reference)}?contextId=${encodeURIComponent(context.contextId)}&at=${encodeURIComponent(at)}&catalogVersion=${catalogVersion}`),expected as any,publication.index);
    const tile=prepared.find(stage=>stage.name===name)!.tiles;
    const point=resolveSkyStellarSupplement(publication,tile,report.skyScene,at)!.points.find(point=>point[0]===reference)!;
    assert(Math.abs(position.data.position!.azimuthDeg-point[2])<1e-7);assert(Math.abs(position.data.position!.altitudeDeg-point[3])<1e-7);
    identities.push({name,reference,information:information.data.reference,search:search.data.results.map((row:any)=>row.reference),
      kind:information.data.kind,contentState:information.data.contentState,sources:information.data.sources.map((source:any)=>source.id),sameFramePosition:true});
  }
  const retired=await page.evaluate(()=>{const h=(globalThis as any).saoInput;h.renderer.dispose();return Object.fromEntries(Object.entries(h.live).map(([key,value]:any)=>[key,value.size]));});
  assert.deepEqual(retired,{textures:0,buffers:0,programs:0});assert.deepEqual(errors,[]);
  await fs.writeFile(path.join(output,'result.json'),JSON.stringify({scope:'Current real HTTP client/loader/selection plus one production software GPU owner, registered constellation/galaxy/terrain composition, completed-frame picks and real information/search/position responses. Controlled tile pacing/failure; not native input, WXML, phone, total memory or target performance.',
    inputSha256:sha(inputBytes),productionBundleSha256:sha(production),sourceHashes,at,observer:report.skyScene.observer,basis:input.basis,
    viewport:{width:390,height:844,dpr:3},publicationHash:publication.publicationHash,failedId,reads,rows,comparisons,identities,retired,errors},null,2)+'\n',{flag:'wx'});
}finally{await browser.close();}
