import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const source=ts.createSourceFile("spot-sky-page.tsx",readFileSync(new URL("./spot-sky-page.tsx",import.meta.url),"utf8"),
  ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
const expressions=new Map<string,ts.Expression>();
function visit(node:ts.Node){
  if(ts.isVariableDeclaration(node)&&node.initializer)expressions.set(node.name.getText(source),node.initializer);
  if(ts.isPropertyAssignment(node)&&node.name.getText(source)==="validateContext")expressions.set("validateContext",node.initializer);
  ts.forEachChild(node,visit);
}
visit(source);
function evaluate(name:string,bindings:object){const expression=expressions.get(name);assert(expression,name);
  return vm.runInNewContext(ts.transpileModule(`(${expression.getText(source)})`,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,bindings);
}

test("the actual Sources validator rejects replacement, context loss and backing-store changes without trusting a task node marker",()=>{
  let lost=false,ratio=2,throws=false;const gl={isContextLost:()=>lost};
  const node={width:780,height:1688,getContext(){if(throws)throw Error("native node gone");return gl;}};
  const validate=evaluate("validateContext",{canvasMeasurement:(m:unknown)=>m,canvasNodeRef:{current:node},canvasGlRef:{current:gl},
    Taro:{getWindowInfo:()=>({pixelRatio:ratio})}});
  assert.equal(validate({}, {node}, {width:390,height:844}),true);
  lost=true;assert.equal(validate({}, {node}, {width:390,height:844}),false);lost=false;
  assert.equal(validate({}, {node:{...node}}, {width:390,height:844}),false);
  ratio=3;assert.equal(validate({}, {node}, {width:390,height:844}),false);ratio=2;
  throws=true;assert.equal(validate({}, {node}, {width:390,height:844}),false);
});

test("the actual Sources navigator keeps only a successful hidden return and clears retention on failure",async()=>{
  for(const outcome of ["opened","failed-visible","failed-hidden"] as const){
    const opening={current:false},retained={current:false},viewport={current:true};let state=false,releases=0,notifications=0;
    const navigate=evaluate("openOpticalSources",{opticalSourcesOpeningRef:opening,sourceReturnRef:retained,
      orientationController:{snapshot:()=>({alignment:{mode:"auto"}})},
      canvasNodeRef:{current:{}},viewportActiveRef:viewport,setSourceReturn:(value:boolean)=>{state=value;},
      canvasLifecycle:{hide:()=>{releases++;}},notify:()=>{notifications++;},
      Taro:{async navigateTo(){if(outcome!=="failed-visible")viewport.current=false;if(outcome!=="opened")throw Error("route failed");}}});
    await navigate({sourceRoute:"/sky/sources/index?reference=M%3A82"});
    assert.equal(opening.current,false);assert.equal(retained.current,outcome==="opened");assert.equal(state,outcome==="opened");
    assert.equal(releases,outcome==="failed-hidden"?1:0);assert.equal(notifications,outcome==="opened"?0:1);
  }
});

test("a queued Sources callback checks latest calibration state before navigation or retention",async()=>{
  let editing=false,calls=0,retentionWrites=0;
  const opening={current:false},retained={current:false};
  const navigate=evaluate("openOpticalSources",{opticalSourcesOpeningRef:opening,sourceReturnRef:retained,
    orientationController:{snapshot:()=>({alignment:{mode:editing?"editing":"auto"}})},
    canvasNodeRef:{current:{}},viewportActiveRef:{current:true},setSourceReturn:()=>{retentionWrites++;},
    canvasLifecycle:{hide(){assert.fail("blocked action cannot release Canvas");}},notify(){assert.fail("blocked action cannot notify navigation error");},
    Taro:{async navigateTo(){calls++;}}});
  // The callback predates begin(), as a queued native tap can. React props are not the gate.
  editing=true;await navigate({sourceRoute:"/sky/sources/index?reference=M%3A82"});
  assert.equal(calls,0);assert.equal(retentionWrites,0);assert.equal(opening.current,false);assert.equal(retained.current,false);
  editing=false;await navigate({sourceRoute:"/sky/sources/index?reference=M%3A82"});assert.equal(calls,1);
});
