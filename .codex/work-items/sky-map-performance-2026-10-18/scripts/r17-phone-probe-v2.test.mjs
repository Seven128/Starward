// Focused identity/window/privacy fixtures. This is not a device result.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {validateR17PhoneProbeMetrics,validateR17PhoneProbeV2Metrics,validateR17PhoneProbeTerminal,matchR17PhoneProbeTerminal,R17_PHONE_PROBE_MAX_BYTES} from './r17-phone-probe-v2-protocol.mjs';
const here=path.dirname(fileURLToPath(import.meta.url)), root=path.resolve(here,'../../../..');
const require=createRequire(import.meta.url), ts=require(path.join(root,'apps/wechat-miniapp/node_modules/typescript'));
const template=await fs.readFile(path.join(here,'r17-phone-probe-v2-runtime.ts'),'utf8');
const transpiled=ts.transpileModule(template.replaceAll('__VARIANT__','candidate'),{reportDiagnostics:true,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}});
assert.equal(transpiled.diagnostics.length,0);
function runtime({monotonic=true}={}) {
  let wall=0,next=0; const timers=new Map();
  const context={exports:{},Date:class extends Date { static now(){return 1_800_000_000_000+wall;} },setTimeout:(run,delay)=>{const id=++next;timers.set(id,{at:wall+delay,run});return id;},clearTimeout:id=>timers.delete(id)};
  if(monotonic) context.performance={now:()=>wall};
  vm.runInNewContext(transpiled.outputText,context);
  const advance=duration=>{const end=wall+duration;for(;;){const pending=[...timers.entries()].filter(([,value])=>value.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!pending)break;timers.delete(pending[0]);wall=pending[1].at;pending[1].run();}wall=end;};
  const probe=context.exports.r17Probe;
  assert.equal(probe.configureBinding({mode:'accepted-action-direct',buildGeneration:23,buildSourceSha256:'a'.repeat(64)}),true);
  return {probe,advance};
}
const state=at=>({at,binding:'PRIVATE_ACCOUNT_CONTEXT_DO_NOT_EXPORT',report:'PRIVATE_REPORT'});
const atA='2010-01-01T00:00:00.000Z',atB='2010-01-01T00:00:01.000Z';
function prepare(probe,advance,sequence,duration=3) {
  const token=probe.prepareStarted(sequence,'presentation',null);advance(duration);probe.prepareFinished(token);return token;
}
function frame(probe,at,token,sequence) {
  const value={frameAt:at,privateText:'SECRET_DO_NOT_EXPORT'};
  probe.request(value,token,sequence);probe.prepared(value);return value;
}
function accepted(probe,advance,value) {probe.paintStarted(value);advance(2);probe.callback(value);probe.accepted(value,{objects:[{reference:'HR:1'},{reference:'SAO:2'}],private:'SECRET_DO_NOT_EXPORT'});}
test('A → B → A remains three identities; first accepted is once, supersession and repeated presents stay separate',()=>{
  const {probe,advance}=runtime();probe.start('wide-time');advance(1000);
  const a1=state(atA), b=state(atB), a2=state(atA);
  const first=probe.intent(a1), token1=prepare(probe,advance,first), f1=frame(probe,atA,token1,first);
  const second=probe.intent(b), token2=prepare(probe,advance,second), f2=frame(probe,atB,token2,second);
  const third=probe.intent(a2), token3=prepare(probe,advance,third), f3=frame(probe,atA,token3,third);
  assert.equal(first,1);assert.equal(second,2);assert.equal(third,3);assert.equal(probe.intentSequence(a1),first);
  assert.equal(probe.intentSequence(state(atA)),null); // same at is insufficient.
  accepted(probe,advance,f1);accepted(probe,advance,f3);accepted(probe,advance,f3);
  const later=frame(probe,atA,token3,third);accepted(probe,advance,later);
  const out=probe.snapshot();assert(validateR17PhoneProbeV2Metrics(out));
  assert.equal(out.linkage.intentsCreated,3);assert.equal(out.linkage.firstAcceptedIntents,2);
  assert.equal(out.linkage.supersededBeforeFirstAccepted,2);assert.equal(out.linkage.firstAcceptedAfterSuperseded,1);
  assert.equal(out.linkage.supersededUnacceptedIntents,1);assert.equal(out.linkage.duplicateIntentPresents,2);
  assert.equal(out.linkage.duplicateFramePresents,1);assert.equal(out.linkage.links[2].duplicatePresents,2);
  assert.equal(out.linkage.latency.intentToFirstAcceptedMs.calls,2);
  assert.equal(out.linkage.links[0].intentSequence,1);assert.equal(out.linkage.links[2].intentSequence,3);
  assert.equal(out.linkage.links[0].intentFirstAcceptedObserved,true);assert.equal(out.linkage.links[1].intentFirstAcceptedObserved,false);
  assert.equal(out.time.intent.distinct,2);assert.equal(out.counters.acceptedCopies,4);
  // Kept legacy conditional sample is visibly distinct from the fixed metric.
  assert.equal(out.timing.intentToAcceptedWallMs.calls,4);
  assert.equal(out.linkage.consumedPreparations,2);assert.equal(out.linkage.unconsumedPreparations,1);
  assert.equal(out.linkage.consumedCpuMs,6);assert.equal(out.linkage.unconsumedCpuMs,3);
  const serialized=JSON.stringify(out);for(const secret of ['2010-01-01','PRIVATE_ACCOUNT','PRIVATE_REPORT','SECRET_DO_NOT_EXPORT','HR:1','SAO:2'])assert.equal(serialized.includes(secret),false);
  void f2;
});
test('explicit token inheritance crosses only the real clone; requests do not invent expensive preparations',()=>{
  const {probe,advance}=runtime();probe.start('narrow-play');advance(1000);
  const sequence=probe.intent(state(atA)), token=prepare(probe,advance,sequence,7);
  const original=frame(probe,atA,token,sequence), resolved={...original};assert(probe.inheritFrame(resolved,original));
  for(let index=0;index<100;index++)frame(probe,atA,token,sequence);
  accepted(probe,advance,resolved);
  const next=probe.intent(state(atA));const mismatch=frame(probe,atA,token,next);accepted(probe,advance,mismatch);
  const out=probe.snapshot();assert(validateR17PhoneProbeMetrics(out));
  assert.equal(out.counters.preparedRequests,102);assert.equal(out.linkage.preparationsStarted,1);
  assert.equal(out.linkage.preparationsFinished,1);assert.equal(out.linkage.consumedCpuMs,7);
  assert.equal(out.linkage.firstAcceptedIntents,1);assert.equal(out.linkage.linkageMismatches,1);
  assert.equal(out.linkage.requestsWithUnknownPreparation,1);assert.equal(out.linkage.requestsWithUnknownIntent,1);
  assert.equal(out.linkage.inheritedFrames,1);assert.equal(out.linkage.links[0].requests,101);
});
test('synthetic publication retains real CPU/Scene counts but has zero real accepted and zero A-latency samples',()=>{
  const {probe,advance}=runtime();probe.start('narrow-play');advance(1000);
  const sequence=probe.intent(state(atB)), token=prepare(probe,advance,sequence), value=frame(probe,atB,token,sequence);
  probe.paintStarted(value);probe.measure('draw',()=>advance(5));probe.callback(value);probe.syntheticAccepted(value);
  probe.sceneFinished({skyScene:{catalog:{catalogVersion:'bsc-v2'}},observationFrames:[{at:atB,modelAlgorithmVersion:'astronomy-engine-v2'}]},atB,
    {pointCount:8404},{pointCount:123,publicationHash:'a'.repeat(64)},390,844,10.8,'NIGHT',100,30);
  const out=probe.snapshot();assert(validateR17PhoneProbeMetrics(out));
  assert.equal(out.counters.acceptedCopies,0);assert.equal(out.time.accepted.events,0);assert.equal(out.linkage.firstAcceptedIntents,0);
  assert.equal(out.linkage.latency.intentToFirstAcceptedMs.calls,0);assert.equal(out.linkage.syntheticPublications,1);
  assert.equal(out.linkage.links[0].syntheticPublications,1);assert.equal(out.linkage.links[0].firstAcceptedObserved,false);
  assert.equal(out.cpu.draw.totalMs,5);assert.equal(out.scene.baseRowsMax,8404);assert.equal(out.counters.bscSubmittedStars,100);
});
test('15s metrics and 20s terminal seal independently; Pause callback false/unknown is not success and retry bytes stay fixed',()=>{
  const {probe,advance}=runtime();probe.start('narrow-play');probe.control('actualPlay',true);
  probe.scalars('tm',{hits:12,misses:2,retired:false,available:true,privateAccount:'NEVER_EXPORT'});
  probe.scalars('page',{available:1,pending:0,enableDebug:false,latencyTotalMs:1.5,data:'NEVER_EXPORT'});
  probe.scalars('scene',{frozen:true,retired:false,syntheticFinishes:9,private:'NEVER_EXPORT'});
  advance(15000);probe.control('export');const metrics=probe.snapshot(), bytes=JSON.stringify(metrics);
  assert(validateR17PhoneProbeMetrics(metrics));assert.equal(metrics.window.elapsedMs,14000);
  assert.equal(metrics.controls.events.actualPlay.firstRelativeMs,0);assert.equal(metrics.controls.recordingStartRelativeMs,1000);
  assert.equal(metrics.controls.events.export.firstRelativeMs,15000);assert.equal(metrics.controls.events.pauseAttempt.calls,0);
  assert.equal(probe.scalars('tm',{hits:999}),false);assert.equal(probe.configureBinding({mode:'normal',buildGeneration:24,buildSourceSha256:null}),true);
  assert.equal(probe.terminalSnapshot().binding.buildGeneration,23); // Early explicit finalization ends control recording.
  assert.equal(probe.control('pauseAttempt'),false);assert.equal(JSON.stringify(probe.snapshot()),bytes);
  // New run: the caller waits until the existing guarded Pause has returned.
  probe.start('narrow-play');probe.control('actualPlay',true);advance(15000);probe.control('export');const second=probe.snapshot();advance(5000);
  probe.control('pauseAttempt');probe.controlResult('pauseAttempt',false);probe.control('terminalExport');
  const terminal=probe.terminalSnapshot(), terminalBytes=JSON.stringify(terminal);
  assert(validateR17PhoneProbeTerminal(terminal));assert(matchR17PhoneProbeTerminal(second,terminal));
  assert.equal(terminal.controls.events.pauseAttempt.calls,1);assert.equal(terminal.controls.events.pauseAttempt.lastResult,false);
  assert.equal(terminal.controls.events.pauseAttempt.firstRelativeMs,20000);assert.equal(terminal.controls.events.pauseSuccess.calls,0);
  assert.equal(terminal.metricsSeal.relativeMs,15000);assert.equal(terminal.metricsSeal.elapsedMs,14000);
  assert.equal(JSON.stringify(probe.snapshot()),JSON.stringify(second));assert.equal(JSON.stringify(probe.terminalSnapshot()),terminalBytes);
  assert.equal(probe.controlResult('pauseAttempt',true),false);
  assert.equal(metrics.observations.tm.last.values.hits,12);assert.equal(metrics.observations.tm.last.values.capacity,null);
  assert.equal(metrics.observations.page.last.values.enableDebug,false);assert.equal(metrics.observations.scene.last.values.frozen,true);
  assert.equal(JSON.stringify(metrics).includes('NEVER_EXPORT'),false);
  const wrong=structuredClone(terminal);wrong.runId='r17-999-abcdef';assert.equal(matchR17PhoneProbeTerminal(second,wrong),false);
  const wrongSeal=structuredClone(terminal);wrongSeal.metricsSeal.elapsedMs++;assert.equal(matchR17PhoneProbeTerminal(second,wrongSeal),false);
  assert.equal(matchR17PhoneProbeTerminal(null,terminal),false);
});
test('successful guarded Pause records its actual result after metrics seal; no monotonic clock stays unknown without losing deduplication',()=>{
  const {probe,advance}=runtime({monotonic:false});probe.start('wide-time');advance(1000);
  const sequence=probe.intent(state(atA)), token=prepare(probe,advance,sequence), value=frame(probe,atA,token,sequence);
  accepted(probe,advance,value);accepted(probe,advance,value);probe.control('export');const metrics=probe.snapshot();
  probe.control('pauseAttempt');probe.controlResult('pauseAttempt',true);probe.control('pauseSuccess',true);probe.control('terminalExport');const terminal=probe.terminalSnapshot();
  assert(validateR17PhoneProbeMetrics(metrics));assert(matchR17PhoneProbeTerminal(metrics,terminal));
  assert.equal(metrics.clock,'Date.now');assert.equal(metrics.controls.monotonicClock,false);
  assert.equal(metrics.linkage.firstAcceptedIntents,1);assert.equal(metrics.linkage.duplicateIntentPresents,1);
  assert.equal(metrics.linkage.latencyUnknownIntents,1);assert.equal(metrics.linkage.latency.intentToFirstAcceptedMs.calls,0);
  assert.equal(metrics.linkage.consumedPreparations,1);assert.equal(metrics.linkage.unconsumedPreparations,0);
  assert.equal(metrics.linkage.links[0].cpuMs,null);assert.equal(metrics.linkage.links[0].firstAcceptedRelativeMs,null);
  assert.equal(terminal.controls.events.pauseAttempt.lastResult,true);assert.equal(terminal.controls.events.pauseSuccess.lastRelativeMs,null);
});
test('fixed scalar rings, rotating identity tables and output allowlist remain bounded; expiry is unresolved cost',()=>{
  const {probe,advance}=runtime();probe.start('wide-play');advance(1000);
  let oldest;
  for(let index=0;index<2200;index++){
    const sequence=probe.intent(state(index%2?atA:atB)),token=prepare(probe,advance,sequence,0),value=frame(probe,index%2?atA:atB,token,sequence);
    if(!oldest)oldest=value;
  }
  // The first token/frame was evicted. It cannot be represented as a new
  // first accepted intent or silently credited to the current matching at.
  accepted(probe,advance,oldest);
  const out=probe.snapshot(), bytes=Buffer.byteLength(JSON.stringify(out));assert(validateR17PhoneProbeMetrics(out));
  assert.equal(out.linkage.retainedPreparations,2048);assert.equal(out.linkage.retainedIntents,2048);
  assert.equal(out.linkage.expiredUnconsumedPreparations,152);assert.equal(out.linkage.expiredUnacceptedIntents,152);
  assert.equal(out.linkage.links.length,32);assert.equal(out.linkage.linkSampleTruncated,true);
  assert(out.linkage.frameIdentityRotations>0);assert(out.linkage.stateIdentityRotations>0);
  assert.equal(out.linkage.firstAcceptedIntents,0);assert.equal(out.linkage.unknownAcceptedFrames,1);
  assert(bytes<R17_PHONE_PROBE_MAX_BYTES);assert.equal(validateR17PhoneProbeMetrics({...out,privateAccount:'NEVER_EXPORT'}),false);
  const extra=structuredClone(out);extra.observations.tm.extra='NEVER_EXPORT';assert.equal(validateR17PhoneProbeMetrics(extra),false);
  const privateLink=structuredClone(out);privateLink.linkage.links[0].at=atA;assert.equal(validateR17PhoneProbeMetrics(privateLink),false);
  const huge=structuredClone(out);huge.scene.catalogVersions=['a'.repeat(40000)];assert.equal(validateR17PhoneProbeMetrics(huge),false);
  const cycle={};cycle.self=cycle;assert.equal(validateR17PhoneProbeMetrics(cycle),false);assert.equal(validateR17PhoneProbeMetrics(undefined),false);
});
test('v1 receipts still pass the combined validator unchanged',async()=>{
  const legacy=await fs.readFile(path.join(here,'r17-phone-probe-runtime.ts'),'utf8');
  const compiled=ts.transpileModule(legacy.replaceAll('__VARIANT__','baseline'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
  let pending;const context={exports:{},performance:{now:()=>1000},setTimeout:run=>{pending=run;return 1;},clearTimeout(){}};
  vm.runInNewContext(compiled,context);context.exports.r17Probe.start('wide-camera');pending();
  const old=context.exports.r17Probe.snapshot();assert(validateR17PhoneProbeMetrics(old));assert.equal(validateR17PhoneProbeV2Metrics(old),false);
});

test('optional scene-owned memo counters stay detached, allowlisted and compatible with original v2',()=>{
  const {probe,advance}=runtime();
  assert(probe.configureBinding({mode:'scene-owned-memo',buildGeneration:24,buildSourceSha256:'b'.repeat(64)}));
  probe.start('wide-play');probe.control('actualPlay',true);advance(1000);
  const input={ownedScenesCreated:2,ownRejected:0,ownedReads:6,ownedValueReads:4,ownedWrites:2,
    fallbackReads:0,fallbackValueReads:0,fallbackWrites:0,sameAtReuses:4,lifetimeOwnedScenesCreated:7,
    observationResets:1,frame:{privateAccount:'NEVER_EXPORT'}};
  assert(probe.scalars('memo',input));input.ownedScenesCreated=3;advance(2);assert(probe.scalars('memo',input));
  const out=probe.snapshot();assert(validateR17PhoneProbeV2Metrics(out));
  assert.equal(out.observations.memo.first.values.ownedScenesCreated,2);
  assert.equal(out.observations.memo.last.values.ownedScenesCreated,3);
  assert.equal(JSON.stringify(out).includes('NEVER_EXPORT'),false);
  probe.control('pauseAttempt');probe.controlResult('pauseAttempt',true);probe.control('pauseSuccess',true);
  probe.control('terminalExport');assert(matchR17PhoneProbeTerminal(out,probe.terminalSnapshot()));
  for(const mutate of [value=>value.observations.memo.last.values.ownedReads=1.2,
    value=>value.observations.memo.last.values.frame='NEVER_EXPORT',
    value=>delete value.observations.memo.last.values.sameAtReuses,
    value=>value.observations.other={captures:0,first:null,last:null},
    value=>delete value.observations.memo]){
    const invalid=structuredClone(out);mutate(invalid);assert.equal(validateR17PhoneProbeMetrics(invalid),false);
  }
  const original=structuredClone(out);original.binding.mode='accepted-action-direct';delete original.observations.memo;
  assert(validateR17PhoneProbeV2Metrics(original));
});
