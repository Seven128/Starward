import {getBodyImageManifest,bodyImageUrl} from "./body-image-client";
export const getJupiterBandsManifest=(signal?:AbortSignal)=>getBodyImageManifest("jupiter",signal);
export const jupiterBandsImageUrl=(path:string)=>bodyImageUrl(path,"jupiter");
