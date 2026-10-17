import {getBodyImageManifest,bodyImageUrl} from "./body-image-client";
export const getSaturnBandsManifest=(signal?:AbortSignal)=>getBodyImageManifest("saturn",signal);
export const saturnBandsImageUrl=(path:string)=>bodyImageUrl(path,"saturn");
