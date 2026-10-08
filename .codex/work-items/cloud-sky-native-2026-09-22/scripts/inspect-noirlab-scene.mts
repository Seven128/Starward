/** Bounded source batches use the current Scene/GPU owners.
 * The explicit test port does not forge a Mellinger/2MASS publication. Opaque
 * photographic display is a named counterfactual, not product adoption. */
import 'reflect-metadata';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
import {loadBsc5pStarCatalog} from '../../../../packages/astronomy-core/src/bsc5p-catalog.ts';
import {StellarCatalogPublicationService} from '../../../../workers/miniapp-api/src/stellar-catalog-publication.ts';
import {OpticalHipsPublicationService} from '../../../../workers/miniapp-api/src/optical-hips-publication.ts';
import {createBsc5pGeometryFrame} from '../../../../workers/miniapp-api/src/stellar-geometry-provider.ts';
import {selectSkyHipsTiles} from '../../../../apps/wechat-miniapp/src/features/sky/sky-hips-tile-selection.ts';
import {selectPublishedOpticalCandidates,resolvePublishedOpticalTiles,publishedOpticalCoverageComplete} from '../../../../apps/wechat-miniapp/src/features/sky/sky-optical-tile-selection.ts';
import {pixcoord2VecNest} from 'healpix-ts';
import type {OpticalHipsManifestData} from '../../../../packages/miniapp-contracts/src/api-shapes.ts';
import {createSkyViewBasis,createSkyDirectionProjector,unprojectSkyPoint,type SkyDirectionProjection} from '../../../../apps/wechat-miniapp/src/features/sky/sky-view-projection.ts';
import {skyEquatorialDirectionToEnu} from '../../../../apps/wechat-miniapp/src/features/sky/sky-observation-frame.ts';
import {attachSkyCatalog,resolveSkySceneFrame} from '../../../../apps/wechat-miniapp/src/features/sky/sky-stellar-scene.ts';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../..');
const variant=process.argv[2]??'panorama';assert(['panorama','hips-pilot','hips-regions','hips-geometry','hips-continuity','hips-fds','hips-rubin','hips-rubin-periphery','hips-rubin-quality'].includes(variant));
const isFds=variant==='hips-fds';
const isPeriphery=variant==='hips-rubin-periphery';
const isQuality=variant==='hips-rubin-quality';
const fineOnlyQuality=isQuality&&process.argv[3]==='fine-only';
const depthQuality=isQuality&&process.argv[3]==='fine-depth';
const groupedDpr=isQuality&&process.argv[3]==='grouped-dpr';
const groupedScale=isQuality&&process.argv[3]==='grouped-scale';
const groupedControls=isQuality&&(process.argv[3]==='grouped-controls'||groupedDpr);
const groupedQuality=isQuality&&(process.argv[3]==='grouped'||groupedControls||groupedScale);
const diagnosticQuality=fineOnlyQuality||depthQuality||groupedQuality;
const publishedQuality=isQuality&&(process.argv[3]==='published'||diagnosticQuality);
const qualityDirectory=process.argv[4]??'quality';
assert(!isQuality||/^quality(?:\/[a-z0-9-]+)?$/.test(qualityDirectory),'Quality output stays in its owned task directory');
const isRubin=variant==='hips-rubin'||isPeriphery||isQuality,isMature=isFds||isRubin;
const isGeometry=variant==='hips-geometry';
const isContinuity=variant==='hips-continuity';
const isHips=variant!=='panorama',isRegions=variant==='hips-regions'||isGeometry||isContinuity||isMature;
const out=path.join(root,isMature?'output/'+(isFds?'fds':'rubin')+'-region-batch-2026-10-08/'+(isQuality?qualityDirectory+(groupedScale?'/grouped-scale':groupedDpr?'/grouped-dpr-policy':groupedControls?'/grouped-controls':groupedQuality?'/grouped-scene':depthQuality?'/fine-depth-scene':fineOnlyQuality?'/fine-only-scene':publishedQuality?'/published-scene':'/current-scene'):isPeriphery?'periphery/current-scene':'current-scene'):
 'output/noirlab-allsky-source/'+(isHips?'scene-'+variant:'scene-inspection'));
const exists=async(p:string)=>{try{await fs.stat(p);return true;}catch(e:any){if(e.code==='ENOENT')return false;throw e;}};
const planMature=isMature&&process.argv[3]==='plan',resumeMature=isMature&&process.argv[3]==='resume';
assert(!isPeriphery||process.argv[3]===undefined,'The new bound periphery path has no historical resume/plan mode');
assert(!isQuality||process.argv[3]===undefined||process.argv[3]==='render'||publishedQuality||planMature,'Quality profiles have no historical resume mode');
const resume=!isMature&&process.argv[3]==='resume';let prior:any=null;
if(resumeMature){
 const failed=JSON.parse(await fs.readFile(path.join(out,'failed-pre-render-selection.json'),'utf8'));
 assert.equal(failed.status,'FAILED');assert.equal(failed.stage,'CURRENT_SELECTED_ORIGINAL_TILE_PREFLIGHT');
 assert.equal(failed.frames,0);assert.equal(failed.browserStarted,false);
 assert.deepEqual(await fs.readdir(out),['failed-pre-render-selection.json'],
  'Only the preserved unrendered preflight may resume; rendered results are immutable');
}
if(resume){
 assert(isRegions&&!isMature,'Only the already interrupted NOIRLab region batch may resume');
 prior=JSON.parse(await fs.readFile(path.join(out,await exists(path.join(out,'result.json'))?
  'result.json':'failed-empty-catalogue-guard-result.json'),'utf8'));
 assert.equal(prior.status,'FAILED');assert.equal(prior.failure,'AssertionError [ERR_ASSERTION]: catalogue did not affect this Scene');
 assert.equal(prior.rows.length,2);
}else if(!planMature&&!resumeMature)await fs.mkdir(out,{recursive:false});
const sha=(b:Uint8Array|string)=>createHash('sha256').update(b).digest('hex');
const bind=async(p:string)=>{const b=await fs.readFile(path.join(root,p));return {path:p,bytes:b.length,sha256:sha(b)};};
const inputs=new Map<string,Awaited<ReturnType<typeof bind>>>();
const read=async(p:string)=>{const b=await fs.readFile(path.join(root,p));inputs.set(p,{path:p,bytes:b.length,sha256:sha(b)});return b;};
const save=(n:string,v:unknown)=>fs.writeFile(path.join(out,n),JSON.stringify(v,null,2)+'\n',{flag:'wx'});
let inspection:any=null,overview=Buffer.alloc(0);
if(!isMature){
 inspection=JSON.parse((await read('output/noirlab-allsky-source/inspection/result.json')).toString());
 assert.equal(inspection.source.sha256,'b7343a1e03f02696fcc6d8c967b556986e879ed52194ad9dd3f16bd52aef3b75');
 assert.equal(inspection.fullDecode,'PASS');
 const overviewPin=inspection.outputs.find((r:any)=>r.path.endsWith('/whole-source-overview.jpg'));
 assert(overviewPin);overview=await read(overviewPin.path);
 assert.equal(sha(overview),overviewPin.sha256);assert.equal(overview.length,overviewPin.bytes);
}
const captured=JSON.parse((await read('output/playwright/optical-milky-way-display-1005-q2-r1/software-milky-way-m8-90-capture-boundaries.json')).toString());
assert.equal(captured.before.error,0);
const frame=captured.before.frameResources;
assert.equal(frame.geometry.at,frame.observation.at);
const owner=loadBsc5pStarCatalog('bsc5p-bright-stars.v3');
const catalog=new StellarCatalogPublicationService().get(owner).data;
const geometry=createBsc5pGeometryFrame(catalog,{...frame.observation.observer,at:new Date(frame.observation.at)});
assert.deepEqual(geometry.equatorialToEnu,frame.observation.equatorialToEnu);
const report={hourly:[frame.geometry],observationFrames:[frame.observation],targetFrames:[],
 skyScene:{format:'stellar-scene-v2',state:'AVAILABLE',observer:geometry.observer,catalog:{catalogVersion:catalog.catalogVersion,
  catalogHash:catalog.catalogHash,magnitudeLimit:catalog.magnitudeLimit,rowCount:catalog.rows.length,sources:catalog.sources},
  frames:[{at:geometry.at,state:'AVAILABLE',geometry}],unavailableReason:null,
  deepSky:{state:'UNAVAILABLE',catalog:null,frames:[]}},offlineReady:false,precachedHours:0};
