import {useEffect,useMemo} from "react";
import {useSkyNativeImages} from "./use-sky-artwork";
import type {SkyArtworkCanvas} from "./sky-artwork-request";

interface FixedImagePublication {
  publicationHash:string;
  image:{sha256:string;bytes:number;width:number;height:number;downloadUrl:string};
}

/** One immutable publication in the current page/Canvas owner. Losing visible
 * demand drops decoded pixels while the existing bounded loader keeps its file.
 * Returning pixels require a fresh successful decode; ownership loss disposes it. */
export function useSkyFixedImage(canvas:SkyArtworkCanvas|null,revision:number,
  publication:FixedImagePublication|undefined,active:boolean,wanted:boolean,id:string,
  resolve:(asset:FixedImagePublication["image"])=>{url:string;format:"png"|"jpeg"},paused=false){
  const assets=useMemo(()=>publication&&wanted?[{...publication.image,id}]:[],[publication,wanted,id]);
  const images=useSkyNativeImages(canvas,revision,publication?.publicationHash,active,assets,resolve,undefined,[],undefined,paused);
  useEffect(()=>{images.suspendUnusedDecoded();},[images.images,images.retainedImages,images.suspendUnusedDecoded]);
  return {...images,image:active&&wanted?(images.images.get(id)??null):null};
}
