import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fingerprintBundle} from '../../../../tools/miniapp/release-bundle-artifact.mjs';

const task='.codex/work-items/cloud-sky-native-2026-09-22';
const output=task+'/evidence/experience-environment-display-binding-2026-10-01.json';
const frozen=task+'/evidence/experience-environment-display-events-frozen-2026-10-01.jsonl';
const watch=task+'/evidence/experience-environment-display-watch-frozen-2026-10-01.log';
for(const file of [output,frozen,watch])await assert.rejects(fs.access(file),{code:'ENOENT'});
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const record=async file=>{const bytes=await fs.readFile(file);return{path:file.replaceAll('\\','/'),bytes:bytes.length,sha256:sha(bytes)};};
const json=async file=>JSON.parse(await fs.readFile(file,'utf8'));
const previousPath=task+'/evidence/experience-conditional-cache-binding-2026-10-01.json';
const previous=await json(previousPath);
assert.equal(previous.trace.eventCount,628);
const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const branch=execFileSync('git',['branch','--show-current'],{encoding:'utf8'}).trim();
assert.equal(head,previous.head);assert.equal(branch,previous.branch);
const rendererPath='apps/wechat-miniapp/src/features/sky/sky-gpu-renderer.ts';
const permitted=new Set([rendererPath,'apps/wechat-miniapp/src/features/sky/spot-sky-page.tsx',
  'project_context/areas/main/screen-contracts/wechat-miniapp/spot-and-sky.md']);
const changes=new Map();
for(const row of [...previous.preservedRenderingInputs,...previous.productionAndConsumerSources]){
  const current=await record(row.path);
  if(current.sha256!==row.sha256){assert(permitted.has(row.path),row.path);
    changes.set(row.path,{path:row.path,beforeSha256:row.sha256,afterSha256:current.sha256});}
}
assert(changes.has(rendererPath));assert(changes.has('apps/wechat-miniapp/src/features/sky/spot-sky-page.tsx'));
for(const row of [...previous.preservedOtherEdits,...previous.byteExactConfigurations])
  assert.equal((await record(row.path)).sha256,row.sha256,row.path);
const preservedCandidates=[];
for(const row of previous.preservedCandidates){const current=await fingerprintBundle(path.resolve(row.path));
  assert.equal(current.sha256,row.sha256);preservedCandidates.push({path:row.path,sha256:current.sha256,fileCount:current.fileCount});}

const sourcePaths=new Set(previous.productionAndConsumerSources.map(row=>row.path));
for(const name of ['sky-gpu-renderer.ts','sky-scene-render.ts','sky-solar-light.ts','sky-solar-light.test.ts',
  'sky-landscape.ts','sky-landscape-geometry.ts','sky-landscape.test.ts','sky-landscape-mask.test.ts',
  'sky-star-appearance.test.ts','sky-alignment-render.test.ts','sky-coordinate-grid.test.ts'])
  sourcePaths.add('apps/wechat-miniapp/src/features/sky/'+name);
for(const name of ['native-metrics.ts','native-metrics.test.ts','native-chrome.ts','native-chrome.test.ts'])
  sourcePaths.add('apps/wechat-miniapp/src/theme/'+name);
sourcePaths.add('project_context/areas/main/screen-contracts/wechat-miniapp/spot-and-sky.md');
const productionAndConsumerSources=await Promise.all([...sourcePaths].map(record));
const beforeSource=await record(task+'/tmp/environment-transfer-before-renderer-2026-10-01.ts');
assert.equal(beforeSource.sha256,previous.preservedRenderingInputs.find(row=>row.path===rendererPath).sha256);
const solarShader=source=>{const start=source.indexOf('const solarLightFragment = '),end=source.indexOf('const galacticBandFragment = `',start);
  assert(start>=0&&end>start);return source.slice(start,end).replaceAll('\r\n','\n').split('\n')
    .filter(line=>!line.trimStart().startsWith('//')).join('\n');};
