/** Repeatable diagnostic: current Scene, exact whole-source TAN, no product edits. */
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {isDeepStrictEqual} from 'node:util';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../..');
const require=createRequire(import.meta.url);
const modules='C:/Users/777/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/';
const sharp=require(modules+'sharp'),{chromium}=require(modules+'playwright');
const sha=b=>createHash('sha256').update(b).digest('hex');
const identity=b=>({bytes:b.length,sha256:sha(b)});
const read=p=>fs.readFile(path.resolve(root,p));
const json=async p=>JSON.parse(await read(p));
const psEligibility={'ps-only':{base:'original',recipe:'ps-highlight-minimum-protect-v1'},'ps-sxt':{base:'sxt',recipe:'ps-sxt-ml11-protect-v1'}};
async function checkPsReceipt(row,receipt,bind=read){
 if(!psEligibility[row.method])return;
 const sample=(await json('.codex/work-items/cloud-sky-native-2026-09-22/scripts/image-tool-full-comparison-samples.json')).samples.find(s=>s.id===row.sample);
 assert(sample&&['galaxy','galaxy-pair','nebula'].includes(sample.kind),'ps_scene_target_admission');
 assert.deepEqual(receipt.key.sample,sample);assert.equal(receipt.key.method,row.method);
 assert(sample.methods.includes(psEligibility[row.method].base),'ps_base_method_revoked');
 const recipePin=receipt.key.adapter.recipeBinding,recipeBytes=await bind(recipePin.path);
 assert.deepEqual(identity(recipeBytes),{bytes:recipePin.bytes,sha256:recipePin.sha256});
 const recipes=JSON.parse(recipeBytes);assert.deepEqual(receipt.key.recipe,recipes.recipes[row.method]);
 assert.equal(receipt.key.recipe.id,psEligibility[row.method].recipe);
 for(const pin of [receipt.key.input,receipt.key.metadata,receipt.key.normalizedInput,...receipt.key.adapter.vendorTools]){
  const bytes=await bind(pin.path);assert.deepEqual(identity(bytes),{bytes:pin.bytes,sha256:pin.sha256},'ps_source_or_tool_changed');
 }
 if(row.method==='ps-sxt'){const pin=receipt.key.adapter.action;const bytes=await bind(pin.path);assert.deepEqual(identity(bytes),{bytes:pin.bytes,sha256:pin.sha256},'ps_action_changed');}
 assert.equal(receipt.photoshop.mode,'RGB');assert.equal(receipt.photoshop.bits,8);
 assert.equal(receipt.photoshop.width,sample.width);assert.equal(receipt.ordinaryAdoption,false);
 const processedPath=path.join(path.dirname(row.receipt),'processed.png').replaceAll('\\','/');
 const outputPin=receipt.outputs.find(p=>p.path.replaceAll('\\','/')===processedPath),pixels=await bind(processedPath);
 assert(outputPin);assert.deepEqual(identity(pixels),{bytes:outputPin.bytes,sha256:outputPin.sha256});
 const meta=await sharp(pixels).metadata(),original=await sharp(await bind(receipt.key.normalizedInput.path)).metadata();
 assert(meta.icc&&original.icc&&meta.icc.equals(original.icc)&&sha(meta.icc)===receipt.finalICC,'ps_final_icc_changed');
 assert(meta.channels===3&&meta.depth==='uchar'&&meta.width===original.width&&meta.height===original.height,'ps_final_geometry_colour');
 assert.deepEqual([meta.width,meta.height],receipt.outputSize);
}
const name=process.argv[2]??'scene-r1'; assert(/^[a-z0-9-]+$/.test(name));
const mode=process.argv[4];
assert(mode===undefined||['hips','prepared'].includes(mode),'supported_scene_mode');
const output=path.join(root,mode==='prepared'?'output/prepared-scene-batch-2026-10-09':'output/image-tool-benchmark-2026-10-08',name);
await fs.mkdir(path.dirname(output),{recursive:true});
await fs.mkdir(output); // Never replace prior evidence.
const runPath=process.argv[3]??'output/image-tool-benchmark-2026-10-08/representative.json';
const run=await json(runPath);
if(mode==='prepared'){
 let result;
 try{result=await runPreparedScene(runPath,process.argv[5],output);}
 catch(error){await fs.writeFile(path.join(output,'failed.json'),JSON.stringify({status:'FAILED',error:String(error),ordinaryAdoption:false},null,2),{flag:'wx'});throw error;}
 process.exit(result.runtimeAcceptance==='FAILED'?2:0);
}
if(mode==='hips'){
 try{await runHipsScene(run,runPath,output);}
 catch(error){await fs.writeFile(path.join(output,'failed.json'),JSON.stringify({status:'FAILED',error:String(error),ordinaryAdoption:false},null,2),{flag:'wx'});throw error;}
 process.exit(0);
}
const scenePath='output/playwright/ngc253-encoding-page-1006-r3/ngc253-encoding-result.json';
const scene=(await json(scenePath)).comparisons[0].actualScene;
const templatePaths={ngc253:'.codex/work-items/cloud-sky-native-2026-09-22/tmp/ngc253-encoding-packet-2026-10-06.json',
 ngc5128:'output/prepared-ngc5128-native-1006-r1/manifest.json'};
const items=[];
const skipped=run.rows.filter(r=>r.status!=='COMPLETED_NOT_QUALITY_ACCEPTANCE');
for(const row of run.rows.filter(r=>r.status==='COMPLETED_NOT_QUALITY_ACCEPTANCE'&&r.receipt)){
 if(row.method.includes('starnet')){
  skipped.push({...row,status:'SKIPPED_LICENSE',reason:'StarNet review outputs must not become software product assets or test fixtures under bundled terms.'});continue;
 }
 if(!templatePaths[row.sample]){
  skipped.push({...row,status:'SKIPPED_UNSUPPORTED_GEOMETRY',reason:'No bound whole-source TAN template; HiPS tiles cannot be treated as TAN photographs.'});continue;
 }
 const receipt=await json(row.receipt);await checkPsReceipt(row,receipt);
 const inputPath=path.join(path.dirname(row.receipt),'processed.png'),bytes=await read(inputPath);
 const binding=receipt.outputs.find(p=>p.path.replaceAll('\\','/')===inputPath.replaceAll('\\','/'));
 assert(binding&&binding.sha256===sha(bytes)&&binding.bytes===bytes.length,'processed_binding');
 const template=await json(templatePaths[row.sample]),p=structuredClone(template.pngManifestDiagnostic??template);
 p.publicationId=`benchmark-${row.sample}-${row.method}`;
 p.processing.modification=`Local tool benchmark: ${row.method}; complete source rectangle resized; not production-adopted; no scientific colour claim.`;
 p.processing.coverage='Diagnostic whole-source rectangle at 256/512/1024 widths; no crop or reprojection; opaque geometric alpha. Pixel changes are declared by method, including generated star replacement for nox. Scientific coverage and absolute registration remain unverified.';
 p.processing.producerReceipt=identity(await read(row.receipt));
 const dir=path.join(output,`${row.sample}-${row.method}`);await fs.mkdir(dir);
 for(const [level,width] of [['OVERVIEW',256],['MEDIUM',512],['DETAIL',1024]]){
  const encoded=level==='DETAIL'?bytes:await sharp(bytes).resize({width}).png().toBuffer();
  const raw=await sharp(encoded).removeAlpha().raw().toBuffer({resolveWithObject:true});
  const file=`${p.publicationId}-${level.toLowerCase()}.png`;
  p.levels[level]={...p.levels[level],...identity(encoded),decodedRgb:identity(raw.data),file,format:'png',width:raw.info.width,height:raw.info.height};
  delete p.levels[level].downloadUrl;await fs.writeFile(path.join(dir,file),encoded,{flag:'wx'});
 }
 items.push({id:row.sample,method:row.method,publication:p,imageData:'data:image/png;base64,'+bytes.toString('base64'),inputPath,input:identity(bytes)});
}
const entry=`
import {createSkyGpuRenderer} from './apps/wechat-miniapp/src/features/sky/sky-gpu-renderer';
import {drawSkyScene} from './apps/wechat-miniapp/src/features/sky/sky-scene-render';
import {skyTargetOpticalFrame} from './apps/wechat-miniapp/src/features/sky/sky-sdss-optical-frame';
import {registerSkyNativeImageLifetime} from './apps/wechat-miniapp/src/features/sky/sky-artwork-loader';
import {skyEquatorialDirectionToEnu} from './apps/wechat-miniapp/src/features/sky/sky-observation-frame';
import {validBasis} from './apps/wechat-miniapp/src/features/sky/sky-view-projection';
import {preparedNativeOpticalPublicationHash,assertPreparedNativeOpticalManifest} from './packages/miniapp-contracts/src/prepared-native-optical-publication';
const input=${JSON.stringify({items,scene})};
const matrix=input.scene.report.observationFrames.find(f=>f.at===input.scene.at).equatorialToEnu,rad=Math.PI/180;
const unit=a=>a.map(v=>v/Math.hypot(...a)),dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0),
cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],rotate=a=>skyEquatorialDirectionToEnu(matrix,a);
function basis(ra,dec){const f=[Math.cos(dec*rad)*Math.cos(ra*rad),Math.cos(dec*rad)*Math.sin(ra*rad),Math.sin(dec*rad)],n=[0,0,1],up=unit(n.map((v,i)=>v-dot(n,f)*f[i]));
 const b={forward:rotate(f),up:rotate(up),right:rotate(cross(f,up))};if(!validBasis(b))throw Error('invalid_basis');return b;}
window.benchmark=async(index,view,off)=>{
 const item=input.items[index],p=item.publication;p.publicationHash=preparedNativeOpticalPublicationHash(p);
 for(const a of Object.values(p.levels))a.downloadUrl='/v2/sky/prepared-optical/'+p.publicationHash+'/'+a.file;
 assertPreparedNativeOpticalManifest(p,p.reference,p.publicationHash);
 const canvas=document.createElement('canvas');canvas.width=390;canvas.height=844;document.body.replaceChildren(canvas);
 const gl=canvas.getContext('webgl',{preserveDrawingBuffer:true,antialias:false,alpha:false});if(!gl)throw Error('no_webgl');
 const live={},original={};for(const kind of ['Texture','Framebuffer','Renderbuffer','Program','Buffer']){
  live[kind]=new Set();for(const op of ['create','delete'])original[op+kind]=gl[op+kind].bind(gl);
  gl['create'+kind]=()=>{const v=original['create'+kind]();if(v)live[kind].add(v);return v;};
  gl['delete'+kind]=v=>{live[kind].delete(v);return original['delete'+kind](v);};}
 const failed=[],renderer=createSkyGpuRenderer(gl,1,{imageFailed:()=>failed.push('image'),artworkContributions:{auxiliaryBytesLimit:2*1024*1024,maxGroups:1}});
 let retire=()=>{},image=null,decodeSeconds=0,completed=0,sources=null,snapshot=null,draws=[];
 try{
  if(!off){const t=performance.now();image=new Image();image.src=item.imageData;await image.decode();decodeSeconds=(performance.now()-t)/1000;retire=registerSkyNativeImageLifetime(image,()=>true);}
  const originalLevels=renderer.artworkLevels.bind(renderer);renderer.artworkLevels=(...args)=>{const result=originalLevels(...args);draws.push(result);return result;};
  const fov=p.levels.DETAIL.fieldDegrees*(844/390)*(view==='wide'?1.4:.55),camera=basis(...p.nominalTan.referenceValue);
  const args=[renderer,input.scene.report,input.scene.at,null,null,390,844,'DAY',(s,src)=>{snapshot=s;sources=src;},()=>completed++,fov,null,camera];
  if(!off){args[30]=skyTargetOpticalFrame({publication:p,image,renderedLevel:'DETAIL',renderedAsset:p.levels.DETAIL,coarser:null});
   if(!args[30])throw Error('frame_rejected');args[31]=()=>failed.push('optical');args[37]={surface:renderer,reference:p.reference,publicationHash:p.publicationHash};}
  const t=performance.now();drawSkyScene(...args);gl.finish();const pixels=new Uint8Array(390*844*4);gl.readPixels(0,0,390,844,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
  const renderSeconds=(performance.now()-t)/1000,error=gl.getError(),contributionFault=renderer.artworkContributionsFailed();
  let b='';for(let i=0;i<pixels.length;i+=32768)b+=String.fromCharCode(...pixels.subarray(i,i+32768));
  const completion=sources?.sdssOptical;const result={png:canvas.toDataURL().split(',')[1],rgba:btoa(b),decodeSeconds,renderSeconds,error,completed,failed,draws,
   contributionFault,completion:completion?{publicationHash:completion.publicationHash,reference:completion.reference}:null,
   objects:snapshot?.objects?.length??0,publication:p,camera,fov,off,view};
  renderer.dispose();retire();result.liveAfterDispose=Object.fromEntries(Object.entries(live).map(([k,v])=>[k,v.size]));return result;
 }finally{renderer.dispose();retire();gl.getExtension('WEBGL_lose_context')?.loseContext();}
};`;
const bundle=await build({stdin:{contents:entry,resolveDir:root,sourcefile:'image-benchmark-scene-entry.ts',loader:'ts'},bundle:true,write:false,platform:'browser',format:'iife',metafile:true});
const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader']});
const results=[],offPixels=new Map();
try{
 const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.setContent('<!doctype html><style>body{margin:0}</style>');await page.addScriptTag({content:bundle.outputFiles[0].text});
 for(let i=0;i<items.length;i++)for(const view of ['wide','detail']){
  const item=items[i],offKey=item.id+view;
  for(const off of offPixels.has(offKey)?[false]:[true,false]){
   const r=await page.evaluate(([i,v,o])=>window.benchmark(i,v,o),[i,view,off]);
   const pixels=Buffer.from(r.rgba,'base64');delete r.rgba;
   const filename=`${item.id}-${off?'off':item.method}-${view}.png`,png=Buffer.from(r.png,'base64');delete r.png;
   await fs.writeFile(path.join(output,filename),png,{flag:'wx'});
   if(off)offPixels.set(offKey,pixels);else{
    const baseline=offPixels.get(offKey);let changed=0;for(let j=0;j<pixels.length;j+=4)if(!pixels.subarray(j,j+3).equals(baseline.subarray(j,j+3)))changed++;
    r.changedPixelsVsOff=changed;await fs.writeFile(path.join(output,filename+'.json'),JSON.stringify(r,null,2),{flag:'wx'});assert(changed>1000,'no_visible_effect');assert(r.draws.some(d=>d.submitted&&d.finePrepared),'not_submitted');
    assert(r.completion?.publicationHash===r.publication.publicationHash,'no_exact_completed_source');}
   assert.equal(r.completed,1);assert.equal(r.error,0);assert.equal(r.failed.length,0);assert(!r.contributionFault);
   assert(Object.values(r.liveAfterDispose).every(v=>v===0),'resource_leak');
   results.push({id:item.id,method:off?'off':item.method,...r,file:filename,encoded:identity(png)});
   console.log(JSON.stringify({id:item.id,method:off?'off':item.method,view,changed:r.changedPixelsVsOff,seconds:r.renderSeconds}));
  }
 }
 assert.equal(errors.length,0);
 const sourceBindings=[];for(const file of Object.keys(bundle.metafile.inputs))sourceBindings.push({path:file,...identity(file==='image-benchmark-scene-entry.ts'?Buffer.from(entry):await read(file))});
 for(const id of new Set(items.map(i=>i.id)))for(const view of ['wide','detail']){
  const panels=results.filter(r=>r.id===id&&r.view===view&&r.method!=='off');
  const images=panels.map((r,i)=>({input:path.join(output,r.file),left:i*390,top:30}));
  const labels=Buffer.from('<svg width="'+panels.length*390+'" height="30">'+panels.map((r,i)=>'<text x="'+(i*390+8)+'" y="20" fill="white" font-size="14">'+id+' '+r.method+' '+view+'</text>').join('')+'</svg>');
  await sharp({create:{width:panels.length*390,height:874,channels:3,background:'#202020'}}).composite([...images,{input:labels,left:0,top:0}]).png().toFile(path.join(output,id+'-'+view+'-comparison.png'));
 }
 await fs.writeFile(path.join(output,'result.json'),JSON.stringify({results,skipped,items:items.map(({imageData,...i})=>i),sourceBindings,
  processingRun:{path:runPath,...identity(await read(runPath))},
  sceneInput:{path:scenePath,...identity(await read(scenePath))},runner:identity(await read(fileURLToPath(import.meta.url))),
  renderer:'current Scene/GPU via Chromium software WebGL; not target device acceptance',ordinaryAdoption:false,absoluteRegistration:'UNVERIFIED',science:'UNKNOWN'},null,2),{flag:'wx'});
}finally{await browser.close();}

