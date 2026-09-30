import {MINIAPP_API_BASE_PATH,type NeptuneBandsManifestData} from "@starward/miniapp-contracts";
import {requestBareSkyResource,skyResourceUrl} from "./bare-sky-resource";
import {assertNeptuneBandsManifest} from "./neptune-bands-publication";

export async function getNeptuneBandsManifest(signal?:AbortSignal):Promise<NeptuneBandsManifestData>{
  const response=await requestBareSkyResource(`${MINIAPP_API_BASE_PATH}/sky/neptune/manifest`,"neptune",signal);
  if(response.status!==200)throw new Error("neptune_bands_manifest_unavailable");
  assertNeptuneBandsManifest(response.body);
  return response.body;
}
export function neptuneBandsImageUrl(path:string){return skyResourceUrl(path,"neptune");}
