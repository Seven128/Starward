// Portable contract checks only. No phone, candidate, service or build changes.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {validateR17PhoneProbeMetrics,validateR17PhoneProbeV3Metrics,validateR17PhoneProbeV3Terminal,
  validateR17PhoneProbeTerminal,matchR17PhoneProbeTerminal,R17_PHONE_PROBE_MAX_BYTES} from './r17-phone-probe-v3-protocol.mjs';
import {createR17PhoneProbeCollector} from './r17-phone-probe-collector.mjs';
const here=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(here,'../../../..');
const require=createRequire(import.meta.url),ts=require(path.join(root,'apps/wechat-miniapp/node_modules/typescript'));
const compile=source=>ts.transpileModule(source.replaceAll('__VARIANT__','candidate'),{
  reportDiagnostics:true,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}});
const compiled=compile(await fs.readFile(path.join(here,'r17-phone-probe-v3-runtime.ts'),'utf8'));
assert.equal(compiled.diagnostics.length,0);
function runtime(code=compiled.outputText) {
  let wall=0,offset=0,next=0,available=true;
  const timers=new Map(),context={exports:{},
    Date:class extends Date {static now(){return available ? 1_800_000_000_000+wall+offset : NaN;}},
    // v3 must not adopt these merely because they are callable.
    performance:{now(){throw Error('uncalibrated_global_clock');}},
    wx:{getPerformance(){throw Error('uncalibrated_wx_clock');}},
    setTimeout:(run,delay)=>{const id=++next;timers.set(id,{at:wall+delay,run});return id;},clearTimeout:id=>timers.delete(id)};
  vm.runInNewContext(code,context);
  const advance=duration=>{const end=wall+duration;for(;;){
    const pending=[...timers.entries()].filter(([,value])=>value.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];
    if(!pending)break;timers.delete(pending[0]);wall=pending[1].at;pending[1].run();}wall=end;};
  const probe=context.exports.r17Probe;
  probe.configureBinding?.({mode:'normal',buildGeneration:24,buildSourceSha256:'a'.repeat(64)});
  return {probe,advance,adjust:delta=>{offset+=delta;},available:next=>{available=next;},context};
}
const state=at=>({at,privateAccount:'PRIVATE_ACCOUNT_DO_NOT_EXPORT'});
const atA='2010-01-01T00:00:00.000Z',atB='2010-01-01T00:00:01.000Z';
function prepare(p,advance,intent,duration=3) {const token=p.prepareStarted(intent);advance(duration);p.prepareFinished(token);return token;}
function frame(p,intent,token,at=atA) {const f={frameAt:at,privateText:'PRIVATE_FRAME_DO_NOT_EXPORT'};p.request(f,token,intent);p.prepared(f);return f;}
function accept(p,advance,f) {p.paintStarted(f);advance(2);p.callback(f);p.accepted(f,{objects:[{reference:'HR:1'}]});}
const copy=value=>JSON.parse(JSON.stringify(value));

test('previous-run memo identities cannot accept or consume a new run preparation',()=>{
  const {probe:p,advance}=runtime();
  p.start('wide-play');advance(1000);
  const oldIntent=p.intent(state(atA)),oldToken=prepare(p,advance,oldIntent,3);
  p.snapshot();
  p.start('wide-play');advance(1000);
  const newIntent=p.intent(state(atB)),newToken=prepare(p,advance,newIntent,5);
  // A memo envelope can outlive a recorder window without changing product data.
  const stale=frame(p,oldIntent,oldToken,atA);accept(p,advance,stale);
  const out=p.snapshot();assert(validateR17PhoneProbeV3Metrics(out));
  assert.equal(out.linkage.firstAcceptedIntents,0);
  assert.equal(out.linkage.requestsWithUnknownPreparation,1);
  assert.equal(out.linkage.requestsWithUnknownIntent,1);
  assert.equal(out.linkage.costs.consumed.validCalls,0);
  assert.equal(out.linkage.costs.unconsumed.knownSubtotalMs,5);
  assert.equal(out.linkage.costs.unconsumed.validCalls,1);
  assert.notEqual(newIntent,oldIntent);assert.notEqual(newToken,oldToken);
});

