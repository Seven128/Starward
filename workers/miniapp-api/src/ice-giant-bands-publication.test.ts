import "reflect-metadata";
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {mkdtemp,readFile,writeFile,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {pathToFileURL} from "node:url";
import test from "node:test";
import {Module} from "@nestjs/common";
import {NestFactory} from "@nestjs/core";
import {FastifyAdapter,type NestFastifyApplication} from "@nestjs/platform-fastify";
import {MiniappController} from "./controller.ts";
import {MiniappService} from "./miniapp-service.ts";
import {createTestMiniappService} from "./test-fixtures/create-test-service.ts";
import {UranusBandsPublicationService} from "./uranus-bands-publication.ts";
import {NeptuneBandsPublicationService} from "./neptune-bands-publication.ts";
import {CelestialObjectInformationService} from "./celestial-object-information.ts";

const bodies=[{body:"uranus",Service:UranusBandsPublicationService,bytes:421},
  {body:"neptune",Service:NeptuneBandsPublicationService,bytes:527}] as const;

test("ice-giant HTTP returns the actual pinned adaptation and rejects foreign body/version/file",async()=>{
  class TestModule {}
  Module({controllers:[MiniappController],providers:[{provide:MiniappService,useValue:createTestMiniappService()}]})(TestModule);
  const app=await NestFactory.create<NestFastifyApplication>(TestModule,new FastifyAdapter(),{logger:false});
  try{
    await app.init();const http=app.getHttpAdapter().getInstance();
    for(const {body,bytes} of bodies){
      const response=await http.inject({method:"GET",url:`/v2/sky/${body}/manifest`});
      assert.equal(response.statusCode,200);assert.equal(response.headers["cache-control"],"no-cache");
      const root=response.json();assert.equal(root.source.license,"CC BY 4.0");
      assert.equal(root.projection.latitude,"planetographic");assert.equal(root.projection.longitude,"none");
      assert.match(root.limitations.join(" "),/not natural color.*Transparent latitudes/su);
      const image=await http.inject({method:"GET",url:root.image.downloadUrl});
      assert.equal(image.statusCode,200);assert.equal(image.headers["content-type"],"image/png");
      assert.equal(image.headers["cache-control"],"public, max-age=31536000, immutable");
      assert.equal(image.rawPayload.length,bytes);
      assert.equal(createHash("sha256").update(image.rawPayload).digest("hex"),root.image.sha256);
      for(const url of [root.image.downloadUrl.replace(root.publicationHash,"0".repeat(64)),
        root.image.downloadUrl.replace(body,body==="uranus"?"neptune":"uranus"),root.image.downloadUrl.replace(".png",".jpg")])
        assert.equal((await http.inject({method:"GET",url})).statusCode,404);
      const info=new CelestialObjectInformationService().get(`PLANET:${body.toUpperCase()}`);
      assert.ok(info.data.sources.some(source=>source.sourceUrl===root.source.recordUrl));
      assert.match(info.data.limitations.join(" "),/未观测纬度.*不表示实时天气/u);
    }
  }finally{await app.close();}
});

for(const {body,Service} of bodies)test(`${body}: corrupted image is withheld; repair recovers with the same publication`,async()=>{
  const directory=await mkdtemp(join(tmpdir(),`starward-${body}-bands-`));
  try{
    const manifestUrl=new URL(`../assets/${body}/manifest.json`,import.meta.url);
    const manifestBytes=await readFile(manifestUrl),root=JSON.parse(manifestBytes.toString("utf8"));
    const image=await readFile(new URL(root.image.file,manifestUrl));
    await writeFile(join(directory,"manifest.json"),manifestBytes);
    const imagePath=join(directory,root.image.file),service=new Service(pathToFileURL(join(directory,"manifest.json")));
    const hash=service.manifest().publicationHash;
    const corrupt=Buffer.from(image);corrupt[corrupt.length-1]^=1;
    await writeFile(imagePath,corrupt);await assert.rejects(service.image(hash),/body_texture_image_invalid/u);
    await writeFile(imagePath,image);assert.deepEqual(await service.image(hash),image);
    root.source.license="unknown";await writeFile(join(directory,"manifest.json"),JSON.stringify(root));
    assert.throws(()=>new Service(pathToFileURL(join(directory,"manifest.json"))).manifest(),/publication_invalid/u);
  }finally{await rm(directory,{recursive:true,force:true});}
});
