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
import {mkdtemp,readFile,realpath,rm,writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {dirname,join} from "node:path";
import {pathToFileURL} from "node:url";
import {BODY_IMAGE_PUBLICATIONS,isBodyImageMetadata,type JupiterBandsManifestData} from "@starward/miniapp-contracts";
import {FixedBodyTexturePublicationService} from "./fixed-body-texture-publication.ts";
import {bodySkyPublicAssets,type SkyPublicAssetExportInput} from "./sky-public-asset-export.ts";

test("publication responses cannot mutate the stored edition served by HTTP or export",async()=>{
  const service=createTestMiniappService();
  try{
    const owners=[service.moonTexture,service.marsTexture,service.mercuryTexture,service.jupiterBands,
      service.saturnBands,service.uranusBands,service.neptuneBands];
    for(const owner of owners){
      const before=owner.manifest(),expected=structuredClone(before);
      before.source.credit="caller annotation";
      before.limitations.splice(0,before.limitations.length,"caller limitation");
      const projection=before.projection as unknown as Record<string,unknown>;
      for(const value of Object.values(projection))if(Array.isArray(value))value[0]=999;
      assert.deepEqual(owner.manifest(expected.publicationHash),expected,
        "source, limitations and geometry must retain the publication identity");
      assert.deepEqual(JSON.parse(owner.publishedMetadata(expected.publicationHash).bytes.toString()),expected);
    }
    const coverage=service.moonTexture.coverageManifest(),expected=structuredClone(coverage);
    coverage.source.credit="caller annotation";
    coverage.limitations.push("caller limitation");
    assert.deepEqual(service.moonTexture.coverageManifest(expected.publicationHash),expected);
  }finally{await service.onModuleDestroy();}
});

test("CC BY OPAL Jupiter band PNG is hash-bound and credits the historical adaptation",async()=>{
  const service=createTestMiniappService();
  class TestModule {}
  Module({controllers:[MiniappController],providers:[{provide:MiniappService,useValue:service}]})(TestModule);
  const app=await NestFactory.create<NestFastifyApplication>(TestModule,new FastifyAdapter(),{logger:false});
  try{
    await app.init();
    const http=app.getHttpAdapter().getInstance();
    const response=await http.inject({method:"GET",url:"/v2/sky/jupiter/manifest"});
    assert.equal(response.statusCode,200);
    assert.equal(response.headers["cache-control"],"no-cache");
    const root=response.json();
    assert.equal(root.source.license,"CC BY 4.0");
    assert.equal(root.source.licenseUrl,"https://creativecommons.org/licenses/by/4.0/");
    assert.match(root.source.credit,/NASA.*ESA.*OPAL.*Starward/u);
    assert.equal(root.projection.longitude,"none");
    assert.match(root.limitations.join(" "),/Great Red Spot/u);
    const image=await http.inject({method:"GET",url:root.image.downloadUrl});
    assert.equal(image.statusCode,200);
    assert.equal(image.headers["content-type"],"image/png");
    assert.equal(image.headers["cache-control"],"public, max-age=31536000, immutable");
    assert.equal(image.rawPayload.length,1026);
    assert.equal(createHash("sha256").update(image.rawPayload).digest("hex"),root.image.sha256);
    assert.deepEqual([...image.rawPayload.subarray(0,8)],[137,80,78,71,13,10,26,10]);
    assert.equal((await http.inject({method:"GET",url:root.image.downloadUrl.replace(root.publicationHash,"0".repeat(64))})).statusCode,404);
    assert.equal((await http.inject({method:"GET",url:root.image.downloadUrl.replace(".png",".jpg")})).statusCode,404);
    for(const [body,owner]of [["moon",service.moonTexture],["mars",service.marsTexture],["mercury",service.mercuryTexture],
      ["jupiter",service.jupiterBands],["saturn",service.saturnBands],["uranus",service.uranusBands],["neptune",service.neptuneBands]]as const){
      const manifest=owner.manifest(),records=[];for await(const record of bodySkyPublicAssets(body,owner))records.push(record);
      assert.equal(records.length,2);
      for(const record of records){
        const response=await http.inject({method:"GET",url:record.route});assert.equal(response.statusCode,200,record.route);
        assert.deepEqual(response.rawPayload,record.bytes);
        for(const [name,value]of Object.entries(record.headers))assert.equal(response.headers[name],value);
      }
      assert.equal((await http.inject({method:"GET",url:`/v2/sky/${body}/${'0'.repeat(64)}/manifest`})).statusCode,404);
      const wrongBody=body==='mars'?'jupiter':'mars';
      assert.equal((await http.inject({method:"GET",url:`/v2/sky/${wrongBody}/${manifest.publicationHash}/manifest`})).statusCode,404);
    }
    const coverage=service.moonTexture.coverageManifest();
    const exactCoverage=await http.inject({method:"GET",url:`/v2/sky/moon/coverage/${coverage.publicationHash}/manifest`});
    assert.equal(exactCoverage.statusCode,200);assert.deepEqual(exactCoverage.json(),coverage);
    assert.equal((await http.inject({method:"GET",url:`/v2/sky/moon/${coverage.publicationHash}/manifest`})).statusCode,404);
    assert.equal((await http.inject({method:"GET",url:`/v2/sky/moon/${'ccdcceac70cf74c041cff589f59ea6a2b06f8b741f0be97e67b59799b22b73e6'}/manifest`})).statusCode,404);
  }finally{await app.close();}
});

test("selected retained file reaches actual HTTP and the standard export, without borrowing current metadata",async()=>{
  const directory=await mkdtemp(join(tmpdir(),"starward-body-editions-")),fixed=BODY_IMAGE_PUBLICATIONS.jupiter;
  const current=JSON.parse(await readFile(new URL("../assets/jupiter/manifest.json",import.meta.url),"utf8"));
  const bytes=await readFile(new URL(`../assets/jupiter/${fixed.file}`,import.meta.url));
  const old={...current,publicationId:"retained-transport-fixture",processing:"Retained transport fixture, no historical adoption claim.",
    image:{...current.image,file:"retained-jupiter-bands.png"}};
  let app:NestFastifyApplication|undefined;
  try{
    for(const [name,manifest]of [["current",current],["retained",old]]as const){
      await writeFile(join(directory,name+".json"),JSON.stringify(manifest)+"\n");
      await writeFile(join(directory,manifest.image.file),bytes);
    }
    const declaration={...fixed,recordUrl:fixed.sourceIdentity.recordUrl,rightsUrl:fixed.sourceIdentity.rightsUrl,
      validateMetadata:(root:Record<string,unknown>)=>isBodyImageMetadata("jupiter",root)};
    const owner=new FixedBodyTexturePublicationService<JupiterBandsManifestData>(pathToFileURL(join(directory,"current.json")),declaration,
      [{manifestUrl:pathToFileURL(join(directory,"retained.json")),fixed:{...declaration,file:old.image.file,
        validateMetadata:root=>isBodyImageMetadata("jupiter",{...root,image:{...root.image as object,file:fixed.file}})}}]);
    const service=createTestMiniappService();Object.defineProperty(service,"jupiterBands",{value:owner});
    class TestModule {}
    Module({controllers:[MiniappController],providers:[{provide:MiniappService,useValue:service}]})(TestModule);
    app=await NestFactory.create<NestFastifyApplication>(TestModule,new FastifyAdapter(),{logger:false});await app.init();
    const http=app.getHttpAdapter().getInstance(),manifests=owner.publishedManifests();assert.equal(manifests.length,2);
    const exported:SkyPublicAssetExportInput[]=[];for await(const record of bodySkyPublicAssets("jupiter",owner))exported.push(record);
    assert.equal(exported.length,4);
    for(const manifest of manifests){
      const image=await http.inject({method:"GET",url:manifest.image.downloadUrl});assert.equal(image.statusCode,200);
      const metadata=await http.inject({method:"GET",url:`/v2/sky/jupiter/${manifest.publicationHash}/manifest`});
      assert.equal(metadata.statusCode,200);assert.equal(metadata.json().processing,manifest.processing);
      for(const record of exported.filter(r=>r.route.includes(manifest.publicationHash))){
        const response=await http.inject({method:"GET",url:record.route});assert.equal(response.statusCode,200);
        assert.deepEqual(response.rawPayload,record.bytes);
        for(const [name,value]of Object.entries(record.headers))assert.equal(response.headers[name],value);
      }
      const other=manifests.find(m=>m.publicationHash!==manifest.publicationHash)!;
      assert.equal((await http.inject({method:"GET",url:manifest.image.downloadUrl.replace(manifest.image.file,other.image.file)})).statusCode,404);
    }
    await writeFile(join(directory,old.image.file),Buffer.from("corrupt retained fixture"));
    await assert.rejects(owner.imageAsset(manifests[1].publicationHash,old.image.file),/image_invalid/);
    assert.deepEqual((await owner.imageAsset(manifests[0].publicationHash,current.image.file)).bytes,bytes);
  }finally{
    if(app)await app.close();assert.equal(dirname(await realpath(directory)),await realpath(tmpdir()));
    assert.match(directory.split(/[\\/]/).at(-1)!,/^starward-body-editions-/);await rm(directory,{recursive:true});
  }
});
