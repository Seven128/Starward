import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {QueryClient,QueryObserver} from '@tanstack/react-query';
import {catalogJsonIntegrity} from '../../../../../packages/miniapp-contracts/src/catalog-json-integrity.ts';
import type {ApiEnvelope,SaoIndexPublication} from '@starward/miniapp-contracts';
import {createSaoCatalogClient} from '../../services/sao-catalog-client';
import {saoCatalogSource} from '../../../../../workers/miniapp-api/src/sao-catalog-source.ts';

function realSaoEnvelope():ApiEnvelope<SaoIndexPublication>{
 const directory=new URL('../../../../../workers/miniapp-api/assets/sao-v2/',import.meta.url);
 const index=JSON.parse(readFileSync(new URL('index.json',directory),'utf8'));
 return {apiVersion:'v2',data:{publicationHash:catalogJsonIntegrity(index).sha256,index},dataState:'FRESH',
  generatedAt:'2026-10-03T13:00:00.000Z',validAt:null,sources:[saoCatalogSource(index)],warnings:[],etag:'fixture-index',requestId:'fixture-index'};
}

test('SAO file consumer preserves real scientific/source binding and rejects clear-retired metadata or late tile',async()=>{
 const envelope=realSaoEnvelope();let epoch=0,files=0,oldApi=0,release!:(v:unknown)=>void;
 const client=createSaoCatalogClient({index:async()=>envelope,tile:async()=>{oldApi++;assert.fail('file consumer fell back to generic tile cache');},
  fileTile:async()=>{files++;return new Promise(resolve=>{release=resolve;});},
  generation(){const captured=epoch;return {isCurrent:()=>captured===epoch};},invalidateIndex(){assert.fail();},invalidateTile(){assert.fail();}});
 const publication=(await client.getIndex()).data,tile=publication.index.tiles[0]!;
 const body=JSON.parse(readFileSync(new URL(`../../../../../workers/miniapp-api/assets/sao-v2/${tile.file}`,import.meta.url),'utf8'));
 const normal=client.getTile(publication,tile.id);release(body);const result=await normal;
 assert.equal(result.data.tile.rows.length,tile.rowCount);assert.deepEqual(result.sources,envelope.sources);assert.equal(result.etag,`W/"${tile.sha256}"`);
 const late=client.getTile(publication,tile.id);epoch++;release(body);await assert.rejects(late,/retired_index/);
 await assert.rejects(client.getTile(publication,tile.id),/retired_index/);assert.equal(files,2);assert.equal(oldApi,0);
 const fresh=(await client.getIndex()).data;
 assert.notEqual(fresh,publication,'refresh cannot reuse a retired publication capability');
 await assert.rejects(client.getTile(publication,tile.id),/retired_index/,'another observer refresh cannot revive a retired publication capability');
 const recovered=client.getTile(fresh,tile.id);release(body);assert.equal((await recovered).data.tile.tileId,tile.id);
});

test('clear while SAO index delivery is pending cannot capture a new generation for old work',async()=>{
 let epoch=0,release!:(v:ApiEnvelope<SaoIndexPublication>)=>void;
 const client=createSaoCatalogClient({index:()=>new Promise(resolve=>{release=resolve;}),tile:async()=>{assert.fail();},
  generation(){const captured=epoch;return {isCurrent:()=>captured===epoch};},invalidateIndex(){assert.fail();},invalidateTile(){assert.fail();}});
 const pending=client.getIndex();epoch++;release(realSaoEnvelope());await assert.rejects(pending,/retired_index/);
});

function functionBody(file:URL,name:string){
  const source=ts.createSourceFile(file.href,readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true);
  const fn=source.statements.find((n):n is ts.FunctionDeclaration=>ts.isFunctionDeclaration(n)&&n.name?.text===name)!;
  return ts.transpileModule(fn.getText(source).replace(/^export /u,'')+`\n${name};`,{compilerOptions:{target:ts.ScriptTarget.ES2020}}).outputText;
}

test('actual sky hook forwards immutable query policy; a changed publication remains client-valid after Query observer storage',async()=>{
  let options:any;
  const useResourceQuery=vm.runInNewContext(functionBody(new URL('../../hooks/use-resource-query.ts',import.meta.url),'useResourceQuery'),{
    useQuery:(value:any)=>{options=value;return {data:undefined,error:null,isFetching:false};},useEffect(){},recordAcceptanceDiagnostic(){},
  });
  const hook=vm.runInNewContext(functionBody(new URL('./use-sky-stellar-supplement.ts',import.meta.url),'useSkyStellarSupplement'),{
    useResourceQuery,useEffect(){},useRef:(v:unknown)=>({current:v}),useState:()=>[null,()=>{}],useMemo:(f:()=>unknown)=>f(),useCallback:(f:unknown)=>f,
    EMPTY:{tiles:[],loading:false,failed:false},
  });
  hook(undefined,undefined,null,false);assert.equal(options.structuralSharing,false);
  const location=new URL('../../../../../workers/miniapp-api/assets/sao/',import.meta.url);
  const oldIndex=JSON.parse(readFileSync(new URL('index.json',location),'utf8'));
  const dates=oldIndex.acquisition.map((a:any)=>a.retrievedAt);assert(dates.every((v:any)=>v===null));
  let revision=0,requests=0;
  const client=createSaoCatalogClient({async index(){
    const index=structuredClone(oldIndex);index.partition+=` revision ${revision}`;
    return {apiVersion:'v2',data:{publicationHash:catalogJsonIntegrity(index).sha256,index},dataState:'FRESH',generatedAt:new Date().toISOString(),
      sources:[{id:`sao:${index.catalogHash}`,kind:'OPEN_DATA',sourceUrl:index.sources.landingUrl,licenseUrl:index.sources.rightsUrl,
        license:'U.S. government works (NASA dataset metadata)',retrievedAt:null,provider:'SAO / NASA HEASARC',title:'SAO J2000',
        publishedAt:null,validFrom:null,validTo:null,state:'FRESH',confidence:null,precision:'FK5 J2000',limitations:[]}],warnings:[],etag:'x',requestId:'x',validAt:null} as ApiEnvelope<SaoIndexPublication>;
  },async tile(hash,id){requests++;return {data:{publicationHash:hash,tile:JSON.parse(readFileSync(new URL(`${id}.json`,location),'utf8'))},
    sources:(await client.getIndex()).sources} as any;},invalidateIndex(){assert.fail();},invalidateTile(){assert.fail();}});
  async function observe(structuralSharing:boolean){
    const query=new QueryClient({defaultOptions:{queries:{retry:false,gcTime:0}}});
    const observer=new QueryObserver(query,{...options,enabled:false,queryFn:()=>client.getIndex(),structuralSharing});
    try{
      await observer.refetch();revision++;await observer.refetch();
      const fromObserver=observer.getCurrentResult().data as ApiEnvelope<SaoIndexPublication>;
      if(structuralSharing){await assert.rejects(()=>client.getTile(fromObserver.data,fromObserver.data.index.tiles[0]!.id),/unvalidated_index/);}
      else{assert(Object.isFrozen(fromObserver.data));await client.getTile(fromObserver.data,fromObserver.data.index.tiles[0]!.id);}
    }finally{observer.destroy();query.clear();}
  }
  await observe(options.structuralSharing);assert.equal(requests,1);
  await observe(true);assert.equal(requests,1,'negative control demonstrates old policy fails before network');
});
