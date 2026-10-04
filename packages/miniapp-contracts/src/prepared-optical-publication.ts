import { OPTICAL_IMAGE_LEVELS, type OpticalImageLevel, type OpticalContentIdentity, opticalContentHashPattern,
  isOpticalContentIdentity, isOpticalPublicationText } from "./optical-publication-content.ts";
import { isPreparedOpticalGeometry, preparedOpticalContentHash,
  type PreparedOpticalGeometry, type PreparedOpticalAsset } from "./prepared-optical-common.ts";
export type { PreparedOpticalAvmGeometry, PreparedOpticalAsset } from "./prepared-optical-common.ts";

/** Unmodified historical encoded RGB, independent of processed display colour
 * or calibrated science. This original version remains strictly admitted. */
export const PREPARED_OPTICAL_VERSION = "prepared-optical-v1" as const;
export interface PreparedOpticalPublication extends PreparedOpticalGeometry<"published-encoded-RGB"> {
  schemaVersion: "prepared-observation-optical-publication-v1";
  imageVersion: typeof PREPARED_OPTICAL_VERSION;
  processing: {
    runtimeNetwork: "forbidden"; modification: string; coverage: string;
    sourceAdapterVersion: "prepared-rgb-observation-avm-v1";
    producerVersion: "prepared-rgb-tan-master-v1";
    /** Complete upstream generation receipt, not an inferred mask/quality score. */
    producerReceipt: OpticalContentIdentity;
    sampleOffsetsDyDx: [[-.25, -.25], [-.25, .25], [.25, -.25], [.25, .25]];
    sampling: "encoded-RGB-bilinear-all-four-neighbours";
    levelResampling: "geometry-premultiplied-integer-box-round-to-nearest";
    validation: "BOUND_MASTER_AND_LEVELS_CHECKED";
  };
}
export type PreparedOpticalManifest = Omit<PreparedOpticalPublication, "levels"> & {
  publicationHash: string;
  levels: Record<OpticalImageLevel, PreparedOpticalAsset & { downloadUrl: string }>;
};

export function preparedOpticalPublicationHash(value: PreparedOpticalPublication): string {
  return preparedOpticalContentHash(value);
}

/** A fresh hash cannot authorize a new source, pixel meaning or scientific claim. */
export function assertPreparedOpticalPublication(value: unknown, reference: string,
  expectedHash?: string): asserts value is PreparedOpticalPublication {
  const root = value as PreparedOpticalPublication | null;
  const invalid = () => { throw new Error("prepared_optical_publication_invalid"); };
  if (!root || root.schemaVersion !== "prepared-observation-optical-publication-v1" ||
    root.imageVersion !== PREPARED_OPTICAL_VERSION ||
    !isPreparedOpticalGeometry(root, reference, "published-encoded-RGB")) return invalid();
  const processing = root.processing;
  if (!processing || processing.runtimeNetwork !== "forbidden" ||
    ![processing.modification, processing.coverage].every(isOpticalPublicationText) ||
    processing.sourceAdapterVersion !== "prepared-rgb-observation-avm-v1" ||
    processing.producerVersion !== "prepared-rgb-tan-master-v1" || !isOpticalContentIdentity(processing.producerReceipt) ||
    processing.sampling !== "encoded-RGB-bilinear-all-four-neighbours" ||
    processing.levelResampling !== "geometry-premultiplied-integer-box-round-to-nearest" ||
    processing.validation !== "BOUND_MASTER_AND_LEVELS_CHECKED" ||
    JSON.stringify(processing.sampleOffsetsDyDx) !== "[[-0.25,-0.25],[-0.25,0.25],[0.25,-0.25],[0.25,0.25]]") return invalid();
  const actualHash = preparedOpticalPublicationHash(root);
  if (expectedHash !== undefined && (!opticalContentHashPattern.test(expectedHash) || actualHash !== expectedHash)) return invalid();
}

export function assertPreparedOpticalManifest(value: unknown, reference: string,
  expectedHash: string): asserts value is PreparedOpticalManifest {
  assertPreparedOpticalPublication(value, reference, expectedHash);
  const root = value as PreparedOpticalManifest;
  if (root.publicationHash !== expectedHash || OPTICAL_IMAGE_LEVELS.some(level =>
    root.levels[level].downloadUrl !== `/v2/sky/prepared-optical/${expectedHash}/${root.levels[level].file}`))
    throw new Error("prepared_optical_manifest_invalid");
}
