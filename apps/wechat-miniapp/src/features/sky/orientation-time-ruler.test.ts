import { createSkyTimeRulerSettlement } from "./sky-time-ruler-settlement";
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import { createSkyObservationTime } from './sky-observation-time';
import { skyRulerTime } from './sky-time-presentation';
import { skyTimeInputAllowed } from './sky-time-input';
import { createOrientationRulerLayout } from './orientation-ruler-layout';

test('actual page previews the fractional public time and withholds fine target requests only during drag',()=>{
 const source=ts.createSourceFile('sky.tsx',readFileSync(new URL('./spot-sky-page.tsx',import.meta.url),'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 const page=source.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='SpotSkyPage') as ts.FunctionDeclaration;
 const expression=(name:string)=>{
  const declaration=page.body!.statements.filter(ts.isVariableStatement).flatMap(n=>[...n.declarationList.declarations]).find(n=>n.name.getText(source)===name);
  assert(declaration?.initializer);return ts.transpileModule(`(${declaration.initializer.getText(source)})`,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
 };
 const start='2026-10-14T00:00:00.000Z',end='2026-10-14T01:00:00.000Z';
 const time=createSkyObservationTime();time.bind('current',start,{startAt:start,endAt:end});
 let current=true;
 const rawReportData={hourly:[{at:start},{at:end}],context:{spotId:'test',contextId:'test',contextRevision:1,contextFingerprint:'test'}};
 const sandbox={skyTimeIntentCurrent:()=>current,datePickerOpenRef:{current:false},rawReportData,timeRows:rawReportData.hourly,
  timeModel:{startAt:start,endAt:end},skyRulerTime,cancelSkyCalibration:()=>{},setTimeIntent:()=>{},observationTime:time};
 const preview=vm.runInNewContext(expression('onPreview'),sandbox);
 preview(.25);assert.equal(time.snapshot().at,'2026-10-14T00:15:00.000Z');
 const settle=vm.runInNewContext(expression('settleTimeIndex'),{...sandbox,skyTimeInputAllowed,
   clampIndex:(i:number,n:number)=>Math.max(0,Math.min(i,n-1)),
   commitInstant:()=>{assert.fail('ruler settlement cannot write the public Context before Apply');}});
 settle(1);assert.equal(time.snapshot().at,end);
 assert.equal(time.snapshot().committedAt,start,'released ruler remains a cancellable preview');
 time.cancel();assert.equal(time.snapshot().at,start);
 preview(.25);
 current=false;preview(.75);assert.equal(time.snapshot().at,'2026-10-14T00:15:00.000Z','retired UI cannot replace current time');
 settle(1);assert.equal(time.snapshot().at,'2026-10-14T00:15:00.000Z','retired settlement cannot change preview or Context');
 const binding=expression('fineTargetBinding'),at=time.snapshot().at;
 const input={carriedReport:null,timePresentation:{mode:'MODEL'},timeGeometryReady:true,timePlaying:false,timeScrubbing:true,rawReportData,requestedAt:at,
  activeContext:{nightStartUtc:start,nightEndUtc:end}};
 assert.equal(vm.runInNewContext(binding,input),null);
 assert.equal(vm.runInNewContext(binding,{...input,timeScrubbing:false}).at,at);
 assert.equal(vm.runInNewContext(binding,{...input,timeScrubbing:false,requestedAt:'2026-10-13T13:00:00.000Z'}),null,
  'a geometry-only day cannot borrow advice from the committed night');
});

test('the actual page ruler selects beyond a short model as a pending intent instead of clamping to its supplied cell',()=>{
 const source=ts.createSourceFile('sky.tsx',readFileSync(new URL('./spot-sky-page.tsx',import.meta.url),'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 const page=source.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='SpotSkyPage') as ts.FunctionDeclaration;
 const declaration=page.body!.statements.filter(ts.isVariableStatement).flatMap(n=>[...n.declarationList.declarations])
   .find(n=>n.name.getText(source)==='onPreview');assert(declaration?.initializer);
 const start='2026-09-29T04:00:00.000Z',end='2026-09-30T04:00:00.000Z';
 const time=createSkyObservationTime();time.bind('current',start,{startAt:start,endAt:'2026-09-29T06:00:00.000Z'});
 const rows=Array.from({length:49},(_,i)=>({at:new Date(Date.parse(start)+i*1_800_000).toISOString()}));
 const preview=vm.runInNewContext(ts.transpileModule(`(${declaration.initializer.getText(source)})`,
   {compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,{
   skyTimeIntentCurrent:()=>true,datePickerOpenRef:{current:false},timeRows:rows,
   timeModel:{startAt:start,endAt:'2026-09-29T06:00:00.000Z'},skyRulerTime,
   cancelSkyCalibration:()=>{},setTimeIntent:()=>{},observationTime:time});
 preview(8.5);assert.equal(time.snapshot().at,'2026-09-29T08:15:00.000Z');
 assert.equal(time.snapshot().committedAt,start);assert.equal(time.snapshot().mode,'PREVIEW');
 preview(48);assert.equal(time.snapshot().at,end);
});

function render(saving=false, interactionLocked=false, isPreviewing=false) {
  const source=ts.createSourceFile('sky.tsx',readFileSync(new URL('./spot-sky-page.tsx',import.meta.url),'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  const declaration=source.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='OrientationTimeRuler');
  assert.ok(declaration);
  const positions:number[]=[],nextTicks:Array<()=>void>=[];
  const effects:Array<()=>void|(()=>void)>=[];let hide=()=>{};
  const component=vm.runInNewContext(ts.transpileModule(declaration.getText(source)+'\nOrientationTimeRuler;',{compilerOptions:{target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.React}}).outputText,{
    React:{createElement:(type:string,props:object,...children:unknown[])=>({type,props,children:children.flat()})},
    useDidShow:()=>{},useResize:()=>{},Taro:{nextTick:(callback:()=>void)=>nextTicks.push(callback)},createOrientationRulerLayout,createRulerScrollPosition:()=>({move:(value:number)=>positions.push(value),cancel:()=>{},readOffset:(accept:(left:number)=>void)=>accept(0)}),createSkyTimeRulerSettlement,View:'view',Text:'text',Button:'button',ScrollView:'scroll',SoftButton:'soft',
    useState:(v:unknown)=>[v,()=>{}],useRef:(v:unknown)=>({current:v}),useCallback:(fn:unknown)=>fn,
    useEffect:(fn:()=>void|(()=>void))=>effects.push(fn),useDidHide:(fn:()=>void)=>{hide=fn;},
    clampIndex:(i:number,n:number)=>Math.max(0,Math.min(i,n-1)),orientationRulerStepPx:()=>44,
    orientationRulerDistance:()=>0,formatTime:(s:string)=>s,orientationRulerLabel:()=>'',
  });
  const previews:number[]=[],commits:number[]=[],scrubs:boolean[]=[];let cancels=0;
  const tree=component({rows:[{at:'2026-09-06T13:00:00Z',opportunityBlockers:[]},{at:'2026-09-06T13:20:00Z',opportunityBlockers:[]}],activeIndex:0,committedIndex:0,timezone:'UTC',isPreviewing,saving,interactionLocked,reducedMotion:false,onPreview:(i:number)=>previews.push(i),onCommit:(i:number)=>commits.push(i),onCancel:()=>{cancels++;},onScrubChange:(active:boolean)=>scrubs.push(active)});
  const cleanups=effects.map(fn=>fn());
  return {positions,tree,scroll:tree.children.find((n:any)=>n?.type==='scroll').props,previews,commits,scrubs,nativeReady:()=>{while(nextTicks.length)nextTicks.shift()!();},hide:()=>hide(),unmount:()=>cleanups.forEach(fn=>fn?.()),changeInputs:()=>effects.at(-2)?.(),get cancels(){return cancels;}};
}
const one={touches:[{identifier:1}]},two={touches:[{identifier:1},{identifier:2}]},scroll={detail:{scrollLeft:44}};
test('sky drag preserves fractional time intention while settlement still commits a supplied tick',t=>{
 t.mock.timers.enable({apis:['setTimeout']});const r=render();
 r.scroll.onTouchStart(one);r.scroll.onScroll({detail:{scrollLeft:11}});
 assert.deepEqual(r.previews,[.25]);assert.deepEqual(r.scrubs,[true]);assert.deepEqual(r.commits,[]);
 r.scroll.onTouchEnd();t.mock.timers.tick(150);
 assert.deepEqual(r.commits,[0]);assert.deepEqual(r.scrubs,[true,false]);
 const cancelled=render();cancelled.scroll.onTouchStart(one);cancelled.hide();
 assert.deepEqual(cancelled.scrubs,[true,false]);assert.equal(cancelled.cancels,1);
});
test('empty touch and explicit preview cancellation retire the same drag demand without a commit',()=>{
 const tap=render();tap.scroll.onTouchStart(one);tap.scroll.onTouchEnd();
 assert.deepEqual(tap.scrubs,[true,false]);assert.deepEqual(tap.commits,[]);
 const r=render(false,false,true);r.scroll.onTouchStart(one);r.scroll.onScroll({detail:{scrollLeft:11}});
 const cancel=r.tree.children.find((child:any)=>child?.type==='soft');assert(cancel);
 cancel.props.onClick();assert.deepEqual(r.scrubs,[true,false]);assert.equal(r.cancels,1);assert.deepEqual(r.commits,[]);
});
test('sky programmatic scroll cannot preview or commit',t=>{
 t.mock.timers.enable({apis:['setTimeout']});
 const r=render();r.scroll.onScroll(scroll);r.scroll.onTouchEnd();r.scroll.onScrollEnd(scroll);assert.deepEqual(r.previews,[]);assert.deepEqual(r.commits,[]);
});
test('sky cancellation and lifecycle transitions ignore late scroll completion',t=>{
 t.mock.timers.enable({apis:['setTimeout']});
 for(const action of ['onTouchCancel','onTouchMove','onTouchStart','hide','unmount'] as const){
  const r=render();r.scroll.onTouchStart(one);r.scroll.onScroll(scroll);
  if(action==='hide'||action==='unmount')r[action]();else r.scroll[action](two);
  r.scroll.onTouchEnd();r.scroll.onScrollEnd(scroll);assert.equal(r.cancels,1,action);assert.deepEqual(r.commits,[],action);
  r.scroll.onTouchStart(one);r.scroll.onScroll(scroll);r.scroll.onTouchEnd();r.scroll.onScrollEnd(scroll);r.scroll.onTouchEnd();r.scroll.onScrollEnd(scroll);t.mock.timers.tick(150);assert.deepEqual(r.commits,[1]);
 }
});
test('sky saving disables touch-driven previews and commits',t=>{
 t.mock.timers.enable({apis:['setTimeout']});
 const r=render(true);assert.equal(r.scroll.scrollX,false);r.scroll.onTouchStart(one);r.scroll.onScroll(scroll);r.scroll.onTouchEnd();r.scroll.onScrollEnd(scroll);assert.deepEqual(r.previews,[]);assert.deepEqual(r.commits,[]);
});
test('calibration locks time interactions without claiming a save',t=>{
 t.mock.timers.enable({apis:['setTimeout']});
 const r=render(false,true);
 assert.equal(r.scroll.scrollX,false);
 assert.ok(!JSON.stringify(r.tree).includes('保存中'));
 r.scroll.onTouchStart(one);r.scroll.onScroll(scroll);r.scroll.onTouchEnd();r.scroll.onScrollEnd(scroll);
 assert.deepEqual(r.previews,[]);assert.deepEqual(r.commits,[]);
 const visit=(node:any)=>{
  if(!node||typeof node!=='object')return;
  if(node.type==='button')assert.equal(node.props.disabled,true);
  node.children?.forEach(visit);
 };visit(r.tree);
 assert.ok(JSON.stringify(render(true).tree).includes('保存中'));
});

test('sky released native scroll commits latest momentum offset without scrollend',t=>{
 t.mock.timers.enable({apis:['setTimeout']});
 const r=render();r.scroll.onTouchStart(one);r.scroll.onScroll({detail:{scrollLeft:0}});
 t.mock.timers.tick(1000);assert.deepEqual(r.commits,[]);
 r.scroll.onTouchEnd();t.mock.timers.tick(100);
 r.scroll.onScroll(scroll);t.mock.timers.tick(149);assert.deepEqual(r.commits,[]);
 t.mock.timers.tick(1);assert.deepEqual(r.commits,[1]);
 r.scroll.onScrollEnd(scroll);t.mock.timers.tick(150);assert.deepEqual(r.commits,[1]);
});
test('sky hide cancels the pending release timer',t=>{
 t.mock.timers.enable({apis:['setTimeout']});const r=render();
 r.scroll.onTouchStart(one);r.scroll.onScroll(scroll);r.scroll.onTouchEnd();r.hide();
 t.mock.timers.tick(1000);assert.deepEqual(r.commits,[]);assert.equal(r.cancels,1);
});

test('sky short drag commands the original native tick again',t=>{
 t.mock.timers.enable({apis:['setTimeout']});const r=render();
 r.scroll.onTouchStart(one);r.scroll.onScroll({detail:{scrollLeft:15}});r.scroll.onTouchEnd();
 t.mock.timers.tick(150);assert.deepEqual(r.commits,[0]);r.nativeReady();assert.equal(r.positions.at(-1),0);
});
