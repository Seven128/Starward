import {MINIAPP_API_BASE_PATH,type MercuryTextureManifestData} from "@starward/miniapp-contracts";
import {requestBareSkyResource,skyResourceUrl} from "./bare-sky-resource";
import {assertMercuryTextureManifest} from "./mercury-texture-publication";

export async function getMercuryTextureManifest(signal?:AbortSignal):Promise<MercuryTextureManifestData>{
  const response=await requestBareSkyResource(`${MINIAPP_API_BASE_PATH}/sky/mercury/manifest`,"mercury",signal);
  if(response.status!==200)throw new Error("mercury_texture_manifest_unavailable");
  assertMercuryTextureManifest(response.body);
  return response.body;
}
export function mercuryTextureImageUrl(path:string){return skyResourceUrl(path,"mercury");}
