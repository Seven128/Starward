import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {build} from 'esbuild';
import {fingerprintBundle} from '../../../../tools/miniapp/release-bundle-artifact.mjs';
const task='.codex/work-items/cloud-sky-native-2026-09-22',stem=task+'/evidence/experience-wide-resource';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const record=async path=>{const bytes=await fs.readFile(path);return{path,bytes:bytes.length,sha256:sha(bytes)};};
const json=async file=>JSON.parse(await fs.readFile(file,'utf8'));
const previous=await json(task+'/evidence/experience-artwork-window-binding-2026-10-01.json');
const before=await json(stem+'-before-2026-10-02.json');
const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),branch=execFileSync('git',['branch','--show-current'],{encoding:'utf8'}).trim();
assert.equal(head,before.head);assert.equal(branch,before.branch);
const allowed=new Set(['sky-hips-tile-mesh.ts','sky-scene-render.ts','use-sky-wide-field-w3.ts','sky-hips-tile-mesh.test.ts','sky-native-image-owner.test.ts']
  .map(name=>'apps/wechat-miniapp/src/features/sky/'+name).concat(['project_context/architecture/runtime-and-domain.md',
    'project_context/areas/main/screen-contracts/wechat-miniapp/spot-and-sky.md']));
const sourceChanges=[],productionAndConsumerSources=[];
for(const row of before.productionAndConsumerSources){
  const current=await record(row.path);productionAndConsumerSources.push(current);
  if(current.sha256!==row.sha256){assert(allowed.has(row.path),row.path);sourceChanges.push({path:row.path,beforeSha256:row.sha256,afterSha256:current.sha256});}
}
assert.equal(sourceChanges.length,7);
for(const row of [...before.preservedOtherEdits,...before.byteExactConfigurations])assert.equal((await record(row.path)).sha256,row.sha256,row.path);
const preservedCandidates=[];
for(const row of before.preservedCandidates){const current=await fingerprintBundle(path.resolve(row.path));assert.equal(current.sha256,row.sha256);
  preservedCandidates.push({path:row.path,sha256:current.sha256,fileCount:current.fileCount});}
const frozenBeforeSources=[];
for(const row of sourceChanges.filter(row=>row.path.startsWith('apps/'))){
  const file='output/playwright/cloud-sky-wide-resource-composition-1002/before-'+path.basename(row.path),current=await record(file);
  assert.equal(current.sha256,row.beforeSha256);frozenBeforeSources.push(current);
}
const newSources=await Promise.all(['apps/wechat-miniapp/src/features/sky/use-sky-wide-field-w3.test.ts'].map(record));
const directory='output/playwright/cloud-sky-wide-resource-composition-1002';
const software=[],softwareRecords=[];
for(const suffix of ['', '-after','-native-match','-native-match-after']){
  const folder=directory+suffix,result=await json(folder+'/result.json');
  assert.equal((await record(folder+'/production.js')).sha256,result.productionBundleSha256);
  assert.equal((await record(result.report.path)).sha256,result.report.sha256);
  for(const input of result.inputs)if(input.path)assert.equal((await record(input.path)).sha256,input.sha256,input.path);
  for(const row of result.rows){
    assert.equal((await record(folder+'/'+row.name+'.rgba')).sha256,row.rgbaSha256);
    assert.equal(row.glError,0);assert.deepEqual(row.failures,[]);
    assert.equal(row.retiredLogicalBytes,0);assert.equal(row.retiredTextures,0);assert.equal(row.retiredFramebuffers,0);
    if(suffix==='-after')assert.equal(row.pixelComparison.changedPixels,0);
    softwareRecords.push(await record(folder+'/'+row.name+'.png'),await record(folder+'/'+row.name+'.rgba'));
  }
  if(suffix==='-after'||suffix==='-native-match-after')for(const row of result.sourceHashes)assert.equal((await record(row.path)).sha256,row.sha256,row.path);
  software.push({suffix,result:await record(folder+'/result.json'),bundle:await record(folder+'/production.js'),rows:result.rows.length});
}
const script=await fs.readFile(task+'/scripts/experience-wide-resource-composition-2026-10-02.mts','utf8');
const entry=script.match(/contents:\s*\n\s*"([^"\r\n]*)"/);assert(entry);
const compiled=await build({stdin:{resolveDir:process.cwd(),contents:entry[1]},bundle:true,write:false,metafile:true,platform:'browser',format:'iife',
  globalName:'bodyComposition',target:'es2022',tsconfig:path.resolve('apps/wechat-miniapp/tsconfig.json')});
