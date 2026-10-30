import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
import { createResourceFailureEpisode } from '../../services/resource-failure-episode';
import { analysisLayerEnabled } from './map-layer-selection';

const source=ts.createSourceFile('map.tsx',readFileSync(new URL('./index.tsx',import.meta.url),'utf8'),
  ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
function evaluate(name:string,scope:Record<string,unknown>,effect=false){
  let value:ts.Expression|undefined;
  function visit(node:ts.Node){
    if(!effect&&ts.isVariableDeclaration(node)&&node.name.getText(source)===name)value=node.initializer;
    if(!effect&&ts.isBinaryExpression(node)&&node.operatorToken.kind===ts.SyntaxKind.EqualsToken&&
      node.left.getText(source)===name)value=node.right;
    if(effect&&ts.isCallExpression(node)&&node.expression.getText(source)==='useEffect'&&
      node.arguments[0]?.getText(source).includes(`${name}.observe(`))value=node.arguments[0];
    ts.forEachChild(node,visit);
  }
  visit(source);assert(value,name);
  return vm.runInNewContext(ts.transpileModule(`(${value.getText(source)})`,
    {compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,scope);
}

for(const layer of ['terrain','light'] as const)test(`${layer} failure episode survives new work and hide until current native success`,()=>{
  const episode=createResourceFailureEpisode(),notices:unknown[]=[],current={preview:false},old={preview:false};
  const state:any={
    pageVisible:true,terrainEnabled:true,lightEnabled:true,analysisOverlay:'LIGHT',rasterFailureScope:'owner:map',
    terrainFailureEpisode:episode,lightFailureEpisode:episode,nativeMap:{pending:false},mapRuntimeError:null,
    terrain:{data:{data:current}},terrainNativeError:null,mapTerrainFailed:true,mapTerrainLoading:false,
    mapTerrainBounds:{},mapTerrainMissing:false,presentedTerrainData:old,
    terrainInstallation:{settled:true,retirementPending:false},terrainRequiresMapRecovery:false,
    lightReadFailed:true,lightFailurePending:false,nativeViewport:{bounds:{}},nightLayer:current,nightRaster:{},lightUnavailable:false,
    lightInstallation:{settled:true,presentedData:old,error:null,retirementPending:false},
    notify:(notice:unknown)=>notices.push(notice),reportRuntimeError(){},
  };
  const health=layer==='terrain'?'terrainFailureHealthy':'lightFailureHealthy';
  state[layer==='terrain'?'showTerrainFailure':'showLightFailure']=evaluate(layer==='terrain'?'showTerrainFailure':'showLightFailure',state);
  const emit=()=>{state[health]=evaluate(health,state);evaluate(`${layer}FailureEpisode`,state,true)();};
  emit();emit();assert.equal(notices.length,1);
  if(layer==='terrain')state.mapTerrainLoading=true;else state.lightFailurePending=true;
  emit();if(layer==='terrain')state.mapTerrainLoading=false;else state.lightFailurePending=false;
  emit();assert.equal(notices.length,1,'an automatic refresh is part of the same failure');
  state.pageVisible=false;emit();state.pageVisible=true;emit();assert.equal(notices.length,1);
  if(layer==='terrain')state.mapTerrainFailed=false;else state.lightReadFailed=false;
  emit();assert.equal(state[health],false,'retained old native data cannot certify current demand');
  if(layer==='terrain')state.mapTerrainFailed=true;else state.lightReadFailed=true;
  emit();assert.equal(notices.length,1,'temporary absence of errors is not recovery');
  if(layer==='terrain'){state.mapTerrainFailed=false;state.presentedTerrainData=current;}
  else {state.lightReadFailed=false;state.lightInstallation.presentedData=current;}
  emit();assert.equal(state[health],true);
  if(layer==='terrain')state.mapTerrainFailed=true;else state.lightReadFailed=true;
  emit();assert.equal(notices.length,2,'a failure after actual recovery is a new episode');
  episode.retry();emit();assert.equal(notices.length,3,'explicit retry can report a fresh terminal failure');
});

test('metadata no-coverage does not clear a failure episode before native removal is acknowledged',()=>{
  const current={state:'UNAVAILABLE',polygons:[]},state:any={
    nativeViewport:{bounds:{}},nightLayer:current,nightRaster:null,lightReadFailed:false,mapRuntimeError:null,
    lightUnavailable:true,lightInstallation:{settled:false,presentedData:null},
    mapTerrainBounds:{},terrain:{data:{data:current}},mapTerrainFailed:false,mapTerrainMissing:true,
    presentedTerrainData:null,terrainInstallation:{settled:false},
  };
  for(const health of ['terrainFailureHealthy','lightFailureHealthy'])assert.equal(evaluate(health,state),false);
  state.terrainInstallation.settled=state.lightInstallation.settled=true;
  for(const health of ['terrainFailureHealthy','lightFailureHealthy'])assert.equal(evaluate(health,state),true);
});

test('real layer recovery commands rearm feedback only after the live owner accepts the retry',async()=>{
  for(const layer of ['terrain','light']){
    const calls:string[]=[],current={accountOwnerId:'owner',mapResetVersion:0,analysisOverlay:'LIGHT',terrainEnabled:true};
    const state:any={
      navigationEpoch:{current:3},foregroundLife:{current:{visible:true,lease:{}}},
      useMemo:(compute:()=>unknown)=>compute(),pageVisible:true,selectedSpotId:null,activeContext:null,
      nativeMap:{isCurrent:()=>true},currentNativeMapRef:{current:{pending:false}},
      useAppStore:{getState:()=>current},accountOwnerId:'owner',mapResetVersion:0,analysisLayerEnabled,
      terrainRequiresMapRecovery:false,
      terrainFailureEpisode:{retry:()=>calls.push('episode')},lightFailureEpisode:{retry:()=>calls.push('episode')},
      terrain:{isError:true,refetch:()=>calls.push('metadata')},setTerrainNativeRetry:()=>calls.push('native'),
      lightInstallation:{requiresMapRecovery:false},nativeViewport:{error:null},
      lightImage:{retryImage:()=>calls.push('image')},setLightNativeRetry:()=>calls.push('native'),nightLight:{refetch:()=>calls.push('metadata')},
    };
    state.rasterRetryTicket=evaluate('rasterRetryTicket',state);
    state.currentRasterRetryTicket={current:state.rasterRetryTicket};
    state.rasterRetryCurrent=evaluate('rasterRetryCurrent',state);
    const retry=evaluate(layer==='terrain'?'retryTerrainLayer':'retryLightLayer',state);
    await retry();assert.equal(calls[0],'episode');assert(calls.includes('metadata'));
    calls.length=0;state.foregroundLife.current.visible=false;state.navigationEpoch.current++;state.foregroundLife.current.lease={};
    await retry();assert.equal(calls.length,0,'hidden callback must not reset the episode or dispatch');
    state.foregroundLife.current.visible=true;
    await retry();assert.equal(calls.length,0,'returning to the same owner must not revive the old render callback');
    const returned={...state,rasterRetryTicket:evaluate('rasterRetryTicket',state)};
    returned.currentRasterRetryTicket.current=returned.rasterRetryTicket;
    returned.rasterRetryCurrent=evaluate('rasterRetryCurrent',returned);
    const currentRetry=evaluate(layer==='terrain'?'retryTerrainLayer':'retryLightLayer',returned);
    await currentRetry();assert.equal(calls[0],'episode');assert(calls.includes('metadata'),'the newly rendered recovery remains usable');
    calls.length=0;
    await retry();assert.equal(calls.length,0,'a newly committed ticket cannot revive the older callback');
  }
});

test('Context retirement effects bind the current retry without waiting for another render',()=>{
  const state:any={navigationEpoch:{current:3},useMemo:(compute:()=>unknown)=>compute(),
    foregroundLife:{current:{visible:true,lease:{}}},nativeMap:{mapId:'map',isCurrent:()=>true},
    currentNativeMapRef:{current:{pending:false}},accountOwnerId:'owner',mapResetVersion:0,pageVisible:true,
    selectedSpotId:'spot',activeContext:{contextId:'current'},
    useAppStore:{getState:()=>({accountOwnerId:'owner',mapResetVersion:0,terrainEnabled:true})},analysisLayerEnabled};
  state.rasterRetryTicket=evaluate('rasterRetryTicket',state);
  state.currentRasterRetryTicket={current:state.rasterRetryTicket};
  const current=evaluate('rasterRetryCurrent',state);
  let binding:ts.Expression|undefined;
  function visit(node:ts.Node){
    if(ts.isCallExpression(node)&&node.expression.getText(source)==='useEffect'&&
      node.arguments[0]?.getText(source).includes('rasterRetryTicket.epoch ='))binding=node.arguments[0];
    ts.forEachChild(node,visit);
  }
  visit(source);assert(binding);
  state.navigationEpoch.current++;
  assert.equal(current('TERRAIN'),false);
  vm.runInNewContext(ts.transpileModule(`(${binding.getText(source)})`,
    {compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,state)();
  assert.equal(current('TERRAIN'),true,'the current render becomes usable after its Context effects');
  state.navigationEpoch.current++;state.foregroundLife.current.visible=false;
  assert.equal(current('TERRAIN'),false);
  state.foregroundLife.current.visible=true;assert.equal(current('TERRAIN'),false);
});

test('a queued retry binding effect cannot absorb hide-return retirement before the next render',()=>{
  const noop=()=>{};
  const state:any={navigationEpoch:{current:3},useMemo:(compute:()=>unknown)=>compute(),
    foregroundLife:{current:{visible:true,lease:{}}},nativeMap:{mapId:'map',isCurrent:()=>true},
    currentNativeMapRef:{current:{pending:false}},accountOwnerId:'owner',mapResetVersion:0,pageVisible:true,
    selectedSpotId:'spot',activeContext:{contextId:'current'},
    useAppStore:{getState:()=>({accountOwnerId:'owner',mapResetVersion:0,terrainEnabled:true})},
    skyEntry:{hide:noop},spotMapFocus:{cancel:noop},cancelLocation:noop,setCalendarOwner:noop,
    invalidateMapPointIntent:noop,stopPanelSpring:noop,editorPresentationScope:{current:{}},
    editorPresentation:{isClosing:()=>false,cancel:noop},setBottomPresentation:noop,setPageVisible:noop,
    panelDrag:{current:null},setPanelDragOffset:noop,setPanelDragging:noop};
  state.rasterRetryTicket=evaluate('rasterRetryTicket',state);
  state.currentRasterRetryTicket={current:state.rasterRetryTicket};
  const current=evaluate('rasterRetryCurrent',state);
  let binding:ts.Expression|undefined;
  function visit(node:ts.Node){
    if(ts.isCallExpression(node)&&node.expression.getText(source)==='useEffect'&&
      node.arguments[0]?.getText(source).includes('rasterRetryTicket.epoch ='))binding=node.arguments[0];
    ts.forEachChild(node,visit);
  }
  visit(source);assert(binding);
  state.foregroundLife.current.visible=false;evaluate('foregroundLife.current.hide',state)();
  state.foregroundLife.current.visible=true;
  vm.runInNewContext(ts.transpileModule(`(${binding.getText(source)})`,
    {compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,state)();
  assert.equal(current('TERRAIN'),false,'the actual visibility retirement survives a late passive binding effect');
});
