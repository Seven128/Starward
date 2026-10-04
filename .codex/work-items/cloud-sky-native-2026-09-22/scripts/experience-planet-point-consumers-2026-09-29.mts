import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import vm from "node:vm";
import ts from "typescript";
import { createHash } from "node:crypto";
import * as contracts from "@starward/miniapp-contracts";
import * as stellar from "../../../../apps/wechat-miniapp/src/features/sky/sky-stellar-scene.ts";
import { projectAdoptedSkyCatalog } from "../../../../apps/wechat-miniapp/src/services/sky-report-catalog.ts";
import { skyStarAppearance } from "../../../../apps/wechat-miniapp/src/features/sky/sky-star-appearance.ts";
import { exactSkyTimeFrame } from "../../../../apps/wechat-miniapp/src/features/sky/sky-time-frame.ts";
import { projectHorizontalPoint } from "../../../../apps/wechat-miniapp/src/features/sky/sky-scene-projection.ts";
import { projectSkyDirection } from "../../../../apps/wechat-miniapp/src/features/sky/sky-view-projection.ts";
import { locatedBodyOccludesMarker } from "../../../../apps/wechat-miniapp/src/features/sky/sky-located-object.ts";
import { paintedSkyPointVisible } from "../../../../apps/wechat-miniapp/src/features/sky/sky-object-picking.ts";

const root=process.cwd(),item=path.join(root,".codex/work-items/cloud-sky-native-2026-09-22");
const output=path.join(root,"output/playwright/cloud-sky-planet-point-consumers-0929");
await assert.rejects(fs.access(output),{code:"ENOENT"});await fs.mkdir(output,{recursive:true});
const digest=(text:string)=>createHash("sha256").update(text).digest("hex");
const parse=(text:string)=>ts.createSourceFile("page.tsx",text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
const currentText=await fs.readFile(path.join(root,"apps/wechat-miniapp/src/features/sky/spot-sky-page.tsx"),"utf8");
const beforeText=await fs.readFile(path.join(root,"output/playwright/cloud-sky-planet-points-0929-before/owner-3.tsx"),"utf8");
function extract(ast:ts.SourceFile){
  const expressions:Record<string,string>={},functions:Record<string,string>={};let located="";
  function visit(node:ts.Node){
    if(ts.isVariableDeclaration(node)&&node.initializer)expressions[node.name.getText(ast)]=node.initializer.getText(ast);
    if(ts.isFunctionDeclaration(node)&&node.name)functions[node.name.text]=node.getText(ast);
    if(ts.isJsxExpression(node)&&node.expression&&ts.isConditionalExpression(node.expression)&&node.expression.condition.getText(ast).includes("locatedObject.data.position"))located=node.expression.getText(ast);
    ts.forEachChild(node,visit);
  }
  visit(ast);return {expressions,functions,located};
}
const current=extract(parse(currentText)),before=extract(parse(beforeText));
assert.equal(current.located,before.located);assert(current.located);
assert.equal(current.expressions.catalogFrameObjects,before.expressions.catalogFrameObjects);
for(const name of ["SkyOrientationTargetLabel","skyTargetWindowLabel"])assert.equal(current.functions[name],before.functions[name]);
const compile=(text:string)=>ts.transpileModule(text,{compilerOptions:{target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.React,jsxFactory:"h"}}).outputText;
const h=(type:any,props:any,...children:any[])=>({type,props:props??{},children});
const component=vm.runInNewContext(compile(`const TARGET_TYPE_LABEL=${current.expressions.TARGET_TYPE_LABEL}; ${current.functions.skyTargetWindowLabel}\n${current.functions.SkyOrientationTargetLabel}\nSkyOrientationTargetLabel;`),{h,Button:"Button",Text:"Text",View:"View"});
const json=async(route:string,body?:unknown)=>{const response=await fetch("http://127.0.0.1:8791"+route,{signal:AbortSignal.timeout(10000),...(body===undefined?{}:{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)})});assert([200,201].includes(response.status));return response.json();};
const search=await json("/v2/places/search?q="+encodeURIComponent("示例观星点")),spot=search.data.formalSpots.find((entry:any)=>entry.name==="示例观星点");assert(spot);
const context=(await json("/v2/observation-contexts/resolve",{location:{kind:"FORMAL_SPOT",spotId:spot.spotId},localDate:"2026-09-28",selectedAt:"2026-09-28T16:00:00.000Z"})).data;
const raw=projectAdoptedSkyCatalog(await json(`/v2/spots/${encodeURIComponent(spot.spotId)}/sky?contextId=${encodeURIComponent(context.contextId)}&catalogVersion=bsc5p-bright-stars.v3`)).data;
const publication=(await json(`/v2/sky/catalogs/${raw.skyScene.catalog!.catalogVersion}/${raw.skyScene.catalog!.catalogHash}`)).data;
const report=stellar.attachSkyCatalog(raw,publication);
const scene=JSON.parse(await fs.readFile(path.join(root,"output/playwright/cloud-sky-planet-points-0929-after/result.json"),"utf8"));
assert.equal(scene.sourceHashes[3].sha256,digest(currentText));assert.equal(scene.catalogHash,publication.catalogHash);
const controls=[];
for(const rendered of scene.rows){
  const targetFrame=report.targetFrames.find(frame=>frame.at===rendered.at)!;
  for(const label of rendered.targetLabels){
    const target=targetFrame.targets.find(target=>target.targetId===label.targetId)!;assert(target);
    let selected:any=null;
    const node=component({target,projection:{x:label.x,y:label.y,altitude:target.altitudeDeg},width:390.4,height:844,timezone:spot.timezone,disabled:false,onSelect:(value:any)=>{selected=value;}});
    assert.equal(node.type,"Button");assert.equal(node.props["data-target-id"],target.targetId);assert(node.props.ariaLabel.includes(target.displayName));node.props.onClick();assert.strictEqual(selected,target);
    controls.push({scene:rendered.name,targetId:target.targetId,selectedTargetId:selected.targetId,ariaLabel:node.props.ariaLabel,style:node.props.style});
  }
}
assert(controls.some(control=>control.scene==="day-dome"&&control.targetId==="target:venus"));
assert(controls.some(control=>control.scene==="unavailable-geometry"&&control.targetId==="target:jupiter"));
const day=scene.rows.find((row:any)=>row.name==="day-jupiter")!,row=report.hourly.find(row=>row.at===day.at)!;
const scope={...contracts,reportData:report,row,orientationObjectListOpen:true,currentViewBasis:day.basis,presentedFov:day.fov,presentedCenter:{x:195.2,y:422},
  canvasSize:{width:390.4,height:844},stellarSupplement:{frame:null},sensorHeadingForScene:null,devicePose:null,...stellar,projectHorizontalPoint,skyStarAppearance,exactSkyTimeFrame};
