import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
import {createSkyContextSession} from './sky-context-session';
import {createSkyObservationTime} from './sky-observation-time';
import type {ObservationContext} from '@starward/miniapp-contracts';
import {skyFailureTestEpisodes} from './sky-failure-test-support';

const source=ts.createSourceFile('spot-sky-page.tsx',readFileSync(new URL('./spot-sky-page.tsx',import.meta.url),'utf8'),
  ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
const page=source.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='SpotSkyPage') as ts.FunctionDeclaration;
const names=['skyInteractionRevision','skyPageVisibleCurrent','skyInteractionCurrent','skyTimeIntentCurrent','skyDisplayCurrent',
  'recoverSkyResource','reportRecoveryRef','canRetryReport','retryReport','retrySkyData','retryStellarSupplement'];
const statements=page.body!.statements.filter(node=>ts.isVariableStatement(node)&&
  node.declarationList.declarations.some(declaration=>names.includes(declaration.name.getText(source)))||
  ts.isExpressionStatement(node)&&/^reportRecoveryRef\.current\s*=/.test(node.expression.getText(source)));
const code=ts.transpileModule('(()=>{const {pageVisible,contextComplete,activeContext,contextSession,autoRestoreAttemptedRef,report,stellarReference,stellarCatalog,useRef,useCallback,'+
  'viewportActiveRef,viewportMountedRef,timeSaving,orientationController,observationTime,timeBinding,committedAt,useAppStore,mode,canvasLifecycle,browsingDrawRef,failureEpisodes,stellarSupplement}=bindings;'+
  statements.map(node=>node.getText(source)).join('\n')+'\nreturn {retrySkyData,retryReport,retryStellarSupplement};})()',
  {compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
function fixture(){
  const context={contextId:'ctx:a' as ObservationContext['contextId'],contextFingerprint:'a:1',revision:1};
  let state={observationContext:context,selectedSpotId:'spot:a',mapResetVersion:0,spotOpenRequestVersion:0};
  const contextSession=createSkyContextSession('ctx:a',()=>state);
  const committedAt='2026-10-11T00:00:00.000Z',timeBinding='ctx:a:1:a:1';
  const observationTime=createSkyObservationTime();observationTime.bind(timeBinding,committedAt,null);
  const autoRestoreAttemptedRef={current:true},shared={current:null as unknown};
  let reports=0,stars=0;
  const sandbox={pageVisible:true,contextComplete:true,activeContext:context,contextSession,autoRestoreAttemptedRef,
    failureEpisodes:skyFailureTestEpisodes(),stellarSupplement:{retry:()=>{}},
    viewportActiveRef:{current:true},viewportMountedRef:{current:true},timeSaving:false,observationTime,timeBinding,committedAt,
    orientationController:{snapshot:()=>({alignment:{mode:'auto'}})},mode:'NIGHT',useAppStore:{getState:()=>({...state,mode:'NIGHT'})},
    canvasLifecycle:{resize:()=>{}},browsingDrawRef:{current:()=>{}},
    report:{refetch:()=>reports++},stellarReference:{},stellarCatalog:{refetch:()=>stars++},
    useRef:(value:unknown)=>{shared.current??=value;return shared;},useCallback:(callback:unknown)=>callback};
  const render=()=>vm.runInNewContext(code,{bindings:sandbox}) as {retrySkyData():void;retryReport():boolean;retrySkyRendering():void;retryStellarSupplement():void};
  return {sandbox,contextSession,autoRestoreAttemptedRef,render,counts:()=>[reports,stars],
    changeSelection(field:'selectedSpotId'|'mapResetVersion'|'spotOpenRequestVersion'){
      state={...state,[field]:field==='selectedSpotId'?'spot:b':1};
    }};
}

test('actual report retry is fenced synchronously by hide and newer location selection',()=>{
  for(const change of ['hide','selectedSpotId','mapResetVersion','spotOpenRequestVersion'] as const){
    const h=fixture(),action=h.render().retrySkyData;
    if(change==='hide')h.contextSession.hide();else h.changeSelection(change);
    action();assert.deepEqual(h.counts(),[0,0],change);
    assert.equal(h.autoRestoreAttemptedRef.current,true,'obsolete action cannot re-arm Context recovery');
  }
});

test('actual report retry uses current query callbacks and remains available without report data',()=>{
  const h=fixture(),action=h.render().retrySkyData;let currentReports=0,currentStars=0;
  h.sandbox.report={refetch:()=>++currentReports};h.sandbox.stellarCatalog={refetch:()=>++currentStars};
  h.render();action();assert.deepEqual(h.counts(),[0,0]);
  assert.equal(currentReports,1);assert.equal(currentStars,1);assert.equal(h.autoRestoreAttemptedRef.current,false);
});

test('report retry cannot race an in-flight Context update but works after it finishes',()=>{
  const h=fixture(),action=h.render().retrySkyData,ticket=h.contextSession.begin(h.sandbox.activeContext)!;
  assert.ok(ticket);action();assert.deepEqual(h.counts(),[0,0]);
  h.contextSession.finish(ticket);action();assert.deepEqual(h.counts(),[1,1]);
});

test('actual report consumers dispatch only after the common Context recovery gate succeeds',()=>{
  const callbacks:ts.Expression[]=[];
  function visit(node:ts.Node){
    if(ts.isJsxAttribute(node)&&node.initializer&&ts.isJsxExpression(node.initializer)&&node.initializer.expression&&
      ['onRetrySky','onRecover','onClick'].includes(node.name.getText(source))&&
      /\bretryReport\b/.test(node.initializer.expression.getText(source)))callbacks.push(node.initializer.expression);
    ts.forEachChild(node,visit);
  }
  visit(page);assert.equal(callbacks.length,5,'all selected-object, weather and status callbacks');
  for(const expression of callbacks){
    const h=fixture();let supplements=0,resets=0,draws=0;h.sandbox.stellarSupplement.retry=()=>{supplements++;};
    h.sandbox.canvasLifecycle.resize=()=>{resets++;};h.sandbox.browsingDrawRef.current=()=>{draws++;};
    const compile=()=>{const recovery=h.render();return vm.runInNewContext(ts.transpileModule('('+expression.getText(source)+');',
      {compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,{retryReport:recovery.retryReport,
      stellarSupplement:h.sandbox.stellarSupplement,retryStellarSupplement:recovery.retryStellarSupplement,
      retrySkyRendering:recovery.retrySkyRendering}) as ()=>void;};
    const action=compile();
    h.contextSession.hide();action();assert.deepEqual([...h.counts(),supplements,resets,draws],[0,0,0,0,0]);
    h.contextSession.show();action();assert.deepEqual([...h.counts(),supplements,resets,draws],[0,0,0,0,0],
      'a callback from before hide must not recover the returned surface');
    compile()();assert.equal(h.counts()[0],1,'a real current click must reach report refetch');
    if(/stellarSupplement|retryStellarSupplement/.test(expression.getText(source)))assert.equal(supplements,1);
    if(expression.getText(source).includes('retrySkyRendering'))assert.deepEqual([resets,draws],[1,1]);
  }
});
