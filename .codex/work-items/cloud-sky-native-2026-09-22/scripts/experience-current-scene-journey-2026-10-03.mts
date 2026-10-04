/** Task-only current continuous page/Scene journey. Actual extracted current page effects/request/paint/credit, shared loaders, real publication bytes and software GL. Controlled React/Taro/MapFS/clock; native composition, GC/driver/RSS and device interaction remain unverified. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createRequire,builtinModules} from 'node:module';
import {fileURLToPath} from 'node:url';
import ts from 'typescript';
import {build} from 'esbuild';
import {projectAdoptedSkyCatalog} from '../../../../apps/wechat-miniapp/src/services/sky-report-catalog.ts';
import {DeepSkyImageryService} from '../../../../workers/miniapp-api/src/deep-sky-imagery.ts';
import {SdssOpticalImageryService} from '../../../../workers/miniapp-api/src/sdss-optical-imagery.ts';
import {attachSkyCatalog,resolveSkyDeepSkyScene} from '../../../../apps/wechat-miniapp/src/features/sky/sky-stellar-scene.ts';
import {presentSkyTime} from '../../../../apps/wechat-miniapp/src/features/sky/sky-time-presentation.ts';
import {createSkyViewBasis} from '../../../../apps/wechat-miniapp/src/features/sky/sky-view-projection.ts';
import {SaoPublicationService} from '../../../../workers/miniapp-api/src/sao-publication';
import {currentGpuExecutor,currentJourneyExecutor,currentHideExecutor,currentShowExecutor,currentFinalExecutor} from './experience-current-scene-browser-2026-10-03';
import {buildDeepSkyScene} from '../../../../workers/miniapp-api/src/deep-sky-scene-provider';
import {celestialObjectPosition} from '../../../../workers/miniapp-api/src/celestial-object-position';
import {exactSkyObservationFrame} from '../../../../apps/wechat-miniapp/src/features/sky/sky-observation-frame';
import {clampSkyFieldOfView} from '../../../../apps/wechat-miniapp/src/features/sky/sky-zoom.ts';

const ROOT=fileURLToPath(new URL('../../../../',import.meta.url));
const task='.codex/work-items/cloud-sky-native-2026-09-22', sky='apps/wechat-miniapp/src/features/sky/';
const hash=(v:Uint8Array|string)=>createHash('sha256').update(v).digest('hex');
const bind=async(p:string)=>{const b=await fs.readFile(path.join(ROOT,p));return {path:p,bytes:b.length,sha256:hash(b)};};
const require=createRequire(import.meta.url);
const PLAYWRIGHT='C:/Users/777/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright';
const {chromium}=require(PLAYWRIGHT);
const bindAbsolute=async(p:string)=>{const resolvedAbsolute=await fs.realpath(p),b=await fs.readFile(resolvedAbsolute);return {resolvedAbsolute,bytes:b.length,sha256:hash(b)};};
let relative='output/playwright/cloud-sky-current-scene-1003-r1';
for(let n=2;;n++){try{await fs.access(path.join(ROOT,relative));relative=`output/playwright/cloud-sky-current-scene-1003-r${n}`;}catch{break;}}
const out=path.join(ROOT,relative);await fs.mkdir(out,{recursive:true});
await fs.copyFile(fileURLToPath(import.meta.url),path.join(out,'executed-script.mts.txt'));
const priorDir='output/playwright/cloud-sky-wide-resource-composition-1002';
const priorResultPath=priorDir+'/result.json',priorResultBytes=await fs.readFile(path.join(ROOT,priorResultPath));
const prior=JSON.parse(priorResultBytes.toString());
const inputs:any[]=[{path:priorResultPath,bytes:priorResultBytes.length,sha256:hash(priorResultBytes),transport:'ACTUAL_FROZEN_PRIOR_RESULT_BYTES'}];
// Node preparation is executed by the task runner, not the browser bundle. Bind its real local graph separately.
const nodePreparationEntry=`import {projectAdoptedSkyCatalog} from './apps/wechat-miniapp/src/services/sky-report-catalog';
import {presentSkyTime} from './${sky}sky-time-presentation';
import {attachSkyCatalog,resolveSkyDeepSkyScene} from './${sky}sky-stellar-scene';
import {DeepSkyImageryService} from './workers/miniapp-api/src/deep-sky-imagery';
import {SdssOpticalImageryService} from './workers/miniapp-api/src/sdss-optical-imagery';
import {SaoPublicationService} from './workers/miniapp-api/src/sao-publication';
import {buildDeepSkyScene} from './workers/miniapp-api/src/deep-sky-scene-provider';
import {celestialObjectPosition} from './workers/miniapp-api/src/celestial-object-position';
import {exactSkyObservationFrame} from './${sky}sky-observation-frame';
export {projectAdoptedSkyCatalog,presentSkyTime,attachSkyCatalog,resolveSkyDeepSkyScene,DeepSkyImageryService,SdssOpticalImageryService,SaoPublicationService,buildDeepSkyScene,celestialObjectPosition,exactSkyObservationFrame};`;
const nodePreparation=await build({absWorkingDir:ROOT,stdin:{contents:nodePreparationEntry,resolveDir:ROOT,sourcefile:'task-node-preparation.ts',loader:'ts'},
 bundle:true,write:false,metafile:true,platform:'node',format:'esm',logLevel:'silent',external:['class-validator','class-transformer']});
await fs.writeFile(path.join(out,'node-preparation-entry.ts.txt'),nodePreparationEntry,{flag:'wx'});
await fs.writeFile(path.join(out,'node-preparation-unexecuted-bundle.js'),nodePreparation.outputFiles[0]!.text,{flag:'wx'});
await fs.writeFile(path.join(out,'node-preparation-metafile.json'),JSON.stringify(nodePreparation.metafile,null,2)+'\n',{flag:'wx'});
const nodePreparationBindings:any[]=[],nodeVirtualInputs=[{inputKey:'task-node-preparation.ts',bytes:Buffer.byteLength(nodePreparationEntry),sha256:hash(nodePreparationEntry)}];
for(const key of Object.keys(nodePreparation.metafile!.inputs)){
 if(key==='task-node-preparation.ts')continue;
 const absolute=path.resolve(ROOT,key),relativeInput=path.relative(ROOT,absolute).replaceAll('\\','/');
 assert.ok(relativeInput&&!relativeInput.startsWith('../')&&!path.isAbsolute(relativeInput),'Node preparation metafile input must resolve inside approved root '+key);
 const snapshot=`node-preparation-source-inputs/${nodePreparationBindings.length+1}.txt`;
 const content=await fs.readFile(absolute); // All non-virtual inputs must resolve; no catch/ignore.
 const row={path:relativeInput,bytes:content.length,sha256:hash(content),nodeMetafileInput:key,resolvedAbsolute:absolute,snapshot};
 nodePreparationBindings.push(row);inputs.push({...row,transport:'ACTUAL_NODE_PREPARATION_SOURCE'});
 await fs.mkdir(path.dirname(path.join(out,snapshot)),{recursive:true});await fs.writeFile(path.join(out,snapshot),content,{flag:'wx'});
}
const nodeExternalImports=[...new Set(Object.values(nodePreparation.metafile!.outputs).flatMap(o=>o.imports.filter(i=>i.external).map(i=>i.path)))];
const nodeOptionalUnusedFrameworkExternals=['class-validator','class-transformer'];
for(const key of nodeExternalImports)assert(builtinModules.includes(key)||builtinModules.includes(key.replace(/^node:/,''))||nodeOptionalUnusedFrameworkExternals.includes(key),'unbound external Node preparation dependency '+key);
await fs.writeFile(path.join(out,'node-preparation-binding.json'),JSON.stringify({bindings:nodePreparationBindings,virtualInputs:nodeVirtualInputs,externalImports:nodeExternalImports,declaredUnusedFrameworkOptionalExternals:nodeOptionalUnusedFrameworkExternals,warnings:nodePreparation.warnings,
 scope:'Dependency metadata/unexecuted bundle only, not a Node runtime loaded-module trace; actual preparation still uses original task imports without substitutions. All non-virtual graph inputs strictly resolve inside ROOT and are bound. Only Node builtins and explicitly excluded uninstalled Nest ValidationPipe/serializer optional class-validator/class-transformer dependencies are external; these framework capabilities are not used by the current preparation/producer owner. Not all possible framework runtime branches.'},null,2)+'\n',{flag:'wx'});
const preserved=JSON.parse(await fs.readFile(path.join(ROOT,task,'tmp/resume-preserved-hashes-2026-10-01.json'),'utf8'));
for(const row of preserved)assert.equal((await bind(row.path)).sha256,row.sha256);
inputs.push(await bind(sky+'sky-gpu-textures.ts'));
const originalHarness=await bind(task+'/scripts/experience-full-hook-resource-journey-2026-10-02.mts');
assert.equal(originalHarness.sha256,'b3fbc0747d6b463a265536642a589594a87f5bac0004660635e71aef840e902a');
inputs.push(originalHarness);
const selectedBase=await bind(task+'/scripts/experience-selected-full-hook-resource-journey-2026-10-02.mts');
assert.equal(selectedBase.sha256,'d4f2ee1bf8c72979acc32682a0578f592d2aecd91116fb34c325362800cbeeed');
inputs.push(selectedBase);
const metadata:Record<string,any>={};
for(let i=0;i<prior.inputs.length;i++){
  const r=prior.inputs[i];if(r.transport!=='CURRENT_LOCAL_BFF_JSON')continue;
  const p=`${priorDir}/input-${i+1}.json`, b=await fs.readFile(path.join(ROOT,p));
  assert.equal(hash(b),r.sha256);metadata[r.route]={body:JSON.parse(b.toString()),bytes:b.length,sha256:r.sha256};inputs.push({...r,path:p,transport:'FROZEN_LOCAL_BFF_JSON'});
}
const reportPath=task+'/tmp/current-native-report-2026-10-01.json',reportBytes=await fs.readFile(path.join(ROOT,reportPath));
assert.equal(hash(reportBytes),prior.report.sha256);
inputs.push({path:reportPath,bytes:reportBytes.length,sha256:hash(reportBytes),transport:'ACTUAL_ORIGINAL_REPORT_BYTES'});
const raw=projectAdoptedSkyCatalog(JSON.parse(reportBytes.toString())).data;
const starRoute=`/v2/sky/catalogs/${raw.skyScene.catalog!.catalogVersion}/${raw.skyScene.catalog!.catalogHash}`;
const stars=metadata[starRoute].body.data,figures=metadata['/v2/sky/constellations'].body.data;
const at=new Date(raw.context.at).toISOString();
const attached=attachSkyCatalog(raw,stars);
const observer=exactSkyObservationFrame(attached,at)!.observer;
const generated=buildDeepSkyScene(attached.hourly.map(r=>r.at),{wgs84:{latitude:observer.latitude,longitude:observer.longitude,system:'WGS84'},altitudeM:observer.elevationM});
assert.equal(generated.state,'AVAILABLE');
assert.deepEqual(generated.catalog!.entries.map(e=>e.objectRef),attached.skyScene.deepSky!.catalog!.entries.map(e=>e.objectRef));
const current={...attached,skyScene:{...attached.skyScene,deepSky:generated}};
await fs.writeFile(path.join(out,'generated-deep-sky-scene.json'),JSON.stringify({producer:'current buildDeepSkyScene',observer,scene:generated,scope:'Current local producer on frozen report observer/times, not a new BFF/weather response.'},null,2)+'\n',{flag:'wx'});
inputs.push(await bind(relative+'/generated-deep-sky-scene.json'));
const envelope={...projectAdoptedSkyCatalog(JSON.parse(reportBytes.toString())),data:current};
const positions:any={};for(const seconds of [0,1,60,900]){const instant=new Date(Date.parse(at)+seconds*1000).toISOString();
 const position=celestialObjectPosition('M:51',instant,envelope);assert(position.data.position,'current actual position '+instant);positions[seconds]=position;
 await fs.writeFile(path.join(out,'position-'+seconds+'.json'),JSON.stringify(position,null,2)+'\n',{flag:'wx'});inputs.push(await bind(relative+'/position-'+seconds+'.json'));}

const preparedContextText=JSON.stringify({current,figures,at,positions});
await fs.writeFile(path.join(out,'prepared-browser-context.json'),preparedContextText+'\n',{flag:'wx'});
inputs.push({...await bind(relative+'/prepared-browser-context.json'),canonicalBodySha256:hash(preparedContextText),transport:'ACTUAL_PROJECT_ATTACH_PRESENT_OUTPUT_SEEDED_ONCE'});
const moonRow=current.hourly.find(r=>r.at===at)!;
const assets:any[]=[];
const offer=async(id:string,folder:string,asset:any,url:string)=>{
  const p='workers/miniapp-api/assets/'+folder+'/'+asset.file,b=await fs.readFile(path.join(ROOT,p));
  assert.equal(hash(b),asset.sha256,p);assert.equal(b.length,asset.bytes,p);
  const record={id,path:p,url,bytes:b.length,sha256:asset.sha256,width:asset.width,height:asset.height,
    format:p.endsWith('.png')?'png':'jpeg',base64:b.toString('base64')};assets.push(record);
  inputs.push({...record,base64:undefined,transport:'ACTUAL_LOCAL_PUBLISHED_BYTES_OFFER_ONLY'});
};
for(const image of figures.images)await offer(image.id,'constellations',image,`/v2/sky/constellations/${figures.catalogHash}/assets/${image.file}`);
for(const body of ['moon','mars','mercury','jupiter','saturn','uranus','neptune']){
  const m=metadata[`/v2/sky/${body}${body==='moon'?'/coverage':''}/manifest`].body;
  await offer(body,body,m.image,m.image.downloadUrl);
}
const galaxy=metadata['/v2/sky/galactic/manifest'].body;
await offer('galactic','deep-sky/galactic-2mass',galaxy.image,galaxy.image.downloadUrl);
const wide=metadata['/v2/sky/wide-field/manifest'].body;
for(const tile of wide.tiles)await offer('w3:0:'+tile.pixel,'deep-sky/wide-field-w3',{...tile,width:512,height:512},tile.downloadUrl);
const landscape=metadata['/v2/sky/landscape/manifest'].body;
for(const r of landscape.resources){
  await offer('landscape:'+r.id,'landscape',r.image,r.image.downloadUrl);
  const p='workers/miniapp-api/assets/landscape/'+r.alpha.file,b=await fs.readFile(path.join(ROOT,p));
  assert.equal(hash(b),r.alpha.sha256);assert.equal(b.length,r.alpha.bytes);
  metadata[r.alpha.downloadUrl]={body:JSON.parse(b.toString()),bytes:b.length,sha256:hash(b)};
  inputs.push({path:p,route:r.alpha.downloadUrl,bytes:b.length,sha256:hash(b),transport:'BOUND_LOCAL_ALPHA_JSON'});
}
// Offline real publication services, no new HTTP or invented discovery/manifest fields.
const selectedProducer=new DeepSkyImageryService(),sdssProducer=new SdssOpticalImageryService();
for(const reference of ['M:51','M:31']){
 const discovery=selectedProducer.discovery(reference),route='/v2/sky/deep-sky/selected/'+encodeURIComponent(reference)+'?imageVersion=source-finite-v3';
 const body=JSON.stringify(discovery,null,2)+'\n',p=relative+'/discovery-'+reference.replace(':','-')+'.json';
 await fs.writeFile(path.join(ROOT,p),body,{flag:'wx'});metadata[route]={body:discovery,bytes:Buffer.byteLength(body),sha256:hash(body)};
 inputs.push({...await bind(p),route,transport:'ACTUAL_OFFLINE_CURRENT_PUBLICATION_DISCOVERY'});
 for(const [level,a] of Object.entries(discovery.levels) as any[])await offer('selected:'+reference+':'+level,'deep-sky',{...a,width:a.pixels,height:a.pixels},a.downloadUrl);
}
const sdss=sdssProducer.currentManifest('M:51'),sdssRoute='/v2/sky/sdss-optical/manifest';
const sdssBody=JSON.stringify(sdss,null,2)+'\n',sdssPath=relative+'/sdss-M-51-manifest.json';
await fs.writeFile(path.join(ROOT,sdssPath),sdssBody,{flag:'wx'});metadata[sdssRoute]={body:sdss,bytes:Buffer.byteLength(sdssBody),sha256:hash(sdssBody)};
inputs.push({...await bind(sdssPath),route:sdssRoute,transport:'ACTUAL_OFFLINE_CURRENT_PUBLICATION_MANIFEST'});
for(const [level,a] of Object.entries(sdss.levels) as any[])await offer('sdss:M:51:'+level,'deep-sky/sdss-m51',{...a,width:a.pixels,height:a.pixels},a.downloadUrl);
for(const p of ['workers/miniapp-api/src/deep-sky-imagery.ts','workers/miniapp-api/src/sdss-optical-imagery.ts','workers/miniapp-api/assets/deep-sky/manifest.json','workers/miniapp-api/assets/deep-sky/sdss-m51/manifest.json',
 'packages/astronomy-core/src/deep-sky-catalog.ts','packages/astronomy-core/src/deep-sky-catalog-data.ts','packages/astronomy-core/src/astronomy-engine-runtime.ts',
 'packages/astronomy-core/data/opengc-messier-deep-sky.v1.json','packages/astronomy-core/data/opengc-messier-deep-sky.v1.manifest.json'])inputs.push(await bind(p));

// Actual revised SAO publication producer, validated original index/tile files.
const preparationPath='output/complete-resource-scope-preparation-1002-r2/result.json';
const preparation=JSON.parse(await fs.readFile(path.join(ROOT,preparationPath),'utf8'));
inputs.push(await bind(preparationPath));
const saoProducer=new SaoPublicationService(new URL('../../../../workers/miniapp-api/assets/sao-v2/',import.meta.url));
const saoIndex=await saoProducer.get(),saoRoute='/v2/sky/supplements/sao/v2';
const addSao=async(route:string,body:any,name:string)=>{const text=JSON.stringify(body)+'\n',p=relative+'/'+name;
 await fs.writeFile(path.join(ROOT,p),text,{flag:'wx'});metadata[route]={body,bytes:Buffer.byteLength(text),sha256:hash(text)};inputs.push({...await bind(p),route,transport:'ACTUAL_OFFLINE_SAO_PRODUCER_ENVELOPE'});};
await addSao(saoRoute,saoIndex,'sao-index-envelope.json');
const tileIds=[...new Set(preparation.proposedConditions.flatMap((r:any)=>r.sao.candidateTileIds))] as string[];
assert.equal(tileIds.length,29);
for(const id of tileIds){const tile=await saoProducer.tile(saoIndex.data.publicationHash,id);
 await addSao(saoRoute+'/'+saoIndex.data.publicationHash+'/tiles/'+id,tile,'sao-tile-'+id+'.json');
 const reference=saoIndex.data.index.tiles.find(t=>t.id===id)!;inputs.push(await bind('workers/miniapp-api/assets/sao-v2/'+reference.file));}
for(const p of ['workers/miniapp-api/assets/sao-v2/publication.json','workers/miniapp-api/assets/sao-v2/index.json',
 '.codex/work-items/cloud-sky-native-2026-09-22/scripts/experience-complete-resource-journey-2026-10-02.mts','.codex/work-items/cloud-sky-native-2026-09-22/scripts/experience-complete-resource-browser-2026-10-02.ts',
 '.codex/work-items/cloud-sky-native-2026-09-22/scripts/build-complete-resource-journey-2026-10-02.mjs',
 '.codex/work-items/cloud-sky-native-2026-09-22/scripts/launch-complete-resource-2026-10-03.ps1',
 'apps/wechat-miniapp/tsconfig.json','apps/wechat-miniapp/package.json','tools/run-node.cjs',
 'node_modules/esbuild/package.json','node_modules/tsx/package.json','node_modules/typescript/package.json'])inputs.push(await bind(p));
const pagePath=sky+'spot-sky-page.tsx',pageSource=await fs.readFile(path.join(ROOT,pagePath),'utf8');
const pageBinding=await bind(pagePath);inputs.push(pageBinding); // Pin this run, not a historical source hash.
const ast=ts.createSourceFile(pagePath,pageSource,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
const names=['starSunAltitudeDeg','stellarSupplement','optical','sdssOptical','wideField','moonTexture','marsTexture','mercuryTexture','jupiterBands','saturnBands',
 'uranusBands','neptuneBands','galacticImage','hipsTiles','constellationFrame','coordinateGridFrame','visibleFigures','artwork','landscapeImage'];
const declarations=new Map<string,ts.VariableStatement>();
const visit=(n:ts.Node)=>{if(ts.isVariableStatement(n))for(const d of n.declarationList.declarations)
 if(ts.isIdentifier(d.name)&&names.includes(d.name.text)){assert(!declarations.has(d.name.text));declarations.set(d.name.text,n);}ts.forEachChild(n,visit);};visit(ast);
assert.equal(declarations.size,names.length);
const pageStatements=names.map(name=>{
 const n=declarations.get(name)!,d=n.declarationList.declarations[0]!;
 const init=d.initializer!.getText(ast);
 return ['starSunAltitudeDeg','hipsTiles','constellationFrame','coordinateGridFrame','visibleFigures'].includes(name)?n.getText(ast):
  `const ${name}=globalThis.__controlled.tag(${JSON.stringify(name)},()=>(${init}));`;
}).join('\n');
const importHooks=names.filter(n=>!['starSunAltitudeDeg','hipsTiles','constellationFrame','coordinateGridFrame','visibleFigures','artwork'].includes(n)).map(n=>{
 const words:Record<string,string>={stellarSupplement:'stellar-supplement',optical:'optical-hips',sdssOptical:'sdss-optical',wideField:'wide-field-w3',moonTexture:'moon-texture',
 marsTexture:'mars-texture',mercuryTexture:'mercury-texture',jupiterBands:'jupiter-bands',saturnBands:'saturn-bands',
 uranusBands:'uranus-bands',neptuneBands:'neptune-bands',galacticImage:'galactic-image',landscapeImage:'landscape'};
 const f=words[n];const fn=n==='optical'?'useSkyOpticalHips':n==='wideField'?'useSkyWideFieldW3':n==='landscapeImage'?'useSkyLandscape':
  'useSky'+n[0]!.toUpperCase()+n.slice(1);
 return `import {${fn}} from './${sky}use-sky-${f}';`;
}).join('\n');
const getVariable=(name:string)=>{let found:ts.VariableStatement[]=[];const walk=(n:ts.Node)=>{if(ts.isVariableStatement(n)&&n.declarationList.declarations.some(d=>d.name.getText(ast)===name))found.push(n);ts.forEachChild(n,walk);};walk(ast);assert.equal(found.length,1,name);return found[0]!.getText(ast);};
const effectWith=(needle:string)=>{let found:ts.CallExpression[]=[];const walk=(n:ts.Node)=>{if(ts.isCallExpression(n)&&n.expression.getText(ast)==='useEffect'&&n.arguments[0]?.getText(ast).includes(needle))found.push(n);ts.forEachChild(n,walk);};walk(ast);assert.equal(found.length,1,needle);return found[0]!.getText(ast)+';';};
const selectedStatements=[
 '[deepSkyImageAsset, storeDeepSkyImageAsset]','[deepSkyImageDiscovery, setDeepSkyImageDiscovery]','deepSkyImageViewRef','deepSkyImageIntentRef','[canvasDeepSkyImage, storeCanvasDeepSkyImage]',
 'deepSkyImageFileRef','canvasDeepSkyImageRef','deepSkyRecoveryFileRef',
 'setDeepSkyImageAsset','setCanvasDeepSkyImage','retireDeepSkyDecode',
 '[deepSkyImageState, setDeepSkyImageState]','deepSkyImageFailureRef','[deepSkyImageRetry, setDeepSkyImageRetry]',
 'selectedDeepSkyEntry','deepSkyRegistrationReady','targetOpticalView','currentDeepSkyDiscovery','deepSkyImageInView','desiredDeepSkyImageLevel',
].map(getVariable).join('\n')+'\n'+pageSource.slice(pageSource.indexOf('  deepSkyImageViewRef.current = targetOpticalView;'),pageSource.indexOf('  deepSkyImageViewRef.current = targetOpticalView;')+'  deepSkyImageViewRef.current = targetOpticalView;'.length)+'\n'+pageSource.slice(pageSource.indexOf('  deepSkyImageIntentRef.current ='),pageSource.indexOf('  // Catalog refreshes preserve image ownership'))+'\n'+[
 effectWith('deepSkyImageFileRef.current?.release();'),effectWith('return startDeepSkyImageRequest({'),
 effectWith('const subscriptions = owned.map'),effectWith('const image = node.createImage()'),
].join('\n');
const creditStatements=['deepSkyImagePresented','presentedSdssOptical','sdssOpticalImagePresented','opticalImageCredit','sdssOpticalStatus','sdssOpticalCurrentImagePresented'].map(getVariable).join('\n');
let releaseCallbacks:ts.PropertyAssignment[]=[];const walkRelease=(n:ts.Node)=>{if(ts.isPropertyAssignment(n)&&n.name.getText(ast)==='releaseContext'&&n.initializer.getText(ast).includes('canvasGenerationRef.current++'))releaseCallbacks.push(n);ts.forEachChild(n,walkRelease);};walkRelease(ast);assert.equal(releaseCallbacks.length,1);
const releasePageCallback=releaseCallbacks[0]!.initializer.getText(ast);
await fs.writeFile(path.join(out,'actual-page-release-context.ts.txt'),releasePageCallback,{flag:'wx'});
let frameSdss:ts.PropertyAssignment[]=[];const walkSdss=(n:ts.Node)=>{if(ts.isPropertyAssignment(n)&&n.name.getText(ast)==='sdssOpticalImage'&&n.initializer.getText(ast).startsWith('canvasData &&'))frameSdss.push(n);ts.forEachChild(n,walkSdss);};walkSdss(ast);assert.equal(frameSdss.length,1);
const frameSdssExpression=frameSdss[0]!.initializer.getText(ast);
const creditText=(prefix:string)=>{let found:ts.JsxText[]=[];const walk=(n:ts.Node)=>{if(ts.isJsxText(n)&&n.getText(ast).trim().startsWith(prefix))found.push(n);ts.forEachChild(n,walk);};walk(ast);assert.equal(found.length,1);return found[0]!.getText(ast).trim();};
const sourceCreditLabels={selected:creditText('NASA/IPAC IRSA · AllWISE'),sdss:'ACTUAL skyOpticalSourceCredit / SkyOpticalImageCredit consumer'};
await fs.writeFile(path.join(out,'actual-selected-page-statements.ts.txt'),selectedStatements,{flag:'wx'});
await fs.writeFile(path.join(out,'actual-credit-and-frame-statements.ts.txt'),creditStatements+'\n'+frameSdssExpression,{flag:'wx'});
const property=(name:string)=>{let found:ts.PropertyAssignment[]=[];const walk=(n:ts.Node)=>{if(ts.isPropertyAssignment(n)&&n.name.getText(ast)===name&&n.parent.getText(ast).includes('pendingSkyPaintRef'))found.push(n);ts.forEachChild(n,walk);};walk(ast);assert.equal(found.length,1,name);return found[0]!.initializer.getText(ast);};
const actualPaint=property('paint'),actualPresented=property('presented'),actualSame=property('sameScene'),actualInvalidated=property('invalidated'),actualFailed=property('failed');
const actualDrawRequest=getVariable('draw'),actualRetry=getVariable('retryNativeImage')+'\n'+getVariable('retrySdssOptical');
const lifecycleEntry=`
import {createSkyCanvasLifecycle} from './${sky}sky-canvas-lifecycle';
import {drawSkyScene as actualDrawSkyScene} from './${sky}sky-scene-render';
import {skySdssOpticalFrame} from './${sky}sky-sdss-optical-frame';
import {liveSkyOpticalCompletion,sameSkyOpticalCompletion,sameSkyOpticalInput} from './${sky}sky-sdss-optical-completion';
import {copySkyDeepAuxiliaryDecisions,sameSkyDeepAuxiliaryDecisions} from './${sky}sky-deep-auxiliary-visibility';
import {resolvedSkyBodyReferences} from './${sky}sky-body-label-presentation';
import {resolveSkyCanvasView} from './${sky}sky-canvas-view';
import {NO_SKY_INSETS} from './${sky}sky-viewport';
import {dispatchSkyHipsImageFailure} from './${sky}sky-scene-render';
import {skySceneHasContent} from './${sky}sky-stellar-scene';
export function initializeActualPageLifecycle(){
 const w=globalThis.__controlled,canvasNodeRef=w.canvasNodeRef,canvasGenerationRef=w.canvasGenerationRef;
 const retireDeepSkyDecodeRef={current:()=>w.retireDeepSkyDecodeRef?.current()};
 const pendingSkyPaintRef={current:null},paintedSkyObjectsRef={current:null},canvasDrawRevisionRef={current:0};
 w.pendingSkyPaintRef=pendingSkyPaintRef;w.paintedSkyObjectsRef=paintedSkyObjectsRef;w.acceptedCount=0;w.publishCount=0;w.acceptanceTrace=[];
 const orientation={latestPresentation:{get current(){return w.orientationLive;}},presented:{current:null}},orientationController={snapshot:()=>w.orientationLive};
 const manualBasisRef=w.manualBasisRef,objectTracking=w.objectTracking,zoomRef={get current(){return w.paintInput.requestedFov;}},viewportInsetsRef={current:NO_SKY_INSETS},reducedMotionRef={current:false};
 const browsingCamera=w.browsingCamera,browsingTimerRef={current:null},browsingDrawRef={current:()=>w.actualCurrentDraw()};
 const Date={now:()=>w.cameraClock},EMPTY_SKY_IMAGES=new Map();
 const setPresentedSkyFrame=(update:any)=>{w.presentedSkyFrame=typeof update==='function'?update(w.presentedSkyFrame??null):update;if(typeof update==='function'){w.publishCount++;w.acceptanceTrace.push({kind:'actual-page-publish',publishCount:w.publishCount,stagedSnapshotId:w.identity(w.lastStageSnapshot),publishedSnapshotId:w.identity(w.paintedSkyObjectsRef.current),nativeGeneration:w.canvasGenerationRef.current});}};
 const setPresentedCamera=(update:any)=>{w.presentedCamera=typeof update==='function'?update(w.presentedCamera??null):update;};
 const setCanvasSize=(update:any)=>{w.acceptedSize=typeof update==='function'?update(w.acceptedSize??{width:390,height:844}):update;};
 const setCanvasError=(value:any)=>{w.canvasError=value;};
 const publishAcceptanceSkySceneInspection=(owner:any,facts:any)=>w.acceptanceTrace.push({kind:'inspection',owner,facts});
 const mark=(name:string,value:any)=>w.acceptanceTrace.push({kind:'availability',name,value});
 const setSolarLightUnavailable=(v:any)=>mark('solar',v),setMoonDiscUnavailable=(v:any)=>mark('moon',v),setPlanetDiscUnavailable=(v:any)=>mark('planet',v),setSunDiscUnavailable=(v:any)=>mark('sun',v),setLandscapeUnavailable=(v:any)=>mark('landscape',v),setGalacticBandUnavailable=(v:any)=>mark('galactic',v);
 const deepSkyImageFailureRef={current:null},setDeepSkyImageState=(value:any)=>mark('selected-state',value);
 const failure=(name:string)=>({get current(){return (image:any)=>w.lastPageResult[name].failedImage(image);}});
 const artworkFailureRef=failure('artwork'),wideFieldFailureRef=failure('wideField'),opticalFailureRef=failure('optical'),sdssOpticalFailureRef=failure('sdssOptical');
 const drawSkyScene=(...args:any[])=>{const staged=args[8],done=args[9];args[8]=(snapshot:any,sources:any)=>{w.lastStageSnapshot=snapshot;w.acceptanceTrace.push({kind:'staged',beforeAccepted:w.acceptedCount,frameAt:snapshot?.frameAt,previousFrameAt:w.presentedSkyFrame?.frameAt??null,preaid:snapshot?.deepSkyAuxiliaryDecisions??[]});return staged(snapshot,sources);};args[9]=()=>{w.acceptanceTrace.push({kind:'done',beforeAccepted:w.acceptedCount});return done();};return actualDrawSkyScene(...args);};
 const paint=${actualPaint},presented=${actualPresented},sameScene=${actualSame},invalidated=${actualInvalidated},failed=${actualFailed};
 const clockTasks=new Map(),clock={schedule(fn:any,delay:number){const id={};clockTasks.set(id,{fn,delay,due:w.cameraClock+delay});return id;},cancel(id:any){clockTasks.delete(id);}};
 const setTimeout=(fn:any,delay:number)=>clock.schedule(fn,delay),clearTimeout=(id:any)=>clock.cancel(id);
 w.hasBrowsingTimer=()=>browsingTimerRef.current!==null;
 w.runNextBrowsingTimer=()=>{const id=browsingTimerRef.current,task=clockTasks.get(id);if(!task||task.delay!==16)return false;clockTasks.delete(id);w.cameraClock=Math.max(w.cameraClock,task.due);task.fn();return true;};
 w.drainPaintClock=()=>{for(let n=0;n<20;n++){const entry=[...clockTasks].find(([id,t]:any)=>t.delay===0);if(!entry)return;clockTasks.delete(entry[0]);entry[1].fn();}throw Error('paint schedule bound');};
 w.lifecycle=createSkyCanvasLifecycle({measure(done:any){done({width:390,height:844});},createContext(){if(!w.canvasNodeRef.current)w.canvasNodeRef.current=w.makeCanvasNode();w.canvasRevision=w.canvasGenerationRef.current;if(w.rendererWasReleased)w.replaceRenderer();return w.renderer;},
  releaseContext:${releasePageCallback},paint,sameScene,presented(frame:any,size:any){w.acceptanceTrace.push({kind:'lifecycle-presented-notification',beforeAccepted:w.acceptedCount,frameAt:frame.frameAt});presented(frame,size);w.acceptedCount++;},invalidated,failed},clock);
 w.lifecycle.ready();
}
export function requestActualPageFrame(result:any,input:any,condition:any,request=true){
 const w=globalThis.__controlled;w.lastPageResult=result;w.paintInput=input;w.orientationLive={presentationRevision:1,alignment:{mode:'auto',view:condition.basis}};
 const useCallback=(fn:any)=>fn,canvasLifecycle=w.lifecycle,canvasNodeRevision=w.canvasRevision,canvasDrawRevisionRef={current:w.acceptedCount},skySceneInspectionOwnerRef={current:'controlled-resource-owner'},previousCanvasModeRef={current:'DAY'};
 const orientation={snapshot:{presentationRevision:1}},reportData=input.report,report={data:{dataState:'FRESH'},isError:false},row={at:input.at},devicePose={basis:condition.basis},sensorHeadingForScene=null,manualBasis=w.manualBasisRef.current,manualBasisRef=w.manualBasisRef,mode=input.mode??'DAY',verticalFovDeg=input.requestedFov;
 const sensorBasis=input.liveBasis,viewportInsets=NO_SKY_INSETS;
 const {canvasDeepSkyImage,sdssOptical,constellationFrame,artwork,hipsTiles,moonTexture,marsTexture,mercuryTexture,jupiterBands,saturnBands,neptuneBands,uranusBands,galacticImage,landscapeImage,stellarSupplement}=result;
 const constellationsEnabled=input.constellationsEnabled??true,landscapeEnabled=input.landscapeEnabled??true,coordinateGrids=input.coordinateGrids??{horizontal:false,equatorial:false},desiredDeepSkyImageLevel=result.desiredDeepSkyImageLevel,canvasFrameInfo={inspection:{spotId:input.report.context.spotId,frameAt:input.at,starCount:input.report.skyScene.catalog.entries.length}},publishAcceptanceSkySceneInspection=(owner:any,facts:any)=>w.acceptanceTrace.push({kind:'queued',owner,facts});
 ${actualDrawRequest}
 w.actualCurrentDraw=draw;if(request)draw();
}
export function retryActualPageSdss(result:any){const sdssOptical=result.sdssOptical,canvasLifecycle=globalThis.__controlled.lifecycle;${actualRetry} retrySdssOptical();}
`;
const entry=`import {useMemo,useState,useRef,useCallback,useEffect} from 'react';
import {deepSkyImageLevelForFov} from './${sky}sky-zoom';
import {startDeepSkyImageRequest} from './${sky}deep-sky-image-request';
import {registerSkyNativeImageLifetime} from './${sky}sky-artwork-loader';
import {beginDeepSkyImageDemand,getDeepSkyImageDiscovery,acquireDeepSkyImage} from './apps/wechat-miniapp/src/services/deep-sky-image-client';
import {skySolarLightAt} from './${sky}sky-solar-light';
import {skyViewportCenter} from './${sky}sky-viewport';
import {sdssOpticalPresentation} from './${sky}sky-sdss-optical-selection';
import {skyDeepSkyImageIntersectsView} from './${sky}sky-target-image-visibility';
import {skyOpticalSourceCredit} from './${sky}sky-optical-source-credit';
import {skyObjectPositionIsCurrent} from './${sky}sky-object-location';
import {createSkyViewBasis} from './${sky}sky-view-projection';
import {skyPresentedTimeCurrent} from './${sky}sky-observation-time';
${importHooks}
import {useSkyArtwork} from './${sky}use-sky-artwork';
import {resolveConstellationFrame} from './${sky}sky-constellation-scene';
import {constellationVisibility} from './${sky}sky-constellation-visibility';
import {artworkIntersectsView} from './${sky}sky-artwork-visibility';
import {exactSkyObservationFrame} from './${sky}sky-observation-frame';
export {createSkyGpuRenderer} from './${sky}sky-gpu-renderer';
export {drawSkyScene} from './${sky}sky-scene-render';
export {skyNativeImageIsCurrent,taskNativeImageMembership} from './${sky}sky-artwork-loader';
export {createSkyBrowsingCamera} from './${sky}sky-browsing-camera';
export {resolveSkyCanvasView} from './${sky}sky-canvas-view';
export {createSkyViewBasis,unprojectSkyPoint} from './${sky}sky-view-projection';
export {clampSkyFieldOfView,skyDomeFieldOfView} from './${sky}sky-zoom';
export {NO_SKY_INSETS} from './${sky}sky-viewport';
export {presentSkyTime} from './${sky}sky-time-presentation';
export {createSkyObjectTracking} from './${sky}sky-object-tracking';
export {skyLandscapeViewOpacity} from './${sky}sky-landscape-visibility';
export {initializeSkyPublicImageCache,clearSkyPublicImageCache} from './apps/wechat-miniapp/src/services/sky-public-image-runtime';
export function pageImages(input:any){
 const {wideFieldEnabled,canvasNodeRef,canvasSize,reducedMotion}=input;
 const presentedCamera=globalThis.__controlled.presentedCamera,manualBasis=globalThis.__controlled.manualBasisRef.current,sensorBasis=input.liveBasis,verticalFovDeg=input.requestedFov;
 ${getVariable('currentViewBasis')}
 ${getVariable('presentedFov')}
 ${getVariable('presentedCenter')}
 const pageVisible=input.pageVisible,rawReportData=input.report,reportData=input.report,geometryReport=input.report,
 report={data:{dataState:'FRESH'},isError:false},mode=input.mode??'DAY',canvasNodeRevision=input.canvasRevision,
 focusedDeepSkyReference=input.reference,canvasGenerationRef=input.canvasGenerationRef,
 constellationCatalog={data:{data:input.figures},isFetching:false},constellationsEnabled=input.constellationsEnabled??true,landscapeEnabled=input.landscapeEnabled??true,row={at:input.at};
 const recordAcceptanceDiagnostic=(...values:any[])=>globalThis.__controlled.diagnostics.push(values);
 ${getVariable('retireDeepSkyDecodeRef')}
 ${selectedStatements}
 retireDeepSkyDecodeRef.current=retireDeepSkyDecode;
 globalThis.__controlled.retireDeepSkyDecodeRef=retireDeepSkyDecodeRef;
 ${pageStatements}
 const canvasData=input.report;
 const frameSdssImage=${frameSdssExpression};
 return {qualification:{basis:currentViewBasis,fov:presentedFov,center:presentedCenter,usedAcceptedCamera:!!presentedCamera},stellarSupplement,optical,sdssOptical,wideField,moonTexture,marsTexture,mercuryTexture,jupiterBands,saturnBands,uranusBands,neptuneBands,
 galacticImage,hipsTiles,constellationFrame,coordinateGridFrame,visibleFigures,artwork,landscapeImage,
 deepSkyImageAsset,canvasDeepSkyImage,deepSkyImageState,desiredDeepSkyImageLevel,frameSdssImage,extractedSelectedEntry:selectedDeepSkyEntry,
 gates:{selectedReference:selectedDeepSkyEntry?.objectRef??null,deepSkyRegistrationReady,desiredDeepSkyImageLevel,selectedW3Active:Boolean(desiredDeepSkyImageLevel),sdssRequested:sdssOptical.requested,localOpticalFixtureEnabled:__MINIAPP_DEVELOPMENT_FIXTURE_MODE__,
 galaxyPageEnabled:!(wideFieldEnabled&&presentedFov>=60),wideFieldEnabled,pageVisible,mode}};
}
export function presentedImageFacts(result:any,presentedSkyFrame:any,input:any){
 const w=globalThis.__controlled,reportData=input.report,rawReportData=input.report,pageVisible=input.pageVisible,row={at:input.at},mode=input.mode??'DAY',timePlaying=false,timeIntent={runStartAt:null};
 const report={data:{dataState:'FRESH'},isError:false},manualBasis=w.manualBasisRef.current,devicePose={basis:input.liveBasis},orientation={presented:{current:input.liveBasis}};
 const canvasSize=input.canvasSize,canvasError=w.canvasError??null,sdssOptical=result.sdssOptical,canvasGenerationRef=w.canvasGenerationRef;
 ${getVariable('orientationData')}
 ${getVariable('presentedSceneCurrent')}
 ${getVariable('nativeCanvasMounted')}
 ${creditStatements}
 return {deepSkyImagePresented,sdssOpticalStatus,sdssOpticalCurrentImagePresented,
 labels:{selected:deepSkyImagePresented?${JSON.stringify(sourceCreditLabels.selected)}:null,
 sdss:opticalImageCredit},opticalImageCredit};
}
export function releasePageContext(context:any,refs:any){
 const {canvasNodeRef,canvasGenerationRef,retireDeepSkyDecodeRef}=refs;
 const releaseContext=${releasePageCallback};
 releaseContext(context);
}
export async function openActualOpticalSources(credit:any){
 const Taro=globalThis.__controlled.Taro,opticalSourcesOpeningRef=globalThis.__controlled.opticalSourcesOpeningRef;
 const notify=(message:any)=>globalThis.__controlled.notifications.push(message);
 ${getVariable('openOpticalSources')}
 return openOpticalSources(credit);
}
export function applyActualTrackedPosition(data:any,input:any){
 const w=globalThis.__controlled,objectTracking=w.objectTracking,pageVisible=input.pageVisible,contextSession={busy:false},timeSaving=false;
 const orientationController={snapshot:()=>w.orientationLive},reportData=input.report,row={at:input.at},skyTapRef={current:null},manualBasisRef=w.manualBasisRef;
 const positionCatalog=()=>input.report.skyScene.deepSky.catalog,setManualBasis=(basis:any)=>{w.manualBasisRef.current=basis;};
 ${getVariable('applyTrackedPosition')}
 applyTrackedPosition(data);return {tracking:objectTracking.snapshot(),basis:manualBasisRef.current};
}
${lifecycleEntry}`;
await fs.writeFile(path.join(out,'extracted-page-entry.ts.txt'),entry,{flag:'wx'});
const clientPath='apps/wechat-miniapp/src/services/api-client.ts',clientSource=await fs.readFile(path.join(ROOT,clientPath),'utf8');
const clientAst=ts.createSourceFile(clientPath,clientSource,ts.ScriptTarget.Latest,true);
const urlFunction=clientAst.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='constellationAssetUrl')!.getText(clientAst);
const saoAdapter=`import {createSaoCatalogClient} from './apps/wechat-miniapp/src/services/sao-catalog-client';
const bridge=(route:string,signal?:AbortSignal)=>new Promise((resolve,reject)=>{signal?.throwIfAborted();const w=globalThis.__controlled;const task=w.Taro.request({url:'https://approved.fixture.invalid'+route,success:(r:any)=>resolve(r.data),fail:reject});signal?.addEventListener('abort',()=>task.abort(),{once:true});});
const actualSaoClient=createSaoCatalogClient({index:signal=>bridge('/v2/sky/supplements/sao/v2',signal),tile:(hash,id,signal)=>bridge('/v2/sky/supplements/sao/v2/'+hash+'/tiles/'+id,signal),invalidateIndex(){globalThis.__controlled.saoClientEvents.push({invalid:'index'});},invalidateTile(hash,id){globalThis.__controlled.saoClientEvents.push({invalid:'tile',hash,id});}});
export const saoCatalogClient={async getIndex(...args:any[]){const r=await actualSaoClient.getIndex(...args);globalThis.__controlled.saoClientEvents.push({admitted:'index',publicationHash:r.data.publicationHash,indexTiles:r.data.index.tiles.length,frozen:Object.isFrozen(r.data)});return r;},async getTile(...args:any[]){const r=await actualSaoClient.getTile(...args);globalThis.__controlled.saoClientEvents.push({admitted:'tile',publicationHash:r.data.publicationHash,tileId:r.data.tile.tileId,tuples:r.data.tile.rows.length,frozen:Object.isFrozen(r.data)});return r;}};
`;
await fs.writeFile(path.join(out,'actual-sao-client-transport-adapter.ts.txt'),saoAdapter,{flag:'wx'});
const instrumented:any[]=[];
const bundle=await build({absWorkingDir:ROOT,stdin:{contents:entry,resolveDir:ROOT,sourcefile:'task-page-images.ts',loader:'ts'},bundle:true,write:false,metafile:true,
 platform:'browser',format:'iife',globalName:'fullHookProbe',target:'es2022',tsconfig:path.join(ROOT,'apps/wechat-miniapp/tsconfig.json'),
 define:{__MINIAPP_API_BASE__:JSON.stringify('https://approved.fixture.invalid'),__MINIAPP_DEVELOPMENT_FIXTURE_MODE__:'false',
 __MINIAPP_OPERATOR_PREVIEW_TOKEN__:'""',__MINIAPP_ACCEPTANCE_DIAGNOSTICS__:'false'},
 plugins:[{name:'controlled-target-adapters-and-read-only-diagnostics',setup(b){
  b.onResolve({filter:/^(react|@tarojs\/taro|@\/hooks\/use-resource-query|@\/services\/api-client)$/},a=>({path:a.path,namespace:'controlled'}));
  b.onLoad({filter:/.*/,namespace:'controlled'},a=>({contents:a.path==='react'?
   ['useRef','useState','useMemo','useCallback','useEffect'].map(n=>`export const ${n}=(...a)=>globalThis.__controlled.react.${n}(...a);`).join('\n'):
   a.path==='@tarojs/taro'?'export default globalThis.__controlled.Taro;':
   a.path==='@/hooks/use-resource-query'?'export const useResourceQuery=(o)=>globalThis.__controlled.query(o);':
   `import {MINIAPP_API_BASE_PATH} from '@starward/miniapp-contracts';${urlFunction}
${saoAdapter}`,loader:'ts',resolveDir:ROOT}));
  b.onLoad({filter:/[\\/]sky-stellar-tile-loader\.ts$/},async a=>{const original=await fs.readFile(a.path,'utf8');
 const changed=original.replace('export function createSkyStellarTileLoader(', 'function createActualSkyStellarTileLoader(').replace('    update(ids:readonly string[]){',`    __measure(){return {ownerId:globalThis.__controlled.identity(this),disposed,wanted:[...wanted],pending:[...pending].map(([id,c])=>({id,aborted:c.signal.aborted})),failed:[...failed],refresh:[...refresh],loaded:[...loaded].map(([id,tile])=>({id,tuples:tile.tile.rows.length,encodedSourceBytes:metadata.get(id)?.bytes??null,decodedPublicationJsonBytes:new TextEncoder().encode(JSON.stringify(tile)).byteLength,tupleNumericPayloadModel:tile.tile.rows.reduce((n,row)=>n+row.filter(v=>typeof v==='number').length*8,0),jsObjectBytes:null})),viewEncodedByteBudget:SKY_STELLAR_VIEW_BYTES,requestSlots:SKY_STELLAR_REQUESTS};},
    update(ids:readonly string[]){`)+`\nexport function createSkyStellarTileLoader(...args:Parameters<typeof createActualSkyStellarTileLoader>){const owner=createActualSkyStellarTileLoader(...args);globalThis.__controlled.stellarLoaders.push(owner);return owner;}\n`;assert.notEqual(changed,original);instrumented.push({path:path.relative(ROOT,a.path).replaceAll('\\','/'),originalSha256:hash(original),taskDiagnosticSha256:hash(changed)});await fs.writeFile(path.join(out,'diagnostic-stellar-loader.ts.txt'),changed,{flag:'wx'});return {contents:changed,loader:'ts'};});
  b.onLoad({filter:/[\\/]sky-scene-render\.ts$/},async a=>{const original=await fs.readFile(a.path,'utf8');
   const changed=original.replace('  const currentSupplement=currentStellarSupplement(supplement,data.skyScene,frameAt);','  const currentSupplement=currentStellarSupplement(supplement,data.skyScene,frameAt);\n  const measureSupplement=globalThis.__controlled.saoSceneObservation={resolvedPoints:currentSupplement?.points.length??0,appearanceEligible:0,projectedRendered:0,paintedIdentity:0};')
    .replace('    const projection=project(azimuthDeg,altitudeDeg);if(!projection)continue;','    measureSupplement.appearanceEligible++;const projection=project(azimuthDeg,altitudeDeg);if(!projection)continue;measureSupplement.projectedRendered++;if(appearance.opacity>=.1)measureSupplement.paintedIdentity++;');
   assert.notEqual(changed,original);assert(changed.includes('measureSupplement.projectedRendered++'));instrumented.push({path:path.relative(ROOT,a.path).replaceAll('\\','/'),originalSha256:hash(original),taskDiagnosticSha256:hash(changed)});await fs.writeFile(path.join(out,'diagnostic-scene.ts.txt'),changed,{flag:'wx'});return {contents:changed,loader:'ts'};});
  b.onLoad({filter:/[\\/]use-sky-stellar-supplement\.ts$/},async a=>{const original=await fs.readFile(a.path,'utf8');
 const changed=original.replace('  return {publication,frame:resolved.frame',`  globalThis.__controlled.stellarLoaderSnapshot=()=>loader.current?.__measure()??null;
  return {publication,frame:resolved.frame`);assert.notEqual(changed,original);instrumented.push({path:path.relative(ROOT,a.path).replaceAll('\\','/'),originalSha256:hash(original),taskDiagnosticSha256:hash(changed)});await fs.writeFile(path.join(out,'diagnostic-stellar-hook.ts.txt'),changed,{flag:'wx'});return {contents:changed,loader:'ts'};});
  b.onLoad({filter:/[\\/]sky-public-image-cache\.ts$/},async a=>{
   const original=await fs.readFile(a.path,'utf8');const changed=original.replace('export function createSkyPublicImageCache(', 'function createActualSkyPublicImageCache(')+
    '\nexport function createSkyPublicImageCache(...a:Parameters<typeof createActualSkyPublicImageCache>){const owner=createActualSkyPublicImageCache(...a);globalThis.__controlled.caches.push(owner);return owner;}\n';
   assert.notEqual(changed,original);instrumented.push({path:path.relative(ROOT,a.path).replaceAll('\\','/'),originalSha256:hash(original),taskDiagnosticSha256:hash(changed)});
   await fs.writeFile(path.join(out,'diagnostic-cache.ts.txt'),changed,{flag:'wx'});return {contents:changed,loader:'ts'};
  });
  b.onLoad({filter:/[\\/]sky-artwork-loader\.ts$/},async a=>{
   const original=await fs.readFile(a.path,'utf8');let changed=original.replace('update(next:readonly Asset[]){',`__measure(){return [...entries.values()].map(e=>({asset:e.asset,ids:[...e.ids],state:e.state,loaded:Boolean(e.loaded),file:Boolean(e.file),fileOwnerId:globalThis.__controlled.identity(e.file),fileReleaseId:globalThis.__controlled.identity(e.file?.release),fileLeaseCurrent:e.file?.isCurrent?.()??null,loadedOwnerId:globalThis.__controlled.identity(e.loaded),loadedReleaseId:globalThis.__controlled.identity(e.loaded?.release),loadedLeaseCurrent:e.loaded?.isCurrent?.()??null,image:e.loaded?.image??null,current:!!usable(e)}));},\n    update(next:readonly Asset[]){`);
   assert.notEqual(changed,original);instrumented.push({path:path.relative(ROOT,a.path).replaceAll('\\','/'),originalSha256:hash(original),taskDiagnosticSha256:hash(changed)});
   changed=changed.replace('  nativeImageLifetimes.set(image, lifetime);','  nativeImageLifetimes.set(image, lifetime); globalThis.__controlled.sampleResources?.("native-register");')
    .replace('return () => { lifetime.retired = true; delete lifetime.current; };','return () => { lifetime.retired = true; delete lifetime.current; globalThis.__controlled.sampleResources?.("native-retire"); };')
    + '\nexport function taskNativeImageMembership(image:object){const value=nativeImageLifetimes.get(image);return !value?"UNREGISTERED":value.retired?"RETIRED":value.current?.()?"CURRENT":"STALE";}\n';
   instrumented.at(-1).taskDiagnosticSha256=hash(changed);
   await fs.writeFile(path.join(out,'diagnostic-loader.ts.txt'),changed,{flag:'wx'});return {contents:changed,loader:'ts'};
  });
  b.onLoad({filter:/[\\/]use-sky-artwork\.ts$/},async a=>{
   const original=await fs.readFile(a.path,'utf8');const needle='return {...value,failedImage:failed,retryImages,suspendUnusedDecoded};';
   const changed=original.replace(needle,`globalThis.__controlled.hook({active,hash,wanted,byteBudget,retainedFallbackIds,owner:loader.current,value});\n  ${needle}`);
   assert.notEqual(changed,original);instrumented.push({path:path.relative(ROOT,a.path).replaceAll('\\','/'),originalSha256:hash(original),taskDiagnosticSha256:hash(changed)});
   await fs.writeFile(path.join(out,'diagnostic-hook.ts.txt'),changed,{flag:'wx'});return {contents:changed,loader:'ts'};
  });
 }}]});
