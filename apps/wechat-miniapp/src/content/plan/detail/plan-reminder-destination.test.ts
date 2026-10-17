import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
import {planReminderRecoveryAction} from './plan-reminder-status';
import {planDestinationFailureDetail} from '../../../services/plan-destination-client';

test('production recovery mount inherits fresh visible account/version/intent gates',()=>{
  const source=ts.createSourceFile('page.tsx',readFileSync(new URL('./plan-editor-page.tsx',import.meta.url),'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  const conditions:string[][]=[];
  function visit(node:ts.Node) {
    if(ts.isJsxSelfClosingElement(node)&&node.tagName.getText(source)==='PlanReminderDestination') {
      const gates:string[]=[];
      for(let parent:ts.Node|undefined=node.parent;parent;parent=parent.parent)
        if(ts.isConditionalExpression(parent))gates.push(parent.condition.getText(source));
      conditions.push(gates.reverse());
    }
    ts.forEachChild(node,visit);
  }
  visit(source);assert.equal(conditions.length,1);assert.ok(conditions[0]!.length>=2);
  const base={pageVisible:true,planOwner:'a',activePlan:{revision:2},statusReminder:{notifyOnWechat:true},
    planQuery:{isPending:false,isError:false,refreshError:null,data:{dataState:'FRESH'}},
    selectedReminderNotification:{state:'CAPABILITY_UNAVAILABLE',reason:'DELIVERY_IDENTITY_REQUIRED',planRevision:2,scheduleVersion:'v'},planReminderRecoveryAction};
  const allows=(patch:Record<string,unknown>={})=>conditions[0]!.every(gate=>Boolean(vm.runInNewContext(gate,{...base,...patch})));
  assert.ok(allows());
  for(const patch of [{pageVisible:false},{planOwner:null},{activePlan:null},{statusReminder:{notifyOnWechat:false}},
    {selectedReminderNotification:{...base.selectedReminderNotification,planRevision:1}},
    {selectedReminderNotification:{...base.selectedReminderNotification,reason:'DELIVERY_NOT_CONFIGURED'}},
    {planQuery:{...base.planQuery,isPending:true}},{planQuery:{...base.planQuery,isError:true}},
    {planQuery:{...base.planQuery,refreshError:new Error('failed')}},
    {planQuery:{...base.planQuery,data:{dataState:'STALE_USABLE'}}}])assert.equal(allows(patch),false);
});

test('actual destination component prevents rapid duplicate verification and retires pending UI on account ABA/unmount',async()=>{
  let listener!: (value:{accountOwnerId:string})=>void;
  let cleanup!:()=>void;
  const states:unknown[]=[];
  let verifyCalls=0,finish!:()=>void,signal!:AbortSignal,unsubscribed=0;
  const createElement=(type:unknown,props:Record<string,any>|null,...children:unknown[])=>({type,props,children});
  const react={createElement,Fragment:'Fragment',useRef:(value:unknown)=>({current:value}),
    useState:(value:unknown)=>[value,(next:unknown)=>states.push(next)],useEffect:(effect:()=>()=>void)=>{cleanup=effect();}};
  const modules:Record<string,unknown>={
    react,'@tarojs/components':{Button:'Button',Text:'Text',View:'View'},
    '@/state/app-store':{useAppStore:{subscribe:(next:typeof listener)=>{listener=next;return ()=>{unsubscribed++;};}}},
    '@/services/plan-destination-client':{planDestinationFailureDetail},
    '@/services/api-client':{reverifyPlanReminderDestination:async(_owner:string,next:AbortSignal)=>{
      verifyCalls++;signal=next;await new Promise<void>(resolve=>{finish=resolve;});return {data:{state:'READY'}};
    }},
  };
  const exports:Record<string,any>={};
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL('./plan-reminder-destination.tsx',import.meta.url),'utf8'),{
    compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React,target:ts.ScriptTarget.ES2022},
  }).outputText,{exports,React:react,AbortController,require:(name:string)=>{assert.ok(modules[name],name);return modules[name];}});
  const tree=exports.PlanReminderDestination({owner:'a'});
  const button=tree.children.find((child:any)=>child?.type==='Button');assert.ok(button);
  button.props.onClick();button.props.onClick();assert.equal(verifyCalls,1);
  listener({accountOwnerId:'b'});listener({accountOwnerId:'a'});assert.ok(signal.aborted);
  const before=states.length;finish();await Promise.resolve();await Promise.resolve();
  assert.equal(states.length,before,'retired result cannot update UI even after owner returns');
  button.props.onClick();assert.equal(verifyCalls,1);
  cleanup();assert.equal(unsubscribed,1);button.props.onClick();assert.equal(verifyCalls,1);
});
