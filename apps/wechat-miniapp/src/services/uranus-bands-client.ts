import {getBodyImageManifest,bodyImageUrl} from "./body-image-client";
export const getUranusBandsManifest=(signal?:AbortSignal)=>getBodyImageManifest("uranus",signal);
export const uranusBandsImageUrl=(path:string)=>bodyImageUrl(path,"uranus");
