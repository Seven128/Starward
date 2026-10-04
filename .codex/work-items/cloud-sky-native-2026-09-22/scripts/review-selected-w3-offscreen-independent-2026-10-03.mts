// Two phases in one exclusive review folder: finite actual-owner CPU controls,
// then independent saved-consumer readback. No new listener, image decode or GL.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import * as contract from '../../../../packages/miniapp-contracts/src/index.ts';
import {startDeepSkyImageRequest} from '../../../../apps/wechat-miniapp/src/features/sky/deep-sky-image-request.ts';
import {skyDeepSkyImageIntersectsView,skyTargetImageFamilyIntersectsView} from '../../../../apps/wechat-miniapp/src/features/sky/sky-target-image-visibility.ts';
import {skyTargetOpticalIntersectsView} from '../../../../apps/wechat-miniapp/src/features/sky/sky-target-optical-visibility.ts';
import {createSkyViewBasis} from '../../../../apps/wechat-miniapp/src/features/sky/sky-view-projection.ts';
import {registerSkySurvey} from '../../../../apps/wechat-miniapp/src/features/sky/sky-survey-registration.ts';
import {artworkIntersectsView} from '../../../../apps/wechat-miniapp/src/features/sky/sky-artwork-visibility.ts';
import {projectAdoptedSkyCatalog} from '../../../../apps/wechat-miniapp/src/services/sky-report-catalog.ts';
import {deepSkyImageLevelForFov} from '../../../../apps/wechat-miniapp/src/features/sky/sky-zoom.ts';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../..');
const TASK='.codex/work-items/cloud-sky-native-2026-09-22',OUT='output/selected-w3-offscreen-independent-1003-r2',FEATURE='apps/wechat-miniapp/src/features/sky/';
const read=(p:string)=>fs.readFileSync(path.resolve(ROOT,p)),json=(p:string)=>JSON.parse(read(p).toString('utf8'));
const sha=(b:any)=>createHash('sha256').update(b).digest('hex'),bind=(p:string)=>{const b=read(p);return{path:p,bytes:b.length,sha256:sha(b)};};
const save=(name:string,value:any)=>fs.writeFileSync(path.resolve(ROOT,OUT,name),JSON.stringify(value,null,2)+'\n',{flag:'wx'});
const copy=(value:any)=>JSON.parse(JSON.stringify(value));
const require=createRequire(path.resolve(ROOT,'apps/wechat-miniapp/package.json')),ts=require('typescript');assert.equal(ts.version,'5.9.3');
const turn=async()=>{for(let i=0;i<12;i++)await Promise.resolve();};
const mode=process.argv[2]??'controls';
if(mode==='controls'){assert(!fs.existsSync(path.resolve(ROOT,OUT)));fs.mkdirSync(path.resolve(ROOT,OUT));}
const scope='Finite actual request/geometry and actual page AST, controlled demand/query/lease/callbacks. No network/listener/cache transport or image/GPU/native/page accepted execution in the new CPU controls.';
const rows:any[]=[];
try {
if(mode!=='controls')throw Error('saved consumer phase awaits exact author output');
const inputs=new Map<string,any>();
function admit(p:string,expected:any={}){const b=bind(p);if(expected.sha256)assert.equal(b.sha256,expected.sha256,p);if(expected.bytes!==undefined)assert.equal(b.bytes,expected.bytes,p);if(inputs.has(p))assert.deepEqual(inputs.get(p),b);inputs.set(p,b);return b;}
admit(path.relative(ROOT,fileURLToPath(import.meta.url)).replaceAll('\\','/'));admit(process.execPath);admit(require.resolve('typescript'));admit(require.resolve('typescript/package.json'));admit('tools/run-node.cjs');
fs.copyFileSync(fileURLToPath(import.meta.url),path.resolve(ROOT,OUT,'executed-controls.mts'),fs.constants.COPYFILE_EXCL);
const sources=['sky-target-image-visibility.ts','sky-target-optical-visibility.ts','deep-sky-image-request.ts','spot-sky-page.tsx','sky-target-image-visibility.test.ts','deep-sky-image-request.test.ts','deep-sky-image-lifecycle.test.ts'];sources.forEach(n=>admit(FEATURE+n));
const configPath=path.resolve(ROOT,'apps/wechat-miniapp/tsconfig.json');admit('apps/wechat-miniapp/tsconfig.json');
const config=ts.parseJsonConfigFileContent(ts.readConfigFile(configPath,ts.sys.readFile).config,ts.sys,path.dirname(configPath));
const graphSeen=new Set<string>(),externals:any[]=[];
function graph(p:string){if(graphSeen.has(p))return;graphSeen.add(p);admit(p);const a=ts.createSourceFile(p,read(p).toString(),ts.ScriptTarget.Latest,true);
for(const node of a.statements)if((ts.isImportDeclaration(node)||ts.isExportDeclaration(node))&&node.moduleSpecifier&&ts.isStringLiteral(node.moduleSpecifier)){
 const name=node.moduleSpecifier.text,res=ts.resolveModuleName(name,path.resolve(ROOT,p),config.options,ts.sys).resolvedModule;assert(res,p+' -> '+name);const relative=path.relative(ROOT,res.resolvedFileName).replaceAll('\\','/');
 if(!relative.startsWith('..')&&!relative.includes('/node_modules/'))graph(relative);else{admit(res.resolvedFileName);externals.push({name,resolved:res.resolvedFileName});}}}
['sky-target-image-visibility.ts','sky-target-optical-visibility.ts','deep-sky-image-request.ts','sky-zoom.ts'].forEach(n=>graph(FEATURE+n));graph('apps/wechat-miniapp/src/services/sky-report-catalog.ts');
const beforeRequest='output/selected-w3-offscreen-regression-1003-r1/deep-sky-image-request.ts.txt';admit(beforeRequest);
for(const name of fs.readdirSync(path.resolve(ROOT,'output/selected-w3-offscreen-regression-1003-r1')))admit('output/selected-w3-offscreen-regression-1003-r1/'+name);
for(const name of fs.readdirSync(path.resolve(ROOT,'output/selected-w3-offscreen-checks-1003-r2')))admit('output/selected-w3-offscreen-checks-1003-r2/'+name);
const discPath='output/playwright/cloud-sky-selected-full-hook-1002-r4/discovery-M-51.json';admit(discPath);const publication=json(discPath);contract.assertDeepSkyImageDiscovery(publication,'M:51');
admit('workers/miniapp-api/assets/deep-sky/manifest.json');
const rawManifest=json('workers/miniapp-api/assets/deep-sky/manifest.json');assert.equal(sha(Buffer.from(JSON.stringify(rawManifest))),publication.publicationHash);
for(const a of Object.values(publication.levels) as any[])admit('workers/miniapp-api/assets/deep-sky/'+a.file,{bytes:a.bytes,sha256:a.sha256});
const generatedPath='output/playwright/cloud-sky-prepared-catalog-resource-1003-r2/generated-deep-sky-scene.json',reportPath=TASK+'/tmp/current-native-report-2026-10-01.json';admit(generatedPath);admit(reportPath);
const generated=json(generatedPath),projected=projectAdoptedSkyCatalog(json(reportPath)).data,at=generated.input.at,report={...projected,skyScene:{...projected.skyScene,deepSky:generated.scene}};
const index=generated.scene.catalog.entries.findIndex((x:any)=>x.objectRef===publication.objectRef),point=generated.scene.frames.find((x:any)=>x.at===at).points.find((x:any)=>x[0]===index);assert(point);
const view=(offset=0)=>({report,at,width:390,height:844,view:{basis:createSkyViewBasis(point[1]+offset,90+point[2],0)!,verticalFovDeg:.05}});
const protectedPath=TASK+'/tmp/resume-preserved-hashes-2026-10-01.json';admit(protectedPath);for(const r of json(protectedPath))admit(r.path,r);
const oldVisPath='output/target-optical-offscreen-regression-1003-r2/sky-target-optical-visibility.ts.txt';admit(oldVisPath);
const opticalPath='output/sdss-science-optical-writer-1002-r1/publication/manifest.json';admit(opticalPath);
save('inputs-before.json',[...inputs.values()]);

function requestWorld(factory:any=startDeepSkyImageRequest){let current=true,releaseDemand=0,observer=0,acquires=0,errors=0,cancels=0,ready:any[]=[];const acquired:any[]=[],leases:any[]=[];let retire:any=()=>{};
const demand={isCurrent:()=>current,onRetire(fn:any){retire=fn;return()=>{retire=()=>{};};},release(){releaseDemand++;}};
const start=(onDiscovered?:any,discover:any=async()=>publication,acquireCustom?:any)=>factory({reference:'M:51',level:'DETAIL',demand,discover,
 ...(onDiscovered?{onDiscovered(data:any){observer++;return onDiscovered(data);}}:{}),acquire(a:any,h:string){acquires++;acquired.push({asset:a,hash:h});if(acquireCustom)return acquireCustom(a,h);const lease:any={filePath:'/controlled/'+a.sha256,isCurrent:()=>!lease.released,onRetire(){return()=>{};},release(){lease.released=true;lease.releases++;},releases:0,released:false};leases.push(lease);return{promise:Promise.resolve(lease),cancel(){}};},onReady(a:any){ready.push(a);},onError(){errors++;},onCancel(){cancels++;}});
return{start,acquired,leases,retire(){current=false;retire();},set current(v){current=v;},get facts(){return{releaseDemand,observer,acquires,errors,cancels,ready:ready.map(a=>({ref:a.reference,level:a.level,field:a.fieldDegrees,hash:a.publicationHash,sourceId:a.sourceId,pixels:a.pixelSize}))};},ready};}

const denied=requestWorld();const stopDenied=denied.start(()=>false);await turn();stopDenied();stopDenied();assert.deepEqual(denied.facts,{releaseDemand:1,observer:1,acquires:0,errors:0,cancels:1,ready:[]});rows.push({case:'validated discovery false is normal cancel',...denied.facts});
const cloning=requestWorld();let observed:any;
cloning.start((data:any)=>{observed=data;data.objectRef='M:31';data.sourceId='mutated';data.levels.DETAIL.fieldDegrees=7;data.levels.DETAIL.sha256='b'.repeat(64);return true;});await turn();assert.notEqual(observed,publication);assert.notEqual(observed.levels,publication.levels);assert.deepEqual(cloning.acquired[0],{asset:publication.levels.DETAIL,hash:publication.publicationHash});assert.equal(cloning.ready[0].sourceId,publication.sourceId);assert.equal(cloning.ready[0].fieldDegrees,publication.levels.DETAIL.fieldDegrees);cloning.ready[0].release();rows.push({case:'observer clone cannot relabel validated acquisition snapshot',...cloning.facts});
const reentrant=requestWorld();let stopReentrant:any;stopReentrant=reentrant.start(()=>{stopReentrant();return true;});await turn();assert.equal(reentrant.facts.acquires,0);assert.equal(reentrant.facts.cancels,1);assert.equal(reentrant.facts.errors,0);assert.equal(reentrant.facts.releaseDemand,1);rows.push({case:'reentrant callback cancellation is fenced before acquire',...reentrant.facts});
const retired=requestWorld();retired.start(()=>{retired.current=false;return true;});await turn();assert.equal(retired.facts.acquires,0);assert.equal(retired.facts.errors,1);assert.equal(retired.facts.releaseDemand,1);rows.push({case:'epoch changes inside callback are rechecked',...retired.facts});
const thrown=requestWorld();thrown.start(()=>{throw Error('controlled observer failure');});await turn();assert.equal(thrown.facts.acquires,0);assert.equal(thrown.facts.errors,1);rows.push({case:'observer failure rejects source without transfer/fallback',...thrown.facts});
const invalid=requestWorld();invalid.start(()=>false,async()=>({...publication,objectRef:'M:31'}));await turn();assert.equal(invalid.facts.observer,0);assert.equal(invalid.facts.acquires,0);assert.equal(invalid.facts.errors,1);rows.push({case:'wrong discovery object rejected before observer',...invalid.facts});
const defaultPath=requestWorld();defaultPath.start();await turn();assert.equal(defaultPath.facts.acquires,1);assert.equal(defaultPath.facts.observer,0);defaultPath.ready[0].release();rows.push({case:'optional observer omission preserves request',...defaultPath.facts});

const oldExports:any={};vm.runInNewContext(ts.transpileModule(read(beforeRequest).toString(),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:oldExports,AbortController,require:(name:string)=>{assert.equal(name,'@starward/miniapp-contracts');return contract;}});
const oldDenied=requestWorld(oldExports.startDeepSkyImageRequest);oldDenied.start(()=>false);await turn();assert.equal(oldDenied.facts.acquires,1);assert.equal(oldDenied.facts.observer,0);oldDenied.ready[0].release();rows.push({case:'exact frozen old request ignores exclusion observer',...oldDenied.facts,detected:true,scope:'Original request with current shared contract helpers and controlled acquisition; not historical full-page replay.'});

assert.equal(skyDeepSkyImageIntersectsView(publication,view()),true);assert(point[2]<0);assert.equal(skyDeepSkyImageIntersectsView(publication,view(90)),false);
const edge=view(publication.levels.OVERVIEW.fieldDegrees*.4),perLevel:any={};
for(const level of ['OVERVIEW','MEDIUM','DETAIL']){const a=publication.levels[level],r=registerSkySurvey(point,a.fieldDegrees,a.pixels,a.pixels/2);assert(r);perLevel[level]=artworkIntersectsView(r,edge.view,390,844);}
assert.deepEqual(perLevel,{OVERVIEW:true,MEDIUM:false,DETAIL:false});assert.equal(skyDeepSkyImageIntersectsView(publication,edge),true);
assert.equal(skyTargetImageFamilyIntersectsView(edge,()=>null),true);
for(const x of [{...view(90),report:undefined},{...view(90),at:'2026-09-30T13:50:34.000Z'},{...view(90),width:0}])assert.equal(skyDeepSkyImageIntersectsView(publication,x as any),true);
rows.push({case:'actual W3 all-level geometry with original N/2 centers',negativeAltitude:point[2],pixels:Object.fromEntries(Object.entries(publication.levels).map(([k,a]:any)=>[k,a.pixels])),perLevel,edgeFamily:true,unknown:true});

// Exact extracted page source; static selection mutation verifies the gate's effect.
const page=ts.createSourceFile('page.tsx',read(FEATURE+'spot-sky-page.tsx').toString(),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX),decls=new Map<string,any>();let pre:any,onload:any,draw:any;
function visit(n:any){if(ts.isVariableDeclaration(n)&&ts.isIdentifier(n.name))decls.set(n.name.text,n);if(ts.isPropertyAssignment(n)&&n.name.getText(page)==='onDiscovered')pre=n.initializer;if(ts.isPropertyAssignment(n)&&n.name.getText(page)==='deepSkyImage'&&n.initializer.getText(page).includes('canvasDeepSkyImage'))draw=n.initializer;ts.forEachChild(n,visit);}visit(page);assert(pre&&draw);
const declNames=['targetOpticalView','currentDeepSkyDiscovery','deepSkyImageInView','desiredDeepSkyImageLevel'];const declCode=declNames.map(n=>'const '+decls.get(n).getText(page)+';').join('\n');
const pageInput:any={geometryReport:report,row:{at},canvasSize:{width:390,height:844},currentViewBasis:view(90).view.basis,presentedFov:.05,presentedCenter:{x:195,y:422},verticalFovDeg:.05,deepSkyImageDiscovery:publication,selectedDeepSkyEntry:{objectRef:'M:51'},deepSkyRegistrationReady:true,mode:'NIGHT',useMemo:(fn:any)=>fn(),skyDeepSkyImageIntersectsView,deepSkyImageLevelForFov,canvasDeepSkyImage:{image:{}}};
const render=(code=declCode,input=pageInput)=>vm.runInNewContext(ts.transpileModule(code+'\n({level:desiredDeepSkyImageLevel,draw:'+draw.getText(page)+'});',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,{...input});
assert.equal(render().level,null);assert.equal(render().draw,null);const ignoreGeometry=declCode.replace('deepSkyRegistrationReady && deepSkyImageInView &&','deepSkyRegistrationReady &&');assert.notEqual(ignoreGeometry,declCode);assert.equal(render(ignoreGeometry).level,'DETAIL');assert(render(ignoreGeometry).draw);rows.push({case:'actual page render/draw exclusion, gate-removal mutation',normalHidden:true,mutationStillSubmitted:true,detected:true});
let metadata:any[]=[];const cbCtx:any={deepSkyImageIntentRef:{current:{reference:'M:51',level:'DETAIL'}},deepSkyImageViewRef:{current:view(90)},desiredDeepSkyImageLevel:'DETAIL',skyDeepSkyImageIntersectsView,setDeepSkyImageDiscovery:(p:any)=>metadata.push(p),setDeepSkyImageState(){}};
const observedCallback=vm.runInNewContext(ts.transpileModule('('+pre.getText(page)+');',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,cbCtx);assert.equal(observedCallback(publication),false);assert.equal(metadata.length,1);cbCtx.deepSkyImageIntentRef.current={reference:'M:31',level:'DETAIL'};assert.equal(observedCallback(publication),false);assert.equal(metadata.length,1);cbCtx.deepSkyImageIntentRef.current={reference:'M:51',level:'MEDIUM'};assert.equal(observedCallback(publication),false);assert.equal(metadata.length,1);cbCtx.deepSkyImageIntentRef.current={reference:'M:51',level:'DETAIL'};cbCtx.deepSkyImageViewRef.current={...view(90),report:undefined};assert.equal(observedCallback(publication),true);rows.push({case:'actual page pre-acquire newest ref/level/view callback',foreignRefAndLevelDoNotSaveMetadata:true,unknownRetains:true});

// Match the extracted optical function's old/current output on a few exact same inputs.
// This comparison is source-derived ownership review; its unchanged registration/math has
// previous independent evidence. Do not expand it to an arbitrary-coordinate certificate.
const optical=json(opticalPath);
assert.equal(skyTargetOpticalIntersectsView(optical,view() as any),true);assert.equal(skyTargetOpticalIntersectsView(optical,view(90) as any),false);assert.equal(skyTargetOpticalIntersectsView(optical,{...view(90),report:undefined} as any),true);rows.push({case:'science optical delegation preserves known/unknown distinction',center:true,outside:false,unknown:true,notW3:true});
const after=[...inputs.values()].map((b:any)=>bind(b.path));assert.deepEqual(after,[...inputs.values()]);save('inputs-after.json',after);
const result={status:'PASSED_BOUNDED_CPU_CONTROLS',time:new Date().toISOString(),node:process.version,typescript:ts.version,inputs:inputs.size,graphEntries:graphSeen.size,externalResolvedEntries:externals,beforeAfterExact:true,publication:{path:discPath,hash:publication.publicationHash,sourceId:publication.sourceId},report:{at,observer:generated.input.observer,point},rows,scope,limits:['Not an actual page accepted frame/WXML/native or controlled public-cache transfer replay; saved actual consumer evidence remains a separate pending review phase.','The held discovery and reentrant observer checks use controlled demand/acquisition and genuine admitted metadata, no source byte decode.','Optical kind, current registry/default/budget and previous GPU/quality/native proof remain independent.']};save('cpu-controls.json',result);console.log(JSON.stringify({status:result.status,result:bind(OUT+'/cpu-controls.json'),inputs:inputs.size}));
}catch(error:any){save('failure-'+mode+'.json',{error:String(error),stack:error.stack,rows});console.error(error);process.exitCode=1;}
