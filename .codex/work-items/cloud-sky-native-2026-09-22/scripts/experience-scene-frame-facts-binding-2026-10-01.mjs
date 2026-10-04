import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fingerprintBundle} from '../../../../tools/miniapp/release-bundle-artifact.mjs';

const task='.codex/work-items/cloud-sky-native-2026-09-22';
const output=task+'/evidence/experience-scene-frame-facts-binding-2026-10-01.json';
const frozen=task+'/evidence/experience-scene-frame-facts-events-frozen-2026-10-01.jsonl';
const watch=task+'/evidence/experience-scene-frame-facts-watch-frozen-2026-10-01.log';
for(const file of [output,frozen,watch])await assert.rejects(fs.access(file),{code:'ENOENT'});
const record=async file=>{const bytes=await fs.readFile(file);return{path:file.replaceAll('\\','/'),bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')};};
const previousPath=task+'/evidence/experience-cover-engine-binding-2026-10-01.json';
const previous=JSON.parse(await fs.readFile(previousPath,'utf8'));
for(const row of [...previous.sourceHashes,...previous.preservedOtherEdits])assert.equal((await record(row.path)).sha256,row.sha256,row.path);
const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const branch=execFileSync('git',['branch','--show-current'],{encoding:'utf8'}).trim();
assert.equal(head,'72e65cf309d700cb7d40c5b7afd53660fd39fa35');assert.equal(branch,'codex/remote-main-20260908');
const configs=JSON.parse(await fs.readFile(task+'/tmp/cover-engine-configs-2026-10-01.json','utf8'));
for(const row of configs)assert.equal((await record(row.path)).sha256,row.beforeSha256);
const oldCandidates=JSON.parse(await fs.readFile(task+'/evidence/experience-composition-bounded-trials-binding-2026-10-01.json','utf8')).preservedCandidates;
const preservedCandidates=[];
for(const row of oldCandidates){const current=await fingerprintBundle(path.resolve(row.path));assert.equal(current.sha256,row.sha256);preservedCandidates.push({path:row.path,sha256:current.sha256,fileCount:current.fileCount});}
const originalPage=await record(task+'/tmp/scene-frame-facts-before-spot-sky-page-2026-10-01.tsx');
assert.equal(originalPage.sha256,'c7e354a4b84ee84c986810c8682e7d51c18bd2608865b0eec110750823d8fea2');
const productionAndConsumerSources=await Promise.all([
 'apps/wechat-miniapp/src/features/sky/spot-sky-page.tsx',
 'apps/wechat-miniapp/src/features/sky/sky-scene-frame-facts.ts',
 'apps/wechat-miniapp/src/features/sky/sky-scene-frame-facts.test.ts',
 'apps/wechat-miniapp/src/features/sky/sky-located-page-marker.test.ts',
 'apps/wechat-miniapp/src/features/sky/sky-stellar-scene.ts',
 'apps/wechat-miniapp/src/features/sky/sky-observation-time.ts',
 'apps/wechat-miniapp/src/features/sky/sky-canvas-time.test.ts',
 'apps/wechat-miniapp/src/services/acceptance-diagnostics.ts',
 'apps/wechat-miniapp/src/services/acceptance-diagnostics.test.ts',
 'project_context/areas/main/screen-contracts/wechat-miniapp/spot-and-sky.md',
].map(record));
const raw=await fs.readFile(task+'/evidence/experience-current-native-events-2026-10-01.jsonl');
const prefix=await fs.readFile(previous.trace.path);assert(raw.subarray(0,prefix.length).equals(prefix));
assert(!/\?[^"\r\n]*(?:contextId=|spotId=)/.test(raw.toString()));
const events=raw.toString().trim().split(/\r?\n/).map(JSON.parse);
const stage=(name,predicate=()=>true)=>{const row=events.findLast(row=>row.stage===name&&predicate(row.value));assert(row,name);return row.value;};
const compileIndex=events.findLastIndex(row=>row.stage==='scene-frame-facts-compiler-requested');assert(compileIndex>=previous.trace.eventCount);
assert.equal(events.slice(compileIndex).filter(row=>row.stage==='tool-failure').length,0);
assert.equal(stage('scene-frame-facts-compiler-dispatched').success,true);
assert(events.findLastIndex(row=>row.stage==='scene-frame-facts-app-running')<events.findLastIndex(row=>row.stage==='scene-frame-facts-native-entry'));
const samples=stage('scene-frame-facts-playing-samples').samples;assert.equal(samples.length,12);
for(let index=0;index<samples.length;index++){
 const sample=samples[index];assert.equal(sample.route,'sky/detail/index');assert.equal(sample.scene,'READY');assert.equal(sample.starState,'AVAILABLE');
 assert.equal(sample.catalogVersion,'bsc5p-bright-stars.v3');assert(sample.label.includes(sample.frameAt));assert(sample.label.includes(sample.starCount+' 颗真实亮星目录对象'));
 if(index>0)assert(Date.parse(sample.frameAt)>=Date.parse(samples[index-1].frameAt));
}
assert(new Set(samples.map(sample=>sample.frameAt)).size>1);
const fixed=stage('scene-frame-facts-fixed-scene'),paused=stage('scene-frame-facts-paused-scene'),cancelled=stage('scene-frame-facts-cancelled-scene'),current=stage('scene-frame-facts-final-labelled-scene');
assert.equal(fixed.canvas.count,4051);assert.equal(paused.canvas.count,4050);assert.equal(paused.canvas.frameAt,'2026-09-30T13:50:42.069Z');
assert.equal(cancelled.canvas.count,4051);assert.equal(cancelled.canvas.frameAt,'2026-09-30T13:50:33.000Z');
assert.equal(current.canvas.labelFacts.presented,true);assert.equal(current.canvas.labelFacts.starCount,4051);assert.equal(current.canvas.labelFacts.verticalFovDeg,45);
assert.equal(current.canvas.labelFacts.frameAt,'2026-09-30T13:50:33.000Z');assert.equal(current.time.length,0);assert.equal(current.selection.length,0);assert.equal(current.modal.length,0);
const files=stage('scene-frame-facts-restored-files');assert.equal(files.count,10);assert.equal(files.encodedBytes,1789615);
const readback=stage('cold-image-durable-context-readback');assert(readback.revisionUnchanged&&readback.instantUnchanged&&readback.fingerprintUnchanged);assert.equal(readback.revision,1);assert.equal(readback.contextPuts,0);assert.equal(readback.moduleSha256,previous.current.readback.moduleSha256);
const ordinaryWatch=await fingerprintBundle(path.resolve(previous.ordinaryWatch.path));assert.notEqual(ordinaryWatch.sha256,previous.ordinaryWatch.sha256);
const beforeLog=await fs.readFile(task+'/evidence/experience-scene-frame-facts-before-2026-10-01.log','utf8');assert(beforeLog.includes("actual: '2026-10-01T00:00:01.000Z'"));assert(beforeLog.includes("expected: '2026-10-01T00:00:00.000Z'"));
const checks=await Promise.all(['before','after','affected','affected-final','compatibility-tests','typecheck-compatibility','context-check'].map(name=>record(task+'/evidence/experience-scene-frame-facts-'+name+'-2026-10-01.log')));
const captures=await Promise.all(['dispatched','fixed','playing','paused','restored'].map(name=>record(task+'/evidence/experience-current-native-scene-frame-facts-'+name+'-2026-10-01.png')));
await fs.writeFile(frozen,raw,{flag:'wx'});await fs.writeFile(watch,await fs.readFile(task+'/tmp/weapp-sky-watch-2026-10-01.log'),{flag:'wx'});
await fs.writeFile(output,JSON.stringify({at:new Date().toISOString(),scope:'Completed-frame time/catalog/count publication fix; exact-frame availability and legacy diagnostic compatibility; ordinary DevTools source-generation playback/pause/cancel. This does not certify visible WXML composition or physical devices.',head,branch,previous:await record(previousPath),trace:{...await record(frozen),eventCount:events.length,previous475EventPrefixUnchanged:true},preservedRenderingInputs:previous.sourceHashes,productionAndConsumerSources,originalPage,preservedOtherEdits:previous.preservedOtherEdits,preservedCandidates,byteExactConfigurations:configs.map(row=>({path:row.path,sha256:row.beforeSha256})),ordinaryWatch:{path:previous.ordinaryWatch.path,sha256:ordinaryWatch.sha256,fileCount:ordinaryWatch.fileCount,totalBytes:ordinaryWatch.totalBytes,files:ordinaryWatch.files,log:await record(watch),scope:'Same ordinary watch; includes the six preserved other-work edits, not a clean delivery candidate; raw bytes are not official package size'},checks,verifiedExecution:{affectedFinal:{exitCode:0,pass:59,fail:0},diagnosticCompatibility:{exitCode:0,pass:23,fail:0},miniTypecheck:{exitCode:0},contextStructure:{exitCode:0,scope:'Manifest/source declaration structure only'},whitespace:{exitCode:0},beforeFix:{exitCode:1,realCounterexample:'Next requested instant was published while the completed older playing frame was retained'}},native:{fixed,playingSamples:samples,paused,cancelled,current,files,readback,serializationBoundary:stage('scene-frame-facts-serialized-dataset-boundary'),earlierAfterCloseFields:stage('scene-frame-facts-restored-public-fields'),scope:'Public aria-label remains authoritative; raw serialized data-* markers are transient in Taro hydration. No private React/frame or raw GPU readback was used.'},installedSerializationSources:await Promise.all(['node_modules/@tarojs/runtime/dist/hydrate.js','node_modules/@tarojs/runtime/dist/dom/element.js'].map(record)),captures,scripts:await Promise.all(['experience-current-native-helpers-2026-10-01.ps1','experience-scene-frame-facts-native-2026-10-01.ps1','experience-current-native-reenter-2026-10-01.ps1'].map(name=>record(task+'/scripts/'+name))),limits:['Requested-clock extraction in the bounded sampler was empty; no native comparison with that clock is asserted','The real failing-before test uses a small valid resolved model and actual page consumers, not publication/ephemeris/device pixels','The initial affected suite had one AST harness ReferenceError; the responsibility and old assertions were migrated, not removed to conceal a failure','Native label/metadata publication and source binding do not prove every painted pixel or visible ordinary controls','DevTools Canvas+WXML composition remains FAILED; Android/iOS/new moon/full journey, physical decoded/GPU/OS/GC resources/performance/package/cost and final independent review remain unverified','No phone action, new candidate, commit/push/deploy, new agent, clock owner or requirement reduction; Goal active/unbudgeted/incomplete']},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({output,eventCount:events.length,preservedRenderingInputs:previous.sourceHashes.length,affectedSources:productionAndConsumerSources.length,preservedEdits:previous.preservedOtherEdits.length,samples:samples.length,pausedCount:paused.canvas.count,restoredCount:current.canvas.labelFacts.starCount,contextPuts:0,composition:'FAILED_DEVTOOLS'}));
