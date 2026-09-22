import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import {createSkyBrowsingCamera} from "./sky-browsing-camera.ts";
import {clampSkyFieldOfView,skyDomeFieldOfView,skyDomeProgress} from "./sky-zoom.ts";
import {createSkyViewBasis,projectSkyDirection} from "./sky-view-projection.ts";
import {skyViewportCenter,NO_SKY_INSETS,skyInsetsFromControls} from "./sky-viewport.ts";
import {selectNotification} from "../../state/notification.ts";

let pageSource=readFileSync(new URL('./spot-sky-page.tsx',import.meta.url),'utf8');
if(process.env.MUTATE_SKY_VIEWPORT_CENTER==='1')pageSource=pageSource.replace('frame.deepSkyImage, basis, center','frame.deepSkyImage, basis');
if(process.env.MUTATE_SKY_VIEWPORT_LIFECYCLE==='1')pageSource=pageSource
  .replace('if (!viewportActiveRef.current || !viewportMountedRef.current) return;', '')
  .replaceAll('!viewportActiveRef.current || !viewportMountedRef.current || revision !==', 'revision !==')
  .replace('useEffect(() => { measureBottomControls(); }, [measureBottomControls, skyInlineNotice, skyInlineNoticeResidual]);',
    'useEffect(() => {}, [measureBottomControls, skyInlineNotice, skyInlineNoticeResidual]);');
if(process.env.MUTATE_SKY_MANUAL_PRIORITY==='1')pageSource=pageSource.replace('live.alignment.mode === "editing" ? "locked" : manualBasisRef.current ? "manual" : live.alignment.mode === "needs-alignment" ? "locked" : "follow"',
  'live.alignment.mode === "editing" || live.alignment.mode === "needs-alignment" ? "locked" : manualBasisRef.current ? "manual" : "follow"');
