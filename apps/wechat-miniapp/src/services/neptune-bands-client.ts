import {getBodyImageManifest,bodyImageUrl} from "./body-image-client";
export const getNeptuneBandsManifest=(signal?:AbortSignal)=>getBodyImageManifest("neptune",signal);
export const neptuneBandsImageUrl=(path:string)=>bodyImageUrl(path,"neptune");
