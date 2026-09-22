import 'reflect-metadata';
import assert from 'node:assert/strict';
import test from 'node:test';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {Module} from '@nestjs/common';
import {NestFactory} from '@nestjs/core';
import {FastifyAdapter} from '@nestjs/platform-fastify';
import {assertSaoIndexPublication,assertSaoTilePublication,type ApiEnvelope,type SaoIndexPublication,type SaoTilePublication} from '@starward/miniapp-contracts';
import {catalogJsonIntegrity} from '../../../packages/miniapp-contracts/src/catalog-json-integrity.ts';
import {SaoPublicationService} from './sao-publication.ts';
import {SaoPublicationController} from './sao-publication.controller.ts';
import {EtagInterceptor} from './etag.interceptor.ts';
import {createSaoCatalogClient} from '../../../apps/wechat-miniapp/src/services/sao-catalog-client.ts';
import {createResponseCache} from '../../../apps/wechat-miniapp/src/services/response-cache.ts';
import {CelestialObjectInformationService} from './celestial-object-information.ts';
import {loadSaoCatalog} from './sao-catalog-provider.ts';
import {parseSaoCatalog} from '@starward/astronomy-core/sao-catalog';

test('published faint stars resolve to the same scientific identity and magnitude in details, without fabricated measurements',async()=>{
  const publication=new SaoPublicationService(),index=await publication.get();
  const metadata=index.data.index.tiles.find(t=>t.minMagnitude>8)!;
  const tile=await publication.tile(index.data.publicationHash,metadata.id);
  const details=new CelestialObjectInformationService(),source=loadSaoCatalog();
  for(const row of tile.data.tile.rows.slice(0,12)){
    const result=details.get(row[0]),original=source.catalog.get(row[0]);assert(original);
    assert.equal(result.data.reference,row[0]);assert.equal(result.data.kind,'STAR');
    assert.equal(result.data.facts[0]!.value,row[1].toFixed(2));assert.equal(original.visualMagnitude,row[1]);
    assert.equal(result.data.introduction,null);assert.equal(result.data.contentState,'BASIC_ONLY');
    assert(!result.data.facts.some(f=>/距离|B−V|Johnson/u.test(f.label)));
    assert.deepEqual(result.sources,index.sources);
    const before=structuredClone(result);(result.data.aliases as string[]).push('corrupted');
    assert.deepEqual(details.get(row[0]),before);
  }
  for(const reference of ['SAO:208759','SAO:208795','SAO:151881'])
    assert.throws(()=>details.get(reference),/celestial_object_not_found/);
  for(const reference of ['SAO:0','SAO:258998','SAO:0001','SAO:1/../2'])
    assert.throws(()=>details.get(reference),/celestial_object_reference_invalid/);
  const bytes=await readFile(new URL('../assets/sao/catalog.json',import.meta.url));
  assert.throws(()=>parseSaoCatalog(bytes,{catalogHash:'0'.repeat(64),baseCatalogVersion:index.data.index.baseCatalogVersion,
    baseAssetSha256:index.data.index.baseAssetSha256}),/source_hash/);
});

test('portable canonical integrity matches Node for Unicode, surrogate escapes, small motions and negative zero',()=>{
  for(const value of [{credit:'星表 🌌',motion:-.000087077,zero:-0,lone:'\ud800'},[],{x:1e-7,y:1e20}]){
    const expected=Buffer.from(JSON.stringify(value));assert.deepEqual(catalogJsonIntegrity(value),{
      bytes:expected.length,sha256:createHash('sha256').update(expected).digest('hex')});
  }
});

test('all actual published tiles preserve source identity, geometry and independent canonical integrity',async()=>{
  const service=new SaoPublicationService(),publication=(await service.get()).data;
  assertSaoIndexPublication(publication);assert.equal(publication.index.tiles.length,826);
  const ids=new Set<string>();let rows=0;
  for(const meta of publication.index.tiles){
    const raw=await readFile(new URL(`../assets/sao/${meta.file}`,import.meta.url));
    assert.equal(raw.length,meta.bytes);assert.equal(createHash('sha256').update(raw).digest('hex'),meta.sha256);
    const tile={publicationHash:publication.publicationHash,tile:JSON.parse(raw.toString())};
    assertSaoTilePublication(tile,publication,meta);
    for(const row of tile.tile.rows){assert(!ids.has(row[0]));ids.add(row[0]);rows++;}
  }
  assert.equal(rows,246280);
});

