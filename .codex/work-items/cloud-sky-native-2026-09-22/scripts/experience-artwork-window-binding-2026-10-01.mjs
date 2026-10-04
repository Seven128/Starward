import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {build} from 'esbuild';
import {fingerprintBundle} from '../../../../tools/miniapp/release-bundle-artifact.mjs';
const task='.codex/work-items/cloud-sky-native-2026-09-22';
const stem=task+'/evidence/experience-artwork-window';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const record=async file=>{const bytes=await fs.readFile(file);return{path:file,bytes:bytes.length,sha256:sha(bytes)};};
const json=async file=>JSON.parse(await fs.readFile(file,'utf8'));
const output=stem+'-binding-2026-10-01.json';await assert.rejects(fs.access(output),{code:'ENOENT'});
const previousPath=task+'/evidence/experience-fixed-image-cold-binding-2026-10-01.json',previous=await json(previousPath);
assert.equal(previous.trace.eventCount,1254);
const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),branch=execFileSync('git',['branch','--show-current'],{encoding:'utf8'}).trim();
assert.equal(head,previous.head);assert.equal(branch,previous.branch);
const allowed=new Set(['apps/wechat-miniapp/src/features/sky/sky-gpu-renderer.ts',
  'project_context/architecture/runtime-and-domain.md','project_context/areas/main/screen-contracts/wechat-miniapp/spot-and-sky.md']);
const sourceChanges=[],checked=new Map();
for(const row of [...previous.preservedRenderingInputs,...previous.productionAndConsumerSources,previous.additionalContext]){
  const current=await record(row.path);checked.set(row.path,current);
  if(current.sha256!==row.sha256){assert(allowed.has(row.path),'Unexpected change: '+row.path);
    if(!sourceChanges.some(source=>source.path===row.path))sourceChanges.push({path:row.path,beforeSha256:row.sha256,afterSha256:current.sha256});}
}
assert.equal(sourceChanges.length,3);
const newSources=await Promise.all(['sky-artwork-texture-window.ts','sky-artwork-texture-window.test.ts'].map(file=>record('apps/wechat-miniapp/src/features/sky/'+file)));
for(const row of [...previous.preservedOtherEdits,...previous.byteExactConfigurations])assert.equal((await record(row.path)).sha256,row.sha256,row.path);
const preservedCandidates=[];
for(const candidate of previous.preservedCandidates){const current=await fingerprintBundle(path.resolve(candidate.path));assert.equal(current.sha256,candidate.sha256);
  preservedCandidates.push({path:candidate.path,sha256:current.sha256,fileCount:current.fileCount});}
const beforeDir='output/playwright/cloud-sky-body-resource-composition-1001',afterDir=beforeDir+'-after';
const before=await json(beforeDir+'/result.json'),after=await json(afterDir+'/result.json');
for(const [directory,binding] of [[beforeDir,before],[afterDir,after]])assert.equal((await record(directory+'/production.js')).sha256,binding.productionBundleSha256);
assert.equal((await record(before.report.path)).sha256,before.report.sha256);assert.equal(before.report.sha256,after.report.sha256);
assert.equal((await record(beforeDir+'/before-renderer.ts')).sha256,sourceChanges.find(row=>row.path.endsWith('sky-gpu-renderer.ts')).beforeSha256);
const diagnosticSource=await fs.readFile(task+'/scripts/experience-body-resource-composition-2026-10-01.mts','utf8');
const match=diagnosticSource.match(/contents:\s*\n\s*"([^"\r\n]*)"/);assert(match);
const compiled=await build({stdin:{resolveDir:process.cwd(),contents:match[1]},bundle:true,write:false,metafile:true,
  platform:'browser',format:'iife',globalName:'bodyComposition',target:'es2022',tsconfig:path.resolve('apps/wechat-miniapp/tsconfig.json')});
