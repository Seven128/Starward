import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
import type {SaoIndexPublication,SaoTilePublication} from '@starward/miniapp-contracts';
import {createSkyStellarTileLoader} from './sky-stellar-tile-loader';

// This exercises the production Hook's React ownership and real tile loader.
// Scientific selection/projection are controlled here; their correctness is
// covered at their own boundaries, not inferred from this lifecycle fixture.
const source=ts.createSourceFile('use-sky-stellar-supplement.ts',
  readFileSync(new URL('./use-sky-stellar-supplement.ts',import.meta.url),'utf8'),ts.ScriptTarget.Latest,true);
const declaration=source.statements.find(node=>ts.isFunctionDeclaration(node)&&
  node.name?.text==='useSkyStellarSupplement') as ts.FunctionDeclaration;
assert.ok(declaration);
const page=ts.createSourceFile('spot-sky-page.tsx',readFileSync(new URL('./spot-sky-page.tsx',import.meta.url),'utf8'),
  ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
const calls:ts.CallExpression[]=[];
function visit(node:ts.Node){
  if(ts.isCallExpression(node)&&ts.isIdentifier(node.expression)&&node.expression.text==='useSkyStellarSupplement')calls.push(node);
  ts.forEachChild(node,visit);
}
visit(page);assert.equal(calls.length,1);
function pageActive(visible:boolean){
  return Boolean(vm.runInNewContext(ts.transpileModule(`(${calls[0]!.arguments[3]!.getText(page)})`,
    {compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,{
      pageVisible:visible,rawReportData:{},report:{data:{dataState:'FRESH'},isError:false},
    }));
}
const assets=new URL('../../../../../workers/miniapp-api/assets/sao/',import.meta.url);
const publication:SaoIndexPublication={
  publicationHash:JSON.parse(readFileSync(new URL('publication.json',assets),'utf8')).publicationHash,
  index:JSON.parse(readFileSync(new URL('index.json',assets),'utf8')),
};
const ids=publication.index.tiles.slice(0,3).map(tile=>tile.id);
const tick=()=>new Promise<void>(resolve=>setImmediate(resolve));

function fixture(){
  const slots:any[]=[],effects:Array<()=>void>=[];
  const requests:Array<{publication:SaoIndexPublication;id:string;signal:AbortSignal;finish():void}>=[];
  let cursor=0,dirty=false,current:SaoIndexPublication|undefined=publication;
  const same=(previous:unknown[]|undefined,next:unknown[])=>previous?.length===next.length&&
    next.every((value,index)=>Object.is(value,previous![index]));
  const bindings={
    EMPTY:{tiles:[],loading:false,failed:false},createSkyStellarTileLoader,
    useResourceQuery:()=>({data:current?{data:current,sources:[],dataState:'FRESH'}:undefined,
      isFetching:false,isError:false,refetch:()=>undefined}),
    saoCatalogClient:{getTile:(owner:SaoIndexPublication,id:string,signal:AbortSignal)=>new Promise(resolve=>{
      requests.push({publication:owner,id,signal,finish(){
        const data:SaoTilePublication={publicationHash:owner.publicationHash,
          tile:JSON.parse(readFileSync(new URL(`${id}.json`,assets),'utf8'))};
        resolve({data,dataState:'FRESH'});
      }});
    })},
    supplementGeometry:()=>({}),selectSkyStellarTiles:()=>ids.map(id=>({id})),
    resolveSkyStellarSupplement:(_owner:unknown,tiles:readonly SaoTilePublication[])=>({tiles}),
    useRef(initial:unknown){const index=cursor++;return slots[index]??={current:initial};},
    useState(initial:unknown){
      const index=cursor++;if(!(index in slots))slots[index]=initial;
      return [slots[index],(value:any)=>{
        const next=typeof value==='function'?value(slots[index]):value;
        if(!Object.is(next,slots[index])){slots[index]=next;dirty=true;}
      }];
    },
    useMemo(compute:()=>unknown,deps:unknown[]){
      const index=cursor++,previous=slots[index];
      if(!same(previous?.deps,deps))slots[index]={deps,value:compute()};
      return slots[index].value;
    },
    useCallback(callback:unknown){cursor++;return callback;},
    useEffect(effect:()=>void|(()=>void),deps:unknown[]){
      const index=cursor++,previous=slots[index];if(same(previous?.deps,deps))return;
      slots[index]={deps};effects.push(()=>{previous?.cleanup?.();slots[index].cleanup=effect();});
    },
  };
  const hook=vm.runInNewContext(ts.transpileModule(`${declaration.getText(source).replace(/^export /u,'')}\nuseSkyStellarSupplement`,
    {compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,bindings);
  const scene={publication:{},observer:{}},view={basis:{},width:390,height:844,verticalFovDeg:9.1,center:{x:195,y:422}};
  function render(active=true){cursor=0;dirty=false;return hook(scene,'2026-09-30T13:50:33.000Z',view,active);}
  function commit(active=true){
    do{for(const effect of effects.splice(0))effect();if(dirty)render(active);}while(effects.length||dirty);
    return render(active);
  }
  return {requests,render,commit,setPublication(value:SaoIndexPublication|undefined){current=value;},
    heldState(){return slots.find(slot=>slot?.owner&&Array.isArray(slot?.value?.tiles))??null;}};
}

test('page hide retires the Hook tile graph and aborts requests; late replies cannot resurrect it',async()=>{
  const h=fixture();h.render(pageActive(true));h.commit(pageActive(true));await tick();
  assert.equal(h.requests.length,3);h.requests[0]!.finish();await tick();
  assert.equal(h.render().frame.tiles.length,1);
  const old=h.heldState();assert.equal(old.value.tiles.length,1);
  assert.equal(h.render(pageActive(false)).frame,null);
  h.commit(pageActive(false));
  assert.equal(h.heldState()===null,true,'returned EMPTY alone must not leave the retired tile graph in React state');
  assert(h.requests.slice(1).every(request=>request.signal.aborted));
  for(const request of h.requests.slice(1))request.finish();await tick();
  assert.equal(h.heldState(),null);
  h.render(pageActive(true));h.commit(pageActive(true));await tick();
  assert.equal(h.requests.length,6);assert.notEqual(h.heldState().owner,old.owner);
  assert.equal(h.render().frame.tiles.length,0,'reactivation cannot reuse the retired owner');
  h.requests[3]!.finish();await tick();assert.equal(h.render().frame.tiles.length,1);
  h.render(false);h.commit(false);
});

test('publication loss releases ready tiles and publication replacement fences the previous owner',async()=>{
  const h=fixture();h.render();h.commit();await tick();h.requests[0]!.finish();await tick();
  h.render();assert.equal(h.heldState().value.tiles.length,1);
  h.setPublication(undefined);h.render();h.commit();
  assert.equal(h.heldState()===null,true,'an unavailable index must release the retired ready tiles');
  const next={...publication,publicationHash:'b'.repeat(64)};
  h.setPublication(next);h.render();h.commit();await tick();
  assert.equal(h.requests.length,6);
  for(const request of h.requests.slice(1,3))request.finish();await tick();
  assert.equal(h.heldState().publication,next);assert.equal(h.render().frame.tiles.length,0);
  h.requests[3]!.finish();await tick();assert.equal(h.render().frame.tiles.length,1);
  assert.equal(h.heldState().publication,next);
  h.render(false);h.commit(false);
});

test('refreshed same-hash publication capability retires the old loader and accepts only the new observer',async()=>{
  const h=fixture();h.render();h.commit();await tick();h.requests[0]!.finish();await tick();h.render();
  const old=h.heldState();assert.equal(old.value.tiles.length,1);
  // File clear can retire a delivered capability without changing source bytes.
  const fresh={...publication};h.setPublication(fresh);
  assert.equal(h.render().frame.tiles.length,0,'new metadata must not expose the old capability before cleanup effects');
  h.commit();await tick();
  assert.equal(h.requests.length,6,'same publication bytes cannot keep a loader bound to retired metadata');
  assert(h.requests.slice(1,3).every(request=>request.signal.aborted));
  assert.notEqual(h.heldState().owner,old.owner);assert.equal(h.heldState().publication,fresh);
  for(const request of h.requests.slice(1,3))request.finish();await tick();assert.equal(h.render().frame.tiles.length,0);
  h.requests[3]!.finish();await tick();assert.equal(h.render().frame.tiles.length,1);
  h.render(false);h.commit(false);
});
