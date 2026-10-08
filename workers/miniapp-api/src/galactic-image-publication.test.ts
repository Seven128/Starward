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
import {galacticImagePublicAssetHeaders} from "./sky-public-asset-headers.ts";
import {assertGalacticImagePublication,galacticImageFormat} from "@starward/miniapp-contracts";

const file="2mass-galactic-2048x1024.jpg";
const bundle=new URL("../assets/deep-sky/galactic-2mass/",import.meta.url);

test("2MASS publication serves only the manifest-bound reviewed JPEG",async()=>{
  const service=new GalacticImagePublicationService(new URL("manifest.json",bundle));
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

test("a manifest consumer cannot retarget the cached file, codec or later provenance",async()=>{
  const service=new GalacticImagePublicationService();
  const published=service.manifest(),original=structuredClone(published);
  const edited=published as any;
  edited.schemaVersion="starward-mellinger-optical-milky-way-trial-v1";
  edited.image.file="../unpublished.png";edited.image.sha256="0".repeat(64);
  edited.source.credit="wrong caller credit";edited.projection.frame="equatorial-j2000";
  edited.limitations.length=0;
  assert.deepEqual(service.manifest(),original);
  const image=await service.image(original.publicationHash);
  assert.equal(createHash("sha256").update(image).digest("hex"),original.image.sha256);
  await assert.rejects(service.image(original.publicationHash,"../unpublished.png"),/galactic_image_version_unavailable/u);
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

test("ordinary discovery serves optical PNG and the retained 2MASS URL keeps its exact bytes and source",async()=>{
  const service=createTestMiniappService();
  class TestModule {}
  Module({controllers:[MiniappController],providers:[{provide:MiniappService,useValue:service}]})(TestModule);
  const app=await NestFactory.create<NestFastifyApplication>(TestModule,new FastifyAdapter(),{logger:false});
  try{
    await app.init();const http=app.getHttpAdapter().getInstance();
    const response=await http.inject({method:"GET",url:"/v2/sky/galactic/display/manifest"});
    assert.equal(response.statusCode,200);
    const root=response.json();
    assert.equal(root.schemaVersion,"starward-mellinger-optical-milky-way-v1");
    assert.equal(root.scope,"DISPLAY");
    assert.equal(root.projection.frame,"equatorial-j2000");
    const image=await http.inject({method:"GET",url:root.image.downloadUrl});
    assert.equal(image.statusCode,200);
    assert.equal(image.headers["content-type"],"image/png");
    for(const [key,value] of Object.entries(galacticImagePublicAssetHeaders(service.galacticImage.manifest())))
      assert.equal(image.headers[key],value);
    assert.equal(createHash("sha256").update(image.rawPayload).digest("hex"),root.image.sha256);
    const infrared=new GalacticImagePublicationService(new URL("manifest.json",bundle)).manifest();
    const retained=await http.inject({method:"GET",url:infrared.image.downloadUrl});
    assert.equal(retained.statusCode,200);
    assert.equal(retained.headers["content-type"],"image/jpeg");
    for(const [key,value] of Object.entries(galacticImagePublicAssetHeaders(infrared)))
      assert.equal(retained.headers[key],value);
    assert.equal(createHash("sha256").update(retained.rawPayload).digest("hex"),infrared.image.sha256);
    assert.deepEqual(service.galacticImage.imageManifest(infrared.publicationHash),infrared);
    assert.equal(service.galacticImage.manifest().publicationHash,root.publicationHash);
    assert.equal((await http.inject({method:"GET",url:infrared.image.downloadUrl.replace(infrared.image.file,root.image.file)})).statusCode,404);
    assert.equal((await http.inject({method:"GET",url:root.image.downloadUrl.replace(root.image.file,infrared.image.file)})).statusCode,404);
    assert.equal((await http.inject({method:"GET",url:root.image.downloadUrl.replace(root.publicationHash,"0".repeat(64))})).statusCode,404);
  }finally{await app.close();}
});

test("unversioned discovery preserves the exact 2MASS contract for previous clients",async()=>{
  const service=createTestMiniappService();
  class LegacyDiscoveryModule {}
  Module({controllers:[MiniappController],providers:[{provide:MiniappService,useValue:service}]})(LegacyDiscoveryModule);
  const app=await NestFactory.create<NestFastifyApplication>(LegacyDiscoveryModule,new FastifyAdapter(),{logger:false});
  try{
    await app.init();const response=await app.getHttpAdapter().getInstance().inject({method:'GET',url:'/v2/sky/galactic/manifest'});
    assert.equal(response.statusCode,200);
    const expected=new GalacticImagePublicationService(new URL('manifest.json',bundle)).manifest();
    assert.deepEqual(response.json(),expected,'old clients cannot accept the new optical schema at their existing discovery URL');
    assert.equal(service.galacticImage.manifest().schemaVersion,'starward-mellinger-optical-milky-way-v1');
  }finally{await app.close();}
});

test("ordinary optical role cannot promote science validity, retarget exact input or relabel the immutable trial",()=>{
  const normal=new GalacticImagePublicationService().manifest();
  assertGalacticImagePublication(normal);
  assert.equal(galacticImageFormat(normal),"png");
  assert.equal(normal.source.sourceSha256,normal.image.sha256);
  assert.throws(()=>assertGalacticImagePublication({...normal,scientificAvailability:"AVAILABLE"}),/galactic_image_manifest_invalid/);
  assert.throws(()=>assertGalacticImagePublication({...normal,absoluteRegistration:"VERIFIED"}),/galactic_image_manifest_invalid/);
  assert.throws(()=>assertGalacticImagePublication({...normal,scope:"TRIAL"}),/galactic_image_manifest_invalid/);
  assert.throws(()=>assertGalacticImagePublication({...normal,schemaVersion:"starward-mellinger-optical-milky-way-trial-v1"}),/galactic_image_manifest_invalid/);
  assert.throws(()=>assertGalacticImagePublication({...normal,projection:{...normal.projection,frame:"galactic"}}),/galactic_image_manifest_invalid/);
});

test("a missing or invalid current optical manifest cannot strand valid legacy metadata or image bytes",async()=>{
  const directory=await mkdtemp(join(tmpdir(),"starward-galactic-"));
  try{
    const current=new GalacticImagePublicationService().manifest();
    const infrared=new GalacticImagePublicationService(new URL("manifest.json",bundle)).manifest();
    const invalid={...current,scope:"TRIAL"};
    await writeFile(join(directory,"invalid.json"),JSON.stringify(invalid),{flag:"wx"});
    for(const name of ["invalid.json","missing.json"]){
      const owner=new GalacticImagePublicationService(pathToFileURL(join(directory,name)));
      const service=createTestMiniappService({galacticImage:owner});
      class RetainedFailureModule {}
      Module({controllers:[MiniappController],providers:[{provide:MiniappService,useValue:service}]})(RetainedFailureModule);
      const app=await NestFactory.create<NestFastifyApplication>(RetainedFailureModule,new FastifyAdapter(),{logger:false});
      try{
        await app.init();const http=app.getHttpAdapter().getInstance();
        const legacy=await http.inject({method:"GET",url:"/v2/sky/galactic/manifest"});
        assert.equal(legacy.statusCode,200,"valid old publication is independent of current-manifest failure");
        assert.deepEqual(legacy.json(),infrared);
        const image=await http.inject({method:"GET",url:infrared.image.downloadUrl});
        assert.equal(image.statusCode,200);
        assert.equal(createHash("sha256").update(image.rawPayload).digest("hex"),infrared.image.sha256);
        for(const [k,v]of Object.entries(galacticImagePublicAssetHeaders(infrared)))assert.equal(image.headers[k],v);
        assert.equal((await http.inject({method:"GET",url:"/v2/sky/galactic/display/manifest"})).statusCode,500);
        assert.equal((await http.inject({method:"GET",url:current.image.downloadUrl})).statusCode,500,
          "current optical failure must not return infrared success at an optical URL");
      }finally{await app.close();}
    }
  }finally{
    const target=await realpath(directory),root=await realpath(tmpdir());
    assert.ok(target.startsWith(resolve(root)+"\\")||target.startsWith(resolve(root)+"/"));
    assert.ok(target.split(/[\\/]/u).at(-1)?.startsWith("starward-galactic-"));
    await rm(target,{recursive:true,force:true});
  }
});
