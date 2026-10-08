import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import ts from 'typescript';
import {MINIAPP_API_BASE_PATH} from '@starward/miniapp-contracts';
import {assertGalacticImageManifest} from './galactic-image-publication';

// Actual consumer and same-origin/cancellation boundary; transport callbacks
// are controlled here. HTTP/runtime observations remain separate evidence.
const functions=(file:string)=>{
  const source=ts.createSourceFile(file,readFileSync(new URL(file,import.meta.url),'utf8'),ts.ScriptTarget.Latest,true);
  return source.statements.filter(ts.isFunctionDeclaration).map(s=>s.getText(source).replace(/^export /u,'')).join('\n');
};
function manifest(directory:string){
  const bytes=readFileSync(new URL(`../../../../workers/miniapp-api/assets/deep-sky/${directory}/manifest.json`,import.meta.url));
  const value=JSON.parse(bytes.toString()),publicationHash=createHash('sha256').update(bytes).digest('hex');
  return {...value,publicationHash,image:{...value.image,downloadUrl:`/v2/sky/galactic/${publicationHash}/${value.image.file}`}};
}
const optical=manifest('galactic-mellinger'),infrared=manifest('galactic-2mass');
function consumer(responses:Array<{status:number;body?:unknown;transportFailure?:boolean}>){
  const requests:string[]=[];
  const get=vm.runInNewContext(ts.transpileModule(functions('./bare-sky-resource.ts')+'\n'+functions('./galactic-image-client.ts')+'\ngetGalacticImageManifest',
    {compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,{
    MINIAPP_API_BASE_PATH,__MINIAPP_API_BASE__:'https://sky-test.starward.invalid',assertGalacticImageManifest,
    Taro:{request(options:any){
      requests.push(options.url);const response=responses[requests.length-1];assert(response,'unexpected extra request');
      queueMicrotask(()=>response.transportFailure?options.fail():options.success({statusCode:response.status,data:response.body}));
      return {abort(){}};
    }},
  }) as ()=>Promise<unknown>;
  return {get,requests};
}

test('new clients discover the ordinary optical role on its versioned URL',async()=>{
  const c=consumer([{status:200,body:optical}]);
  assert.deepEqual(await c.get(),optical);
  assert.deepEqual(c.requests,['https://sky-test.starward.invalid/v2/sky/galactic/display/manifest']);
});

test('a previous API 404 falls back once to the original infrared contract',async()=>{
  const c=consumer([{status:404},{status:200,body:infrared}]);
  assert.deepEqual(await c.get(),infrared);
  assert.deepEqual(c.requests,['https://sky-test.starward.invalid/v2/sky/galactic/display/manifest',
    'https://sky-test.starward.invalid/v2/sky/galactic/manifest']);
});

test('server, transport and corrupt-current failures cannot mask an optical error with old infrared success',async()=>{
  for(const response of [{status:500},{status:0,transportFailure:true},{status:200,body:{...optical,scope:'TRIAL'}}]){
    const c=consumer([response,{status:200,body:infrared}]);
    await assert.rejects(c.get());assert.equal(c.requests.length,1);
  }
});
