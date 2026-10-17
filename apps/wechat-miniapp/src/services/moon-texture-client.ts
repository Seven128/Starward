import {getBodyImageManifest,bodyImageUrl} from "./body-image-client";
export const getMoonTextureManifest=(signal?:AbortSignal)=>getBodyImageManifest("moon",signal);
export const moonTextureImageUrl=(path:string)=>bodyImageUrl(path,"moon");
