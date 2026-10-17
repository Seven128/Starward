import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
import type {SaoIndexPublication,SaoTilePublication} from '@starward/miniapp-contracts';
import {createSkyStellarTileLoader} from './sky-stellar-tile-loader';
import {reportRuntimeError} from '../../services/runtime-error';

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
  const requests:Array<{publication:SaoIndexPublication;id:string;signal:AbortSignal;finish(dataState?:'FRESH'|'STALE_USABLE'):void}>=[];
  let cursor=0,dirty=false,current:SaoIndexPublication|undefined=publication,selected=ids,indexRetries=0;
  let failure:'selection'|'resolution'|'missing'|null=null;
  const same=(previous:unknown[]|undefined,next:unknown[])=>previous?.length===next.length&&
    next.every((value,index)=>Object.is(value,previous![index]));
  const bindings={
    EMPTY:{tiles:[],loading:false,failed:false},createSkyStellarTileLoader,reportRuntimeError,
    useResourceQuery:()=>({data:current?{data:current,sources:[],dataState:'FRESH'}:undefined,
      isFetching:false,isError:false,refetch:()=>{indexRetries++;}}),
    saoCatalogClient:{getTile:(owner:SaoIndexPublication,id:string,signal:AbortSignal)=>new Promise(resolve=>{
      requests.push({publication:owner,id,signal,finish(dataState='FRESH'){
        const data:SaoTilePublication={publicationHash:owner.publicationHash,
          tile:JSON.parse(readFileSync(new URL(`${id}.json`,assets),'utf8'))};
        resolve({data,dataState});
      }});
    })},
    supplementGeometry:()=>{if(failure==='selection')throw Object.assign(Error('private geometry'),{errCode:1234});return failure==='missing'?null:{};},
    selectSkyStellarTiles:()=>selected.map(id=>({id})),
    resolveSkyStellarSupplement:(_owner:unknown,tiles:readonly SaoTilePublication[])=>{
      if(failure==='resolution')throw Object.assign(Error('private projection'),{errCode:5678});return failure==='missing'?null:{tiles};
    },
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
  let scene={publication:{},observer:{}};
  const view={basis:{},width:390,height:844,verticalFovDeg:9.1,center:{x:195,y:422}};
  function render(active=true){cursor=0;dirty=false;return hook(scene,'2026-09-30T13:50:33.000Z',view,active);}
  function commit(active=true){
    do{for(const effect of effects.splice(0))effect();if(dirty)render(active);}while(effects.length||dirty);
    return render(active);
  }
  return {requests,render,commit,indexRetries:()=>indexRetries,setPublication(value:SaoIndexPublication|undefined){current=value;},
    setFailure(value:typeof failure){failure=value;scene={...scene};view.basis={};},
    setSelection(value:string[]){selected=value;view.basis={};},
    setSize(width:number,height:number){view.width=width;view.height=height;},
    unmount(){for(const slot of slots)slot?.cleanup?.();},
    heldState(){return slots.find(slot=>slot?.owner&&Array.isArray(slot?.value?.tiles))??null;}};
}

test('page hide suspends the bounded ready view; return has ready stars before effects and unmount releases them',async()=>{
  const h=fixture();h.render(pageActive(true));h.commit(pageActive(true));await tick();
  assert.equal(h.requests.length,3);h.requests[0]!.finish();await tick();
  assert.equal(h.render().frame.tiles.length,1);
  const old=h.heldState();assert.equal(old.value.tiles.length,1);
  assert.equal(h.render(pageActive(false)).frame,null);
  h.commit(pageActive(false));
  assert.equal(h.heldState().owner,old.owner,'one bounded CPU tile owner survives page hide');
  assert.equal(h.heldState().value.tiles[0],old.value.tiles[0]);
  assert(h.requests.slice(1).every(request=>request.signal.aborted));
  for(const request of h.requests.slice(1))request.finish();await tick();
  assert.equal(h.heldState().value.tiles.length,1,'late aborted replies do not enlarge the retained set');
  assert.equal(h.render(pageActive(true)).frame.tiles.length,1,'first return render must use valid ready points before effects');
  h.commit(pageActive(true));await tick();
  assert.equal(h.requests.length,5);assert.equal(h.heldState().owner,old.owner);
  h.requests[3]!.finish();await tick();assert.equal(h.render().frame.tiles.length,2);
  h.unmount();assert.equal(h.heldState(),null);assert(h.requests.at(-1)!.signal.aborted);
  h.requests.at(-1)!.finish();await tick();assert.equal(h.heldState(),null);
});

