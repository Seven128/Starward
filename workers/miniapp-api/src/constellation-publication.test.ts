import "reflect-metadata";
import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import { Module } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { assertConstellationCatalog } from "@starward/miniapp-contracts";
import { ConstellationController } from "./constellation.controller.ts";
import { ConstellationPublicationService } from "./constellation-publication.ts";
import { EtagInterceptor } from "./etag.interceptor.ts";
import { registerSkyArtwork } from "../../../apps/wechat-miniapp/src/features/sky/sky-artwork-registration.ts";
import { createStellarMotion } from "@starward/astronomy-core/stellar-vectors";
import { loadConstellationCatalog } from "@starward/astronomy-core/constellation-catalog";
import { createConstellationCatalogClient } from "../../../apps/wechat-miniapp/src/services/constellation-catalog-client.ts";

test("core callers cannot change valid astrometry under the original verified hash",()=>{
  const first=loadConstellationCatalog(),raw=first.data as {stars:number[][]};
  const ra=raw.stars[0]![1];
  assert.throws(()=>{raw.stars[0]![1]=123;},TypeError);
  const result=new ConstellationPublicationService().get().data;
  assert.equal(result.stars[0]![1],ra);
  assert.equal(result.catalogHash,first.catalogHash);
});

test("pinned actual publication preserves shared figures, precise Tau identity and fainter geometry anchors",()=>{
  const service=new ConstellationPublicationService(),first=service.get(),p=first.data;
  assert.strictEqual(service.get(),first);
  assert.equal(p.stars.length,713);assert.equal(p.constellations.length,88);assert.equal(p.images.length,85);
  assert.deepEqual(p.images.find(a=>a.id==='Tau')!.anchors.map(a=>a.hip),[26451,15900,17999]);
  assert.deepEqual(p.stars.find(s=>s[0]===91589)![6],['SAO:229184'],'Tel anchor is not discarded at BSC 6.5 magnitude limit');
  assert.deepEqual(p.images.find(a=>a.id==='Car')!.members,['Car','Pup','Vel']);
  assert.deepEqual(p.images.find(a=>a.id==='Oph')!.members,['Oph','Ser']);
  const stars=new Map(p.stars.map(s=>[s[0],s]));
  for(const image of p.images){
    const anchors=image.anchors.map(a=>{
      const s=stars.get(a.hip)!;
      const motion=createStellarMotion({raDeg:s[1],decDeg:s[2],pmRaCosDecArcsecYr:s[3]/1000,pmDecArcsecYr:s[4]/1000});
      return {uv:[a.pixel[0]/image.width,a.pixel[1]/image.height] as const,direction:[motion[0],motion[1],motion[2]] as const};
    });
    assert.ok(registerSkyArtwork(anchors),`valid actual source geometry for ${image.id}`);
  }
  assert.throws(()=>{ (p.images[0]!.anchors as unknown[]).pop(); },TypeError);
  assert.equal(new ConstellationPublicationService().get().etag,first.etag);
});

test("catalog validation rejects missing coverage, broken identity, local paths and lost attribution",()=>{
  const good=new ConstellationPublicationService().get().data;
  for(const mutate of [
    (p:any)=>p.stars.pop(),(p:any)=>p.stars[0][0]=p.stars[1][0],(p:any)=>p.astrometry.epochJulianYear=1991.25,
    (p:any)=>p.constellations.find((c:any)=>c.iau==='Pup').artId='Pup',
    (p:any)=>p.images[0].anchors[0].hip=999999,(p:any)=>p.images[0].file='../secret.png',
    (p:any)=>p.images[0].width=4096,(p:any)=>p.provenance.art.license='CC0',
    (p:any)=>p.provenance.astrometry.license='Public domain',
    (p:any)=>delete p.provenance.astrometry.licenseStatementUrl,
    (p:any)=>p.catalogVersion="stellarium-modern-v24.4.v1",
    (p:any)=>p.stars[0][6]=[],(p:any)=>p.geometryAsset.file="../secret",
    (p:any)=>p.stars[0][5]="SYSTEM_MEMBERS",
  ]){const wrong=structuredClone(good);mutate(wrong);assert.throws(()=>assertConstellationCatalog(wrong),/constellation_catalog_invalid/);}
});

