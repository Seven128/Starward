import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import {sameContextVersion} from '../../services/observation-context-version';

test('search return falls back to map and exposes a recoverable double failure',async()=>{
 const source=ts.createSourceFile('search.tsx',readFileSync(new URL('./search-page.tsx',import.meta.url),'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 let declaration='',ownerDeclaration='';const visit=(node:ts.Node)=>{if(ts.isVariableDeclaration(node)&&node.name.getText(source)==='leaveSearch')declaration='const '+node.getText(source)+';';if(ts.isVariableDeclaration(node)&&node.name.getText(source)==='beginSelection')ownerDeclaration='const '+node.getText(source)+';';ts.forEachChild(node,visit);};visit(source);assert.ok(declaration);assert.ok(ownerDeclaration);
 for(const failures of [0,1,2]){
  const calls:string[]=[],notices:any[]=[];const version={current:0};
  const dismissed:string[]=[],ownerPage={};
  const notifications=[{id:'return',owner:'search',dedupeKey:'search-return-failed'},{id:'other',owner:'search',dedupeKey:'search-map-reference-context-failed'},{id:'map',owner:'map',dedupeKey:'search-return-failed'}];
  const leave=vm.runInNewContext(ts.transpileModule(ownerDeclaration+'\n'+declaration+'\nleaveSearch;',{compilerOptions:{target:ts.ScriptTarget.ES2020}}).outputText,{
   sameContextVersion,selectionVersion:version,Taro:{getCurrentPages:()=>[ownerPage],navigateBack:async()=>{calls.push('back');if(failures)throw Error('back');},switchTab:async()=>{calls.push('map');if(failures===2)throw Error('map');}},notify:(n:unknown)=>notices.push(n),errorMessage:()=> '连接失败',
   useAppStore:{getState:()=>({notifications,dismissNotification:(id:string)=>dismissed.push(id)})},
  });
  await leave();assert.equal(version.current,1);assert.deepEqual(calls,failures?['back','map']:['back']);
  assert.deepEqual(dismissed,failures===2?[]:['return']);
  assert.equal(notices.length,failures===2?1:0);if(notices.length){assert.equal(notices[0].title,'暂时无法返回地图');assert.match(notices[0].body,/再次返回/);}
 }
});
