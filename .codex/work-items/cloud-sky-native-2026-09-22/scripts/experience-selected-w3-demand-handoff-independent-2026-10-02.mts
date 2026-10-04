import assert from 'node:assert/strict';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import * as contracts from '@starward/miniapp-contracts';
import {DeepSkyImageryService} from '../../../../workers/miniapp-api/src/deep-sky-imagery.ts';
import {createSkyPublicImageCache} from '../../../../apps/wechat-miniapp/src/services/sky-public-image-cache.ts';

import {startSkyArtworkRequest} from '../../../../apps/wechat-miniapp/src/features/sky/sky-artwork-request.ts';
import {createSkyArtworkLoader,registerSkyNativeImageLifetime,skyNativeImageIsCurrent} from '../../../../apps/wechat-miniapp/src/features/sky/sky-artwork-loader.ts';
import {createSkyGpuTextures} from '../../../../apps/wechat-miniapp/src/features/sky/sky-gpu-textures.ts';
const root=fileURLToPath(new URL('../../../../',import.meta.url)),file=(p:string)=>path.join(root,p),sha=(v:Uint8Array|string)=>createHash('sha256').update(v).digest('hex');
const bind=(p:string)=>{const b=fs.readFileSync(file(p));return{path:p,bytes:b.length,sha256:sha(b)}};
const out=process.argv[2];assert.match(out??'',/^output\/[a-z0-9-]+$/);assert.ok(!fs.existsSync(file(out)));fs.mkdirSync(file(out));
const save=(p:string,v:unknown)=>fs.writeFileSync(file(out+'/'+p),JSON.stringify(v,null,2)+'\n',{flag:'wx'});
fs.copyFileSync(fileURLToPath(import.meta.url),file(out+'/executed-script.mts.txt'),fs.constants.COPYFILE_EXCL);
const sourceNames=['apps/wechat-miniapp/src/features/sky/spot-sky-page.tsx','apps/wechat-miniapp/src/features/sky/deep-sky-image-request.ts',
 'apps/wechat-miniapp/src/services/deep-sky-image-client.ts','apps/wechat-miniapp/src/services/bare-sky-resource.ts','apps/wechat-miniapp/src/services/sky-public-image-cache.ts',
 'apps/wechat-miniapp/src/services/sky-public-image-runtime.ts','apps/wechat-miniapp/src/services/sky-image-bytes.ts','apps/wechat-miniapp/src/features/sky/sky-artwork-request.ts',
 'apps/wechat-miniapp/src/features/sky/sky-artwork-loader.ts','apps/wechat-miniapp/src/features/sky/use-sky-artwork.ts','apps/wechat-miniapp/src/features/sky/sky-gpu-textures.ts',
 'packages/miniapp-contracts/src/deep-sky-image-publication.ts','packages/miniapp-contracts/src/sky-image-display-support.ts','packages/miniapp-contracts/src/generated/miniapp-api.generated.ts',
 'workers/miniapp-api/src/deep-sky-imagery.ts'];
