import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";
import * as discs from "./sky-moon-disc";
import * as status from "./sky-fixed-image-status";

test("Moon coverage uses exact geometry and PNG identity; current pixels recover without accepting legacy images",()=>{
  const source=readFileSync(new URL("./use-sky-moon-texture.ts",import.meta.url),"utf8");
  const publication=JSON.parse(readFileSync(new URL("../../../../../workers/miniapp-api/assets/moon/coverage-manifest.json",import.meta.url),"utf8"));
  publication.publicationHash="checked-publication";
  publication.image.downloadUrl="/v2/sky/moon/coverage/checked-publication/image.png";
  const id="moon:uv750:coverage-v2",image={},queryCalls:any[]=[],imageCalls:any[]=[],exports_:Record<string,any>={};
  let stale=false,failed=false,retained=false,legacy=false,retries=0,refetches=0;
  vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,
    {exports:exports_,require(name:string){
      if(name==="react")return {useMemo:(fn:()=>unknown)=>fn()};
      if(name==="@/hooks/use-resource-query")return {useResourceQuery(options:any){queryCalls.push(options);
        return {data:publication,isFetching:false,isError:failed,refreshError:stale?Error("offline"):null,refetch(){refetches++;}};}};
      if(name==="@/services/moon-texture-client")return {getMoonTextureManifest(){},moonTextureImageUrl:(url:string)=>url};
      if(name==="./use-sky-fixed-image")return {useSkyFixedImage(...args:any[]){imageCalls.push(args);
        return {image:args[3]&&args[4]&&args[5]===id&&!legacy&&(!failed||retained)?image:null,
          loading:false,failed,retryImages(){retries++;},failedImage(){}};}};
      if(name==="./sky-moon-disc")return discs;
      if(name==="./sky-fixed-image-status")return status;
      throw Error(name);
    }});
  const at="2026-09-23T12:00:00Z",d=Math.SQRT1_2;
  const basis={right:[1,0,0],up:[0,-d,d],forward:[0,d,d]};
  const row={at,moonAzimuthDeg:0,moonAltitudeDeg:45,moonAngularDiameterDeg:.5,moonIllumination:.5,
    sunAzimuthDeg:90,sunAltitudeDeg:0,moonBodyFrame:{primeMeridianEnu:[0,-d,-d],poleEnu:[0,-d,d]}};
  const run=(input:unknown=row,time=at,active=true,fov=3)=>exports_.useSkyMoonTexture({hourly:[input]},time,
    {basis,verticalFovDeg:fov},400,800,{},1,active);
  assert.equal(run().image,image);
  assert.equal(queryCalls.at(-1).queryKey[1],"coverage-v2");
  assert.equal(imageCalls.at(-1)[5],id);
  assert.equal(imageCalls.at(-1)[6](imageCalls.at(-1)[2].image).format,"png");
  for(const invoke of [()=>run(row,"2026-09-23T13:00:00Z"),()=>run({...row,moonBodyFrame:null}),
    ()=>run(row,at,false),()=>run(row,at,true,180)]){
    assert.equal(invoke().image,null);assert.equal(queryCalls.at(-1).enabled,false);assert.equal(imageCalls.at(-1)[4],false);
  }
  retained=true;stale=true;failed=true;
  const usable=run();assert.equal(usable.image,image);assert.equal(usable.failed,false);assert.equal(usable.refreshFailed,true);
  usable.retry();assert.equal(retries,1);assert.equal(refetches,1);
  retained=false;assert.equal(run().failed,true);
  stale=false;failed=false;legacy=true;assert.equal(run().image,null);
  legacy=false;assert.equal(run().image,image);assert.equal(run().failed,false);
});
