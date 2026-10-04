import { readFileSync } from "node:fs";
import { NotFoundException } from "@nestjs/common";
import { deepSkyRowByReference } from "@starward/astronomy-core/deep-sky-catalog";
import { SDSS_OPTICAL_LEVELS, SDSS_OPTICAL_PUBLICATIONS, assertSdssOpticalPublication,
  sdssOpticalPublication, type SdssOpticalPublication, type SdssOpticalManifest,
  assertSdssScienceOpticalPublication, assertSdssCalibratedOpticalPublication,
  type SdssCalibratedOpticalPublication, type SdssCalibratedOpticalManifest,
  type SdssOpticalLevel, type SdssOpticalReference, type SourceSummary } from "@starward/miniapp-contracts";
import { readTargetOpticalImageFile } from "./target-optical-image-file.ts";

const sourceLabel = "Sloan Digital Sky Survey - DR17 optical";
const hashPattern = /^[a-f0-9]{64}$/u;

/** Internal opt-in only: neither discovery nor the default registry is changed. */
export interface SdssSciencePublicationDescriptor {
  reference: string;
  expectedHash: string;
  manifestUrl: URL;
}
/** Opt-in calibrated family; old science-only descriptors retain strict admission. */
export type SdssCalibratedPublicationDescriptor = SdssSciencePublicationDescriptor;
type RegisteredDescriptor = SdssCalibratedPublicationDescriptor & { scienceOnly: boolean };
type CachedPublication<Value> = { value: Value; manifestUrl: URL; hash: string };
export interface SdssOpticalImageResult {
  bytes: Buffer;
  contentType: "image/jpeg" | "image/png";
  sourceLabel: string;
  fieldDegrees: number;
  pixelSize: 512;
}
type SdssOpticalJpegImageResult = SdssOpticalImageResult & { contentType: "image/jpeg" };

export class SdssOpticalImageryService {
  private readonly cached = new Map<string, CachedPublication<SdssOpticalPublication>>();
  private readonly calibratedDescriptors = new Map<string, RegisteredDescriptor>();
  private readonly cachedCalibrated = new Map<string, CachedPublication<SdssCalibratedOpticalPublication>>();

  constructor(input: { sciencePublications?: readonly SdssSciencePublicationDescriptor[];
    calibratedPublications?: readonly SdssCalibratedPublicationDescriptor[] } = {}) {
    const descriptors = [
      ...(input.sciencePublications ?? []).map(descriptor => ({ ...descriptor, scienceOnly: true })),
      ...(input.calibratedPublications ?? []).map(descriptor => ({ ...descriptor, scienceOnly: false })),
    ];
    for (const descriptor of descriptors) {
      if (!/^M:(?:[1-9]|[1-9]\d|10\d|110)$/u.test(descriptor.reference) ||
        !hashPattern.test(descriptor.expectedHash) || !(descriptor.manifestUrl instanceof URL) ||
        descriptor.manifestUrl.protocol !== "file:" || descriptor.manifestUrl.host !== "" ||
        descriptor.manifestUrl.search !== "" || descriptor.manifestUrl.hash !== "" ||
        this.calibratedDescriptors.has(descriptor.expectedHash) || Object.values(SDSS_OPTICAL_PUBLICATIONS)
          .some(offer => offer.publicationHash === descriptor.expectedHash))
        throw new Error("sdss_science_optical_descriptor_invalid");
      // Copy the mutable URL: later caller mutation cannot redirect this owner.
      this.calibratedDescriptors.set(descriptor.expectedHash, { ...descriptor, manifestUrl: new URL(descriptor.manifestUrl.href) });
    }
  }

  private publication(reference: string) {
    const offer = sdssOpticalPublication(reference);
    if (!offer) throw new NotFoundException("sdss_optical_publication_not_found");
    const previous = this.cached.get(reference);
    if (previous) return previous;
    const slug = reference.replace(":", "").toLowerCase();
    const manifestUrl = new URL(`../assets/deep-sky/sdss-${slug}/manifest.json`, import.meta.url);
    const value: unknown = JSON.parse(readFileSync(manifestUrl, "utf8"));
    assertSdssOpticalPublication(value, reference);
    const row = deepSkyRowByReference(reference);
    if (!row || Math.abs(value.center.raDeg - row.raDeg) > 1e-7 ||
      Math.abs(value.center.decDeg - row.decDeg) > 1e-7) throw new Error("sdss_optical_catalog_registration_invalid");
    const publication = { value, manifestUrl, hash: offer.publicationHash };
    this.cached.set(reference, publication);
    return publication;
  }

