/** Task-only: actual page gates -> full hooks/cache/request/loader -> same desktop decoded image -> software GPU. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import ts from 'typescript';
import {build} from 'esbuild';
import {projectAdoptedSkyCatalog} from '../../../../apps/wechat-miniapp/src/services/sky-report-catalog.ts';
import {DeepSkyImageryService} from '../../../../workers/miniapp-api/src/deep-sky-imagery.ts';
import {SdssOpticalImageryService} from '../../../../workers/miniapp-api/src/sdss-optical-imagery.ts';
import {attachSkyCatalog,resolveSkyDeepSkyScene} from '../../../../apps/wechat-miniapp/src/features/sky/sky-stellar-scene.ts';
import {presentSkyTime} from '../../../../apps/wechat-miniapp/src/features/sky/sky-time-presentation.ts';
import {createSkyViewBasis} from '../../../../apps/wechat-miniapp/src/features/sky/sky-view-projection.ts';
import {clampSkyFieldOfView} from '../../../../apps/wechat-miniapp/src/features/sky/sky-zoom.ts';

const ROOT=fileURLToPath(new URL('../../../../',import.meta.url));
const task='.codex/work-items/cloud-sky-native-2026-09-22', sky='apps/wechat-miniapp/src/features/sky/';
const hash=(v:Uint8Array|string)=>createHash('sha256').update(v).digest('hex');
const bind=async(p:string)=>{const b=await fs.readFile(path.join(ROOT,p));return {path:p,bytes:b.length,sha256:hash(b)};};
let relative='output/playwright/cloud-sky-selected-full-hook-1002-r1';
for(let n=2;;n++){try{await fs.access(path.join(ROOT,relative));relative=`output/playwright/cloud-sky-selected-full-hook-1002-r${n}`;}catch{break;}}
const out=path.join(ROOT,relative);await fs.mkdir(out,{recursive:true});
await fs.copyFile(fileURLToPath(import.meta.url),path.join(out,'executed-script.mts.txt'));
const priorDir='output/playwright/cloud-sky-wide-resource-composition-1002';
const prior=JSON.parse(await fs.readFile(path.join(ROOT,priorDir,'result.json'),'utf8'));
const inputs:any[]=[];
const preserved=JSON.parse(await fs.readFile(path.join(ROOT,task,'tmp/resume-preserved-hashes-2026-10-01.json'),'utf8'));
for(const row of preserved)assert.equal((await bind(row.path)).sha256,row.sha256);
assert.equal((await bind(sky+'sky-gpu-textures.ts')).sha256,'a353bc12a9e84757b54e2a14d39087bb2736e814e4440f814089c8d3942b2db3');
const originalHarness=await bind(task+'/scripts/experience-full-hook-resource-journey-2026-10-02.mts');
assert.equal(originalHarness.sha256,'b3fbc0747d6b463a265536642a589594a87f5bac0004660635e71aef840e902a');
inputs.push(originalHarness);
const metadata:Record<string,any>={};
for(let i=0;i<prior.inputs.length;i++){
  const r=prior.inputs[i];if(r.transport!=='CURRENT_LOCAL_BFF_JSON')continue;
  const p=`${priorDir}/input-${i+1}.json`, b=await fs.readFile(path.join(ROOT,p));
  assert.equal(hash(b),r.sha256);metadata[r.route]={body:JSON.parse(b.toString()),bytes:b.length,sha256:r.sha256};inputs.push({...r,path:p,transport:'FROZEN_LOCAL_BFF_JSON'});
}
const reportPath=task+'/tmp/current-native-report-2026-10-01.json',reportBytes=await fs.readFile(path.join(ROOT,reportPath));
assert.equal(hash(reportBytes),prior.report.sha256);
const raw=projectAdoptedSkyCatalog(JSON.parse(reportBytes.toString())).data;
const starRoute=`/v2/sky/catalogs/${raw.skyScene.catalog!.catalogVersion}/${raw.skyScene.catalog!.catalogHash}`;
const stars=metadata[starRoute].body.data,figures=metadata['/v2/sky/constellations'].body.data;
const at=new Date(raw.context.at).toISOString();
const current=attachSkyCatalog(presentSkyTime(raw,at)!.report,stars);
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

const pagePath=sky+'spot-sky-page.tsx',pageSource=await fs.readFile(path.join(ROOT,pagePath),'utf8');
const ast=ts.createSourceFile(pagePath,pageSource,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
const names=['optical','sdssOptical','wideField','moonTexture','marsTexture','mercuryTexture','jupiterBands','saturnBands',
 'uranusBands','neptuneBands','galacticImage','hipsTiles','constellationFrame','coordinateGridFrame','visibleFigures','artwork','landscapeImage'];
const declarations=new Map<string,ts.VariableStatement>();
const visit=(n:ts.Node)=>{if(ts.isVariableStatement(n))for(const d of n.declarationList.declarations)
 if(ts.isIdentifier(d.name)&&names.includes(d.name.text)){assert(!declarations.has(d.name.text));declarations.set(d.name.text,n);}ts.forEachChild(n,visit);};visit(ast);
assert.equal(declarations.size,names.length);
const pageStatements=names.map(name=>{
 const n=declarations.get(name)!,d=n.declarationList.declarations[0]!;
 const init=d.initializer!.getText(ast);
 return ['hipsTiles','constellationFrame','coordinateGridFrame','visibleFigures'].includes(name)?n.getText(ast):
  `const ${name}=globalThis.__controlled.tag(${JSON.stringify(name)},()=>(${init}));`;
}).join('\n');
const importHooks=names.filter(n=>!['hipsTiles','constellationFrame','coordinateGridFrame','visibleFigures','artwork'].includes(n)).map(n=>{
 const words:Record<string,string>={optical:'optical-hips',sdssOptical:'sdss-optical',wideField:'wide-field-w3',moonTexture:'moon-texture',
 marsTexture:'mars-texture',mercuryTexture:'mercury-texture',jupiterBands:'jupiter-bands',saturnBands:'saturn-bands',
 uranusBands:'uranus-bands',neptuneBands:'neptune-bands',galacticImage:'galactic-image',landscapeImage:'landscape'};
 const f=words[n];const fn=n==='optical'?'useSkyOpticalHips':n==='wideField'?'useSkyWideFieldW3':n==='landscapeImage'?'useSkyLandscape':
  'useSky'+n[0]!.toUpperCase()+n.slice(1);
 return `import {${fn}} from './${sky}use-sky-${f}';`;
}).join('\n');
const getVariable=(name:string)=>{let found:ts.VariableStatement[]=[];const walk=(n:ts.Node)=>{if(ts.isVariableStatement(n)&&n.declarationList.declarations.some(d=>d.name.getText(ast)===name))found.push(n);ts.forEachChild(n,walk);};walk(ast);assert.equal(found.length,1,name);return found[0]!.getText(ast);};
const effectWith=(needle:string)=>{let found:ts.CallExpression[]=[];const walk=(n:ts.Node)=>{if(ts.isCallExpression(n)&&n.expression.getText(ast)==='useEffect'&&n.arguments[0]?.getText(ast).includes(needle))found.push(n);ts.forEachChild(n,walk);};walk(ast);assert.equal(found.length,1,needle);return found[0]!.getText(ast)+';';};
const selectedStatements=[
 '[deepSkyImageAsset, storeDeepSkyImageAsset]','[canvasDeepSkyImage, storeCanvasDeepSkyImage]',
 'deepSkyImageFileRef','canvasDeepSkyImageRef','deepSkyRecoveryFileRef',
 'setDeepSkyImageAsset','setCanvasDeepSkyImage','retireDeepSkyDecode',
 '[deepSkyImageState, setDeepSkyImageState]','deepSkyImageFailureRef','[deepSkyImageRetry, setDeepSkyImageRetry]',
 'selectedDeepSkyEntry','deepSkyRegistrationReady','desiredDeepSkyImageLevel',
].map(getVariable).join('\n')+'\n'+[
 effectWith('deepSkyImageFileRef.current?.release();'),effectWith('return startDeepSkyImageRequest({'),
 effectWith('const subscriptions = owned.map'),effectWith('const image = node.createImage()'),
].join('\n');
const creditStatements=['deepSkyImagePresented','sdssOpticalStatus','sdssOpticalCurrentImagePresented'].map(getVariable).join('\n');
let releaseCallbacks:ts.PropertyAssignment[]=[];const walkRelease=(n:ts.Node)=>{if(ts.isPropertyAssignment(n)&&n.name.getText(ast)==='releaseContext'&&n.initializer.getText(ast).includes('canvasGenerationRef.current++'))releaseCallbacks.push(n);ts.forEachChild(n,walkRelease);};walkRelease(ast);assert.equal(releaseCallbacks.length,1);
const releasePageCallback=releaseCallbacks[0]!.initializer.getText(ast);
await fs.writeFile(path.join(out,'actual-page-release-context.ts.txt'),releasePageCallback,{flag:'wx'});
let frameSdss:ts.PropertyAssignment[]=[];const walkSdss=(n:ts.Node)=>{if(ts.isPropertyAssignment(n)&&n.name.getText(ast)==='sdssOpticalImage'&&n.initializer.getText(ast).startsWith('canvasData &&'))frameSdss.push(n);ts.forEachChild(n,walkSdss);};walkSdss(ast);assert.equal(frameSdss.length,1);
const frameSdssExpression=frameSdss[0]!.initializer.getText(ast);
const creditText=(prefix:string)=>{let found:ts.JsxText[]=[];const walk=(n:ts.Node)=>{if(ts.isJsxText(n)&&n.getText(ast).trim().startsWith(prefix))found.push(n);ts.forEachChild(n,walk);};walk(ast);assert.equal(found.length,1);return found[0]!.getText(ast).trim();};
const sourceCreditLabels={selected:creditText('NASA/IPAC IRSA · AllWISE'),sdss:creditText('Sloan Digital Sky Survey · CC BY')};
await fs.writeFile(path.join(out,'actual-selected-page-statements.ts.txt'),selectedStatements,{flag:'wx'});
await fs.writeFile(path.join(out,'actual-credit-and-frame-statements.ts.txt'),creditStatements+'\n'+frameSdssExpression,{flag:'wx'});
const entry=`import {useMemo,useState,useRef,useCallback,useEffect} from 'react';
import {deepSkyImageLevelForFov} from './${sky}sky-zoom';
import {startDeepSkyImageRequest} from './${sky}deep-sky-image-request';
import {registerSkyNativeImageLifetime} from './${sky}sky-artwork-loader';
import {beginDeepSkyImageDemand,getDeepSkyImageDiscovery,acquireDeepSkyImage} from './apps/wechat-miniapp/src/services/deep-sky-image-client';
import {sdssOpticalPresentation} from './${sky}sky-sdss-optical-selection';
${importHooks}
import {useSkyArtwork} from './${sky}use-sky-artwork';
import {resolveConstellationFrame} from './${sky}sky-constellation-scene';
import {constellationVisibility} from './${sky}sky-constellation-visibility';
import {artworkIntersectsView} from './${sky}sky-artwork-visibility';
import {exactSkyObservationFrame} from './${sky}sky-observation-frame';
export {createSkyGpuRenderer} from './${sky}sky-gpu-renderer';
export {drawSkyScene} from './${sky}sky-scene-render';
export {skyNativeImageIsCurrent} from './${sky}sky-artwork-loader';
export {initializeSkyPublicImageCache,clearSkyPublicImageCache} from './apps/wechat-miniapp/src/services/sky-public-image-runtime';
export function pageImages(input:any){
 const {currentViewBasis,presentedFov,presentedCenter,wideFieldEnabled,canvasNodeRef,canvasSize,reducedMotion}=input;
 const pageVisible=input.pageVisible,rawReportData=input.report,reportData=input.report,geometryReport=input.report,
 report={data:{dataState:'FRESH'},isError:false},mode='DAY',verticalFovDeg=presentedFov,canvasNodeRevision=input.canvasRevision,
 focusedDeepSkyReference=input.reference,canvasGenerationRef=input.canvasGenerationRef,
 constellationCatalog={data:{data:input.figures},isFetching:false},constellationsEnabled=true,landscapeEnabled=true,row={at:input.at};
 const recordAcceptanceDiagnostic=(...values:any[])=>globalThis.__controlled.diagnostics.push(values);
 ${getVariable('retireDeepSkyDecodeRef')}
 ${selectedStatements}
 retireDeepSkyDecodeRef.current=retireDeepSkyDecode;
 globalThis.__controlled.retireDeepSkyDecodeRef=retireDeepSkyDecodeRef;
 ${pageStatements}
 const canvasData=input.report;
 const frameSdssImage=${frameSdssExpression};
 return {optical,sdssOptical,wideField,moonTexture,marsTexture,mercuryTexture,jupiterBands,saturnBands,uranusBands,neptuneBands,
 galacticImage,hipsTiles,constellationFrame,coordinateGridFrame,visibleFigures,artwork,landscapeImage,
 deepSkyImageAsset,canvasDeepSkyImage,deepSkyImageState,frameSdssImage,
 gates:{selectedReference:selectedDeepSkyEntry?.objectRef??null,deepSkyRegistrationReady,desiredDeepSkyImageLevel,selectedW3Active:Boolean(desiredDeepSkyImageLevel),sdssRequested:sdssOptical.requested,localOpticalFixtureEnabled:__MINIAPP_DEVELOPMENT_FIXTURE_MODE__,
 galaxyPageEnabled:!(wideFieldEnabled&&presentedFov>=60),wideFieldEnabled,pageVisible,mode}};
}
export function presentedImageFacts(result:any,presentedSkyFrame:any,input:any){
 const presentedSceneCurrent=input.pageVisible,nativeCanvasMounted=input.pageVisible,canvasSize=input.canvasSize,canvasError=null,sdssOptical=result.sdssOptical;
 ${creditStatements}
 return {deepSkyImagePresented,sdssOpticalStatus,sdssOpticalCurrentImagePresented,
 labels:{selected:deepSkyImagePresented?${JSON.stringify(sourceCreditLabels.selected)}:null,
 sdss:sdssOpticalStatus==='CREDIT'?${JSON.stringify(sourceCreditLabels.sdss)}:null}};
}
export function releasePageContext(context:any,refs:any){
 const {canvasNodeRef,canvasGenerationRef,retireDeepSkyDecodeRef}=refs;
 const releaseContext=${releasePageCallback};
 releaseContext(context);
}`;
await fs.writeFile(path.join(out,'extracted-page-entry.ts.txt'),entry,{flag:'wx'});
const clientPath='apps/wechat-miniapp/src/services/api-client.ts',clientSource=await fs.readFile(path.join(ROOT,clientPath),'utf8');
const clientAst=ts.createSourceFile(clientPath,clientSource,ts.ScriptTarget.Latest,true);
const urlFunction=clientAst.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='constellationAssetUrl')!.getText(clientAst);
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
   `import {MINIAPP_API_BASE_PATH} from '@starward/miniapp-contracts';${urlFunction}`,loader:'ts',resolveDir:ROOT}));
  b.onLoad({filter:/[\\/]sky-public-image-cache\.ts$/},async a=>{
   const original=await fs.readFile(a.path,'utf8');const changed=original.replace('export function createSkyPublicImageCache(', 'function createActualSkyPublicImageCache(')+
    '\nexport function createSkyPublicImageCache(...a:Parameters<typeof createActualSkyPublicImageCache>){const owner=createActualSkyPublicImageCache(...a);globalThis.__controlled.caches.push(owner);return owner;}\n';
   assert.notEqual(changed,original);instrumented.push({path:path.relative(ROOT,a.path).replaceAll('\\','/'),originalSha256:hash(original),taskDiagnosticSha256:hash(changed)});
   await fs.writeFile(path.join(out,'diagnostic-cache.ts.txt'),changed,{flag:'wx'});return {contents:changed,loader:'ts'};
  });
  b.onLoad({filter:/[\\/]sky-artwork-loader\.ts$/},async a=>{
   const original=await fs.readFile(a.path,'utf8');const changed=original.replace('update(next:readonly Asset[]){',`__measure(){return [...entries.values()].map(e=>({asset:e.asset,ids:[...e.ids],state:e.state,loaded:Boolean(e.loaded),file:Boolean(e.file),image:e.loaded?.image??null,current:!!usable(e)}));},\n    update(next:readonly Asset[]){`);
   assert.notEqual(changed,original);instrumented.push({path:path.relative(ROOT,a.path).replaceAll('\\','/'),originalSha256:hash(original),taskDiagnosticSha256:hash(changed)});
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
await fs.writeFile(path.join(out,'source-binding-before.json'),JSON.stringify({absWorkingDir:ROOT,sourceBindings,virtualInputs,preserved,inputs},null,2)+'\n',{flag:'wx'});
for(let i=0;i<sourceBindings.length;i++){
 const p=path.join(out,'source-inputs',sourceBindings[i].path);await fs.mkdir(path.dirname(p),{recursive:true});await fs.copyFile(path.join(ROOT,sourceBindings[i].path),p);
}
for(const p of ['workers/miniapp-api/src/deep-sky-imagery.ts','workers/miniapp-api/src/sdss-optical-imagery.ts']){
 const target=path.join(out,'source-inputs',p);await fs.mkdir(path.dirname(target),{recursive:true});await fs.copyFile(path.join(ROOT,p),target);
}
await fs.writeFile(path.join(out,'bundle.js'),compiled,{flag:'wx'});
await fs.writeFile(path.join(out,'inputs.json'),JSON.stringify({report:await bind(reportPath),inputs,sourceBindings,instrumented},null,2)+'\n',{flag:'wx'});
const require=createRequire(import.meta.url),{chromium}=require('C:/Users/777/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader']});
const rows:any[]=[],errors:string[]=[];
try{
 const page=await browser.newPage({viewport:{width:390,height:844}});page.on('pageerror',(e:Error)=>errors.push(e.message));
 await page.setContent('<canvas id="sky" width="390" height="844"></canvas>');
 await page.addScriptTag({content:'globalThis.__name=(fn,name)=>fn;'});
 const runtimeExecutor=({metadata,assets}:any)=>{
  const base='https://approved.fixture.invalid',files=new Map<string,ArrayBuffer>(),offers=new Map<string,any>();
  for(const a of assets){const bytes=Uint8Array.from(atob(a.base64),(c:string)=>c.charCodeAt(0));offers.set(base+a.url,{...a,bytes:bytes.buffer});}
  const slots:any[]=[],effects:Function[]=[],queryCache=new Map<string,any>(),queries:any[]=[];
  const requests:any[]=[],fsCalls:any[]=[],images:any[]=[],caches:any[]=[],hooks=new Map<string,any>();
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
  const filesystem={mkdir(o:any){callback(o.success);},readdir(o:any){callback(()=>o.success({files:[...files.keys()].filter(p=>p.startsWith(o.dirPath+'/')).map(p=>p.slice(o.dirPath.length+1))}));},
   stat(o:any){callback(()=>files.has(o.path)?o.success({stats:{isFile:()=>true,size:files.get(o.path)!.byteLength}}):o.fail({errMsg:'no such file or directory'}));},
   readFile(o:any){fsCalls.push({operation:'read',path:o.filePath,length:o.length});callback(()=>files.has(o.filePath)?
     o.success({data:files.get(o.filePath)!.slice(o.position??0,(o.position??0)+o.length)}):o.fail({errMsg:'no such file or directory'}));},
   writeFile(o:any){fsCalls.push({operation:'write',path:o.filePath,bytes:o.data.byteLength});callback(()=>{files.set(o.filePath,o.data.slice(0));o.success();});},
   rename(o:any){fsCalls.push({operation:'rename',from:o.oldPath,to:o.newPath});callback(()=>{if(!files.has(o.oldPath))return o.fail({errMsg:'missing'});files.set(o.newPath,files.get(o.oldPath)!);files.delete(o.oldPath);o.success();});},
   unlink(o:any){fsCalls.push({operation:'unlink',path:o.filePath});callback(()=>{files.delete(o.filePath);o.success?.();});}};
  const Taro={env:{USER_DATA_PATH:'/controlled'},getFileSystemManager:()=>filesystem,request(o:any){
   let done=false;const route=o.url.slice(base.length),asset=offers.get(o.url),json=metadata[route];
   const r={url:o.url,route,type:o.responseType==='arraybuffer'?'image':'metadata',bytes:asset?.bytes.byteLength??json?.bytes??0,
    sha256:asset?.sha256??json?.sha256??null,completed:false};requests.push(r);nativeRunning++;nativePeak=Math.max(nativePeak,nativeRunning);
   const complete=()=>{if(done)return;done=true;nativeRunning--;r.completed=true;
    if(o.responseType==='arraybuffer'&&asset)o.success({statusCode:200,data:asset.bytes.slice(0)});
    else if(json)o.success({statusCode:200,data:structuredClone(json.body)});else o.fail({errMsg:'unoffered frozen resource'});};
   callback(complete);return {abort(){if(done)return;done=true;nativeRunning--;r.completed=true;o.fail({errMsg:'actual controlled abort callback'});},catch(){}};}};
  const makeCanvasNode=()=>({createImage(){
   const image=new Image(),id=images.length;let source='',blob:string|undefined;
   const record:any={id,image,path:'',offeredId:null,sourceSha256:null,status:'created',bytes:0,width:0,height:0};images.push(record);
   Object.defineProperty(image,'src',{get:()=>source,set(value:string){source=value;record.path=value;
    const b=files.get(value);if(!b){record.status='missing';queueMicrotask(()=>image.onerror?.(new Event('error')));return;}
    const asset=[...offers.values()].find(a=>value.includes(a.sha256));if(!asset)throw Error('decoded source identity absent');
    record.offeredId=asset.id;record.sourceSha256=asset.sha256;record.bytes=b.byteLength;record.width=asset.width;record.height=asset.height;
    record.status='pending';decodedPending++;decodedPeak=Math.max(decodedPeak,decodedPending);blob=URL.createObjectURL(new Blob([b],{type:'image/'+asset.format}));
    image.addEventListener('load',()=>{record.status='decoded';record.width=image.naturalWidth;record.height=image.naturalHeight;decodedPending--;if(blob)URL.revokeObjectURL(blob);},{once:true});
    image.addEventListener('error',()=>{record.status='error';decodedPending--;if(blob)URL.revokeObjectURL(blob);},{once:true});image.setAttribute('src',blob);
   }});return image;}});
  const canvasNode=makeCanvasNode();
  const w:any={react,Taro,caches,slots,effects,files,offers,requests,fsCalls,images,hooks,canvasNode,queries,makeCanvasNode,diagnostics:[],
   canvasNodeRef:{current:canvasNode},canvasGenerationRef:{current:1},canvasRevision:1,
   tag(name:string,fn:Function){const old=currentTag;currentTag=name;try{return fn();}finally{currentTag=old;}},
   hook(info:any){hooks.set(currentTag,info);},
   query(o:any){const key=JSON.stringify(o.queryKey);let row=queryCache.get(key);
    queries.push({tag:currentTag,key,enabled:!!o.enabled});
    if(o.enabled&&!row){row={pending:true,data:undefined,error:false};queryCache.set(key,row);Promise.resolve().then(()=>o.queryFn()).then(data=>{row.data=data;row.pending=false;dirty=true;},()=>{row.error=true;row.pending=false;dirty=true;});}
    return {data:row?.data,isFetching:!!(o.enabled&&row?.pending),isError:!!row?.error,refreshError:null,refetch:async()=>row?.data};},
   begin(){cursor=0;dirty=false;hooks.clear();queries.length=0;},
   commit(fn:Function){let result:any;for(let i=0;i<100;i++){w.begin();result=fn();for(const e of effects.splice(0))e();if(!dirty&&!effects.length)return result;}throw Error('controlled React render bound');},
   counters(){return {decodedPending,decodedPendingPeak:decodedPeak,nativeRunning,nativeCallbackPeak:nativePeak};},
   imageInfo(image:object){const r=images.find(r=>r.image===image);return r?{objectId:r.id,offeredId:r.offeredId,sha256:r.sourceSha256,path:r.path,width:r.width,height:r.height,status:r.status}:null;}};
  (globalThis as any).__controlled=w;
 };
 await fs.writeFile(path.join(out,'executor-runtime.js.txt'),runtimeExecutor.toString(),{flag:'wx'});
 await page.evaluate(runtimeExecutor,{metadata,assets});
 await page.addScriptTag({content:compiled});
 const gpuExecutor=()=>{
  const w=(globalThis as any).__controlled,api=(globalThis as any).fullHookProbe,canvas=document.querySelector('canvas')!;
  const gl=canvas.getContext('webgl',{preserveDrawingBuffer:true,alpha:false})!;
  if(!gl)throw Error('software WebGL missing');
  const real={texImage2D:gl.texImage2D.bind(gl),copyTexImage2D:gl.copyTexImage2D.bind(gl),deleteTexture:gl.deleteTexture.bind(gl),
   createTexture:gl.createTexture.bind(gl),drawArrays:gl.drawArrays.bind(gl),drawElements:gl.drawElements.bind(gl)};
  const allocated=new Map<any,number>(),textureSources=new Map<any,any>(),alive=new Set<any>();let live=0,peak=0,events:any[]=[],draws:any[]=[];
  (gl as any).createTexture=()=>{const t=real.createTexture();alive.add(t);return t;};
  (gl as any).deleteTexture=(t:any)=>{const bytes=allocated.get(t)??0;live-=bytes;allocated.delete(t);alive.delete(t);events.push({operation:'delete',bytes,source:textureSources.get(t)??null,liveBytes:live});return real.deleteTexture(t);};
  (gl as any).texImage2D=(...a:any[])=>{const t=gl.getParameter(gl.TEXTURE_BINDING_2D),source=a.at(-1),info=w.imageInfo(source);
   const bytes=a.length===9?Number(a[3])*Number(a[4])*4:Number(source.width)*Number(source.height)*4;
   live+=bytes-(allocated.get(t)??0);allocated.set(t,bytes);textureSources.set(t,info);peak=Math.max(peak,live);
   events.push({operation:'source-upload',bytes,source:info,liveBytes:live});return (real.texImage2D as any)(...a);};
  (gl as any).copyTexImage2D=(...a:any[])=>{const t=gl.getParameter(gl.TEXTURE_BINDING_2D),source=gl.getFramebufferAttachmentParameter(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.FRAMEBUFFER_ATTACHMENT_OBJECT_NAME),
    bytes=Number(a[5])*Number(a[6])*4;live+=bytes-(allocated.get(t)??0);allocated.set(t,bytes);textureSources.set(t,textureSources.get(source)??null);peak=Math.max(peak,live);
    events.push({operation:'gpu-copy',bytes,source:textureSources.get(source)??null,liveBytes:live});return (real.copyTexImage2D as any)(...a);};
  const draw=(kind:string,fn:Function,args:any[])=>{const t=gl.getParameter(gl.TEXTURE_BINDING_2D);draws.push({kind,source:textureSources.get(t)??null});return fn(...args);};
  (gl as any).drawArrays=(...a:any[])=>draw('arrays',real.drawArrays,a);(gl as any).drawElements=(...a:any[])=>draw('elements',real.drawElements,a);
  w.gl=gl;w.renderer=api.createSkyGpuRenderer(gl,1,{imageFailed:(image:object)=>{w.gpuFailures??=[];w.gpuFailures.push(w.imageInfo(image));}});
  w.gpu={reset(){events=[];draws=[];peak=live;},snapshot(){return {events:[...events],draws:[...draws],liveBytes:live,peakBytes:peak,
    retained:[...allocated].map(([t,bytes])=>({bytes,source:textureSources.get(t)??null})),aliveTextures:alive.size};}};
 };
 await fs.writeFile(path.join(out,'executor-gpu.js.txt'),gpuExecutor.toString(),{flag:'wx'});
 await page.evaluate(gpuExecutor);
 const deep=resolveSkyDeepSkyScene(current.skyScene,at)!;assert.equal(deep.frame?.state,'AVAILABLE');
 const basisFor=(ref:string)=>{const index=deep.catalog.entries.findIndex(e=>e.objectRef===ref),point=deep.frame!.points!.find(p=>p[0]===index)!;assert.ok(point,ref);return createSkyViewBasis(point[1],90+point[2],0)!;};
 const conditions:any[]=[
  {name:'M51-optical-overview',reference:'M:51',fov:.2,pageVisible:true},
  {name:'M51-optical-detail',reference:'M:51',fov:.05,pageVisible:true},
  {name:'M31-selected-overview',reference:'M:31',fov:8,pageVisible:true},
  {name:'M31-selected-detail',reference:'M:31',fov:1,pageVisible:true},
  {name:'M31-hidden',reference:'M:31',fov:1,pageVisible:false},
  {name:'M31-newCanvas-detail',reference:'M:31',fov:1,pageVisible:true,newCanvas:true},
 ].map(c=>({...c,w3:false,basis:basisFor(c.reference)}));
 for(const c of conditions)assert.equal(clampSkyFieldOfView(c.fov,390,844),c.fov,'normal selected condition must be page-clamp reachable');
 await fs.writeFile(path.join(out,'conditions.json'),JSON.stringify({at,conditions,deepSkyFrame:deep.frame,deepSkyCatalog:deep.catalog},null,2)+'\n',{flag:'wx'});
 const journeyExecutor=async({condition,current,figures,at}:any)=>{

   const w=(globalThis as any).__controlled,api=(globalThis as any).fullHookProbe;
   const input={currentViewBasis:condition.basis,presentedFov:condition.fov,presentedCenter:{x:195,y:422},wideFieldEnabled:condition.w3,
    canvasNodeRef:w.canvasNodeRef,canvasGenerationRef:w.canvasGenerationRef,canvasRevision:w.canvasRevision,
    reference:condition.reference,pageVisible:condition.pageVisible,canvasSize:{width:390,height:844},reducedMotion:false,report:current,figures,at};
   const startRequest=w.requests.length,startDecode=w.images.length,startFs=w.fsCalls.length,startDiagnostics=w.diagnostics.length;
   let result:any,states:any[]=[],previous='';
   const inspect=()=>{
    const hooks=[...w.hooks].map(([name,h]:any)=>({name,active:h.active,hash:h.hash??null,byteBudget:h.byteBudget??16*1024*1024,
     wanted:h.wanted.map((a:any)=>({id:a.id,sha256:a.sha256,bytes:a.bytes,width:a.width,height:a.height})),loading:h.value.loading,failed:h.value.failed,
     ready:[...h.value.images].map(([id,image]:any)=>({id,...w.imageInfo(image)})),retainedReady:[...h.value.retainedImages].map(([id,image]:any)=>({id,...w.imageInfo(image)})),
     entries:h.owner?.__measure().map((e:any)=>({...e,image:e.image?w.imageInfo(e.image):null}))??[]}));
    const refs=hooks.flatMap((h:any)=>h.entries.filter((e:any)=>e.current).map((e:any)=>e.image));
    const unique=[...new Map(refs.map((i:any)=>[i.objectId,i])).values()] as any[];
    const selected=result?.canvasDeepSkyImage; if(selected&&api.skyNativeImageIsCurrent(selected.image)){const info=w.imageInfo(selected.image);if(!unique.some((i:any)=>i.objectId===info.objectId))unique.push(info);}
    return {hooks,selected:{state:result?.deepSkyImageState,requested:result?.gates.desiredDeepSkyImageLevel,file:result?.deepSkyImageAsset?{reference:result.deepSkyImageAsset.reference,level:result.deepSkyImageAsset.level,path:result.deepSkyImageAsset.tempFilePath,publicationHash:result.deepSkyImageAsset.publicationHash,sourceId:result.deepSkyImageAsset.sourceId,leaseCurrent:result.deepSkyImageAsset.isCurrent()}:null,decoded:selected?{reference:selected.reference,level:selected.level,...w.imageInfo(selected.image),current:api.skyNativeImageIsCurrent(selected.image)}:null},decodedOwnerReferences:refs.length,decodedUniqueImages:unique.length,decodedSourceRgbaModel:unique.reduce((n,i)=>n+i.width*i.height*4,0),
     coldFileOwnerEntries:hooks.reduce((n:any,h:any)=>n+h.entries.filter((e:any)=>e.state==='cold').length,0),cache:w.caches.map((c:any)=>c.inspect()),counters:w.counters(),queries:[...w.queries]};
   };
   const deadline=performance.now()+12000;
   for(let count=0;;count++){
    result=w.commit(()=>api.pageImages(input));const s=inspect(),signature=JSON.stringify(s);if(signature!==previous){states.push(s);previous=signature;}
    const loading=Object.values(result).some((h:any)=>h&&typeof h==='object'&&h.loading)||result.deepSkyImageState==='LOADING'||w.counters().decodedPending||w.counters().nativeRunning;
    if((!condition.pageVisible||!loading)&&(!result.landscapeImage.panorama||result.landscapeImage.opacity>=1))break;
    if(performance.now()>deadline)throw Error('bounded full Hook readiness failed '+condition.name+' '+JSON.stringify(s));
    await new Promise(resolve=>setTimeout(resolve,8));
   }
   const ready=inspect(),passes=[];let lastArgs:any[]|undefined;
   for(let pass=0;pass<(condition.pageVisible?2:0);pass++){
    w.gpu.reset();const args:any[]=Array(36).fill(undefined);let snapshot:any,paintedSources:any;
    Object.assign(args,{0:w.renderer,1:current,2:at,3:null,4:null,5:390,6:844,7:'DAY',8:(s:any,p:any)=>{snapshot=s;paintedSources=p;},10:condition.fov,
     11:result.canvasDeepSkyImage,12:condition.basis,13:input.presentedCenter,15:{frame:result.constellationFrame,images:result.artwork.images,enabled:true,failed:result.artwork.failedImage},
     21:result.hipsTiles,24:result.moonTexture.image,25:result.marsTexture.image,26:result.galacticImage.image,27:result.mercuryTexture.image,
     28:result.jupiterBands.image,29:result.saturnBands.image,30:result.frameSdssImage,32:result.uranusBands.image,33:result.neptuneBands.image,
     34:{enabled:true,panorama:result.landscapeImage.panorama,mask:result.landscapeImage.mask,readiness:result.landscapeImage.opacity,
      pending:result.landscapeImage.loading,failed:result.landscapeImage.failed,previous:w.previousLandscape??null},35:{horizontal:false,equatorial:false}});
    lastArgs=args;
    const begin=performance.now();api.drawSkyScene(...args);w.gl.finish();const elapsed=performance.now()-begin;
    w.previousLandscape=snapshot?.view?.landscape??null;
    const presentedSkyFrame={deepSkyImage:paintedSources?.deepSkyImage===result.canvasDeepSkyImage?.image?result.canvasDeepSkyImage:null,
     sdssOpticalImage:paintedSources?.sdssOpticalImage===result.frameSdssImage?.image?result.frameSdssImage:
      paintedSources?.sdssOpticalImage===result.frameSdssImage?.coarser?.image?{...result.frameSdssImage,...result.frameSdssImage.coarser,coarser:null}:null};
    const sourceCredit=api.presentedImageFacts(result,presentedSkyFrame,input);
    const gpu=w.gpu.snapshot();passes.push({pass,softwareGpuWallMs:elapsed,...gpu,sourceCredit,frameAt:snapshot?.frameAt??null,
     references:snapshot?.objects.map((o:any)=>o.reference)??[],paintedSources:{sdss:paintedSources?.sdssOpticalImage?w.imageInfo(paintedSources.sdssOpticalImage):null,
      selected:paintedSources?.deepSkyImage?w.imageInfo(paintedSources.deepSkyImage):null},landscape:snapshot?.view?.landscape?.kind??null,glError:w.gl.getError()});
   }
   const read=()=>{const pixels=new Uint8Array(390*844*4);w.gl.readPixels(0,0,390,844,w.gl.RGBA,w.gl.UNSIGNED_BYTE,pixels);return pixels;};
   const encode=(pixels:Uint8Array)=>{let binary='';for(let i=0;i<pixels.length;i+=32768)binary+=String.fromCharCode(...pixels.subarray(i,i+32768));return btoa(binary);};
   const pixels=read(),capture=document.querySelector('canvas')!.toDataURL('image/png');
   w.controlFrame={lastArgs,result,input,pixels};
   const sdssState={requested:result.sdssOptical.requested,renderedLevel:result.sdssOptical.renderedLevel,fieldDegrees:result.sdssOptical.fieldDegrees,
    reference:result.sdssOptical.publication?.objectRef??null,publicationHash:result.sdssOptical.publication?.publicationHash??null,
    image:result.sdssOptical.image?w.imageInfo(result.sdssOptical.image):null,
    coarser:result.sdssOptical.coarser?{...result.sdssOptical.coarser,image:w.imageInfo(result.sdssOptical.coarser.image)}:null};
   return {condition,gates:result.gates,states,ready,passes,sdssState,gpuAtBoundary:w.gpu.snapshot(),
    hiddenCredit:!condition.pageVisible?api.presentedImageFacts(result,null,input):null,diagnostics:w.diagnostics.slice(startDiagnostics),nativeCurrent:w.images.map((i:any)=>({...w.imageInfo(i.image),current:api.skyNativeImageIsCurrent(i.image)})),transfers:w.requests.slice(startRequest),newDecodes:w.images.slice(startDecode).map((i:any)=>({...w.imageInfo(i.image),current:api.skyNativeImageIsCurrent(i.image)})),
    fsOperations:w.fsCalls.slice(startFs),cacheInventory:[...w.files].map(([p,b]:any)=>({path:p,bytes:b.byteLength})),gpuFailures:w.gpuFailures??[],rgba:encode(pixels),capture};
  };
 await fs.writeFile(path.join(out,'executor-journey.js.txt'),journeyExecutor.toString(),{flag:'wx'});
 const contributionExecutor=()=>{
  const w=(globalThis as any).__controlled,api=(globalThis as any).fullHookProbe,{lastArgs,result,input,pixels}=w.controlFrame;
  const read=()=>{const p=new Uint8Array(390*844*4);w.gl.readPixels(0,0,390,844,w.gl.RGBA,w.gl.UNSIGNED_BYTE,p);return p;};
  const encode=(p:Uint8Array)=>{let binary='';for(let i=0;i<p.length;i+=32768)binary+=String.fromCharCode(...p.subarray(i,i+32768));return btoa(binary);};
  const credit=(sources:any)=>api.presentedImageFacts(result,{
   deepSkyImage:sources?.deepSkyImage===result.canvasDeepSkyImage?.image?result.canvasDeepSkyImage:null,
   sdssOpticalImage:sources?.sdssOpticalImage===result.frameSdssImage?.image?result.frameSdssImage:
    sources?.sdssOpticalImage===result.frameSdssImage?.coarser?.image?{...result.frameSdssImage,...result.frameSdssImage.coarser,coarser:null}:null,
  },input);
  const info=(sources:any)=>({sdss:sources?.sdssOpticalImage?w.imageInfo(sources.sdssOpticalImage):null,selected:sources?.deepSkyImage?w.imageInfo(sources.deepSkyImage):null});
  let sources:any;const omitted=[...lastArgs];omitted[11]=null;omitted[30]=null;omitted[8]=(_s:any,p:any)=>{sources=p;};
  w.gpu.reset();api.drawSkyScene(...omitted);w.gl.finish();
  const absent=read(),absentPng=document.querySelector('canvas')!.toDataURL('image/png'),absentGpu=w.gpu.snapshot(),absentError=w.gl.getError(),absentSources=info(sources),absentCredit=credit(sources);
  const restoredArgs=[...lastArgs];restoredArgs[8]=(_s:any,p:any)=>{sources=p;};w.gpu.reset();api.drawSkyScene(...restoredArgs);w.gl.finish();
  const restored=read(),restoredGpu=w.gpu.snapshot(),restoredError=w.gl.getError(),restoredSources=info(sources),restoredCredit=credit(sources);
  let changedPixels=0,maxChannelDifference=0,restoreChangedBytes=0;
  for(let i=0;i<pixels.length;i+=4){let changed=false;for(let c=0;c<4;c++){const d=Math.abs(pixels[i+c]!-absent[i+c]!);if(d){changed=true;maxChannelDifference=Math.max(maxChannelDifference,d);}if(pixels[i+c]!==restored[i+c])restoreChangedBytes++;}if(changed)changedPixels++;}
  return {boundary:'Same actual scene arguments with selected W3 and SDSS consumer inputs null; paint callback separately captures actual sources. Catalogue marker suppression follows actual scene rules. Original arguments restored; no source/hook/metadata/shader/opacity mutation. Oracle GL costs are separate from normal journey metrics.',
   changedPixels,maxChannelDifference,restoreChangedBytes,absentGpu,restoredGpu,absentError,restoredError,absentSources,absentCredit,restoredSources,restoredCredit,
   rgba:encode(absent),capture:absentPng,restoredRgba:encode(restored)};
 };
 await fs.writeFile(path.join(out,'executor-pixel-oracle.js.txt'),contributionExecutor.toString(),{flag:'wx'});
 for(const condition of conditions){
  if(!condition.pageVisible)await page.evaluate(()=>{const w=(globalThis as any).__controlled;(globalThis as any).fullHookProbe.releasePageContext(w.renderer,w);});
  if(condition.newCanvas){await page.evaluate(()=>{const w=(globalThis as any).__controlled;document.querySelector('canvas')!.remove();
   const canvas=document.createElement('canvas');canvas.id='sky';canvas.width=390;canvas.height=844;document.body.append(canvas);
   w.canvasNode=w.makeCanvasNode();w.canvasNodeRef.current=w.canvasNode;w.canvasRevision=++w.canvasGenerationRef.current;});await page.evaluate(gpuExecutor);}
  const r=await page.evaluate(journeyExecutor,{condition,current,figures,at});
  await fs.writeFile(path.join(out,condition.name+'.actual-observations.json'),JSON.stringify(r)+'\n',{flag:'wx'});
  const contribution=condition.pageVisible?await page.evaluate(contributionExecutor):null;
  if(contribution){
   await fs.writeFile(path.join(out,condition.name+'.actual-oracle-observations.json'),JSON.stringify(contribution)+'\n',{flag:'wx'});
   await fs.writeFile(path.join(out,condition.name+'.source-absent.rgba'),Buffer.from(contribution.rgba,'base64'),{flag:'wx'});
   await fs.writeFile(path.join(out,condition.name+'.source-absent.png'),Buffer.from(contribution.capture.split(',')[1],'base64'),{flag:'wx'});
   await fs.writeFile(path.join(out,condition.name+'.restored.rgba'),Buffer.from(contribution.restoredRgba,'base64'),{flag:'wx'});
   r.contribution={...contribution,rgba:undefined,capture:undefined,restoredRgba:undefined,
    absentRgbaSha256:hash(Buffer.from(contribution.rgba,'base64')),absentPngSha256:hash(Buffer.from(contribution.capture.split(',')[1],'base64')),restoredRgbaSha256:hash(Buffer.from(contribution.restoredRgba,'base64'))};
  }
  const {rgba,capture,...record}=r,pixels=Buffer.from(rgba,'base64'),png=Buffer.from(capture.split(',')[1],'base64');
  await fs.writeFile(path.join(out,condition.name+'.rgba'),pixels,{flag:'wx'});await fs.writeFile(path.join(out,condition.name+'.png'),png,{flag:'wx'});
  const row={...record,rgbaSha256:hash(pixels),pngSha256:hash(png)};rows.push(row);
  await fs.writeFile(path.join(out,condition.name+'.json'),JSON.stringify(row,null,2)+'\n',{flag:'wx'});
  assert(row.passes.every((p:any)=>p.glError===0));assert.deepEqual(row.gpuFailures,[]);assert.equal(row.ready.hooks.length,13);
  assert.equal(row.gates.localOpticalFixtureEnabled,false);assert.equal(row.gates.deepSkyRegistrationReady,true);
  assert.equal(row.gates.selectedReference,condition.reference);
  if(condition.pageVisible){
   assert.ok(row.contribution.changedPixels>0,'removing actual cutout consumers must change full rendered pixels');
   assert.equal(row.contribution.restoreChangedBytes,0);assert.equal(row.contribution.absentError,0);assert.equal(row.contribution.restoredError,0);
   assert.deepEqual(row.contribution.absentSources,{sdss:null,selected:null});
   assert.equal(row.contribution.absentCredit.deepSkyImagePresented,false);assert.equal(row.contribution.absentCredit.sdssOpticalStatus,'NONE');
   assert.deepEqual(row.contribution.restoredSources,row.passes[1].paintedSources);assert.deepEqual(row.contribution.restoredCredit,row.passes[1].sourceCredit);
   assert.equal(row.ready.selected.state,'READY');assert.equal(row.ready.selected.file.leaseCurrent,true);
   for(const pass of row.passes){
    if(condition.reference==='M:51'){
     assert.ok(pass.paintedSources.sdss);assert.equal(pass.paintedSources.selected,null);assert.equal(pass.sourceCredit.sdssOpticalStatus,'CREDIT');assert.equal(pass.sourceCredit.deepSkyImagePresented,false);
     assert(!pass.events.some((e:any)=>e.operation==='source-upload'&&e.source?.offeredId?.startsWith('selected:')));
    }else{
     assert.equal(pass.paintedSources.sdss,null);assert.ok(pass.paintedSources.selected);assert.equal(pass.sourceCredit.deepSkyImagePresented,true);assert.equal(pass.sourceCredit.sdssOpticalStatus,'NONE');
    }
    assert.ok(pass.draws.some((d:any)=>d.source?.objectId===(pass.paintedSources.sdss??pass.paintedSources.selected).objectId));
   }
   assert.equal(row.passes[1].events.filter((e:any)=>e.operation==='source-upload').length,0,'active used retains actual warmed scene');
  }else{
   assert.equal(row.ready.selected.decoded,null);assert.equal(row.hiddenCredit.deepSkyImagePresented,false);assert.equal(row.hiddenCredit.sdssOpticalStatus,'NONE');
   assert.equal(row.gpuAtBoundary.liveBytes,0);assert.equal(row.gpuAtBoundary.aliveTextures,0);
   assert.equal(row.nativeCurrent.filter((i:any)=>i.current&&i.offeredId?.startsWith('selected:')).length,0);
  }
  console.log(JSON.stringify({output:relative,name:condition.name,decodedModel:row.ready.decodedSourceRgbaModel,
   transfers:row.transfers.filter((r:any)=>r.type==='image').length,firstPeak:row.passes[0]?.peakBytes??0,
   warmUploads:(row.passes[1]?.events??[]).filter((e:any)=>e.operation==='source-upload').reduce((n:number,e:any)=>n+e.bytes,0)}));
 }
 const finalExecutor=async()=>{const w=(globalThis as any).__controlled;w.renderer.dispose();
  for(const s of w.slots)s?.cleanup?.();await Promise.resolve();return {gpu:w.gpu.snapshot(),cache:w.caches.map((c:any)=>c.inspect()),counters:w.counters(),nativeCurrent:w.images.map((i:any)=>({...w.imageInfo(i.image),current:(globalThis as any).fullHookProbe.skyNativeImageIsCurrent(i.image)}))};};
 await fs.writeFile(path.join(out,'executor-final.js.txt'),finalExecutor.toString(),{flag:'wx'});
 const final=await page.evaluate(finalExecutor);
 await fs.writeFile(path.join(out,'actual-final-owner.json'),JSON.stringify(final,null,2)+'\n',{flag:'wx'});
 assert.equal(final.gpu.liveBytes,0);assert.equal(final.gpu.aliveTextures,0);assert.deepEqual(errors,[]);
 assert.equal(rows[3].rgbaSha256,rows[5].rgbaSha256,'same selected/detail condition recovered onto new controlled Canvas owner');
 assert.equal(final.cache[0].leased,0);assert.equal(final.nativeCurrent.filter((i:any)=>i.current).length,0);
 for(const r of sourceBindings)assert.deepEqual(await bind(r.path),{path:r.path,bytes:r.bytes,sha256:r.sha256},'production source frozen during harness');
 for(const r of inputs)if(r.path&&r.sha256)assert.equal((await bind(r.path)).sha256,r.sha256);
 const afterSources=await Promise.all(sourceBindings.map(r=>bind(r.path))),afterInputs=await Promise.all(inputs.filter(r=>r.path).map(r=>bind(r.path))),afterPreserved=await Promise.all(preserved.map((r:any)=>bind(r.path)));
 assert.deepEqual(afterPreserved.map(({path,sha256})=>({path,sha256})),preserved);
 await fs.writeFile(path.join(out,'source-binding-after.json'),JSON.stringify({sourceBindings:afterSources,inputs:afterInputs,preserved:afterPreserved},null,2)+'\n',{flag:'wx'});
 await fs.writeFile(path.join(out,'result.json'),JSON.stringify({status:'PASS',report:await bind(reportPath),sourceBindings,instrumented,
  compiledSha256:hash(compiled),virtualInputs,sourceCreditLabels,inputs,rows,final,errors,
  scope:'Task-only current page declarations and actual full hooks/shared cache/runtime/request/loader. Metadata offered frozen via controlled query scheduling; image transfers use actual bound encoded bytes, SHA and Map FS leases; same browser-decoded HTMLImage objects enter actual software WebGL. Source RGBA/reference, encoded cache and logical GL sizes are models. Not target WEAPP decode/FS, real metadata Tanstack HTTP/stale policy, native/driver/GC/OS memory, performance or 200 DAU capacity, complete page journey or final acceptance. Selected M51/M31 qualification, actual discovery/client/request/page effects and SDSS full hook active; real page initializer controls and scene priority. Hidden page owner + new controlled native-node/generation and fresh software WebGL canvas recovery; page lifecycle and real WEAPP hide/newCanvas integration remain unverified. LOCAL explicit inactive. Current active-used a353 retention policy.'},null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({output:relative,result:await bind(relative+'/result.json'),rows:rows.length}));
}catch(e){await fs.writeFile(path.join(out,'failed.json'),JSON.stringify({status:'FAILED',message:String(e),rows:rows.map(r=>r.condition.name),errors,sourceBindings,instrumented},null,2)+'\n',{flag:'wx'});throw e;}
finally{await browser.close();}
