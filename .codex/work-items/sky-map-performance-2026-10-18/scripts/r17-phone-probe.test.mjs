import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {validateR17PhoneProbeMetrics} from './r17-phone-probe-protocol.mjs';
const here=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(here,'../../../..');
const require=createRequire(import.meta.url),ts=require(path.join(root,'apps/wechat-miniapp/node_modules/typescript'));
const template=await fs.readFile(path.join(here,'r17-phone-probe-runtime.ts'),'utf8');
function runtime(variant='candidate'){
 let wall=0,next=0;const timers=new Map();
 const context={exports:{},performance:{now:()=>wall},setTimeout:(run,delay)=>{const id=++next;timers.set(id,{at:wall+delay,run});return id;},clearTimeout:id=>timers.delete(id)};
 const source=ts.transpileModule(template.replaceAll('__VARIANT__',variant),{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS}}).outputText;
 vm.runInNewContext(source,context);
 const advance=duration=>{const end=wall+duration;for(;;){const pending=[...timers.entries()].filter(([,value])=>value.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!pending)break;timers.delete(pending[0]);wall=pending[1].at;pending[1].run();}wall=end;};
 return {probe:context.exports.r17Probe,advance};
}
test('probe waits for explicit start, excludes menu close and loading, counts actual accepted copy separately',()=>{
 const {probe,advance}=runtime();
 probe.prepared({frameAt:'2010-01-01T00:00:00.000Z'});
 probe.start('wide-time');
 probe.prepared({frameAt:'2010-01-01T00:00:00.000Z'});advance(1000);
 const frame={frameAt:'2010-01-01T00:00:10.000Z'};
 probe.intent({at:frame.frameAt});probe.prepared(frame);probe.paintStarted(frame);
 probe.measure('base',()=>advance(3));probe.measure('draw',()=>advance(7));
 probe.sceneFinished({skyScene:{catalog:{catalogVersion:'bsc-v2'}},observationFrames:[{at:frame.frameAt,modelAlgorithmVersion:'astronomy-engine-v2'}]},frame.frameAt,
   {points:new Array(8404)},{points:new Array(123),publicationHash:'a'.repeat(64)},390,844,45,'NIGHT',8,2);
 for(let i=0;i<3;i++)probe.count('glDrawSubmissions');probe.callback(frame);
 // Native submission and callback do not certify page acceptance.
 probe.accepted(frame,{objects:[{reference:'HR:1'},{reference:'SAO:2'}]});
 advance(5);const output=probe.snapshot();
 assert.equal(output.counters.preparedRequests,1);assert.equal(output.counters.sceneFinishes,1);
 assert.equal(output.counters.glDrawSubmissions,3);assert.equal(output.counters.acceptedCopies,1);
 assert.equal(output.counters.acceptedBscObjects,1);assert.equal(output.counters.acceptedSaoObjects,1);
 assert.equal(output.scene.baseRowsMax,8404);assert.equal(output.scene.saoRowsMax,123);
 assert.equal(output.cpu.base.totalMs,3);assert.equal(output.cpu.draw.totalMs,7);
 assert.equal(output.timing.nativeCallbackMs.totalMs,10);assert.equal(output.time.accepted.lastRelativeMs,0);
 assert.equal(output.window.elapsedMs,15);assert.equal(output.window.reason,'manual');
 assert(validateR17PhoneProbeMetrics(output));
 assert(!JSON.stringify(output).includes('2010-01-01'));assert(!JSON.stringify(output).includes('HR:1'));
});
test('limit stops without I/O, preserves reason on export, and a new run resets retained samples',()=>{
 const {probe,advance}=runtime('baseline');probe.start('narrow-play');advance(1000);
 probe.prepared({frameAt:'2010-01-01T00:00:00.000Z'});advance(12000);
 assert.equal(probe.status(),'recording');probe.prepared({frameAt:'2010-01-01T00:00:01.000Z'});advance(33000);
 probe.count('acceptedCopies');const first=probe.snapshot();
 assert.equal(first.window.reason,'limit');assert.equal(first.window.durationLimitMs,45000);assert.equal(first.window.elapsedMs,45000);assert.equal(first.counters.acceptedCopies,0);
 assert.equal(first.counters.preparedRequests,2);assert.equal(first.variant,'baseline');assert(validateR17PhoneProbeMetrics(first));
 probe.start('narrow-camera');advance(1000);advance(2);const second=probe.snapshot();
 assert.equal(second.counters.preparedRequests,0);assert.notEqual(first.runId,second.runId);assert(validateR17PhoneProbeMetrics(second));
});
test('collector rejects extra fields, absolute time strings and unbounded payloads',()=>{
 const {probe,advance}=runtime();probe.start('wide-camera');advance(1000);const output=probe.snapshot();
 assert(validateR17PhoneProbeMetrics(output));assert(!validateR17PhoneProbeMetrics({...output,contextId:'private'}));
 assert(!validateR17PhoneProbeMetrics({...output,window:{...output.window,durationLimitMs:12000}}));
 const changed=structuredClone(output);changed.time.accepted.firstRelativeMs='2026-10-18T00:00:00.000Z';assert(!validateR17PhoneProbeMetrics(changed));
 changed.time.accepted.firstRelativeMs=null;changed.scene.catalogVersions=['x'.repeat(40000)];assert(!validateR17PhoneProbeMetrics(changed));
});
test('longer window retains the 2048 sample cap and accurate aggregate/overflow facts',()=>{
 const {probe,advance}=runtime();probe.start('wide-time');advance(1000);
 const origin=Date.parse('2010-01-01T00:00:00.000Z');
 for(let i=0;i<2048;i++){
   probe.measure('base',()=>advance(1));probe.intent({at:new Date(origin+i).toISOString()});
 }
 // Reusing an already retained instant does not overflow the distinct-time set.
 probe.intent({at:new Date(origin).toISOString()});
 const exact=probe.snapshot();
 assert.equal(exact.cpu.base.calls,2048);assert.equal(exact.cpu.base.keptSamples,2048);assert.equal(exact.cpu.base.overflow,false);
 assert.equal(exact.time.intent.events,2049);assert.equal(exact.time.intent.distinct,2048);assert.equal(exact.time.intent.overflow,false);
 assert(validateR17PhoneProbeMetrics(exact));
 probe.start('wide-time');advance(1000);
 for(let i=0;i<2049;i++){
   probe.measure('base',()=>advance(1));probe.intent({at:new Date(origin+i).toISOString()});
 }
 const overflow=probe.snapshot();
 assert.equal(overflow.cpu.base.calls,2049);assert.equal(overflow.cpu.base.totalMs,2049);assert.equal(overflow.cpu.base.keptSamples,2048);assert.equal(overflow.cpu.base.overflow,true);
 assert.equal(overflow.time.intent.events,2049);assert.equal(overflow.time.intent.distinct,2048);assert.equal(overflow.time.intent.overflow,true);
 assert(validateR17PhoneProbeMetrics(overflow));
});
