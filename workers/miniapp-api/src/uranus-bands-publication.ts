import {BODY_IMAGE_PUBLICATIONS,isBodyImageMetadata,type UranusBandsManifestData} from "@starward/miniapp-contracts";
import {FixedBodyTexturePublicationService} from "./fixed-body-texture-publication.ts";

export class UranusBandsPublicationService extends FixedBodyTexturePublicationService<UranusBandsManifestData>{
  constructor(manifestUrl:URL=new URL("../assets/uranus/manifest.json",import.meta.url)){
    super(manifestUrl,{...BODY_IMAGE_PUBLICATIONS.uranus,
      recordUrl:BODY_IMAGE_PUBLICATIONS.uranus.sourceIdentity.recordUrl,
      rightsUrl:BODY_IMAGE_PUBLICATIONS.uranus.sourceIdentity.rightsUrl,
      validateMetadata:value=>isBodyImageMetadata("uranus",value)});
  }
}
