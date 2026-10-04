/** Saved-result/actual-source closure and bounded CPU consumer controls only. */
import fs from 'node:fs';import path from 'node:path';import vm from 'node:vm';
import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';import {createRequire} from 'node:module';
const ROOT=fileURLToPath(new URL('../../../../',import.meta.url));
const require=createRequire(path.join(ROOT,'apps/wechat-miniapp/package.json')),ts=require('typescript');
let relative='output/catalog-region-independent-closure-1002-r1';
for(let n=2;fs.existsSync(path.join(ROOT,relative));n++)relative=`output/catalog-region-independent-closure-1002-r${n}`;
const out=path.join(ROOT,relative);fs.mkdirSync(out);
const files=new Set<string>(),read=(p:string)=>fs.readFileSync(path.resolve(ROOT,p)),hash=(b:any)=>createHash('sha256').update(b).digest('hex');
const bind=(p:string)=>{const b=read(p);return{path:p,bytes:b.length,sha256:hash(b)};};
const json=(p:string)=>{files.add(p);return JSON.parse(read(p).toString('utf8'));};
const save=(p:string,v:any)=>fs.writeFileSync(path.join(out,p),JSON.stringify(v,null,2)+'\n',{flag:'wx'});
const script=path.relative(ROOT,fileURLToPath(import.meta.url)).replaceAll('\\','/');files.add(script);
fs.writeFileSync(path.join(out,'executed-script.mts.txt'),read(script),{flag:'wx'});
const prefix='output/catalog-region-independent-1002-r6/',review=json(prefix+'result.json');
const rb=json(prefix+'inputs-before.json'),ra=json(prefix+'inputs-after.json');assert.deepEqual(ra,rb);
for(const r of rb){files.add(r.path);assert.deepEqual(bind(r.path),r);}files.add(prefix+'actual-owner-bundle.cjs');
files.add(prefix+'executed-script.mts.txt');files.add(prefix+'metafile.json');files.add(prefix+'completed-math-raw-controls.json');
const authorPrefix='output/local-object-region-development-1002-r2/',author=json(authorPrefix+'check-results.json');
const ab=json(authorPrefix+'inputs-before.json'),aa=json(authorPrefix+'inputs-after.json');assert.deepEqual(ab,aa);
for(const r of ab){files.add(r.path);assert.deepEqual(bind(r.path),r);}
const inherited=author.inheritedActualChecks;for(const key of ['result','checks','graph','sources']){
 const r=inherited[key];files.add(r.path);assert.deepEqual(bind(r.path),r);}
const ar1=json(inherited.result.path);assert(ar1.results.every((r:any)=>r.name!=='typecheck'||r.exit!==0),'author original TS failure must remain');
const log=read(inherited.checks.path).toString('utf8');assert(/tests 75/.test(log)&&/pass 75/.test(log)&&/fail 0/.test(log));
for(const p of ['region-checks.log','typecheck.log'])files.add(authorPrefix+p);
assert(author.results.every((r:any)=>r.exit===0));
const authorCpu=json(author.actualProductionReplay.result.path);files.add(author.actualProductionReplay.sources.path);
assert.deepEqual(authorCpu.views.map((v:any)=>v.counts),review.views.map((v:any)=>v.counts));
const rootPrefix='output/catalog-center-boundary-1002-r2/',root=json(rootPrefix+'result.json');
for(const p of ['contract.log','provider.log','changed-provider-typecheck.log','provider-typecheck.log','missing-center-mutant.log'])files.add(rootPrefix+p);
assert.equal(root.changedBoundaryPass,true);assert.equal(root.fullWorkerTypecheckPass,false);
const S='apps/wechat-miniapp/src/features/sky/';
const module:any={exports:{}};const bundle=read(prefix+'actual-owner-bundle.cjs').toString('utf8');
assert(bundle.includes('function skyNativeImageIsCurrent(')&&bundle.includes('function registerSkyScienceOpticalField('));
vm.runInNewContext(bundle+'\nmodule.exports.reviewActualDependencies={skyNativeImageIsCurrent,registerSkyScienceOpticalField};',
 {module,exports:module.exports,require,console,process,Buffer,Date,TextEncoder,setTimeout,clearTimeout});const api=module.exports;
const manifest=json('output/sdss-science-optical-writer-1002-r1/publication/manifest.json');
const old=json('.codex/work-items/cloud-sky-native-2026-09-22/tmp/current-native-report-2026-10-01.json').data;
const actual=json('output/playwright/cloud-sky-science-scene-1002-r3/observations.json');
const observation=api.exactSkyObservationFrame(old,actual.at);assert(observation);
const source=json('packages/astronomy-core/data/opengc-messier-deep-sky.v1.json').rows.find((r:any)=>r.objectRef==='M:51');
const entry={...old.skyScene.deepSky.catalog.entries.find((e:any)=>e.objectRef==='M:51'),icrsCenter:{raDeg:source.raDeg,decDeg:source.decDeg}};
const rad=Math.PI/180,eq=(ra:number,dec:number)=>[Math.cos(dec*rad)*Math.cos(ra*rad),Math.cos(dec*rad)*Math.sin(ra*rad),Math.sin(dec*rad)],
 mul=(m:number[],q:number[])=>[0,1,2].map(y=>m.slice(y*3,y*3+3).reduce((s,v,x)=>s+v*q[x]!,0));
