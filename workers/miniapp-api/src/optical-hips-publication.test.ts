import "reflect-metadata";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";
import { Module } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";
import { MiniappController } from "./controller.ts";
import { MiniappService } from "./miniapp-service.ts";
import { OpticalHipsPublicationService } from "./optical-hips-publication.ts";
import { createTestMiniappService } from "./test-fixtures/create-test-service.ts";
import { createTestRuntimeConfig } from "./runtime-config.ts";

const sha=(bytes:Buffer)=>createHash("sha256").update(bytes).digest("hex");
async function fixture(order=8,pixel=43345){
  const root=await mkdtemp(join(tmpdir(),"starward-optical-"));
  const dir=Math.floor(pixel/10000)*10000;
  const directory=join(root,"ps1-dr1",`Norder${order}`,`Dir${dir}`);
  await mkdir(directory,{recursive:true});
  const tile=Buffer.alloc(32);tile[0]=0xff;tile[1]=0xd8;tile[30]=0xff;tile[31]=0xd9;
  const tilePath=join(directory,`Npix${pixel}.jpg`);
  await writeFile(tilePath,tile);
  const shard={schemaVersion:"starward-optical-hips-shard-v1",sourceId:"ps1-dr1",order,dir,
    tiles:[{pixel,sha256:sha(tile),bytes:tile.length}]};
  const shardBytes=Buffer.from(JSON.stringify(shard));
  await writeFile(join(directory,"index.json"),shardBytes);
  const publication={schemaVersion:"starward-optical-hips-v1",publicationId:"bounded-test",
    scope:"TRIAL",processing:"Local integrity fixture; no survey claim",limitations:["One synthetic tile only"],
    sources:[{id:"ps1-dr1",title:"PS1 DR1 color",provider:"CDS / PS1 Science Consortium",
      originalDataUrl:"https://outerspace.stsci.edu/spaces/PANSTARRS/overview",
      originalRights:"MAST data-use policy",originalRightsUrl:"https://archive.stsci.edu/publishing/data-use",
      hipsRecordUrl:"https://alasky.cds.unistra.fr/MocServer/query?ID=CDS%2FP%2FPanSTARRS%2FDR1%2Fcolor-i-r-g",
      hipsLicense:"ODbL-1.0",hipsDoi:"10.26093/cds/aladin/598a-0e",format:"jpeg",tileWidth:512,maxOrder:11}],
    shards:[{sourceId:"ps1-dr1",order,dir,file:`ps1-dr1/Norder${order}/Dir${dir}/index.json`,
      sha256:sha(shardBytes),bytes:shardBytes.length,tileCount:1}]};
  const manifestPath=join(root,"manifest.json");
  await writeFile(manifestPath,JSON.stringify(publication));
  return {root,tilePath,manifestPath,tile,service:new OpticalHipsPublicationService(pathToFileURL(manifestPath))};
}

test("a root version binds a directory index and exactly one local tile; tampering never serves changed bytes",async()=>{
  const f=await fixture();
  const publication=f.service.manifest();
  assert.equal(publication.scope,"TRIAL");
  assert.match(publication.publicationHash,/^[a-f0-9]{64}$/u);
  const index=await f.service.index(publication.publicationHash,"ps1-dr1",8,40000);
  assert.equal(index.tiles.length,1);
  assert.match(index.tiles[0]!.downloadUrl,/Npix|43345/u);
  assert.deepEqual((await f.service.tile(publication.publicationHash,"ps1-dr1",8,43345)).bytes,f.tile);
  await assert.rejects(f.service.tile("0".repeat(64),"ps1-dr1",8,43345),/not_found/u);
  await assert.rejects(f.service.tile(publication.publicationHash,"ps1-dr1",8,43346),/not_found/u);
  await writeFile(f.tilePath,Buffer.from([0xff,0xd8,1,0xff,0xd9]));
  await assert.rejects(f.service.tile(publication.publicationHash,"ps1-dr1",8,43345),/asset_invalid/u);
  assert.throws(()=>new OpticalHipsPublicationService().manifest(),/unavailable/u);
  const changed=JSON.parse(await readFile(f.manifestPath,"utf8"));
  changed.shards[0].file="../outside/index.json";
  await writeFile(f.manifestPath,JSON.stringify(changed));
  assert.throws(()=>new OpticalHipsPublicationService(pathToFileURL(f.manifestPath)).manifest(),/publication_invalid/u);
});

