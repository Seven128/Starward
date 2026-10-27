import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import type {SaoIndexPublication,SaoTilePublication} from '@starward/miniapp-contracts';
import {createSkyStellarTileLoader,type SkyStellarTileState} from './sky-stellar-tile-loader';
import {MiniappRequestCancelled} from '../../services/request-lifecycle';

const location=new URL('../../../../../workers/miniapp-api/assets/sao/',import.meta.url);
const publication:SaoIndexPublication={publicationHash:JSON.parse(readFileSync(new URL('publication.json',location),'utf8')).publicationHash,
  index:JSON.parse(readFileSync(new URL('index.json',location),'utf8'))};
const ids=publication.index.tiles.slice(0,8).map(t=>t.id);
function tile(id:string):SaoTilePublication{return {publicationHash:publication.publicationHash,
  tile:JSON.parse(readFileSync(new URL(`${id}.json`,location),'utf8'))};}
const tick=()=>new Promise<void>(resolve=>setImmediate(resolve));

for(const cancellation of [()=>new MiniappRequestCancelled('superseded'),()=>Error('sky_public_json_cancelled')]){
  test(`a still-wanted ${cancellation().message} rebinds once without reporting failure`,async()=>{
    let calls=0;const states:SkyStellarTileState[]=[];
    const owner=createSkyStellarTileLoader({publication,changed:s=>states.push(s),load:async id=>{
      if(++calls===1)throw cancellation();
      return {data:tile(id),dataState:'FRESH'};
    }});
    try{
      owner.update([ids[0]!]);await tick();
      assert.equal(calls,2);assert.equal(states.some(s=>s.failed),false);
      assert.equal(states.at(-1)!.loading,false);assert.equal(states.at(-1)!.tiles.length,1);
    }finally{owner.dispose();}
  });
}

test('repeated semantic cancellation stops, preserves independent stars and resumes only on explicit retry',async()=>{
  let interrupted=true,calls=0;const states:SkyStellarTileState[]=[];
  const owner=createSkyStellarTileLoader({publication,changed:s=>states.push(s),load:async id=>{
    if(id===ids[1]){calls++;if(interrupted)throw new MiniappRequestCancelled('superseded');}
    return {data:tile(id),dataState:'FRESH'};
  }});
  try{
    owner.update(ids.slice(0,2));await tick();
    assert.equal(calls,2);assert.equal(states.some(s=>s.failed),false);
    assert.equal(states.at(-1)!.interrupted,true);assert.equal(states.at(-1)!.loading,false);
    assert.deepEqual(states.at(-1)!.tiles.map(t=>t.tile.tileId),[ids[0]]);
    owner.update(ids.slice(0,2));owner.pause();owner.resume();await tick();
    assert.equal(calls,2,'same view and visibility must not reset the retry allowance');
    interrupted=false;owner.retry();await tick();
    assert.equal(calls,3);assert.equal(states.at(-1)!.interrupted,false);
    assert.equal(states.at(-1)!.tiles.length,2);
  }finally{owner.dispose();}
});

test('a retired publication never pumps or retries the retired capability',async()=>{
  let calls=0;const states:SkyStellarTileState[]=[];
  const owner=createSkyStellarTileLoader({publication,changed:s=>states.push(s),load:async()=>{
    calls++;throw Error('sao_publication_invalid:retired_index');
  }});
  try{
    owner.update([ids[0]!]);await tick();
    assert.equal(states.at(-1)!.failed,false);assert.equal(states.at(-1)!.interrupted,true);
    assert.equal(states.at(-1)!.loading,false);assert.equal(calls,1);
    owner.retry();owner.update([ids[1]!]);owner.pause();owner.resume();await tick();
    assert.equal(calls,1,'the hook must recover by obtaining a new index delivery');
  }finally{owner.dispose();}
});

test('a cancelled stale refresh rebinds without losing its loaded tile or refreshing obligation',async()=>{
  let calls=0;const states:SkyStellarTileState[]=[];
  const owner=createSkyStellarTileLoader({publication,changed:s=>states.push(s),load:async id=>{
    calls++;if(calls===2)throw new MiniappRequestCancelled('superseded');
    return {data:tile(id),dataState:calls===1?'STALE_USABLE':'FRESH'};
  }});
  try{
    owner.update([ids[0]!]);await tick();owner.retry();await tick();
    assert.equal(calls,3);assert.equal(states.at(-1)!.failed,false);
    assert.equal(states.at(-1)!.loading,false);assert(states.slice(1).every(s=>s.tiles.length===1));
  }finally{owner.dispose();}
});

