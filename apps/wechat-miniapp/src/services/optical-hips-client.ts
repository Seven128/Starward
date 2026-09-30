import {MINIAPP_API_BASE_PATH,type OpticalHipsIndexData,type OpticalHipsManifestData} from "@starward/miniapp-contracts";
import {assertOpticalHipsIndex,assertOpticalHipsManifest} from "./optical-hips-publication";
import {requestBareSkyResource,skyResourceUrl} from "./bare-sky-resource";

/** Null means the optional publication has not been configured. */
export async function getOpticalHipsManifest(signal?:AbortSignal):Promise<OpticalHipsManifestData|null>{
  const response=await requestBareSkyResource(`${MINIAPP_API_BASE_PATH}/sky/optical/manifest`,"optical",signal);
  if(response.status===404)return null;
  if(response.status!==200)throw new Error("optical_manifest_unavailable");
  assertOpticalHipsManifest(response.body);
  return response.body;
}

export async function getOpticalHipsIndex(root:OpticalHipsManifestData,sourceId:string,
  order:number,dir:number,signal?:AbortSignal):Promise<OpticalHipsIndexData>{
  const reference=root.shards.find(a=>a.sourceId===sourceId&&a.order===order&&a.dir===dir);
  if(!reference)throw new Error("optical_index_not_published");
  const response=await requestBareSkyResource(reference.indexUrl,"optical",signal);
  if(response.status!==200)throw new Error("optical_index_unavailable");
  assertOpticalHipsIndex(response.body,root,sourceId,order,dir);
  return response.body;
}

export function opticalHipsTileUrl(path:string){return skyResourceUrl(path,"optical");}
