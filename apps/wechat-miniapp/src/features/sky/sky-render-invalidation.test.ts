import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
const source=ts.createSourceFile("spot-sky-page.tsx",readFileSync(new URL("./spot-sky-page.tsx",import.meta.url),"utf8"),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
let expression:ts.CallExpression|undefined;
function visit(node:ts.Node){if(ts.isVariableDeclaration(node)&&node.name.getText(source)==="draw"&&node.initializer&&ts.isCallExpression(node.initializer))expression=node.initializer;ts.forEachChild(node,visit);}visit(source);assert(expression);
const basis={right:[1,0,0],up:[0,1,0],forward:[0,0,1]};
function setup(){const scope:Record<string,any>={};for(const e of (expression!.arguments[1] as ts.ArrayLiteralExpression).elements){const keys=e.getText(source).replaceAll("?.",".").split(".");let value=scope;for(const k of keys.slice(0,-1))value=value[k]??={};value[keys.at(-1)!]??={};}
let previous:any[]|undefined,cached:Function|undefined;const pose={basis,headingDeg:0,sampledAt:1,alphaDeg:0,betaDeg:0,gammaDeg:0};const frames:any[]=[];
Object.assign(scope,{devicePose:pose,sensorBasis:basis,sensorHeadingForScene:0,manualBasis:null,mode:"DAY",desiredDeepSkyImageLevel:null,reportData:{},row:{at:"2026-10-06T13:00:00Z"},report:{data:{dataState:"CURRENT"},isError:false},orientation:{snapshot:{presentationRevision:1},latestPresentation:{current:{pose}}},canvasLifecycle:{request:(frame:any)=>frames.push(frame)},canvasFrameInfo:{inspection:{}},skySceneInspectionOwnerRef:{current:null},canvasDrawRevisionRef:{current:0},manualBasisRef:{current:null},previousCanvasModeRef:{current:"DAY"},publishAcceptanceSkySceneInspection:()=>{},skySceneHasContent:()=>true,skyTargetOpticalFrame:()=>null,useCallback:(fn:Function,deps:any[])=>{if(!previous||deps.some((v,i)=>!Object.is(v,previous![i]))){cached=fn;previous=deps;}return cached;}});
const context=vm.createContext(scope),compiled=ts.transpileModule(expression!.getText(source),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;return{scope,frames,render:()=>vm.runInContext(compiled,context)};}
test("actual draw callback is not invalidated by a fresh raw timestamp with the same rendered basis",()=>{const h=setup(),first=h.render();h.scope.devicePose={...h.scope.devicePose,sampledAt:2};h.scope.orientation.latestPresentation.current={pose:h.scope.devicePose};assert.equal(h.render(),first);for(const change of [()=>h.scope.sensorBasis=null,()=>h.scope.orientation.snapshot.presentationRevision++,()=>h.scope.row.at="2026-10-06T14:00:00Z",()=>h.scope.hipsTiles=[],()=>h.scope.galacticImage.image={}]){const before=h.render();change();assert.notEqual(h.render(),before);}});
test("a retained actual draw callback reads the newest presentation pose rather than its old render pose",()=>{const h=setup(),callback=h.render(),latest={...h.scope.devicePose,sampledAt:10};h.scope.orientation.latestPresentation.current={pose:latest};callback();assert.equal(h.frames.at(-1).pose,latest);h.scope.orientation.latestPresentation.current={pose:null};callback();assert.equal(h.frames.at(-1).pose,null);});

test("actual page basis memo reuses exact copies and invalidates every axis component or pose loss",()=>{
  let memo:ts.Expression|undefined;
  const find=(n:ts.Node)=>{if(ts.isVariableDeclaration(n)&&n.name.getText(source)==="sensorBasis")memo=n.initializer;ts.forEachChild(n,find);};find(source);assert(memo);
  let previous:any[]|undefined,cached:any;
  const scope={devicePose:{basis:structuredClone(basis)} as {basis:typeof basis}|null,useMemo:(fn:Function,deps:any[])=>{if(!previous||deps.some((v,i)=>!Object.is(v,previous![i]))){cached=fn();previous=deps;}return cached;}};
  const context=vm.createContext(scope),compiled=ts.transpileModule(memo.getText(source),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,render=()=>vm.runInContext(compiled,context),initial=render();
  scope.devicePose={basis:structuredClone(basis)};assert.equal(render(),initial);
  for(const axis of ["right","up","forward"] as const)for(const index of [0,1,2]){scope.devicePose={basis:structuredClone(basis)};const before=render(),next=structuredClone(basis);next[axis][index]!+=Number.EPSILON;scope.devicePose={basis:next};assert.notEqual(render(),before);}
  scope.devicePose=null;assert.equal(render(),null);
});
