import { MINIAPP_API_BASE_PATH, assertMoonCoverageManifest,type MoonCoverageManifestData } from "@starward/miniapp-contracts";
import { requestBareSkyResource, skyResourceUrl } from "./bare-sky-resource";

export async function getMoonTextureManifest(signal?:AbortSignal):Promise<MoonCoverageManifestData>{
  const response=await requestBareSkyResource(`${MINIAPP_API_BASE_PATH}/sky/moon/coverage/manifest`,"moon",signal);
  if(response.status!==200)throw new Error("moon_texture_manifest_unavailable");
  assertMoonCoverageManifest(response.body);
  return response.body;
}
export function moonTextureImageUrl(path:string){return skyResourceUrl(path,"moon");}
