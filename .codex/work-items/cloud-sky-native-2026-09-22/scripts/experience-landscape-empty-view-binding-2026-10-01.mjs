import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fingerprintBundle} from '../../../../tools/miniapp/release-bundle-artifact.mjs';

const task='.codex/work-items/cloud-sky-native-2026-09-22';
const base=task+'/evidence/experience-landscape-empty-view';
const output=base+'-binding-2026-10-01.json',frozen=base+'-events-frozen-2026-10-01.jsonl',watch=base+'-watch-frozen-2026-10-01.log';
for(const file of [output,frozen,watch])await assert.rejects(fs.access(file),{code:'ENOENT'});
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const record=async file=>{const bytes=await fs.readFile(file);return{path:file.replaceAll('\\','/'),bytes:bytes.length,sha256:sha(bytes)};};
const json=async file=>JSON.parse(await fs.readFile(file,'utf8'));
const previousPath=task+'/evidence/experience-environment-display-binding-2026-10-01.json',previous=await json(previousPath);
assert.equal(previous.trace.eventCount,708);
const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),branch=execFileSync('git',['branch','--show-current'],{encoding:'utf8'}).trim();
assert.equal(head,previous.head);assert.equal(branch,previous.branch);
const names=['sky-gpu-renderer.ts','sky-landscape-mask.ts','sky-landscape-resources.ts','use-sky-landscape.ts','sky-scene-render.ts','spot-sky-page.tsx'];
const tests=['sky-landscape-mask.test.ts','sky-landscape-resources.test.ts','sky-landscape.test.ts','sky-alignment-render.test.ts'];
const permitted=new Set([...names,...tests].map(name=>'apps/wechat-miniapp/src/features/sky/'+name));
permitted.add('project_context/areas/main/screen-contracts/wechat-miniapp/spot-and-sky.md');
const changes=new Map();
for(const row of [...previous.preservedRenderingInputs,...previous.productionAndConsumerSources]){
 const current=await record(row.path);if(current.sha256!==row.sha256){assert(permitted.has(row.path),row.path);changes.set(row.path,{path:row.path,beforeSha256:row.sha256,afterSha256:current.sha256});}
}
for(const name of names)assert(changes.has('apps/wechat-miniapp/src/features/sky/'+name),name);
for(const row of [...previous.preservedOtherEdits,...previous.byteExactConfigurations])assert.equal((await record(row.path)).sha256,row.sha256,row.path);
const preservedCandidates=[];
for(const row of previous.preservedCandidates){const current=await fingerprintBundle(path.resolve(row.path));assert.equal(current.sha256,row.sha256);preservedCandidates.push({path:row.path,sha256:current.sha256,fileCount:current.fileCount});}
const snapshots=await json(task+'/evidence/experience-landscape-empty-before-sources-2026-10-01.json');
for(const row of snapshots){assert.equal((await record(row.beforePath)).sha256,row.sha256);assert([...previous.preservedRenderingInputs,...previous.productionAndConsumerSources].some(old=>old.path===row.path&&old.sha256===row.sha256),row.path);}
const sourcePaths=new Set([...previous.productionAndConsumerSources.map(row=>row.path),...permitted]);
const productionAndConsumerSources=await Promise.all([...sourcePaths].map(record));
const softwarePaths=['before','current'].map(name=>'output/playwright/cloud-sky-landscape-empty-view-1001-'+name+'/result.json');
const [before,current]=await Promise.all(softwarePaths.map(json));
for(const result of [before,current]){
 assert.equal(result.rows.length,20);assert.equal(result.errors.length,0);
 for(const row of result.records)assert.equal((await record(row.path)).sha256,row.sha256,row.path);
 for(const row of result.sourceHashes){const snapshot=result.name==='before'&&snapshots.find(candidate=>candidate.path===row.path);
  assert.equal((await record(snapshot?snapshot.beforePath:row.path)).sha256,row.sha256,row.path);}
 assert.equal((await record(path.dirname(softwarePaths[result.name==='before'?0:1])+'/production.js')).sha256,result.bundleSha256);
 for(const row of result.rows){assert.equal(row.glError,0);assert.equal(row.warmUpload,0);assert.equal(row.retiredLogicalTextureBytes,0);assert(Object.values(row.retired).every(value=>value===0));}
}
const high=current.rows.filter(row=>row.certifiedAbove);assert.equal(high.length,12);
for(const row of current.rows){const old=before.rows.find(candidate=>candidate.resource===row.resource&&candidate.condition.name===row.condition.name);assert(old);assert.equal(row.rgbaSha256,old.rgbaSha256);assert.equal(row.changedPixels,old.changedPixels);
 if(row.certifiedAbove){assert.equal(row.changedPixels,0);assert.equal(row.firstUpload,0);assert(old.firstUpload>0);}else{assert(row.changedPixels>0);assert.equal(row.firstUpload,old.firstUpload);}}
