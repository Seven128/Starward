/** Actual installed Taro React renderer/Query Provider and complete Sky Hook.
 * Native API, storage and callback transport are explicitly controlled. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
import {catalogJsonIntegrity} from '../../../../packages/miniapp-contracts/src/catalog-json-integrity.ts';
import {saoCatalogSource} from '../../../../workers/miniapp-api/src/sao-catalog-source.ts';
import {StellarCatalogPublicationService} from '../../../../workers/miniapp-api/src/stellar-catalog-publication.ts';
import {createBsc5pGeometryFrame} from '../../../../workers/miniapp-api/src/stellar-geometry-provider.ts';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../..'),app=path.join(root,'apps/wechat-miniapp');
const out=path.resolve(root,process.argv[2]??'output/sky-real-taro-query-1003-r1');assert(out.startsWith(path.join(root,'output')+path.sep));await fs.mkdir(out,{recursive:false});
const save=async(n:string,v:unknown)=>fs.writeFile(path.join(out,n),JSON.stringify(v,null,2)+'\n',{flag:'wx'});
const hash=(b:Buffer)=>createHash('sha256').update(b).digest('hex');
const bind=async(p:string)=>{const b=await fs.readFile(path.join(root,p));return {path:p,bytes:b.length,sha256:hash(b)};};
await fs.copyFile(fileURLToPath(import.meta.url),path.join(out,'executed-script.mts'));
const cp=JSON.parse(await fs.readFile(path.join(root,'.codex/work-items/cloud-sky-native-2026-09-22/evidence/current-execution-state-2026-10-03-r50.json'),'utf8'));
for(const v of [...cp.currentSources,...cp.protected])assert.deepEqual(await bind(v.path),v);
const entry=`import React from 'react';
import {QueryClientProvider} from '@tanstack/react-query';
import {render,unmountComponentAtNode} from '@tarojs/react';
import {document} from '@tarojs/runtime';
import {useSkyStellarSupplement} from './src/features/sky/use-sky-stellar-supplement';
import {miniappQueryClient} from './src/services/query-client';
export * from './src/services/api-client';
export * from './src/services/sky-public-image-runtime';
export {miniappQueryClient,React,document,render,unmountComponentAtNode};
export function Consumer({scene,view,active,accepted}){
 const value=useSkyStellarSupplement(scene,scene.frames[0].at,view,active,-30);
 React.useEffect(()=>{accepted(value);},[value.publication,value.frame,value.loading,value.failed,value.retry]);
 return React.createElement('view',{id:'sky-query-consumer'},React.createElement('text',null,JSON.stringify({active,
  points:value.frame?.points.length??0,loading:value.loading,failed:value.failed,hash:value.publication?.publicationHash??null})));
}
export function mount(container,props){render(React.createElement(QueryClientProvider,{client:miniappQueryClient},React.createElement(Consumer,props)),container);}
`;
const req=createRequire(path.join(app,'package.json')),observed:unknown[]=[];
const bundle=await build({stdin:{contents:entry,resolveDir:app,sourcefile:'task-real-taro-query.ts',loader:'ts'},
 absWorkingDir:root,bundle:true,write:false,metafile:true,platform:'node',format:'esm',target:'es2022',tsconfig:path.join(app,'tsconfig.json'),logLevel:'silent',
 define:{'process.env.TARO_ENV':'"weapp"','process.env.TARO_PLATFORM':'"mini"','process.env.SUPPORT_TARO_POLYFILL':'"disabled"','process.env.NODE_ENV':'"development"',
 ENABLE_INNER_HTML:'true',ENABLE_ADJACENT_HTML:'false',ENABLE_SIZE_APIS:'false',ENABLE_TEMPLATE_CONTENT:'false',ENABLE_CLONE_NODE:'false',ENABLE_CONTAINS:'false',ENABLE_MUTATION_OBSERVER:'false',
 __MINIAPP_API_BASE__:'"https://approved.fixture.invalid"',__MINIAPP_DEVELOPMENT_FIXTURE_MODE__:'false',__MINIAPP_OPERATOR_PREVIEW_TOKEN__:'""',
 __MINIAPP_ACCEPTANCE_DIAGNOSTICS__:'false',__MINIAPP_DEVICE_REQUEST_DIAGNOSTICS__:'false'},
 plugins:[{name:'same-app-react-and-explicit-native-ports',setup(b){
  b.onResolve({filter:/^(?:react(?:\/.*)?|@tanstack\/(?:react-query|query-core))$/},a=>({path:req.resolve(a.path)}));
  b.onResolve({filter:/^@tarojs\/taro$/},()=>({path:'taro',namespace:'controlled-native'}));
  b.onLoad({filter:/.*/,namespace:'controlled-native'},()=>({contents:'export default globalThis.__actualSkyQueryPort;',loader:'ts'}));
  b.onLoad({filter:/[\\/]sky-public-image-cache\.ts$/},async a=>{
   const raw=await fs.readFile(a.path,'utf8'),s=raw.replace('export function createSkyPublicImageCache(','function createActualSkyPublicImageCache(')+
    '\nexport function createSkyPublicImageCache(...args:Parameters<typeof createActualSkyPublicImageCache>){const value=createActualSkyPublicImageCache(...args);globalThis.__skyQueryOwners.push(value);return value;}\n';
   assert.notEqual(raw,s);observed.push({path:path.relative(root,a.path).replaceAll('\\','/'),originalSha256:hash(Buffer.from(raw)),diagnosticSha256:hash(Buffer.from(s))});return {contents:s,loader:'ts'};
  });
  b.onLoad({filter:/[\\/]sky-stellar-tile-loader\.ts$/},async a=>{
   const raw=await fs.readFile(a.path,'utf8');const s=raw.replace('export function createSkyStellarTileLoader(','function createActualSkyStellarTileLoader(')+
    '\nexport function createSkyStellarTileLoader(deps:Parameters<typeof createActualSkyStellarTileLoader>[0]){const record:any={disposed:false,states:[]};const value=createActualSkyStellarTileLoader({...deps,changed:state=>{record.states.push({tiles:state.tiles.map(t=>t.tile.tileId),loading:state.loading,failed:state.failed});deps.changed(state);}});const dispose=value.dispose;value.dispose=()=>{record.disposed=true;return dispose();};globalThis.__skyQueryLoaders.push(record);return value;}\n';
   assert.notEqual(raw,s);observed.push({path:path.relative(root,a.path).replaceAll('\\','/'),originalSha256:hash(Buffer.from(raw)),diagnosticSha256:hash(Buffer.from(s))});return {contents:s,loader:'ts'};
  });
 }}]});
