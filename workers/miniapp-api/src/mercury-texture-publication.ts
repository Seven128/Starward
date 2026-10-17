import {BODY_IMAGE_PUBLICATIONS,isBodyImageMetadata,type MercuryTextureManifestData} from "@starward/miniapp-contracts";
import {FixedBodyTexturePublicationService} from "./fixed-body-texture-publication.ts";

export class MercuryTexturePublicationService extends FixedBodyTexturePublicationService<MercuryTextureManifestData>{
  constructor(manifestUrl:URL=new URL("../assets/mercury/manifest.json",import.meta.url)){
    super(manifestUrl,{...BODY_IMAGE_PUBLICATIONS.mercury,
      recordUrl:BODY_IMAGE_PUBLICATIONS.mercury.sourceIdentity.recordUrl,
      rightsUrl:BODY_IMAGE_PUBLICATIONS.mercury.sourceIdentity.rightsUrl,
      validateMetadata:value=>isBodyImageMetadata("mercury",value)});
  }
}
