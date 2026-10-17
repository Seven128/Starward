import {BODY_IMAGE_PUBLICATIONS,isBodyImageMetadata,type SaturnBandsManifestData} from "@starward/miniapp-contracts";
import {FixedBodyTexturePublicationService} from "./fixed-body-texture-publication.ts";

export class SaturnBandsPublicationService extends FixedBodyTexturePublicationService<SaturnBandsManifestData>{
  constructor(manifestUrl:URL=new URL("../assets/saturn/manifest.json",import.meta.url)){
    super(manifestUrl,{...BODY_IMAGE_PUBLICATIONS.saturn,
      recordUrl:BODY_IMAGE_PUBLICATIONS.saturn.sourceIdentity.recordUrl,
      rightsUrl:BODY_IMAGE_PUBLICATIONS.saturn.sourceIdentity.rightsUrl,
      validateMetadata:value=>isBodyImageMetadata("saturn",value)});
  }
}
