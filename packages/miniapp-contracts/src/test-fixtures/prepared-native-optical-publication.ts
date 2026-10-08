import type { PreparedNativeOpticalPublication } from "../prepared-native-optical-publication.ts";
import { OPTICAL_IMAGE_LEVELS } from "../optical-publication-content.ts";

/** Structural fixture using the real trial's rectangular nominal geometry;
 * placeholder hashes are not decoded pixels, a source admission or adoption. */
export function preparedNativeOpticalFixture(region = false): PreparedNativeOpticalPublication {
  const id = { bytes: 128, sha256: "1".repeat(64) };
  const publicationId = "native-geometry-fixture", reference = region ? "REGION:fixture-field" : "NGC:253";
  return { schemaVersion: "prepared-native-optical-publication-v1", imageVersion: "prepared-native-optical-v1",
    publicationId, reference, subject: { kind: region ? "region" : "object", reference, label: region ? "Fixture region" : "NGC 253" },
    nominalTan: { projection: "TAN", frame: "ICRS J2000", sourceWidth: 8285, sourceHeight: 7510,
      referenceValue: [11.8902020999, -25.2849846151], referencePixelFitsOneBased: [4129.5546875, 3741.1953125],
      cdDegreesPerPixel: [[-0.00006609136361498976, 0.0000018124674562712372],
        [0.0000018124674562712372, 0.00006609136361498976]], rowOrder: "top-first", accuracy: "UNVERIFIED_APPROXIMATE_PUBLISHER_AVM" },
    source: { resourceId: "structural-fixture", sourceUrl: "https://example.invalid/photo.jpg",
      metadataReferenceUrl: "https://example.invalid/photo/", credit: "Fixture complete attribution",
      license: "CC BY 4.0", licenseUrl: "https://creativecommons.org/licenses/by/4.0/", policyUrl: "https://example.invalid/policy/",
      colourMeaning: "Historical encoded observation colour, not calibrated flux", encoded: { ...id, format: "jpeg" },
      decodedRgb: { bytes: 8285 * 7510 * 3, sha256: id.sha256, width: 8285, height: 7510, rowOrder: "top-first" },
      metadata: { ...id, kind: "publisher-avm", sourceUrl: "https://example.invalid/photo/" }, registrationEvidence: id, iccProfile: null },
    processing: { runtimeNetwork: "forbidden", producerVersion: "prepared-native-full-source-v1", producerReceipt: id,
      resampling: "whole-source-LANCZOS", colourUnit: "published-encoded-RGB", alphaMeaning: "opaque-full-source-rectangle",
      scientificAvailability: "UNKNOWN", sourceResolution: "UNKNOWN", modification: "Whole-source downsampling, no crop or generated detail",
      coverage: "Only this nominal original rectangle; exposure and scientific validity unknown" },
    levels: Object.fromEntries(OPTICAL_IMAGE_LEVELS.map((level, index) => {
      const width = 256 * 2 ** index, height = Math.round(7510 * width / 8285);
      return [level, { ...id, file: `${publicationId}-${level.toLowerCase()}.jpg`, format: "jpeg", width, height,
        fieldDegrees: .547768637306493, sourceUvBounds: [0, 0, 1, 1], displayAlpha: "geometric-source-area",
        scientificAvailability: "UNKNOWN", decodedRgb: { ...id, bytes: width * height * 3 } }];
    })) as PreparedNativeOpticalPublication["levels"] };
}
