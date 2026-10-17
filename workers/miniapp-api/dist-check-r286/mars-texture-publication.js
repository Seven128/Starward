import { BODY_IMAGE_PUBLICATIONS, isBodyImageMetadata } from "@starward/miniapp-contracts";
import { FixedBodyTexturePublicationService } from "./fixed-body-texture-publication.js";
export class MarsTexturePublicationService extends FixedBodyTexturePublicationService {
    constructor(manifestUrl = new URL("../assets/mars/manifest.json", import.meta.url)) {
        super(manifestUrl, { ...BODY_IMAGE_PUBLICATIONS.mars,
            recordUrl: BODY_IMAGE_PUBLICATIONS.mars.sourceIdentity.recordUrl,
            rightsUrl: BODY_IMAGE_PUBLICATIONS.mars.sourceIdentity.rightsUrl,
            validateMetadata: value => isBodyImageMetadata("mars", value) });
    }
}
//# sourceMappingURL=mars-texture-publication.js.map