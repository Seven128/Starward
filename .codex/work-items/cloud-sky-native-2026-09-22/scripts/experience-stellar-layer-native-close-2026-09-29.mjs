import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {PNG} from 'pngjs';
import {fingerprintBundle} from '../../../../tools/miniapp/release-bundle-artifact.mjs';

const task=path.resolve('.codex/work-items/cloud-sky-native-2026-09-22');
const evidence=path.join(task,'evidence');
const output=path.join(evidence,'experience-stellar-layer-native-validation-2026-09-29.json');
await assert.rejects(fs.access(output),{code:'ENOENT'});
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const hash=async file=>sha(await fs.readFile(file));
const read=async file=>JSON.parse(await fs.readFile(file,'utf8'));
const traceFile='experience-stellar-layer-native-2026-09-29.jsonl';
const traceBytes=await fs.readFile(path.join(evidence,traceFile));
const events=traceBytes.toString().trim().split(/\r?\n/).map(JSON.parse);
function value(stage){const event=events.findLast(row=>row.stage===stage);assert(event,stage);return event.value;}

const candidate=await read(path.join(evidence,'experience-combined-clean-v30-candidate-2026-09-29.json'));
assert.equal((await fingerprintBundle(path.resolve(candidate.bundle))).sha256,candidate.fingerprint.sha256);
assert.equal(candidate.sourceInputs.length,106);
for(const input of [...candidate.sourceInputs,...candidate.testInputs,...candidate.retainedSkyTests])
 assert.equal(await hash(input.file),input.sha256,input.file);
const priorFile='experience-v30-combined-native-validation-2026-09-29.json';
const prior=await read(path.join(evidence,priorFile));
assert.equal(await hash(path.join(evidence,prior.trace.file)),prior.trace.sha256);
for(const capture of prior.captures)assert.equal(await hash(path.resolve(capture.file)),capture.sha256);
const baseline=value('stellar-baseline-context'),context=value('stellar-frozen-final-context');
assert.deepEqual(context,baseline);assert.deepEqual(context,prior.currentContext);
assert.equal(context.revision,3);assert.equal(context.publicSpotId,'spot:test-published');
assert.equal(Date.parse(context.selectedAtUtc),Date.parse('2026-09-29T13:00:00Z'));
const frame=stage=>value(stage).presentedCanvasLabel;
assert.match(frame('stellar-baseline-frame'),/45\.0 度.*4039.*13:00:00\.000Z.*21:00/);
assert.match(frame('stellar-frozen-final-frame'),/4\.6 度.*4039.*13:00:00\.000Z.*手动视角.*21:00/);
for(const stage of ['stellar-off-marker-native-pick','stellar-fine-return-native-pick'])assert.equal(value(stage).title,'SAO 67132');
assert(value('stellar-off-marker-coordinate-input').distanceFromMarkerPx>120);
assert.equal(value('stellar-list-confirmed-closed').hasList,false);
const mixed=value('stellar-bright-current-native-choices');
assert.equal(mixed.hasModal,false);assert.equal(mixed.hasList,false);
assert.equal(mixed.choices.length,2);
assert.match(mixed.choices[0].text,/HR 7009.*V 波段视星等 6\.04/);
assert.match(mixed.choices[1].text,/SAO 67207.*视觉星等 8\.60/);
assert.equal(value('stellar-bright-native-choice-information').title,'HR 7009');
assert.match(value('stellar-off-marker-native-information').body,/9\.10 mag.*未转换为统一 Johnson V/);
const display=value('stellar-frozen-display-preferences');assert.equal(display.mode,'DAY');assert.equal(display.largeText,false);
const native=value('stellar-frozen-native-sdk-route');assert.equal(native.native.SDKVersion,'3.17.4');
assert.equal(native.native.platform,'devtools');assert.equal(native.native.enableDebug,false);
assert.equal(native.native.pagePath,'sky/detail/index');assert.equal(native.native.pageDepth,2);
const root=value('stellar-frozen-final-root');
for(const key of ['hasModal','hasList','hasChoices','hasTimePanel','hasRetryDarkStars'])assert.equal(root[key],false,key);
assert.match(root.located,/Vega定位标记/);
for(const text of ['模拟地景：开','星座：开','红外：关','地平网格：开','赤道网格：关'])assert(root.controls.includes(text),text);
const runtime=value('stellar-frozen-runtime');assert.equal(runtime.windows.length,1);assert.equal(runtime.windows[0].Id,25916);
assert.equal(runtime.puts,4);assert.deepEqual(runtime.forwardedPutStatuses,[200,200,200,200]);
for(const key of ['contextMode','sourceMode','resourceMode'])assert.equal(runtime[key],'pass');
assert.equal(runtime.phase,'settled');assert.equal(runtime.heldResourceCount,0);assert.equal(runtime.activeCount,0);
assert.equal(runtime.epochStartedAt,prior.runtime.epochStartedAt);
const traffic=value('stellar-current-run-native-traffic');
assert.equal(traffic.afterSequence,value('stellar-baseline-traffic').afterSequence);
assert.equal(traffic.afterSequence,357);assert.equal(traffic.records.length,52);
for(const row of traffic.records){
 assert(row.sequence>357&&row.sequence<=runtime.totalObserved);
 assert.equal(row.agentProbe,false);assert([200,304].includes(row.status));
 assert.equal(row.downstreamFinished,true);assert.equal(row.upstreamEnded,true);
}
const captures=[];
for(const event of events.filter(row=>row.value?.path?.endsWith('.png'))){
 const row=event.value;assert.equal(await hash(row.path),row.sha256);
 const png=PNG.sync.read(await fs.readFile(row.path));assert.equal(png.width,427);assert.equal(png.height,919);
 captures.push({stage:event.stage,file:path.relative(process.cwd(),row.path).replaceAll('\\','/'),sha256:row.sha256,width:png.width,height:png.height,viewedBy:'root'});
}
assert.equal(captures.length,9);
const inputs=[];
for(const file of ['experience-stellar-layer-target-2026-09-29.json','experience-stellar-layer-frame-2026-09-29.json',
 'experience-stellar-layer-off-marker-2026-09-29.json','experience-stellar-layer-wide-projection-2026-09-29.json',
 'experience-stellar-layer-pixels-2026-09-29.json'])inputs.push({file,sha256:await hash(path.join(evidence,file))});