test('Date.now supplies valid elapsed intervals; equal ticks and unfinished costs retain unknown coverage',()=>{
  const {probe:p,advance}=runtime();p.start('wide-play');p.control('actualPlay',true);advance(1000);
  const intent=p.intent(state(atA)),token=prepare(p,advance,intent,3),f=frame(p,intent,token);
  accept(p,advance,f);prepare(p,advance,intent,0);p.prepareStarted(intent);
  p.measure('draw',()=>advance(4));p.measure('draw',()=>{});
  const start=p.now();advance(2);p.cpuSince('base',start);
  p.control('export');const out=p.snapshot();assert(validateR17PhoneProbeV3Metrics(out));
  assert.equal(out.clock.source,'Date.now');assert.equal(out.clock.kind,'wall-elapsed');assert.equal(out.clock.monotonic,false);
  assert.equal(out.clock.nominalResolutionMs,1);assert.equal(out.clock.effectiveResolutionMs,null);
  assert.equal(out.controls.recordingStartRelativeMs,1000);
  assert.equal(out.stageElapsed.draw.knownSubtotalMs,4);assert.equal(out.stageElapsed.draw.observedCalls,2);
  assert.equal(out.stageElapsed.draw.validCalls,1);assert.equal(out.stageElapsed.draw.unknownCalls,1);
  assert.equal(out.stageElapsed.draw.unknown.belowResolution,1);assert.equal(out.stageElapsed.base.knownSubtotalMs,2);
  assert.equal(out.linkage.costs.consumed.knownSubtotalMs,3);assert.equal(out.linkage.costs.consumed.validCalls,1);
  assert.equal(out.linkage.costs.unconsumed.knownSubtotalMs,0);assert.equal(out.linkage.costs.unconsumed.validCalls,0);
  assert.equal(out.linkage.costs.unconsumed.unknownCalls,2);assert.equal(out.linkage.costs.unconsumed.unknown.belowResolution,1);
  assert.equal(out.linkage.costs.unconsumed.unknown.notObserved,1);
  assert.equal(out.linkage.links[1].elapsedMs,null);assert.equal(out.linkage.links[1].elapsedStatus,'belowResolution');
  assert.equal(out.linkage.latency.intentToFirstAcceptedMs.validCalls,1);assert.equal(out.linkage.latency.intentToFirstAcceptedMs.knownSubtotalMs,5);
  assert.equal('cpu' in out,false);assert.equal('consumedCpuMs' in out.linkage,false);
  const bytes=JSON.stringify(out);for(const secret of ['PRIVATE_ACCOUNT','PRIVATE_FRAME','2010-01-01','1800000000000','HR:1'])assert(!bytes.includes(secret));
});

test('observed rollback invalidates crossing intervals without clamping; later local intervals may recover',()=>{
  const {probe:p,advance,adjust}=runtime();p.start('wide-time');advance(1000);
  const intent=p.intent(state(atA)),token=p.prepareStarted(intent),stamp=p.now();advance(8);
  adjust(-20);p.now();adjust(20);advance(2);p.prepareFinished(token);p.cpuSince('draw',stamp);
  accept(p,advance,frame(p,intent,token));
  p.measure('selection',()=>advance(3));
  const out=p.snapshot();assert(validateR17PhoneProbeMetrics(out));assert.equal(out.clock.backwardReads,1);
  assert.equal(out.window.elapsedMs,null);assert.equal(out.window.elapsedStatus,'clockDiscontinuity');
  assert.equal(out.controls.sealRelativeMs,null);assert.equal(out.linkage.links[0].finishedRelativeMs,null);
  assert.equal(out.linkage.links[0].elapsedMs,null);assert.equal(out.linkage.links[0].elapsedStatus,'clockDiscontinuity');
  assert.equal(out.stageElapsed.draw.validCalls,0);assert.equal(out.stageElapsed.draw.minMs,null);
  assert.equal(out.stageElapsed.draw.unknown.clockDiscontinuity,1);assert.equal(out.stageElapsed.selection.knownSubtotalMs,3);
  assert.equal(out.linkage.latencyUnknownIntents,1);assert.equal(out.linkage.latency.intentToFirstAcceptedMs.unknown.clockDiscontinuity,1);
});

