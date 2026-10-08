import { OPTICAL_IMAGE_LEVELS, opticalContentHashPattern, opticalPublicationContentHash,
  isOpticalContentIdentity, isOpticalHttpsLink, isOpticalPublicationText,
  type OpticalContentIdentity, type OpticalImageLevel } from "./optical-publication-content.ts";
import type { SourceSummary } from "./types.ts";
import { isDeepSkyObjectReference } from "./celestial-identity.ts";

/** A celestial target and a photograph of a region have different identities.
 * A region never acquires object facts, a pick marker or a catalog position. */
export type PreparedOpticalSubject =
  | { kind: "object"; reference: string; label: string }
  | { kind: "region"; reference: string; label: string };
export const PREPARED_NATIVE_OPTICAL_VERSION = "prepared-native-optical-v1" as const;
export function isPreparedOpticalReference(value: unknown): value is string {
  return isDeepSkyObjectReference(value) || typeof value === "string" && /^REGION:[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(value);
}
export interface PreparedNativeTanGeometry {
  projection: "TAN"; frame: "ICRS J2000";
  /** Size and FITS one-based pixel coordinates of the ORIGINAL source. */
  sourceWidth: number; sourceHeight: number;
  referenceValue: [number, number]; referencePixelFitsOneBased: [number, number];
  cdDegreesPerPixel: [[number, number], [number, number]];
  rowOrder: "top-first";
  accuracy: "UNVERIFIED_APPROXIMATE_PUBLISHER_AVM" | "UNVERIFIED_COMPANION_FITS_ASSUMED_ICRS";
}
export interface PreparedNativeOpticalAsset extends OpticalContentIdentity {
  file: string; format: "png" | "jpeg"; width: number; height: number;
  /** Nominal mid-row angular width only. The rectangle's TAN plane owns
   * coverage; this scalar cannot establish a circular field or validity. */
  fieldDegrees: number;
  sourceUvBounds: [0, 0, 1, 1];
  displayAlpha: "geometric-source-area"; scientificAvailability: "UNKNOWN";
  decodedRgb: OpticalContentIdentity;
}
/** Whole-source tiers preserve one rotated rectangular nominal plane. This
 * version neither crops to the catalog center nor reprojects to north-up. */
export interface PreparedNativeOpticalPublication {
  schemaVersion: "prepared-native-optical-publication-v1";
  imageVersion: typeof PREPARED_NATIVE_OPTICAL_VERSION;
  publicationId: string; reference: string; subject: PreparedOpticalSubject;
  nominalTan: PreparedNativeTanGeometry;
  source: {
    resourceId: string; sourceUrl: string; metadataReferenceUrl: string;
    credit: string; license: "CC BY 4.0"; licenseUrl: string; policyUrl: string; colourMeaning: string;
    encoded: OpticalContentIdentity & { format: "jpeg" | "png" };
    decodedRgb: OpticalContentIdentity & { width: number; height: number; rowOrder: "top-first" };
    metadata: OpticalContentIdentity & { kind: "publisher-avm" | "companion-fits"; sourceUrl: string };
    /** Bound nominal geometry/orientation check. Not an exposure or quality mask. */
    registrationEvidence: OpticalContentIdentity;
    iccProfile: OpticalContentIdentity | null;
  };
  processing: {
    runtimeNetwork: "forbidden"; modification: string; coverage: string;
    producerVersion: "prepared-native-full-source-v1";
    producerReceipt: OpticalContentIdentity;
    resampling: "whole-source-LANCZOS"; colourUnit: "published-encoded-RGB";
    alphaMeaning: "opaque-full-source-rectangle";
    scientificAvailability: "UNKNOWN"; sourceResolution: "UNKNOWN";
  };
  levels: Record<OpticalImageLevel, PreparedNativeOpticalAsset>;
}
export type PreparedNativeOpticalManifest = Omit<PreparedNativeOpticalPublication, "levels"> & {
  publicationHash: string;
  levels: Record<OpticalImageLevel, PreparedNativeOpticalAsset & { downloadUrl: string }>;
};
const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const dimension = (v: unknown): v is number => Number.isSafeInteger(v) && (v as number) > 1;
const pair = (v: unknown): v is [number, number] => Array.isArray(v) && v.length === 2 && v.every(finite);
export function isPreparedNativeTanGeometry(value: unknown): value is PreparedNativeTanGeometry {
  const g = value as PreparedNativeTanGeometry | null;
  if (!g || g.projection !== "TAN" || g.frame !== "ICRS J2000" || g.rowOrder !== "top-first" ||
    !dimension(g.sourceWidth) || !dimension(g.sourceHeight) ||
    !Number.isSafeInteger(g.sourceWidth * g.sourceHeight * 3) ||
    !pair(g.referenceValue) || !pair(g.referencePixelFitsOneBased) ||
    g.referenceValue[0] < 0 || g.referenceValue[0] >= 360 || Math.abs(g.referenceValue[1]) > 90 ||
    !Array.isArray(g.cdDegreesPerPixel) || g.cdDegreesPerPixel.length !== 2 || !g.cdDegreesPerPixel.every(pair) ||
    !["UNVERIFIED_APPROXIMATE_PUBLISHER_AVM", "UNVERIFIED_COMPANION_FITS_ASSUMED_ICRS"].includes(g.accuracy)) return false;
  const [[a, b], [c, d]] = g.cdDegreesPerPixel;
  const determinant = a * d - b * c;
  return finite(determinant) && determinant !== 0 &&
    g.cdDegreesPerPixel.flat().every(v => finite(v * Math.max(g.sourceWidth, g.sourceHeight)));
}
export function preparedNativeOpticalPublicationHash(value: PreparedNativeOpticalPublication): string {
  const { publicationHash: _hash, ...root } = value as PreparedNativeOpticalPublication & { publicationHash?: string };
  return opticalPublicationContentHash({ ...root, levels: Object.fromEntries(OPTICAL_IMAGE_LEVELS.map(level => {
    const { downloadUrl: _url, ...asset } = root.levels[level] as PreparedNativeOpticalAsset & { downloadUrl?: string };
    return [level, asset];
  })) });
}
export function assertPreparedNativeOpticalPublication(value: unknown, reference: string,
  expectedHash?: string): asserts value is PreparedNativeOpticalPublication {
  const p = value as PreparedNativeOpticalPublication | null;
  const invalid = (): never => { throw new Error("prepared_native_optical_publication_invalid"); };
  if (!p || p.schemaVersion !== "prepared-native-optical-publication-v1" || p.imageVersion !== PREPARED_NATIVE_OPTICAL_VERSION ||
    !isPreparedOpticalReference(reference) || p.reference !== reference || !p.subject || p.subject.reference !== reference ||
    !isOpticalPublicationText(p.subject.label) ||
    (reference.startsWith("REGION:") ? p.subject.kind !== "region" : p.subject.kind !== "object") ||
    "objectRef" in p || "center" in p || "orientation" in p ||
    !isOpticalPublicationText(p.publicationId) || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(p.publicationId) ||
    !isPreparedNativeTanGeometry(p.nominalTan)) return invalid();
  const s = p.source, g = p.nominalTan;
  if (!s || ![s.resourceId, s.credit, s.colourMeaning].every(isOpticalPublicationText) ||
    ![s.sourceUrl, s.metadataReferenceUrl, s.policyUrl].every(isOpticalHttpsLink) ||
    s.license !== "CC BY 4.0" || s.licenseUrl !== "https://creativecommons.org/licenses/by/4.0/" ||
    !isOpticalContentIdentity(s.encoded) || !["jpeg", "png"].includes(s.encoded.format) ||
    !isOpticalContentIdentity(s.decodedRgb) || s.decodedRgb.width !== g.sourceWidth || s.decodedRgb.height !== g.sourceHeight ||
    s.decodedRgb.rowOrder !== "top-first" || s.decodedRgb.bytes !== g.sourceWidth * g.sourceHeight * 3 ||
    !isOpticalContentIdentity(s.metadata) || !isOpticalHttpsLink(s.metadata.sourceUrl) ||
    (g.accuracy === "UNVERIFIED_APPROXIMATE_PUBLISHER_AVM" ? s.metadata.kind !== "publisher-avm" : s.metadata.kind !== "companion-fits") ||
    !isOpticalContentIdentity(s.registrationEvidence) || !(s.iccProfile === null || isOpticalContentIdentity(s.iccProfile))) return invalid();
  const processing = p.processing;
  if (!processing || processing.runtimeNetwork !== "forbidden" || processing.producerVersion !== "prepared-native-full-source-v1" ||
    ![processing.modification, processing.coverage].every(isOpticalPublicationText) ||
    !isOpticalContentIdentity(processing.producerReceipt) || processing.resampling !== "whole-source-LANCZOS" ||
    processing.colourUnit !== "published-encoded-RGB" || processing.alphaMeaning !== "opaque-full-source-rectangle" ||
    processing.scientificAvailability !== "UNKNOWN" || processing.sourceResolution !== "UNKNOWN" || !p.levels ||
    Object.keys(p.levels).sort().join() !== "DETAIL,MEDIUM,OVERVIEW") return invalid();
  let previousWidth = 0, previousHeight = 0;
  for (const level of OPTICAL_IMAGE_LEVELS) {
    const asset = p.levels[level];
    if (!isOpticalContentIdentity(asset) || !["png", "jpeg"].includes(asset.format) ||
      asset.file !== `${p.publicationId}-${level.toLowerCase()}.${asset.format === "png" ? "png" : "jpg"}` ||
      !dimension(asset.width) || !dimension(asset.height) || asset.width <= previousWidth || asset.height <= previousHeight ||
      asset.width > g.sourceWidth || asset.height > g.sourceHeight ||
      Math.abs(asset.height - g.sourceHeight * asset.width / g.sourceWidth) > .500000001 ||
      !finite(asset.fieldDegrees) || asset.fieldDegrees <= 0 || asset.fieldDegrees >= 180 ||
      asset.fieldDegrees !== p.levels.OVERVIEW.fieldDegrees || JSON.stringify(asset.sourceUvBounds) !== "[0,0,1,1]" ||
      asset.displayAlpha !== "geometric-source-area" || asset.scientificAvailability !== "UNKNOWN" ||
      !isOpticalContentIdentity(asset.decodedRgb) || asset.decodedRgb.bytes !== asset.width * asset.height * 3) return invalid();
    previousWidth = asset.width; previousHeight = asset.height;
  }
  const hash = preparedNativeOpticalPublicationHash(p);
  if (expectedHash !== undefined && (!opticalContentHashPattern.test(expectedHash) || hash !== expectedHash)) return invalid();
}
export function assertPreparedNativeOpticalManifest(value: unknown, reference: string,
  expectedHash: string): asserts value is PreparedNativeOpticalManifest {
  assertPreparedNativeOpticalPublication(value, reference, expectedHash);
  const p = value as PreparedNativeOpticalManifest;
  if (p.publicationHash !== expectedHash || OPTICAL_IMAGE_LEVELS.some(level =>
    p.levels[level].downloadUrl !== `/v2/sky/prepared-optical/${expectedHash}/${p.levels[level].file}`))
    throw new Error("prepared_native_optical_manifest_invalid");
}

/** Source page and API use the same truthful byte-bound display provenance. */
export function preparedNativeOpticalSource(p: PreparedNativeOpticalPublication & { publicationHash: string }): SourceSummary {
  const { source: s, processing } = p;
  return { id: `prepared-optical-imagery:${p.publicationId}:${p.publicationHash}`, kind: "OPEN_DATA",
    provider: s.resourceId, title: `${p.subject.label} · 历史观测影像`, sourceUrl: s.metadataReferenceUrl,
    license: s.license, licenseUrl: s.licenseUrl,
    attribution: { name: s.credit, url: s.metadataReferenceUrl,
      statements: [s.credit, `CC BY 4.0 · ${s.licenseUrl}`, processing.modification] },
    publishedAt: null, retrievedAt: null, validFrom: null, validTo: null, state: "FRESH", confidence: null,
    precision: "全幅矩形历史观测影像；保留名义TAN方向，科学有效性和源分辨率未知；不是实时或肉眼观感",
    limitations: [s.colourMeaning, `图片使用政策：${s.policyUrl}`, processing.modification, processing.coverage,
      p.nominalTan.accuracy === "UNVERIFIED_APPROXIMATE_PUBLISHER_AVM" ? "使用出版方近似AVM；未独立校准绝对天文配准。"
        : "名义TAN取自同配置的观测FITS；其未声明坐标框架，按ICRS解释。方向检查不提供RGB曝光或有效性mask。",
      "编码黑像素仍属于照片；矩形内不表示科学有效或曝光完整。三级为同一全幅的降采样，不扩展观测范围。"] };
}
