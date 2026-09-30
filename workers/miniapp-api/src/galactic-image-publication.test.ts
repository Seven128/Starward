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
import {GalacticImagePublicationService} from "./galactic-image-publication.ts";
import {MiniappController} from "./controller.ts";
import {MiniappService} from "./miniapp-service.ts";
import {createTestMiniappService} from "./test-fixtures/create-test-service.ts";

const file="2mass-galactic-2048x1024.jpg";
const bundle=new URL("../assets/deep-sky/galactic-2mass/",import.meta.url);

test("2MASS publication serves only the manifest-bound reviewed JPEG",async()=>{
  const service=new GalacticImagePublicationService();
  const manifest=service.manifest();
  assert.equal(manifest.source.provider,"IPAC / Cool Cosmos");
  assert.equal(manifest.projection.frame,"galactic");
  assert.equal(manifest.projection.longitudeIncreases,"left");
  assert.equal(manifest.image.downloadUrl,`/v2/sky/galactic/${manifest.publicationHash}/${manifest.image.file}`);
  const image=await service.image(manifest.publicationHash);
  assert.equal(image.length,manifest.image.bytes);
  assert.equal(createHash("sha256").update(image).digest("hex"),manifest.image.sha256);
  await assert.rejects(service.image("0".repeat(64)),/galactic_image_version_unavailable/u);
});

test("corrupt image fails closed and exact-byte restoration recovers in the same publication owner",async()=>{
  const directory=await mkdtemp(join(tmpdir(),"starward-galactic-"));
  try{
    await copyFile(new URL("manifest.json",bundle),join(directory,"manifest.json"));
    await copyFile(new URL(file,bundle),join(directory,file));
    const service=new GalacticImagePublicationService(pathToFileURL(join(directory,"manifest.json")));
    const hash=service.manifest().publicationHash;
    const imagePath=join(directory,file),original=await readFile(imagePath);
    const corrupt=Buffer.from(original);corrupt[80]^=1;await writeFile(imagePath,corrupt);
    await assert.rejects(service.image(hash),/galactic_image_corrupt/u);
    await writeFile(imagePath,original);
    assert.equal(createHash("sha256").update(await service.image(hash)).digest("hex"),service.manifest().image.sha256);
  }finally{
    const target=await realpath(directory),root=await realpath(tmpdir());
    assert.ok(target.startsWith(resolve(root)+"\\")||target.startsWith(resolve(root)+"/"));
    assert.ok(target.split(/[\\/]/u).at(-1)?.startsWith("starward-galactic-"));
    await rm(target,{recursive:true,force:true});
  }
});

test("same-origin HTTP serves the exact 2MASS image and rejects another version",async()=>{
  const service=createTestMiniappService();
  class TestModule {}
  Module({controllers:[MiniappController],providers:[{provide:MiniappService,useValue:service}]})(TestModule);
  const app=await NestFactory.create<NestFastifyApplication>(TestModule,new FastifyAdapter(),{logger:false});
  try{
    await app.init();const http=app.getHttpAdapter().getInstance();
    const response=await http.inject({method:"GET",url:"/v2/sky/galactic/manifest"});
    assert.equal(response.statusCode,200);
    const root=response.json();
    const image=await http.inject({method:"GET",url:root.image.downloadUrl});
    assert.equal(image.statusCode,200);
    assert.equal(image.headers["content-type"],"image/jpeg");
    assert.equal(createHash("sha256").update(image.rawPayload).digest("hex"),root.image.sha256);
    assert.equal((await http.inject({method:"GET",url:root.image.downloadUrl.replace(root.publicationHash,"0".repeat(64))})).statusCode,404);
  }finally{await app.close();}
});