test('actual HTTP index/tile reach the client; 304 works, wrong publication is rejected, corruption evicts and retry recovers',async()=>{
  class TestModule{}
  Module({controllers:[SaoPublicationController],providers:[SaoPublicationService]})(TestModule);
  const app=await NestFactory.create(TestModule,new FastifyAdapter(),{logger:false});app.useGlobalInterceptors(new EtagInterceptor());
  try{
    await app.listen(0,'127.0.0.1');const base=`${await app.getUrl()}/v2/sky/supplements/sao`;
    let corruptIndex=false,corruptTile=false,indexEvicted=0,tileEvicted=0,requestCount=0;
    const client=createSaoCatalogClient({
      async index(){const r=await fetch(base);assert.equal(r.status,200);const e=await r.json() as ApiEnvelope<SaoIndexPublication>;
        if(corruptIndex)e.data.index.tiles[0]!.maxMotionRadPerYear+=.00001;return e;},
      async tile(hash,id){requestCount++;const r=await fetch(`${base}/${hash}/tiles/${id}`);assert.equal(r.status,200);
        const e=await r.json() as ApiEnvelope<SaoTilePublication>;
        if(corruptTile)(e.data.tile as unknown as {extra?:string}).extra='changed-after-publication';return e;},
      invalidateIndex(){indexEvicted++;},invalidateTile(){tileEvicted++;},
    });
    const envelope=await client.getIndex();assert.equal(envelope.sources[0]!.retrievedAt,null);
    assert(envelope.sources[0]!.limitations.some(v=>v.includes('Johnson V')));
    assert(Object.isFrozen(envelope.data.index.tiles));
    const meta=envelope.data.index.tiles.find(t=>t.minMagnitude>8&&t.rowCount>100)!;assert(meta);
    const result=await client.getTile(envelope.data,meta.id);assert(result.data.tile.rows.every(r=>r[1]>8));
    assert(Object.isFrozen(result.data.tile.rows[0]));assert.equal(tileEvicted,0);
    const conditional=await fetch(`${base}/${envelope.data.publicationHash}/tiles/${meta.id}`,{headers:{'if-none-match':result.etag}});
    assert.equal(conditional.status,304);assert.equal(await conditional.text(),'');
    for(const suffix of [`${'0'.repeat(64)}/tiles/${meta.id}`,`${envelope.data.publicationHash}/tiles/not-a-tile`])
      assert.equal((await fetch(`${base}/${suffix}`)).status,404);
    const priorRequests=requestCount;
    await assert.rejects(()=>client.getTile(structuredClone(envelope.data),meta.id),/unvalidated_index/);
    await assert.rejects(()=>client.getTile(envelope.data,'not-a-tile'),/unknown_tile/);assert.equal(requestCount,priorRequests);
    corruptTile=true;await assert.rejects(()=>client.getTile(envelope.data,meta.id),/tile_integrity/);assert.equal(tileEvicted,1);
    corruptTile=false;assert.equal((await client.getTile(envelope.data,meta.id)).data.tile.rows.length,meta.rowCount);
    corruptIndex=true;await assert.rejects(()=>client.getIndex(),/index_integrity/);assert.equal(indexEvicted,1);
    corruptIndex=false;assert.equal((await client.getIndex()).data.publicationHash,envelope.data.publicationHash);
    const restarted=await new SaoPublicationService().get();assert.deepEqual(restarted.data,envelope.data);
    // Exercise actual existing chunk persistence and a cold client, not just
    // reusing an in-memory promise or setting an If-None-Match header.
    const disk=new Map<string,unknown>();
    const storage={getStorageSync:(key:string)=>disk.get(key),setStorageSync:(key:string,value:unknown)=>{disk.set(key,value);},
      removeStorageSync:(key:string)=>{disk.delete(key);},getStorageInfoSync:()=>({keys:[...disk.keys()]}),
      setStorage:async({key,data}:{key:string;data:string})=>{disk.set(key,data);}};
    const cache=createResponseCache(storage);cache.set('index',envelope);cache.set('tile',result);await cache.flush();
    const cold=createResponseCache(storage);const restoredIndex=cold.get('index'),restoredTile=cold.get('tile');
    assert(restoredIndex&&restoredTile);assert.notEqual(restoredIndex.envelope,envelope);
    const coldClient=createSaoCatalogClient({
      async index(){const r=await fetch(base,{headers:{'if-none-match':restoredIndex.envelope.etag}});assert.equal(r.status,304);
        return restoredIndex.envelope as ApiEnvelope<SaoIndexPublication>;},
      async tile(hash,id){const r=await fetch(`${base}/${hash}/tiles/${id}`,{headers:{'if-none-match':restoredTile.envelope.etag}});assert.equal(r.status,304);
        return restoredTile.envelope as ApiEnvelope<SaoTilePublication>;},
      invalidateIndex(){assert.fail('valid persisted index rejected');},invalidateTile(){assert.fail('valid persisted tile rejected');},
    });
    const coldIndex=await coldClient.getIndex(),coldTile=await coldClient.getTile(coldIndex.data,meta.id);
    assert.deepEqual(coldTile.data.tile.rows,result.data.tile.rows);
  }finally{await app.close();}
});
