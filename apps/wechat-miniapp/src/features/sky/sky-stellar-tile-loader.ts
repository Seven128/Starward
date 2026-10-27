import type { ApiEnvelope, SaoIndexPublication, SaoTilePublication } from '@starward/miniapp-contracts';
import { reportRuntimeError } from '../../services/runtime-error';
import { isMiniappRequestCancelled } from '../../services/request-lifecycle';

export interface SkyStellarTileState {
  tiles: readonly SaoTilePublication[];
  loading: boolean;
  failed: boolean;
  interrupted: boolean;
}
// Active view working set, separate from the existing transport LRU. Never
// retain a trail of all previous views or start one request per animation frame.
export const SKY_STELLAR_VIEW_BYTES = 6 * 1024 * 1024;
export const SKY_STELLAR_REQUESTS = 3;

export function createSkyStellarTileLoader(deps:{
  publication:SaoIndexPublication;
  load(id:string,signal:AbortSignal):Promise<Pick<ApiEnvelope<SaoTilePublication>,'data'|'dataState'>>;
  changed(state:SkyStellarTileState):void;
}){
  const metadata=new Map(deps.publication.index.tiles.map(tile=>[tile.id,tile]));
  let wanted:string[]=[],disposed=false,paused=false,overBudget=false,retired=false;
  const loaded=new Map<string,SaoTilePublication>(),failed=new Set<string>(),refresh=new Set<string>();
  // A transport can be superseded without aborting this consumer's signal.
  // Rebind once per wanted tile/retry, then wait for explicit recovery instead
  // of spinning or misrepresenting cancellation as a data failure.
  const rebound=new Set<string>(),interrupted=new Set<string>();
  // Aborted requests keep their slot until settled: rapid turns cannot create
  // unbounded native requests even if abort completion is delayed.
  const pending=new Map<string,AbortController>();
  let published:SkyStellarTileState|undefined;
  function publish(){
    if(disposed)return;
    const nextTiles=wanted.flatMap(id=>loaded.has(id)?[loaded.get(id)!]:[]);
    // Keep only the current bounded view. Status-only changes and cancelled
    // request completions do not invalidate its exact-time point aggregation.
    const tiles=published&&nextTiles.length===published.tiles.length&&nextTiles.every((tile,i)=>tile===published!.tiles[i])
      ?published.tiles:nextTiles;
    const loading=!paused&&!overBudget&&!retired&&wanted.some(id=>
      !interrupted.has(id)&&(refresh.has(id)||!loaded.has(id)&&!failed.has(id)));
    const failedState=overBudget||failed.size>0;
    const interruptedState=retired||interrupted.size>0;
    if(published&&published.tiles===tiles&&published.loading===loading&&published.failed===failedState&&
      published.interrupted===interruptedState)return;
    published={tiles,loading,failed:failedState,interrupted:interruptedState};deps.changed(published);
  }
  function pump(){
    if(disposed||paused||overBudget||retired)return;
    for(const id of wanted){
      if(pending.size>=SKY_STELLAR_REQUESTS)break;
      if(loaded.has(id)&&!refresh.has(id)||failed.has(id)||interrupted.has(id)||pending.has(id))continue;
      const controller=new AbortController();pending.set(id,controller);
      let requeue=false;
      void Promise.resolve().then(()=>controller.signal.throwIfAborted()).then(()=>deps.load(id,controller.signal)).then(result=>{
        if(disposed||retired||controller.signal.aborted||!wanted.includes(id))return;
        const tile=result.data;
        if(!['FRESH','STALE_USABLE'].includes(result.dataState))throw Error('stellar_tile_unusable');
        // The client validates bytes and scientific values. This owner enforces
        // that a late result belongs to exactly this request/publication.
        if(tile.publicationHash!==deps.publication.publicationHash||tile.tile.tileId!==id)throw Error('stellar_tile_result_mismatch');
        loaded.set(id,tile);
        if(result.dataState==='STALE_USABLE')failed.add(id);
      }).catch(error=>{
        if(disposed||controller.signal.aborted||!wanted.includes(id))return;
        if(error instanceof Error&&error.message==='sao_publication_invalid:retired_index'){
          retired=true;
          for(const request of pending.values())request.abort();
          return;
        }
        const cancelled=controller.signal.aborted||isMiniappRequestCancelled(error)||
          error instanceof Error&&['sky_public_json_cancelled','sky_public_image_cancelled'].includes(error.message);
        if(cancelled){
          if(!rebound.has(id)){rebound.add(id);requeue=true;}
          else interrupted.add(id);
          return;
        }
        reportRuntimeError('request','sky_stellar_tile_failed',error,{stage:'sao_tile',resource:`sao:${id}`});
        failed.add(id);
      }).finally(()=>{pending.delete(id);if(!requeue)refresh.delete(id);if(!disposed){pump();publish();}});
    }
  }
  return {
    update(ids:readonly string[]){
      if(disposed)return;
      const next=[...new Set(ids)];
      if(next.some(id=>!metadata.has(id)))throw Error('stellar_tile_unknown');
      next.sort((a,b)=>metadata.get(a)!.minMagnitude-metadata.get(b)!.minMagnitude||a.localeCompare(b));
      if(next.length===wanted.length&&next.every((id,i)=>id===wanted[i]))return;
      wanted=next;
      overBudget=wanted.reduce((total,id)=>total+metadata.get(id)!.bytes,0)>SKY_STELLAR_VIEW_BYTES;
      for(const id of loaded.keys())if(overBudget||!wanted.includes(id))loaded.delete(id);
      for(const id of failed)if(!wanted.includes(id))failed.delete(id);
      for(const id of refresh)if(!wanted.includes(id))refresh.delete(id);
      for(const id of rebound)if(!wanted.includes(id))rebound.delete(id);
      for(const id of interrupted)if(!wanted.includes(id))interrupted.delete(id);
      for(const [id,request] of pending)if(overBudget||!wanted.includes(id))request.abort();
      pump();publish();
    },
    retry(){if(!disposed&&!retired){
      for(const id of [...failed,...interrupted]){refresh.add(id);rebound.delete(id);}
      failed.clear();interrupted.clear();pump();publish();
    }},
    // A retained page may hide for Sources or app background. Keep only its
    // already bounded ready view; no hidden transfers or accepted late reply.
    pause(){if(!disposed&&!paused){paused=true;for(const [id,request] of pending){
      if(refresh.has(id)&&loaded.has(id))failed.add(id);
      request.abort();
    }publish();}},
    resume(){if(!disposed&&paused){paused=false;pump();publish();}},
    dispose(){disposed=true;published=undefined;wanted=[];loaded.clear();failed.clear();refresh.clear();
      rebound.clear();interrupted.clear();for(const request of pending.values())request.abort();},
  };
}