const objects=JSON.parse(JSON.stringify(vm.runInNewContext(compile(`(${current.expressions.catalogFrameObjects});`),scope))) as any[];
const planetReferences=objects.filter(object=>object.kind==="PLANET").map(object=>object.reference);
for(const reference of ["PLANET:MERCURY","PLANET:VENUS","PLANET:MARS","PLANET:JUPITER"])assert(planetReferences.includes(reference));
const jupiter=row.planets!.find(planet=>planet.body==="JUPITER")!;const object=objects.find(object=>object.reference==="PLANET:JUPITER")!;let selectedLocated:any=null;
const marker=vm.runInNewContext(compile(`(${current.located});`),{h,Button:"Button",Text:"Text",View:"View",...scope,
  presentedSceneCurrent:true,alignmentEditing:false,locatedObject:{object,data:{reference:object.reference,position:{azimuthDeg:jupiter.azimuthDeg,altitudeDeg:jupiter.altitudeDeg}}},
  skyObjectPositionIsCurrent:()=>true,positionCatalog:()=>undefined,projectSkyDirection,locatedBodyOccludesMarker,
  presentedSkyVisibility:{width:390.4,height:844,view:{basis:day.basis,verticalFovDeg:day.fov,center:{x:195.2,y:422},landscape:null}},
  paintedSkyPointVisible,selectCatalogObject:(value:any)=>{selectedLocated=value;}});
assert.equal(marker.type,"Button");assert(marker.props.ariaLabel.includes(object.displayName));marker.props.onClick();assert.strictEqual(selectedLocated,object);
const result={scope:"Actual target component, object-list and located JSX functions in Node, using real public report. Located position validation is a controlled positive fixture; no new position HTTP, native list/touch/modal/Back/full-journey acceptance. No supplemental SAO in this check.",
  pageSha256:digest(currentText),componentSha256:digest(current.functions.SkyOrientationTargetLabel),componentUnchanged:true,listExpressionUnchanged:true,locatedExpressionUnchanged:true,
  controls,dayPlanetList:planetReferences,locatedJupiter:{ariaLabel:marker.props.ariaLabel,selectedReference:selectedLocated.reference,style:marker.props.style},
  meaningful:"Deliberately suppressed automatic Jupiter point/label remains discoverable in the actual list and as an explicit located guide; daylight Venus and missing-geometry target controls retain their own identity."};
await fs.writeFile(path.join(output,"result.json"),JSON.stringify(result,null,2)+"\n",{flag:"wx"});
console.log(JSON.stringify({controls:controls.length,dayPlanetList:planetReferences,locatedReference:selectedLocated.reference,componentUnchanged:true,listUnchanged:true,locatedUnchanged:true}));
