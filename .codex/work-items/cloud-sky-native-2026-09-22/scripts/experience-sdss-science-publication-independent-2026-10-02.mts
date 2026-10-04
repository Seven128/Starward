/** Independent admission/hash/CLI and frozen-output review; no network or GPU. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import ts from 'typescript';
import {assertSdssScienceOpticalManifest,assertSdssScienceOpticalPublication,
 sdssScienceOpticalPublicationHash} from '../../../../packages/miniapp-contracts/src/sdss-science-optical-publication.ts';
import {SDSS_OPTICAL_PUBLICATIONS,SDSS_OPTICAL_LEVELS,assertSdssOpticalPublication,
 sdssOpticalPublicationHash} from '../../../../packages/miniapp-contracts/src/sdss-optical-publication.ts';

const ROOT=fileURLToPath(new URL('../../../../',import.meta.url));
const [source,out]=process.argv.slice(2);
assert.match(source??'',/^output\/sdss-science-optical-writer-1002-r\d+\/publication$/u);
assert.match(out??'',/^output\/sdss-science-publication-independent-1002-r\d+$/u);
assert(!fs.existsSync(path.join(ROOT,out!)));fs.mkdirSync(path.join(ROOT,out!));
const read=(p:string)=>fs.readFileSync(path.resolve(ROOT,p));
const hash=(b:Uint8Array|string)=>createHash('sha256').update(b).digest('hex');
const binding=(p:string)=>{const b=read(p);return{path:p,bytes:b.length,sha256:hash(b)};};
const admitted=new Map<string,ReturnType<typeof binding>>();
const admit=(p:string,e?:{bytes?:number;sha256?:string})=>{const b=binding(p);if(e?.bytes!==undefined)assert.equal(b.bytes,e.bytes,p);if(e?.sha256)assert.equal(b.sha256,e.sha256,p);const previous=admitted.get(p);if(previous)assert.deepEqual(b,previous);admitted.set(p,b);return b;};
const json=(p:string)=>JSON.parse(read(p).toString('utf8'));
const save=(name:string,value:unknown)=>fs.writeFileSync(path.join(ROOT,out!,name),JSON.stringify(value,null,2)+'\n',{flag:'wx'});
// Independent canonical serialization and Node crypto; no owner hash call in this oracle.
const canonical=(value:any):string=>Array.isArray(value)?'['+value.map(canonical).join(',')+']':value!==null&&typeof value==='object'?'{'+Object.keys(value).sort().map(key=>JSON.stringify(key)+':'+canonical(value[key])).join(',')+'}':JSON.stringify(value);
const publicationBody=(value:any)=>{const body=structuredClone(value);delete body.publicationHash;for(const row of Object.values(body.levels) as any[])delete row.downloadUrl;return body;};
const independentHash=(value:any)=>hash(canonical(publicationBody(value)));
fs.copyFileSync(fileURLToPath(import.meta.url),path.join(ROOT,out!,'executed-script.mts.txt'),fs.constants.COPYFILE_EXCL);
try{
 const ownerPath='packages/miniapp-contracts/src/sdss-science-optical-publication.ts';
 const owner=admit(ownerPath),cli=admit('data-pipelines/deep-sky/pack_sdss_science_publication.mts');
 admit('packages/miniapp-contracts/src/sdss-optical-publication.ts');admit('tools/run-node.cjs');
 const generation=source!.slice(0,-'/publication'.length);admit(generation+'/result.json',{sha256:'40f03ef51ed404890f8fe1207bf144a55491b55faea9984279ad8aba6af64c0e',bytes:6728});
 const wrapper=json(generation+'/result.json'),beforeInventory=json(generation+'/binding-before.json'),afterInventory=json(generation+'/binding-after.json');
 admit(generation+'/binding-before.json');admit(generation+'/binding-after.json');assert.deepEqual(beforeInventory,afterInventory);
 assert.equal(beforeInventory.cached.length,91);assert.equal(beforeInventory.oldAssets.length,201);assert.equal(beforeInventory.preserved.length,6);
 for(const b of [...beforeInventory.cached,...beforeInventory.oldAssets,...beforeInventory.preserved])admit(b.path,b);
 for(const key of ['writer','tests','script','tsContract','nodeCli','manifest','writerReceipt'])admit(wrapper[key].path,wrapper[key]);
 const receipt=json(source!+'/writer-receipt.json');admit(source!+'/writer-receipt.json');
 assert.equal(receipt.status,'OFFLINE_OPT_IN_CANDIDATE_PACKAGED');assert.equal(receipt.qualityAdopted,false);assert.equal(receipt.runtimeRegistered,false);
 assert.deepEqual(receipt.inputsBefore,receipt.inputsAfter);assert.deepEqual(receipt.implementationBefore,receipt.implementationAfter);
 for(const b of [...receipt.inputsBefore,...receipt.implementationBefore,...receipt.outputFiles])admit(b.path,b);
 const manifest=json(source!+'/manifest.json'),body=json(source!+'/publication-input.json');
 admit(source!+'/manifest.json');admit(source!+'/publication-input.json');
 assert.deepEqual(publicationBody(manifest),body);assert.equal(manifest.publicationHash,receipt.publicationHash);
 const own=independentHash(body);assert.equal(own,manifest.publicationHash);assert.equal(sdssScienceOpticalPublicationHash(body),own);
 assertSdssScienceOpticalManifest(manifest,'M:51',own);
 const urlDescriptor=Object.getOwnPropertyDescriptor(globalThis,'URL')!;Reflect.deleteProperty(globalThis,'URL');
 try{assertSdssScienceOpticalManifest(manifest,'M:51',own);}finally{Object.defineProperty(globalThis,'URL',urlDescriptor);}
 const command=[path.join(ROOT,'tools/run-node.cjs'),'--import','tsx',path.join(ROOT,'data-pipelines/deep-sky/pack_sdss_science_publication.mts')];
 const actual=spawnSync(process.execPath,command,{cwd:ROOT,input:read(source!+'/publication-input.json'),encoding:'utf8',windowsHide:true,timeout:60000});
 fs.writeFileSync(path.join(ROOT,out!,'actual-cli-stdout.txt'),actual.stdout,{flag:'wx'});fs.writeFileSync(path.join(ROOT,out!,'actual-cli-stderr.txt'),actual.stderr,{flag:'wx'});
 assert.equal(actual.status,0,actual.stderr);assert.deepEqual(JSON.parse(actual.stdout),manifest);assert.equal(actual.stdout,read(source!+'/manifest.json').toString('utf8'));
 const controls:any[]=[];
 const rejected=(name:string,change:(p:any)=>void)=>{const p=structuredClone(body);change(p);const pin=independentHash(p);let error='';try{assertSdssScienceOpticalPublication(p,'M:51',pin);}catch(cause){error=String(cause);}assert(error,name+' unexpectedly admitted with fresh hash');controls.push({name,freshHash:pin,rejected:true,error});return p;};
 for(const [name,change] of [
  ['negative stretch',(p:any)=>p.master.transfer.recipe.stretch=-1],
  ['nonpositive requested stretch',(p:any)=>p.master.transfer.recipe.requestedParameters.stretch=0],
  ['bad Q type',(p:any)=>p.master.transfer.recipe.Q='bad'],
  ['out-of-owner-range Q',(p:any)=>{p.master.transfer.recipe.Q=1e11;p.master.transfer.recipe.requestedParameters.Q=1e11;}],
  ['missing library version',(p:any)=>delete p.master.transfer.recipe.version],
  ['incoherent transfer count',(p:any)=>p.master.transfer.recipe.availableSciencePixels--],
  ['per-crop transfer scope',(p:any)=>p.master.transfer.recipe.scope='individual DETAIL crop'],
  ['brightness alpha',(p:any)=>p.levels.DETAIL.sampleAvailability='brightness-alpha'],
  ['unknown science validity upgraded',(p:any)=>p.master.scientificValidity='PASSED'],
  ['crop wrong master',(p:any)=>p.levels.DETAIL.masterRgbSha256='2'.repeat(64)],
  ['arithmetic field half',(p:any)=>p.levels.MEDIUM.fieldDegrees=p.master.fieldDegrees/2],
  ['source missing credit',(p:any)=>delete p.source.credit],
  ['credentialed source URL',(p:any)=>p.source.landingUrl='https://user:password@example.invalid/x'],
  ['incomplete source band set',(p:any)=>p.master.sourceFrames.pop()],
  ['duplicate raw source identity',(p:any)=>p.master.sourceFrames[1]=structuredClone(p.master.sourceFrames[0])],
  ['noncanonical source route',(p:any)=>p.master.sourceFrames[0].sourceUrl+='?other=1'],
  ['missing full admission receipt',(p:any)=>delete p.master.sourceFrames[0].admissionReceipt],
  ['changed central pixel origin',(p:any)=>p.levels.DETAIL.crpixFitsOneBased=256],
  ['shifted crop',(p:any)=>p.levels.DETAIL.masterCrop.boundsXYExclusive[0]++],
  ['unsafe filename',(p:any)=>p.levels.DETAIL.file='../M-51-detail.png'],
 ] as Array<[string,(p:any)=>void]>)rejected(name,change);
 const redirected=structuredClone(manifest);redirected.levels.DETAIL.downloadUrl='/other.png';assert.equal(independentHash(redirected),own);assert.throws(()=>assertSdssScienceOpticalManifest(redirected,'M:51',own));
 assert.throws(()=>assertSdssScienceOpticalManifest(manifest,'M:51','3'.repeat(64)));
 const reordered=structuredClone(body);reordered.levels={DETAIL:body.levels.DETAIL,MEDIUM:body.levels.MEDIUM,OVERVIEW:body.levels.OVERVIEW};assert.equal(independentHash(reordered),own);assert.equal(sdssScienceOpticalPublicationHash(reordered),own);
 // Bounded task-only mutation of today's exact source, not an invented old draft.
 const original=read(ownerPath).toString('utf8'),needle='!transferRecipe(master.transfer.recipe, master.jointAvailability.availablePixels, master.pixels ** 2)';
 assert.equal(original.split(needle).length,2);const mutated=original.replace(needle,'false /* task-only bypass of the recipe admission guard */');
 fs.writeFileSync(path.join(ROOT,out!,'mutated-recipe-guard.ts.txt'),mutated,{flag:'wx'});
 const compiled=ts.transpileModule(mutated,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const exports:any={};const load=vm.runInThisContext('(function(require,exports){\n'+compiled+'\n})',{filename:'independent-task-recipe-guard.cjs'});
 load(createRequire(path.join(ROOT,ownerPath)),exports);
 const invalidRecipe=structuredClone(body);invalidRecipe.master.transfer.recipe.stretch=-1;
 assert.throws(()=>assertSdssScienceOpticalPublication(invalidRecipe,'M:51',independentHash(invalidRecipe)));
 exports.assertSdssScienceOpticalPublication(invalidRecipe,'M:51',independentHash(invalidRecipe));
 const old:any[]=[];
 for(const [reference,published] of Object.entries(SDSS_OPTICAL_PUBLICATIONS)){
  const directory='workers/miniapp-api/assets/deep-sky/sdss-m'+reference.slice(2),p=json(directory+'/manifest.json');admit(directory+'/manifest.json');
  assertSdssOpticalPublication(p,reference as any);assert.equal(sdssOpticalPublicationHash(p),published.publicationHash);
  assert.throws(()=>assertSdssScienceOpticalPublication(p,reference));
  const files=SDSS_OPTICAL_LEVELS.map(level=>admit(directory+'/'+p.levels[level].file,p.levels[level]));old.push({reference,publicationHash:published.publicationHash,files});
 }
 assert.throws(()=>assertSdssOpticalPublication(body,'M:51'));
 // Reuse the prior independent immutable inventory solely as a preservation baseline.
 const prior='output/continuous-camera-independent-1002-r2/binding.json';admit(prior,{sha256:'54e10a0112f51ca291cedcab6baf12ff9b5d6cd1e6b56a81445a2312de5b9d7a'});
 const preserved=json(prior).inputsBefore.filter((b:any)=>b.path.startsWith('workers/miniapp-api/assets/'));
 for(const b of preserved)admit(b.path,b);
 const before=[...admitted.values()],after=before.map(b=>binding(b.path));assert.deepEqual(after,before);
 const result={status:'INDEPENDENT_SCIENCE_OPTICAL_ADMISSION_READBACK_PASS',source,manifest:binding(source!+'/manifest.json'),publicationHash:own,owner,cli,
  independentCanonicalNodeCryptoExact:true,actualCliStdoutByteExact:true,noBrowserUrlGlobalRequired:true,freshHashInvalidControls:controls,
  boundedRecipeBypassMutation:{source:owner,mutation:binding(out!+'/mutated-recipe-guard.ts.txt'),invalidNegativeStretchAcceptedOnlyByMutant:true,historicalDraft:false},
  oldV1:old,preservedPriorAssetFiles:preserved.length,preservedWriterInventory:{cached:91,oldAssets:201,settingsOutbox:6},
  limits:['Offline structural/hash/byte identity and real CLI, not an independent scientific calibration or proof that hash-only transport has read the science files. The offline writer and independent array/PNG readback own that check.',
   'The current-owner mutation is a controlled skipped guard, not a saved historical draft. New opt-in candidate is not runtime registration, source/color/PSF/absolute-astrometry quality adoption or target WEAPP acceptance.']};
 save('result.json',result);save('binding.json',{inputsBefore:before,inputsAfter:after,unchanged:true});console.log(JSON.stringify({result:binding(out!+'/result.json'),binding:binding(out!+'/binding.json'),publicationHash:own,controls:controls.length}));
}catch(cause){save('failed.json',{status:'FAILED_INDEPENDENT_SCIENCE_PUBLICATION_REVIEW',message:String(cause),inputs:[...admitted.values()]});throw cause;}
