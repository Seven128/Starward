/** Current real v3 service/controller/client boundary; local HTTP injection. */
import "reflect-metadata";
import assert from "node:assert/strict";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
import { createHash } from "node:crypto";
import vm from "node:vm";
import ts from "typescript";
import { Module } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { SdssOpticalImageryService } from "../../../../workers/miniapp-api/src/sdss-optical-imagery.ts";
import { MiniappController } from "../../../../workers/miniapp-api/src/controller.ts";
import { MiniappService } from "../../../../workers/miniapp-api/src/miniapp-service.ts";
import { createTestMiniappService } from "../../../../workers/miniapp-api/src/test-fixtures/create-test-service.ts";
import { assertSdssScienceOpticalManifest, MINIAPP_API_BASE_PATH, SDSS_OPTICAL_LEVELS } from "../../../../packages/miniapp-contracts/src/index.ts";
const ROOT=resolve("."), PUB=join(ROOT,"output/signed-science-publication-1003-r1");
const OUT=join(ROOT,"output/signed-science-http-1003-r1");
const PIN="dddc454058cd1dc464ab0f726b78d0af5df130d4a6c51c41d8a83e4bfcf5e2af";
const sha=(bytes:Uint8Array|string)=>createHash("sha256").update(bytes).digest("hex");
const bind=(p:string)=>{const bytes=readFileSync(p);return {path:p.slice(ROOT.length+1).replaceAll("\\","/"),bytes:bytes.length,sha256:sha(bytes)}};
assert.equal(bind(join(PUB,"manifest.json")).sha256,"d64d9534d74457b9ea48f1dfd67cb46727e5040a6c2ccf3c79a58e13143c7572");
mkdirSync(OUT);
const service=new SdssOpticalImageryService({sciencePublications:[{reference:"M:51",expectedHash:PIN,manifestUrl:pathToFileURL(join(PUB,"manifest.json"))}]});
const manifest=service.manifest(PIN);assertSdssScienceOpticalManifest(manifest,"M:51",PIN);
assert.equal(manifest.imageVersion,"science-optical-v3");
assert.throws(()=>new SdssOpticalImageryService().manifest(PIN),/not_found/u);
const source=service.source("M:51",PIN)!;assert.match(source.precision!,/PNG/u);
assert(source.limitations?.some(line=>line.includes("averages signed jointly available")));
assert.throws(()=>service.source("M:82",PIN),/not_found/u);
class TestModule {}
Module({controllers:[MiniappController],providers:[{provide:MiniappService,useValue:createTestMiniappService({sdssOpticalImages:service})}]})(TestModule);
const app=await NestFactory.create(TestModule,new FastifyAdapter(),{logger:false});
const observations:any={scope:"Current real publication through actual service/Nest/Fastify/controller/client; in-process HTTP injection. Business fixtures, no production listener, WEAPP/native/GPU/full quality or capacity acceptance.",source};
try {
 await app.init();const http=app.getHttpAdapter().getInstance();
 const metadata=await http.inject({method:"GET",url:`/v2/sky/sdss-optical/${PIN}/manifest`});
 assert.equal(metadata.statusCode,200);assert.deepEqual(metadata.json(),manifest);
 observations.manifest={status:metadata.statusCode,sha256:sha(metadata.rawPayload),bytes:metadata.rawPayload.length};
 observations.levels=[];
 for(const level of SDSS_OPTICAL_LEVELS){const asset=manifest.levels[level];
  const response=await http.inject({method:"GET",url:asset.downloadUrl});
  assert.equal(response.statusCode,200);assert.equal(response.headers["content-type"],"image/png");
  assert.equal(sha(response.rawPayload),asset.sha256);assert.deepEqual(response.rawPayload,readFileSync(join(PUB,asset.file)));
  writeFileSync(join(OUT,asset.file),response.rawPayload,{flag:"wx"});
  observations.levels.push({level,bytes:response.rawPayload.length,sha256:sha(response.rawPayload),contentType:response.headers["content-type"]});
 }
 const information=await http.inject({method:"GET",url:`/v2/celestial-objects/M%3A51?opticalPublicationHash=${PIN}`});
 assert.equal(information.statusCode,200);assert.equal(information.json().dataState,"FRESH");
 assert(information.json().data.sources.some((s:any)=>s.id===source.id));
 observations.information=information.json();
 const old=await http.inject({method:"GET",url:"/v2/sky/sdss-optical/manifest"});
 assert.equal(old.statusCode,200);assert.notEqual(old.json().publicationHash,PIN);
 const jpeg=await http.inject({method:"GET",url:old.json().levels.DETAIL.downloadUrl});
 assert.equal(jpeg.headers["content-type"],"image/jpeg");assert.equal(sha(jpeg.rawPayload),old.json().levels.DETAIL.sha256);
 observations.oldDefault={publicationHash:old.json().publicationHash,detailSha256:sha(jpeg.rawPayload)};
 observations.forbidden=[];
 for(const file of ["reference-rgb-master.npy","g-science.npy","upstream-binding.json","M-82-detail.png"]){
  const response=await http.inject({method:"GET",url:`/v2/sky/sdss-optical/${PIN}/${file}`});assert.equal(response.statusCode,404);
  observations.forbidden.push({file,status:response.statusCode});
 }
 const p=join(ROOT,"apps/wechat-miniapp/src/services/sdss-optical-client.ts"),raw=readFileSync(p,"utf8");
 const ast=ts.createSourceFile(p,raw,ts.ScriptTarget.Latest,true);
 const declaration=ast.statements.find((n):n is ts.FunctionDeclaration=>ts.isFunctionDeclaration(n)&&n.name?.text==="getSdssScienceOpticalManifest")!.getText(ast).replace(/^export\s+/u,"");
 const get=vm.runInNewContext(ts.transpileModule(declaration,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText+"\ngetSdssScienceOpticalManifest;",{
  MINIAPP_API_BASE_PATH,assertSdssScienceOpticalManifest,requestBareSkyResource:async(path:string)=>{const response=await http.inject({method:"GET",url:path});return {status:response.statusCode,body:response.json()}}
 });
 assert.deepEqual(await get("M:51",PIN),manifest);await assert.rejects(get("M:82",PIN),/publication_invalid/u);
 observations.currentClient={source:bind(p),manifestAccepted:true,foreignReferenceRejected:true};
 writeFileSync(join(OUT,"result.json"),JSON.stringify(observations,null,2)+"\n",{flag:"wx"});
 console.log(JSON.stringify({result:bind(join(OUT,"result.json")),levels:observations.levels}));
} finally {await app.close();}
