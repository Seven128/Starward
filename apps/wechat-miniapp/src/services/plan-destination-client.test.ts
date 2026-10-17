import assert from 'node:assert/strict';
import test from 'node:test';
import { createPlanDestinationClient,planDestinationFailureDetail } from './plan-destination-client';
import type { createAuthenticatedOperationRequester } from './authenticated-operation';

type Request=ReturnType<typeof createAuthenticatedOperationRequester>;
test('different WeChat identity has a concrete recovery instruction without exposing transport errors',()=>{
  assert.match(planDestinationFailureDetail(new Error('WECHAT_IDENTITY_MISMATCH')),/切回此计划所属的微信账号/);
  assert.doesNotMatch(planDestinationFailureDetail(new Error('synthetic-private-error')),/synthetic-private-error/);
});
const response=(state:'READY'|'UNAVAILABLE')=>({data:{state}});
test('explicit destination verification binds fresh code and current session; only READY refreshes its own plans',async()=>{
  let native=0,requests=0,confirmed=0;
  let state:'READY'|'UNAVAILABLE'='READY';
  const controller=new AbortController();
  const run=createPlanDestinationClient({currentUser:()=> 'a',login:async()=>{native++;return {code:'synthetic-fresh'};},
    request:(async(_key,operation,options,retried,owner)=>{
      requests++;assert.equal(operation,'reminderDestinationReverifyPost');assert.equal(owner,'a');assert.equal(retried,false);
      assert.equal(options?.reauthenticationCode,'synthetic-fresh');assert.equal(options?.cache,false);
      assert.equal(options?.signal,controller.signal);assert.equal(options?.independent,true);
      return response(state);
    }) as Request,confirmed:async owner=>{assert.equal(owner,'a');confirmed++;}});
  assert.equal(native,0,'creation cannot initiate native login');
  assert.equal((await run('a',controller.signal)).data.state,'READY');
  state='UNAVAILABLE';await run('a',controller.signal);
  assert.equal(native,2);assert.equal(requests,2);assert.equal(confirmed,1);
});

test('retired native login including account ABA never submits a late code; retired HTTP never refreshes cache',async()=>{
  let finish!: (value:{code:string})=>void;
  let requests=0,confirmed=0,current='a';
  const login=()=>new Promise<{code:string}>(resolve=>{finish=resolve;});
  const controller=new AbortController();
  const run=createPlanDestinationClient({currentUser:()=>current,login,
    request:(async()=>{requests++;return response('READY');}) as Request,confirmed:async()=>{confirmed++;}});
  const waiting=run('a',controller.signal);
  current='b';controller.abort();current='a';finish({code:'late'});
  await assert.rejects(waiting,/取消/);assert.equal(requests,0);assert.equal(confirmed,0);
  let complete!:()=>void;
  const next=new AbortController();
  const http=createPlanDestinationClient({currentUser:()=>current,login:async()=>({code:'fresh'}),
    request:(async()=>{await new Promise<void>(resolve=>{complete=resolve;});return response('READY');}) as Request,
    confirmed:async()=>{confirmed++;}});
  const pending=http('a',next.signal);await Promise.resolve();next.abort();complete();
  await assert.rejects(pending,/取消/);assert.equal(confirmed,0);
});

test('wrong owner, cancellation, native failure and missing code cannot reach the authenticated mutation',async()=>{
  let requests=0,login=0;
  const make=(native:()=>Promise<{code?:string}>)=>createPlanDestinationClient({currentUser:()=> 'b',
    login:async()=>{login++;return native();},request:(async()=>{requests++;return response('READY');}) as Request,confirmed:async()=>{}});
  const active=new AbortController();
  await assert.rejects(make(async()=>({code:'x'}))('a',active.signal),/账户已变化/);
  assert.equal(login,0);
  active.abort();await assert.rejects(make(async()=>({code:'x'}))('b',active.signal),/取消/);
  await assert.rejects(make(async()=>({}))('b',new AbortController().signal),/未完成/);
  await assert.rejects(make(async()=>{throw new Error('native failed');})('b',new AbortController().signal),/native failed/);
  assert.equal(requests,0);
});