test('pause retains only the bounded ready view, cancels pending work and resumes without reloading ready tiles',async()=>{
  const requests:{id:string;signal:AbortSignal;finish():void}[]=[],states:SkyStellarTileState[]=[];
  const owner=createSkyStellarTileLoader({publication,changed:s=>states.push(s),load:(id,signal)=>new Promise(resolve=>{
    requests.push({id,signal,finish:()=>resolve({data:tile(id),dataState:'FRESH'})});
  })});
  owner.update(ids.slice(0,3));await tick();requests[0]!.finish();await tick();
  const ready=states.at(-1)!.tiles[0]!;
  owner.pause();assert(requests.slice(1).every(r=>r.signal.aborted));
  for(const request of requests.slice(1))request.finish();await tick();
  assert.deepEqual(states.at(-1)!.tiles,[ready],'aborted late replies cannot add hidden data');
  assert.equal(requests.length,3,'hidden owner cannot pump more requests');
  owner.resume();await tick();assert.equal(requests.length,5,'resume loads only the two unfinished tiles');
  assert.equal(states.at(-1)!.tiles[0],ready,'same ready object remains available before new replies');
  owner.pause();owner.update([ids[7]!]);
  assert.deepEqual(states.at(-1)!.tiles,[],'a changed view must evict the old view even when paused');
  const count=states.length;owner.dispose();for(const request of requests.slice(3))request.finish();await tick();
  owner.resume();assert.equal(states.length,count,'final disposal fences late replies and resume');
});

test('unchanged ready tiles retain their identity through loading, cancellation and idle recovery',async()=>{
  const states:SkyStellarTileState[]=[],pending:{signal:AbortSignal;finish():void}[]=[];
  const owner=createSkyStellarTileLoader({publication,changed:state=>states.push(state),load:async(id,signal)=>{
    if(id===ids[1])await new Promise<void>(resolve=>pending.push({signal,finish:resolve}));
    return {data:tile(id),dataState:'FRESH'};
  }});
  owner.update([ids[0]!]);await tick();
  const ready=states.at(-1)!.tiles;assert.equal(ready.length,1);
  owner.update(ids.slice(0,2));await tick();
  assert.equal(states.at(-1)!.loading,true);
  assert.strictEqual(states.at(-1)!.tiles,ready,'status changes cannot manufacture a new points collection');
  owner.update([ids[0]!]);assert(pending[0]!.signal.aborted);
  assert.equal(states.at(-1)!.loading,false);assert.strictEqual(states.at(-1)!.tiles,ready);
  const settled=states.at(-1)!;
  pending[0]!.finish();await tick();owner.retry();owner.pause();owner.resume();await tick();
  assert.strictEqual(states.at(-1),settled,'cancelled completion and healthy retry cannot republish unchanged state');
  owner.update(ids.slice(0,2));await tick();pending[1]!.finish();await tick();
  assert.notStrictEqual(states.at(-1)!.tiles,ready,'a real first arrival must publish immediately');
  assert.equal(states.at(-1)!.tiles.length,2);assert.equal(states.at(-1)!.loading,false);
  owner.dispose();
});

test('cached stale tiles stay visible with recovery state; retry really reloads them and keeps old points while pending',async()=>{
  let calls=0,finish:()=>void=()=>{};const states:SkyStellarTileState[]=[];
  const loader=createSkyStellarTileLoader({publication,changed:s=>states.push(s),load:async id=>{
    calls++;if(calls===1)return {data:tile(id),dataState:'STALE_USABLE'};
    await new Promise<void>(resolve=>{finish=resolve;});return {data:tile(id),dataState:'FRESH'};
  }});
  loader.update([ids[0]!]);await tick();assert.equal(states.at(-1)!.tiles.length,1);assert.equal(states.at(-1)!.failed,true);
  loader.retry();await tick();assert.equal(calls,2);assert.equal(states.at(-1)!.tiles.length,1);
  assert.equal(states.at(-1)!.loading,true);finish();await tick();
  assert.equal(states.at(-1)!.failed,false);assert.equal(states.at(-1)!.loading,false);assert.equal(states.at(-1)!.tiles.length,1);loader.dispose();
});

test('pausing a stale-tile retry preserves the failure until explicit retry and never resumes hidden work',async()=>{
  let calls=0,finish:()=>void=()=>{};const states:SkyStellarTileState[]=[];
  const owner=createSkyStellarTileLoader({publication,changed:s=>states.push(s),load:async id=>{
    calls++;if(calls===1)return {data:tile(id),dataState:'STALE_USABLE'};
    await new Promise<void>(resolve=>{finish=resolve;});return {data:tile(id),dataState:'FRESH'};
  }});
  owner.update([ids[0]!]);await tick();owner.retry();await tick();owner.pause();finish();await tick();
  assert.equal(states.at(-1)!.tiles.length,1);assert.equal(states.at(-1)!.failed,true);
  owner.resume();await tick();assert.equal(calls,2,'visibility alone must not retry an observed stale failure');
  owner.retry();await tick();assert.equal(calls,3);finish();await tick();
  assert.equal(states.at(-1)!.failed,false);owner.dispose();
});

