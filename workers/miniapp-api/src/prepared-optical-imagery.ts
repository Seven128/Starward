import { readFileSync } from "node:fs";
import { NotFoundException } from "@nestjs/common";
import { deepSkyRowByReference } from "@starward/astronomy-core/deep-sky-catalog";
import { OPTICAL_IMAGE_LEVELS, assertPreparedRenderedOpticalPublication, type PreparedRenderedOpticalPublication,
  type PreparedRenderedOpticalManifest, type SourceSummary } from "@starward/miniapp-contracts";
import { readTargetOpticalImageFile } from "./target-optical-image-file.ts";

export interface PreparedRenderedOpticalPublicationDescriptor {
  reference: string; expectedHash: string; manifestUrl: URL;
}

/** Explicit reviewed descriptors only. Empty by default; a source/geometry
 * admission or caller-supplied fresh hash never enables discovery/adoption. */
export class PreparedOpticalImageryService {
  private readonly descriptors = new Map<string, PreparedRenderedOpticalPublicationDescriptor>();
  private readonly cached = new Map<string, { value: PreparedRenderedOpticalPublication; manifestUrl: URL; hash: string }>();

  constructor(descriptors: readonly PreparedRenderedOpticalPublicationDescriptor[] = []) {
    for (const descriptor of descriptors) {
      if (!/^M:(?:[1-9]|[1-9]\d|10\d|110)$/u.test(descriptor.reference) ||
        !/^[a-f0-9]{64}$/u.test(descriptor.expectedHash) || !(descriptor.manifestUrl instanceof URL) ||
        descriptor.manifestUrl.protocol !== "file:" || descriptor.manifestUrl.host !== "" ||
        descriptor.manifestUrl.search !== "" || descriptor.manifestUrl.hash !== "" ||
        this.descriptors.has(descriptor.expectedHash)) throw new Error("prepared_optical_descriptor_invalid");
      this.descriptors.set(descriptor.expectedHash, { ...descriptor, manifestUrl: new URL(descriptor.manifestUrl.href) });
    }
  }

  /** Declared family ownership only; source()/manifest() still admit the actual
   * immutable metadata. This neither discovers nor adopts a publication. */
  hasRegisteredPublicationHash(hash: string) { return this.descriptors.has(hash); }

  /** Static publication enumerates the same pinned, validated field files as
   * HTTP. No discovery, directory crawl, master/raw input or default adoption. */
  async *publishedAssets() {
    for (const hash of this.descriptors.keys()) {
      const manifest = this.manifest(hash);
      for (const level of OPTICAL_IMAGE_LEVELS) {
        const descriptor = manifest.levels[level];
        const image = await this.getByFile(hash, descriptor.file);
        yield { descriptor, publicationHash: hash, ...image };
      }
    }
  }

  private publication(hash: string) {
    const descriptor = this.descriptors.get(hash);
    if (!descriptor) throw new NotFoundException("prepared_optical_publication_not_found");
    const previous = this.cached.get(hash);
    if (previous) return previous;
    const value: unknown = JSON.parse(readFileSync(descriptor.manifestUrl, "utf8"));
    assertPreparedRenderedOpticalPublication(value, descriptor.reference, descriptor.expectedHash);
    const row = deepSkyRowByReference(descriptor.reference);
    if (!row || Math.abs(value.center.raDeg - row.raDeg) > 1e-7 || Math.abs(value.center.decDeg - row.decDeg) > 1e-7)
      throw new Error("prepared_optical_catalog_registration_invalid");
    const publication = { value, manifestUrl: descriptor.manifestUrl, hash };
    this.cached.set(hash, publication);
    return publication;
  }

  manifest(hash: string): PreparedRenderedOpticalManifest {
    const publication = this.publication(hash), copy = structuredClone(publication.value);
    return { ...copy, publicationHash: hash, levels: Object.fromEntries(OPTICAL_IMAGE_LEVELS.map(level =>
      [level, { ...copy.levels[level], downloadUrl: `/v2/sky/prepared-optical/${hash}/${copy.levels[level].file}` }])) } as PreparedRenderedOpticalManifest;
  }

  source(reference: string, expectedHash: string): SourceSummary {
    const { value, hash } = this.publication(expectedHash);
    if (value.objectRef !== reference) throw new NotFoundException("prepared_optical_publication_not_found");
    const { source, processing } = value, name = reference.replace(":", "");
    const display = value.imageVersion === "prepared-display-optical-v1" ? value.processing : null;
    const guard = display?.geometryExclusion;
    return {
      id: `prepared-optical-imagery:${value.publicationId}:${hash}`, kind: "OPEN_DATA",
      provider: new URL(source.metadataReferenceUrl).hostname,
      title: `${name} · 历史观测合成影像${display ? "（显示估计）" : ""}`, sourceUrl: source.metadataReferenceUrl,
      license: source.license, licenseUrl: source.licenseUrl,
      attribution: { name: source.credit, url: source.metadataReferenceUrl,
        statements: [source.credit, `CC BY 4.0 · ${source.licenseUrl}`, processing.modification,
          ...(guard ? [`背景估计排除范围参考：${guard.credit}`, `${guard.metadataReferenceUrl} · CC BY 4.0 · ${guard.licenseUrl}`] : [])] },
      publishedAt: null, retrievedAt: null, validFrom: null, validTo: null, state: "FRESH", confidence: null,
      precision: "仅此对象的三级历史观测 PNG；北上东左；使用出版方近似 AVM 位置，科学有效性未知；不是实时或肉眼观感",
      limitations: [source.colourMeaning, `图片使用政策：${source.policyUrl}`,
        ...(source.nominalAvm.spatialNotes ? [source.nominalAvm.spatialNotes] : []),
        processing.modification, processing.coverage,
        ...(display ? ["背景已作显示估计，负值显示截零；原图与几何支持保留。低亮结构完整性尚未确认，不供科研测量。"] : []),
        ...(guard ? [`背景估计仅参考此影像的几何范围：${guard.metadataReferenceUrl}`] : [])],
    };
  }

  getByFile(hash: string, file: string) {
    const publication = this.publication(hash);
    const level = OPTICAL_IMAGE_LEVELS.find(candidate => publication.value.levels[candidate].file === file);
    if (!level) throw new NotFoundException("prepared_optical_image_not_found");
    return readTargetOpticalImageFile(publication.manifestUrl, publication.value.levels[level], "png", "prepared_optical_asset_invalid");
  }
}
