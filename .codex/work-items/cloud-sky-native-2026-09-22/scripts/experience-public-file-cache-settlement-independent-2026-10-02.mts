/** Bounded actual immutable owner snapshot reproduction of settlement/join race. */
import fs from 'node:fs';import path from 'node:path';import vm from 'node:vm';import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';import {fileURLToPath} from 'node:url';import ts from 'typescript';
import {skyImageContentHash} from '../../../../packages/miniapp-contracts/src/sky-image-display-support.ts';
const root=fileURLToPath(new URL('../../../../',import.meta.url)),script=fileURLToPath(import.meta.url);
const generation=process.argv[2]??'output/sky-public-file-cache-independent-1002-r3';
const read=(name:string)=>fs.readFileSync(path.join(root,name));const hash=(raw:Uint8Array|string)=>createHash('sha256').update(raw).digest('hex');
const bind=(name:string)=>({path:name,bytes:read(name).length,sha256:hash(read(name))});
let output='output/sky-public-file-cache-settlement-independent-1002-r1';for(let n=2;fs.existsSync(path.join(root,output));n++)output=`output/sky-public-file-cache-settlement-independent-1002-r${n}`;
fs.mkdirSync(path.join(root,output));fs.copyFileSync(script,path.join(root,output,'script.mts.txt'),fs.constants.COPYFILE_EXCL);
function compile(source:string,deps:any){const exports:any={};vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,
  {exports,ArrayBuffer,Uint8Array,DataView,Set,Map,Promise,Error,Date,setTimeout,clearTimeout,require(n:string){assert.ok(n in deps);return deps[n]}},{timeout:5000});return exports;}
const coreInput=generation+'/core.ts.txt',byteInput=generation+'/bytes.ts.txt';
const bytes=compile(read(byteInput).toString(),{'@starward/miniapp-contracts':{skyImageContentHash}});
const core=compile(read(coreInput).toString(),{'./sky-image-bytes':bytes});
const fixturePath='workers/miniapp-api/assets/constellations/triangulum-australe.png',fixture=read(fixturePath),data=fixture.buffer.slice(fixture.byteOffset,fixture.byteOffset+fixture.length);
const view=new DataView(data),asset={environment:'a'.repeat(64),sha256:hash(fixture),bytes:fixture.length,width:view.getUint32(16),height:view.getUint32(20),format:'png',url:'https://fixture.invalid/approved.png'};
const files=new Map<string,ArrayBuffer>();let transfers=0;const cache=core.createSkyPublicImageCache({root:'/controlled',byteBudget:fixture.length*3,maxFileBytes:fixture.length,session:'settlement',cleanupWaitMs:10,
  fs:{async mkdir(){},async list(){return [...files.keys()].map(p=>p.slice('/controlled/'.length))},async size(p:string){if(!files.has(p))throw Error('missing');return files.get(p)!.byteLength},
    async read(p:string){if(!files.has(p))throw Error('missing');return files.get(p)!.slice(0)},async write(p:string,b:ArrayBuffer){files.set(p,b.slice(0))},async rename(a:string,b:string){files.set(b,files.get(a)!);files.delete(a)},async remove(p:string){files.delete(p)}},
  transfer(){transfers++;return{promise:Promise.resolve(data.slice(0)),cancel(){}}}});
const first=await cache.acquire(asset).promise;const immediatelyAfterFirst=cache.inspect();
const second=cache.acquire(asset);let secondSettled=false,secondLease:any,secondError:any;
const observation=second.promise.then((l:any)=>{secondSettled=true;secondLease=l},(e:any)=>{secondSettled=true;secondError=e.message});
for(let i=0;i<1000;i++)await Promise.resolve();await new Promise<void>(r=>setTimeout(r,10));
const afterBound={settled:secondSettled,error:secondError??null,inspect:cache.inspect(),transfers};
second.cancel();await observation;first.release();secondLease?.release();for(let i=0;i<100;i++)await Promise.resolve();
const result={sourceBindings:[bind(coreInput),bind(byteInput)],fixture:bind(fixturePath),script:bind(path.relative(root,script).replaceAll('\\','/')),
  immediatelyAfterFirst,afterBound,bugDetected:!afterBound.settled&&afterBound.inspect.pending===0&&afterBound.inspect.running===0,
  scope:'Actual pure-JS cache owner immutable snapshot; same real PNG, immediate acquire in await continuation, bounded microtasks plus 10ms; no native or network',final:cache.inspect()};
fs.writeFileSync(path.join(root,output,'result.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({output,result:bind(output+'/result.json'),bugDetected:result.bugDetected},null,2));