  private referenceForHash(hash: string): SdssOpticalReference | undefined {
    const reference = (Object.keys(SDSS_OPTICAL_PUBLICATIONS) as SdssOpticalReference[])
      .find(candidate => SDSS_OPTICAL_PUBLICATIONS[candidate].publicationHash === hash);
    return reference;
  }

  /** Declared family ownership, separate from metadata availability/admission. */
  hasRegisteredPublicationHash(hash: string) {
    return this.referenceForHash(hash) !== undefined || this.calibratedDescriptors.has(hash);
  }

  /** The same admitted immutable assets as HTTP: all existing JPEG offers and
   * only explicitly registered calibrated generations. Never crawl provenance. */
  async *publishedAssets() {
    const hashes = [
      ...Object.values(SDSS_OPTICAL_PUBLICATIONS).map(offer => offer.publicationHash),
      ...this.calibratedDescriptors.keys(),
    ];
    for (const hash of hashes) {
      const manifest = this.manifest(hash);
      for (const level of SDSS_OPTICAL_LEVELS) {
        const descriptor = manifest.levels[level];
        const image = await this.getByFile(hash, descriptor.file);
        yield { descriptor, publicationHash: hash, ...image };
      }
    }
  }

  private calibratedPublication(hash: string) {
    const descriptor = this.calibratedDescriptors.get(hash);
    if (!descriptor) throw new NotFoundException("sdss_optical_publication_not_found");
    const previous = this.cachedCalibrated.get(hash);
    if (previous) return previous;
    const value: unknown = JSON.parse(readFileSync(descriptor.manifestUrl, "utf8"));
    if (descriptor.scienceOnly) assertSdssScienceOpticalPublication(value, descriptor.reference, descriptor.expectedHash);
    else assertSdssCalibratedOpticalPublication(value, descriptor.reference, descriptor.expectedHash);
    const row = deepSkyRowByReference(descriptor.reference);
    // Reuse existing registration precision: immutable published decimals are
    // hash-bound, while the catalogue may retain more decimal places.
    if (!row || Math.abs(value.center.raDeg - row.raDeg) > 1e-7 || Math.abs(value.center.decDeg - row.decDeg) > 1e-7)
      throw new Error("sdss_optical_catalog_registration_invalid");
    const publication = { value, manifestUrl: descriptor.manifestUrl, hash };
    this.cachedCalibrated.set(hash, publication);
    return publication;
  }

  private publicationForHash(hash: string): CachedPublication<SdssOpticalPublication | SdssCalibratedOpticalPublication> {
    if (!hashPattern.test(hash)) throw new NotFoundException("sdss_optical_publication_not_found");
    const reference = this.referenceForHash(hash);
    return reference ? this.publication(reference) : this.calibratedPublication(hash);
  }

  publicationHash(reference = "M:51") { return this.publication(reference).hash; }
  currentManifest(reference = "M:51"): SdssOpticalManifest {
    return this.manifestEnvelope(this.publication(reference));
  }

