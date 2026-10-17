import {BODY_IMAGE_PUBLICATIONS,isBodyImageMetadata,type JupiterBandsManifestData} from "@starward/miniapp-contracts";
import {FixedBodyTexturePublicationService} from "./fixed-body-texture-publication.ts";

export class JupiterBandsPublicationService extends FixedBodyTexturePublicationService<JupiterBandsManifestData>{
  constructor(manifestUrl:URL=new URL("../assets/jupiter/manifest.json",import.meta.url)){
    super(manifestUrl,{...BODY_IMAGE_PUBLICATIONS.jupiter,
      recordUrl:BODY_IMAGE_PUBLICATIONS.jupiter.sourceIdentity.recordUrl,
      rightsUrl:BODY_IMAGE_PUBLICATIONS.jupiter.sourceIdentity.rightsUrl,
      validateMetadata:value=>isBodyImageMetadata("jupiter",value)});
  }
}
