import "reflect-metadata";
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {copyFile, mkdir, mkdtemp, readFile, realpath, rm, writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join,resolve} from "node:path";
import {pathToFileURL} from "node:url";
import test from "node:test";
import {Module} from "@nestjs/common";
import {NestFactory} from "@nestjs/core";
import {FastifyAdapter,type NestFastifyApplication} from "@nestjs/platform-fastify";
import {MiniappController} from "./controller.ts";
import {MiniappService} from "./miniapp-service.ts";
import {WideFieldW3PublicationService} from "./wide-field-w3-publication.ts";
import {createTestMiniappService} from "./test-fixtures/create-test-service.ts";

const sha=(bytes:Uint8Array)=>createHash("sha256").update(bytes).digest("hex");
const bundle=new URL("../assets/deep-sky/wide-field-w3/",import.meta.url);

test("published CDS master copy binds all twelve base faces, exact bytes and partial rights metadata",async()=>{
  const publication=new WideFieldW3PublicationService();
  const root=publication.manifest();
  assert.equal(root.source.masterUrl,"https://alasky.cds.unistra.fr/AllWISE/W3");
  assert.equal(root.hips.status,"public partial unclonable");
  assert.equal(root.hips.order,0);
  assert.equal(root.tiles.length,12);
  assert.equal(root.tiles.reduce((sum,tile)=>sum+tile.bytes,0),678144);
  assert.deepEqual(root.tiles.map(tile=>tile.pixel),Array.from({length:12},(_,n)=>n));
  assert.match(await publication.properties(root.publicationHash),/hips_order = 0[\s\S]*hips_status = public partial unclonable/u);
  for(const tile of root.tiles){
    const body=await publication.tile(root.publicationHash,tile.pixel);
    assert.equal(body.length,tile.bytes);
    assert.equal(sha(body),tile.sha256);
    assert.equal(tile.sourceUrl,`${root.source.masterUrl}/${tile.file}`);
  }
  await assert.rejects(publication.tile("0".repeat(64),0),/unavailable/u);
  await assert.rejects(publication.tile(root.publicationHash,12),/unavailable/u);
});

test("changed local tile is rejected before delivery and cannot keep the publication hash",async()=>{
  const directory=await mkdtemp(join(tmpdir(),"starward-w3-"));
  try{
    const tileRoot=join(directory,"Norder0","Dir0");
    await mkdir(tileRoot,{recursive:true});
    await copyFile(new URL("manifest.json",bundle),join(directory,"manifest.json"));
    await copyFile(new URL("properties",bundle),join(directory,"properties"));
    for(let pixel=0;pixel<12;pixel++)await copyFile(new URL(`Norder0/Dir0/Npix${pixel}.jpg`,bundle),
      join(tileRoot,`Npix${pixel}.jpg`));
    const service=new WideFieldW3PublicationService(pathToFileURL(join(directory,"manifest.json")));
    const hash=service.manifest().publicationHash;
    const path=join(tileRoot,"Npix0.jpg");
    const bytes=await readFile(path);bytes[50]^=1;await writeFile(path,bytes);
    await assert.rejects(service.tile(hash,0),/tile_invalid/u);
    assert.ok((await service.tile(hash,1)).length>0,"one corrupt tile does not erase independent sky data");
  }finally{
    const target=await realpath(directory);
    const root=await realpath(tmpdir());
    assert.ok(target.startsWith(resolve(root)+"\\")||target.startsWith(resolve(root)+"/"));
    assert.ok(target.split(/[\\/]/u).at(-1)?.startsWith("starward-w3-"));
    await rm(target,{recursive:true,force:true});
  }
});

test("same-origin HTTP serves one immutable manifest, properties and hash-bound JPEGs",async()=>{
  const service=createTestMiniappService();
  class TestModule {}
  Module({controllers:[MiniappController],providers:[{provide:MiniappService,useValue:service}]})(TestModule);
  const app=await NestFactory.create<NestFastifyApplication>(TestModule,new FastifyAdapter(),{logger:false});
  try{
    await app.init();
    const http=app.getHttpAdapter().getInstance();
    const response=await http.inject({method:"GET",url:"/v2/sky/wide-field/manifest"});
    assert.equal(response.statusCode,200);
    const root=response.json();
    const properties=await http.inject({method:"GET",url:root.propertiesUrl});
    assert.equal(properties.statusCode,200);
    assert.equal(sha(properties.rawPayload),root.propertiesSha256);
    const tile=await http.inject({method:"GET",url:root.tiles[0].downloadUrl});
    assert.equal(tile.statusCode,200);
    assert.equal(tile.headers["content-type"],"image/jpeg");
    assert.equal(sha(tile.rawPayload),root.tiles[0].sha256);
    assert.equal((await http.inject({method:"GET",url:root.tiles[0].downloadUrl.replace(root.publicationHash,"0".repeat(64))})).statusCode,404);
    assert.equal((await http.inject({method:"GET",url:root.tiles[0].downloadUrl.replace("Npix0.jpg","Npix12.jpg")})).statusCode,404);
  }finally{await app.close();}
});
