import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { NotFoundException } from "@nestjs/common";
import { deepSkyRowByReference, loadDeepSkyCatalog } from "@starward/astronomy-core/deep-sky-catalog";
import type { SourceSummary } from "@starward/miniapp-contracts";

export type DeepSkyImageLevel = "OVERVIEW" | "MEDIUM" | "DETAIL";

export interface DeepSkyImageResult {
  bytes: Buffer;
  contentType: "image/jpeg";
  fieldDegrees: number;
  pixelSize: 256 | 512;
  sourceLabel: "NASA/IPAC IRSA - AllWISE W3 12um";
}

interface PublishedLevel {
  file: string;
  fieldDegrees: number;
  pixels: 256 | 512;
  sha256: string;
  bytes: number;
  validFraction: number;
}

interface PublishedEntry {
  objectRef: string;
  center: { raDeg: number; decDeg: number; frame: "ICRS J2000" };
  orientation: "north-up/east-left";
  levels: Record<DeepSkyImageLevel, PublishedLevel>;
}

interface DeepSkyPublication {
  schemaVersion: "allwise-w3-deep-sky-publication-v1";
  publicationId: string;
  catalogVersion: string;
  catalogSha256: string;
  source: { provider: string; dataset: string; band: "W3"; wavelengthMicrometers: 12; landingUrl: string; documentationUrl: string; doi: string; acknowledgment: string; acknowledgmentUrl: string; copyright: string; hipsCopyright: string; hipsProvider: string; hipsDoi: string; hipsRecordUrl: string; hipsLicense: string; hipsLicenseUrl: string };
  distribution: { databaseLicense: string; databaseLicenseUrl: string; notice: string; catalogNotice: string; catalogUrl: string; catalogLicenseUrl: string };
  processing: { runtimeNetwork: "forbidden"; orientation: "north-up/east-left"; service: string; serviceUrl: string; modification: string; limitations: string[] };
  entryCount: number;
  entries: PublishedEntry[];
}

const DEFAULT_MANIFEST = new URL("../assets/deep-sky/manifest.json", import.meta.url);
const SOURCE_LABEL = "NASA/IPAC IRSA - AllWISE W3 12um" as const;
const ADOPTED_ENTRY_COUNT = 51;
const ADOPTED_PROVIDER = "NASA/IPAC Infrared Science Archive (IRSA)";
const ADOPTED_DATASET = "AllWISE W3 HiPS from raw Atlas Images";
const ADOPTED_DOI = "10.26131/IRSA153";

function assertLevel(value: string): asserts value is DeepSkyImageLevel {
  if (value !== "OVERVIEW" && value !== "MEDIUM" && value !== "DETAIL")
    throw new Error("deep_sky_image_level_invalid");
}

function expectedFile(reference: string, level: DeepSkyImageLevel) {
  const stem = reference.replace(":", "-");
  return `${stem}/${stem}-${level.toLowerCase()}.jpg`;
}

function validatePublication(value: unknown, requireComplete: boolean): DeepSkyPublication {
  const publication = value as DeepSkyPublication;
  const catalog = requireComplete ? loadDeepSkyCatalog() : null;
  if (publication?.schemaVersion !== "allwise-w3-deep-sky-publication-v1" ||
    publication.source?.band !== "W3" || publication.source?.wavelengthMicrometers !== 12 ||
    publication.processing?.runtimeNetwork !== "forbidden" ||
    publication.processing?.orientation !== "north-up/east-left" ||
    !Array.isArray(publication.entries) || publication.entryCount !== publication.entries.length ||
    (requireComplete && (publication.entryCount !== ADOPTED_ENTRY_COUNT ||
      publication.catalogVersion !== catalog?.catalogVersion || publication.catalogSha256 !== catalog?.catalogHash ||
      publication.source.provider !== ADOPTED_PROVIDER || publication.source.dataset !== ADOPTED_DATASET ||
      publication.source.doi !== ADOPTED_DOI || !publication.source.landingUrl.startsWith("https://irsa.ipac.caltech.edu/") ||
      !publication.source.documentationUrl.startsWith("https://irsa.ipac.caltech.edu/") || !publication.source.acknowledgment ||
      publication.source.acknowledgmentUrl !== "https://irsa.ipac.caltech.edu/data/WISE/docs/release/AllWISE/expsup/sec1_6b.html" ||
      publication.source.copyright !== "IPAC/NASA" || publication.source.hipsCopyright !== "CNRS/Unistra" ||
      publication.source.hipsLicense !== "ODbL-1.0" || publication.source.hipsDoi !== "10.26093/cds/aladin/na1n-03" ||
      publication.source.hipsLicenseUrl !== "https://opendatacommons.org/licenses/odbl/1-0/" || !publication.source.hipsProvider || !publication.source.hipsRecordUrl ||
      publication.distribution?.databaseLicense !== "ODbL-1.0" || !publication.distribution.notice || !publication.distribution.catalogNotice ||
      publication.processing.service !== "CDS hips2fits" || publication.processing.serviceUrl !== "https://alasky.cds.unistra.fr/hips-image-services/hips2fits" || !publication.processing.modification ||
      !Array.isArray(publication.processing.limitations) || publication.processing.limitations.length < 2 ||
      !publication.processing.limitations.some(limit => /historical/iu.test(limit)) ||
      !publication.processing.limitations.some(limit => /detector artifacts/iu.test(limit)))))
    throw new Error("deep_sky_image_publication_invalid");
  const references = new Set<string>();
  for (const entry of publication.entries) {
    const row = deepSkyRowByReference(entry.objectRef);
    if (!row || references.has(entry.objectRef) ||
      entry.orientation !== "north-up/east-left")
      throw new Error("deep_sky_image_publication_invalid");
    if (requireComplete && (entry.center?.frame !== "ICRS J2000" || entry.center.raDeg !== row.raDeg || entry.center.decDeg !== row.decDeg))
      throw new Error("deep_sky_image_publication_invalid");
    references.add(entry.objectRef);
    for (const level of ["OVERVIEW", "MEDIUM", "DETAIL"] as const) {
      const asset = entry.levels?.[level];
      if (!asset || asset.file !== expectedFile(entry.objectRef, level) || !/^[a-f0-9]{64}$/u.test(asset.sha256) ||
        !Number.isFinite(asset.fieldDegrees) || asset.fieldDegrees <= 0 ||
        (asset.pixels !== 256 && asset.pixels !== 512) || asset.bytes < 4 ||
        !Number.isFinite(asset.validFraction) || asset.validFraction < 0.5 || asset.validFraction > 1)
        throw new Error("deep_sky_image_publication_invalid");
    }
  }
  return publication;
}