const pixels=await read(path.join(evidence,'experience-stellar-layer-pixels-2026-09-29.json'));
for(const comparison of Object.values(pixels.comparisons))assert.equal(comparison.changedPixels,0);
const scopeFile='apps/wechat-miniapp/src/pages/map/index.scss';
const scopeHash=await hash(scopeFile);assert.equal(scopeHash,'81283f7b2849cd55eed4a82d322885e1c76d7f8aa81ab26fc2fc584d198c0e82');
const counts={};for(const row of traffic.records)counts[row.resourceKind]=(counts[row.resourceKind]??0)+1;
assert.equal(counts.sao_tile,34);
const record={classification:'Same unchanged v30 native stellar progressive-display and off-marker picking development evidence; Goal remains active and incomplete.',
 candidate:{file:'experience-combined-clean-v30-candidate-2026-09-29.json',sha256:candidate.fingerprint.sha256,sourceInputsVerified:106},
 trace:{file:traceFile,sha256:sha(traceBytes),events:events.length},context,native,display,finalFrame:frame('stellar-frozen-final-frame'),
 finalRoot:root,runtime,captures,inputs,prior:{file:priorFile,sha256:await hash(path.join(evidence,priorFile)),traceUnchanged:true},
 actualTraffic:{afterSequence:traffic.afterSequence,throughSequence:runtime.totalObserved,records:traffic.records.length,
  byKind:counts,byStatus:Object.fromEntries([200,304].map(status=>[status,traffic.records.filter(row=>row.status===status).length])),
  upstreamBodyBytes:traffic.records.reduce((sum,row)=>sum+(row.upstreamBodyBytes??0),0),
  scope:'Bounded sanitized actual native transport; excludes explicit agent probes, not target latency or operational billing'},
 pixels: pixels.comparisons,scopeGuard:{file:scopeFile,sha256:scopeHash},
 corrections:['The first coordinate tap selected a Venus list row while the list was open; it was not a wrong Canvas pick.',
  'The initial missing-centre-point interpretation was incorrect: the original fine PNG contains a point at (213,459).',
  'Missing modal queries after mixed-object picks are not failures: HR 7009 and SAO 67207 were offered as choices.',
  'Selector one-finger events were inconclusive; actual off-marker viewport coordinate inputs supply the successful native consumer evidence.'],
 limits:['No product source change, new build, new catalogue acquisition or non-Sky edit in this batch.',
  'Native exact FOV is not exposed: off-marker predictions retain rounded FOV intervals; image-to-CSS mapping remains approximate.',
  'Fine initial and settled images were already identical; they do not certify delayed tile arrival or failure recovery.',
  'Ordinary labels/dock/modal/choice overlay composition is not captured by these Canvas-only PNGs.',
  'Full star/constellation registration, coverage and total-scene quality remain open; neutral SAO colour does not supply missing colour measurements.',
  'Phone/new Moon target acceptance, actual pose/OS background, native decoding/GPU recovery and performance, official package size, costs and final independent review remain open.',
  'Previous source-return 25-pixel/max1 difference and all commercial exclusions retain their prior scope.']};
await fs.writeFile(output,JSON.stringify(record,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({output,events:events.length,captures:captures.length,trace:record.trace.sha256,traffic:record.actualTraffic,
 contextIdSha256:context.contextIdSha256,finalFrame:record.finalFrame,candidateUnchanged:true,scopeGuard:record.scopeGuard}));
