import { BODY_IMAGE_PUBLICATIONS, isBodyImageMetadata } from "@starward/miniapp-contracts";
import { FixedBodyTexturePublicationService } from "./fixed-body-texture-publication.js";
export class JupiterBandsPublicationService extends FixedBodyTexturePublicationService {
    constructor(manifestUrl = new URL("../assets/jupiter/manifest.json", import.meta.url)) {
        super(manifestUrl, { ...BODY_IMAGE_PUBLICATIONS.jupiter,
            recordUrl: BODY_IMAGE_PUBLICATIONS.jupiter.sourceIdentity.recordUrl,
            rightsUrl: BODY_IMAGE_PUBLICATIONS.jupiter.sourceIdentity.rightsUrl,
            validateMetadata: value => isBodyImageMetadata("jupiter", value) });
    }
}
//# sourceMappingURL=jupiter-bands-publication.js.map