const compiled=bundle.outputFiles[0]!.text;
await fs.writeFile(path.join(out,'runtime-metadata-and-offers.json'),JSON.stringify({metadata,assets:assets.map(({base64,...rest})=>rest)},null,2)+'\n',{flag:'wx'});
const sourceBindings:any[]=[],virtualInputs:any[]=[];
for(const inputKey of Object.keys(bundle.metafile!.inputs)){
 if(inputKey==='task-page-images.ts'||['controlled:react','controlled:@tarojs/taro','controlled:@/hooks/use-resource-query','controlled:@/services/api-client'].includes(inputKey)){
  virtualInputs.push({inputKey,reason:inputKey==='task-page-images.ts'?'frozen extracted entry':'explicit frozen target adapter'});continue;
 }
 const absolute=path.resolve(ROOT,inputKey),relativeInput=path.relative(ROOT,absolute).replaceAll('\\','/');
 assert.ok(relativeInput&&!relativeInput.startsWith('../')&&!path.isAbsolute(relativeInput),'metafile input must resolve inside approved root '+inputKey);
 sourceBindings.push({...await bind(relativeInput),metafileInput:inputKey,resolvedAbsolute:absolute});
}
for(const p of [pagePath,clientPath])if(!sourceBindings.some(r=>r.path===p))sourceBindings.push(await bind(p));
await fs.writeFile(path.join(out,'metafile.json'),JSON.stringify(bundle.metafile,null,2)+'\n',{flag:'wx'});
await fs.writeFile(path.join(out,'source-binding-before.json'),JSON.stringify({absWorkingDir:ROOT,sourceBindings,virtualInputs,nodePreparationBindings,nodeVirtualInputs,preserved,inputs},null,2)+'\n',{flag:'wx'});
for(let i=0;i<sourceBindings.length;i++){
 const p=path.join(out,'source-inputs',sourceBindings[i].path);await fs.mkdir(path.dirname(p),{recursive:true});await fs.copyFile(path.join(ROOT,sourceBindings[i].path),p);
}
for(const p of ['workers/miniapp-api/src/deep-sky-imagery.ts','workers/miniapp-api/src/sdss-optical-imagery.ts']){
 const target=path.join(out,'source-inputs',p);await fs.mkdir(path.dirname(target),{recursive:true});await fs.copyFile(path.join(ROOT,p),target);
}
await fs.writeFile(path.join(out,'bundle.js'),compiled,{flag:'wx'});
await fs.writeFile(path.join(out,'inputs.json'),JSON.stringify({report:await bind(reportPath),inputs,sourceBindings,instrumented},null,2)+'\n',{flag:'wx'});
inputs.push(await bind('.codex/work-items/cloud-sky-native-2026-09-22/scripts/experience-current-scene-browser-2026-10-03.ts'),await bind('.codex/work-items/cloud-sky-native-2026-09-22/scripts/build-current-scene-journey-2026-10-03.mjs'));
const toolFiles=[process.execPath,require.resolve('esbuild'),require.resolve('@esbuild/win32-x64/esbuild.exe'),require.resolve('typescript'),path.join(path.dirname(require.resolve('tsx/package.json')),'dist/cli.mjs'),require.resolve('tsx/esm'),require.resolve(PLAYWRIGHT),require.resolve(PLAYWRIGHT+'/package.json'),require.resolve(PLAYWRIGHT+'/../playwright-core'),require.resolve(PLAYWRIGHT+'/../playwright-core/package.json'),chromium.executablePath()];
const toolBindings=await Promise.all(toolFiles.map(bindAbsolute));
const toolchain={nodeVersion:process.version,nodePlatform:process.platform,nodeArch:process.arch,typescriptVersion:ts.version,esbuildVersion:require('esbuild').version,tsxVersion:require('tsx/package.json').version,playwrightVersion:require(PLAYWRIGHT+'/package.json').version,browserExecutable:chromium.executablePath(),launch:{executablePath:chromium.executablePath(),headless:true,args:['--use-gl=angle','--use-angle=swiftshader']},bindings:toolBindings,scope:'actual resolved entry/executable identities; not a complete vendor module load trace'};
await fs.writeFile(path.join(out,'toolchain-before.json'),JSON.stringify(toolchain,null,2)+'\n',{flag:'wx'});
const browser=await chromium.launch(toolchain.launch);
await fs.writeFile(path.join(out,'browser-version.json'),JSON.stringify({version:browser.version(),executable:chromium.executablePath(),launch:toolchain.launch},null,2)+'\n',{flag:'wx'});
const rows:any[]=[],errors:string[]=[],dynamicSaoBindings:any[]=[];let page:any;
try{
 page=await browser.newPage({viewport:{width:390,height:844}});page.on('pageerror',(e:Error)=>errors.push(e.message));
 const dynamicSao=new Map<string,Promise<any>>();
 await page.exposeFunction('__loadActualCachedSaoTile',async(route:string)=>{
  const prefix=saoRoute+'/'+saoIndex.data.publicationHash+'/tiles/';assert(route.startsWith(prefix),'dynamic SAO must use current validated publication');
  const id=route.slice(prefix.length),expected=saoIndex.data.index.tiles.find(t=>t.id===id);assert(expected,'dynamic SAO must be actual index tile');
  if(!dynamicSao.has(id))dynamicSao.set(id,(async()=>{const sourcePath='workers/miniapp-api/assets/sao-v2/'+expected.file,original=await bind(sourcePath);
   assert.equal(original.bytes,expected.bytes);assert.equal(original.sha256,expected.sha256);
   const body=await saoProducer.tile(saoIndex.data.publicationHash,id),text=JSON.stringify(body)+'\n',p=relative+'/dynamic-sao-tile-'+id+'.json';
   await fs.writeFile(path.join(ROOT,p),text,{flag:'wx'});const envelopeBinding=await bind(p);
   const row={id,route,source:original,envelope:envelopeBinding,bindingTime:'actual requested local tile bound before browser delivery; not initial run source inventory',requestOrdinal:dynamicSaoBindings.length+1};
   dynamicSaoBindings.push(row);inputs.push({...original,transport:'ACTUAL_REQUESTED_DYNAMIC_SAO_BEFORE_DELIVERY'}, {...envelopeBinding,transport:'ACTUAL_DYNAMIC_SAO_PRODUCER_ENVELOPE_BEFORE_DELIVERY'});
   await fs.writeFile(path.join(out,'dynamic-sao-inputs.json'),JSON.stringify(dynamicSaoBindings,null,2)+'\n');
   return {body,bytes:Buffer.byteLength(text),sha256:hash(text)};})());return dynamicSao.get(id);
 });
 await page.setContent('<canvas id="sky" width="390" height="844"></canvas>');
 await page.addScriptTag({content:'globalThis.__name=(fn,name)=>fn;'});
 const runtimeExecutor=({metadata,assets}:any)=>{
  const base='https://approved.fixture.invalid',files=new Map<string,ArrayBuffer>(),offers=new Map<string,any>();
  for(const a of assets){const bytes=Uint8Array.from(atob(a.base64),(c:string)=>c.charCodeAt(0));offers.set(base+a.url,{...a,bytes:bytes.buffer});}
  const slots:any[]=[],effects:Function[]=[],queryCache=new Map<string,any>(),queries:any[]=[];
  const requests:any[]=[],fsCalls:any[]=[],images:any[]=[],caches:any[]=[],hooks=new Map<string,any>();
  const objectIds=new WeakMap<object,number>();let nextObjectId=1;
  let cursor=0,dirty=false,currentTag='',decodedPending=0,decodedPeak=0,nativeRunning=0,nativePeak=0;
  const equal=(a:any[],b:any[])=>a?.length===b.length&&b.every((v,i)=>Object.is(v,a[i]));
  const react:any={useRef(value:any){return slots[cursor++]??={current:value};},
   useState(initial:any){const id=cursor++;if(!(id in slots))slots[id]=typeof initial==='function'?initial():initial;
    return [slots[id],(v:any)=>{const next=typeof v==='function'?v(slots[id]):v;if(!Object.is(next,slots[id])){slots[id]=next;dirty=true;}}];},
   useMemo(fn:Function,deps:any[]){const id=cursor++;if(!equal(slots[id]?.deps,deps))slots[id]={deps,value:fn()};return slots[id].value;},
   useCallback(v:any,deps:any[]){return react.useMemo(()=>v,deps);},
   useEffect(effect:Function,deps:any[]){const id=cursor++,previous=slots[id];if(equal(previous?.deps,deps))return;
    slots[id]={deps};effects.push(()=>{previous?.cleanup?.();slots[id].cleanup=effect();});}};
  const callback=(f:Function)=>queueMicrotask(()=>f());
  const filesystem={mkdir(o:any){fsCalls.push({operation:'mkdir',path:o.dirPath});callback(o.success);},readdir(o:any){fsCalls.push({operation:'readdir',path:o.dirPath});callback(()=>o.success({files:[...files.keys()].filter(p=>p.startsWith(o.dirPath+'/')).map(p=>p.slice(o.dirPath.length+1))}));},
   stat(o:any){fsCalls.push({operation:'stat',path:o.path});callback(()=>files.has(o.path)?o.success({stats:{isFile:()=>true,size:files.get(o.path)!.byteLength}}):o.fail({errMsg:'no such file or directory'}));},
   readFile(o:any){fsCalls.push({operation:'read',path:o.filePath,length:o.length});callback(()=>files.has(o.filePath)?
     o.success({data:files.get(o.filePath)!.slice(o.position??0,(o.position??0)+o.length)}):o.fail({errMsg:'no such file or directory'}));},
   writeFile(o:any){fsCalls.push({operation:'write',path:o.filePath,bytes:o.data.byteLength});callback(()=>{files.set(o.filePath,o.data.slice(0));o.success();});},
   rename(o:any){fsCalls.push({operation:'rename',from:o.oldPath,to:o.newPath});callback(()=>{if(!files.has(o.oldPath))return o.fail({errMsg:'missing'});files.set(o.newPath,files.get(o.oldPath)!);files.delete(o.oldPath);o.success();});},
   unlink(o:any){fsCalls.push({operation:'unlink',path:o.filePath});callback(()=>{files.delete(o.filePath);o.success?.();});}};
  const Taro={env:{USER_DATA_PATH:'/controlled'},getFileSystemManager:()=>filesystem,async navigateTo(o:any){w.navigationEvents.push({kind:'navigateTo',url:o.url});},request(o:any){
   let done=false;const route=o.url.slice(base.length),asset=offers.get(o.url),json=metadata[route];
   const r={url:o.url,route,type:o.responseType==='arraybuffer'?'image':'metadata',resourceFamily:route.includes('/supplements/sao/')?route.includes('/tiles/')?'sao-tile':'sao-index':asset?'image':'metadata',bytes:asset?.bytes.byteLength??json?.bytes??0,
    sha256:asset?.sha256??json?.sha256??null,completed:false};requests.push(r);nativeRunning++;nativePeak=Math.max(nativePeak,nativeRunning);
   const complete=(resolved=json)=>{if(done)return;done=true;nativeRunning--;r.completed=true;
    if(o.responseType==='arraybuffer'&&asset)o.success({statusCode:200,data:asset.bytes.slice(0)});
    else if(resolved){r.bytes=resolved.bytes;r.sha256=resolved.sha256;o.success({statusCode:200,data:structuredClone(resolved.body)});}else o.fail({errMsg:'unoffered frozen resource'});};
   if(asset?.id==='sdss:M:51:DETAIL'&&w.holdDetail){w.holdDetail=false;(r as any).held=true;
     w.heldTransfers.push({fail(){if(done)return;done=true;nativeRunning--;r.completed=true;(r as any).failed=true;o.fail({errMsg:'controlled single detail transfer failure'});}});
   }else if(!json&&route.includes('/supplements/sao/')&&route.includes('/tiles/'))callback(()=>{if(done)return;Promise.resolve((globalThis as any).__loadActualCachedSaoTile(route)).then(complete,error=>{if(done)return;done=true;nativeRunning--;r.completed=true;(r as any).failed=true;o.fail({errMsg:String(error)});});});
   else callback(()=>complete());return {abort(){if(done)return;done=true;nativeRunning--;r.completed=true;(r as any).aborted=true;o.fail({errMsg:'actual controlled abort callback'});},catch(){}};}};
  const makeCanvasNode=()=>({createImage(){
   const image=new Image(),id=images.length;let source='',blob:string|undefined;
   const record:any={id,image,path:'',offeredId:null,sourceSha256:null,status:'created',bytes:0,width:0,height:0};images.push(record);
   Object.defineProperty(image,'src',{get:()=>source,set(value:string){source=value;record.path=value;
    const b=files.get(value);if(!b){record.status='missing';queueMicrotask(()=>image.onerror?.(new Event('error')));return;}
    const asset=[...offers.values()].find(a=>value.includes(a.sha256));if(!asset)throw Error('decoded source identity absent');
    record.offeredId=asset.id;record.sourceSha256=asset.sha256;record.bytes=b.byteLength;record.width=asset.width;record.height=asset.height;
    record.status='pending';decodedPending++;decodedPeak=Math.max(decodedPeak,decodedPending);blob=URL.createObjectURL(new Blob([b],{type:'image/'+asset.format}));
    w.sampleResources?.('decode-start');image.addEventListener('load',()=>{record.status='decoded';record.width=image.naturalWidth;record.height=image.naturalHeight;decodedPending--;if(blob)URL.revokeObjectURL(blob);w.sampleResources?.('decode-complete');},{once:true});
    image.addEventListener('error',()=>{record.status='error';decodedPending--;if(blob)URL.revokeObjectURL(blob);w.sampleResources?.('decode-error');},{once:true});image.setAttribute('src',blob);
   }});return image;}});
  const canvasNode=makeCanvasNode();
  const w:any={react,Taro,caches,slots,effects,files,offers,requests,fsCalls,images,hooks,canvasNode,queries,makeCanvasNode,diagnostics:[],heldTransfers:[],holdDetail:false,saoClientEvents:[],stellarLoaders:[],navigationEvents:[],notifications:[],opticalSourcesOpeningRef:{current:false},manualBasisRef:{current:null},
   canvasNodeRef:{current:canvasNode},canvasGenerationRef:{current:1},canvasRevision:1,
   identity(value:any){if((typeof value!=='object'||value===null)&&typeof value!=='function')return null;let id=objectIds.get(value);if(id===undefined){id=nextObjectId++;objectIds.set(value,id);}return id;},
   tag(name:string,fn:Function){const old=currentTag;currentTag=name;try{return fn();}finally{currentTag=old;}},
   hook(info:any){hooks.set(currentTag,info);w.sampleResources?.('hook-publish');},
   query(o:any){const key=JSON.stringify(o.queryKey);let row=queryCache.get(key);
    queries.push({tag:currentTag,key,enabled:!!o.enabled});
    if(o.enabled&&!row){row={pending:true,data:undefined,error:false};queryCache.set(key,row);Promise.resolve().then(()=>o.queryFn()).then(data=>{row.data=data;row.pending=false;dirty=true;},()=>{row.error=true;row.pending=false;dirty=true;});}
    return {data:row?.data,isFetching:!!(o.enabled&&row?.pending),isError:!!row?.error,refreshError:null,refetch:async()=>{if(!o.enabled)return row?.data;row.pending=true;dirty=true;try{row.data=await o.queryFn();row.error=false;return row.data;}catch(error){row.error=true;throw error;}finally{row.pending=false;dirty=true;}}};},
   begin(){cursor=0;dirty=false;hooks.clear();queries.length=0;},
   commit(fn:Function){let result:any;for(let i=0;i<100;i++){w.begin();result=fn();for(const e of effects.splice(0))e();if(!dirty&&!effects.length)return result;}throw Error('controlled React render bound');},
   queryRetention(){return [...queryCache].map(([key,r])=>({key,pending:r.pending,hasData:!!r.data,jsonBytes:r.data?new TextEncoder().encode(JSON.stringify(r.data)).byteLength:0}));},
   counters(){return {decodedPending,decodedPendingPeak:decodedPeak,nativeRunning,nativeCallbackPeak:nativePeak};},
   imageInfo(image:object){const r=images.find(r=>r.image===image);return r?{objectId:r.id,offeredId:r.offeredId,sha256:r.sourceSha256,path:r.path,width:r.width,height:r.height,status:r.status}:null;}};
  (globalThis as any).__controlled=w;
 };
 await fs.writeFile(path.join(out,'executor-runtime.js.txt'),runtimeExecutor.toString(),{flag:'wx'});
 await page.evaluate(runtimeExecutor,{metadata,assets});
 await page.addScriptTag({content:compiled});
 await fs.writeFile(path.join(out,'executor-gpu.js.txt'),currentGpuExecutor.toString(),{flag:'wx'});
 await page.evaluate(currentGpuExecutor);
 const conditions:any[]=[
 {name:'cold-north45',pose:[0,135,0],fov:45,reference:null,cold:true},
 {name:'landscape-centre-fade',pose:[0,80,0],fov:85,reference:null},
 {name:'full-sphere',pose:[0,80,0],fov:'DOME',reference:null},
 {name:'selected-overview',target:'M:51',fov:8,reference:'M:51'},
 {name:'selected-detail-failure-retry',target:'M:51',fov:.05,reference:'M:51',refinement:true},
 {name:'selected-offscreen',target:'M:51',offsetAz:90,fov:.05,reference:'M:51'},
 {name:'selected-warm-return',target:'M:51',fov:.05,reference:'M:51'},
 {name:'wide-w3',pose:[0,135,0],fov:139,reference:null,wideFieldEnabled:true},
 {name:'wide-galaxy',pose:[0,135,0],fov:139,reference:null,wideFieldEnabled:false},
 {name:'layers-off',pose:[0,135,0],fov:45,reference:null,wideFieldEnabled:false,constellationsEnabled:false,landscapeEnabled:false},
 {name:'layers-restored',pose:[0,135,0],fov:45,reference:null,wideFieldEnabled:false},
 {name:'red-mode',pose:[0,135,0],fov:45,reference:null,mode:'OBSERVATION'},
 {name:'ordinary-mode-return',pose:[0,135,0],fov:45,reference:null},
 ...['MOON','MERCURY','VENUS','MARS','JUPITER','SATURN','URANUS','NEPTUNE'].map(body=>({name:'body-browse-'+body.toLowerCase(),body,fov:body==='MOON'?1:.01,reference:null})),
 {name:'tracking-start',target:'M:51',fov:.05,reference:'M:51',tracking:true,timeSeconds:0},
 {name:'tracking-one-second',target:'M:51',fov:.05,reference:'M:51',tracking:true,timeSeconds:1},
 {name:'tracking-one-minute',target:'M:51',fov:.05,reference:'M:51',tracking:true,timeSeconds:60},
 {name:'tracking-preview-fifteen-minutes',target:'M:51',fov:.05,reference:'M:51',tracking:true,timeSeconds:900},
 {name:'tracking-cancel-original-time',target:'M:51',fov:.05,reference:'M:51',tracking:true,timeSeconds:0},
 {name:'source-back',target:'M:51',fov:.05,reference:'M:51',tracking:true,timeSeconds:0,sourceRoundTrip:true},
 {name:'hide-return',pose:[0,135,0],fov:45,reference:null,hideRoundTrip:true}
 ];
 await fs.writeFile(path.join(out,'conditions.json'),JSON.stringify({at,conditions,viewport:{width:390,height:844},scope:'Bounded sequential page/Scene development path. Caller controlled gesture/time/navigation delivery; native touch/sensors/WXML not emulated.'},null,2)+'\n',{flag:'wx'});
 const stableExecutor=({current,figures,at,positions}:any)=>{
  const w=(globalThis as any).__controlled,api=(globalThis as any).fullHookProbe;
  if(w.stable)throw Error('browser report may be seeded only once');
  w.stable={current,figures,at,positions};w.objectTracking=api.createSkyObjectTracking();w.stableCanonical=JSON.stringify(w.stable);w.stableRuntimeOwners={node:w.canvasNodeRef.current,renderer:w.renderer,gl:w.gl};
  w.stableRefs={report:current,scene:current.skyScene,catalog:current.skyScene.catalog,entries:current.skyScene.catalog?.entries,
   deepCatalog:current.skyScene.deepSky?.catalog,deepEntries:current.skyScene.deepSky?.catalog?.entries,figures};
  w.browsingCamera=api.createSkyBrowsingCamera();w.cameraClock=0;w.firstSelectedEntry=undefined;
  w.assertStableOwners=({afterRelease=false}={})=>{const fail=(name:string)=>{throw Error('stable actual owner changed '+name);};
   if(JSON.stringify(w.stable)!==w.stableCanonical)fail('canonical report/catalog/figures');
   const refs={report:current,scene:current.skyScene,catalog:current.skyScene.catalog,entries:current.skyScene.catalog?.entries,deepCatalog:current.skyScene.deepSky?.catalog,deepEntries:current.skyScene.deepSky?.catalog?.entries,figures};
   for(const [key,value]of Object.entries(refs))if(value!==w.stableRefs[key])fail(key);
   if(w.gl!==w.stableRuntimeOwners.gl)fail('gl ledger');
   if(afterRelease&&w.canvasNodeRef.current!==null)fail('released canvas node');return true;};
 };
 await fs.writeFile(path.join(out,'executor-stable-context.js.txt'),stableExecutor.toString(),{flag:'wx'});
 await page.evaluate(stableExecutor,JSON.parse(preparedContextText));
 await page.evaluate(()=>globalThis.fullHookProbe.initializeActualPageLifecycle()); // Only this transport creates browser report/catalog objects.
 await fs.writeFile(path.join(out,'executor-journey.js.txt'),currentJourneyExecutor.toString(),{flag:'wx'});
 for(const condition of conditions){
  if(condition.sourceRoundTrip||condition.hideRoundTrip){
   const hidden=await page.evaluate(currentHideExecutor,{source:!!condition.sourceRoundTrip});
   await fs.writeFile(path.join(out,condition.name+'-hidden.json'),JSON.stringify(hidden,null,2)+'\n',{flag:'wx'});
   assert.equal(hidden.presented,null);
   assert.equal(hidden.current.length,0,'registered images current after hide');
   await page.evaluate(currentShowExecutor);
  }
  const r=await page.evaluate(currentJourneyExecutor,{condition});
  const captured=r.passes.map((p:any)=>{const {rgba,capture,...rest}=p;return {...rest,rgbaSha256:hash(Buffer.from(rgba,'base64')),pngSha256:hash(Buffer.from(capture.split(',')[1],'base64'))};});
  for(const p of r.passes){const name=condition.name+'-'+p.label;await fs.writeFile(path.join(out,name+'.rgba'),Buffer.from(p.rgba,'base64'),{flag:'wx'});await fs.writeFile(path.join(out,name+'.png'),Buffer.from(p.capture.split(',')[1],'base64'),{flag:'wx'});}
  const row={...r,passes:captured};rows.push(row);await fs.writeFile(path.join(out,condition.name+'.json'),JSON.stringify(row,null,2)+'\n',{flag:'wx'});
  assert.equal(row.gates.localOpticalFixtureEnabled,false);assert.deepEqual(row.gpuFailures,[]);
  console.log(JSON.stringify({output:relative,name:condition.name,submits:row.passes.length,rgbaModel:row.ready.resources.ownerRgbaModel,leases:row.ready.resources.leases,at:row.ready.at}));
 }
 await fs.writeFile(path.join(out,'executor-final.js.txt'),currentFinalExecutor.toString(),{flag:'wx'});
 const final=await page.evaluate(currentFinalExecutor);await fs.writeFile(path.join(out,'actual-final-owner.json'),JSON.stringify(final,null,2)+'\n',{flag:'wx'});
 const handleLeaks=final.afterClear.gpu.handles.filter((h:any)=>h.alive);
 const retirementFailures=[];
 if(handleLeaks.length)retirementFailures.push({kind:'gl-handle-leak',handles:handleLeaks});
 if(final.afterHide.nativeCurrent.some((i:any)=>i.membership==='CURRENT'))retirementFailures.push({kind:'native-owner-current-after-hide'});
 if(final.afterHide.presented!==null)retirementFailures.push({kind:'presented-after-hide'});
 for(const cache of final.afterClear.cache)for(const name of ['leased','running','pending','reserved','bytes','entries','retired'])if(cache[name])retirementFailures.push({kind:'cache-after-clear',name,value:cache[name]});
 for(const owner of final.afterClear.sao)if(!owner.disposed||owner.wanted.length||owner.loaded.length||owner.pending.length||owner.refresh.length||owner.failed.length)retirementFailures.push({kind:'sao-owner-after-clear',owner});
 for(const name of ['decodedPending','nativeRunning'])if(final.afterClear.counters[name])retirementFailures.push({kind:'pending-after-clear',name});
 await fs.writeFile(path.join(out,'retirement-observations.json'),JSON.stringify({retirementFailures,scope:'observations retained before assertions; shader/program driver storage remains unknown'},null,2)+'\n',{flag:'wx'});
 const comparisons=final.comparisons??[];
 for(const r of sourceBindings)assert.deepEqual(await bind(r.path),{path:r.path,bytes:r.bytes,sha256:r.sha256},'production source frozen during harness');
 for(const r of inputs)if(r.path&&r.sha256)assert.equal((await bind(r.path)).sha256,r.sha256);
 const afterSources=await Promise.all(sourceBindings.map(r=>bind(r.path))),afterInputs=await Promise.all(inputs.filter(r=>r.path).map(r=>bind(r.path))),afterPreserved=await Promise.all(preserved.map((r:any)=>bind(r.path)));
 assert.deepEqual(afterPreserved.map(({path,sha256})=>({path,sha256})),preserved);
 await fs.writeFile(path.join(out,'source-binding-after.json'),JSON.stringify({sourceBindings:afterSources,inputs:afterInputs,preserved:afterPreserved},null,2)+'\n',{flag:'wx'});
 const afterTools=await Promise.all(toolFiles.map(bindAbsolute));assert.deepEqual(afterTools,toolBindings,'actual tool identities frozen during execution');await fs.writeFile(path.join(out,'toolchain-after.json'),JSON.stringify({...toolchain,bindings:afterTools},null,2)+'\n',{flag:'wx'});
 await fs.writeFile(path.join(out,'result.json'),JSON.stringify({status:retirementFailures.length||errors.length?'MEASURED_WITH_FAILURES':'MEASURED_SOFTWARE_COMPLETE_RESOURCE_LANE',
  retirementFailures,returnComparisons:comparisons,dynamicSaoBindings,toolchain:{...toolchain,browserVersion:browser.version()},report:await bind(reportPath),sourceBindings,nodePreparationBindings,instrumented,compiledSha256:hash(compiled),virtualInputs,sourceCreditLabels,inputs,rows,final,errors,
  scope:'Current continuous page/Scene journey: actual current selected demand/render guard, layer policy, source-credit/navigation action, tracking acceptance/camera command, lifecycle/Scene/shared cache, task resource observer and real encoded bytes. Controlled React/Taro/MapFS/clock/navigation delivery. Native WXML/phone/physical memory/final quality and 200DAU remain unverified. Historical scaffold scope: One sameCanvas five legal camera state lane, real page qualification/14 relevant Hooks incl actual SAO client/loader+bytes, actual page request/paint and lifecycle staged/accepted callbacks. Controlled React/Taro/transport and measurement/context/clock adapters; actual api-operation/response-cache/Tanstack timing not executed for SAO. Normal science and LOCAL remain disabled; no new probe/budget. All full PNG and bottom-up RGBA saved per cold/normal/held/fail/retry submit. GL methods call original this/args/result; texture and buffer allocation models, attachments and handles separate. Diagnostic strong images/offer bytes and browser metadata retention separate; driver/RSS/native/GC unknown. Not 12Mbps/client FPS/200DAU/quality/native/final acceptance.'},null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({output:relative,result:await bind(relative+'/result.json'),rows:rows.length,retirementFailures}));
 assert.deepEqual(retirementFailures,[],'actual owner retirement failure; raw artifacts retained');assert.deepEqual(errors,[]);
}catch(e){let partial:any=null;try{partial=await page?.evaluate(()=>{const w=globalThis.__controlled;return {passes:w?.partialPasses??[],acceptanceTrace:w?.acceptanceTrace??[],gpu:w?.gpu?.full(),counters:w?.counters(),sao:w?.stellarLoaders?.map(l=>l.__measure()),presentedCamera:w?.presentedCamera,canvasError:w?.canvasError};});}catch(observationError){partial={observationError:String(observationError)};}
 for(let i=0;i<(partial?.passes?.length??0);i++){const p=partial.passes[i];await fs.writeFile(path.join(out,'failure-partial-'+i+'.rgba'),Buffer.from(p.rgba,'base64'),{flag:'wx'});await fs.writeFile(path.join(out,'failure-partial-'+i+'.png'),Buffer.from(p.capture.split(',')[1],'base64'),{flag:'wx'});const {rgba,capture,...rest}=p;partial.passes[i]=rest;}
 await fs.writeFile(path.join(out,'failed.json'),JSON.stringify({status:'FAILED',message:String(e),rows:rows.map(r=>r.condition.name),errors,partial,sourceBindings,instrumented},null,2)+'\n',{flag:'wx'});throw e;}
finally{await browser.close();}
