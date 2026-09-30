import {MINIAPP_API_BASE_PATH,type GalacticImageManifestData} from "@starward/miniapp-contracts";
import {requestBareSkyResource,skyResourceUrl} from "./bare-sky-resource";
import {assertGalacticImageManifest} from "./galactic-image-publication";

export async function getGalacticImageManifest(signal?:AbortSignal):Promise<GalacticImageManifestData>{
  const response=await requestBareSkyResource(`${MINIAPP_API_BASE_PATH}/sky/galactic/manifest`,"galactic",signal);
  if(response.status!==200)throw new Error("galactic_image_manifest_unavailable");
  assertGalacticImageManifest(response.body);
  return response.body;
}
export function galacticImageUrl(path:string){return skyResourceUrl(path,"galactic");}