assert.equal(sha(compiled.outputFiles[0].text),after.productionBundleSha256,'Type annotation correction must not alter the measured executable');
const softwareSourceInputs=await Promise.all(Object.keys(compiled.metafile.inputs).filter(file=>file!=='<stdin>').map(record));
const softwareSourcesChangedSinceRun=[];
for(const source of after.sourceHashes){const current=await record(source.path);if(current.sha256!==source.sha256)softwareSourcesChangedSinceRun.push(source.path);}
assert.deepEqual(softwareSourcesChangedSinceRun,['apps/wechat-miniapp/src/features/sky/sky-artwork-texture-window.ts']);
const samplingPath='output/playwright/cloud-sky-artwork-window-sampling-1001-r2/result.json',sampling=await json(samplingPath);
assert.equal(sampling.rows.length,75);assert.equal(sampling.rows.filter(row=>row.mode==='copy-failure').length,3);
for(const row of sampling.rows){assert.equal(row.glError,0);assert.equal(row.retiredBytes,0);assert.equal(row.retiredTextures,0);
  if(row.pixelComparison)assert(row.pixelComparison.maxDelta<=1);
  if(row.mode==='copy-failure'){assert.equal(row.passes.at(-1).copies,1);assert.equal(row.pixelComparison.changedPixels,0);}}
for(const asset of sampling.assets)assert.equal((await record(asset.file)).sha256,asset.sha256);
const sampleAssets=await Promise.all(sampling.assets.map(asset=>record(asset.file)));
const raw=await fs.readFile(task+'/evidence/experience-current-native-events-2026-10-01.jsonl'),prefix=await fs.readFile(previous.trace.path);
assert(raw.subarray(0,prefix.length).equals(prefix));
const events=raw.toString().trim().split(/\r?\n/).map(JSON.parse);assert.equal(events.length,1325);
const index=stage=>events.findLastIndex(row=>row.stage===stage),event=stage=>{const row=events[index(stage)];assert(row,stage);return row.value;};
assert(index('artwork-window-compiler-dispatched')<index('artwork-window-dispatched'));
assert(index('artwork-window-dispatched')<index('artwork-window-application-seen'));
assert(index('artwork-window-application-seen')<index('artwork-window-entry-reentered-owned-context'));
const readback=event('cold-image-durable-context-readback');assert.equal(readback.moduleSha256,'175d2b11a711ab83a3b0def4018de7afec6dfcaed70ab65f208722874057a9f7');
assert.equal(readback.revision,1);assert(readback.instantUnchanged&&readback.revisionUnchanged&&readback.fingerprintUnchanged);assert.equal(readback.contextPuts,0);
const northView=event('artwork-window-north-view').view,finalView=event('artwork-window-final-view').view;
assert.deepEqual(northView,finalView);assert.deepEqual(finalView,previous.native.views.final);
const moonSha1='04b98767ae58f45ca6d9226d2603aa38835cdd16';
const localFiles=event('artwork-window-local-files-encoded-digests'),returnFiles=event('artwork-window-return45-files-encoded-digests');
assert.deepEqual(localFiles.files,returnFiles.files);assert.equal(localFiles.failed,0);
assert.equal(localFiles.files.find(file=>file.sha1===moonSha1).requestSequence,13);
assert.equal(event('artwork-window-source-hidden-files').count,0);assert.equal(event('artwork-window-public-exit-files').count,0);
const sourceBackFiles=event('artwork-window-source-return-files-encoded-digests');assert.equal(sourceBackFiles.files.find(file=>file.sha1===moonSha1).requestSequence,20);
const initialTrackingUi=events.findLast(row=>row.stage==='artwork-window-moon-track-current'&&row.value.canvas)?.value;
assert(initialTrackingUi);assert.equal(initialTrackingUi.canvas.serializedFactsPresent,false);
assert.equal(event('artwork-window-source-returned-state').canvas.serializedFactsPresent,true);
assert.equal(event('artwork-window-return-camera-view').view.verticalFovDeg,45);
const finalFiles=event('artwork-window-final-files-encoded-digests');assert.equal(finalFiles.files.length,9);
assert.equal(finalFiles.files.reduce((sum,file)=>sum+file.encodedBytes,0),934831);
assert.deepEqual(finalFiles.files.map(file=>file.requestSequence).sort((a,b)=>a-b),[31,32,33,34,35,36,37,38,39]);
assert.equal(events.slice(1254).filter(row=>row.stage==='tool-failure').length,1);
assert(index('tool-failure')<index('artwork-window-source-check-correction'));
const captureNames=['artwork-window-dispatched','artwork-window-north','artwork-window-moon-track-current','artwork-window-local',
  'artwork-window-return45','artwork-window-source','artwork-window-source-return','artwork-window-final'];
