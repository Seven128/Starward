import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {PNG} from 'pngjs';
import {fingerprintBundle} from '../../../../tools/miniapp/release-bundle-artifact.mjs';

const evidence=path.resolve('.codex/work-items/cloud-sky-native-2026-09-22/evidence');
const output=path.join(evidence,'experience-selection-native-validation-2026-09-29.json');
await assert.rejects(fs.access(output),{code:'ENOENT'});
const hash=async file=>createHash('sha256').update(await fs.readFile(file)).digest('hex');
const candidateFile='experience-combined-clean-v32-candidate-2026-09-29.json';
const candidate=JSON.parse(await fs.readFile(path.join(evidence,candidateFile),'utf8'));
assert.equal((await fingerprintBundle(path.resolve(candidate.bundle))).sha256,candidate.fingerprint.sha256);
for(const item of [...candidate.sourceInputs,...candidate.testInputs,...candidate.retainedSkyTests])
 assert.equal(await hash(item.file),item.sha256,item.file);
const traceFile='experience-selection-native-2026-09-29.jsonl';
const events=(await fs.readFile(path.join(evidence,traceFile),'utf8')).trim().split(/\r?\n/).map(JSON.parse);
const value=stage=>{const event=events.findLast(row=>row.stage===stage);assert(event,stage);return event.value;};
const frame=stage=>value(stage).presentedCanvasLabel;
const opacity=stage=>Number(value(stage).name.match(/opacity: ([\d.]+)/)?.[1]);
const diameter=stage=>Number(value(stage).reticle.match(/width: ([\d.]+)px/)?.[1]);
const cross=stage=>assert.match(value(stage).marker,/sky-selected-object--cross.*Altair已选中/);
const circle=stage=>assert.match(value(stage).marker,/sky-selected-object--circle.*M 31已选中/);

const context=value('v32-restored-final-context');
assert.deepEqual(context,value('v32-formal-entry-context'));
assert.deepEqual(context,value('v32-final-context'));
assert.equal(context.revision,1);assert.equal(context.publicSpotId,'spot:test-published');
assert.equal(Date.parse(context.selectedAtUtc),Date.parse('2026-09-29T13:00:00Z'));
assert.equal(context.contextIdSha256,'6dc1c04956441e9fc33e6cae8e8b5cd9b2a747d4411ae2469810525362f9ac15');
for(const stage of ['v32-altair-close-retains-selection','v32-altair-wide-selected',
 'v32-altair-name-restored','v32-natural-altair-canvas-pick','v32-natural-pick-close-retains'])cross(stage);
assert.equal(value('v32-altair-disclosure-reopened').title,'Altair');
assert.equal(value('v32-altair-disclosure-reopened').hasModal,true);
assert.equal(value('v32-altair-close-retains-selection').hasModal,false);
assert.equal(opacity('v32-altair-wide-selected'),0);
assert(opacity('v32-altair-name-restored')>0.999);
assert.equal(value('v32-blank-clears-selection').marker,'');
assert.equal(value('v32-blank-clears-selection').hasModal,false);
assert.equal(value('v32-natural-altair-canvas-pick').title,'Altair');
assert.equal(value('v32-natural-altair-canvas-pick').hasModal,true);
assert.equal(value('v32-natural-pick-close-retains').hasModal,false);
assert.equal(value('v32-switch-m31-disclosure').title,'M 31');
assert.equal(value('v32-switch-m31-disclosure').hasModal,true);
for(const stage of ['v32-m31-locate-circle','v32-m31-circle-local-scale',
 'v32-m31-circle-return-scale','v32-public-canvas-retry-retains-selection'])circle(stage);
assert(diameter('v32-m31-circle-local-scale')>2*diameter('v32-m31-locate-circle'));
assert.equal(diameter('v32-m31-circle-return-scale'),diameter('v32-m31-locate-circle'));
for(const [stage,fov] of [['v32-altair-wide-name-fade','86.8'],['v32-altair-return-name','25.0'],
 ['v32-m31-local-field','8.9'],['v32-restored-final-frame','25.0']])
 assert(frame(stage).includes(fov+' 度')&&frame(stage).includes('13:00:00.000Z'),stage);