const renderer=await fs.readFile(rendererPath,'utf8');
const trialPath='output/playwright/cloud-sky-twilight-pipeline-1001/experiment-renderer.ts';
assert.equal(solarShader(renderer),solarShader(await fs.readFile(trialPath,'utf8')));

const compositionPath='output/playwright/cloud-sky-environment-pipeline-1001-r2/result.json';
const composition=await json(compositionPath);
assert.equal(composition.versions.length,2);
for(const version of composition.versions){
  assert.equal(version.rows.length,26);assert.equal(version.retired.glError,0);assert.equal(version.errors.length,0);
  assert(Object.values(version.retired.resources).every(value=>value===0));
  for(const row of version.sourceHashes)if(row.path!==rendererPath)assert.equal((await record(row.path)).sha256,row.sha256,row.path);
  for(const row of version.rows){assert.equal(row.glError,0);assert.equal(row.failed,0);
    assert.equal((await record(path.dirname(compositionPath)+'/'+row.image)).sha256,row.imageSha256);}
}
assert.equal(composition.regression.unchangedNightAndRed.length,14);
assert(composition.regression.identityAndPickingUnchanged&&composition.regression.noAdditionalGpuResources);
for(const name of composition.regression.unchangedNightAndRed){const rows=composition.versions.map(v=>v.rows.find(row=>row.condition.name===name));
  assert.equal(rows[0].rgbaSha256,rows[1].rgbaSha256);}
for(const input of composition.inputRecords.filter(row=>row.path))
  assert.equal((await record(input.path)).sha256,input.sha256,input.path);
const regressionPath='output/playwright/cloud-sky-environment-display-regression-1001-current-final/result.json';
const beforeRegressionPath='output/playwright/cloud-sky-environment-display-regression-1001-before/result.json';
const regression=await json(regressionPath),beforeRegression=await json(beforeRegressionPath);
assert(beforeRegression.lumaMeanAbsoluteError>79&&regression.lumaMeanAbsoluteError<40);
for(const row of regression.sources)if(row.path!==rendererPath)assert.equal((await record(row.path)).sha256,row.sha256,row.path);
assert(regression.transitions.every(row=>row.maxChannelDelta<=1));
assert(Object.values(regression.retired).every(value=>value===0));assert.equal(regression.glError,0);
const mattePath='output/playwright/cloud-sky-native-chrome-matte-1001-current-final/result.json';
const matte=await json(mattePath);assert.equal(matte.sourceSha256,sha(renderer));assert.equal(matte.results.length,9);
for(const row of matte.sourceHashes)assert.equal((await record(row.path)).sha256,row.sha256,row.path);
for(const row of matte.results){assert.equal(row.wrongChromePixels,0);assert.equal(row.changedContentPixels,0);
  assert.equal(row.scissorLeaked,false);assert(row.glErrors.every(value=>value===0));assert(Object.values(row.retired).every(value=>value===0));}
const pixelPath=task+'/evidence/experience-environment-native-pixels-final-2026-10-01.json';
const pixels=await json(pixelPath);assert.equal(pixels.sceneRegion.changedPixels,0);assert.equal(pixels.sceneRegion.maximumChannelDelta,0);
assert(pixels.whiteForegroundContrast.before<2&&pixels.whiteForegroundContrast.current>19);
for(const row of pixels.inputs)assert.equal((await record(row.path)).sha256,row.sha256);

