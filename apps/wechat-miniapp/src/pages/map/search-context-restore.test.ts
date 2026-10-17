import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import * as contextRestore from './context-restore.ts';
import {canApplyContextRestore} from '../../services/observation-context-version.ts';

test('search recovery respects current context version, reset and page visibility',()=>{
 const source=ts.createSourceFile('search.tsx',readFileSync(new URL('./search-page.tsx',import.meta.url),'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 let callback='';const visit=(n:ts.Node)=>{if(ts.isCallExpression(n)&&n.expression.getText(source)==='useEffect'&&n.arguments[0]?.getText(source).includes('const incoming = contextQuery'))callback=n.arguments[0].getText(source);ts.forEachChild(n,visit);};visit(source);assert.ok(callback);
 for(const scenario of ['current','newer-time','other-place','reset','hidden','expired-id','pending-formal-selection','pending-map-selection']){
  const expected={contextId:'a',contextFingerprint:'first',revision:1,location:scenario==='pending-map-selection'?{kind:'MAP_POINT'}:{kind:'FORMAL_SPOT',spotId:'spot:a'}};
  const current={...expected,...(scenario==='newer-time'?{revision:3}:{}),...(scenario==='other-place'?{contextId:'b'}:{})};
  const incoming={...expected,revision:2,...(scenario==='expired-id'?{contextId:'renewed'}:{})};
  const updates:unknown[]=[];
  vm.runInNewContext(ts.transpileModule(`(${callback})();`,{compilerOptions:{target:ts.ScriptTarget.ES2020}}).outputText,{
   contextQuery:{data:{data:incoming}},useAppStore:{getState:()=>({observationContext:current,selectedSpotId:scenario.startsWith('pending-')?'spot:b':null,mapResetVersion:scenario==='reset'?2:1})},
   pageVisible:scenario!=='hidden',mapResetVersion:1,observationContext:expected,canApplyContextRestore,spotSelectionAllowsContextRestore:contextRestore.spotSelectionAllowsContextRestore,setObservationContext:(v:unknown)=>updates.push(v),
  });
  assert.equal(updates.length,scenario==='current'||scenario==='expired-id'?1:0,scenario);
 }
});

test('search replaces a retired writable identity from its confirmed snapshot and cannot present the old ID',async()=>{
 const source=ts.createSourceFile('search.tsx',readFileSync(new URL('./search-page.tsx',import.meta.url),'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 const names=new Set(['contextQuery','restoredContext','activeContext','timeReference']);const statements:string[]=[];
 const visit=(n:ts.Node)=>{if(ts.isVariableStatement(n)&&n.declarationList.declarations.some(d=>names.has(d.name.getText(source))))statements.push(n.getText(source));ts.forEachChild(n,visit);};visit(source);assert.equal(statements.length,names.size);
 const confirmed={contextId:'a',revision:1,contextFingerprint:'first',location:{kind:'FORMAL_SPOT',spotId:'spot:a'},selectedAtUtc:'2026-10-07T16:00:00Z'};
 for(const marked of [false,true]){
  let options:any;const calls:string[]=[];
  const result=vm.runInNewContext(ts.transpileModule(statements.join('\n')+'\n({activeContext,timeReference});',{compilerOptions:{target:ts.ScriptTarget.ES2020}}).outputText,{
   observationContext:confirmed,retiredObservationContextId:marked?'a':null,selectedSpotId:'spot:a',mapResetVersion:1,viewport:{center:{latitude:22,longitude:114}},pageVisible:true,
   spotSelectionAllowsContextRestore:contextRestore.spotSelectionAllowsContextRestore,
   useResourceQuery:(value:any)=>{options=value;return {data:{data:confirmed}};},
   restoreObservationContext:async()=>{calls.push('read');return {data:confirmed};},
   replaceRetiredObservationContext:async(value:any)=>{calls.push('replace');assert.equal(value.selectedAtUtc,confirmed.selectedAtUtc);return {data:{...confirmed,contextId:'fresh'}};},
  });
  assert.equal((await options.queryFn()).data.contextId,marked?'fresh':'a');
  assert.deepEqual(calls,[marked?'replace':'read']);assert.equal(result.activeContext,marked?null:confirmed);assert.equal(result.timeReference,confirmed);
 }
});
