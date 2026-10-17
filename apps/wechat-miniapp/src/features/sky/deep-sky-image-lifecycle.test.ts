import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { createSkyViewBasis } from "./sky-view-projection";
import { deepSkyImageLevelForFov } from "./sky-zoom";

// Native decode/cancel/lease/recovery now belongs to the actual shared owner
// exercised in sky-native-image-owner/chain and sky-artwork-request.
const source=ts.createSourceFile("sky.tsx",readFileSync(new URL("./spot-sky-page.tsx",import.meta.url),"utf8"),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
const declarations=new Map<string,string>();
function visit(node:ts.Node){
  if(ts.isVariableDeclaration(node)&&["targetOpticalView","desiredDeepSkyImageLevel","deepSkyImages"].includes(node.name.getText(source)))
    declarations.set(node.name.getText(source),node.getText(source));
  ts.forEachChild(node,visit);
}visit(source);assert.equal(declarations.size,3);

test("selected W3 page supplies the accepted camera, independent scale intent and shared visibility to its native owner",()=>{
  const code=ts.transpileModule([...declarations.values()].map(s=>`const ${s};`).join("\n"),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
  const geometryReport={},basis=createSkyViewBasis(0,80,0)!,center={x:190,y:414},node={width:1170,height:2532};
  let args:any[]=[];
  const input={geometryReport,row:{at:"2026-10-14T13:00:00.000Z"},currentViewBasis:basis,presentedFov:.05,presentedCenter:center,
    canvasSize:{width:390,height:844},canvasNodeRef:{current:node},canvasNodeRevision:3,verticalFovDeg:.2,
    selectedDeepSkyEntry:{objectRef:"M:51"},deepSkyRegistrationReady:true,skyImageryActive:true,skyResourcesPaused:false,
    deepSkyImageLevelForFov,useSkyDeepSkyImage:(...value:unknown[])=>{args=value;return{};}};
  const read=(patch:object={})=>{vm.runInNewContext(code,{...input,...patch});return args;};
  read();assert.equal(args[0],"M:51");assert.equal(args[1],"DETAIL");assert.strictEqual(args[2],node);assert.equal(args[3],3);
  assert.strictEqual(args[5].report,geometryReport);assert.strictEqual(args[5].view.basis,basis);assert.strictEqual(args[5].view.center,center);
  assert.equal(args[5].view.verticalFovDeg,.05);assert.equal(args[5].at,input.row.at);
  assert.equal(read({skyImageryActive:false})[1],null);assert.equal(args[4],false);
  assert.equal(read({deepSkyRegistrationReady:false})[1],null);assert.equal(read({verticalFovDeg:16})[1],null);
  assert.equal(read({skyResourcesPaused:true})[6],true);
});