const sources=sourceNames.map(bind);for(let i=0;i<sourceNames.length;i++)fs.copyFileSync(file(sourceNames[i]!),file(out+'/'+i+'-'+path.basename(sourceNames[i]!)+'.txt'),fs.constants.COPYFILE_EXCL);
const protectedFiles=[...sources],baseline=JSON.parse(fs.readFileSync(file('.codex/work-items/cloud-sky-native-2026-09-22/tmp/resume-preserved-hashes-2026-10-01.json'),'utf8'));
for(const b of baseline){assert.equal(bind(b.path).sha256,b.sha256);protectedFiles.push(bind(b.path))}
for(const p of fs.readdirSync(file('workers/miniapp-api/assets/deep-sky'),{recursive:true,withFileTypes:true}) as any[])if(p.isFile())protectedFiles.push(bind(path.relative(root,path.join(p.parentPath,p.name)).replaceAll('\\','/')));
const approvedPNG='workers/miniapp-api/assets/constellations/triangulum-australe.png';protectedFiles.push(bind(approvedPNG));
const asBuffer=(b:Uint8Array)=>Uint8Array.from(b).buffer;
const until=async(predicate:()=>boolean)=>{for(let i=0;i<200&&!predicate();i++)await new Promise(r=>setTimeout(r,5));assert.ok(predicate(),'bounded callback did not arrive')};
const cases:any[]=[],calls:any[]=[],nativeImages:any[]=[];
const base='https://independent.fixture.invalid',preview='independent-preview-fixture';
const producer=new DeepSkyImageryService(),original=producer.discovery('M:42'),archiveHash='87ab6341b43d660e3c93a2430994c0f38b409dafa86216e7e3313e98cdbbc073';
const archiveManifest=JSON.parse(fs.readFileSync(file('workers/miniapp-api/assets/deep-sky/publications/'+archiveHash+'.json'),'utf8'));
const archiveEntry=archiveManifest.entries.find((e:any)=>e.objectRef==='M:42');
const archiveDiscovery={...JSON.parse(JSON.stringify(original)),publicationHash:archiveHash,publicationId:archiveManifest.publicationId,
 sourceId:`imagery:${archiveManifest.publicationId}:${archiveHash}`,source:producer.source('M:42',{publicationHash:archiveHash}),levels:{}} as any;
for(const level of ['OVERVIEW','MEDIUM','DETAIL'] as const){const raw=archiveEntry.levels[level];archiveDiscovery.levels[level]={file:raw.file,downloadUrl:`/v2/sky/deep-sky/${archiveHash}/${raw.file}`,
 sha256:raw.sha256,bytes:raw.bytes,format:raw.imageFormat==='png'?'png':'jpeg',pixels:raw.pixels,width:raw.pixels,height:raw.pixels,fieldDegrees:raw.fieldDegrees,validFraction:null,coverageState:'NOT_MEASURED',
 ...(raw.sourceFiniteMask?{sourceFiniteMask:raw.sourceFiniteMask}:{}),...(raw.displaySupport?{displaySupport:raw.displaySupport}:{})}}