assert.equal(sha(compiled.outputFiles[0].text),(await json(directory+'-after/result.json')).productionBundleSha256);
const sourceInputs=await Promise.all(Object.keys(compiled.metafile.inputs).filter(file=>file!=='<stdin>').map(record));
const raw=await fs.readFile(task+'/evidence/experience-current-native-events-2026-10-01.jsonl'),prefix=await fs.readFile(previous.trace.path);
assert(raw.subarray(0,prefix.length).equals(prefix));
const events=raw.toString().trim().split(/\r?\n/).map(JSON.parse);assert.equal(events.length,1416);
const event=stage=>{const value=events.findLast(row=>row.stage===stage)?.value;assert(value,stage);return value;};
const index=stage=>events.findLastIndex(row=>row.stage===stage);
assert(index('wide-resource-compiler-dispatched')<index('wide-resource-dispatched'));
assert(index('wide-resource-dispatched')<index('wide-resource-application-seen'));
assert(index('wide-resource-application-seen')<index('wide-resource-entry-reentered-owned-context'));
assert.equal(events.slice(1325).filter(row=>row.stage==='tool-failure').length,1);
assert.equal(event('wide-resource-after-modal-close').modal.length,0);
assert.equal(event('wide-resource-exit-scope-correction').route,'sky/detail/index');
assert.equal(event('wide-resource-public-map-exit-files').route,'pages/map/index');
assert.equal(event('wide-resource-public-map-exit-files').count,0);assert.equal(event('wide-resource-source-hidden-files').count,0);
const readback=event('cold-image-durable-context-readback');
assert.equal(readback.revision,1);assert.equal(readback.contextPuts,0);assert(readback.instantUnchanged&&readback.revisionUnchanged&&readback.fingerprintUnchanged);
assert.equal(readback.moduleSha256,'175d2b11a711ab83a3b0def4018de7afec6dfcaed70ab65f208722874057a9f7');
const finalView=event('wide-resource-final-view').view;assert.deepEqual(finalView,event('artwork-window-final-view').view);
assert.deepEqual(event('wide-resource-before-actual208-view').view,event('wide-resource-current208-view').view);
const publication=await json('workers/miniapp-api/assets/deep-sky/wide-field-w3/manifest.json');
const w3Inputs=await Promise.all(publication.tiles.map(async tile=>{
  const file='workers/miniapp-api/assets/deep-sky/wide-field-w3/'+tile.file,bytes=await fs.readFile(file);assert.equal(sha(bytes),tile.sha256);
  return{pixel:tile.pixel,path:file,encodedBytes:bytes.length,sha256:sha(bytes),sha1:createHash('sha1').update(bytes).digest('hex')};
}));
const w3Files=stage=>event(stage+'-encoded-digests').files.filter(row=>w3Inputs.some(input=>input.sha1===row.sha1));
const preFiles=w3Files('wide-resource-before-files'),postFiles=w3Files('wide-resource-current208-files');
assert.equal(preFiles.length,12);assert.equal(postFiles.length,8);
const cold=w3Files('wide-resource-cold208-files'),narrow=w3Files('wide-resource-cold85-files'),returned=w3Files('wide-resource-cold-return208-files');
assert.equal(cold.length,8);assert.deepEqual(cold,narrow);assert.deepEqual(cold,returned);
const sourceReturn=w3Files('wide-resource-source-return-files');assert.equal(sourceReturn.length,8);
assert(sourceReturn.every(row=>returned.some(old=>old.sha1===row.sha1&&old.requestSequence!==row.requestSequence)));
const finalFiles=event('wide-resource-final-files-encoded-digests');assert.equal(finalFiles.files.length,9);
assert.equal(finalFiles.files.reduce((sum,row)=>sum+row.encodedBytes,0),934831);
const finalUi=event('wide-resource-final-state');assert.equal(finalUi.canvas.scene,'READY');assert.equal(finalUi.canvas.count,4051);
assert.equal(finalUi.selection.length,0);assert.equal(finalUi.modal.length,0);
const captures=[];
for(const row of events.slice(1325).filter(row=>row.value?.path?.endsWith('.png'))){
  const current=await record(path.relative(process.cwd(),row.value.path).replaceAll('\\','/'));
  assert.equal(current.sha256,row.value.sha256);captures.push({...current,stage:row.stage,viewed:true});
}
assert.equal(captures.length,11);
const pixels=await json(stem+'-native-pixels-2026-10-02.json');assert.deepEqual(pixels.rows.map(row=>[row.region.changedPixels,row.region.maxDelta]),[[26510,50],[801,15],[10,1]]);
const checks=await Promise.all(['regression-before','regression-before-final','check','check-final','types','types-final','typecheck-project','context-check',
  'software-after','native-software-before','native-software-after'].map(name=>record(stem+'-'+name+'-2026-10-02.log')));
