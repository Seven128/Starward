import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import * as resources from "./sky-landscape-resources";
import * as readiness from "./sky-landscape-readiness";

test("cached landscape publication does not leave disabled or unmounted consumers loading",()=>{
  const effects:Function[]=[],cleanups:Function[]=[],queries:boolean[]=[],nativeActive:boolean[]=[];
  const publication={publicationHash:"cached-publication",resources:[{id:"overview",image:{width:1024,height:512}}]};
  const exports:Record<string,any>={};
  const source=readFileSync(new URL("./use-sky-landscape.ts",import.meta.url),"utf8");
  const react={useMemo:(fn:Function)=>fn(),useRef:(current:any)=>({current}),useState:(value:any)=>[value,()=>{}],
    useEffect:(effect:Function)=>effects.push(effect)};
  const bindings:Record<string,any>={react,"@/hooks/use-resource-query":{useResourceQuery:(options:any)=>{
    queries.push(options.enabled);return {data:publication,isFetching:false,isError:false};
  }},"@/services/sky-landscape-client":{getSkyLandscapeAlpha:()=>new Promise(()=>{}),getSkyLandscapeManifest:()=>{},skyLandscapeAssetUrl:()=>""},
    "./use-sky-artwork":{useSkyNativeImages:(_canvas:any,_revision:any,_hash:any,active:boolean)=>{
      nativeActive.push(active);return {images:new Map(),retainedImages:new Map(),loading:false,failed:false,suspendUnusedDecoded(){},failedImage(){}};
    }},"./sky-landscape-resources":resources,"./sky-landscape-readiness":readiness};
  vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,
    {exports,setTimeout,clearTimeout,Date,require:(name:string)=>{assert(name in bindings,name);return bindings[name];}});
  const render=(canvas:object|null,active:boolean)=>{
    const value=exports.useSkyLandscape(canvas,1,active,[],false,null);
    for(const effect of effects.splice(0)){const cleanup=effect();if(cleanup)cleanups.push(cleanup);}return value;
  };
  try{
    assert.equal(render({},true).loading,true,"active publication without its alpha remains pending");
    assert.equal(render({},false).loading,false,"turning off cached landscape is idle");
    assert.equal(render(null,true).loading,false,"canvas absence cannot keep a cached alpha request pending");
    assert.equal(render({},true).loading,true,"return requests unavailable alpha again");
    assert.deepEqual(queries,[true,false,false,true]);assert.deepEqual(nativeActive,[true,false,false,true]);
  }finally{for(const cleanup of cleanups)cleanup();}
});
