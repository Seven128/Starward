import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {QueryClient,QueryObserver} from '@tanstack/react-query';
import {catalogJsonIntegrity} from '../../../../../packages/miniapp-contracts/src/catalog-json-integrity.ts';
import type {ApiEnvelope,SaoIndexPublication} from '@starward/miniapp-contracts';
import {createSaoCatalogClient} from '../../services/sao-catalog-client';

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
