import {MINIAPP_API_BASE_PATH,galacticImageManifestPath,type GalacticImageManifestData} from "@starward/miniapp-contracts";
import {requestBareSkyResource,skyResourceUrl} from "./bare-sky-resource";
import {assertGalacticImageManifest} from "./galactic-image-publication";

export async function getGalacticImageManifest(signal?:AbortSignal,publicationHash?:string):Promise<GalacticImageManifestData>{
  if(publicationHash!==undefined){
    const response=await requestBareSkyResource(galacticImageManifestPath(publicationHash),"galactic",signal);
    if(response.status!==200)throw new Error("galactic_image_manifest_unavailable");
    assertGalacticImageManifest(response.body);
    if(response.body.publicationHash!==publicationHash)throw new Error("galactic_image_version_unavailable");
    return response.body;
  }
  let response=await requestBareSkyResource(`${MINIAPP_API_BASE_PATH}/sky/galactic/display/manifest`,"galactic",signal);
  // A previous API has only the original infrared discovery. Preserve its
  // usable contract; transport/server/invalid-current failures do not fall back.
  if(response.status===404)response=await requestBareSkyResource(`${MINIAPP_API_BASE_PATH}/sky/galactic/manifest`,"galactic",signal);
  if(response.status!==200)throw new Error("galactic_image_manifest_unavailable");
  assertGalacticImageManifest(response.body);
  return response.body;
}
export function galacticImageUrl(path:string){return skyResourceUrl(path,"galactic");}
export function galacticImageManifestUrl(publicationHash:string){return galacticImageUrl(galacticImageManifestPath(publicationHash));}
