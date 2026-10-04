import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {skyImageContentHash} from '../../../../packages/miniapp-contracts/src/sky-image-display-support';
import {createSkyPublicImageCache,type SkyPublicImageFileSystem} from '../../../../apps/wechat-miniapp/src/services/sky-public-image-cache';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../..');
const out=path.resolve(root,process.argv[2]??'output/sky-catalog-native-reader-1003-r1');
assert(out.startsWith(path.join(root,'output')+path.sep));await fs.mkdir(out,{recursive:false});
const owned=path.join(out,'owned-cache');await fs.mkdir(owned);
const bind=async(p:string)=>{const b=await fs.readFile(p);return {path:path.relative(root,p).replaceAll('\\','/'),bytes:b.length,sha256:createHash('sha256').update(b).digest('hex')};};
const save=async(n:string,x:unknown)=>fs.writeFile(path.join(out,n),JSON.stringify(x,null,2)+'\n',{flag:'wx'});
const files=['apps/wechat-miniapp/src/services/sky-public-image-runtime.ts','apps/wechat-miniapp/src/services/sky-public-image-cache.ts','apps/wechat-miniapp/src/services/sky-public-file-bytes.ts','packages/miniapp-contracts/src/sky-image-display-support.ts'];
const before=await Promise.all(files.map(n=>bind(path.join(root,n))));await save('inputs-before.json',before);
const source=await fs.readFile(path.join(root,files[0]!),'utf8'),ast=ts.createSourceFile('runtime.ts',source,ts.ScriptTarget.Latest,true);
const fn=ast.statements.find((n):n is ts.FunctionDeclaration=>ts.isFunctionDeclaration(n)&&n.name?.text==='readPublishedSkyJson')!;
assert(fn);const compiled=ts.transpileModule(fn.getText(ast).replace(/^export /u,'')+'\nreadPublishedSkyJson;',{compilerOptions:{target:ts.ScriptTarget.ES2020}}).outputText;
await fs.writeFile(path.join(out,'executed-reader.ts'),fn.getText(ast),{flag:'wx'});
const exact=(p:string)=>{const q=path.resolve(p);assert(q.startsWith(owned+path.sep));return q;};
const filesystem:SkyPublicImageFileSystem={async mkdir(){},async list(){return fs.readdir(owned);},async size(p){return(await fs.stat(exact(p))).size;},
 async read(p){return Uint8Array.from(await fs.readFile(exact(p))).buffer;},async write(p,b){await fs.writeFile(exact(p),new Uint8Array(b));},
 async rename(a,b){await fs.rename(exact(a),exact(b));},async remove(p){try{await fs.unlink(exact(p));}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}}};
const rawPath=path.join(root,'workers/miniapp-api/assets/sao-v2/00-00-10-0.json'),raw=await fs.readFile(rawPath);
const asset={format:'json' as const,environment:'e'.repeat(64),bytes:raw.length,sha256:skyImageContentHash(raw),url:'https://fixture.invalid/source.json'};
let transfers=0,reads=0,hold=false,delayed:(()=>void)|undefined,actualFile='';
const cache=createSkyPublicImageCache({fs:filesystem,root:owned,session:'native_reader',byteBudget:32*1024*1024,maxFileBytes:192*1024,
 transfer(){transfers++;return {promise:Promise.resolve(Uint8Array.from(raw).buffer),cancel(){}};}});
const reader=vm.runInNewContext(compiled,{skyImageContentHash,Uint8Array,
 acquirePublishedSkyJson:()=>cache.acquire(asset),Taro:{getFileSystemManager:()=>({readFile(options:any){
  assert.equal(options.encoding,'utf8');actualFile=options.filePath;reads++;
  void fs.readFile(exact(options.filePath),'utf8').then(data=>{const deliver=()=>options.success({data});if(hold)delayed=deliver;else deliver();},options.fail);
 }})}}) as (asset:unknown,url:string,hash:string,signal?:AbortSignal)=>Promise<unknown>;
try{
 const parsed=await reader(asset,asset.url,'a'.repeat(64));assert.deepEqual(JSON.parse(JSON.stringify(parsed)),JSON.parse(raw.toString('utf8')));
 assert(path.basename(actualFile).startsWith('stage-catalog_'));assert.equal(transfers,1);
 hold=true;const cancel=new AbortController(),pending=reader(asset,asset.url,'a'.repeat(64),cancel.signal);void pending.catch(()=>{});
 for(let i=0;i<100&&!delayed;i++)await new Promise(resolve=>setTimeout(resolve,1));assert(delayed);
 const beforeCancel=cache.inspect();assert.equal(beforeCancel.leased,1);cancel.abort();await assert.rejects(pending,/cancelled/);
 const clearing=await cache.clear();assert.equal(clearing.status,'partial');assert.equal(cache.inspect().leased,1);assert.equal((await fs.stat(exact(actualFile))).size,raw.length);
 const heldAfterClear=cache.inspect();delayed!();
 for(let i=0;i<100&&cache.inspect().leased;i++)await new Promise(resolve=>setTimeout(resolve,1));assert.equal(cache.inspect().leased,0);
 assert.equal((await cache.clear()).status,'complete');assert.deepEqual(await fs.readdir(owned),['index-v2.json']);
 const after=await Promise.all(files.map(n=>bind(path.join(root,n))));assert.deepEqual(after,before);await save('inputs-after.json',after);
 const result={status:'CURRENT_NATIVE_UTF8_READER_NEW_CATALOG_NAMES_DEVELOPMENT',source:await bind(rawPath),transfers,reads,
  returnedSourceExactly:true,fileName:path.basename(actualFile),beforeCancel,heldAfterClear,final:cache.inspect(),inventory:await bind(path.join(owned,'index-v2.json')),
  scope:'Actual current readPublishedSkyJson function body/hash helper and encoded owner with real isolated Node files; native UTF8 callback adapter is controlled and held after actual read completion. Runtime URL/environment wrapper injected, not claimed verified here. Not WEAPP/full module/React/Scene/physical memory. No HTTP/source download/production edit.'};
 await save('result.json',result);console.log(JSON.stringify({result:await bind(path.join(out,'result.json')),leases:[beforeCancel.leased,heldAfterClear.leased,cache.inspect().leased]}));
}catch(e){await save('failed.json',{error:String(e),cache:cache.inspect()});throw e;}
