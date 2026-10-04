// Actual local report/catalog -> production GPU completed frame -> actual page
// commit/label/component/select functions. The Node JSX adapter is not native UI.
import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import vm from "node:vm";
import ts from "typescript";
import { build } from "esbuild";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import * as stellar from "../../../../apps/wechat-miniapp/src/features/sky/sky-stellar-scene.ts";
import { projectAdoptedSkyCatalog } from "../../../../apps/wechat-miniapp/src/services/sky-report-catalog.ts";
import { exactSkyTimeFrame } from "../../../../apps/wechat-miniapp/src/features/sky/sky-time-frame.ts";
import { projectHorizontalPoint } from "../../../../apps/wechat-miniapp/src/features/sky/sky-scene-projection.ts";
import { createSkyViewBasis } from "../../../../apps/wechat-miniapp/src/features/sky/sky-view-projection.ts";
import { skyStarAppearance } from "../../../../apps/wechat-miniapp/src/features/sky/sky-star-appearance.ts";
import { paintedSkyPointVisible, skyObjectKindLabel, skyObjectMagnitudeLabel, pickPaintedSkyObjects } from "../../../../apps/wechat-miniapp/src/features/sky/sky-object-picking.ts";
import { resolvedSkyBodyReferences } from "../../../../apps/wechat-miniapp/src/features/sky/sky-body-label-presentation.ts";
import * as contracts from "@starward/miniapp-contracts";
import { fingerprintBundle } from "../../../../tools/miniapp/release-bundle-artifact.mjs";

const root=process.cwd(),item=path.join(root,".codex/work-items/cloud-sky-native-2026-09-22"),stage=process.argv[2]??"after";
assert(["before","before-verified","after","list-consumers"].includes(stage));
const output=path.join(root,`output/playwright/cloud-sky-independent-labels-0929-${stage}`);
await assert.rejects(fs.access(path.join(output,"result.json")),{code:"ENOENT"});await fs.mkdir(output,{recursive:true});
const digest=(bytes:string|Uint8Array)=>createHash("sha256").update(bytes).digest("hex");
const files=["apps/wechat-miniapp/src/features/sky/sky-stellar-scene.ts","apps/wechat-miniapp/src/features/sky/sky-scene-render.ts","apps/wechat-miniapp/src/features/sky/spot-sky-page.tsx"];
const sourceHashes=await Promise.all(files.map(async(file,index)=>{
  const text=await fs.readFile(path.join(root,file),"utf8");
  await fs.writeFile(path.join(output,`owner-${index}.${file.endsWith("tsx")?"tsx":"ts"}`),text,{flag:"wx"});return {file,sha256:digest(text)};
}));
const candidate=JSON.parse(await fs.readFile(path.join(item,"evidence/experience-combined-clean-v22-candidate-2026-09-29.json"),"utf8"));
assert.equal((await fingerprintBundle(path.join(root,candidate.bundle))).sha256,candidate.fingerprint.sha256);
const ast=ts.createSourceFile("page.tsx",await fs.readFile(path.join(root,files[2]! ),"utf8"),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
function expression(name:string){let found:ts.Expression|undefined;function visit(node:ts.Node){if(ts.isVariableDeclaration(node)&&node.name.getText(ast)===name)found=node.initializer;ts.forEachChild(node,visit);}visit(ast);assert(found,name);return found.getText(ast);}
function declaration(name:string){const node=ast.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text===name);assert(node,name);return node.getText(ast);}
let commit="";function findCommit(node:ts.Node){if(ts.isCallExpression(node)&&node.expression.getText(ast)==="drawSkyScene")commit=node.arguments[8]!.getText(ast);ts.forEachChild(node,findCommit);}findCommit(ast);assert(commit);
const compile=(source:string)=>ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
const labelSelection=compile(["presentedSceneCurrent","presentedSkyVisibility","visibleNamedCatalogObjects","visibleNamedLabels"].map(name=>`const ${name}=${expression(name)};`).join("\n")+"visibleNamedLabels;");
const componentText=declaration("SkyOrientationCatalogLabel"),componentExports:any={};
vm.runInNewContext(compile(componentText+"\nexports.label=SkyOrientationCatalogLabel;"),{exports:componentExports,require:(name:string)=>{
  assert.equal(name,"react/jsx-runtime");return {jsx:(type:unknown,props:unknown)=>({type,props}),jsxs:(type:unknown,props:unknown)=>({type,props})};
},Button:"Button",View:"View",Text:"Text",skyObjectKindLabel,skyObjectMagnitudeLabel});
const origin="http://127.0.0.1:8791";
const json=async(relative:string,body?:unknown)=>{const response=await fetch(origin+relative,{signal:AbortSignal.timeout(10000),...(body===undefined?{}:{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)})});assert([200,201].includes(response.status));return response.json();};
const spots=await json("/v2/places/search?q="+encodeURIComponent("示例观星点"));
const spot=spots.data.formalSpots.find((entry:any)=>entry.name==="示例观星点");assert(spot);
const at="2026-09-28T20:00:00.000Z";
const context=(await json("/v2/observation-contexts/resolve",{location:{kind:"FORMAL_SPOT",spotId:spot.spotId},localDate:"2026-09-28",selectedAt:at})).data;
const raw=projectAdoptedSkyCatalog(await json(`/v2/spots/${encodeURIComponent(spot.spotId)}/sky?contextId=${encodeURIComponent(context.contextId)}&catalogVersion=bsc5p-bright-stars.v3`)).data;
const reference=raw.skyScene.catalog!;const publication=(await json(`/v2/sky/catalogs/${reference.catalogVersion}/${reference.catalogHash}`)).data;
const complete=stellar.attachSkyCatalog(raw,publication),missing=stellar.attachSkyCatalog(raw,undefined);
assert.equal(missing.skyScene.state,"UNAVAILABLE");assert.strictEqual(missing.skyScene.deepSky,raw.skyScene.deepSky);
const deep=complete.skyScene.deepSky!,pointIndex=deep.catalog!.entries.findIndex(entry=>entry.objectRef==="M:42");
const point=exactSkyTimeFrame(deep.frames,at)!.points!.find(point=>point[0]===pointIndex)!;assert(point&&point[2]>0);
const basis=createSkyViewBasis(point[1],90+point[2],0)!,width=390.4,height=844,fov=25,center={x:width/2,y:height/2};
const unavailableFrame={...complete,skyScene:{...complete.skyScene,frames:complete.skyScene.frames.map(frame=>frame.at===at?{...frame,state:"UNAVAILABLE" as const,geometry:null}:frame)}};
const deepUnavailable={...complete,skyScene:{...complete.skyScene,deepSky:{...deep,state:"UNAVAILABLE" as const,catalog:null,unavailableReason:"test unavailable",frames:deep.frames.map(frame=>({...frame,state:"UNAVAILABLE" as const,points:null}))}}};
const scenarios=[{name:"complete",report:complete},{name:"bright-catalog-missing",report:missing},{name:"bright-frame-unavailable",report:unavailableFrame},
  {name:"deep-layer-unavailable",report:deepUnavailable},{name:"restored",report:complete}];
