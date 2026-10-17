import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
import {observationNightForInstant} from '../../components/observation-date.ts';
import {createSkyContextSession} from './sky-context-session.ts';

const source=ts.createSourceFile('page.tsx',readFileSync(process.env.CLOUD_SKY_CONTEXT_ENTRY_SOURCE ??
  new URL('./spot-sky-page.tsx',import.meta.url),'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
const page=source.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='SpotSkyPage') as ts.FunctionDeclaration;
const declarations=new Map<string,ts.Expression>();
let recovery:ts.JsxSelfClosingElement|undefined;
function visit(node:ts.Node){
  if(ts.isVariableDeclaration(node)&&node.initializer)declarations.set(node.name.getText(source),node.initializer);
  if(ts.isJsxSelfClosingElement(node)&&node.tagName.getText(source)==='ContextError')recovery=node;
  ts.forEachChild(node,visit);
}
visit(page);assert.ok(recovery);
const compile=(text:string)=>ts.transpileModule(text,{compilerOptions:{target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.React}}).outputText;
const helpers=['isDate','isSelectedAt','validTimezone','observationDateFor'].map(name=>{
  const node=source.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text===name);assert.ok(node);return node.getText(source);
}).join('\n');
const valid={spotId:'spot:a',contextId:'ctx:a',localDate:'2026-10-09',selectedAt:'2026-10-09T13:00:00Z',timezone:'Asia/Shanghai',dataRevision:'revision'};
const route=(patch:object={})=>vm.runInNewContext(compile(helpers+'\n'+declarations.get('routeContextComplete')!.getText(source)),
  {routeContext:{...valid,...patch},observationNightForInstant,useMemo:(compute:()=>unknown)=>compute()});

test('invalid route parameters cannot start the Context lookup while formal and proposal routes remain usable',()=>{
  assert.equal(route(),true);assert.equal(route({spotId:'contribution:a'}),true);
  for(const patch of [{spotId:'other:a'},{contextId:''},{localDate:'2026-02-30'},{selectedAt:'invalid'},
    {selectedAt:'2026-10-10T13:00:00Z'},{timezone:'bad/timezone'},{dataRevision:''}])assert.equal(route(patch),false,JSON.stringify(patch));
  const expression=declarations.get('contextLookupEnabled');assert.ok(expression);
  let calls=0;
  const enabled=(complete:boolean)=>vm.runInNewContext(compile(expression.getText(source)),{routeContextComplete:complete,pageVisible:true,
    contextSession:{canLookup:()=>{calls++;return true;}},routeContext:valid,storedContext:null});
  assert.equal(enabled(false),false);assert.equal(calls,0);assert.equal(enabled(true),true);assert.equal(calls,1);
});

test('the actual recovery control retries only the live lookup owner and keeps return available',()=>{
  let state={observationContext:null,selectedSpotId:'spot:a',mapResetVersion:0,spotOpenRequestVersion:0};
  const session=createSkyContextSession('ctx:a',()=>state);
  let reads=0,returns=0;
  const contextError=source.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='ContextError');assert.ok(contextError);
  const api=vm.runInNewContext(compile(contextError.getText(source)+'\nContextError;'),{
    View:'View',StatusPanel:'StatusPanel',skyReportAccessRejection:(error:unknown)=>error instanceof Error&&error.message==='denied'?error:null,
    React:{createElement:(type:unknown,props:unknown,...children:unknown[])=>({type,props,children})}});
  const readProps=(input:object={})=>vm.runInNewContext(compile(recovery!.getText(source)),{
    ContextError:api,activeContext:null,contextLookupEnabled:true,contextLookup:{isError:true,error:new Error('offline'),refetch:()=>{reads++;}},
    contextSession:session,returnToSkyEntry:()=>{returns++;},...input,
    React:{createElement:(_type:unknown,props:object)=>props}});
  const props=readProps();const panel=api(props).children[0];
  assert.equal(panel.props.state,'ERROR');assert.equal(panel.props.recoveryLabel,'重试恢复');
  panel.props.onRecover();assert.equal(reads,1);
  session.hide();panel.props.onRecover();assert.equal(reads,1,'hidden queued retry cannot start a request');
  session.show();state={...state,selectedSpotId:'spot:b'};panel.props.onRecover();assert.equal(reads,1,'changed-place retry cannot start an old request');
  props.onBack();assert.equal(returns,1);
  for(const input of [{activeContext:{}},{contextLookupEnabled:false},{contextLookup:{isError:false,error:null}}]){
    const next=readProps(input);assert.equal(next.onRetry,undefined);
    assert.equal(api(next).children[0].props.recoveryLabel,'返回入口');
  }
  const denied=api({...props,lookupError:new Error('denied')}).children[0];
  assert.equal(denied.props.state,'ERROR');assert.equal(denied.props.recoveryLabel,'重新核验');
});