const centerRay=mul(observation.equatorialToEnu,eq(entry.icrsCenter.raDeg,entry.icrsCenter.decDeg));
const original=api.registerSkyDeepSkyRegion(entry,observation);assert(original);
const centerOriginal=api.skyDeepSkyRegionCoordinates(original,centerRay);assert(Math.hypot(...centerOriginal)<1e-8);
const changed=api.registerSkyDeepSkyRegion({...entry,icrsCenter:{raDeg:entry.icrsCenter.raDeg+.1,decDeg:entry.icrsCenter.decDeg}},observation);
const centerChanged=api.skyDeepSkyRegionCoordinates(changed,centerRay);assert(Math.hypot(...centerChanged)>.1);
const captured=JSON.stringify(original);entry.icrsCenter.raDeg+=1;entry.positionAngleDeg=25;
assert.equal(JSON.stringify(original),captured);assert(Math.hypot(...api.skyDeepSkyRegionCoordinates(original,centerRay))<1e-8);
assert(Object.isFrozen(original.registration)&&Object.isFrozen(original.registration.rows)&&
 original.registration.rows.every((r:any)=>Object.isFrozen(r)));
const frame=api.skySdssOpticalFrame({publication:manifest,image:{width:512,height:512},renderedLevel:'DETAIL',renderedAsset:manifest.levels.DETAIL,
 coarser:{image:{width:512,height:512},level:'MEDIUM',asset:manifest.levels.MEDIUM}});assert(frame);
let groups=0;const surface:any={artworkLevels(){groups++;return{submitted:true,finePrepared:true,coarsePrepared:true};},
 artworkLevelsQualification(){return{fine:'has',coarse:'has',any:'has'};}};
const port={surface,reference:'M:51',publicationHash:manifest.publicationHash};
const sceneText=read(S+'sky-scene-render.ts').toString('utf8'),scene=ts.createSourceFile('scene.ts',sceneText,ts.ScriptTarget.Latest,true);
let call:any;const visit=(n:any)=>{if(ts.isCallExpression(n)&&n.expression.getText(scene)==='submitSkySceneScienceOptical')call=n;ts.forEachChild(n,visit);};visit(scene);assert(call);
const run=vm.runInNewContext(ts.transpileModule(`(scienceOptical,sdssOpticalImage,deepCatalog)=>(${call.getText(scene)});`,
 {compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,{context:surface,observation,artworkView:{basis:actual.basis,width:390,height:844,fov:2.8},
 sdssOpticalFailed:undefined,submitSkySceneScienceOptical:api.submitSkySceneScienceOptical});
const noScan={frame:'ICRS J2000',get entries(){throw Error('normal default must not scan catalog entries');}};
assert.equal(run(undefined,frame,noScan),null);assert.equal(run(port,null,noScan),null);assert.equal(groups,0);
const text=read(S+'sky-sdss-science-scene.ts').toString('utf8'),needle='catalogEntry?.objectRef === frame.reference';
assert.equal(text.split(needle).length,2);const changedText=text.replace(needle,'catalogEntry != null');
const exports:any={};vm.runInNewContext(ts.transpileModule(changedText,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,
 {exports,require(name:string){assert(['./sky-artwork-loader','./sky-sdss-science-registration','./sky-deep-sky-region'].includes(name));
 return name==='./sky-deep-sky-region'?api:api.reviewActualDependencies;}});
const foreign={...entry,objectRef:'M:31'};
const safe=api.submitSkySceneScienceOptical(surface,port,frame,observation,{basis:actual.basis,width:390,height:844,fov:2.8},undefined,foreign);
const escaped=exports.submitSkySceneScienceOptical(surface,port,frame,observation,{basis:actual.basis,width:390,height:844,fov:2.8},undefined,foreign);
assert.equal(safe.region,null);assert(escaped.region&&escaped.region.reference==='M:31');
const before=[...files].sort().map(bind);save('inputs-before.json',before);
const after=[...files].sort().map(bind);assert.deepEqual(after,before);save('inputs-after.json',after);
save('result.json',{status:'PASS_CURRENT_BOUNDED_INDEPENDENT_CLOSURE',review:bind(prefix+'result.json'),
 currentSourceJoin:{independentPrePost:rb.length,authorCurrentPrePost:ab.length,bindings:before.length},
 sourceCenterChange:{original:centerOriginal,changed:centerChanged,sourceMutationCaptured:true},
 defaultNoCatalogScan:{noPort:true,noImage:true},wrongReferenceGuardMutation:{safeRegion:null,escapedRegion:escaped.region.reference,detected:true},
 author:{behavior75Actual:true,originalTypecheckFailureRetained:true,currentRegion6AndAppTypecheckPassed:true,actualCpuCountsExact:true},
 root:{centerBoundary:true,fullWorkerTypecheck:false,unchangedSevenErrorScope:'saved root log; not generalized overall green'},
 limits:review.limits});console.log(JSON.stringify({result:bind(relative+'/result.json'),bindings:before.length}));
