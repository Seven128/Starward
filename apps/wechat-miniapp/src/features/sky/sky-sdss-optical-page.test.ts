import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import {resolvedSkyBodyReferences} from "./sky-body-label-presentation";
import type {SkyScenePaintedSources, SkySdssOpticalImage} from "./sky-scene-render";

const source=ts.createSourceFile("spot-sky-page.tsx",readFileSync(new URL("./spot-sky-page.tsx",import.meta.url),"utf8"),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
let sameScene:ts.Expression|undefined,commit:ts.Expression|undefined,currentImage:ts.Expression|undefined;
function find(node:ts.Node){
  if(ts.isPropertyAssignment(node)&&node.name.getText(source)==="sameScene")sameScene=node.initializer;
  if(ts.isCallExpression(node)&&node.expression.getText(source)==="drawSkyScene")commit=node.arguments[8];
  if(ts.isVariableDeclaration(node)&&node.name.getText(source)==="sdssOpticalCurrentImagePresented")currentImage=node.initializer;
  ts.forEachChild(node,find);
}
find(source);
const execute=(expression:ts.Expression,bindings:object)=>vm.runInNewContext(ts.transpileModule(`(${expression.getText(source)})`,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,bindings);
const fine={},coarse={};
const optical:SkySdssOpticalImage={image:fine,reference:"M:63",publicationHash:"admitted-M63",fieldDegrees:.0568888889,level:"DETAIL",
  coarser:{image:coarse,fieldDegrees:.1137777778,level:"MEDIUM"}};

test("coarser optical arrival, replacement and removal schedule an actual same-camera scene update",()=>{
  assert.ok(sameScene);const compare=execute(sameScene,{}) as (a:object,b:object)=>boolean;
  const completed={inspection:{spotId:"formal-example"},sdssOpticalImage:optical};
  assert.equal(compare(completed,{...completed}),true);
  for(const changed of [{...optical,coarser:null},{...optical,coarser:{...optical.coarser!,image:{}}},
    {...optical,coarser:{...optical.coarser!,fieldDegrees:.2275555556}},
    {...optical,coarser:{...optical.coarser!,level:"OVERVIEW"}},
    {...optical,fieldDegrees:.057}]){
    assert.equal(compare(completed,{...completed,sdssOpticalImage:changed}),false,"a new real field cannot be discarded as the previous completed scene");
  }
});

test("the public page commits the actual coarse-only source after fine rejection or occlusion",()=>{
  assert.ok(commit);
  const frame={data:{},frameAt:"2026-09-29T11:00:00.000Z",mode:"DAY",sdssOpticalImage:optical,deepSkyImage:null};
  let presented:any=null;
  const apply=execute(commit,{frame,resolvedSkyBodyReferences,paintedSkyObjectsRef:{current:null},
    setPresentedSkyFrame:(update:(previous:any)=>any)=>{presented=update(presented);},setPresentedCamera(){},camera:{animating:false}}) as (snapshot:null,sources:SkyScenePaintedSources)=>void;
  const actual={sdssOpticalImage:coarse,deepSkyImage:null};apply(null,actual);
  assert.strictEqual(presented.sdssOpticalImage.image,coarse);
  assert.equal(presented.sdssOpticalImage.fieldDegrees,optical.coarser!.fieldDegrees);
  assert.equal(presented.sdssOpticalImage.level,"MEDIUM");
  assert.equal(presented.sdssOpticalImage.reference,"M:63");assert.equal(presented.sdssOpticalImage.publicationHash,optical.publicationHash);
  assert.equal(presented.sdssOpticalImage.coarser,null,"presented metadata cannot relabel the failed fine layer as coarser");
  const first=presented;apply(null,actual);assert.strictEqual(presented,first,"unchanged actual coarse pixels do not loop DOM commits");
  apply(null,{sdssOpticalImage:fine,deepSkyImage:null});assert.strictEqual(presented.sdssOpticalImage.image,fine);
  assert.strictEqual(frame.sdssOpticalImage.coarser!.image,coarse,"committing fallback cannot mutate the queued image envelope");
  apply(null,{sdssOpticalImage:null,deepSkyImage:null});assert.equal(presented,null);
});

test("public partial-failure recovery follows either visible field of the current publication",()=>{
  assert.ok(currentImage,"the coarse field must remain a public recovery consumer");
  const expression=currentImage;
  const sdssOptical={image:fine,coarser:optical.coarser,publication:{objectRef:"M:63",publicationHash:optical.publicationHash}};
  const visible={...optical,...optical.coarser};
  const read=(image:object|null)=>execute(expression,{sdssOptical,presentedSkyFrame:image?{sdssOpticalImage:image}:null});
  assert.equal(read(visible),true);assert.equal(read(optical),true);
  assert.equal(read({...visible,publicationHash:"retired-publication"}),false);
  assert.equal(read({...visible,reference:"M:82"}),false);assert.equal(read({...visible,image:{}}),false);assert.equal(read(null),false);
});
