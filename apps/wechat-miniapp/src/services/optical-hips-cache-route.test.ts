import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import {skyImageContentHash} from "@starward/miniapp-contracts";

const source=ts.createSourceFile("runtime.ts",readFileSync(new URL("./sky-public-image-runtime.ts",import.meta.url),"utf8"),ts.ScriptTarget.Latest,true);
const declaration=source.statements.find((node):node is ts.FunctionDeclaration=>ts.isFunctionDeclaration(node)&&node.name?.text==="acquirePublishedSkyImage")!;
const base="https://optical-cache.invalid",hash="a".repeat(64);
const asset={bytes:128,sha256:"b".repeat(64),width:512,height:512,format:"jpeg"};
function boundary(trial:boolean){
  const records:any[]=[];
  const acquire=vm.runInNewContext(ts.transpileModule(declaration.getText(source).replace(/^export\s+/u,"")+"\nacquirePublishedSkyImage;",
    {compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,
    {__MINIAPP_API_BASE__:base,__MINIAPP_DEVELOPMENT_FIXTURE_MODE__:trial,skyImageContentHash,
      owner:()=>({acquire(value:unknown){records.push(value);return {};}})});
  return {records,acquire};
}
test("immutable optical trial tile reaches the existing encoded owner",()=>{
  const b=boundary(true),url=`${base}/v2/sky/optical/${hash}/ps1-dr1/1/47`;
  b.acquire(asset,url,hash);b.acquire({...asset,format:"png"},url,hash);
  assert.equal(b.records.length,2);
  assert.equal(b.records[0].environment,skyImageContentHash(Uint8Array.from(base,c=>c.charCodeAt(0))));
  assert.equal(b.records[0].sha256,asset.sha256);assert.equal(b.records[0].url,url);
});
test("ordinary mode and invalid optical identity cannot admit a trial tile or arbitrary resource",()=>{
  const valid=`${base}/v2/sky/optical/${hash}/ps1-dr1/1/47`;
  const ordinary=boundary(false);assert.throws(()=>ordinary.acquire(asset,valid,hash),/route_invalid/u);assert.equal(ordinary.records.length,0);
  const b=boundary(true);
  for(const url of [valid.replace(base,"https://other.invalid"),valid.replace(hash,"c".repeat(64)),
    `${valid}?extra=1`,valid.replace("/1/47","/1/48"),valid.replace("/1/47","/12/0"),
    valid.replace("/1/47","/1/-1"),valid.replace("/1/47","/1/0/index"),
    valid.replace("ps1-dr1","../ps1-dr1"),valid.replace("ps1-dr1","a".repeat(41)),
    `${base}/v2/sky/optical/${hash}/manifest`,`${base}/v2/sky/optical/${hash}/rights/1`])
    assert.throws(()=>b.acquire(asset,url,hash),/route_invalid/u,url);
  for(const descriptor of [{...asset,width:1024},{...asset,height:256},{...asset,format:"json"}])
    assert.throws(()=>b.acquire(descriptor,valid,hash),/route_invalid/u);
  assert.equal(b.records.length,0);
});
