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
