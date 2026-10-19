import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { addR17ACorrelation } from './r17-a-correlation-instrumentation.mjs';
import { validateR17PhoneProbeMetrics, matchR17PhoneProbeTerminal } from './r17-a-correlation-protocol.mjs';
import { validateR17PhoneProbeMetrics as validateOriginal } from './r17-phone-probe-v3-protocol.mjs';
import { createR17PhoneProbeCollector } from './r17-phone-probe-collector.mjs';
const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(here,'../../../..');
const require = createRequire(import.meta.url), ts = require(path.join(root,'apps/wechat-miniapp/node_modules/typescript'));
const originalRuntime = await fs.readFile(path.join(here,'r17-phone-probe-v3-runtime.ts'),'utf8');
const originalObserver = await fs.readFile(path.join(here,'r17-page-bridge-observer.ts'),'utf8');
const transformed = addR17ACorrelation({ runtime: originalRuntime, pageObserver: originalObserver });
const helper = await fs.readFile(path.join(here,'r17-a-correlation-runtime.ts'),'utf8');
function compile(source) {
  const result = ts.transpileModule(source.replaceAll('__VARIANT__','candidate'), {
    reportDiagnostics:true, compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS},
  });
  assert.equal(result.diagnostics.length,0); return result.outputText;
}
const code = { runtime: compile(transformed.runtime), observer: compile(transformed.pageObserver), helper: compile(helper) };
test('materialized runtime and Page observer strictly typecheck without writing a candidate',()=>{
  const directory=path.join(here,'__virtual_a_correlation__');
  const inputs=new Map([
    [path.join(directory,'r17-phone-probe-runtime.ts'),transformed.runtime.replaceAll('__VARIANT__','candidate')],
    [path.join(directory,'r17-page-bridge-observer.ts'),transformed.pageObserver],
    [path.join(directory,'r17-a-correlation-runtime.ts'),helper],
  ].map(([file,source])=>[file.replaceAll('\\','/'),source]));
  const options={noEmit:true,strict:true,noUncheckedIndexedAccess:true,exactOptionalPropertyTypes:true,
    target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,moduleResolution:ts.ModuleResolutionKind.Bundler,skipLibCheck:true};
  const host=ts.createCompilerHost(options),read=host.readFile,exists=host.fileExists,dirExists=host.directoryExists;
  host.readFile=file=>inputs.get(file.replaceAll('\\','/'))??read(file);
  host.fileExists=file=>inputs.has(file.replaceAll('\\','/'))||exists(file);
  host.directoryExists=file=>path.resolve(file)===path.resolve(directory)||dirExists?.(file);
  const program=ts.createProgram([...inputs.keys()],options,host);
  const diagnostics=ts.getPreEmitDiagnostics(program);
  assert.equal(diagnostics.length,0,ts.formatDiagnosticsWithColorAndContext(diagnostics,{getCurrentDirectory:()=>root,getCanonicalFileName:x=>x,getNewLine:()=> '\n'}));
});
function runtime() {
  let wall=0,offset=0,next=0,available=true;
  const timers=new Map(), context={Date:class extends Date {static now(){return available ? 1_800_000_000_000+wall+offset : NaN;}},
    performance:{now:()=>wall},setTimeout:(run,delay)=>{const id=++next;timers.set(id,{at:wall+delay,run});return id;},clearTimeout:id=>timers.delete(id)};
  function load(source, dependencies={}) {
    const module={exports:{}};
    vm.runInNewContext('(function(exports,require,module){'+source+'\n})',context)(module.exports,name=>{
      if(!Object.hasOwn(dependencies,name))throw Error(name);return dependencies[name];
    },module);return module.exports;
  }
  const extension=load(code.helper), probe=load(code.runtime,{'./r17-a-correlation-runtime':extension}).r17Probe;
  const observer=load(code.observer,{'./r17-phone-probe-runtime':{r17Probe:probe}});
  const advance=amount=>{const end=wall+amount;for(;;){const due=[...timers].filter(([,v])=>v.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];
    if(!due)break;timers.delete(due[0]);wall=due[1].at;due[1].run();}wall=end;};
  const start=()=>{probe.configureBinding({mode:'normal',buildGeneration:27,buildSourceSha256:'a'.repeat(64)});
    probe.start('narrow-play');probe.pageState(0,0,0,1);advance(1000);};
  return {probe,observer,advance,start,jump:delta=>{offset+=delta;},unavailable:value=>{available=!value;}};
}
function prepare(env) {
  const state={at:'2026-01-01T00:00:00Z'};env.probe.intent(state);
  const intent=env.probe.intentSequence(state),token=env.probe.prepareStarted(intent);
  env.advance(2);env.probe.prepareFinished(token);return{token,intent};
}
function request(env, work) { const frame={frameAt:'2026-01-01T00:00:00Z'};env.probe.request(frame,work.token,work.intent);return frame; }
test('phase boundary separates effect-side delay from native admission; repeated requests do not replace first boundary',()=>{
  const e=runtime();e.start();const work=prepare(e);e.probe.pageState(1,0,1,1);e.advance(23);
  const frame=request(e,work);e.advance(5);request(e,work);e.probe.pageState(1,1,0,1);e.advance(7);
  e.probe.paintStarted(frame);e.advance(9);e.probe.accepted(frame,{objects:[]});const data=e.probe.snapshot();
  assert.equal(validateR17PhoneProbeMetrics(data),true);assert.equal(validateOriginal(data),false);
  const a=data.aCorrelation;assert.equal(a.preparationToRequest.p50Ms,23);assert.equal(a.requestToPaint.p50Ms,12);
  assert.equal(a.links[0].firstRequestRelativeMs,1025);assert.deepEqual(Array.from(a.links[0].pageAtPreparationFinish),[0,0,0]);
  assert.deepEqual(Array.from(a.links[0].pageAtRequest),[1,0,1]);assert.deepEqual(Array.from(a.links[0].pageAtPaint),[1,1,0]);
  assert.equal(data.linkage.firstAcceptedIntents,1);assert.equal(data.linkage.links[0].requests,2);
  assert.equal(matchR17PhoneProbeTerminal(data,e.probe.terminalSnapshot()),true);
  e.probe.pageState(999,999,0,1);assert.equal(JSON.stringify(e.probe.snapshot()),JSON.stringify(data),'sealed receipt remains immutable');
});
test('clock discontinuity, subresolution and absent request stay unknown; mode binding cannot change while active',()=>{
  const e=runtime();e.start();assert.equal(e.probe.configureBinding({mode:'cpu-page-only',buildGeneration:28,buildSourceSha256:'b'.repeat(64)}),false);
  const first=prepare(e);const frame=request(e,first);e.jump(-100);e.probe.paintStarted(frame);
  prepare(e);const data=e.probe.snapshot();assert.equal(validateR17PhoneProbeMetrics(data),true);
  assert.equal(data.aCorrelation.preparationToRequest.unknown.belowResolution,1);
  assert.equal(data.aCorrelation.preparationToRequest.unknown.notObserved,1);
  assert.equal(data.aCorrelation.requestToPaint.unknown.clockDiscontinuity,1);
  assert.equal(data.aCorrelation.requestToPaint.unknown.notObserved,1);
  const unavailable=runtime();unavailable.start();const p=prepare(unavailable);unavailable.unavailable(true);request(unavailable,p);
  const value=unavailable.probe.snapshot();assert.equal(value.aCorrelation.preparationToRequest.unknown.clockUnavailable,1);
});
test('actual Page wrapper reports callback state while preserving receiver, result, duplicate and failure behavior',()=>{
  const e=runtime();let callback;const page={setData(data,done){assert.equal(data.allowed,true);callback=done;return 17;}};
  const state=e.observer.r17CreatePageBridgeState(),detach=e.observer.r17AttachPageBridge(page,state);
  e.start();const first=prepare(e);const receiver={receiver:true};let calls=0;
  assert.equal(page.setData({allowed:true},function(value){assert.strictEqual(this,receiver);calls++;return value+1;}),17);
  e.advance(1);const frame=request(e,first);assert.equal(callback.call(receiver,5),6);assert.equal(callback.call(receiver,5),6);assert.equal(calls,2);
  e.advance(1);e.probe.paintStarted(frame);const value=e.probe.snapshot();
  assert.deepEqual(Array.from(value.aCorrelation.links[0].pageAtRequest),[1,0,1]);
  assert.deepEqual(Array.from(value.aCorrelation.links[0].pageAtPaint),[1,1,0]);detach();
});
test('retained ring and eight first/last associations remain bounded and fit strict receipt budget',()=>{
  const e=runtime();e.start();for(let index=0;index<2200;index++){const work=prepare(e);const frame=request(e,work);e.advance(1);e.probe.paintStarted(frame);e.advance(1);e.probe.accepted(frame,{objects:[]});}
  const value=e.probe.snapshot();assert.equal(value.aCorrelation.retainedPreparations,2048);assert.equal(value.aCorrelation.links.length,8);
  assert.equal(value.aCorrelation.requestToPaint.validCalls,2048,'intent sequence is never used as the run identity');
  assert.equal(validateR17PhoneProbeMetrics(value),true);assert.ok(Buffer.byteLength(JSON.stringify(value))<=32768);
  const prior=value.aCorrelation.links[0].prepareToken;e.start();e.advance(1);const empty=e.probe.snapshot();
  assert.equal(empty.aCorrelation.retainedPreparations,0);assert.equal(validateR17PhoneProbeMetrics(empty),true);assert.ok(prior>1);
});
test('new extension is strict, optional for old receipts, and collector preserves dependency/idempotency',async()=>{
  const e=runtime();e.start();const work=prepare(e);e.advance(1);const frame=request(e,work);e.advance(1);e.probe.paintStarted(frame);
  const value=JSON.parse(JSON.stringify(e.probe.snapshot())),terminal=JSON.parse(JSON.stringify(e.probe.terminalSnapshot()));
  const {aCorrelation,...legacy}=value;assert.equal(validateOriginal(legacy),true);assert.equal(validateR17PhoneProbeMetrics(legacy),true);
  const injected=structuredClone(value);injected.aCorrelation.url='https://private.invalid';assert.equal(validateR17PhoneProbeMetrics(injected),false);
  const mismatched=structuredClone(value);mismatched.aCorrelation.links[0].prepareToken++;assert.equal(validateR17PhoneProbeMetrics(mismatched),false);
  const missing=structuredClone(value);missing.aCorrelation.links[0].pageAtRequest=[null,1,0];assert.equal(validateR17PhoneProbeMetrics(missing),false);
  const directory=await fs.mkdtemp(path.join(os.tmpdir(),'starward-r17-a-correlation-check-'));
  try {const store=createR17PhoneProbeCollector(directory);assert.equal(await store.store(terminal),424);
    assert.equal(await store.store(value),200);assert.equal(await store.store(value),200);assert.equal(await store.store(terminal),200);
    const changed=structuredClone(value);changed.aCorrelation.links[0].pageAtRequest=[2,2,0];assert.equal(await store.store(changed),409);
  } finally {assert.ok(path.resolve(directory).startsWith(path.resolve(os.tmpdir())+path.sep+'starward-r17-a-correlation-check-'));await fs.rm(directory,{recursive:true});}
});
