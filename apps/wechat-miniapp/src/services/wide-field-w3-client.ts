import {MINIAPP_API_BASE_PATH,type WideFieldW3ManifestData} from "@starward/miniapp-contracts";
import {requestBareSkyResource,skyResourceUrl} from "./bare-sky-resource";
import {assertWideFieldW3Manifest} from "./wide-field-w3-publication";

export async function getWideFieldW3Manifest(signal?:AbortSignal):Promise<WideFieldW3ManifestData>{
  const response=await requestBareSkyResource(`${MINIAPP_API_BASE_PATH}/sky/wide-field/manifest`,"wide-field",signal);
  if(response.status!==200)throw new Error("wide_field_w3_manifest_unavailable");
  assertWideFieldW3Manifest(response.body);
  return response.body;
}
export function wideFieldW3TileUrl(path:string){return skyResourceUrl(path,"wide-field");}
