import { OPTICAL_IMAGE_LEVELS } from "../optical-publication-content.ts";
import type { PreparedOpticalPublication } from "../prepared-optical-publication.ts";

const hash = "1".repeat(64), identity = { bytes: 128, sha256: hash };
/** Structure only; source decoding and every output pixel are verified by the
 * offline producer/writer. This fixture supplies no scientific observations. */
export function preparedOpticalFixture(): PreparedOpticalPublication {
  const fieldDegrees = .2275555555555556;
  return {
    schemaVersion: "prepared-observation-optical-publication-v1", imageVersion: "prepared-optical-v1",
    publicationId: "synthetic-prepared-admission-v1", objectRef: "M:51",
    center: { raDeg: 202.469625, decDeg: 47.1951666667, frame: "ICRS J2000" }, orientation: "north-up/east-left",
    source: { resourceId: "synthetic-avm", sourceUrl: "https://example.invalid/observation.jpg",
      metadataReferenceUrl: "https://example.invalid/observation/", credit: "Complete synthetic fixture credit",
      license: "CC BY 4.0", licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
      policyUrl: "https://example.invalid/rights/", colourMeaning: "Prepared encoded observation colour; not calibrated flux",
      encodedJpeg: identity, rawXmp: identity, parserXmp: identity,
      decodedRgb: { bytes: 32 * 24 * 3, sha256: hash, shape: [24, 32, 3], rowOrder: "top-first" },
      nominalAvm: { referenceDimension: [64, 48], referencePixel: [32.5, 24.5], referenceValue: [202.468, 47.21],
        scale: [-.00002, .00002], rotation: -91.9, decodedShapeWidthHeight: [32, 24],
        resizeCommonXFactor: .5, resizeYFactor: .5, crpixFitsOneBased: [16.25, 12.25], cdeltDegrees: [-.00004, .00004],
        spatialNotes: "Approximate publisher coordinates; fixture is not an astrometric measurement",
        spatialQuality: "Full", accuracy: "UNVERIFIED_APPROXIMATE_PUBLISHER_AVM" } },
    processing: { runtimeNetwork: "forbidden", modification: "Unmodified encoded colour; geometry-only resampling",
      coverage: "Scientific availability and validity are unknown", sourceAdapterVersion: "prepared-rgb-observation-avm-v1",
      producerVersion: "prepared-rgb-tan-master-v1", producerReceipt: identity,
      sampleOffsetsDyDx: [[-.25, -.25], [-.25, .25], [.25, -.25], [.25, .25]],
      sampling: "encoded-RGB-bilinear-all-four-neighbours", levelResampling: "geometry-premultiplied-integer-box-round-to-nearest",
      validation: "BOUND_MASTER_AND_LEVELS_CHECKED" },
    master: { pixels: 2048, fieldDegrees, crpixFitsOneBased: 1024.5,
      rgba: { ...identity, bytes: 2048 ** 2 * 4 },
      rgbaNpy: { bytes: 2048 ** 2 * 4 + 128, sha256: "2".repeat(64), format: "npy",
        shape: [2048, 2048, 4], dtype: "uint8", rowOrder: "top-first" },
      geometricSupportPixels: 2048 ** 2, geometricBlackPixels: 2048 ** 2,
      scientificAvailability: "UNKNOWN", scientificValidity: "UNKNOWN", unit: "published-encoded-RGB" },
    levels: Object.fromEntries(OPTICAL_IMAGE_LEVELS.map((level, index) => {
      const extent = 2048 / 2 ** index, start = (2048 - extent) / 2;
      return [level, { ...identity, file: `M-51-${level.toLowerCase()}.png`, format: "png", pixels: 512,
        fieldDegrees: Math.atan(Math.tan(fieldDegrees * Math.PI / 360) * extent / 2048) * 360 / Math.PI,
        crpixFitsOneBased: 256.5, displayAlpha: "geometric-source-area", scientificAvailability: "UNKNOWN", masterRgbaSha256: hash,
        masterCrop: { boundsXYExclusive: [start, start, start + extent, start + extent], boxFactor: extent / 512 },
        geometricMasterSupportPixels: extent ** 2, alphaPixels: { opaque: 512 ** 2, partial: 0, zero: 0 } }];
    })) as PreparedOpticalPublication["levels"],
  };
}
