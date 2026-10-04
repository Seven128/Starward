import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {PNG} from 'pngjs';
import {fingerprintBundle} from '../../../../tools/miniapp/release-bundle-artifact.mjs';

const task='.codex/work-items/cloud-sky-native-2026-09-22';
const output=task+'/evidence/experience-cold-image-residency-binding-2026-10-01.json';
const frozen=task+'/evidence/experience-cold-image-native-events-frozen-2026-10-01.jsonl';
const watch=task+'/evidence/experience-cold-image-watch-frozen-2026-10-01.log';
for(const file of [output,frozen,watch])await assert.rejects(fs.access(file),{code:'ENOENT'});
const sha=(bytes,algorithm='sha256')=>createHash(algorithm).update(bytes).digest('hex');
const record=async file=>{const bytes=await fs.readFile(file);return {path:file.replaceAll('\\','/'),bytes:bytes.length,sha256:sha(bytes)};};
const read=async file=>JSON.parse(await fs.readFile(file,'utf8'));
const previousPath=task+'/evidence/experience-scientific-scale-native-binding-2026-10-01.json';
const previous=await read(previousPath);
const replayPath=task+'/evidence/experience-cold-image-replay-2026-10-01.json';
const replay=await read(replayPath);
const changedPaths=new Set(replay.sourceHashes.map(row=>row.path));
assert.equal(changedPaths.size,4);
const sourceHashes=[];
let preservedPreviousSourceCount=0;
for(const old of previous.sourceHashes){
  const current=await record(old.path);
  if(!changedPaths.has(old.path)){assert.equal(current.sha256,old.sha256,old.path);preservedPreviousSourceCount++;}
  sourceHashes.push(current);
}
for(const expected of replay.sourceHashes){
  const current=await record(expected.path);assert.equal(current.sha256,expected.sha256,expected.path);
  if(!sourceHashes.some(row=>row.path===current.path))sourceHashes.push(current);
}
const preservedOtherEdits=await read(task+'/tmp/resume-preserved-hashes-2026-10-01.json');
for(const row of preservedOtherEdits)assert.equal((await record(row.path)).sha256,row.sha256);
const oldCandidates=(await read(task+'/evidence/experience-composition-bounded-trials-binding-2026-10-01.json')).preservedCandidates;
const preservedCandidates=[];
for(const expected of oldCandidates){
  const current=await fingerprintBundle(path.resolve(expected.path));
  assert.equal(current.sha256,expected.sha256,expected.path);assert.equal(current.fileCount,expected.fileCount);
  preservedCandidates.push({path:expected.path,sha256:current.sha256,fileCount:current.fileCount,totalBytes:current.totalBytes,scope:'Frozen historical candidate unchanged; not opened or sent to a phone'});
}
const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const branch=execFileSync('git',['branch','--show-current'],{encoding:'utf8'}).trim();
assert.equal(head,'72e65cf309d700cb7d40c5b7afd53660fd39fa35');assert.equal(branch,'codex/remote-main-20260908');

