import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { createSkyArtworkLoader, type SkyArtworkLoadState, type SkyNativeImageAsset } from "./sky-artwork-loader";
import { skyFixedImageStatus } from "./sky-fixed-image-status";
import { skyTargetOpticalLevelForView } from "./sky-sdss-optical-selection";
import { sdssOpticalPublication } from "@starward/miniapp-contracts";
import { opticalPublicationReference, opticalAssetDimensions, isPreparedOpticalReference } from "@starward/miniapp-contracts";
import { skyTargetOpticalIntersectsView } from "./sky-target-optical-visibility";
import { createSkyViewBasis } from "./sky-view-projection";
import { registerSkySurvey } from "./sky-survey-registration";

function hookLifecycle() {
  const reference = { current: null as unknown };
  return { useRef: () => reference, useEffect: (effect: () => void) => effect() };
}
function samplingFootprint(fov: number, reference = "M:51") {
  const at = "2026-10-03T13:00:00.000Z";
  return { at, width: 390, height: 844, drawingWidth: 390, drawingHeight: 844,
    report: { hourly: [{ at }], skyScene: { deepSky: { state: "AVAILABLE", catalog: {
      frame: "ICRS J2000", imageRegistration: "ICRS_TAN_NORTH_0_1_V1", entries: [{ objectRef: reference }] },
      frames: [{ at, state: "AVAILABLE", points: [[0, 0, 40, 0, 40.1, 359.9, 40]] }] } } } as any,
    view: { basis: createSkyViewBasis(0, 130, 0)!, verticalFovDeg: fov } };
}

function opticalTestSource(name: string): string {
  // Optional frozen pre-fix owner for the bounded escaped-defect experiment.
  // Normal portable checks always execute the current production source.
  const baseline = process.env.CLOUD_SKY_TARGET_OPTICAL_BASELINE_DIR;
  return readFileSync(baseline ? `${baseline}/${name}.txt` : new URL(`./${name}`, import.meta.url), "utf8");
}

function progressiveDeclaration(): string {
  const source = ts.createSourceFile("use-sky-target-optical.ts",
    opticalTestSource("use-sky-target-optical.ts"), ts.ScriptTarget.Latest, true);
  const declaration = source.statements.find((node): node is ts.FunctionDeclaration =>
    ts.isFunctionDeclaration(node) && node.name?.text === "useSkyTargetOptical");
  assert(declaration);
  return declaration.getText(source).replace(/^export\s+/u, "") + "\n";
}

