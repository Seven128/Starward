import { OPTICAL_IMAGE_LEVELS, isOpticalContentIdentity, isOpticalHttpsLink, isOpticalPublicationText,
  isOpticalUtf8ContentIdentity, opticalPublicationContentHash, type OpticalContentIdentity,
  type OpticalUtf8ContentIdentity, type OpticalImageLevel } from "./optical-publication-content.ts";
import { isOpticalTanPlaneGeometry, type OpticalTanPlaneGeometry } from "./optical-tan-plane.ts";
import { assertOpticalHipsRights } from "./optical-hips-rights.ts";
import { opticalHipsSourceIdentityValid } from "./optical-hips-source-identity.ts";
import type { OpticalHipsManifestData } from "./api-shapes.ts";
import type { SourceSummary } from "./types.ts";

export const PREPARED_DERIVED_REGION_VERSION = "prepared-derived-region-optical-v1" as const;
export interface PreparedDerivedRegionTanGeometry extends OpticalTanPlaneGeometry {
  frame: "ICRS"; accuracy: "UNVERIFIED_DERIVED_HIPS_NATIVE_CELL_TAN";
}
export interface PreparedDerivedRegionAsset extends OpticalContentIdentity {
  file: string; format: "png"; width: number; height: number; fieldDegrees: number;
  sourceUvBounds: [0, 0, 1, 1]; displayAlpha: "resampled-source-display-alpha";
  scientificAvailability: "UNKNOWN"; decodedRgba: OpticalContentIdentity;
}
export interface PreparedDerivedRegionSupport extends OpticalContentIdentity {
  file: string; format: "png"; width: number; height: number; mode: "RGBA" | "L";
  /** Original display coverage and independent tile supply, not science flags. */
  meaning: string;
}
/** Explicit local review admission. It never enables ordinary discovery or
 * lends original-photo WCS/unchanged HiPS pixel claims to a processed region. */
