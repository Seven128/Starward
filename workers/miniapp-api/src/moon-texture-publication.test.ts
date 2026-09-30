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
import {MoonTexturePublicationService} from "./moon-texture-publication.ts";
import {createTestMiniappService} from "./test-fixtures/create-test-service.ts";
import {assertMoonCoverageManifest} from "@starward/miniapp-contracts";

const sha=(bytes:Uint8Array)=>createHash("sha256").update(bytes).digest("hex");
const bundle=new URL("../assets/moon/",import.meta.url);
const file="clementine-uv750-v2-wms-2048x1024.jpg";
const originalPublicationHash="ccdcceac70cf74c041cff589f59ea6a2b06f8b741f0be97e67b59799b22b73e6";

test("USGS lunar copy is fixed to its public-domain product, WMS and exact bytes",async()=>{
  const service=new MoonTexturePublicationService();
  const root=service.manifest();
  assert.equal(root.source.provider,"USGS Astrogeology Science Center");
  assert.equal(root.projection.longitude,"positive-east");
  assert.deepEqual(root.projection.bboxDeg,[-180,-90,180,90]);
  assert.equal(root.image.bytes,372399);
  const image=await service.image(root.publicationHash);
  assert.equal(sha(image),root.image.sha256);
  await assert.rejects(service.image("0".repeat(64)),/unavailable/u);
});

test("a changed local lunar image fails before delivery",async()=>{
  const directory=await mkdtemp(join(tmpdir(),"starward-moon-"));
  try{
    await copyFile(new URL("manifest.json",bundle),join(directory,"manifest.json"));
    await copyFile(new URL(file,bundle),join(directory,file));
    const service=new MoonTexturePublicationService(pathToFileURL(join(directory,"manifest.json")));
    const publicationHash=service.manifest().publicationHash;
    const path=join(directory,file),bytes=await readFile(path);bytes[80]^=1;await writeFile(path,bytes);
    await assert.rejects(service.image(publicationHash),/image_invalid/u);
    await assert.rejects(service.image(originalPublicationHash),/image_invalid/u);
    const coveragePath=join(directory,"coverage-manifest.json");
    await copyFile(new URL("coverage-manifest.json",bundle),coveragePath);
    const coverageRoot=JSON.parse(await readFile(coveragePath,"utf8"));
    const coverageImagePath=join(directory,coverageRoot.image.file);
    await copyFile(new URL(coverageRoot.image.file,bundle),coverageImagePath);
    const coverageService=new MoonTexturePublicationService(undefined,pathToFileURL(coveragePath));
    const coverage=coverageService.coverageManifest();
    const broken=await readFile(coverageImagePath);broken[80]^=1;await writeFile(coverageImagePath,broken);
    await assert.rejects(coverageService.coverageImage(coverage.publicationHash),/image_invalid/u);
    await copyFile(new URL(coverageRoot.image.file,bundle),coverageImagePath);
    assert.equal(sha(await coverageService.coverageImage(coverage.publicationHash)),coverage.image.sha256);
    coverageRoot.coverage.sourceNoData=1;await writeFile(coveragePath,JSON.stringify(coverageRoot));
    assert.throws(()=>new MoonTexturePublicationService(undefined,pathToFileURL(coveragePath)).coverageManifest(),/publication_invalid/u);
  }finally{
    const target=await realpath(directory),root=await realpath(tmpdir());
    assert.ok(target.startsWith(resolve(root)+"\\")||target.startsWith(resolve(root)+"/"));
    assert.ok(target.split(/[\\/]/u).at(-1)?.startsWith("starward-moon-"));
    await rm(target,{recursive:true,force:true});
  }
});

test("lunar metadata correction preserves cached image URLs and rejects unknown hashes",async()=>{
  const service=createTestMiniappService();
  class TestModule {}
  Module({controllers:[MiniappController],providers:[{provide:MiniappService,useValue:service}]})(TestModule);
  const app=await NestFactory.create<NestFastifyApplication>(TestModule,new FastifyAdapter(),{logger:false});
  try{
    await app.init();const http=app.getHttpAdapter().getInstance();
    const response=await http.inject({method:"GET",url:"/v2/sky/moon/manifest"});
    assert.equal(response.statusCode,200);
    const root=response.json();
    assert.notEqual(root.publicationHash,originalPublicationHash);
    const image=await http.inject({method:"GET",url:root.image.downloadUrl});
    assert.equal(image.statusCode,200);
    assert.equal(image.headers["content-type"],"image/jpeg");
    assert.equal(sha(image.rawPayload),root.image.sha256);
    const original=await http.inject({method:"GET",url:root.image.downloadUrl.replace(root.publicationHash,originalPublicationHash)});
    assert.equal(original.statusCode,200);
    assert.equal(original.headers["content-type"],"image/jpeg");
    assert.deepEqual(original.rawPayload,image.rawPayload);
    const coverageResponse=await http.inject({method:"GET",url:"/v2/sky/moon/coverage/manifest"});
    assert.equal(coverageResponse.statusCode,200);
    const coverage=coverageResponse.json();assertMoonCoverageManifest(coverage);
    const png=await http.inject({method:"GET",url:coverage.image.downloadUrl});
    assert.equal(png.statusCode,200);assert.equal(png.headers["content-type"],"image/png");
    assert.equal(png.rawPayload.length,1595187);assert.equal(sha(png.rawPayload),coverage.image.sha256);
    assert.equal((await http.inject({method:"GET",url:coverage.image.downloadUrl.replace(coverage.publicationHash,root.publicationHash)})).statusCode,404);
    assert.equal((await http.inject({method:"GET",url:coverage.image.downloadUrl.replace(coverage.image.file,file)})).statusCode,404);
    assert.deepEqual((await http.inject({method:"GET",url:"/v2/sky/moon/manifest"})).json(),root);
    const legacyInfo=(await http.inject({method:"GET",url:"/v2/celestial-objects/SOLAR%3AMOON"})).json();
    const currentInfo=(await http.inject({method:"GET",url:"/v2/celestial-objects/SOLAR%3AMOON?moonTextureVersion=coverage-v2"})).json();
    assert.ok(legacyInfo.data.sources.some((s:any)=>s.id==="usgs-clementine-uv750-v2"));
    assert.ok(currentInfo.data.sources.some((s:any)=>s.id==="usgs-clementine-uv750-v21-coverage"));
    assert.notEqual(legacyInfo.data.contentRevision,currentInfo.data.contentRevision);
    assert.equal((await http.inject({method:"GET",url:"/v2/celestial-objects/SOLAR%3AMOON?moonTextureVersion=unknown"})).statusCode,400);
    assert.equal((await http.inject({method:"GET",url:root.image.downloadUrl.replace(root.publicationHash,"0".repeat(64))})).statusCode,404);
  }finally{await app.close();}
});