assert.match(value('v32-sdk-injected-canvas-error').canvas,/visibility: hidden/);
assert.equal(value('v32-injected-error-hides-stale-selection').marker,'');
assert.match(frame('v32-injected-error-frame'),/天空图当前不可绘制/);
const root=value('v32-restored-root-summary');
for(const key of ['hasCanvasError','hasModal','hasList','hasChoices','hasTimePanel','hasDarkRetry','hasTracking'])assert.equal(root[key],false,key);
assert.match(root.canvas,/visibility: visible/);
assert(root.controls.includes('星座：开')&&root.controls.includes('红外：关'));
assert.equal(value('v31-project-retired').winId,'s7');assert.equal(value('v31-project-retired').success,true);
assert.equal(value('v32-project-opened').winId,'s8');assert.equal(value('v32-project-opened').success,true);
const native=value('v32-final-native');
assert.equal(native.platform,'devtools');assert.equal(native.enableDebug,false);
assert.equal(native.pagePath,'sky/detail/index');assert.equal(native.mode,'DAY');assert.equal(native.largeText,false);
const runtime=value('v32-final-runtime');
for(const key of ['contextMode','resourceMode','sourceMode'])assert.equal(runtime[key],'pass',key);
assert.equal(runtime.heldResourceCount,0);assert.equal(runtime.activeCount,0);
assert.equal(runtime.epochStartedAt,'2026-09-29T09:14:20.175Z');
const projectProcess=value('v32-project-process');assert.equal(projectProcess.Id,25916);
assert.equal(projectProcess.title,'Starward-Sky-Combined-Clean-V32-0929');
const captures=[];
for(const event of events.filter(row=>row.value?.path?.endsWith('.png'))){
 const item=event.value;assert.equal(await hash(item.path),item.sha256);
 const png=PNG.sync.read(await fs.readFile(item.path));assert.equal(png.width,479);assert.equal(png.height,1035);
 captures.push({stage:event.stage,file:path.relative(process.cwd(),item.path).replaceAll('\\','/'),
  sha256:item.sha256,width:png.width,height:png.height,viewedBy:'root',
  scope:event.stage==='canvas-error-composition'?'Still shows prior starfield despite hidden Canvas readback; not a current failure rendering proof.'
   :'Canvas/system pixels only; ordinary selection, labels, controls and modal composition absent.'});
}
assert.equal(captures.length,5);
const mapFile='apps/wechat-miniapp/src/pages/map/index.scss';const mapSha=await hash(mapFile);
assert.equal(mapSha,candidate.mapSourceSha256);
const record={scope:'v32 persistent selection and public interaction development evidence. Goal active; native visual composition and phone acceptance remain open.',
 candidate:{file:candidateFile,sha256:candidate.fingerprint.sha256,sourceInputsVerified:candidate.sourceInputs.length,
  firstBoundOwners:candidate.firstBoundOwners,priorSourceBindingGap:candidate.priorSourceBindingGap},
 trace:{file:traceFile,sha256:await hash(path.join(evidence,traceFile)),events:events.length},
 context,native,finalFrame:frame('v32-restored-final-frame'),root,runtime,projectProcess,captures,
 publicInteraction:{closeRetainsSelection:true,wideNameOpacity:opacity('v32-altair-wide-selected'),
  returnNameOpacity:opacity('v32-altair-name-restored'),blankClears:true,naturalCanvasPick:'Altair / HR:7557',
  switchedObject:'M:31',circleDiameterPx:{at25:diameter('v32-m31-locate-circle'),at8_9:diameter('v32-m31-circle-local-scale'),
   return25:diameter('v32-m31-circle-return-scale')},
  injectedCanvasError:'Official SDK error event invalidates presented selection; public retry restores same selected identity and Context. Not genuine GPU/context-loss evidence.'},
 scopeGuard:{file:mapFile,sha256:mapSha},
 corrections:['One lookup assumed M31 remained in the visible-object list; actual list did not contain it. Public M31 search then supplied the real result.',
  'Unsupported --expression was rejected before execution; native readback uses documented --fn-source and real preference owner.',
  'A pipe-containing console command was parsed by the Windows wrapper; supported simple grep-i-error returned no matches, not proof of an empty console.',
  'The resource-status route is absent. The first runtime record has null resourceMode; the final corrected record reads resourceMode from the actual traffic-status owner.',
  'PowerShell ConvertFrom-Json without AsHashtable rejects distinct vConsole/vconsole keys; the candidate was read correctly and no missing sources were inferred.'],
 limits:['Native WXML, computed style and public event results establish behavior and geometry, not visible marker/name/modal or breathing acceptance.',
  'The original five PNGs were viewed without editing/rescaling. The error capture conflicts with hidden-Canvas/current-unavailable readback; the capture/compositing cause is unresolved.',
  'Installed screenshot code was read only: CLI captures the project window under a host freeze, fits/transforms the simulator and disables host animation. This does not establish a product-layer defect or a harmless screenshot-only fault.',
  'The rounded native vertical FOV and initial name/fade tuning are not universal Stellarium thresholds; no1.7-degree time switch is adopted.',
  'Shared identity-bound queries reuse existing cancellation, catalogue and Context checks. The SDK error event is not asynchronous HTTP, real GPU or target-device failure evidence.',
  'The full33 obligations, halo/spikes/pickability, continuous time, deep-sky helpers, registration/quality, late/failing stellar layers, phone/new Moon, pose/background, performance/cost and final review remain open.']};
await fs.writeFile(output,JSON.stringify(record,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({output,events:events.length,captures:captures.length,traceSha256:record.trace.sha256,
 candidateSha256:record.candidate.sha256,sourceInputsVerified:record.candidate.sourceInputsVerified,
 contextSha256:context.contextIdSha256,publicInteraction:record.publicInteraction,totalObserved:runtime.totalObserved}));
