import {getBodyImageManifest,bodyImageUrl} from "./body-image-client";
export const getMercuryTextureManifest=(signal?:AbortSignal)=>getBodyImageManifest("mercury",signal);
export const mercuryTextureImageUrl=(path:string)=>bodyImageUrl(path,"mercury");
