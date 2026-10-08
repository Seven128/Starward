import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import {resolvedSkyBodyReferences} from "./sky-body-label-presentation";
import type {SkyScenePaintedSources, SkySdssOpticalImage} from "./sky-scene-render";
import {registerSkyNativeImageLifetime} from "./sky-artwork-loader";
import {completeLegacySkyOptical,completeScienceSkyOptical,completePreparedSkyOptical,liveSkyOpticalCompletion,sameSkyOpticalInput,type SkySdssOpticalCompletion} from "./sky-sdss-optical-completion";
import {skySdssOpticalFrame,skyPreparedOpticalFrame} from "./sky-sdss-optical-frame";
import {assertSdssScienceOpticalManifest, opticalPublicationReference, type SdssScienceOpticalManifest} from "@starward/miniapp-contracts";
import {sdssOpticalPresentation} from "./sky-sdss-optical-selection";
import {skyPagePaintCommit} from "./sky-optical-page-test-support";
import {preparedOpticalTestPublication} from "./sky-prepared-optical-test-support";
const preparedFixture=preparedOpticalTestPublication("page");

const source=ts.createSourceFile("spot-sky-page.tsx",readFileSync(new URL("./spot-sky-page.tsx",import.meta.url),"utf8"),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
const nodes=new Map<string,ts.Expression>();let sameScene:ts.Expression|undefined,informationBinding:ts.Expression|undefined;
function find(node:ts.Node){
  if(ts.isPropertyAssignment(node)&&node.name.getText(source)==="sameScene")sameScene=node.initializer;
  if(ts.isVariableDeclaration(node)&&node.initializer)nodes.set(node.name.getText(source),node.initializer);
  if(ts.isJsxSpreadAttribute(node)&&node.expression.getText(source).includes("opticalPublicationHash:"))informationBinding=node.expression;
  ts.forEachChild(node,find);
}
find(source);
const execute=(expression:ts.Expression,bindings:object)=>vm.runInNewContext(ts.transpileModule(`(${expression.getText(source)})`,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,{opticalPublicationReference,...bindings});
const fine={},coarse={};
const optical:SkySdssOpticalImage={image:fine,reference:"M:63",publicationHash:"admitted-M63",fieldDegrees:.0568888889,level:"DETAIL",
  coarser:{image:coarse,fieldDegrees:.1137777778,level:"MEDIUM"}};
const completion=(image:object=fine)=>completeLegacySkyOptical(optical,image)!;
function gates(input:Record<string,unknown>){
  const state={liveSkyOpticalCompletion,canvasGenerationRef:{current:1},sdssOpticalPresentation,...input};
  const presentedSdssOptical=execute(nodes.get("presentedSdssOptical")!,state);
  const sdssOpticalImagePresented=execute(nodes.get("sdssOpticalImagePresented")!,{...state,presentedSdssOptical});
  const deepSkyImagePresented=execute(nodes.get("deepSkyImagePresented")!,state);
  return {...state,presentedSdssOptical,sdssOpticalImagePresented,deepSkyImagePresented};
}

test("all actual ready primary/parent identities schedule a same-camera scene update",()=>{
  assert(sameScene);const compare=execute(sameScene,{sameSkyOpticalInput}) as (a:object,b:object)=>boolean;
  const completed={inspection:{spotId:"formal-example"},sdssOpticalImage:optical};
  assert.equal(compare(completed,{...completed}),true);
  for(const changed of [{...optical,coarser:null},{...optical,coarser:{...optical.coarser!,image:{}}},
    {...optical,coarser:{...optical.coarser!,fieldDegrees:.2275555556}},
    {...optical,coarser:{...optical.coarser!,level:"OVERVIEW"}}, {...optical,fieldDegrees:.057}])
    assert.equal(compare(completed,{...completed,sdssOpticalImage:changed}),false);
});

test("modal pins a live accepted completion while newer loader metadata advances",()=>{
  assert(informationBinding);
  const paintedHash="a".repeat(64),latestHash="b".repeat(64),image={};let current=true;
  const retire=registerSkyNativeImageLifetime(image,()=>current);
  const painted=completeLegacySkyOptical({...optical,image,publicationHash:paintedHash},image)!;
  const input={presentedSceneCurrent:true,nativeCanvasMounted:true,canvasSize:{width:420,height:780},
    presentedSkyFrame:{sdssOptical:painted,nativeCanvasGeneration:1},sdssOptical:{publication:{objectRef:"M:63",publicationHash:latestHash},image:{}},
    selectedCatalogObject:{reference:"M:63"}};
  const read=(changes:object={})=>execute(informationBinding!,gates({...input,...changes}));
  assert.equal(read().opticalPublicationHash,paintedHash);
  for(const change of [{presentedSceneCurrent:false},{nativeCanvasMounted:false},{canvasSize:{width:0,height:780}},
    {presentedSkyFrame:null},{selectedCatalogObject:{reference:"M:82"}},{canvasGenerationRef:{current:2}}])
    assert.equal(Object.keys(read(change)).length,0);
  current=false;assert.equal(Object.keys(read()).length,0);
  current=true;retire();assert.equal(Object.keys(read()).length,0);
});

test("accepted page commits actual coarse completion without flattening the queued fine envelope",()=>{
  const frame={data:{},frameAt:"2026-09-29T11:00:00.000Z",mode:"DAY",sdssOpticalImage:optical,deepSkyImage:null};
  let presented:any=null;const getPresented=()=>presented;
  const apply=skyPagePaintCommit(source,{frame,resolvedSkyBodyReferences,paintedSkyObjectsRef:{current:null},
    setPresentedSkyFrame:(update:(previous:any)=>any)=>{presented=update(presented);},setPresentedCamera(){},camera:{animating:false}});
  const actual:SkyScenePaintedSources={sdssOptical:completion(coarse),deepSkyImage:null};
  apply.stage(null,actual);assert.equal(presented,null,"draw callback itself cannot publish before accepted completion");
  apply.complete();
  assert.strictEqual(getPresented().sdssOptical.field.image,coarse);assert.equal(getPresented().sdssOptical.field.level,"MEDIUM");
  assert.equal(getPresented().sdssOptical.reference,"M:63");assert.equal(getPresented().sdssOptical.publicationHash,optical.publicationHash);
  assert.equal(getPresented().sdssOptical.field.fieldDegrees,optical.coarser!.fieldDegrees);
  assert.equal(getPresented().nativeCanvasGeneration,1);
  const first=presented;apply(null,actual);assert.strictEqual(presented,first);
  apply(null,{sdssOptical:completion(),deepSkyImage:null});assert.strictEqual(getPresented().sdssOptical.field.image,fine);
  assert.strictEqual(frame.sdssOpticalImage.coarser!.image,coarse);
  apply(null,{sdssOptical:null,deepSkyImage:null});assert.equal(presented,null);
});

test("public recovery matches any live participating field of the completed publication",()=>{
  const sdssOptical={image:fine,coarser:optical.coarser,publication:{objectRef:"M:63",publicationHash:optical.publicationHash}};
  const read=(snapshot:SkySdssOpticalCompletion|null)=>execute(nodes.get("sdssOpticalCurrentImagePresented")!,{
    presentedSdssOptical:snapshot,sdssOptical});
  assert.equal(read(completion(coarse)),true);assert.equal(read(completion()),true);
  assert.equal(read({...completion(),publicationHash:"retired-publication"}),false);
  assert.equal(read({...completion(),reference:"M:82"}),false);
  assert.equal(read({...completion(),field:{...completion().field,image:{}}}),false);
  assert.equal(read(null),false);
});

test("status and recovery share live accepted generation; IR remains independent",()=>{
  let opticalCurrent=true,infraredCurrent=true;const image={};
  const retire=registerSkyNativeImageLifetime(image,()=>opticalCurrent);
  const painted=completeLegacySkyOptical({...optical,image},image)!;
  const frame={sdssOptical:painted,nativeCanvasGeneration:1,deepSkyImage:{reference:"M:63",isCurrent:()=>infraredCurrent}};
  const input={presentedSceneCurrent:true,nativeCanvasMounted:true,canvasSize:{width:420,height:780},canvasError:null,
    presentedSkyFrame:frame,entry:{objectRef:"M:63"},sdssOptical:{requested:true,failed:false,loading:false,image,coarser:null,
      publication:{objectRef:"M:63",publicationHash:optical.publicationHash}}};
  const read=(changes:object={})=>{
    const state=gates({...input,...changes});
    return {status:execute(nodes.get("sdssOpticalStatus")!,state),recovery:execute(nodes.get("sdssOpticalCurrentImagePresented")!,state),
      infrared:state.deepSkyImagePresented};
  };
  assert.deepEqual(read(),{status:"CREDIT",recovery:true,infrared:true});
  opticalCurrent=false;infraredCurrent=false;assert.deepEqual(read(),{status:"NONE",recovery:false,infrared:false});
  opticalCurrent=true;infraredCurrent=true;
  assert.deepEqual(read({presentedSceneCurrent:false}),{status:"NONE",recovery:false,infrared:false});
  assert.deepEqual(read({nativeCanvasMounted:false}),{status:"NONE",recovery:false,infrared:false});
  opticalCurrent=false;assert.deepEqual(read(),{status:"NONE",recovery:false,infrared:true});
  retire();infraredCurrent=false;assert.equal(read().status,"NONE");
});

test("science source consumers keep an independently live actual coarse field and original publication",
  {skip: !process.env.CLOUD_SKY_SCIENCE_PUBLICATION_PATH},()=>{
  // Existing admitted writer metadata; handles and positive receipt are explicit
  // controls. This executes actual page consumers, not science GPU/quality adoption.
  const publication:SdssScienceOpticalManifest=JSON.parse(readFileSync(
    `${process.env.CLOUD_SKY_SCIENCE_PUBLICATION_PATH}/manifest.json`,"utf8"));
  assertSdssScienceOpticalManifest(publication,"M:51",publication.publicationHash);
  const image={},parent={};
  const retireFine=registerSkyNativeImageLifetime(image,()=>true),retireCoarse=registerSkyNativeImageLifetime(parent,()=>true);
  try {
    const input=skySdssOpticalFrame({image,renderedLevel:"MEDIUM",renderedAsset:publication.levels.MEDIUM,publication,
      coarser:{image:parent,level:"OVERVIEW",asset:publication.levels.OVERVIEW}});
    assert(input && "sciencePublication" in input);
    const receipt={completed:true,qualification:{fine:"has",coarse:"has",any:"has"},finePhoto:"positive",coarsePhoto:"positive"} as const;
    const completed=completeScienceSkyOptical(input,{submitted:true,finePrepared:true,coarsePrepared:true},receipt);
    assert(completed);let presented:any=null;
    const frame={data:{},frameAt:"2026-10-02T12:00:00.000Z",mode:"NIGHT",sdssOpticalImage:input,deepSkyImage:null};
    const commit=skyPagePaintCommit(source,{frame,resolvedSkyBodyReferences,paintedSkyObjectsRef:{current:null},
      setPresentedSkyFrame:(update:any)=>{presented=update(presented);},setPresentedCamera(){},camera:{animating:false}});
    commit(null,{sdssOptical:completed,deepSkyImage:null});
    const read=(changes:object={})=>{
      const state=gates({presentedSceneCurrent:true,nativeCanvasMounted:true,canvasSize:{width:390,height:844},canvasError:null,
        presentedSkyFrame:presented,selectedCatalogObject:{reference:"M:51"},entry:{objectRef:"M:51"},
        sdssOptical:{requested:true,failed:false,loading:false,image:{},coarser:{image:parent},publication},...changes});
      return {status:execute(nodes.get("sdssOpticalStatus")!,state),recovery:execute(nodes.get("sdssOpticalCurrentImagePresented")!,state),
        binding:execute(informationBinding!,state),live:state.presentedSdssOptical};
    };
    retireFine();const actual=read();
    assert.equal(actual.status,"CREDIT");assert.equal(actual.recovery,true);
    assert.equal(actual.binding.opticalPublicationHash,publication.publicationHash);
    assert.equal(actual.live.participatingFields.length,1);assert.strictEqual(actual.live.participatingFields[0].image,parent);
    assert.equal(actual.live.participatingFields[0].level,"OVERVIEW");assert.equal(completed.participatingFields.length,2);
    const advanced=read({sdssOptical:{requested:true,failed:false,loading:false,image:{},coarser:null,
      publication:{...publication,publicationHash:"b".repeat(64)}}});
    assert.equal(advanced.status,"CREDIT");assert.equal(advanced.recovery,false);
    assert.equal(advanced.binding.opticalPublicationHash,publication.publicationHash);
    assert.equal(read({canvasGenerationRef:{current:2}}).status,"NONE");
    retireCoarse();assert.equal(read().status,"NONE");assert.equal(read().recovery,false);
    assert.equal(Object.keys(read().binding).length,0);
  } finally {retireFine();retireCoarse();}
});


test("explicit Prepared accepted completion keeps full source, actual coarse and original hash through metadata advance",()=>{
  const publication=preparedFixture.publication,image={},parent={};
  const retireFine=registerSkyNativeImageLifetime(image,()=>true),retireCoarse=registerSkyNativeImageLifetime(parent,()=>true);
  try {
    const input=skyPreparedOpticalFrame({image,renderedLevel:"MEDIUM",renderedAsset:publication.levels.MEDIUM,publication,
      coarser:{image:parent,level:"OVERVIEW",asset:publication.levels.OVERVIEW}});assert(input);
    const completed=completePreparedSkyOptical(input,{submitted:true,finePrepared:true,coarsePrepared:true},
      {completed:true,qualification:{fine:"has",coarse:"has",any:"has"},finePhoto:"positive",coarsePhoto:"positive"});assert(completed);
    let presented:any=null;
    const frame={data:{},frameAt:"2026-10-03T12:00:00.000Z",mode:"NIGHT",sdssOpticalImage:input,deepSkyImage:null};
    const commit=skyPagePaintCommit(source,{frame,resolvedSkyBodyReferences,paintedSkyObjectsRef:{current:null},
      setPresentedSkyFrame:(update:any)=>{presented=update(presented);},setPresentedCamera(){},camera:{animating:false}});
    commit.stage(null,{sdssOptical:completed,deepSkyImage:null});assert.equal(presented,null);
    const getPresented=()=>presented;
    commit.complete();assert.strictEqual(getPresented().sdssOptical.preparedPublication,publication);
    assert.equal(getPresented().sdssOptical.preparedPublication.source.credit,publication.source.credit);
    const read=(changes:object={})=>{
      const state=gates({presentedSceneCurrent:true,nativeCanvasMounted:true,canvasSize:{width:390,height:844},canvasError:null,
        presentedSkyFrame:presented,selectedCatalogObject:{reference:"M:51"},entry:{objectRef:"M:51"},
        sdssOptical:{requested:true,failed:false,loading:false,image:{},coarser:{image:parent},publication},...changes});
      return {status:execute(nodes.get("sdssOpticalStatus")!,state),recovery:execute(nodes.get("sdssOpticalCurrentImagePresented")!,state),
        binding:execute(informationBinding!,state),live:state.presentedSdssOptical};
    };
    retireFine();const actual=read();assert.equal(actual.status,"CREDIT");assert.equal(actual.recovery,true);
    assert.equal(actual.live.kind,"prepared");assert.equal(actual.live.participatingFields.length,1);
    assert.strictEqual(actual.live.participatingFields[0].image,parent);assert.equal(actual.live.participatingFields[0].level,"OVERVIEW");
    assert.strictEqual(actual.live.preparedPublication,publication);assert.equal(actual.binding.opticalPublicationHash,publication.publicationHash);
    const advanced=read({sdssOptical:{requested:true,failed:false,loading:false,image:{},coarser:null,
      publication:{...publication,publicationHash:"b".repeat(64)}}});
    assert.equal(advanced.status,"CREDIT");assert.equal(advanced.recovery,false);
    assert.equal(advanced.binding.opticalPublicationHash,publication.publicationHash);
    for(const change of [{presentedSceneCurrent:false},{nativeCanvasMounted:false},{canvasGenerationRef:{current:2}},
      {canvasSize:{width:0,height:844}}])assert.equal(read(change).status,"NONE");
    retireCoarse();assert.equal(read().status,"NONE");assert.equal(read().recovery,false);
    assert.equal(Object.keys(read().binding).length,0);
  } finally {retireFine();retireCoarse();}
});

test.after(()=>preparedFixture.cleanup());
