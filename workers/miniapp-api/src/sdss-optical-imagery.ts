import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { NotFoundException } from "@nestjs/common";
import { deepSkyRowByReference } from "@starward/astronomy-core/deep-sky-catalog";
import { SDSS_OPTICAL_LEVELS, SDSS_OPTICAL_PUBLICATIONS, assertSdssOpticalPublication,
  sdssOpticalPublication, type SdssOpticalPublication, type SdssOpticalManifest,
  type SdssOpticalLevel, type SdssOpticalReference, type SourceSummary } from "@starward/miniapp-contracts";

const sourceLabel = "Sloan Digital Sky Survey - DR17 optical";

export class SdssOpticalImageryService {
  private readonly cached = new Map<string, { value: SdssOpticalPublication; manifestUrl: URL; hash: string }>();

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

  private referenceForHash(hash: string): SdssOpticalReference {
    const reference = (Object.keys(SDSS_OPTICAL_PUBLICATIONS) as SdssOpticalReference[])
      .find(candidate => SDSS_OPTICAL_PUBLICATIONS[candidate].publicationHash === hash);
    if (!reference) throw new NotFoundException("sdss_optical_publication_not_found");
    return reference;
  }

  publicationHash(reference = "M:51") { return this.publication(reference).hash; }
  currentManifest(reference = "M:51") { return this.manifest(this.publicationHash(reference)); }

  source(reference: string): SourceSummary | null {
    if (!sdssOpticalPublication(reference)) return null;
    const { value: { source, processing, publicationId }, hash } = this.publication(reference);
    const name = reference.replace(":", "");
    return {
      id: `optical-imagery:${publicationId}:${hash}`,
      kind: "OPEN_DATA", provider: source.provider,
      title: `${name} · SDSS DR17 历史光学巡天影像`, sourceUrl: source.landingUrl,
      license: source.license, licenseUrl: source.licenseUrl,
      publishedAt: null, retrievedAt: null, validFrom: null, validTo: null,
      state: "FRESH", confidence: null,
      precision: `仅 ${name} 的三级 SDSS g/r/i 合成 JPEG；北上东左；不是实时或全天影像`,
      limitations: [source.credit, `图片使用政策：${source.imageUsePolicyUrl}`,
        `生成方式：${source.processingDocumentationUrl}`, processing.modification, processing.coverage,
        "星图只选择该对象当前可用的一个巡天波段；光学绘出时不与W3红外合成。切图边缘作显示淡出，不表示缺测或测光变化；原图与视场见固定清单。"],
    };
  }

  manifest(hash: string): SdssOpticalManifest {
    const { value } = this.publication(this.referenceForHash(hash));
    const copy = structuredClone(value);
    return { ...copy, publicationHash: hash,
      levels: Object.fromEntries(SDSS_OPTICAL_LEVELS.map(level => [level, { ...copy.levels[level],
        downloadUrl: `/v2/sky/sdss-optical/${hash}/${copy.levels[level].file}` }])) as SdssOpticalManifest["levels"] };
  }

  getByFile(hash: string, file: string) {
    const reference = this.referenceForHash(hash), { value } = this.publication(reference);
    const level = SDSS_OPTICAL_LEVELS.find(candidate => value.levels[candidate].file === file);
    if (!level) throw new NotFoundException("sdss_optical_image_not_found");
    return this.get(reference, level, hash);
  }

  async get(reference: string, level: string, hash?: string) {
    if (!sdssOpticalPublication(reference) || !SDSS_OPTICAL_LEVELS.includes(level as SdssOpticalLevel))
      throw new NotFoundException("sdss_optical_image_not_found");
    const publication = this.publication(reference);
    if (hash !== undefined && hash !== publication.hash) throw new NotFoundException("sdss_optical_image_not_found");
    const asset = publication.value.levels[level as SdssOpticalLevel];
    const bytes = await readFile(new URL(asset.file, publication.manifestUrl));
    if (bytes.length !== asset.bytes || createHash("sha256").update(bytes).digest("hex") !== asset.sha256 ||
      bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes.at(-2) !== 0xff || bytes.at(-1) !== 0xd9)
      throw new Error("sdss_optical_asset_invalid");
    return { bytes, contentType: "image/jpeg" as const, sourceLabel,
      fieldDegrees: asset.fieldDegrees, pixelSize: asset.pixels };
  }
}
