import {BODY_IMAGE_PUBLICATIONS,isBodyImageMetadata,type NeptuneBandsManifestData} from "@starward/miniapp-contracts";
import {FixedBodyTexturePublicationService} from "./fixed-body-texture-publication.ts";

export class NeptuneBandsPublicationService extends FixedBodyTexturePublicationService<NeptuneBandsManifestData>{
  constructor(manifestUrl:URL=new URL("../assets/neptune/manifest.json",import.meta.url)){
    super(manifestUrl,{...BODY_IMAGE_PUBLICATIONS.neptune,
      recordUrl:BODY_IMAGE_PUBLICATIONS.neptune.sourceIdentity.recordUrl,
      rightsUrl:BODY_IMAGE_PUBLICATIONS.neptune.sourceIdentity.rightsUrl,
      validateMetadata:value=>isBodyImageMetadata("neptune",value)});
  }
}