assert.equal(before.rows.find(row=>row.condition.name==='native-default'&&row.resource==='overview').firstUpload,2097152);
const rendererPath='apps/wechat-miniapp/src/features/sky/sky-gpu-renderer.ts';
const renderer=await fs.readFile(rendererPath,'utf8'),oldRenderer=await fs.readFile(snapshots.find(row=>row.path===rendererPath).beforePath,'utf8');
const shader=source=>source.slice(source.indexOf('const solarLightFragment = '),source.indexOf('const galacticBandFragment = `'));
assert.equal(shader(renderer),shader(oldRenderer));

const raw=await fs.readFile(task+'/evidence/experience-current-native-events-2026-10-01.jsonl'),prefix=await fs.readFile(previous.trace.path);
assert(raw.subarray(0,prefix.length).equals(prefix));assert(!/\?[^"\r\n]*(?:contextId=|spotId=)/.test(raw.toString()));
const events=raw.toString().trim().split(/\r?\n/).map(JSON.parse),index=name=>events.findLastIndex(row=>row.stage===name);
const stage=name=>{const row=events[index(name)];assert(row,name);return row.value;};
assert.equal(events.slice(708).filter(row=>row.stage==='tool-failure').length,0);
const compileStages=['landscape-empty-view','landscape-empty-view-mask-owner'].map(name=>{
 assert(index(name+'-compiler-requested')>=708);assert.equal(stage(name+'-compiler-dispatched').success,true);
 assert(index(name+'-dispatched')<index(name+'-application-seen'));assert(index(name+'-application-seen')<index(name+'-entry-reentered-owned-context'));
 return{name,dispatchedAt:events[index(name+'-compiler-dispatched')].at,actualApplicationSeenAt:events[index(name+'-application-seen')].at};
});
const scene=(name,at='2026-09-30T13:50:33.000Z',fov=45)=>{const value=stage(name);assert.equal(value.route,'sky/detail/index');assert.equal(value.canvas.labelFacts.presented,true);assert.equal(value.canvas.labelFacts.frameAt,at);assert.equal(value.canvas.labelFacts.verticalFovDeg,fov);assert.equal(value.selection.length,0);assert.equal(value.modal.length,0);return value;};
const native={noon:scene('landscape-empty-view-noon-state','2026-09-30T04:00:00.000Z'),dusk:scene('landscape-empty-view-dusk-state','2026-09-30T10:30:00.000Z'),restored:scene('landscape-empty-view-restored-state'),ground:scene('landscape-empty-view-ground-state'),highReturn:scene('landscape-empty-view-high-return-state'),groundReturn:scene('landscape-empty-view-ground-return-state'),dome:scene('landscape-empty-view-dome-state',undefined,274.9),correctedGround:scene('landscape-empty-view-mask-owner-ground-state'),correctedDome:scene('landscape-empty-view-mask-owner-dome-state',undefined,274.9),current:scene('landscape-empty-view-mask-owner-final-state')};
const digest=name=>{const value=stage(name+'-encoded-digests');assert.equal(value.failed,0);return{...value,count:value.files.length,encodedBytes:value.files.reduce((sum,row)=>sum+row.encodedBytes,0)};};
const files=Object.fromEntries(['baseline','noon','restored','ground','high-return','ground-return','dome','final','mask-owner-baseline','mask-owner-ground','mask-owner-dome','mask-owner-final'].map(name=>[name,digest('landscape-empty-view-'+name+'-files')]));
for(const name of ['baseline','final','mask-owner-baseline','mask-owner-final']){assert.equal(files[name].count,9);assert.equal(files[name].encodedBytes,934831);}
const coarse='a2bfaaa317d1de145fad2ad26cd18de5ce632294',fine='56a5d3148538ba2ae0d5887da0dc7f4163bd4463';
for(const name of ['baseline','noon','restored','mask-owner-baseline','mask-owner-final'])assert(!files[name].files.some(row=>row.sha1===coarse||row.sha1===fine));
for(const name of ['ground','high-return','ground-return'])assert.equal(files[name].files.find(row=>row.sha1===coarse).requestSequence,14);
assert(files.dome.files.some(row=>row.sha1===fine));assert(files['mask-owner-dome'].files.some(row=>row.sha1===fine));
for(const name of ['landscape-empty-view-exit-files','landscape-empty-view-mask-owner-exit-files']){const value=stage(name);assert.equal(value.route,'pages/map/index');assert.equal(value.count,0);assert.equal(value.encodedBytes,0);}
const readback=stage('cold-image-durable-context-readback');assert(readback.revisionUnchanged&&readback.instantUnchanged&&readback.fingerprintUnchanged);assert.equal(readback.revision,1);assert.equal(readback.contextPuts,0);assert.equal(readback.moduleSha256,previous.native.readback.moduleSha256);
const pixelPath=base+'-native-pixels-2026-10-01.json',pixels=await json(pixelPath);assert.equal(pixels.region.changedPixels,3);assert.equal(pixels.region.maxDelta,1);for(const row of pixels.inputs)assert.equal((await record(row.path)).sha256,row.sha256);
const captureNames=['dispatched','baseline','noon','dusk','restored','horizon','ground','high-return','ground-return','dome','exit','final','mask-owner-dispatched','mask-owner-baseline','mask-owner-ground','mask-owner-dome','mask-owner-final'];
const captures=[];for(const name of captureNames){const capture=await record(task+'/evidence/experience-current-native-landscape-empty-view-'+name+'-2026-10-01.png');assert.equal(capture.sha256,stage('landscape-empty-view-'+name).sha256);captures.push(capture);}
const logNames=['experience-landscape-empty-view-before','experience-landscape-empty-view-before-final','experience-landscape-empty-view-current','experience-landscape-empty-view-affected','experience-landscape-empty-view-generation-final','experience-landscape-empty-mask-owner-before','experience-landscape-empty-view-affected-final','experience-landscape-empty-view-typecheck-final2','experience-landscape-empty-view-context-check-final'];
const checks=await Promise.all(logNames.map(name=>record(task+'/evidence/'+name+'-2026-10-01.log')));
const affected=await fs.readFile(task+'/evidence/experience-landscape-empty-view-affected-final-2026-10-01.log','utf8');assert(affected.includes('pass 37')&&affected.includes('fail 0'));
for(const name of ['experience-landscape-empty-view-before-final','experience-landscape-empty-mask-owner-before'])assert((await fs.readFile(task+'/evidence/'+name+'-2026-10-01.log','utf8')).includes('AssertionError'));
execFileSync('git',['diff','--check'],{stdio:'pipe'});
const ordinaryWatch=await fingerprintBundle(path.resolve(previous.ordinaryWatch.path)),watchBytes=await fs.readFile(task+'/tmp/weapp-sky-watch-2026-10-01.log');assert(watchBytes.toString().includes('18:12:11'));assert.notEqual(ordinaryWatch.sha256,previous.ordinaryWatch.sha256);
const scripts=['experience-landscape-empty-view-probe-2026-10-01.mts','experience-landscape-empty-view-native-2026-10-01.ps1','experience-landscape-mask-owner-native-2026-10-01.ps1','experience-landscape-mask-owner-ground-2026-10-01.ps1','experience-current-native-helpers-2026-10-01.ps1','experience-current-native-reenter-2026-10-01.ps1','experience-native-file-digests-2026-10-01.ps1','experience-retired-native-files-2026-10-01.ps1'];
await fs.writeFile(frozen,raw,{flag:'wx'});await fs.writeFile(watch,watchBytes,{flag:'wx'});
await fs.writeFile(output,JSON.stringify({at:new Date().toISOString(),scope:'Source-alpha empty-viewport demand/upload and matching painted-mask identity; finite software and official SDK development evidence, not final acceptance.',head,branch,previous:await record(previousPath),trace:{...await record(frozen),eventCount:events.length,previous708EventPrefixUnchanged:true,compileStages},preservedRenderingInputs:await Promise.all(previous.preservedRenderingInputs.map(row=>record(row.path))),productionAndConsumerSources,sourceChanges:[...changes.values()],beforeSources:snapshots,preservedOtherEdits:previous.preservedOtherEdits,byteExactConfigurations:previous.byteExactConfigurations,preservedCandidates,
 ordinaryWatch:{path:previous.ordinaryWatch.path,sha256:ordinaryWatch.sha256,fileCount:ordinaryWatch.fileCount,totalBytes:ordinaryWatch.totalBytes,files:ordinaryWatch.files,log:await record(watch),sourceCompileAtLocal:'2026-10-01 18:12:11',scope:'Same ordinary watch includes the six preserved unrelated edits; not a clean candidate or official package.'},
 software:{results:await Promise.all(softwarePaths.map(record)),conditions:20,certifiedEmpty:12,allBeforeAfterRgbaExactlyUnchanged:true,highUploadsBefore:[2097152,8388608],highUploadsAfter:0,sourceRecords:current.records,sourceHashes:current.sourceHashes,environmentSolarShaderUnchanged:true,scope:'Actual existing published PNG/RLE and production software WebGL renderer; standalone panorama contribution, no image download or native memory measurement.'},
 native:{...native,files,readback,pixels:await record(pixelPath),exits:['landscape-empty-view-exit-files','landscape-empty-view-mask-owner-exit-files'].map(stage),inputs:['noon-input','dusk-input','time-cancel-input','horizon-pan-input','ground-pan-input','high-return-input','ground-return-input','dome-input','mask-owner-ground-input','mask-owner-dome-input'].map(name=>({stage:'landscape-empty-view-'+name,value:stage('landscape-empty-view-'+name)})),composition:'FAILED_DEVTOOLS: ordinary main-Sky controls remain absent in actual PNG. SDK inputs are synthetic public events, not physical or visible-control acceptance.',applicability:'Noon/Dusk/cancel and repeated ground return precede final mask-priority correction. Their no-bitmap path is unchanged; final correction independently has a failing-before scene-owner regression and current high/ground/dome/exit/reentry evidence.'},
 captures,inspectedCaptureStages:captureNames.filter(name=>name!=='restored'),checks,verifiedExecution:{emptyViewBefore:{exitCode:1,unexpectedOverviewUpload:2097152},emptyViewCurrent:{exitCode:0},maskOwnerBefore:{exitCode:1},affectedFinal:{exitCode:0,pass:37,fail:0},miniTypecheck:{exitCode:0},contextStructure:{exitCode:0},whitespace:{exitCode:0},review:'Primary-agent source/output review only; independent shared and final review remains GAP',harnessCorrection:'First probe log is preserved: harness syntax error before rendering. Corrected before-final reproduces the actual upload defect.',binderCorrection:'Initial binder stopped before freezing because it compared before-probe source hashes to current files. Before inputs now verify against the already-bound immutable snapshots; current inputs verify current files.'},scripts:await Promise.all(scripts.map(name=>record(task+'/scripts/'+name))),
 limits:['Finite native scene region has 3 differing pixels by one channel step; do not claim exact native equality or full scene quality.', 'Encoded files/request sequences do not measure decoded/GPU/OS/GC/total download or frame performance. Same-byte galaxy was fetched again after day preview; queued with its existing owner.', 'GPU owner already removes unused identities at finish; its strong Map alone is not evidence of inactive-source retention or grounds for a new cache.', 'Original bounds, recovery and required layers retained. Global cap is deliberately conservative; no terrain, source publication, resolution, budget, provider or commercial scope change.', 'Physical Android/iOS/new Moon, ordinary Canvas/WXML, full reference quality/coverage/calibration/journey, total resources/weak network/official package/cost and independent review remain open.', 'No source download, phone action, new watch/window, candidate replacement, Git commit/push or deployment. Goal active, unbudgeted and incomplete.']},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({output,eventCount:events.length,changedBoundSources:[...changes.keys()],preservedOtherEdits:previous.preservedOtherEdits.length,emptySoftwareConditions:high.length,initialFiles:files.baseline.count,currentFiles:files['mask-owner-final'].count,composition:'FAILED_DEVTOOLS',review:'GAP'}));
