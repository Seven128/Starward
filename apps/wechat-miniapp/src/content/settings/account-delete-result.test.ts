import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';

test('server deletion success clears the session before result UI and is never reported as not deleted',async()=>{
 const source=ts.createSourceFile('settings.tsx',readFileSync(new URL('./index.tsx',import.meta.url),'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 let declaration='';const visit=(n:ts.Node)=>{if(ts.isVariableDeclaration(n)&&n.name.getText(source)==='deleteAccount')declaration='const '+n.getText(source)+';';ts.forEachChild(n,visit);};visit(source);assert.ok(declaration);
 for(const failure of ['api','result-modal','navigation','none','account-switched']){
  const calls:string[]=[],notices:any[]=[];let modals=0;
  const run=vm.runInNewContext(ts.transpileModule(declaration+'\ndeleteAccount;',{compilerOptions:{target:ts.ScriptTarget.ES2020}}).outputText,{
   accountActionPending:{current:false},dataAction:null,setDataAction(){},deleteAccountThroughApi:async()=>{calls.push('api');if(failure==='api')throw Error('api');return{data:{mediaCleanupState:'QUEUED'},localAccountReset:failure!=='account-switched'};},
   resetAfterAccountDeletion:()=>calls.push('reset'),notify:(n:unknown)=>notices.push(n),errorMessage:()=> '失败',
   Taro:{showModal:async()=>{modals++;if(modals===3){calls.push('result');if(failure==='result-modal')throw Error('modal');}return{confirm:true};},reLaunch:async()=>{calls.push('navigate');if(failure==='navigation')throw Error('navigation');}},
  });
  await run();
  if(failure==='api'){assert.deepEqual(calls,['api']);assert.equal(notices[0].title,'账户未删除');}
  else if(failure==='account-switched'){assert.deepEqual(calls,['api']);assert.equal(notices[0].title,'原账户已删除');}
  else{assert.deepEqual(calls.slice(0,3),['api','reset','result']);if(failure!=='none'){assert.match(notices[0].title,/账户已删除/);assert.doesNotMatch(notices[0].body,/会话保持不变/);}else assert.equal(notices.length,0);}
 }
});