test("a selected optical family outside the actual view starts no image jobs and retires ready images", () => {
  const wrapperSource = ts.createSourceFile("wrapper.ts", opticalTestSource("use-sky-sdss-optical.ts"), ts.ScriptTarget.Latest, true);
  const wrapper = wrapperSource.statements.find((node): node is ts.FunctionDeclaration => ts.isFunctionDeclaration(node) && node.name?.text === "useSkySdssOptical")!;
  const publication = { objectRef: "M:51", publicationHash: "publication", levels: Object.fromEntries(
    ["OVERVIEW", "MEDIUM", "DETAIL"].map((level, index) => [level, { sha256: level, bytes: 100,
      pixels: 512, fieldDegrees: .2275555556 / 2 ** index, downloadUrl: "/" + level + ".jpg" }])) };
  // Structural admitted-caller geometry. North sample is exactly 0.1 degree;
  // lower-hemisphere browsing remains eligible and uses no horizon cutoff.
  const at = "2026-10-03T13:00:00.000Z";
  const report = { hourly: [{ at }], skyScene: { deepSky: { state: "AVAILABLE",
    catalog: { frame: "ICRS J2000", imageRegistration: "ICRS_TAN_NORTH_0_1_V1", entries: [{ objectRef: "M:51" }] },
    frames: [{ at, state: "AVAILABLE", points: [[0, 0, -10, 0, -9.9, 359.9, -10]] }] } } };
  assert(registerSkySurvey(report.skyScene.deepSky.frames[0]!.points[0] as any, publication.levels.OVERVIEW!.fieldDegrees, 512, 256.5),
    "the structural north/east sample must be usable before asserting an empty viewport");
  let owner: ReturnType<typeof createSkyArtworkLoader> | undefined;
  let state: SkyArtworkLoadState = { images: new Map(), retainedImages: new Map(), loading: false, failed: false };
  let starts = 0, releases = 0;
  const hook = vm.runInNewContext(ts.transpileModule(progressiveDeclaration() + wrapper.getText(wrapperSource).replace(/^export\s+/u, "") + "\nuseSkySdssOptical;",
    { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, {
    ...hookLifecycle(), useMemo: (read: () => unknown) => read(), sdssOpticalPublication, opticalPublicationReference, opticalAssetDimensions, isPreparedOpticalReference, skyTargetOpticalLevelForView, skyFixedImageStatus, skyTargetOpticalIntersectsView,
    getSdssOpticalManifest: async () => publication, sdssOpticalImageUrl: (url: string) => url,
    useResourceQuery: () => ({ data: publication, isError: false, isFetching: false, refetch: async () => publication }),
    useSkyNativeImages: (_canvas: unknown, _revision: number, _hash: string, active: boolean, wanted: SkyNativeImageAsset[]) => {
      if (!active) { owner?.dispose(); owner = undefined; state = { images: new Map(), retainedImages: new Map(), loading: false, failed: false }; }
      if (active && !owner) owner = createSkyArtworkLoader({ byteBudget: 2 * 512 * 512 * 4, changed(value) { state = value; },
        start(asset, ready) { starts++; ready({ image: { id: asset.id }, release() { releases++; } }); return () => {}; } });
      owner?.update(wanted);
      return { ...state, failedImage: (image: object) => owner?.failed(image), retryImages: () => owner?.retry() ?? false };
    },
  }) as (...args: unknown[]) => { image: object | null; requested: boolean; renderedLevel: string | null };
  const canvas = { createImage() { throw Error("controlled callback at the real loader boundary"); } };
  const read = (az: number, suppliedReport: unknown = report) => hook("M:51", .05, canvas, 1, true, undefined,
    { report: suppliedReport, at, width: 390, height: 844, drawingWidth: 390, drawingHeight: 844,
      view: { basis: createSkyViewBasis(az, 80, 0), verticalFovDeg: .05 } });
  assert.equal(read(90).image, null, "cold fully-offscreen family must not acquire or decode pixels");
  assert.equal(starts, 0);
  assert.equal(read(0).renderedLevel, "DETAIL"); assert.equal(starts, 2);
  assert.equal(read(90).requested, false); assert.equal(releases, 2, "both ready levels retire with their native owner");
  assert.equal(read(0).renderedLevel, "DETAIL"); assert.equal(starts, 4, "return reopens the existing cache/decode boundary");
  assert.equal(read(90, { hourly: [] }).requested, true, "unknown geometry cannot cancel an otherwise valid source");
  owner?.dispose();
});

test("normal page supplies the accepted camera and exact report to the optical demand owner", () => {
  const page = ts.createSourceFile("page.tsx", readFileSync(new URL("./spot-sky-page.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const declarations = new Map<string, ts.VariableStatement>();
  const visit = (node: ts.Node) => {
    if (ts.isVariableStatement(node)) for (const variable of node.declarationList.declarations)
      if (["targetOpticalView", "nativeFieldPublication", "selectedOpticalPublication", "sdssOptical"].includes(variable.name.getText(page))) declarations.set(variable.name.getText(page), node);
    ts.forEachChild(node, visit);
  }; visit(page); assert.equal(declarations.size, 4);
  const code = ts.transpileModule([...declarations.values()].map(node => node.getText(page)).join("\n"),
    { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const geometryReport = {}, currentViewBasis = createSkyViewBasis(0, 80, 0), presentedCenter = { x: 183, y: 419 };
  let captured: unknown[] = [];
  const read = (targetOpticalPublication: unknown = undefined) => vm.runInNewContext(code, { geometryReport, currentViewBasis, presentedFov: .05, presentedCenter,
    row: { at: "2026-10-03T13:00:00.000Z" }, canvasSize: { width: 390, height: 844 }, verticalFovDeg: .2,
    selectedDeepSkyEntry: { objectRef: "M:51" }, deepSkyRegistrationReady: true,
    canvasNodeRef: { current: { width: 1171, height: 2533 } }, canvasNodeRevision: 1,
    pageVisible: true, rawReportData: {}, mode: "DAY", report: { data: { dataState: "FRESH" }, isError: false },
    targetOpticalPublication, useSkyTargetOptical: (...args: unknown[]) => { captured = args; return {}; } });
  read();
  assert.equal(captured[0], "sdss-legacy"); assert.equal(captured[1], "M:51");
  assert.equal(captured[2], .05, "selection must use the accepted displayed camera instead of pending zoom intent");
  const view = captured[7] as import("./sky-target-optical-visibility").SkyTargetOpticalView;
  assert.equal(view.report, geometryReport); assert.equal(view.view.basis, currentViewBasis); assert.equal(view.view.center, presentedCenter);
  assert.equal(view.view.verticalFovDeg, .05); assert.equal(view.at, "2026-10-03T13:00:00.000Z");
  assert.equal(view.width, 390); assert.equal(view.height, 844);
  assert.equal(view.drawingWidth, 1171); assert.equal(view.drawingHeight, 2533);
  const pin = { kind: "prepared-optical-v1", reference: "M:51", publicationHash: "a".repeat(64) };
  read(pin); assert.equal(captured[0], pin.kind); assert.equal(captured[6], pin.publicationHash);
  read({ ...pin, kind: "sdss-calibrated" }); assert.equal(captured[0], "sdss-calibrated");
  read({ ...pin, reference: "M:82" }); assert.equal(captured[0], "sdss-legacy");
  assert.equal(captured[6], undefined, "an unrelated selected object cannot borrow the pinned photograph");
  const region = { kind: "prepared-native-optical-v1", reference: "REGION:independent-field", publicationHash: "b".repeat(64) };
  read(region); assert.equal(captured[0], region.kind); assert.equal(captured[1], region.reference); assert.equal(captured[6], region.publicationHash);
  assert.equal(captured[5], true, "explicit independent native footprint does not require a celestial catalog selection");
});

test("fine optical failure retains the nearest ready coarse level and an explicit retry",()=>{
  const source=ts.createSourceFile("use-sky-sdss-optical.ts",
    readFileSync(new URL("./use-sky-sdss-optical.ts",import.meta.url),"utf8"),ts.ScriptTarget.Latest,true);
  const declaration=source.statements.find((node):node is ts.FunctionDeclaration=>
    ts.isFunctionDeclaration(node)&&node.name?.text==="useSkySdssOptical")!;
  const levels={OVERVIEW:{sha256:"overview",pixels:512,fieldDegrees:.2275555556,bytes:20492,downloadUrl:"/overview.jpg"},
    MEDIUM:{sha256:"medium",pixels:512,fieldDegrees:.1137777778,bytes:24076,downloadUrl:"/medium.jpg"},
    DETAIL:{sha256:"detail",pixels:512,fieldDegrees:.0568888889,bytes:19784,downloadUrl:"/detail.jpg"}};
  const publication={objectRef:"M:51",publicationHash:"publication",levels};
  const starts:{asset:SkyNativeImageAsset;ready:(loaded:{image:object;release():void})=>void;fail():void}[]=[];
  let state:SkyArtworkLoadState={images:new Map(),retainedImages:new Map(),loading:false,failed:false};
  let retries=0,refetches=0,released=0;
  const owner=createSkyArtworkLoader({byteBudget:2*512*512*4,changed(value){state=value;},
    start(asset,ready,fail){starts.push({asset,ready,fail});return()=>{};}});
  const hook=vm.runInNewContext(ts.transpileModule(progressiveDeclaration() + declaration.getText(source).replace(/^export\s+/,"")+
    "\nuseSkySdssOptical;",{compilerOptions:{target:ts.ScriptTarget.ES2020}}).outputText,{
    ...hookLifecycle(),useMemo:(evaluate:()=>unknown)=>evaluate(),sdssOpticalPublication,opticalPublicationReference,opticalAssetDimensions,isPreparedOpticalReference,skyTargetOpticalLevelForView,skyTargetOpticalIntersectsView,skyFixedImageStatus,
    getSdssOpticalManifest:()=>Promise.resolve(publication),sdssOpticalImageUrl:(path:string)=>path,
    useResourceQuery:()=>({data:publication,isError:false,refreshError:null,isFetching:false,
      refetch(){refetches++;return Promise.resolve(publication);}}),
    useSkyNativeImages:(_canvas:unknown,_revision:number,_hash:string,_active:boolean,wanted:SkyNativeImageAsset[])=>{
      owner.update(wanted);
      return {...state,failedImage:(image:object)=>owner.failed(image),retryImages(){retries++;return owner.retry();}};
    },
  }) as typeof import("./use-sky-sdss-optical").useSkySdssOptical;
  const canvas={createImage(){throw Error("decode is owned by the tested shared image loader boundary");}};
  const read=(fov:number)=>hook("M:51",fov,canvas,1,true,undefined,samplingFootprint(fov));
  const ready=(index:number)=>{const image={level:starts[index]!.asset.id};starts[index]!.ready({image,
    release(){released++;}});return image;};
  read(.5);const overview=ready(0);assert.equal(read(.5).image,overview);
  read(.2);const medium=ready(1);assert.equal(read(.2).image,medium);
  assert.strictEqual(read(.2).coarser?.image,overview,"continuous refinement must retain the actual wider optical field under the medium field");
  assert.equal(read(.2).coarser?.fieldDegrees,levels.OVERVIEW.fieldDegrees);
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
      pixels:512,bytes:100,downloadUrl:`/${reference}/${level}.jpg`,
    }])) });
  let publication = publicationFor("M:51");
  let currentHash: string | undefined, owner: ReturnType<typeof createSkyArtworkLoader> | undefined;
  let state: SkyArtworkLoadState = {images:new Map(),retainedImages:new Map(),loading:false,failed:false};
  const starts: Array<{asset:SkyNativeImageAsset;ready:(loaded:{image:object;release():void})=>void;fail():void}> = [];
  const queries: Array<{queryKey:readonly unknown[];queryFn:(signal?:AbortSignal)=>Promise<unknown>;enabled:boolean}> = [];
  const requested: string[] = [];
  let canceled = 0, released = 0, retries = 0;
  const hook = vm.runInNewContext(ts.transpileModule(progressiveDeclaration() + declaration.getText(source).replace(/^export\s+/u, "") + "\nuseSkySdssOptical;",
    {compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText, {
    ...hookLifecycle(),useMemo:(evaluate:()=>unknown)=>evaluate(),sdssOpticalPublication,opticalPublicationReference,opticalAssetDimensions,isPreparedOpticalReference,skyTargetOpticalLevelForView,skyTargetOpticalIntersectsView,skyFixedImageStatus,
    sdssOpticalImageUrl:(path:string)=>path,
    getSdssOpticalManifest:async (_signal:unknown,reference:string)=>{requested.push(reference);return publication;},
    useResourceQuery:(options:typeof queries[number])=>{queries.push(options);return {data:publication,isError:false,refreshError:null,
      isFetching:publication.objectRef !== options.queryKey[1],refetch:async()=>publication};},
    useSkyNativeImages:(_canvas:unknown,_revision:number,hash:string|undefined,active:boolean,wanted:SkyNativeImageAsset[],_resolve:unknown,byteBudget:number,retainedFallbackIds:readonly string[])=>{
      if (currentHash !== hash || !active) {
        owner?.dispose(); owner = undefined; currentHash = hash;
        state={images:new Map(),retainedImages:new Map(),loading:false,failed:false};
      }
      if (active && hash && !owner) owner=createSkyArtworkLoader({byteBudget,retainedFallbackIds,
        changed(value){state=value;},start(asset,ready,fail){starts.push({asset,ready,fail});return()=>{canceled++;};}});
      owner?.update(wanted);
      return {...state,failedImage:(image:object)=>owner?.failed(image),retryImages(){retries++;return owner?.retry()??false;}};
    },
  }) as typeof import("./use-sky-sdss-optical").useSkySdssOptical;
  const canvas={createImage(){throw Error("decoding belongs to the shared request owner");}};
  const read=(reference:string,fov=.5,active=true)=>hook(reference,fov,canvas,1,active,undefined,samplingFootprint(fov,reference));
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
  const photo = (reference: string) => ({ objectRef: reference, levels: Object.fromEntries(
    Object.entries(sdssOpticalPublication(reference)!.scales).map(([level, scale]) =>
      [level, { pixels: 512, fieldDegrees: 512 * scale / 3600 }])) }) as any;
  assert.equal(skyTargetOpticalLevelForView(photo("M:81"), samplingFootprint(1, "M:81")), "OVERVIEW");
  assert.equal(skyTargetOpticalLevelForView(photo("M:81"), samplingFootprint(.5, "M:81")), "MEDIUM");
  assert.equal(skyTargetOpticalLevelForView(photo("M:82"), samplingFootprint(.5, "M:82")), "OVERVIEW",
    "equal angular views do not imply equal texture sampling for different actual footprints");
  assert.equal(skyTargetOpticalLevelForView(photo("M:81"), samplingFootprint(.05, "M:81")), "DETAIL");
  assert.equal(sdssOpticalPublication("M:31"), null);
});

test("the public optical retry preserves valid images through HTTP and GPU failure without recreating Canvas",()=>{
  const hookSource=ts.createSourceFile('hook.ts',readFileSync(new URL('./use-sky-sdss-optical.ts',import.meta.url),'utf8'),ts.ScriptTarget.Latest,true);
  const hookDeclaration=hookSource.statements.find((node):node is ts.FunctionDeclaration=>ts.isFunctionDeclaration(node)&&node.name?.text==='useSkySdssOptical')!;
  const pageSource=ts.createSourceFile('page.tsx',readFileSync(new URL('./spot-sky-page.tsx',import.meta.url),'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  function expression(name:string){let value='';function visit(node:ts.Node){if(ts.isVariableDeclaration(node)&&node.name.getText(pageSource)===name)value=node.initializer!.getText(pageSource);ts.forEachChild(node,visit);}visit(pageSource);return value;}
  const publication={objectRef:'M:82',publicationHash:'publication',levels:Object.fromEntries(['OVERVIEW','MEDIUM','DETAIL'].map(level=>[level,{sha256:level,pixels:512,fieldDegrees:level==='DETAIL'?.0568888889:level==='MEDIUM'?.1137777778:.2275555556,bytes:100,downloadUrl:'/image.jpg'}]))};
  let state:SkyArtworkLoadState={images:new Map(),retainedImages:new Map(),failed:false,loading:false};
  let released=0,resets=0,gpuRetries=0,refetches=0;
  const starts:Array<{asset:SkyNativeImageAsset;ready:(loaded:{image:object;release():void})=>void;fail():void}>=[];
  let owner!:ReturnType<typeof createSkyArtworkLoader>;
  const hook=vm.runInNewContext(ts.transpileModule(progressiveDeclaration() + hookDeclaration.getText(hookSource).replace(/^export\s+/,'')+'\nuseSkySdssOptical;',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,{
    ...hookLifecycle(),useMemo:(read:()=>unknown)=>read(),sdssOpticalPublication,opticalPublicationReference,opticalAssetDimensions,isPreparedOpticalReference,skyTargetOpticalLevelForView,skyTargetOpticalIntersectsView,skyFixedImageStatus,sdssOpticalImageUrl:(url:string)=>url,
    getSdssOpticalManifest:async()=>publication,useResourceQuery:()=>({data:publication,isError:false,isFetching:false,refetch(){refetches++;}}),
    useSkyNativeImages:(_canvas:unknown,_revision:number,_hash:string,_active:boolean,wanted:SkyNativeImageAsset[],_resolve:unknown,byteBudget:number,retainedFallbackIds:readonly string[])=>{
      owner??=createSkyArtworkLoader({byteBudget,retainedFallbackIds,changed(value){state=value;},start(asset,ready,fail){starts.push({asset,ready,fail});return()=>{};}});
      owner.update(wanted);return {...state,failedImage:owner.failed,retryImages:owner.retry};},
  }) as typeof import('./use-sky-sdss-optical').useSkySdssOptical;
  const canvas={createImage(){throw Error('request and decode are represented by the shared loader boundary');}};
  const read=(fov=.05)=>hook('M:82',fov,canvas,1,true,undefined,samplingFootprint(fov,'M:82'));
  const ready=(index:number)=>{const image={level:starts[index]!.asset.id};starts[index]!.ready({image,release(){released++;}});return image;};
  read(.2);const medium=ready(0);assert.strictEqual(read(.2).image,medium);
  ready(1);read();starts[2]!.fail();assert.equal(read().updateFailed,true,"the real requested DETAIL failed, not a canceled old request");
  const scope:Record<string,unknown>={sdssOptical:read(),targetOpticalRetryRef:{current(){gpuRetries++;}},
    canvasLifecycle:{resize(){resets++;owner.dispose();state={images:new Map(),retainedImages:new Map(),loading:false,failed:false};}}};
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
  assert.equal(resets,0,'an image upload failure must not retire the independent medium and overview owners');
  assert.equal(gpuRetries,1,'the public action clears the optical shader latch in the current GPU owner');
  assert.equal(released,1,'only the failed detail bitmap is retired');
  assert.strictEqual(read().image,medium);
  const recovered=ready(5);assert.strictEqual(read().image,recovered);
  owner.dispose();assert.equal(released,4,'each accepted bitmap eventually retires exactly once');
});
