/** Independent CPU/raw-byte review. No browser, GPU, network or source writer. */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {inflateSync} from 'node:zlib';

const ROOT=fileURLToPath(new URL('../../../../',import.meta.url));
const require=createRequire(path.join(ROOT,'apps/wechat-miniapp/package.json'));
const esbuild=require('esbuild'),ts=require('typescript');
const S='apps/wechat-miniapp/src/features/sky/';
const sha=(v:any)=>createHash('sha256').update(v).digest('hex');
const read=(p:string)=>fs.readFileSync(path.resolve(ROOT,p));
const files=new Set<string>();
const bind=(p:string)=>{const b=read(p);return{path:p,bytes:b.length,sha256:sha(b)};};
const json=(p:string)=>{files.add(p);return JSON.parse(read(p).toString('utf8'));};
let relative='output/catalog-region-independent-1002-r1';
for(let n=2;fs.existsSync(path.join(ROOT,relative));n++)relative=`output/catalog-region-independent-1002-r${n}`;
const out=path.join(ROOT,relative);fs.mkdirSync(out);
const save=(p:string,v:any)=>fs.writeFileSync(path.join(out,p),JSON.stringify(v,null,2)+'\n',{flag:'wx'});
const script=path.relative(ROOT,fileURLToPath(import.meta.url)).replaceAll('\\','/');files.add(script);
fs.writeFileSync(path.join(out,'executed-script.mts.txt'),read(script),{flag:'wx'});
const explicit=[S+'sky-deep-sky-region.ts',S+'sky-deep-sky-region.test.ts',S+'sky-sdss-science-scene.ts',
 S+'sky-sdss-science-scene.test.ts',S+'sky-scene-render.ts',S+'spot-sky-page.tsx',S+'sky-sdss-optical-frame.ts',
 S+'sky-deep-auxiliary-visibility.ts','packages/miniapp-contracts/src/types.ts',
 'packages/miniapp-contracts/src/sky-scene.ts','packages/miniapp-contracts/src/sky-scene.test.ts',
 'workers/miniapp-api/src/deep-sky-scene-provider.ts','workers/miniapp-api/src/deep-sky-scene-provider.test.ts',
 'workers/miniapp-api/src/astronomy-service.ts','apps/wechat-miniapp/tsconfig.json',
 'packages/astronomy-core/data/opengc-messier-deep-sky.v1.manifest.json'];
explicit.forEach(p=>files.add(p));
const owners=[S+'sky-deep-sky-region.ts',S+'sky-artwork-registration.ts',S+'sky-observation-frame.ts',
 S+'sky-sdss-science-scene.ts',S+'sky-sdss-optical-frame.ts',
 'workers/miniapp-api/src/deep-sky-scene-provider.ts','packages/miniapp-contracts/src/index.ts'];
const input=owners.map(p=>`export * from ${JSON.stringify('./'+p)};`).join('\n');
const built=await esbuild.build({absWorkingDir:ROOT,stdin:{contents:input,resolveDir:ROOT,sourcefile:'independent-exports.ts'},
 bundle:true,platform:'node',format:'cjs',target:'node24',write:false,metafile:true,
 tsconfig:path.join(ROOT,'apps/wechat-miniapp/tsconfig.json'),
 // The sole graph import.meta is the existing Astronomy Engine CJS bridge.
 // Retain that actual module's package-resolution base in this Node VM bundle.
 define:{'import.meta.url':JSON.stringify(pathToFileURL(path.join(ROOT,'packages/astronomy-core/src/astronomy-engine-runtime.ts')).href)}});
for(const p of Object.keys(built.metafile.inputs)){
 if(p==='<stdin>'||p==='independent-exports.ts')continue;
 const absolute=path.resolve(ROOT,p);assert(fs.existsSync(absolute),'actual graph input missing '+p);
 files.add(path.relative(ROOT,absolute).replaceAll('\\','/'));
}
for(const p of [require.resolve('esbuild'),require.resolve('esbuild/package.json'),require.resolve('typescript'),
 require.resolve('typescript/package.json'),process.execPath,
 require.resolve('astronomy-engine',{paths:[path.join(ROOT,'packages/astronomy-core')]}),
 path.join(path.dirname(require.resolve('astronomy-engine',{paths:[path.join(ROOT,'packages/astronomy-core')]})),'package.json'),
 'tools/run-node.cjs'])files.add(p);
