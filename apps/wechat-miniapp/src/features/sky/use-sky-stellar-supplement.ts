import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import type {SaoIndexPublication} from '@starward/miniapp-contracts';
import {saoCatalogClient} from '@/services/api-client';
import {useResourceQuery} from '@/hooks/use-resource-query';
import {createSkyStellarTileLoader,type SkyStellarTileState} from './sky-stellar-tile-loader';
import {selectSkyStellarTiles} from './sky-stellar-tile-selection';
import {resolveSkyStellarSupplement,supplementGeometry} from './sky-stellar-supplement-scene';
import type {ResolvedStellarScene} from './sky-stellar-scene';
import type {SkyViewBasis} from './sky-view-projection';
import type {SkyProjectionCenter} from './sky-viewport';

type Loader=ReturnType<typeof createSkyStellarTileLoader>;
const EMPTY:SkyStellarTileState={tiles:[],loading:false,failed:false};
export function useSkyStellarSupplement(scene:ResolvedStellarScene|undefined,at:string|undefined,
  view:{basis:SkyViewBasis;width:number;height:number;verticalFovDeg:number;center:SkyProjectionCenter}|null,
  active:boolean,sunAltitudeDeg?:number){
  const index=useResourceQuery({queryKey:['sao-index','v2'],queryFn:signal=>saoCatalogClient.getIndex(signal),
    enabled:active&&Boolean(scene?.publication),staleTime:Infinity,structuralSharing:false});
  const publication=index.data?.data;
  const selection=useMemo(()=>{
    if(!active||!publication||!view||view.width<=0||view.height<=0)return {ids:[],failed:false};
    try{
      const geometry=supplementGeometry(publication,scene,at);if(!geometry)return {ids:[],failed:false};
      const selected=selectSkyStellarTiles(publication.index.tiles,{...view,frame:geometry,
        ...(sunAltitudeDeg===undefined?{}:{sunAltitudeDeg}),
        expected:{catalog:scene!.publication!,at:at!,observer:scene!.observer!}});
      return {ids:selected.map(tile=>tile.id),failed:false};
    }catch{return {ids:[],failed:true};}
  },[publication,scene,at,active,sunAltitudeDeg,view?.basis,view?.width,view?.height,view?.verticalFovDeg,view?.center.x,view?.center.y]);
  const wantedRef=useRef(selection.ids);wantedRef.current=selection.ids;
  const loader=useRef<Loader|null>(null);
  const [state,setState]=useState<{owner:Loader;publication:SaoIndexPublication;value:SkyStellarTileState}|null>(null);
  useEffect(()=>{
    if(!publication)return;
    let live=true;
    const owner=createSkyStellarTileLoader({publication,changed:value=>{if(live)setState({owner,publication,value});},
      load:(id,signal)=>saoCatalogClient.getTile(publication,id,signal)});
    loader.current=owner;if(!active)owner.pause();owner.update(wantedRef.current);
    return()=>{
      live=false;owner.dispose();if(loader.current===owner)loader.current=null;
      setState(previous=>previous?.owner===owner?null:previous);
    };
  // Same source bytes may arrive with a new file-generation capability after
  // clear/refetch. Retire the loader bound to the previous delivered index.
  // Visibility suspends work, not the single bounded ready CPU view. Native
  // Canvas/images still release on hide. Index loss/replacement and unmount
  // retire this graph, including a refreshed same-hash file capability.
  },[publication]);
  const measuredView=Boolean(view&&view.width>0&&view.height>0);
  const key=selection.ids.join(':');
  useEffect(()=>{
    const owner=loader.current;if(!owner)return;
    if(!active||!measuredView){owner.pause();return;}
    owner.update(wantedRef.current);owner.resume();
  },[key,active,measuredView]);
  const loaded=active&&state?.publication===publication&&state?.owner===loader.current?state.value:EMPTY;
  const resolved=useMemo(()=>{
    if(!active||!publication||selection.failed)return {frame:null,failed:false};
    try{return {frame:resolveSkyStellarSupplement(publication,
      // Dimensions reset before a new Canvas is measured. Source rows are
      // still valid independently of the old viewport; transform them with
      // current geometry, then the painter clips/styles in its actual view.
      // Once measured, restrict them to the new selection before effects run.
      measuredView?loaded.tiles.filter(tile=>selection.ids.includes(tile.tile.tileId)):loaded.tiles,scene,at),failed:false};}
    catch{return {frame:null,failed:true};}
  },[active,publication,loaded.tiles,scene,at,selection.failed,key,measuredView]);
  const retry=useCallback(()=>{loader.current?.retry();void index.refetch();},[index.refetch]);
  return {publication,frame:resolved.frame,sources:index.data?.sources??[],retry,loading:active&&(index.isFetching||loaded.loading),
    failed:active&&(index.isError||Boolean(index.refreshError)||index.data?.dataState==='STALE_USABLE'||selection.failed||loaded.failed||resolved.failed)};
}
