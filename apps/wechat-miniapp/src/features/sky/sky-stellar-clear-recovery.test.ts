import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {QueryObserver} from '@tanstack/react-query';
import type {ApiEnvelope,SaoIndexPublication} from '@starward/miniapp-contracts';
import {catalogJsonIntegrity} from '../../../../../packages/miniapp-contracts/src/catalog-json-integrity.ts';
import {saoCatalogSource} from '../../../../../workers/miniapp-api/src/sao-catalog-source.ts';
import {createSaoCatalogClient} from '../../services/sao-catalog-client';
import {createSkyPublicImageCache,type SkyPublicImageFileSystem} from '../../services/sky-public-image-cache';
import {transportHarness,TEST_API_BASE} from '../../services/api-request-test-support';

const directory=new URL('../../../../../workers/miniapp-api/assets/sao-v2/',import.meta.url);
const index=JSON.parse(readFileSync(new URL('index.json',directory),'utf8'));
const envelope:ApiEnvelope<SaoIndexPublication>={apiVersion:'v2',data:{publicationHash:catalogJsonIntegrity(index).sha256,index},
 dataState:'FRESH',generatedAt:'2026-10-03T13:00:00.000Z',validAt:null,sources:[saoCatalogSource(index)],warnings:[],etag:'source-index',requestId:'source-index'};
const tick=()=>new Promise<void>(resolve=>setImmediate(resolve));
const asBuffer=(b:Uint8Array)=>b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength)as ArrayBuffer;

// Actual API clear, QueryObserver, SAO client, encoded-file core and real source
// JSON. Native file/transport callbacks are controlled, not WEAPP/HTTP evidence.
test('temporary clear retires SAO metadata and hidden observer fetches a new file-generation capability on return',async()=>{
 const files=new Map<string,ArrayBuffer>();let downloads=0,indexRequests=0;
 const filesystem:SkyPublicImageFileSystem={async mkdir(){},async list(root){return [...files.keys()].filter(p=>p.startsWith(root+'/')).map(p=>p.slice(root.length+1));},
  async size(p){assert(files.has(p));return files.get(p)!.byteLength;},async read(p){assert(files.has(p));return files.get(p)!.slice(0);},
  async write(p,b){files.set(p,b.slice(0));},async rename(from,to){assert(files.has(from));files.set(to,files.get(from)!);files.delete(from);},async remove(p){files.delete(p);}};
 const cache=createSkyPublicImageCache({fs:filesystem,root:'/controlled/sky-public-images-v1',session:'query_recovery',byteBudget:32*1024*1024,maxFileBytes:192*1024,
  transfer(asset){downloads++;const tile=index.tiles.find((t:any)=>t.sha256===asset.sha256);assert(tile);return {promise:Promise.resolve(asBuffer(readFileSync(new URL(tile.file,directory)))),cancel(){}};}});
 const h=transportHarness(false,()=>{},false,TEST_API_BASE,Date.now,()=>cache.clear());
 h.queryClient.setDefaultOptions({queries:{retry:false,gcTime:Infinity}});
 const client=createSaoCatalogClient({
  async index(signal){indexRequests++;return h.request('sao-index:v2','/v2/sky/supplements/sao/v2',{...(signal?{signal}:{})})as unknown as Promise<ApiEnvelope<SaoIndexPublication>>;},
  tile:async()=>assert.fail('current file path must not use legacy tile API'),invalidateIndex(){assert.fail();},invalidateTile(){assert.fail();},
  generation(){const epoch=cache.inspect().epoch;return {isCurrent:()=>cache.inspect().epoch===epoch};},
  async fileTile(_publication,tile,signal){const read=cache.acquire({format:'json',environment:'e'.repeat(64),sha256:tile.sha256,bytes:tile.bytes,url:TEST_API_BASE+'/assets/'+tile.id});
   const cancel=()=>read.cancel();signal?.addEventListener('abort',cancel,{once:true});
   try{const lease=await read.promise;try{return JSON.parse(Buffer.from(await filesystem.read(lease.filePath,tile.bytes)).toString('utf8'));}finally{lease.release();}}
   finally{signal?.removeEventListener('abort',cancel);}}});
 const options={queryKey:['sao-index','v2'],queryFn:({signal}:{signal:AbortSignal})=>client.getIndex(signal),staleTime:Infinity,structuralSharing:false,enabled:true};
 const observer=new QueryObserver(h.queryClient,options),unsubscribe=observer.subscribe(()=>{});
 try{
  assert.equal(h.calls.length,1);h.calls[0]!.success({statusCode:200,data:envelope});await tick();
  const old=observer.getCurrentResult().data!;assert(old);
  const tile=old.data.index.tiles[0]!;assert.equal((await client.getTile(old.data,tile.id)).data.tile.rows.length,tile.rowCount);assert.equal(downloads,1);
  h.queryClient.setQueryData(['plans','retained'],{meaning:'user-library'});h.storage.set('draft:retained','authored');
  observer.setOptions({...options,enabled:false});
  await h.clearTemporaryApiCache();
  assert.equal(cache.inspect().entries,0);await assert.rejects(client.getTile(old.data,tile.id),/retired_index/);
  assert.equal(h.queryClient.getQueryData(['sao-index','v2'])===undefined,true,'clear must remove the retired metadata capability, not only its files');
  assert.deepEqual(h.queryClient.getQueryData(['plans','retained']),{meaning:'user-library'});assert.equal(h.storage.get('draft:retained'),'authored');
  // Mirrors useQuery rebuilding/updating options as a hidden page becomes active.
  const hidden=h.queryClient.defaultQueryOptions({...options,enabled:false}),shown=h.queryClient.defaultQueryOptions(options);
  hidden._optimisticResults='optimistic';shown._optimisticResults='optimistic';
  observer.getOptimisticResult(hidden);observer.setOptions(hidden);
  observer.getOptimisticResult(shown);observer.setOptions(shown);await tick();
  assert.equal(indexRequests,2);assert.equal(h.calls.length,2,'return must actually fetch metadata after selective clear');
  h.calls[1]!.success({statusCode:200,data:envelope});await tick();
  const returned=observer.getCurrentResult().data!;assert(returned);assert.notEqual(returned.data,old.data);
  assert.equal(returned.data.publicationHash,old.data.publicationHash,'the same publication still needs a new generation capability');
  assert.equal((await client.getTile(returned.data,tile.id)).data.tile.rows.length,tile.rowCount);assert.equal(downloads,2);
  await assert.rejects(client.getTile(old.data,tile.id),/retired_index/,'new delivery cannot revive the old observer');
  const output=process.env.CLOUD_SKY_CACHE_EVIDENCE_OUTPUT;
  if(output)writeFileSync(path.join(output,'clear-query-trace.json'),JSON.stringify({status:'REAL_QUERY_OBSERVER_AND_API_CLEAR_FILE_GENERATION_RECOVERED',
   queryKey:options.queryKey,indexRequests,encodedDownloads:downloads,publicationHash:returned.data.publicationHash,tileId:tile.id,sourceSha256:tile.sha256,
   rows:tile.rowCount,cache:cache.inspect(),oldCapabilityRejected:true,newCapabilityIdentity:true,retainedPlan:true,retainedDraft:true,
   scope:'Actual QueryClient/QueryObserver/API-clear/encoded core/SAO client with real source JSON; controlled native I/O, no actual React/native/HTTP/GPU.'},null,2)+'\n',{flag:'wx'});
 }finally{unsubscribe();observer.destroy();h.queryClient.clear();await cache.clear();}
});
