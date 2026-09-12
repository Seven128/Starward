import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';

test('account export claims a generated file only after successful writing',async()=>{
 const source=ts.createSourceFile('settings.tsx',readFileSync(new URL('./index.tsx',import.meta.url),'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 let declaration='';const visit=(n:ts.Node)=>{if(ts.isVariableDeclaration(n)&&n.name.getText(source)==='downloadAccountData')declaration='const '+n.getText(source)+';';ts.forEachChild(n,visit);};visit(source);assert.ok(declaration);
 for(const failure of ['api','write','share','none']){
  const calls:string[]=[],notices:any[]=[],busy:unknown[]=[],dismissed:string[]=[];
  const run=vm.runInNewContext(ts.transpileModule(declaration+'\ndownloadAccountData;',{compilerOptions:{target:ts.ScriptTarget.ES2020}}).outputText,{
   accountActionPending:{current:false},dataAction:null,setDataAction:(v:unknown)=>busy.push(v),setSheet(){},exportAccountData:async()=>{calls.push('api');if(failure==='api')throw Error('api');return{data:{generatedAt:'2026-09-06T12:00:00Z'}};},
   useAppStore:{getState:()=>({notifications:[{id:'export',owner:'settings',dedupeKey:'settings-account-export-failed'},{id:'other-owner',owner:'other',dedupeKey:'settings-account-export-failed'},{id:'other-action',owner:'settings',dedupeKey:'settings-account-delete-failed'}],dismissNotification:(id:string)=>dismissed.push(id)})},
   writeJsonFile:async()=>{calls.push('write');if(failure==='write')throw Error('disk');},notify:(n:unknown)=>notices.push(n),errorMessage:()=> '操作失败',
   Taro:{env:{USER_DATA_PATH:'/isolated'},shareFileMessage:async()=>{calls.push('share');if(failure==='share')throw Error('share');}},
  });
  await run();assert.deepEqual(busy,['EXPORT',null]);
  assert.deepEqual(dismissed,failure==='none'?['export']:[]);
  assert.equal(notices[0].title,failure==='none'?'账户数据已生成':failure==='share'?'文件已生成，尚未分享':'账户数据导出失败');
  if(failure==='write')assert.deepEqual(calls,['api','write']);
 }
});