test('unavailable, foreign-run and missing stamps remain separate unknown intervals',()=>{
  const {probe:p,advance,available}=runtime();p.start('wide-time');advance(1000);
  const old=p.now();advance(2);available(false);p.measure('base',()=>{});available(true);
  p.cpuSince('draw',old);p.cpuSince('selection',12);p.cpuSince('selection',{});
  const first=p.snapshot();assert(validateR17PhoneProbeMetrics(first));assert.equal(first.clock.availability,'partial');
  assert.equal(first.stageElapsed.base.unknown.clockUnavailable,1);assert.equal(first.stageElapsed.draw.unknown.clockDiscontinuity,1);
  assert.equal(first.stageElapsed.selection.unknown.notObserved,2);
  p.start('wide-time');advance(1000);p.cpuSince('base',old);const second=p.snapshot();assert(validateR17PhoneProbeMetrics(second));
  assert.equal(second.stageElapsed.base.unknown.clockDiscontinuity,1);
  const unavailable=runtime();unavailable.available(false);unavailable.probe.start('wide-play');unavailable.advance(1000);
  unavailable.probe.measure('draw',()=>{});const all=unavailable.probe.snapshot();assert(validateR17PhoneProbeMetrics(all));
  assert.equal(all.clock.availability,'unavailable');assert.equal(all.window.elapsedStatus,'clockUnavailable');
});

test('zero first-acceptance latency is unresolved, first acceptance still deduplicates, synthetic never supplies A-latency',()=>{
  const {probe:p,advance}=runtime();p.start('wide-time');advance(1000);
  const intent=p.intent(state(atA)),token=prepare(p,advance,intent,0),f=frame(p,intent,token);
  p.paintStarted(f);p.syntheticAccepted(f);p.accepted(f,{});p.accepted(f,{});
  const out=p.snapshot();assert(validateR17PhoneProbeMetrics(out));
  assert.equal(out.linkage.firstAcceptedIntents,1);assert.equal(out.linkage.duplicateIntentPresents,1);
  assert.equal(out.linkage.syntheticPublications,1);assert.equal(out.linkage.latency.intentToFirstAcceptedMs.observedCalls,1);
  assert.equal(out.linkage.latency.intentToFirstAcceptedMs.validCalls,0);assert.equal(out.linkage.latency.intentToFirstAcceptedMs.p50Ms,null);
  assert.equal(out.linkage.latency.intentToFirstAcceptedMs.unknown.belowResolution,1);
});

test('A → B → A, token reuse, clone inheritance and superseded acceptance remain identity based',()=>{
  const {probe:p,advance}=runtime();p.start('wide-time');advance(1000);
  const values=[];
  for(const at of [atA,atB,atA]) {const intent=p.intent(state(at)),token=prepare(p,advance,intent);values.push(frame(p,intent,token,at));}
  const resolved={...values[2]};assert(p.inheritFrame(resolved,values[2]));
  accept(p,advance,values[0]);accept(p,advance,resolved);accept(p,advance,resolved);
  const out=p.snapshot();assert(validateR17PhoneProbeMetrics(out));
  assert.equal(out.linkage.intentsCreated,3);assert.equal(out.linkage.firstAcceptedIntents,2);
  assert.equal(out.linkage.firstAcceptedAfterSuperseded,1);assert.equal(out.linkage.supersededUnacceptedIntents,1);
  assert.equal(out.linkage.duplicateIntentPresents,1);assert.equal(out.linkage.duplicateFramePresents,1);
  assert.equal(out.linkage.costs.consumed.knownSubtotalMs,6);assert.equal(out.linkage.costs.unconsumed.knownSubtotalMs,3);
  assert.equal(out.linkage.latency.supersededIntentToFirstAcceptedMs.validCalls,1);
  assert.equal(out.linkage.latency.unsupersededIntentToFirstAcceptedMs.validCalls,1);
});