test('bounded requests keep only current view; late aborted replies and dispose never publish obsolete stars',async()=>{
  const requests:{id:string;signal:AbortSignal;resolve:(t:SaoTilePublication)=>void}[]=[],states:SkyStellarTileState[]=[];
  const loader=createSkyStellarTileLoader({publication,changed:s=>states.push(s),
    load:(id,signal)=>new Promise(resolve=>requests.push({id,signal,resolve:data=>resolve({data,dataState:'FRESH'})}))});
  loader.update(ids);await tick();assert.equal(requests.length,3);
  loader.update(ids);await tick();assert.equal(requests.length,3,'same view does not restart requests');
  loader.update([ids[7]!]);assert(requests.every(r=>r.signal.aborted));await tick();assert.equal(requests.length,3);
  requests[0]!.resolve(tile(requests[0]!.id));await tick();assert.equal(requests.length,4);
  assert.deepEqual(states.at(-1)!.tiles,[],'late old-view success cannot reappear');
  requests[3]!.resolve(tile(ids[7]!));await tick();
  assert.deepEqual(states.at(-1)!.tiles.map(t=>t.tile.tileId),[ids[7]]);
  assert.equal(states.at(-1)!.loading,false);
  loader.update([]);assert.deepEqual(states.at(-1)!.tiles,[]);
  loader.dispose();const count=states.length;
  for(const r of requests.slice(1,3))r.resolve(tile(r.id));await tick();assert.equal(states.length,count);
});

test('partial failure preserves loaded tiles, only explicit retry repeats failure, and wrong publication is rejected',async()=>{
  let bad=true;const calls:string[]=[],states:SkyStellarTileState[]=[];
  const loader=createSkyStellarTileLoader({publication,changed:s=>states.push(s),load:async(id)=>{
    calls.push(id);return {data:id===ids[1]&&bad?{...tile(id),publicationHash:'0'.repeat(64)}:tile(id),dataState:'FRESH'};}});
  loader.update(ids.slice(0,2));await tick();assert.equal(states.at(-1)!.failed,true);
  assert.deepEqual(states.at(-1)!.tiles.map(t=>t.tile.tileId),[ids[0]]);
  loader.update(ids.slice(0,2));await tick();assert.equal(calls.length,2);
  bad=false;loader.retry();await tick();assert.equal(calls.length,3);
  assert.equal(states.at(-1)!.failed,false);assert.equal(states.at(-1)!.tiles.length,2);loader.dispose();
});

test('oversized requests fail explicitly without silently selecting a subset or issuing network requests',()=>{
  let requests=0;const states:SkyStellarTileState[]=[];
  const loader=createSkyStellarTileLoader({publication,changed:s=>states.push(s),load:async(id)=>{requests++;return {data:tile(id),dataState:'FRESH'};}});
  loader.update(publication.index.tiles.map(t=>t.id));assert.equal(requests,0);
  assert.equal(states.at(-1)!.failed,true);assert.equal(states.at(-1)!.loading,false);
  assert.deepEqual(states.at(-1)!.tiles,[]);loader.dispose();
});

test('handled tile failures log once per attempt, preserve recovery and keep normal retirement quiet',async()=>{
  const before=console.error,errors:unknown[][]=[],states:SkyStellarTileState[]=[];
  console.error=(...parts)=>{errors.push(parts);};
  let broken=true,calls=0;
  const owner=createSkyStellarTileLoader({publication,changed:s=>states.push(s),load:async id=>{
    calls++;if(broken)throw Object.assign(new Error('private tile path'),{errno:600001});
    return {data:tile(id),dataState:'FRESH'};
  }});
  try{
    owner.update([ids[0]!]);await tick();
    assert.equal(states.at(-1)!.failed,true);assert.equal(states.at(-1)!.tiles.length,0);
    assert.equal(errors.length,1,'the file path has no Query error callback to report its handled failure');
    assert.equal((errors[0]![1] as {errno:number}).errno,600001);
    owner.update([ids[0]!]);await tick();assert.equal(calls,1);assert.equal(errors.length,1);
    broken=false;owner.retry();await tick();assert.equal(states.at(-1)!.failed,false);assert.equal(states.at(-1)!.tiles.length,1);
    const cancelled=createSkyStellarTileLoader({publication,changed(){},load:async()=>{throw Error('sky_public_json_cancelled');}});
    cancelled.update([ids[1]!]);await tick();cancelled.dispose();assert.equal(errors.length,1);
    assert.doesNotMatch(JSON.stringify(errors),/private/u);
  }finally{owner.dispose();console.error=before;}
});
