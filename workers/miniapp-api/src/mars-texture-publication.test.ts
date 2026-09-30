import "reflect-metadata";
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {copyFile,mkdtemp,readFile,realpath,rm,writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join,resolve} from "node:path";
import {pathToFileURL} from "node:url";
import test from "node:test";
import {Module} from "@nestjs/common";
import {NestFactory} from "@nestjs/core";
import {FastifyAdapter,type NestFastifyApplication} from "@nestjs/platform-fastify";
import {MiniappController} from "./controller.ts";
import {MiniappService} from "./miniapp-service.ts";
import {MarsTexturePublicationService} from "./mars-texture-publication.ts";
import {createTestMiniappService} from "./test-fixtures/create-test-service.ts";

const sha=(bytes:Uint8Array)=>createHash("sha256").update(bytes).digest("hex");
const bundle=new URL("../assets/mars/",import.meta.url);
const file="mars-mdim21-color-usgs-wms-1024x512.jpg";

test("USGS Viking colorized Mars copy is fixed to public-domain product and exact bytes",async()=>{
  const service=new MarsTexturePublicationService();
  const root=service.manifest();
  assert.equal(root.source.recordUrl,"https://astrogeology.usgs.gov/search/map/mars_viking_colorized_global_mosaic_232m");
  assert.equal(root.projection.longitude,"positive-east");
  assert.deepEqual(root.projection.bboxDeg,[-180,-90,180,90]);
  assert.equal(root.image.bytes,94411);
  const image=await service.image(root.publicationHash);
  assert.equal(sha(image),root.image.sha256);
  await assert.rejects(service.image("0".repeat(64)),/unavailable/u);
});

test("altering the Mars image prevents delivery",async()=>{
  const directory=await mkdtemp(join(tmpdir(),"starward-mars-"));
  try{
    await copyFile(new URL("manifest.json",bundle),join(directory,"manifest.json"));
    await copyFile(new URL(file,bundle),join(directory,file));
    const service=new MarsTexturePublicationService(pathToFileURL(join(directory,"manifest.json")));
    const publicationHash=service.manifest().publicationHash;
    const path=join(directory,file),bytes=await readFile(path);bytes[80]^=1;await writeFile(path,bytes);
    await assert.rejects(service.image(publicationHash),/image_invalid/u);
  }finally{
    const target=await realpath(directory),root=await realpath(tmpdir());
    assert.ok(target.startsWith(resolve(root)+"\\")||target.startsWith(resolve(root)+"/"));
    await rm(target,{recursive:true,force:true});
  }
});

test("same-origin HTTP serves the exact Mars JPEG and rejects a stale publication",async()=>{
  const service=createTestMiniappService();
  class TestModule {}
  Module({controllers:[MiniappController],providers:[{provide:MiniappService,useValue:service}]})(TestModule);
  const app=await NestFactory.create<NestFastifyApplication>(TestModule,new FastifyAdapter(),{logger:false});
  try{
    await app.init();const http=app.getHttpAdapter().getInstance();
    const response=await http.inject({method:"GET",url:"/v2/sky/mars/manifest"});
    assert.equal(response.statusCode,200);
    const root=response.json();
    const image=await http.inject({method:"GET",url:root.image.downloadUrl});
    assert.equal(image.statusCode,200);
    assert.equal(image.headers["content-type"],"image/jpeg");
    assert.equal(sha(image.rawPayload),root.image.sha256);
    assert.equal((await http.inject({method:"GET",url:root.image.downloadUrl.replace(root.publicationHash,"0".repeat(64))})).statusCode,404);
  }finally{await app.close();}
});
