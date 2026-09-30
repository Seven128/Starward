import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

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
    useMemo:(evaluate:()=>unknown)=>evaluate(),useResourceQuery,
    getOpticalHipsManifest:()=>Promise.resolve(null),
    exactSkyObservationFrame:()=>null,
    useSkyNativeImages:()=>({images:[],retainedImages:[],loading:false,failed:false,
      retryImages(){},failedImage(){}}),
  };
  const useSkyOpticalHips=vm.runInNewContext(ts.transpileModule(
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
