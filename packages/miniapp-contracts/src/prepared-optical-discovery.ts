import { isPreparedOpticalReference } from "./prepared-native-optical-publication.ts";
import { isPreparedRenderedOpticalVersion, type PreparedRenderedOpticalManifest } from "./prepared-rendered-optical-publication.ts";
import { MINIAPP_API_BASE_PATH, MINIAPP_API_OPERATIONS } from "./generated/miniapp-api.generated.ts";
import { isOpticalTanPlaneGeometry, type OpticalTanPlaneGeometry } from "./optical-tan-plane.ts";

/** Mutable discovery chooses an edition; it is never that edition's metadata. */
export interface PreparedOpticalSelection {
  readonly kind: PreparedRenderedOpticalManifest["imageVersion"];
  readonly reference: string;
  readonly publicationHash: string;
  /** Conservative acquisition bounds from the selected edition. Rendering
   * still uses its admitted immutable metadata, never this mutable summary. */
  readonly tan?: OpticalTanPlaneGeometry;
}
export interface PreparedOpticalDiscovery {
  readonly schemaVersion: "prepared-optical-discovery-v1";
  readonly publications: readonly PreparedOpticalSelection[];
}
export const PREPARED_OPTICAL_DISCOVERY_PATH = MINIAPP_API_BASE_PATH + MINIAPP_API_OPERATIONS.preparedOpticalDiscoveryGet.path;

export function assertPreparedOpticalDiscovery(value: unknown): asserts value is PreparedOpticalDiscovery {
  const input = value as PreparedOpticalDiscovery | null;
  if (!input || input.schemaVersion !== "prepared-optical-discovery-v1" || !Array.isArray(input.publications))
    throw new Error("prepared_optical_discovery_invalid");
  const references = new Set<string>(), hashes = new Set<string>();
  for (const item of input.publications) {
    if (!item || !isPreparedRenderedOpticalVersion(item.kind) || !isPreparedOpticalReference(item.reference) ||
      (item.kind !== "prepared-native-optical-v1" && item.kind !== "prepared-derived-region-optical-v1" &&
        !/^M:(?:[1-9]|[1-9]\d|10\d|110)$/u.test(item.reference)) ||
      typeof item.publicationHash !== "string" || !/^[a-f0-9]{64}$/u.test(item.publicationHash) ||
      (item.tan !== undefined && !isOpticalTanPlaneGeometry(item.tan)) ||
      references.has(item.reference) || hashes.has(item.publicationHash))
      throw new Error("prepared_optical_discovery_invalid");
    references.add(item.reference); hashes.add(item.publicationHash);
  }
}

/** Catalogue selections cannot borrow an independent region's identity. */
export function selectedPreparedOpticalPublication(discovery: PreparedOpticalDiscovery | undefined,
  reference: string | null): PreparedOpticalSelection | undefined {
  return reference ? discovery?.publications.find(item => item.reference === reference) : undefined;
}