const mod:any={exports:{}};
vm.runInNewContext(built.outputFiles[0].text,{module:mod,exports:mod.exports,require,console,process,Buffer,Date,TextEncoder,setTimeout,clearTimeout},
 {filename:'independent-actual-owners.cjs'});
const api=mod.exports;fs.writeFileSync(path.join(out,'actual-owner-bundle.cjs'),built.outputFiles[0].text,{flag:'wx'});
save('metafile.json',built.metafile);
const reportPath='.codex/work-items/cloud-sky-native-2026-09-22/tmp/current-native-report-2026-10-01.json';
const report=json(reportPath).data,catalog=json('packages/astronomy-core/data/opengc-messier-deep-sky.v1.json');
const actual=json('output/playwright/cloud-sky-science-scene-1002-r3/observations.json');
const prior=json('output/local-object-region-readonly-1002-r1/result.json');
const manifestPath='output/sdss-science-optical-writer-1002-r1/publication/manifest.json';
const publication=json(manifestPath),at=actual.at,observation=api.exactSkyObservationFrame(report,at);assert(observation);
const deep=api.buildDeepSkyScene([at],{wgs84:{latitude:observation.observer.latitude,longitude:observation.observer.longitude},
 altitudeM:observation.observer.elevationM});assert.equal(deep.state,'AVAILABLE');
const preserved=['apps/wechat-miniapp/src/content/settings/display-mode-control.tsx',
 'apps/wechat-miniapp/src/content/settings/display-mode-gesture.test.ts','apps/wechat-miniapp/src/content/settings/display-mode-gesture.ts',
 'apps/wechat-miniapp/src/content/settings/index.tsx','workers/miniapp-api/src/miniapp-infrastructure.test.ts','workers/miniapp-api/src/outbox-worker.ts'];
preserved.forEach(p=>files.add(p));
const rootResultPath='output/catalog-center-boundary-1002-r2/result.json',rootResult=json(rootResultPath);
for(const c of rootResult.checks){const p='output/catalog-center-boundary-1002-r2/'+c.log;
 files.add(p);assert.equal(bind(p).sha256,c.sha256);assert.equal(bind(p).bytes,c.bytes);}
for(const p of ['provider-typecheck.log','missing-center-mutant.log'])files.add('output/catalog-center-boundary-1002-r2/'+p);
const decoderPath='output/contribution-fbo-independent-1002-r2/executed-script.mts.txt';files.add(decoderPath);
const dec=ts.createSourceFile('saved-own-decoder.ts',read(decoderPath).toString('utf8'),ts.ScriptTarget.Latest,true);
const nodes=dec.statements.filter((n:any)=>ts.isFunctionDeclaration(n)&&n.name?.text==='png'||ts.isVariableStatement(n)&&
 n.declarationList.declarations.some((d:any)=>d.name.getText(dec)==='crc32'));
