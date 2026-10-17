import { readFileSync } from "node:fs";
import { NotFoundException } from "@nestjs/common";
import { deepSkyRowByReference } from "@starward/astronomy-core/deep-sky-catalog";
import { nativeTanNominalWidthDegrees, nativeTanUvAtIcrs } from "@starward/astronomy-core/tan-optical-geometry";
import { OPTICAL_IMAGE_LEVELS, assertPreparedRenderedOpticalPublication, type PreparedRenderedOpticalPublication,
  isPreparedOpticalReference, opticalPublicationReference, preparedNativeOpticalSource, preparedDerivedRegionOpticalSource,
  isPreparedPlaneOpticalPublication, preparedRenderedOpticalAssets, preparedOpticalDisplayGeometry,
  type PreparedRenderedOpticalManifest, type PreparedOpticalDiscovery, type SourceSummary } from "@starward/miniapp-contracts";
import { readTargetOpticalImageFile } from "./target-optical-image-file.ts";
import { preparedOpticalManifestHeaders, skyPublicAssetHeaders } from "./sky-public-asset-headers.ts";

export interface PreparedRenderedOpticalPublicationDescriptor {
  reference: string; expectedHash: string; manifestUrl: URL;
}

/** Explicit reviewed descriptors only. Empty by default; a source/geometry
 * admission or caller-supplied fresh hash never enables discovery/adoption. */
export class PreparedOpticalImageryService {
  private readonly descriptors = new Map<string, PreparedRenderedOpticalPublicationDescriptor>();
  private readonly cached = new Map<string, { value: PreparedRenderedOpticalPublication; manifestUrl: URL; hash: string }>();
  private readonly currentHashes: readonly string[];

  constructor(descriptors: readonly PreparedRenderedOpticalPublicationDescriptor[] = [],
    currentPublicationHashes: readonly string[] = []) {
    for (const descriptor of descriptors) {
      if (!isPreparedOpticalReference(descriptor.reference) ||
        !/^[a-f0-9]{64}$/u.test(descriptor.expectedHash) || !(descriptor.manifestUrl instanceof URL) ||
        descriptor.manifestUrl.protocol !== "file:" || descriptor.manifestUrl.host !== "" ||
        descriptor.manifestUrl.search !== "" || descriptor.manifestUrl.hash !== "" ||
        this.descriptors.has(descriptor.expectedHash)) throw new Error("prepared_optical_descriptor_invalid");
      this.descriptors.set(descriptor.expectedHash, { ...descriptor, manifestUrl: new URL(descriptor.manifestUrl.href) });
    }
    const references = new Set<string>();
    for (const hash of currentPublicationHashes) {
      const descriptor = this.descriptors.get(hash);
      if (!descriptor || references.has(descriptor.reference)) throw new Error("prepared_optical_current_selection_invalid");
      references.add(descriptor.reference);
    }
    this.currentHashes = [...currentPublicationHashes];
  }

  /** Only explicit current declarations enter ordinary discovery. Retained or
   * conditional candidate descriptors remain readable without becoming current.
   * Validation of each real edition is still performed by the publication owner. */
  discovery(): PreparedOpticalDiscovery {
    return { schemaVersion: "prepared-optical-discovery-v1", publications: this.currentHashes.map(hash => {
      const publication = this.manifest(hash);
      return { kind: publication.imageVersion, reference: opticalPublicationReference(publication), publicationHash: hash,
        ...(isPreparedPlaneOpticalPublication(publication) ? { tan: preparedOpticalDisplayGeometry(publication) } : {}) };
    }) };
  }

  /** Declared family ownership only; source()/manifest() still admit the actual
   * immutable metadata. This neither discovers nor adopts a publication. */
  hasRegisteredPublicationHash(hash: string) { return this.descriptors.has(hash); }

  /** Read back this owner's actual registry for offline inventory. Candidate
   * validation uses a separate explicit owner and never modifies this one. */
  *registeredPublications() {
    for (const hash of this.descriptors.keys()) yield this.manifest(hash);
  }