/** All file-qualified native candidates in one pinned inventory declaration.
 * Use exact existing publication/LOD bytes and the actual BFF/BSC/SAO owners;
 * no object templates, product encodes, browser journey or ordinary adoption.
 * Pixel probes establish delivery/effect/retirement, never visual acceptance. */
async function runPreparedScene(runPath,pin,output){
 assert(/^[a-f0-9]{64}$/.test(pin??''),'prepared_inventory_pin_required');
 const runnerPath=path.relative(root,fileURLToPath(import.meta.url)).split(path.sep).join('/');
 const runnerBytes=await read(runnerPath),runnerBefore=identity(runnerBytes);
 await fs.writeFile(path.join(output,'executed-runner.mjs'),runnerBytes,{flag:'wx'});
 await import('reflect-metadata');
 const {pathToFileURL}=await import('node:url');
 const {inventoryFileBinding,inspectPreparedInventory}=await import('../../../../data-pipelines/deep-sky/prepared_inventory.mts');
 const {PreparedOpticalImageryService}=await import('../../../../workers/miniapp-api/src/prepared-optical-imagery.ts');
 const {GalacticImagePublicationService}=await import('../../../../workers/miniapp-api/src/galactic-image-publication.ts');
 const {createTestMiniappService}=await import('../../../../workers/miniapp-api/src/test-fixtures/create-test-service.ts');
 const {createBsc5pSkyCatalogProvider}=await import('../../../../workers/miniapp-api/src/sky-scene-catalog-provider.ts');
 const {loadBsc5pStarCatalog}=await import('../../../../packages/astronomy-core/src/bsc5p-catalog.ts');
 const {StellarCatalogPublicationService}=await import('../../../../workers/miniapp-api/src/stellar-catalog-publication.ts');
 const {SaoPublicationService}=await import('../../../../workers/miniapp-api/src/sao-publication.ts');
 const {CURRENT_DEEP_SKY_CATALOG_VERSION}=await import('../../../../packages/miniapp-contracts/src/celestial-identity.ts');
 const {TEST_PUBLISHED_SPOT}=await import('../../../../packages/miniapp-contracts/src/catalog.ts');
 const {attachSkyCatalog}=await import('../../../../apps/wechat-miniapp/src/features/sky/sky-stellar-scene.ts');
 const {selectSkyStellarTiles}=await import('../../../../apps/wechat-miniapp/src/features/sky/sky-stellar-tile-selection.ts');
 const {skySolarLightAt}=await import('../../../../apps/wechat-miniapp/src/features/sky/sky-solar-light.ts');
 const selected=await inventoryFileBinding(root,runPath);assert.equal(selected.sha256,pin);
 const declaration=await json(runPath),sceneChecks=declaration.sceneChecks;
 const regionCollection=sceneChecks?.consumer==='ordinary-region-collection-v1';
 assert(sceneChecks?.consumer===undefined||regionCollection,'unknown_prepared_consumer');
 if(sceneChecks?.publicationHashes)assert(Array.isArray(sceneChecks.publicationHashes)&&sceneChecks.publicationHashes.length>0&&
  sceneChecks.publicationHashes.every(hash=>/^[a-f0-9]{64}$/.test(hash)),'invalid_prepared_subset');
 assert(!sceneChecks||['registered-display-v1','illumination-display-v1','full-source-illumination-v1','full-source-display-v1','full-source-precheck-v1','region-collection-lifecycle-v1'].includes(sceneChecks.profile),'unknown_prepared_scene_checks');
 const collectionLifecycle=sceneChecks?.profile==='region-collection-lifecycle-v1';
 if(collectionLifecycle)assert(regionCollection,'collection_lifecycle_requires_normal_region_consumer');
 const precheck=sceneChecks?.profile==='full-source-precheck-v1';
 const fullSourceDisplay=sceneChecks?.profile==='full-source-display-v1';
 const fullSourceIllumination=sceneChecks?.profile==='full-source-illumination-v1';
 const illumination=sceneChecks?.profile==='illumination-display-v1'||fullSourceIllumination;
 if(fullSourceIllumination||fullSourceDisplay||precheck)assert(!sceneChecks.measurements,'full_source_profile_does_not_certify_registration');
 const ratios=precheck?[1]:illumination?[2]:sceneChecks?[1,2]:[1];
 const inventory=await inspectPreparedInventory(root,selected);
 await fs.writeFile(path.join(output,'inventory.json'),JSON.stringify(inventory,null,2),{flag:'wx'});
 const bindings=new Map(),bind=async p=>{const bytes=await read(p),value={path:p,...identity(bytes)};
  const prior=bindings.get(p);if(prior)assert.deepEqual(value,prior,'input_changed');bindings.set(p,value);return bytes;};
 const bindExpected=async value=>{const bytes=await bind(value.path);assert.deepEqual(identity(bytes),{bytes:value.bytes,sha256:value.sha256});return bytes;};
 await bindExpected(selected);
 const sceneProfile=collectionLifecycle?'prepared-region-collection-persistent-gpu-lifecycle-v1':precheck?'prepared-full-source-current-galactic-coarse-precheck-v1':
  fullSourceIllumination?'prepared-full-source-current-galactic-illumination-dpr2-v1':
  fullSourceDisplay?'prepared-full-source-current-galactic-wide-detail-maxzoom-dpr-v1':
  illumination?'prepared-registered-current-galactic-illumination-dpr2-v1':
  sceneChecks?'prepared-registered-current-galactic-wide-detail-maxzoom-dpr-v1':'prepared-native-current-galactic-wide-detail-v1';
 const galacticOwner=new GalacticImagePublicationService(),galacticPublication=galacticOwner.manifest();
 const galacticDirectory='workers/miniapp-api/assets/deep-sky/galactic-mellinger/';
 await bind('workers/miniapp-api/src/galactic-image-publication.ts');
 await bind(galacticDirectory+'manifest.json');
 const suppliedGalactic=await galacticOwner.image(galacticPublication.publicationHash,galacticPublication.image.file);
 const storedGalactic=await bind(galacticDirectory+galacticPublication.image.file);
 assert.deepEqual(storedGalactic,suppliedGalactic,'current_galactic_file_service_join');
 assert.deepEqual(identity(storedGalactic),{bytes:galacticPublication.image.bytes,sha256:galacticPublication.image.sha256});
 const galacticBackground={publication:galacticPublication,manifest:bindings.get(galacticDirectory+'manifest.json'),
  image:bindings.get(galacticDirectory+galacticPublication.image.file)};
 const queued=[],eligible=new Map();
 for(const row of inventory.rows){
  if(sceneChecks?.publicationHashes&&!sceneChecks.publicationHashes.includes(row.publicationHash))continue;
  if(row.error||!row.manifest||row.fileReview!=='FILE_REVIEW_PASSED_SCENE_PENDING'){
   queued.push({id:row.id,status:'NOT_RENDERED_REVIEW_EXCEPTION',fileReview:row.fileReview,error:row.error,blockers:row.blockers});continue;}
  if(['PASSED','FAILED'].includes(row.scene)&&row.reviewDecisions?.SCENE){
   // The inventory owner has checked the exact manifest/evidence and current
   // Scene implementation. Reuse the decision only within its measured scope;
   // an earlier isolated-photo diagnostic did not load the current background.
   let sameScope=false;
   for(const evidence of row.reviewDecisions.SCENE.evidence??[])if(evidence.path.endsWith('.json')){
    const prior=JSON.parse(await bindExpected(evidence));
    if(prior.sceneProfile===sceneProfile&&isDeepStrictEqual(prior.galacticBackground,galacticBackground)){
     const priorChecks=prior.sceneChecks??(prior.inventoryInput?JSON.parse(await bindExpected(prior.inventoryInput)).sceneChecks:undefined);
     if(isDeepStrictEqual(priorChecks,sceneChecks))sameScope=true;
    }
   }
   queued.push({id:row.id,publicationHash:row.publicationHash,
    status:sameScope?'REUSED_CURRENT_SCENE_DECISION':'RETAINED_SCENE_DIFFERENT_SCOPE',
    scene:row.scene,decision:row.reviewDecisions.SCENE});if(sameScope)continue;}
  const p=JSON.parse(await bindExpected(row.manifest));
  if(p.imageVersion!=='prepared-native-optical-v1'){
   queued.push({id:row.id,status:'NOT_RENDERED_DIFFERENT_MECHANISM',imageVersion:p.imageVersion});continue;}
  if(!eligible.has(row.publicationHash))eligible.set(row.publicationHash,{row,publication:p});
 }
 if(!eligible.size){
  assert.deepEqual(identity(await bind(runnerPath)),runnerBefore,'runner_changed_during_execution');
  for(const value of bindings.values())await bindExpected(value);
  const after=await inspectPreparedInventory(root,selected);assert.deepEqual(after,inventory,'inventory_changed_during_readback');
  const result={status:'NO_NEW_PREPARED_SCENE_WORK',runtimeAcceptance:inventory.exceptions.length?'FAILED':'NOT_RUN',
   results:[],queued,inventoryExceptions:inventory.exceptions,inventoryInput:selected,
   executedRunner:{file:'executed-runner.mjs',...runnerBefore},inputReadback:'PASS',
   renderer:'NOT_STARTED',ordinaryAdoption:false,sceneProfile,galacticBackground,
   meaning:'Current byte/implementation-bound Scene decisions are reused; file exceptions remain queued. No new frames or quality approval.'};
  await fs.writeFile(path.join(output,'result.json'),JSON.stringify(result,null,2),{flag:'wx'});
  return result;
 }
 const fixtureObserver=sceneChecks?.fixtureObserver;
 let repository;
 if(fixtureObserver){
  assert(Number.isFinite(fixtureObserver.latitude)&&Math.abs(fixtureObserver.latitude)<=90&&
   Number.isFinite(fixtureObserver.longitude)&&Math.abs(fixtureObserver.longitude)<=180&&
   Number.isFinite(fixtureObserver.elevationM),'fixture_observer_invalid');
  const {InMemoryTestRepository}=await import('../../../../workers/miniapp-api/src/test-fixtures/in-memory-repository.ts');
  repository=new InMemoryTestRepository([{...structuredClone(TEST_PUBLISHED_SPOT),
   wgs84:{system:'WGS84',latitude:fixtureObserver.latitude,longitude:fixtureObserver.longitude},elevationM:fixtureObserver.elevationM}]);
 }
 const service=createTestMiniappService({repository,skyCatalog:createBsc5pSkyCatalogProvider('bsc5p-bright-stars.v3')});
 const observationContext=sceneChecks?.observationContext??declaration.observationContext??{localDate:'2026-10-09',selectedAt:'2026-10-09T13:00:00.000Z'};
 assert(/^\d{4}-\d{2}-\d{2}$/.test(observationContext.localDate)&&Number.isFinite(Date.parse(observationContext.selectedAt)),'scene_context_invalid');
 const context=(await service.resolveObservationContext({location:{kind:'FORMAL_SPOT',spotId:TEST_PUBLISHED_SPOT.spotId},
  ...observationContext})).data;
 const report=(await service.getSky(TEST_PUBLISHED_SPOT.spotId,context.contextId,undefined,
  'bsc5p-bright-stars.v3',CURRENT_DEEP_SKY_CATALOG_VERSION)).data;
 const at=report.hourly.find(row=>row.at===observationContext.selectedAt)?.at;
 assert(at);const observation=report.observationFrames.find(frame=>frame.at===at);assert(observation);
 const catalog=new StellarCatalogPublicationService().get(loadBsc5pStarCatalog('bsc5p-bright-stars.v3')).data;
 assert.equal(catalog.rows.length,8404);const resolved=attachSkyCatalog(report,catalog);
 assert.equal(resolved.skyScene.state,'AVAILABLE');
 const geometry=resolved.skyScene.frames.find(frame=>frame.at===at)?.geometry;assert(geometry);
 const lightRanges={day:[0,90],civil:[-6,0],nautical:[-12,-6],astronomical:[-18,-12],night:[-90,-18]};
 const declaredLightFrames=illumination?sceneChecks.illuminationTimes:[{name:'night',at}];
 assert(Array.isArray(declaredLightFrames)&&declaredLightFrames.length===(illumination?5:1),'illumination_times_invalid');
 const lightFrames=declaredLightFrames.map(row=>({...row}));
 if(illumination)assert.deepEqual(lightFrames.map(row=>row.name).sort(),Object.keys(lightRanges).sort());
 for(const light of lightFrames){
  const sun=skySolarLightAt(report.hourly,light.at),frame=report.observationFrames.find(f=>f.at===light.at);
  assert(sun&&frame&&resolved.skyScene.frames.some(f=>f.at===light.at&&f.geometry),'illumination_exact_frame_missing');
  if(illumination){const [low,high]=lightRanges[light.name];assert(sun.altitudeDeg>=low&&sun.altitudeDeg<high,'illumination_range_mismatch');}
  light.sunAltitudeDeg=sun.altitudeDeg;
  light.sunDirection=sun.direction;
 }
 const viewConstraints=sceneChecks?.viewConstraints;
 if(viewConstraints)assert((illumination||fullSourceDisplay)&&Number.isFinite(viewConstraints.minTargetAltitudeDeg)&&
  viewConstraints.minTargetAltitudeDeg>=-90&&viewConstraints.minTargetAltitudeDeg<=90&&
  Number.isFinite(viewConstraints.minSunSeparationDeg)&&viewConstraints.minSunSeparationDeg>=0&&viewConstraints.minSunSeparationDeg<=180,'illumination_view_constraints_invalid');
 let reusedSharedControls=null,illuminationBaseline=null;
 if(illumination){
  const baseline=JSON.parse(await bindExpected(sceneChecks.baselineScene));
  const baselineProfile=fullSourceIllumination?'prepared-native-current-galactic-wide-detail-v1':'prepared-registered-current-galactic-wide-detail-maxzoom-dpr-v1';
  assert(baseline.runtimeAcceptance==='PASSED'&&(baseline.sceneProfile===baselineProfile||fullSourceIllumination&&
   baseline.sceneProfile==='prepared-full-source-current-galactic-wide-detail-maxzoom-dpr-v1'),'illumination_baseline_not_qualified');
  assert.deepEqual(baseline.galacticBackground,galacticBackground,'illumination_background_changed');
  assert(baseline.catalogChangedPixels>0&&baseline.galacticChangedPixels>0,'illumination_shared_controls_missing');
  for(const source of baseline.parsedSourceBindings)await bindExpected(source);
  for(const source of baseline.inputBindings.filter(v=>/^(?:apps|packages|workers)\/.*\.(?:ts|tsx|json)$/.test(v.path)))await bindExpected(source);
  assert([...eligible.keys()].every(hash=>baseline.items.some(item=>item.publication.publicationHash===hash)),'illumination_baseline_publication_differs');
  reusedSharedControls={evidence:sceneChecks.baselineScene,catalogChangedPixels:baseline.catalogChangedPixels,
   galacticChangedPixels:baseline.galacticChangedPixels,meaning:'Unchanged production owners and exact publication/background; prior night catalogue/galactic controls reused, not rerendered.'};
  if(isDeepStrictEqual(baseline.sceneChecks?.fixtureObserver,sceneChecks.fixtureObserver))illuminationBaseline=baseline;
 }
 // Match the existing public v2 route, whose SAO edition is based on BSC v3.
 // The retained default owner serves BSC v2 and must not be mixed into v3.
 const saoDirectory='workers/miniapp-api/assets/sao-v2/';
 const saoOwner=new SaoPublicationService(pathToFileURL(path.resolve(root,saoDirectory)+path.sep)),saoPublication=(await saoOwner.get()).data;
 assert.equal(saoPublication.index.baseCatalogVersion,catalog.catalogVersion);
 assert.equal(saoPublication.index.baseAssetSha256,catalog.catalogHash);
 await bind(saoDirectory+'publication.json');await bind(saoDirectory+'index.json');
 const width=390,height=844,rad=Math.PI/180;
 const unit=v=>v.map(n=>n/Math.hypot(...v)),dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
 const basis=(ra,dec,frame=observation)=>{const m=frame.equatorialToEnu,
  rotate=v=>[0,1,2].map(i=>m[3*i]*v[0]+m[3*i+1]*v[1]+m[3*i+2]*v[2]),
  f=[Math.cos(dec*rad)*Math.cos(ra*rad),Math.cos(dec*rad)*Math.sin(ra*rad),Math.sin(dec*rad)],
  n=[0,0,1],up=unit(n.map((v,i)=>v-dot(n,f)*f[i]));return {forward:rotate(f),up:rotate(up),right:rotate(cross(f,up))};};
 const items=[];
 const {SKY_MIN_VERTICAL_FOV_DEG}=await import('../../../../apps/wechat-miniapp/src/features/sky/sky-zoom.ts');
 for(const {row,publication}of eligible.values()){
  const owner=new PreparedOpticalImageryService([{reference:row.reference,expectedHash:row.publicationHash,
   manifestUrl:pathToFileURL(path.resolve(root,row.manifest.path))}]);
  const p=owner.manifest(row.publicationHash);assert.deepEqual(p,publication);
  const camera=basis(...p.nominalTan.referenceValue),views=['wide','detail'].map(view=>({view,
   fov:Math.max(SKY_MIN_VERTICAL_FOV_DEG,p.levels.DETAIL.fieldDegrees*(height/width)*(view==='wide'?1.4:.55))}));
  let measurement=null;
  if(fullSourceDisplay&&!views.some(value=>value.fov===SKY_MIN_VERTICAL_FOV_DEG))
   views.push({view:'maxzoom',fov:SKY_MIN_VERTICAL_FOV_DEG});
  if(sceneChecks&&!fullSourceIllumination&&!fullSourceDisplay&&!precheck&&!collectionLifecycle){
   const check=sceneChecks.measurements.find(v=>v.publicationHash===p.publicationHash);assert(check&&p.registration,'registered_measurement_missing');
   assert.deepEqual({bytes:check.measurement.bytes,sha256:check.measurement.sha256},p.registration.evidence);
   measurement=JSON.parse(await bindExpected(check.measurement));
   if(!illumination)views.push({view:'maxzoom',fov:SKY_MIN_VERTICAL_FOV_DEG});
  }
  if(views.some(view=>!(view.fov>0&&view.fov<180))){
   queued.push({id:row.id,status:'NOT_RENDERED_DIFFERENT_VIEW_MECHANISM',reason:'This complete-source angular extent needs a separately qualified camera profile.'});continue;}
  const cameras=Object.fromEntries(lightFrames.map(light=>[light.name,
   basis(...p.nominalTan.referenceValue,report.observationFrames.find(frame=>frame.at===light.at))]));
  const wanted=new Map();
  for(const light of lightFrames)for(const view of views)for(const tile of selectSkyStellarTiles(saoPublication.index.tiles,{
   frame:resolved.skyScene.frames.find(frame=>frame.at===light.at).geometry,
   expected:{catalog,at:light.at,observer:resolved.skyScene.observer},basis:cameras[light.name],width,height,
   verticalFovDeg:view.fov,sunAltitudeDeg:light.sunAltitudeDeg}))wanted.set(tile.id,tile);
  let saoSelectedRows=0;
  for(const tile of wanted.values()){
   const actual=await saoOwner.asset(saoPublication.publicationHash,tile.id);
   const raw=await bind(saoDirectory+tile.file);assert.deepEqual(raw,actual.bytes);
   saoSelectedRows+=(await saoOwner.tile(saoPublication.publicationHash,tile.id)).data.tile.rows.length;
  }
  const levels={};
  for(const [level,asset]of Object.entries(p.levels)){
   const supplied=row.assets.find(value=>value.role==='IMAGE'&&value.level===level);assert(supplied);
   // The inventory already admitted all exact file/service bytes. Retain only
   // a descriptor here; capture streams one encoded level into one frame.
   levels[level]={asset,file:supplied.file};
  }
  items.push({id:row.id,publication:p,manifest:row.manifest,levels,camera,cameras,views,measurement,
   saoSelectedTiles:[...wanted.keys()],saoSelectedRows});
 }
 assert(items.length>0,'no_supported_native_views');
 const conditionalDiscovery=collectionLifecycle?new PreparedOpticalImageryService(items.map(item=>({
  reference:item.publication.reference,expectedHash:item.publication.publicationHash,
  manifestUrl:pathToFileURL(path.resolve(root,item.manifest.path))})),items.map(item=>item.publication.publicationHash)).discovery():null;
 const nodeOwners=['data-pipelines/deep-sky/prepared_inventory.mts','workers/miniapp-api/src/prepared-optical-imagery.ts',
  'workers/miniapp-api/src/miniapp-service.ts','workers/miniapp-api/src/sky-scene-catalog-provider.ts','workers/miniapp-api/src/stellar-catalog-publication.ts',
  'workers/miniapp-api/src/stellar-geometry-provider.ts','workers/miniapp-api/src/deep-sky-scene-provider.ts','workers/miniapp-api/src/sao-publication.ts',
  'workers/miniapp-api/src/sao-publication.controller.ts',
  'workers/miniapp-api/src/test-fixtures/create-test-service.ts','workers/miniapp-api/src/test-fixtures/deterministic-weather-adapter.ts',
  'workers/miniapp-api/src/test-fixtures/in-memory-repository.ts','packages/astronomy-core/src/deep-sky-catalog.ts',
  'packages/astronomy-core/src/deep-sky-catalog-data.ts','packages/astronomy-core/src/bsc5p-catalog.ts',
  'packages/astronomy-core/data/bsc5p-bright-stars.v3.json','packages/astronomy-core/data/bsc5p-bright-stars.v3.manifest.json',
  'packages/astronomy-core/data/opengc-deep-sky.v3.json','packages/astronomy-core/data/opengc-deep-sky.v3.manifest.json'];
 for(const p of nodeOwners)await bind(p);
 await fs.writeFile(path.join(output,'scene-input.json'),JSON.stringify({report,catalog,saoPublication,at,lightFrames,context,
  fixture:'Existing formal-spot repository and weather test adapters; real current astronomy/catalog/geometry. No live/production/device claim.'},null,2),{flag:'wx'});
 const entry=`
import {createSkyGpuRenderer} from './apps/wechat-miniapp/src/features/sky/sky-gpu-renderer';
import {drawSkyScene} from './apps/wechat-miniapp/src/features/sky/sky-scene-render';
import {skyTargetOpticalFrame} from './apps/wechat-miniapp/src/features/sky/sky-sdss-optical-frame';
import {registerSkyNativeImageLifetime} from './apps/wechat-miniapp/src/features/sky/sky-artwork-loader';
import {attachSkyCatalog,resolveSkySceneFrame} from './apps/wechat-miniapp/src/features/sky/sky-stellar-scene';
import {resolveSkyStellarSupplement} from './apps/wechat-miniapp/src/features/sky/sky-stellar-supplement-scene';
import {validBasis,createSkyViewBasis} from './apps/wechat-miniapp/src/features/sky/sky-view-projection';
import {assertPreparedNativeOpticalManifest} from './packages/miniapp-contracts/src/prepared-native-optical-publication';
import {registerSkyTanOpticalField} from './apps/wechat-miniapp/src/features/sky/sky-tan-optical-registration';
import {skyArtworkUvAtDirection} from './apps/wechat-miniapp/src/features/sky/sky-artwork-registration';
import {skyEquatorialDirectionToEnu} from './apps/wechat-miniapp/src/features/sky/sky-observation-frame';
import {skyOpticalPixelMagnification} from './apps/wechat-miniapp/src/features/sky/sky-optical-pixel-sampling';
import {skyArtworkContributionFrameBudget} from './apps/wechat-miniapp/src/features/sky/sky-gpu-artwork-contributions';
import {acceptedSkyPreparedRegionCompletions} from './apps/wechat-miniapp/src/features/sky/sky-prepared-region-frame';
import {skyOpticalSourceCredit} from './apps/wechat-miniapp/src/features/sky/sky-optical-source-credit';
import {skyPreparedRegionSelections} from './apps/wechat-miniapp/src/features/sky/sky-prepared-region-selection';
import {skyDomeFieldOfView} from './apps/wechat-miniapp/src/features/sky/sky-zoom';
import {skyNativeImageIsCurrent} from './apps/wechat-miniapp/src/features/sky/sky-artwork-loader';
 const input=${JSON.stringify({items,report,catalog,saoPublication,at,lightFrames,galacticPublication,conditionalDiscovery})};
const resolved=attachSkyCatalog(input.report,input.catalog);
if(resolveSkySceneFrame(resolved.skyScene,input.at)?.points.length!==8404)throw Error('real_catalog_missing');
let currentSaoTiles=[];
window.preparedSceneTiles=tiles=>{currentSaoTiles=tiles;};
window.preparedScene=async(index,view,level,photoOff=false,catalogOff=false,imageData=null,galacticData=null,galacticOff=false,pixelRatio=1,lightName='night',collection=null)=>{
 const item=input.items[index],p=item.publication,light=input.lightFrames.find(row=>row.name===lightName);
 if(!light)throw Error('illumination_condition_missing');
 let camera=collection?createSkyViewBasis(0,180,0):item.cameras[lightName];const frameAt=light.at;
 if(!validBasis(camera))throw Error('invalid_camera');assertPreparedNativeOpticalManifest(p,p.reference,p.publicationHash);
 let fov=collection?skyDomeFieldOfView(390,844):view==='catalogue'?60:item.views.find(v=>v.view===view).fov;
 const canvas=document.createElement('canvas');canvas.width=390*pixelRatio;canvas.height=844*pixelRatio;
 canvas.style.width='390px';canvas.style.height='844px';document.body.replaceChildren(canvas);
 const gl=canvas.getContext('webgl',{preserveDrawingBuffer:true,antialias:false,alpha:false});if(!gl)throw Error('webgl_missing');
 // Keep bounded driver diagnostics without consuming an error ahead of its
 // actual owner or changing a draw's result.
 const graphicsFaults=[],graphicsOperations=[];
 for(const name of ['copyTexSubImage2D','texImage2D','framebufferTexture2D','vertexAttribPointer']){
  const actual=gl[name].bind(gl);gl[name]=(...args)=>{
   graphicsOperations.push(name);if(graphicsOperations.length>16)graphicsOperations.shift();
   try{return actual(...args);}catch(error){if(graphicsFaults.length<16)graphicsFaults.push({operation:name,error:String(error)});throw error;}
  };
 }
 const actualGetError=gl.getError.bind(gl);gl.getError=()=>{
  const error=actualGetError();if(error!==gl.NO_ERROR&&graphicsFaults.length<16)
   graphicsFaults.push({error,operations:[...graphicsOperations]});return error;
 };
 const live={},original={};for(const kind of ['Texture','Framebuffer','Renderbuffer','Program','Buffer']){
  live[kind]=new Set();for(const op of ['create','delete'])original[op+kind]=gl[op+kind].bind(gl);
  gl['create'+kind]=()=>{const value=original['create'+kind]();if(value)live[kind].add(value);return value;};
  gl['delete'+kind]=value=>{live[kind].delete(value);return original['delete'+kind](value);};}
 const budget=item.measurement||pixelRatio>1?skyArtworkContributionFrameBudget(canvas.width,canvas.height,1):{auxiliaryBytesLimit:2*1024*1024,maxGroups:1};
 const regionCollection=${regionCollection};
 let regionalGroupCount=photoOff?0:1;
 const failed=[],renderer=createSkyGpuRenderer(gl,pixelRatio,{imageFailed:()=>failed.push('image'),
  artworkContributions:regionCollection?()=>skyArtworkContributionFrameBudget(canvas.width,canvas.height,regionalGroupCount):budget}),retire=[];
 let snapshot=null,sources=null,completed=0,decodeSeconds=0,galacticDecodeSeconds=0,draws=[];
 try{
  const report=catalogOff?{...resolved,skyScene:{...resolved.skyScene,state:'UNAVAILABLE',catalog:null,publication:null}}:resolved;
  const args=[renderer,report,frameAt,null,null,390,844,'DAY',(s,src)=>{snapshot=s;sources=src;},()=>completed++,fov,null,camera];
  if(!galacticOff){
   const started=performance.now(),image=new Image();image.src=galacticData;await image.decode();
   retire.push(registerSkyNativeImageLifetime(image,()=>true));galacticDecodeSeconds=(performance.now()-started)/1000;
   args[26]=image;args[39]=input.galacticPublication;args[23]=()=>failed.push('galactic');
  }
  if(!catalogOff)args[16]=resolveSkyStellarSupplement(input.saoPublication,currentSaoTiles,resolved.skyScene,frameAt);
  // The Sun is also kind STAR. Count only identities supplied by the actual
  // catalogue owners when verifying catalogue-on/off effects.
  const catalogueReferences=new Set([...resolved.skyScene.catalog.entries.map(value=>value.objectRef),
   ...(args[16]?.points??[]).map(value=>value[0])]);
  const realDraw=renderer.artworkLevels.bind(renderer);renderer.artworkLevels=(...a)=>{const draw=realDraw(...a);draws.push(draw);return draw;};
  const decodedFields=new Map();
  const decodeField=async(fieldIndex,data)=>{
   const publication=input.items[fieldIndex].publication,started=performance.now(),image=new Image();image.src=data;await image.decode();
   const done=registerSkyNativeImageLifetime(image,()=>true);retire.push(done);decodeSeconds+=(performance.now()-started)/1000;
   const frame=skyTargetOpticalFrame({publication,image,renderedLevel:level,renderedAsset:publication.levels[level],coarser:null});
   if(!frame)throw Error('prepared_frame_rejected');
   decodedFields.set(fieldIndex,{frame,done,port:{surface:renderer,reference:publication.reference,publicationHash:publication.publicationHash}});
  };
  if(!photoOff){
   if(collection){for(const field of imageData)await decodeField(field.index,field.data);}
   else await decodeField(index,imageData);
   args[31]=()=>failed.push('optical');
   if(regionCollection){
    for(const value of decodedFields.values())if(!value.frame.reference.startsWith('REGION:'))throw Error('region_consumer_object_identity');
    args[40]=[...decodedFields.values()].map(({frame,port})=>({frame,port}));
   }else{args[30]=decodedFields.get(index).frame;args[37]=decodedFields.get(index).port;}
  }
  const captureFrame=()=>{
  completed=0;sources=null;snapshot=null;draws=[];
  const started=performance.now();drawSkyScene(...args);gl.finish();const pixels=new Uint8Array(canvas.width*canvas.height*4);
  gl.readPixels(0,0,canvas.width,canvas.height,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
  let registrationReadback=null;
  if(item.measurement&&!photoOff&&!collection){
   const observation=input.report.observationFrames.find(frame=>frame.at===frameAt),plane=registerSkyTanOpticalField(p,p.levels[level],observation);
   if(!plane)throw Error('measured_plane_rejected');
   const g=p.registration.geometry,rad=Math.PI/180;
   const samples=item.measurement.observations.map(row=>{
    const [ra,dec]=row.referenceIcrsDegrees.map(v=>v*rad),direction=skyEquatorialDirectionToEnu(observation.equatorialToEnu,
     [Math.cos(dec)*Math.cos(ra),Math.cos(dec)*Math.sin(ra),Math.sin(dec)]),uv=skyArtworkUvAtDirection(plane,direction);
    if(!uv)throw Error('reference_outside_plane');
    const residual=[uv[0]*g.sourceWidth-.5-row.measuredPixelTopFirst[0],uv[1]*g.sourceHeight-.5-row.measuredPixelTopFirst[1]],
     disagreement=Math.hypot(...residual.map((v,i)=>v-row.fittedResidualPixels[i]));
    if(disagreement>1e-5)throw Error('runtime_reference_geometry_disagreement');
    return {designation:row.designation,residualOriginalPixels:residual,disagreement};
   });
   const magnification=skyOpticalPixelMagnification(plane,{width:g.sourceWidth,height:g.sourceHeight},
    {view:{basis:camera,verticalFovDeg:fov},width:390,height:844,drawingWidth:canvas.width,drawingHeight:canvas.height});
   registrationReadback={samples,maximumDisagreement:Math.max(...samples.map(s=>s.disagreement)),sourcePixelMagnification:magnification,
    holdoutMaxTimesVisibleMagnification:magnification===null?null:magnification*p.registration.holdout.maxPixels,
    meaning:'Saved independent sample through actual runtime plane at every LOD. Visible magnification product is a sampled display diagnostic, not global astrometric accuracy.'};
  }
  const regions=acceptedSkyPreparedRegionCompletions(sources?.preparedRegions,args[40]?.map(value=>value.frame)??[]);
  const optical=regionCollection?regions[0]:sources?.sdssOptical;
  const result={png:canvas.toDataURL().split(',')[1],rgba:'',decodeSeconds,renderSeconds:(performance.now()-started)/1000,
   completed,error:gl.getError(),failed,draws,contributionFault:renderer.artworkContributionsFailed(),graphicsFaults,galacticDecodeSeconds,
   galacticCompletion:sources?.galacticImage?.publication?.publicationHash??null,
   completion:optical?{reference:optical.reference,publicationHash:optical.publicationHash}:null,
   ...(regionCollection?{regionCompletions:regions.map(value=>({reference:value.reference,publicationHash:value.publicationHash,
    participatingLevels:value.participatingFields.map(field=>field.level),credit:skyOpticalSourceCredit(value)})),
    actualBudget:skyArtworkContributionFrameBudget(canvas.width,canvas.height,regionalGroupCount),selectedObject:null}:{}),
   paintedStars:snapshot?.objects?.filter(value=>value.kind==='STAR'&&catalogueReferences.has(value.reference)).length??0,
   paintedNonCatalogStars:snapshot?.objects?.filter(value=>value.kind==='STAR'&&!catalogueReferences.has(value.reference)).length??0,
   paintedObjects:snapshot?.objects?.length??0,camera,fov,photoOff,catalogOff,galacticOff,view,level,pixelRatio,budget,registrationReadback,
   observationAt:frameAt,illumination:lightName,sunAltitudeDeg:light.sunAltitudeDeg,
   targetAltitudeDeg:Math.asin(Math.max(-1,Math.min(1,camera.forward[2])))*180/Math.PI,
   solarSeparationDeg:Math.acos(Math.max(-1,Math.min(1,camera.forward.reduce((n,v,i)=>n+v*light.sunDirection[i],0))))*180/Math.PI};
  let binary='';for(let i=0;i<pixels.length;i+=32768)binary+=String.fromCharCode(...pixels.subarray(i,i+32768));result.rgba=btoa(binary);
  return result;
  };
  if(collection){
   const results=[],all=input.items.map((_value,i)=>i);
   for(const step of collection.steps){
    if(step.retire!==undefined)decodedFields.get(step.retire).done();
    if(step.retry!==undefined)await decodeField(step.retry,imageData.find(value=>value.index===step.retry).data);
    if(step.focus!==undefined){camera=input.items[step.focus].cameras[lightName];fov=input.items[step.focus].views.find(value=>value.view==='wide').fov;}
    else{camera=createSkyViewBasis(0,180,0);fov=skyDomeFieldOfView(390,844);}
    const footprint={report:resolved,at:frameAt,view:{basis:camera,verticalFovDeg:fov},width:390,height:844};
    const wanted=skyPreparedRegionSelections(input.conditionalDiscovery.publications,footprint);
    const wantedHashes=new Set(wanted.map(value=>value.publicationHash));
    args[10]=fov;args[12]=camera;
    args[40]=(step.empty?[]:all).flatMap(i=>{
     const ready=decodedFields.get(i);
     return ready&&skyNativeImageIsCurrent(ready.frame.image)&&wantedHashes.has(ready.frame.publicationHash)?[{frame:ready.frame,port:ready.port}]:[];
    });
    regionalGroupCount=args[40].length;
    const r=captureFrame();
    results.push({step:step.name,focus:step.focus??null,retired:step.retire??null,retried:step.retry??null,
     wanted:wanted.map(value=>({reference:value.reference,publicationHash:value.publicationHash})),
     supplied:args[40].map(value=>({reference:value.frame.reference,publicationHash:value.frame.publicationHash})),...r,
     liveGpu:Object.fromEntries(Object.entries(live).map(([kind,set])=>[kind,set.size]))});
   }
   renderer.dispose();for(const done of retire)done();
   return {steps:results,liveAfterDispose:Object.fromEntries(Object.entries(live).map(([kind,set])=>[kind,set.size])),
    liveDecodedAfterDispose:[...decodedFields.values()].filter(value=>skyNativeImageIsCurrent(value.frame.image)).length};
  }
  const result=captureFrame();
  renderer.dispose();for(const done of retire)done();result.liveAfterDispose=Object.fromEntries(Object.entries(live).map(([kind,set])=>[kind,set.size]));return result;
 }finally{renderer.dispose();for(const done of retire)done();gl.getExtension('WEBGL_lose_context')?.loseContext();}
};`;
 const parsed=[],bundle=await build({stdin:{contents:entry,resolveDir:root,sourcefile:'prepared-batch-scene-entry.ts',loader:'ts'},
  absWorkingDir:root,bundle:true,write:false,platform:'browser',format:'iife',metafile:true,
  plugins:[{name:'bind-parsed-source',setup(api){api.onLoad({filter:/\.(?:[cm]?js|tsx?|json)$/},async a=>{
   const p=path.relative(root,a.path).split(path.sep).join('/'),bytes=await bind(p);parsed.push(bindings.get(p));
   const ext=path.extname(a.path).slice(1);return {contents:bytes.toString(),resolveDir:path.dirname(a.path),loader:ext==='json'?'json':ext==='tsx'?'tsx':ext==='ts'?'ts':'js'};});}}]});
 const reusableFrames=[];
 const renderReport=value=>{
  const copy=structuredClone(value);delete copy.context.contextId;
  const targets=[...(copy.targets??[]),...(copy.targetFrames??[]).flatMap(frame=>frame.targets)];
  for(const source of [...copy.sources,...targets.map(target=>target.source),copy.lunarFacts?.source])if(source)delete source.retrievedAt;
  for(const model of copy.weatherEvidence?.modelRuns??[])delete model.fetchedAt;
  return copy;
 };
 for(const receipt of sceneChecks?.reuseFramesFrom??[]){
  const prior=JSON.parse(await bindExpected(receipt));
  // A partial run may contain valid independent frames. Reuse only an identical
  // browser program/input and current production dependencies, never its failure.
  assert.equal(prior.inputReadback,'PASS','reuse_input_not_sealed');
  const priorInput=JSON.parse(await bind(path.posix.join(path.posix.dirname(receipt.path),'scene-input.json')));
  // BFF retrieval timestamps and generated context IDs do not describe the sky.
  // Every other report field must match; the original entry hash authenticates
  // the frozen report and all remaining browser inputs/program bytes together.
  assert.deepEqual(renderReport(priorInput.report),renderReport(report),'reuse_render_report_changed');
  assert.deepEqual(prior.entry,identity(Buffer.from(entry.replace(JSON.stringify(report),JSON.stringify(priorInput.report)))),'reuse_render_program_changed');
  assert.deepEqual(prior.galacticBackground,galacticBackground,'reuse_background_changed');
  for(const source of prior.parsedSourceBindings)await bindExpected(source);
  for(const source of prior.inputBindings.filter(v=>/^(?:apps|packages|workers)\/.*\.(?:ts|tsx|json)$/.test(v.path)))await bindExpected(source);
  reusableFrames.push({receipt,run:prior});
 }
 if(illuminationBaseline)reusableFrames.push({receipt:sceneChecks.baselineScene,run:illuminationBaseline});
 const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader']}),results=[],errors=[];
 const changed=(a,b)=>{let n=0;for(let i=0;i<a.length;i+=4)if(!a.subarray(i,i+3).equals(b.subarray(i,i+3)))n++;return n;};
 try{
  const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});page.on('pageerror',e=>errors.push(String(e)));
  await page.setContent('<!doctype html><style>body{margin:0}</style>');await page.addScriptTag({content:bundle.outputFiles[0].text});
  if(collectionLifecycle){
   const imageData=await Promise.all(items.map(async(item,index)=>({index,
    data:'data:image/'+(item.levels.OVERVIEW.asset.format==='jpeg'?'jpeg':'png')+';base64,'+
      (await bindExpected(item.levels.OVERVIEW.file)).toString('base64')})));
   const background='data:image/png;base64,'+(await bindExpected(galacticBackground.image)).toString('base64');
   const steps=[{name:'panorama'},{name:'panorama-repeat'},
    ...items.map((_item,focus)=>({name:'focus-'+focus,focus})),{name:'panorama-return'},
    {name:'one-field-retired',retire:0},{name:'one-field-retry',retry:0},
    {name:'regional-demand-empty',empty:true},{name:'regional-demand-return'}];
   for(const ratio of ratios){
    const result=await page.evaluate(a=>window.preparedScene(...a),[0,'wide','OVERVIEW',false,false,
     imageData,background,false,ratio,'night',{steps}]);
    for(const frame of result.steps){
     const png=Buffer.from(frame.png,'base64'),pixels=Buffer.from(frame.rgba,'base64');delete frame.png;delete frame.rgba;
     const file='collection-'+frame.step+'-dpr'+ratio+'.png';await fs.writeFile(path.join(output,file),png,{flag:'wx'});
     results.push({...frame,pixelRatio:ratio,file,encoded:identity(png),rgba:identity(pixels)});
     assert(frame.completed===1&&frame.error===0&&frame.failed.length===0&&!frame.contributionFault&&frame.graphicsFaults.length===0,'collection_scene_failure');
     assert(frame.actualBudget.maxGroups===frame.supplied.length,'collection_group_budget_mismatch');
     for(const completed of frame.regionCompletions)assert(frame.supplied.some(source=>source.reference===completed.reference&&source.publicationHash===completed.publicationHash),'collection_stale_source');
     if(frame.focus!==null)assert(frame.regionCompletions.some(value=>value.publicationHash===items[frame.focus].publication.publicationHash),'collection_focused_source_missing');
     if(frame.step==='one-field-retired')assert(frame.regionCompletions.every(value=>value.publicationHash!==items[0].publication.publicationHash),'retired_collection_source_returned');
     if(frame.step==='regional-demand-empty')assert(frame.regionCompletions.length===0&&frame.actualBudget.auxiliaryBytesLimit===0,'empty_collection_kept_source_or_budget');
    }
    const frames=results.filter(frame=>frame.pixelRatio===ratio),initial=frames.find(frame=>frame.step==='panorama');
    assert(initial.supplied.length===items.length&&initial.draws.filter(draw=>draw.submitted&&draw.finePrepared).length===items.length,'collection_not_actually_coexistent');
    for(const name of ['panorama-repeat','panorama-return','one-field-retry','regional-demand-return'])
     assert.deepEqual(frames.find(frame=>frame.step===name).rgba,initial.rgba,'collection_return_pixels_changed');
    assert(Object.values(result.liveAfterDispose).every(value=>value===0)&&result.liveDecodedAfterDispose===0,'collection_resources_not_retired');
    results.push({step:'final-retirement',pixelRatio:ratio,liveAfterDispose:result.liveAfterDispose,liveDecodedAfterDispose:result.liveDecodedAfterDispose});
   }
   assert.deepEqual(identity(await bind(runnerPath)),runnerBefore,'runner_changed_during_execution');
   for(const value of bindings.values())await bindExpected(value);
   const after=await inspectPreparedInventory(root,selected);assert.deepEqual(after,inventory,'inventory_changed_during_scene');
   const result={status:'ACTUAL_PREPARED_COLLECTION_LIFECYCLE_RENDERED',runtimeAcceptance:errors.length?'FAILED':'PASSED',
    results,queued,browserErrors:errors,inventoryExceptions:inventory.exceptions,inventoryInput:selected,
    inputBindings:[...bindings.values()],parsedSourceBindings:parsed,entry:identity(Buffer.from(entry)),
    executedRunner:{file:'executed-runner.mjs',...runnerBefore},sceneProfile,sceneChecks,conditionalDiscovery,
    reportContext:context,observationAt:at,galacticBackground,lightFrames,newFrames:results.filter(frame=>frame.file).length,
    reusedFrames:0,ordinaryAdoption:false,visualQuality:'NOT_REQUALIFIED',science:'UNKNOWN',
    scope:'Actual conditional registry/visibility, native image lifetime and Scene/GPU; simultaneous existing whole-source fields, per-field retirement/retry, view/demand withdrawal and exact same-view return. Software Chromium only; no React query, DevTools, phone, physical memory or throughput acceptance.'};
   await fs.writeFile(path.join(output,'result.json'),JSON.stringify(result,null,2),{flag:'wx'});
   return result;
  }
  const capture=async(index,view,level,photoOff,catalogOff,galacticOff=false,pixelRatio=1,lightName='night')=>{
   const filename=items[index].publication.publicationHash+'-'+view+'-'+(photoOff?'photo-off':level.toLowerCase())+(catalogOff?'-catalog-off':'')+(galacticOff?'-galactic-off':'')+(pixelRatio===1?'':'-dpr'+pixelRatio)+(illumination?'-'+lightName:'')+'.png';
   const light=lightFrames.find(value=>value.name===lightName);
   const match=reusableFrames.map(source=>({...source,frame:source.run.results.find(row=>
    row.publicationHash===items[index].publication.publicationHash&&row.view===view&&row.level===level&&
    row.photoOff===photoOff&&row.catalogOff===catalogOff&&row.galacticOff===galacticOff&&row.pixelRatio===pixelRatio&&
    Date.parse(row.observationAt)===Date.parse(light.at)&&row.fov===items[index].views.find(value=>value.view===view)?.fov&&
    isDeepStrictEqual(row.camera,items[index].cameras[lightName]))})).find(source=>source.frame);
   const previous=match?.frame;
   if(previous){
    assert.equal(previous.file,path.basename(previous.file),'baseline_frame_path');
    const sourceFrame={path:path.posix.join(path.posix.dirname(match.receipt.path),previous.file),...previous.encoded};
    // Canvas PNG rows start at the top; WebGL readPixels starts at the bottom.
    const png=await bindExpected(sourceFrame),pixels=await sharp(png).ensureAlpha().flip().raw().toBuffer();
    assert.deepEqual(identity(pixels),previous.rgba,'baseline_frame_pixels');
    assert(previous.completed===1&&previous.error===0&&previous.failed.length===0&&!previous.contributionFault&&
     Object.values(previous.liveAfterDispose).every(n=>n===0),'baseline_frame_not_qualified');
    await fs.writeFile(path.join(output,filename),png,{flag:'wx'});
    if(viewConstraints)assert(previous.targetAltitudeDeg>=viewConstraints.minTargetAltitudeDeg&&
     previous.solarSeparationDeg>=viewConstraints.minSunSeparationDeg,'reused_view_not_qualified');
    const row={...previous,file:filename,reusedFrame:{baseline:match.receipt,frame:sourceFrame}};
    results.push(row);return {pixels,row};
   }
   const raw=photoOff?null:await bindExpected(items[index].levels[level].file);
   const background=galacticOff?null:await bindExpected(galacticBackground.image);
   const r=await page.evaluate(a=>window.preparedScene(...a),[index,view,level,photoOff,catalogOff,
    raw?`data:image/${items[index].levels[level].asset.format==='jpeg'?'jpeg':'png'};base64,`+raw.toString('base64'):null,
    background?'data:image/png;base64,'+background.toString('base64'):null,galacticOff,pixelRatio,lightName]);
   const pixels=Buffer.from(r.rgba,'base64'),png=Buffer.from(r.png,'base64');delete r.rgba;delete r.png;
   await fs.writeFile(path.join(output,filename),png,{flag:'wx'});
   // Keep the actual failed frame/readback as well as independent good rows.
   const row={id:items[index].id,publicationHash:items[index].publication.publicationHash,...r,file:filename,
    encoded:identity(png),rgba:identity(pixels)};results.push(row);
   assert(r.completed===1&&r.error===0&&r.failed.length===0&&!r.contributionFault,'scene_failure');
   if(viewConstraints)assert(r.targetAltitudeDeg>=viewConstraints.minTargetAltitudeDeg&&
    r.solarSeparationDeg>=viewConstraints.minSunSeparationDeg,'illumination_view_not_qualified');
   assert(Object.values(r.liveAfterDispose).every(n=>n===0),'resource_leak');
   if(!galacticOff&&r.sunAltitudeDeg<-12)assert.equal(r.galacticCompletion,galacticPublication.publicationHash,'current_galactic_not_painted');
   else assert.equal(r.galacticCompletion,null,'hidden_galactic_published_source');
   if(!photoOff){assert(r.draws.some(d=>d.submitted&&d.finePrepared),'photo_not_submitted');
    assert.equal(r.completion?.publicationHash,items[index].publication.publicationHash,'wrong_completed_source');}
   return {pixels,row};
  };
  let catalogChangedPixels=null,galacticChangedPixels=null;
  if(!illumination){
   const broad=await capture(0,'catalogue','DETAIL',true,false),withoutStars=await capture(0,'catalogue','DETAIL',true,true);
   catalogChangedPixels=changed(broad.pixels,withoutStars.pixels);assert(broad.row.paintedStars>0&&withoutStars.row.paintedStars===0&&catalogChangedPixels>0,'catalogue_had_no_effect');
   const withoutGalactic=await capture(0,'catalogue','DETAIL',true,false,true);
   galacticChangedPixels=changed(broad.pixels,withoutGalactic.pixels);
   assert(galacticChangedPixels>0&&withoutGalactic.row.galacticCompletion===null,'current_galactic_had_no_effect');
  }
  for(let i=0;i<items.length;i++)try{
   const tiles=[];for(const tileId of items[i].saoSelectedTiles)tiles.push((await saoOwner.tile(saoPublication.publicationHash,tileId)).data);
   await page.evaluate(tiles=>window.preparedSceneTiles(tiles),tiles);
   for(const light of lightFrames)for(const pixelRatio of ratios)for(const {view}of items[i].views){
   const off=await capture(i,view,'DETAIL',true,false,false,pixelRatio,light.name);
   for(const level of precheck?['OVERVIEW','MEDIUM']:illumination||view==='maxzoom'?['DETAIL']:['OVERVIEW','MEDIUM','DETAIL']){
    const actual=await capture(i,view,level,false,false,false,pixelRatio,light.name);actual.row.changedPixelsVsPhotoOff=changed(actual.pixels,off.pixels);
    assert(actual.row.changedPixelsVsPhotoOff>0,'photo_had_no_effect');
    console.log(JSON.stringify({id:items[i].id,view,level,pixelRatio,illumination:light.name,changedPixels:actual.row.changedPixelsVsPhotoOff,paintedStars:actual.row.paintedStars}));
   }
   }
  }catch(error){queued.push({id:items[i].id,publicationHash:items[i].publication.publicationHash,
    status:'SCENE_RUNTIME_FAILED',error:String(error)});}
  if(illumination)for(const item of items)for(const {view}of item.views){
   const panels=results.filter(row=>row.publicationHash===item.publication.publicationHash&&row.view===view),w=390*5,h=874*2;
   if(panels.length!==10)continue;
   const cells=panels.map(row=>({row,column:lightFrames.findIndex(light=>light.name===row.illumination),line:row.photoOff?0:1}));
   const labels=Buffer.from(`<svg width="${w}" height="${h}">${cells.map(({row,column,line})=>`<text x="${column*390+8}" y="${line*874+20}" fill="white" font-size="14">${row.illumination} ${row.sunAltitudeDeg.toFixed(2)} deg ${row.photoOff?'off':'photo'}</text>`).join('')}</svg>`);
   const images=[];for(const {row,column,line}of cells)images.push({input:await sharp(path.join(output,row.file)).resize(390,844).png().toBuffer(),left:column*390,top:line*874+30});
   await sharp({create:{width:w,height:h,channels:3,background:'#202020'}}).composite([...images,{input:labels,left:0,top:0}]).png().toFile(path.join(output,item.publication.publicationHash+'-'+view+'-illumination.png'));
  }
  for(const item of items){const panels=results.filter(r=>r.publicationHash===item.publication.publicationHash&&['wide','detail'].includes(r.view)&&r.pixelRatio===1),w=390*4,h=874*2;
   if(panels.length!==8)continue; // Partial rows retain actual individual frames.
   // References come from the admitted native contract; arbitrary declaration
   // IDs never enter a filename or unescaped SVG markup.
   const labels=Buffer.from(`<svg width="${w}" height="${h}">${panels.map((r,i)=>`<text x="${i%4*390+8}" y="${Math.floor(i/4)*874+20}" fill="white" font-size="14">${item.publication.reference} ${r.view} ${r.photoOff?'off':r.level}</text>`).join('')}</svg>`);
   await sharp({create:{width:w,height:h,channels:3,background:'#202020'}}).composite([...panels.map((r,i)=>({input:path.join(output,r.file),left:i%4*390,top:Math.floor(i/4)*874+30})),{input:labels,left:0,top:0}]).png().toFile(path.join(output,item.publication.publicationHash+'-comparison.png'));
  }
  assert.deepEqual(identity(await bind(runnerPath)),runnerBefore,'runner_changed_during_execution');
  for(const value of bindings.values())await bindExpected(value);
  // Reuse the original whole-inventory reader at the final fence, including
  // large processing inputs not accumulated in this browser payload.
  const after=await inspectPreparedInventory(root,selected);assert.deepEqual(after,inventory,'inventory_changed_during_scene');
  const runtimeAcceptance=inventory.exceptions.length||errors.length||queued.some(r=>r.status==='SCENE_RUNTIME_FAILED')?'FAILED':'PASSED';
  const result={status:runtimeAcceptance==='FAILED'?'ACTUAL_PREPARED_BATCH_RENDERED_WITH_FAILURES':'ACTUAL_PREPARED_BATCH_RENDERED',
   runtimeAcceptance,results,queued,browserErrors:errors,
   inventoryExceptions:inventory.exceptions,inventoryInput:selected,inputBindings:[...bindings.values()],parsedSourceBindings:parsed,
   entry:identity(Buffer.from(entry)),executedRunner:{file:'executed-runner.mjs',...runnerBefore},catalogChangedPixels,items:items.map(({levels,...item})=>({...item,
    levels:Object.fromEntries(Object.entries(levels).map(([level,value])=>[level,value.asset]))})),
   reportContext:context,catalog:{catalogVersion:catalog.catalogVersion,catalogHash:catalog.catalogHash,rows:catalog.rows.length},
   observationAt:at,inputReadback:'PASS',fixture:'Existing formal-spot repository and weather adapters; real astronomy/BSC/SAO/DeepSky owners.',
   renderer:'Current Scene/GPU; Chromium software WebGL; 390x844 CSS; drawing pixel ratios '+ratios.join(',')+'. No native/device/performance acceptance.',
   workingSet:'One current SAO selection, current Galactic background and one encoded/decoded optical level per capture; no all-batch photo or expanded-star payload.',
   sceneProfile,sceneChecks,consumer:regionCollection?'ordinary-region-collection-v1':'explicit-target-v1',galacticBackground,galacticChangedPixels,lightFrames,reusedSharedControls,
   newFrames:results.filter(row=>!row.reusedFrame).length,reusedFrames:results.filter(row=>row.reusedFrame).length,
   ordinaryAdoption:false,visualQuality:'PENDING_REVIEW',absoluteRegistration:'UNVERIFIED',science:'UNKNOWN',
   ...(precheck?{precheck:true,finalSceneQualification:'NOT_RUN',maximumZoomAcceptance:'NOT_RUN_PRECHECK',
    meaning:'Coarse full-footprint precheck only. Does not qualify fine detail, maximum zoom, daylight, high DPR, registration, native runtime or adoption.'}:{})};
  await fs.writeFile(path.join(output,'result.json'),JSON.stringify(result,null,2),{flag:'wx'});
  return result;
 }finally{await browser.close();}
}

