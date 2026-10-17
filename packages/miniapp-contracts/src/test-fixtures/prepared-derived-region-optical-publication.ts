import { opticalUtf8ContentIdentity } from "../optical-publication-content.ts";
import type { PreparedDerivedRegionOpticalPublication } from "../prepared-derived-region-optical-publication.ts";

/** Metadata-only fixture. Hashes on fake image bodies do not prove pixels. */
export function preparedDerivedRegionFixture(): PreparedDerivedRegionOpticalPublication {
  const identity = { bytes: 50, sha256: "1".repeat(64) };
  const index = opticalUtf8ContentIdentity("fixture original index data, not real sky coverage");
  const source = { id: "fixture", title: "Fixture original HiPS", provider: "Fixture provider", originalDataUrl: "https://example.test/original",
    originalRights: "Fixture CC BY 4.0", originalRightsUrl: "https://example.test/policy", hipsRecordUrl: "https://example.test/record",
    hipsLicense: "ODbL-1.0", hipsDoi: null, hipsCreatorDid: "ivo://CDS/P/Fixture", format: "png", tileWidth: 512, maxOrder: 1 };
  const file = "fixture/Norder1/Dir0/index.json";
  const original = opticalUtf8ContentIdentity(JSON.stringify({ schemaVersion: "starward-optical-hips-v2", publicationId: "fixture-original",
    scope: "TRIAL", processing: "unchanged fixture", limitations: ["Not real source data"], sources: [source],
    shards: [{ sourceId: "fixture", order: 1, dir: 0, file, bytes: index.bytes, sha256: index.sha256, tileCount: 1 }] }));
  const notice = { sourceId: "fixture", database: { title: "Fixture original HiPS", creator: "Fixture creator", copyright: "Fixture database",
    doi: null, creatorDid: source.hipsCreatorDid, license: "ODbL-1.0", licenseUrl: "https://opendatacommons.org/licenses/odbl/1-0/",
    recordUrl: source.hipsRecordUrl, notice: "Fixture database ODbL notice" }, originalContent: { copyright: "Fixture source",
    grantUrl: source.originalRightsUrl, rights: source.originalRights, acknowledgementUrl: source.originalDataUrl,
    acknowledgement: "Fixture original acknowledgment", sourceAcknowledgement: "Fixture original source acknowledgment",
    sourceProperties: opticalUtf8ContentIdentity("creator_did = ivo://CDS/P/Fixture\n") },
    originalMaster: "https://example.test/hips", sourceInstancePolicy: "Fixture original instance policy" };
  const rights = opticalUtf8ContentIdentity(JSON.stringify({ schemaVersion: "starward-optical-hips-rights-v2", publicationHash: original.sha256,
    scope: "TRIAL", offerChoice: "ODbL-1.0 4.6(b)", sources: [notice], alterations: { type: "Unchanged fixture tiles", pixelBytes: "UNCHANGED",
      selectedTiles: [{ sourceId: "fixture", order: 1, pixel: 0, ...identity, originalUrl: "https://example.test/hips/Norder1/Dir0/Npix0.png",
        localPublishedFile: "fixture/Norder1/Dir0/Npix0.png", exactVersionDownloadUrl: `/v2/sky/optical/${original.sha256}/fixture/1/0` }],
      completeResultMetadata: { manifest: { file: "manifest.json", ...original }, indexes: [{ file, ...index }] },
      reproductionMethod: ["Fixture preserved bytes, no real processing"] } }));
  const fieldDegrees = 2 * Math.atan(8 * .01 * Math.PI / 180 / 2) * 180 / Math.PI;
  const p: PreparedDerivedRegionOpticalPublication = { schemaVersion: "prepared-derived-region-optical-publication-v1",
    imageVersion: "prepared-derived-region-optical-v1", publicationId: "fixture-derived-field", reference: "REGION:fixture-derived-field",
    subject: { kind: "region", reference: "REGION:fixture-derived-field", label: "Fixture derived field" },
    scope: "DEVELOPMENT_REVIEW_ONLY", ordinaryAdoption: false,
    nominalTan: { projection: "TAN", frame: "ICRS", sourceWidth: 8, sourceHeight: 6, referenceValue: [270, -24],
      referencePixelFitsOneBased: [4.5, 3.5], cdDegreesPerPixel: [[-.01, 0], [0, .01]], rowOrder: "top-first",
      accuracy: "UNVERIFIED_DERIVED_HIPS_NATIVE_CELL_TAN" },
    source: { resourceId: "CDS/P/Fixture", hipsSourceId: "fixture", sourceUrl: source.originalDataUrl, metadataReferenceUrl: source.hipsRecordUrl,
      credit: notice.originalContent.copyright, license: "CC BY 4.0", licenseUrl: "https://creativecommons.org/licenses/by/4.0/", policyUrl: source.originalRightsUrl,
      colourMeaning: "Fixture display estimate, not science", originalHipsManifest: original, originalHipsRights: rights, order: 1,
      usedTiles: [{ ...identity, pixel: 0 }], preparationReceipt: identity, iccProfile: identity, originalAlpha: { ...identity, bytes: 48 },
      counts: { samples: 48, missingTileSamples: 8, sourceTransparentSamples: 4, sourcePartialAlphaSamples: 0, opaqueSamples: 36, opaqueBlackSamples: 2 } },
    processing: { producerVersion: "prepared-derived-hips-sxt-display-v1", runtimeNetwork: "forbidden", colourUnit: "sxt-starless-display-estimate",
      sourceResolution: "UNKNOWN", scientificAvailability: "UNKNOWN", coordinateProvenance: "derived-native-cell-ICRS-TAN-grid", resampling: "whole-region-LANCZOS",
      alphaMeaning: "finest-original-source-alpha; coarser-whole-region-LANCZOS", modelPadding: "not-observed-black-or-new-coverage", sampling: "nearest-native-HEALPix-cell",
      modification: "Fixture changed RGB with original alpha", producerReceipt: identity, processingReceipt: identity, reviewReceipt: identity,
      method: "sxt", modelVersion: 11, overlap: .2, inputUpsample: 1, workingImage: identity, modifiedMaster: identity,
      fileReview: "NEEDS_REPAIR", reviewReason: "Fixture work not visually accepted", sceneAcceptance: "MISSING" },
    alterations: { schemaVersion: "starward-derived-region-alterations-v1", pixelBytes: "MODIFIED", databaseLicense: "ODbL-1.0", offerChoice: "ODbL-1.0 4.6(b)",
      contentLicense: "CC BY 4.0", notice: "Fixture original HiPS · https://opendatacommons.org/licenses/odbl/1-0/",
      availability: "complete-modified-master-and-support-in-this-publication", reproductionMethod: ["Fixture complete modified master and original support"] },
    support: { originalRegion: { ...identity, file: "fixture-original-region.png", format: "png", width: 8, height: 6, mode: "RGBA", meaning: "Original display source alpha" },
      suppliedMask: { ...identity, file: "fixture-supplied-mask.png", format: "png", width: 8, height: 6, mode: "L", meaning: "Original tile supply" } },
    levels: Object.fromEntries([["OVERVIEW", 2, 2], ["MEDIUM", 4, 3], ["DETAIL", 8, 6]].map(([level, width, height]) => [level,
      { ...identity, file: `fixture-${String(level).toLowerCase()}.png`, format: "png", width, height, fieldDegrees, sourceUvBounds: [0, 0, 1, 1],
        displayAlpha: "resampled-source-display-alpha", scientificAvailability: "UNKNOWN", decodedRgba: { ...identity, bytes: Number(width) * Number(height) * 4 } }])) as PreparedDerivedRegionOpticalPublication["levels"] };
  return p;
}
