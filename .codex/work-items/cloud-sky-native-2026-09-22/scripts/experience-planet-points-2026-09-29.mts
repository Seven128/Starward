// Production GPU -> actual page commit/label functions with real public inputs.
// Headless WebGL and Node JSX functions do not certify WEAPP composition/phone.
import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import vm from "node:vm";
import ts from "typescript";
import { build } from "esbuild";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { projectAdoptedSkyCatalog } from "../../../../apps/wechat-miniapp/src/services/sky-report-catalog.ts";
import { attachSkyCatalog } from "../../../../apps/wechat-miniapp/src/features/sky/sky-stellar-scene.ts";
import { createSkyViewBasis } from "../../../../apps/wechat-miniapp/src/features/sky/sky-view-projection.ts";
import { projectSkyTarget } from "../../../../apps/wechat-miniapp/src/features/sky/sky-scene-projection.ts";
import { skyPlanetDiscsAt } from "../../../../apps/wechat-miniapp/src/features/sky/sky-planet-disc.ts";
import { skyStarAppearance } from "../../../../apps/wechat-miniapp/src/features/sky/sky-star-appearance.ts";
import { paintedSkyPointVisible, pickPaintedSkyObjects } from "../../../../apps/wechat-miniapp/src/features/sky/sky-object-picking.ts";
import * as bodyLabels from "../../../../apps/wechat-miniapp/src/features/sky/sky-body-label-presentation.ts";
import { fingerprintBundle } from "../../../../tools/miniapp/release-bundle-artifact.mjs";

