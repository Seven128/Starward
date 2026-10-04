import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fingerprintBundle} from '../../../../tools/miniapp/release-bundle-artifact.mjs';
const task='.codex/work-items/cloud-sky-native-2026-09-22',base=task+'/evidence/experience-fixed-image-cold';
const output=base+'-binding-2026-10-01.json',frozen=base+'-events-frozen-2026-10-01.jsonl',watch=base+'-watch-frozen-2026-10-01.log';
for(const file of [output,frozen,watch])await assert.rejects(fs.access(file),{code:'ENOENT'});
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const record=async file=>{const bytes=await fs.readFile(file);return{path:file.replaceAll('\\','/'),bytes:bytes.length,sha256:sha(bytes)};};
const json=async file=>JSON.parse(await fs.readFile(file,'utf8'));
const previousPath=task+'/evidence/experience-twilight-gradient-binding-2026-10-01.json',previous=await json(previousPath);
assert.equal(previous.trace.eventCount,1113);
const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),branch=execFileSync('git',['branch','--show-current'],{encoding:'utf8'}).trim();
assert.equal(head,previous.head);assert.equal(branch,previous.branch);
const beforePath=base+'-before-source-2026-10-01.json',before=await json(beforePath),permitted=new Set(before.sources.map(row=>row.path)),sourceChanges=[];
for(const row of before.sources){assert.equal((await record(row.beforePath)).sha256,row.sha256);const current=await record(row.path);assert.notEqual(current.sha256,row.sha256,row.path);sourceChanges.push({path:row.path,beforeSha256:row.sha256,afterSha256:current.sha256});}
for(const row of [...previous.preservedRenderingInputs,...previous.productionAndConsumerSources,previous.additionalContext]){
 const current=await record(row.path);if(current.sha256!==row.sha256)assert(permitted.has(row.path),'Unexpected source change: '+row.path);
}
for(const row of [...previous.preservedOtherEdits,...previous.byteExactConfigurations])assert.equal((await record(row.path)).sha256,row.sha256,row.path);
const preservedCandidates=[];for(const row of previous.preservedCandidates){const current=await fingerprintBundle(path.resolve(row.path));assert.equal(current.sha256,row.sha256);preservedCandidates.push({path:row.path,sha256:current.sha256,fileCount:current.fileCount});}
const newSource='apps/wechat-miniapp/src/features/sky/use-sky-fixed-image.ts';
const sourcePaths=new Set([...previous.productionAndConsumerSources.map(row=>row.path),...permitted,newSource]);
const productionAndConsumerSources=await Promise.all([...sourcePaths].map(record));
const raw=await fs.readFile(task+'/evidence/experience-current-native-events-2026-10-01.jsonl'),prefix=await fs.readFile(previous.trace.path);
assert(raw.subarray(0,prefix.length).equals(prefix));assert.equal(sha(raw.subarray(0,before.traceBefore.bytes)),before.traceBefore.sha256);
assert(!/\?[^"\r\n]*(?:contextId=|spotId=)/.test(raw.toString()));
const events=raw.toString().trim().split(/\r?\n/).map(JSON.parse),index=name=>events.findLastIndex(row=>row.stage===name),stage=name=>{const row=events[index(name)];assert(row,name);return row.value;};
assert.equal(events.length,1254);assert.equal(events.slice(1113).filter(row=>row.stage==='tool-failure').length,0);
assert.equal(stage('fixed-image-cold-compiler-dispatched').success,true);
assert(index('fixed-image-cold-dispatched')<index('fixed-image-cold-application-seen'));assert(index('fixed-image-cold-application-seen')<index('fixed-image-cold-entry-reentered-owned-context'));
const view=name=>stage(name+'-view').view,digests=name=>stage(name+'-encoded-digests');
const moonSha1='04b98767ae58f45ca6d9226d2603aa38835cdd16',moon=files=>files.files.find(row=>row.sha1===moonSha1);
const prior={warm:digests('tracking-composition-moon-warm'),wide:digests('tracking-composition-moon-wide-files'),returned:digests('tracking-composition-moon-return-before')};
assert.equal(moon(prior.warm).requestSequence,24);assert(!moon(prior.wide));assert.equal(moon(prior.returned).requestSequence,34);
const names=['moon-local','moon-wide','moon-return','moon-preview','source-return','moon-paused','paused-source-return','final'];
const views=Object.fromEntries(names.map(name=>[name,view('fixed-image-cold-'+name)])),files=Object.fromEntries(names.map(name=>[name,digests('fixed-image-cold-'+name+'-files')]));
for(const name of names)assert.equal(files[name].failed,0);
for(const name of ['moon-local','moon-wide','moon-return','moon-preview']){assert.equal(moon(files[name]).encodedBytes,1595187);assert.equal(moon(files[name]).requestSequence,13);}
assert.deepEqual(views['moon-local'],view('tracking-composition-moon-local-first'));assert.deepEqual(views['moon-local'],views['moon-return']);
assert.deepEqual(views['moon-wide'],view('tracking-composition-moon-wide-current'));
assert.equal(views['moon-preview'].frameAt,'2026-09-30T14:00:00.000Z');assert.notDeepEqual(views['moon-preview'].basis,views['moon-local'].basis);
assert.equal(stage('fixed-image-cold-time-target-observed').target.label,'22:30，第 23 个真实观测时刻，选择此时刻');
assert.equal(stage('fixed-image-cold-time-preview-observed-correction').actualLocalTime,'22:00');
assert.deepEqual(views['source-return'],views['moon-local']);assert.equal(moon(files['source-return']).requestSequence,23);
assert.equal(views['moon-paused'].frameAt,'2026-09-30T13:50:37.599Z');assert.deepEqual(views['moon-paused'],views['paused-source-return']);
assert.equal(moon(files['moon-paused']).requestSequence,23);assert.equal(moon(files['paused-source-return']).requestSequence,24);
for(const name of ['fixed-image-cold-source-hidden-files','fixed-image-cold-paused-source-hidden-files','fixed-image-cold-exit-files']){assert.equal(stage(name).count,0);assert.equal(stage(name).encodedBytes,0);}
assert.deepEqual(view('fixed-image-cold-time-cancel'),views['moon-local']);
assert.equal(views.final.frameAt,'2026-09-30T13:50:33.000Z');assert.equal(views.final.verticalFovDeg,45);assert.equal(files.final.files.length,9);assert.equal(files.final.files.reduce((n,row)=>n+row.encodedBytes,0),934831);assert(!moon(files.final));
const finalState=stage('fixed-image-cold-final-state');assert.equal(finalState.selection.length,0);assert.equal(finalState.modal.length,0);assert.equal(finalState.time.length,0);
const readback=stage('cold-image-durable-context-readback');assert(readback.revisionUnchanged&&readback.instantUnchanged&&readback.fingerprintUnchanged);assert.equal(readback.revision,1);assert.equal(readback.contextPuts,0);assert.equal(readback.moduleSha256,previous.native.readback.moduleSha256);
const moonFile='workers/miniapp-api/assets/moon/clementine-uv750-v21-coverage-2048x1024.png',moonBytes=await fs.readFile(moonFile);
assert.equal(moonBytes.length,1595187);assert.equal(createHash('sha1').update(moonBytes).digest('hex'),moonSha1);assert.equal(sha(moonBytes),'ba7b9eef33d3e4d25c251f79641c39ea5526c35edb5c262eecffb3dea67b23f6');
const response=await fetch('http://127.0.0.1:60065/v2/sky/moon/coverage/manifest');assert.equal(response.status,200);const publication=await response.json();assert.equal(publication.image.sha256,sha(moonBytes));assert.equal(publication.image.bytes,moonBytes.length);assert.equal(publication.image.width,2048);assert.equal(publication.image.height,1024);
const publicationPath=base+'-moon-publication-2026-10-01.json';await fs.writeFile(publicationPath,JSON.stringify({status:response.status,scope:'Read-only current task BFF immutable coverage publication; no new source/image acquisition',publication},null,2)+'\n',{flag:'wx'});
const pixelsPath=base+'-native-pixels-2026-10-01.json',pixels=await json(pixelsPath),edgesPath=base+'-pixel-edges-2026-10-01.json',edges=await json(edgesPath);
for(const row of pixels.rows){for(const input of row.inputs)assert.equal((await record(input.path)).sha256,input.sha256);if(row.name.includes('source-')){assert.equal(row.region.changedPixels,799);assert.equal(row.region.maxDelta,16);}else{assert.equal(row.region.changedPixels,0);assert.equal(row.region.maxDelta,0);}}
for(const row of edges.rows){assert.deepEqual(row.columns,[{x:1,count:799}]);assert.equal(row.separatelyMeasuredInterior.changedPixels,0);assert.equal(row.separatelyMeasuredInterior.maxDelta,0);}
const captures=[];const captureNames=['tracking-composition-moon-local-first','tracking-composition-moon-return-before','fixed-image-cold-dispatched','fixed-image-cold-moon-local','fixed-image-cold-moon-wide','fixed-image-cold-moon-return','fixed-image-cold-moon-preview','fixed-image-cold-source','fixed-image-cold-source-return','fixed-image-cold-moon-paused','fixed-image-cold-paused-source','fixed-image-cold-paused-source-return','fixed-image-cold-final'];
for(const name of captureNames){const capture=await record(task+'/evidence/experience-current-native-'+name+'-2026-10-01.png');assert.equal(capture.sha256,stage(name).sha256);captures.push(capture);}
const checks=await Promise.all(['before','owner','affected','typecheck','typecheck-final','context-check','native-pixels'].map(name=>record(base+'-'+name+'-2026-10-01.log')));
assert((await fs.readFile(base+'-before-2026-10-01.log','utf8')).includes('wide browsing must not re-download the same immutable Moon file'));
const affected=await fs.readFile(base+'-affected-2026-10-01.log','utf8');assert(affected.includes('pass 36')&&affected.includes('fail 0'));
assert((await fs.readFile(base+'-native-pixels-2026-10-01.log','utf8')).includes('AssertionError'));
execFileSync('git',['diff','--check'],{stdio:'pipe'});
const ordinaryWatch=await fingerprintBundle(path.resolve(previous.ordinaryWatch.path)),watchBytes=await fs.readFile(task+'/tmp/weapp-sky-watch-2026-10-01.log');assert(watchBytes.toString().includes('22:11:24'));assert.notEqual(ordinaryWatch.sha256,previous.ordinaryWatch.sha256);
await fs.writeFile(frozen,raw,{flag:'wx'});await fs.writeFile(watch,watchBytes,{flag:'wx'});
const scripts=await Promise.all(['experience-fixed-image-cold-prepare-2026-10-01.mjs','experience-fixed-image-cold-native-2026-10-01.ps1','experience-fixed-image-cold-source-2026-10-01.ps1','experience-fixed-image-cold-pixels-2026-10-01.mjs','experience-fixed-image-cold-pixel-edges-2026-10-01.mjs','experience-fixed-image-cold-binding-2026-10-01.mjs','experience-current-native-helpers-2026-10-01.ps1','experience-zoom-camera-native-2026-10-01.ps1','experience-native-file-digests-2026-10-01.ps1','experience-current-native-reenter-2026-10-01.ps1','experience-retired-native-files-2026-10-01.ps1'].map(name=>record(task+'/scripts/'+name)));
await fs.writeFile(output,JSON.stringify({at:new Date().toISOString(),scope:'Shared single published image cold-file lifecycle; native Moon browsing/time/tracking/source return, not full runtime acceptance',head,branch,previous:await record(previousPath),trace:{...await record(frozen),eventCount:events.length,previous1113EventPrefixUnchanged:true},beforeSources:await record(beforePath),sourceChanges,newSource:await record(newSource),preservedRenderingInputs:await Promise.all(previous.preservedRenderingInputs.map(row=>record(row.path))),productionAndConsumerSources,additionalContext:await record(previous.additionalContext.path),preservedOtherEdits:previous.preservedOtherEdits,byteExactConfigurations:previous.byteExactConfigurations,preservedCandidates,
 ordinaryWatch:{path:previous.ordinaryWatch.path,sha256:ordinaryWatch.sha256,fileCount:ordinaryWatch.fileCount,totalBytes:ordinaryWatch.totalBytes,files:ordinaryWatch.files,log:await record(watch),sourceCompileAtLocal:'2026-10-01 22:11:24',scope:'Existing ordinary watch with six unrelated preserved edits; not clean candidate or official package'},
 native:{prior,views,files,readback,moonPublication:await record(publicationPath),moonSource:await record(moonFile),sameCanvasMoonSequence:13,avoidedSameCanvasMoonBodyBytes:1595187,coldRetentionEncodedBytes:1595187,sourceHides:[stage('fixed-image-cold-source-hidden-files'),stage('fixed-image-cold-paused-source-hidden-files')],publicExit:stage('fixed-image-cold-exit-files'),activeRulerHide:'Cancels unfinished ruler preview to original 13:50:33; lifecycle rule retained',pausedSourceReturn:'Retains exact 13:50:37.599 completed camera and tracking; regenerated owner fetches again after hide',sourcePixelComparison:'FAILED_ORIGINAL_ROI:799/max16, all at x1; separately measured interior0/max0; cause unproven, no full screenshot acceptance',timeInputCorrection:stage('fixed-image-cold-time-preview-observed-correction'),composition:'FAILED_DEVTOOLS'},
 pixels:await record(pixelsPath),pixelEdgeDiagnosis:await record(edgesPath),captures,inspectedCaptureStages:captureNames,checks,scripts,
 verifiedExecution:{before:{exitCode:1,pass:13,fail:1},affected:{exitCode:0,pass:36,fail:0},miniTypecheck:{exitCode:0},contextStructure:{exitCode:0},whitespace:{exitCode:0},nativePixels:{exitCode:1,originalRoiStatus:'FAILED_SOURCE_RETURN_BOUNDARY',separateInterior:'0 changed/max0'},review:'Primary agent only; independent shared and final review GAP'},
 limits:['Original loader budget and concurrency retained; one fixed publication per consumer, cold file reuse requires successful re-decode. Encoded/native callbacks do not measure decoded/GPU/OS memory or GC.', 'Moon, Mars, Mercury, OPAL and Galaxy use the common lifecycle; actual DevTools evidence is Moon plus final Galaxy path, other bodies have controlled production-hook/native-callback checks, not all-target acceptance.', 'Same-Canvas local/wide/local current images and frozen-before/current local original ROI are exactly equal; original Source return ROI comparisons remain failed, spatially confined to x1, not silently changed to a smaller ROI.', 'Unfinished ruler touch preview is cancelled on hide; paused playback retains its uncommitted instant on source Back. First SDK offset landed22:00, not intended22:30; actual result and corrective annotation preserved.', 'WXML full composition, full Dome/physical touch/calibration, Android/iOS/new Moon, all-source coverage/reference quality, total resources/firstscreen/FPS/weaknet/official package/cost and independent review remain open.', 'No new Moon source processing/download, phone operation, window/watch/startup investigation, candidate replacement, Git commit/push or deployment. Goal active,unbudgeted,incomplete.']},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({output,eventCount:events.length,changedSources:sourceChanges.length,newSource,moonSameCanvasSequence:13,avoidedBodyBytes:1595187,sourcePixelOriginalRoi:'FAILED_X1_799_MAX16',finalFiles:9,review:'GAP'}));
