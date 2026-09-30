import {MINIAPP_API_BASE_PATH,type UranusBandsManifestData} from "@starward/miniapp-contracts";
import {requestBareSkyResource,skyResourceUrl} from "./bare-sky-resource";
import {assertUranusBandsManifest} from "./uranus-bands-publication";

export async function getUranusBandsManifest(signal?:AbortSignal):Promise<UranusBandsManifestData>{
  const response=await requestBareSkyResource(`${MINIAPP_API_BASE_PATH}/sky/uranus/manifest`,"uranus",signal);
  if(response.status!==200)throw new Error("uranus_bands_manifest_unavailable");
  assertUranusBandsManifest(response.body);
  return response.body;
}
export function uranusBandsImageUrl(path:string){return skyResourceUrl(path,"uranus");}