const captures=[];for(const stage of captureNames){const current=await record(task+'/evidence/experience-current-native-'+stage+'-2026-10-01.png');assert.equal(current.sha256,event(stage).sha256);captures.push(current);}
const pixelsPath=stem+'-native-pixels-2026-10-01.json',pixels=await json(pixelsPath);
assert.deepEqual(pixels.rows.map(row=>[row.region.changedPixels,row.region.maxDelta]),[[5,1],[4,1]]);
const checks=await Promise.all(['before','after','affected','typecheck','typecheck-final','native-pixels','context-check'].map(name=>record(stem+'-'+name+'-2026-10-01.log')));
assert((await fs.readFile(stem+'-before-2026-10-01.log','utf8')).includes('3407872 !== 0'));
assert((await fs.readFile(stem+'-affected-2026-10-01.log','utf8')).includes('pass 20'));
assert((await fs.readFile(stem+'-typecheck-2026-10-01.log','utf8')).includes('TS2769'));
const tracePath=stem+'-events-frozen-2026-10-01.jsonl',watchPath=stem+'-watch-frozen-2026-10-01.log';
await fs.writeFile(tracePath,raw,{flag:'wx'});
const watchBytes=await fs.readFile(task+'/tmp/weapp-sky-watch-2026-10-01.log');assert(watchBytes.toString().includes('23:24:12'));
await fs.writeFile(watchPath,watchBytes,{flag:'wx'});
const watch=await fingerprintBundle(path.resolve(previous.ordinaryWatch.path));assert.notEqual(watch.sha256,previous.ordinaryWatch.sha256);
const scripts=await Promise.all(['experience-body-resource-composition-2026-10-01.mts','experience-artwork-window-gpu-2026-10-01.mts',
  'experience-artwork-window-pixels-2026-10-01.mjs','experience-artwork-window-check-2026-10-01.mjs','experience-artwork-window-docs-2026-10-01.mjs',
  'experience-artwork-window-binding-2026-10-01.mjs','experience-current-native-helpers-2026-10-01.ps1','experience-current-native-reenter-2026-10-01.ps1',
  'experience-fixed-image-cold-source-2026-10-01.ps1','experience-native-file-digests-2026-10-01.ps1','experience-zoom-camera-native-2026-10-01.ps1',
  'experience-retired-native-files-2026-10-01.ps1','experience-cold-image-native-2026-10-01.ps1'].map(file=>record(task+'/scripts/'+file)));
