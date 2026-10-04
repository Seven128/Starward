/** Explicit opt-in keeps deployed JPEG consumers on their existing publication. */
export const DEEP_SKY_SOURCE_FINITE_IMAGE_VERSION = "source-finite-v3" as const;
export type DeepSkyImageLevel = "OVERVIEW" | "MEDIUM" | "DETAIL";
/** Dimensions used by publication, transport and the existing TAN registration. */
export const DEEP_SKY_IMAGE_PIXELS = { OVERVIEW: 256, MEDIUM: 512, DETAIL: 512 } as const;

export interface DeepSkyImageSelection {
  imageVersion?: typeof DEEP_SKY_SOURCE_FINITE_IMAGE_VERSION;
  /** When an image is already painted, disclose that publication's provenance. */
  publicationHash?: string;
}
import type { SourceSummary } from "./types.ts";
import { readSkyImageDisplaySupport, type SkyImageDisplaySupport } from "./sky-image-display-support.ts";


export interface DeepSkyImageDescriptor {
  file: string;
  downloadUrl: string;
  sha256: string;
  bytes: number;
  format: "jpeg" | "png";
  pixels: 256 | 512;
  width: 256 | 512;
  height: 256 | 512;
  fieldDegrees: number;
  /** Source availability and display support never measure scientific quality. */
  validFraction: null;
  coverageState: "NOT_MEASURED";
  sourceFiniteMask?: { kind: "NONFINITE_HIPS_SAMPLES"; missingPixels: number; finitePixels: number };
  displaySupport?: SkyImageDisplaySupport;
}

/** One admitted current W3 entry, discovered before its image bytes. */
export interface DeepSkyImageDiscoveryData {
  schemaVersion: "allwise-w3-selected-image-discovery-v1";
  imageVersion: typeof DEEP_SKY_SOURCE_FINITE_IMAGE_VERSION;
  publicationHash: string;
  publicationId: string;
  sourceId: string;
  source: SourceSummary;
  objectRef: string;
  center: { raDeg: number; decDeg: number; frame: "ICRS J2000" };
  orientation: "north-up/east-left";
  levels: Record<DeepSkyImageLevel, DeepSkyImageDescriptor>;
}

const hashPattern = /^[a-f0-9]{64}$/u;
/** Structural/identity admission, not source astrometry or scientific quality. */
export function assertDeepSkyImageDiscovery(value: unknown, expectedReference: string): asserts value is DeepSkyImageDiscoveryData {
  const data = value as DeepSkyImageDiscoveryData | null;
  const validReference = /^M:(?:[1-9]|[1-9]\d|10\d|110)$/u.test(expectedReference);
  if (!data || !validReference || data.schemaVersion !== "allwise-w3-selected-image-discovery-v1" ||
      data.imageVersion !== DEEP_SKY_SOURCE_FINITE_IMAGE_VERSION || data.objectRef !== expectedReference ||
      typeof data.publicationHash !== "string" || !hashPattern.test(data.publicationHash) ||
      typeof data.publicationId !== "string" || !data.publicationId || /[:\r\n]/u.test(data.publicationId) ||
      data.sourceId !== `imagery:${data.publicationId}:${data.publicationHash}` ||
      data.source?.id !== data.sourceId || data.source.kind !== "OPEN_DATA" ||
      typeof data.source.provider !== "string" || !data.source.provider ||
      typeof data.source.title !== "string" || !data.source.title ||
      typeof data.source.license !== "string" || !data.source.license.includes("ODbL-1.0") ||
      data.source.licenseUrl !== "https://opendatacommons.org/licenses/odbl/1-0/" ||
      typeof data.source.sourceUrl !== "string" || !data.source.sourceUrl.startsWith("https://irsa.ipac.caltech.edu/") ||
      !Array.isArray(data.source.limitations) || !data.source.limitations.every(item => typeof item === "string") ||
      data.orientation !== "north-up/east-left" || data.center?.frame !== "ICRS J2000" ||
      !Number.isFinite(data.center.raDeg) || data.center.raDeg < 0 || data.center.raDeg >= 360 ||
      !Number.isFinite(data.center.decDeg) || Math.abs(data.center.decDeg) > 90 ||
      !data.levels || Object.keys(data.levels).sort().join() !== "DETAIL,MEDIUM,OVERVIEW")
    throw new Error("deep_sky_image_discovery_invalid");
  const stem = expectedReference.replace(":", "-");
  for (const level of ["OVERVIEW", "MEDIUM", "DETAIL"] as const) {
    const asset = data.levels[level], pixels = DEEP_SKY_IMAGE_PIXELS[level];
    if (!asset || typeof asset.sha256 !== "string" || !hashPattern.test(asset.sha256) ||
        !Number.isSafeInteger(asset.bytes) || asset.bytes < 4 || !["jpeg", "png"].includes(asset.format) ||
        asset.pixels !== pixels || asset.width !== pixels || asset.height !== pixels ||
        !Number.isFinite(asset.fieldDegrees) || asset.fieldDegrees <= 0 || asset.fieldDegrees > 8 ||
        asset.validFraction !== null || asset.coverageState !== "NOT_MEASURED")
      throw new Error("deep_sky_image_discovery_asset_invalid");
    const file = `${stem}/${stem}-${level.toLowerCase()}${asset.format === "png" ? `.${asset.sha256}.png` : ".jpg"}`;
    if (asset.file !== file || asset.downloadUrl !== `/v2/sky/deep-sky/${data.publicationHash}/${file}`)
      throw new Error("deep_sky_image_discovery_route_invalid");
    const mask = asset.sourceFiniteMask;
    if (asset.format === "png" ? !mask || mask.kind !== "NONFINITE_HIPS_SAMPLES" ||
        !Number.isInteger(mask.missingPixels) || mask.missingPixels < 0 ||
        !Number.isInteger(mask.finitePixels) || mask.finitePixels <= 0 ||
        mask.missingPixels + mask.finitePixels !== pixels ** 2 : mask !== undefined)
      throw new Error("deep_sky_image_discovery_availability_invalid");
    if (asset.displaySupport !== undefined && (asset.format !== "png" ||
        !readSkyImageDisplaySupport(asset.displaySupport, pixels, asset.sha256)))
      throw new Error("deep_sky_image_discovery_display_support_invalid");
  }
}
