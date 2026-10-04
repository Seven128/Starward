import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fingerprintBundle} from '../../../../tools/miniapp/release-bundle-artifact.mjs';
const task='.codex/work-items/cloud-sky-native-2026-09-22',base=task+'/evidence/experience-zoom-camera';
const output=base+'-binding-2026-10-01.json',frozen=base+'-events-frozen-2026-10-01.jsonl',watch=base+'-watch-frozen-2026-10-01.log';
for(const file of [output,frozen,watch])await assert.rejects(fs.access(file),{code:'ENOENT'});
const record=async file=>{const bytes=await fs.readFile(file);return{path:file.replaceAll('\\','/'),bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')};};
const json=async file=>JSON.parse(await fs.readFile(file,'utf8'));
const previousPath=task+'/evidence/experience-timezone-offset-binding-2026-10-01.json',previous=await json(previousPath);assert.equal(previous.trace.eventCount,895);
const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),branch=execFileSync('git',['branch','--show-current'],{encoding:'utf8'}).trim();assert.equal(head,previous.head);assert.equal(branch,previous.branch);
const pagePath='apps/wechat-miniapp/src/features/sky/spot-sky-page.tsx',factsPath='apps/wechat-miniapp/src/features/sky/sky-scene-frame-facts.ts',testPath='apps/wechat-miniapp/src/features/sky/sky-scene-frame-facts.test.ts',contextPath='project_context/areas/main/screen-contracts/wechat-miniapp/spot-and-sky.md';
const permitted=new Set([pagePath,factsPath,testPath,contextPath]),changes=new Map();
for(const row of [...previous.preservedRenderingInputs,...previous.productionAndConsumerSources]){const current=await record(row.path);if(current.sha256!==row.sha256){assert(permitted.has(row.path),row.path);changes.set(row.path,{path:row.path,beforeSha256:row.sha256,afterSha256:current.sha256});}}
assert.equal(changes.size,4);
const beforeSources=await json(base+'-before-sources-2026-10-01.json');
for(const row of beforeSources){assert.equal((await record(row.beforePath)).sha256,row.sha256);assert.equal(changes.get(row.path).beforeSha256,row.sha256);}
const firstNativeSourcesPath=base+'-first-native-sources-2026-10-01.json',firstNativeSources=await json(firstNativeSourcesPath);
for(const row of firstNativeSources.rows)assert.equal((await record(row.copyPath)).sha256,row.sha256);
assert.equal(firstNativeSources.rows.find(row=>row.path===factsPath).sha256,(await record(factsPath)).sha256);
const firstPage=await fs.readFile(firstNativeSources.rows.find(row=>row.path===pagePath).copyPath,'utf8'),finalPage=await fs.readFile(pagePath,'utf8');
assert.equal(finalPage.replace('data-sky-presented-view={nativeCanvasMounted && presentedSceneReady','data-sky-presented-view={presentedSceneReady'),firstPage);
for(const row of [...previous.preservedOtherEdits,...previous.byteExactConfigurations])assert.equal((await record(row.path)).sha256,row.sha256,row.path);
const preservedCandidates=[];for(const row of previous.preservedCandidates){const current=await fingerprintBundle(path.resolve(row.path));assert.equal(current.sha256,row.sha256);preservedCandidates.push({path:row.path,sha256:current.sha256,fileCount:current.fileCount});}
const productionAndConsumerSources=await Promise.all(previous.productionAndConsumerSources.map(row=>record(row.path)));
const raw=await fs.readFile(task+'/evidence/experience-current-native-events-2026-10-01.jsonl'),prefix=await fs.readFile(previous.trace.path);assert(raw.subarray(0,prefix.length).equals(prefix));assert(!/\?[^"\r\n]*(?:contextId=|spotId=)/.test(raw.toString()));
const events=raw.toString().trim().split(/\r?\n/).map(JSON.parse),index=name=>events.findLastIndex(row=>row.stage===name),stage=name=>{const row=events[index(name)];assert(row,name);return row.value;};
assert.equal(events.length,960);
const failures=events.slice(895).filter(row=>row.stage==='tool-failure');assert.equal(failures.length,1);assert.equal(failures[0].value.tool,'automation_evaluate');assert.equal(failures[0].value.error,null);
assert.equal(stage('zoom-camera-after-read-only-probe').canvas.labelFacts.presented,true);
for(const name of ['zoom-camera','zoom-camera-final']){assert.equal(stage(name+'-compiler-dispatched').success,true);assert(index(name+'-dispatched')<index(name+'-application-seen'));assert(index(name+'-application-seen')<index(name+'-entry-reentered-owned-context'));}
const pixelsPath=base+'-native-pixels-2026-10-01.json',pixels=await json(pixelsPath);
for(const row of pixels.rows)for(const input of row.inputs)assert.equal((await record(input.path)).sha256,input.sha256);
const legacy=pixels.rows.find(row=>row.name==='legacy-ratio-return'),matched=pixels.rows.find(row=>row.name==='matched-input-return');
assert.equal(legacy.exactCompletedCameraEqual,false);assert.equal(legacy.afterView.verticalFovDeg,45.00001791950926);assert.equal(legacy.region.changedPixels,218);assert.equal(legacy.region.maxDelta,8);
assert.equal(matched.exactCompletedCameraEqual,true);assert.equal(matched.region.changedPixels,11);assert.equal(matched.region.maxDelta,1);assert.deepEqual(matched.beforeView,matched.afterView);
const current=stage('zoom-camera-final-state'),currentView=stage('zoom-camera-final-view');assert.equal(current.route,'sky/detail/index');assert.equal(current.canvas.labelFacts.starCount,4051);assert.equal(current.canvas.labelFacts.verticalFovDeg,45);assert.equal(current.selection.length,0);assert.equal(current.modal.length,0);assert.equal(current.time.length,0);assert.deepEqual(currentView.view,matched.beforeView);
const digest=name=>{const value=stage(name+'-files-encoded-digests');assert.equal(value.failed,0);return{...value,count:value.files.length,encodedBytes:value.files.reduce((sum,row)=>sum+row.encodedBytes,0)};};
const files=Object.fromEntries(['zoom-camera-return','zoom-camera-matched-baseline','zoom-camera-matched-local','zoom-camera-matched-return','zoom-camera-final'].map(name=>[name,digest(name)]));
for(const value of Object.values(files)){assert.equal(value.count,9);assert.equal(value.encodedBytes,934831);}
assert.deepEqual(files['zoom-camera-matched-baseline'].files,files['zoom-camera-matched-local'].files);assert.deepEqual(files['zoom-camera-matched-baseline'].files,files['zoom-camera-matched-return'].files);
const exit=stage('zoom-camera-matched-exit-files');assert.equal(exit.count,0);assert.equal(exit.encodedBytes,0);assert.equal(exit.route,'pages/map/index');
const readback=stage('cold-image-durable-context-readback');assert(readback.revisionUnchanged&&readback.instantUnchanged&&readback.fingerprintUnchanged);assert.equal(readback.revision,1);assert.equal(readback.contextPuts,0);assert.equal(readback.moduleSha256,previous.native.readback.moduleSha256);
const captureNames=['dispatched','baseline','local','return','matched-baseline','matched-local','matched-return','final-dispatched','final'];
const captures=[];for(const name of captureNames){const value=await record(task+'/evidence/experience-current-native-zoom-camera-'+name+'-2026-10-01.png');assert.equal(value.sha256,stage('zoom-camera-'+name).sha256);captures.push(value);}
const checkNames=['affected','affected-final','affected-final2','unmounted-before','affected-final3','typecheck','typecheck-final','typecheck-final2','context-check','native-pixels'];
const checks=await Promise.all(checkNames.map(name=>record(base+'-'+name+'-2026-10-01.log')));
const affected=await fs.readFile(base+'-affected-final3-2026-10-01.log','utf8');assert(affected.includes('pass 24')&&affected.includes('fail 0'));
assert((await fs.readFile(base+'-unmounted-before-2026-10-01.log','utf8')).includes('an unmounted Canvas must not expose a retained completed camera as live'));
execFileSync('git',['diff','--check'],{stdio:'pipe'});
const ordinaryWatch=await fingerprintBundle(path.resolve(previous.ordinaryWatch.path)),watchBytes=await fs.readFile(task+'/tmp/weapp-sky-watch-2026-10-01.log');assert(watchBytes.toString().includes('19:44:50'));
const scripts=await Promise.all(['experience-zoom-camera-native-2026-10-01.ps1','experience-zoom-camera-pixels-2026-10-01.mjs','experience-zoom-camera-binding-2026-10-01.mjs'].map(name=>record(task+'/scripts/'+name)));
await fs.writeFile(frozen,raw,{flag:'wx'});await fs.writeFile(watch,watchBytes,{flag:'wx'});
await fs.writeFile(output,JSON.stringify({at:new Date().toISOString(),scope:'Exact completed-view readback and finite same-camera public pinch return. Earlier ratio-only stream reproduced a nonmatching camera; it is not upgraded to a passed pixel comparison.',head,branch,previous:await record(previousPath),trace:{...await record(frozen),eventCount:960,previous895EventPrefixUnchanged:true},preservedRenderingInputs:await Promise.all(previous.preservedRenderingInputs.map(row=>record(row.path))),productionAndConsumerSources,sourceChanges:[...changes.values()],beforeSources,firstNativeSources:{...await record(firstNativeSourcesPath),...firstNativeSources},preservedOtherEdits:previous.preservedOtherEdits,byteExactConfigurations:previous.byteExactConfigurations,preservedCandidates,
  ordinaryWatch:{path:previous.ordinaryWatch.path,sha256:ordinaryWatch.sha256,fileCount:ordinaryWatch.fileCount,totalBytes:ordinaryWatch.totalBytes,files:ordinaryWatch.files,log:await record(watch),sourceCompileAtLocal:'2026-10-01 19:44:50',scope:'Same ordinary watch includes six preserved unrelated edits; no clean candidate/official package claim.'},
  native:{current,currentView,files,exit,readback,pixels:await record(pixelsPath),legacyRatio:{fovDeg:legacy.afterView.verticalFovDeg,exactCameraEqual:false,changedPixels:218,maxDelta:8},matchedInputReturn:{exactCameraEqual:true,changedPixels:11,maxDelta:1,unchangedEncodedFileDigestsAndSequences:true},inputs:['local','return','matched-local','matched-return'].map(name=>({stage:'zoom-camera-'+name+'-input',value:stage('zoom-camera-'+name+'-input')})),composition:'FAILED_DEVTOOLS',firstComparisonSourceScope:'Actual native pairs used the first source snapshot; final source adds only the explicit unmounted metadata fence. Final compiler/PNG/current view independently observed, not a repeated pixel pair.'},
  captures,inspectedCaptureStages:captureNames.map(name=>'zoom-camera-'+name),checks,scripts,
  verifiedExecution:{affected:{exitCode:0,pass:24,fail:0},unmountedBefore:{exitCode:1,scope:'Actual public attribute must clear a retained snapshot when the native Canvas is unmounted'},miniTypecheck:{exitCode:0},contextStructure:{exitCode:0},nativePixelComparison:{exitCode:0,scope:'Same-camera pair within unchanged maxDelta1 bound; mismatched-camera pair explicitly classified, not accepted'},whitespace:{exitCode:0},retainedFailures:['One read-only native GL introspection returned success=false/error=null; subsequent public page read was healthy. No restart or GL/runtime wrapper installed.', 'Initial test optional-property fixtures failed strict type checking, then used actually omitted optional properties.'],review:'Primary-agent only; independent shared and final review GAP'},
  inheritedStrictLocalPixelFailure:{binding:previous.inheritedStrictLocalPixelFailure.binding,pixels:previous.inheritedStrictLocalPixelFailure.pixels,result:'Historical875 strict209/max8 remains failed, without reconstructed old camera. Current legacy stream proves current camera mismatch; matching stream supplies a separate finite result.'},
  limits:['Non-authoritative readback uses the completed production picking snapshot in logical pixels/ENU; no recomputed pose, GL uniform claim, private Context or new diagnostic mode.', 'No changes to renderer, zoom thresholds, projection, camera behavior, texture/file ownership, image sources or publication. First native pair sources and final mounted metadata fence are explicitly separated.', 'Actual ordinary WXML remains FAILED_DEVTOOLS; source/SDK/finite scene pixels do not establish visible interaction, physical multi-touch, all views/modes or full target journey.', 'Reference quality/coverage, calibration/journey, Android+iOS/new Moon, firstscreen/frames/total resources/weak network/official package/cost and independent review remain open.', 'No new download, phone operation, watch/window, candidate replacement, Git commit/push or deployment. Goal active,unbudgeted,incomplete.']},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({output,eventCount:960,sourceChanges:[...changes.keys()],matchedCamera:true,matchedPixels:{changed:11,maxDelta:1},legacyCamera:'DIFFERENT',composition:'FAILED_DEVTOOLS',review:'GAP'}));
