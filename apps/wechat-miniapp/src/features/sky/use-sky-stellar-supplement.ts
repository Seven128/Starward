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
  view:{basis:SkyViewBasis;width:number;height:number;verticalFovDeg:number;center:SkyProjectionCenter}|null,active:boolean){
  const index=useResourceQuery({queryKey:['sao-index'],queryFn:signal=>saoCatalogClient.getIndex(signal),
    enabled:active&&Boolean(scene?.publication),staleTime:Infinity,structuralSharing:false});
  const publication=index.data?.data;
  const selection=useMemo(()=>{
    if(!active||!publication||!view||view.width<=0||view.height<=0)return {ids:[],failed:false};
    try{
      const geometry=supplementGeometry(publication,scene,at);if(!geometry)return {ids:[],failed:false};
      const selected=selectSkyStellarTiles(publication.index.tiles,{...view,frame:geometry,
        expected:{catalog:scene!.publication!,at:at!,observer:scene!.observer!}});
      return {ids:selected.map(tile=>tile.id),failed:false};
    }catch{return {ids:[],failed:true};}
  },[publication,scene,at,active,view?.basis,view?.width,view?.height,view?.verticalFovDeg,view?.center.x,view?.center.y]);
  const wantedRef=useRef(selection.ids);wantedRef.current=selection.ids;
  const loader=useRef<Loader|null>(null);
  const [state,setState]=useState<{owner:Loader;publication:SaoIndexPublication;value:SkyStellarTileState}|null>(null);
  useEffect(()=>{
    if(!active||!publication)return;
    let live=true;
    const owner=createSkyStellarTileLoader({publication,changed:value=>{if(live)setState({owner,publication,value});},
      load:(id,signal)=>saoCatalogClient.getTile(publication,id,signal)});
    loader.current=owner;owner.update(wantedRef.current);
    return()=>{live=false;owner.dispose();if(loader.current===owner)loader.current=null;};
  },[publication?.publicationHash,active]);
  const key=selection.ids.join(':');
  useEffect(()=>{loader.current?.update(wantedRef.current);},[key]);
  const loaded=active&&state?.publication.publicationHash===publication?.publicationHash&&state?.owner===loader.current?state.value:EMPTY;
  const resolved=useMemo(()=>{
    if(!active||!publication||selection.failed)return {frame:null,failed:false};
    try{return {frame:resolveSkyStellarSupplement(publication,loaded.tiles,scene,at),failed:false};}
    catch{return {frame:null,failed:true};}
  },[active,publication,loaded.tiles,scene,at,selection.failed]);
  const retry=useCallback(()=>{loader.current?.retry();void index.refetch();},[index.refetch]);
  return {frame:resolved.frame,sources:index.data?.sources??[],retry,loading:active&&(index.isFetching||loaded.loading),
    failed:active&&(index.isError||Boolean(index.refreshError)||index.data?.dataState==='STALE_USABLE'||selection.failed||loaded.failed||resolved.failed)};
}
