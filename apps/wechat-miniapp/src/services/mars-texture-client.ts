import {getBodyImageManifest,bodyImageUrl} from "./body-image-client";
export const getMarsTextureManifest=(signal?:AbortSignal)=>getBodyImageManifest("mars",signal);
export const marsTextureImageUrl=(path:string)=>bodyImageUrl(path,"mars");
