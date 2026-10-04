import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fingerprintBundle} from '../../../../tools/miniapp/release-bundle-artifact.mjs';
const task='.codex/work-items/cloud-sky-native-2026-09-22',base=task+'/evidence/experience-time-collapse';
const output=base+'-binding-2026-10-01.json',frozen=base+'-events-frozen-2026-10-01.jsonl',watch=base+'-watch-frozen-2026-10-01.log';
for(const file of [output,frozen,watch])await assert.rejects(fs.access(file),{code:'ENOENT'});
const record=async file=>{const bytes=await fs.readFile(file);return{path:file.replaceAll('\\','/'),bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')};};
const json=async file=>JSON.parse(await fs.readFile(file,'utf8'));
const previousPath=task+'/evidence/experience-zoom-camera-binding-2026-10-01.json',previous=await json(previousPath);
assert.equal(previous.trace.eventCount,960);
const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),branch=execFileSync('git',['branch','--show-current'],{encoding:'utf8'}).trim();
assert.equal(head,previous.head);assert.equal(branch,previous.branch);
const page='apps/wechat-miniapp/src/features/sky/spot-sky-page.tsx',context='project_context/areas/main/screen-contracts/wechat-miniapp/spot-and-sky.md';
const added='apps/wechat-miniapp/src/features/sky/sky-time-disclosure.test.ts',permitted=new Set([page,context]),changes=new Map();
for(const row of [...previous.preservedRenderingInputs,...previous.productionAndConsumerSources]){
  const current=await record(row.path);if(current.sha256!==row.sha256){assert(permitted.has(row.path),row.path);changes.set(row.path,{path:row.path,beforeSha256:row.sha256,afterSha256:current.sha256});}
}
assert.equal(changes.size,2);
const beforeSources=await json(base+'-before-sources-2026-10-01.json');
for(const row of beforeSources){assert.equal((await record(row.beforePath)).sha256,row.sha256);assert.equal(changes.get(row.path).beforeSha256,row.sha256);}
assert(!previous.productionAndConsumerSources.some(row=>row.path===added));
for(const row of [...previous.preservedOtherEdits,...previous.byteExactConfigurations])assert.equal((await record(row.path)).sha256,row.sha256,row.path);
const preservedCandidates=[];
for(const row of previous.preservedCandidates){const current=await fingerprintBundle(path.resolve(row.path));assert.equal(current.sha256,row.sha256);preservedCandidates.push({path:row.path,sha256:current.sha256,fileCount:current.fileCount});}
const raw=await fs.readFile(task+'/evidence/experience-current-native-events-2026-10-01.jsonl'),prefix=await fs.readFile(previous.trace.path);
assert(raw.subarray(0,prefix.length).equals(prefix));assert(!/\?[^"\r\n]*(?:contextId=|spotId=)/.test(raw.toString()));
const events=raw.toString().trim().split(/\r?\n/).map(JSON.parse),index=name=>events.findLastIndex(row=>row.stage===name);
const stage=name=>{const row=events[index(name)];assert(row,name);return row.value;};
assert.equal(events.length,1045);assert.equal(events.slice(960).filter(row=>row.stage==='tool-failure').length,0);
const capability=stage('native-compositor-skyline-capability');assert.equal(capability.isSupported,false);assert.equal(capability.reason,'a-b test not enabled');
const before=stage('time-collapse-before-baseline'),paused=events.findLast(row=>row.stage==='time-collapse-before-paused'&&row.value?.canvas)?.value,
  closed=stage('time-collapse-before-closed-settled');
assert(paused,'Preserve both the readback and same-stage PNG; select the readback by its actual shape');
const committed='2026-09-30T13:50:33.000Z';
assert.equal(before.canvas.labelFacts.frameAt,committed);assert.equal(paused.canvas.labelFacts.frameAt,'2026-09-30T13:50:37.947Z');
assert.equal(closed.canvas.labelFacts.frameAt,paused.canvas.labelFacts.frameAt);assert.equal(closed.time.length,0);
assert.equal(stage('time-collapse-before-recovered').canvas.labelFacts.frameAt,committed);
assert.equal(stage('time-collapse-compiler-dispatched').success,true);
assert(index('time-collapse-compiler-requested')<index('time-collapse-dispatched'));
assert(index('time-collapse-dispatched')<index('time-collapse-application-seen'));
assert(index('time-collapse-application-seen')<index('time-collapse-entry-reentered-owned-context'));
const flows=['paused-close','playing-list','playing-close'].map(flow=>{
  const value=stage('time-collapse-after-'+flow+'-assertion');assert.equal(value.flow,flow);
  assert(Date.parse(value.playingFrameAt)>Date.parse(committed));assert.equal(value.returnedFrameAt,committed);assert(value.noTimeDisclosure);return value;
});
const reopened=stage('time-collapse-after-reopen-assertion');assert(reopened.noHiddenPreview&&reopened.playReady);assert.equal(reopened.at,committed);
const current=stage('time-collapse-final-state');assert.equal(current.route,'sky/detail/index');assert.equal(current.canvas.labelFacts.frameAt,committed);
assert.equal(current.canvas.labelFacts.starCount,4051);assert.equal(current.canvas.labelFacts.verticalFovDeg,45);
assert.equal(current.time.length,0);assert.equal(current.selection.length,0);assert.equal(current.modal.length,0);
const files=stage('time-collapse-final-encoded-digests');assert.equal(files.failed,0);assert.equal(files.files.length,9);
assert.equal(files.files.reduce((sum,row)=>sum+row.encodedBytes,0),934831);
assert.deepEqual(files.files,previous.native.files['zoom-camera-final'].files);
const readback=stage('cold-image-durable-context-readback');assert(readback.revisionUnchanged&&readback.instantUnchanged&&readback.fingerprintUnchanged);
assert.equal(readback.revision,1);assert.equal(readback.contextPuts,0);assert.equal(readback.moduleSha256,previous.native.readback.moduleSha256);
const captureNames=['before-paused','before-closed','dispatched','after-paused-close','after-playing-list','after-playing-close','final'];
const captures=[];for(const name of captureNames){const value=await record(task+'/evidence/experience-current-native-time-collapse-'+name+'-2026-10-01.png');assert.equal(value.sha256,stage('time-collapse-'+name).sha256);captures.push(value);}
assert.equal(stage('time-collapse-final-inspected').completeAcceptance,false);
const names=['before-regression','before-final-regression','affected','affected-final','typecheck','context-check'];
const checks=await Promise.all(names.map(name=>record(base+'-'+name+'-2026-10-01.log')));
const old=await fs.readFile(base+'-before-final-regression-2026-10-01.log','utf8');assert(old.includes('pass 6')&&old.includes('fail 4'));
assert(old.includes('closing time disclosure must restore the committed instant'));
const affected=await fs.readFile(base+'-affected-final-2026-10-01.log','utf8');assert(affected.includes('pass 35')&&affected.includes('fail 0'));
assert.equal((await fs.readFile(base+'-typecheck-2026-10-01.log','utf8')).trim(),'');
assert((await fs.readFile(base+'-context-check-2026-10-01.log','utf8')).includes('Checked manifest paths'));
execFileSync('git',['diff','--check'],{stdio:'pipe'});
const ordinaryWatch=await fingerprintBundle(path.resolve(previous.ordinaryWatch.path)),watchBytes=await fs.readFile(task+'/tmp/weapp-sky-watch-2026-10-01.log');
assert(watchBytes.toString().includes('20:31:13'));
const scripts=await Promise.all(['experience-time-collapse-native-2026-10-01.ps1','experience-time-collapse-binding-2026-10-01.mjs'].map(name=>record(task+'/scripts/'+name)));
await fs.writeFile(frozen,raw,{flag:'wx'});await fs.writeFile(watch,watchBytes,{flag:'wx'});
await fs.writeFile(output,JSON.stringify({at:new Date().toISOString(),scope:'Time disclosure cancels playback/located preview at the existing presentation-time owner; current SDK/Canvas development flow, not complete visible/native target acceptance.',head,branch,
  previous:await record(previousPath),trace:{...await record(frozen),eventCount:1045,previous960EventPrefixUnchanged:true},beforeSources,
  sourceChanges:[...changes.values()],addedSource:await record(added),
  preservedRenderingInputs:await Promise.all(previous.preservedRenderingInputs.map(row=>record(row.path))),
  productionAndConsumerSources:await Promise.all([...previous.productionAndConsumerSources.map(row=>row.path),added].map(record)),
  preservedOtherEdits:previous.preservedOtherEdits,byteExactConfigurations:previous.byteExactConfigurations,preservedCandidates,
  ordinaryWatch:{path:previous.ordinaryWatch.path,sha256:ordinaryWatch.sha256,fileCount:ordinaryWatch.fileCount,totalBytes:ordinaryWatch.totalBytes,files:ordinaryWatch.files,log:await record(watch),sourceCompileAtLocal:'2026-10-01 20:31:13',scope:'Same ordinary watch includes six preserved unrelated edits; not a clean/final candidate or official package.'},
  native:{before:{committedFrameAt:committed,pausedFrameAt:paused.canvas.labelFacts.frameAt,collapsedFrameAt:closed.canvas.labelFacts.frameAt,result:'FAILED_BEFORE_FIX',recoveredViaPublicCancel:true},flows,reopened,current,files,readback,composition:'FAILED_DEVTOOLS',factsScope:'Completed Canvas accessibility label reused when custom fields disappear from the dynamic public tree. No exact camera/pixel pair collected in this batch; phase960 remains its own scoped evidence.'},
  boundedCompositorResearch:{capability,configChanged:false,rendererTrialPerformed:false,decision:'No demonstrated Skyline+WEAPP WebGL path; retain current native engine. A-B disabled query and official WebView WebGL example do not establish universal Skyline incompatibility.',sources:[
    'https://docs.taro.zone/docs/skyline',
    'https://docs.taro.zone/en/docs/apis/base/system/getSkylineInfo',
    'https://github.com/wechat-miniprogram/miniprogram-demo/blob/master/miniprogram/packageComponent/pages/canvas/webgl/webgl.json',
    'https://github.com/wechat-miniprogram/miniprogram-demo/blob/master/miniprogram/packageComponent/pages/canvas/canvas-2d/canvas-2d.json']},
  captures,inspectedCaptureStages:captureNames.map(name=>'time-collapse-'+name),checks,scripts,
  verifiedExecution:{beforeFinalRegression:{exitCode:1,pass:6,fail:4,scope:'Actual frozen page public callbacks plus real page time delegates/portable clock; playback-cross-midnight counterexample'},affected:{exitCode:0,pass:35,fail:0},miniTypecheck:{exitCode:0},contextStructure:{exitCode:0},whitespace:{exitCode:0},
    retainedHarnessCorrection:'Initial affected run modeled setSkyControlPanel as synchronously mutating the current closure and failed two list cases. Final harness retains render-captured values; same final harness still fails all four defect checks against the frozen actual before source. Product repair was unchanged.',
    retainedBinderCorrection:'Initial binder selected a same-stage PNG as the paused UI readback. Select the immutable original event with actual canvas facts; no runtime replay or trace rewrite.',review:'Primary-agent only; independent shared and final review GAP'},
  inheritedStrictLocalPixelFailure:previous.inheritedStrictLocalPixelFailure,
  limits:['Paused/active close and active-play-to-list used public official SDK actions and observed painted time, without direct React state injection or sensor mock. Invisible controls/physical input not accepted.',
    'Located previews, UTC+8 midnight, saved replacement Context and editing guards are portable page-callback evidence only; no new Context PUT or actual device calibration evidence.',
    'Ordinary WXML remains FAILED_DEVTOOLS. Full reference quality, calibration/journey, Android+iOS/new Moon, total resources/firstscreen/frame times/weak network/official package/cost and independent review remain open.',
    'No engine/framework change, old composition retry, motion-mock retry, image download, phone operation, new watch/window, candidate replacement, Git commit/push or deployment. Goal active,unbudgeted,incomplete.']},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({output,eventCount:1045,sourceChanges:[...changes.keys()],added,flows:flows.map(row=>row.flow),originalTimeRestored:true,composition:'FAILED_DEVTOOLS',review:'GAP'}));
