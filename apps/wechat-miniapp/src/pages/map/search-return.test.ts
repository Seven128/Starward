import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import {sameContextVersion} from '../../services/observation-context-version';
import {primaryPageNativeRuntimeForTest} from '../../navigation/primary-page-navigation-test-support';

test('search return falls back to map and exposes a recoverable double failure',async()=>{
 const source=ts.createSourceFile('search.tsx',readFileSync(new URL('./search-page.tsx',import.meta.url),'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 let declaration='',ownerDeclaration='';const visit=(node:ts.Node)=>{if(ts.isVariableDeclaration(node)&&node.name.getText(source)==='leaveSearch')declaration='const '+node.getText(source)+';';if(ts.isVariableDeclaration(node)&&node.name.getText(source)==='beginSelection')ownerDeclaration='const '+node.getText(source)+';';ts.forEachChild(node,visit);};visit(source);assert.ok(declaration);assert.ok(ownerDeclaration);
 for(const failures of [0,1,2]){
  const notices:any[]=[];const version={current:0};
  const dismissed:string[]=[],ownerPage={route:'spot/search/index'},mapPage={route:'pages/map/index'};
  const notifications=[{id:'return',owner:'search',dedupeKey:'search-return-failed'},{id:'other',owner:'search',dedupeKey:'search-map-reference-context-failed'},{id:'map',owner:'map',dedupeKey:'search-return-failed'}];
  const navigation=primaryPageNativeRuntimeForTest(failures?[ownerPage]:[mapPage]);
  if(!failures){assert.equal(navigation.showMap(mapPage),true);navigation.hideMap(mapPage);navigation.setStack([mapPage,ownerPage]);}
  const taro=navigation.taro;
  const leave=vm.runInNewContext(ts.transpileModule(ownerDeclaration+'\n'+declaration+'\nleaveSearch;',{compilerOptions:{target:ts.ScriptTarget.ES2020}}).outputText,{
   sameContextVersion,selectionVersion:version,Taro:taro,...navigation.dispatcher,notify:(n:unknown)=>notices.push(n),errorMessage:()=> '连接失败',
   useAppStore:{getState:()=>({notifications,dismissNotification:(id:string)=>dismissed.push(id)})},
  });
  const pending=leave();assert.equal(navigation.calls[0]?.kind,'navigateBack');assert.equal(navigation.calls[0]?.delta,1);
  if(failures){
   navigation.calls[0]!.reject(Error('back'));await new Promise(resolve=>setImmediate(resolve));
   assert.equal(navigation.calls[1]?.kind,'reLaunch');assert.equal(navigation.calls[1]?.url,'/pages/map/index');
   if(failures===2)navigation.calls[1]!.reject(Error('map'));
   else{
    navigation.calls[1]!.resolve();await new Promise(resolve=>setImmediate(resolve));
    assert.deepEqual(dismissed,[],'native acceptance does not claim the Map has shown');
    navigation.setStack([mapPage]);assert.equal(navigation.showMap(mapPage),true);
   }
  }else{navigation.setStack([mapPage]);assert.equal(navigation.showMap(mapPage),true);navigation.calls[0]!.resolve();}
  await pending;assert.equal(version.current,1);assert.deepEqual(navigation.calls.map(call=>call.kind),failures?['navigateBack','reLaunch']:['navigateBack']);
  assert.deepEqual(dismissed,failures===2?[]:['return']);
  assert.equal(notices.length,failures===2?1:0);if(notices.length){assert.equal(notices[0].title,'暂时无法返回地图');assert.match(notices[0].body,/再次返回/);}
  assert.equal(navigation.calls.length,failures?2:1);navigation.dispose();
 }
});