const warm=row=>row.passes[2].uploads.filter(row=>row.operation==='source-upload').reduce((sum,row)=>sum+row.bytes,0);
const moonBefore=before.rows.find(row=>row.name==='moon-45'),moonAfter=after.rows.find(row=>row.name==='moon-45');
assert.equal(warm(moonBefore),3407872);assert.equal(warm(moonAfter),0);
const binding={at:new Date().toISOString(),scope:'Bounded shared registered-image original-texel residency and whole-scene Moon45 resource improvement; not final target acceptance',head,branch,previous:await record(previousPath),sourceChanges,newSources,
  preservedRenderingInputs:await Promise.all(previous.preservedRenderingInputs.map(row=>record(row.path))),
  productionAndConsumerSources:[...await Promise.all(previous.productionAndConsumerSources.map(row=>record(row.path))),...newSources],
  additionalContext:await record(previous.additionalContext.path),preservedOtherEdits:previous.preservedOtherEdits,byteExactConfigurations:previous.byteExactConfigurations,preservedCandidates,
  software:{before:await record(beforeDir+'/result.json'),current:await record(afterDir+'/result.json'),sampling:await record(samplingPath),sampleAssets,softwareSourceInputs,
    currentExecutableSha256:after.productionBundleSha256,postMeasurementTypeAnnotationOnly:true,exactExecutableRecompile:true,
    moon45:{beforeWarmUpload:warm(moonBefore),currentWarmUpload:warm(moonAfter),beforeWarmPeak:moonBefore.passes[2].peakBytes,currentWarmPeak:moonAfter.passes[2].peakBytes,
      sourceRgbaModel:moonAfter.sourceRgbaBytes,pixelComparison:moonAfter.pixelComparison},wide123WarmUnresolved:warm(after.rows.find(row=>row.name.startsWith('moon-123')))},
  trace:{...await record(tracePath),eventCount:1325,previous1254PrefixUnchanged:true,newToolFailures:1},
  native:{northView,finalView,sourceBackView:event('artwork-window-return-camera-view').view,localFiles,returnFiles,sourceBackFiles,finalFiles,readback,
    sourceHidden:event('artwork-window-source-hidden-files'),publicExit:event('artwork-window-public-exit-files'),
    initialTrackingCamera:'Unavailable; no qualified Moon/Source pixel comparison claimed. Full current camera readback restored on Source Back.',
    verifierCorrections:'Map-only check on Source rejected; explicit correction follows. Source page own files0 remains valid. A guessed non-existent action was blocked before mutation and corrected from observed current 月球 action.'},
  captures,inspectedCaptureStages:captureNames,pixels:await record(pixelsPath),checks,scripts,
  ordinaryWatch:{path:previous.ordinaryWatch.path,sha256:watch.sha256,fileCount:watch.fileCount,totalBytes:watch.totalBytes,files:watch.files,log:await record(watchPath),
    sourceCompileAtLocal:'2026-10-01 23:24:12',scope:'Existing ordinary watch includes six unrelated modifications; not clean candidate/official package'},
  verifiedExecution:{beforeWarmRegression:{exitCode:1},afterWarmRegression:{exitCode:0},affected:{exitCode:0,pass:20,fail:0},
    firstTypecheck:{exitCode:2,reason:'Generic accumulator tuple inference'},finalMiniTypecheck:{exitCode:0},firstSamplingHarness:{exitCode:1,reason:'Unneeded SDSS DETAIL crop did not copy; verifier eligibility corrected in separate r2'},
    sampling:{exitCode:0,qualifyingCopyFallbacks:3},contextStructure:{exitCode:0},nativeFinitePixels:{exitCode:0,strictStatus:'DIFFERENT,5/max1 and4/max1'},review:'Independent shared/final review GAP'},
  limits:['Warm upload/peak is measured software WebGL transfer/allocation bookkeeping; source RGBA is a model. Native decoded/driver/OS/GC peaks and target FPS/firstscreen remain open.',
    'No source resample, demand reduction, new cache/budget, publisher edits or scientific-mask inference. Registered W3/SDSS alpha/composite/source-quality mechanisms have bounded sampling evidence only.',
    'Moon123° still reuploads5,767,168B; a wide/uncertain certificate keeps the full source. Software Moon45 4/max1 and native North differences remain strictly DIFFERENT; older875/1254 ROI failures remain failed.',
    'Neptune0.1° is below the actual4px texture threshold;16whole-scene cases do not claim all7fixedbodyimages were drawn. Correct0.05° source geometry qualifies; prior diagnostic wrongly supplying body as center is discarded.',
    'WXML full composition FAILED_DEVTOOLS; physical touch/calibration, all source quality/coverage/registration, full journey, Android/iOS/new Moon, weaknet/package/cost and independent review remain unverified.',
    'No native phone operation, new Moon acquisition/processing, restart investigation, new session/watch/candidate, Git commit/push/merge/deploy. Goal active,unbudgeted,incomplete.']};
await fs.writeFile(output,JSON.stringify(binding,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({output,eventCount:1325,sourceChanges:sourceChanges.length,newSources:newSources.length,sourceGuardChecked:checked.size,
  moonWarmBefore:warm(moonBefore),moonWarmAfter:warm(moonAfter),watchFiles:watch.fileCount,watchSha256:watch.sha256,review:'GAP'}));
