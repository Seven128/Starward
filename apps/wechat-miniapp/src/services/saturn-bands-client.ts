import {MINIAPP_API_BASE_PATH,type SaturnBandsManifestData} from "@starward/miniapp-contracts";
import {requestBareSkyResource,skyResourceUrl} from "./bare-sky-resource";
import {assertSaturnBandsManifest} from "./saturn-bands-publication";

export async function getSaturnBandsManifest(signal?:AbortSignal):Promise<SaturnBandsManifestData>{
  const response=await requestBareSkyResource(`${MINIAPP_API_BASE_PATH}/sky/saturn/manifest`,"saturn",signal);
  if(response.status!==200)throw new Error("saturn_bands_manifest_unavailable");
  assertSaturnBandsManifest(response.body);
  return response.body;
}
export function saturnBandsImageUrl(path:string){return skyResourceUrl(path,"saturn");}