export interface PreparedDerivedRegionOpticalPublication {
  schemaVersion: "prepared-derived-region-optical-publication-v1";
  imageVersion: typeof PREPARED_DERIVED_REGION_VERSION;
  publicationId: string; reference: string;
  subject: { kind: "region"; reference: string; label: string };
  scope: "DEVELOPMENT_REVIEW_ONLY"; ordinaryAdoption: false;
  nominalTan: PreparedDerivedRegionTanGeometry;
  source: {
    resourceId: string; hipsSourceId: string; sourceUrl: string; metadataReferenceUrl: string;
    credit: string; license: "CC BY 4.0"; licenseUrl: string; policyUrl: string; colourMeaning: string;
    originalHipsManifest: OpticalUtf8ContentIdentity; originalHipsRights: OpticalUtf8ContentIdentity;
    order: number; usedTiles: Array<OpticalContentIdentity & { pixel: number }>;
    preparationReceipt: OpticalContentIdentity; iccProfile: OpticalContentIdentity;
    originalAlpha: OpticalContentIdentity;
    counts: { samples: number; missingTileSamples: number; sourceTransparentSamples: number;
      sourcePartialAlphaSamples: 0; opaqueSamples: number; opaqueBlackSamples: number };
  };
  processing: {
    producerVersion: "prepared-derived-hips-sxt-display-v1"; runtimeNetwork: "forbidden";
    colourUnit: "sxt-starless-display-estimate"; sourceResolution: "UNKNOWN"; scientificAvailability: "UNKNOWN";
    coordinateProvenance: "derived-native-cell-ICRS-TAN-grid";
    resampling: "whole-region-LANCZOS";
    alphaMeaning: "finest-original-source-alpha; coarser-whole-region-LANCZOS";
    modelPadding: "not-observed-black-or-new-coverage";
    sampling: "nearest-native-HEALPix-cell"; modification: string;
    producerReceipt: OpticalContentIdentity; processingReceipt: OpticalContentIdentity; reviewReceipt: OpticalContentIdentity;
    method: "sxt"; modelVersion: 11; overlap: .2; inputUpsample: 1;
    workingImage: OpticalContentIdentity; modifiedMaster: OpticalContentIdentity;
    fileReview: "NEEDS_REPAIR" | "PASSED"; reviewReason: string; sceneAcceptance: "MISSING";
  };
  /** Complete changed display data and original support are in this bundle.
   * The model/executable is neither distributed nor needed to read the result. */
  alterations: {
    schemaVersion: "starward-derived-region-alterations-v1"; pixelBytes: "MODIFIED";
    databaseLicense: "ODbL-1.0"; offerChoice: "ODbL-1.0 4.6(b)";
    contentLicense: "CC BY 4.0"; notice: string;
    availability: "complete-modified-master-and-support-in-this-publication";
    reproductionMethod: string[];
  };
  support: { originalRegion: PreparedDerivedRegionSupport; suppliedMask: PreparedDerivedRegionSupport };
  levels: Record<OpticalImageLevel, PreparedDerivedRegionAsset>;
}
export type PreparedDerivedRegionOpticalManifest = Omit<PreparedDerivedRegionOpticalPublication, "levels" | "support"> & {
  publicationHash: string;
  levels: Record<OpticalImageLevel, PreparedDerivedRegionAsset & { downloadUrl: string }>;
  support: { [K in keyof PreparedDerivedRegionOpticalPublication["support"]]: PreparedDerivedRegionSupport & { downloadUrl: string } };
};
const dimension = (n: unknown): n is number => Number.isSafeInteger(n) && (n as number) > 1;
const count = (n: unknown): n is number => Number.isSafeInteger(n) && (n as number) >= 0;
const identityEqual = (a: OpticalContentIdentity, b: OpticalContentIdentity) => a.bytes === b.bytes && a.sha256 === b.sha256;
const files = /^[a-z0-9]+(?:-[a-z0-9]+)*\.png$/u;
export function isPreparedDerivedRegionTanGeometry(value: unknown): value is PreparedDerivedRegionTanGeometry {
  const g = value as PreparedDerivedRegionTanGeometry | null;
  return isOpticalTanPlaneGeometry(g) && g.frame === "ICRS" && g.accuracy === "UNVERIFIED_DERIVED_HIPS_NATIVE_CELL_TAN";
}
export function preparedDerivedRegionOpticalPublicationHash(value: PreparedDerivedRegionOpticalPublication): string {
  const { publicationHash: _hash, ...root } = value as PreparedDerivedRegionOpticalPublication & { publicationHash?: string };
  const withoutUrl = (asset: PreparedDerivedRegionAsset | PreparedDerivedRegionSupport) => {
    const { downloadUrl: _url, ...content } = asset as typeof asset & { downloadUrl?: string }; return content;
  };
  return opticalPublicationContentHash({ ...root,
    levels: Object.fromEntries(OPTICAL_IMAGE_LEVELS.map(level => [level, withoutUrl(root.levels[level])])),
    support: Object.fromEntries(Object.entries(root.support).map(([key, asset]) => [key, withoutUrl(asset)])) });
}
/** Original metadata is kept exact. The returned wire projection only adds
 * transport URLs/hash; it does not rewrite the original manifest/notice bytes. */
