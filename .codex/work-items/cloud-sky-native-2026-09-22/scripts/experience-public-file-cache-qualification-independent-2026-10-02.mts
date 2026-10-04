/** Small independent qualification controls against the already-frozen r4 owner. */
import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import vm from 'node:vm';
import {createHash} from 'node:crypto';import {fileURLToPath} from 'node:url';import ts from 'typescript';
import {skyImageContentHash} from '../../../../packages/miniapp-contracts/src/sky-image-display-support.ts';
const ROOT=fileURLToPath(new URL('../../../../',import.meta.url)),script=fileURLToPath(import.meta.url);
const input='output/sky-public-file-cache-independent-1002-r4',read=(name:string)=>fs.readFileSync(path.join(ROOT,name));
const hash=(raw:Uint8Array|string)=>createHash('sha256').update(raw).digest('hex');
const bind=(name:string)=>({path:name,bytes:read(name).length,sha256:hash(read(name))});
let output='output/sky-public-file-cache-qualification-independent-1002-r1';for(let n=2;fs.existsSync(path.join(ROOT,output));n++)output=`output/sky-public-file-cache-qualification-independent-1002-r${n}`;
fs.mkdirSync(path.join(ROOT,output));fs.copyFileSync(script,path.join(ROOT,output,'script.mts.txt'),fs.constants.COPYFILE_EXCL);
function compile(raw:string,deps:any){const exports:any={};vm.runInNewContext(ts.transpileModule(raw,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,
  {exports,ArrayBuffer,Uint8Array,DataView,Set,Map,Promise,Error,Date,setTimeout,clearTimeout,require(n:string){assert.ok(n in deps);return deps[n]}},{timeout:5000});return exports;}
const byte=compile(read(input+'/bytes.ts.txt').toString(),{'@starward/miniapp-contracts':{skyImageContentHash}});
const core=compile(read(input+'/core.ts.txt').toString(),{'./sky-image-bytes':byte});
const fixturePath='workers/miniapp-api/assets/constellations/triangulum-australe.png',raw=read(fixturePath),N=raw.length;
const buffer=()=>raw.buffer.slice(raw.byteOffset,raw.byteOffset+N) as ArrayBuffer;
const view=new DataView(buffer()),asset={environment:'a'.repeat(64),sha256:hash(raw),bytes:N,width:view.getUint32(16),height:view.getUint32(20),format:'png',url:'https://fixture.invalid/approved.png'};
const drain=async()=>{for(let i=0;i<200;i++)await Promise.resolve()};
function harness(){const root='/controlled',files=new Map<string,ArrayBuffer>(),events:any[]=[];let clock=0,readsHook:any,removeHook:any,downloads=0;
  const filesystem={async mkdir(){},async list(){return [...files.keys()].map(p=>p.slice(root.length+1))},async size(p:string){if(!files.has(p))throw Error('missing');return files.get(p)!.byteLength},
    async read(p:string,length:number){events.push(['read',p,length]);if(readsHook)await readsHook(p,length);if(!files.has(p))throw Error('missing');return files.get(p)!.slice(0,length)},
    async write(p:string,b:ArrayBuffer){files.set(p,b.slice(0))},async rename(a:string,b:string){files.set(b,files.get(a)!);files.delete(a)},async remove(p:string){events.push(['remove',p]);if(removeHook)await removeHook(p);files.delete(p)}};
  const make=(session='qualify',budget=N*3)=>core.createSkyPublicImageCache({fs:filesystem,root,session,byteBudget:budget,maxFileBytes:N,cleanupWaitMs:10,now:()=>++clock,transfer(){downloads++;return{promise:Promise.resolve(buffer()),cancel(){}}}});
  return{root,files,events,make,get downloads(){return downloads},set readHook(v:any){readsHook=v},set removeHook(v:any){removeHook=v}};}
const controls:any[]=[];
try{
  {
    const h=harness(),c=h.make(),old=await c.acquire(asset).promise;await drain();
    await assert.rejects(c.acquire({...asset,width:asset.width+1}).promise,/descriptor_conflict/);
    assert.equal(old.isCurrent(),true);assert.ok(h.files.has(old.filePath));assert.equal(h.downloads,1);assert.equal(c.inspect().leased,1);
    controls.push({name:'stored-conflicting-dimensions-preserves-live-lease',downloads:h.downloads,final:c.inspect()});old.release();
  }
  {
    const h=harness(),c=h.make(),old=await c.acquire(asset).promise;old.release();await drain();
    const enlarged=new Uint8Array(N+8192);enlarged.set(raw);h.files.set(old.filePath,enlarged.buffer);h.events.length=0;
    const current=await c.acquire(asset).promise;await drain();assert.notEqual(current.filePath,old.filePath);assert.equal(h.downloads,2);
    assert.ok(!h.events.some(e=>e[0]==='read'&&e[1]===old.filePath));assert.ok(!h.files.has(old.filePath));
    controls.push({name:'oversized-no-reference-corruption-rejected-before-reading',oversizedBytes:enlarged.length,maxRequestedRead:Math.max(...h.events.filter(e=>e[0]==='read').map(e=>e[2])),reads:h.events.filter(e=>e[0]==='read'),final:c.inspect()});current.release();
  }
  {
    const h=harness(),c=h.make(),old=await c.acquire(asset).promise;old.release();await drain();h.events.length=0;let changed=false;
    h.readHook=async(p:string,length:number)=>{if(p===old.filePath&&!changed){changed=true;const enlarged=new Uint8Array(N+100);enlarged.set(raw);h.files.set(p,enlarged.buffer);assert.equal(length,N)}};
    const replacement=await c.acquire(asset).promise;await drain();assert.notEqual(replacement.filePath,old.filePath);assert.equal(h.downloads,2);
    controls.push({name:'read-length-and-post-stat-reject-size-TOCTOU',lengthPassedN:changed,oldRequestedReads:h.events.filter(e=>e[0]==='read'&&e[1]===old.filePath),final:c.inspect()});replacement.release();
  }
  {
    const h=harness(),c=h.make('seed'),old=await c.acquire(asset).promise;old.release();await drain();const indexPath=h.root+'/index-v1.json';
    const index=JSON.parse(Buffer.from(h.files.get(indexPath)!).toString());index.entries[0].url='unexpected-private-placeholder';index.entries[0].refs=999;index.entries[0].retired=true;index.entries[0].listeners=['unexpected'];
    const encoded=Buffer.from(JSON.stringify(index));h.files.set(indexPath,encoded.buffer.slice(encoded.byteOffset,encoded.byteOffset+encoded.length));
    const next=h.make('restart');await next.ready();const actual=JSON.parse(Buffer.from(h.files.get(indexPath)!).toString());
    assert.deepEqual(Object.keys(actual.entries[0]).sort(),['bytes','environment','file','format','height','last','sha256','width']);
    assert.equal(next.inspect().leased,0);assert.equal(next.inspect().retired,0);const lease=await next.acquire(asset).promise;assert.equal(h.downloads,1);lease.release();
    controls.push({name:'persisted-extra-fields-never-restored-or-republished',persistedKeys:Object.keys(actual.entries[0]).sort(),final:next.inspect()});
  }
  {
    const h=harness();const foreigners=['user-photo.png','sky-art-old-1.png','nested/name.png','stage-foreign-not-owned','index-not-stage.json'];
    for(const name of foreigners)h.files.set(h.root+'/'+name,buffer());const c=h.make();await c.ready();const cleared=await c.clear();
    for(const name of foreigners)assert.ok(h.files.has(h.root+'/'+name));controls.push({name:'strict-own-pattern-only-clear',preserved:foreigners,clear:cleared,foreignFilesNotCharged:c.inspect().bytes===0});
  }
  {
    const h=harness();const orphan=h.root+'/stage-failed-1';h.files.set(orphan,buffer());let blocked=true;h.removeHook=async(p:string)=>{if(p===orphan&&blocked)throw Error('controlled_unlink_failure')};
    const c=h.make('quota',N);await c.ready();await assert.rejects(c.acquire(asset).promise,/quota/);await drain();assert.equal(h.downloads,0);assert.equal(c.inspect().bytes,N);
    blocked=false;const cleared=await c.clear();assert.equal(cleared.status,'complete');const recovered=await c.acquire(asset).promise;assert.equal(h.downloads,1);recovered.release();await drain();
    controls.push({name:'unremovable-orphan-conservatively-charged-refuses-transfer-then-recovers',clear:cleared,final:c.inspect()});
  }
  const result={status:'PASS',sourceBindings:[bind(input+'/core.ts.txt'),bind(input+'/bytes.ts.txt')],fixture:bind(fixturePath),script:bind(path.relative(ROOT,script).replaceAll('\\','/')),controls,
    scope:'actual frozen pure-JS owner with independent in-memory FS; no native quota/FS/transport claim'};
  fs.writeFileSync(path.join(ROOT,output,'result.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});
}catch(e){fs.writeFileSync(path.join(ROOT,output,'failed.json'),JSON.stringify({error:String(e),stack:(e as Error).stack,controls},null,2)+'\n',{flag:'wx'});process.exitCode=1}
console.log(JSON.stringify({output,result:bind(output+(fs.existsSync(path.join(ROOT,output,'result.json'))?'/result.json':'/failed.json'))},null,2));