/** Put only already measured, eligible tiles into their actual HEALPix consumer.
 * The other selected tiles retain original bytes. No altered publication/credit
 * is forged, and this partial visual trial does not qualify a complete nebula. */
async function runHipsScene(run,runPath,output){
 const base='output/rubin-region-batch-2026-10-08/quality/refined/current-scene/';
 const baseline=await json(base+'result.json'),before=await json(base+'inputs-before.json');
 assert.equal(baseline.status,'CURRENT_SCENE_BATCH_RENDERED');assert.equal(baseline.failure,null);
 const pins=new Map(),sourceEpochChanges=[],bind=async p=>{const bytes=await read(p);const pin={path:p.replaceAll('\\','/'),...identity(bytes)};pins.set(pin.path,pin);return bytes;};
 for(const pin of run.sourceRuns??[]){const bytes=await bind(pin.path);assert.equal(bytes.length,pin.bytes);assert.equal(sha(bytes),pin.sha256,'processing_run_changed');}
 // Data and camera remain exact. Known non-executed adapter and renderer epochs
 // may differ, but are declared and require exact original-frame RGBA below.
 const allowedEpochChanges=new Set([
  '.codex/work-items/cloud-sky-native-2026-09-22/scripts/inspect-noirlab-scene.mts',
  '.codex/work-items/cloud-sky-native-2026-09-22/scripts/inspect-legacy-regions.py',
  ...['sky-gpu-renderer.ts','sky-scene-render.ts','sky-gpu-artwork-contributions.ts'].map(n=>'apps/wechat-miniapp/src/features/sky/'+n)]);
 for(const pin of before){const bytes=await bind(pin.path);if(bytes.length!==pin.bytes||sha(bytes)!==pin.sha256){
  assert(allowedEpochChanges.has(pin.path),'frozen_scene_input_changed: '+pin.path);
  sourceEpochChanges.push({before:pin,current:pins.get(pin.path),executedByThisRunner:!pin.path.startsWith('.codex/'),
   meaning:'Pre-existing current owner epoch; no product code edited. Original complete RGBA must equal the frozen frame at both ratios.'});
 }}
 const controlled=JSON.parse(await bind(base+'controlled-report.json'));
 const {loadBsc5pStarCatalog}=await import('../../../../packages/astronomy-core/src/bsc5p-catalog.ts');
 const {StellarCatalogPublicationService}=await import('../../../../workers/miniapp-api/src/stellar-catalog-publication.ts');
 const catalog=new StellarCatalogPublicationService().get(loadBsc5pStarCatalog('bsc5p-bright-stars.v3')).data;
 assert.deepEqual(controlled.catalogIdentity,{catalogVersion:catalog.catalogVersion,catalogHash:catalog.catalogHash,rows:catalog.rows.length});
 assert.equal(catalog.rows.length,8404);
 const manifest=JSON.parse(await bind('.codex/work-items/cloud-sky-native-2026-09-22/scripts/image-tool-full-comparison-samples.json'));
 const selection=JSON.parse(await bind('output/rubin-region-batch-2026-10-08/quality/refined/current-selection.json'));
 const profile=selection.profiles.find(p=>p.reference==='M:8');assert(profile);
 const conditions=baseline.rows.filter(r=>r.condition.name==='M:8').map(r=>r.condition);
 assert.deepEqual(conditions.map(c=>c.pixelRatio),[1,2]);
 const wanted=conditions[0].wanted;
 assert(wanted.length===10&&wanted.every(t=>t.order===6));
 assert.deepEqual(wanted.map(t=>t.pixel),profile.pixels);
 for(const c of conditions){assert.deepEqual(c.wanted,wanted);assert.deepEqual(c.basis,profile.basis);assert.equal(c.fov,profile.fieldDegrees);}
 const coverage=JSON.parse(await bind('output/rubin-region-batch-2026-10-08/quality/refined/current-selection-coverage.json'));
 const supply=coverage.profiles.find(p=>p.reference==='M:8');assert(supply);
 const sourceTiles=[...supply.originalTiles];
 if(coverage.status==='FAILED'){
  const recovery=JSON.parse(await bind('output/rubin-region-batch-2026-10-08/quality/refined/recovery-readback.json'));
  assert.equal(recovery.status,'REGISTERED_MIRROR_CONTROL_AND_MISSING_ORIGINALS_READBACK');
  assert.equal(recovery.control.exactOriginalBytesEqual,true);assert.deepEqual(recovery.failures,[]);
  sourceTiles.push(...recovery.recovered.filter(t=>t.reference==='M:8'&&t.order===6));
 }else assert.equal(coverage.status,'COMPLETE_TARGET_REQUIRED_ORIGINALS_READBACK');
 assert.deepEqual(sourceTiles.map(t=>t.pixel).sort((a,b)=>a-b),wanted.map(t=>t.pixel).sort((a,b)=>a-b));
 const tiles=[];
 for(const tile of wanted){
  const source=sourceTiles.find(t=>t.pixel===tile.pixel);assert(source);const inputPath=source.raw.path;
  const bytes=await bind(inputPath);assert(before.some(p=>p.path===inputPath),'unbound_original_tile');
  assert.equal(bytes.length,source.raw.bytes);assert.equal(sha(bytes),source.raw.sha256);
  const meta=await sharp(bytes).metadata();assert(meta.width===512&&meta.height===512);
  tiles.push({...tile,inputPath,input:identity(bytes),imageData:'data:image/png;base64,'+bytes.toString('base64')});
 }
 const methods=new Map(),skipped=[],samplePolicyEpochChanges=[];
 for(const row of run.rows){
  if(!/^m8-tile-\d+$/.test(row.sample))continue;
  if(row.method.includes('starnet')){skipped.push({...row,status:'SKIPPED_LICENSE',reason:'Review-only StarNet outputs are not loaded as software assets or fixtures.'});continue;}
  if(row.method==='original')continue;
  assert.equal(row.status,'COMPLETED_NOT_QUALITY_ACCEPTANCE');
  assert(['nox','nox-upsample','sxt','sxt-overlap','sxt-upsample',...Object.keys(psEligibility)].includes(row.method),'eligible_method');
  const sample=manifest.samples.find(s=>s.id===row.sample);assert(sample&&sample.kind==='nebula'&&sample.width===512);
  const admittedMethod=psEligibility[row.method]?.base??row.method;
  assert(sample.methods.includes(admittedMethod));
  const pixel=Number(row.sample.slice('m8-tile-'.length)),original=tiles.find(t=>t.pixel===pixel);assert(original);
  assert.equal(sample.input.path,original.inputPath);assert.equal(sample.input.bytes,original.input.bytes);assert.equal(sample.input.sha256,original.input.sha256);
  const receipt=JSON.parse(await bind(row.receipt));assert.equal(receipt.key.method,row.method);
  await checkPsReceipt(row,receipt,bind);
  // Only additive tool eligibility changed during this benchmark. The current
  // method must still be admitted; geometry, source and all other sample fields
  // remain exact, and no previously admitted method may have been revoked.
  const {methods:oldMethods,...oldSample}=receipt.key.sample,{methods:currentMethods,...currentSample}=sample;
  assert.deepEqual(oldSample,currentSample);assert(oldMethods.includes(admittedMethod)&&oldMethods.every(m=>currentMethods.includes(m)),'sample_policy_revoked');
  if(JSON.stringify(oldMethods)!==JSON.stringify(currentMethods))samplePolicyEpochChanges.push({sample:row.sample,method:row.method,before:oldMethods,current:currentMethods,meaning:'Only additive eligibility changed; actual method remains admitted and source/geometry/metadata are exact.'});
  assert.deepEqual(receipt.key.metadata,{path:sample.metadata,...identity(await bind(sample.metadata))});
  const inputPath=path.join(path.dirname(row.receipt),'processed.png').replaceAll('\\','/'),bytes=await bind(inputPath);
  const outputPin=receipt.outputs.find(p=>p.path.replaceAll('\\','/')===inputPath);
  assert(outputPin&&outputPin.bytes===bytes.length&&outputPin.sha256===sha(bytes),'processed_binding');
  const meta=await sharp(bytes).metadata();assert(meta.width===512&&meta.height===512&&meta.channels===3&&meta.icc,'processed_geometry_colour_contract');
  const replacements=methods.get(row.method)??[];assert(!replacements.some(t=>t.pixel===pixel),'duplicate_method_tile');
  replacements.push({order:6,pixel,inputPath,input:identity(bytes),receipt:row.receipt,imageData:'data:image/png;base64,'+bytes.toString('base64')});methods.set(row.method,replacements);
 }
 assert(methods.size>0);const expected=[28891,28892];
 for(const [method,replacements] of methods)assert.deepEqual(replacements.map(t=>t.pixel).sort((a,b)=>a-b),expected,'same_processed_scope: '+method);
 const items=[{method:'original',replacements:[]},...[...methods].map(([method,replacements])=>({method,replacements}))];
 const entry=`
import {createSkyGpuRenderer} from './apps/wechat-miniapp/src/features/sky/sky-gpu-renderer';
import {drawSkyScene} from './apps/wechat-miniapp/src/features/sky/sky-scene-render';
import {attachSkyCatalog,resolveSkySceneFrame} from './apps/wechat-miniapp/src/features/sky/sky-stellar-scene';
import {registerSkyNativeImageLifetime} from './apps/wechat-miniapp/src/features/sky/sky-artwork-loader';
const input=${JSON.stringify({report:controlled.report,catalog,tiles,items,conditions})};
const resolved=attachSkyCatalog(input.report,input.catalog),at=input.report.hourly[0].at;
if(resolved.skyScene.state!=='AVAILABLE'||resolveSkySceneFrame(resolved.skyScene,at)?.points.length!==8404)throw Error('catalog_not_resolved');
window.benchmarkHips=async(index,ratio,catalogOff=false)=>{
 const item=input.items[index],condition=input.conditions.find(c=>c.pixelRatio===ratio),canvas=document.createElement('canvas');
 canvas.width=390*ratio;canvas.height=844*ratio;document.body.replaceChildren(canvas);
 const gl=canvas.getContext('webgl',{preserveDrawingBuffer:true,antialias:false,alpha:false});if(!gl)throw Error('webgl_missing');
 const live={},original={};for(const kind of ['Texture','Framebuffer','Renderbuffer','Program','Buffer']){
  live[kind]=new Set();for(const op of ['create','delete'])original[op+kind]=gl[op+kind].bind(gl);
  gl['create'+kind]=()=>{const v=original['create'+kind]();if(v)live[kind].add(v);return v;};
  gl['delete'+kind]=v=>{live[kind].delete(v);return original['delete'+kind](v);};}
 const failed=[],renderer=createSkyGpuRenderer(gl,ratio,{imageFailed:()=>failed.push('image'),artworkContributions:{auxiliaryBytesLimit:8*1024*1024,maxGroups:1}}),retire=[];
 let completed=0,snapshot=null,hipsPaints=0;
 try{
  const decodeStart=performance.now(),frames=[];
  for(const tile of input.tiles){const replacement=item.replacements.find(t=>t.pixel===tile.pixel),image=new Image();image.src=(replacement??tile).imageData;await image.decode();
   if(image.width!==512||image.height!==512)throw Error('tile_shape');retire.push(registerSkyNativeImageLifetime(image,()=>true));frames.push({order:tile.order,pixel:tile.pixel,image,layer:'OPTICAL'});}
  const decodeSeconds=(performance.now()-decodeStart)/1000,mesh=renderer.skyImageMesh.bind(renderer);
  renderer.skyImageMesh=(...args)=>{const drawn=mesh(...args);if(drawn)hipsPaints++;return drawn;};
  const report=catalogOff?{...resolved,skyScene:{...resolved.skyScene,state:'UNAVAILABLE',catalog:null,publication:null}}:resolved;
  const args=[renderer,report,at,null,null,390,844,'DAY',s=>{snapshot=s;},()=>completed++,condition.fov,null,condition.basis];args[21]=frames;args[22]=t=>failed.push('hips:'+t.order+':'+t.pixel);
  const start=performance.now();drawSkyScene(...args);gl.finish();const pixels=new Uint8Array(canvas.width*canvas.height*4);gl.readPixels(0,0,canvas.width,canvas.height,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
  const renderSeconds=(performance.now()-start)/1000;let binary='';for(let i=0;i<pixels.length;i+=32768)binary+=String.fromCharCode(...pixels.subarray(i,i+32768));
  const result={png:canvas.toDataURL().split(',')[1],rgba:btoa(binary),decodeSeconds,renderSeconds,hipsPaints,completed,error:gl.getError(),failed,
   contributionFault:renderer.artworkContributionsFailed(),catalogOff,stellarFrameState:resolveSkySceneFrame(report.skyScene,at)?.state??null,
   paintedObjects:snapshot?.objects?.length??0,camera:condition.basis,fov:condition.fov,pixelRatio:ratio,backingWidth:canvas.width,backingHeight:canvas.height};
  renderer.dispose();for(const done of retire)done();result.liveAfterDispose=Object.fromEntries(Object.entries(live).map(([k,v])=>[k,v.size]));return result;
 }finally{renderer.dispose();for(const done of retire)done();gl.getExtension('WEBGL_lose_context')?.loseContext();}
};`;
 const parsed=[];
 const bundle=await build({stdin:{contents:entry,resolveDir:root,sourcefile:'image-benchmark-hips-entry.ts',loader:'ts'},absWorkingDir:root,bundle:true,write:false,platform:'browser',format:'iife',metafile:true,
  plugins:[{name:'bind-actual-parsed-source',setup(api){api.onLoad({filter:/\.(?:[cm]?js|tsx?|json)$/},async a=>{const bytes=await bind(path.relative(root,a.path));parsed.push(pins.get(path.relative(root,a.path).replaceAll('\\','/')));const ext=path.extname(a.path).slice(1);return {contents:bytes.toString('utf8'),resolveDir:path.dirname(a.path),loader:ext==='json'?'json':ext==='tsx'?'tsx':ext==='ts'?'ts':'js'};});}}]});
 const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader']}),results=[],originalPixels=new Map(),errors=[];
 try{
  const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});page.on('pageerror',e=>errors.push(String(e)));
  await page.setContent('<!doctype html><style>body{margin:0}</style>');await page.addScriptTag({content:bundle.outputFiles[0].text});
  for(let i=0;i<items.length;i++)for(const ratio of [1,2]){
   const r=await page.evaluate(([index,ratio])=>window.benchmarkHips(index,ratio),[i,ratio]);
   const pixels=Buffer.from(r.rgba,'base64'),png=Buffer.from(r.png,'base64');delete r.rgba;delete r.png;
   assert(r.error===0&&r.completed===1&&r.failed.length===0&&!r.contributionFault&&r.hipsPaints===wanted.length);
   assert(r.stellarFrameState==='AVAILABLE'&&r.paintedObjects>0,'actual_catalogue_not_painted');assert(Object.values(r.liveAfterDispose).every(n=>n===0),'resource_leak');
   const filename=`m8-${items[i].method}-${ratio}x.png`;await fs.writeFile(path.join(output,filename),png,{flag:'wx'});
   if(i===0){const old=baseline.rows.find(row=>row.condition.name==='M:8'&&row.condition.pixelRatio===ratio);assert(old);
    const raw=await bind(old.png.path);assert.equal(sha(raw),old.png.sha256);assert.equal(raw.length,old.png.bytes);
    assert.equal(sha((await sharp(raw).ensureAlpha().flip().raw().toBuffer())),old.rgba.sha256,'frozen_png_rgba_binding');
    assert.equal(sha(pixels),old.rgba.sha256,'current_original_scene_changed');originalPixels.set(ratio,pixels);r.exactFrozenOriginalRgba=true;
   }else{const original=originalPixels.get(ratio);let changed=0;for(let k=0;k<pixels.length;k+=4)if(!pixels.subarray(k,k+3).equals(original.subarray(k,k+3)))changed++;assert(changed>1000,'processed_tiles_had_no_effect');r.changedPixelsVsOriginal=changed;}
   results.push({method:items[i].method,...r,file:filename,encoded:identity(png),rgba:identity(pixels)});console.log(JSON.stringify({method:items[i].method,ratio,changed:r.changedPixelsVsOriginal,hipsPaints:r.hipsPaints,objects:r.paintedObjects}));
  }
  const off=await page.evaluate(()=>window.benchmarkHips(0,1,true)),offPixels=Buffer.from(off.rgba,'base64');
  assert(off.error===0&&off.failed.length===0&&off.completed===1&&off.paintedObjects===0&&off.stellarFrameState===null);
  assert(!off.contributionFault&&Object.values(off.liveAfterDispose).every(n=>n===0));
  const original=originalPixels.get(1);let catalogChangedPixels=0;for(let k=0;k<offPixels.length;k+=4)if(!offPixels.subarray(k,k+3).equals(original.subarray(k,k+3)))catalogChangedPixels++;
  assert(catalogChangedPixels>0,'catalogue_did_not_affect_scene');
  await fs.writeFile(path.join(output,'m8-original-catalog-off-1x.png'),Buffer.from(off.png,'base64'),{flag:'wx'});
  assert.deepEqual(errors,[]);
  const panels=results.filter(r=>r.pixelRatio===1),labels=Buffer.from(`<svg width="${390*panels.length}" height="30">${panels.map((r,i)=>`<text x="${390*i+8}" y="20" fill="white" font-size="14">M8 ${r.method}</text>`).join('')}</svg>`);
  await sharp({create:{width:390*panels.length,height:874,channels:3,background:'#202020'}}).composite([...panels.map((r,i)=>({input:path.join(output,r.file),left:i*390,top:30})),{input:labels,left:0,top:0}]).png().toFile(path.join(output,'m8-comparison.png'));
  await bind(runPath);await bind(base+'result.json');await bind(base+'inputs-before.json');await bind(path.relative(root,fileURLToPath(import.meta.url)));
  const readback=[];for(const pin of pins.values()){const bytes=await read(pin.path);assert.equal(sha(bytes),pin.sha256,'input_mutated_during_render');assert.equal(bytes.length,pin.bytes);readback.push(pin);}
  await fs.writeFile(path.join(output,'result.json'),JSON.stringify({status:'ACTUAL_HIPS_PARTIAL_TOOL_COMPARISON',results,skipped,items:items.map(({replacements,...item})=>({...item,replacements:replacements.map(({imageData,...t})=>t)})),
   actualScene:{condition:conditions[0],report:identity(Buffer.from(JSON.stringify(controlled.report))),catalog:identity(Buffer.from(JSON.stringify(catalog)))},
   originalTiles:tiles.map(({imageData,...t})=>t),processedTileCount:2,selectedTileCount:10,catalogChangedPixels,
   inputBindings:readback,parsedSourceBindings:parsed,sourceEpochChanges,samplePolicyEpochChanges,entry:identity(Buffer.from(entry)),inputReadback:'PASS',renderer:'Current unchanged Scene/GPU; Chromium software WebGL; 390x844 CSS at 1x and 2x',
   scope:'Exactly two previously measured original order6 tiles replaced; eight selected tiles remain original. Original complete RGBA equals the frozen actual Scene at both ratios. No modified publication or source credit claimed. Partial visual integration is not whole-nebula quality acceptance or native/device qualification.',
   ordinaryAdoption:false,visualQuality:'PENDING_REVIEW',absoluteRegistration:'UNVERIFIED',science:'UNKNOWN'},null,2),{flag:'wx'});
 }finally{await browser.close();}
}