export function preparedDerivedRegionOriginalRights(publication: PreparedDerivedRegionOpticalPublication) {
  const { originalHipsManifest: metadata, originalHipsRights: receipt, hipsSourceId } = publication.source;
  if (!isOpticalUtf8ContentIdentity(metadata) || !isOpticalUtf8ContentIdentity(receipt))
    throw new Error("prepared_derived_region_original_metadata_invalid");
  const raw = JSON.parse(metadata.utf8) as OpticalHipsManifestData;
  if (raw?.schemaVersion !== "starward-optical-hips-v2" ||
    !Array.isArray(raw.sources) || !Array.isArray(raw.shards) || raw.scope !== "TRIAL" && raw.scope !== "PRODUCTION")
    throw new Error("prepared_derived_region_original_metadata_invalid");
  const root = { ...raw, publicationHash: metadata.sha256,
    shards: raw.shards.map(shard => ({ ...shard,
      indexUrl: `/v2/sky/optical/${metadata.sha256}/${shard.sourceId}/${shard.order}/${shard.dir}/index` })) };
  const rights: unknown = JSON.parse(receipt.utf8);
  assertOpticalHipsRights(rights, root);
  if (rights.alterations.completeResultMetadata.manifest.utf8 !== metadata.utf8 ||
    !identityEqual(rights.alterations.completeResultMetadata.manifest, metadata))
    throw new Error("prepared_derived_region_original_metadata_invalid");
  const source = root.sources.find(row => row.id === hipsSourceId);
  const notice = rights.sources.find(row => row.sourceId === hipsSourceId);
  if (!source || !notice || !opticalHipsSourceIdentityValid(source, root.schemaVersion) || source.format !== "png" ||
    source.tileWidth !== 512 || !count(source.maxOrder) || source.hipsLicense !== "ODbL-1.0")
    throw new Error("prepared_derived_region_original_source_invalid");
  return { root, rights, source, notice };
}
export function assertPreparedDerivedRegionOpticalPublication(value: unknown, reference: string,
  expectedHash?: string): asserts value is PreparedDerivedRegionOpticalPublication {
  const p = value as PreparedDerivedRegionOpticalPublication | null;
  const invalid = (): never => { throw new Error("prepared_derived_region_optical_publication_invalid"); };
  if (!p || p.schemaVersion !== "prepared-derived-region-optical-publication-v1" || p.imageVersion !== PREPARED_DERIVED_REGION_VERSION ||
    typeof reference !== "string" || !/^REGION:[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(reference) || p.reference !== reference ||
    p.subject?.kind !== "region" || p.subject.reference !== reference || !isOpticalPublicationText(p.subject.label) ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(p.publicationId) || p.scope !== "DEVELOPMENT_REVIEW_ONLY" || p.ordinaryAdoption !== false ||
    "objectRef" in p || "center" in p || "orientation" in p || !isPreparedDerivedRegionTanGeometry(p.nominalTan)) return invalid();
  const g = p.nominalTan, s = p.source, a = p.alterations, processing = p.processing;
  if (!s || ![s.resourceId, s.hipsSourceId, s.credit, s.colourMeaning].every(isOpticalPublicationText) ||
    ![s.sourceUrl, s.metadataReferenceUrl, s.policyUrl].every(isOpticalHttpsLink) || s.license !== "CC BY 4.0" ||
    s.licenseUrl !== "https://creativecommons.org/licenses/by/4.0/" ||
    ![s.preparationReceipt, s.iccProfile, s.originalAlpha].every(isOpticalContentIdentity) ||
    s.originalAlpha.bytes !== g.sourceWidth * g.sourceHeight || !count(s.order) || !Array.isArray(s.usedTiles) || !s.usedTiles.length) return invalid();
  const original = preparedDerivedRegionOriginalRights(p);
  if (s.order > original.source.maxOrder || s.policyUrl !== original.source.originalRightsUrl ||
    s.sourceUrl !== original.source.originalDataUrl || s.metadataReferenceUrl !== original.source.hipsRecordUrl ||
    original.source.hipsCreatorDid !== `ivo://${s.resourceId}` || s.credit !== original.notice.originalContent.copyright) return invalid();
  const pixels = new Set<number>();
  for (const tile of s.usedTiles) {
    const sourceTile = original.rights.alterations.selectedTiles.find(t => t.sourceId === s.hipsSourceId && t.order === s.order && t.pixel === tile.pixel);
    if (!count(tile.pixel) || tile.pixel >= 12 * 4 ** s.order || pixels.has(tile.pixel) || !isOpticalContentIdentity(tile) ||
      !sourceTile || !identityEqual(tile, sourceTile)) return invalid();
    pixels.add(tile.pixel);
  }
  const c = s.counts;
  if (!c || !Object.values(c).every(count) || c.samples !== g.sourceWidth * g.sourceHeight || c.sourcePartialAlphaSamples !== 0 ||
    c.missingTileSamples + c.sourceTransparentSamples + c.opaqueSamples !== c.samples || c.opaqueBlackSamples > c.opaqueSamples) return invalid();
  if (!processing || processing.producerVersion !== "prepared-derived-hips-sxt-display-v1" || processing.runtimeNetwork !== "forbidden" ||
    processing.colourUnit !== "sxt-starless-display-estimate" || processing.sourceResolution !== "UNKNOWN" || processing.scientificAvailability !== "UNKNOWN" ||
    processing.coordinateProvenance !== "derived-native-cell-ICRS-TAN-grid" || processing.resampling !== "whole-region-LANCZOS" ||
    processing.alphaMeaning !== "finest-original-source-alpha; coarser-whole-region-LANCZOS" || processing.modelPadding !== "not-observed-black-or-new-coverage" ||
    processing.sampling !== "nearest-native-HEALPix-cell" || ![processing.modification, processing.reviewReason].every(isOpticalPublicationText) ||
    ![processing.producerReceipt, processing.processingReceipt, processing.reviewReceipt, processing.workingImage, processing.modifiedMaster].every(isOpticalContentIdentity) ||
    processing.method !== "sxt" || processing.modelVersion !== 11 || processing.overlap !== .2 || processing.inputUpsample !== 1 ||
    !["NEEDS_REPAIR", "PASSED"].includes(processing.fileReview) || processing.sceneAcceptance !== "MISSING") return invalid();
  if (!a || a.schemaVersion !== "starward-derived-region-alterations-v1" || a.pixelBytes !== "MODIFIED" ||
    a.databaseLicense !== "ODbL-1.0" || a.offerChoice !== "ODbL-1.0 4.6(b)" || a.contentLicense !== "CC BY 4.0" ||
    a.availability !== "complete-modified-master-and-support-in-this-publication" || !isOpticalPublicationText(a.notice) ||
    !a.notice.includes(original.notice.database.title) || !a.notice.includes("https://opendatacommons.org/licenses/odbl/1-0/") ||
    !Array.isArray(a.reproductionMethod) || !a.reproductionMethod.length || !a.reproductionMethod.every(isOpticalPublicationText)) return invalid();
  if (!p.levels || Object.keys(p.levels).sort().join() !== "DETAIL,MEDIUM,OVERVIEW" || !p.support ||
    Object.keys(p.support).sort().join() !== "originalRegion,suppliedMask") return invalid();
  const seen = new Set<string>(); let previousWidth = 0;
  for (const level of OPTICAL_IMAGE_LEVELS) {
    const asset = p.levels[level];
    if (!asset || !isOpticalContentIdentity(asset) || !files.test(asset.file) || seen.has(asset.file) || asset.format !== "png" ||
      !dimension(asset.width) || !dimension(asset.height) || asset.width <= previousWidth || asset.width > g.sourceWidth || asset.height > g.sourceHeight ||
      Math.abs(asset.height - g.sourceHeight * asset.width / g.sourceWidth) > .5 ||
      !Number.isFinite(asset.fieldDegrees) || asset.fieldDegrees <= 0 || asset.fieldDegrees >= 180 ||
      JSON.stringify(asset.sourceUvBounds) !== "[0,0,1,1]" || asset.displayAlpha !== "resampled-source-display-alpha" ||
      asset.scientificAvailability !== "UNKNOWN" || !isOpticalContentIdentity(asset.decodedRgba) || asset.decodedRgba.bytes !== asset.width * asset.height * 4) return invalid();
    if (asset.fieldDegrees !== p.levels.DETAIL.fieldDegrees) return invalid();
    seen.add(asset.file); previousWidth = asset.width;
  }
  if (p.levels.DETAIL.width !== g.sourceWidth || p.levels.DETAIL.height !== g.sourceHeight ||
    !identityEqual(processing.modifiedMaster, p.levels.DETAIL)) return invalid();
  for (const key of ["originalRegion", "suppliedMask"] as const) {
    const asset = p.support[key];
    if (!asset || !isOpticalContentIdentity(asset) || !files.test(asset.file) || seen.has(asset.file) || asset.format !== "png" ||
      asset.width !== g.sourceWidth || asset.height !== g.sourceHeight || asset.mode !== (key === "originalRegion" ? "RGBA" : "L") ||
      !isOpticalPublicationText(asset.meaning)) return invalid();
    seen.add(asset.file);
  }
  const hash = preparedDerivedRegionOpticalPublicationHash(p);
  if (expectedHash !== undefined && expectedHash !== hash) return invalid();
}
export function assertPreparedDerivedRegionOpticalManifest(value: unknown, reference: string,
  expectedHash: string): asserts value is PreparedDerivedRegionOpticalManifest {
  assertPreparedDerivedRegionOpticalPublication(value, reference, expectedHash);
  const p = value as PreparedDerivedRegionOpticalManifest;
  if (p.publicationHash !== expectedHash || [...Object.values(p.levels), ...Object.values(p.support)].some(asset =>
    asset.downloadUrl !== `/v2/sky/prepared-optical/${expectedHash}/${asset.file}`))
    throw new Error("prepared_derived_region_optical_manifest_invalid");
}
export function preparedDerivedRegionOpticalSource(p: PreparedDerivedRegionOpticalPublication & { publicationHash: string }): SourceSummary {
  const { source, notice } = preparedDerivedRegionOriginalRights(p), s = p.source;
  const offer = `/v2/sky/prepared-optical/${p.publicationHash}/manifest`;
  return { id: `prepared-optical-imagery:${p.publicationId}:${p.publicationHash}`, kind: "OPEN_DATA", provider: source.provider,
    title: `${p.subject.label} · 历史区域去星显示估计`, sourceUrl: s.metadataReferenceUrl,
    license: s.license, licenseUrl: s.licenseUrl,
    attribution: { name: s.credit, url: s.sourceUrl, statements: [notice.originalContent.copyright,
      "Starward 已使用人工智能（AI）模型 SXT ML11 去星修改此图；这是历史区域影像的显示处理，不是新增观测，也不表示原作者或机构认可本产品。",
      notice.originalContent.sourceAcknowledgement, notice.originalContent.acknowledgement,
      `CC BY 4.0 · ${s.licenseUrl}`, notice.database.notice, `${notice.database.creator} · ${notice.database.copyright}`,
      p.alterations.notice, ...p.alterations.reproductionMethod, `完整改动数据、原覆盖及供给掩码：${offer}`, notice.sourceInstancePolicy] },
    publishedAt: null, retrievedAt: null, validFrom: null, validTo: null, state: "FRESH", confidence: null,
    precision: "连续工作区域的名义 ICRS/TAN 投影；保留原显示覆盖，源配准和科学有效性未知；不是实时或肉眼观感",
    limitations: [s.colourMeaning, p.processing.modification, p.processing.reviewReason,
      "本地审查候选，实际星空连续背景和图像质量尚未通过，未普通采用。",
      "去星模型可能误删弱结构或保留亮源残晕；区域边缘是真实有限影像覆盖，透明不等于科学缺测。",
      `工作图 ${p.nominalTan.sourceWidth}×${p.nominalTan.sourceHeight}；源有效清晰度未知，不能据像素数量推断。`,
      `原 HiPS 数据库 · ODbL-1.0 · https://opendatacommons.org/licenses/odbl/1-0/`, `图片政策：${s.policyUrl}`, `完整改动数据：${offer}`] };
}

/** Separate image-content and database license links, as in the HiPS source
 * page. Both remain bound to the same completed display publication. */
export function preparedDerivedRegionOpticalSources(p: PreparedDerivedRegionOpticalPublication & { publicationHash: string }): SourceSummary[] {
  const image = preparedDerivedRegionOpticalSource(p), { notice } = preparedDerivedRegionOriginalRights(p);
  return [image, { ...image, id: `${image.id}:database`, title: notice.database.title,
    sourceUrl: notice.database.recordUrl, license: "ODbL-1.0", licenseUrl: "https://opendatacommons.org/licenses/odbl/1-0/",
    attribution: { name: notice.database.creator, url: notice.database.recordUrl,
      statements: [notice.database.notice, notice.database.copyright, p.alterations.notice] },
    limitations: ["图片内容许可与数据库许可分别适用。此版本保留完整改动数据、原覆盖图和独立供给掩码，可从下载清单取得。",
      ...p.alterations.reproductionMethod] }];
}