test("client evicts cached publications when attribution or geometry is invalid",async()=>{
  for(const mutate of [(e:any)=>e.sources.pop(),(e:any)=>e.data.stars.pop()]) {
    const envelope=structuredClone(new ConstellationPublicationService().get());mutate(envelope);
    let invalidated=0;
    const client=createConstellationCatalogClient({request:async()=>envelope,invalidate(){invalidated++;}});
    await assert.rejects(client(),/constellation_catalog_invalid/);
    assert.equal(invalidated,1);
  }
});

test("real HTTP serves all original PNG bytes and source files with immutable publication binding",async()=>{
  class TestModule {}
  Module({controllers:[ConstellationController],providers:[ConstellationPublicationService]})(TestModule);
  const app=await NestFactory.create(TestModule,new FastifyAdapter(),{logger:false});
  app.useGlobalInterceptors(new EtagInterceptor());
  try {
    await app.listen(0,'127.0.0.1');const base=await app.getUrl(),url=base+'/v2/sky/constellations';
    const response=await fetch(url);assert.equal(response.status,200);const envelope=await response.json();assertConstellationCatalog(envelope.data);
    const astrometrySource=envelope.sources.find((s:any)=>s.id.startsWith('constellation-geometry:'));
    assert.equal(astrometrySource.license,'ODbL-1.0');
    assert.equal(astrometrySource.licenseUrl,'https://opendatacommons.org/licenses/odbl/1-0/');
    const client=createConstellationCatalogClient({request:async()=>envelope,invalidate(){assert.fail('real publication should validate');}});
    const p=(await client()).data;let total=0;
    for(const image of p.images){
      const asset=await fetch(`${url}/${p.catalogHash}/assets/${image.file}`);assert.equal(asset.status,200);
      assert.equal(asset.headers.get('content-type'),'image/png');assert.match(asset.headers.get('cache-control')!,/immutable/);
      const bytes=Buffer.from(await asset.arrayBuffer());total+=bytes.length;
      assert.equal(bytes.length,image.bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),image.sha256);
      assert.equal(bytes.readUInt32BE(16),image.width);assert.equal(bytes.readUInt32BE(20),image.height);
    }
    assert.equal(total,1999008);
    for(const [file,digest] of Object.entries(p.provenance.definitions.sourceFiles)){
      const asset=await fetch(`${url}/${p.catalogHash}/assets/${file}`);assert.equal(asset.status,200);
      assert.equal(createHash('sha256').update(Buffer.from(await asset.arrayBuffer())).digest('hex'),digest);
    }
    const geometry=await fetch(`${url}/${p.catalogHash}/assets/${p.geometryAsset.file}`);
    assert.equal(geometry.status,200);
    const geometryBytes=Buffer.from(await geometry.arrayBuffer());
    assert.equal(geometryBytes.length,p.geometryAsset.bytes);
    assert.equal(createHash('sha256').update(geometryBytes).digest('hex'),p.geometryAsset.sha256);
    const independent=JSON.parse(geometryBytes.toString('utf8'));
    assert.deepEqual(independent.stars,p.stars);
    assert.equal(independent.license,'ODbL-1.0');
    assert.equal(independent.epochJulianYear,2000);
    assert.equal(independent.sources['hip-713.xml'],undefined);
    const reused=await fetch(url,{headers:{'If-None-Match':response.headers.get('etag')!}});assert.equal(reused.status,304);
    for(const path of [`${'0'.repeat(64)}/assets/${p.images[0]!.file}`,`${p.catalogHash}/assets/unknown.png`,`${p.catalogHash}/assets/package.json`]){
      const missing=await fetch(`${url}/${path}`);assert.equal(missing.status,404);await missing.arrayBuffer();
    }
  }finally{await app.close()}
});
