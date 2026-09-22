import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { NotFoundException } from "@nestjs/common";
import { loadConstellationCatalog } from "@starward/astronomy-core/constellation-catalog";
import { assertConstellationCatalog, type ApiEnvelope, type ConstellationCatalogPublication, type SourceSummary } from "@starward/miniapp-contracts";

function freeze<T>(value: T): T {
  if (value && typeof value === "object") { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}

/** All original assets are local, immutable and individually hash-verified.
 * Runtime never imports an upstream URL or user-chosen filesystem path. */
export class ConstellationPublicationService {
  private current: ApiEnvelope<ConstellationCatalogPublication> | null = null;

  get(): ApiEnvelope<ConstellationCatalogPublication> {
    if (this.current) return this.current;
    const loaded = loadConstellationCatalog();
    const data: unknown = { ...loaded.data as object, catalogHash: loaded.catalogHash };
    assertConstellationCatalog(data);
    const source = data.provenance;
    const common = { publishedAt:null, retrievedAt:data.retrievedAt, validFrom:null, validTo:null,
      state:"FRESH" as const, confidence:null, limitations:data.limitations };
    const sources: SourceSummary[] = [
      { ...common,id:`constellation:${data.catalogVersion}`,kind:"OPEN_DATA",provider:source.definitions.provider,
        title:"Stellarium Modern constellation lines and anchors",sourceUrl:source.definitions.url,
        license:source.definitions.license,licenseUrl:source.definitions.licenseUrl,precision:"Fixed v24.4 definitions; exact HIP anchors" },
      { ...common,id:`constellation-art:${data.catalogVersion}`,kind:"OPEN_DATA",provider:source.art.author,
        title:"Stellarium constellation illustrations",sourceUrl:source.art.url,
        license:source.art.license,licenseUrl:source.art.licenseUrl,precision:"Original PNGs, three published anchors per illustration" },
      { ...common,id:`constellation-geometry:${data.geometryAsset.sha256}`,kind:"OPEN_DATA",provider:source.astrometry.provider,
        title:"BSC5P / SAO geometry with CDS/SIMBAD identities",sourceUrl:source.astrometry.url,
        license:source.astrometry.license,licenseUrl:source.astrometry.licenseUrl,
        precision:"FK5 J2000; tangent mas/year; explicit system members use decorative geometric centers. Machine-readable ODbL geometry is available separately." },
    ];
    this.current = freeze({apiVersion:"v2",data,dataState:"FRESH",generatedAt:new Date().toISOString(),validAt:null,
      sources,warnings:[],etag:`W/"${data.catalogHash}"`,requestId:`constellations:${data.catalogHash}`});
    return this.current;
  }

  async asset(catalogHash: string, file: string) {
    const data = this.get().data;
    if (catalogHash !== data.catalogHash) throw new NotFoundException("constellation_publication_not_found");
    const image = data.images.find(a=>a.file === file);
    const geometry = file === data.geometryAsset.file ? data.geometryAsset : undefined;
    const sourceHash = Object.hasOwn(data.provenance.definitions.sourceFiles,file) ? data.provenance.definitions.sourceFiles[file] : undefined;
    if (!image && !geometry && !sourceHash) throw new NotFoundException("constellation_asset_not_found");
    const bytes = await readFile(new URL(`../assets/constellations/${file}`,import.meta.url));
    if (createHash("sha256").update(bytes).digest("hex") !== (image?.sha256 ?? geometry?.sha256 ?? sourceHash) ||
      image && bytes.length !== image.bytes || geometry && bytes.length !== geometry.bytes)
      throw new Error("constellation_asset_integrity");
    return {bytes,contentType:image ? "image/png" : geometry ? "application/json; charset=utf-8" : "text/plain; charset=utf-8"};
  }
}
