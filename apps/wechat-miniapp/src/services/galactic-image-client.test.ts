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
import {skyPageTimeTestBindings} from '../features/sky/sky-optical-page-test-support';
import type * as sourceDocuments from '../features/sky/sky-source-documents';
import type * as sceneResources from '../features/sky/sky-scene-resources';
import type * as nativeImages from '../features/sky/sky-artwork-loader';
import type * as sceneFrame from '../features/sky/sky-scene-frame';
import type {ResolvedSkyReport} from '../features/sky/sky-stellar-scene';
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
  const names=['currentPaintedSkySourceFrame','openGalacticSources'] as const;
  const entries=new Map<string,ts.Expression>();
  function visit(node:ts.Node){
    if(ts.isVariableDeclaration(node)&&node.initializer&&names.some(name=>node.name.getText(page)===name))
      entries.set(node.name.getText(page),node.initializer);
    ts.forEachChild(node,visit);
  }
  visit(page);
  for(const name of names)assert(entries.has(name),`the actual Sky source reader must exist: ${name}`);
  const expression=ts.transpileModule(names.map(name=>`const ${name}=${entries.get(name)!.getText(page)};`).join('\n')+
    '\nopenGalacticSources;',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
  const scope=sourceCompositionTestScope('https://sky-test.starward.invalid');
  const retirements:Array<()=>void>=[];
  try{
    const documents=scope.module<typeof sourceDocuments>('features/sky/sky-source-documents.ts');
    const {SOURCE_READING_ROUTE}=scope.module('utils/source-document.ts');
    const {liveSkySceneResources}=scope.module<typeof sceneResources>('features/sky/sky-scene-resources.ts');
    const {registerSkyNativeImageLifetime,skyNativeImageIsCurrent}=scope.module<typeof nativeImages>('features/sky/sky-artwork-loader.ts');
    const {createSkySceneFrameIdentity}=scope.module<typeof sceneFrame>('features/sky/sky-scene-frame.ts');
    const at='2026-09-22T13:00:00.000Z';
    const time=skyPageTimeTestBindings(at);
    // Controlled accepted metadata is not GPU evidence. The actual page reader
    // and its shared live projection must observe the same native lifetime.
    const data={context:{contextId:'source-test',contextRevision:1,contextFingerprint:'source-test:1'}} as unknown as ResolvedSkyReport;
    const identity=createSkySceneFrameIdentity({observation:{data,frameAt:at},
      view:{heading:null,pose:null,manualBasis:null,mode:'NIGHT',verticalFovDeg:45},
      canvas:{generation:1,width:390,height:844}});
    const painted={current:null as (sceneResources.SkyCompletedSceneResources&{
      identity:sceneFrame.SkySceneFrameIdentity;nativeCanvasGeneration:number;timeGeneration:number;
    })|null};
    const opened:Array<{route:string;document:SourceDocument}>=[];
    const open=vm.runInNewContext(expression,{...documents,SOURCE_READING_ROUTE,
      liveSkySceneResources,...time,presentedSkyFrameRef:painted,
      observationTime:{snapshot:()=>time.timeIntent},skyTimeIntentCurrent:()=>true,
      orientationData:data,rawReportData:data,nativeCanvasMounted:true,canvasError:null,
      paintedSkyObjectsRef:{current:{identity}},canvasGenerationRef:{current:1},mode:'NIGHT',
      openSkySources:(route:string,document:SourceDocument)=>{opened.push({route,document});},
    }) as (publication:typeof optical)=>void;
    for(const publication of [optical,infrared]){
      const image={},retire=registerSkyNativeImageLifetime(image,()=>true);retirements.push(retire);
      painted.current={identity,nativeCanvasGeneration:1,timeGeneration:time.timeIntent.presentationGeneration,
        sdssOptical:null,preparedRegions:[],deepSkyImage:null,
        galacticImage:{publication,image},opticalHips:[],bodyImages:[],landscape:null};
      open(publication);
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
      retire();assert.equal(skyNativeImageIsCurrent(image),false);
      open(publication);assert.equal(opened.length,count,'a retired native image cannot open old credit');
      assert.strictEqual(painted.current.galacticImage?.image,image,'live reads do not rewrite the accepted contribution');
    }
    assert.equal(scope.transport.calls.length,0,'reading exact metadata must not discover a replacement or download images');
  }finally{retirements.forEach(retire=>retire());await scope.dispose();}
});