  /** Static publication enumerates the same pinned, validated field files as
   * HTTP. No discovery, directory crawl, master/raw input or default adoption. */
  async *publishedAssets() {
    for (const hash of this.descriptors.keys()) {
      const manifest = this.manifest(hash);
      for (const descriptor of preparedRenderedOpticalAssets(manifest)) {
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
    if (isPreparedPlaneOpticalPublication(value)) {
      const geometry = preparedOpticalDisplayGeometry(value), width = nativeTanNominalWidthDegrees(geometry);
      if (Math.abs(value.levels.OVERVIEW.fieldDegrees - width) > 1e-10 * Math.max(width, 1))
        throw new Error("prepared_optical_field_geometry_invalid");
      if (value.subject.kind === "object") {
        const row = deepSkyRowByReference(descriptor.reference);
        const uv = row ? nativeTanUvAtIcrs(geometry, row.raDeg, row.decDeg) : null;
        if (!uv || uv.some(coordinate => coordinate < 0 || coordinate > 1))
          throw new Error("prepared_optical_catalog_registration_invalid");
      }
    } else {
      const row = deepSkyRowByReference(descriptor.reference);
      if (!row || Math.abs(value.center.raDeg - row.raDeg) > 1e-7 || Math.abs(value.center.decDeg - row.decDeg) > 1e-7)
        throw new Error("prepared_optical_catalog_registration_invalid");
    }
    const publication = { value, manifestUrl: descriptor.manifestUrl, hash };
    this.cached.set(hash, publication);
    return publication;
  }

  manifest(hash: string): PreparedRenderedOpticalManifest {
    const publication = this.publication(hash), copy = structuredClone(publication.value);
    const support = copy.imageVersion === "prepared-derived-region-optical-v1" ? {
      support: Object.fromEntries(Object.entries(copy.support).map(([key, asset]) =>
        [key, { ...asset, downloadUrl: `/v2/sky/prepared-optical/${hash}/${asset.file}` }])) } : {};
    return { ...copy, ...support, publicationHash: hash, levels: Object.fromEntries(OPTICAL_IMAGE_LEVELS.map(level =>
      [level, { ...copy.levels[level], downloadUrl: `/v2/sky/prepared-optical/${hash}/${copy.levels[level].file}` }])) } as PreparedRenderedOpticalManifest;
  }

  /** A native client's pinned manifest is part of its static/backup payload.
   * The region's changed-data offer and previously sealed headers stay exact;
   * legacy fixed-square photo families keep their API-only metadata delivery. */
  *publishedMetadata() {
    for (const hash of this.descriptors.keys()) {
      const manifest = this.manifest(hash);
      if (manifest.imageVersion === "prepared-native-optical-v1" || manifest.imageVersion === "prepared-derived-region-optical-v1") yield {
        route: `/v2/sky/prepared-optical/${hash}/manifest`,
        bytes: Buffer.from(JSON.stringify(manifest)), contentType: "application/json; charset=utf-8",
        headers: manifest.imageVersion === "prepared-native-optical-v1" ? preparedOpticalManifestHeaders(manifest)
          : skyPublicAssetHeaders("prepared-optical-metadata", "application/json; charset=utf-8"),
      };
    }
  }

  source(reference: string, expectedHash: string): SourceSummary {
    const { value, hash } = this.publication(expectedHash);
    if (opticalPublicationReference(value) !== reference) throw new NotFoundException("prepared_optical_publication_not_found");
    if (value.imageVersion === "prepared-native-optical-v1") return preparedNativeOpticalSource({ ...value, publicationHash: hash });
    if (value.imageVersion === "prepared-derived-region-optical-v1") return preparedDerivedRegionOpticalSource({ ...value, publicationHash: hash });
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
    const asset = preparedRenderedOpticalAssets(publication.value).find(candidate => candidate.file === file);
    if (!asset) throw new NotFoundException("prepared_optical_image_not_found");
    const p = publication.value;
    // Derived levels carry resampled source alpha; original support is RGBA
    // and tile supply is independent grayscale. Original-photo RGB admission
    // remains strict. A complete opaque finest RGB has equivalent RGBA pixels.
    const pngColorTypes: readonly (0 | 2 | 6)[] | undefined = p.imageVersion === "prepared-derived-region-optical-v1"
      ? "mode" in asset ? [asset.mode === "L" ? 0 : 6] : file === p.levels.DETAIL.file && p.source.counts.opaqueSamples === p.source.counts.samples
        ? [2, 6] : [6] : undefined;
    return readTargetOpticalImageFile(publication.manifestUrl, asset, asset.format, "prepared_optical_asset_invalid",
      pngColorTypes ? { pngColorTypes } : undefined);
  }
}
