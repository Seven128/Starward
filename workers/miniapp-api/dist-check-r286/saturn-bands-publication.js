import { BODY_IMAGE_PUBLICATIONS, isBodyImageMetadata } from "@starward/miniapp-contracts";
import { FixedBodyTexturePublicationService } from "./fixed-body-texture-publication.js";
export class SaturnBandsPublicationService extends FixedBodyTexturePublicationService {
    constructor(manifestUrl = new URL("../assets/saturn/manifest.json", import.meta.url)) {
        super(manifestUrl, { ...BODY_IMAGE_PUBLICATIONS.saturn,
            recordUrl: BODY_IMAGE_PUBLICATIONS.saturn.sourceIdentity.recordUrl,
            rightsUrl: BODY_IMAGE_PUBLICATIONS.saturn.sourceIdentity.rightsUrl,
            validateMetadata: value => isBodyImageMetadata("saturn", value) });
    }
}
//# sourceMappingURL=saturn-bands-publication.js.map