export class DeepSkyImageryService {
  private cachedPublication: DeepSkyPublication | null = null;
  private readonly requireComplete: boolean;

  constructor(private readonly manifestUrl: URL = DEFAULT_MANIFEST) {
    this.requireComplete = manifestUrl.href === DEFAULT_MANIFEST.href;
  }

  source(reference: string): SourceSummary | null {
    const publication = this.publication();
    if (!publication.entries.some(entry => entry.objectRef === reference)) return null;
    const { source, processing } = publication;
    // Bounded asset-only fixtures have no adopted provenance to disclose.
    if (!source.acknowledgment || !source.acknowledgmentUrl || !source.hipsLicense || !publication.distribution?.notice || !processing.modification) return null;
    const revision = this.publicationHash();
    return {
      id: `imagery:${publication.publicationId}:${revision}`, kind: "OPEN_DATA", provider: source.provider,
      title: "AllWISE W3 12 µm 巡天影像", sourceUrl: source.landingUrl,
      license: "ODbL-1.0（HiPS 数据库）；AllWISE 影像另附声明", licenseUrl: source.hipsLicenseUrl,
      publishedAt: null, retrievedAt: null, validFrom: null, validTo: null,
      state: "FRESH", confidence: null, precision: "历史 W3 12 µm 红外巡天；按目标裁切，北向上，东向左",
      limitations: [publication.distribution.notice, `HiPS 数据库：${source.hipsRecordUrl}；许可：${source.hipsLicenseUrl}`,
        source.acknowledgment, `AllWISE 声明：${source.acknowledgmentUrl}`,
        `数据版权：${source.copyright}；HiPS：${source.hipsProvider}，${source.hipsCopyright}。`,
        `Atlas 数据引用：https://doi.org/${source.doi}；HiPS：https://doi.org/${source.hipsDoi}`,
        `影像加工：${processing.service}；${processing.serviceUrl}`,
        processing.modification, ...processing.limitations],
    };
  }

  manifest(publicationHash: string) {
    if (publicationHash !== this.publicationHash()) throw new NotFoundException("deep_sky_image_publication_not_found");
    const publication = structuredClone(this.publication());
    return { ...publication, publicationHash, entries: publication.entries.map(entry => ({ ...entry,
      levels: Object.fromEntries(Object.entries(entry.levels).map(([level, asset]) => [level, { ...asset,
        downloadUrl: `/v2/celestial-objects/${encodeURIComponent(entry.objectRef)}/image?level=${level}&publicationHash=${publicationHash}`,
      }])),
    })) };
  }

  async get(reference: string, levelInput = "MEDIUM", publicationHash?: string): Promise<DeepSkyImageResult> {
    assertLevel(levelInput);
    if (publicationHash && publicationHash !== this.publicationHash()) throw new NotFoundException("deep_sky_image_publication_not_found");
    if (!deepSkyRowByReference(reference)) throw new Error("deep_sky_image_not_found");
    const publication = this.publication();
    const entry = publication.entries.find((candidate) => candidate.objectRef === reference);
    if (!entry) throw new Error("deep_sky_image_not_published");
    const asset = entry.levels[levelInput];
    const assetUrl = new URL(asset.file, this.manifestUrl);
    const root = fileURLToPath(new URL("./", this.manifestUrl));
    const path = fileURLToPath(assetUrl);
    if (!path.startsWith(root)) throw new Error("deep_sky_image_publication_invalid");
    const bytes = await readFile(assetUrl);
    if (bytes.length !== asset.bytes || createHash("sha256").update(bytes).digest("hex") !== asset.sha256 ||
      bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes.at(-2) !== 0xff || bytes.at(-1) !== 0xd9)
      throw new Error("deep_sky_image_asset_invalid");
    return { bytes, contentType: "image/jpeg", fieldDegrees: asset.fieldDegrees,
      pixelSize: asset.pixels, sourceLabel: SOURCE_LABEL };
  }

  private publication() {
    // One small local metadata read serves synchronous object details and async
    // image delivery. Invalid reads are not cached; JPEG bytes remain async.
    this.cachedPublication ??= validatePublication(JSON.parse(readFileSync(this.manifestUrl, "utf8")), this.requireComplete);
    return this.cachedPublication;
  }

  private publicationHash() {
    return createHash("sha256").update(JSON.stringify(this.publication())).digest("hex");
  }
}
