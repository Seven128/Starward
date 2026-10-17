import { BODY_IMAGE_PUBLICATIONS, isBodyImageMetadata } from "@starward/miniapp-contracts";
import { FixedBodyTexturePublicationService } from "./fixed-body-texture-publication.js";
export class UranusBandsPublicationService extends FixedBodyTexturePublicationService {
    constructor(manifestUrl = new URL("../assets/uranus/manifest.json", import.meta.url)) {
        super(manifestUrl, { ...BODY_IMAGE_PUBLICATIONS.uranus,
            recordUrl: BODY_IMAGE_PUBLICATIONS.uranus.sourceIdentity.recordUrl,
            rightsUrl: BODY_IMAGE_PUBLICATIONS.uranus.sourceIdentity.rightsUrl,
            validateMetadata: value => isBodyImageMetadata("uranus", value) });
    }
}
//# sourceMappingURL=uranus-bands-publication.js.map