contracts.assertDeepSkyImageDiscovery(archiveDiscovery,'M:42');
let metadata:any=JSON.parse(JSON.stringify(original)),holdImage=false,abortThrows=false,bareBehavior:'normal'|'hold'|'throw'|'reject'='normal';
const held:any[]=[],heldBare:any[]=[],runtimeRoot=file(out+'/native-runtime');
const finish=(promise:Promise<any>,options:any,map:(v:any)=>any=v=>v)=>{void promise.then(value=>options.success(map(value)),cause=>options.fail({errMsg:String(cause.code??cause.message)}))};
const fsManager={
 mkdir(o:any){finish(fsp.mkdir(o.dirPath,{recursive:true}),o)},readdir(o:any){finish(fsp.readdir(o.dirPath),o,files=>({files}))},
 stat(o:any){finish(fsp.stat(o.path),o,stats=>({stats}))},readFile(o:any){finish(fsp.readFile(o.filePath).then(b=>asBuffer(o.length===undefined?b:b.subarray(o.position??0,(o.position??0)+o.length))),o,data=>({data}))},
 writeFile(o:any){finish(fsp.writeFile(o.filePath,Buffer.from(o.data)),o)},rename(o:any){finish(fsp.rename(o.oldPath,o.newPath),o)},
 unlink(o:any){void fsp.unlink(o.filePath).then(o.success,(cause:any)=>o.fail({errMsg:cause.code==='ENOENT'?'unlink:fail no such file or directory':String(cause)}))},
};
const taro={env:{USER_DATA_PATH:runtimeRoot},getFileSystemManager:()=>fsManager,request(options:any){
 const kind=options.responseType==='arraybuffer'?'image':'discovery';calls.push({kind,url:options.url,headers:options.header??null,timeout:options.timeout});
 const task={abort(){if(abortThrows)throw Error('independent_native_abort_throw');options.fail() },catch(){}};
 if(kind==='discovery'){
  if(bareBehavior==='throw')throw Error('independent_request_throw');if(bareBehavior==='reject')return Promise.reject(Error('independent_request_promise_reject'));
  const complete=()=>options.success({statusCode:200,data:metadata});if(bareBehavior==='hold')heldBare.push({task,options,complete});else queueMicrotask(complete);
 }else{
  const relative=new URL(options.url).pathname.split('/').slice(5).join('/');const complete=()=>options.success({statusCode:200,data:asBuffer(fs.readFileSync(file('workers/miniapp-api/assets/deep-sky/'+relative)))});
  if(holdImage)held.push({task,options,complete});else queueMicrotask(complete);
 }
 return task;
}};
const loadModule=(p:string,dependencies:Record<string,any>,append='')=>{const exports:any={},module={exports};
 const text=ts.transpileModule(fs.readFileSync(file(out+'/'+sourceNames.indexOf(p)+'-'+path.basename(p)+'.txt'),'utf8'),{fileName:p,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
 vm.runInNewContext(text+'\n'+append,{exports,module,ArrayBuffer,Uint8Array,DataView,Error,Promise,AbortController,Date,Math,Map,Set,WeakMap,setTimeout,clearTimeout,
  __MINIAPP_API_BASE__:base,__MINIAPP_OPERATOR_PREVIEW_TOKEN__:preview,require(name:string){assert.ok(Object.hasOwn(dependencies,name),name);return dependencies[name]}});return module.exports;};
const bare=loadModule('apps/wechat-miniapp/src/services/bare-sky-resource.ts',{'@tarojs/taro':{__esModule:true,default:taro}});
const runtime=loadModule('apps/wechat-miniapp/src/services/sky-public-image-runtime.ts',{'@tarojs/taro':{__esModule:true,default:taro},'@starward/miniapp-contracts':contracts,'./sky-public-image-cache':{createSkyPublicImageCache}},'module.exports.__reviewOwner=owner;');
const client=loadModule('apps/wechat-miniapp/src/services/deep-sky-image-client.ts',{'@starward/miniapp-contracts':contracts,'./bare-sky-resource':bare,'./sky-public-image-runtime':runtime});
const starter=loadModule('apps/wechat-miniapp/src/features/sky/deep-sky-image-request.ts',{'@starward/miniapp-contracts':contracts});
await runtime.initializeSkyPublicImageCache();const demand=client.beginDeepSkyImageDemand();let demandRetireSignals=0,leaseRetireSignals=0,errors=0,owned:any;
demand.onRetire(()=>demandRetireSignals++);
starter.startDeepSkyImageRequest({reference:'M:42',level:'DETAIL',demand,discover:(signal:any)=>client.getDeepSkyImageDiscovery('M:42',signal),
 acquire:(asset:any,hash:string)=>client.acquireDeepSkyImage(asset,hash),onReady(value:any){owned=value},onError(){errors++}});
await until(()=>Boolean(owned));assert.equal(errors,0);assert.equal(demand.isCurrent(),false);assert.equal(owned.isCurrent(),true);
const afterHandoff=runtime.__reviewOwner().inspect();demand.release();assert.equal(owned.isCurrent(),true);
owned.onRetire(()=>{leaseRetireSignals++;owned.release()});const clear=await runtime.clearSkyPublicImageCache();
assert.equal(demandRetireSignals,0);assert.equal(leaseRetireSignals,1);assert.equal(runtime.__reviewOwner().inspect().leased,0);
save('result.json',{status:'PASS',scope:'Frozen actual client/bare/runtime/starter module bodies with only import mapping, actual core/native Windows task FS; controlled native request callbacks. Not WEAPP/HTTP.',sources,afterHandoff,clear,afterClear:runtime.__reviewOwner().inspect(),demandCurrentAfterHandoff:false,leaseCurrentAfterHandoff:true,demandRetireSignals,leaseRetireSignals,errors,calls});
const after=protectedFiles.map(b=>bind(b.path));save('binding.json',{script:bind(out+'/executed-script.mts.txt'),inputsBefore:protectedFiles,inputsAfter:after,unchanged:JSON.stringify(after)===JSON.stringify(protectedFiles)});assert.deepEqual(after,protectedFiles);
console.log(JSON.stringify({result:bind(out+'/result.json'),binding:bind(out+'/binding.json')}));