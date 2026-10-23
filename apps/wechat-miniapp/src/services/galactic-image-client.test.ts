import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import ts from 'typescript';
import { skyResourceOriginTestOwner } from './sky-resource-origin-test-support';
import {MINIAPP_API_BASE_PATH,galacticImageManifestPath} from '@starward/miniapp-contracts';
import {assertGalacticImageManifest} from './galactic-image-publication';
import {sourceCompositionTestScope} from '../sky/sources/source-recovery-test-support';
import type * as sourceDocuments from '../features/sky/sky-source-documents';
import type {SourceDocument} from '../utils/source-document';

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

test('the actual Sky source entry renders and copies the painted optical or infrared edition instead of discovery',async()=>{
  const page=ts.createSourceFile('sky.tsx',readFileSync(new URL('../features/sky/spot-sky-page.tsx',import.meta.url),'utf8'),
    ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  let entry:ts.Expression|undefined;
  function visit(node:ts.Node){
    if(ts.isVariableDeclaration(node)&&node.name.getText(page)==='openGalacticSources')entry=node.initializer;
    ts.forEachChild(node,visit);
  }
  visit(page);assert(entry,'the actual Sky source entry must exist');
  const expression=ts.transpileModule(`(${entry.getText(page)})`,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
  const scope=sourceCompositionTestScope('https://sky-test.starward.invalid');
  try{
    const documents=scope.module<typeof sourceDocuments>('features/sky/sky-source-documents.ts');
    const {SOURCE_READING_ROUTE}=scope.module('utils/source-document.ts');
    let painted:any,opened:Array<{route:string;document:SourceDocument}>=[];
    const image={};
    const open=vm.runInNewContext(expression,{...documents,SOURCE_READING_ROUTE,
      currentPaintedSkySourceFrame:()=>painted,skyNativeImageIsCurrent:(candidate:unknown)=>candidate===image,
      openSkySources:(route:string,document:SourceDocument)=>{opened.push({route,document});},
    }) as (publication:typeof optical)=>void;
    for(const publication of [optical,infrared]){
      painted={galacticImage:{publication,image}};open(publication);
      assert.equal(opened.at(-1)?.route,SOURCE_READING_ROUTE);
      await scope.document(opened.at(-1)!.document);
      const url='https://sky-test.starward.invalid'+galacticImageManifestPath(publication.publicationHash);
      assert(scope.text.includes(publication.source.credit),'the actual rights template keeps the full selected credit');
      assert(scope.text.includes(publication.processing));
      for(const limitation of publication.limitations)assert(scope.text.includes(limitation));
      assert(scope.text.includes(url));assert(!scope.text.includes('/display/manifest'));
      await scope.click('复制数据清单链接');assert.equal(scope.clipboard.at(-1),url);
      const count=opened.length;
      open(publication===optical?infrared:optical);assert.equal(opened.length,count,'another edition cannot borrow the painted entry');
      painted.galacticImage.image={};open(publication);assert.equal(opened.length,count,'a retired native image cannot open old credit');
    }
    assert.equal(scope.transport.calls.length,0,'reading exact metadata must not discover a replacement or download images');
  }finally{await scope.dispose();}
});
