/** Bounded independent actual Scene/identity/completion + page AST/lifecycle controls.
 * Controlled render surface and model receipts; no GPU/native or new source decode. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../..');
const OUT=path.join(ROOT,'output/prepared-scene-independent-1003-r4'); mkdirSync(OUT);
const dir='apps/wechat-miniapp/src/features/sky/', parent='output/prepared-optical-scene-1003-r2/';
const appRequire=createRequire(path.join(ROOT,'apps/wechat-miniapp/package.json')),ts=appRequire('typescript');
const read=(p:string)=>readFileSync(path.isAbsolute(p)?p:path.join(ROOT,p));
const json=(p:string)=>JSON.parse(read(p).toString());
const sha=(v:Uint8Array|string)=>createHash('sha256').update(v).digest('hex');
const save=(n:string,v:any)=>writeFileSync(path.join(OUT,n),JSON.stringify(v,null,2)+'\n',{flag:'wx'});
const actual=async(n:string)=>import(pathToFileURL(path.join(ROOT,dir+n+'.ts')).href);
const contract=await import(pathToFileURL(path.join(ROOT,'packages/miniapp-contracts/src/index.ts')).href);
const frames=await actual('sky-sdss-optical-frame'),identity=await actual('sky-target-optical-identity');
const helper=await actual('sky-target-optical-scene'),prep=await actual('sky-prepared-optical-scene');
const sci=await actual('sky-sdss-science-scene'),completion=await actual('sky-sdss-optical-completion');
const levelsOwner=await actual('sky-artwork-level-composition'),scene=await actual('sky-scene-render');
const lifetime=await actual('sky-artwork-loader'),views=await actual('sky-view-projection');
const lifecycleOwner=await actual('sky-canvas-lifecycle'),aux=await actual('sky-deep-auxiliary-visibility');
const body=await actual('sky-body-label-presentation');
const prepared=json('output/prepared-optical-publication-1003-r4/publication/manifest.json');
const science=json('output/sdss-science-optical-writer-1002-r1/publication/manifest.json');
contract.assertPreparedOpticalManifest(prepared,'M:51',prepared.publicationHash);
contract.assertSdssScienceOpticalManifest(science,'M:51',science.publicationHash);
const deepFreeze=(v:any):any=>{if(v&&typeof v==='object'){Object.values(v).forEach(deepFreeze);Object.freeze(v);}return v;};
deepFreeze(prepared);deepFreeze(science);
const scoped=['sky-target-optical-identity','sky-target-optical-scene','sky-prepared-optical-scene',
 'sky-sdss-science-scene','sky-artwork-level-composition','sky-sdss-optical-completion','sky-scene-render',
 'sky-sdss-optical-frame','sky-tan-optical-registration','sky-artwork-loader','sky-canvas-lifecycle',
 'sky-deep-auxiliary-visibility','sky-body-label-presentation','sky-deep-sky-region','sky-view-projection'];
// Bind relative workspace imports of the actual owners (including type imports).
// Bare vendor implementations are explicit resolved entry points, not a full vendor graph claim.
const graph=new Set<string>(),external=new Map<string,string>();
function walk(p:string){p=path.resolve(p);if(graph.has(p))return;assert(p.startsWith(ROOT+path.sep));graph.add(p);
 for(const imp of ts.preProcessFile(read(p).toString(),true,true).importedFiles){
  const n=imp.fileName;
  if(n.startsWith('.')){const b=path.resolve(path.dirname(p),n),r=[b,b+'.ts',b+'.tsx',b+'.json',path.join(b,'index.ts')].find(existsSync);assert(r,'missing relative '+n+' in '+p);walk(r);}
  else if(n.startsWith('@starward/')){const b=appRequire.resolve(n);assert(existsSync(b),'missing workspace export '+n);walk(b);}
  else {try{external.set(n,appRequire.resolve(n));}catch{external.set(n,'type-only-or-platform-unresolved');}}
 }
}
for(const n of scoped)walk(path.join(ROOT,dir+n+'.ts'));
const protectedRows=json('.codex/work-items/cloud-sky-native-2026-09-22/tmp/resume-preserved-hashes-2026-10-01.json');
const inputPaths=[...new Set([fileURLToPath(import.meta.url),process.execPath,appRequire.resolve('typescript'),
 ...graph,...[...external.values()].filter(p=>path.isAbsolute(p)),
 dir+'spot-sky-page.tsx',...json(parent+'inputs-before.json').map((r:any)=>r.path),
 parent+'result.json',parent+'inputs-before.json',parent+'inputs-after.json',
 ...protectedRows.map((r:any)=>r.path)])];
const bind=()=>inputPaths.sort().map(p=>{const b=read(p);return{path:p,bytes:b.length,sha256:sha(b)};});
const before=bind();save('inputs-before.json',before);save('dependency-scope.json',{relativeWorkspaceImports:[...graph].map(p=>path.relative(ROOT,p).replaceAll('\\','/')).sort(),bareEntries:[...external].sort(),scope:'Relative workspace import graph plus explicit resolved bare entry points, not full vendor/runtime build closure.'});
mkdirSync(path.join(OUT,'sources'));
for(const n of scoped)writeFileSync(path.join(OUT,'sources',n+'.ts.txt'),read(dir+n+'.ts'),{flag:'wx'});
writeFileSync(path.join(OUT,'sources','spot-sky-page.tsx.txt'),read(dir+'spot-sky-page.tsx'),{flag:'wx'});
writeFileSync(path.join(OUT,'executed-script.mts'),readFileSync(fileURLToPath(import.meta.url)),{flag:'wx'});
for(const r of protectedRows)assert.equal(sha(read(r.path)),r.sha256);
const author=json(parent+'result.json');assert.equal(sha(read(parent+'result.json')),'db87e574f51c1c7c91e9c8c7cde6b48ce6d6b72933b6340a6924f0736a12c0ee');
assert.deepEqual(json(parent+'inputs-before.json'),json(parent+'inputs-after.json'));
for(const r of json(parent+'inputs-before.json')){const b=read(r.path);assert.equal(b.length,r.bytes);assert.equal(sha(b),r.sha256);}
for(const k of ['checks','types'])for(const s of ['stdout','stderr']){const r=author[k][s],b=read(r.path);assert.equal(b.length,r.bytes);assert.equal(sha(b),r.sha256);}
assert.equal(author.checks.exitCode,0);assert.equal(author.types.exitCode,0);

const at='2026-10-03T00:00:00.000Z';
const observation:any={format:contract.OBSERVATION_FRAME_FORMAT,at,observer:{latitude:22.54,longitude:113.95,elevationM:50},equatorialToEnu:[1,0,0,0,1,0,0,0,1]};
const az=(90-prepared.center.raDeg+360)%360,alt=prepared.center.decDeg;
const basis=views.createSkyViewBasis(az,90+alt,0);assert(basis);
// One controlled exact-time report. Axes are explicit controlled catalog inputs,
// not a newly acquired/report-produced catalog or segmentation claim.
const catalogEntry={objectRef:'M:51',displayName:'M51',kind:'GALAXY',magnitude:8.4,majorAxisArcmin:13.71,minorAxisArcmin:11.67,positionAngleDeg:163,icrsCenter:{...prepared.center}};
const report:any={hourly:[{at,sunAzimuthDeg:270,sunAltitudeDeg:-24}],observationFrames:[observation],
 skyScene:{state:'UNAVAILABLE',catalog:null,publication:null,frames:[],deepSky:{state:'AVAILABLE',catalog:{frame:'ICRS J2000',catalogVersion:'independent-controlled-deep',catalogHash:'controlled',imageRegistration:'ICRS_TAN_NORTH_0_1_V1',entries:[catalogEntry]},frames:[{at,state:'AVAILABLE',points:[[0,az,alt,az,alt+.1,az-.1,alt]]}]}},targetFrames:[]};
save('controlled-input.json',{at,observation,catalogEntry,basis,scope:'One exact-time controlled report/camera, admitted actual cached publication descriptors, callback image objects, controlled surface/model receipts.'});
const imageIds=new WeakMap<object,number>();let nextImage=0;
const imageId=(v:object)=>{if(!imageIds.has(v))imageIds.set(v,++nextImage);return imageIds.get(v)!;};
const retired:Array<()=>void>=[];
function world(kind:'prepared'|'science'='prepared',primary='DETAIL',parentLevel:string|null='MEDIUM'){
 const p=kind==='prepared'?prepared:science,fi={width:512,height:512},co={width:512,height:512};imageId(fi);imageId(co);
 const retireFine=lifetime.registerSkyNativeImageLifetime(fi,()=>true),retireCoarse=lifetime.registerSkyNativeImageLifetime(co,()=>true);retired.push(retireFine,retireCoarse);
 const loaded:any={publication:p,image:fi,renderedLevel:primary,renderedAsset:p.levels[primary],coarser:parentLevel?{image:co,level:parentLevel,asset:p.levels[parentLevel]}:null};
 const frame=kind==='prepared'?frames.skyPreparedOpticalFrame(loaded):frames.skySdssOpticalFrame(loaded);assert(frame);
 return{p,fi,co,frame,retireFine,retireCoarse};
}
const HAS={fine:'has',coarse:'has',any:'has'},EMPTY={fine:'empty',coarse:'empty',any:'empty'},UNKNOWN={fine:'unknown',coarse:'unknown',any:'unknown'};
const localPositive=deepFreeze({scope:'frozen-highp-shader-pixel-centers',precision:'unknown',signalRevision:7,fine:{selection:'has',photo:'positive'},coarse:{selection:'has',photo:'positive'}});
function surface(options:any={}){
 const events:any[]=[],groups:any[]=[],artworks:any[]=[],failures:any[]=[],discs:any[]=[];let finished=false,lastDraw:any=null,localCalls=0;
 const q=options.q??HAS;
 const s:any={begin(){events.push({kind:'begin'});finished=false;},solarLight:()=>true,galacticBand:()=>true,sun:()=>true,moon:()=>true,planet:()=>true,saturnRings:()=>true,image:()=>true,skyImageMesh:()=>true,
  landscape(){events.push({kind:'landscape'});options.late?.();return true;},
  artwork(image:any,_r:any,_v:any,_o:any,_t:any,composite:string){events.push({kind:'artwork',image:imageId(image),composite});artworks.push({image,composite});return options.w3Painted!==false;},
  segments(){events.push({kind:'segments'});},disc(x:any,y:any,r:any,_c:any,o:any){events.push({kind:'disc',opacity:o});discs.push({x,y,r,opacity:o});if(options.throwAt==='disc')throw Error('ordinary-disc-failed');},
  artworkLevels(levels:any,view:any,opacity:any){assert.equal(opacity,1);assert.strictEqual(view.basis,basis);events.push({kind:'group'});groups.push(levels);
   for(const f of [levels.fine,levels.coarse].filter(Boolean))assert(levelsOwner.validSkyArtworkLevel(f));
   if(options.throwAt==='group')throw Error('ordinary-group-failed');
   lastDraw=Object.freeze({submitted:!!(levels.fine||levels.coarse),finePrepared:!!levels.fine&&options.failPrepared!=='fine',coarsePrepared:!!levels.coarse&&options.failPrepared!=='coarse'});return lastDraw;},
  artworkLevelsQualification(draw:any){assert.strictEqual(draw,lastDraw);assert.equal(finished,false);events.push({kind:'qualification'});return q;},
  artworkLevelsObserveRegion(draw:any,region:any){assert.strictEqual(draw,lastDraw);assert.equal(finished,false);assert.equal(region?.reference,'M:51');events.push({kind:'local'});localCalls++;options.duringLocal?.();return options.local??levelsOwner.unknownSkyArtworkLocalObservation;},
  artworkLevelsContribution(draw:any){assert.strictEqual(draw,lastDraw);assert.equal(finished,true);events.push({kind:'receipt'});if(options.throwAt==='receipt')throw Error('ordinary-receipt-failed');
   return{completed:true,qualification:q,finePhoto:options.photo?.fine??(q===EMPTY?'unknown':'positive'),coarsePhoto:options.photo?.coarse??(q===EMPTY?'unknown':'positive')};},
  resetArtworkContributions(){},finish(){events.push({kind:'finish'});if(options.throwAt==='finish')throw Error('ordinary-finish-failed');finished=true;options.atFinish?.();}};
 return{s,events,groups,artworks,failures,discs,get localCalls(){return localCalls;}};
}
const w3={image:{width:512,height:512},reference:'M:51',level:'DETAIL',fieldDegrees:.25,tempFilePath:'/controlled-w3.png'};imageId(w3.image);
function paint(w:any,s:any,overrides:any={},drawOwner=scene.drawSkyScene){let snap:any=null,sources:any=null,called=0;
 const args:any[]=[s.s,report,at,null,null,390,844,'NIGHT'];
 args[8]=(snapshot:any,value:any)=>{s.events.push({kind:'painted'});snap=snapshot;sources=value;};args[9]=()=>{called++;};args[10]=1.8;args[11]=w3;args[12]=basis;args[30]=w.frame;args[31]=(v:object)=>{s.failures.push(v);};
 args['preparedPublication' in w.frame?37:36]={surface:s.s,reference:w.frame.reference,publicationHash:w.frame.publicationHash};Object.assign(args,overrides);
 drawOwner(...args);return{snap,sources,called,events:s.events,groups:s.groups.length,w3:s.artworks.some((v:any)=>v.image===w3.image),failedImages:s.failures.map(imageId),opacity:snap?.deepSkyAuxiliaryDecisions?.find((d:any)=>d.reference==='M:51')?.opacity};
}
const outputRows:any[]=[];
const row=(name:string,result:any,s:any)=>outputRows.push({name,completion:result.sources?.sdssOptical?{kind:result.sources.sdssOptical.kind,hash:result.sources.sdssOptical.publicationHash,fields:(result.sources.sdssOptical.participatingFields??[]).map((f:any)=>({slot:f.slot,level:f.level,image:imageId(f.image),assetHash:f.asset.sha256}))}:null,groups:result.groups,w3:result.w3,failedImages:result.failedImages,opacity:result.opacity,localCalls:s.localCalls,events:result.events});
for(const [name,patch]of [['no-intent',{37:undefined}],['wrong-surface',{37:{surface:{},reference:'M:51',publicationHash:prepared.publicationHash}}],['wrong-hash',{37:{publicationHash:science.publicationHash}}],['wrong-object',{37:{reference:'M:82'}}]] as any){
 const w=world(),s=surface();if(patch[37]&&name!=='wrong-surface')patch[37]={surface:s.s,reference:'M:51',publicationHash:prepared.publicationHash,...patch[37]};
 const r=paint(w,s,patch);assert.equal(s.groups.length,0);assert.equal(r.sources.sdssOptical,null);assert(!s.artworks.some((a:any)=>a.image===w.fi||a.image===w.co));row(name,r,s);
}
for(const [name,change]of [['foreign-primary',(w:any)=>({...w.frame,asset:{...w.frame.asset}})],['foreign-parent',(w:any)=>({...w.frame,coarser:{...w.frame.coarser,asset:{...w.frame.coarser.asset}}})],['dual-family',(w:any)=>({...w.frame,sciencePublication:science})],['unknown-version',(w:any)=>({...w.frame,preparedPublication:{...prepared,imageVersion:'unknown'}})]] as any){
 const w=world(),s=surface();w.frame=change(w);assert.equal(identity.skyExactTargetOpticalIdentity(w.frame),null);assert.equal(identity.isSkyLegacyOpticalFrame(w.frame),false);const r=paint(w,s);assert.equal(s.groups.length,0);assert.equal(r.sources.sdssOptical,null);assert(!s.artworks.some((a:any)=>a.image===w.fi||a.image===w.co));row(name,r,s);
}
for(const kind of ['prepared','science'] as const){const w=world(kind,'MEDIUM','OVERVIEW'),s=surface({local:localPositive}),r=paint(w,s);
 assert.equal(s.groups.length,1);assert.equal(r.w3,false);assert.equal(r.sources.sdssOptical.kind,kind);assert.deepEqual(r.sources.sdssOptical.participatingFields.map((f:any)=>[f.slot,f.level]),[['fine','MEDIUM'],['coarse','OVERVIEW']]);
 for(const f of [s.groups[0].fine,s.groups[0].coarse]){if(kind==='prepared'){assert.equal(f.geometricCoverage,'geometric-source-area');assert.equal(f.scientificAvailability,'UNKNOWN');assert(!('sampleAvailability'in f));}else{assert.equal(f.sampleAvailability,'joint-area-alpha');assert(!('geometricCoverage'in f));}}
 assert(s.events.findIndex((e:any)=>e.kind==='finish')<s.events.findIndex((e:any)=>e.kind==='receipt'));assert(s.events.findIndex((e:any)=>e.kind==='local')<s.events.findIndex((e:any)=>e.kind==='disc')||s.discs.length===0);row(kind+'-single-group',r,s);
}
for(const slot of ['fine','coarse']){const w=world(),s=surface({q:EMPTY,failPrepared:slot,photo:{fine:'unknown',coarse:'unknown'},local:localPositive}),r=paint(w,s);
 assert.equal(r.w3,false);assert.equal(r.opacity,1);assert.equal(s.localCalls,0);assert.deepEqual(s.failures,[slot==='fine'?w.fi:w.co]);row('unprepared-'+slot+'-not-empty',r,s);}
const retiredFine=world();retiredFine.retireFine();const sf=surface({q:EMPTY,photo:{fine:'unknown',coarse:'unknown'},local:localPositive}),rf=paint(retiredFine,sf);
assert.equal(sf.groups[0].fine,null);assert(sf.groups[0].coarse);assert.equal(rf.w3,false);assert.equal(rf.opacity,1);row('retired-original-fine-not-neutral',rf,sf);
for(const [name,q]of [['unknown',UNKNOWN],['qualified-empty',EMPTY]] as any){const w=world(),s=surface({q,photo:{fine:'unknown',coarse:'unknown'}}),r=paint(w,s);
 assert.equal(r.w3,q===EMPTY);assert.equal(r.sources.sdssOptical.participatingFields.length,0);assert.equal(completion.liveSkyOpticalCompletion(r.sources.sdssOptical),null);assert.equal(s.localCalls,q===EMPTY?0:1);assert.equal(r.opacity,q===EMPTY?0:1);row(name,r,s);}
const black=world(),bs=surface({local:{...localPositive,fine:{selection:'has',photo:'unknown'}},photo:{fine:'unknown',coarse:'positive'}}),br=paint(black,bs);
assert.equal(br.opacity,1);assert.equal(br.w3,false);assert.deepEqual(br.sources.sdssOptical.participatingFields.map((f:any)=>f.slot),['coarse']);row('valid-black-fine-coarse-positive-no-global-aid',br,bs);
const late=world(),ls=surface({local:localPositive,late:late.retireFine}),lr=paint(late,ls,{34:{enabled:true}});
assert.equal(lr.opacity,0);assert.equal(lr.w3,false);assert.deepEqual(lr.sources.sdssOptical.participatingFields.map((f:any)=>f.slot),['coarse']);row('late-fine-retired-coarse-survives-frozen-aid',lr,ls);
const disappearance=world(),ds=surface({local:localPositive,photo:{fine:'unknown',coarse:'unknown'}}),dr=paint(disappearance,ds);
assert.equal(dr.opacity,0);assert.equal(dr.w3,false);assert.equal(dr.sources.sdssOptical.participatingFields.length,0);row('final-no-component-no-retroactive-spectrum',dr,ds);
const during=world(),us=surface({local:localPositive,duringLocal:during.retireCoarse}),ur=paint(during,us);
assert.equal(ur.opacity,1);assert.deepEqual(ur.sources.sdssOptical.participatingFields.map((f:any)=>f.slot),['fine']);row('retire-during-observation-unknown',ur,us);
for(const throwAt of ['group','disc','finish','receipt']){const w=world(),s=surface({throwAt});assert.throws(()=>paint(w,s),/ordinary-/);assert(!s.events.some((e:any)=>e.kind==='painted'));outputRows.push({name:'ordinary-'+throwAt+'-no-publication',events:s.events});}

// Actual completion owner: copy borrowed receipts, independent retirement and contradictory receipt rejection.
const cw=world(),cdraw={submitted:true,finePrepared:true,coarsePrepared:true},borrowed:any={completed:true,qualification:{...HAS},finePhoto:'positive',coarsePhoto:'positive'};
const cc=completion.completePreparedSkyOptical(cw.frame,cdraw,borrowed);assert(cc?.kind==='prepared');borrowed.finePhoto='unknown';borrowed.qualification.any='empty';assert.equal(cc.receipt.finePhoto,'positive');assert.equal(cc.receipt.qualification.any,'has');assert(Object.isFrozen(cc.participatingFields));
cw.retireFine();assert.deepEqual(completion.liveSkyOpticalCompletion(cc).participatingFields.map((f:any)=>f.slot),['coarse']);cw.retireCoarse();assert.equal(completion.liveSkyOpticalCompletion(cc),null);
for(const bad of [{completed:false,qualification:HAS,finePhoto:'positive',coarsePhoto:'positive'},{completed:true,qualification:EMPTY,finePhoto:'positive',coarsePhoto:'unknown'}])assert.equal(completion.completePreparedSkyOptical(world().frame,cdraw,bad),null);
assert.equal(completion.completePreparedSkyOptical(world('science').frame,cdraw,{completed:true,qualification:HAS,finePhoto:'positive',coarsePhoto:'positive'}),null);
const noParent=world('prepared','DETAIL',null);assert.equal(completion.completePreparedSkyOptical(noParent.frame,{...cdraw,coarsePrepared:false},{completed:true,qualification:HAS,finePhoto:'unknown',coarsePhoto:'positive'}),null);
const legacyFrame:any={reference:'M:51',publicationHash:'legacy-hash',image:{width:512,height:512},level:'DETAIL',fieldDegrees:.05,coarser:null};
assert.equal(identity.isSkyLegacyOpticalFrame(legacyFrame),true);assert.equal(completion.completeLegacySkyOptical(legacyFrame,legacyFrame.image)?.kind,'legacy');
const legacySurface=surface(),legacyRun=paint({frame:legacyFrame},legacySurface,{36:undefined,37:undefined});assert.equal(legacyRun.sources.sdssOptical.kind,'legacy');assert.equal(legacySurface.groups.length,0);assert(legacySurface.artworks.some(a=>a.image===legacyFrame.image&&a.composite==='optical-cutout'));row('legacy-default-independent-JPEG',legacyRun,legacySurface);

async function compileOwner(name:string,source:string,overrides:Record<string,any>={}){const code=ts.transpileModule(source,{fileName:name,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const parsed=ts.createSourceFile(name+'.js',code,ts.ScriptTarget.Latest,true),names=new Set<string>();
 const scan=(n:any)=>{if(ts.isCallExpression(n)&&n.expression.getText(parsed)==='require'&&ts.isStringLiteral(n.arguments[0]))names.add(n.arguments[0].text);ts.forEachChild(n,scan);};scan(parsed);
 const imports:any={...overrides};for(const n of names)if(!(n in imports)){imports[n]=n.startsWith('.')?await import(pathToFileURL(path.join(ROOT,dir,n)+'.ts').href):n==='@starward/miniapp-contracts'?contract:await import(n);}
 const exports:any={};vm.runInNewContext(code,{exports,Map,Set,WeakMap,Object,Array,Number,Error,require(n:string){assert(n in imports);return imports[n];}});return exports;
}
const commonSource=read(dir+'sky-target-optical-scene.ts').toString();
const parentMutant=commonSource.replace('allowInfrared = !!fine && draw.finePrepared && (!expected.coarse || (!!coarse && draw.coarsePrepared)) &&','allowInfrared =');assert.notEqual(parentMutant,commonSource);
const mutated=await compileOwner('sky-target-optical-scene.ts',parentMutant);
const mw=world();mw.retireFine();const mSurface=surface({q:EMPTY}),mPort={surface:mSurface.s,reference:'M:51',publicationHash:prepared.publicationHash};
const original=helper.submitSkySceneTargetOptical(mSurface.s,'prepared',mPort,mw.frame,observation,{basis,verticalFovDeg:1.8},()=>{},catalogEntry);assert.equal(original.allowInfrared,false);
const m2=surface({q:EMPTY});assert.equal(mutated.submitSkySceneTargetOptical(m2.s,'prepared',{...mPort,surface:m2.s},mw.frame,observation,{basis,verticalFovDeg:1.8},()=>{},catalogEntry).allowInfrared,true);
const kindMutant=commonSource.replace('identity.kind !== sourceKind','false');assert.notEqual(kindMutant,commonSource);const km=await compileOwner('sky-target-optical-scene.ts',kindMutant);
const kw=world(),ks=surface();const kport={surface:ks.s,reference:'M:51',publicationHash:prepared.publicationHash};assert.equal(helper.submitSkySceneTargetOptical(ks.s,'science',kport,kw.frame,observation,{basis,verticalFovDeg:1.8}),null);
assert(km.submitSkySceneTargetOptical(ks.s,'science',kport,kw.frame,observation,{basis,verticalFovDeg:1.8}));assert.equal(ks.groups[0].fine.sampleAvailability,'joint-area-alpha');
const completionSource=read(dir+'sky-sdss-optical-completion.ts').toString(),liveMutant=completionSource.replace('if (skyNativeImageIsCurrent(field.image)) fields.push','if (true) fields.push');assert.notEqual(liveMutant,completionSource);const cm=await compileOwner('sky-sdss-optical-completion.ts',liveMutant);
const rw=world();rw.retireFine();const rr={completed:true,qualification:HAS,finePhoto:'positive',coarsePhoto:'positive'};
assert.equal(completion.completePreparedSkyOptical(rw.frame,cdraw,rr).participatingFields.length,1);assert.equal(cm.completePreparedSkyOptical(rw.frame,cdraw,rr).participatingFields.length,2);
save('scene-controls.json',{rows:outputRows,completionCopyAndRetirement:true,mutants:{failedExpectedParentAllowsW3:{source:false,mutant:true},wrongSourceKind:{sourceRejects:true,mutantMislabelsPreparedAsScience:true},retiredParticipation:{sourceFields:1,mutantFields:2}},scope:'Actual complete Scene and exact owners with controlled surface preparation, model qualification/local/finished-component receipts, one controlled report; not GPU shader/readback or actual source validity.'});

// Actual page callback expressions and actual lifecycle. The task draw bridge
// injects the explicit Prepared port; ordinary page still omits both exact ports.
const pageText=read(dir+'spot-sky-page.tsx').toString(),page=ts.createSourceFile('spot-sky-page.tsx',pageText,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX),props=new Map<string,any>();let ordinaryArgs=-1,modal:any,presentationGate:any;
const findPage=(n:any)=>{if(ts.isPropertyAssignment(n)&&['paint','presented','invalidated','sameScene'].includes(n.name.getText(page)))props.set(n.name.getText(page),n.initializer);
 if(ts.isCallExpression(n)&&n.expression.getText(page)==='drawSkyScene')ordinaryArgs=n.arguments.length;
 if(ts.isVariableDeclaration(n)&&n.name.getText(page)==='presentedSdssOptical')presentationGate=n.initializer;
 if(ts.isJsxSpreadAttribute(n)&&n.expression.getText(page).includes('opticalPublicationHash'))modal=n.expression;ts.forEachChild(n,findPage);};findPage(page);
assert.equal(ordinaryArgs,36);assert(!pageText.includes('useSkyPreparedOptical('));assert(!pageText.includes('artworkContributions:'));assert(modal);
function pageHarness(w:any,s:any){let next=0,publications=0;const jobs=new Map<number,{callback:()=>void,delay:number}>(),holds:Array<()=>void>=[];
 const state:any={presented:null,camera:null,picking:null,failed:null};const generation={current:1},pending={current:null as any};
 const env:any={...completion,...aux,resolvedSkyBodyReferences:body.resolvedSkyBodyReferences,selectedCatalogObject:{reference:'M:51'},canvasGenerationRef:generation,pendingSkyPaintRef:pending,paintedSkyObjectsRef:{current:null},
  orientation:{latestPresentation:{current:null},presented:{current:null}},orientationController:{snapshot:()=>({})},manualBasisRef:{current:null},zoomRef:{current:1.8},viewportInsetsRef:{current:{}},reducedMotionRef:{current:false},
  resolveSkyCanvasView:()=>({verticalFovDeg:1.8,progress:1,center:{x:195,y:422},localView:basis,intent:'manual'}),browsingCamera:{update:()=>({view:basis,animating:false})},browsingTimerRef:{current:null},
  setTimeout(){throw Error('unexpected-animation-timer');},browsingDrawRef:{current:()=>{}},
  setPresentedSkyFrame(update:any){state.presented=typeof update==='function'?update(state.presented):update;if(state.presented)publications++;},setPresentedCamera(update:any){state.camera=typeof update==='function'?update(state.camera):update;},
  setCanvasSize(){},setCanvasError(){},canvasDrawRevisionRef:{current:0},publishAcceptanceSkySceneInspection(){},EMPTY_SKY_IMAGES:new Map(),
  setSolarLightUnavailable(){},setMoonDiscUnavailable(){},setPlanetDiscUnavailable(){},setSunDiscUnavailable(){},setGalacticBandUnavailable(){},setLandscapeUnavailable(){},
  deepSkyImageFailureRef:{current:null},setDeepSkyImageState(){},artworkFailureRef:{current:()=>{}},wideFieldFailureRef:{current:()=>{}},opticalFailureRef:{current:()=>{}},sdssOpticalFailureRef:{current:()=>{}},
  dispatchSkyHipsImageFailure(){},objectTracking:{snapshot:()=>({target:null})},
  drawSkyScene(...args:any[]){assert.equal(args.length,36);const done=args[9];args[9]=()=>holds.push(done);args[37]={surface:s.s,reference:w.frame.reference,publicationHash:w.frame.publicationHash};scene.drawSkyScene(...args);}};
 Object.defineProperty(env,'sdssOptical',{get(){throw Error('latest-loader-must-not-pin-accepted-source');}});
 const ctx=vm.createContext(env),get=(name:string)=>{assert(props.has(name));return vm.runInContext(ts.transpileModule('('+props.get(name).getText(page)+')',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,ctx);};
 const life=lifecycleOwner.createSkyCanvasLifecycle({measure(done:any){done({width:390,height:844});},createContext:()=>s.s,releaseContext(){generation.current++;},paint:get('paint'),sameScene:get('sameScene'),presented:get('presented'),invalidated:get('invalidated'),failed(error:any){state.failed=String(error);}},
  {schedule(callback:any,delay:number){jobs.set(++next,{callback,delay});return next;},cancel(handle:number){jobs.delete(handle);}});
 const frame:any={nativeImageGeneration:1,orientationRevision:0,data:report,frameAt:at,mode:'NIGHT',sceneReady:true,owner:'formal',inspection:{spotId:'controlled'},sdssOpticalImage:w.frame,deepSkyImage:null,coordinateGrids:{horizontal:false,equatorial:false}};
 life.ready();const step=()=>{const job=[...jobs].find(([,v])=>v.delay===0);assert(job);jobs.delete(job[0]);job[1].callback();};
 return{life,frame,state,holds,step,generation,env,ctx,get publications(){return publications;},get picking(){return env.paintedSkyObjectsRef.current;}};
}
const pw=world(),ps=surface({local:localPositive}),ph=pageHarness(pw,ps);ph.life.request(ph.frame);ph.step();assert.equal(ph.state.presented,null);assert.equal(ph.picking,null);assert.equal(ph.holds.length,1);
pw.retireFine();ph.holds[0]();assert.equal(ph.state.presented.sdssOptical.kind,'prepared');assert.equal(ph.state.presented.sdssOptical.publicationHash,prepared.publicationHash);assert.deepEqual(ph.state.presented.sdssOptical.participatingFields.map((f:any)=>f.slot),['coarse']);assert(ph.picking.objects.some((o:any)=>o.reference==='M:51'));assert.equal(ph.state.presented.deepSkyAuxiliaryDecisions[0].opacity,0);
ph.holds[0]();assert.equal(ph.publications,1);
ph.env.presentedSdssOptical=ph.state.presented.sdssOptical;const modalPin=vm.runInContext(ts.transpileModule('('+modal.getText(page)+')',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,ph.ctx);assert.equal(modalPin.opticalPublicationHash,prepared.publicationHash);
const lastPublished=ph.state.presented;ph.life.dispose();assert.strictEqual(ph.state.presented,lastPublished);
Object.assign(ph.env,{presentedSceneCurrent:true,nativeCanvasMounted:true,canvasSize:{width:390,height:844},presentedSkyFrame:lastPublished});
assert(presentationGate);assert.equal(vm.runInContext(ts.transpileModule('('+presentationGate.getText(page)+')',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,ph.ctx),null,'historical last-published state is not a live presented credit after generation release');
const sw=world(),ss=surface(),sh=pageHarness(sw,ss);sh.life.request(sh.frame);sh.step();const nextFrame={...sh.frame,sdssOpticalImage:{...sw.frame,publicationHash:'0'.repeat(64)}};sh.life.request(nextFrame);sh.holds[0]();assert.equal(sh.state.presented,null);assert.equal(sh.publications,0);sh.life.dispose();
const hw=world(),hs=surface(),hh=pageHarness(hw,hs);hh.life.request(hh.frame);hh.step();hh.life.hide();hh.holds[0]();assert.equal(hh.state.presented,null);assert.equal(hh.publications,0);assert.equal(hh.picking,null);hh.life.dispose();
save('page-controls.json',{stagedBeforeAccepted:true,acceptedRetiredFineSurvivingCoarse:true,actualModalPin:modalPin,opticalPublicationHash:prepared.publicationHash,lateLatestMetadataNotRead:true,repeatedDonePublications:1,changedHashCompletionRejected:true,hideCompletionRejected:true,disposedStateHistorical:true,disposedNativeGenerationPresentedGateNull:true,pickingIndependent:true,ordinaryDrawArguments:ordinaryArgs,ordinaryPreparedHook:false,auxiliaryDefaultConfigured:false,scope:'Actual page paint/accepted/sameScene/invalidated/presentation AST + actual lifecycle + actual Scene through explicitly injected task Prepared port. Controlled camera/lifecycle clock and surface; not ordinary page Prepared integration, full React/native runtime, visible credit or GPU pixels.'});
for(const fn of retired)fn();
const after=bind();save('inputs-after.json',after);assert.deepEqual(before,after);for(const r of protectedRows)assert.equal(sha(read(r.path)),r.sha256);
save('result.json',{status:'PASS_BOUNDED_PREPARED_SCENE_INDEPENDENT_REVIEW',node:process.version,typescript:ts.version,inputs:before.length,beforeAfterExact:true,author69ReadbackExact:true,outputs:['scene-controls.json','page-controls.json','controlled-input.json','dependency-scope.json'],mutantsDetected:3,sourceDecode:0,reprojection:0,network:0,GPU:0,native:0,ordinaryPreparedAdoption:false,scope:'Actual current Scene/identity/coverage/completion owners, actual page AST/lifecycle under controlled exact report/surface/model facts. No real GL shader/pixels, scientific validity, Prepared ordinary/default/visible credit/target acceptance.',sourceVersions:before.filter(r=>scoped.map(n=>dir+n+'.ts').includes(r.path)||r.path===dir+'spot-sky-page.tsx')});
console.log(JSON.stringify({output:OUT,sha256:sha(readFileSync(path.join(OUT,'result.json'))),inputs:before.length}));