const raw=await fs.readFile(task+'/evidence/experience-current-native-events-2026-10-01.jsonl');
const prefix=await fs.readFile(previous.trace.path);assert(raw.subarray(0,prefix.length).equals(prefix));
assert(!/\?[^"\r\n]*(?:contextId=|spotId=)/.test(raw.toString()));
const events=raw.toString().trim().split(/\r?\n/).map(JSON.parse);
const compileIndex=events.findLastIndex(row=>row.stage==='cold-image-compiler-dispatched');assert(compileIndex>=277);
const currentEvents=events.slice(compileIndex);
const stage=name=>{const row=currentEvents.findLast(row=>row.stage===name);assert(row,name);return row.value;};
assert.equal(stage('cold-image-compiler-dispatched').success,true);
assert.equal(stage('cold-image-compiler-runtime-read').action,'currentPage');
const sceneNames=['cold-image-native-before-scene','cold-image-native-local-scene','cold-image-native-return-scene','cold-image-native-cold-exit-scene','cold-image-final-restored-scene'];
const scenes=sceneNames.map(name=>({stage:name,value:stage(name)}));
for(const {value} of scenes){assert.equal(value.route,'sky/detail/index');assert.equal(value.canvas.scene,'READY');assert.equal(value.canvas.count,4051);assert.equal(Date.parse(value.canvas.frameAt),Date.parse('2026-09-30T13:50:33Z'));assert.equal(value.selection.length,0);assert.equal(value.modal.length,0);assert.equal(value.time.length,0);}
for(const index of [0,2,4])assert(scenes[index].value.canvas.label.includes('45.0'));
for(const index of [1,3])assert(scenes[index].value.canvas.label.includes('4.8'));
const readback=stage('cold-image-durable-context-readback');
assert(readback.revisionUnchanged&&readback.instantUnchanged&&readback.fingerprintUnchanged);
assert.equal(readback.revision,1);assert.equal(readback.contextPuts,0);
assert.equal(readback.moduleSha256,'175d2b11a711ab83a3b0def4018de7afec6dfcaed70ab65f208722874057a9f7');
const retired=stage('cold-image-native-public-exit-files'),restored=stage('cold-image-final-restored-files');
assert.equal(retired.count,0);assert.equal(retired.encodedBytes,0);assert.equal(restored.count,10);assert.equal(restored.encodedBytes,1789615);

const sourceBindingPath=task+'/evidence/experience-resource-source-binding-2026-10-01.json';
const sourceBinding=await read(sourceBindingPath);
for(const publication of sourceBinding.publicationReads)assert.equal((await record(publication.path)).sha256,publication.sha256);
const assets=sourceBinding.native[0].files.slice();
const landscapePath='workers/miniapp-api/assets/landscape/manifest.json';
const detail=(await read(landscapePath)).resources.find(row=>row.id==='detail').image;
const detailPath='workers/miniapp-api/assets/landscape/'+detail.file;
const detailBytes=await fs.readFile(detailPath);
assert.equal(sha(detailBytes),detail.sha256);assert.equal(detailBytes.length,detail.bytes);
assets.push({identity:'landscape:detail',path:detailPath,width:detail.width,height:detail.height,rgbaBytes:detail.width*detail.height*4,encodedBytes:detail.bytes,sha256:detail.sha256,sha1:sha(detailBytes,'sha1')});
for(const asset of assets)assert.equal((await record(asset.path)).sha256,asset.sha256);
const inventories=['baseline','local','return'].map(name=>{
  const native=stage('resource-source-cold-image-'+name+'-encoded-digests');assert.equal(native.failed,0);
  const files=native.files.map(row=>{const matches=assets.filter(asset=>asset.sha1===row.sha1&&asset.encodedBytes===row.encodedBytes);assert.equal(matches.length,1);assert(Number.isInteger(row.requestSequence));return {...matches[0],requestSequence:row.requestSequence};});
  return {stage:name,count:files.length,encodedBytes:files.reduce((n,row)=>n+row.encodedBytes,0),files};
});
assert.deepEqual(inventories.map(row=>[row.count,row.encodedBytes]),[[10,1789615],[10,4402233],[11,5105788]]);
const art=inventory=>inventory.files.filter(row=>row.identity.startsWith('constellation:')).sort((a,b)=>a.identity.localeCompare(b.identity));
assert.equal(art(inventories[0]).length,8);assert.deepEqual(art(inventories[0]),art(inventories[1]));assert.deepEqual(art(inventories[0]),art(inventories[2]));
const find=(inventory,id)=>inventory.files.find(row=>row.identity===id);
assert.deepEqual(find(inventories[0],'landscape:overview'),find(inventories[1],'landscape:overview'));
assert.deepEqual(find(inventories[1],'landscape:overview'),find(inventories[2],'landscape:overview'));
assert.deepEqual(find(inventories[1],'landscape:detail'),find(inventories[2],'landscape:detail'));
assert.equal(find(inventories[0],'galactic:2mass').requestSequence,1);assert.equal(find(inventories[2],'galactic:2mass').requestSequence,12);

const capturePath=name=>task+'/evidence/experience-current-native-cold-image-bound-'+name+'-2026-10-01.png';
const captures=await Promise.all(['before','local','return','final-restored'].map(name=>record(capturePath(name))));
const before=PNG.sync.read(await fs.readFile(capturePath('before')));
const pixelComparisons=[];
for(const name of ['return','final-restored']){
  const after=PNG.sync.read(await fs.readFile(capturePath(name)));assert.equal(after.width,before.width);assert.equal(after.height,before.height);
  let differentPixels=0,differentChannels=0,maxChannelDelta=0;
  for(let offset=0;offset<before.data.length;offset+=4){let pixel=false;for(let c=0;c<4;c++){const delta=Math.abs(before.data[offset+c]-after.data[offset+c]);if(delta){differentChannels++;pixel=true;maxChannelDelta=Math.max(maxChannelDelta,delta);}}if(pixel)differentPixels++;}
  pixelComparisons.push({from:'before',to:name,width:before.width,height:before.height,scope:'Complete unchanged official PNG pixel arrays including simulator chrome; no edited image or tolerance acceptance',differentPixels,differentChannels,maxChannelDelta});
}
const tests=await fs.readFile(task+'/evidence/experience-cold-image-tests-2026-10-01.log','utf8');
assert(/pass 41/.test(tests)&&/fail 0/.test(tests));
const serviceResponse=await fetch('http://127.0.0.1:60065/__task/alias-state',{signal:AbortSignal.timeout(15000)});assert.equal(serviceResponse.status,200);
const service=await serviceResponse.json();assert.equal(service.moduleSha256,readback.moduleSha256);assert.equal(service.counts.contextPuts,0);
const ordinary=await fingerprintBundle(path.resolve('apps/wechat-miniapp/dist/weapp'));
await fs.writeFile(frozen,raw,{flag:'wx'});await fs.writeFile(watch,await fs.readFile(task+'/tmp/weapp-sky-watch-2026-10-01.log'),{flag:'wx'});
const implementationEvidence=await Promise.all([
  task+'/evidence/experience-resource-source-binding-2026-10-01.json',task+'/evidence/experience-decoded-retention-replay-2026-10-01.json',replayPath,
  task+'/evidence/experience-cold-image-tests-2026-10-01.log',task+'/evidence/experience-cold-image-typecheck-2026-10-01.log',
  'apps/wechat-miniapp/src/features/sky/sky-artwork-file-retention.test.ts','apps/wechat-miniapp/src/features/sky/sky-native-image-owner.test.ts',
  'project_context/architecture/runtime-and-domain.md',task+'/scripts/experience-cold-artwork-replay-2026-10-01.mts',
  task+'/scripts/experience-cold-artwork-mutation-2026-10-01.mjs',task+'/tmp/cold-artwork-suspend-noop-2026-10-01.mjs',
  task+'/scripts/experience-cold-image-native-2026-10-01.ps1',task+'/scripts/experience-native-file-digests-2026-10-01.ps1',
  task+'/scripts/experience-current-native-helpers-2026-10-01.ps1',task+'/scripts/experience-native-file-redecode-2026-10-01.ps1',
].map(record));
await fs.writeFile(output,JSON.stringify({at:new Date().toISOString(),scope:'Current production file/decoded ownership change, actual ordinary DevTools recompiled journey and retained publications; development only. No phone, deployment, commit or complete acceptance.',goal:'active/unbudgeted/incomplete',head,branch,previous:await record(previousPath),previousSourceCount:previous.sourceHashes.length,preservedPreviousSourceCount,changedProductionPaths:[...changedPaths],sourceHashes,preservedOtherEdits,preservedCandidates,trace:{...await record(frozen),eventCount:events.length,previous277EventPrefixUnchanged:true,compiledJourneyEventStartIndex:compileIndex},ordinaryWatch:{path:'apps/wechat-miniapp/dist/weapp',sha256:ordinary.sha256,fileCount:ordinary.fileCount,totalBytes:ordinary.totalBytes,containsPreservedOtherEdits:true,log:await record(watch),compiledJourneyFromExistingProject:true},implementationEvidence,replayImprovement:replay.improvement,mutation:{scope:'Previously executed bounded no-op suspension mutation; tool chunk 2be55f, production untouched',observedExitCode:1,failedAssertion:'1 !== 0',meaning:'The decoded-retention regression fails when suspension has no effect'},native:{project:'E:/dev/worktrees/Starward/remote-main-20260908/apps/wechat-miniapp',SDKVersion:'3.17.3',DPR:3,scenes,inventories,artworkFilesPreservedWithoutNewRequestSequence:true,landscapeDetailFilePreserved:true,galacticEncodedReturnRequestBytes:703555,retired,restored,readback,captures,pixelComparisons},service:{publicPort:service.publicPort,localPort:service.localPort,moduleSha256:service.moduleSha256,contextPuts:service.counts.contextPuts},checks:{affectedProductionOwners:'41 pass / 0 fail',miniappTypecheck:'exit 0',contextValidation:'exit 0 after durable owner edit',boundedNoOpMutation:'expected failure'},limits:['Source RGBA references and encoded file readbacks do not measure physical decoded/native/GPU/OS memory, GC or total peak','Replay return-model is not the current North45 native source mix or a rendering/performance measurement','Native request sequence/content proves retained files, not the time or actual physical freeing of decoded images','SDK streams and node states do not establish physical touch, visible WXML controls or complete camera identity','Complete PNG comparison is this bounded current journey only; old native all-scene differences remain unresolved','Scientific/optical coarse fallback consumers keep decoded retention; no new source, mask, downsampling or budget','DevTools ordinary WXML composition remains failed; phone, whole quality/performance/package/cost and final independent review remain open']},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({output,events:events.length,sourceCount:sourceHashes.length,preservedPreviousSourceCount,preservedEdits:preservedOtherEdits.length,candidates:preservedCandidates.map(({path,sha256})=>({path,sha256})),nativeInventories:inventories.map(({stage,count,encodedBytes})=>({stage,count,encodedBytes})),pixelComparisons,durableContextUnchanged:true,contextPuts:0,goal:'active/unbudgeted/incomplete'}));
