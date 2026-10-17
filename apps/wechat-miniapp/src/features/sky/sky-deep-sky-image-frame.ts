import type { DeepSkyImageLevel, SkyImageDisplaySupport } from "@starward/miniapp-contracts";

/** Display facts never hold an encoded-file lease. The existing native image
 * owner retains current and applicable prior bitmaps under one publication. */
export interface SkyDeepSkyImageField {
  reference: string;
  level: DeepSkyImageLevel;
  fieldDegrees: number;
  image: object;
  publicationHash?: string;
  sourceId?: string;
  pixelSize?: 256 | 512;
  sourceMissingPixels?: number;
  displaySupport?: SkyImageDisplaySupport;
}
export interface SkyDeepSkyImageFrame extends SkyDeepSkyImageField {
  canvasGeneration: number;
  /** Scope/metadata validity; each bitmap has its own native lifetime. */
  isCurrent(): boolean;
  coarser: SkyDeepSkyImageField | null;
  fallback: SkyDeepSkyImageField | null;
}
