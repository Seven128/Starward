import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { createSkyArtworkLoader, type SkyArtworkLoadState, type SkyNativeImageAsset } from "./sky-artwork-loader";
import { skyFixedImageStatus } from "./sky-fixed-image-status";
import { sdssOpticalLevelForFov } from "./sky-sdss-optical-selection";

test("fine optical failure retains the nearest ready coarse level and an explicit retry",()=>{
  const source=ts.createSourceFile("use-sky-sdss-optical.ts",
    readFileSync(new URL("./use-sky-sdss-optical.ts",import.meta.url),"utf8"),ts.ScriptTarget.Latest,true);
  const declaration=source.statements.find((node):node is ts.FunctionDeclaration=>
    ts.isFunctionDeclaration(node)&&node.name?.text==="useSkySdssOptical")!;
  const levels={OVERVIEW:{sha256:"overview",fieldDegrees:.2275555556,bytes:20492,downloadUrl:"/overview.jpg"},
    MEDIUM:{sha256:"medium",fieldDegrees:.1137777778,bytes:24076,downloadUrl:"/medium.jpg"},
    DETAIL:{sha256:"detail",fieldDegrees:.0568888889,bytes:19784,downloadUrl:"/detail.jpg"}};
  const publication={objectRef:"M:51",publicationHash:"publication",levels};
  const starts:{asset:SkyNativeImageAsset;ready:(loaded:{image:object;release():void})=>void;fail():void}[]=[];
  let state:SkyArtworkLoadState={images:new Map(),retainedImages:new Map(),loading:false,failed:false};
  let retries=0,refetches=0,released=0;
  const owner=createSkyArtworkLoader({byteBudget:2*512*512*4,changed(value){state=value;},
    start(asset,ready,fail){starts.push({asset,ready,fail});return()=>{};}});
  const hook=vm.runInNewContext(ts.transpileModule(declaration.getText(source).replace(/^export\s+/,"")+
    "\nuseSkySdssOptical;",{compilerOptions:{target:ts.ScriptTarget.ES2020}}).outputText,{
    useMemo:(evaluate:()=>unknown)=>evaluate(),sdssOpticalLevelForFov,skyFixedImageStatus,
    getSdssOpticalManifest:()=>Promise.resolve(publication),sdssOpticalImageUrl:(path:string)=>path,
    useResourceQuery:()=>({data:publication,isError:false,refreshError:null,isFetching:false,
      refetch(){refetches++;return Promise.resolve(publication);}}),
    useSkyNativeImages:(_canvas:unknown,_revision:number,_hash:string,_active:boolean,wanted:SkyNativeImageAsset[])=>{
      owner.update(wanted);
      return {...state,failedImage:(image:object)=>owner.failed(image),retryImages(){retries++;return owner.retry();}};
    },
  }) as typeof import("./use-sky-sdss-optical").useSkySdssOptical;
  const canvas={createImage(){throw Error("decode is owned by the tested shared image loader boundary");}};
  const read=(fov:number)=>hook("M:51",fov,canvas,1,true);
  const ready=(index:number)=>{const image={level:starts[index]!.asset.id};starts[index]!.ready({image,
    release(){released++;}});return image;};
  read(.3);const overview=ready(0);assert.equal(read(.3).image,overview);
  read(.1);const medium=ready(1);assert.equal(read(.1).image,medium);
  assert.strictEqual(read(.1).coarser?.image,overview,"continuous refinement must retain the actual wider optical field under the medium field");
  assert.equal(read(.1).coarser?.fieldDegrees,levels.OVERVIEW.fieldDegrees);
  const loading=read(.05);assert.equal(loading.image,medium,"the nearest coarse image survives while detail loads");
  assert.equal(loading.fieldDegrees,levels.MEDIUM.fieldDegrees);
  starts[2]!.fail();
  const failed=read(.05);
  assert.equal(failed.image,medium,"failure does not regress to the older overview or discard valid coarse pixels");
  assert.equal(failed.failed,false,"usable pixels are distinct from total image unavailability");
  assert.equal(failed.updateFailed,true,"the user can retry the failed requested level while the coarse image remains usable");
  assert.equal(starts.length,3,"camera updates do not loop automatic retries");
  failed.retry();assert.equal(starts.length,4);assert.equal(retries,1);assert.equal(refetches,1);
  const detail=ready(3),recovered=read(.05);
  assert.equal(recovered.image,detail);assert.equal(recovered.renderedLevel,"DETAIL");
  assert.strictEqual(recovered.coarser?.image,medium,"the parent survives refinement within the existing two-image budget");
  assert.equal(recovered.coarser?.level,"MEDIUM");
  assert.equal(recovered.updateFailed,false);assert.equal(recovered.loading,false);
  owner.dispose();assert.equal(released,3,"the bounded owner releases all decoded levels, including an evicted overview");
});

