import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import {canApplyContextRestore} from './context-restore.ts';

test('search recovery respects current context version, reset and page visibility',()=>{
 const source=ts.createSourceFile('search.tsx',readFileSync(new URL('./search-page.tsx',import.meta.url),'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 let callback='';const visit=(n:ts.Node)=>{if(ts.isCallExpression(n)&&n.expression.getText(source)==='useEffect'&&n.arguments[0]?.getText(source).includes('const incoming = contextQuery'))callback=n.arguments[0].getText(source);ts.forEachChild(n,visit);};visit(source);assert.ok(callback);
 for(const scenario of ['current','newer-time','other-place','reset','hidden','expired-id']){
  const expected={contextId:'a',contextFingerprint:'first',revision:1};
  const current={...expected,...(scenario==='newer-time'?{revision:3}:{}),...(scenario==='other-place'?{contextId:'b'}:{})};
  const incoming={...expected,revision:2,...(scenario==='expired-id'?{contextId:'renewed'}:{})};
  const updates:unknown[]=[];
  vm.runInNewContext(ts.transpileModule(`(${callback})();`,{compilerOptions:{target:ts.ScriptTarget.ES2020}}).outputText,{
   contextQuery:{data:{data:incoming}},useAppStore:{getState:()=>({observationContext:current,mapResetVersion:scenario==='reset'?2:1})},
   pageVisible:scenario!=='hidden',mapResetVersion:1,observationContext:expected,canApplyContextRestore,setObservationContext:(v:unknown)=>updates.push(v),
  });
  assert.equal(updates.length,scenario==='current'||scenario==='expired-id'?1:0,scenario);
 }
});
