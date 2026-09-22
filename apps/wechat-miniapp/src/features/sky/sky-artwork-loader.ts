import type { ConstellationArtwork } from "@starward/miniapp-contracts";
export interface LoadedSkyArtwork { image: object; release(): void; }
export interface SkyArtworkLoadState {
  images: ReadonlyMap<string,object>;
  loading: boolean;
  failed: boolean;
}

/** Page/canvas-owned bounded native-image queue. Astronomy and camera changes
 * select wanted figures; they never re-download a ready figure each frame. */
export function createSkyArtworkLoader(deps: {
  start(asset: ConstellationArtwork, ready:(image:LoadedSkyArtwork)=>void, fail:()=>void):()=>void;
  changed(state:SkyArtworkLoadState):void;
  byteBudget?:number;
}) {
  type Entry={asset:ConstellationArtwork;state:"loading"|"ready"|"error";cancel?:()=>void;loaded?:LoadedSkyArtwork;last:number};
  const entries=new Map<string,Entry>();
  let wanted:readonly ConstellationArtwork[]=[],active=true,tick=0,pumping=false;
  const budget=deps.byteBudget ?? 16*1024*1024;
  const key=(a:ConstellationArtwork)=>a.sha256;
  const wantedKeys=()=>new Set(wanted.map(key));
  const drop=(k:string,e:Entry)=>{entries.delete(k);e.cancel?.();e.loaded?.release();};
  const emit=()=>{
    if(!active)return;
    const images=new Map<string,object>();let failed=false,loading=false;
    for(const a of wanted){const e=entries.get(key(a));if(e?.state==='ready')images.set(a.id,e.loaded!.image);
      else if(e?.state==='error')failed=true;else loading=true;}
    deps.changed({images,failed,loading});
  };
  const trim=()=>{
    let bytes=[...entries.values()].reduce((n,e)=>n+(e.loaded?e.asset.width*e.asset.height*4:0),0);
    const keep=wantedKeys();
    for(const [k,e] of [...entries].sort((a,b)=>a[1].last-b[1].last)){
      if(bytes<=budget)break;
      if(!keep.has(k)&&e.loaded){bytes-=e.asset.width*e.asset.height*4;drop(k,e);}
    }
  };
  const pump=()=>{
    if(!active||pumping)return;
    pumping=true;
    try {
      for(const asset of wanted){
        if([...entries.values()].filter(e=>e.state==='loading').length>=2)break;
        const k=key(asset);if(entries.has(k))continue;
        const entry:Entry={asset,state:'loading',last:++tick};entries.set(k,entry);
        const fail=()=>{if(!active||entries.get(k)!==entry)return;entry.state='error';delete entry.cancel;emit();pump();};
        try {
          const cancel=deps.start(asset,loaded=>{
            if(!active||entries.get(k)!==entry){loaded.release();return;}
            entry.loaded=loaded;entry.state='ready';delete entry.cancel;entry.last=++tick;trim();emit();pump();
          },fail);
          if(entries.get(k)===entry&&entry.state==='loading')entry.cancel=cancel;
        }catch{fail();}
      }
    } finally {pumping=false;}
  };
  return {
    update(next:readonly ConstellationArtwork[]){
      if(!active)return;
      const previous=wanted.map(key).join(':');wanted=next;
      const keep=wantedKeys();
      for(const [k,e] of entries)if(!keep.has(k)&&e.state==='loading')drop(k,e);
      for(const a of wanted){const e=entries.get(key(a));if(e)e.last=++tick;}
      trim();pump();if(previous!==wanted.map(key).join(':'))emit();
    },
    failed(image:object){
      for(const e of entries.values())if(e.loaded?.image===image&&e.state==='ready'){
        e.loaded.release();delete e.loaded;e.state='error';emit();break;
      }
    },
    retry(){
      for(const [k,e] of entries)if(e.state==='error')drop(k,e);
      pump();emit();
    },
    dispose(){active=false;for(const [k,e] of entries)drop(k,e);wanted=[];},
  };
}