test('queued retry uses current visibility and cannot refetch after hide or unmount',async()=>{
  const h=fixture();const retry=h.render().retry;h.commit();await tick();
  h.render(false);retry();
  assert.equal(h.indexRetries(),0,'rendered hidden demand must fence a queued callback before pause effects');
  h.commit(false);retry();await tick();assert.equal(h.requests.length,3);
  h.render(true);h.commit(true);retry();assert.equal(h.indexRetries(),1);
  h.unmount();retry();assert.equal(h.indexRetries(),1,'retired Hook cannot refetch the index');
});

test('retry cannot operate an old delivered index capability before replacement effects',async()=>{
  const h=fixture();h.setSelection([ids[0]!]);const retry=h.render().retry;h.commit();await tick();
  h.requests[0]!.finish('STALE_USABLE');await tick();h.render();
  h.setPublication({...publication});h.setSelection([ids[1]!]);h.render();retry();await tick();
  assert.equal(h.requests.length,1,'old loader cannot fetch new demand with its retired index capability');
  assert.equal(h.indexRetries(),1,'current index discovery remains recoverable during owner replacement');
  h.commit();await tick();assert.equal(h.requests.length,2);h.unmount();
});

test('retry adopts the current selected view before pumping any tiles',async()=>{
  const h=fixture();h.setSelection([ids[0]!]);const retry=h.render().retry;h.commit();await tick();
  h.requests[0]!.finish();await tick();h.render();
  h.setSelection([ids[1]!]);h.render();retry();await tick();
  assert.deepEqual(h.requests.map(request=>request.id),[ids[0],ids[1]],'queued callback must request current selected tile before effects');
  h.unmount();
});

test('missing index and unmeasured view still allow current index recovery',async()=>{
  const h=fixture();h.setPublication(undefined);const retry=h.render().retry;h.commit();retry();
  assert.equal(h.indexRetries(),1);assert.equal(h.requests.length,0);
  h.setPublication(publication);h.setSize(0,0);h.render();h.commit();retry();await tick();
  assert.equal(h.indexRetries(),2);assert.equal(h.requests.length,0);
  h.unmount();
});

test('return to a changed view excludes retained old tiles before effects can change the wanted set',async()=>{
  const h=fixture();h.render();h.commit();await tick();h.requests[0]!.finish();await tick();h.render();
  h.render(false);h.commit(false);h.setSelection([publication.index.tiles[7]!.id]);
  assert.equal(h.render(true).frame.tiles.length,0,'old view tiles cannot masquerade as the requested new view');
  h.commit();await tick();h.unmount();
});

test('return before native measurement retains valid source points instead of depending on the previous painted size',async()=>{
  const h=fixture();h.render();h.commit();await tick();h.requests[0]!.finish();await tick();h.render();
  h.render(false);h.commit(false);h.setSize(0,0);
  assert.equal(h.render(true).frame.tiles.length,1,'native invalidation clears dimensions, not validated source rows');
  assert.equal(h.commit(true).frame.tiles.length,1,'the visibility effect must not evict ready rows before measurement');
  h.unmount();
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
  h.unmount();
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
  h.unmount();
});

test('scientific failures report at committed transitions without logging each camera update or normal absence',()=>{
  const before=console.error,errors:unknown[][]=[];console.error=(...parts)=>{errors.push(parts);};
  const h=fixture();
  try{
    for(let i=0;i<3;i++){h.setFailure('selection');assert.equal(h.render().failed,true);h.commit();}
    assert.equal(errors.length,1);assert.equal((errors[0]![1] as {errCode:number}).errCode,1234);
    h.setFailure(null);h.render();h.commit();
    for(let i=0;i<3;i++){h.setFailure('resolution');assert.equal(h.render().failed,true);h.commit();}
    assert.equal(errors.length,2);assert.equal((errors[1]![1] as {errCode:number}).errCode,5678);
    h.render(false);h.commit(false);h.render(true);h.commit(true);assert.equal(errors.length,2,'hide is not recovery');
    h.setPublication({...publication});h.render();h.commit();assert.equal(errors.length,3,'new delivered owner has its own failure episode');
    h.setFailure(null);h.render();h.commit();h.setFailure('resolution');h.render();h.commit();assert.equal(errors.length,4);
    h.setFailure('missing');assert.equal(h.render().frame,null);h.commit();assert.equal(errors.length,4);
    assert.doesNotMatch(JSON.stringify(errors),/private/u);
  }finally{h.unmount();console.error=before;}
});
