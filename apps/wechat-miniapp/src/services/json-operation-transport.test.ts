import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import type {MiniappApiJsonOperationId} from '@starward/miniapp-contracts';
import {createAuthenticatedOperationRequester} from './authenticated-operation';

test('every declared JSON operation dispatches the same method, encoded path, identity and request options', async()=>{
  const declaration=JSON.parse(readFileSync(new URL('../../../../packages/miniapp-contracts/api/miniapp.operations.json',import.meta.url),'utf8')) as {
    basePath:string;operations:{id:string;method:string;path:string;responseEnvelope?:boolean}[];
  };
  const calls:{key:string;path:string;options:any}[]=[];
  const request=createAuthenticatedOperationRequester({resolveSession:async()=>null,readStoredSession:()=>null,
    clearStoredSession(){assert.fail('a successful anonymous dispatch must not clear identity');},isPermissionDenied:()=>false,
    request:async(key,path,options)=>{calls.push({key,path,options});return {data:null} as any;}});
  const signal=new AbortController().signal;
  const operations=declaration.operations.filter(operation=>operation.responseEnvelope!==false);
  for(const operation of operations){
    const value='public /?一';
    const params=Object.fromEntries([...operation.path.matchAll(/\{([^}]+)\}/g)].map(match=>[match[1]!,value]));
    await request(`contract:${operation.id}`,operation.id as MiniappApiJsonOperationId,
      {pathParams:params,query:'view=current',signal,cache:false,independent:true,idempotencyKey:'same-command'});
    const call=calls.at(-1)!;
    assert.equal(call.key,`contract:${operation.id}`);
    assert.equal(call.path,declaration.basePath+operation.path.replace(/\{[^}]+\}/g,encodeURIComponent(value))+'?view=current');
    assert.equal(call.options.method,operation.method);
    assert.equal(call.options.signal,signal);assert.equal(call.options.cache,false);
    assert.equal(call.options.independent,true);assert.equal(call.options.idempotencyKey,'same-command');
  }
  assert.equal(calls.length,operations.length);
});