const raw=await fs.readFile(task+'/evidence/experience-current-native-events-2026-10-01.jsonl');
const prefix=await fs.readFile(previous.trace.path);assert(raw.subarray(0,prefix.length).equals(prefix));
assert(!/\?[^"\r\n]*(?:contextId=|spotId=)/.test(raw.toString()));
const events=raw.toString().trim().split(/\r?\n/).map(JSON.parse);
const index=name=>events.findLastIndex(row=>row.stage===name);
const stage=name=>{const row=events[index(name)];assert(row,name);return row.value;};
const compileStages=['environment-display','environment-display-navigation'].map(name=>{
  const requested=index(name+'-compiler-requested');assert(requested>=previous.trace.eventCount);
  assert.equal(stage(name+'-compiler-dispatched').success,true);
  assert(index(name+'-dispatched')<index(name+'-application-seen'));
  assert(index(name+'-application-seen')<index(name+'-entry-reentered-owned-context'));
  return{name,requestedEventIndex:requested,dispatchedAt:events[index(name+'-compiler-dispatched')].at,actualApplicationSeenAt:events[index(name+'-application-seen')].at};
});
assert.equal(events.slice(previous.trace.eventCount).filter(row=>row.stage==='tool-failure').length,0);
const noon=stage('environment-display-navigation-noon-state'),dusk=stage('environment-display-navigation-dusk-state');
const restored=stage('environment-display-navigation-restored-state'),current=stage('environment-display-navigation-settled-state');
for(const [scene,at,count] of [[noon,'2026-09-30T04:00:00.000Z',4142],[dusk,'2026-09-30T10:30:00.000Z',4093],
  [restored,'2026-09-30T13:50:33.000Z',4051],[current,'2026-09-30T13:50:33.000Z',4051]]){
  assert.equal(scene.route,'sky/detail/index');assert.equal(scene.canvas.labelFacts.presented,true);
  assert.equal(scene.canvas.labelFacts.verticalFovDeg,45);assert.equal(scene.canvas.labelFacts.frameAt,at);
  assert.equal(scene.canvas.labelFacts.starCount,count);assert.equal(scene.selection.length,0);assert.equal(scene.modal.length,0);
  assert(!scene.actions.some(row=>row.text.startsWith('重试')));
}
assert(noon.time.some(row=>row.text==='12:00:00 预览'));assert(dusk.time.some(row=>row.text==='18:30:00 预览'));
assert.equal(current.status.length,0);assert.equal(current.time.length,0);
const digest=name=>{const value=stage(name);assert.equal(value.failed,0);return{...value,count:value.files.length,
  encodedBytes:value.files.reduce((sum,row)=>sum+row.encodedBytes,0)};};
const files={restored:digest('environment-display-navigation-restored-files-encoded-digests'),
  exit:stage('environment-display-navigation-exit-encoded'),final:digest('environment-display-navigation-settled-files-encoded-digests')};
assert.equal(files.restored.count,13);assert.equal(files.restored.encodedBytes,5177412);
assert.equal(files.exit.route,'pages/map/index');assert.equal(files.exit.count,0);assert.equal(files.exit.encodedBytes,0);
assert.equal(files.final.count,10);assert.equal(files.final.encodedBytes,1789615);
const readback=stage('cold-image-durable-context-readback');
assert(readback.revisionUnchanged&&readback.instantUnchanged&&readback.fingerprintUnchanged);
assert.equal(readback.revision,1);assert.equal(readback.contextPuts,0);assert.equal(readback.moduleSha256,previous.native.readback.moduleSha256);
const captures=[];
const captureNames=['environment-display-dispatched','environment-display-baseline','environment-display-noon','environment-display-dusk',
  'environment-display-restored','environment-display-navigation-dispatched','environment-display-navigation-baseline',
  'environment-display-navigation-noon','environment-display-navigation-dusk','environment-display-navigation-restored',
  'environment-display-navigation-final','environment-display-navigation-settled'];
for(const name of captureNames){const capture=await record(task+'/evidence/experience-current-native-'+name+'-2026-10-01.png');
  assert.equal(capture.sha256,stage(name).sha256);captures.push(capture);}

const checkNames=['experience-environment-display-before','experience-environment-display-current','experience-environment-display-final',
  'experience-environment-display-affected','experience-environment-display-affected-final','experience-environment-display-typecheck',
  'experience-environment-display-typecheck-final','experience-environment-display-typecheck-final2','experience-environment-display-context-check',
  'experience-native-chrome-matte-before','experience-native-chrome-matte-current','experience-native-chrome-matte-final',
  'experience-environment-native-pixels-final'];
const checks=await Promise.all(checkNames.map(name=>record(task+'/evidence/'+name+'-2026-10-01.log')));
const affected=await fs.readFile(task+'/evidence/experience-environment-display-affected-final-2026-10-01.log','utf8');
assert(affected.includes('pass 38')&&affected.includes('fail 0'));
for(const name of ['experience-environment-display-before','experience-native-chrome-matte-before'])
  assert((await fs.readFile(task+'/evidence/'+name+'-2026-10-01.log','utf8')).includes('AssertionError'));
execFileSync('git',['diff','--check'],{stdio:'pipe'});
const ordinaryWatch=await fingerprintBundle(path.resolve(previous.ordinaryWatch.path));
assert.notEqual(ordinaryWatch.sha256,previous.ordinaryWatch.sha256);
const watchBytes=await fs.readFile(task+'/tmp/weapp-sky-watch-2026-10-01.log');assert(watchBytes.toString().includes('16:31:42'));
const scriptNames=['experience-twilight-ceiling-probe-2026-10-01.mts','experience-twilight-display-pipeline-trial-2026-10-01.mts',
  'experience-environment-pipeline-harness-2026-10-01.mjs','experience-environment-pipeline-composition-2026-10-01.mts',
  'experience-environment-display-regression-2026-10-01.mts','experience-native-chrome-matte-2026-10-01.mts',
  'experience-environment-display-native-2026-10-01.ps1','experience-retired-native-files-2026-10-01.ps1',
  'experience-environment-native-pixels-2026-10-01.mjs','experience-current-native-helpers-2026-10-01.ps1',
  'experience-current-native-reenter-2026-10-01.ps1','experience-native-file-digests-2026-10-01.ps1'];
await fs.writeFile(frozen,raw,{flag:'wx'});await fs.writeFile(watch,watchBytes,{flag:'wx'});
await fs.writeFile(output,JSON.stringify({at:new Date().toISOString(),scope:'Finite environment linear-display repair and native navigation surface; public Noon/Dusk/cancel/exit/reentry, preserving the original Context. Full scene quality and Canvas/WXML remain open.',
  head,branch,previous:await record(previousPath),trace:{...await record(frozen),eventCount:events.length,previous628EventPrefixUnchanged:true,compileStages},
  preservedRenderingInputs:await Promise.all(previous.preservedRenderingInputs.map(row=>record(row.path))),productionAndConsumerSources,
  sourceChanges:[...changes.values()],beforeSources:[beforeSource],preservedOtherEdits:previous.preservedOtherEdits,
  byteExactConfigurations:previous.byteExactConfigurations,preservedCandidates,
  ordinaryWatch:{path:previous.ordinaryWatch.path,sha256:ordinaryWatch.sha256,fileCount:ordinaryWatch.fileCount,totalBytes:ordinaryWatch.totalBytes,
    files:ordinaryWatch.files,log:await record(watch),sourceCompileAtLocal:'2026-10-01 16:31:42',scope:'Ordinary shared watch includes the six preserved settings/outbox edits; not a clean candidate or official package.'},
  reference:[await record(task+'/evidence/experience-twilight-paused-reference-2026-09-30.jpg'),
    await record(task+'/evidence/experience-twilight-reference-conditions-2026-09-30.json')],
  software:{composition:await record(compositionPath),trial:await record(trialPath),regression:await record(regressionPath),beforeRegression:await record(beforeRegressionPath),
    nativeChromeMatte:await record(mattePath),conditions:26,unchangedNightAndRed:composition.regression.unchangedNightAndRed,
    created:composition.versions.map(v=>({name:v.name,...v.retired})),inputRecords:composition.inputRecords,
    solarArithmeticStillApplicable:true,finalMatteSourcesExactlyCurrent:true,
    applicability:'Complete software trial used no native inset. Final production has the same solar arithmetic, independently checked final-order native matte. Predecoded source images do not measure native loading or memory.'},
  native:{metrics:stage('environment-display-navigation-metrics'),noon,dusk,restored,current,files,readback,
    inputs:[stage('environment-display-navigation-noon-input'),stage('environment-display-navigation-dusk-input'),stage('environment-display-navigation-cancel-input')],
    pixels:await record(pixelPath),observerCorrection:stage('environment-display-navigation-exit-observer-correction'),
    composition:'FAILED_DEVTOOLS: ordinary main-Sky WXML controls still absent in actual native PNG; official SDK public input is not visible-control or physical gesture acceptance.'},
  captures,inspectedCaptureStages:['environment-display-dispatched','environment-display-baseline','environment-display-noon','environment-display-dusk',
    'environment-display-navigation-dispatched','environment-display-navigation-baseline','environment-display-navigation-noon','environment-display-navigation-dusk','environment-display-navigation-settled'],
  inspectedSoftwareImages:['output/playwright/cloud-sky-environment-pipeline-1001-r2/current-reference-twilight.png',
    'output/playwright/cloud-sky-environment-pipeline-1001-r2/current-west-noon.png',
    'output/playwright/cloud-sky-environment-pipeline-1001-r2/current-reference-twilight-all-grids.png',
    'output/playwright/cloud-sky-environment-pipeline-1001-r2/current-twilight-dome.png'],
  checks,verifiedExecution:{beforeDisplay:{exitCode:1,lumaMeanAbsoluteError:beforeRegression.lumaMeanAbsoluteError},
    afterDisplay:{exitCode:0,lumaMeanAbsoluteError:regression.lumaMeanAbsoluteError},beforeMatte:{exitCode:1,wrongChromePixels:17160},
    afterMatte:{exitCode:0,conditions:9},affected:{exitCode:0,pass:38,fail:0},miniTypecheck:{exitCode:0},contextStructure:{exitCode:0},whitespace:{exitCode:0},
    verificationCorrections:['Initial binder referenced a nonexistent plural grid-test filename and stopped before freezing; corrected from the actual file inventory.',
      'Initial probe used incorrect observer field names and stopped before rendering; initial output retained.',
      'Composition binding guard originally excluded an additional grid/figure condition; current publication validation retained, local existing asset allowed.',
      'Initial optional undefined native inset failed exactOptionalPropertyTypes; page now passes a numeric maximum of individually validated metrics, final2 typecheck passes.',
      'Sky-only file observer correctly refused Map; corrected observer requires Map before read-only owned-prefix census.',
      'First native pixel exact RGB expectation failed on red 9 versus base 8; original JSON retained, final regression permits at most one encoded step and requires scene-region equality.'],
    firstPixelDiagnostic:await record(task+'/evidence/experience-environment-native-pixels-2026-10-01.json'),
    review:'Primary-agent source/output inspection; independent shared and final delivery review remains GAP'},
  scripts:await Promise.all(scriptNames.map(name=>record(task+'/scripts/'+name))),
  limits:['Display transfer corrects a finite compressed-luminance defect. Reference lower-band brightness and upper-sky hue still differ; exposure/fixed single scattering are not local photometry or real-time weather.',
    'The 14 unchanged night/red whole-scene arrays apply to software native-inset zero; the measured native navigation surface intentionally covers the interface area after all layers.',
    '13 warm encoded files / 5,177,412B after preview is an observation, not a leak diagnosis or decoded/GPU/OS/GC total; public exit zero and fresh reentry ten are verified.',
    'API window 390x762, element logical 390.4x844 and native screenshot 427x919 are distinct observations; do not assume a shared viewport or physical phone.',
    'No SAO/W3/fine solar/Moon refinement in this software matrix; prior SAO/source and new Moon target obligations retain their original evidence scope.',
    'Full quality/coverage, calibration/journey, physical input/Android+iOS/new Moon, first-screen/frames/total resources/weak network/package/cost and independent review remain unverified.',
    'No source download, phone action, new watch/window, candidate replacement, Git commit/push or deploy. Goal active/unbudgeted/incomplete.']
},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({output,eventCount:events.length,sourceChanges:[...changes.keys()],preservedEdits:previous.preservedOtherEdits.length,
  files:{warm:files.restored.count,exit:files.exit.count,reentered:files.final.count},composition:'FAILED_DEVTOOLS',review:'GAP'}));
