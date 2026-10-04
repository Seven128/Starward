import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, utf8ToBytes } from "@noble/hashes/utils.js";
import { OPTICAL_IMAGE_LEVELS, type OpticalImageLevel } from "./optical-publication-content.ts";

export const SDSS_OPTICAL_LEVELS = OPTICAL_IMAGE_LEVELS;
export type SdssOpticalLevel = OpticalImageLevel;
const standardScales = { OVERVIEW: 1.6, MEDIUM: .8, DETAIL: .4 } as const;

/** Admitted immutable publications, shared by transport and native consumers.
 * A publication hash binds the complete provenance, geometry and asset bytes.
 * Scales are also available before discovery so selection need not fetch offscreen images. */
export const SDSS_OPTICAL_PUBLICATIONS = {
  "M:51": { publicationId: "sdss-dr17-m51.v20260925", publicationHash: "5c068fae55a47444724767777532ce6af1b6555c41ca2afdcceed9e9ae762eff", scales: standardScales },
  "M:63": { publicationId: "sdss-dr17-m63.v20260929", publicationHash: "5199f79b27bd859891e1641e2103f8249956e71b180cd9d93072faafa8eb597a", scales: standardScales },
  "M:64": { publicationId: "sdss-dr17-m64.v20260929", publicationHash: "bb11a9d3645eb7179dfec84a96591def55b84a4f0c89cf5f442937c4dbf86845", scales: standardScales },
  "M:81": { publicationId: "sdss-dr17-m81.v20260929", publicationHash: "29e25248ce49a8c5aa0a9c4d591c0024438ac8376bcf777c16de9ae2dbb90c20", scales: { OVERVIEW: 3.2, MEDIUM: 1.6, DETAIL: .4 } },
  "M:82": { publicationId: "sdss-dr17-m82.v20260929", publicationHash: "450e5305189e0f31f5716513880ce480994e676379a79f8e571039b4bcde4b43", scales: standardScales },
  "M:87": { publicationId: "sdss-dr17-m87.v20260929", publicationHash: "333321a17a68e6fbf041aabcc06a34a0ec6e302778d5c2d5259d573518e348c8", scales: standardScales },
} as const;
export type SdssOpticalReference = keyof typeof SDSS_OPTICAL_PUBLICATIONS;

export function sdssOpticalPublication(reference: string | null | undefined) {
  return reference && Object.prototype.hasOwnProperty.call(SDSS_OPTICAL_PUBLICATIONS, reference)
    ? SDSS_OPTICAL_PUBLICATIONS[reference as SdssOpticalReference] : null;
}

export interface SdssOpticalPublishedAsset {
  file: string; scaleArcsecPerPixel: number; pixels: 512; fieldDegrees: number;
  bytes: number; sha256: string; requestUrl: string;
}
export interface SdssOpticalPublication {
  schemaVersion: "sdss-dr17-m51-optical-publication-v1" | "sdss-dr17-target-optical-publication-v1";
  publicationId: string; objectRef: SdssOpticalReference;
  center: { raDeg: number; decDeg: number; frame: "ICRS J2000" };
  orientation: "north-up/east-left";
  source: { provider: string; dataset: string; landingUrl: string; imageUsePolicyUrl: string;
    license: "CC BY 4.0"; licenseUrl: string; credit: string; processingDocumentationUrl: string };
  processing: { runtimeNetwork: "forbidden"; modification: string; coverage: string };
  levels: Record<SdssOpticalLevel, SdssOpticalPublishedAsset>;
}
export type SdssOpticalAsset = SdssOpticalPublishedAsset & { downloadUrl: string };
export type SdssOpticalManifest = Omit<SdssOpticalPublication, "levels"> & {
  publicationHash: string; levels: Record<SdssOpticalLevel, SdssOpticalAsset>;
};

/** Transport-only URLs/hash are excluded; the order preserves the original M51 digest. */
export function sdssOpticalPublicationHash(root: SdssOpticalPublication): string {
  const publication = {
    schemaVersion: root.schemaVersion, publicationId: root.publicationId, objectRef: root.objectRef,
    center: { raDeg: root.center.raDeg, decDeg: root.center.decDeg, frame: root.center.frame }, orientation: root.orientation,
    source: { provider: root.source.provider, dataset: root.source.dataset, landingUrl: root.source.landingUrl,
      imageUsePolicyUrl: root.source.imageUsePolicyUrl, license: root.source.license, licenseUrl: root.source.licenseUrl,
      credit: root.source.credit, processingDocumentationUrl: root.source.processingDocumentationUrl },
    processing: { runtimeNetwork: root.processing.runtimeNetwork, modification: root.processing.modification, coverage: root.processing.coverage },
    levels: Object.fromEntries(SDSS_OPTICAL_LEVELS.map(level => {
      const asset = root.levels[level];
      return [level, { file: asset.file, scaleArcsecPerPixel: asset.scaleArcsecPerPixel, pixels: asset.pixels,
        fieldDegrees: asset.fieldDegrees, bytes: asset.bytes, sha256: asset.sha256, requestUrl: asset.requestUrl }];
    })),
  };
  return bytesToHex(sha256(utf8ToBytes(JSON.stringify(publication))));
}

export function assertSdssOpticalPublication(value: unknown, reference: string): asserts value is SdssOpticalPublication {
  const root = value as SdssOpticalPublication, offer = sdssOpticalPublication(reference);
  if (!offer || root?.objectRef !== reference || root.publicationId !== offer.publicationId ||
    root.schemaVersion !== (reference === "M:51" ? "sdss-dr17-m51-optical-publication-v1" : "sdss-dr17-target-optical-publication-v1") ||
    root.center?.frame !== "ICRS J2000" || !Number.isFinite(root.center.raDeg) || !Number.isFinite(root.center.decDeg) ||
    !root.source || !root.processing || !root.levels || Object.keys(root.levels).length !== 3 ||
    SDSS_OPTICAL_LEVELS.some(level => !root.levels[level] || root.levels[level].scaleArcsecPerPixel !== offer.scales[level]) ||
    sdssOpticalPublicationHash(root) !== offer.publicationHash)
    throw new Error("sdss_optical_publication_invalid");
}

export function assertSdssOpticalManifest(value: unknown, reference = "M:51"): asserts value is SdssOpticalManifest {
  try { assertSdssOpticalPublication(value, reference); }
  catch { throw new Error("sdss_optical_manifest_invalid"); }
  const root = value as SdssOpticalManifest;
  if (root.publicationHash !== sdssOpticalPublication(reference)!.publicationHash ||
    SDSS_OPTICAL_LEVELS.some(level => root.levels[level].downloadUrl !==
      `/v2/sky/sdss-optical/${root.publicationHash}/${root.levels[level].file}`))
    throw new Error("sdss_optical_manifest_invalid");
}
