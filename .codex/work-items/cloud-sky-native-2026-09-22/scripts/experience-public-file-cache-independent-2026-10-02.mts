/** Independent controlled FS/transport review. No native, network or production writes. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { skyImageContentHash } from '../../../../packages/miniapp-contracts/src/sky-image-display-support.ts';

const ROOT = fileURLToPath(new URL('../../../../', import.meta.url));
const script = fileURLToPath(import.meta.url);
const hash = (raw: Uint8Array | string) => createHash('sha256').update(raw).digest('hex');
const read = (name: string) => fs.readFileSync(path.join(ROOT, name));
const bind = (name: string) => { const body = read(name); return { path: name.replaceAll('\\','/'), bytes: body.length, sha256: hash(body) }; };
const names = { core: 'apps/wechat-miniapp/src/services/sky-public-image-cache.ts', bytes: 'apps/wechat-miniapp/src/services/sky-image-bytes.ts',
  adapter: 'apps/wechat-miniapp/src/features/sky/sky-artwork-request.ts', runtime: 'apps/wechat-miniapp/src/services/sky-public-image-runtime.ts',
  digest: 'packages/miniapp-contracts/src/sky-image-display-support.ts' };
const source = Object.fromEntries(Object.entries(names).map(([role,name]) => [role, read(name).toString('utf8')]));
const bindings = Object.values(names).map(bind);
let output = 'output/sky-public-file-cache-independent-1002-r1';
for (let n = 2; fs.existsSync(path.join(ROOT,output)); n++) output = `output/sky-public-file-cache-independent-1002-r${n}`;
fs.mkdirSync(path.join(ROOT, output));
const save = (name: string, value: unknown) => fs.writeFileSync(path.join(ROOT,output,name), JSON.stringify(value,null,2)+'\n', {flag:'wx'});
for (const [role,value] of Object.entries(source)) fs.writeFileSync(path.join(ROOT,output,role+'.ts.txt'),value,{flag:'wx'});
fs.copyFileSync(script, path.join(ROOT,output,'script.mts.txt'),fs.constants.COPYFILE_EXCL);
const compile = (text: string, requires: Record<string,unknown>) => {
  const exports: Record<string,any> = {};
  vm.runInNewContext(ts.transpileModule(text,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,
    { exports, ArrayBuffer, Uint8Array, DataView, Set, Map, Promise, Error, Date, setTimeout, clearTimeout,
      require(name:string){ assert.ok(name in requires,name);return requires[name]; } },{timeout:5000});
  return exports;
};
const byteOwner = compile(source.bytes, {'@starward/miniapp-contracts':{skyImageContentHash}});
const core = compile(source.core, {'./sky-image-bytes':byteOwner});
const adapter = compile(source.adapter, {'../../services/sky-image-bytes':byteOwner});
const catalog = JSON.parse(read('packages/astronomy-core/data/stellarium-modern-v24.4.v3.json').toString());
const image = [...catalog.images].sort((a,b)=>a.bytes-b.bytes)[0];
const fixturePath = 'workers/miniapp-api/assets/constellations/'+image.file;
const fixture = read(fixturePath), N = fixture.length;
assert.equal(hash(fixture),image.sha256); assert.equal(N,image.bytes);
const array = (raw: Uint8Array) => raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength) as ArrayBuffer;
const asset = (environment='e'.repeat(64)) => ({ environment, sha256:image.sha256, bytes:N, width:image.width,height:image.height,format:'png',url:'https://fixture.invalid/approved.png' });
assert.ok(byteOwner.matchesSkyImageBytes(array(fixture),asset()));
assert.equal(skyImageContentHash(fixture),hash(fixture));
const preserved = JSON.parse(read('.codex/work-items/cloud-sky-native-2026-09-22/tmp/resume-preserved-hashes-2026-10-01.json').toString());
for (const item of preserved) assert.equal(bind(item.path).sha256,item.sha256);
const assets201: any[] = [];
function inventory(dir: string) { for (const entry of fs.readdirSync(path.join(ROOT,dir),{withFileTypes:true})) {
  const name=dir+'/'+entry.name;if(entry.isDirectory())inventory(name);else if(entry.isFile())assets201.push(bind(name));
} }
inventory('workers/miniapp-api/assets/deep-sky');
// Historical inventory includes 187 image files and 14 published metadata files.
assert.equal(assets201.length,201);
const drain = async () => { for(let n=0;n<120;n++) await Promise.resolve(); };
const until = async (condition:()=>boolean) => { for(let n=0;n<5000;n++){if(condition())return; await Promise.resolve();} throw Error('bounded_callback_not_reached'); };
const deferred = <T,>() => { let resolve!:(v:T)=>void,reject!:(v:unknown)=>void; const promise=new Promise<T>((yes,no)=>{resolve=yes;reject=no});return{promise,resolve,reject}; };
function harness(factory=core.createSkyPublicImageCache) {
  const root='/controlled/sky-public-images-v1', files=new Map<string,ArrayBuffer>(), events:any[]=[];
  let clock=0, readHook:any, writeHook:any, listHook:any, removeHook:any, renameHook:any, transferHook:any;
  const filesystem = {
    async mkdir(p:string){events.push(['mkdir',p]);},
    async list(p:string){events.push(['list',p]);if(listHook)await listHook(p);return [...files.keys()].filter(k=>k.startsWith(p+'/')).map(k=>k.slice(p.length+1));},
    async size(p:string){if(!files.has(p))throw Error('missing');return files.get(p)!.byteLength;},
    async read(p:string){events.push(['read',p]);if(readHook){const result=await readHook(p);if(result)return result;}if(!files.has(p))throw Error('missing');return files.get(p)!.slice(0);},
    async write(p:string,b:ArrayBuffer){events.push(['write',p,b.byteLength]);if(writeHook)await writeHook(p,b);files.set(p,b.slice(0));},
    async rename(a:string,b:string){events.push(['rename',a,b]);if(renameHook)await renameHook(a,b);if(!files.has(a))throw Error('missing');files.set(b,files.get(a)!);files.delete(a);},
    async remove(p:string){events.push(['remove',p]);if(removeHook)await removeHook(p);files.delete(p);},
  };
  const downloads:any[]=[];
  const make=(session='independent_a', budget=N*4) => factory({fs:filesystem,root,session,byteBudget:budget,maxFileBytes:N,now:()=>++clock,cleanupWaitMs:10,
    transfer(a:any){downloads.push(a);events.push(['transfer',a.environment]);return transferHook?.(a)??{promise:Promise.resolve(array(fixture)),cancel(){events.push(['cancel',a.environment]);}};}});
  return {root,files,events,downloads,make,filesystem,
    set readHook(v:any){readHook=v}, set writeHook(v:any){writeHook=v},set listHook(v:any){listHook=v},
    set removeHook(v:any){removeHook=v},set renameHook(v:any){renameHook=v},set transferHook(v:any){transferHook=v}};
}
const results:any[]=[];
const probe=async(name:string,run:()=>Promise<any>)=>{try{results.push({name,status:'PASS',...await run()});}catch(e){results.push({name,status:'FAILED',error:String(e),stack:(e as Error).stack});throw e;}};
try {
  await probe('dedup-independent-leases-restart-real-PNG',async()=>{
    const h=harness(),c=h.make(); const [a,b]=await Promise.all([c.acquire(asset()).promise,c.acquire(asset()).promise]);
    assert.equal(h.downloads.length,1);assert.equal(a.filePath,b.filePath);assert.equal(c.inspect().leased,2);
    a.release();a.release();assert.equal(c.inspect().leased,1);assert.ok(h.files.has(b.filePath));b.release();await drain();
    const d=h.make('independent_b');await d.ready();const restored=await d.acquire(asset()).promise;
    assert.equal(h.downloads.length,1);assert.equal(restored.filePath,b.filePath);restored.release();await drain();
    return{downloads:h.downloads.length,final:d.inspect(),contentReadback:hash(new Uint8Array(h.files.get(restored.filePath)!))};
  });
  await probe('boot-policy-current-trim-and-guard-bypass-counterexample',async()=>{
    const inventory=async(factory:any)=>{const h=harness(factory),c=h.make('seed',N*4);for(const env of ['a','b','c']){const l=await c.acquire(asset(env.repeat(64))).promise;l.release();await drain();}
      const before=c.inspect(),d=h.make('restart',N*2);await d.ready();return{h,d,before,after:d.inspect()};};
    const actual=await inventory(core.createSkyPublicImageCache);assert.equal(actual.after.entries,2);assert.ok(actual.after.bytes<=N*2);
    const guard='await room(0, false);';assert.equal(source.core.split(guard).length-1,1);
    const mutantText=source.core.replace(guard,'/* bounded task mutation: old inventory bypasses current byte policy */');
    fs.writeFileSync(path.join(ROOT,output,'core-no-boot-trim.ts.txt'),mutantText,{flag:'wx'});
    const mutant=await inventory(compile(mutantText,{'./sky-image-bytes':byteOwner}).createSkyPublicImageCache);
    assert.equal(mutant.after.entries,3);assert.equal(mutant.after.bytes,N*3);
    return{byteBudget:N*2,current:actual.after,mutation:mutant.after,mutationDetected:mutant.after.bytes>N*2};
  });
  await probe('initialization-failure-explicit-retry',async()=>{
    const h=harness();let failures=1;h.listHook=async()=>{if(failures-->0)throw Error('controlled_FS_temporarily_unavailable');};
    const c=h.make();await assert.rejects(c.ready(),/temporarily_unavailable/);await drain();
    const a=await c.acquire(asset()).promise;assert.ok(h.files.has(a.filePath));a.release();await drain();
    return{initialFailureObserved:true,explicitAcquisitionRecovered:true,downloads:h.downloads.length,final:c.inspect()};
  });
  await probe('immediate-settled-job-reacquisition-bounded',async()=>{
    const h=harness(),c=h.make();const first=await c.acquire(asset()).promise;
    const second=c.acquire(asset());let settled=false,lease:any,error:any;
    const observed=second.promise.then(l=>{settled=true;lease=l},e=>{settled=true;error=e.message});
    await until(()=>settled);await observed;assert.equal(error,undefined);assert.equal(lease.filePath,first.filePath);
    assert.equal(h.downloads.length,1);assert.equal(c.inspect().leased,2);first.release();lease.release();await drain();
    return{immediateSameSHAResolved:true,downloads:h.downloads.length,final:c.inspect()};
  });
  await probe('clear-before-boot-real-restored-inventory-fence',async()=>{
    const h=harness(),c=h.make('seed');const old=await c.acquire(asset()).promise;old.release();await drain();
    const gate=deferred<void>();let blocked=false;h.listHook=async()=>{blocked=true;await gate.promise};
    const next=h.make('restart');await until(()=>blocked);const clear=next.clear();h.listHook=undefined;gate.resolve();
    const status=await clear;assert.equal(status.status,'complete');assert.equal(next.inspect().entries,0);assert.ok(!h.files.has(old.filePath));
    return{clear:status,final:next.inspect()};
  });
  await probe('unabortable-stage-clear-new-sameSHA-attempt',async()=>{
    const h=harness(),c=h.make();await c.ready();const gate=deferred<void>();let blocked=false;
    h.writeHook=async(p:string)=>{if(p.includes('/stage-')&&!blocked){blocked=true;await gate.promise}};
    const old=c.acquire(asset()),outcome=old.promise.then(()=>({ready:true}),e=>({error:e.message}));await until(()=>blocked);
    const status=await c.clear();assert.equal(status.status,'pending');const newer=c.acquire(asset());h.writeHook=undefined;gate.resolve();
    const oldResult=await outcome;assert.match(oldResult.error,/cancelled/);const current=await newer.promise;await drain();
    assert.equal(c.inspect().entries,1);assert.ok(h.files.has(current.filePath));assert.equal(c.inspect().reserved,0);
    const index=JSON.parse(Buffer.from(h.files.get(h.root+'/index-v1.json')!).toString());assert.deepEqual(index.entries.map((e:any)=>e.file),[current.filePath.split('/').at(-1)]);
    current.release();return{oldResult,clear:status,newFile:current.filePath,final:c.inspect(),attemptRenames:h.events.filter(e=>e[0]==='rename'&&e[1].includes('/stage-'))};
  });
  await probe('active-corruption-replacement-does-not-unlink-live-decode-lease',async()=>{
    const h=harness(),c=h.make();const old=await c.acquire(asset()).promise;let retired=0;old.onRetire(()=>retired++);
    const corrupted=h.files.get(old.filePath)!.slice(0);new Uint8Array(corrupted)[30]^=1;h.files.set(old.filePath,corrupted);
    const replacement=await c.acquire(asset()).promise;assert.notEqual(old.filePath,replacement.filePath);assert.equal(retired,1);assert.equal(old.isCurrent(),false);
    assert.ok(h.files.has(old.filePath));assert.ok(h.files.has(replacement.filePath));old.release();await drain();assert.ok(!h.files.has(old.filePath));
    replacement.release();await drain();return{retiredSignals:retired,downloads:h.downloads.length,final:c.inspect()};
  });
  await probe('durable-index-half-commit-rejects-uncommitted-hit',async()=>{
    const h=harness(),c=h.make();await c.ready();let fail=true;
    h.renameHook=async(a:string,b:string)=>{if(b.endsWith('/index-v1.json')&&fail){const value=JSON.parse(Buffer.from(h.files.get(a)!).toString());if(value.entries.length){fail=false;throw Error('controlled_index_commit_failure')}}};
    await assert.rejects(c.acquire(asset()).promise,/commit_failure/);await drain();h.renameHook=undefined;
    assert.equal(c.inspect().entries,0);const next=h.make('restart');await next.ready();const a=await next.acquire(asset()).promise;
    assert.equal(h.downloads.length,2);assert.ok(h.files.has(a.filePath));a.release();return{failedCommitNotPromoted:true,downloads:h.downloads.length,final:next.inspect()};
  });
  await probe('failed-orphan-counts-and-clear-recovery',async()=>{
    const h=harness();const orphan=h.root+'/stage-previous-1';h.files.set(orphan,array(fixture));let fail=true;
    h.removeHook=async(p:string)=>{if(p===orphan&&fail)throw Error('controlled_unlink_failed')};const c=h.make('cleanup',N*2);await c.ready();
    const counted=c.inspect();assert.equal(counted.bytes,N);assert.equal(counted.entries,0);fail=false;
    const clear=await c.clear();assert.equal(clear.status,'complete');assert.equal(c.inspect().bytes,0);assert.ok(!h.files.has(orphan));
    return{counted,clear,final:c.inspect()};
  });
  await probe('two-global-unsettled-IO-slots-cancel-is-not-completion',async()=>{
    const h=harness(),gates:any[]=[],c=h.make('bounded',N*8);await c.ready();
    h.transferHook=(a:any)=>{const gate=deferred<ArrayBuffer>();gates.push({a,gate,cancelled:0});return{promise:gate.promise,cancel(){gates.find(g=>g.gate===gate).cancelled++}}};
    const acquisitions=['a','b','c','d','e','f'].map(e=>c.acquire(asset(e.repeat(64))));const outcomes=acquisitions.map(a=>a.promise.then(l=>({lease:l}),e=>({error:e.message})));
    await until(()=>gates.length===2);acquisitions[0].cancel();acquisitions[1].cancel();await drain();assert.equal(gates.length,2);assert.equal(c.inspect().running,2);
    const cancelled=c.inspect();gates[0].gate.resolve(array(fixture));gates[1].gate.resolve(array(fixture));
    await until(()=>gates.length===4);assert.equal(c.inspect().running,2);gates[2].gate.resolve(array(fixture));gates[3].gate.resolve(array(fixture));
    await until(()=>gates.length===6);gates[4].gate.resolve(array(fixture));gates[5].gate.resolve(array(fixture));const result=await Promise.all(outcomes);
    for(const o of result) o.lease?.release();await drain();assert.equal(c.inspect().running,0);assert.equal(c.inspect().reserved,0);
    return{cancelledWhileUnsettled:cancelled,transfers:gates.length,cancelCalls:gates.map(g=>g.cancelled),outcomes:result.map(o=>o.error??'ready'),final:c.inspect()};
  });
  await probe('request-adapter-clear-retirement-late-native-onload',async()=>{
    const h=harness(),c=h.make();const images:any[]=[],ready:any[]=[],fail:any[]=[];
    adapter.startSkyArtworkRequest({asset:asset(),url:asset().url,filePath:'/must-not-write',canvas:{createImage(){const i={src:'',width:image.width,height:image.height,onload:null,onerror:null};images.push(i);return i}},
      acquire:()=>c.acquire(asset()),request(){throw Error('legacy_request_not_allowed')},writeFile(){throw Error('legacy_write_not_allowed')},removeFile(){throw Error('consumer_must_not_unlink_cache')},ready:(x:any)=>ready.push(x),fail:()=>fail.push(true)});
    await until(()=>images.length===1&&images[0].onload);const late=images[0].onload;const clear=await c.clear();late();await drain();
    assert.equal(ready.length,0);assert.equal(fail.length,1);assert.equal(c.inspect().leased,0);assert.equal(c.inspect().retired,0);
    return{lateOnloadRejected:true,ready:ready.length,fail:fail.length,clear,final:c.inspect()};
  });
  await probe('adapter-cold-ownership-old-decoded-release-fenced',async()=>{
    const h=harness(),c=h.make(),images:any[]=[],ready:any[]=[],failed:any[]=[];
    adapter.startSkyArtworkRequest({asset:asset(),url:asset().url,filePath:'/unused',canvas:{createImage(){const i={src:'',width:image.width,height:image.height,onload:null,onerror:null};images.push(i);return i}},
      acquire:()=>c.acquire(asset()),request(){throw Error('legacy')},writeFile(){throw Error('legacy')},removeFile(){throw Error('unlink')},ready:(x:any)=>ready.push(x),fail:()=>failed.push('initial')});
    await until(()=>images[0]?.onload);images[0].onload();const loaded=ready[0],cold=loaded.retainFile();
    loaded.release();assert.equal(c.inspect().leased,1);cold.decode((x:any)=>ready.push(x),()=>failed.push('cold'));
    await until(()=>images[1]?.onload);const late=images[1].onload;const clear=await c.clear();late();await drain();assert.deepEqual(failed,['cold']);assert.equal(ready.length,1);
    assert.equal(c.inspect().leased,1);cold.release();await drain();assert.equal(c.inspect().leased,0);assert.equal(c.inspect().bytes,0);
    return{clear,coldFailure:failed,originalDecodedReady:ready.length,final:c.inspect()};
  });
  await probe('ready-only-unabortable-index-write-clear-response-observation',async()=>{
    const h=harness(),gate=deferred<void>();let blocked=false;h.writeHook=async(p:string)=>{if(p.includes('/index-')&&!blocked){blocked=true;await gate.promise}};
    const c=h.make();const initialization=c.ready();await until(()=>blocked);let settled=false,value:any;
    const clear=c.clear().then((v:any)=>{settled=true;value=v;return v});await drain();const beforeGrace={settled,inspect:c.inspect()};
    await new Promise<void>(r=>setTimeout(r,25));const whileBlocked={settled,inspect:c.inspect(),value};
    assert.equal(settled,true);assert.equal(value.status,'pending');
    h.writeHook=undefined;gate.resolve();await initialization.catch(()=>undefined);await clear;
    await drain();return{beforeGrace,whileBlocked,afterCallback:value,final:c.inspect(),boundedPendingForReadyOnlyIO:true};
  });
  const after=Object.values(names).map(bind);
  for(const item of preserved)assert.equal(bind(item.path).sha256,item.sha256);
  for(const item of assets201)assert.equal(bind(item.path).sha256,item.sha256);
  save('review.json',{status:'PASS_WITH_REPORTED_BOUNDARY',scope:'desktop pure-JS actual source snapshots with independently controlled in-memory FS and transport; no native IO/capacity or actual network',sourceBindings:bindings,currentBindings:after,
    sourceChangedDuringRun:JSON.stringify(bindings)!==JSON.stringify(after),script:bind(path.relative(ROOT,script)),fixture:bind(fixturePath),fixtureDescriptor:asset(),probes:results,
    historicalPublishedAssets:assets201,preservedUnchanged:preserved,limits:['Header/digest qualification is not native image decode or scientific validity.','Encoded payload budget excludes normal index bytes; maximum index overhead separately bounded in code.','Native FS rename semantics, device quota and cross-application launch remain unverified.','Production hook/App/Settings consumer integration not present in these snapshots.']});
}catch(e){save('failed.json',{status:'FAILED',error:String(e),stack:(e as Error).stack,sourceBindings:bindings,fixture:bind(fixturePath),probes:results});process.exitCode=1;}
console.log(JSON.stringify({output,result:fs.existsSync(path.join(ROOT,output,'review.json'))?bind(output+'/review.json'):bind(output+'/failed.json')},null,2));