if(stage==="list-consumers"){
  const oldAst=ts.createSourceFile("old.tsx",await fs.readFile(path.join(root,"output/playwright/cloud-sky-independent-labels-0929-before-verified/owner-2.tsx"),"utf8"),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  let oldExpression="";function findOld(node:ts.Node){if(ts.isVariableDeclaration(node)&&node.name.getText(oldAst)==="catalogFrameObjects")oldExpression=node.initializer!.getText(oldAst);ts.forEachChild(node,findOld);}findOld(oldAst);assert(oldExpression);
  const rows=scenarios.map(scenario=>{
    const scope={...contracts,reportData:scenario.report,row:exactSkyTimeFrame(scenario.report.hourly,at),orientationObjectListOpen:true,
      currentViewBasis:basis,stellarSupplement:{frame:null},presentedFov:fov,presentedCenter:center,canvasSize:{width,height},sensorHeadingForScene:null,devicePose:null,
      projectHorizontalPoint,skyStarAppearance,resolveSkySceneFrame:stellar.resolveSkySceneFrame,resolveSkyDeepSkyScene:(stellar as any).resolveSkyDeepSkyScene,exactSkyTimeFrame};
    const evaluate=(text:string)=>JSON.parse(JSON.stringify(vm.runInNewContext(compile(`(${text});`),scope))) as any[];
    const previous=evaluate(oldExpression),current=evaluate(expression("catalogFrameObjects"));assert.deepEqual(current,previous);
    if(scenario.name.startsWith("bright-"))assert(current.some(object=>object.reference==="M:42"));
    if(scenario.name==="deep-layer-unavailable")assert(current.some(object=>object.reference.startsWith("HR:"))&&!current.some(object=>object.reference.startsWith("M:")));
    return {name:scenario.name,total:current.length,identical:true,counts:Object.fromEntries(["HR:","M:","PLANET:","SOLAR:"].map(prefix=>[prefix,current.filter(object=>object.reference.startsWith(prefix)).length])),
      m42Retained:current.some(object=>object.reference==="M:42")};
  });
  const unknown=(stellar as any).resolveSkyDeepSkyScene(complete.skyScene,"2026-09-28T20:37:00.000Z");
  assert.strictEqual(unknown.catalog,complete.skyScene.deepSky!.catalog);assert.equal(unknown.frame,undefined);
  await fs.writeFile(path.join(output,"result.json"),JSON.stringify({scope:"Actual public report/publication and actual before/current object-list functions in Node. No native list composition, SAO supplement, gesture or whole-journey acceptance.",
    stage,catalogHash:publication.catalogHash,deepCatalogHash:deep.catalog!.catalogHash,sourceHashes,rows,staticCatalogRetainedWithoutBorrowedFrame:true},null,2)+"\n",{flag:"wx"});
  console.log(JSON.stringify({stage,rows,staticCatalogRetainedWithoutBorrowedFrame:true}));process.exit(0);
}
const bundle=await build({stdin:{resolveDir:root,contents:`export {createSkyGpuRenderer} from './apps/wechat-miniapp/src/features/sky/sky-gpu-renderer';export {drawSkyScene} from './apps/wechat-miniapp/src/features/sky/sky-scene-render';`},bundle:true,write:false,metafile:true,platform:"browser",format:"iife",globalName:"independentSky",target:"es2022",tsconfig:path.join(root,"apps/wechat-miniapp/tsconfig.json")});
const gpuSourceHashes=await Promise.all(Object.keys(bundle.metafile!.inputs).filter(file=>file!=="<stdin>").map(async file=>({file,sha256:digest(await fs.readFile(path.join(root,file)))})));
await fs.writeFile(path.join(output,"production.js"),bundle.outputFiles[0]!.text,{flag:"wx"});
const {chromium}=createRequire(import.meta.url)("C:/Users/777/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const browser=await chromium.launch({headless:true,args:["--use-gl=angle","--use-angle=swiftshader"]}),rows:any[]=[];
try{
  const page=await browser.newPage({viewport:{width:390,height}});await page.setContent('<style>body{margin:0}canvas{display:block}</style><canvas width="390" height="844"></canvas>');
  await page.evaluate("globalThis.__name=target=>target");await page.addScriptTag({content:bundle.outputFiles[0]!.text});
  await page.evaluate(()=>{const gl=document.querySelector("canvas")!.getContext("webgl",{preserveDrawingBuffer:true,antialias:false})!;if(!gl)throw Error("software_webgl_missing");(globalThis as any).independentInputs={gl,renderer:(globalThis as any).independentSky.createSkyGpuRenderer(gl,1)};});
  for(const scenario of scenarios){
    const targetFrame=exactSkyTimeFrame(scenario.report.targetFrames,at)!;
    const ready=stellar.skySceneHasContent(scenario.report.skyScene,at,targetFrame);assert(ready);
    const painted=await page.evaluate(({report,at,basis,width,height,fov,center})=>{
      const inputs=(globalThis as any).independentInputs;let snapshot:any=null,sources:any=null;
      const args:any[]=[inputs.renderer,report,at,null,null,width,height,"NIGHT",(value:any,painted:any)=>{snapshot=value;sources=painted;},undefined,fov,null,basis,center];
      args[34]={enabled:true};(globalThis as any).independentSky.drawSkyScene(...args);inputs.gl.finish();
      const pixels=new Uint8Array(390*height*4);inputs.gl.readPixels(0,0,390,height,inputs.gl.RGBA,inputs.gl.UNSIGNED_BYTE,pixels);
      let binary="";for(let offset=0;offset<pixels.length;offset+=32768)binary+=String.fromCharCode(...pixels.subarray(offset,offset+32768));
      return {snapshot,sources,error:inputs.gl.getError(),rgbaBase64:btoa(binary)};
    },{report:scenario.report,at,basis,width,height,fov,center});
    assert.equal(painted.error,0);assert(painted.snapshot?.objects.length);
    let presented:any=null;const hit={current:null as any};let presentedCamera:any=null;
    const frame={data:scenario.report,frameAt:at,mode:"NIGHT",deepSkyImage:null,sdssOpticalImage:null,constellations:null,constellationsEnabled:false};
    const commitFrame=vm.runInNewContext(compile(`(${commit});`),{frame,resolvedSkyBodyReferences,paintedSkyObjectsRef:hit,
      setPresentedSkyFrame:(update:any)=>{presented=update(presented);},setPresentedCamera:(update:any)=>{presentedCamera=update(presentedCamera);},
      camera:{animating:false},basis,fov,center});
    commitFrame(painted.snapshot,painted.sources);assert(presented&&presentedCamera);
    const scope={reportData:scenario.report,orientationData:scenario.report,presentedSkyFrame:presented,row:{at},mode:"NIGHT",canvasError:null,
      currentViewBasis:presentedCamera.basis,canvasSize:{width,height},presentedFov:presentedCamera.fov,presentedCenter:presentedCamera.center,
      sensorHeadingForScene:null,devicePose:null,starSunAltitudeDeg:exactSkyTimeFrame(scenario.report.hourly,at)!.sunAltitudeDeg,
      skyStarAppearance,paintedSkyPointVisible,resolveSkySceneFrame:stellar.resolveSkySceneFrame,
      resolveSkyDeepSkyScene:(stellar as any).resolveSkyDeepSkyScene,exactSkyTimeFrame,projectHorizontalPoint,skySceneReady:ready};
    const labels=Array.from(vm.runInNewContext(labelSelection,scope) as any[]);
    let selected:any=null;const events:any[]=[];
    const select=vm.runInNewContext(compile(`(${expression("selectCatalogObject")});`),{orientationController:{snapshot:()=>({alignment:{mode:"manual"}})},
      setSelectedTargetId:(value:any)=>events.push(["target",value]),setCatalogPickChoices:(value:any)=>events.push(["choices",value]),setSelectedCatalogObject:(value:any)=>{selected=value;}});
    const controls=labels.map(object=>{const node=componentExports.label({object,onSelect:select,disabled:false});assert.equal(node.type,"Button");node.props.onClick();assert.strictEqual(selected,object);
      return {reference:object.reference,x:object.x,y:object.y,ariaLabel:node.props.ariaLabel,style:node.props.style,selectedReference:selected.reference};});
    const empty=(change:any)=>Array.from(vm.runInNewContext(labelSelection,{...scope,...change}) as any[]).length===0;
    assert(empty({row:{at:"2026-09-28T21:00:00.000Z"}}));assert(empty({mode:"OBSERVATION"}));assert(empty({canvasError:"test failed"}));
    const m42=painted.snapshot.objects.find((object:any)=>object.reference==="M:42");
    const picks=m42?pickPaintedSkyObjects(painted.snapshot,{x:m42.x,y:m42.y,frameAt:at,catalogVersion:painted.snapshot.catalogVersion,catalogHash:painted.snapshot.catalogHash}).map(object=>object.reference):[];
    await page.locator("canvas").screenshot({path:path.join(output,scenario.name+".png")});
    rows.push({name:scenario.name,ready,error:painted.error,rgbaSha256:digest(Buffer.from(painted.rgbaBase64,"base64")),paintedObjects:painted.snapshot.objects.map((object:any)=>({reference:object.reference,x:object.x,y:object.y})),
      controls,m42Picks:picks,lateFrameSuppressed:true,oldModeSuppressed:true,failedCanvasSuppressed:true,selectEvents:events});
  }
  await page.evaluate(()=>{(globalThis as any).independentInputs.renderer.dispose();});
}finally{await browser.close();}
assert.equal(rows[0].rgbaSha256,rows.at(-1).rgbaSha256);assert.equal(JSON.stringify(rows[0].controls),JSON.stringify(rows.at(-1).controls));
const useful=rows.filter(row=>row.name.startsWith("bright-")).every(row=>row.controls.some((control:any)=>control.reference==="M:42")&&row.m42Picks.includes("M:42"));
const record={scope:"Actual published local data and production GPU completed frames, actual page commit/select/component functions through Node adapter. Layer-unavailable states are controlled owner inputs; no real offline transport, native control composition, gesture/Back, phone or full journey acceptance.",stage,
  observer:{name:spot.name,wgs84:spot.wgs84,timezone:spot.timezone},at,fov,basis,logicalCanvas:{width,height},backing:{width:390,height},
  catalogHash:publication.catalogHash,deepCatalogHash:deep.catalog!.catalogHash,unchangedUnopenedCandidate:candidate.fingerprint.sha256,
  sourceHashes,gpuSourceHashes,sourceBundleSha256:digest(bundle.outputFiles[0]!.text),componentFunctionSha256:digest(componentText),selectionFunctionSha256:digest(expression("selectCatalogObject")),
  commitSha256:digest(commit),useful,rows};
await fs.writeFile(path.join(output,"result.json"),JSON.stringify(record,null,2)+"\n",{flag:"wx"});
console.log(JSON.stringify({stage,useful,rows:rows.map(row=>({name:row.name,painted:row.paintedObjects.length,controls:row.controls.map((control:any)=>control.reference),m42Picks:row.m42Picks,error:row.error}))}));
assert(useful,"independently painted deep-sky objects must retain their usable names during bright-layer failure");