const source=ts.createSourceFile('sky.tsx',pageSource,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
let paint='',begin='',measure='';
function visit(node:ts.Node){
  if(ts.isCallExpression(node)&&node.expression.getText(source)==='createSkyCanvasLifecycle'){
    const options=node.arguments[0] as ts.ObjectLiteralExpression;
    const property=options.properties.find(p=>p.name?.getText(source)==='paint') as ts.PropertyAssignment;
    paint=property.initializer.getText(source);
  }
  if(ts.isVariableDeclaration(node)&&node.name.getText(source)==='beginSkyCalibration')begin=node.initializer!.getText(source);
  if(ts.isVariableDeclaration(node)&&node.name.getText(source)==='measureBottomControls')measure=node.initializer!.getText(source);
  ts.forEachChild(node,visit);
}visit(source);
assert.ok(paint&&begin);

test("actual page paint uses dome basis for drawing and last-painted calibration reference; locked stale frame uses observing scale",()=>{
  const raw=createSkyViewBasis(31,100,25)!;
  const actual:Array<{fov:number,basis:any}>=[];
  const orientation={latestPresentation:{current:{presentationRevision:0,alignment:{mode:'auto',view:raw}}},presented:{current:null as any}};
  const fov=skyDomeFieldOfView(390,844);
  const sandbox={orientation,orientationController:{snapshot:()=>orientation.latestPresentation.current},manualBasisRef:{current:null},
    paintedSkyObjectsRef:{current:null},SKY_VERTICAL_FOV_DEG:45,clampSkyFieldOfView,skyDomeProgress,
    browsingCamera:createSkyBrowsingCamera(),zoomRef:{current:fov},reducedMotionRef:{current:false},
    setPresentedCamera(){},browsingTimerRef:{current:null},
    viewportInsetsRef:{current:NO_SKY_INSETS},skyViewportCenter,
    canvasGenerationRef:{current:1},EMPTY_SKY_IMAGES:new Map(),
    drawSkyScene:(_ctx:any,_data:any,_at:any,_heading:any,_pose:any,_w:any,_h:any,_mode:any,painted:any,done:any,fov:number,_image:any,basis:any)=>{actual.push({fov,basis});painted({objects:[]});done();}};
  const fn=vm.runInNewContext(ts.transpileModule('('+paint+')',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,sandbox);
  const frame={orientationRevision:0,pose:{basis:raw},verticalFovDeg:fov,sceneReady:true};
  fn({},frame,{width:390,height:844},()=>{});
  assert.ok(actual[0]!.basis.forward[2]>.999999999);
  assert.equal(orientation.presented.current,actual[0]!.basis);
  const frozen=orientation.presented.current;
  orientation.latestPresentation.current={presentationRevision:1,alignment:{mode:'editing',view:frozen}};
  fn({},frame,{width:390,height:844},()=>{});
  assert.equal(actual[1]!.fov,45,"queued pre-calibration wide frame cannot undo observing scale");
  assert.equal(actual[1]!.basis,frozen,"freezes the direction the user actually saw");
  // Stopping a previously calibrated sensor leaves needs-alignment in its
  // owner; that must not override the user's explicit manual browsing intent.
  orientation.latestPresentation.current={presentationRevision:2,alignment:{mode:'needs-alignment',view:raw}};
  sandbox.manualBasisRef.current=raw as any;
  fn({},frame,{width:390,height:844},()=>{});
  assert.ok(actual[2]!.basis.forward[2]>.999999999,"manual full dome still faces zenith after a calibrated sensor stops");
});

test("actual canvas writer gives the renderer a full horizon inside measured controls, including a shifted center",()=>{
  const width=844,height=390,insets={top:105,bottom:180};
  const raw=createSkyViewBasis(70,90,20)!;
  let rendered:any=null;
  const actualCamera={basis:raw,fov:45,center:{x:0,y:0}};
  const sandbox={orientation:{latestPresentation:{current:{presentationRevision:0,alignment:{mode:'auto',view:raw}}},presented:{current:null}},
    orientationController:{},manualBasisRef:{current:null},paintedSkyObjectsRef:{current:null},SKY_VERTICAL_FOV_DEG:45,
    clampSkyFieldOfView,skyDomeProgress,skyViewportCenter,browsingCamera:createSkyBrowsingCamera(),
    zoomRef:{current:skyDomeFieldOfView(width,height,insets)},viewportInsetsRef:{current:insets},reducedMotionRef:{current:false},
    canvasGenerationRef:{current:1},EMPTY_SKY_IMAGES:new Map(),
    browsingTimerRef:{current:null},setPresentedCamera:(fn:any)=>Object.assign(actualCamera,fn(null)),
    drawSkyScene:(_ctx:any,_data:any,_at:any,_heading:any,_pose:any,w:number,h:number,_mode:any,painted:any,done:any,fov:number,_image:any,basis:any,center:any)=>{
      rendered={w,h,fov,basis,center};painted({objects:[]});done();
    }};
  const fn=vm.runInNewContext(ts.transpileModule('('+paint+')',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,sandbox);
  fn({}, {orientationRevision:0,pose:{basis:raw},verticalFovDeg:45,sceneReady:true},{width,height},()=>{});
  assert.ok(rendered.center,"renderer must receive the shared shifted center");
  assert.equal(actualCamera.center,rendered.center,"labels receive the same center as actual painting");
  for(let az=0;az<360;az++){
    const p=projectSkyDirection(az,0,rendered.basis,width,height,rendered.fov,rendered.center)!;
    assert.ok(p&&p.y>=insets.top&&p.y<=height-insets.bottom);
  }
});

test("actual native measurement includes back, native capsule, notifications and bottom controls, and rejects superseded results",()=>{
  const callbacks:Array<(results:any[])=>void>=[];const selected:string[]=[];const updates:any[]=[];
  const query:any={select:(selector:string)=>{selected.push(selector);return query;},boundingClientRect:()=>query,exec:(callback:any)=>callbacks.push(callback)};
  const sandbox={useCallback:(callback:any)=>callback,viewportMeasurementRevision:{current:0},viewportActiveRef:{current:true},viewportMountedRef:{current:true},CANVAS_ID:'spot-night-sky-scene',skyInsetsFromControls,
    navigationInsets:{capsuleBottom:65},Taro:{nextTick:(fn:any)=>fn(),createSelectorQuery:()=>query,getWindowInfo:()=>({windowHeight:830})},
    setControlsBottomReserve:()=>{},setViewportInsets:(fn:any)=>updates.push(fn(NO_SKY_INSETS))};
  const fn=vm.runInNewContext(ts.transpileModule('('+measure+')',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,sandbox);
  fn();fn();
  const rects=[{top:620,bottom:830,height:210},{top:70,bottom:114,height:44},{top:125,bottom:205,height:80},{top:30,bottom:830,height:800}];
  callbacks[0]!(rects);assert.equal(updates.length,0);
  callbacks[1]!(rects);assert.deepEqual(updates,[{top:183,bottom:218}]);
  assert.ok(selected.includes('#sky-bottom-controls')&&selected.includes('.sky-orientation-back-layer')&&selected.includes('#spot-night-sky-scene'));
  fn();sandbox.viewportActiveRef.current=false;
  callbacks[2]!(rects);assert.equal(updates.length,1,"an in-flight callback after hide is rejected");
  fn();assert.equal(callbacks.length,3,"an effect after hide must not issue a new query");
  sandbox.viewportActiveRef.current=true;sandbox.viewportMountedRef.current=false;
  fn();assert.equal(callbacks.length,3,"unmounted page cannot measure");
  sandbox.viewportMountedRef.current=true;
  let pendingTick:(()=>void)|null=null;
  sandbox.Taro.nextTick=(fn:any)=>{pendingTick=fn;};
  fn();sandbox.viewportActiveRef.current=false;
  (pendingTick as unknown as ()=>void)();assert.equal(callbacks.length,3,"hide before native nextTick also rejects the query");
});

test("actual Sky subscriptions remeasure when its inline notice grows or disappears, without following unrelated notices",()=>{
  const declarations:string[]=[];let effect='';
  const inspect=(node:ts.Node)=>{
    if(ts.isVariableDeclaration(node)&&['skyInlineNotice','skyInlineNoticeResidual'].includes(node.name.getText(source)))declarations.push('const '+node.getText(source)+';');
    if(ts.isCallExpression(node)&&node.expression.getText(source)==='useEffect'&&node.arguments[1]?.getText(source).includes('skyInlineNotice'))effect=node.getText(source);
    ts.forEachChild(node,inspect);
  };inspect(source);assert.equal(declarations.length,2);assert.ok(effect);
  let queue:any[]=[],previous:unknown[]|undefined,measurements=0;
  const run=vm.runInNewContext(ts.transpileModule('(()=>{'+declarations.join('\n')+effect+';})',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,{
    useAppStore:(selector:any)=>selector({notifications:queue}),selectNotification,
    measureBottomControls:()=>measurements++,
    useEffect:(fn:()=>void,deps:unknown[])=>{if(!previous||deps.some((value,i)=>value!==previous![i]))fn();previous=deps;},
  });
  const first={id:'sky-notice',owner:'spot-night',placement:'inline',tone:'info',createdAt:1,title:'资料说明',body:'正文'};
  run();assert.equal(measurements,1);
  queue=[first];run();assert.equal(measurements,2,"appearance requests native measurement");
  queue=[{...first,body:'新增一段较长的正文，实际区域可能变高'}];run();assert.equal(measurements,3,"content replacement requests measurement");
  queue=[...queue,{...first,id:'other',owner:'map',createdAt:2}];run();assert.equal(measurements,3);
  queue=[];run();assert.equal(measurements,4,"dismissal must release the old top inset");
});

test("actual calibration action resets magnification without modifying Observation Context and respects a pending time commit",()=>{
  const actions:string[]=[];
  const contextSession={busy:false};
  const skyTapRef={current:{dragged:true} as unknown};
  const fn=vm.runInNewContext(ts.transpileModule('('+begin+')',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,
    {contextSession,skyTapRef,SKY_VERTICAL_FOV_DEG:45,setVerticalFovDeg:(n:number)=>actions.push('fov:'+n),orientationController:{begin:()=>actions.push('begin')},
      stopBrowsingAnimation(){},browsingCamera:createSkyBrowsingCamera(),orientation:{presented:{current:null}}});
  fn();assert.deepEqual(actions,['fov:45','begin']);assert.equal(skyTapRef.current,null);
  contextSession.busy=true;fn();assert.equal(actions.length,2);
});
