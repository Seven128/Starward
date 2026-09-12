import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

test("invalid detail recovery handles a failed map return and permits retry without duplicate navigation", async () => {
  const source=ts.createSourceFile("spot.tsx",readFileSync(new URL("./spot-detail-page.tsx",import.meta.url),"utf8"),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  let declaration="";
  const visit=(node:ts.Node)=>{if(ts.isVariableDeclaration(node)&&node.name.getText(source)==="returnToMap")declaration="const "+node.getText(source)+";";ts.forEachChild(node,visit);};visit(source);assert.ok(declaration);
  let reject!: (error:Error)=>void,calls=0;
  const lock={current:false},states:boolean[]=[];
  const run=vm.runInNewContext(ts.transpileModule(declaration+"\nreturnToMap;",{compilerOptions:{target:ts.ScriptTarget.ES2020}}).outputText,{
    detailPagePending:lock,setMapReturnFailed:(failed:boolean)=>states.push(failed),
    Taro:{switchTab:({url}:{url:string})=>{assert.equal(url,"/pages/map/index");return ++calls===1?new Promise((_resolve,fail)=>{reject=fail;}):Promise.resolve();}},
  });
  const pending=run();await run();assert.equal(calls,1);
  reject(Error("native failed"));await pending;assert.equal(lock.current,false);assert.deepEqual(states,[true]);
  await run();assert.equal(calls,2);assert.deepEqual(states,[true,false]);
});

test("detail child navigation preserves content on failure, prevents repeats and clears only its own recovered notice", async () => {
  const source=ts.createSourceFile("spot.tsx",readFileSync(new URL("./spot-detail-page.tsx",import.meta.url),"utf8"),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  let declaration="";
  const visit=(node:ts.Node)=>{if(ts.isVariableDeclaration(node)&&node.name.getText(source)==="openDetailPage")declaration="const "+node.getText(source)+";";ts.forEachChild(node,visit);};visit(source);assert.ok(declaration);
  for(const hidden of [false,true]) {
    let reject!: (error:Error)=>void;
    let calls=0;
    const epoch={current:0},lock={current:false},notices:any[]=[],dismissed:string[]=[];
    const run=vm.runInNewContext(ts.transpileModule(declaration+"\nopenDetailPage;",{compilerOptions:{target:ts.ScriptTarget.ES2020}}).outputText,{
      detailPagePending:lock,navigationEpoch:epoch,notify:(notice:unknown)=>notices.push(notice),
      Taro:{navigateTo:({url}:{url:string})=>{assert.equal(url,"/content/spot-feedback/index?spotId=spot%3Atest");calls++;return calls===1?new Promise((_resolve,fail)=>{reject=fail;}):Promise.resolve();}},
      useAppStore:{getState:()=>({notifications:[{id:"mine",owner:"spot-detail",dedupeKey:"spot-detail-page-navigation-failed"},{id:"other",owner:"spot-detail",dedupeKey:"other-error"},{id:"other-owner",owner:"map",dedupeKey:"spot-detail-page-navigation-failed"}],dismissNotification:(id:string)=>dismissed.push(id)})},
    });
    const args=["/content/spot-feedback/index?spotId=spot%3Atest","反馈表单"];
    const pending=run(...args);await run(...args);assert.equal(calls,1);
    if(hidden)epoch.current++;
    reject(Error("navigation failed"));await pending;
    assert.equal(lock.current,false);assert.equal(notices.length,hidden?0:1);
    if(!hidden)assert.equal(notices[0].title,"反馈表单暂未打开");
    await run(...args);assert.equal(calls,2);assert.deepEqual(dismissed,["mine"]);
  }
});