  source(reference: string, expectedOpticalHash?: string): SourceSummary | null {
    if (expectedOpticalHash === undefined && !sdssOpticalPublication(reference)) return null;
    const publication = expectedOpticalHash === undefined ? this.publication(reference) : this.publicationForHash(expectedOpticalHash);
    if (publication.value.objectRef !== reference) throw new NotFoundException("sdss_optical_publication_not_found");
    const { value: { source, processing, publicationId }, hash } = publication;
    const imageVersion = "imageVersion" in publication.value ? publication.value.imageVersion : null;
    const calibrated = imageVersion !== null;
    const display = imageVersion === "sdss-display-optical-v1";
    const name = reference.replace(":", "");
    return {
      id: `optical-imagery:${publicationId}:${hash}`,
      kind: "OPEN_DATA", provider: source.provider,
      title: `${name} · SDSS DR17 历史光学巡天影像`, sourceUrl: source.landingUrl,
      license: source.license, licenseUrl: source.licenseUrl,
      publishedAt: null, retrievedAt: null, validFrom: null, validTo: null,
      state: "FRESH", confidence: null,
      precision: display ? `仅 ${name} 的三级 SDSS g/r/i 历史光学显示估计 PNG；北上东左；源主头线性 TAN 近似，质量尚未采用；不是新的科学测量、实时或全天影像`
        : calibrated ? `仅 ${name} 的三级 SDSS g/r/i 历史光学 PNG；北上东左；源主头线性 TAN 近似，科学有效性未验收；不是实时或全天影像`
        : `仅 ${name} 的三级 SDSS g/r/i 合成 JPEG；北上东左；不是实时或全天影像`,
      limitations: [source.credit, `图片使用政策：${source.imageUsePolicyUrl}`,
        `生成方式：${source.processingDocumentationUrl}`,
        "配色：i→红、r→绿、g→蓝，属于巡天波段的处理合成色，并非肉眼自然色。不同来源的配色可以不同，不能仅凭绿色或棕色判定噪声、伪影或无观测。",
        processing.modification, processing.coverage,
        calibrated ? "PNG透明度表示共同有限源样本的面积可用度，不由显示亮度推断；有限负值与零值保留为可用。它不是探测器伪影、曝光深度或科学质量认证；固定加工和视场见清单。"
          : "星图只选择该对象当前可用的一个巡天波段；光学绘出时不与W3红外合成。切图边缘作显示淡出，不表示缺测或测光变化；原图与视场见固定清单。",
        ...(display ? [
          "显示估计：按真实源样本和条件噪声共同孔径处理，已知标记仅在另一合格独立扫描供给时恢复。原始校准科学母图、共同样本可用度和冻结配色保持；不供测光或新的科学测量。",
          `加工版本：${imageVersion}；当前清单哈希：${hash}。显示策略、原科学/显示估计及执行来源的独立内容身份见同一清单；完整图质与配准未验收。`,
        ] : [])],
    };
  }

  private manifestEnvelope(publication: CachedPublication<SdssOpticalPublication>): SdssOpticalManifest;
  private manifestEnvelope(publication: CachedPublication<SdssOpticalPublication | SdssCalibratedOpticalPublication>): SdssOpticalManifest | SdssCalibratedOpticalManifest;
  private manifestEnvelope({ value, hash }: CachedPublication<SdssOpticalPublication | SdssCalibratedOpticalPublication>): SdssOpticalManifest | SdssCalibratedOpticalManifest {
    const copy = structuredClone(value);
    return { ...copy, publicationHash: hash,
      levels: Object.fromEntries(SDSS_OPTICAL_LEVELS.map(level => [level, { ...copy.levels[level],
        downloadUrl: `/v2/sky/sdss-optical/${hash}/${copy.levels[level].file}` }])) } as SdssOpticalManifest | SdssCalibratedOpticalManifest;
  }

  manifest(hash: string): SdssOpticalManifest | SdssCalibratedOpticalManifest {
    return this.manifestEnvelope(this.publicationForHash(hash));
  }

  getByFile(hash: string, file: string) {
    const { value } = this.publicationForHash(hash);
    const level = SDSS_OPTICAL_LEVELS.find(candidate => value.levels[candidate].file === file);
    if (!level) throw new NotFoundException("sdss_optical_image_not_found");
    return this.get(value.objectRef, level, hash);
  }

  get(reference: string, level: string, hash?: undefined): Promise<SdssOpticalJpegImageResult>;
  get(reference: string, level: string, hash?: string): Promise<SdssOpticalImageResult>;
  async get(reference: string, level: string, hash?: string): Promise<SdssOpticalImageResult> {
    if ((hash === undefined && !sdssOpticalPublication(reference)) || !SDSS_OPTICAL_LEVELS.includes(level as SdssOpticalLevel))
      throw new NotFoundException("sdss_optical_image_not_found");
    const publication = hash === undefined ? this.publication(reference) : this.publicationForHash(hash);
    if (publication.value.objectRef !== reference) throw new NotFoundException("sdss_optical_image_not_found");
    const asset = publication.value.levels[level as SdssOpticalLevel];
    const png = "imageVersion" in publication.value;
    return { ...await readTargetOpticalImageFile(publication.manifestUrl, asset, png ? "png" : "jpeg",
      "sdss_optical_asset_invalid"), sourceLabel };
  }
}
