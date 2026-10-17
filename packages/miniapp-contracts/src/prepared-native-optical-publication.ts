import { OPTICAL_IMAGE_LEVELS, opticalContentHashPattern, opticalPublicationContentHash,
  isOpticalContentIdentity, isOpticalHttpsLink, isOpticalPublicationText,
  type OpticalContentIdentity, type OpticalImageLevel } from "./optical-publication-content.ts";
import type { SourceSummary } from "./types.ts";
import { isDeepSkyObjectReference } from "./celestial-identity.ts";
import { isOpticalTanPlaneGeometry, type OpticalTanPlaneGeometry } from "./optical-tan-plane.ts";

/** A celestial target and a photograph of a region have different identities.
 * A region never acquires object facts, a pick marker or a catalog position. */
export type PreparedOpticalSubject =
  | { kind: "object"; reference: string; label: string }
  | { kind: "region"; reference: string; label: string };
export const PREPARED_NATIVE_OPTICAL_VERSION = "prepared-native-optical-v1" as const;
export function isPreparedOpticalReference(value: unknown): value is string {
  return isDeepSkyObjectReference(value) || typeof value === "string" && /^REGION:[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(value);
}
export interface PreparedNativeTanGeometry extends OpticalTanPlaneGeometry {
  projection: "TAN"; frame: "ICRS J2000";
  /** Plane dimensions/coordinates describe the ORIGINAL photograph. */
  accuracy: "UNVERIFIED_APPROXIMATE_PUBLISHER_AVM" | "UNVERIFIED_COMPANION_FITS_ASSUMED_ICRS" | "UNVERIFIED_APPROXIMATE_PUBLISHER_CORNERS";
}
export interface PreparedNativeDisplayRegistration {
  method: "reference-catalogue-tan-display-v1";
  geometry: OpticalTanPlaneGeometry;
  evidence: OpticalContentIdentity;
  sourceImage: OpticalContentIdentity;
  parentPublicationHash: string;
  catalogue: { name: string; url: string; rightsUrl: string; credit: string };
  training: { count: number; rmsPixels: number; maxPixels: number };
  holdout: { count: number; rmsPixels: number; maxPixels: number };
  residualUnit: "original-source-pixel";
  pixelTransform: "none";
  quality: "MEASURED_LOCAL_CANDIDATE";
  limitations: string;
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
interface PreparedNativeProcessingBase {
  runtimeNetwork: "forbidden"; modification: string; coverage: string;
  producerReceipt: OpticalContentIdentity;
  resampling: "whole-source-LANCZOS"; alphaMeaning: "opaque-full-source-rectangle";
  scientificAvailability: "UNKNOWN"; sourceResolution: "UNKNOWN";
}
export interface PreparedNativeSxtSeparation {
  method: "sxt" | "sxt-overlap" | "sxt-upsample"; modelVersion: 11;
  overlap: .2 | .5; inputUpsample: 1 | 2;
  processingReceipt: OpticalContentIdentity; reviewReceipt: OpticalContentIdentity;
  workingImage: OpticalContentIdentity & { width: number; height: number };
  starless: OpticalContentIdentity & { width: number; height: number };
  fileReview: "PASSED"; sceneAcceptance: "MISSING";
}
export interface PreparedNativeOriginalRestoration {
  method:"photoshop-local-original-restoration-v1";
  processingReceipt:OpticalContentIdentity;reviewReceipt:OpticalContentIdentity;
  nativeReport:OpticalContentIdentity;mask:OpticalContentIdentity;editablePsd:OpticalContentIdentity;
  restored:OpticalContentIdentity & {width:number;height:number};
  pixels:{corePixels:number;exteriorPixels:number;coreChannelDifferences:0;exteriorChannelDifferences:0;
    featherMaximumVsEncodedNormalBlend:0|1;changedPixels:number};
  fileReview:"PASSED";sceneAcceptance:"MISSING";
}
export interface PreparedNativeDisplayBackground {
  method: "source-excluded-srgb-display-background-v1";
  processingReceipt: OpticalContentIdentity; reviewReceipt: OpticalContentIdentity;
  parentDisplay: OpticalContentIdentity;
  display: OpticalContentIdentity & { width: number; height: number };
  exclusionMask: OpticalContentIdentity; estimationMask: OpticalContentIdentity; backgroundModel: OpticalContentIdentity;
  boxSize: [number, number]; sourceDilation: number;
  formula: "srgb-linear-subtract-clamp-negative-display-only";
  suppliedPixels: number; validBlackDisplayPixels: number; negativeChannelPixels: [number, number, number];
  fileReview: "PASSED"; sceneAcceptance: "MISSING";
}
export interface PreparedNativeDisplayDenoising {
  method: "nxt-srgb-background-display-denoise-v1" | "nxt-srgb-source-display-denoise-v1";
  processingReceipt: OpticalContentIdentity; reviewReceipt: OpticalContentIdentity;
  parentDisplay: OpticalContentIdentity; modelInput: OpticalContentIdentity;
  display: OpticalContentIdentity & { width: number; height: number };
  vendor: OpticalContentIdentity; cli: OpticalContentIdentity; model: OpticalContentIdentity;
  modelVersion: 3.1; denoise: .9; iterations: 1; overlap: .2; depth: "8U";
  suppliedPixels: number; changedPixels: number;
  fileReview: "PASSED"; sceneAcceptance: "MISSING";
}
type PreparedNativeProcessedLayers =
  { separation: PreparedNativeSxtSeparation; restoration?: never } |
  { separation: Omit<PreparedNativeSxtSeparation, "fileReview"> & { fileReview: "NEEDS_REPAIR" };
    restoration: PreparedNativeOriginalRestoration };
/** Geometry family stays stable; the explicit producer version changes pixel
 * meaning. Old clients reject SXT producers; old content/hash/URLs stay intact.
 * Only updated, explicitly selected trial consumers may admit this variant. */
export type PreparedNativeOpticalProcessing = PreparedNativeProcessingBase & (
  { producerVersion: "prepared-native-full-source-v1"; colourUnit: "published-encoded-RGB"; separation?: never;restoration?:never; background?: never; denoising?: never } |
  { producerVersion: "prepared-native-ready-texture-v1"; colourUnit: "published-encoded-RGB"; separation?: never;restoration?:never; background?: never; denoising?: never } |
  { producerVersion: "prepared-native-sxt-display-v1"; colourUnit: "sxt-starless-display-estimate"; separation: PreparedNativeSxtSeparation;restoration?:never; background?: never; denoising?: never } |
  { producerVersion:"prepared-native-sxt-ps-restored-display-v1";colourUnit:"sxt-original-restored-display-estimate";
    separation:Omit<PreparedNativeSxtSeparation,"fileReview"> & {fileReview:"NEEDS_REPAIR"};restoration:PreparedNativeOriginalRestoration; background?: never; denoising?: never } |
  ({ producerVersion: "prepared-native-source-background-display-v1";
    colourUnit: "source-excluded-srgb-background-display-estimate"; background: PreparedNativeDisplayBackground; denoising?: never } & PreparedNativeProcessedLayers) |
  ({ producerVersion: "prepared-native-source-background-denoised-display-v1";
    colourUnit: "source-excluded-srgb-background-denoised-display-estimate";
    background: PreparedNativeDisplayBackground; denoising: PreparedNativeDisplayDenoising } & PreparedNativeProcessedLayers) |
  ({ producerVersion: "prepared-native-source-denoised-background-display-v1";
    colourUnit: "source-excluded-denoised-srgb-background-display-estimate";
    background: PreparedNativeDisplayBackground; denoising: PreparedNativeDisplayDenoising } & PreparedNativeProcessedLayers));
/** Whole-source tiers preserve one rotated rectangular nominal plane. This
 * version neither crops to the catalog center nor reprojects to north-up. */
export interface PreparedNativeOpticalPublication {
  schemaVersion: "prepared-native-optical-publication-v1" | "prepared-native-optical-publication-v2";
  imageVersion: typeof PREPARED_NATIVE_OPTICAL_VERSION;
  publicationId: string; reference: string; subject: PreparedOpticalSubject;
  nominalTan: PreparedNativeTanGeometry;
  /** V2 changes display placement only, preserving original metadata and pixels.
   * V1 readers reject V2 instead of silently falling back to nominal placement. */
  registration?: PreparedNativeDisplayRegistration;
  source: {
    resourceId: string; sourceUrl: string; metadataReferenceUrl: string;
    credit: string; license: "CC BY 4.0"; licenseUrl: string; policyUrl: string; colourMeaning: string;
    encoded: OpticalContentIdentity & { format: "jpeg" | "png" };
    decodedRgb: OpticalContentIdentity & { width: number; height: number; rowOrder: "top-first" };
    metadata: OpticalContentIdentity & { kind: "publisher-avm" | "companion-fits" | "stellarium-corners"; sourceUrl: string };
    /** Bound nominal geometry/orientation check. Not an exposure or quality mask. */
    registrationEvidence: OpticalContentIdentity;
    iccProfile: OpticalContentIdentity | null;
  };
  processing: PreparedNativeOpticalProcessing;
  levels: Record<OpticalImageLevel, PreparedNativeOpticalAsset>;
}
export type PreparedNativeOpticalManifest = Omit<PreparedNativeOpticalPublication, "levels"> & {
  publicationHash: string;
  levels: Record<OpticalImageLevel, PreparedNativeOpticalAsset & { downloadUrl: string }>;
};
const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const dimension = (v: unknown): v is number => Number.isSafeInteger(v) && (v as number) > 1;
export function isPreparedNativeTanGeometry(value: unknown): value is PreparedNativeTanGeometry {
  const g = value as PreparedNativeTanGeometry | null;
  return isOpticalTanPlaneGeometry(g) && g.frame === "ICRS J2000" &&
    ["UNVERIFIED_APPROXIMATE_PUBLISHER_AVM", "UNVERIFIED_COMPANION_FITS_ASSUMED_ICRS", "UNVERIFIED_APPROXIMATE_PUBLISHER_CORNERS"].includes(g.accuracy);
}
export function isPreparedNativeDisplayRegistration(value: unknown, sourceImage: OpticalContentIdentity,
  nominal: PreparedNativeTanGeometry): value is PreparedNativeDisplayRegistration {
  const r = value as PreparedNativeDisplayRegistration | null;
  const sample = (v: PreparedNativeDisplayRegistration["training"] | undefined) => !!v &&
    Number.isSafeInteger(v.count) && v.count >= 3 && finite(v.rmsPixels) && finite(v.maxPixels) &&
    v.rmsPixels >= 0 && v.maxPixels >= v.rmsPixels;
  return !!r && r.method === "reference-catalogue-tan-display-v1" &&
    isOpticalTanPlaneGeometry(r.geometry) && r.geometry.sourceWidth === nominal.sourceWidth &&
    r.geometry.sourceHeight === nominal.sourceHeight && isOpticalContentIdentity(r.evidence) &&
    isOpticalContentIdentity(r.sourceImage) && r.sourceImage.sha256 === sourceImage.sha256 && r.sourceImage.bytes === sourceImage.bytes &&
    opticalContentHashPattern.test(r.parentPublicationHash) && !!r.catalogue &&
    [r.catalogue.name, r.catalogue.credit, r.limitations].every(isOpticalPublicationText) &&
    [r.catalogue.url, r.catalogue.rightsUrl].every(isOpticalHttpsLink) && sample(r.training) && sample(r.holdout) &&
    r.residualUnit === "original-source-pixel" && r.pixelTransform === "none" && r.quality === "MEASURED_LOCAL_CANDIDATE";
}
/** One display-plane decision for runtime, admission and offline inventory. */
export function preparedNativeDisplayGeometry(p: Pick<PreparedNativeOpticalPublication,
  "schemaVersion" | "nominalTan" | "registration" | "source">): OpticalTanPlaneGeometry {
  if (p.schemaVersion === "prepared-native-optical-publication-v1" && !("registration" in p)) return p.nominalTan;
  if (p.schemaVersion === "prepared-native-optical-publication-v2" &&
    isPreparedNativeDisplayRegistration(p.registration, p.source.encoded, p.nominalTan)) return p.registration.geometry;
  throw new Error("prepared_native_display_registration_invalid");
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
  if (!p || !["prepared-native-optical-publication-v1", "prepared-native-optical-publication-v2"].includes(p.schemaVersion) || p.imageVersion !== PREPARED_NATIVE_OPTICAL_VERSION ||
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
    (g.accuracy === "UNVERIFIED_APPROXIMATE_PUBLISHER_AVM" ? s.metadata.kind !== "publisher-avm" :
      g.accuracy === "UNVERIFIED_APPROXIMATE_PUBLISHER_CORNERS" ? s.metadata.kind !== "stellarium-corners" : s.metadata.kind !== "companion-fits") ||
    !isOpticalContentIdentity(s.registrationEvidence) || !(s.iccProfile === null || isOpticalContentIdentity(s.iccProfile))) return invalid();
  if (p.schemaVersion === "prepared-native-optical-publication-v1" ? "registration" in p :
    !isPreparedNativeDisplayRegistration(p.registration, s.encoded, g)) return invalid();
  const processing = p.processing;
  if (!processing || processing.runtimeNetwork !== "forbidden" ||
    ![processing.modification, processing.coverage].every(isOpticalPublicationText) ||
    !isOpticalContentIdentity(processing.producerReceipt) || processing.resampling !== "whole-source-LANCZOS" ||
    processing.alphaMeaning !== "opaque-full-source-rectangle" ||
    processing.scientificAvailability !== "UNKNOWN" || processing.sourceResolution !== "UNKNOWN" || !p.levels ||
    Object.keys(p.levels).sort().join() !== "DETAIL,MEDIUM,OVERVIEW") return invalid();
  const readyTexture = processing.producerVersion === "prepared-native-ready-texture-v1";
  if (readyTexture !== (s.metadata.kind === "stellarium-corners") || readyTexture && s.encoded.format !== "png") return invalid();
  if (processing.producerVersion === "prepared-native-full-source-v1" || readyTexture) {
    if (processing.colourUnit !== "published-encoded-RGB" || "separation" in processing || "restoration" in processing || "background" in processing || "denoising" in processing) return invalid();
  } else if (processing.producerVersion === "prepared-native-sxt-display-v1" || processing.producerVersion === "prepared-native-sxt-ps-restored-display-v1" ||
    processing.producerVersion === "prepared-native-source-background-display-v1" ||
    processing.producerVersion === "prepared-native-source-background-denoised-display-v1" ||
    processing.producerVersion === "prepared-native-source-denoised-background-display-v1") {
    const separation = processing.separation;
    const beforeBackground = processing.producerVersion === "prepared-native-source-denoised-background-display-v1";
    const denoised = processing.producerVersion === "prepared-native-source-background-denoised-display-v1" || beforeBackground;
    const background = processing.producerVersion === "prepared-native-source-background-display-v1" || denoised ? processing.background : null;
    const denoising = denoised ? processing.denoising : null;
    const restored=processing.producerVersion==="prepared-native-sxt-ps-restored-display-v1" ||
      !!background && "restoration" in processing;
    if (processing.colourUnit !== (beforeBackground ? "source-excluded-denoised-srgb-background-display-estimate" : denoised ? "source-excluded-srgb-background-denoised-display-estimate" : background ? "source-excluded-srgb-background-display-estimate" : restored?"sxt-original-restored-display-estimate":"sxt-starless-display-estimate") ||
      (denoised ? !denoising || !background : "denoising" in processing) ||
      (!background && "background" in processing) || (processing.producerVersion === "prepared-native-source-background-display-v1" && !background) ||
      (!restored&&"restoration"in processing) || !separation ||
      !["sxt", "sxt-overlap", "sxt-upsample"].includes(separation.method) || separation.modelVersion !== 11 ||
      separation.overlap !== (separation.method === "sxt-overlap" ? .5 : .2) ||
      separation.inputUpsample !== (separation.method === "sxt-upsample" ? 2 : 1) ||
      separation.fileReview !== (restored?"NEEDS_REPAIR":"PASSED") || separation.sceneAcceptance !== "MISSING" ||
      ![separation.processingReceipt, separation.reviewReceipt, separation.workingImage, separation.starless].every(isOpticalContentIdentity) ||
      ![separation.workingImage.width, separation.workingImage.height, separation.starless.width, separation.starless.height].every(dimension) ||
      separation.workingImage.width > g.sourceWidth || separation.workingImage.height > g.sourceHeight ||
      separation.workingImage.width !== separation.starless.width * separation.inputUpsample ||
      separation.workingImage.height !== separation.starless.height * separation.inputUpsample ||
      Math.abs(separation.workingImage.height - g.sourceHeight * separation.workingImage.width / g.sourceWidth) > .500000001 ||
      Math.abs(separation.starless.height - g.sourceHeight * separation.starless.width / g.sourceWidth) > .500000001 ||
      p.levels.DETAIL.width !== separation.starless.width || p.levels.DETAIL.height !== separation.starless.height ||
      OPTICAL_IMAGE_LEVELS.some(level => p.levels[level].format !== "png")) return invalid();
    const parent=restored?processing.restoration?.restored:separation.starless;
    const finest=denoising&&!beforeBackground?denoising.display:background?background.display:parent;
    if(!finest||p.levels.DETAIL.sha256!==finest.sha256||p.levels.DETAIL.bytes!==finest.bytes)return invalid();
    if(restored){
      const r=processing.restoration,px=r?.pixels,total=separation.starless.width*separation.starless.height;
      if(!r||r.method!=="photoshop-local-original-restoration-v1"||r.fileReview!=="PASSED"||r.sceneAcceptance!=="MISSING"||
        ![r.processingReceipt,r.reviewReceipt,r.nativeReport,r.mask,r.editablePsd,r.restored].every(isOpticalContentIdentity)||
        r.restored.width!==separation.starless.width||r.restored.height!==separation.starless.height||
        r.restored.sha256===separation.starless.sha256||!px||
        ![px.corePixels,px.exteriorPixels,px.changedPixels].every(v=>Number.isSafeInteger(v)&&v>0&&v<=total)||
        px.corePixels+px.exteriorPixels>total||px.changedPixels>total-px.exteriorPixels||
        px.coreChannelDifferences!==0||px.exteriorChannelDifferences!==0||
        ![0,1].includes(px.featherMaximumVsEncodedNormalBlend))return invalid();
    }
    if (background) {
      const b = background, total = separation.starless.width * separation.starless.height;
      const backgroundParent = beforeBackground ? denoising?.display : parent;
      const count = (v: unknown) => Number.isSafeInteger(v) && Number(v) >= 0 && Number(v) <= total;
      if (b.method !== "source-excluded-srgb-display-background-v1" || b.formula !== "srgb-linear-subtract-clamp-negative-display-only" ||
        b.fileReview !== "PASSED" || b.sceneAcceptance !== "MISSING" ||
        ![b.processingReceipt, b.reviewReceipt, b.parentDisplay, b.display, b.exclusionMask, b.estimationMask, b.backgroundModel].every(isOpticalContentIdentity) ||
        !backgroundParent || b.parentDisplay.bytes !== backgroundParent.bytes || b.parentDisplay.sha256 !== backgroundParent.sha256 ||
        b.display.width !== separation.starless.width || b.display.height !== separation.starless.height ||
        b.display.sha256 === b.parentDisplay.sha256 || b.suppliedPixels !== total || !count(b.validBlackDisplayPixels) ||
        !Array.isArray(b.negativeChannelPixels) || b.negativeChannelPixels.length !== 3 || !b.negativeChannelPixels.every(count) ||
        !Array.isArray(b.boxSize) || b.boxSize.length !== 2 ||
        b.boxSize.some((v, i) => !Number.isSafeInteger(v) || v < 2 || v > (i === 0 ? b.display.height : b.display.width)) ||
        !Number.isSafeInteger(b.sourceDilation) || b.sourceDilation < 0 || b.sourceDilation > Math.min(b.display.width, b.display.height)) return invalid();
    }
    if (denoising) {
      const d = denoising, total = separation.starless.width * separation.starless.height;
      const denoiseParent = beforeBackground ? parent : background?.display;
      if (!background || !denoiseParent || d.method !== (beforeBackground ? "nxt-srgb-source-display-denoise-v1" : "nxt-srgb-background-display-denoise-v1") || d.modelVersion !== 3.1 ||
        d.denoise !== .9 || d.iterations !== 1 || d.overlap !== .2 || d.depth !== "8U" ||
        d.fileReview !== "PASSED" || d.sceneAcceptance !== "MISSING" ||
        ![d.processingReceipt,d.reviewReceipt,d.parentDisplay,d.modelInput,d.display,d.vendor,d.cli,d.model].every(isOpticalContentIdentity) ||
        d.parentDisplay.sha256 !== denoiseParent.sha256 || d.parentDisplay.bytes !== denoiseParent.bytes ||
        d.modelInput.sha256 !== d.parentDisplay.sha256 || d.modelInput.bytes !== d.parentDisplay.bytes ||
        d.display.width !== background.display.width || d.display.height !== background.display.height ||
        d.display.sha256 === d.parentDisplay.sha256 || d.suppliedPixels !== total ||
        !Number.isSafeInteger(d.changedPixels) || d.changedPixels <= 0 || d.changedPixels > total) return invalid();
    }
  } else return invalid();
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
  const separation = processing.separation ?? null;
  const restoration=processing.restoration ?? null;
  const background=processing.background ?? null;
  const denoising=processing.denoising ?? null;
  const denoisedBeforeBackground = processing.producerVersion === "prepared-native-source-denoised-background-display-v1";
  return { id: `prepared-optical-imagery:${p.publicationId}:${p.publicationHash}`, kind: "OPEN_DATA",
    provider: s.resourceId, title: `${p.subject.label} · 历史观测影像${separation ? "（去星显示估计）" : ""}`, sourceUrl: s.metadataReferenceUrl,
    license: s.license, licenseUrl: s.licenseUrl,
    attribution: { name: s.credit, url: s.metadataReferenceUrl,
      statements: [s.credit, `CC BY 4.0 · ${s.licenseUrl}`, processing.modification,
        ...(separation ? [`Starward 已使用人工智能（AI）模型 SXT ML${separation.modelVersion} 去星${denoising ? "及 NXT ML3.1 降噪" : ""}修改此图；这是历史影像的显示处理，不是新增观测，也不表示原作者或机构认可本产品。`] : []),
        ...(p.registration ? [p.registration.catalogue.credit, p.registration.catalogue.url] : [])] },
    publishedAt: null, retrievedAt: null, validFrom: null, validTo: null, state: "FRESH", confidence: null,
    precision: `${separation ? "全幅矩形去星显示估计" : "全幅矩形历史观测影像"}；${p.registration ? "独立目录样本测得TAN显示位置" : "保留名义TAN方向"}，科学有效性和源分辨率未知；不是实时或肉眼观感`,
    limitations: [s.colourMeaning, `图片使用政策：${s.policyUrl}`, processing.modification, processing.coverage,
      ...(separation ? [`SXT ML${separation.modelVersion} 去星估计；完整显示工作图 ${separation.starless.width}×${separation.starless.height}，不能提供原图像素级细节或科研测量。`,
        "去星可能移除真实天体结构；仅文件复核通过，Scene画质及连续背景尚未验收。"] : []),
      ...(restoration?[`${background ? "背景处理前的组合文件：" : ""}Photoshop 原图局部真实结构恢复；冻结蒙版核心使用原图RGB，蒙版外保持原SXT，羽化最多一码舍入差。未使用生成填充。`,
        `原SXT文件仍需修复；当前组合文件复核通过，恢复改变 ${restoration.pixels.changedPixels} 像素，不能代替Scene、弱结构或连续背景验收。`]:[]),
      ...(background ? ["在已复核的组合图上排除天体与检测源，估计显示底色；以sRGB线性差扣除，负显示差归零。该步骤会改变全图像素，包括此前恢复的核心。",
        `${denoising && !denoisedBeforeBackground ? "降噪前的背景阶段：" : ""}完整 ${background.display.width}×${background.display.height} 矩形仍供给；${background.validBlackDisplayPixels} 个黑显示像素没有变成缺测或透明。排除蒙版仅限制拟合样本，不改变覆盖。`,
        "背景为显示估计，不能表示实测物理天空；文件复核不能代替弱结构、融合、配准或Scene验收。"] : []),
      ...(denoising ? [denoisedBeforeBackground
        ? "完整去星或原图恢复组合文件先经过 NXT ML3.1 降噪，再在完整降噪图上估计并扣除显示背景；最终PNG另行复核，原图恢复证明仅适用于此前阶段，NXT像素证明适用于扣背景前，背景公式适用于最终PNG。学习模型可能改变弱结构与纹理，不能新增真实观测细节；完整矩形与名义方向保持，科学有效性仍未知。"
        : "完整背景显示估计随后经过 NXT ML3.1 降噪；最终PNG另行复核，背景公式和原图恢复像素证明仅适用于各自此前阶段。学习模型可能改变弱结构与纹理，不能新增真实观测细节；完整矩形与名义方向保持，科学有效性仍未知。"] : []),
      ...(p.registration ? [`显示位置依据 ${p.registration.catalogue.name} 的独立参考；${p.registration.training.count} 点拟合、${p.registration.holdout.count} 点留出检验，留出RMS ${p.registration.holdout.rmsPixels.toFixed(3)}、最大 ${p.registration.holdout.maxPixels.toFixed(3)} 原图像素。原发布方坐标与所有像素保留，未重采样。`,
        p.registration.limitations, `参考数据权益：${p.registration.catalogue.rightsUrl}`] : [
      p.nominalTan.accuracy === "UNVERIFIED_APPROXIMATE_PUBLISHER_AVM" ? "使用出版方近似AVM；未独立校准绝对天文配准。"
        : p.nominalTan.accuracy === "UNVERIFIED_APPROXIMATE_PUBLISHER_CORNERS" ? "使用上游成品纹理的四角J2000位置近似TAN；四角转换误差不代表内部畸变或独立绝对配准。上游加工细节未知，低分辨率纹理不能放大成新的观测细节。"
        : "名义TAN取自同配置的观测FITS；其未声明坐标框架，按ICRS解释。方向检查不提供RGB曝光或有效性mask。",
      ]),
      "编码黑像素仍属于照片；矩形内不表示科学有效或曝光完整。三级为同一全幅的降采样，不扩展观测范围。"] };
}