assert.equal(nodes.length,2);
const decode=vm.runInNewContext(ts.transpileModule(nodes.map((n:any)=>n.getText(dec)).join('\n')+'\npng;',
 {compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,{read,inflateSync,Buffer,assert});
const images:any={};for(const level of ['DETAIL','MEDIUM','OVERVIEW']){
 const asset=publication.levels[level],p=path.posix.dirname(manifestPath)+'/'+asset.file;files.add(p);
 assert.equal(bind(p).sha256,asset.sha256);assert.equal(bind(p).bytes,asset.bytes);images[level]=decode(p);
 assert.equal(images[level].w,512);assert.equal(images[level].h,512);
}
const before=[...files].sort().map(bind);save('inputs-before.json',before);
// Independent row reduction, not a transpose/registration cofactor roundtrip.
function inverse(m:number[]){const rows=[0,1,2].map(y=>[...m.slice(y*3,y*3+3),...[0,1,2].map(x=>x===y?1:0)]);
 for(let i=0;i<3;i++){let pivot=i;for(let y=i+1;y<3;y++)if(Math.abs(rows[y]![i]!)>Math.abs(rows[pivot]![i]!))pivot=y;
  [rows[i],rows[pivot]]=[rows[pivot]!,rows[i]!];const divisor=rows[i]![i]!;assert(Math.abs(divisor)>1e-12);
  rows[i]=rows[i]!.map(v=>v/divisor);for(let y=0;y<3;y++)if(y!==i){const k=rows[y]![i]!;rows[y]=rows[y]!.map((v,x)=>v-k*rows[i]![x]!);}}
 return rows.flatMap(r=>r.slice(3));}
const dot=(a:number[],b:number[])=>a.reduce((s,v,i)=>s+v*b[i]!,0);
const multiply=(m:number[],v:number[])=>[0,1,2].map(i=>dot(m.slice(i*3,i*3+3),v));
const normalize=(v:number[])=>{const n=Math.hypot(...v);return v.map(x=>x/n);};
const rad=Math.PI/180;
function axes(entry:any){const {raDeg,decDeg}=entry.icrsCenter,ra=raDeg*rad,dec=decDeg*rad,p=entry.positionAngleDeg*rad;
 const c=[Math.cos(dec)*Math.cos(ra),Math.cos(dec)*Math.sin(ra),Math.sin(dec)],e=[-Math.sin(ra),Math.cos(ra),0],
 n=[-Math.sin(dec)*Math.cos(ra),-Math.sin(dec)*Math.sin(ra),Math.cos(dec)];
 return{c,e,n,major:n.map((v,i)=>v*Math.cos(p)+e[i]!*Math.sin(p)),minor:n.map((v,i)=>-v*Math.sin(p)+e[i]!*Math.cos(p)),
 a:Math.tan(entry.majorAxisArcmin*rad/120),b:Math.tan(entry.minorAxisArcmin*rad/120)};}
function coordinates(entry:any,m:number[],ray:number[]){const q=multiply(inverse(m),ray),g=axes(entry),front=dot(g.c,q);
 if(front<=1e-14)return null;return[dot(g.major,q)/(front*g.a),dot(g.minor,q)/(front*g.b)];}
function rayFor(entry:any,m:number[],s:number,t:number){const g=axes(entry);
 return normalize(multiply(m,g.c.map((v,i)=>v+s*g.a*g.major[i]!+t*g.b*g.minor[i]!)));}
const numerical:any[]=[];let complete=0,maxError=0;
for(const entry of deep.catalog.entries){const row=catalog.rows.find((r:any)=>r.objectRef===entry.objectRef);assert(row);
 assert.equal(entry.icrsCenter.raDeg,row.raDeg);assert.equal(entry.icrsCenter.decDeg,row.decDeg);
 for(const name of ['majorAxisArcmin','minorAxisArcmin','positionAngleDeg'])assert.equal(entry[name],row[name]);
 const region=api.registerSkyDeepSkyRegion(entry,observation);if(!region){assert(row.minorAxisArcmin===null||row.positionAngleDeg===null);continue;}
 complete++;assert(Object.isFrozen(region)&&Object.isFrozen(region.registration));
 for(const [s,t] of [[0,0],[.3,.4],[-.45,.2],[.95,.1],[1.12,.2]]){
  const ray=rayFor(entry,observation.equatorialToEnu,s!,t!),expected=coordinates(entry,observation.equatorialToEnu,ray)!,
  seen=api.skyDeepSkyRegionCoordinates(region,ray);assert(seen);const error=Math.hypot(seen[0]-expected[0]!,seen[1]-expected[1]!);
  maxError=Math.max(maxError,error);assert(error<2e-8);assert.equal(api.skyDeepSkyRegionContainsDirection(region,ray),s!**2+t!**2<=1);
 }
 numerical.push({reference:entry.objectRef,center:entry.icrsCenter});
}
assert.equal(complete,39);assert.equal(deep.catalog.catalogHash,report.skyScene.deepSky.catalog.catalogHash);
assert(api.deepSkySceneCacheKey().endsWith(':catalog-icrs-center-v1'));
const entry=deep.catalog.entries.find((e:any)=>e.objectRef==='M:51'),m=observation.equatorialToEnu;
// Exercise the actual whole scene boundary on the cached legacy report and on
// current enriched catalog data. Optional center does not strand old reports.
const legacyScene=structuredClone(report.skyScene);api.assertSkyScene(legacyScene,report.hourly.map((h:any)=>h.at));
const enrichedScene=structuredClone(legacyScene);
enrichedScene.deepSky.catalog.entries=JSON.parse(JSON.stringify(deep.catalog.entries));
api.assertSkyScene(enrichedScene,report.hourly.map((h:any)=>h.at));
const contractControls:any[]=[];
for(const value of [null,undefined,{raDeg:0,decDeg:-90},{raDeg:359.999,decDeg:90}]){
 const candidate=structuredClone(enrichedScene);candidate.deepSky.catalog.entries[0].icrsCenter=value;
 api.assertSkyScene(candidate,report.hourly.map((h:any)=>h.at));contractControls.push({value:value??null,accepted:true});}
for(const value of [{raDeg:360,decDeg:0},{raDeg:0,decDeg:90.1},{raDeg:-.01,decDeg:0},{raDeg:0},{raDeg:'0',decDeg:0}]){
 const candidate=structuredClone(enrichedScene);candidate.deepSky.catalog.entries[0].icrsCenter=value;
 assert.throws(()=>api.assertSkyScene(candidate,report.hourly.map((h:any)=>h.at)));contractControls.push({value,accepted:false});}
const region=api.registerSkyDeepSkyRegion(entry,observation);assert(region);
const unknowns:any=[];for(const [name,candidate,frame] of [
 ['missingPA',{...entry,positionAngleDeg:null},observation],['missingMinor',{...entry,minorAxisArcmin:null},observation],
 ['missingCenter',{...entry,icrsCenter:null},observation],['invalidCenter',{...entry,icrsCenter:{raDeg:360,decDeg:0}},observation],
 ['reflectedFrame',entry,{...observation,equatorialToEnu:[-1,0,0,0,1,0,0,0,1]}],
 ['nonRigidFrame',entry,{...observation,equatorialToEnu:[1,.01,0,0,1,0,0,0,1]}]]){
 assert.equal(api.registerSkyDeepSkyRegion(candidate,frame),null);unknowns.push(name);}
for(const q of [[0,0,0],multiply(m,axes(entry).c.map(v=>-v)),multiply(m,axes(entry).e)])
 assert.equal(api.skyDeepSkyRegionCoordinates(region,q),null);
const shear=[1,4e-7,0,0,1,0,0,0,1],sheared={...observation,equatorialToEnu:shear};api.assertStellarRotation(shear);
const sr=api.registerSkyDeepSkyRegion(entry,sheared);assert(sr);const sq=rayFor(entry,shear,.37,-.28),sc=api.skyDeepSkyRegionCoordinates(sr,sq);
assert(Math.hypot(sc[0]-.37,sc[1]+.28)<1e-8);
const boundary=[[-1,0],[1,0],[0,-1],[0,1]].map(([s,t])=>{const q=rayFor(entry,m,s!,t!),c=api.skyDeepSkyRegionCoordinates(region,q);
 return{s,t,coordinates:c,inside:api.skyDeepSkyRegionContainsDirection(region,q),error:Math.hypot(c[0]-s!,c[1]-t!)};});
const source=read(S+'sky-deep-sky-region.ts').toString('utf8');
function mutant(text:string){const exports:any={};vm.runInNewContext(ts.transpileModule(text,{compilerOptions:{module:ts.ModuleKind.CommonJS,
 target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:(name:string)=>name==='@starward/miniapp-contracts'?api:
 name==='./sky-artwork-registration'?api:name==='./sky-observation-frame'?api:(()=>{throw Error(name);})()});return exports;}
const controls:any=[];for(const [name,text] of [['diameterAsHalfaxis',source.replaceAll('/ 120','/ 60')],
 ['mirroredPA',source.replace('Math.cos(pa) * value + Math.sin(pa)','Math.cos(pa) * value - Math.sin(pa)')]]){
 assert.notEqual(text,source);const owner=mutant(text),rr=owner.registerSkyDeepSkyRegion(entry,observation),q=rayFor(entry,m,.43,.31),
 c=owner.skyDeepSkyRegionCoordinates(rr,q),e=coordinates(entry,m,q)!;const error=Math.hypot(c[0]-e[0]!,c[1]-e[1]!);
 assert(error>1e-3);controls.push({name,error,detected:true});}
// Published TAN image UV is independent of the catalog ellipse and its center.
function uv(level:string,ray:number[]){const q=multiply(inverse(m),ray),center={icrsCenter:publication.center,majorAxisArcmin:1,
 minorAxisArcmin:1,positionAngleDeg:0},g=axes(center),front=dot(g.c,q);if(front<=0)return null;
 const half=Math.tan(publication.levels[level].fieldDegrees*rad/2);
 return[.5-dot(g.e,q)/(2*half*front),.5-dot(g.n,q)/(2*half*front)];}
function available(level:string,ray:number[]){const c=uv(level,ray);if(!c||c.some(v=>v<0||v>1))return false;
 const image=images[level],x=Math.floor(c[0]!*512-.5),y=Math.floor(c[1]!*512-.5),clamp=(v:number)=>Math.max(0,Math.min(511,v));
 return [[x,y],[x+1,y],[x,y+1],[x+1,y+1]].every(([xx,yy])=>image.rgba[(clamp(yy!)*512+clamp(xx!))*4+3]===255);}
const views:any[]=[];
for(const fov of [2.8,.18,.05]){
 const counts:any={total:390*844,region:0,insideFine:0,insideCoarse:0,insideNoSelected:0,outsideFine:0,outsideCoarse:0,outsideNoSelected:0};
 let membershipMismatches=0,coordinateMax=0;
 const scale=844/(2*Math.tan(fov*Math.PI/720));
 for(let y=0;y<844;y++)for(let x=0;x<390;x++){
  const px=(x+.5-195)/scale,py=(422-y-.5)/scale,r2=px*px+py*py,denom=1+r2,
  a=2*px/denom,b=2*py/denom,c=(1-r2)/denom,
  ray=actual.basis.forward.map((v:number,i:number)=>c*v+a*actual.basis.right[i]+b*actual.basis.up[i]);
  const expected=coordinates(entry,m,ray)!,seen=api.skyDeepSkyRegionCoordinates(region,ray);assert(seen);
  coordinateMax=Math.max(coordinateMax,Math.hypot(expected[0]!-seen[0],expected[1]!-seen[1]));
  const inside=expected[0]!**2+expected[1]!**2<=1;if(inside!==api.skyDeepSkyRegionContainsDirection(region,ray))membershipMismatches++;
  if(inside)counts.region++;const fine=available('DETAIL',ray),coarse=!fine&&available('OVERVIEW',ray);
  counts[(inside?'inside':'outside')+(fine?'Fine':coarse?'Coarse':'NoSelected')]++;
 }
 assert.equal(membershipMismatches,0);assert(coordinateMax<2e-8);
 assert.deepEqual(counts,prior.views.find((v:any)=>v.fov===fov).counts);
 views.push({fov,counts,membershipMismatches,coordinateMax,scope:'independent CPU double ray/ellipse + real PNG four-alpha selection; not new GPU/readability proof'});
}
const frame=api.skySdssOpticalFrame({publication,image:{width:512,height:512},renderedLevel:'DETAIL',renderedAsset:publication.levels.DETAIL,
 coarser:{image:{width:512,height:512},level:'MEDIUM',asset:publication.levels.MEDIUM}});assert(frame);
let groupCount=0;const surface:any={artworkLevels(){groupCount++;return{submitted:true,finePrepared:true,coarsePrepared:true};},
 artworkLevelsQualification(){return{any:'has',fine:'has',coarse:'has'};}};
const port={surface,reference:'M:51',publicationHash:publication.publicationHash};const view={basis:actual.basis,width:390,height:844,fov:2.8};
const joins:any=[];for(const [name,e] of [['matching',entry],['foreign',{...entry,objectRef:'M:31'}],['missingPA',{...entry,positionAngleDeg:null}],['none',null]]){
 const submit=api.submitSkySceneScienceOptical(surface,port,frame,observation,view,undefined,e);assert(submit);assert.equal(submit.allowInfrared,false);
 assert.equal(!!submit.region,name==='matching');joins.push({name,region:!!submit.region,allowInfrared:submit.allowInfrared});}
assert.equal(api.submitSkySceneScienceOptical(surface,undefined,frame,observation,view,undefined,entry),null);assert.equal(groupCount,4);
save('completed-math-raw-controls.json',{complete,maxError,unknowns,boundary,controls,views,joins,contractControls});
const scene=ts.createSourceFile('actual-scene.ts',read(S+'sky-scene-render.ts').toString('utf8'),ts.ScriptTarget.Latest,true);
let call:any;function visit(n:any){if(ts.isCallExpression(n)&&n.expression.getText(scene)==='submitSkySceneScienceOptical')call=n;ts.forEachChild(n,visit);}visit(scene);assert(call);
const runCall=vm.runInNewContext(ts.transpileModule(`(deepCatalog,sdssOpticalImage)=>(${call.getText(scene)});`,
 {compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,{context:surface,scienceOptical:port,observation,artworkView:view,sdssOpticalFailed:undefined,
 submitSkySceneScienceOptical:api.submitSkySceneScienceOptical});
assert(runCall({frame:'ICRS J2000',entries:[entry]},frame).region);
assert.equal(runCall({frame:'GALACTIC',entries:[entry]},frame).region,null);
assert.equal(runCall({frame:'ICRS J2000',entries:[{...entry,objectRef:'M:31'}]},frame).region,null);
const aids=read(S+'sky-scene-render.ts').toString('utf8');assert(!/deepSkyAuxiliaryOpacity\([^)]*region/s.test(aids));
const after=[...files].sort().map(bind);assert.deepEqual(after,before);save('inputs-after.json',after);
save('result.json',{status:'PASS_BOUNDED_INDEPENDENT_CPU_RAW_REVIEW',toolchain:{node:process.version,esbuild:esbuild.version,typescript:ts.version},
 actualGraphInputs:Object.keys(built.metafile.inputs).length,inputBindings:before.length,complete,total:catalog.rows.length,numerical,maxError,
 unknowns,shearCoordinates:sc,boundary,controls,views,joins,contractControls,sceneCall:call.getText(scene),
 centerProvider:{hashUnchanged:true,cacheKey:api.deepSkySceneCacheKey(),missingMinor:6,missingPA:12},
 rootChecks:{changedBoundaryPass:rootResult.changedBoundaryPass,fullWorkerTypecheckPass:rootResult.fullWorkerTypecheckPass},
 limits:['CPU double geometry/raw bytes only; no new software GPU/WEAPP/native render or visibility/readability certification',
 'The ellipse is a catalog angular reference, not band segmentation, scientific mask, absence, or aid-opacity policy',
 'Exact boundary rays expose numerical rounding; no zero/absence certificate follows from a boolean boundary evaluation',
 '39/51 is current source completeness, not a demand ceiling; no guessed PA/minor/center',
 'Existing prototype counts independently recomputed with new owner; historical GPU sources/results remain historical',
 'Task controls preserve explicit science port gating and do not adopt ordinary new science consumers'],preserved:preserved.map(bind)});
console.log(JSON.stringify({result:bind(relative+'/result.json'),inputs:before.length,views,controls,maxError}));