test('metrics and terminal seals preserve exact snapshots across later reads, controls and rollback',()=>{
  const {probe:p,advance,adjust}=runtime();p.start('wide-play');p.control('actualPlay',true);advance(15000);p.control('export');
  p.scalars('tm',{hits:12,misses:1,private:'NEVER_EXPORT'});const metrics=p.snapshot(),bytes=JSON.stringify(metrics);
  assert.equal(metrics.window.elapsedMs,14000);advance(4000);p.now();adjust(-20);p.now();advance(1020);
  p.control('pauseAttempt');p.controlResult('pauseAttempt',true);p.control('pauseSuccess',true);p.control('terminalExport');
  const terminal=p.terminalSnapshot(),terminalBytes=JSON.stringify(terminal);
  assert(validateR17PhoneProbeV3Terminal(terminal));assert(matchR17PhoneProbeTerminal(metrics,terminal));
  assert.equal(terminal.controls.sealRelativeMs,null);assert.equal(terminal.controls.events.pauseSuccess.lastRelativeMs,null);
  assert.equal(terminal.controls.events.pauseSuccess.lastResult,true);assert.equal(terminal.metricsSeal.relativeMs,15000);
  p.now();advance(10);assert.equal(JSON.stringify(p.snapshot()),bytes);assert.equal(JSON.stringify(p.terminalSnapshot()),terminalBytes);
  metrics.clock.reads=999;metrics.linkage.costs.unconsumed.unknown.notObserved=99;terminal.clock.reads=888;
  assert.equal(JSON.stringify(p.snapshot()),bytes);assert.equal(JSON.stringify(p.terminalSnapshot()),terminalBytes);
  assert.equal(p.control('pauseAttempt'),false);assert.equal(p.scalars('tm',{hits:999}),false);
  const wrong=copy(p.terminalSnapshot());wrong.metricsSeal.elapsedStatus='belowResolution';wrong.metricsSeal.elapsedMs=null;
  assert.equal(matchR17PhoneProbeTerminal(p.snapshot(),wrong),false);
});

test('bounded rings, coverage on expiry, allowlists and corrupt interval rejection',()=>{
  const {probe:p,advance}=runtime();p.start('wide-play');advance(1000);
  for(let index=0;index<2200;index++) {const intent=p.intent(state(index%2?atA:atB));const token=prepare(p,advance,intent,index%2);frame(p,intent,token);}
  const out=p.snapshot();assert(validateR17PhoneProbeMetrics(out));
  assert.equal(out.linkage.retainedPreparations,2048);assert.equal(out.linkage.links.length,32);
  assert.equal(out.linkage.expiredUnconsumedPreparations,152);assert.equal(out.linkage.costs.expiredUnconsumed.validCalls,76);
  assert.equal(out.linkage.costs.expiredUnconsumed.unknownCalls,76);assert.equal(out.linkage.costs.expiredUnconsumed.knownSubtotalMs,76);
  assert(Buffer.byteLength(JSON.stringify(out))<R17_PHONE_PROBE_MAX_BYTES);
  for(const mutate of [v=>{v.clock.monotonic=true;},v=>{v.clock.effectiveResolutionMs=0.01;},
    v=>{v.stageElapsed.draw.minMs=0;},v=>{v.linkage.costs.unconsumed.unknownCalls=0;},
    v=>{v.linkage.links[0].elapsedMs=0;v.linkage.links[0].elapsedStatus='valid';},
    v=>{v.linkage.links[0].private='NEVER_EXPORT';},v=>{v.clock.epoch=1_800_000_000_000;},
    v=>{v.stageElapsed.draw.unknown.extra=3;},v=>{v.linkage.links[0].startedRelativeMs=0.1;}]) {
    const bad=copy(out);mutate(bad);assert.equal(validateR17PhoneProbeMetrics(bad),false);
  }
  const circular={};circular.self=circular;assert.equal(validateR17PhoneProbeMetrics(circular),false);
});

