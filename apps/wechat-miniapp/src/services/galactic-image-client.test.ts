import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import ts from 'typescript';
import { skyResourceOriginTestOwner } from './sky-resource-origin-test-support';
import {MINIAPP_API_BASE_PATH,galacticImageManifestPath} from '@starward/miniapp-contracts';
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
  const api=vm.runInNewContext(ts.transpileModule(functions('./bare-sky-resource.ts')+'\n'+functions('./galactic-image-client.ts')+'\n({get:getGalacticImageManifest,metadataUrl:galacticImageManifestUrl})',
    {compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,{
    MINIAPP_API_BASE_PATH,galacticImageManifestPath,__MINIAPP_API_BASE__:'https://sky-test.starward.invalid',...skyResourceOriginTestOwner('https://sky-test.starward.invalid'),assertGalacticImageManifest,
    Taro:{request(options:any){
      requests.push(options.url);const response=responses[requests.length-1];assert(response,'unexpected extra request');
      queueMicrotask(()=>response.transportFailure?options.fail():options.success({statusCode:response.status,data:response.body}));
      return {abort(){}};
    }},
  }) as {get:(signal?:AbortSignal,publicationHash?:string)=>Promise<unknown>;metadataUrl:(publicationHash:string)=>string};
  return {...api,requests};
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

test('accepted optical and retained infrared selections read only their exact metadata and reject another edition',async()=>{
  for(const publication of [optical,infrared]){
    const c=consumer([{status:200,body:publication}]);
    assert.deepEqual(await c.get(undefined,publication.publicationHash),publication);
    assert.deepEqual(c.requests,['https://sky-test.starward.invalid'+galacticImageManifestPath(publication.publicationHash)]);
    const wrong=consumer([{status:200,body:publication===optical?infrared:optical}]);
    await assert.rejects(wrong.get(undefined,publication.publicationHash),/version_unavailable/);
  }
  for(const status of [404,500]){
    const c=consumer([{status},{status:200,body:optical}]);
    await assert.rejects(c.get(undefined,infrared.publicationHash));assert.equal(c.requests.length,1,'missing selected edition cannot borrow discovery');
  }
  const invalid=consumer([]);await assert.rejects(invalid.get(undefined,'../manifest'),/selection_invalid/);assert.equal(invalid.requests.length,0);
});

test('the actual Sky source panel links the accepted edition instead of changing discovery',()=>{
  const page=ts.createSourceFile('sky.tsx',readFileSync(new URL('../features/sky/spot-sky-page.tsx',import.meta.url),'utf8'),
    ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  const calls:ts.CallExpression[]=[];
  function visit(node:ts.Node){if(ts.isCallExpression(node)&&node.expression.getText(page)==='galacticImageManifestUrl')calls.push(node);ts.forEachChild(node,visit);}
  visit(page);assert.equal(calls.length,1);
  const expression=ts.transpileModule(calls[0]!.getText(page),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
  const c=consumer([]);
  for(const publication of [optical,infrared]){
    const url=vm.runInNewContext(expression,{galacticImageManifestUrl:c.metadataUrl,presentedGalacticPublication:publication});
    assert.equal(url,'https://sky-test.starward.invalid'+galacticImageManifestPath(publication.publicationHash));
    assert(!url.includes('/display/manifest'));
  }
});