const regions:any[]=[];
for(const reference of (isMature?[]:['M:31','M:42','M:87'])){
 const region=inspection.regions.find((r:any)=>r.reference===reference&&r.fieldDegrees===4);
 assert(region);assert.equal(region.geometryMissingPixels,0);
 const raw=await read(region.image.path);assert.equal(sha(raw),region.image.sha256);assert.equal(raw.length,region.image.bytes);
 regions.push({...region,imageData:'data:image/png;base64,'+raw.toString('base64')});
}
const hips:any[]=[],regionCases:any[]=[],sourcePlanOwnerChanges:any[]=[];let continuityBaseline:any=null;
let opticalPublication:OpticalHipsManifestData|null=null;
const peripheryConsumerReadback:any[]=[];
const publishedQualityConsumerReadback:any[]=[];
const frozenNonExecutedProvenance:any[]=[];
const acquisitionScript='.codex/work-items/cloud-sky-native-2026-09-22/scripts/inspect-legacy-regions.py';
let qualitySupplyReadback:any=null;
// Both trial roles consume the same strict worker contracts and unchanged
// originals. This is an actual local publication readback, not a fabricated
// attribution attached to the raw-image visual lane.
async function loadRubinPublication(base:string,maxOrder:number){
 const receipt=JSON.parse((await read(base+'local-trial-readback.json')).toString());
 assert.equal(receipt.status,'LOCAL_TRIAL_REAL_OWNER_ROOT_INDEX_TILE_RIGHTS_READBACK');
 const manifest=await read(receipt.manifest.path),offer=await read(receipt.rights.path);
 for(const [raw,pin] of [[manifest,receipt.manifest],[offer,receipt.rights]]){
  assert.equal(raw.length,pin.bytes);assert.equal(sha(raw),pin.sha256);
 }
 const service=new OpticalHipsPublicationService(new URL('file:///'+path.join(root,receipt.manifest.path).replaceAll('\\','/')),
  {url:new URL('file:///'+path.join(root,receipt.rights.path).replaceAll('\\','/')),sha256:receipt.rights.sha256});
 const publishedRoot=service.manifest();
 const publication={...publishedRoot,limitations:[...publishedRoot.limitations],sources:publishedRoot.sources.map(source=>({...source}))};
 assert.equal(publication.publicationHash,receipt.publicationHash);
 const rights=await service.rights(publication.publicationHash);
 assert.equal(rights.data.scope,'TRIAL');assert.equal(rights.data.alterations.pixelBytes,'UNCHANGED');
 assert.equal(publication.sources[0]!.hipsCreatorDid,'ivo://CDS/P/Rubin/FirstLook');
 assert.equal(publication.sources[0]!.hipsDoi,null);assert.equal(publication.sources[0]!.maxOrder,maxOrder);
 const indexes=[];
 for(const ref of publication.shards){
  await read(base+'local-trial/'+ref.file);
  indexes.push(await service.index(publication.publicationHash,ref.sourceId,ref.order,ref.dir));
 }
 for(const item of receipt.tileInputs){
  for(const pin of [item.raw,item.headers]){const raw=await read(pin.path);assert.equal(raw.length,pin.bytes);assert.equal(sha(raw),pin.sha256);}
  const body=await service.tile(publication.publicationHash,'rubin-firstlook',item.order,item.pixel);
  assert.equal(body.bytes.length,item.raw.bytes);assert.equal(sha(body.bytes),item.raw.sha256);
  const published=await read(base+'local-trial/'+item.file);assert(published.equals(body.bytes));
  hips.push({order:item.order,pixel:item.pixel,sourceId:body.sourceId,imageData:'data:image/png;base64,'+body.bytes.toString('base64')});
 }
 return {publication,indexes};
}
if(isQuality){
 const base='output/rubin-region-batch-2026-10-08/'+qualityDirectory+'/',intent=JSON.parse((await read(base+'intent.json')).toString());
 assert.equal(intent.sourceId,'CDS/P/Rubin/FirstLook');assert.equal(intent.ordinaryAdoption,false);
 assert.deepEqual(intent.pixelRatios,[1,2]);assert(intent.regions.length>0&&intent.regions.length<=2);
 const rightsRaw=await read(intent.rightsPin.path);assert.equal(rightsRaw.length,intent.rightsPin.bytes);
 assert.equal(sha(rightsRaw),intent.rightsPin.sha256);const rights=JSON.parse(rightsRaw.toString());
 assert.equal(rights.contentLicense,'CC-BY-4.0');assert.equal(rights.hipsDatabaseLicense,'ODbL-1.0');
 assert.deepEqual(rights.sourcePropertiesPin,intent.sourcePropertiesPin);
 for(const pin of [intent.sourcePropertiesPin,intent.producerReferencePin,...(intent.additionalReferencePins??[]),...rights.inputs]){
  const raw=await read(pin.path);assert.equal(raw.length,pin.bytes);assert.equal(sha(raw),pin.sha256);
 }
 const catalogue=JSON.parse((await read('packages/astronomy-core/data/opengc-deep-sky.v2.json')).toString()).rows;
 const planned:any[]=[];
 for(const region of intent.regions){
  const row=catalogue.find((r:any)=>r.objectRef===region.reference);assert(row);
  assert.equal(row.raDeg,region.raDeg);assert.equal(row.decDeg,region.decDeg);
  assert.equal(row.majorAxisArcmin,region.majorAxisArcmin);assert(region.fieldDegrees>0&&region.fieldDegrees<=5);
  const rad=Math.PI/180,ra=row.raDeg*rad,dec=row.decDeg*rad,
   eq=[Math.cos(dec)*Math.cos(ra),Math.cos(dec)*Math.sin(ra),Math.sin(dec)] as [number,number,number],
   q=skyEquatorialDirectionToEnu(frame.observation.equatorialToEnu,eq),
   basis=createSkyViewBasis(Math.atan2(q[0],q[1])/rad,90+Math.asin(q[2])/rad,0);assert(basis);
  const projector=createSkyDirectionProjector(basis,390,844,region.fieldDegrees);assert(projector);
  const north=[-Math.sin(dec)*Math.cos(ra),-Math.sin(dec)*Math.sin(ra),Math.cos(dec)],east=[-Math.sin(ra),Math.cos(ra),0],
   radius=row.majorAxisArcmin/120*rad,boundary:any[]=[];
  assert(Number.isFinite(radius)&&radius>0);
  for(let i=0;i<64;i++){
   const angle=i*2*Math.PI/64,v=eq.map((n,j)=>Math.cos(radius)*n+Math.sin(radius)*(Math.cos(angle)*north[j]!+Math.sin(angle)*east[j]!)) as [number,number,number],
    enu=skyEquatorialDirectionToEnu(frame.observation.equatorialToEnu,v),screen:SkyDirectionProjection|null=projector.project(Math.atan2(enu[0],enu[1])/rad,Math.asin(enu[2])/rad);
   assert(screen&&screen.x>=12&&screen.x<=378&&screen.y>=12&&screen.y<=832,'Complete catalogue extent must fit with visible margin');
   boundary.push({raDeg:(Math.atan2(v[1],v[0])/rad+360)%360,decDeg:Math.asin(v[2])/rad,screen});
  }
  const selection=selectSkyHipsTiles({frame:frame.observation,view:{basis,verticalFovDeg:region.fieldDegrees},
   width:390,height:844,minOrder:1,maxOrder:8,maxTiles:12});
  assert.equal(selection.state,'SELECTED');if(selection.state!=='SELECTED')throw Error('quality_selection_unavailable');
  const rays=Buffer.alloc(256*256*16),matrix=frame.observation.equatorialToEnu;
  for(let y=0;y<256;y++)for(let x=0;x<256;x++){
   const enu=unprojectSkyPoint((x+.5)*390/256,(y+.5)*844/256,basis,390,844,region.fieldDegrees);assert(enu);
   const v=[matrix[0]*enu[0]+matrix[3]*enu[1]+matrix[6]*enu[2],matrix[1]*enu[0]+matrix[4]*enu[1]+matrix[7]*enu[2],
    matrix[2]*enu[0]+matrix[5]*enu[1]+matrix[8]*enu[2]],length=Math.hypot(...v),offset=(y*256+x)*16;
   assert(Number.isFinite(length)&&Math.abs(length-1)<1e-9);
   rays.writeDoubleLE((Math.atan2(v[1]!,v[0]!)/rad+360)%360,offset);rays.writeDoubleLE(Math.asin(v[2]!/length)/rad,offset+8);
  }
  const rayPath=base+region.reference.replace(':','-')+'-rays.bin';
  if(planMature)await fs.writeFile(path.join(root,rayPath),rays,{flag:'wx'});
  else assert((await read(rayPath)).equals(rays),'Current actual camera rays must equal the saved acquisition intent');
  planned.push({reference:region.reference,basis,fieldDegrees:region.fieldDegrees,order:selection.order,pixels:selection.pixels,
   catalogueExtentBoundary:boundary,rays:await bind(rayPath)});
 }
 if(planMature){
  for(const p of [path.relative(root,fileURLToPath(import.meta.url)).replaceAll('\\','/'),
   'apps/wechat-miniapp/src/features/sky/sky-view-projection.ts','apps/wechat-miniapp/src/features/sky/sky-hips-tile-selection.ts',
   'apps/wechat-miniapp/src/features/sky/sky-observation-frame.ts'])await read(p);
  const after=await Promise.all([...inputs.keys()].map(bind));assert.deepEqual(after,[...inputs.values()]);
  await fs.writeFile(path.join(root,base+'current-selection.json'),JSON.stringify({sourceId:intent.sourceId,width:390,height:844,
   samplesPerAxis:256,pixelRatios:intent.pixelRatios,at:frame.observation.at,observer:frame.observation.observer,profiles:planned,
   inputs:after,ordinaryAdoption:false,meaning:'Complete catalogue-extent visual trial; exterior background is an independent unresolved responsibility.'},null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify({status:'COMPLETE_TARGET_SELECTION_PLANNED',profiles:planned.map(p=>({reference:p.reference,field:p.fieldDegrees,order:p.order,tiles:p.pixels.length}))}));
  process.exit(0);
 }
 const selection=JSON.parse((await read(base+'current-selection.json')).toString());assert.deepEqual(selection.profiles,planned);
 for(const pin of selection.inputs){const raw=await read(pin.path);
  if(pin.path===path.relative(root,fileURLToPath(import.meta.url)).replaceAll('\\','/')){
   if(sha(raw)!==pin.sha256)sourcePlanOwnerChanges.push({before:pin,current:inputs.get(pin.path),
    meaning:'Saved acquisition recipe epoch is retained; current task adapter adds guarded original supply/readback. Actual camera rays and selection must remain equal; catalogue, source and geometry owners must retain exact bytes.'});
  }else{assert.equal(raw.length,pin.bytes);assert.equal(sha(raw),pin.sha256);}
 }
 let coverage=JSON.parse((await read(base+'current-selection-coverage.json')).toString());
 assert.equal(coverage.sourceId,intent.sourceId);
 for(const pin of coverage.inputs){const raw=await read(pin.path);
  if(pin.path==='.codex/work-items/cloud-sky-native-2026-09-22/scripts/inspect-legacy-regions.py'){
   if(sha(raw)!==pin.sha256)sourcePlanOwnerChanges.push({before:pin,current:inputs.get(pin.path),
    meaning:'The failed acquisition epoch is retained; the current same task owner adds a separately qualified registered mirror. MOC, camera, source metadata and lookup inputs must retain exact bytes.'});
  }else{assert.equal(raw.length,pin.bytes);assert.equal(sha(raw),pin.sha256);}
 }
 if(coverage.status==='FAILED'){
  const recovery=JSON.parse((await read(base+'recovery-readback.json')).toString());
  assert.equal(recovery.status,'REGISTERED_MIRROR_CONTROL_AND_MISSING_ORIGINALS_READBACK');
  assert.equal(recovery.primaryFailuresRetained,true);assert.equal(recovery.sameEndpointRetries,0);
  assert.deepEqual(recovery.failures,[]);assert.equal(recovery.control.exactOriginalBytesEqual,true);
  assert.equal(recovery.control.primary.sha256,recovery.control.mirror.sha256);
  assert.equal(recovery.control.primary.bytes,recovery.control.mirror.bytes);
  assert.deepEqual(recovery.originalCoverage,inputs.get(base+'current-selection-coverage.json'));
  const qualification=JSON.parse((await read(recovery.metadataQualification.path)).toString());
  assert.deepEqual(recovery.metadataQualification,inputs.get(recovery.metadataQualification.path));
  assert.equal(qualification.status,'REGISTERED_MIRROR_PROPERTIES_VERIFIED_CONTROL_PENDING');
  assert.equal(qualification.mirror,'https://alaskybis.cds.unistra.fr/Rubin/CDS_P_Rubin_FirstLook');
  assert.deepEqual(qualification.propertyDifferences,['hips_status']);
  for(const pin of [...recovery.inputs,...qualification.inputs,recovery.control.primary,recovery.control.mirror,recovery.control.headers]){
    const raw=await read(pin.path);
    if(diagnosticQuality&&pin.path===acquisitionScript){
     const baselinePins=JSON.parse(await fs.readFile(path.join(root,base+'published-scene/inputs-before.json'),'utf8'));
     assert.deepEqual(baselinePins.find((p:any)=>p.path===pin.path),pin);
     frozenNonExecutedProvenance.push({frozen:pin,current:inputs.get(pin.path),executed:false,
      reason:'The frozen acquisition recipe is provenance only. This mode reads identical cached images and selection, and does not execute Python or acquire/process pixels.'});
    }else{assert.equal(raw.length,pin.bytes);assert.equal(sha(raw),pin.sha256);}
  }
  const failedKeys=coverage.failures.map((f:any)=>f.key).sort();
  assert.deepEqual(recovery.primaryFailureKeys,failedKeys);
  assert.deepEqual(recovery.recovered.map((t:any)=>'Norder'+t.order+'-Npix'+t.pixel).sort(),failedKeys);
  assert(recovery.recovered.every((t:any)=>t.sourceInstance==='rubin-mirror'&&
   t.url===qualification.mirror+'/Norder'+t.order+'/Dir'+Math.floor(t.pixel/10000)*10000+'/Npix'+t.pixel+'.png'));
  coverage={...coverage,profiles:coverage.profiles.map((p:any)=>({...p,originalTiles:[...p.originalTiles,
   ...recovery.recovered.filter((t:any)=>t.reference===p.reference&&t.order===p.order)].sort((a:any,b:any)=>a.pixel-b.pixel)}))};
  qualitySupplyReadback={primaryAcquisitionStatus:'FAILED',primaryFailureKeys:failedKeys,
   currentOriginalSupply:'REGISTERED_MIRROR_RECOVERED',metadata:recovery.metadataQualification,
   control:recovery.control,missingRecovered:recovery.recovered.length,originalFailuresRetained:true};
 }else assert.equal(coverage.status,'COMPLETE_TARGET_REQUIRED_ORIGINALS_READBACK');
 assert(coverage.profiles.every((p:any)=>p.originalTiles.length===p.requiredOriginalPixels.length&&
  new Set(p.originalTiles.map((t:any)=>t.pixel)).size===p.originalTiles.length&&
  p.originalTiles.every((t:any)=>p.requiredOriginalPixels.includes(t.pixel))), 'Every required original must be present exactly once');
 const unique=new Set<string>();
 for(const profile of planned){
  const qualified=coverage.profiles.find((p:any)=>p.reference===profile.reference);assert(qualified&&qualified.catalogueExtentNominallyInside);
  assert.equal(qualified.order,profile.order);assert.deepEqual(qualified.pixels,profile.pixels);
  if(!publishedQuality)for(const ratio of intent.pixelRatios)regionCases.push({name:profile.reference,basis:profile.basis,fov:profile.fieldDegrees,
   display:'hips',pixelRatio:ratio,wanted:qualified.originalTiles.map((t:any)=>({order:profile.order,pixel:t.pixel})),
   id:profile.reference.replace(':','-')+'-complete-'+ratio+'x'});
  for(const tile of qualified.originalTiles){const id=profile.order+':'+tile.pixel;if(unique.has(id))continue;unique.add(id);
   assert(profile.pixels.includes(tile.pixel));
   const raw=await read(tile.raw.path);assert.equal(raw.length,tile.raw.bytes);assert.equal(sha(raw),tile.raw.sha256);
   const headers=await read(tile.headers.path);assert.equal(headers.length,tile.headers.bytes);assert.equal(sha(headers),tile.headers.sha256);
   assert.equal([...headers.toString().matchAll(/^HTTP\/\S+ (\d+)/gm)].at(-1)?.[1],'200');assert(!/^location:/im.test(headers.toString()));
   if(!publishedQuality)hips.push({order:profile.order,pixel:tile.pixel,imageData:'data:image/png;base64,'+raw.toString('base64')});
  }
 }
 if(publishedQuality){
  const local=await loadRubinPublication(base,8);opticalPublication=local.publication;
  for(const profile of planned){
   const view={basis:profile.basis,verticalFovDeg:profile.fieldDegrees},
    candidates=selectPublishedOpticalCandidates(opticalPublication,frame.observation,view,390,844),
    reference={order:profile.order,pixels:profile.pixels},
    fine=resolvePublishedOpticalTiles(candidates,local.indexes,reference),
    coarse=resolvePublishedOpticalTiles(candidates,local.indexes.filter(index=>index.order<profile.order),reference);
   assert.equal(fine.length,profile.pixels.length);assert(fine.every(tile=>tile.order===profile.order));
   assert(coarse.length>0&&coarse.every(tile=>tile.order<profile.order));
   assert(publishedOpticalCoverageComplete(reference,fine));assert(publishedOpticalCoverageComplete(reference,coarse));
   // The normal wanted set is bounded by the existing resolver. These already
   // loaded parents model the native owner's warm retained snapshot; no new
   // request or a larger wanted limit is implied by the combined draw set.
   const warm=[...coarse,...fine];assert(warm.length*512*512*4<=20*1024*1024);
   const tileIds=(tiles:typeof fine)=>tiles.map(t=>({order:t.order,pixel:t.pixel,sourceId:t.sourceId}));
   const states=groupedScale?['grouped-fine']:groupedQuality?['grouped-fine','grouped-fine-partial','grouped-fine-failed',...(profile.reference==='M:8'?['grouped-budget-refused','grouped-depth-failed']:[])]:depthQuality?['fine-depth','fine-depth-failed']:fineOnlyQuality?['fine-only']:['coarse','fine','fine-failed','empty'];
   for(const state of states)regionCases.push({name:profile.reference,
    basis:profile.basis,fov:profile.fieldDegrees,display:'hips',pixelRatio:groupedScale?2:1,state,pairKey:profile.reference,
    wanted:tileIds(state==='empty'?[]:state==='coarse'?coarse:state==='fine-only'?fine:warm),
    failTiles:state==='fine-failed'||state==='fine-depth-failed'||state==='grouped-fine-failed'?fine.map(t=>t.order+':'+t.pixel):state==='grouped-fine-partial'?[fine[0]!.order+':'+fine[0]!.pixel]:[],expectCredit:!depthQuality&&state!=='empty'&&state!=='grouped-budget-refused'&&state!=='grouped-depth-failed',
    ...(depthQuality?{probes:false,depthDiagnostic:true}:{}),
    ...(state==='grouped-budget-refused'?{auxiliaryBytesLimit:1024*1024}:{}),
    ...(groupedScale?{auxiliaryBytesLimit:8*1024*1024}:{}),
    ...(state==='grouped-depth-failed'?{depthAllocationFailure:true}:{}),
    id:profile.reference.replace(':','-')+'-published-'+state});
   publishedQualityConsumerReadback.push({reference:profile.reference,referenceSelection:reference,
    wantedFine:fine.map(t=>t.id),retainedParents:coarse.map(t=>t.id),warmSourcePressureBytes:warm.length*512*512*4,
    actualIndexCoverage:true,nativeRetentionExecuted:false,
    meaning:'Actual indexed wanted set and available same-source parents, rendered as a controlled warm snapshot. Native decode/cache/lifecycle and physical memory remain separate obligations.'});
  }
  if(!diagnosticQuality)regionCases.push({...regionCases[1],id:regionCases[1].id+'-probes-off',state:'probes-off',expectCredit:false,probes:false});
 }
}else if(isPeriphery){
 const base='output/rubin-region-batch-2026-10-08/periphery/';
 const local=await loadRubinPublication(base,7);opticalPublication=local.publication;const indexes=local.indexes;
 const regionPlan=JSON.parse((await read('output/rubin-region-batch-2026-10-08/periphery-plan.json')).toString());
 assert.equal(regionPlan.sourceId,'CDS/P/Rubin/FirstLook');
 for(const pin of regionPlan.inputs){const raw=await read(pin.path);assert.equal(raw.length,pin.bytes);assert.equal(sha(raw),pin.sha256);}
 const cases=regionPlan.regions.map((region:any)=>({name:region.reference,basis:region.camera.basis,fov:20,
  display:'hips',id:region.reference.replace('region:rubin-','whole-')}));
 const alpha=JSON.parse((await read(base+'alpha-edge-point.json')).toString());
 assert.deepEqual([alpha.order,alpha.pixel,alpha.sourceX,alpha.sourceY,alpha.alpha],[7,105213,341,244,255]);
 assert.equal(alpha.coordinates,'PNG image row=ne, column=nw; existing renderer convention');
 const eq=pixcoord2VecNest(128,alpha.pixel,(alpha.sourceY+.5)/512,(alpha.sourceX+.5)/512) as [number,number,number],
  q=skyEquatorialDirectionToEnu(frame.observation.equatorialToEnu,eq),
  basis=createSkyViewBasis(Math.atan2(q[0],q[1])*180/Math.PI,90+Math.asin(q[2])*180/Math.PI,0);assert(basis);
 for(const state of ['coarse','fine','fine-failed','empty'])cases.push({name:'region:rubin-cached-alpha-edge',basis,fov:.4,
  display:'hips',id:'alpha-edge-'+state,state});
 for(const c of cases){
  const view={basis:c.basis,verticalFovDeg:c.fov},selection=selectSkyHipsTiles({frame:frame.observation,
   view,width:390,height:844,maxOrder:7,minOrder:1,maxTiles:12});
  assert.equal(selection.state,'SELECTED');if(selection.state!=='SELECTED')throw Error('periphery_selection_unavailable');
  const candidates=selectPublishedOpticalCandidates(opticalPublication,frame.observation,view,390,844),
   reference={order:selection.order,pixels:selection.pixels},selected=resolvePublishedOpticalTiles(candidates,indexes,reference),
   state=c.state??'full',wanted=state==='empty'?[]:state==='coarse'?selected.filter(t=>t.order===2):selected;
  if(state==='full'){assert.equal(selection.order,2);assert.equal(wanted.length,2);}
  if(state==='fine'||state==='fine-failed')assert(wanted.some(t=>t.order===7&&t.pixel===alpha.pixel));
  peripheryConsumerReadback.push({id:c.id,reference,actualPublishedTiles:selected.map(t=>t.id),
   referenceCellsCovered:publishedOpticalCoverageComplete(reference,selected),
   meaning:'Index cell resolution only; original source alpha is not viewport/science availability'});
  regionCases.push({...c,wanted: wanted.map(t=>({order:t.order,pixel:t.pixel,sourceId:t.sourceId})),
   failFine:state==='fine-failed',expectCredit:state!=='empty'});
 }
 regionCases.unshift({...regionCases[0],id:'whole-virgo-probes-off',expectCredit:false,probes:false});
}else if(isMature){
 const sourceName=isFds?'fds':'rubin',base='output/'+sourceName+'-region-batch-2026-10-08/',
  intent=JSON.parse((await read(base+'sample-intent.json')).toString());
 const sourceId=isFds?'CDS/P/FDS/DR1/color':'CDS/P/Rubin/FirstLook';
 assert.equal(intent.sourceId,sourceId);
 if(isFds){assert.equal(intent.regionRef,'region:fds-initial');
  assert.deepEqual(intent.profiles.map((p:any)=>[p.fieldDegrees,p.order]),[[2.1,5],[.4,8]]);}
 const propertiesRaw=await read(isFds?base+'properties.txt':intent.sourcePropertiesPin.path),properties=propertiesRaw.toString();
 assert.equal(sha(propertiesRaw),intent.sourcePropertiesPin.sha256);assert.equal(propertiesRaw.length,intent.sourcePropertiesPin.bytes);
 assert.equal(properties.match(/^creator_did\s*=\s*(.+)$/m)?.[1]?.trim(),'ivo://'+sourceId);
 assert(/^hips_license\s*=\s*ODbL-1.0\s*$/m.test(properties));
 assert(/^hips_frame\s*=\s*equatorial\s*$/m.test(properties));
 const coverage=JSON.parse((await read(base+'coverage-plan.json')).toString());
 assert.equal(coverage.source,sourceName);
 if(isFds){assert.equal(coverage.profiles.length,2);assert(coverage.profiles.every((p:any)=>p.sampledInside===p.samples));}
 if(isRubin){
  const rightsRaw=await read(intent.rightsPin.path);assert.equal(rightsRaw.length,intent.rightsPin.bytes);
  assert.equal(sha(rightsRaw),intent.rightsPin.sha256);const rights=JSON.parse(rightsRaw.toString());
  assert.equal(rights.sourceId,sourceId);assert.equal(rights.contentLicense,'CC-BY-4.0');
  assert.equal(rights.hipsDatabaseLicense,'ODbL-1.0');assert.equal(rights.ordinaryAdoption,false);
  assert.deepEqual(rights.sourcePropertiesPin,intent.sourcePropertiesPin);
  for(const pin of rights.inputs){const raw=await read(pin.path);assert.equal(raw.length,pin.bytes);assert.equal(sha(raw),pin.sha256);}
 }
 for(const pin of coverage.inputs){const raw=await read(pin.path);
  if(pin.path==='.codex/work-items/cloud-sky-native-2026-09-22/scripts/inspect-legacy-regions.py'){
   if(sha(raw)!==pin.sha256)sourcePlanOwnerChanges.push({before:pin,current:inputs.get(pin.path),
    meaning:'Archived coverage planner epoch is retained. Source, MOC, catalogue and TAN/HEALPix inputs must stay equal; the live task adapter has gained bounded profile/selection handling and is pinned separately.'});
  }else{assert.equal(raw.length,pin.bytes);assert.equal(sha(raw),pin.sha256);}
 }
 const receipts=JSON.parse((await read(base+'tile-receipts.json')).toString());
 const matureRegions=isFds?[{reference:intent.regionRef,raDeg:intent.raDeg,decDeg:intent.decDeg,profiles:intent.profiles}]:intent.regions;
 assert(Array.isArray(matureRegions)&&matureRegions.length>0&&matureRegions.length<=coverage.profiles.length);
 assert.equal(new Set(matureRegions.map((r:any)=>r.reference)).size,matureRegions.length);
 const catalogue=isRubin?JSON.parse((await read('packages/astronomy-core/data/opengc-deep-sky.v2.json')).toString()).rows:null;
 const tileIds=new Set<string>();
 for(const region of matureRegions){
  if(isRubin){const row=catalogue.find((r:any)=>r.objectRef===region.reference);assert(row);
   assert.equal(region.raDeg,row.raDeg);assert.equal(region.decDeg,row.decDeg);
   const raw=await read(region.previewPin.path);assert.equal(raw.length,region.previewPin.bytes);assert.equal(sha(raw),region.previewPin.sha256);
   const preview=JSON.parse(raw.toString());assert.equal(preview.reference,region.reference);assert.equal(preview.source,'rubin');
   assert.equal(preview.alphaZero,0);assert.deepEqual(region.profiles,[{fieldDegrees:preview.fieldDegrees,order:preview.order}]);
   const raster=await read(preview.preview.path);assert.equal(raster.length,preview.preview.bytes);assert.equal(sha(raster),preview.preview.sha256);
  }
  const rad=Math.PI/180,eq=[Math.cos(region.decDeg*rad)*Math.cos(region.raDeg*rad),
   Math.cos(region.decDeg*rad)*Math.sin(region.raDeg*rad),Math.sin(region.decDeg*rad)] as [number,number,number];
  const q=skyEquatorialDirectionToEnu(frame.observation.equatorialToEnu,eq),
   az=Math.atan2(q[0],q[1])*180/Math.PI,alt=Math.asin(Math.max(-1,Math.min(1,q[2])))*180/Math.PI,
   basis=createSkyViewBasis(az,90+alt,0);assert(basis);
  for(const profile of region.profiles){
  const planned=coverage.profiles.find((p:any)=>p.reference===region.reference&&p.fieldDegrees===profile.fieldDegrees);assert(planned);
  assert.equal(planned.sampledInside,planned.samples,'Only nominally covered planned profiles may enter selection');
  const selection=selectSkyHipsTiles({frame:report.observationFrames[0],view:{basis,verticalFovDeg:profile.fieldDegrees},
   width:390,height:844,maxOrder:profile.order,minOrder:1,maxTiles:12});
  assert.equal(selection.state,'SELECTED');if(selection.state!=='SELECTED')throw Error('mature_region_selection_unavailable');
  assert.equal(selection.order,profile.order,'Actual current selector must reach this bounded sampled order');
  const wanted=selection.pixels.map(pixel=>({order:selection.order,pixel}));
  wanted.forEach(t=>tileIds.add(t.order+':'+t.pixel));
  regionCases.push({name:region.reference,ra:region.raDeg,dec:region.decDeg,basis,fov:profile.fieldDegrees,display:'hips',wanted,
   id:(isFds?'fds-initial':region.reference.replace(':','-'))+'-'+profile.fieldDegrees+'deg-hips'});
  }
 }
 if(planMature){
  const profiles:any[]=[];
  for(const c of regionCases){
   const rays=Buffer.alloc(256*256*16),matrix=frame.observation.equatorialToEnu;
   for(let y=0;y<256;y++)for(let x=0;x<256;x++){
    const enu=unprojectSkyPoint((x+.5)*390/256,(y+.5)*844/256,c.basis,390,844,c.fov);assert(enu);
    const v=[matrix[0]*enu[0]+matrix[3]*enu[1]+matrix[6]*enu[2],
     matrix[1]*enu[0]+matrix[4]*enu[1]+matrix[7]*enu[2],matrix[2]*enu[0]+matrix[5]*enu[1]+matrix[8]*enu[2]],
     length=Math.hypot(...v),offset=(y*256+x)*16;
    assert(Number.isFinite(length)&&Math.abs(length-1)<1e-9);
    rays.writeDoubleLE((Math.atan2(v[1]!,v[0]!)*180/Math.PI+360)%360,offset);
    rays.writeDoubleLE(Math.asin(Math.max(-1,Math.min(1,v[2]!/length)))*180/Math.PI,offset+8);
   }
   const rayPath=base+'current-view-'+(isRubin?c.name.replace(':','-')+'-':'')+c.fov+'deg-rays.bin';
   await fs.writeFile(path.join(root,rayPath),rays,{flag:'wx'});
   profiles.push({...(isRubin?{reference:c.name,basis:c.basis}:{}),fieldDegrees:c.fov,order:c.wanted[0].order,
    pixels:c.wanted.map((t:any)=>t.pixel),rays:await bind(rayPath)});
  }
  for(const p of [path.relative(root,fileURLToPath(import.meta.url)).replaceAll('\\','/'),
   'apps/wechat-miniapp/src/features/sky/sky-view-projection.ts',
   'apps/wechat-miniapp/src/features/sky/sky-artwork-registration.ts',
   'apps/wechat-miniapp/src/features/sky/sky-hips-tile-selection.ts',
   'apps/wechat-miniapp/src/features/sky/sky-observation-frame.ts',
   'packages/astronomy-core/data/bsc5p-bright-stars.v3.json','packages/astronomy-core/data/bsc5p-bright-stars.v3.manifest.json'])await read(p);
  const after=await Promise.all([...inputs.keys()].map(bind));assert.deepEqual(after,[...inputs.values()]);
  const result={sourceId:intent.sourceId,regionRef:intent.regionRef,width:390,height:844,samplesPerAxis:256,
   minOrder:1,maxTiles:12,...(isFds?{basis:regionCases[0].basis}:{}),observer:frame.observation.observer,at:frame.observation.at,profiles,
   inputs:after,sourcePlanOwnerChanges,meaning:'Actual current stereographic viewport rays and inclusive edge selection, no images or browser; the 256-square sample covers a 390 by 844 viewport',ordinaryAdoption:false};
  await fs.writeFile(path.join(root,base+'current-selection.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify({status:'CURRENT_SELECTION_PLANNED_NOT_COVERAGE_QUALIFIED',profiles:profiles.map(p=>({field:p.fieldDegrees,order:p.order,tiles:p.pixels.length}))}));
  process.exit(0);
 }
 const currentSelection=JSON.parse((await read(base+'current-selection.json')).toString());
 assert.equal(currentSelection.sourceId,sourceId);assert.equal(currentSelection.at,frame.observation.at);
 assert.deepEqual(currentSelection.observer,frame.observation.observer);
 if(isFds)assert.deepEqual(currentSelection.basis,regionCases[0].basis);
 assert.deepEqual(currentSelection.profiles.map((p:any)=>({...(isRubin?{reference:p.reference,basis:p.basis}:{}),field:p.fieldDegrees,order:p.order,pixels:p.pixels})),
  regionCases.map(c=>({...(isRubin?{reference:c.name,basis:c.basis}:{}),field:c.fov,order:c.wanted[0].order,pixels:c.wanted.map((t:any)=>t.pixel)})));
 const currentCoverage=JSON.parse((await read(base+'current-selection-coverage.json')).toString());
 assert.equal(currentCoverage.status,'CURRENT_VIEW_NOMINAL_CENTRES_INSIDE_AND_REQUIRED_ORIGINAL_TILES_READBACK');
 assert(currentCoverage.profiles.every((p:any)=>p.sampledInside===p.samples));
 for(const pin of currentCoverage.inputs){const raw=await read(pin.path);assert.equal(raw.length,pin.bytes);assert.equal(sha(raw),pin.sha256);}
 for(const id of tileIds){const [order,pixel]=id.split(':').map(Number),receipt=receipts['Norder'+order+'-Npix'+pixel];
  assert(receipt&&receipt.exitCode===0&&receipt.raw,'Current selected mature tile missing: '+id+'; no Scene download');
  const headers=await read(receipt.headers.path);assert.equal(headers.length,receipt.headers.bytes);assert.equal(sha(headers),receipt.headers.sha256);
  const statuses=[...headers.toString().matchAll(/^HTTP\/\S+ (\d+)/gm)];
  assert.equal(statuses.at(-1)?.[1],'200');assert(!/^location:/im.test(headers.toString()));
  const raw=await read(receipt.raw.path);assert.equal(raw.length,receipt.raw.bytes);assert.equal(sha(raw),receipt.raw.sha256);
  hips.push({order,pixel,imageData:'data:image/png;base64,'+raw.toString('base64')});
 }
}else if(isRegions){
 const result=JSON.parse((await read('output/noirlab-allsky-source/hips-regions-input/result.json')).toString());
 assert.equal(result.status,'REGION_TILES_GENERATED_NOT_QUALIFIED');
 const raw=await read('output/noirlab-allsky-source/hips-regions-input/recipe.json');assert.equal(sha(raw),result.recipe.sha256);
 const recipe=JSON.parse(raw.toString());
 const tileRoot=isContinuity?'hips-continuity':'hips-regions';
 await read('output/noirlab-allsky-source/'+tileRoot+'/properties');
 if(isContinuity){
  const tree=JSON.parse((await read('output/noirlab-allsky-source/hips-continuity-input/tree-result.json')).toString());
  assert.equal(tree.status,'CONTINUITY_TREE_GENERATED_NOT_QUALIFIED');assert(tree.inputsUnchanged&&tree.highestPixelsUnchanged);
  continuityBaseline=JSON.parse((await read('output/noirlab-allsky-source/scene-hips-regions/result.json')).toString());
  assert.equal(continuityBaseline.status,'CURRENT_SCENE_BATCH_RENDERED');assert.deepEqual(continuityBaseline.errors,[]);
  // Reuse actual unchanged baseline frames rather than rerendering them. Pin
  // current product/library sources; the task adapter and pixels may evolve.
  const before=JSON.parse((await read('output/noirlab-allsky-source/scene-hips-regions/inputs-before.json')).toString());
  for(const pin of before.filter((p:any)=>/^(apps\/|packages\/|workers\/|node_modules\/)/.test(p.path))){
   const bytes=await read(pin.path);assert.equal(bytes.length,pin.bytes);assert.equal(sha(bytes),pin.sha256);
  }
 }
 const tileIds=new Set<string>();
 for(const c of recipe.selections.filter((c:any)=>!isGeometry||['anti-center-seam','south-galactic-pole'].includes(c.id)))
 for(const fov of (isGeometry?[4]:isContinuity?[10,4]:c.ra!==undefined?[10,4,.4]:[10,4])){
  const selection=selectSkyHipsTiles({frame:report.observationFrames[0],view:{basis:c.basis,verticalFovDeg:fov},
   width:390,height:844,maxOrder:4,minOrder:0,maxTiles:12});assert.equal(selection.state,'SELECTED');
  if(selection.state!=='SELECTED')throw Error('inspection_selection_unavailable');
  const wanted=selection.pixels.map(pixel=>({order:selection.order,pixel}));
  wanted.forEach(t=>tileIds.add(t.order+':'+t.pixel));
  regionCases.push({name:c.id,ra:c.ra,dec:c.dec,eqDirection:c.direction,basis:c.basis,fov,display:'hips',wanted,
   id:c.id.replace(':','-')+'-'+fov+'deg-hips'});
 }
 for(const id of tileIds){const [order,pixel]=id.split(':').map(Number),
  p=`output/noirlab-allsky-source/${tileRoot}/Norder${order}/Dir${Math.floor(pixel!/10000)*10000}/Npix${pixel}.png`,raw=await read(p);
  hips.push({order,pixel,imageData:'data:image/png;base64,'+raw.toString('base64')});
 }
 if(isGeometry){
  const direct=JSON.parse((await read('output/noirlab-allsky-source/hips-geometry/result.json')).toString());
  assert.equal(direct.status,'DIRECT_GEOMETRY_PROBE_NOT_QUALIFIED');assert.equal(direct.source.sha256,inspection.source.sha256);
  for(const row of direct.rows){
   assert.equal(row.directMissing,0);assert.equal(row.newMissing,0);
   const raw=await read(row.direct.path);assert.equal(sha(raw),row.direct.sha256);assert.equal(raw.length,row.direct.bytes);
   assert(tileIds.has(row.order+':'+row.pixel),'Corrected tile must be consumed by this exact scene selection');
   hips.push({order:row.order,pixel:row.pixel,imageKey:'hips:'+row.order+':'+row.pixel+':direct',
    imageData:'data:image/png;base64,'+raw.toString('base64')});
  }
  assert.equal(direct.rows.length,2);
  const pairs=regionCases.splice(0);
  for(const c of pairs)for(const sampling of ['original','direct'])regionCases.push({...c,sampling,id:c.id+'-'+sampling});
 }
}else if(isHips){
 const log=(await read('output/noirlab-allsky-source/hips-tool/pilot.log')).toString();
 assert(log.includes('DONE  : TILES done'));assert(!log.includes('*ERROR')&&!log.includes('ABORT'));
 await read('output/noirlab-allsky-source/hips-pilot-input/source.hhh');
 await read('output/noirlab-allsky-source/hips-pilot/properties');
 for(let pixel=0;pixel<12;pixel++){
  const p=`output/noirlab-allsky-source/hips-pilot/Norder0/Dir0/Npix${pixel}.png`,raw=await read(p);
  hips.push({order:0,pixel,imageData:'data:image/png;base64,'+raw.toString('base64')});
 }
}
const entry=`
import {createSkyGpuRenderer} from './apps/wechat-miniapp/src/features/sky/sky-gpu-renderer';
import {drawSkyScene} from './apps/wechat-miniapp/src/features/sky/sky-scene-render';
import {attachSkyCatalog,resolveSkySceneFrame} from './apps/wechat-miniapp/src/features/sky/sky-stellar-scene';
import {registerSkyArtwork} from './apps/wechat-miniapp/src/features/sky/sky-artwork-registration';
import {skyEquatorialDirectionToEnu} from './apps/wechat-miniapp/src/features/sky/sky-observation-frame';
import {validBasis} from './apps/wechat-miniapp/src/features/sky/sky-view-projection';
import {skyHipsSourceCredit} from './apps/wechat-miniapp/src/features/sky/sky-hips-source-credit';
const input=${JSON.stringify({report,catalog,regions,hips,isHips,opticalPublication,
 contributionPolicy:publishedQuality||isPeriphery?{auxiliaryBytesLimit:2*1024*1024,maxGroups:1}:isQuality?{auxiliaryBytesLimit:8*1024*1024,maxGroups:1}:null,
 overview:'data:image/jpeg;base64,'+overview.toString('base64')})};
const width=390,height=844,images=new Map(),resolved=attachSkyCatalog(input.report,input.catalog);
const matrix=input.report.observationFrames[0].equatorialToEnu,at=input.report.hourly[0].at;
const gp=[-.8676661490,-.1980763734,.4559837762],gc=[-.0548755604,-.8734370902,-.4838350155];
const rotate=d=>skyEquatorialDirectionToEnu(matrix,d),unit=d=>d.map(x=>x/Math.hypot(...d));
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0),rad=Math.PI/180;
function eq(ra,dec){return [Math.cos(dec*rad)*Math.cos(ra*rad),Math.cos(dec*rad)*Math.sin(ra*rad),Math.sin(dec*rad)];}
function basis(c){const f=unit(c),north=[0,0,1],up=unit(north.map((v,i)=>v-dot(north,f)*f[i]));
 const view={forward:rotate(f),up:rotate(up),right:rotate(cross(f,up))};if(!validBasis(view))throw Error('basis_invalid');return view;}
function registration(region){const wcs=region.nominalTan,ra=wcs.CRVAL1*rad,dec=wcs.CRVAL2*rad,c=eq(wcs.CRVAL1,wcs.CRVAL2),
 n=[-Math.sin(dec)*Math.cos(ra),-Math.sin(dec)*Math.sin(ra),Math.cos(dec)],e=[-Math.sin(ra),Math.cos(ra),0];
 return registerSkyArtwork([[0,0],[1,0],[0,1]].map(([u,v])=>{const x=(u*512+.5-wcs.CRPIX1)*wcs.CDELT1*rad,
 y=((1-v)*512+.5-wcs.CRPIX2)*wcs.CDELT2*rad;return {uv:[u,v],direction:rotate(unit(c.map((z,i)=>z+x*e[i]+y*n[i])))};}));}
async function init(){const entries=input.isHips?input.hips.map(t=>[t.imageKey??'hips:'+t.order+':'+t.pixel,t.imageData]):
 [['panorama',input.overview],...input.regions.map(r=>[r.reference,r.imageData])];
 for(const [id,data] of entries){const im=new Image();im.src=data;await im.decode();images.set(id,im);}
 if(!input.isHips&&(images.get('panorama').width!==2048||images.get('panorama').height!==1024))throw Error('overview_shape');
 if(input.isHips&&[...images.values()].some(im=>im.width!==512||im.height!==512))throw Error('hips_shape');
 if(resolved.skyScene.state!=='AVAILABLE'||resolved.skyScene.catalog.rowCount!==8404)throw Error('catalog_unavailable');}
function base64(b){let s='';for(let i=0;i<b.length;i+=32768)s+=String.fromCharCode(...b.subarray(i,i+32768));return btoa(s);}
function run(c){const canvas=document.querySelector('canvas'),pixelRatio=c.pixelRatio??1,
 backingWidth=Math.round(width*pixelRatio),backingHeight=Math.round(height*pixelRatio);
 canvas.width=backingWidth;canvas.height=backingHeight;
 const gl=canvas.getContext('webgl',{preserveDrawingBuffer:true,antialias:false,alpha:false});if(!gl)throw Error('webgl_missing');
 const live=new Set(),counts={created:0,deleted:0},create=gl.createTexture.bind(gl),remove=gl.deleteTexture.bind(gl),
  shader=gl.shaderSource.bind(gl),blend=gl.blendFuncSeparate.bind(gl);
 gl.createTexture=()=>{const t=create();if(t){live.add(t);counts.created++;}return t;};
 gl.deleteTexture=t=>{if(live.delete(t))counts.deleted++;return remove(t);};
 const liveFbos=new Set(),liveDepth=new Set(),fboCounts={created:0,deleted:0},depthCounts={created:0,deleted:0,refused:0},
  createFbo=gl.createFramebuffer.bind(gl),deleteFbo=gl.deleteFramebuffer.bind(gl),
  createDepth=gl.createRenderbuffer.bind(gl),deleteDepth=gl.deleteRenderbuffer.bind(gl);
 gl.createFramebuffer=()=>{const f=createFbo();if(f){liveFbos.add(f);fboCounts.created++;}return f;};
 gl.deleteFramebuffer=f=>{if(liveFbos.delete(f))fboCounts.deleted++;return deleteFbo(f);};
 gl.createRenderbuffer=()=>{if(c.depthAllocationFailure){depthCounts.refused++;return null;}
  const d=createDepth();if(d){liveDepth.add(d);depthCounts.created++;}return d;};
 gl.deleteRenderbuffer=d=>{if(liveDepth.delete(d))depthCounts.deleted++;return deleteDepth(d);};
 let photographicPass=false,opaqueShaderChanges=0,opaqueBlendChanges=0;
 gl.shaderSource=(s,text)=>{if(c.display==='opaque'&&text.includes('vec4(infrared,0.24*u_strength)')){
  const marker='vec4(infrared,0.24*u_strength)';if(text.split(marker).length!==2)throw Error('ambiguous_shader');
  text=text.replace(marker,'vec4(infrared,u_strength)');opaqueShaderChanges++;}return shader(s,text);};
 gl.blendFuncSeparate=(...args)=>{if(c.display==='opaque'&&photographicPass&&args[0]===gl.SRC_ALPHA&&args[1]===gl.ONE){
  args=[gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA,gl.ONE,gl.ONE_MINUS_SRC_ALPHA];opaqueBlendChanges++;}return blend(...args);};
 // The largest quality case has a 780x1688 buffer: its 5,266,560B RGBA
 // signal and bounded reduction chain fit the explicit 8MiB task allowance.
 // This is separate from production policy and target-device physical memory.
 const failed=[],renderer=createSkyGpuRenderer(gl,pixelRatio,{imageFailed:()=>failed.push('image'),
  ...(input.contributionPolicy&&c.probes!==false?{artworkContributions:{...input.contributionPolicy,
   ...(c.auxiliaryBytesLimit!==undefined?{auxiliaryBytesLimit:c.auxiliaryBytesLimit}:{})}}:{})});
 const rawBand=renderer.galacticBand.bind(renderer),sun=renderer.solarLight.bind(renderer),mesh=renderer.skyImageMesh.bind(renderer);
  let panoramaPaints=0,regionPaints=0,hipsPaints=0,snapshot=null,completed=0,completedSources=null,fineFailures=0,depthStarted=false;
 const controlledFailures=c.failTiles??(c.failFine?['7:105213']:[]),failedImages=new Set(controlledFailures.map(id=>images.get('hips:'+id)));
 if(controlledFailures.length&&failedImages.has(undefined))throw Error('controlled_failure_image_missing');
 renderer.skyImageMesh=(...args)=>{if(failedImages.has(args[0])){fineFailures++;return false;}
   if(!c.depthDiagnostic){const ok=mesh(...args);if(ok)hipsPaints++;return ok;}
   if(gl.getParameter(gl.DEPTH_BITS)<=0)throw Error('diagnostic_depth_buffer_unavailable');
   const enabled=gl.isEnabled(gl.DEPTH_TEST),func=gl.getParameter(gl.DEPTH_FUNC),write=gl.getParameter(gl.DEPTH_WRITEMASK),clear=gl.getParameter(gl.DEPTH_CLEAR_VALUE);
   try{gl.enable(gl.DEPTH_TEST);gl.depthMask(true);gl.depthFunc(gl.LESS);
    if(!depthStarted){gl.clearDepth(1);gl.clear(gl.DEPTH_BUFFER_BIT);depthStarted=true;}
    const ok=mesh(...args);if(ok)hipsPaints++;return ok;
   }finally{gl.depthFunc(func);gl.depthMask(write);gl.clearDepth(clear);enabled?gl.enable(gl.DEPTH_TEST):gl.disable(gl.DEPTH_TEST);}};
 const groups=[],meshLevels=renderer.skyImageMeshLevels.bind(renderer);
 renderer.skyImageMeshLevels=(...args)=>{const result=meshLevels(...args);groups.push({priorities:args[0].map(level=>level.priority),result});return result;};
 const camera={basis:c.basis??basis(c.eqDirection??eq(c.ra,c.dec)),verticalFovDeg:c.fov};
 renderer.galacticBand=(view,band)=>{if(c.display==='off'||c.display==='hips')return rawBand(view,band,null);
  photographicPass=true;try{return rawBand(view,{...band,imageProjection:{pole:rotate(gp),center:rotate(gc),smoothInfraredPointSources:false}},
   images.get('panorama'),()=>panoramaPaints++);}finally{photographicPass=false;}};
 renderer.solarLight=(view,light)=>{const ok=sun(view,light);
  if(c.fov<12&&c.display!=='off'&&c.display!=='hips')renderer.galacticBand(view,{pole:rotate(gp),center:rotate(gc),strength:1});
  if(c.region){const region=input.regions.find(r=>r.reference===c.region),registered=registration(region);
   if(!registered||!renderer.artwork(images.get(c.region),registered,view,1,'#FFFFFF','source-over'))throw Error('region_not_drawn');regionPaints++;}
  return ok;};
 const sceneReport=c.catalog===false?{...resolved,skyScene:{...resolved.skyScene,state:'UNAVAILABLE',catalog:null,publication:null}}:resolved;
 const args=[renderer,sceneReport,at,null,null,width,height,'DAY',(s,sources)=>{snapshot=s;completedSources=sources;},()=>completed++,c.fov,null,camera.basis];
  if(c.display==='hips')args[21]=(c.depthDiagnostic?[...c.wanted].sort((a,b)=>b.order-a.order):c.wanted??input.hips).map(t=>{const key='hips:'+t.order+':'+t.pixel;
  return {...t,image:images.get(c.sampling==='direct'&&images.has(key+':direct')?key+':direct':key),layer:'OPTICAL',
   ...(input.opticalPublication?{publication:input.opticalPublication}: {})};});
 const hipsFailures=[];args[22]=t=>hipsFailures.push(t.order+':'+t.pixel);
 drawSkyScene(...args);
 gl.finish();const b=new Uint8Array(backingWidth*backingHeight*4);gl.readPixels(0,0,backingWidth,backingHeight,gl.RGBA,gl.UNSIGNED_BYTE,b);
 const error=gl.getError(),png=canvas.toDataURL('image/png').split(',')[1],paintedObjects=snapshot?.objects??[],
  credit=skyHipsSourceCredit(completedSources?.opticalHips),opticalCredit=credit?{publicationHash:credit.publication.publicationHash,
   sourceIds:credit.sourceIds,credit:credit.credit,license:credit.license,description:credit.description,sourceRoute:credit.sourceRoute}:null,
   opticalCompleted=completedSources?.opticalHips?.map(t=>t.order+':'+t.pixel)??[],depthBits=gl.getParameter(gl.DEPTH_BITS),depthEnabledAfter=gl.isEnabled(gl.DEPTH_TEST);
 const contributionFault=renderer.artworkContributionsFailed();
 renderer.dispose();gl.createTexture=create;gl.deleteTexture=remove;gl.shaderSource=shader;gl.blendFuncSeparate=blend;
 gl.createFramebuffer=createFbo;gl.deleteFramebuffer=deleteFbo;gl.createRenderbuffer=createDepth;gl.deleteRenderbuffer=deleteDepth;
 return {png,rgba:base64(b),backingWidth,backingHeight,pixelRatio,error,completed,failed,panoramaPaints,regionPaints,hipsPaints,paintedObjects,
  stellarFrameState:resolveSkySceneFrame(sceneReport.skyScene,at)?.state??null,textureObjects:counts,
   liveTextures:live.size,framebufferObjects:fboCounts,depthObjects:depthCounts,liveFramebuffers:liveFbos.size,liveRenderbuffers:liveDepth.size,
   groups,contributionFault,opaqueShaderChanges,opaqueBlendChanges,camera,opticalCredit,opticalCompleted,hipsFailures,fineFailures,depthBits,depthEnabledAfter};}
// These explicit solid fixtures verify renderer semantics, not astronomical
// coverage, publication, scientific availability or a replacement source.
function controls(dprOnly=false){const canvas=document.createElement('canvas');canvas.width=canvas.height=16;
 const gl=canvas.getContext('webgl',{preserveDrawingBuffer:true,antialias:false,alpha:false});if(!gl)throw Error('control_webgl_missing');
 const live={Texture:new Set(),Framebuffer:new Set(),Renderbuffer:new Set(),Program:new Set(),Buffer:new Set()},counts={},original={};
 for(const kind of Object.keys(live)){const create='create'+kind,remove='delete'+kind;
  original[create]=gl[create].bind(gl);original[remove]=gl[remove].bind(gl);counts[kind]={created:0,deleted:0};
  gl[create]=()=>{const value=original[create]();if(value){live[kind].add(value);counts[kind].created++;}return value;};
  gl[remove]=value=>{if(live[kind].delete(value))counts[kind].deleted++;return original[remove](value);};}
 const solid=rgba=>{const image=document.createElement('canvas');image.width=image.height=2;
  const ctx=image.getContext('2d'),bytes=new Uint8ClampedArray(16);for(let i=0;i<16;i+=4)bytes.set(rgba,i);
  ctx.putImageData(new ImageData(bytes,2,2),0,0);return image;},black=solid([0,0,0,255]),green=solid([0,255,0,255]),
  red=solid([255,0,0,255]),halfRed=solid([255,0,0,128]),transparent=solid([255,0,0,0]),
  a={publicationHash:'fixture-a',sourceId:'a'},b={publicationHash:'fixture-b',sourceId:'b'},rows=[];
 const renderer=createSkyGpuRenderer(gl,1,{artworkContributions:{auxiliaryBytesLimit:65536,maxGroups:2}}),view={basis:basis(eq(0,0)),verticalFovDeg:20};
 const rect=(left=0,right=canvas.width)=>[left,0,0,0,right,0,1,0,left,canvas.height,0,1,left,canvas.height,0,1,right,0,1,0,right,canvas.height,1,1];
 const level=(image,priority,left=0,right=canvas.width)=>({image,priority,triangles:rect(left,right)});
 const begin=()=>renderer.begin(canvas.width,canvas.height,'#0000FF');
 const check=(condition,reason)=>{if(!condition)throw Error('group_control:'+reason);};
 const observed=(name,result,groups=[a])=>{renderer.finish();const pixels=new Uint8Array(canvas.width*canvas.height*4);
  gl.readPixels(0,0,canvas.width,canvas.height,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
  const samples=[0,canvas.width-1].map(x=>[...pixels.slice(((Math.floor(canvas.height/2)*canvas.width)+x)*4,((Math.floor(canvas.height/2)*canvas.width)+x)*4+4)]),
   credit=groups.map(group=>renderer.skyImageMeshContribution(group)),row={name,result,samples,credit,counts:JSON.parse(JSON.stringify(counts)),live:Object.fromEntries(Object.entries(live).map(([k,v])=>[k,v.size])),
    error:gl.getError(),fault:renderer.artworkContributionsFailed(),depthEnabled:gl.isEnabled(gl.DEPTH_TEST)};
  check(row.error===0&&!row.depthEnabled,'normal_gl_and_depth_restoration');rows.push(row);return row;};
 try{
  if(!dprOnly){
  begin();let result=renderer.skyImageMeshLevels([level(green,0),level(black,1)],view,1,a),row=observed('opaque-black',result);
  check(result?.every(Boolean)&&row.credit[0]==='positive'&&row.samples.every(p=>p.join(',')==='0,0,0,255'),'legitimate_black_is_positive');
  begin();result=renderer.skyImageMeshLevels([level(green,0),level(transparent,1)],view,1,a);row=observed('transparent-fine',result);
  check(row.credit[0]==='unknown'&&row.samples.every(p=>p.join(',')==='0,0,255,255'),'transparent_fine_owns_geometry_without_coarse');
  begin();result=renderer.skyImageMeshLevels([level(green,0),level(red,1,0,8)],view,1,a);row=observed('partial-geometry',result);
  check(row.samples[0].join(',')==='255,0,0,255'&&row.samples[1].join(',')==='0,255,0,255','coarse_outside_successful_fine_geometry');
  for(const [name,image,expectedA,expectedB] of [['opaque',red,'unknown','positive'],['transparent',transparent,'positive','unknown'],['partial',halfRed,'positive','positive']]){
   begin();const first=renderer.skyImageMeshLevels([level(green,0),level(green,1)],view,1,a),second=renderer.skyImageMeshLevels([level(image,0),level(image,1)],view,1,b);
   row=observed('cross-source-'+name,[first,second],[a,b]);check(row.credit[0]===expectedA&&row.credit[1]===expectedB,'cross_source_'+name);
   if(name==='opaque')check(row.samples.every(p=>p.join(',')==='255,0,0,255'),'opaque_cross_source_pixels');
   if(name==='transparent')check(row.samples.every(p=>p.join(',')==='0,255,0,255'),'transparent_cross_source_pixels');
   if(name==='partial')check(row.samples.every(p=>Math.abs(p[0]-128)<=1&&Math.abs(p[1]-127)<=1&&p[2]===0),'partial_cross_source_pixels');
  }
  renderer.resetArtworkContributions();check(renderer.skyImageMeshContribution(a)==='unknown','reset_retires_receipt');
  begin();check(renderer.skyImageMesh(green,rect(),view,1,a),'old_mesh_draw');row=observed('old-mesh-before-group',true);
  const oldDepth=counts.Renderbuffer.created,oldFbos=counts.Framebuffer.created,oldTexture=counts.Texture.created;
  begin();result=renderer.skyImageMeshLevels([level(green,0),level(red,1)],view,1,a);row=observed('upgrade-existing-target',result);
  check(result?.every(Boolean)&&counts.Renderbuffer.created===oldDepth+1&&counts.Framebuffer.created===oldFbos&&counts.Texture.created===oldTexture+1,'reuse_rgba_target_adds_only_depth_and_new_source_texture');
  const allocated=counts.Renderbuffer.created;
  begin();result=renderer.skyImageMeshLevels([level(green,0),level(red,1)],view,1,a);row=observed('warm-reuse',result);
  check(counts.Renderbuffer.created===allocated,'warm_depth_reused');
  begin();renderer.skyImageMesh(green,rect(),view,1,a);row=observed('old-mesh-after-group',true);check(row.credit[0]==='positive','legacy_mesh_still_qualified');
  canvas.width=canvas.height=32;check(renderer.skyImageMeshContribution(a)==='unknown'&&live.Renderbuffer.size===0&&live.Framebuffer.size===0,'resize_retires_all_auxiliary_objects');
  begin();result=renderer.skyImageMeshLevels([level(green,0),level(red,1)],view,1,a);row=observed('resize-fresh-group',result);check(result?.every(Boolean)&&row.credit[0]==='positive','resize_reallocates_bounded_group');
  const loss=gl.isContextLost.bind(gl);gl.isContextLost=()=>true;
  check(renderer.skyImageMeshContribution(a)==='unknown'&&live.Renderbuffer.size===0&&live.Framebuffer.size===0&&renderer.artworkContributionsFailed(),'controlled_context_loss_retires_owner');
  gl.isContextLost=loss;renderer.resetArtworkContributions();begin();result=renderer.skyImageMeshLevels([level(green,0),level(red,1)],view,1,a);
  row=observed('reset-after-controlled-loss',result);check(result?.every(Boolean)&&row.credit[0]==='positive','explicit_reset_recovery');
  }else{
   renderer.dispose();canvas.width=780;canvas.height=1688;
   const larger=createSkyGpuRenderer(gl,2,{artworkContributions:{auxiliaryBytesLimit:2*1024*1024,maxGroups:1}}),
    geometry=[0,0,0,0,390,0,1,0,0,844,0,1,0,844,0,1,390,0,1,0,390,844,1,1],
    pixels=()=>{const bytes=new Uint8Array(canvas.width*canvas.height*4);gl.readPixels(0,0,canvas.width,canvas.height,gl.RGBA,gl.UNSIGNED_BYTE,bytes);return bytes;};
   try{
    larger.begin(390,844,'#0000FF');check(larger.skyImageMesh(green,geometry,view,1,a),'dpr_independent_draw');larger.finish();const before=pixels();
    const allocations=JSON.parse(JSON.stringify(counts));larger.begin(390,844,'#0000FF');
    const result=larger.skyImageMeshLevels([{image:green,triangles:geometry,priority:0},{image:transparent,triangles:geometry,priority:1}],view,1,a);
    check(result===null,'dpr_original_budget_refuses_group');check(counts.Framebuffer.created===allocations.Framebuffer.created&&counts.Renderbuffer.created===allocations.Renderbuffer.created,'dpr_refusal_has_no_auxiliary_allocations');
    check(larger.skyImageMesh(green,geometry,view,1,a),'dpr_refusal_preserves_independent_draw');larger.finish();const after=pixels();
    check(before.every((value,i)=>value===after[i]),'dpr_refusal_exact_complete_rgba');check(larger.skyImageMeshContribution(a)==='unknown'&&!larger.artworkContributionsFailed()&&gl.getError()===0,'dpr_no_false_source_or_fault');
    rows.push({name:'dpr2-original-2MiB-policy',backing:[780,1688],result,wholeRgbaEqual:true,credit:'unknown',auxiliaryAllocations:0,
     implication:'Current grouped geometric LOD unavailable under original policy; independent opaque image remains drawable. Not a qualified DPR2 fix or physical capacity pass.'});
   }finally{larger.dispose();}
  }
 }finally{renderer.dispose();for(const [name,fn] of Object.entries(original))gl[name]=fn;for(const image of [black,green,red,halfRed,transparent])image.width=image.height=0;canvas.width=canvas.height=0;}
 const retired=Object.fromEntries(Object.entries(live).map(([k,v])=>[k,v.size]));check(Object.values(retired).every(value=>value===0),'final_retirement');
 return {status:'GPU_GROUP_CONTROLS_PASS',rows,counts,retired,scope:'Actual software WebGL with explicit solid image fixtures and a named controlled context-loss flag; no publication, science, native-device or physical-memory qualification.'};}
globalThis.noirlabScene={init,run,controls};`;
const parsed=new Map<string,Awaited<ReturnType<typeof bind>>>();
const bundle=await build({stdin:{contents:entry,resolveDir:root,sourcefile:'noirlab-current-scene.ts',loader:'ts'},
 absWorkingDir:root,bundle:true,write:false,metafile:true,platform:'browser',format:'iife',target:'es2022',
 tsconfig:path.join(root,'apps/wechat-miniapp/tsconfig.json'),logLevel:'silent',plugins:[{name:'pin-parsed-input',setup(api){
  api.onLoad({filter:/\.(?:[cm]?js|tsx?|json)$/},async a=>{const b=await fs.readFile(a.path),p=path.relative(root,a.path).replaceAll('\\','/'),
   row={path:p,bytes:b.length,sha256:sha(b)};parsed.set(p,row);const ext=path.extname(a.path).slice(1);
   return {contents:b.toString('utf8'),resolveDir:path.dirname(a.path),loader:ext==='json'?'json':ext==='tsx'?'tsx':ext==='ts'?'ts':'js'};});}}]});
for(const p of ['packages/astronomy-core/src/bsc5p-catalog.ts','packages/astronomy-core/src/observation-frame.ts',
 'packages/astronomy-core/src/astronomy-engine-runtime.ts','workers/miniapp-api/src/stellar-catalog-publication.ts',
 'workers/miniapp-api/src/sky-scene-catalog-provider.ts','workers/miniapp-api/src/stellar-geometry-provider.ts',
 'packages/astronomy-core/data/bsc5p-bright-stars.v3.json','packages/astronomy-core/data/bsc5p-bright-stars.v3.manifest.json',
 path.relative(root,fileURLToPath(import.meta.url)).replaceAll('\\','/')])inputs.set(p,await bind(p));
for(const [p,row] of parsed)inputs.set(p,row);
let fineOnlyBaseline:any=null,fineOnlyMatchedInputs=0,depthPixelBaseline:any=null,scalePixelBaseline:any=null;
const groupedOwnerChanges:any[]=[];
const frozenCaseId=(id:string)=>id.replace('-fine-only','-fine').replace('-fine-depth','-fine')
 .replace('-grouped-fine-partial','-fine').replace('-grouped-fine-failed','-fine-failed')
 .replace('-grouped-fine','-fine').replace('-grouped-budget-refused','-fine').replace('-grouped-depth-failed','-fine');
if(diagnosticQuality){
 const base='output/rubin-region-batch-2026-10-08/'+qualityDirectory+'/published-scene/',
  oldInputs=JSON.parse(await fs.readFile(path.join(root,base+'inputs-before.json'),'utf8')),
  self=path.relative(root,fileURLToPath(import.meta.url)).replaceAll('\\','/'),
  changedOwners=groupedQuality?['sky-scene-render.ts','sky-gpu-renderer.ts','sky-gpu-artwork-contributions.ts'].map(p=>'apps/wechat-miniapp/src/features/sky/'+p):[],
  canonical=(rows:any[])=>rows.filter(p=>p.path!==self&&p.path!==acquisitionScript&&!changedOwners.includes(p.path)).sort((a,b)=>a.path.localeCompare(b.path));
 assert.equal(frozenNonExecutedProvenance.length,1);
 assert.deepEqual(canonical([...inputs.values()]),canonical(oldInputs),
  'Reuse frozen parent-plus-fine frames only with identical non-adapter inputs');
 fineOnlyMatchedInputs=canonical(oldInputs).length;
 if(groupedQuality){
  const intent=JSON.parse((await read('output/rubin-region-batch-2026-10-08/'+qualityDirectory+'/grouped-intent.json')).toString());
  for(const p of changedOwners){const before=oldInputs.find((row:any)=>row.path===p),current=inputs.get(p);assert(before&&current);
   assert.deepEqual(before,intent.codeBefore.find((row:any)=>row.path===p));groupedOwnerChanges.push({before,current});}
  await read('apps/wechat-miniapp/src/features/sky/sky-render-surface.ts');
 }
 await read(base+'inputs-before.json');
 fineOnlyBaseline=JSON.parse((await read(base+'result.json')).toString());
 assert.equal(fineOnlyBaseline.status,'CURRENT_SCENE_BATCH_RENDERED');assert.equal(fineOnlyBaseline.failure,null);
 for(const c of regionCases){
  const old=fineOnlyBaseline.rows.find((r:any)=>r.condition.id===frozenCaseId(c.id));assert(old);
  const expected={...old.condition,state:c.state,wanted:c.wanted,id:c.id,
   ...(depthQuality?{probes:false,depthDiagnostic:true,expectCredit:false}: {}),
   ...(groupedQuality?{failTiles:c.failTiles,expectCredit:c.expectCredit,
    ...(groupedScale?{pixelRatio:2}:{}),
    ...(c.auxiliaryBytesLimit!==undefined?{auxiliaryBytesLimit:c.auxiliaryBytesLimit}:{}),
    ...(c.depthAllocationFailure?{depthAllocationFailure:true}:{})}: {})};assert.deepEqual(c,expected);
  const raw=await read(old.png.path);assert.equal(raw.length,old.png.bytes);assert.equal(sha(raw),old.png.sha256);
 }
 if(depthQuality||groupedQuality){
  depthPixelBaseline=JSON.parse((await read(base.replace('published-scene/','fine-only-scene/')+'result.json')).toString());
  assert.equal(depthPixelBaseline.status,'CURRENT_SCENE_BATCH_RENDERED');
  for(const row of depthPixelBaseline.rows){const raw=await read(row.png.path);assert.equal(raw.length,row.png.bytes);assert.equal(sha(raw),row.png.sha256);}
 }
 if(groupedScale){scalePixelBaseline=JSON.parse((await read(base.replace('published-scene/','current-scene/')+'result.json')).toString());
  assert.equal(scalePixelBaseline.status,'CURRENT_SCENE_BATCH_RENDERED');
  for(const row of scalePixelBaseline.rows.filter((r:any)=>r.condition.pixelRatio===2)){const raw=await read(row.png.path);assert.equal(raw.length,row.png.bytes);assert.equal(sha(raw),row.png.sha256);}
 }
}
if(resume){
 const old=JSON.parse(await fs.readFile(path.join(out,await exists(path.join(out,'inputs-before-empty-catalogue-guard.json'))?
  'inputs-before-empty-catalogue-guard.json':'inputs-before.json'),'utf8'));
 const self=path.relative(root,fileURLToPath(import.meta.url)).replaceAll('\\','/');
 const canonical=(rows:any[])=>rows.filter(p=>p.path!==self).sort((a,b)=>a.path.localeCompare(b.path));
 assert.deepEqual(canonical(old),canonical([...inputs.values()]));
 const oldBundle=(await fs.readFile(path.join(out,'current-scene.js'))).toString(),newBundle=bundle.outputFiles[0]!.text;
 const observation=/^\s*stellarFrameState: resolveSkySceneFrame\(sceneReport\.skyScene, at\)\?\.state \?\? null,\r?\n/gm;
 assert.equal(newBundle.match(observation)?.length,1);assert(!oldBundle.match(observation));
 assert.equal(sha(oldBundle),sha(newBundle.replace(observation,'')),
  'Only the new resolved-frame readback may differ; rendering code and inputs must remain identical');
 const verifier={oldBundleSha256:sha(oldBundle),observedBundleSha256:sha(newBundle),
  renderingCodeExactAfterRemovingSingleNewReadback:true,readback:'stellarFrameState'};
 if(await exists(path.join(out,'resume-verifier-binding.json')))
  assert.deepEqual(JSON.parse(await fs.readFile(path.join(out,'resume-verifier-binding.json'),'utf8')),verifier);
 else await save('resume-verifier-binding.json',verifier);
 if(await exists(path.join(out,'result.json'))){
  await fs.rename(path.join(out,'inputs-before.json'),path.join(out,'inputs-before-empty-catalogue-guard.json'));
  await fs.rename(path.join(out,'result.json'),path.join(out,'failed-empty-catalogue-guard-result.json'));
  await fs.rename(path.join(out,'failed.json'),path.join(out,'failed-empty-catalogue-guard.json'));
 }else{
  const interrupted=JSON.parse(await fs.readFile(path.join(out,'failed.json'),'utf8'));
  assert(interrupted.failure.includes('eqDirection: undefined'),'Unexpected resume failure must be investigated');
  await fs.rename(path.join(out,'failed.json'),path.join(out,'failed-resume-condition-roundtrip.json'));
  await fs.rename(path.join(out,'inputs-before.json'),path.join(out,'inputs-before-resume-condition-roundtrip.json'));
 }
 if(await exists(path.join(out,'inputs-after.json')))
  await fs.rename(path.join(out,'inputs-after.json'),path.join(out,'inputs-after-empty-catalogue-guard.json'));
}
await save('inputs-before.json',[...inputs.values()]);
if(!resume){
 await save('controlled-report.json',{report,catalogIdentity:{catalogVersion:catalog.catalogVersion,catalogHash:catalog.catalogHash,rows:catalog.rows.length}});
 await fs.writeFile(path.join(out,'current-scene.js'),bundle.outputFiles[0]!.contents,{flag:'wx'});
}
const wide=[{name:'galactic-center',eqDirection:[-.0548755604,-.8734370902,-.4838350155],fov:90},
 {name:'anti-center-seam',eqDirection:[.0548755604,.8734370902,.4838350155],fov:90},
 {name:'north-galactic-pole',eqDirection:[-.8676661490,-.1980763734,.4559837762],fov:90},
 {name:'south-galactic-pole',eqDirection:[.8676661490,.1980763734,-.4559837762],fov:90},
 {name:'m31',ra:10.684791666667,dec:41.269055555556,fov:25},
 {name:'m42',ra:83.818666666667,dec:-5.389666666667,fov:45},
 {name:'m87',ra:187.705930833333,dec:12.391123611111,fov:25}];
let cases:any[]=wide.flatMap(c=>(isHips?['hips']:['off','current-additive','opaque']).map(display=>({...c,display,id:c.name+'-'+display})));
for(const r of regions)for(const region of (isHips?[null]:[null,r.reference]))cases.push({name:r.reference,ra:r.nominalTan.CRVAL1,dec:r.nominalTan.CRVAL2,
 fov:10,display:isHips?'hips':'opaque',region,id:r.reference.replace(':','-')+'-'+(isHips?'hips':region?'same-source-region':'background')});
if(!isHips)cases.push({...wide[5],display:'opaque',catalog:false,id:'m42-source-attribution-only'});
if(isRegions)cases=groupedControls?[]:regionCases;
const {chromium}=createRequire(import.meta.url)('C:/Users/777/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const frameLog=await fs.open(path.join(out,'frames.jsonl'),'wx');
const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader']});
const rows:any[]=[],errors:string[]=[],pairComparisons:any[]=[],baselineComparisons:any[]=[];
const pairRgba=new Map<string,Buffer>();let failure:string|null=null,observed:any=null,groupControlReadback:any=null;
try{
 const page=await browser.newPage({viewport:{width:390,height:844}});page.on('pageerror',(e:any)=>errors.push(String(e)));
 await page.setContent('<canvas width="390" height="844" style="width:390px;height:844px"></canvas>');
 await page.evaluate('globalThis.__name=fn=>fn');await page.addScriptTag({content:bundle.outputFiles[0]!.text});
 if(groupedControls){groupControlReadback=await page.evaluate((dpr:boolean)=>(globalThis as any).noirlabScene.controls(dpr),groupedDpr);await save('controls.json',groupControlReadback);}
 else await page.evaluate(()=>(globalThis as any).noirlabScene.init());
 for(const c of cases){
  const reusable=prior?.rows.find((r:any)=>r.condition.id===c.id);
  if(reusable){assert.deepEqual(reusable.condition,JSON.parse(JSON.stringify(c)));const raw=await fs.readFile(path.join(root,reusable.png.path));
   assert.equal(sha(raw),reusable.png.sha256);const reused={...reusable,reusedFromInterruptedBatch:true};
   await frameLog.write(JSON.stringify(reused)+'\n');rows.push(reused);continue;}
  const row=await page.evaluate((condition:unknown)=>(globalThis as any).noirlabScene.run(condition),c);
  observed={...row,condition:c};
  assert.equal(row.error,0);assert.equal(row.completed,1);assert.equal(row.liveTextures,0);assert.deepEqual(row.failed,[]);
  assert.equal(row.liveFramebuffers,0);assert.equal(row.liveRenderbuffers,0);
  if(groupedQuality){assert.equal(row.groups.length,1);assert.equal(row.depthEnabledAfter,false);
   if(c.state==='grouped-budget-refused'||c.state==='grouped-depth-failed'){
    assert.equal(row.groups[0].result,null);assert.equal(row.contributionFault,c.state==='grouped-depth-failed');
    assert.equal(row.depthObjects.refused,c.state==='grouped-depth-failed'?1:0);
   }else{assert.equal(row.contributionFault,false);assert.equal(row.depthObjects.created,1);assert.equal(row.depthObjects.deleted,1);
    assert.equal(row.groups[0].result.length,c.wanted.length);
    assert.equal(row.groups[0].result.filter((ok:boolean)=>!ok).length,c.failTiles.length);}
  }
  assert.equal(row.panoramaPaints,c.display==='off'||isHips?0:1);assert.equal(row.regionPaints,'region' in c&&c.region?1:0);
  if(isHips&&c.state!=='empty')assert(row.hipsPaints>0,'HiPS did not affect this Scene');
  if(isPeriphery||publishedQuality){
   assert.equal(Boolean(row.opticalCredit),c.expectCredit,'Requested metadata cannot establish a completed source');
   if(c.expectCredit){assert.equal(row.opticalCredit.publicationHash,opticalPublication!.publicationHash);
    assert.deepEqual(row.opticalCredit.sourceIds,['rubin-firstlook']);assert(row.opticalCompleted.length>0);}
   if(c.failFine||c.failTiles?.length){const expected=c.failTiles??['7:105213'];
    assert.equal(row.fineFailures,expected.length);assert.deepEqual(row.hipsFailures,expected);
    assert(expected.every((id:string)=>!row.opticalCompleted.includes(id)));}
   else assert.deepEqual(row.hipsFailures,[]);
  }
  if(c.display==='opaque'){assert.equal(row.opaqueShaderChanges,1);assert.equal(row.opaqueBlendChanges,1);}
  if(c.catalog!==false)assert.equal(row.stellarFrameState,'AVAILABLE');
  const rgba=Buffer.from(row.rgba,'base64'),png=Buffer.from(row.png,'base64');
  assert.equal(row.backingWidth,Math.round(390*(c.pixelRatio??1)));assert.equal(row.backingHeight,Math.round(844*(c.pixelRatio??1)));
  assert.equal(rgba.length,row.backingWidth*row.backingHeight*4);
  if(diagnosticQuality){
   const useFineOnly=(depthQuality&&!c.failTiles.length)||(groupedQuality&&(c.state==='grouped-fine'||c.state==='grouped-fine-partial'));
   const baseline=groupedScale?scalePixelBaseline.rows.find((r:any)=>r.condition.name===c.name&&r.condition.pixelRatio===2):useFineOnly?depthPixelBaseline.rows.find((r:any)=>r.condition.name===c.name):
    fineOnlyBaseline.rows.find((r:any)=>r.condition.id===frozenCaseId(c.id).replace('-fine-failed','-coarse'));assert(baseline);
   assert.deepEqual(row.camera,baseline.camera);assert.equal(row.paintedObjects.length,baseline.paintedObjects);
   const original=await fs.readFile(path.join(root,baseline.png.path));
   const baselineBytes=await page.evaluate(async(data:string)=>{
    const im=new Image();im.src='data:image/png;base64,'+data;await im.decode();
    const canvas=document.createElement('canvas');canvas.width=im.width;canvas.height=im.height;
    const context=canvas.getContext('2d')!;context.drawImage(im,0,0);
    const pixels=context.getImageData(0,0,im.width,im.height).data,flipped=new Uint8Array(pixels.length),stride=im.width*4;
    for(let y=0;y<im.height;y++)flipped.set(pixels.subarray(y*stride,(y+1)*stride),(im.height-1-y)*stride);
    let text='';for(let i=0;i<flipped.length;i+=32768)text+=String.fromCharCode(...flipped.subarray(i,i+32768));
    canvas.width=canvas.height=0;return btoa(text);
   },original.toString('base64'));
   const before=Buffer.from(baselineBytes,'base64');assert.equal(before.length,baseline.rgba.bytes);
   assert.equal(sha(before),baseline.rgba.sha256,'Decoded frozen PNG must equal the recorded complete GL RGBA');
   let changedPixels=0,maxChannelDifference=0;
   const bounds={left:row.backingWidth,top:row.backingHeight,right:-1,bottom:-1};
   for(let i=0;i<rgba.length;i+=4){let changed=false;for(let channel=0;channel<4;channel++){
    const delta=Math.abs(before[i+channel]!-rgba[i+channel]!);if(delta)changed=true;
    maxChannelDifference=Math.max(maxChannelDifference,delta);
   }if(changed){changedPixels++;const x=(i/4)%row.backingWidth,y=row.backingHeight-1-Math.floor(i/4/row.backingWidth);
    bounds.left=Math.min(bounds.left,x);bounds.top=Math.min(bounds.top,y);bounds.right=Math.max(bounds.right,x);bounds.bottom=Math.max(bounds.bottom,y);}}
   if(depthQuality){assert.equal(changedPixels,0,'Successful finest geometry must match fine-only; failed fine geometry must preserve exact coarse pixels');assert.equal(row.depthEnabledAfter,false);}
   if(groupedQuality){
    if(c.state==='grouped-fine-partial')assert(changedPixels>0,'A controlled failed fine tile must change the actual frame');
    else if(c.state==='grouped-budget-refused'||c.state==='grouped-depth-failed')assert.equal(changedPixels,0,'Unavailable groups preserve the exact frozen independent path');
    else assert(maxChannelDifference<=2,'Only predeclared bounded offscreen RGBA8 quantization is permitted; geometry/source differences fail');
   }
   baselineComparisons.push({id:c.id,baseline:baseline.png,baselineRgba:baseline.rgba,
    unchangedNonAdapterInputs:fineOnlyMatchedInputs,changedPixels,maxChannelDifference,changedBounds:changedPixels?bounds:null,
    meaning:groupedQuality?'Current source-group workRGBA/depth and actual A-channel contribution; frozen pixels used as before implementation reference. Partial failure is a distinct actual geometry/fallback condition. Max2 code quantization allowance was declared in grouped-intent before rendering; unavailable groups must retain exact independent pixels.':depthQuality?'Image-only counterfactual uses existing depth buffer with finest-first geometric ownership, no extra image/FBO or source-pixel changes. Probes are explicitly disabled: source credit and actual native acceptance are not qualified.':
     'Diagnostic only: remove retained same-source parents while preserving all wanted fine tiles and original alpha. Pixel equality or a difference does not alone certify coverage or acceptable LOD.'});
  }
  if(isPeriphery||publishedQuality){
   const key=c.pairKey??'periphery';
   if(c.state==='coarse')pairRgba.set(key,rgba);
   if(c.state==='fine'||c.state==='fine-failed'){
    const baseline=pairRgba.get(key);assert(baseline);let changedPixels=0;
    for(let i=0;i<rgba.length;i+=4)if(!rgba.subarray(i,i+4).equals(baseline.subarray(i,i+4)))changedPixels++;
    if(c.state==='fine')assert(changedPixels>0,'A real finer source must affect the completed frame');
    else assert.equal(changedPixels,0,'Failed fine draw must preserve the exact coarse completed frame');
    pairComparisons.push({id:c.id,changedPixels,meaning:c.state==='fine'?'Actual same-source detail effect':'Controlled fine submission failure retains coarse pixels'});
   }
  }
  if(isGeometry){
   if(c.sampling==='original')pairRgba.set(c.name,rgba);
   else{const before=pairRgba.get(c.name);assert(before,'Original comparison must precede direct pixels');
    let changedPixels=0,maxChannelDifference=0;
    for(let i=0;i<rgba.length;i+=4){let changed=false;for(let channel=0;channel<4;channel++){
     const delta=Math.abs(before[i+channel]!-rgba[i+channel]!);if(delta)changed=true;
     maxChannelDifference=Math.max(maxChannelDifference,delta);
    }if(changed)changedPixels++;}
    assert(changedPixels>0,'Direct original pixels must affect the actually completed frame');
    pairComparisons.push({name:c.name,changedPixels,maxChannelDifference,onlyReplacedOrder4Pixels:[1040,1528]});
    pairRgba.delete(c.name);
   }
  }
  await fs.writeFile(path.join(out,c.id+'.png'),png,{flag:'wx'});
  const observations=row.paintedObjects.filter((o:any)=>o.kind==='STAR'&&o.magnitude<2).map((o:any)=>{
   const i=((row.backingHeight-1-Math.floor(o.y*row.pixelRatio))*row.backingWidth+Math.floor(o.x*row.pixelRatio))*4;
   return {...o,displayRgb:[...rgba.subarray(i,i+3)]};});
  delete row.rgba;delete row.png;row.paintedObjects=row.paintedObjects.length;
  const saved={condition:c,...row,brightCataloguePositionObservations:observations,rgba:{bytes:rgba.length,sha256:sha(rgba)},
   png:{path:path.relative(root,path.join(out,c.id+'.png')).replaceAll('\\','/'),bytes:png.length,sha256:sha(png)}};
  if(isContinuity){
   const baseline=continuityBaseline.rows.find((r:any)=>r.condition.id===c.id);assert(baseline);
   assert.deepEqual(baseline.condition,JSON.parse(JSON.stringify(c)));
   const original=await read(baseline.png.path);assert.equal(original.length,baseline.png.bytes);assert.equal(sha(original),baseline.png.sha256);
   assert.equal(baseline.paintedObjects,saved.paintedObjects,'Same catalogue/camera must preserve projected identities');
   baselineComparisons.push({id:c.id,baseline:baseline.png,current:saved.png,
    originalRgbaSha256:baseline.rgba.sha256,currentRgbaSha256:saved.rgba.sha256,
    equalCompletedPixels:baseline.rgba.sha256===saved.rgba.sha256,unchangedBaselineReused:true});
  }
  await frameLog.write(JSON.stringify(saved)+'\n');rows.push(saved);
 }
}catch(e:any){failure=String(e);await save('failed.json',{failure,stack:e.stack});
 if(groupedQuality&&observed){const {rgba,png,...metadata}=observed,raw=Buffer.from(png,'base64');
  await fs.writeFile(path.join(out,'failed-observation.png'),raw,{flag:'wx'});
  await save('failed-observation.json',{...metadata,rgba:{bytes:Buffer.from(rgba,'base64').length,sha256:sha(Buffer.from(rgba,'base64'))},
   png:{path:path.relative(root,path.join(out,'failed-observation.png')).replaceAll('\\','/'),bytes:raw.length,sha256:sha(raw)}});}
}
finally{await browser.close();await frameLog.close();}
const after=await Promise.all([...inputs.keys()].map(bind));assert.deepEqual(after,[...inputs.values()]);
await save(isPeriphery||isQuality?'input-readback.json':'inputs-after.json',isPeriphery||isQuality?
 {inputCount:after.length,differences:[],currentEqual:true}:after);
const catalogueProjectionReadback:any[]=[];
if(isMature){
 const resolved=attachSkyCatalog(report as any,catalog),current=resolveSkySceneFrame(resolved.skyScene,geometry.at);
 assert(current);assert.equal(current.points.length,8404);
 for(const row of rows){
  const projector=createSkyDirectionProjector(row.condition.basis,390,844,row.condition.fov);assert(projector);
  const expected=current.points.filter(p=>projector.project(p[1],p[2])!==null).length;
  catalogueProjectionReadback.push({id:row.condition.id,rawProjectedCataloguePoints:expected,paintedObjects:row.paintedObjects});
  if(expected===0)assert.equal(row.paintedObjects,0,'A truly empty BSC field must not invent pickable stars');
 }
 if(catalogueProjectionReadback.some(r=>r.rawProjectedCataloguePoints>0))
  assert(rows.some(r=>r.paintedObjects>0),'A nonempty catalogue view must affect the completed frame');
}else assert(rows.some(r=>r.paintedObjects>0),'The batch must actually paint catalogue stars');
const result={status:failure?'FAILED':'CURRENT_SCENE_BATCH_RENDERED',variant,failure,errors,rows,pairComparisons,baselineComparisons,sourcePlanOwnerChanges,catalogueProjectionReadback,inputsUnchanged:true,
  peripheryConsumerReadback,publishedQualityConsumerReadback,qualitySupplyReadback,frozenNonExecutedProvenance,groupedOwnerChanges,groupControlReadback,
 resumedFrames:prior?.rows.length??0,verificationCorrection:resume?
 'A legitimate zero projected BSC star count in a narrow field is not catalogue unavailability. Exact resolved stellar frame availability is checked; the batch must still visibly paint catalogue stars. The interrupted failure and its two completed frames are preserved.':null,
 newOriginalDecodes:0,networkRequests:0,ordinaryAdoption:false,scientificAvailability:'UNKNOWN',absoluteRegistration:'UNVERIFIED',
  scope:groupedQuality?'Current shared Scene/GPU/contribution owners compose a same-source PNG hierarchy in one bounded RGBA+depth target, reuse its A-channel for actual completed source participation and retire all texture/FBO/depth resources. Frozen original fine-only/coarse/warm frames, partial and full fine failure, allocation refusal and source credit are checked. Original images, time, camera and budgets remain bound. This is software development evidence; native/device, physical memory, exterior background, ordinary adoption and independent acceptance remain unverified.':depthQuality?'Four image-only diagnostic frames use the existing default depth buffer for finest-first same-source geometric ownership; fine submission failures retain the exact frozen coarse frame. Source pixels, camera and time are unchanged, GL state is restored per mesh, no extra FBO/texture is introduced. Contribution probes are explicitly disabled because their current owner does not accept depth-tested rendering; source credit/native adoption, partial-failure and cross-source semantics remain unqualified.':fineOnlyQuality?'Two new fine-only complete Scene frames compared against frozen parent-plus-fine PNGs whose decoded complete RGBA hashes match their original readbacks. All non-adapter inputs, time, camera, source originals, publication and contribution policy match. Original alpha, current mesh/shader/blend and source credit are retained. This is a diagnostic of same-source parent/fine composition, not an adopted fix, native, physical, scientific, absolute registration, exterior background or independent acceptance.':publishedQuality?'The two current complete-target roles consume actual local v2 worker root/index/tile/rights and the indexed wanted set. Already available same-source parent tiles are a controlled warm snapshot; finest submission failure must retain exact coarse RGBA, empty supply and disabled contribution measurement must have no source credit. Current Scene/GPU/source-over, nominal coverage and original bytes are preserved. This qualifies the completed-source mechanism at 390x844/1x, not actual native retention/cache/Source Back, physical memory, science, absolute registration, photo exterior/background, ordinary adoption, remote publication, WXML/device or independent acceptance.':
 isQuality?'Complete catalogue target extent with visible margin at a 390x844 CSS viewport, rendered at 1x and 2x backing-store resolution by the unchanged current Scene/GPU mesh and source-over. Reviewed Rubin source/content/database rights, producer full preview, actual selector/rays, nominal MOC and unchanged original PNGs are separately bound. Nominally absent exterior cells are not fetched or replaced with fabricated pixels. This explicit task image supply is a visual development trial, not formal source-credit/Back, native loader/cache/performance, science, absolute registration, continuous background, publication/adoption or independent acceptance.':
 isPeriphery?'Two complete nominal region parent envelopes at20deg and one original alpha-edge detail path use actual local v2 root/index/tile/rights, current indexed resolver, unmodified PNGs, current GPU/source-over and actually completed source credit. A controlled fine mesh failure must preserve the coarse RGBA; requested metadata with no images must have no credit. Whole-photo boundaries still need a qualified exterior background. Nominal MOC/boundary sampling are not exact raster/science support. No ordinary adoption, remote publication, native loader/cache/physical capacity, device, absolute registration or independent acceptance.':
 isRubin?'Current complete Scene/GPU and real BSC v3 consume fixed Rubin First Look regions with the same saved observer/time. Completed TAN previews, exact content/HiPS licenses, nominal MOC rays, actual current selector and cached original HTTPS PNGs are separately bound. The product mesh, shader, blend and catalogue remain unchanged. One missing M49 PNG retains its failed transport receipt and is not substituted or retried. Three small regions do not qualify full producer periphery, continuous wide background, science, absolute astrometry, native cache/physical capacity, publication, WXML/device or independent acceptance.':
 isFds?'Current complete Scene/GPU and real BSC v3 use the same exact saved observer/time. The producer initial pointing is an identified FDS region, not a catalogue object. The normal current tile selector, original equatorial FDS PNGs at the two bounded sampled orders, mesh, shader and blend are reused. Only existing cached successful HTTPS/TLS1.2 files are accepted; no Scene download, fake NOIRLab/Mellinger/2MASS identity or ordinary discovery. Registry MOC pixel-centre triage is nominal and not an exact master generation or scientific mask. Two rendered fields do not establish all FDS periphery, HDR/bright-star quality, absolute registration, native performance/cache, publication rights closure, WXML/device or independent acceptance.':
 isContinuity?'Six existing representative regions at 10 and 4 degrees. All 26 mechanically detected highest-tile alpha gaps are resampled from the original with the two-scene validated periodic/bounded geometry; original two repaired tiles are reused. Unchanged highest tiles retain exact original bytes. Mature Hipsgen TREE rebuilds lower levels; current selection, mesh, shader, catalogue and observation remain unchanged. Original completed baseline PNGs/RGBA identities are reused with current product source pins, not rerendered. Partial selected-region supply, not all-sky/high-resolution, independent astrometry, native cache/performance, WXML, publication or adoption qualification.':
 isGeometry?'Two exact current Scene selections at 4 degrees, original/direct paired. Only order4 tiles 1040 and 1528 are replaced with the separately pinned original-pixel periodic/bounded-stencil result. Other original Hipsgen neighbours, camera, time, BSC catalogue, mesh, shader and blend are unchanged; remaining neighbour or hierarchy holes are not claimed fixed. Actual completed RGBA must change and resources retire. This is not an all-sky/hierarchy, native, astrometry, high-resolution, publication or adoption qualification.':
 isRegions?'Current complete Scene/GPU and real BSC v3, same saved exact observation matrix and time. Standard Hipsgen order-4/ancestor PNGs come from the complete cached 40K source with the explicitly assumed Galactic CAR header. Only recipe-selected regions were generated; current original HiPS selection (max 12, max order 4), mesh, shader, blend and catalogue render the wanted tiles. Images for all cases are predecoded by this task, so aggregate decoded handles are not a native cache/physical memory claim. No isolated target rectangle, star removal, fabricated ODbL publication, product discovery, general high-resolution qualification, WXML, DevTools, phone or independent acceptance.':
 isHips?'Current complete Scene/GPU and real BSC v3 with the same exact saved observer/time. Twelve unmodified Hipsgen 512-square order-0 PNGs made from the cached official 4K derivative and explicitly assumed Galactic CAR header; Hipsgen outputs equatorial standard tiles. The normal optical HiPS mesh boundary uses the unchanged current shader, blend and catalogue. No fabricated ODbL publication, product discovery, resolution claim, WXML, DevTools, phone or independent acceptance.':
 'Current complete Scene/GPU plus real BSC v3 publication and exact saved observer/time geometry. Controlled data port uses explicitly identified new panorama with nominal Galactic mapping. The original infrared-like additive display and an opaque source-over photographic counterfactual are compared; the latter replaces exactly one shader alpha and blend call in this task only. Same-source native TAN previews are inserted at the existing opaque artwork boundary before catalogue stars. Source-attribution-only frame is diagnostic; catalogue remains enabled for every qualification case. This is not a product publication, resolution qualification, WXML, DevTools, phone or independent acceptance.'};
await save('result.json',result);console.log(JSON.stringify({status:result.status,failure,frames:rows.length,errors}));
if(failure||errors.length)process.exitCode=1;