const root=process.cwd(), stage=process.argv[2];
assert(["before","after"].includes(stage));
const item=path.join(root,".codex/work-items/cloud-sky-native-2026-09-22");
const output=path.join(root,`output/playwright/cloud-sky-planet-points-0929-${stage}`);
await assert.rejects(fs.access(output),{code:"ENOENT"});
await fs.mkdir(output,{recursive:true});
const digest=(bytes:Uint8Array|string)=>createHash("sha256").update(bytes).digest("hex");
const files=["sky-scene-render.ts","sky-object-picking.ts","sky-body-label-presentation.ts","spot-sky-page.tsx"];
const sourceHashes=[];
for(const [index,name]of files.entries()){
  const file="apps/wechat-miniapp/src/features/sky/"+name,bytes=await fs.readFile(path.join(root,file));
  sourceHashes.push({file,sha256:digest(bytes)});await fs.writeFile(path.join(output,`owner-${index}.${name.endsWith("tsx")?"tsx":"ts"}`),bytes,{flag:"wx"});
}
const candidate=JSON.parse(await fs.readFile(path.join(item,"evidence/experience-combined-clean-v23-candidate-2026-09-29.json"),"utf8"));
assert.equal((await fingerprintBundle(path.join(root,candidate.bundle))).sha256,candidate.fingerprint.sha256);
const ast=ts.createSourceFile("page.tsx",await fs.readFile(path.join(root,sourceHashes[3]!.file),"utf8"),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
const expressions:Record<string,string>={};let commit="";
function find(node:ts.Node){
  if(ts.isVariableDeclaration(node)&&node.initializer)expressions[node.name.getText(ast)]=node.initializer.getText(ast);
  if(ts.isCallExpression(node)&&node.expression.getText(ast)==="drawSkyScene")commit=node.arguments[8]!.getText(ast);
  ts.forEachChild(node,find);
}
find(ast);assert(commit&&expressions.visibleOrientationTargets&&expressions.presentedSceneCurrent);
const compile=(source:string)=>ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
const labelCode=compile(`const presentedSceneCurrent=${expressions.presentedSceneCurrent}; const presentedSkyVisibility=${expressions.presentedSkyVisibility}; ${expressions.visibleOrientationTargets};`);
const json=async(route:string,body?:unknown)=>{
  const response=await fetch("http://127.0.0.1:8791"+route,{signal:AbortSignal.timeout(10000),
    ...(body===undefined?{}:{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)})});
  assert([200,201].includes(response.status));return response.json();
};
const found=await json("/v2/places/search?q="+encodeURIComponent("示例观星点"));
const spot=found.data.formalSpots.find((entry:any)=>entry.name==="示例观星点");assert(spot);
const context=(await json("/v2/observation-contexts/resolve",{location:{kind:"FORMAL_SPOT",spotId:spot.spotId},localDate:"2026-09-28",selectedAt:"2026-09-28T16:00:00.000Z"})).data;
const raw=projectAdoptedSkyCatalog(await json(`/v2/spots/${encodeURIComponent(spot.spotId)}/sky?contextId=${encodeURIComponent(context.contextId)}&catalogVersion=bsc5p-bright-stars.v3`)).data;
const publication=(await json(`/v2/sky/catalogs/${raw.skyScene.catalog!.catalogVersion}/${raw.skyScene.catalog!.catalogHash}`)).data;
const report=attachSkyCatalog(raw,publication), width=390.4,height=844,center={x:width/2,y:height/2};
const day=report.hourly.find(row=>row.at==="2026-09-28T04:00:00.000Z")!;
const night=report.hourly.find(row=>row.at==="2026-09-28T16:00:00.000Z")!;
const twilight=report.hourly.find(row=>typeof row.sunAltitudeDeg==="number"&&row.sunAltitudeDeg>-12&&row.sunAltitudeDeg<0&&row.planets?.some(planet=>planet.altitudeDeg>0))!;
assert(day&&night&&twilight&&day.sunAltitudeDeg!>0&&night.sunAltitudeDeg!<-18);
const jupiter=day.planets!.find(planet=>planet.body==="JUPITER")!;assert(jupiter.altitudeDeg>0);
const jupiterBasis=createSkyViewBasis(jupiter.azimuthDeg,90+jupiter.altitudeDeg,0)!;
const zenith=createSkyViewBasis(0,180,0)!;
const noGeometry={...report,hourly:report.hourly.map(row=>row.at===day.at?{...row,planets:[]}:row)};
const scenarios=[
  {name:"night",at:night.at,basis:zenith,fov:267.8,mode:"NIGHT",report},
  {name:"day-dome",at:day.at,basis:zenith,fov:267.8,mode:"NIGHT",report},
  {name:"day-jupiter",at:day.at,basis:jupiterBasis,fov:85,mode:"NIGHT",report},
  {name:"twilight-dome",at:twilight.at,basis:zenith,fov:267.8,mode:"NIGHT",report},
  {name:"red-day-dome",at:day.at,basis:zenith,fov:267.8,mode:"OBSERVATION",report},
  {name:"resolved-day-jupiter",at:day.at,basis:jupiterBasis,fov:.2,mode:"NIGHT",report},
  {name:"unavailable-geometry",at:day.at,basis:jupiterBasis,fov:85,mode:"NIGHT",report:noGeometry},
  {name:"night-return",at:night.at,basis:zenith,fov:267.8,mode:"NIGHT",report},
];
const bundle=await build({stdin:{resolveDir:root,contents:"export {drawSkyScene} from './apps/wechat-miniapp/src/features/sky/sky-scene-render';export {createSkyGpuRenderer} from './apps/wechat-miniapp/src/features/sky/sky-gpu-renderer';"},bundle:true,write:false,metafile:true,platform:"browser",format:"iife",globalName:"planetPointScene",target:"es2022",tsconfig:path.join(root,"apps/wechat-miniapp/tsconfig.json")});
const gpuSourceHashes=await Promise.all(Object.keys(bundle.metafile!.inputs).filter(file=>file!=="<stdin>").map(async file=>({file,sha256:digest(await fs.readFile(path.join(root,file)))})));
await fs.writeFile(path.join(output,"production.js"),bundle.outputFiles[0]!.text,{flag:"wx"});
const {chromium}=createRequire(import.meta.url)("C:/Users/777/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const browser=await chromium.launch({headless:true,args:["--use-gl=angle","--use-angle=swiftshader"]}),rows:any[]=[];
try{
  const page=await browser.newPage({viewport:{width:390,height}});
  await page.setContent('<style>body{margin:0}canvas{display:block}</style><canvas width="390" height="844"></canvas>');
  await page.evaluate("globalThis.__name=target=>target");await page.addScriptTag({content:bundle.outputFiles[0]!.text});
  await page.evaluate(()=>{const gl=document.querySelector("canvas")!.getContext("webgl",{preserveDrawingBuffer:true,antialias:false})!;if(!gl)throw Error("missing actual WebGL");(globalThis as any).planetInputs={gl,renderer:(globalThis as any).planetPointScene.createSkyGpuRenderer(gl,1)};});
  for(const scenario of scenarios){
    const row=scenario.report.hourly.find(row=>row.at===scenario.at)!;
    const discs=skyPlanetDiscsAt(scenario.report.hourly,scenario.at,scenario.basis,width,height,scenario.fov,center)??[];
    const expectedSuppressed=discs.filter(disc=>disc.altitudeDeg>0&&disc.radiusPx<1.2&&
      (skyStarAppearance(disc.visualMagnitude,scenario.fov,scenario.mode==="OBSERVATION"?undefined:row.sunAltitudeDeg!,scenario.mode==="OBSERVATION"?undefined:disc.altitudeDeg)?.opacity??0)<.1).map(disc=>`PLANET:${disc.body}`);
    const painted=await page.evaluate(({scenario,width,height,center})=>{
      const input=(globalThis as any).planetInputs;let snapshot:any=null,sources:any=null;
      (globalThis as any).planetPointScene.drawSkyScene(input.renderer,scenario.report,scenario.at,null,null,width,height,scenario.mode,
        (value:any,credits:any)=>{snapshot=value;sources=credits;},undefined,scenario.fov,null,scenario.basis,center);
      input.gl.finish();const bytes=new Uint8Array(390*height*4);input.gl.readPixels(0,0,390,height,input.gl.RGBA,input.gl.UNSIGNED_BYTE,bytes);
      let binary="";for(let offset=0;offset<bytes.length;offset+=32768)binary+=String.fromCharCode(...bytes.subarray(offset,offset+32768));
      return {snapshot,sources,rgbaBase64:btoa(binary),error:input.gl.getError()};
    },{scenario,width,height,center});
    assert(painted.snapshot&&painted.error===0);
    let presented:any=null, presentedCamera:any=null;const hit={current:null as any};
    const frame={data:scenario.report,frameAt:scenario.at,mode:scenario.mode,sdssOpticalImage:null,deepSkyImage:null,constellations:null,constellationsEnabled:false};
    const commitFrame=vm.runInNewContext(compile(`(${commit});`),{frame,...bodyLabels,paintedSkyObjectsRef:hit,
      setPresentedSkyFrame:(update:any)=>{presented=update(presented);},setPresentedCamera:(update:any)=>{presentedCamera=update(presentedCamera);},
      camera:{animating:false},basis:scenario.basis,fov:scenario.fov,center});
    commitFrame(painted.snapshot,painted.sources);assert(presented&&presentedCamera);
    const targetFrame=scenario.report.targetFrames.find(target=>target.at===scenario.at)!;assert(targetFrame);
    const scope={...bodyLabels,orientationTargets:targetFrame.targets,projectSkyTarget,paintedSkyPointVisible,
      orientationData:scenario.report,reportData:scenario.report,row,mode:scenario.mode,canvasError:null,
      presentedSkyFrame:presented,currentViewBasis:presentedCamera.basis,presentedFov:presentedCamera.fov,presentedCenter:presentedCamera.center,
      canvasSize:{width,height},sensorHeadingForScene:null,devicePose:null};
    const labels=JSON.parse(JSON.stringify(vm.runInNewContext(labelCode,scope))) as any[];
    const empty=(change:any)=>JSON.parse(JSON.stringify(vm.runInNewContext(labelCode,{...scope,...change}))).length===0;
    assert(empty({row:{at:"2026-09-28T20:37:00.000Z"}}));assert(empty({mode:scenario.mode==="NIGHT"?"OBSERVATION":"NIGHT"}));assert(empty({canvasError:"test failed"}));
    const points=painted.snapshot.objects.filter((object:any)=>object.reference.startsWith("PLANET:"));
    const pickRows=points.map((object:any)=>({reference:object.reference,choices:pickPaintedSkyObjects(painted.snapshot,{x:object.x,y:object.y,frameAt:scenario.at,catalogVersion:painted.snapshot.catalogVersion,catalogHash:painted.snapshot.catalogHash}).map(choice=>choice.reference)}));
    await page.locator("canvas").screenshot({path:path.join(output,scenario.name+".png")});
    rows.push({name:scenario.name,at:scenario.at,sunAltitudeDeg:row.sunAltitudeDeg,mode:scenario.mode,fov:scenario.fov,basis:scenario.basis,
      rgbaSha256:digest(Buffer.from(painted.rgbaBase64,"base64")),paintedObjects:painted.snapshot.objects,planetPicks:pickRows,
      expectedSuppressed,actualSuppressed:painted.snapshot.suppressedBodyReferences??[],presentedSuppressed:presented.suppressedBodyReferences??[],
      targetLabels:labels.map(label=>({targetId:label.target.targetId,x:label.projection.x,y:label.projection.y})),
      noSuppressedPick:expectedSuppressed.every(reference=>!points.some((point:any)=>point.reference===reference)),
      noSuppressedLabel:expectedSuppressed.every(reference=>!labels.some(label=>`PLANET:${label.target.targetId.slice(7).toUpperCase()}`===reference)),
      lateFrameSuppressed:true,oldModeSuppressed:true,failedCanvasSuppressed:true,error:painted.error});
  }
  await page.evaluate(()=>(globalThis as any).planetInputs.renderer.dispose());
}finally{await browser.close();}
assert.equal(rows[0].rgbaSha256,rows.at(-1).rgbaSha256);
const useful=rows.every(row=>row.noSuppressedPick&&row.noSuppressedLabel);
await fs.writeFile(path.join(output,"result.json"),JSON.stringify({scope:"Actual public inputs, current production GPU and actual page commit/target-label functions in Node. Controlled absent-geometry case; not native composition/phone/full journey/performance.",stage,
  observer:{wgs84:spot.wgs84,timezone:spot.timezone},catalogHash:publication.catalogHash,logicalCanvas:{width,height},backing:{width:390,height},
  unchangedUnopenedCandidate:candidate.fingerprint.sha256,sourceHashes,gpuSourceHashes,sourceBundleSha256:digest(bundle.outputFiles[0]!.text),
  labelFunctionSha256:digest(expressions.visibleOrientationTargets),commitFunctionSha256:digest(commit),useful,rows},null,2)+"\n",{flag:"wx"});
console.log(JSON.stringify({stage,useful,rows:rows.map(row=>({name:row.name,sun:row.sunAltitudeDeg,planets:row.planetPicks.map((pick:any)=>pick.reference),suppressed:row.expectedSuppressed,targetLabels:row.targetLabels.map((label:any)=>label.targetId),error:row.error}))}));
assert(useful,"unresolved planetary picks and labels must follow the same solar/low-sky appearance as stars");