test('out-of-range and unfinished windows remain unknown; legacy receipts keep original schemas and validators',async()=>{
  const {probe:p,advance,adjust}=runtime();p.start('wide-time');advance(1000);p.measure('draw',()=>adjust(70000));
  const out=p.snapshot();assert(validateR17PhoneProbeMetrics(out));assert.equal(out.stageElapsed.draw.unknown.outOfRange,1);
  assert.equal(out.window.elapsedMs,null);assert.equal(out.window.elapsedStatus,'outOfRange');
  p.start('wide-time');const early=p.snapshot();assert(validateR17PhoneProbeMetrics(early));assert.equal(early.window.elapsedStatus,'notObserved');
  for(const version of [1,2]) {
    const source=await fs.readFile(path.join(here,version===1?'r17-phone-probe-runtime.ts':'r17-phone-probe-v2-runtime.ts'),'utf8');
    const compiledLegacy=compile(source).outputText;
    const old=runtime(compiledLegacy);old.context.performance.now=()=>1000;old.probe.start('wide-play');old.advance(1000);
    const metrics=old.probe.snapshot();assert(validateR17PhoneProbeMetrics(metrics));assert.equal(validateR17PhoneProbeV3Metrics(metrics),false);
    if(version===2) {const terminal=old.probe.terminalSnapshot();assert(validateR17PhoneProbeTerminal(terminal));assert(matchR17PhoneProbeTerminal(metrics,terminal));}
  }
});

test('existing collector accepts v3 with exact retries, immutable seals and legacy coexistence',async()=>{
  const {probe:p,advance}=runtime();p.start('wide-play');p.control('actualPlay',true);advance(15000);p.control('export');
  const metrics=copy(p.snapshot());advance(5000);p.control('pauseAttempt');p.controlResult('pauseAttempt',true);
  p.control('pauseSuccess',true);p.control('terminalExport');const terminal=copy(p.terminalSnapshot());
  const temp=await fs.realpath(os.tmpdir()),directory=await fs.mkdtemp(path.join(temp,'starward-r17-v3-collector-fixture-'));
  try {
    const collector=createR17PhoneProbeCollector(directory);
    assert.equal(await collector.store({...metrics,runId:'../escape'}),400);
    assert.equal(await collector.store(terminal),424);assert.equal((await fs.readdir(directory)).length,0);
    assert.deepEqual(await Promise.all([collector.store(metrics),collector.store(metrics)]),[200,200]);
    const changed=copy(metrics);changed.counters.paintAttempts++;
    assert.equal(await collector.store(changed),409);
    const wrong=copy(terminal);wrong.binding.buildGeneration++;
    assert.equal(await collector.store(wrong),409);
    assert.deepEqual(await Promise.all([collector.store(terminal),collector.store(terminal)]),[200,200]);
    const terminalChanged=copy(terminal);terminalChanged.controls.events.pauseSuccess.lastResult=false;
    assert.equal(await collector.store(terminalChanged),409);
    const file=path.join(directory,`${metrics.variant}-${metrics.runId}.json`);
    assert.deepEqual(JSON.parse(await fs.readFile(file,'utf8')),metrics);
    for(const version of [1,2]) {
      const source=await fs.readFile(path.join(here,version===1?'r17-phone-probe-runtime.ts':'r17-phone-probe-v2-runtime.ts'),'utf8');
      const legacy=runtime(compile(source).outputText);legacy.context.performance.now=()=>1000;
      legacy.probe.start('wide-play');legacy.advance(1000);const old=copy(legacy.probe.snapshot());
      old.runId=`r17-${version}-legacy`;assert.equal(await collector.store(old),200);
      if(version===2) {const oldTerminal=copy(legacy.probe.terminalSnapshot());oldTerminal.runId=old.runId;
        assert.equal(await collector.store(oldTerminal),200);assert.equal(matchR17PhoneProbeTerminal(old,terminal),false);}
    }
    assert.equal((await fs.readdir(directory)).length,5);
  } finally {
    const resolved=await fs.realpath(directory);
    if(path.dirname(resolved).toLowerCase()!==temp.toLowerCase()||!path.basename(resolved).startsWith('starward-r17-v3-collector-fixture-'))throw Error('fixture_cleanup_scope');
    // Regenerable fixture output, exact resolved task-owned directory only.
    await fs.rm(resolved,{recursive:true,force:true});
  }
});
