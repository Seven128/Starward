import {MINIAPP_API_BASE_PATH,assertOpticalHipsRights,type OpticalHipsRightsReferenceData,type OpticalHipsRightsData,type OpticalHipsIndexData,type OpticalHipsManifestData} from "@starward/miniapp-contracts";
import {assertOpticalHipsIndex,assertOpticalHipsManifest} from "./optical-hips-publication";
import {requestBareSkyResource,skyResourceUrl} from "./bare-sky-resource";

/** Null means the optional publication has not been configured. */
export async function getOpticalHipsManifest(signal?:AbortSignal,publicationHash?:string):Promise<OpticalHipsManifestData|null>{
  if(publicationHash!==undefined&&!/^[a-f0-9]{64}$/u.test(publicationHash))throw new Error("optical_source_version_invalid");
  const response=await requestBareSkyResource(`${MINIAPP_API_BASE_PATH}/sky/optical/${publicationHash?publicationHash+"/":""}manifest`,"optical",signal);
  if(response.status===404){if(publicationHash)throw new Error("optical_source_version_unavailable");return null;}
  if(response.status!==200)throw new Error("optical_manifest_unavailable");
  assertOpticalHipsManifest(response.body);
  if(publicationHash&&response.body.publicationHash!==publicationHash)throw new Error("optical_source_version_invalid");
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

export async function getOpticalHipsRights(root:OpticalHipsManifestData,signal?:AbortSignal):Promise<{rights:OpticalHipsRightsData;downloadUrl:string}>{
  if(!/^[a-f0-9]{64}$/u.test(root.publicationHash))throw new Error("optical_source_version_invalid");
  const response=await requestBareSkyResource(`${MINIAPP_API_BASE_PATH}/sky/optical/${root.publicationHash}/rights`,"optical",signal);
  if(response.status!==200)throw new Error("optical_rights_unavailable");
  const ref=response.body as OpticalHipsRightsReferenceData;
  if(ref?.publicationHash!==root.publicationHash||!Object.hasOwn(ref,"sha256")||
    !/^[a-f0-9]{64}$/u.test(ref.sha256)||!Number.isSafeInteger(ref.bytes)||ref.bytes<=0||
    ref.downloadUrl!==`${MINIAPP_API_BASE_PATH}/sky/optical/${root.publicationHash}/rights/${ref.sha256}`)
    throw new Error("optical_rights_reference_invalid");
  const offer=await requestBareSkyResource(ref.downloadUrl,"optical",signal);
  if(offer.status!==200)throw new Error("optical_rights_unavailable");
  assertOpticalHipsRights(offer.body,root);
  return {rights:offer.body,downloadUrl:ref.downloadUrl};
}
