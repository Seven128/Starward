import assert from "node:assert/strict";import test from "node:test";import {readFileSync} from "node:fs";import vm from "node:vm";import ts from "typescript";
import {opticalHipsSourceSelection,opticalHipsSourceRoute,opticalHipsSources} from "./optical-hips-source";
import {assertOpticalHipsManifest} from "./optical-hips-publication";
const hash="a".repeat(64),root:any={schemaVersion:"starward-optical-hips-v1",publicationHash:hash,scope:"TRIAL",limitations:[],sources:[{id:"ps1",provider:"PS1 / CDS",title:"observed display",originalDataUrl:"https://example.org/data",originalRights:"original image rights",originalRightsUrl:"https://example.org/rights",hipsRecordUrl:"https://example.org/record",hipsLicense:"ODbL-1.0",hipsDoi:"10.123/a",maxOrder:0,tileWidth:512,format:"jpeg"}],shards:[{sourceId:"ps1",order:0,dir:0,file:"ps1/Norder0/Dir0/index.json",sha256:hash,bytes:128,tileCount:1,indexUrl:`/v2/sky/optical/${hash}/ps1/0/0/index`}]};
test("HiPS route cannot conflate image/region references, unknown sources or original/processed permissions",()=>{
  assert(opticalHipsSourceSelection({hipsPublicationHash:hash,hipsSourceIds:"ps1"}));
  for(const extra of [{reference:"HR:1"},{preparedPublicationHash:hash},{opticalPublicationHash:hash},{imagePublicationHash:hash}])assert.equal(opticalHipsSourceSelection({hipsPublicationHash:hash,hipsSourceIds:"ps1",...extra}),null);
  for(const ids of ["","ps1,ps1","../ps1"])assert.equal(opticalHipsSourceSelection({hipsPublicationHash:hash,hipsSourceIds:ids}),null);
  assert.throws(()=>opticalHipsSourceRoute("bad",["ps1"]));assert.throws(()=>opticalHipsSources(root,["unknown"]));
  const [original,processed]=opticalHipsSources(root,["ps1"]);assert.equal(original!.license,"original image rights");assert.equal(original!.licenseUrl,root.sources[0].originalRightsUrl);assert.equal(processed!.license,"ODbL-1.0");assert.equal(processed!.sourceUrl,root.sources[0].hipsRecordUrl);assert.equal(processed!.attribution!.url,"https://doi.org/10.123/a");
});
test("selected manifest request rejects missing/wrong versions without falling back to current metadata",async()=>{
  const source=ts.createSourceFile("client.ts",readFileSync(new URL("./optical-hips-client.ts",import.meta.url),"utf8"),ts.ScriptTarget.Latest,true);
  const declaration=source.statements.find((node):node is ts.FunctionDeclaration=>ts.isFunctionDeclaration(node)&&node.name?.text==="getOpticalHipsManifest")!;
  let response:any={status:200,body:root};const paths:string[]=[];
  const fn=vm.runInNewContext(ts.transpileModule(declaration.getText(source).replace(/^export\s+/,"")+"\ngetOpticalHipsManifest;",{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,{MINIAPP_API_BASE_PATH:"/v2",assertOpticalHipsManifest,requestBareSkyResource:async(path:string)=>{paths.push(path);return response;}}) as (signal?:AbortSignal,hash?:string)=>Promise<any>;
  assert.equal(await fn(undefined,hash),root);assert.equal(paths[0],`/v2/sky/optical/${hash}/manifest`);
  response={status:404};await assert.rejects(fn(undefined,hash),/version_unavailable/);assert.equal(await fn(),null);
  const other="b".repeat(64),foreign={...root,publicationHash:other,shards:root.shards.map((shard:any)=>({...shard,indexUrl:shard.indexUrl.replace(hash,other)}))};
  assertOpticalHipsManifest(foreign);response={status:200,body:foreign};await assert.rejects(fn(undefined,hash),/version_invalid/);
  const count=paths.length;await assert.rejects(fn(undefined,"../other"));assert.equal(paths.length,count);
});
