import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";
import * as contracts from "@starward/miniapp-contracts";

function publication(){
  const bytes=readFileSync(new URL("../../../../workers/miniapp-api/assets/moon/coverage-manifest.json",import.meta.url));
  const root=JSON.parse(bytes.toString("utf8"));
  root.publicationHash=createHash("sha256").update(bytes).digest("hex");
  root.image.downloadUrl=`/v2/sky/moon/coverage/${root.publicationHash}/${root.image.file}`;
  return root;
}

test("actual Moon client selects PNG contract, preserves cancellation and rejects incompatible or malformed delivery",async()=>{
  let response={status:200,body:publication()},calls:any[]=[];
  const exports_:Record<string,any>={};
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL("./moon-texture-client.ts",import.meta.url),"utf8"),
    {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,
    {exports:exports_,require(name:string){
      if(name==="@starward/miniapp-contracts")return contracts;
      if(name==="./bare-sky-resource")return {requestBareSkyResource(...args:any[]){calls.push(args);return Promise.resolve(response);},skyResourceUrl:(url:string)=>url};
      throw Error(name);
    }});
  const signal=new AbortController().signal;
  assert.equal((await exports_.getMoonTextureManifest(signal)).image.file,publication().image.file);
  assert.equal(calls[0][0],"/v2/sky/moon/coverage/manifest");assert.equal(calls[0][2],signal);
  response={status:404,body:null};
  await assert.rejects(exports_.getMoonTextureManifest(),/unavailable/u);
  for(const mutate of [(r:any)=>r.coverage.sourceNoData=1,(r:any)=>r.source.sha256="0".repeat(64),
    (r:any)=>r.image.downloadUrl=r.image.downloadUrl.replace("/coverage/","/"),
    (r:any)=>r.coverage.kind="brightness",(r:any)=>r.limitations=[null,null]]){
    response={status:200,body:publication()};mutate(response.body);
    await assert.rejects(exports_.getMoonTextureManifest(),/invalid/u);
  }
  response={status:200,body:publication()};
  assert.equal((await exports_.getMoonTextureManifest()).coverage.kind,"measured-area-fraction");
});

test("Moon facts opt in and separate old cached data without changing other object clients",async()=>{
  const source=ts.createSourceFile("api-client.ts",readFileSync(new URL("./api-client.ts",import.meta.url),"utf8"),ts.ScriptTarget.Latest,true);
  const declaration=source.statements.find((n):n is ts.FunctionDeclaration=>ts.isFunctionDeclaration(n)&&n.name?.text==="getCelestialObjectInformation")!;
  const get=vm.runInNewContext(ts.transpileModule(declaration.getText(source).replace(/^export /u,"")+"\ngetCelestialObjectInformation;",
    {compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,{
    isCelestialObjectReference:contracts.isCelestialObjectReference,ADOPTED_SKY_REPORT_CATALOG_VERSION:"bsc5p-bright-stars.v3",
    requestOperation:(key:string,op:string,options:unknown)=>Promise.resolve({key,op,options}),
    matchingCelestialInformationResponse:(value:unknown)=>value,invalidateApiCache(){throw Error("unexpected invalidation");},
  });
  const moon=await get("SOLAR:MOON"),sun=await get("SOLAR:SUN");
  assert.ok(moon.options.query.includes("moonTextureVersion=coverage-v2"));
  assert.ok(moon.key.startsWith("celestial-object:v4:moon-coverage:"));
  assert.ok(!sun.options.query.includes("moonTextureVersion"));
  assert.equal(sun.key,"celestial-object:v3:SOLAR:SUN");
});
