import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";
import {SKY_PLANET_ORDER} from "@starward/miniapp-contracts";
import * as discs from "./sky-planet-disc";
import * as status from "./sky-fixed-image-status";
import {createSkyViewBasis} from "./sky-view-projection";

test("OPAL requests require the correct resolved body, exact time and valid axes; restored input recovers",()=>{
  const at="2026-09-26T12:00:00Z",basis=createSkyViewBasis(0,135,0)!;
  const source=readFileSync(new URL("./use-sky-opal-bands.ts",import.meta.url),"utf8");
  const queryCalls:any[]=[],imageCalls:any[]=[],exports_:Record<string,any>={};
  const image={};let publication:any;
  vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,
    target:ts.ScriptTarget.ES2022}}).outputText,{exports:exports_,require(name:string){
    if(name==="react")return {useMemo:(fn:()=>unknown)=>fn()};
    if(name==="@/hooks/use-resource-query")return {useResourceQuery(options:any){queryCalls.push(options);
      return {data:publication,isFetching:false,isError:false,refreshError:null,refetch(){}};}};
    if(name==="./use-sky-fixed-image")return {useSkyFixedImage(...args:any[]){imageCalls.push(args);
      return {image:args[3]&&args[4]?image:null,failed:false,retryImages(){},failedImage(){}};}};
    if(name==="./sky-planet-disc")return discs;
    if(name==="./sky-fixed-image-status")return status;
    throw new Error(name);
  }});
  for(const body of ["URANUS","NEPTUNE"] as const){
    publication=JSON.parse(readFileSync(new URL(`../../../../../workers/miniapp-api/assets/${body.toLowerCase()}/manifest.json`,import.meta.url),"utf8"));
    publication.publicationHash="test-publication";
    const profile={body,id:`${body}:bands`,queryKey:`${body}:manifest`,getManifest:async()=>publication,imageUrl:(url:string)=>url};
    const row={at,sunAzimuthDeg:90,sunAltitudeDeg:0,planets:SKY_PLANET_ORDER.map(p=>({body:p,
      azimuthDeg:0,altitudeDeg:p===body?45:-10,angularDiameterDeg:.02,illuminatedFraction:.99,
      visualMagnitude:7,ringTiltDeg:null,ringPoleEnu:null,
      bodyFrame:p===body?{poleEnu:[0,0,1],primeMeridianEnu:[1,0,0]}:null}))};
    const run=(input:unknown,time=at,fov=.25,active=true)=>exports_.useSkyOpalBands(profile,
      {hourly:[input]},time,{basis,verticalFovDeg:fov},400,800,{},1,active);
    const enabled=()=>[queryCalls.at(-1).enabled,imageCalls.at(-1)[4]];
    assert.equal(run(row).image,image);assert.deepEqual(enabled(),[true,true]);
    assert.equal(imageCalls.at(-1)[5],profile.id);
    run(row,at,45);assert.deepEqual(enabled(),[false,false]);
    run(row,at,.25,false);assert.deepEqual(enabled(),[false,false]);
    run(row,"2026-09-26T13:00:00Z");assert.deepEqual(enabled(),[false,false]);
    run({...row,planets:row.planets.map(p=>({...p,bodyFrame:null}))});assert.deepEqual(enabled(),[false,false]);
    run({...row,planets:row.planets.map(p=>({...p,altitudeDeg:-10}))});assert.deepEqual(enabled(),[false,false]);
    run(row);assert.deepEqual(enabled(),[true,true]);
  }
});
