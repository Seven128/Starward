import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';

function render(saving=false) {
  const source=ts.createSourceFile('sky.tsx',readFileSync(new URL('./spot-sky-page.tsx',import.meta.url),'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  const declaration=source.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='OrientationTimeRuler');
  assert.ok(declaration);
  const effects:Array<()=>void|(()=>void)>=[];let hide=()=>{};
  const component=vm.runInNewContext(ts.transpileModule(declaration.getText(source)+'\nOrientationTimeRuler;',{compilerOptions:{target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.React}}).outputText,{
    React:{createElement:(type:string,props:object,...children:unknown[])=>({type,props,children:children.flat()})},
    View:'view',Text:'text',Button:'button',ScrollView:'scroll',SoftButton:'soft',
    useState:(v:unknown)=>[v,()=>{}],useRef:(v:unknown)=>({current:v}),useCallback:(fn:unknown)=>fn,
    useEffect:(fn:()=>void|(()=>void))=>effects.push(fn),useDidHide:(fn:()=>void)=>{hide=fn;},
    clampIndex:(i:number,n:number)=>Math.max(0,Math.min(i,n-1)),orientationRulerStepPx:()=>44,
    orientationRulerDistance:()=>0,formatTime:(s:string)=>s,orientationRulerLabel:()=>'',
  });
  const previews:number[]=[],commits:number[]=[];let cancels=0;
  const tree=component({rows:[{at:'2026-09-06T13:00:00Z',opportunityBlockers:[]},{at:'2026-09-06T13:20:00Z',opportunityBlockers:[]}],activeIndex:0,committedIndex:0,timezone:'UTC',isPreviewing:false,saving,reducedMotion:false,onPreview:(i:number)=>previews.push(i),onCommit:(i:number)=>commits.push(i),onCancel:()=>{cancels++;}});
  const cleanups=effects.map(fn=>fn());
  return {scroll:tree.children.find((n:any)=>n?.type==='scroll').props,previews,commits,hide:()=>hide(),unmount:()=>cleanups.forEach(fn=>fn?.()),changeInputs:()=>effects.at(-2)?.(),get cancels(){return cancels;}};
}
const one={touches:[{identifier:1}]},two={touches:[{identifier:1},{identifier:2}]},scroll={detail:{scrollLeft:44}};
test('sky programmatic scroll cannot preview or commit',()=>{
 const r=render();r.scroll.onScroll(scroll);r.scroll.onScrollEnd(scroll);assert.deepEqual(r.previews,[]);assert.deepEqual(r.commits,[]);
});
test('sky cancellation and lifecycle transitions ignore late scroll completion',()=>{
 for(const action of ['onTouchCancel','onTouchMove','onTouchStart','hide','unmount'] as const){
  const r=render();r.scroll.onTouchStart(one);r.scroll.onScroll(scroll);
  if(action==='hide'||action==='unmount')r[action]();else r.scroll[action](two);
  r.scroll.onScrollEnd(scroll);assert.equal(r.cancels,1,action);assert.deepEqual(r.commits,[],action);
  r.scroll.onTouchStart(one);r.scroll.onScrollEnd(scroll);r.scroll.onScrollEnd(scroll);assert.deepEqual(r.commits,[1]);
 }
});
test('sky saving disables touch-driven previews and commits',()=>{
 const r=render(true);assert.equal(r.scroll.scrollX,false);r.scroll.onTouchStart(one);r.scroll.onScroll(scroll);r.scroll.onScrollEnd(scroll);assert.deepEqual(r.previews,[]);assert.deepEqual(r.commits,[]);
});
