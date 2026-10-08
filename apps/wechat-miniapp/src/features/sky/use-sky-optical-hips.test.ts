import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import {orderPublishedOpticalTilesForView} from "./sky-optical-tile-selection";
const testFrame={equatorialToEnu:[1,0,0,0,1,0,0,0,1]};
const testBasis={right:[1,0,0],up:[0,1,0],forward:[0,0,1]};

test("validated trial tiles use bounded encoded reuse without changing wanted/decoded pressure",()=>{
  const source=ts.createSourceFile("use-sky-optical-hips.ts",readFileSync(new URL("./use-sky-optical-hips.ts",import.meta.url),"utf8"),ts.ScriptTarget.Latest,true);
  const declaration=source.statements.find((node):node is ts.FunctionDeclaration=>ts.isFunctionDeclaration(node)&&node.name?.text==="useSkyOpticalHips")!;
  const publication={publicationHash:"a".repeat(64)},asset={id:"ps1:3:166",order:3,pixel:166,sourcePriority:0,format:"jpeg",downloadUrl:"/v2/sky/optical/"+"a".repeat(64)+"/ps1/3/166"};
  let query=0,parameters:any[]=[];
  const runtime={__MINIAPP_DEVELOPMENT_FIXTURE_MODE__:true,useMemo:(run:()=>unknown)=>run(),useCallback:(run:unknown)=>run,
    useResourceQuery:()=>({data:query++%2===0?publication:{data:[]},isFetching:false}),
    getOpticalHipsManifest(){},exactSkyObservationFrame:()=>testFrame,orderPublishedOpticalTilesForView,
    selectPublishedOpticalCandidates:()=>[{sourceId:"ps1",order:3,pixels:[166],dirs:[0]}],
    selectSkyHipsTiles:()=>({state:"SELECTED",order:3,pixels:[166]}),resolvePublishedOpticalTiles:()=>[asset],
    opticalHipsTileUrl:(url:string)=>"https://approved.fixture.invalid"+url,
    useSkyNativeImages(...args:any[]){parameters=args;return {images:new Map(),retainedImages:new Map(),loading:false,failed:false};}};
  const hook=vm.runInNewContext(ts.transpileModule(source.statements.filter(ts.isVariableStatement).map(n=>n.getText(source)).join("\n")+"\n"+
    declaration.getText(source).replace(/^export\s+/u,"")+"\nuseSkyOpticalHips;",{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,runtime);
  hook(undefined,undefined,{basis:testBasis,verticalFovDeg:8},390,844,null,1,true);
  assert.equal(parameters[2],publication.publicationHash);assert.equal(parameters[3],true);
  assert.equal(parameters[4][0],asset);assert.equal(parameters[6],20*1024*1024);assert.equal(parameters[8](asset),3);
  const resolved=parameters[5](asset);
  assert.equal(resolved.url,"https://approved.fixture.invalid"+asset.downloadUrl);
  assert.equal(resolved.format,"jpeg");assert.notEqual(resolved.storage,"session","hide must release decode, not delete the reusable immutable encoded file");
});

test("widening keeps already decoded fine descendants through coarse loading and failure",()=>{
  const source=ts.createSourceFile("use-sky-optical-hips.ts",
    readFileSync(new URL("./use-sky-optical-hips.ts",import.meta.url),"utf8"),ts.ScriptTarget.Latest,true);
  const declaration=source.statements.find((node):node is ts.FunctionDeclaration=>
    ts.isFunctionDeclaration(node)&&node.name?.text==="useSkyOpticalHips")!;
  const publication={publicationHash:"a".repeat(64)},fineA={},fineB={},outside={},foreign={},coarse={};
  const retainedImages=new Map([
    ["ps1:8:38558",fineA],["ps1:8:38580",fineB],
    ["ps1:8:38602",outside],["foreign:8:38558",foreign],
  ]);
  const native={images:new Map<string,object>(),retainedImages,loading:true,failed:false};
  const candidates=[{sourceId:"ps1",format:"jpeg",order:6,pixels:[2409,2411],dirs:[0]}];
  let query=0;
  const runtime={__MINIAPP_DEVELOPMENT_FIXTURE_MODE__:true,
    useMemo:(evaluate:()=>unknown)=>evaluate(),useCallback:(run:unknown)=>run,
    getOpticalHipsManifest:()=>Promise.resolve(publication),
    useResourceQuery:()=>({data:query++%2===0?publication:{data:[]},isFetching:false}),
    exactSkyObservationFrame:()=>testFrame,orderPublishedOpticalTilesForView,selectPublishedOpticalCandidates:()=>candidates,
    selectSkyHipsTiles:()=>({state:"SELECTED",order:6,pixels:[2409,2411]}),
    resolvePublishedOpticalTiles:()=>[],useSkyNativeImages:()=>native,
  };
  const hook=vm.runInNewContext(ts.transpileModule(
    source.statements.filter(ts.isVariableStatement).map(node=>node.getText(source)).join("\n")+"\n"+
    declaration.getText(source).replace(/^export\s+/,"")+"\nuseSkyOpticalHips;",
    {compilerOptions:{target:ts.ScriptTarget.ES2020}}).outputText,runtime) as
    typeof import("./use-sky-optical-hips").useSkyOpticalHips;
  const view={basis:testBasis,verticalFovDeg:.8} as unknown as import("./sky-artwork-registration").SkyArtworkView;
  const read=()=>hook(undefined,undefined,view,390,844,null,1,true);
  const pending=read();
  assert.equal(pending.tiles.length,2,"ready fine footprints cannot vanish while their coarse replacements load");
  assert(pending.tiles.some(t=>t.image===fineA)&&pending.tiles.some(t=>t.image===fineB));
  assert(pending.tiles.every(t=>t.retainedDetailFallback),"Scene must distinguish retained detail from requested detail");
  assert(!pending.tiles.some(t=>t.image===outside||t.image===foreign),"only current source/candidate descendants may be retained");
  native.images.set("ps1:6:2409",coarse);native.failed=true;
  const partial=read();assert.equal(partial.tiles.length,3);
  assert(partial.tiles.some(t=>t.image===fineB),"one ready/failed coarse cell cannot withdraw another cell's fine coverage");
  assert(partial.tiles.findIndex(t=>t.image===coarse)<partial.tiles.findIndex(t=>t.image===fineA),
    "original fine pixels remain above their coarse parent, including when a GPU upload fails later");
  native.retainedImages.clear();assert.deepEqual(Array.from(read().tiles,t=>t.image),[coarse],
    "the hook must not recreate a bitmap retired by its native owner");
});

test("commercial sky does not request or retry an unpublished optical trial", () => {
  const source=ts.createSourceFile("use-sky-optical-hips.ts",
    readFileSync(new URL("./use-sky-optical-hips.ts",import.meta.url),"utf8"),
    ts.ScriptTarget.Latest,true);
  const declaration=source.statements.find((node):node is ts.FunctionDeclaration=>
    ts.isFunctionDeclaration(node)&&node.name?.text==="useSkyOpticalHips")!;
  let enabledQueries=0,refetches=0;
  const useResourceQuery=(options:{enabled:boolean})=>{
    if(options.enabled)enabledQueries++;
    return {data:undefined,isFetching:false,isError:true,refreshError:null,
      refetch(){refetches++;return Promise.resolve(undefined)}};
  };
  const runtime={
    __MINIAPP_DEVELOPMENT_FIXTURE_MODE__:false,
    useMemo:(evaluate:()=>unknown)=>evaluate(),useCallback:(run:unknown)=>run,useResourceQuery,
    getOpticalHipsManifest:()=>Promise.resolve(null),
    exactSkyObservationFrame:()=>null,
    useSkyNativeImages:()=>({images:[],retainedImages:[],loading:false,failed:false,
      retryImages(){},failedImage(){}}),
  };
  const useSkyOpticalHips=vm.runInNewContext(ts.transpileModule(
    source.statements.filter(ts.isVariableStatement).map(node=>node.getText(source)).join("\n")+"\n"+
    declaration.getText(source).replace(/^export\s+/,"")+"\nuseSkyOpticalHips;",
    {compilerOptions:{target:ts.ScriptTarget.ES2020}}).outputText,runtime) as
    typeof import("./use-sky-optical-hips").useSkyOpticalHips;
  const result=useSkyOpticalHips(undefined,undefined,null,390,844,null,0,true);
  assert.equal(enabledQueries,0,"ordinary sky must not query trial-only optical endpoints");
  assert.equal(result.publication,null);
  assert.equal(result.failed,false,"disabled trial cannot show a retry affordance");
  result.retry();
  assert.equal(refetches,0,"retry must remain inert outside the trial build");
  runtime.__MINIAPP_DEVELOPMENT_FIXTURE_MODE__=true;
  const trial=useSkyOpticalHips(undefined,undefined,null,390,844,null,0,true);
  assert.equal(enabledQueries,1,"the explicit local fixture retains the trial manifest path");
  assert.equal(trial.failed,true);
  trial.retry();
  assert.equal(refetches,2,"the trial may retry its manifest and index after a failure");
  useSkyOpticalHips(undefined,undefined,null,390,844,null,0,false);
  assert.equal(enabledQueries,1,"hidden trial sky does not issue another request");
});

test("live optical snapshot reuses source qualification and stable order before React tiles update",()=>{
  const source=ts.createSourceFile("use-sky-optical-hips.ts",readFileSync(new URL("./use-sky-optical-hips.ts",import.meta.url),"utf8"),ts.ScriptTarget.Latest,true);
  const declaration=source.statements.find((n):n is ts.FunctionDeclaration=>ts.isFunctionDeclaration(n)&&n.name?.text==="useSkyOpticalHips")!;
  const publication={publicationHash:"a".repeat(64)},empty={images:new Map(),retainedImages:new Map()},fine={},coarse={},foreign={},outside={};let current=empty,query=0;
  const runtime={__MINIAPP_DEVELOPMENT_FIXTURE_MODE__:true,useMemo:(run:()=>unknown)=>run(),useCallback:(run:unknown)=>run,
    useResourceQuery:()=>({data:query++%2===0?publication:{data:[]},isFetching:false}),getOpticalHipsManifest(){},
    exactSkyObservationFrame:()=>testFrame,orderPublishedOpticalTilesForView,
    selectPublishedOpticalCandidates:()=>[{sourceId:"ps1",order:6,pixels:[2409],dirs:[0]}],
    selectSkyHipsTiles:()=>({state:"SELECTED",order:6,pixels:[2409]}),resolvePublishedOpticalTiles:()=>[],
    useSkyNativeImages:()=>({...empty,loading:true,failed:false,currentImages:()=>current})};
  const hook=vm.runInNewContext(ts.transpileModule(source.statements.filter(ts.isVariableStatement).map(n=>n.getText(source)).join("\n")+"\n"+declaration.getText(source).replace(/^export\s+/u,"")+"\nuseSkyOpticalHips;",{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,runtime);
  const result=hook(undefined,undefined,{basis:testBasis,verticalFovDeg:.8},390,844,{},3,true);
  assert.equal(result.currentTiles(),result.tiles,"unchanged native payload keeps the committed tile array identity");
  current={images:new Map([["ps1:6:2409",coarse]]),retainedImages:new Map([["ps1:8:38558",fine],["other:8:38558",foreign],["ps1:8:38602",outside]])};
  assert.equal(result.tiles.length,0,"the React snapshot is still queued");const ready=result.currentTiles();
  assert.deepEqual(Array.from(ready,(tile:any)=>tile.image),[coarse,fine]);assert(ready.every((tile:any)=>tile.publication===publication));
  assert.equal(ready[1].retainedDetailFallback,true,"existing same-source parent coverage rule also owns immediate reads");
  current={images:new Map(),retainedImages:new Map()};assert.equal(result.currentTiles().length,0,"disposed native scope cannot recreate prior tile objects");
});