const sourceBindings=[];
await save('metafile.json',bundle.metafile);
const virtualEntry=path.relative(root,path.join(app,'task-real-taro-query.ts')).replaceAll('\\','/');
assert(Object.hasOwn(bundle.metafile!.inputs,virtualEntry));
for(const key of Object.keys(bundle.metafile!.inputs)){
 if(key===virtualEntry||key==='controlled-native:taro')continue;
 const n=path.relative(root,path.resolve(root,key)).replaceAll('\\','/');assert(!n.startsWith('../'));sourceBindings.push(await bind(n));
}
assert(!sourceBindings.some(v=>/^node_modules\/react\//.test(v.path)));
assert(!sourceBindings.some(v=>/^node_modules\/@tanstack\//.test(v.path)));
await save('source-bindings-before.json',sourceBindings);await save('observed-boundaries.json',observed);
await fs.writeFile(path.join(out,'consumer.mjs'),bundle.outputFiles[0]!.text,{flag:'wx'});
const indexPath='workers/miniapp-api/assets/sao-v2/index.json',index=JSON.parse(await fs.readFile(path.join(root,indexPath),'utf8'));
const envelope={apiVersion:'v2',data:{publicationHash:catalogJsonIntegrity(index).sha256,index},dataState:'FRESH',generatedAt:new Date().toISOString(),
 validAt:null,sources:[saoCatalogSource(index)],warnings:[],etag:'current-source-index',requestId:'current-source-index'};
const catalog=new StellarCatalogPublicationService().get({catalogVersion:index.baseCatalogVersion,catalogHash:index.baseAssetSha256}).data;
const observer={latitude:22.6,longitude:114.5,elevationM:30},at='2026-10-03T13:00:00.000Z';
const scene={state:'AVAILABLE',publication:catalog,observer,frames:[{at,geometry:createBsc5pGeometryFrame(catalog,{...observer,at:new Date(at)})}]};
const view={width:390,height:844,verticalFovDeg:85,center:{x:195,y:422},basis:{right:[1,0,0],up:[0,-0.25881904510252085,0.9659258262890683],forward:[0,0.9659258262890683,0.25881904510252085]}};
await save('scientific-inputs.json',{catalogRows:catalog.rows.length,index:await bind(indexPath),observer,at,geometry:scene.frames[0].geometry,view});
const owned=path.join(out,'owned-files');await fs.mkdir(owned);const storage=new Map<string,any>(),requests:any[]=[],nativeReads:any[]=[],held:any[]=[];
let failOne=false,holdOne=false,portSequence=0;
const exact=(p:string)=>{const q=path.resolve(p);assert(q.startsWith(owned+path.sep));return q;};
const callback=(run:()=>Promise<any>,options:any,shape:(value:any)=>any=()=>({}))=>{void run().then(v=>options.success?.(shape(v)),e=>options.fail?.({errMsg:'no such file or directory: '+String(e)}));};
const native={mkdir:(o:any)=>callback(()=>fs.mkdir(exact(o.dirPath),{recursive:true}),o),readdir:(o:any)=>callback(()=>fs.readdir(exact(o.dirPath)),o,files=>({files})),
 stat:(o:any)=>callback(()=>fs.stat(exact(o.path)),o,stats=>({stats})),writeFile:(o:any)=>callback(()=>fs.writeFile(exact(o.filePath),new Uint8Array(o.data)),o),
 rename:(o:any)=>callback(()=>fs.rename(exact(o.oldPath),exact(o.newPath)),o),unlink:(o:any)=>callback(()=>fs.unlink(exact(o.filePath)),o),
 readFile(o:any){void fs.readFile(exact(o.filePath)).then(b=>{const text=o.encoding==='utf8';const delivery=()=>o.success({data:text?b.toString('utf8'):Uint8Array.from(b.subarray(o.position??0,o.length===undefined?undefined:(o.position??0)+o.length)).buffer});
  if(text){nativeReads.push({file:path.basename(o.filePath),bytes:b.length,sha256:hash(b)});if(holdOne){holdOne=false;held.push({file:o.filePath,bytes:b.length,sha256:hash(b),delivery});return;}}delivery();},e=>o.fail({errMsg:'no such file or directory: '+String(e)}));}};
const port={env:{USER_DATA_PATH:owned},getEnv:()=> 'WEAPP',getFileSystemManager:()=>native,getStorageSync:(key:string)=>storage.get(key),setStorageSync:(key:string,data:any)=>storage.set(key,data),removeStorageSync:(key:string)=>storage.delete(key),
 getStorage:(o:any)=>queueMicrotask(()=>storage.has(o.key)?o.success({data:storage.get(o.key)}):o.fail({errMsg:'missing'})),
 setStorage:(o:any)=>Promise.resolve().then(()=>{storage.set(o.key,o.data);o.success?.({});return {}; }),removeStorage:(o:any)=>Promise.resolve().then(()=>{storage.delete(o.key);o.success?.({});return {}; }),
 getStorageInfoSync:()=>({keys:[...storage.keys()],currentSize:0,limitSize:10240}),getSystemInfoSync:()=>({platform:'devtools',SDKVersion:'3.15.0'}),
 request(options:any){const record={id:++portSequence,url:options.url,format:options.responseType??'json',aborted:false,status:0,bytes:0};requests.push(record);
  void (async()=>{if(record.format==='arraybuffer'){
   const id=options.url.split('/').at(-1),tile=index.tiles.find((t:any)=>t.id===id);assert(tile);const raw=await fs.readFile(path.join(root,'workers/miniapp-api/assets/sao-v2',tile.file));
   if(record.aborted)return;if(failOne){failOne=false;record.status=503;options.success({statusCode:503,data:new ArrayBuffer(0)});return;}
   record.status=200;record.bytes=raw.length;options.success({statusCode:200,data:Uint8Array.from(raw).buffer});
  }else{assert(options.url.endsWith('/v2/sky/supplements/sao/v2'));await new Promise(r=>setTimeout(r,1));if(!record.aborted){record.status=200;record.bytes=Buffer.byteLength(JSON.stringify(envelope));options.success({statusCode:200,data:envelope,header:{ETag:'current-source-index'}});}}})().catch(e=>options.fail({errMsg:String(e)}));
  return {abort(){record.aborted=true;queueMicrotask(()=>options.fail({errMsg:'request:fail abort'}));},catch(){}};
 }};
(globalThis as any).__actualSkyQueryPort=port;(globalThis as any).__skyQueryOwners=[];(globalThis as any).__skyQueryLoaders=[];
const api=await import(pathToFileURL(path.join(out,'consumer.mjs')).href),container=api.document.createElement('view');
let latest:any,active=true;const commits:any[]=[],objects=new WeakMap<object,number>();let identity=0;
const id=(value:object|undefined)=>value?(objects.get(value)??(objects.set(value,++identity),identity)):null;
const accepted=(v:any)=>{latest=v;commits.push({active,publicationIdentity:id(v.publication),hash:v.publication?.publicationHash??null,points:v.frame?.points.length??0,loading:v.loading,failed:v.failed,
  queryPresent:!!api.miniappQueryClient.getQueryData(['sao-index','v2']),cache:(globalThis as any).__skyQueryOwners.map((o:any)=>o.inspect())});};
const render=(shown:boolean)=>{active=shown;api.mount(container,{scene,view,active:shown,accepted});};
const wait=async(fn:()=>boolean)=>{for(let i=0;i<1000;i++){if(fn())return;await new Promise(r=>setTimeout(r,2));}throw Error('bounded React consumer state wait expired');};
const trace:any[]=[];
const checkpoint=(name:string)=>{const row={name,...commits.at(-1),queryPresent:!!api.miniappQueryClient.getQueryData(['sao-index','v2']),cache:(globalThis as any).__skyQueryOwners.map((o:any)=>o.inspect()),logicalText:container.textContent,requests:requests.length,nativeReads:nativeReads.length,loaders:(globalThis as any).__skyQueryLoaders.map((l:any)=>({disposed:l.disposed,last:l.states.at(-1)}))};trace.push(row);return row;};
try{
 render(true);await wait(()=>latest&&!latest.loading&&!latest.failed&&(latest.frame?.points.length??0)>0);const cold=checkpoint('cold-ready');
 assert.equal((globalThis as any).__skyQueryOwners.length,1);assert(cold.logicalText.includes(String(cold.points)));
 render(false);await wait(()=>latest?.frame===null&&!latest.loading);checkpoint('hidden');
 await api.clearTemporaryApiCache();assert.equal(api.miniappQueryClient.getQueryData(['sao-index','v2']),undefined);checkpoint('actual-clear-hidden');
 failOne=true;render(true);await wait(()=>latest?.failed&&!latest.loading&&(latest.frame?.points.length??0)>0);const partial=checkpoint('returned-one-tile-failed');
 assert.equal(partial.hash,cold.hash);assert.notEqual(partial.publicationIdentity,cold.publicationIdentity);assert(partial.points<cold.points);
 latest.retry();await wait(()=>latest&&!latest.failed&&!latest.loading&&latest.frame?.points.length===cold.points);checkpoint('explicit-retry-ready');
 holdOne=true;latest.retry();await wait(()=>held.length===1);const heldBefore=(globalThis as any).__skyQueryOwners[0].inspect();
 render(false);await wait(()=>latest?.frame===null&&!latest.loading);const hidden=checkpoint('held-read-hidden');
 assert.equal(hidden.cache[0].leased,1);const heldFile=held[0];
 await assert.rejects(api.clearTemporaryApiCache(),/local_cache_cleanup_incomplete/);
 assert.equal((globalThis as any).__skyQueryOwners[0].inspect().leased,1);checkpoint('actual-clear-held-incomplete');
 heldFile.delivery();await wait(()=>(globalThis as any).__skyQueryOwners[0].inspect().leased===0);
 assert(latest.frame===null);checkpoint('late-read-retired');
 await wait(()=>{const s=(globalThis as any).__skyQueryOwners[0].inspect();return s.running===0&&s.retired===0&&s.bytes===0;});
 await api.clearTemporaryApiCache();checkpoint('explicit-cleanup-retry-complete');
 api.unmountComponentAtNode(container);await wait(()=>container.childNodes.length===0);api.miniappQueryClient.clear();await api.clearSkyPublicImageCache();
 const final=(globalThis as any).__skyQueryOwners[0].inspect();for(const k of ['entries','leased','bytes','reserved','running','pending','retired'])assert.equal(final[k],0,k);
 const after=await Promise.all(sourceBindings.map(v=>bind(v.path)));assert.deepEqual(after,sourceBindings);await save('source-bindings-after.json',after);
 await save('commits.json',commits);await save('trace.json',trace);await save('requests.json',requests);await save('native-reads.json',nativeReads);
 const result={status:'REAL_TARO_REACT_QUERY_PROVIDER_SAO_CONSUMER_DEVELOPMENT',versions:{react:'18.3.1',reactReconciler:'0.29.0',taroRenderer:'4.2.1',reactQuery:'5.90.21',queryCore:'5.90.20'},sourceBindings:sourceBindings.length,
  coldPoints:cold.points,partialPoints:partial.points,queryIdentities:[cold.publicationIdentity,partial.publicationIdentity],samePublicationHash:cold.hash,
  held:{file:path.basename(heldFile.file),bytes:heldFile.bytes,sha256:heldFile.sha256,before:heldBefore,hidden:hidden.cache[0],lateLease:0},final,
  logicalContainerAfterUnmount:container.childNodes.length,commits:commits.length,trace,
  scope:'Actual installed app React/Taro renderer/reconciler/Taro DOM/QueryClientProvider/useQuery/useResourceQuery/full Sky supplement Hook, full API scientific validators and runtime URL/file/UTF8 path. No hand-written effect/query port. Controlled Taro transport/storage/native callbacks with actual isolated Node FS/source files and actual Astronomy Engine frame; coordinates are declared test input. No HTTP/native WEAPP binary/WXML/Canvas/software GPU/full page/public retry UI/physical total/quality/capacity/independent-review claim. No dependency or product source edit.'};
 await save('result.json',result);console.log(JSON.stringify({status:result.status,sourceBindings:sourceBindings.length,points:[cold.points,partial.points],queryIdentities:result.queryIdentities,commits:commits.length}));
}catch(e){await save('failed.json',{error:String(e),trace,commits,requests,queries:api.miniappQueryClient.getQueryCache().getAll().map((q:any)=>({key:q.queryKey,status:q.state.status,fetchStatus:q.state.fetchStatus,error:String(q.state.error),stack:q.state.error?.stack})),logicalText:container.textContent,loaders:(globalThis as any).__skyQueryLoaders,owners:(globalThis as any).__skyQueryOwners.map((o:any)=>o.inspect())});throw e;}
finally{try{api.unmountComponentAtNode(container);api.miniappQueryClient.clear();await api.clearSkyPublicImageCache();}catch{}}
