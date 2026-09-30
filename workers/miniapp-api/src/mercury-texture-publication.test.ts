import "reflect-metadata";
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import test from "node:test";
import {Module} from "@nestjs/common";
import {NestFactory} from "@nestjs/core";
import {FastifyAdapter,type NestFastifyApplication} from "@nestjs/platform-fastify";
import {MiniappController} from "./controller.ts";
import {MiniappService} from "./miniapp-service.ts";
import {createTestMiniappService} from "./test-fixtures/create-test-service.ts";

const sha=(bytes:Uint8Array)=>createHash("sha256").update(bytes).digest("hex");

test("public-domain MESSENGER Mercury JPEG is served at the published hash only",async()=>{
  const service=createTestMiniappService();
  class TestModule {}
  Module({controllers:[MiniappController],providers:[{provide:MiniappService,useValue:service}]})(TestModule);
  const app=await NestFactory.create<NestFastifyApplication>(TestModule,new FastifyAdapter(),{logger:false});
  try{
    await app.init();const http=app.getHttpAdapter().getInstance();
    const response=await http.inject({method:"GET",url:"/v2/sky/mercury/manifest"});
    assert.equal(response.statusCode,200);
    const root=response.json();
    assert.equal(root.source.recordUrl,"https://astrogeology.usgs.gov/search/map/mercury_messenger_mdis_global_mosaic_250m");
    assert.deepEqual(root.projection.bboxDeg,[-180,-90,180,90]);
    const image=await http.inject({method:"GET",url:root.image.downloadUrl});
    assert.equal(image.statusCode,200);
    assert.equal(image.headers["content-type"],"image/jpeg");
    assert.equal(image.rawPayload.length,89984);
    assert.equal(sha(image.rawPayload),root.image.sha256);
    assert.equal((await http.inject({method:"GET",url:root.image.downloadUrl.replace(root.publicationHash,"0".repeat(64))})).statusCode,404);
  }finally{await app.close();}
});