test("target switches fence prior discovery, cancel its owner and reject late decoded pixels", () => {
  const source = ts.createSourceFile("use-sky-sdss-optical.ts",
    readFileSync(new URL("./use-sky-sdss-optical.ts", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
  const declaration = source.statements.find((node): node is ts.FunctionDeclaration =>
    ts.isFunctionDeclaration(node) && node.name?.text === "useSkySdssOptical")!;
  const publicationFor = (reference:string) => ({objectRef:reference,publicationHash:`publication-${reference}`,
    levels: Object.fromEntries(["OVERVIEW","MEDIUM","DETAIL"].map(level => [level, {
      sha256:`${reference}-${level}`,fieldDegrees:level === "DETAIL" ? .0568888889 : level === "MEDIUM" ? .1137777778 : .2275555556,
      bytes:100,downloadUrl:`/${reference}/${level}.jpg`,
    }])) });
  let publication = publicationFor("M:51");
  let currentHash: string | undefined, owner: ReturnType<typeof createSkyArtworkLoader> | undefined;
  let state: SkyArtworkLoadState = {images:new Map(),retainedImages:new Map(),loading:false,failed:false};
  const starts: Array<{asset:SkyNativeImageAsset;ready:(loaded:{image:object;release():void})=>void;fail():void}> = [];
  const queries: Array<{queryKey:readonly unknown[];queryFn:(signal?:AbortSignal)=>Promise<unknown>;enabled:boolean}> = [];
  const requested: string[] = [];
  let canceled = 0, released = 0, retries = 0;
  const hook = vm.runInNewContext(ts.transpileModule(declaration.getText(source).replace(/^export\s+/u, "") + "\nuseSkySdssOptical;",
    {compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText, {
    useMemo:(evaluate:()=>unknown)=>evaluate(),sdssOpticalLevelForFov,skyFixedImageStatus,
    sdssOpticalImageUrl:(path:string)=>path,
    getSdssOpticalManifest:async (_signal:unknown,reference:string)=>{requested.push(reference);return publication;},
    useResourceQuery:(options:typeof queries[number])=>{queries.push(options);return {data:publication,isError:false,refreshError:null,
      isFetching:publication.objectRef !== options.queryKey[1],refetch:async()=>publication};},
    useSkyNativeImages:(_canvas:unknown,_revision:number,hash:string|undefined,active:boolean,wanted:SkyNativeImageAsset[])=>{
      if (currentHash !== hash || !active) {
        owner?.dispose(); owner = undefined; currentHash = hash;
        state={images:new Map(),retainedImages:new Map(),loading:false,failed:false};
      }
      if (active && hash && !owner) owner=createSkyArtworkLoader({byteBudget:2*512*512*4,
        changed(value){state=value;},start(asset,ready,fail){starts.push({asset,ready,fail});return()=>{canceled++;};}});
      owner?.update(wanted);
      return {...state,failedImage:(image:object)=>owner?.failed(image),retryImages(){retries++;return owner?.retry()??false;}};
    },
  }) as typeof import("./use-sky-sdss-optical").useSkySdssOptical;
  const canvas={createImage(){throw Error("decoding belongs to the shared request owner");}};
  const read=(reference:string,fov=.3,active=true)=>hook(reference,fov,canvas,1,active);
  const ready=(index:number)=>{const image={asset:starts[index]!.asset.id};starts[index]!.ready({image,release(){released++;}});return image;};
  read("M:51"); const first=ready(0); assert.strictEqual(read("M:51").image,first);
  read("M:51",.05); assert.equal(starts.length,3,"a cold fine request also needs its wider parent");
  const switched=read("M:82");
  assert.equal(switched.image,null,"a retained M51 discovery result must not be relabeled M82");
  assert.equal(switched.publication,undefined); assert.equal(switched.loading,true);
  assert.equal(canceled,2,"both requests belong to the retired publication owner"); assert.equal(released,1);
  ready(1); assert.equal(released,2,"late decode from the retired target is released immediately");
  ready(2); assert.equal(released,3,"the late parent decode is fenced by the same owner");
  assert.equal(read("M:82").image,null);
  publication=publicationFor("M:82");read("M:82");
  assert.equal(starts.length,4); assert.match(starts[3]!.asset.id,/M:82/u);
  const second=ready(3); assert.strictEqual(read("M:82").image,second);
  void queries.at(-1)!.queryFn(undefined); assert.equal(requested.at(-1),"M:82");
  read("M:82",.05);starts[4]!.fail();
  assert.strictEqual(read("M:82",.05).image,second,"the admitted overview remains usable until its nearer parent arrives");
  const parent=ready(5),coarse=read("M:82",.05);assert.strictEqual(coarse.image,parent);assert.equal(coarse.updateFailed,true);
  assert.equal(starts.length,6,"camera renders cannot automatically repeat failed downloads");
  coarse.retry();assert.equal(retries,1);assert.equal(starts.length,7);
  const detail=ready(6);assert.strictEqual(read("M:82",.05).image,detail);
  assert.equal(read("M:31").requested,false);assert.equal(read("M:31").image,null);
  assert.equal(released,6,"both target owners release every accepted or late image exactly once");
  owner?.dispose();
});

test("larger M81 overview selection follows its actual admitted footprint", () => {
  assert.equal(sdssOpticalLevelForFov(.5,"M:81"),"OVERVIEW");
  assert.equal(sdssOpticalLevelForFov(.2,"M:81"),"MEDIUM");
  assert.equal(sdssOpticalLevelForFov(.05,"M:81"),"DETAIL");
  assert.equal(sdssOpticalLevelForFov(.61,"M:81"),null);
  assert.equal(sdssOpticalLevelForFov(.5,"M:82"),null);
  assert.equal(sdssOpticalLevelForFov(.05,"M:31"),null);
});

test("the public page retry preserves coarse optical pixels through repeated HTTP failure and resets only a failed GPU owner",()=>{
  const hookSource=ts.createSourceFile('hook.ts',readFileSync(new URL('./use-sky-sdss-optical.ts',import.meta.url),'utf8'),ts.ScriptTarget.Latest,true);
  const hookDeclaration=hookSource.statements.find((node):node is ts.FunctionDeclaration=>ts.isFunctionDeclaration(node)&&node.name?.text==='useSkySdssOptical')!;
  const pageSource=ts.createSourceFile('page.tsx',readFileSync(new URL('./spot-sky-page.tsx',import.meta.url),'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  function expression(name:string){let value='';function visit(node:ts.Node){if(ts.isVariableDeclaration(node)&&node.name.getText(pageSource)===name)value=node.initializer!.getText(pageSource);ts.forEachChild(node,visit);}visit(pageSource);return value;}
  const publication={objectRef:'M:82',publicationHash:'publication',levels:Object.fromEntries(['OVERVIEW','MEDIUM','DETAIL'].map(level=>[level,{sha256:level,fieldDegrees:level==='DETAIL'?.0568888889:level==='MEDIUM'?.1137777778:.2275555556,bytes:100,downloadUrl:'/image.jpg'}]))};
  let state:SkyArtworkLoadState={images:new Map(),retainedImages:new Map(),failed:false,loading:false};
  let released=0,resets=0,refetches=0;
  const starts:Array<{asset:SkyNativeImageAsset;ready:(loaded:{image:object;release():void})=>void;fail():void}>=[];
  const owner=createSkyArtworkLoader({byteBudget:2*512*512*4,changed(value){state=value;},start(asset,ready,fail){starts.push({asset,ready,fail});return()=>{};}});
  const hook=vm.runInNewContext(ts.transpileModule(hookDeclaration.getText(hookSource).replace(/^export\s+/,'')+'\nuseSkySdssOptical;',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,{
    useMemo:(read:()=>unknown)=>read(),sdssOpticalLevelForFov,skyFixedImageStatus,sdssOpticalImageUrl:(url:string)=>url,
    getSdssOpticalManifest:async()=>publication,useResourceQuery:()=>({data:publication,isError:false,isFetching:false,refetch(){refetches++;}}),
    useSkyNativeImages:(_canvas:unknown,_revision:number,_hash:string,_active:boolean,wanted:SkyNativeImageAsset[])=>{owner.update(wanted);return {...state,failedImage:owner.failed,retryImages:owner.retry};},
  }) as typeof import('./use-sky-sdss-optical').useSkySdssOptical;
  const canvas={createImage(){throw Error('request and decode are represented by the shared loader boundary');}};
  const read=(fov=.05)=>hook('M:82',fov,canvas,1,true);
  const ready=(index:number)=>{const image={level:starts[index]!.asset.id};starts[index]!.ready({image,release(){released++;}});return image;};
  read(.1);const medium=ready(0);assert.strictEqual(read(.1).image,medium);
  ready(1);read();starts[2]!.fail();assert.equal(read().updateFailed,true,"the real requested DETAIL failed, not a canceled old request");
  const scope:Record<string,unknown>={sdssOptical:read(),canvasLifecycle:{resize(){resets++;owner.dispose();state={images:new Map(),retainedImages:new Map(),loading:false,failed:false};}}};
  const shared=expression('retryNativeImage');
  const code=(shared?'const retryNativeImage='+shared+';':'')+'('+expression('retrySdssOptical')+');';
  const retry=vm.runInNewContext(ts.transpileModule(code,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,scope) as ()=>void;
  retry();
  assert.equal(resets,0,'a failed HTTP refinement must not rebuild the native canvas or release the valid coarse image');
  assert.strictEqual(read().image,medium);assert.equal(released,0);assert.equal(starts.length,4);assert.equal(refetches,1);
  starts[3]!.fail();scope.sdssOptical=read();retry();
  assert.equal(resets,0);assert.strictEqual(read().image,medium);assert.equal(starts.length,5,'the public action really retries the failed detail, rather than leaving it latched');
  const detail=ready(4);assert.strictEqual(read().image,detail);assert.equal(read().renderedLevel,'DETAIL');
  owner.failed(detail);scope.sdssOptical=read();retry();
  assert.equal(resets,1,'GPU failure still needs a new GPU owner to clear the shader/upload latch');
  assert.equal(released,3,'the evicted overview and both accepted native images are released exactly once after the necessary GPU reset');
});
