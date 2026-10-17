import {BODY_IMAGE_PUBLICATIONS,isBodyImageMetadata,type MarsTextureManifestData} from "@starward/miniapp-contracts";
import {FixedBodyTexturePublicationService} from "./fixed-body-texture-publication.ts";

export class MarsTexturePublicationService extends FixedBodyTexturePublicationService<MarsTextureManifestData>{
  constructor(manifestUrl:URL=new URL("../assets/mars/manifest.json",import.meta.url)){
    super(manifestUrl,{...BODY_IMAGE_PUBLICATIONS.mars,
      recordUrl:BODY_IMAGE_PUBLICATIONS.mars.sourceIdentity.recordUrl,
      rightsUrl:BODY_IMAGE_PUBLICATIONS.mars.sourceIdentity.rightsUrl,
      validateMetadata:value=>isBodyImageMetadata("mars",value)});
  }
}
