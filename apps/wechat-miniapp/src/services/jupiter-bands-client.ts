import {MINIAPP_API_BASE_PATH,type JupiterBandsManifestData} from "@starward/miniapp-contracts";
import {requestBareSkyResource,skyResourceUrl} from "./bare-sky-resource";
import {assertJupiterBandsManifest} from "./jupiter-bands-publication";

export async function getJupiterBandsManifest(signal?:AbortSignal):Promise<JupiterBandsManifestData>{
  const response=await requestBareSkyResource(`${MINIAPP_API_BASE_PATH}/sky/jupiter/manifest`,"jupiter",signal);
  if(response.status!==200)throw new Error("jupiter_bands_manifest_unavailable");
  assertJupiterBandsManifest(response.body);
  return response.body;
}
export function jupiterBandsImageUrl(path:string){return skyResourceUrl(path,"jupiter");}