assert((await fs.readFile(stem+'-regression-before-final-2026-10-02.log','utf8')).includes('actual: [ 0, 1, 2, 3, 5 ]'));
assert((await fs.readFile(stem+'-check-final-2026-10-02.log','utf8')).includes('fail 0'));
assert.equal((await fs.readFile(stem+'-typecheck-project-2026-10-02.log')).length,0);
const watch=await fingerprintBundle(path.resolve(previous.ordinaryWatch.path));assert.equal(watch.fileCount,300);
const watchLog=await record(task+'/tmp/weapp-sky-watch-2026-10-01.log');assert((await fs.readFile(watchLog.path,'utf8')).includes('Watching... [2026/10/2 00:25:22]'));
const scripts=await Promise.all(['prepare','composition','cpu','source','pixels','docs','binding'].map(name=>record(task+'/scripts/experience-wide-resource-'+name+'-2026-10-02.'+(name==='source'?'ps1':['composition','cpu'].includes(name)?'mts':'mjs'))));
const sourceChangesRecords=productionAndConsumerSources.filter(row=>allowed.has(row.path));
const binding={at:new Date().toISOString(),head,branch,sourceChanges,productionAndConsumerSources,newSources,frozenBeforeSources,
  before:await record(stem+'-before-2026-10-02.json'),preservedOtherEdits:before.preservedOtherEdits,byteExactConfigurations:before.byteExactConfigurations,preservedCandidates,
  trace:{...await record(task+'/evidence/experience-current-native-events-2026-10-01.jsonl'),eventCount:1416,previousPrefixPreserved:true},
  sourceChangesRecords,software:{runs:software,sourceInputs,outputs:softwareRecords,cpu:await record(stem+'-cpu-2026-10-02.json')},
  captures,checks,scripts,pixels:await record(stem+'-native-pixels-2026-10-02.json'),w3Inputs,
  native:{views:{before208:event('wide-resource-before-actual208-view').view,current208:event('wide-resource-current208-view').view,
    coldReturn:event('wide-resource-cold-return208-view').view,sourceReturn:event('wide-resource-source-return-view').view,final:finalView},
    beforeW3:preFiles,currentW3:postFiles,avoidedW3EncodedBytes:preFiles.reduce((n,row)=>n+row.encodedBytes,0)-postFiles.reduce((n,row)=>n+row.encodedBytes,0),
    coldFilesReused:true,sourceReturn,finalFiles:finalFiles.files,canonical:readback,exitFiles:0,sourceHiddenFiles:0,ordinaryComposition:'FAILED_DEVTOOLS',independentReview:'GAP'},
  ordinaryWatch:{path:previous.ordinaryWatch.path,sha256:watch.sha256,fileCount:watch.fileCount,totalBytes:watch.totalBytes,files:watch.files,log:watchLog,
    scope:'Existing ordinary watch includes six unrelated edits; not a clean/final/phone candidate'},
  limits:['W3 demand reduction is not a total native-memory claim. Integrated208 landscape refinement increases model14→18MiB and GPU10→16MiB; both warm0, original pixel differences retained.',
    'Software25 exact pixels validate preservation, not full image or environment quality. Actual M51 coarse edges against daytime blue sky remain a quality item.',
    'Encoded files/Node mesh cost/logical GPU bookkeeping do not certify native/driver/OS/GC/FPS, network concurrency, official package or actual delivery cost.',
    'Original native ROI differences and old875/1254 failures remain unverified/failed under their own conditions. Source Canvas comparison has different Vega selection/modal state.',
    'SDK/public actions and visible Source page do not certify ordinary Sky WXML, physical gestures/full calibration, target full journey, Android/iOS or new Moon acceptance.',
    'No source redownload/reselection, phone operation, new watch/window/startup investigation, candidates/Git commit/push/deploy. Goal active,unbudgeted,incomplete.']};
await fs.writeFile(stem+'-binding-2026-10-02.json',JSON.stringify(binding,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({eventCount:1416,guardedSources:productionAndConsumerSources.length,sourceChanges:sourceChanges.length,captures:captures.length,
  preservedOtherEdits:6,avoidedW3EncodedBytes:binding.native.avoidedW3EncodedBytes,ordinaryWatchSha256:watch.sha256,goal:'active,unbudgeted,incomplete'}));
