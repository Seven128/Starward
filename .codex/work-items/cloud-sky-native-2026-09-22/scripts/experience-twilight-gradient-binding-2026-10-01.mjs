import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {PNG} from 'pngjs';
import {fingerprintBundle} from '../../../../tools/miniapp/release-bundle-artifact.mjs';
const task='.codex/work-items/cloud-sky-native-2026-09-22',base=task+'/evidence/experience-twilight-gradient';
const output=base+'-binding-2026-10-01.json',frozen=base+'-events-frozen-2026-10-01.jsonl',watch=base+'-watch-frozen-2026-10-01.log';
for(const file of [output,frozen,watch])await assert.rejects(fs.access(file),{code:'ENOENT'});
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const record=async file=>{const bytes=await fs.readFile(file);return {path:file.replaceAll('\\','/'),bytes:bytes.length,sha256:sha(bytes)};};
const json=async file=>JSON.parse(await fs.readFile(file,'utf8'));
const previousPath=task+'/evidence/experience-time-collapse-binding-2026-10-01.json',previous=await json(previousPath);
assert.equal(previous.trace.eventCount,1045);
const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),branch=execFileSync('git',['branch','--show-current'],{encoding:'utf8'}).trim();
assert.equal(head,previous.head);assert.equal(branch,previous.branch);
const renderer='apps/wechat-miniapp/src/features/sky/sky-gpu-renderer.ts',context='project_context/areas/main/screen-contracts/wechat-miniapp/spot-and-sky.md',architecture='project_context/architecture/runtime-and-domain.md';
const permitted=new Set([renderer,context,architecture]),changes=new Map();
for(const row of [...previous.preservedRenderingInputs,...previous.productionAndConsumerSources]){
  const current=await record(row.path);if(current.sha256!==row.sha256){assert(permitted.has(row.path),'Unexpected source change: '+row.path);changes.set(row.path,{path:row.path,beforeSha256:row.sha256,afterSha256:current.sha256});}
}
assert(changes.has(renderer)&&changes.has(context));
const beforeRenderer=await record('output/playwright/cloud-sky-twilight-gradient-1001/before-renderer.ts');
assert.equal(beforeRenderer.sha256,changes.get(renderer).beforeSha256);
for(const row of [...previous.preservedOtherEdits,...previous.byteExactConfigurations])assert.equal((await record(row.path)).sha256,row.sha256,row.path);
const candidates=[];for(const row of previous.preservedCandidates){const current=await fingerprintBundle(path.resolve(row.path));assert.equal(current.sha256,row.sha256);candidates.push({path:row.path,sha256:current.sha256,fileCount:current.fileCount});}
const raw=await fs.readFile(task+'/evidence/experience-current-native-events-2026-10-01.jsonl'),prefix=await fs.readFile(previous.trace.path);
assert(raw.subarray(0,prefix.length).equals(prefix));assert(!/\?[^"\r\n]*(?:contextId=|spotId=)/.test(raw.toString()));
const events=raw.toString().trim().split(/\r?\n/).map(JSON.parse),stage=name=>{const row=events.findLast(row=>row.stage===name);assert(row,name);return row.value;};
const index=name=>events.findLastIndex(row=>row.stage===name);
assert.equal(stage('twilight-gradient-compiler-dispatched').success,true);
assert(index('twilight-gradient-dispatched')<index('twilight-gradient-application-seen'));
assert(index('twilight-gradient-application-seen')<index('twilight-gradient-entry-reentered-owned-context'));
const correction=stage('twilight-gradient-after-input-order-correction');assert.equal(correction.inputSucceeded,false);assert.equal(correction.failedTools.length,2);
assert.equal(stage('twilight-gradient-after-ruler-ready').count,1);
assert(index('twilight-gradient-after-ruler-ready')<index('twilight-gradient-after-dusk-confirmed-input'));
assert.equal(stage('twilight-gradient-after-dusk-confirmed-input').success,true);
const committed='2026-09-30T13:50:33.000Z',dusk='2026-09-30T10:30:00.000Z';
const before=stage('twilight-gradient-before-dusk-state'),after=stage('twilight-gradient-after-dusk-confirmed-state'),current=stage('twilight-gradient-reentered-final-state');
assert.equal(before.canvas.labelFacts.frameAt,dusk);assert.equal(after.canvas.labelFacts.frameAt,dusk);
assert.equal(before.canvas.labelFacts.starCount,after.canvas.labelFacts.starCount);assert.equal(after.canvas.labelFacts.starCount,4093);
const beforeView=stage('twilight-gradient-before-dusk-camera-view').view,afterView=stage('twilight-gradient-after-dusk-camera-view').view;
assert.deepEqual(beforeView,afterView);
const baselineView=stage('twilight-gradient-baseline-camera-view').view,finalView=stage('twilight-gradient-reentered-final-camera-view').view;
assert.deepEqual(baselineView,finalView);
assert.equal(current.canvas.labelFacts.frameAt,committed);assert.equal(current.canvas.labelFacts.starCount,4051);assert.equal(current.canvas.labelFacts.verticalFovDeg,45);
assert.equal(current.time.length,0);assert.equal(current.selection.length,0);assert.equal(current.modal.length,0);
// The existing retired-files helper records the exact Stage. The preceding
// tap shares this stage; the immutable last event is the completed file read.
const retired=stage('twilight-gradient-exit');assert.equal(retired.route,'pages/map/index');assert.equal(retired.count,0);assert.equal(retired.encodedBytes,0);
const previewFiles=stage('twilight-gradient-final-encoded-digests'),files=stage('twilight-gradient-reentered-final-encoded-digests');
assert.equal(previewFiles.failed,0);assert.equal(files.failed,0);assert.equal(files.files.length,9);
const bodies=rows=>rows.map(({sha1,encodedBytes})=>({sha1,encodedBytes}));
assert.deepEqual(bodies(files.files),bodies(previous.native.files.files));
assert.equal(files.files.reduce((sum,row)=>sum+row.encodedBytes,0),934831);
assert.equal(previewFiles.files.length,11);assert.equal(previewFiles.files.reduce((sum,row)=>sum+row.encodedBytes,0),1006455);
const readback=stage('cold-image-durable-context-readback');assert(readback.revisionUnchanged&&readback.instantUnchanged&&readback.fingerprintUnchanged);assert.equal(readback.revision,1);assert.equal(readback.contextPuts,0);assert.equal(readback.moduleSha256,previous.native.readback.moduleSha256);
const captureNames=['baseline','before-dusk','before-restored','dispatched','after-dusk','final','reentered-final'];
const captures=[];for(const name of captureNames){const value=await record(task+'/evidence/experience-current-native-twilight-gradient-'+name+'-2026-10-01.png');assert.equal(value.sha256,stage('twilight-gradient-'+name).sha256);captures.push(value);}
assert.equal(stage('twilight-gradient-reentered-final-inspected').completeAcceptance,false);
const diff=async(a,b)=>{
  const one=PNG.sync.read(await fs.readFile(a)),two=PNG.sync.read(await fs.readFile(b));assert.equal(one.width,two.width);assert.equal(one.height,two.height);
  // Stable scene region: excludes OS clock/capsule/home indicator and rounded
  // corners. Its boundary is stated, not a full-frame/reference acceptance.
  const roi={x:1,y:91,width:425,height:799};let pixels=0,maxChannelDelta=0,absolute=0;
  for(let y=roi.y;y<roi.y+roi.height;y++)for(let x=roi.x;x<roi.x+roi.width;x++){
    const index=(y*one.width+x)*4;let changed=false;for(let c=0;c<3;c++){const d=Math.abs(one.data[index+c]-two.data[index+c]);changed||=d>0;absolute+=d;maxChannelDelta=Math.max(maxChannelDelta,d);}if(changed)pixels++;
  }return {roi,changedPixels:pixels,maxChannelDelta,meanAbsoluteChannelDelta:absolute/(roi.width*roi.height*3)};
};
const nativeNightDiff=await diff(captures[0].path,captures.at(-1).path),nativeDuskDiff=await diff(captures[1].path,captures[4].path);
assert(nativeDuskDiff.changedPixels>1000,'A successful shader call without a real image change must not pass');
const trialPath='output/playwright/cloud-sky-twilight-gradient-1001/result.json',trial=await json(trialPath),wholePath='output/playwright/cloud-sky-twilight-gradient-composition-1001/result.json',whole=await json(wholePath);
assert.equal(trial.versions[0].sourceSha256,beforeRenderer.sha256);
assert(trial.versions[1].lumaMeanAbsoluteError<15&&trial.versions[1].rgbMeanAbsoluteError<15);
assert.equal(whole.versions[0].rows.length,26);assert.equal(whole.versions[1].rows.length,26);
assert.equal(whole.regression.unchangedNightAndRed.length,14);assert(whole.regression.identityAndPickingUnchanged&&whole.regression.noAdditionalGpuResources);
const regressionPath='output/playwright/cloud-sky-twilight-gradient-regression-1001-current-final/result.json',regression=await json(regressionPath);
assert.equal(regression.sourceSha256,(await record(renderer)).sha256);assert(regression.lumaMeanAbsoluteError<15);assert(regression.transitions.every(row=>row.maxChannelDelta<=1));
const logs=['before-regression','current-regression','affected','typecheck','context-check'];
const checks=await Promise.all(logs.map(name=>record(base+'-'+name+'-2026-10-01.log')));
assert((await fs.readFile(checks[0].path,'utf8')).includes('AssertionError'));assert((await fs.readFile(checks[0].path,'utf8')).includes('finite twilight hue comparison'));
assert((await fs.readFile(checks[2].path,'utf8')).includes('pass 15'));assert((await fs.readFile(checks[2].path,'utf8')).includes('fail 0'));assert.equal((await fs.readFile(checks[3].path,'utf8')).trim(),'');assert((await fs.readFile(checks[4].path,'utf8')).includes('Checked manifest paths'));
execFileSync('git',['diff','--check'],{stdio:'pipe'});
const bundle=await fingerprintBundle(path.resolve(previous.ordinaryWatch.path)),watchBytes=await fs.readFile(task+'/tmp/weapp-sky-watch-2026-10-01.log');assert(watchBytes.toString().includes('21:26:24'));
await fs.writeFile(frozen,raw,{flag:'wx'});await fs.writeFile(watch,watchBytes,{flag:'wx'});
await fs.writeFile(output,JSON.stringify({at:new Date().toISOString(),scope:'Shared twilight gradient and less saturated indirect light, current compiled native preview/cancel/exit/reentry; development evidence only.',head,branch,previous:await record(previousPath),trace:{...await record(frozen),eventCount:events.length,previous1045EventPrefixUnchanged:true},sourceChanges:[...changes.values()],beforeRenderer,
  preservedRenderingInputs:await Promise.all(previous.preservedRenderingInputs.map(row=>record(row.path))),productionAndConsumerSources:await Promise.all(previous.productionAndConsumerSources.map(row=>record(row.path))),
  additionalContext:await record(architecture),preservedOtherEdits:previous.preservedOtherEdits,byteExactConfigurations:previous.byteExactConfigurations,preservedCandidates:candidates,
  ordinaryWatch:{path:previous.ordinaryWatch.path,sha256:bundle.sha256,fileCount:bundle.fileCount,totalBytes:bundle.totalBytes,files:bundle.files,log:await record(watch),sourceCompileAtLocal:'2026-10-01 21:26:24',scope:'Same ordinary watch includes six preserved unrelated edits; not clean/final or official package.'},
  software:{trial:await record(trialPath),composition:await record(wholePath),productionRegression:await record(regressionPath),reference:trial.reference,referenceSha256:trial.referenceSha256,
    error:{beforeLuma:trial.versions[0].lumaMeanAbsoluteError,currentLuma:trial.versions[1].lumaMeanAbsoluteError,beforeRgb:trial.versions[0].rgbMeanAbsoluteError,currentRgb:trial.versions[1].rgbMeanAbsoluteError},
    whole:{conditions:26,unchangedNightAndRed:whole.regression.unchangedNightAndRed,changed:whole.regression.changed,identityAndPickingUnchanged:true,noAdditionalGpuResources:true,retired:whole.versions.map(row=>row.retired)},
    timing:trial.versions.map(({name,softwareSynchronizedMs})=>({name,softwareSynchronizedMs})),timingScope:'Short synchronized browser command duration only; not native GPU/OS total, FPS, or target performance acceptance'},
  native:{beforeView,afterView,baselineView,finalView,current,previewFiles,files,retired,readback,nativeNightDiff,nativeDuskDiff,composition:'FAILED_DEVTOOLS',
    imageComparisonScope:'Matched complete North45 camera and same time/viewport before/after. Native18:30 is distinct from the saved Arcturus18:35:53 reference; finite scene ROI excludes OS chrome. Source/software image evidence does not prove physical gestures or visible WXML.'},captures,checks,
  verifiedExecution:{beforeGpuRegressionExit:1,currentGpuRegressionExit:0,affected:{pass:15,fail:0,exitCode:0},typecheckExit:0,contextStructureExit:0,whitespaceExit:0,retainedInputFailure:correction,
    retainedBinderCorrection:'Initial binder incorrectly guessed an -encoded suffix for the existing retired-files helper. Read its exact immutable Stage; keep failed log, no native replay or trace rewrite.',independentReview:'GAP'},
  sources:{retainedThree:'https://github.com/mrdoob/three.js/blob/r146/examples/jsm/objects/Sky.js',publishedMath:'https://www.researchgate.net/publication/380396923_Fast_Sky_Rendering_for_Daylight_Twilight',researchOnlyMinimalAtmosphere:'https://github.com/Fewes/MinimalAtmosphere',decision:'No new engine, runtime or imported source/assets. Full analytic trial did not supply a convincing warm low-sky match; unoptimized nested ray marching is not adopted. Keep small illustrative refinement with existing shader owner.'},
  inheritedStrictLocalPixelFailure:previous.inheritedStrictLocalPixelFailure,
  limits:['Twilight remains illustrative; residual low-sky brightness/color, whole scene and fixed-photo illumination remain incomplete.',
    'Native warm preview temporarily caches two additional legitimate constellation bodies; exit0/reentry restores nine original publication bodies. Request sequences advance on real reentry; they are not claimed unchanged across refresh.',
    'Current WXML FAILED_DEVTOOLS, complete calibration/journey, Android+iOS/new Moon, firstscreen/FPS/native total memory/weak network/official package/cost and independent review remain open.',
    'No repeated Moon/data processing, startup/compositor/motion mock loop, new watch/window, candidate replacement, branch/worktree/commit/push/deploy or phone operation. Goal active,unbudgeted,incomplete.']},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({output,eventCount:events.length,sourceChanges:[...changes.keys()],nativeNightDiff,nativeDuskDiff,finalEncodedBytes:934831,completeAcceptance:false}));
