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

test("CC BY OPAL Saturn band PNG is hash-bound and discloses historical limits",async()=>{
  const service=createTestMiniappService();
  class TestModule {}
  Module({controllers:[MiniappController],providers:[{provide:MiniappService,useValue:service}]})(TestModule);
  const app=await NestFactory.create<NestFastifyApplication>(TestModule,new FastifyAdapter(),{logger:false});
  try{
    await app.init();
    const http=app.getHttpAdapter().getInstance();
    const response=await http.inject({method:"GET",url:"/v2/sky/saturn/manifest"});
    assert.equal(response.statusCode,200);
    assert.equal(response.headers["cache-control"],"no-cache");
    const root=response.json();
    assert.equal(root.source.license,"CC BY 4.0");
    assert.match(root.source.credit,/NASA.*ESA.*OPAL.*Starward/u);
    assert.equal(root.projection.longitude,"none");
    assert.match(root.limitations.join(" "),/not natural color/u);
    assert.match(root.limitations.join(" "),/ring-obscured/u);
    const image=await http.inject({method:"GET",url:root.image.downloadUrl});
    assert.equal(image.statusCode,200);
    assert.equal(image.headers["content-type"],"image/png");
    assert.equal(image.headers["cache-control"],"public, max-age=31536000, immutable");
    assert.equal(image.rawPayload.length,1003);
    assert.equal(createHash("sha256").update(image.rawPayload).digest("hex"),root.image.sha256);
    assert.deepEqual([...image.rawPayload.subarray(0,8)],[137,80,78,71,13,10,26,10]);
    assert.equal((await http.inject({method:"GET",url:root.image.downloadUrl.replace(root.publicationHash,"0".repeat(64))})).statusCode,404);
    assert.equal((await http.inject({method:"GET",url:root.image.downloadUrl.replace(".png",".jpg")})).statusCode,404);
  }finally{await app.close();}
});
