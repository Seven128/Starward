import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { skySceneHasContent } from "./sky-stellar-scene";
import { createSkyBrowsingCamera } from "./sky-browsing-camera";
const source=ts.createSourceFile("sky.tsx",readFileSync(new URL("./spot-sky-page.tsx",import.meta.url),"utf8"),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
function expression(name:string){let text="";function visit(node:ts.Node){if(ts.isVariableDeclaration(node)&&node.name.getText(source)===name)text=node.initializer!.getText(source);ts.forEachChild(node,visit);}visit(source);assert.ok(text);return text;}
function run(text:string,scope:Record<string,unknown>){return vm.runInNewContext(ts.transpileModule("("+text+");",{compilerOptions:{target:ts.ScriptTarget.ES2020}}).outputText,scope);}
test("static cold and refresh failure use floating info, with retry owned by the actual page",()=>{
 let effect="";function visit(node:ts.Node){if(ts.isCallExpression(node)&&node.expression.getText(source)==="useEffect"&&node.arguments[0]?.getText(source).includes('title: "星图资料加载异常"'))effect=node.arguments[0].getText(source);ts.forEachChild(node,visit);}visit(source);assert.ok(effect);
 for(const retained of [false,true]){
 const notifications:any[]=[];
 run(effect,{pageVisible:true,stellarReference:{catalogVersion:"v2",catalogHash:"hash"},stellarCatalog:{isFetching:false,isError:!retained,refreshError:retained?Error("offline"):undefined,data:retained?{dataState:"FRESH"}:undefined},notify:(n:unknown)=>notifications.push(n)})();
 assert.equal(notifications.length,1);assert.equal(notifications[0].placement,"floating");assert.equal(notifications[0].tone,"info");
 }
 let reports=0,stars=0;
 const retry=run(expression("retrySkyData"),{report:{refetch:()=>reports++},stellarReference:{},stellarCatalog:{refetch:()=>stars++}});
 retry();assert.equal(reports,1);assert.equal(stars,1);
});
test("missing stars do not disable touch entry for independently valid targets",()=>{
 const at="2026-09-19T13:00:00.000Z";
 const skySceneReady=skySceneHasContent({state:"UNAVAILABLE",frames:[]} as any,at,{at,targets:[{}]} as any);
 assert.equal(skySceneReady,true);
 const ref={current:null};
 const scope={orientationController:{snapshot:()=>({alignment:{mode:"automatic"}})},skySceneReady,
 browsingCamera:createSkyBrowsingCamera(),manualBasisRef:{current:null},
 presentedCenter:{x:195,y:390},
 selectedCatalogObject:null,selectedTargetId:null,orientationObjectListOpen:false,datePickerOpen:false,timeSaving:false,
 skyTouchPoint:()=>({x:100,y:100}),skyTouchDistance:()=>null,skyTapRef:ref,verticalFovDeg:45,currentViewBasis:{},INITIAL_MANUAL_SKY_VIEW:{},canvasSize:{width:390},manualBasis:null,followRequested:false,compassLifecycle:{active:false},sensorBasis:null};
 run(expression("onSkyTouchStart"),scope)({touches:[{}]});
 assert.ok(ref.current,"the actual page must allow the touch to enter its existing gesture lifecycle");
});

test("fulfilled stale constellation cache exposes the actual page retry without erasing retained art",()=>{
  const constellationCatalog={isError:false,refreshError:undefined,data:{dataState:"STALE_USABLE"},refetch:()=>{requests++;}};
  let requests=0,images=0,resets=0;
  const artwork={failed:false,retry:()=>images++};
  assert.equal(run(expression("constellationFailed"),{constellationsEnabled:true,artwork,constellationCatalog}),true);
  assert.equal(run(expression("constellationFailed"),{constellationsEnabled:false,artwork,constellationCatalog}),false);
  run(expression("retryConstellations"),{constellationCatalog,artwork,canvasLifecycle:{resize:()=>resets++}})();
  assert.equal(requests,1);assert.equal(images,0);assert.equal(resets,0);
  constellationCatalog.data.dataState="FRESH";artwork.failed=true;
  run(expression("retryConstellations"),{constellationCatalog,artwork,canvasLifecycle:{resize:()=>resets++}})();
  assert.equal(requests,2,"a missing old hash asset must refresh the immutable catalog too");
  assert.equal(resets,1,"explicit retry releases the failed shader/native-image owner");
  assert.equal(images,0,"do not restart old-image requests just before disposing their canvas");
});
