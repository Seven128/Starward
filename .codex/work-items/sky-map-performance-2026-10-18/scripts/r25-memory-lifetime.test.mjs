import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {validateR25MemoryLifetime,R25_MEMORY_SITES} from './r25-memory-lifetime-protocol.mjs';
import {createR17PhoneProbeCollector} from './r17-phone-probe-collector.mjs';
const require=createRequire(import.meta.url),ts=require('../../../../apps/wechat-miniapp/node_modules/typescript');
const source=await fs.readFile(new URL('./r25-memory-lifetime-observer.ts',import.meta.url),'utf8');
const compiled=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS},reportDiagnostics:true});
assert.equal(compiled.diagnostics.filter(d=>d.category===ts.DiagnosticCategory.Error).length,0);
const module={exports:{}};vm.runInNewContext('(function(exports,module){'+compiled.outputText+'})',{WeakRef})(module.exports,module);
const create=module.exports.createR25MemoryLifetimeObserver;
const binding={generation:28,sourceHash:'a'.repeat(64)};
test('unsupported target stays explicit and seals without invented liveness',()=>{
  const p=create({WeakRef:null,now:()=>100});assert.equal(p.configure(binding),true);p.start();
  p.track('stellar-vectors',[],100);p.checkpoint('active-5');const r=p.seal();
  assert.equal(r.capability,'unsupported');assert.equal(r.checkpoints[1].sites[0].first,null);
  assert.equal(validateR25MemoryLifetime(r),true);
});
test('first and periodic recent witnesses have finite disjoint coverage; sealing does not reobserve',()=>{
  const refs=[];class Reference{constructor(value){this.value=value;this.dead=false;refs.push(this);}deref(){return this.dead?undefined:this.value;}}
  let wall=100;const p=create({WeakRef:Reference,now:()=>wall});p.configure(binding);p.start();
  for(let i=0;i<1100;i++)p.track('stellar-vectors',[],8404);
  // The first constructed reference belongs to capability detection.
  for(const ref of refs.slice(1,33))ref.dead=true;
  wall=5100;p.checkpoint('active-5');const r=p.seal(),s=r.checkpoints[1].sites[0];
  assert.equal(s.allocations,1100);assert.equal(s.totalQuantity,1100*8404);
  assert.equal(s.first.collected,32);assert.equal(s.recent.witnesses,32);
  assert.equal(s.selected,32+Math.floor((1100-32)/16));
  assert.equal(s.first.witnesses+s.recent.witnesses+s.evictedWitnesses,s.selected);
  assert.equal(validateR25MemoryLifetime(r),true);
  const bytes=JSON.stringify(r);p.track('stellar-vectors',[],1);p.checkpoint('end');p.mark('pause');p.stop();
  assert.strictEqual(p.seal(),r);assert.equal(JSON.stringify(r),bytes);assert(Object.isFrozen(r.checkpoints));
});
test('invalid clock, cap omissions and quantity overflow remain visible within the export budget',()=>{
  class Reference{constructor(value){this.value=value;}deref(){return this.value;}}let wall=100;const p=create({WeakRef:Reference,now:()=>wall});p.configure(binding);p.start();
  for(const site of R25_MEMORY_SITES)for(let i=0;i<600;i++)p.track(site,{},1e12);
  wall=99;for(let i=0;i<12;i++)p.checkpoint('active-5');for(let i=0;i<12;i++)p.mark('pause');
  assert.equal(p.checkpoint('end'),true);
  const r=p.seal();assert.equal(r.clock.invalid,true);assert.equal(r.clock.elapsedMs,null);
  assert.equal(r.clock.backwardReads,1);assert.equal(r.diagnostics.overflow,true);
  assert.equal(r.checkpoints.length,10);assert.equal(r.diagnostics.checkpointOmitted,4);
  assert.equal(r.events.length,8);assert.equal(r.diagnostics.eventOmitted,5);
  assert(Buffer.byteLength(JSON.stringify(r))<=32768);assert.equal(validateR25MemoryLifetime(r),true);
  assert.equal(validateR25MemoryLifetime({...r,runId:'../private'}),false);
  assert.equal(validateR25MemoryLifetime({...r,unapproved:'payload'}),false);
});
test('real weak witnesses do not strongly retain observed objects across jobs', {skip:typeof global.gc!=='function'},async()=>{
  const p=create({now:()=>Date.now(),WeakRef});p.configure(binding);p.start();
  let live=new Array(128).fill(1);p.track('stellar-vectors',live,128);
  let witness=new WeakRef(live);live=null;
  let collected=false;
  for(let i=0;i<20;i++){
    await new Promise(resolve=>setImmediate(resolve));global.gc();
    await new Promise(resolve=>setImmediate(resolve));
    if(witness.deref()===undefined){collected=true;break;}
  }
  assert.equal(collected,true,'the diagnostic must not become the strong retaining root');
  p.checkpoint('drain-10');const r=p.seal();assert.equal(r.checkpoints[1].sites[0].first.collected,1);
  assert.equal(validateR25MemoryLifetime(r),true);witness=null;
});
test('valid-clock mixed liveness and the maximum representable receipt fit the collector budget',()=>{
  const refs=[];class Reference{constructor(value){this.value=value;this.dead=false;refs.push(this);}deref(){return this.dead?undefined:this.value;}}
  let wall=100;const p=create({WeakRef:Reference,now:()=>wall});p.configure(binding);p.start();
  for(let round=0;round<8;round++){
    for(const site of R25_MEMORY_SITES)for(let i=0;i<700;i++)p.track(site,{},1e12);
    for(let i=1;i<refs.length;i++)refs[i].dead=i%2===0;
    wall+=10001;p.checkpoint('scope-ended');
  }
  for(let i=0;i<7;i++)p.mark('scope');p.checkpoint('end');
  const r=p.seal();assert.equal(r.clock.invalid,false);assert.equal(validateR25MemoryLifetime(r),true);
  // A conservative serialization bound: every allowed numeric field takes its
  // longest legal decimal form, even when that combination is unreachable.
  const upper=JSON.parse(JSON.stringify(r));upper.runId='r25-'+ '9'.repeat(12)+'-'+ 'z'.repeat(10);
  upper.binding.generation=1e12;
  const extend=value=>{for(const [key,item] of Object.entries(value)){
    if(item===null&&['relativeMs','elapsedMs','ageMinMs','ageMaxMs'].includes(key))value[key]=120000;
    else if(typeof item==='number')value[key]=['siteIndex','first','recent','strideAfterFirst','checkpoints','events'].includes(key)?item:
      ['witnesses','alive','collected','unknown','ageUnknown'].includes(key)?32:
      ['relativeMs','elapsedMs','ageMinMs','ageMaxMs'].includes(key)?120000:1e12;
    else if(key==='phase')value[key]='scope-ended';
    else if(typeof item==='boolean')value[key]=false;
    else if(item&&typeof item==='object')extend(item);
  }};
  extend(upper);
  const upperBytes=Buffer.byteLength(JSON.stringify(upper));
  assert(upperBytes<=32768,'all permitted fixed-schema numbers must fit: '+upperBytes);
  const invalid=JSON.parse(JSON.stringify(r));invalid.clock.invalid=true;assert.equal(validateR25MemoryLifetime(invalid),false);
});
test('checkpoint snapshots freeze only exported scalars and allow later observation and terminal seal',()=>{
  let wall=100;class Reference{constructor(value){this.value=value;}deref(){return this.value;}}
  const p=create({WeakRef:Reference,now:()=>wall});p.configure(binding);p.start();
  const baseline=p.snapshot(), baselineBytes=JSON.stringify(baseline);
  assert.equal(validateR25MemoryLifetime(baseline),true);assert(Object.isFrozen(baseline.events));
  p.track('stellar-vectors',[],17);wall=5100;p.checkpoint('active-5');
  const active=p.snapshot();assert.equal(active.checkpoints.length,1);
  assert.equal(active.checkpoints[0].sites[0].allocations,1);assert.equal(validateR25MemoryLifetime(active),true);
  p.mark('pause');p.checkpoint('paused');p.checkpoint('end');const sealed=p.seal();
  assert.equal(sealed.checkpoints.length,4);assert.equal(p.snapshot(),null);
  assert.equal(JSON.stringify(baseline),baselineBytes);assert.equal(active.events.length,1);
  assert.equal(validateR25MemoryLifetime(sealed),true);
});
test('collector validates before disk access and keeps exact retry, conflict and capacity behavior',async()=>{
  const temp=await fs.mkdtemp(path.join(os.tmpdir(),'starward-r25-collector-'));
  try{
    const p=create({WeakRef:null,now:()=>100});p.configure(binding);p.start();const r=JSON.parse(JSON.stringify(p.seal()));
    const directory=path.join(temp,'receipts'),collector=createR17PhoneProbeCollector(directory);
    assert.equal(await collector.store({...r,runId:'../../outside'}),400);
    await assert.rejects(fs.stat(directory),{code:'ENOENT'});
    assert.equal(await collector.store({...r,unknown:'x'.repeat(32768)}),400);
    assert.equal(await collector.store(r),200);assert.equal(await collector.store(r),200);
    const conflicting=structuredClone(r);conflicting.clock.reads++;assert.equal(await collector.store(conflicting),409);
    assert.deepEqual(JSON.parse(await fs.readFile(path.join(directory,'baseline-'+r.runId+'.json'),'utf8')),r);
    for(let i=0;i<31;i++)await fs.writeFile(path.join(directory,'reserved-'+i+'.json'),'{}',{flag:'wx'});
    assert.equal(await collector.store({...r,runId:'r25-2-abc'}),429);
    assert.equal(await collector.store(r),200,'idempotent retry still works at capacity');
  }finally{await fs.rm(temp,{recursive:true,force:true});}
});