test("same-origin HTTP exposes hash-bound shard metadata and unchanged tile bytes",async()=>{
  const f=await fixture();
  const service=createTestMiniappService({opticalHips:f.service});
  class TestModule {}
  Module({controllers:[MiniappController],providers:[{provide:MiniappService,useValue:service}]})(TestModule);
  const app=await NestFactory.create<NestFastifyApplication>(TestModule,new FastifyAdapter(),{logger:false});
  try {
    await app.init();
    const http=app.getHttpAdapter().getInstance();
    const manifest=await http.inject({method:"GET",url:"/v2/sky/optical/manifest"});
    assert.equal(manifest.statusCode,200);
    const publication=manifest.json();
    const selected=await http.inject({method:"GET",url:`/v2/sky/optical/${publication.publicationHash}/manifest`});
    assert.equal(selected.statusCode,200);assert.deepEqual(selected.json(),publication);
    assert.equal(selected.headers["cache-control"],"public, max-age=31536000, immutable");
    assert.equal((await http.inject({method:"GET",url:`/v2/sky/optical/${"0".repeat(64)}/manifest`})).statusCode,404);
    const index=await http.inject({method:"GET",url:publication.shards[0].indexUrl});
    assert.equal(index.statusCode,200);
    const asset=index.json().tiles[0];
    assert.equal(asset.sha256,sha(f.tile));
    const image=await http.inject({method:"GET",url:asset.downloadUrl});
    assert.equal(image.statusCode,200);
    assert.equal(image.headers["content-type"],"image/jpeg");
    assert.equal(image.headers["x-starward-image-source"],"ps1-dr1");
    assert.deepEqual(image.rawPayload,f.tile);
    const absent=await http.inject({method:"GET",url:asset.downloadUrl.replace(publication.publicationHash,"0".repeat(64))});
    assert.equal(absent.statusCode,404);
  } finally {await app.close();}
});

test("order-zero publication serves only listed base pixels through the same HTTP boundary",async()=>{
  const f=await fixture(0,11);
  const root=JSON.parse(await readFile(f.manifestPath,"utf8"));
  root.sources[0].maxOrder=0;
  await writeFile(f.manifestPath,JSON.stringify(root));
  const publication=new OpticalHipsPublicationService(pathToFileURL(f.manifestPath));
  const service=createTestMiniappService({opticalHips:publication});
  class TestModule {}
  Module({controllers:[MiniappController],providers:[{provide:MiniappService,useValue:service}]})(TestModule);
  const app=await NestFactory.create<NestFastifyApplication>(TestModule,new FastifyAdapter(),{logger:false});
  try{
    await app.init();
    const http=app.getHttpAdapter().getInstance();
    const manifest=await http.inject({method:"GET",url:"/v2/sky/optical/manifest"});
    assert.equal(manifest.statusCode,200);
    const index=await http.inject({method:"GET",url:manifest.json().shards[0].indexUrl});
    assert.equal(index.statusCode,200);
    const asset=await http.inject({method:"GET",url:index.json().tiles[0].downloadUrl});
    assert.equal(asset.statusCode,200);
    assert.deepEqual(asset.rawPayload,f.tile);
    const missing=await http.inject({method:"GET",url:index.json().tiles[0].downloadUrl.replace(/\/11$/u,"/12")});
    assert.equal(missing.statusCode,404);
  }finally{await app.close();}
});

test("rights-unresolved optical trials cannot enter trial or commercial service profiles by injection",async()=>{
  const f=await fixture();
  for(const releaseProfile of ["TRIAL","COMMERCIAL"] as const){
    assert.throws(()=>createTestMiniappService({
      config:createTestRuntimeConfig({releaseProfile}),opticalHips:f.service,
    }),/optical_trial_requires_local_memory_fixture/u);
  }
  assert.throws(()=>createTestMiniappService({
    config:createTestRuntimeConfig({storageMode:"POSTGRES"}),opticalHips:f.service,
  }),/optical_trial_requires_local_memory_fixture/u);
  const production=JSON.parse(await readFile(f.manifestPath,"utf8"));
  production.scope="PRODUCTION";
  await writeFile(f.manifestPath,JSON.stringify(production));
  assert.throws(()=>createTestMiniappService({
    opticalHips:new OpticalHipsPublicationService(pathToFileURL(f.manifestPath)),
  }),/optical_trial_scope_invalid/u);
});
