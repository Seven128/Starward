import { OPTICAL_IMAGE_LEVELS } from "../optical-publication-content.ts";
import { preparedOpticalFixture } from "./prepared-optical-publication.ts";
import { preparedOpticalPublicationHash } from "../prepared-optical-publication.ts";
import type { PreparedDisplayOpticalPublication } from "../prepared-display-optical-publication.ts";

const identity = { bytes: 128, sha256: "3".repeat(64) };
export function preparedDisplayOpticalFixture(parent = preparedOpticalFixture()): PreparedDisplayOpticalPublication {
  const rgba = { ...identity, bytes: 2048 ** 2 * 4 };
  return { ...parent, schemaVersion: "prepared-observation-display-optical-publication-v1",
    imageVersion: "prepared-display-optical-v1", publicationId: "synthetic-prepared-display-v1",
    parent: { publicationHash: preparedOpticalPublicationHash(parent), publication: parent },
    master: { ...parent.master, rgba, unit: "background-subtracted-display-sRGB" },
    levels: Object.fromEntries(OPTICAL_IMAGE_LEVELS.map(level => [level,
      { ...parent.levels[level], masterRgbaSha256: rgba.sha256 }])) as PreparedDisplayOpticalPublication["levels"],
    processing: { runtimeNetwork: "forbidden", modification: "Source-masked display floor estimate; synthetic structure only",
      coverage: "Original geometry; no science or complete faint-structure claim",
      producerVersion: "prepared-source-masked-background-display-v1", producerReceipt: identity,
      generationReceipt: identity, generationScript: identity, colourTransferImplementation: identity,
      sourceIcc: { ...identity, colourSpace: "sRGB" },
      background: { ...identity, format: "npz", member: "background.npy", shape: [2048, 2048, 3],
        dtype: "float64", rowOrder: "top-first", payload: { ...identity, bytes: 2048 ** 2 * 3 * 8 } },
      estimationMask: { ...identity, bytes: 2048 ** 2 + 128, format: "npy", shape: [2048, 2048],
        dtype: "bool", rowOrder: "top-first", pixels: 150, detectedOnlyPixels: 50,
        role: "background-estimation-exclusion-not-geometry-or-science" },
      geometryExclusion: { metadata: identity, rgba, rgbaNpy: { ...identity, bytes: rgba.bytes + 128 },
        metadataReferenceUrl: "https://example.invalid/guard/", credit: "Complete guard metadata credit",
        license: "CC BY 4.0", licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
        pixels: 2048, center: parent.center, fieldDegrees: parent.master.fieldDegrees, supportPixels: 100,
        role: "background-estimation-exclusion-only-no-RGB" },
      estimate: { method: "photutils-background2d-median-source-mask-v1", photutilsVersion: "3.0.0",
        domain: "prepared-encoded-sRGB-byte-values", boxSize: [256, 256], meshFilterSize: [3, 3],
        sigmaClip: { sigma: 3, maxiters: 10 }, detectNSigma: 2, detectNPixels: 10, dilateRadiusTargetPixels: 10 },
      subtraction: "sRGB-to-linear-subtract-linearized-estimate-clamp-negative-to-zero-encode-sRGB-round",
      negativeChannelPixels: [parent.master.geometricSupportPixels, 0, 0], alpha: "unchanged-parent-geometric-support",
      levelResampling: "geometry-premultiplied-integer-box-round-to-nearest",
      validation: "BOUND_PARENT_FORMULA_ALPHA_AND_LEVELS_CHECKED" } };
}

