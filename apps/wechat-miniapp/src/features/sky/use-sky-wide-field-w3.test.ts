import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import {OBSERVATION_FRAME_FORMAT,type SkyObservationFrame} from "@starward/miniapp-contracts";
import {selectSkyHipsTiles} from "./sky-hips-tile-selection";
import {skyHipsTileIntersectsView} from "./sky-hips-tile-mesh";
import {skySolarLightAt} from "./sky-solar-light";
import {exactSkyObservationFrame} from "./sky-observation-frame";
import {createSkyViewBasis} from "./sky-view-projection";
import {drawSkyScene,type SkyHipsCanvasTile} from "./sky-scene-render";
import type {ResolvedSkyReport} from "./sky-stellar-scene";
import type {SkyRenderSurface} from "./sky-render-surface";

const at="2026-09-23T00:00:00.000Z";
const frame:SkyObservationFrame={format:OBSERVATION_FRAME_FORMAT,at,
  observer:{latitude:22.54,longitude:113.95,elevationM:50},equatorialToEnu:[1,0,0,0,1,0,0,0,1] as const};
const report={hourly:[{at,sunAzimuthDeg:180,sunAltitudeDeg:-18}],observationFrames:[frame],
  skyScene:{state:"UNAVAILABLE",frames:[{at,state:"UNAVAILABLE",geometry:null}]},targetFrames:[]} as unknown as ResolvedSkyReport;
const publication={publicationHash:"w3-publication",tiles:Array.from({length:12},(_,pixel)=>({
  pixel,sha256:"face-"+pixel,bytes:100,downloadUrl:"/face-"+pixel+".jpg"}))};
const decoded=new Map(publication.tiles.map(tile=>[tile.pixel,{pixel:tile.pixel,width:512,height:512}]));
const sourcePath=process.env.SKY_W3_BEFORE_HOOK;
const source=ts.createSourceFile("use-sky-wide-field-w3.ts",readFileSync(sourcePath??new URL("./use-sky-wide-field-w3.ts",import.meta.url),"utf8"),ts.ScriptTarget.Latest,true);
const declaration=source.statements.find((node):node is ts.FunctionDeclaration=>
  ts.isFunctionDeclaration(node)&&node.name?.text==="useSkyWideFieldW3")!;
assert(declaration);

function harness(){
  let wanted:Array<{pixel:number}>=[],suspended=0,enabled=false;
  const hook=vm.runInNewContext(ts.transpileModule(declaration.getText(source).replace(/^export /u,"")+"\nuseSkyWideFieldW3;",
    {compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,{
    useMemo:(factory:()=>unknown)=>factory(),useEffect:(effect:()=>void)=>effect(),
    useResourceQuery:()=>({data:publication,isFetching:false,isError:false,refreshError:null}),
    getWideFieldW3Manifest(){},wideFieldW3TileUrl:(url:string)=>url,
    exactSkyObservationFrame,skySolarLightAt,selectSkyHipsTiles,skyHipsTileIntersectsView,
    useSkyNativeImages(_canvas:unknown,_revision:number,_hash:string,active:boolean,assets:typeof wanted){
      wanted=assets;enabled=active;
      return {images:new Map(active?assets.map(asset=>["w3:0:"+asset.pixel,decoded.get(asset.pixel)]):[]),
        retainedImages:new Map([...decoded].filter(([pixel])=>!assets.some(asset=>asset.pixel===pixel)).map(([pixel,image])=>["w3:0:"+pixel,image])),
        loading:false,failed:false,failedImage(){},retryImages(){return false;},suspendUnusedDecoded(){suspended++;}};
    },
  }) as typeof import("./use-sky-wide-field-w3").useSkyWideFieldW3;
  return {hook,wanted:()=>Array.from(wanted,asset=>asset.pixel),enabled:()=>enabled,suspended:()=>suspended};
}

test("W3 requests only the faces submitted by the real scene across wide, rolled and offset cameras",()=>{
  const h=harness();let removedFaces=0;
  for(const [fov,azimuth,tilt,roll] of [[60,0,135,0],[85,90,120,37],[139,0,135,0],[274.9,0,180,0]]){
    const view={basis:createSkyViewBasis(azimuth!,tilt!,roll!)!,verticalFovDeg:fov!,center:{x:195,y:490}};
    const selection=selectSkyHipsTiles({frame,view,width:390,height:844,maxOrder:0,minOrder:0});
    assert.equal(selection.state,"SELECTED");if(selection.state!=="SELECTED")continue;
    const submissions:number[]=[];
    const surface=new Proxy({}, {get:(_target,key)=>key==="skyImageMesh"?
      (image:{pixel:number},triangles:readonly number[])=>{assert(triangles.length);submissions.push(image.pixel);return true;}:()=>true}) as SkyRenderSurface;
    const args:any[]=Array(36).fill(undefined);
    Object.assign(args,{0:surface,1:report,2:at,3:null,4:null,5:390,6:844,7:"NIGHT",10:fov,12:view.basis,13:view.center,
      21:selection.pixels.map(pixel=>({layer:"WIDE_FIELD_W3",order:0,pixel,image:decoded.get(pixel)}))});
    drawSkyScene(...args as Parameters<typeof drawSkyScene>);
    assert(submissions.length>0,"real dark sky must submit nonempty image triangles");
    const result=h.hook(report,at,view,390,844,null,1,true);
    assert.deepEqual(h.wanted(),submissions,`FOV ${fov}: empty renderer faces must not consume decoded resources`);
    assert.deepEqual(Array.from(result.tiles,(tile:SkyHipsCanvasTile)=>tile.pixel),submissions,"dormant faces are not a second render source");
    removedFaces+=selection.pixels.length-submissions.length;
  }
  assert(removedFaces>0,"the regression must exercise real overfetch");
  assert(h.suspended()>0,"unused decoded faces must become cold files");
});

test("W3 has no current tiles for hidden, local, daylight or mismatched observation frames",()=>{
  const h=harness(),view={basis:createSkyViewBasis(0,180,0)!,verticalFovDeg:85};
  for(const [data,instant,currentView,active] of [
    [report,at,view,false],[report,at,{...view,verticalFovDeg:45},true],
    [{...report,hourly:[{at,sunAzimuthDeg:180,sunAltitudeDeg:10}]},at,view,true],
    [report,"2026-09-23T01:00:00.000Z",view,true],
  ] as const){
    const result=h.hook(data as ResolvedSkyReport,instant,currentView,390,844,null,1,active);
    assert.equal(result.tiles.length,0);assert.equal(h.enabled(),false);
  }
});
