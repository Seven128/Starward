/** Current source owner/controller and controlled current Provenance text only.
 * This does not mount a native page or rerun the historical full source chain. */
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
import { SDSS_OPTICAL_PUBLICATIONS } from "../../../../packages/miniapp-contracts/src/index.ts";
import { SdssOpticalImageryService } from "../../../../workers/miniapp-api/src/sdss-optical-imagery.ts";
import { MiniappController } from "../../../../workers/miniapp-api/src/controller.ts";
import { MiniappService } from "../../../../workers/miniapp-api/src/miniapp-service.ts";
import { ApiExceptionFilter } from "../../../../workers/miniapp-api/src/api-exception.filter.ts";
import { createTestMiniappService } from "../../../../workers/miniapp-api/src/test-fixtures/create-test-service.ts";
import { isProductSource, SOURCE_KIND_LABEL } from "../../../../apps/wechat-miniapp/src/utils/source-presentation.ts";
const ROOT=resolve(import.meta.dirname,"../../../.."), TASK=".codex/work-items/cloud-sky-native-2026-09-22";
const OUT=join(ROOT,"output/sdss-source-colour-semantics-1003-r1");
mkdirSync(OUT); // Exclusive; never replace an earlier run.
const read=(path:string)=>readFileSync(join(ROOT,path),"utf8");
const bind=(path:string)=>{const bytes=readFileSync(join(ROOT,path));return {path,bytes:bytes.length,sha256:createHash("sha256").update(bytes).digest("hex")}};
const save=(file:string,value:unknown)=>writeFileSync(join(OUT,file),JSON.stringify(value,null,2)+"\n",{flag:"wx"});
const datasets=[
 {dir:"output/partial-science-publication-1003-r1",sha:"5a8696100a2ccc6e1279a720a731252a9262f378644f12aaa9ed919704962163",hash:"12b07bb699f494abbb8ecc95a523d5f65f6cb511839bc7d18cb958a0d795129a"},
 {dir:"output/frozen-zscale-publication-1003-r1",sha:"8679b44e97e4b51a6893239d49db1b3931ac12b79c9692d91086f5190f9f0368",hash:"3f98c194d5ab2ea8935a0eb87c37fbc23d4a8fee5f1f7539a72e7c9b0e7acf7b"},
];
for(const d of datasets)assert.equal(bind(d.dir+"/manifest.json").sha256,d.sha);
const protectedRows=JSON.parse(read(TASK+"/tmp/resume-preserved-hashes-2026-10-01.json"));
const paths=[TASK+"/scripts/experience-sdss-source-colour-semantics-2026-10-03.mts",
 "workers/miniapp-api/src/sdss-optical-imagery.ts","apps/wechat-miniapp/src/components/provenance.tsx",
 "output/hubble-m51-source-quality-trial-1002-r1/source-page.html",
 ...datasets.map(d=>d.dir+"/manifest.json"),...protectedRows.map((p:any)=>p.path)];
const before=paths.map(bind);save("inputs-before.json",before);
for(const p of protectedRows)assert.equal(bind(p.path).sha256,p.sha256);
const sourcePath="apps/wechat-miniapp/src/components/provenance.tsx";
const ast=ts.createSourceFile(sourcePath,read(sourcePath),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
const declaration=ast.statements.find((n):n is ts.FunctionDeclaration=>ts.isFunctionDeclaration(n)&&n.name?.text==="Provenance");assert(declaration);
const React={Fragment:"Fragment",createElement:(type:any,props:any,...children:any[])=>typeof type==="function"?type({...props,children}):({type,props:props??{},children})};
const Provenance=vm.runInNewContext(ts.transpileModule(declaration.getText(ast).replace(/^export\s+/u,"")+"\nProvenance;",{compilerOptions:{target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.React}}).outputText,
 {React,View:"View",Text:"Text",SoftButton:"SoftButton",SourceAttribution:"SourceAttribution",DataStateBadge:"DataStateBadge",SOURCE_KIND_LABEL,isProductSource,DATA_STATE_LABELS:{FRESH:"当前"},useState:(v:any)=>[v,()=>{}],Taro:{},formatRetrievedAt:()=>"时间未知"},{timeout:3000});
function strings(n:any):string[]{if(typeof n==="string")return [n];if(Array.isArray(n))return n.flatMap(strings);return n&&typeof n==="object"?strings(n.children):[]}
const owner=new SdssOpticalImageryService({sciencePublications:datasets.map(d=>({reference:"M:51",expectedHash:d.hash,manifestUrl:pathToFileURL(join(ROOT,d.dir,"manifest.json"))}))});
class TestModule{}
Module({controllers:[MiniappController],providers:[{provide:MiniappService,useValue:createTestMiniappService({sdssOpticalImages:owner})}]})(TestModule);
const app=await NestFactory.create(TestModule,new FastifyAdapter(),{logger:false});app.useGlobalFilters(new ApiExceptionFilter());
const rows:any[]=[];
try{
 await app.init();const http=app.getHttpAdapter().getInstance();
 const offers=[...Object.entries(SDSS_OPTICAL_PUBLICATIONS).map(([reference,p])=>({reference,hash:p.publicationHash})),...datasets.map(d=>({reference:"M:51",hash:d.hash}))];
 for(const offer of offers){
  const manifest=owner.manifest(offer.hash), source=owner.source(offer.reference,offer.hash);assert(source);
  const response=await http.inject({method:"GET",url:`/v2/celestial-objects/${encodeURIComponent(offer.reference)}?deepSkyImageVersion=source-finite-v3&opticalPublicationHash=${offer.hash}`});
  assert.equal(response.statusCode,200);const body=response.json();
  const actual=body.data.sources.find((s:any)=>s.id===source.id);assert.deepEqual(actual,source);
  assert(source.id.endsWith(offer.hash));assert(source.limitations.includes(manifest.source.credit));
  const statement=source.limitations.find(s=>s.startsWith("配色："));assert(statement);
  assert(statement.includes("i→红、r→绿、g→蓝"));assert(statement.includes("并非肉眼自然色"));
  assert(statement.includes("不能仅凭绿色或棕色判定"));
  const renderedText=strings(Provenance({source:actual})).join("\n");
  assert(renderedText.includes(statement));assert(renderedText.includes(source.license));assert(renderedText.includes(source.precision));
  for(const limitation of source.limitations)assert(renderedText.includes(limitation));
  assert.deepEqual(owner.manifest(offer.hash),manifest);
  rows.push({...offer,source:actual,status:response.statusCode,renderedText});
 }
 const after=paths.map(bind);assert.deepEqual(after,before);save("inputs-after.json",after);
 save("result.json",{status:"PASSED_CURRENT_SOURCE_COLOUR_TEXT",rows,inputsExact:true,imageRequests:0,processingRuns:0,
  scope:"Current Nest/Fastify/controller source response and extracted current Provenance with controlled JSX/hooks/timing. Actual saved publications, real source metadata. Does not claim live watch/BFF code loaded, native UI/Back, image quality, adoption or independent review.",independentReview:"MISSING"});
 console.log(JSON.stringify({rows:rows.length,result:bind("output/sdss-source-colour-semantics-1003-r1/result.json")}));
}catch(error){save("failed.json",{error:String(error),stack:(error as Error).stack,rows});throw error;}finally{await app.close()}
