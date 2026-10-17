import {assertBodyImageManifest,bodyImageManifestPath,type BodyImageKind,type BodyImagePublications} from "@starward/miniapp-contracts";
import {requestBareSkyResource,skyResourceUrl} from "./bare-sky-resource";

export async function getBodyImageManifest<K extends BodyImageKind>(kind:K,signal?:AbortSignal,publicationHash?:string):Promise<BodyImagePublications[K]>{
  const response=await requestBareSkyResource(bodyImageManifestPath(kind,publicationHash),kind,signal);
  if(response.status!==200)throw new Error('body_image_manifest_unavailable');
  assertBodyImageManifest(kind,response.body);
  if(publicationHash!==undefined&&response.body.publicationHash!==publicationHash)throw new Error('sky_body_image_version_unavailable');
  return response.body;
}
export const bodyImageUrl=skyResourceUrl;
