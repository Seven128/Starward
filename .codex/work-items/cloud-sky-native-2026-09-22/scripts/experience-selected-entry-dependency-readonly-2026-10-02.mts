/** Read-only owner/dependency audit; no effect execution, native image, GPU, browser, service or production edit. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {projectAdoptedSkyCatalog} from '../../../../apps/wechat-miniapp/src/services/sky-report-catalog.ts';
import {presentSkyTime} from '../../../../apps/wechat-miniapp/src/features/sky/sky-time-presentation.ts';
import {attachSkyCatalog} from '../../../../apps/wechat-miniapp/src/features/sky/sky-stellar-scene.ts';
import {skyForecastPresentation} from '../../../../apps/wechat-miniapp/src/services/forecast-presentation.ts';
const ROOT=fileURLToPath(new URL('../../../../',import.meta.url)),task='.codex/work-items/cloud-sky-native-2026-09-22';
const relative='output/selected-entry-dependency-readonly-1002-r1',OUT=path.join(ROOT,relative);assert(!fs.existsSync(OUT));fs.mkdirSync(OUT);
const hash=(v:Uint8Array|string)=>createHash('sha256').update(v).digest('hex');
const bind=(p:string)=>{const b=fs.readFileSync(path.join(ROOT,p));return {path:p,bytes:b.length,sha256:hash(b)};};
const save=(p:string,v:any)=>fs.writeFileSync(path.join(OUT,p),JSON.stringify(v,null,2)+'\n',{flag:'wx'});
fs.copyFileSync(fileURLToPath(import.meta.url),path.join(OUT,'executed-script.mts.txt'),fs.constants.COPYFILE_EXCL);
const currentPage='apps/wechat-miniapp/src/features/sky/spot-sky-page.tsx';
const oldPage='output/playwright/cloud-sky-selected-full-hook-1002-r3/source-inputs/'+currentPage;
assert.equal(bind(currentPage).sha256,'0a6c31e6ffe9a91c6aa5cc51959e27d70e9e754108d966ad27bfde0b50c1f24a');
assert.equal(bind(oldPage).sha256,'a7138124b4bf0d712951792a8306f7d93d4da32430b38b508496475f19c4f172');
const paths=[currentPage,oldPage,
 'apps/wechat-miniapp/src/features/sky/sky-time-presentation.ts','apps/wechat-miniapp/src/features/sky/sky-stellar-scene.ts',
 'apps/wechat-miniapp/src/features/sky/deep-sky-image-request.ts','apps/wechat-miniapp/src/features/sky/use-sky-artwork.ts',
 'apps/wechat-miniapp/src/features/sky/sky-artwork-loader.ts','apps/wechat-miniapp/src/features/sky/sky-artwork-request.ts',
 'apps/wechat-miniapp/src/features/sky/deep-sky-image-lifecycle.test.ts','apps/wechat-miniapp/src/hooks/use-resource-query.ts',
 'apps/wechat-miniapp/src/hooks/use-forecast-query.ts','apps/wechat-miniapp/src/services/forecast-presentation.ts',
 'apps/wechat-miniapp/src/services/api-client.ts','apps/wechat-miniapp/src/services/sky-report-catalog.ts',
 'apps/wechat-miniapp/src/services/sky-public-image-runtime.ts','packages/miniapp-contracts/src/sky-scene.ts',
 task+'/tmp/current-native-report-2026-10-01.json','output/playwright/cloud-sky-selected-full-hook-1002-r3/result.json',
 'output/playwright/cloud-sky-selected-full-hook-1002-r3/runtime-metadata-and-offers.json',
 task+'/tmp/resume-preserved-hashes-2026-10-01.json'];
const preserved=JSON.parse(fs.readFileSync(path.join(ROOT,paths.at(-1)!),'utf8'));
for(const p of preserved){assert.equal(bind(p.path).sha256,p.sha256);paths.push(p.path);}
const before=paths.map(bind);save('inputs-before.json',before);
const parse=(p:string)=>{const text=fs.readFileSync(path.join(ROOT,p),'utf8');return ts.createSourceFile(p,text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);};
const effects=(p:string)=>{const ast=parse(p),markers=['return startDeepSkyImageRequest({','const subscriptions = owned.map','const image = node.createImage()'];
 return markers.map(marker=>{const found:ts.CallExpression[]=[];const walk=(n:ts.Node)=>{if(ts.isCallExpression(n)&&n.expression.getText(ast)==='useEffect'&&n.arguments[0]?.getText(ast).includes(marker))found.push(n);ts.forEachChild(n,walk);};walk(ast);assert.equal(found.length,1);
  const effect=found[0]!,entryProperties=new Set<string>();const properties=(n:ts.Node)=>{if(ts.isPropertyAccessExpression(n)&&n.expression.getText(ast)==='selectedDeepSkyEntry')entryProperties.add(n.name.text);ts.forEachChild(n,properties);};properties(effect.arguments[0]!);
  assert.deepEqual([...entryProperties],['objectRef']);return {marker,body:effect.arguments[0]!.getText(ast),deps:effect.arguments[1]!.getText(ast),entryProperties:[...entryProperties]};
 });};
const old=effects(oldPage),current=effects(currentPage);
for(let i=0;i<3;i++)assert.equal(current[i]!.body,old[i]!.body,'only dependency semantic changed');
save('actual-old-current-effect-ast.json',{old,current});
const entry={objectRef:'M:31',displayName:'M31'},file={reference:'M:31',level:'DETAIL',tempFilePath:'/same-owned-file.jpg',release:()=>{}},decoded={...file,image:{},canvasGeneration:1};
const bindings:any={pageVisible:true,deepSkyImageAsset:file,deepSkyImageRetry:0,desiredDeepSkyImageLevel:'DETAIL',selectedDeepSkyEntry:entry,
 canvasDeepSkyImage:decoded,canvasNodeRevision:1,setCanvasDeepSkyImage:()=>{},retireDeepSkyDecode:()=>{}};
const deps=(effect:any,context:any)=>vm.runInNewContext(ts.transpileModule('('+effect.deps+')',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,context) as any[];
const changed=(effect:any,other:any)=>{const a=deps(effect,bindings),b=deps(effect,other);return a.some((value,i)=>!Object.is(value,b[i]));};
const variations=[
 {name:'same-objectRef/new-entry-wrapper',input:{selectedDeepSkyEntry:{...entry}},expected:[false,false,false],oldExpected:[true,true,true]},
 {name:'different-objectRef',input:{selectedDeepSkyEntry:{objectRef:'M:42'}},expected:[true,true,true]},
 {name:'qualification-lost',input:{selectedDeepSkyEntry:null,desiredDeepSkyImageLevel:null},expected:[true,true,true]},
 {name:'different-level',input:{desiredDeepSkyImageLevel:'OVERVIEW'},expected:[true,true,true]},
 {name:'new-lease/same-path',input:{deepSkyImageAsset:{...file,release:()=>{}}},expected:[true,true,true]},
 {name:'new-native-generation',input:{canvasNodeRevision:2},expected:[false,false,true]},
 {name:'hidden',input:{pageVisible:false},expected:[true,false,true]},
 {name:'explicit-retry',input:{deepSkyImageAsset:null,deepSkyImageRetry:1},expected:[true,true,true]},
 {name:'decoded-withdrawal-from-retirement',input:{canvasDeepSkyImage:null},expected:[false,true,false]},
];
const dependencyResults=variations.map(v=>{const actual=current.map(e=>changed(e,{...bindings,...v.input}));assert.deepEqual(actual,v.expected,v.name);
 const oldActual=old.map(e=>changed(e,{...bindings,...v.input}));if(v.oldExpected)assert.deepEqual(oldActual,v.oldExpected);
 return {name:v.name,currentDependencyChanged:actual,oldDependencyChanged:oldActual,scope:'Evaluate actual dependency arrays only. Reference fixtures are not a new lease/image/runtime execution.'};});
const envelope=JSON.parse(fs.readFileSync(path.join(ROOT,task+'/tmp/current-native-report-2026-10-01.json'),'utf8'));
const raw=projectAdoptedSkyCatalog(envelope).data,metadata=JSON.parse(fs.readFileSync(path.join(ROOT,'output/playwright/cloud-sky-selected-full-hook-1002-r3/runtime-metadata-and-offers.json'),'utf8'));
const starRoute=`/v2/sky/catalogs/${raw.skyScene.catalog!.catalogVersion}/${raw.skyScene.catalog!.catalogHash}`,stars=metadata.metadata[starRoute].body.data;
const reference=raw.skyScene.deepSky!.catalog!.entries.find(e=>e.objectRef==='M:51')!;
const at=raw.hourly[0]!.at,modelAt=new Date(Date.parse(at)+60000).toISOString();
const timeIdentities=[at,modelAt,raw.hourly[1]!.at].map(instant=>{const presented=presentSkyTime(raw,instant);assert.ok(presented);
 const report=attachSkyCatalog(presented.report,stars),selected=report.skyScene.deepSky!.catalog!.entries.find(e=>e.objectRef==='M:51')!;
 assert.equal(selected,reference);return {at:instant,mode:presented.mode,deepSkyCatalogSameObject:report.skyScene.deepSky!.catalog===raw.skyScene.deepSky!.catalog,entrySameObject:selected===reference};});
assert.ok(timeIdentities.some(v=>v.mode==='MODEL'));
const forecast=skyForecastPresentation.project(raw,Date.parse(raw.hourly.at(-1)!.at)+3600000);
assert.equal(forecast.skyScene.deepSky!.catalog,raw.skyScene.deepSky!.catalog);
const clone=JSON.parse(JSON.stringify(raw));assert.notEqual(clone.skyScene.deepSky.catalog.entries.find((e:any)=>e.objectRef==='M:51'),reference);
const after=paths.map(bind);assert.deepEqual(after,before);save('inputs-after.json',after);
save('result.json',{status:'PASS_READONLY_AUDIT',oldPage:bind(oldPage),currentPage:bind(currentPage),dependencyResults,timeIdentities,
 forecastExpiryPreservesDeepSkyCatalog:forecast.skyScene.deepSky!.catalog===raw.skyScene.deepSky!.catalog,serializedFixtureCreatesNewEntry:true,
 scope:'Read-only source AST/dependency and actual time/forecast/report pure-owner computation. No effect, decode, GPU, browser, network or production execution. Structural-sharing preservation is inferred from actual query default and local owner; no live Tanstack refetch/WEAPP/performance claim.'});
console.log(JSON.stringify({result:bind(relative+'/result.json'),before:bind(relative+'/inputs-before.json'),after:bind(relative+'/inputs-after.json')}));
