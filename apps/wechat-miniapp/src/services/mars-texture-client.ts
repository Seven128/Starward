import {MINIAPP_API_BASE_PATH,type MarsTextureManifestData} from "@starward/miniapp-contracts";
import {requestBareSkyResource,skyResourceUrl} from "./bare-sky-resource";
import {assertMarsTextureManifest} from "./mars-texture-publication";

export async function getMarsTextureManifest(signal?:AbortSignal):Promise<MarsTextureManifestData>{
  const response=await requestBareSkyResource(`${MINIAPP_API_BASE_PATH}/sky/mars/manifest`,"mars",signal);
  if(response.status!==200)throw new Error("mars_texture_manifest_unavailable");
  assertMarsTextureManifest(response.body);
  return response.body;
}
export function marsTextureImageUrl(path:string){return skyResourceUrl(path,"mars");}
